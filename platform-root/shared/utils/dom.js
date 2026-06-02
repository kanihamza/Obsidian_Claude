/** OBSIDIAN v4.0 — dom.js · tiny DOM helpers (no framework). */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c != null) node.append(c.nodeType ? c : document.createTextNode(String(c)));
  return node;
}
export function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
export const firstArray = (data) => Array.isArray(data) ? data
  : (data && typeof data === 'object') ? (Object.values(data).find(Array.isArray) || []) : [];
