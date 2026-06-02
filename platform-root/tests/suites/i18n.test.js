/** i18n resolution + missing-key fallback. */
import { describe, it, assert } from '../runner.js';
import { I18n } from '../../core/i18n.js';

export default async function () {
  await I18n.load('en');
  describe('i18n', () => {
    it('resolves a known key', () => { assert.equal(I18n.t('breadcrumb.home'), 'Home'); });
    it('interpolates vars', () => { assert.ok(I18n.t('footer.copyright', { year: 2026 }).includes('2026')); });
    it('missing key returns guillemets', () => { assert.ok(I18n.t('no.such.key').startsWith('\u00ab')); });
  });
}
