/** Service for 'assignment' — @see Endpoints#FETCH_ALL */
import { BaseService } from '../../core/base-service.js';
export const fetchData = BaseService.endpoint('FETCH_ALL', { cache:15000, expectedKeys:['ok','data'] });
