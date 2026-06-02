#!/usr/bin/env bash
# OBSIDIAN v4 — static verification gate. Run from platform-root: bash tools/verify.sh
# Exits 0 only if every lock passes. Requires: python3, node.
set -u
cd "$(dirname "$0")/.." || exit 2
fail=0
say(){ printf '%-34s %s\n' "$1" "$2"; }

# 1) ESM import resolution
unres=$(python3 - <<'PY'
import re,os,glob
m=[]
for js in glob.glob("**/*.js",recursive=True):
  b=os.path.dirname(js)
  for imp in re.findall(r'from\s+["\'](\.[^"\']+)["\']',open(js,encoding="utf-8",errors="ignore").read()):
    p=os.path.normpath(os.path.join(b,imp))
    if not any(os.path.exists(c) for c in (p,p+".js")): m.append(f"{js} -> {imp}")
print("\n".join(m))
PY
)
if [ -n "$unres" ]; then say "imports" "FAIL"; echo "$unres"|sed 's/^/    /'; fail=1; else say "imports" "PASS (0 unresolved)"; fi

# 1b) Named-exports — every `import { name } from './x.js'` must find a real named export in x.js
ne_fail=0
if command -v node >/dev/null 2>&1; then
  pkg_added=0; [ -f package.json ] || { echo '{"type":"module"}' > package.json; pkg_added=1; }
  ne_out=$(node --input-type=module -e '
import fs from "node:fs"; import path from "node:path";
const files=[]; (function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory()){ if(!/^node_modules$|^\./.test(e.name)) walk(p);} else if(e.name.endsWith(".js")) files.push(p);}})(".");
let bad=0;
for(const f of files){
  const src=fs.readFileSync(f,"utf8");
  const rx=/import\s*\{([^}]+)\}\s*from\s*["'\'']([^"'\'']+)["'\'']/g;
  let m;
  while((m=rx.exec(src))){
    if(!m[2].startsWith(".")) continue;
    let target=path.resolve(path.dirname(f), m[2]);
    if(!target.endsWith(".js")) target+=".js";
    if(!fs.existsSync(target)) continue;
    const names=m[1].split(",").map(s=>s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    const tsrc=fs.readFileSync(target,"utf8");
    for(const n of names){
      const re=new RegExp("export\\s+(?:default\\s+)?(?:function|const|let|var|class)\\s+"+n+"\\b|export\\s*\\{[^}]*\\b"+n+"\\b[^}]*\\}");
      if(!re.test(tsrc)){ console.log(`MISSING ${n} in ${path.relative(".",target)} (used by ${path.relative(".",f)})`); bad++; }
    }
  }
}
process.exit(bad?1:0);
' 2>&1); ne_rc=$?
  [ $pkg_added -eq 1 ] && rm -f package.json
  if [ $ne_rc -ne 0 ]; then say "named-exports" "FAIL"; printf '%s\n' "$ne_out" | sed 's/^/    /'; fail=1; else say "named-exports" "PASS"; fi
else
  say "named-exports" "SKIPPED (no node)"
fi

# 2) No external CDN / framework
cdn=$(grep -rEl "https?://(cdn|unpkg|jsdelivr|ajax\.googleapis|fonts\.googleapis|fonts\.gstatic)" --include=*.js --include=*.html --include=*.css . 2>/dev/null)
if [ -n "$cdn" ]; then say "no-CDN" "FAIL"; echo "$cdn"|sed 's/^/    /'; fail=1; else say "no-CDN" "PASS"; fi

# 3) Console purity (only core/log.js may call console.*)
con=$(grep -rEl "console\.(log|warn|error|debug|info)" --include=*.js core shared modules config 2>/dev/null | grep -v "core/log.js")
if [ -n "$con" ]; then say "console-purity" "FAIL"; echo "$con"|sed 's/^/    /'; fail=1; else say "console-purity" "PASS"; fi

# 4) Hex lock (literal colors only allowed in themes/*.css where tokens are defined)
hex=$(grep -rEl "#[0-9a-fA-F]{3,8}\b" --include=*.js --include=*.css modules shared styles core 2>/dev/null)
if [ -n "$hex" ]; then say "hex-lock" "FAIL"; echo "$hex"|sed 's/^/    /'; fail=1; else say "hex-lock" "PASS"; fi

# 5) JSON validity (config, data, i18n)
badjson=""
while IFS= read -r f; do python3 -c "import json,sys;json.load(open('$f',encoding='utf-8'))" 2>/dev/null || badjson="$badjson $f"; done < <(find config data -name '*.json' 2>/dev/null)
if [ -n "$badjson" ]; then say "json-valid" "FAIL"; echo "   $badjson"; fail=1; else say "json-valid" "PASS"; fi

# 6) JS syntax (node --check)
syn=""
while IFS= read -r f; do node --check "$f" >/dev/null 2>&1 || syn="$syn $f"; done < <(find . -name '*.js' -not -path '*/node_modules/*')
if [ -n "$syn" ]; then say "js-syntax" "FAIL"; echo "   $syn"; fail=1; else say "js-syntax" "PASS"; fi

# 7) i18n: static data-i18n keys present in en.json (best-effort; dynamic keys not covered)
misskeys=$(python3 - <<'PY'
import json,re,glob
d=json.load(open("config/i18n/en.json",encoding="utf-8"))
def has(k):
  o=d
  for p in k.split("."):
    if not isinstance(o,dict) or p not in o: return False
    o=o[p]
  return True
keys=set()
for h in glob.glob("**/*.html",recursive=True):
  keys|=set(re.findall(r'data-i18n="([^"]+)"',open(h,encoding="utf-8",errors="ignore").read()))
miss=[k for k in sorted(keys) if not has(k)]
print("\n".join(miss))
PY
)
if [ -n "$misskeys" ]; then say "i18n-static-keys" "FAIL"; echo "$misskeys"|sed 's/^/    missing: /'; fail=1; else say "i18n-static-keys" "PASS"; fi

# 8) Placeholder scan (advisory)
ph=$(grep -rinE "\b(lorem ipsum|TODO|FIXME|XXX|placeholder text)\b" --include=*.js --include=*.html --include=*.css modules core shared 2>/dev/null | wc -l | tr -d ' ')
say "placeholder-scan" "ADVISORY ($ph hits)"


# 9) Embedded-URL scan (ADVISORY) — by platform directive the full signed flow URLs are embedded
#    directly in config/endpoints.config.js (live-direct integration). This is intentional; we only
#    report the count so it stays visible. Outside endpoints.config.js, signed URLs should not appear.
emb=$(grep -rEn "sig=[A-Za-z0-9_\\-]{20,}" --include=*.js . 2>/dev/null | grep -v "config/endpoints.config.js" | grep -v "PATH = (wf, sig)")
if [ -n "$emb" ]; then say "embedded-url-scan" "FAIL (signed URL outside endpoints.config.js)"; echo "$emb"|sed 's/^/    /'; fail=1; else say "embedded-url-scan" "PASS (embedded only in endpoints.config.js)"; fi
# 9b) i18n-runtime-keys — verify every literal t('key.path') in JS resolves via dot-path in en.json.
#     Skips runtime-concat prefixes ending with '.' (e.g., t('entity.' + et)).
if command -v python3 >/dev/null 2>&1; then
  rk_out=$(python3 - << 'PY'
import json, re, os, sys
i18n=json.load(open("config/i18n/en.json",encoding="utf-8"))
def has(k):
  cur=i18n
  for p in k.split("."):
    if not isinstance(cur,dict) or p not in cur: return False
    cur=cur[p]
  return True
used=set()
for root,dirs,files in os.walk("."):
  if any(x in root for x in ["/.git","/node_modules","/tests","./tests"]): continue
  for f in files:
    if not f.endswith(".js"): continue
    src=open(os.path.join(root,f),encoding="utf-8").read()
    for rx in [r"(?:^|[^\.\w])t\('([a-zA-Z][a-zA-Z0-9_\.\-]+)'", r"\.t\('([a-zA-Z][a-zA-Z0-9_\.\-]+)'",
               r"(?:message|label|title|summary|confirm|empty|select|help)Key:\s*'([a-zA-Z][a-zA-Z0-9_\.\-]+)'"]:
      used.update(re.findall(rx,src))
missing=[k for k in sorted(used) if not k.endswith(".") and not has(k)]
if missing:
  print("MISSING i18n keys (literal t('...') in JS not in en.json):")
  for k in missing: print("  - "+k)
  sys.exit(1)
print(f"{len(used)} literal keys checked, 0 missing")
PY
)
  rk_rc=$?
  if [ $rk_rc -ne 0 ]; then say "i18n-runtime-keys" "FAIL"; printf '%s\n' "$rk_out" | sed 's/^/    /'; fail=1
  else say "i18n-runtime-keys" "PASS ($(echo "$rk_out" | head -1))"
  fi
else
  say "i18n-runtime-keys" "SKIPPED"
fi

# 10) Boot smoke — full module loading under stubbed browser globals (catches component-init regressions)
if [ -f tools/boot-smoke.mjs ] && command -v node >/dev/null 2>&1; then
  bs_out=$(node tools/boot-smoke.mjs 2>&1)
  bs_rc=$?
  if [ $bs_rc -ne 0 ]; then say "boot-smoke" "FAIL"; printf '%s\n' "$bs_out" | sed 's/^/    /'; fail=1
  else say "boot-smoke" "PASS ($(echo "$bs_out" | head -1 | sed 's/^.*— //'))"
  fi
else
  say "boot-smoke" "SKIPPED"
fi

echo "---------------------------------------------"
if [ "$fail" -eq 0 ]; then echo "STATIC VERIFICATION: PASS"; else echo "STATIC VERIFICATION: FAIL"; fi
exit $fail
