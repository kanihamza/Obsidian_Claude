/** OBSIDIAN v4.0 — core/notification-email.js · Builds the HTML preview of the notification email
 *  that PA flows send out on assignment. Mirrors the SPA `buildNotificationEmailHtml` so operators
 *  can review the exact email body before submitting an assignment.
 *
 *  Pure function — no side effects, no I/O. Returns { subject, html } for rendering via
 *  pf-sandboxed-iframe (so the preview is safely sandboxed and matches the eventual email DOM
 *  closely without ever exposing it to the parent page's scripts/cookies).
 */

const ESC = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Builds a notification email preview for a single-item or bulk assignment.
 *  @param data {{
 *     ref, title, assignedTo, assignedToTitle,
 *     category, subCategory, priority, actionRequired,
 *     ackDue, taskDue, copyTo:string[],
 *     comments, assignmentType, createdBy,
 *     items?: [{ID, RefIDD, Title}],   // present for bulk
 *  }}
 *  @returns {{subject:string, html:string}}
 */
export function buildNotificationEmail(d = {}) {
  const isBulk = Array.isArray(d.items) && d.items.length;
  const ref = d.ref || (isBulk ? `${d.items.length} item(s)` : '');
  const verb = d.assignmentType === 'reassignment' ? 'Re-assigned' : 'Assigned';
  const subject = `[NITDA DGO] ${verb}: ${ref} — ${d.title || ''}`.trim();

  const accentBg = 'rgb(5,88,59)';      // brand primary (DGO green)
  const accentFg = 'rgb(255,255,255)';
  const mutedFg = 'rgb(85,85,85)';
  const lineFg = 'rgb(34,34,34)';

  // Row helper: <tr><td style="...">Label</td><td>Value</td></tr>
  const row = (k, v) => v == null || v === '' ? '' : `
    <tr>
      <td style="padding:8px 12px;color:${mutedFg};font-size:13px;width:160px;vertical-align:top;">${ESC(k)}</td>
      <td style="padding:8px 12px;color:${lineFg};font-size:14px;">${typeof v === 'string' ? ESC(v) : v}</td>
    </tr>`;

  // Bulk item list (rendered as an unordered list)
  const itemList = isBulk ? `<ul style="margin:8px 0 0 0;padding-left:20px;color:${lineFg};">
    ${d.items.slice(0, 50).map((it) => `<li><strong>${ESC(it.RefIDD || it.ID || '')}</strong> — ${ESC((it.Title || '').slice(0, 100))}</li>`).join('')}
    ${d.items.length > 50 ? `<li style="color:${mutedFg};">…and ${d.items.length - 50} more</li>` : ''}
  </ul>` : '';

  // CC line (comma-separated, but stored as ';' in payload)
  const ccText = Array.isArray(d.copyTo) && d.copyTo.length ? d.copyTo.join(', ') : '';

  // Banner color reflects urgency
  const priority = d.priority || '';
  const bannerColor = /P1/i.test(priority) ? 'rgb(180,40,40)'
    : /P2/i.test(priority) ? 'rgb(200,140,30)'
    : accentBg;

  const html = `
    <div style="max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">
      <!-- Header banner -->
      <div style="background:${bannerColor};color:${accentFg};padding:16px 20px;border-radius:6px 6px 0 0;">
        <div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.85;">NITDA · Digital Operations</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px;">${ESC(verb)} Task${isBulk ? 's' : ''}: ${ESC(ref)}</div>
      </div>

      <!-- Body -->
      <div style="background:rgb(255,255,255);padding:20px;border:1px solid rgb(220,220,220);border-top:0;border-radius:0 0 6px 6px;">
        <p style="margin:0 0 16px 0;font-size:14px;color:${lineFg};">
          You have been ${ESC(verb.toLowerCase())} the following ${isBulk ? `<strong>${d.items.length} record(s)</strong>` : 'record'}.
          Please review and act${d.actionRequired ? ` (<strong>${ESC(d.actionRequired)}</strong>)` : ''} accordingly.
        </p>

        <!-- Detail table -->
        <table style="width:100%;border-collapse:collapse;border:1px solid rgb(230,230,230);border-radius:4px;overflow:hidden;">
          ${row('Reference', ref)}
          ${!isBulk ? row('Title', d.title) : ''}
          ${row('Assigned To', d.assignedTo + (d.assignedToTitle ? ` (${d.assignedToTitle})` : ''))}
          ${row('Category', d.category + (d.subCategory ? ' / ' + d.subCategory : ''))}
          ${row('Priority', priority)}
          ${row('Action Required', d.actionRequired)}
          ${row('Acknowledgement Due', d.ackDue)}
          ${row('Task Due', d.taskDue)}
          ${row('CC', ccText)}
          ${row('From', d.createdBy)}
        </table>

        ${isBulk ? `<div style="margin-top:16px;">
          <div style="font-weight:600;color:${lineFg};margin-bottom:4px;">Items</div>
          ${itemList}
        </div>` : ''}

        ${d.comments ? `<div style="margin-top:16px;padding:12px;background:rgb(245,245,245);border-radius:4px;border-left:3px solid ${accentBg};">
          <div style="font-size:12px;color:${mutedFg};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Comments</div>
          <div style="color:${lineFg};font-size:14px;white-space:pre-wrap;">${ESC(d.comments)}</div>
        </div>` : ''}

        <p style="margin:24px 0 0 0;font-size:12px;color:${mutedFg};">
          This is an automated notification from NITDA Digital Operations.
          Open the platform to acknowledge, comment, or reassign.
        </p>
      </div>
    </div>`;

  return { subject, html };
}

export default { buildNotificationEmail };
