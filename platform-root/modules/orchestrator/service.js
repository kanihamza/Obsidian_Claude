/** Service for 'orchestrator'. This lens is FABRIC-BACKED: it reads tasks from Platform.Entities
 *  (hydrated once via FETCH_ALL) and performs no per-row fetch, per the lens contract. No endpoint
 *  binding is required here; mutations elsewhere propagate through Entities events. */
export const fabricBacked = true;
