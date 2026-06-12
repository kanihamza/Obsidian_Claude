/** spa-extract.mjs — token-efficient SPA inventory extractor.
 *  Reads each legacy SPA inside Node (no model tokens), emits a spa-manifest.schema.json draft to
 *  spa-manifests/<id>.json, and a compact signals dump to spa-manifests/_signals/<id>.txt for cheap
 *  enrichment. Skips manifests that already exist (keeps richer hand/agent-authored ones).
 *  Run: node spa-extract.mjs */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const MAP = [
  ['spa-01', 'REGEN_DGO_LIVE_V2_8_ENHANCED_FINAL.html'],
  ['spa-02', 'NITDA_Digital_Ops_Hub_patched.html'],
  ['spa-03', 'Optimized_NITDA DGO Smart Orchestrator Merged Launcher.html'],
  ['spa-04', 'dg_ceo_office_platform-1.html'],
  ['spa-05', 'DGO_FastTrack_Monitoring_SPA.html'],
  ['spa-06', 'Assignment_Intelligence_Dashboard.html'],
  ['spa-07', 'DAA_DGO_HUB_ASSIGN_ITEM_DIRECT_Build_v2.0.html'],
  ['spa-08', 'stats_screen_spa-2.html'],
  ['spa-09', ' Response Tracking & Matrix.html'],
  ['spa-10', 'Correspondence_Tracker.html'],
  ['spa-11', 'Response matrix v2.html'],
  ['spa-12', 'NITDA_DGO_HUB_ACK.html'],
  ['spa-13', 'Unified Smart Orchestrator.html'],
  ['spa-14', 'Reports_Dashboard_Live.html'],
  ['spa-15', 'DGCEO Correspondence & Decision Hub.html'],
  ['spa-16', 'registry_movement.html'],
  ['spa-17', 'approvals.html'],
  ['spa-18', 'Executive_Operations_Hub_Build_v2.0.html'],
  ['spa-19', 'Comments_Thread.html'],
  ['spa-20', 'HTML Reports_Builder_SPA.html']
];

const OUT = 'spa-manifests';
const SIG = OUT + '/_signals';
mkdirSync(SIG, { recursive: true });

