/** Format util: CSV correctness. */
import { describe, it, assert } from '../runner.js';
import { Format } from '../../core/format.js';

export default function () {
  describe('format.toCsv', () => {
    it('escapes commas and quotes', () => {
      const csv = Format.toCsv([{ a: 'x,y', b: 'he said "hi"' }], [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]);
      assert.equal(csv, 'A,B\n"x,y","he said ""hi"""');
    });
    it('handles empty rows', () => {
      assert.equal(Format.toCsv([], [{ key: 'a', label: 'A' }]), 'A\n');
    });
  });
}
