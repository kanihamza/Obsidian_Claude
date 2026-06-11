/** OBSIDIAN v4.0 — tools/ui-smoke.mjs · REAL-BROWSER smoke for the single-assignment surface.
 *  Serves platform-root, mocks the two data flows (REFERENCE_DATA 'lookups' + FETCH_ALL 'fetchAll'),
 *  drives the form in Chromium (Playwright), and asserts the things static gates can't: the dropdowns
 *  actually populate and the category cascade reflects into the assignee picker + priority chips.
 *  Zero project deps (uses the platform's own Playwright). Run from platform-root/:
 *    node tools/ui-smoke.mjs            (add --headed to watch)  */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import playwright from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = playwright;

const ROOT = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.map': 'application/json' };

// ── Fixtures (same realistic shape as category-cascade-test) ───────────────
const CATEGORIES = [
  { ID: 1, Category: 'Procurement', 'Category Code': 'PROC', Subcategory: 'Contracts',
    'Default Primary Responsible': 'PROC-DSU', 'Default Supporting Department/Unit': 'LEGAL-DSU',
    INFORMDSU1: 'FIN-DSU', INFORMDSU2: 'DGO', INFORMDSU3: '', Priority: 'High' },
  { ID: 2, Category: 'Routine Memo', 'Category Code': 'MEMO', Subcategory: 'General',
    'Default Primary Responsible': 'CORP-DSU', 'Default Supporting Department/Unit': '',
    INFORMDSU1: '', INFORMDSU2: '', INFORMDSU3: '', Priority: 'Low' }
];
const DEPARTMENTS = [
  { DSU_KEY: 'PROC-DSU', Title: 'Procurement', DSU_HeadEmail: 'proc.head@nitda.gov.ng', DSU_HeadPersonalEmail: 'proc.personal@nitda.gov.ng', DSU_HeadTitle: 'Director, Procurement' },
  { DSU_KEY: 'LEGAL-DSU', Title: 'Legal', DSU_HeadEmail: 'legal.head@nitda.gov.ng', DSU_HeadPersonalEmail: 'legal.personal@nitda.gov.ng', DSU_HeadTitle: 'Director, Legal' },
  { DSU_KEY: 'FIN-DSU', Title: 'Finance', DSU_HeadEmail: 'fin.head@nitda.gov.ng', DSU_HeadTitle: 'Director, Finance' },
  { DSU_KEY: 'DGO', Title: "DG's Office", DSU_HeadEmail: 'dgo@nitda.gov.ng', DSU_HeadTitle: 'DG Office' }
];
const USERS = [
  { name: 'Ada Obi', email: 'ada.obi@nitda.gov.ng', jobTitle: 'Officer', department: 'PROC-DSU' },
  { name: 'Bola Eze', email: 'bola.eze@nitda.gov.ng', jobTitle: 'Analyst', department: 'FIN-DSU' }
];
const DOCUMENTS = [
  { ReferenceID: 'REF-1001', DocumentID: 'DOC-1', Title: 'Contract award memo', Category: 'Procurement', Subcategory: 'Contracts', PrimaryDSU: 'PROC-DSU' },
  { ReferenceID: 'REF-1002', DocumentID: 'DOC-2', Title: 'Quarterly routine note', Category: 'Routine Memo', Subcategory: 'General', PrimaryDSU: 'CORP-DSU' }
];
const TASKS = [
  { ReferenceID: 'REF-1001', TaskID: 'T-1', Title: 'Review contract', Status: 'in-progress', AssignedTo: 'ada.obi@nitda.gov.ng', Priority: 'P2 (Medium)', TaskDue: '2026-06-15' }
];
const APPROVALS = [
  { ReferenceID: 'REF-2001', ApprovalID: 'AP-1', Title: 'Budget sign-off', Status: 'pending',
    AssignedTo: 'bola.eze@nitda.gov.ng', from: 'ada.obi@nitda.gov.ng', ts: '2026-06-02', summary: 'Approve Q3 budget line.' }
];

function mockBody(action) {
  if (action === 'lookups') return { ok: true, status: { http: 200 }, users: USERS, categories: CATEGORIES, departments: DEPARTMENTS };
  if (action === 'fetchAll') return { ok: true, status: { http: 200 }, data: { documents: DOCUMENTS, tasks: TASKS, approvals: APPROVALS, categories: CATEGORIES, departments: DEPARTMENTS, users: USERS } };
  return { ok: true, status: { http: 200 }, success: true, statusCode: 200, data: {} };
}

