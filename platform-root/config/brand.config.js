/** OBSIDIAN v4.0 — brand.config.js · NITDA parent + DGO sub-brand identity map. */
export const BRANDS = {
  parent: {
    id:'nitda', labelKey:'brand.nitda.label',
    logo:{ light:'/assets/images/nitda-horizontal.svg', dark:'/assets/images/nitda-white-out.svg',
           mark:'/assets/images/nitda-mark.svg' },
    endorsementKey:'brand.endorsement.nitda'   // "An initiative of NITDA"
  },
  dgo: {
    id:'dgo', labelKey:'brand.dgo.label', rootClass:'subbrand-dgo',
    logo:{ light:'/assets/subbrands/dgo/logo-horizontal.svg',
           dark:'/assets/subbrands/dgo/logo-white-out.svg',
           mark:'/assets/subbrands/dgo/logo-mark.svg' },
    favicon:'/assets/subbrands/dgo/favicon.svg',
    endorsementKey:'brand.endorsement.nitda'
  }
};
export const DEFAULT_BRAND = 'dgo';            // sub-brand prominent by default
export default BRANDS;
