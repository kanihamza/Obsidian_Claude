/** OBSIDIAN v4.0 — theme-manager.js · light/dark/system + high-contrast + density.
 *  Applies [data-theme] / [data-density] on <html>, persists via State, syncs cross-tab. */
import { State } from './state.js';
import { Bus } from './bus.js';
import { AppConfig } from '../config/app.config.js';

const MODES = ['light','dark','system','hc'];
let mql = null;

function resolved(mode) {
  if (mode === 'system') return (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  return mode;
}
function apply(mode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved(mode));
  Bus.emit('platform:theme:changed', { mode, resolved: resolved(mode) });
}
export const Theme = {
  init() {
    const mode = State.get('shared.theme.mode', AppConfig.defaultTheme);
    const density = State.get('shared.theme.density', AppConfig.defaultDensity);
    document.documentElement.setAttribute('data-density', density);
    apply(mode);
    if (typeof matchMedia === 'function') {
      mql = matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', () => { if (State.get('shared.theme.mode') === 'system') apply('system'); });
    }
    Bus.on('platform:theme:cycle', () => Theme.cycle());
    Bus.on('platform:storage:changed', (e) => { if (e.key === 'theme') apply(State.get('shared.theme.mode', mode)); });
  },
  set(mode) { if (!MODES.includes(mode)) return; State.set('shared.theme.mode', mode); apply(mode); },
  cycle() { const order=['system','light','dark','hc']; const cur=State.get('shared.theme.mode','system');
    Theme.set(order[(order.indexOf(cur)+1)%order.length]); },
  setDensity(d) { State.set('shared.theme.density', d); document.documentElement.setAttribute('data-density', d); },
  current() { return State.get('shared.theme.mode','system'); },
  resolved() { return resolved(Theme.current()); }
};
export default Theme;
