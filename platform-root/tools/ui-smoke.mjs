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

function mockBody(action) {
  if (action === 'lookups') return { ok: true, status: { http: 200 }, users: USERS, categories: CATEGORIES, departments: DEPARTMENTS };
  if (action === 'fetchAll') return { ok: true, status: { http: 200 }, data: { documents: DOCUMENTS, categories: CATEGORIES, departments: DEPARTMENTS, users: USERS } };
  return { ok: true, status: { http: 200 }, data: {} };
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

await page.route('**/*', async (route) => {
  const req = route.request();
  if (req.url().includes('powerplatform.com')) {
    let action = '';
    try { action = (JSON.parse(req.postData() || '{}').action) || ''; } catch { /* ignore */ }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockBody(action)) });
  }
  return route.continue();
});

let pass = 0, fail = 0;
const check = (n, ok, d) => { ok ? (pass++, console.log('  PASS  ' + n)) : (fail++, console.log('  FAIL  ' + n + (d ? '  — ' + d : ''))); };

console.log('\n==================== SINGLE-ASSIGN UI SMOKE ====================');
try {
  // Boot at the default route, then switch to the admin persona (single-assign is audience:admin).
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.Platform && globalThis.Platform.Persona, null, { timeout: 15000 });
  await page.evaluate(() => globalThis.Platform.Persona.switch('admin'));
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