const uniq = (a) => [...new Set(a)];
const allMatch = (re, s) => { const o = []; let m; while ((m = re.exec(s))) o.push(m[1]); return o; };
const redactSig = (u) => u.replace(/sig=[^&"'`\s)]+/gi, 'sig=__REDACTED__');

function extract(id, file) {
  const src = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const lines = src ? src.split('\n').length : 0;

  // URLs that look like Power Automate / Azure Logic flows
  const urlRe = /https?:\/\/[^\s"'`)]+/gi;
  const urls = uniq((src.match(urlRe) || []).filter((u) => /powerplatform|logic\.azure|environment\.api|\/workflows\/|triggers\/manual/i.test(u)));
  const flows = urls.map((u, i) => {
    const base = redactSig(u).split('&').slice(0, 6).join('&');
    const idx = src.indexOf(u.slice(0, 40));
    const win = idx >= 0 ? src.slice(Math.max(0, idx - 300), idx + 300) : '';
    const method = (win.match(/method\s*:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/i) || [])[1] || (/body\s*:/.test(win) ? 'POST' : 'POST');
    return {
      name: 'flow_' + (i + 1), method: method.toUpperCase(), endpoint_base: base,
      has_sas_token: /sig=/i.test(u), auth_scheme: /sig=/i.test(u) ? 'sas-token' : null,
      custom_headers: uniq(allMatch(/['"]([A-Za-z-]+)['"]\s*:\s*['"]application\/json['"]/g, win)).length ? ['Content-Type: application/json'] : [],
      trigger: '[auto: review]', request_shape: '[auto: review JSON body]', response_shape: '[auto: review]',
      depends_on: null, polling_interval_ms: null, timeout_ms: null, error_handling: /\.catch\(|try\s*{/.test(win) ? 'try/catch present' : null
    };
  });

  const scripts = uniq(allMatch(/<script[^>]+src=["']([^"']+)["']/gi, src));
  const libs = scripts.map((s) => ({ name: (s.split('/').pop() || s).split('?')[0], version: (s.match(/@?(\d+\.\d+\.\d+)/) || [])[1] || null, source: s }));

  const ids = uniq(allMatch(/\bid=["']([^"']+)["']/g, src)).slice(0, 60);
  const classes = uniq(allMatch(/\bclass=["']([^"']+)["']/g, src).flatMap((c) => c.split(/\s+/))).filter(Boolean).slice(0, 80);
  const inlineStyles = /\bstyle=["']/.test(src);
  const onHandlers = uniq(allMatch(/\son([a-z]+)=["']/g, src).map((h) => 'on' + h)).slice(0, 30);
  const listeners = uniq(allMatch(/addEventListener\(\s*['"]([^'"]+)['"]/g, src)).slice(0, 30);
  const fns = uniq(allMatch(/function\s+([A-Za-z0-9_$]+)\s*\(/g, src)).slice(0, 80);
  const arrowFns = uniq(allMatch(/(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g, src)).slice(0, 40);
  const colors = uniq((src.match(/#[0-9a-fA-F]{3,8}\b/g) || [])).slice(0, 40);
  const fonts = uniq(allMatch(/font-family\s*:\s*([^;"'}]+)/gi, src).flatMap((f) => f.split(',').map((x) => x.trim().replace(/["']/g, '')))).filter(Boolean).slice(0, 12);

  const assets = [];
  if (/src=["']data:image\/[^;]+;base64/i.test(src)) assets.push({ type: 'image', delivery: 'inline-base64', ref: 'embedded base64 image(s)', approx_size: null });
  if (/data:image\/svg\+xml/i.test(src)) assets.push({ type: 'image/svg', delivery: 'data-uri-svg', ref: 'data-uri svg(s)', approx_size: null });
  if (/<svg[\s>]/i.test(src)) assets.push({ type: 'image/svg', delivery: 'inline-svg', ref: 'inline <svg> icon(s)', approx_size: 'small' });
  const extImgs = uniq((src.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi) || [])).length;
  if (extImgs) assets.push({ type: 'image', delivery: 'external-url', ref: extImgs + ' external image url(s)', approx_size: null });

  const title = (src.match(/<title>([^<]+)<\/title>/i) || [])[1] || (src.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [])[1] || null;
  const headings = uniq(allMatch(/<h[1-3][^>]*>\s*([^<]{2,80}?)\s*<\/h[1-3]>/gi, src)).slice(0, 40);
  const buttons = uniq(allMatch(/<button[^>]*>\s*([^<]{2,40}?)\s*<\/button>/gi, src)).slice(0, 40);
  const tabs = uniq(allMatch(/role=["']tab["'][^>]*>\s*([^<]{2,40})/gi, src)).slice(0, 20);

  const ariaPresent = /aria-[a-z]+=|role=["']/i.test(src);
  const keyboardNav = /keydown|keyup|keypress|tabindex/i.test(src);
  const langs = uniq(allMatch(/lang=["']([a-z]{2})["']/gi, src));
  const i18nPresent = /data-i18n|I18n\.t\(|\bt\(['"][a-z.]+['"]\)/.test(src);

  const manifest = {
    schema_version: '1.1', spa_id: id, source_filename: file, title: title || null,
    purpose: '[AUTO-DRAFT — needs review] ' + (title ? title + '. ' : '') + 'Inventoried from ' + file + '.',
    offerings: (headings.length || buttons.length)
      ? uniq([...headings, ...buttons]).slice(0, 20).map((n) => ({ name: n, description: '[auto: heading/control — confirm]', entry_point: null }))
      : [{ name: title || file, description: '[auto: review]', entry_point: null }],
    views: (headings.length ? headings : [title || file]).slice(0, 20).map((n) => ({ name: n, type: 'section', trigger: '[auto]' })),
    js_utilities: [...fns, ...arrowFns].slice(0, 60).map((n) => ({ name: n, signature: n + '(…)', purpose: '[auto: review]', approx_lines: 0 })),
    dom_contract: { element_ids: ids, css_classes: classes, inline_styles_present: inlineStyles, notes: '[auto-extracted]' },
    event_handling: { inline_handlers: onHandlers, listener_bound: listeners, global_listeners: listeners.filter((l) => /keydown|resize|hashchange|message|online|offline/.test(l)), notes: '[auto-extracted]' },
    global_scope: { global_functions: fns, global_variables: [], notes: '[auto: globals not fully resolved]' },
    state_management: '[AUTO-DRAFT — review] ' + (/localStorage/.test(src) ? 'uses localStorage; ' : '') + (/let\s|var\s|const\s/.test(src) ? 'module-scope variables.' : 'minimal.'),
    design_tokens: { framework: /tailwind/i.test(src) ? 'Tailwind' : (/bootstrap/i.test(src) ? 'Bootstrap' : null), colors, fonts, spacing_or_layout_notes: inlineStyles ? 'inline styles present' : null },
    assets,
    external_libraries: libs,
    power_automate_flows: flows,
    behaviors: {
      loading_states: /loading|spinner|skeleton|aria-busy/i.test(src), error_states: /\.catch\(|try\s*{|error/i.test(src),
      polling_present: /setInterval/.test(src), timers_present: /setTimeout/.test(src), notes: '[auto-extracted]'
    },
    accessibility: { aria_present: ariaPresent, keyboard_nav: keyboardNav, notes: '[auto-extracted]' },
    localization: { i18n_present: i18nPresent, languages: langs.length ? langs : ['en'], notes: '[auto-extracted]' },
    risks_and_quirks: ['[AUTO-DRAFT manifest — mechanical extraction; prose/semantic fields (purpose, offerings, flow shapes) must be reviewed before treating as verified.]'],
    extraction_meta: { complete: false, unparseable_sections: ['auto-draft: semantic fields pending review'], source_lines_approx: lines }
  };

  const sig = [
    'SPA ' + id + ' — ' + file + ' (' + lines + ' lines)',
    'TITLE: ' + (title || '—'),
    'HEADINGS (' + headings.length + '): ' + headings.join(' | '),
    'BUTTONS (' + buttons.length + '): ' + buttons.join(' | '),
    'TABS: ' + tabs.join(' | '),
    'FLOW URLS (' + flows.length + '):\n  ' + flows.map((f) => f.method + ' ' + f.endpoint_base).join('\n  '),
    'LIBS: ' + libs.map((l) => l.name).join(', '),
    'KEY FNS (' + fns.length + '): ' + fns.slice(0, 50).join(', '),
    'EVENTS: inline=' + onHandlers.join(',') + ' | listeners=' + listeners.join(',')
  ].join('\n');

  return { manifest, sig, summary: id + ': flows=' + flows.length + ' libs=' + libs.length + ' ids=' + ids.length + ' fns=' + fns.length + ' headings=' + headings.length + ' lines=' + lines };
}

let wrote = 0, skipped = 0;
for (const [id, file] of MAP) {
  const dest = OUT + '/' + id + '.json';
  const { manifest, sig, summary } = extract(id, file);
  writeFileSync(SIG + '/' + id + '.txt', sig);
  if (existsSync(dest)) { console.log(summary + '  [manifest exists — kept]'); skipped++; continue; }
  writeFileSync(dest, JSON.stringify(manifest, null, 2));
  console.log(summary + '  [draft written]');
  wrote++;
}
console.log('\n' + wrote + ' drafts written, ' + skipped + ' kept. Signals → ' + SIG + '/');
