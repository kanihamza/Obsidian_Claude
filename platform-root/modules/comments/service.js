/** Service for 'comments' — write via canonical DYNAMIC_GLOBAL_ACTIONS (no dedicated comment flow
 *  exists in Stream-B; the generic action dispatcher is the canonical home). Reads come from the
 *  shared fabric (Entities), hydrated by FETCH_ALL. @see /docs/CONTRACT-CONFORMANCE.md */
import { BaseService } from '../../core/base-service.js';
export const addComment = BaseService.endpoint('DYNAMIC_GLOBAL_ACTIONS', { expectedKeys: ['ok', 'data'] });