// ── Static server ──────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    if (p === '/') p = '/index.html';
    const full = normalize(join(ROOT, p));
    if (!full.startsWith(ROOT)) { res.writeHead(403).end('no'); return; }
    const buf = await readFile(full);
    res.writeHead(200, { 'content-type': MIME[extname(full)] || 'application/octet-stream' }).end(buf);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}`;

// ── Drive the browser ──────────────────────────────────────────────────────
const headed = process.argv.includes('--headed');
const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

const routeHandler = async (route) => {
  const req = route.request();
  if (req.url().includes('powerplatform.com')) {
    let action = '';
    try { action = (JSON.parse(req.postData() || '{}').action) || ''; } catch { /* ignore */ }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockBody(action)) });
  }
  return route.continue();
};
await page.route('**/*', routeHandler);

// Spin up a fresh browser context already booted to the admin persona (for viewport/motion matrices).
async function newAdminPage(opts) {
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await p.route('**/*', routeHandler);
  await p.goto(`${BASE}/`, { waitUntil: 'load' });
  await p.waitForFunction(() => globalThis.Platform && globalThis.Platform.Persona, null, { timeout: 15000 });
  await p.evaluate(() => globalThis.Platform.Persona.switch('admin'));
  return { ctx, p, errs };
}
// Navigate each surface and assert it does not overflow horizontally at the context's viewport.
async function overflowSweep(p, ids, label) {
  let worst = 0;
  for (const id of ids) {
    await p.evaluate((m) => globalThis.Platform.Router.navigate(m), id);
    await p.locator(`#module-${id}`).first().waitFor({ timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(140);
    const overflow = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
    worst = Math.max(worst, overflow);
    check(`${label}: ${id} no horizontal overflow`, overflow <= 2, `overflow=${overflow}px`);
  }
  return worst;
}

let pass = 0, fail = 0;
const check = (n, ok, d) => { ok ? (pass++, console.log('  PASS  ' + n)) : (fail++, console.log('  FAIL  ' + n + (d ? '  — ' + d : ''))); };

// Surfaces to sweep for mount/runtime crashes (admin-visible). Caught the home `host` ReferenceError.
const SURFACES = ['home', 'correspondence', 'registry', 'ops-hub', 'fasttrack', 'single-item-ops',
  'bulk-assignment', 'orchestrator', 'response-tracking', 'approvals', 'executive', 'stats', 'reports',
  'lookup', 'assistant', 'diagnostics', 'settings'];

