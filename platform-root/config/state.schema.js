/** OBSIDIAN v4.0 — state.schema.js · the single declaration of shared state domains.
 *  Adding a domain requires editing this file (§3.11). modules.<id>.* is private. */
export const SHARED_DOMAINS = ['session','context','notifications','audit','connectivity','theme','brand','locale','feature-flags'];
export const StateSchema = {
  'shared.session.persona':      { type:'string',  persist:'obsidian.persona',  default:'general' },
  'shared.session.userEmail':    { type:'string',  persist:null,                default:'' },
  'shared.theme.mode':           { type:'string',  persist:'obsidian.theme',    default:'system' },
  'shared.theme.density':        { type:'string',  persist:'obsidian.density',  default:'compact' },
  'shared.brand.active':         { type:'string',  persist:'obsidian.brand',    default:'dgo' },
  'shared.locale.code':          { type:'string',  persist:'obsidian.locale',   default:'en' },
  'shared.context.activeReference': { type:'string',  persist:null, default:null },
  'shared.connectivity.online':  { type:'boolean', persist:null,                default:true },
  'shared.connectivity.seeded':  { type:'boolean', persist:null,                default:false },
  'shared.notifications.items':  { type:'array',   persist:null,                default:[] },
  'shared.notifications.unread': { type:'number',  persist:null,                default:0 },
  'shared.audit.trail':          { type:'array',   persist:null,                default:[] }
};
export const persistedPaths = () => Object.entries(StateSchema).filter(([,d]) => d.persist).map(([p,d]) => ({ path:p, key:d.persist, def:d.default }));
export default StateSchema;
