/** Service for 'fasttrack' — @see Endpoints#SUBSIDIARY_ACTIONS */
import { BaseService } from '../../core/base-service.js';
export const fetchData = BaseService.endpoint('SUBSIDIARY_ACTIONS', { cache:15000, expectedKeys:['success','data'] });
