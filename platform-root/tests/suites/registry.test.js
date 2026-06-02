/** Endpoint registry + module registry integrity. */
import { describe, it, assert } from '../runner.js';
import { Endpoints, ENDPOINT_KEYS, ACTIVE_ENDPOINT_KEYS } from '../../config/endpoints.config.js';
import { Modules } from '../../core/modules-registry.js';
import '../../modules/index.js';

export default function () {
  describe('endpoints', () => {
    it('every endpoint has an embedded signed url', () => {
      for (const k of ENDPOINT_KEYS) assert.ok(Endpoints[k].url && Endpoints[k].url.includes('sig='), k + ' missing signed url');
    });
    it('all endpoints active (none reserved)', () => {
      assert.equal(ACTIVE_ENDPOINT_KEYS.length, ENDPOINT_KEYS.length);
      assert.equal(ACTIVE_ENDPOINT_KEYS.length, 14);
    });
    it('shared-workflow endpoints share a url', () => {
      assert.ok(Endpoints.REFERENCE_DATA.url === Endpoints.AI_DOC_ANALYSIS.url);
    });
    it('every endpoint declares expectedKeys', () => {
      for (const k of ENDPOINT_KEYS) assert.ok(Array.isArray(Endpoints[k].expectedKeys), k);
    });
  });
  describe('modules', () => {
    it('17 modules registered', () => { assert.equal(Modules.all().length, 17); });
    it('general persona cannot see admin modules', () => {
      const ids = Modules.visibleFor('general').map((m) => m.id);
      assert.ok(!ids.includes('bulk-assignment'));
      assert.ok(ids.includes('home'));
    });
    it('admin sees everything non-sunset', () => {
      assert.equal(Modules.visibleFor('admin').length, 17);
    });
  });
}
