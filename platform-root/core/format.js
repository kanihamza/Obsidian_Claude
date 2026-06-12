/** OBSIDIAN v4.0 — format.js · locale-aware date/number + CSV export (Core tier). */
let locale = 'en';
export const Format = {
  setLocale(code) { locale = code || 'en'; },
  date(value, opts) { try { return new Intl.DateTimeFormat(locale, opts || { dateStyle:'medium' }).format(new Date(value)); } catch { return String(value); } },
  dateTime(value) { return Format.date(value, { dateStyle:'medium', timeStyle:'short' }); },
  relative(value) {
    const d = new Date(value).getTime(); if (Number.isNaN(d)) return String(value);
    const diff = Math.round((d - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric:'auto' });
    const units = [['year',31536000],['month',2592000],['day',86400],['hour',3600],['minute',60],['second',1]];
    for (const [unit, secs] of units) if (Math.abs(diff) >= secs || unit === 'second') return rtf.format(Math.round(diff / secs), unit);
    return '';
  },
  number(value, opts) { try { return new Intl.NumberFormat(locale, opts).format(value); } catch { return String(value); } },
  /** Build RFC-4180 CSV from rows + column defs [{key,label}]. */
  toCsv(rows, columns) {
    const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = columns.map((c) => esc(c.label || c.key)).join(',');
    const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n');
    return head + '\n' + body;
  },
  downloadCsv(filename, csv) {
    if (typeof document === 'undefined') return;
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  },
  /** Download an HTML string as a standalone .html file (report export). */
  downloadHtml(filename, html) {
    if (typeof document === 'undefined') return;
    const doc = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' + filename + '</title></head><body>' + html + '</body></html>';
    const blob = new Blob([doc], { type:'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
};
export default Format;
