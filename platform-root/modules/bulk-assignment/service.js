/** Service for 'bulk-assignment' — @see Endpoints#BULK_ASSIGNMENT (family F3, envelope v1).
 *  Returns the full normalized API result; the lens reads result.data (F3 aggregate). */
import { BaseService } from '../../core/base-service.js';
export const submitBulkAssignment = BaseService.endpoint('BULK_ASSIGNMENT', { expectedKeys: ['ok', 'data'] });
export default submitBulkAssignment;
