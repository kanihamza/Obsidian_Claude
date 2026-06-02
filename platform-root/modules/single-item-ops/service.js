/** Service for 'single-item-ops' — @see Endpoints#SINGLE_ASSIGNMENT (family F2, envelope v1). */
import { BaseService } from '../../core/base-service.js';
export const assignSingle = BaseService.endpoint('SINGLE_ASSIGNMENT', { expectedKeys: ['ok', 'data'] });
export default assignSingle;
