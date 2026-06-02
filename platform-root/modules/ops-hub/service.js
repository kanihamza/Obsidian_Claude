/** Service for 'ops-hub' — @see Endpoints#GET_DOCS */
import { BaseService } from '../../core/base-service.js';
export const fetchData = BaseService.endpoint('GET_DOCS', { cache:15000, expectedKeys:['ok','data'] });
