/** OBSIDIAN v4.0 — log.js · the ONLY module permitted console.* (besides /tests/).
 *  Structured, level-thresholded, with a ring buffer the diagnostics module reads. */
const LEVELS = { debug:10, info:20, warn:30, error:40 };
let threshold = LEVELS.info;
const ring = [];
const RING_MAX = 500;

function emit(level, msg, ctx) {
  const entry = { level, msg, ctx: ctx || null, ts: new Date().toISOString() };
  ring.push(entry); if (ring.length > RING_MAX) ring.shift();
  if (LEVELS[level] < threshold) return entry;
  const line = `[obsidian:${level}] ${msg}`;
  /* eslint-disable no-console */
  if (level === 'error') console.error(line, ctx || '');
  else if (level === 'warn') console.warn(line, ctx || '');
  else if (level === 'debug') console.debug(line, ctx || '');
  else console.info(line, ctx || '');
  /* eslint-enable no-console */
  return entry;
}

export const Log = {
  debug:(m,c)=>emit('debug',m,c), info:(m,c)=>emit('info',m,c),
  warn:(m,c)=>emit('warn',m,c), error:(m,c)=>emit('error',m,c),
  setLevel:(name)=>{ if (LEVELS[name]) threshold = LEVELS[name]; },
  buffer:()=>ring.slice(), clear:()=>{ ring.length = 0; }
};
export default Log;