try {
  // Boot at the default route, then switch to the admin persona (most ops surfaces are audience:admin).
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.Platform && globalThis.Platform.Persona, null, { timeout: 15000 });
  await page.evaluate(() => globalThis.Platform.Persona.switch('admin'));

  console.log('\n==================== SURFACE MOUNT SWEEP ====================');
  for (const id of SURFACES) {
    consoleErrors.length = 0;
    let mounted = false, err = '';
    try {
      await page.evaluate((m) => globalThis.Platform.Router.navigate(m), id);
      await page.locator(`#module-${id}`).first().waitFor({ timeout: 8000 });
      await page.waitForTimeout(250); // let onVisible data render settle
      mounted = true;
    } catch (e) { err = e.message.split('\n')[0]; }
    const crashed = consoleErrors.find((t) => /mount-failed|is not defined|is not a function|Cannot read/.test(t));
    check(`${id} mounts cleanly`, mounted && !crashed, crashed || err);
  }

  console.log('\n==================== SINGLE-ASSIGN DEEP CHECK ====================');
  consoleErrors.length = 0;
  await page.evaluate(() => globalThis.Platform.Router.navigate('single-item-ops'));
  await page.locator('#module-single-item-ops').first().waitFor({ timeout: 15000 });
  await page.locator('#si-category').first().waitFor({ timeout: 15000 });

  // 1) Category picker populates (Lookups + pf-rich-picker render path — the lazy-property fix).
  await page.locator('#si-category #toggle').click();
  const opts = page.locator('#si-category .opt');
  await opts.first().waitFor({ timeout: 8000 });
  check('category dropdown populates', await opts.count() >= 2, 'count=' + await opts.count());

  // 2) Item picker populates from FETCH_ALL documents.
  const itemToggle = page.locator('#si-item #toggle');
  check('item picker present', await itemToggle.count() === 1);

  // 3) Select "Procurement" → cascade must fill assignee + priority in the live DOM.
  await page.locator('#si-category .opt', { hasText: 'Procurement' }).first().click();
  await page.waitForTimeout(300);
  const assigneeLbl = (await page.locator('#si-assignee #lbl').textContent() || '').trim();
  check('cascade fills assignee picker', /@nitda\.gov\.ng|Procurement|Director/.test(assigneeLbl), 'label="' + assigneeLbl + '"');

  const prioSel = (await page.locator('#si-priority .pf-chip--selected').textContent() || '').trim();
  check('cascade sets priority P1 (High→p1)', /P1/.test(prioSel), 'selected="' + prioSel + '"');

  // 4) Selecting a document populates ref + cascades (details-from-selection path).
  await itemToggle.click();
  await page.locator('#si-item .opt').first().waitFor({ timeout: 8000 });
  check('item dropdown populates from FETCH_ALL', await page.locator('#si-item .opt').count() >= 1);
  await page.locator('#si-item .opt', { hasText: 'Contract award memo' }).first().click();
  await page.waitForTimeout(300);
  const sumRef = (await page.locator('#sum-ref').textContent() || '').trim();
  check('document selection passes ref into summary', /REF-1001/.test(sumRef), 'sum-ref="' + sumRef + '"');

  check('no console errors during journey', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  await page.screenshot({ path: '/tmp/single-assign-smoke.png', fullPage: true });
  console.log('  screenshot → /tmp/single-assign-smoke.png');

  console.log('\n==================== BULK-ASSIGN DEEP CHECK ====================');
  consoleErrors.length = 0;
  await page.evaluate(() => globalThis.Platform.Router.navigate('bulk-assignment'));
  await page.locator('#module-bulk-assignment').first().waitFor({ timeout: 15000 });
  await page.locator('#bulk-category').waitFor({ timeout: 15000 });
  const catOpts = await page.locator('#bulk-category option').count();
  check('bulk category select populates', catOpts >= 3, 'options=' + catOpts); // incl. placeholder
  await page.selectOption('#bulk-category', 'Procurement');
  await page.waitForTimeout(300);
  const subOpts = await page.locator('#bulk-subcategory option').count();
  check('bulk sub-category populates on category change', subOpts >= 2, 'sub-options=' + subOpts);
  const bulkAssignee = await page.locator('#bulk-assignee').inputValue();
  check('bulk cascade fills assignee', /@nitda\.gov\.ng/.test(bulkAssignee), 'assignee="' + bulkAssignee + '"');
  const bulkCoass = await page.locator('#bulk-coassignee').inputValue();
  check('bulk cascade fills co-assignee', /@nitda\.gov\.ng/.test(bulkCoass), 'co-assignee="' + bulkCoass + '"');
  check('no console errors in bulk journey', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  await page.screenshot({ path: '/tmp/bulk-assign-smoke.png', fullPage: true });
  console.log('  screenshot → /tmp/bulk-assign-smoke.png');

  console.log('\n==================== OPS-HUB DEEP CHECK ====================');
  consoleErrors.length = 0;
  await page.evaluate(() => globalThis.Platform.Router.navigate('ops-hub'));
  await page.locator('#module-ops-hub').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  const cards = await page.locator('#module-ops-hub .pf-md__card, #module-ops-hub .pf-table tbody tr').count();
  check('ops-hub renders document cards from fabric', cards >= 1, 'cards=' + cards);

  // Bulk-select a card → the bulk bar's "Assign" hands the selection to bulk-assignment via Context.
  await page.locator('#module-ops-hub .pf-md__check input[type="checkbox"]').first().check();
  await page.locator('#module-ops-hub .pf-md__bulkbar').first().waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#module-ops-hub .pf-md__bulkbar .pf-btn--primary').first().click();
  await page.locator('#module-bulk-assignment').first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
  const handedCount = (await page.locator('#bulk-sum-count').textContent() || '').trim();
  check('ops-hub→bulk handoff carries the selection', handedCount === '1', 'bulk-sum-count="' + handedCount + '"');
  check('no console errors in ops-hub journey', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  console.log('\n==================== RESPONSE-TRACKING DEEP CHECK ====================');
  consoleErrors.length = 0;
  await page.evaluate(() => globalThis.Platform.Router.navigate('response-tracking'));
  await page.locator('#module-response-tracking').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  const tabs = await page.locator('#module-response-tracking .pf-subnav__tab').count();
  check('response-tracking renders phase tabs', tabs >= 2, 'tabs=' + tabs);
  const rtRows = await page.locator('#module-response-tracking .pf-table tbody tr').count();
  check('response-tracking renders rows from fabric', rtRows >= 1, 'rows=' + rtRows);
  check('no console errors in response-tracking', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  console.log('\n==================== APPROVALS DEEP CHECK (verifies K-2 in browser) ====================');
  consoleErrors.length = 0;
  await page.evaluate(() => globalThis.Platform.Router.navigate('approvals'));
  await page.locator('#module-approvals').first().waitFor({ timeout: 15000 });
  await page.locator('#module-approvals .pf-ap__item').first().waitFor({ timeout: 10000 });
  const apCount0 = await page.locator('#module-approvals .pf-ap__item').count();
  check('approvals list renders pending items', apCount0 >= 1, 'count=' + apCount0);

  // Reject reason-gate: rejecting with no minute must NOT open the confirm modal (and not remove item).
  await page.locator('#module-approvals .pf-ap__acts .pf-btn--ghost').first().click();
  await page.waitForTimeout(250);
  check('reject reason-gate blocks empty rejection', await page.locator('pf-modal[open]').count() === 0
    && await page.locator('#module-approvals .pf-ap__item').count() === apCount0);

  // Approve path — commit() is exactly where the K-2 ReferenceError used to throw.
  await page.locator('#module-approvals .pf-ap__acts .pf-btn--primary').first().click();
  await page.locator('pf-modal[open] .primary').first().waitFor({ timeout: 8000 });
  await page.locator('pf-modal[open] .primary').first().click();
  await page.waitForTimeout(500);
  const k2err = consoleErrors.find((t) => /is not defined|ReferenceError|Cannot read/.test(t));
  check('K-2: approve commit() throws no ReferenceError', !k2err, k2err || '');
  // Full success path: upsert→entity:approval:changed→reload drops the now-Approved item from pending.
  check('approved item leaves the pending list', await page.locator('#module-approvals .pf-ap__item').count() < apCount0,
    'before=' + apCount0 + ' after=' + await page.locator('#module-approvals .pf-ap__item').count());
  check('no console errors in approvals journey', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  await page.screenshot({ path: '/tmp/approvals-smoke.png', fullPage: true });
  console.log('  screenshot → /tmp/approvals-smoke.png');

  console.log('\n==================== THEME MATRIX (light / dark / high-contrast) ====================');
  consoleErrors.length = 0;
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.evaluate(() => globalThis.Platform.Theme.set('light'));
  await page.waitForTimeout(120);
  const bgLight = await bodyBg();
  await page.evaluate(() => globalThis.Platform.Theme.set('dark'));
  await page.waitForTimeout(150);
  const themeDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const bgDark = await bodyBg();
  check('dark theme applies [data-theme=dark]', themeDark === 'dark', 'data-theme=' + themeDark);
  check('dark theme re-skins surface (bg differs from light)', bgDark !== bgLight, `light=${bgLight} dark=${bgDark}`);
  await page.screenshot({ path: '/tmp/theme-dark-smoke.png', fullPage: false });
  await page.evaluate(() => globalThis.Platform.Theme.set('hc'));
  await page.waitForTimeout(150);
  const themeHc = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const bgHc = await bodyBg();
  check('high-contrast theme applies [data-theme=hc]', themeHc === 'hc', 'data-theme=' + themeHc);
  check('high-contrast re-skins surface', bgHc !== bgDark, `dark=${bgDark} hc=${bgHc}`);
  check('no console errors across theme switches', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  await page.evaluate(() => globalThis.Platform.Theme.set('light'));

  console.log('\n==================== MOBILE / TABLET (touch) CHECK ====================');
  const mctx = await browser.newContext({ viewport: { width: 834, height: 1112 }, hasTouch: true, isMobile: true });
  const mpage = await mctx.newPage();
  const mErrors = [];
  mpage.on('console', (m) => { if (m.type() === 'error') mErrors.push(m.text()); });
  mpage.on('pageerror', (e) => mErrors.push('pageerror: ' + e.message));
  await mpage.route('**/*', routeHandler);
  await mpage.goto(`${BASE}/`, { waitUntil: 'load' });
  await mpage.waitForFunction(() => globalThis.Platform && globalThis.Platform.Persona, null, { timeout: 15000 });
  await mpage.evaluate(() => globalThis.Platform.Persona.switch('admin'));
  await mpage.evaluate(() => globalThis.Platform.Router.navigate('single-item-ops'));
  await mpage.locator('#module-single-item-ops').first().waitFor({ timeout: 15000 });

  // At tablet-portrait (≤900px) the sidebar collapses to a drawer behind a hamburger.
  const burger = mpage.locator('pf-app-header').locator('.menu');
  check('mobile: hamburger visible at ≤900px', await burger.isVisible());
  const bx = await burger.boundingBox();
  check('mobile: hamburger meets 44px touch floor', !!bx && bx.width >= 44 && bx.height >= 44, bx ? `${Math.round(bx.width)}x${Math.round(bx.height)}` : 'no box');
  // Drawer is off-canvas by default, slides in on tap (transform translateX(-105%) → 0).
  const nav = mpage.locator('pf-app-shell').locator('.nav');
  const navClosed = await nav.boundingBox();
  await burger.click();
  await mpage.waitForTimeout(400);
  const navOpen = await nav.boundingBox();
  check('mobile: nav drawer hidden by default', !!navClosed && navClosed.x < 0, navClosed ? `x=${Math.round(navClosed.x)}` : 'no box');
  check('mobile: drawer slides in on hamburger tap', !!navOpen && navOpen.x > (navClosed ? navClosed.x : -999) && navOpen.x >= -1, navOpen ? `x=${Math.round(navOpen.x)}` : 'no box');
  // A primary button honours the 44px floor under coarse pointer.
  const btn = mpage.locator('#module-single-item-ops .pf-btn').first();
  const btnBox = await btn.boundingBox().catch(() => null);
  check('mobile: .pf-btn meets 44px touch floor', !!btnBox && btnBox.height >= 44, btnBox ? `h=${Math.round(btnBox.height)}` : 'no btn');
  check('mobile: no console errors', mErrors.length === 0, mErrors.slice(0, 3).join(' | '));

  // Full-surface reflow sweep at tablet-portrait — every surface must stack, none overflow.
  await mpage.evaluate(() => globalThis.Platform.Bus.emit('platform:nav:toggle', {})); // close drawer if open
  await mpage.waitForTimeout(200);
  await overflowSweep(mpage, SURFACES, 'portrait-834');
  await mpage.screenshot({ path: '/tmp/mobile-tablet-smoke.png', fullPage: false });
  console.log('  screenshot → /tmp/mobile-tablet-smoke.png');
  await mctx.close();

  console.log('\n==================== LANDSCAPE TABLET (1280, sidebar visible) ====================');
  const land = await newAdminPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  await overflowSweep(land.p, SURFACES, 'landscape-1280');
  check('landscape: no console errors across sweep', land.errs.length === 0, land.errs.slice(0, 3).join(' | '));
  await land.ctx.close();

  console.log('\n==================== PHONE (390, data-heavy surfaces) ====================');
  const phone = await newAdminPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await overflowSweep(phone.p, ['home', 'ops-hub', 'response-tracking', 'single-item-ops', 'bulk-assignment', 'approvals', 'lookup', 'diagnostics'], 'phone-390');
  await phone.ctx.close();

  console.log('\n==================== REDUCED MOTION ====================');
  const rm = await newAdminPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  for (const id of ['home', 'ops-hub', 'single-item-ops']) {
    await rm.p.evaluate((m) => globalThis.Platform.Router.navigate(m), id);
    await rm.p.locator(`#module-${id}`).first().waitFor({ timeout: 10000 }).catch(() => {});
    await rm.p.waitForTimeout(120);
  }
  check('reduced-motion: surfaces render with no console errors', rm.errs.length === 0, rm.errs.slice(0, 3).join(' | '));
  await rm.ctx.close();
} catch (e) {
  fail++; console.log('  FAIL  harness error — ' + e.message.split('\n')[0]);
  try {
    const outlet = await page.locator('#module-outlet').innerHTML().catch(() => '(no outlet)');
    console.log('  outlet[0..200]: ' + String(outlet).replace(/\s+/g, ' ').slice(0, 200));
    if (consoleErrors.length) console.log('  console errors: ' + consoleErrors.slice(0, 5).join(' | '));
    await page.screenshot({ path: '/tmp/single-assign-smoke.png', fullPage: true }).catch(() => {});
  } catch { /* ignore */ }
}

console.log('\n--- RESULT ---  ' + pass + ' passed, ' + fail + ' failed');
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);
