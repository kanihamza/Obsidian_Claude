#!/usr/bin/env bash
# ============================================================================
# OBSIDIAN v4.0 — deploy-s0-s1-a11.sh
# Patches a local platform-root/ with the exact S0 + S1 + A-11 file set from
# this session. Raw-file overwrite (no git remote required). Idempotent: re-running
# simply rewrites the same bytes.
#
# Usage (from your Termux shell):
#   bash deploy-s0-s1-a11.sh [TARGET_DIR]
#   TARGET_DIR defaults to the current directory; it must be your platform-root/.
#
# After it runs:
#   cd "$TARGET_DIR"
#   bash tools/verify.sh                       # expect STATIC VERIFICATION: PASS
#   echo '{"type":"module"}' > package.json
#   node tools/real-response-smoke.mjs /tmp/real-response.json
#   rm -f package.json
#   python -m http.server 8080                 # then open /ui-sandbox.html in the Tab A9 browser
# ============================================================================
set -eu
DIR="${1:-.}"
echo "[deploy] target: $DIR"
write() { # write <relative-path>  (content follows via heredoc on stdin)
  local p="$DIR/$1"
  mkdir -p "$(dirname "$p")"
  cat > "$p"
  echo "[deploy]   wrote $1"
}

write 'config/i18n/en.json' <<'__OBSIDIAN_DEPLOY_EOF__'
{
  "endpoint": {
    "getDocs": {
      "label": "Documents"
    },
    "aiEmailAnalysis": {
      "label": "Email Analysis"
    },
    "dynamicGlobalActions": {
      "label": "Global Actions"
    },
    "fetchEmailAttachments": {
      "label": "Email Attachments"
    },
    "referenceData": {
      "label": "References & Lookups"
    },
    "aiDocAnalysis": {
      "label": "Document Analysis"
    },
    "otpGenerate": {
      "label": "Send Verification Code"
    },
    "otpVerify": {
      "label": "Verify Code"
    },
    "aiChat": {
      "label": "Assistant"
    },
    "fetchAll": {
      "label": "All Data & References"
    },
    "bulkAssignment": {
      "label": "Document Bulk Task Assignment"
    },
    "singleAssignment": {
      "label": "Document Single Task Assignment"
    },
    "subsidiaryActions": {
      "label": "Subsidiary Actions"
    },
    "emailRelatedTask": {
      "label": "Create Task From Email"
    },
    "reserved14": {
      "label": "Reserved"
    },
    "reserved15": {
      "label": "Reserved"
    }
  },
  "field": {
    "referenceId.label": "Reference ID",
    "assignedTo.label": "Assigned To",
    "priority.label": "Priority",
    "status.label": "Status",
    "title.label": "Title",
    "createdTaskId.label": "Task ID",
    "id": {
      "label": "ID"
    },
    "referenceId": {
      "label": "Reference"
    },
    "title": {
      "label": "Title"
    },
    "subject": {
      "label": "Subject"
    },
    "status": {
      "label": "Status"
    },
    "assignedTo": {
      "label": "Assigned To",
      "help": "User who will own this task."
    },
    "priority": {
      "label": "Priority"
    },
    "ts": {
      "label": "Date"
    },
    "count": {
      "label": "Selected References"
    },
    "createdTaskId": {
      "label": "Task ID"
    },
    "docs": {
      "label": "Documents"
    },
    "tasks": {
      "label": "Tasks"
    },
    "emails": {
      "label": "Emails"
    },
    "references": {
      "label": "References"
    },
    "activities": {
      "label": "Activities"
    },
    "lookups": {
      "label": "Lookups"
    },
    "total": {
      "label": "Total"
    },
    "sum": {
      "label": "Total"
    },
    "avg": {
      "label": "Average"
    },
    "all": {
      "label": "All Records"
    },
    "sender": {
      "label": "Sender"
    },
    "dates": {
      "label": "Dates"
    },
    "action": {
      "label": "Action"
    },
    "assignmentType": {
      "label": "Assignment type"
    },
    "category": {
      "label": "Category"
    },
    "subCategory": {
      "label": "Sub-category",
      "help": "Optional refinement under the chosen category."
    },
    "ackDue": {
      "label": "Acknowledgement due",
      "help": "Deadline for the assignee to acknowledge receipt."
    },
    "taskDue": {
      "label": "Task due",
      "help": "Deadline for completion of the assigned work."
    },
    "copyTo": {
      "label": "Copy to (comma-separated)",
      "hint": "comma-separated emails",
      "help": "Comma-separated email addresses to copy on the assignment."
    },
    "activityTask": {
      "label": "New activity / task note",
      "help": "Short description of the activity to be performed."
    },
    "required": "Required field",
    "comments": {
      "label": "Comments"
    }
  },
  "errors": {
    "api": {
      "timeout": "The request took too long and was cancelled. Try again.",
      "network": "Could not reach the service. Check your connection and try again.",
      "server": "The service reported an error. The team has been notified.",
      "client": "The request could not be completed as submitted.",
      "parse": "The service returned an unexpected response.",
      "notImplemented": "This capability is reserved and not yet available.",
      "unknownEndpoint": "This action is not configured.",
      "rateLimit": "Too many requests right now. Please wait and try again.",
      "unavailable": "The service is temporarily unavailable. Retrying shortly.",
      "auth": "Your session isn't authorized to perform this action.",
      "duplicate": "A previous request is still in flight. Please wait."
    }
  },
  "common": {
    "actions": {
      "dismiss": "Dismiss",
      "submit": "Submit",
      "refresh": "Refresh",
      "retry": "Retry",
      "cancel": "Cancel",
      "export": "Export CSV",
      "confirm": "Confirm",
      "processing": "Processing…",
      "view": "View",
      "clear": "Clear",
      "remove": "Remove",
      "close": "Close"
    },
    "state": {
      "saved": "Saved successfully.",
      "loading": "Loading…",
      "empty": "Nothing to show yet."
    }
  },
  "app": {
    "title": "DGO Digital Ops"
  },
  "nav": {
    "group": {
      "operations": "Operations",
      "governance": "Governance",
      "executive": "Executive",
      "administration": "Administration",
      "system": "System",
      "intelligence": "Intelligence",
      "assignments": "Assignments"
    },
    "util": {
      "palette": "Command palette",
      "notifications": "Notifications",
      "theme": "Toggle theme",
      "persona": "Persona"
    },
    "badge": {
      "deprecated": "Deprecated"
    }
  },
  "brand": {
    "nitda": {
      "label": "NITDA"
    },
    "dgo": {
      "label": "DGO Digital Ops"
    },
    "endorsement": {
      "nitda": "An initiative of NITDA"
    }
  },
  "persona": {
    "admin": {
      "label": "Administrator"
    },
    "executive": {
      "label": "Executive"
    },
    "general": {
      "label": "General"
    },
    "switcher": {
      "label": "View as",
      "aria": "Switch persona"
    }
  },
  "shell": {
    "skipLink": "Skip to main content",
    "nav": {
      "aria": "Primary"
    },
    "menu": {
      "toggle": "Toggle navigation"
    },
    "loading": "Loading",
    "empty": {
      "title": "Select a workspace",
      "body": "Choose a module from the navigation to begin."
    }
  },
  "footer": {
    "copyright": "© {year} NITDA Digital Ops"
  },
  "breadcrumb": {
    "home": "Home"
  },
  "modal": {
    "close": "Close dialog"
  },
  "sidepanel": {
    "close": "Close panel"
  },
  "deprecation": {
    "icon": {
      "aria": "Warning"
    },
    "banner": {
      "message": "This module is deprecated. Use {replacedBy}. It will be removed on {date}."
    }
  },
  "module": {
    "home": {
      "title": "Overview"
    },
    "ops-hub": {
      "title": "Operations Hub",
      "empty": "No documents in scope. Refresh, or capture correspondence to generate documents."
    },
    "fasttrack": {
      "title": "Fast Track Monitoring",
      "empty": "No items in the SLA board yet."
    },
    "orchestrator": {
      "title": "Smart Orchestrator",
      "empty": "No tasks match. Create or assign tasks from the documents lens."
    },
    "registry": {
      "title": "File Movement",
      "empty": "No file movements recorded. Activity appears here as actions occur."
    },
    "correspondence": {
      "title": "Correspondence",
      "empty": "No correspondence yet. Use 'New' to capture an email-to-task entry."
    },
    "response-tracking": {
      "title": "Response Tracking",
      "empty": "No references to track. Activity appears here as items move through the workflow."
    },
    "comments": {
      "title": "Comments",
      "empty": "No comments yet for the active reference."
    },
    "approvals": {
      "title": "Approvals",
      "empty": "No approvals waiting. Items routed for sign-off appear here."
    },
    "executive": {
      "title": "Executive Office",
      "subtitle": "Top-line oversight for the DG/CEO office.",
      "empty": "No executive view yet — counts and trends populate from live data."
    },
    "assignment": {
      "title": "Assignment Intelligence",
      "subtitle": "Workload, priority mix and overdue items across the fabric.",
      "empty": "No assignment intelligence yet."
    },
    "stats": {
      "title": "Statistics",
      "empty": "No statistics yet — once the fabric hydrates, rollups appear here."
    },
    "reports": {
      "title": "Reports",
      "empty": "No data yet. Reports populate once the fabric has records."
    },
    "single-item-ops": {
      "title": "Single-Item Assignment",
      "subtitle": "Assign one document to an officer as a tracked task.",
      "pickLabel": "Document (pick from fabric)",
      "manualRef": "…or enter a Reference ID",
      "submit": "Assign",
      "resultSummary": "Assigned {ref} to {who}.",
      "needRef": "Select a document or enter a Reference ID first.",
      "needAssignee": "Choose an assignee first.",
      "empty": "Search a reference or document to begin a single assignment.",
      "pickHelp": "Choose a document from the fabric — or leave blank and enter a Reference manually below.",
      "manualRefHelp": "Required only when no document is picked above.",
      "summaryTitle": "Assignment Summary",
      "categoryHelp": "Choose a category — assignee will auto-default from its Primary Responsible.",
      "comments": "Comments",
      "commentsHelp": "Optional notes attached to the assignment.",
      "commentsHint": "Add any context, instructions, or notes for the assignee…",
      "cascadeApplied": "Assignee defaulted from category → {dept}"
    },
    "bulk-assignment": {
      "title": "Bulk Assignment",
      "subtitle": "Assign many documents to an officer in one canonical, audited operation.",
      "pickerTitle": "1 · Select documents",
      "formTitle": "2 · Assignment details",
      "selectAll": "Select all (filtered)",
      "selected": "{n} selected",
      "filterPlaceholder": "Filter by title, reference, status…",
      "empty": "No documents in the fabric yet.",
      "submit": "Assign selected",
      "resultTitle": "Bulk assignment complete",
      "resultSummary": "{created} created · {notified} notified · {failed} failed",
      "stepperAria": "Bulk assignment progress",
      "step1": "Select items",
      "step2": "Assignment details",
      "step3": "Confirm & submit",
      "step1Sub": "{n} selected",
      "step2Sub": "Fill in the form below",
      "step3Sub": "Sign and send"
    },
    "diagnostics": {
      "title": "Diagnostics",
      "empty": "Run 'Ping all' to test live endpoint connectivity."
    },
    "assistant": {
      "title": "Assistant",
      "subtitle": "Ask the DGO assistant about references, tasks, and correspondence.",
      "empty": "Ask the assistant about references, tasks, or correspondence."
    },
    "lookup": {
      "title": "System Record Lookup",
      "subtitle": "Search across References, Documents, Tasks, Emails, and Comments.",
      "empty": "No records yet. Wait for the data fabric to hydrate, then try again."
    },
    "settings": {
      "title": "Settings",
      "subtitle": "Endpoint overrides for sandbox testing.",
      "empty": "No endpoints configured."
    }
  },
  "priority": {
    "high": "High",
    "medium": "Medium",
    "low": "Low",
    "urgent": "Urgent"
  },
  "approvals": {
    "pending": "Pending actions ({n})",
    "from": "From: {who}",
    "typeMemo": "Memo",
    "empty": "Select a request to review",
    "statusPending": "Pending Review",
    "submittedBy": "Submitted by {who} · {date}",
    "summary": "Executive Summary",
    "documents": "Supporting Documents",
    "minute": "Minute / Comment",
    "minutePlaceholder": "Add comments, directives, or conditions for approval…",
    "sign": "Append digital signature",
    "approve": "Approve",
    "reject": "Reject",
    "needReason": "Provide a reason in the minute before rejecting.",
    "confirmApproveTitle": "Confirm approval",
    "confirmApproveBody": "This decision is recorded and notifies the initiator.",
    "confirmRejectTitle": "Confirm rejection",
    "confirmRejectBody": "The initiator will be notified with your reason.",
    "approved": "Request approved.",
    "rejected": "Request rejected.",
    "related": "Linked across the platform"
  },
  "entity": {
    "reference": "Reference",
    "document": "Documents",
    "task": "Tasks",
    "email": "Emails",
    "approval": "Approvals",
    "comment": "Comments",
    "activity": "Activities"
  },
  "comments": {
    "placeholder": "Write a comment, directive, or note…",
    "add": "Add comment",
    "you": "You",
    "empty": "No comments yet for this reference.",
    "added": "Comment added.",
    "scopeAll": "All comments ({n})",
    "scopeRef": "Reference {ref} · {n} comments",
    "sentiment": {
      "label": "Sentiment",
      "positive": "Positive",
      "negative": "Negative",
      "neutral": "Neutral"
    },
    "priority": {
      "label": "Priority",
      "urgent": "Urgent",
      "medium": "Medium",
      "low": "Low"
    },
    "confirmTitle": "Confirm comment",
    "modalTitle": "Comments — {ref}",
    "openBtn": "Open Comments",
    "scopeLabel": "Scope",
    "scopeAllShort": "All references",
    "count": "Count",
    "reply": "Reply",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "replyingTo": "Replying to {who}",
    "inReplyTo": "in reply to {who}",
    "edited": "Comment updated.",
    "deleted": "Comment removed.",
    "deleteConfirm": "Delete this comment? This cannot be undone."
  },
  "filter": {
    "searchPlaceholder": "Search records, IDs…",
    "searchAria": "Search",
    "statusAria": "Filter by status",
    "all": "All statuses",
    "results": "{n} results",
    "clear": "Clear filters"
  },
  "status": {
    "pending": "Pending",
    "routed": "Routed",
    "replied": "Replied",
    "closed": "Closed"
  },
  "correspondence": {
    "new": "New correspondence",
    "aiClassify": "AI classify",
    "track": "Track",
    "classified": "Classification updated.",
    "created": "Correspondence created.",
    "selectHint": "Select a correspondence to view its decision detail.",
    "fromMeta": "From {who} · {ref}",
    "detailsLabel": "Details / executive summary"
  },
  "home": {
    "byStatus": "By status",
    "greet": {
      "morning": "Good morning",
      "afternoon": "Good afternoon",
      "evening": "Good evening"
    },
    "summary": {
      "calm": "You're tracking {n} items across the fabric. All clear.",
      "attention": "Tracking {n} items. {overdue} need attention."
    },
    "persona": "Persona",
    "today": "Today",
    "attention": "Needs attention",
    "pulse": "Activity — last 14 days",
    "recent": "Recent activity",
    "recentEmpty": "Nothing recent yet.",
    "quickActions": "Quick actions",
    "qa": {
      "assignSingle": "New assignment",
      "assignBulk": "Bulk assign",
      "correspondence": "Correspondence",
      "tasks": "Open tasks",
      "assistant": "Ask assistant"
    }
  },
  "lens": {
    "relatedTo": "Linked to {ref}:",
    "selectHint": "Select a row to view its details, related items, and actions.",
    "emptyHint": "Nothing matches the current filters — adjust the search or status above.",
    "related": "Related",
    "detailLabel": "Selected record details",
    "comments": "Comments",
    "activity": "Activity",
    "attachments": "Attachments",
    "selectedN": "{n} selected",
    "pagerInfo": "Showing {from}–{to} of {total}",
    "pagerPrev": "Prev",
    "pagerNext": "Next",
    "heatmap": {
      "legend": "Less",
      "more": "More",
      "overdue": "overdue",
      "upcoming": "upcoming",
      "peak": "peak/day",
      "title": "Due-Date Heatmap",
      "subtitle": "Task load by day — past dates with items are highlighted in red.",
      "clickHint": "Click a cell to see that day's items.",
      "dayItems": "Items due {date}"
    },
    "timeline": {
      "title": "Activity",
      "empty": "No activity recorded for this record yet."
    }
  },
  "action": {
    "confirmTitle": "Confirm action",
    "confirmSummary": "Please review the details below. This will be submitted to the workflow.",
    "done": "Submitted successfully.",
    "failed": "Action failed. Please try again."
  },
  "bulk": {
    "referencesLabel": "References (one per line)",
    "confirmSummary": "This will create task assignments for every selected document and notify the assignee. This cannot be undone.",
    "success": "Bulk assignment submitted.",
    "otpReason": "Bulk assignment is a high-impact write. Verify to continue."
  },
  "diag": {
    "endpoint": "Endpoint",
    "method": "Method",
    "status": "Status",
    "latency": "Latency",
    "time": "Timestamp",
    "data": "Data",
    "error": "Error",
    "pinging": "pinging…",
    "ok": "OK",
    "fail": "FAIL",
    "present": "present",
    "none": "none",
    "summary": "Summary",
    "endpointsTotal": "Endpoints",
    "online": "Online",
    "offline": "Offline",
    "avgLatency": "Avg latency",
    "endpointHealth": "Endpoint health",
    "fabric": "Entity fabric",
    "hydrated": "Hydrated",
    "source": "Source",
    "yes": "Yes",
    "no": "No",
    "recentFailures": "Recent failures",
    "noFailures": "No failures recorded this session.",
    "system": "System",
    "persona": "Persona",
    "theme": "Theme",
    "modules": "Modules registered",
    "lastRun": "Last run",
    "userAgent": "User agent",
    "lastRunAt": "Last run: {when}",
    "requestLog": "Request Log",
    "requestLogEmpty": "No API calls recorded yet — interact with the platform to see entries.",
    "clearLog": "Clear Log",
    "col": {
      "when": "When",
      "endpoint": "Endpoint",
      "action": "Action",
      "status": "Status",
      "ms": "Duration",
      "detail": "Detail / Key",
      "kind": "Kind"
    },
    "filter": {
      "all": "All",
      "writes": "Writes",
      "errors": "Errors"
    },
    "storageHealth": "Storage Health",
    "localStorage": "Local Storage",
    "browserStorage": "Browser Storage",
    "fabricRecords": "Entity Records (in memory)",
    "fabricRecordsHint": "Total records currently held in the entity fabric.",
    "clearStorage": "Clear Local Storage",
    "clearStorageWarn": "This wipes saved preferences, persona, and theme overrides. Live data in the fabric is unaffected; the page will need a refresh to re-hydrate.",
    "storageCleared": "Local storage cleared.",
    "telemetryChart": "Response time — last 30 calls (ms)",
    "telemetryChartHint": "Make a few API calls to see the trend.",
    "auditLog": "Audit Log",
    "auditLogEmpty": "No audit events recorded yet — interact with the platform to populate.",
    "copyRow": "Copy",
    "copyRowTitle": "Copy this entry as JSON",
    "copiedRow": "Entry copied to clipboard.",
    "copyFailed": "Could not access the clipboard.",
    "exportLog": "Export All",
    "exported": "Saved {file}.",
    "exportFailed": "Could not export — check browser permissions.",
    "lastResponse": "Last Fetch_All Response",
    "lastResponseEmpty": "No response captured yet — refresh the data fabric to populate.",
    "copyResponse": "Copy Response",
    "copiedResponse": "Last response copied to clipboard.",
    "exportResponse": "Download Response"
  },
  "confirm": {
    "action": "Action",
    "target": "Target entity",
    "endpoint": "Endpoint",
    "impact": "Impact",
    "impactWrite": "Submits to the live workflow and updates the shared record across all modules."
  },
  "rt": {
    "all": "All",
    "docs": "Documents",
    "emails": "Emails",
    "tasks": "Tasks",
    "pairs": "Doc ↔ Email Pairs",
    "doc": "Document",
    "email": "Email",
    "exportCsv": "Export CSV",
    "exportDone": "Exported {n} row(s) from {tab}",
    "noRowsToExport": "Nothing to export yet"
  },
  "opshub": {
    "assign": "Assign",
    "flag": "⚑ Flag for DG Attention",
    "assignedMeta": "Assigned to {who} · {status}",
    "assigned": "Document assigned.",
    "flagged": "Flagged for DG attention; review task created.",
    "flagImpact": "Flags the document for DG attention and creates a high-priority review task.",
    "dgReview": "DG Attention: {t}",
    "bulkAssign": "Bulk Assign Selected ({n})",
    "bulkHandoff": "Pre-filled {n} item(s) from ops-hub",
    "flagTitle": "Flag Document for DG Attention",
    "flagBlurb": "Flag this document so it surfaces in the DG Attention queue with a justification trail.",
    "flagUrgency": "Urgency",
    "flagClassification": "Classification",
    "flagReason": "Reason",
    "flagReasonHint": "Briefly state why this document needs the Director General's attention…",
    "flagReasonRequired": "A reason of at least 3 characters is required.",
    "flagSubmit": "Flag for DG"
  },
  "registry": {
    "movements": "Movement register · {n} entries"
  },
  "fasttrack": {
    "overdue": "Overdue",
    "dueSoon": "Due soon",
    "onTrack": "On track",
    "sla": "SLA",
    "clear": "Clear filter"
  },
  "validation": {
    "required": "This field is required",
    "fix": "Please complete the highlighted fields."
  },
  "assignmentType": {
    "action": "For action",
    "info": "For information",
    "primary": "Primary",
    "copy": "Copy to"
  },
  "agg": {
    "none": "No data yet.",
    "clear": "Nothing overdue — all clear.",
    "workload": "Workload by assignee",
    "priorityMix": "Priority mix",
    "overdue": "Needs attention (overdue)",
    "recent": "Recent references",
    "kpi": {
      "references": "References",
      "openTasks": "Open tasks",
      "pendingApprovals": "Pending approvals",
      "overdue": "Overdue",
      "assignees": "Active assignees"
    }
  },
  "single": {
    "confirmSummary": "This creates a tracked task for the selected document and notifies the assignee.",
    "success": "Assignment created."
  },
  "otp": {
    "title": "Security verification",
    "defaultReason": "Confirm your identity to proceed.",
    "codeLabel": "One-time code",
    "verify": "Verify",
    "sent": "Code sent to {to} · expires in {ttl}s",
    "genFailed": "Could not send a code. Try again.",
    "needCode": "Enter the code.",
    "invalid": "Invalid or expired code.",
    "required": "A one-time code is required to continue.",
    "expired": "The code expired. Request a new one.",
    "resend": "Resend code",
    "verifying": "Verifying…",
    "expiresIn": "Expires in {s}s",
    "attemptsLeft": "{n} attempt(s) left.",
    "failed": "Verification failed. The assignment was rolled back.",
    "sendingCode": "Sending a code…",
    "rollback": "Too many incorrect attempts — assignment cancelled."
  },
  "ai": {
    "toolsTitle": "Document tools",
    "analyseDoc": "Analyse with AI",
    "noResult": "No analysis returned.",
    "failed": "AI analysis unavailable."
  },
  "attachment": {
    "loading": "Loading attachments…",
    "none": "No attachments.",
    "noUrl": "No download URL available for this attachment.",
    "openExternal": "Open in new tab →",
    "fetchFailed": "Could not load preview"
  },
  "charts": {
    "statusMix": "Status mix",
    "activity14d": "Activity — last 14 days"
  },
  "assistant": {
    "placeholder": "Ask a question…  (Ctrl/Cmd+Enter to send)",
    "inputAria": "Message the assistant",
    "send": "Send",
    "empty": "Start a conversation with the assistant.",
    "thinking": "Thinking…",
    "you": "You",
    "ai": "Assistant",
    "noReply": "No response returned.",
    "failed": "The assistant is unavailable right now."
  },
  "connectivity": {
    "loading": "Loading live data…",
    "offline": "Couldn't reach the service. Data may be incomplete.",
    "retry": "Retry"
  },
  "form": {
    "fixErrors": "Fix the highlighted fields and try again."
  },
  "task": {
    "update": {
      "title": "Update Task",
      "submit": "Save Changes",
      "openBtn": "Update Task"
    },
    "openOrchestrator": "Open in Orchestrator",
    "updated": "Task updated."
  },
  "doc": {
    "assignBtn": "Open in Single Assignment"
  },
  "email": {
    "createTaskBtn": "Create Task from Email",
    "taskTitle": "Create Task from Email",
    "taskSubmit": "Create Task",
    "taskCreated": "Task created from email.",
    "sandboxed": "Sandboxed preview",
    "sandboxedHint": "Untrusted HTML rendered in an isolated iframe — scripts cannot run.",
    "noBody": "No body content.",
    "body": "Body",
    "headers": "Headers"
  },
  "lookup": {
    "searchPlaceholder": "Search by reference, title, sender, status…",
    "idleHint": "Start typing to search the data fabric.",
    "noResults": "No records match \"{q}\".",
    "resultsFor": "{n} record(s) match \"{q}\".",
    "nMatches": "{n} match(es)",
    "scope": {
      "label": "Scope",
      "all": "All",
      "ref": "References",
      "doc": "Documents",
      "task": "Tasks",
      "email": "Emails",
      "comment": "Comments"
    },
    "filters": {
      "toggle": "Advanced Filters",
      "dateFrom": "Date From",
      "dateTo": "Date To",
      "statuses": "Statuses",
      "assignedTo": "Assigned To",
      "assignedToPlaceholder": "Email or substring…",
      "clearAll": "Clear All Filters"
    }
  },
  "notif": {
    "title": "Notification Email Preview",
    "subject": "Subject",
    "preview": "Body",
    "previewBtn": "Preview Notification"
  },
  "settings": {
    "endpoints": "Endpoints",
    "endpointsExplainer": "Override the Power Automate flow URLs at runtime. Useful for swapping to a sandbox flow without a rebuild. Overrides are stored in localStorage and apply to every subsequent API call.",
    "defaultUrl": "Default URL",
    "override": "Override URL",
    "overridePlaceholder": "https://… (leave empty to use the default)",
    "save": "Save",
    "clear": "Clear",
    "saved": "Override saved for {key}.",
    "cleared": "Override cleared for {key}.",
    "invalidUrl": "Enter a valid http(s):// URL or leave empty.",
    "overrideActive": "Override active",
    "totalEndpoints": "total endpoints",
    "activeOverrides": "active overrides",
    "resetAll": "Reset All Overrides",
    "resetAllWarn": "This clears all endpoint URL overrides. Each endpoint will fall back to its default registry URL.",
    "resetAllImpact": "Removes every localStorage entry under obsidian.endpoint.*",
    "resetAllDone": "Cleared {n} override(s).",
    "language": "Display Language",
    "languageBlurb": "Choose the UI display language. All writes remain in English for audit consistency."
  },
  "profile": {
    "title": "Your Profile",
    "save": "Save Profile",
    "saved": "Profile saved.",
    "blurb": "Set your identity so assignment payloads and audit trails carry your real email instead of a generic persona stub.",
    "fullName": "Full Name",
    "fullNameHelp": "How you appear in audit logs and notification emails.",
    "email": "Email Address",
    "emailHelp": "Used as CreatedBy / userEmail in every API write. Must be a valid email.",
    "department": "Department",
    "departmentHelp": "Optional — used in audit and reporting context.",
    "pickDept": "Pick your department",
    "jobTitle": "Job Title",
    "jobTitleHelp": "Optional — surfaces in detail views and email signatures.",
    "nameRequired": "Please enter your full name.",
    "emailRequired": "Please enter a valid email address."
  },
  "shortcuts": {
    "title": "Keyboard Shortcuts",
    "navigation": "Navigation",
    "actions": "Actions",
    "forms": "Forms & Inputs",
    "help": "Open this cheatsheet",
    "closeModal": "Close the active modal",
    "focusSearch": "Focus the search field",
    "goHome": "Go to Home",
    "goOpsHub": "Go to Ops Hub",
    "goLookup": "Go to Lookup",
    "goRT": "Go to Response Tracking",
    "goSettings": "Go to Settings",
    "goDiagnostics": "Go to Diagnostics",
    "refresh": "Refresh the data fabric",
    "newAssign": "New single assignment",
    "submit": "Submit the form",
    "cancel": "Cancel / dismiss"
  },
  "sw": {
    "updateAvailable": "A new version is ready. Reload to apply.",
    "reload": "Reload"
  },
  "error": {
    "auth": {
      "failed": "Your session could not be verified. Please re-authenticate."
    },
    "directorate": {
      "mismatch": "Cross-directorate action requires DG approval."
    },
    "rateLimited": "Too many requests. Please wait a moment and retry.",
    "validation": "Some details need correcting before this can proceed.",
    "notAuthorized": "You do not have authority for this action.",
    "timeout": "The service took too long to respond. Please retry.",
    "internal": "Something went wrong on our side. The team has been notified.",
    "conflict": "This action was already applied."
  },
  "dispatch": {
    "failed": "Dispatch failed. You can retry from the dispatch queue."
  },
  "info": {
    "alreadyApplied": "Already applied — no change needed."
  }
}
__OBSIDIAN_DEPLOY_EOF__

write 'core/api.js' <<'__OBSIDIAN_DEPLOY_EOF__'
// FILE: core/api.js
/**
 * OBSIDIAN v4.0 — Core API engine (/core/api.js)
 * THE ONLY MODULE PERMITTED TO CALL fetch(). Services go through BaseService.
 *
 * Platform.API.callAPI(endpointKey, payload?, opts?) -> Promise<NormalizedResult>
 * Never rejects on HTTP/transport failure. Always resolves a normalized object:
 *   { ok, kind, errorKind, status, data, errors, body, headers, durationMs, correlationId }
 *   kind ∈ 'ok' | 'network' | 'timeout' | 'client' | 'server' | 'parse' | 'abort' | 'notImplemented' | 'config' | 'duplicate'
 *
 * Idempotency (A-11): callAPI is the FINAL safeguard. If the merged payload already carries an
 * idempotencyKey it is preserved; else opts.idempotencyKey is used; else, for write calls, a key is
 * derived via Idempotency.normalizeInput. The key is sent in the body AND as X-Idempotency-Key.
 *
 * Envelope normalization (F2 — contract):
 *   Production-v1 -> body.ok / body.status.http
 *   Subsidiary-v4 -> body.success / body.statusCode  (meta.routeKey carried through)
 *   Neither present -> kind:'parse'  (UNRECOGNIZED_ENVELOPE)
 *   `errors[]` is preserved verbatim even on success (contract §E.2 allows warnings on ok:true).
 */

import { Endpoints } from '../config/endpoints.config.js';
import { Idempotency } from './idempotency.js';

const DEFAULT_TIMEOUT_MS = 45000;
const _inflight = new Map(); // endpointKey -> count of in-flight calls

function uuid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'cid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function log(level, msg, ctx) {
  const L = globalThis.Platform && Platform.Log;
  if (L && typeof L[level] === 'function') L[level](msg, ctx);
}

/** Recursively strip undefined; preserve null and '' (flow schemas accept them).
 *  Pass stripEmpty:true to also drop null/''. */
function sanitize(value, stripEmpty) {
  if (Array.isArray(value)) return value.map((v) => sanitize(v, stripEmpty));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      const cleaned = sanitize(v, stripEmpty);
      if (stripEmpty && (cleaned === null || cleaned === '')) continue;
      out[k] = cleaned;
    }
    return out;
  }
  return value;
}

/** Envelope/meta keys that are NOT data. Everything else at top level is treated as the data
 *  payload when a flow returns its collections flat (live flows return `{ok, users, …}` not `{ok,data}`). */
const ENVELOPE_META = new Set(['ok', 'success', 'status', 'statusCode', 'message', 'details',
  'errors', 'meta', 'request', 'timing', 'correlationId']);

/** Pull the data object out of a body: nested `data` if present, else the flat top-level collections. */
function deriveData(body) {
  if (body && body.data !== undefined && body.data !== null) return body.data;
  if (body && typeof body === 'object') {
    const d = {};
    for (const [k, v] of Object.entries(body)) if (!ENVELOPE_META.has(k)) d[k] = v;
    if (Object.keys(d).length) return d;
  }
  return null;
}

/** Split a string that may contain several concatenated JSON values into the individual values. */
function scanConcatenatedJSON(text) {
  const out = []; let i = 0; const n = text.length;
  while (i < n) {
    while (i < n && /\s/.test(text[i])) i++;
    if (i >= n) break;
    if (text[i] !== '{' && text[i] !== '[') { i++; continue; }
    let depth = 0, inStr = false, esc = false; const start = i;
    for (; i < n; i++) {
      const c = text[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
      else if (c === '"') inStr = true;
      else if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') { depth--; if (depth === 0) { i++; break; } }
    }
    try { out.push(JSON.parse(text.slice(start, i))); } catch (_) { /* skip malformed fragment, keep later valid ones */ }
  }
  return out;
}

/** Parse a Power Automate response body robustly: clean JSON, double-stringified JSON, OR multiple
 *  concatenated objects (a real PA artefact — prefer the successful envelope, else the last). */
function parseFlowBody(text) {
  if (!text) return null;
  try {
    let b = JSON.parse(text);
    if (typeof b === 'string') { const t = b.trim(); if (t.startsWith('{') || t.startsWith('[')) { try { b = JSON.parse(t); } catch (_) { /* keep */ } } }
    return b;
  } catch (e) {
    const objs = scanConcatenatedJSON(text);
    if (!objs.length) throw e;
    const ok = objs.filter((o) => o && typeof o === 'object' && (o.ok === true || o.success === true));
    return ok.length ? ok[ok.length - 1] : objs[objs.length - 1];
  }
}

/** Extract a normalized errors[] array from whatever shape PA / connectors returned. */
function extractErrors(body) {
  if (!body) return [];
  if (Array.isArray(body.errors)) return body.errors.map(normErr);
  const out = [];
  if (body.error) {
    if (typeof body.error === 'string') out.push({ code: 'ERROR', message: body.error });
    else if (typeof body.error === 'object') out.push(normErr(body.error));
  }
  if (Array.isArray(body.validationErrors)) for (const e of body.validationErrors) out.push(normErr(e, 'VALIDATION'));
  if (body.exception) out.push({ code: 'EXCEPTION', message: String(body.exception.message || body.exception) });
  if (body.fault && body.fault.faultstring) out.push({ code: body.fault.faultcode || 'FAULT', message: body.fault.faultstring });
  if (!out.length && body.message && (body.ok === false || body.success === false)) {
    out.push({ code: body.code || 'ERROR', message: String(body.message), target: body.target });
  }
  return out;
}
function normErr(e, defaultCode) {
  if (typeof e === 'string') return { code: defaultCode || 'ERROR', message: e };
  return { code: e.code || e.errorCode || defaultCode || 'ERROR',
           message: e.message || e.detail || e.description || String(e),
           target: e.target || e.field || e.path || undefined };
}

/** A-10 — canonical machine-readable error taxonomy. PA-provided `kind` wins; else HTTP/transport. */
const HTTP_ERROR_KIND = {
  401: 'AUTH_FAILED', 403: 'NOT_AUTHORIZED', 409: 'CONFLICT_IDEMPOTENT', 410: 'OTP_EXPIRED',
  422: 'VALIDATION_FAILED', 428: 'OTP_REQUIRED', 429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR', 502: 'UPSTREAM_TIMEOUT', 503: 'UPSTREAM_TIMEOUT', 504: 'UPSTREAM_TIMEOUT'
};
function deriveErrorKind(body, httpStatus, transportKind) {
  const raw = (body && Array.isArray(body.errors) && body.errors[0] && body.errors[0].kind) || (body && body.kind);
  if (raw && typeof raw === 'string') return raw.toUpperCase();
  if (transportKind === 'timeout' || transportKind === 'network' || transportKind === 'unavailable') return 'UPSTREAM_TIMEOUT';
  if (transportKind === 'duplicate') return 'CONFLICT_IDEMPOTENT';
  if (httpStatus && HTTP_ERROR_KIND[httpStatus]) return HTTP_ERROR_KIND[httpStatus];
  if (httpStatus >= 500) return 'INTERNAL_ERROR';
  if (httpStatus >= 400) return 'VALIDATION_FAILED';
  return 'INTERNAL_ERROR';
}

function reserved501(endpointKey, correlationId, durationMs) {
  return {
    ok: false, kind: 'notImplemented', status: 501, data: null, errorKind: 'INTERNAL_ERROR',
    errors: [{ code: 'NOT_IMPLEMENTED', message: 'This flow is reserved and not implemented.', target: endpointKey }],
    body: null, headers: {}, durationMs, correlationId
  };
}

function kindForStatus(httpStatus, defaultKind) {
  if (httpStatus === 429) return 'rateLimit';
  if (httpStatus === 503) return 'unavailable';
  if (httpStatus === 401 || httpStatus === 403) return 'auth';
  if (httpStatus >= 500) return 'server';
  if (httpStatus >= 400) return 'client';
  return defaultKind || 'ok';
}
function normalizeBody(body, headers, durationMs, correlationId, httpStatus) {
  // HTTP status is authoritative for transport failures (429/503/401/etc.) — body.ok:true cannot override it.
  const httpFailed = !!(httpStatus && httpStatus >= 400);
  if (body && typeof body === 'object' && 'ok' in body) {
    const status = httpStatus || (body.status && Number(body.status.http)) || (body.ok ? 200 : 500);
    const realOk = !!body.ok && !httpFailed;
    return {
      ok: realOk, kind: realOk ? 'ok' : kindForStatus(status, 'server'),
      errorKind: realOk ? undefined : deriveErrorKind(body, status, null),
      status, data: deriveData(body), errors: extractErrors(body),
      retryAfter: headers && headers['retry-after'] ? Number(headers['retry-after']) || null : null,
      body, headers, durationMs, correlationId
    };
  }
  if (body && typeof body === 'object' && 'success' in body) {
    const status = httpStatus || Number(body.statusCode) || (body.success ? 200 : 500);
    const realOk = !!body.success && !httpFailed;
    return {
      ok: realOk, kind: realOk ? 'ok' : kindForStatus(status, 'server'),
      errorKind: realOk ? undefined : deriveErrorKind(body, status, null),
      status, data: deriveData(body), errors: extractErrors(body),
      retryAfter: headers && headers['retry-after'] ? Number(headers['retry-after']) || null : null,
      routeKey: body.meta && body.meta.routeKey, body, headers, durationMs, correlationId
    };
  }
  if (httpStatus && httpStatus >= 400) {
    return { ok: false, kind: kindForStatus(httpStatus), errorKind: deriveErrorKind(body, httpStatus, null),
      status: httpStatus, data: null,
      errors: extractErrors(body) || [{ code: 'HTTP_' + httpStatus, message: 'Service returned ' + httpStatus + '.' }],
      retryAfter: headers && headers['retry-after'] ? Number(headers['retry-after']) || null : null,
      body, headers, durationMs, correlationId };
  }
  return {
    ok: false, kind: 'parse', status: 0, data: null, errorKind: 'INTERNAL_ERROR',
    errors: [{ code: 'UNRECOGNIZED_ENVELOPE', message: 'Response matched neither v1 (ok) nor v4 (success).' }],
    body, headers, durationMs, correlationId
  };
}

/** Resolve an endpoint URL, honouring any operator-set override in localStorage. */
function _resolveUrl(endpointKey, defaultUrl) {
  try {
    const k = 'obsidian.endpoint.' + endpointKey;
    const v = (globalThis.localStorage && localStorage.getItem(k)) || '';
    if (v && /^https?:\/\//.test(v)) return v;
  } catch (_) { /* private mode / SSR — fall through */ }
  return defaultUrl;
}

/** Decide whether a call is a write that must carry an idempotency key. */
function isWriteCall(ep, payload, opts) {
  if (opts && (opts.idempotent === true || opts.write === true)) return true;
  if (ep && (ep.write === true || ep.idempotent === true || ep.requiresIdempotency === true)) return true;
  const action = payload && (payload.action || payload.operation);
  if (Idempotency.isReadAction(action)) return false;
  const method = String((ep && ep.method) || 'POST').toUpperCase();
  if (method !== 'GET' && action) return true;
  return false;
}

async function callAPI(endpointKey, payload = {}, opts = {}) {
  const correlationId = opts.correlationId || uuid();
  const t0 = (globalThis.performance && performance.now()) || Date.now();
  const elapsed = () => Math.round(((globalThis.performance && performance.now()) || Date.now()) - t0);

  const ep = Endpoints[endpointKey];
  if (!ep) {
    log('error', 'api.unknown-endpoint', { endpointKey, correlationId });
    return { ok: false, kind: 'config', status: 0, data: null, errorKind: 'INTERNAL_ERROR',
      errors: [{ code: 'UNKNOWN_ENDPOINT', message: 'No registry entry for key.', target: endpointKey }],
      body: null, headers: {}, durationMs: elapsed(), correlationId };
  }

  if (ep.reserved || !ep.url) {
    log('info', 'api.reserved', { endpointKey, correlationId });
    return reserved501(endpointKey, correlationId, elapsed());
  }

  if (!opts.allowConcurrent && _inflight.get(endpointKey)) {
    log('warn', 'api.duplicate-blocked', { endpointKey, correlationId });
    return { ok: false, kind: 'duplicate', status: 0, data: null, errorKind: 'CONFLICT_IDEMPOTENT',
      errors: [{ code: 'DUPLICATE_IN_FLIGHT', message: 'A request to this endpoint is already in flight.', target: endpointKey }],
      body: null, headers: {}, durationMs: elapsed(), correlationId };
  }
  _inflight.set(endpointKey, (_inflight.get(endpointKey) || 0) + 1);

  const persona = (globalThis.Platform && Platform.Persona && Platform.Persona.current && Platform.Persona.current()) || null;
  // sanitize: preserve null/'' by default (flow schemas accept them; only drop undefined).
  const merged = sanitize({ ...ep.defaults, ...payload, correlationId }, !!opts.stripEmpty);

  // ─── Idempotency: final safeguard. Preserve an existing key, else opts, else derive for writes.
  let idempotencyKey = merged.idempotencyKey || (opts && opts.idempotencyKey) || null;
  if (!idempotencyKey && isWriteCall(ep, merged, opts)) {
    idempotencyKey = Idempotency.normalizeInput({ endpointKey, payload: merged, opts, bucketMs: opts.bucketMs }).idempotencyKey;
  }
  if (idempotencyKey) merged.idempotencyKey = idempotencyKey;

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs || ep.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  if (opts.cancellable && typeof opts.onCancel === 'function') opts.onCancel(() => controller.abort('user'));

  log('info', 'api.request', { endpointKey, action: merged.action, persona, correlationId, timeoutMs, idempotencyKey: idempotencyKey || null });

  const reqHeaders = { ...ep.headers, 'X-Correlation-ID': correlationId };
  if (idempotencyKey) reqHeaders['X-Idempotency-Key'] = idempotencyKey;

  try {
    const res = await fetch(_resolveUrl(endpointKey, ep.url), {
      method: ep.method || 'POST',
      headers: reqHeaders,
      body: JSON.stringify(merged),
      signal: controller.signal
    });
    clearTimeout(timer);

    const headers = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

    const text = await res.text();
    let body = null;
    try {
      body = parseFlowBody(text);
    } catch (_) {
      const r = { ok: false, kind: 'parse', status: res.status, data: null, errorKind: 'INTERNAL_ERROR',
        errors: [{ code: 'PARSE_ERROR', message: 'Response body was not valid JSON.' }],
        body: text || null, headers, durationMs: elapsed(), correlationId };
      log('error', 'api.parse', { endpointKey, status: res.status, correlationId });
      if (!opts.silent && globalThis.Platform && Platform.UI) Platform.UI.toastError(r);
      return r;
    }

    const result = normalizeBody(body, headers, elapsed(), correlationId, res.status);
    log(result.ok ? 'info' : 'error', 'api.response',
      { endpointKey, status: result.status, kind: result.kind, errorKind: result.errorKind || null, persona, correlationId });
    if (!result.ok && !opts.silent && globalThis.Platform && Platform.UI) Platform.UI.toastError(result);
    return result;
  } catch (err) {
    clearTimeout(timer);
    const kind = (err && (err.name === 'AbortError' || controller.signal.reason === 'timeout'))
      ? (controller.signal.reason === 'user' ? 'abort' : 'timeout')
      : 'network';
    const r = { ok: false, kind, status: 0, data: null, errorKind: deriveErrorKind(null, 0, kind),
      errors: [{ code: kind.toUpperCase(), message: String((err && err.message) || kind) }],
      body: null, headers: {}, durationMs: elapsed(), correlationId };
    log('error', 'api.transport', { endpointKey, kind, correlationId });
    if (!opts.silent && kind !== 'abort' && globalThis.Platform && Platform.UI) Platform.UI.toastError(r);
    return r;
  } finally {
    const n = (_inflight.get(endpointKey) || 1) - 1;
    if (n <= 0) _inflight.delete(endpointKey); else _inflight.set(endpointKey, n);
  }
}

export const API = { callAPI };
export default API;
// END FILE: core/api.js
__OBSIDIAN_DEPLOY_EOF__

write 'core/base-service.js' <<'__OBSIDIAN_DEPLOY_EOF__'
// FILE: core/base-service.js
/**
 * OBSIDIAN v4.0 — BaseService (/core/base-service.js)
 * Common service plumbing so no service hand-rolls fetch, pagination, sort, or cache.
 *
 *   export const fetchAll = BaseService.endpoint('FETCH_ALL', { cache: 30000, expectedKeys: ['ok','data'] });
 *   const res = await fetchAll({ ...payload }, { page, pageSize, sortBy, sortDir });
 *
 * The factory returns the FULL normalized result from API.callAPI (callers keep errors[] warnings);
 * res.data is the contract payload. Client-side sort/paginate apply only when res.data is an array.
 *
 * Idempotency: for writes a key is prepared here (deterministic, bucketed) and passed BOTH via
 * payload.idempotencyKey and opts.idempotencyKey. The caller's payload object is never mutated.
 * bucketMs may be overridden per-endpoint (factory opts) or per-call (query) for OTP-gated bulk flows.
 */

import { API } from './api.js';
import { Endpoints } from '../config/endpoints.config.js';
import { Idempotency } from './idempotency.js';

function log(level, msg, ctx) {
  const L = globalThis.Platform && Platform.Log;
  if (L && typeof L[level] === 'function') L[level](msg, ctx);
}

function cacheKey(endpointKey, payload, query) {
  return endpointKey + '::' + JSON.stringify(payload || {}) + '::' + JSON.stringify(query || {});
}

function validateShape(endpointKey, result, expectedKeys) {
  if (!result.ok || !result.body || !Array.isArray(expectedKeys)) return;
  const missing = expectedKeys.filter((k) => !(k in result.body));
  if (missing.length) log('error', 'service.shape-mismatch', { endpointKey, missing, correlationId: result.correlationId });
}

function applySort(rows, sortBy, sortDir) {
  if (!sortBy || !Array.isArray(rows)) return rows;
  const dir = sortDir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a == null ? '' : a[sortBy]; const bv = b == null ? '' : b[sortBy];
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * dir;
  });
}

function applyPage(rows, page, pageSize) {
  if (!pageSize || !Array.isArray(rows)) return rows;
  const p = Math.max(1, page || 1);
  return rows.slice((p - 1) * pageSize, (p - 1) * pageSize + pageSize);
}

export const BaseService = {
  /**
   * Build a callable bound to one endpoint key.
   * opts: { cache?:ms, expectedKeys?:string[], silent?:bool, bucketMs?:number|false }
   * Returned fn(payload?, query?): query may carry { page, pageSize, sortBy, sortDir, force, bucketMs, idempotencyKey }.
   */
  endpoint(endpointKey, opts = {}) {
    if (!Endpoints[endpointKey]) {
      log('error', 'service.unknown-endpoint', { endpointKey });
    }
    const expectedKeys = opts.expectedKeys || (Endpoints[endpointKey] && Endpoints[endpointKey].expectedKeys);
    const ttl = opts.cache || 0;
    const store = new Map(); // key -> { at, result }

    const fn = async (payload = {}, query = {}) => {
      const key = cacheKey(endpointKey, payload, query);
      if (ttl && !query.force) {
        const hit = store.get(key);
        if (hit && Date.now() - hit.at < ttl) return hit.result;
      }

      // ─── Idempotency: prepare a key for writes (reads skip it). Never mutate the caller's payload.
      const action = payload && (payload.action || payload.operation);
      const isWrite = !ttl && !!action && !Idempotency.isReadAction(action);
      const bucketMs = (opts.bucketMs !== undefined) ? opts.bucketMs
        : (query.bucketMs !== undefined) ? query.bucketMs
        : undefined;
      let idempotencyKey = (payload && payload.idempotencyKey) || query.idempotencyKey || null;
      let outPayload = payload;
      if (isWrite) {
        idempotencyKey = Idempotency.normalizeInput({
          endpointKey, payload, opts: { idempotencyKey, bucketMs }, bucketMs
        }).idempotencyKey;
        outPayload = { ...payload, idempotencyKey };
      }

      const callOpts = { silent: opts.silent };
      if (idempotencyKey) callOpts.idempotencyKey = idempotencyKey;
      if (bucketMs !== undefined) callOpts.bucketMs = bucketMs;

      const t0 = (globalThis.performance && performance.now ? performance.now() : Date.now());
      const result = await API.callAPI(endpointKey, outPayload, callOpts);
      const durationMs = Math.round((globalThis.performance && performance.now ? performance.now() : Date.now()) - t0);
      validateShape(endpointKey, result, expectedKeys);

      // ─── Always log the call (success or failure) into the bounded request log.
      Idempotency.record({
        endpointKey, action: action || '',
        key: idempotencyKey, ok: !!result.ok, status: result.status || null,
        durationMs, errorMessage: (!result.ok && result.errors && result.errors[0] && result.errors[0].message) || null
      });

      if (result.ok && Array.isArray(result.data)) {
        let rows = applySort(result.data, query.sortBy, query.sortDir);
        const total = rows.length;
        rows = applyPage(rows, query.page, query.pageSize);
        result.rows = rows;
        result.page = { page: query.page || 1, pageSize: query.pageSize || total, total };
      }

      if (ttl && result.ok) store.set(key, { at: Date.now(), result });
      return result;
    };

    fn.endpointKey = endpointKey;
    fn.invalidate = () => store.clear();
    return fn;
  }
};

export default BaseService;
// END FILE: core/base-service.js
__OBSIDIAN_DEPLOY_EOF__

write 'core/context.js' <<'__OBSIDIAN_DEPLOY_EOF__'
/** OBSIDIAN v4.0 — context.js · Platform.Context · the cross-module selection focus.
 *  A Reference selected in one lens becomes the active focus every other lens observes.
 *
 *  SLICE S0 — Context directorate seal (register A-7 / Section 5 defensive layer 5):
 *    The active directorate scope lives in a module-scoped closure variable (_directorate) — NOT a
 *    property on the Context object — so UI code cannot spoof it by assignment. `directorate()` is a
 *    read-only getter consumed by the sealed fabric's scope filter. `setDirectorate(id)` is the only
 *    mutator and is intended to be called solely by the authenticated persona-switch flow; it emits
 *    an audit event on every change so scope shifts are traceable. */
import { State } from './state.js';
import { Bus } from './bus.js';
import { ENTITY_HOME_MODULE } from '../config/entities.config.js';

// Sealed scope value — closure-private. 'all' grants DG / DG's-Office-wide visibility (default).
let _directorate = 'all';

export const Context = {
  /** Bulk selection store: refs for a bulk action handoff (e.g. ops-hub → bulk-assignment). */
  _bulk: [],
  setBulkSelection(refs) { this._bulk = Array.isArray(refs) ? refs.slice() : []; },
  getBulkSelection() { return this._bulk.slice(); },
  clearBulkSelection() { this._bulk = []; },
  activeReference() { return State.get('shared.context.activeReference', null); },
  setActive(refId, sourceModule) {
    State.set('shared.context.activeReference', refId ? String(refId) : null);
    Bus.emit('context:reference:changed', { ref: refId ? String(refId) : null, source: sourceModule || null });
    Bus.emit('reference:change', { ref: refId ? String(refId) : null, source: sourceModule || null });  // §2 event contract alias
    return refId;
  },

  /** Read-only directorate scope getter (A-7). The fabric's scope filter calls this on every read. */
  directorate() { return _directorate; },

  /** Sealed setter — internal only; call from the authenticated persona-switch flow, never from UI.
   *  Returns the active scope. Emits an audit event so every scope change is traceable (Section 5.4). */
  setDirectorate(id) {
    const next = (id == null || id === '') ? 'all' : String(id);
    if (next === _directorate) return _directorate;
    const prev = _directorate;
    _directorate = next;
    Bus.emit('context:directorate:changed', { from: prev, to: next });
    Bus.emit('audit:directorate-scope-changed', { from: prev, to: next, ts: new Date().toISOString() });
    return _directorate;
  },

  subscribe(fn) { return Bus.on('context:reference:changed', fn); }
};

/** Cross-module deep link: focus a Reference and route to a lens that shows it. */
export function goToEntity(refId, moduleId) {
  Context.setActive(refId);
  const target = moduleId || ENTITY_HOME_MODULE.reference;
  if (globalThis.Platform?.Router) globalThis.Platform.Router.navigate(target, refId ? String(refId) : undefined);
}
export default Context;
__OBSIDIAN_DEPLOY_EOF__

write 'core/entity-store.js' <<'__OBSIDIAN_DEPLOY_EOF__'
/** OBSIDIAN v4.0 — entity-store.js · Platform.Entities · the normalized shared fabric.
 *  Hydrated once from FETCH_ALL; indexed by Reference so every lens reads the SAME objects.
 *
 *  SLICE S0 — Native Lexical Security Layer (register A-1..A-8 cluster + C-7):
 *    • _store / _byRef / _archive / _quarantine / _dedup are sealed inside the sealFabric() IIFE.
 *      They are never exported and never attached to globalThis.Platform — only the gated facade
 *      below escapes the closure (A-1, Decision 3, Section 5).
 *    • Every reader returns Object.freeze(structuredClone(...)) so UI mutation can never reflect
 *      back into the fabric (A-1 defensive copy).
 *    • Every reader applies the (directorate ∩ persona-scope) filter before returning (A-2, A-8).
 *    • Directorate is derived hierarchically PrimaryDSU → AssignedDSU; if neither is present the
 *      record is admitted to _quarantine, never the live store (Q-6 mandate + No Orphan contract).
 *    • transitionStatus(ref, from, to, by) is the SOLE status mutator: validates the canonical state
 *      machine, checks persona authority, and enforces the four integrity contracts (C-7, Decision 4).
 *    • canClose(ref) / archive(ref) implement the Closure-Gate and Atomic-Archive contracts (A-5, A-4).
 *  Mutations emit entity:<type>:changed + entity:reference:updated so dependent lenses react. */
import { Bus } from './bus.js';
import { BaseService } from './base-service.js';
import { ENTITY_TYPES, RELATIONSHIPS, REF_ALT_KEYS } from '../config/entities.config.js';
import { firstArray } from '../shared/utils/dom.js';

export const Entities = (function sealFabric() {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE — module-scope consts inside the closure. Never exported. Never on
  // globalThis. This is the fabric enclosure (defensive layer 1, register A-1).
  // ─────────────────────────────────────────────────────────────────────────
  const _store      = {};                 // type -> Map(id -> record)
  const _byRef      = {};                 // type -> Map(refId -> [records])
  const _archive    = new Map();          // refId -> deep-frozen bundle snapshot  (A-4)
  const _quarantine = new Map();          // key   -> orphan record                (A-3)
  const _dedup      = new Map();          // hash  -> { ref, ts }  rolling 30-day  (A-6)
  for (const t of Object.keys(ENTITY_TYPES)) { _store[t] = new Map(); _byRef[t] = new Map(); }

  let hydrated = false;
  let lastRaw  = null;     // last FETCH_ALL envelope (in-memory only; incident export)
  const source = 'live';

  const DEDUP_WINDOW_MS = 30 * 86400000;  // rolling 30-day dedup window (A-6)

  // ─────────────────────────────────────────────────────────────────────────
  // Canonical state machine (Operational Lexicon §3.2). transitionStatus gates
  // every status write against this — module code may NOT invent tokens (C-7).
  // ─────────────────────────────────────────────────────────────────────────
  const STATUS_PHASE = {
    registered: 1, triaged: 1, triage_complete: 1,
    assigning: 2, assigned: 2, 'assignment-failed': 2,
    acknowledged: 3, 'in-progress': 3, 'action-complete': 3, 'reassign-requested': 3,
    'pending-review': 4, approved: 4, 'approved-with-edit': 4, returned: 4, escalated: 4,
    'dispatch-pending': 5, 'dispatch-in-flight': 5, dispatched: 5, 'dispatch-failed': 5,
    'no-dispatch': 5, closed: 5, 'partial-dispatch': 5,
    archived: 6, 'cold-archived': 6
  };
  const ALL_TOKENS = new Set(Object.keys(STATUS_PHASE));

  // Allowed transitions. '' = a record with no status yet (fresh arrival).
  const TRANSITIONS = {
    '':                    new Set(['registered']),
    registered:            new Set(['triaged']),
    triaged:               new Set(['triage_complete']),
    triage_complete:       new Set(['assigning']),
    assigning:             new Set(['assigned', 'assignment-failed']),
    'assignment-failed':   new Set(['assigning', 'triage_complete']),
    assigned:              new Set(['acknowledged', 'reassign-requested']),
    acknowledged:          new Set(['in-progress']),
    'in-progress':         new Set(['action-complete', 'reassign-requested']),
    'reassign-requested':  new Set(['assigned', 'assigning']),
    'action-complete':     new Set(['pending-review']),
    'pending-review':      new Set(['approved', 'approved-with-edit', 'returned', 'escalated']),
    returned:              new Set(['in-progress']),
    approved:              new Set(['dispatch-pending']),
    'approved-with-edit':  new Set(['dispatch-pending']),
    escalated:             new Set([]),                 // DG escalation is terminal (Gate D)
    'dispatch-pending':    new Set(['dispatch-in-flight', 'no-dispatch']),
    'dispatch-in-flight':  new Set(['dispatched', 'dispatch-failed', 'partial-dispatch']),
    'dispatch-failed':     new Set(['dispatch-pending']),
    'partial-dispatch':    new Set(['dispatched', 'closed']),
    dispatched:            new Set(['closed']),
    'no-dispatch':         new Set(['closed']),
    closed:                new Set(['archived']),
    archived:              new Set(['cold-archived']),  // append-only beyond this point
    'cold-archived':       new Set([])                  // terminal (immutable)
  };

  // Minimum persona tier required to land each target token (Authority Cheat Sheet / Gate D).
  // Tiers: general/officer = 1, executive (DG / DG's Office) = 2, admin = 3.
  const REQUIRED_TIER = {
    registered: 1, triaged: 1, triage_complete: 1,
    assigning: 1, assigned: 1, 'assignment-failed': 1,
    acknowledged: 1, 'in-progress': 1, 'action-complete': 1, 'reassign-requested': 1,
    'pending-review': 1,
    approved: 2, 'approved-with-edit': 2, returned: 2, escalated: 2,
    'dispatch-pending': 2, 'dispatch-in-flight': 2, dispatched: 2, 'dispatch-failed': 2,
    'no-dispatch': 2, closed: 2, 'partial-dispatch': 2,
    archived: 2, 'cold-archived': 3   // archive is auto-on-closure (DG's Office); cold sweep is admin-only
  };
  const REVIEW_TOKENS = new Set(['approved', 'approved-with-edit', 'returned', 'escalated']);
  const TERMINAL_TASK = new Set(['action-complete', 'closed', 'archived', 'cold-archived']);
  const RESOLVED_APPR = new Set(['approved', 'approved-with-edit', 'returned', 'escalated', 'closed']);
  const RESOLVED_DISP = new Set(['dispatched', 'no-dispatch', 'partial-dispatch']);

  // ─────────────────────────────────────────────────────────────────────────
  // Canonical field aliases — every consumer reads the lower-case canonical key;
  // ingest copies any alias value (PascalCase, snake_case, etc.) into the canonical
  // when the canonical is empty. ADDITIVE — original keys preserved, never overwritten.
  // ─────────────────────────────────────────────────────────────────────────
  const FIELD_ALIASES = {
    title:      ['title', 'Title', 'TITLE', 'name', 'Name', 'displayName'],
    subject:    ['subject', 'Subject', 'SUBJECT', 'emailSubject', 'EmailSubject'],
    body:       ['body', 'Body', 'BODY', 'content', 'Content', 'htmlBody', 'HtmlBody', 'description', 'Description'],
    status:     ['status', 'Status', 'STATUS', 'state', 'State', 'AssignmentStatus', 'assignmentStatus'],
    priority:   ['priority', 'Priority', 'PRIORITY'],
    assignedTo: ['assignedTo', 'AssignedTo', 'Assigned_To', 'assignee', 'Assignee', 'assignedToEmail', 'AssignedToEmail'],
    assignedBy: ['assignedBy', 'AssignedBy', 'Assigned_By', 'assigner', 'Assigner', 'createdBy', 'CreatedBy'],
    sender:     ['sender', 'Sender', 'from', 'From', 'fromAddress', 'FromAddress', 'SenderEmail'],
    ts:         ['ts', 'timestamp', 'Timestamp', 'TimeStamp', 'TimeStampUtc', 'timeStamp', 'receivedDateTime', 'ReceivedDateTime', 'sentDateTime'],
    createdAt:  ['createdAt', 'CreatedAt', 'created', 'Created', 'createdOn', 'CreatedOn'],
    dueDate:    ['dueDate', 'DueDate', 'due', 'Due', 'dueOn', 'DueOn', 'taskDue', 'TaskDue', 'ackDue', 'AckDue'],
    category:   ['category', 'Category', 'categoryName', 'CategoryName'],
    department: ['department', 'Department', 'dept', 'Dept', 'departmentName', 'DepartmentName'],
    emailId:    ['emailId', 'EmailId', 'EmailID', 'messageId', 'MessageId', 'MessageID'],
    author:     ['author', 'Author', 'commentBy', 'CommentBy', 'createdBy', 'CreatedBy', 'EditorEmail', 'editorEmail', 'AuthorTitle', 'authorTitle'],
    url:        ['url', 'Url', 'URL', 'link', 'Link']
  };
  function normalizeRecord(r) {
    if (!r || typeof r !== 'object') return r;
    const out = { ...r };
    for (const canonical in FIELD_ALIASES) {
      if (out[canonical] != null && out[canonical] !== '' && typeof out[canonical] !== 'object') continue;
      for (const a of FIELD_ALIASES[canonical]) {
        if (a === canonical) continue;
        const v = out[a];
        if (v != null && v !== '' && typeof v !== 'object') { out[canonical] = v; break; }
      }
    }
    return out;
  }

  /** Collection key normalization — flows may return `Documents`, `REFERENCES`, `Tasks`, etc. */
  const COLL_VARIANTS = {
    document: ['document', 'documents', 'Document', 'Documents', 'docs', 'Docs', 'DOCUMENTS', 'DOCS'],
    task:     ['task', 'tasks', 'Task', 'Tasks', 'TASKS'],
    email:    ['email', 'emails', 'Email', 'Emails', 'EMAILS'],
    approval: ['approval', 'approvals', 'Approval', 'Approvals', 'APPROVALS'],
    comment:  ['comment', 'comments', 'Comment', 'Comments', 'COMMENTS', 'taskComment', 'taskComments', 'TaskComment', 'TaskComments'],
    activity: ['activity', 'activities', 'Activity', 'Activities', 'ACTIVITIES'],
    reference:['reference', 'references', 'Reference', 'References', 'Refs', 'refs', 'REFERENCES']
  };
  const COLL_TO_TYPE = {};
  for (const t in COLL_VARIANTS) for (const k of COLL_VARIANTS[t]) COLL_TO_TYPE[k] = t;

  const fetchAll = BaseService.endpoint('FETCH_ALL', { cache: 0, expectedKeys: ['ok'] });

  // ─── identity helpers ──────────────────────────────────────────────────────
  function refOf(rec) {
    if (!rec || typeof rec !== 'object') return null;
    for (const k of REF_ALT_KEYS) if (rec[k] != null && rec[k] !== '') return String(rec[k]);
    return null;
  }
  function idOf(type, rec) {
    for (const k of ENTITY_TYPES[type].altKeys) if (rec[k] != null) return String(rec[k]);
    return refOf(rec) || ('row-' + (_store[type].size + 1));
  }

  /** Q-6 mandate — hierarchical directorate derivation: PrimaryDSU first, then AssignedDSU.
   *  No legacy fallback map is permitted; if neither is present the record is an orphan. */
  function deriveDirectorate(rec) {
    const v = (rec.PrimaryDSU ?? rec.primaryDSU ?? rec.PrimaryDsu);
    if (v != null && String(v).trim() !== '') return String(v).trim();
    const a = (rec.AssignedDSU ?? rec.assignedDSU ?? rec.AssignedDsu);
    if (a != null && String(a).trim() !== '') return String(a).trim();
    return null;
  }

  function dedupHash(rec) {
    const sender = String(rec.sender || rec.from || '').toLowerCase().trim();
    const subject = String(rec.subject || rec.title || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const day = String(rec.ts || rec.createdAt || '').slice(0, 10);
    if (!sender && !subject) return null;
    return sender + '|' + subject + '|' + day;
  }
  function noteDedup(rec) {
    const hash = dedupHash(rec);
    if (!hash || !rec.__ref) return;
    const now = Date.now();
    for (const [h, v] of _dedup) if (now - v.ts > DEDUP_WINDOW_MS) _dedup.delete(h);  // prune window
    const hit = _dedup.get(hash);
    if (hit && hit.ref !== rec.__ref && (now - hit.ts) <= DEDUP_WINDOW_MS) {
      rec.__duplicateOf = hit.ref;                 // Phase-1 dedup warning consumes this flag
    } else {
      _dedup.set(hash, { ref: rec.__ref, ts: now });
    }
  }

  /** Raw index into the live store — assumes admission already passed. */
  function indexRaw(type, rec) {
    const id = idOf(type, rec);
    rec.__id = id;
    rec.__ref = refOf(rec);
    _store[type].set(id, rec);
    if (rec.__ref) {
      const arr = _byRef[type].get(rec.__ref) || [];
      arr.push(rec);
      _byRef[type].set(rec.__ref, arr);
    }
    return rec;
  }

  /** Admission gate — normalize, derive directorate, enforce No Orphan, dedup-flag, then index.
   *  Orphans (no reference, or directorate underivable on a primary type) go to _quarantine. */
  function admit(type, raw) {
    const rec = normalizeRecord(raw);
    rec.__ref = refOf(rec);
    rec.__directorate = deriveDirectorate(rec);
    const orphanRef = !rec.__ref;
    const orphanDsu = (rec.__directorate === null && type !== 'reference');
    if (orphanRef || orphanDsu) {
      const innerId = idOf(type, rec);
      rec.__id = innerId;
      rec.__quarantineReason = orphanRef ? 'reference-missing' : 'directorate-underivable';
      _quarantine.set(type + ':' + innerId, rec);
      Bus.emit('audit:orphan-quarantined', { type, id: innerId, reason: rec.__quarantineReason, ts: new Date().toISOString() });
      return null;
    }
    if (type === 'email' || type === 'document') noteDedup(rec);
    return indexRaw(type, rec);
  }

  // ─── scope / persona filter (defensive layers 2,4,5) ─────────────────────────
  function activeScope() {
    const C = globalThis.Platform && globalThis.Platform.Context;
    return (C && typeof C.directorate === 'function') ? C.directorate() : 'all';
  }
  function personaAllows(rec) {
    const P = globalThis.Platform && globalThis.Platform.Persona;
    if (P && typeof P.canSeeRecord === 'function') return !!P.canSeeRecord(rec);  // future A-8 hook
    return true;
  }
  function visible(rec) {
    if (!rec) return false;
    if (!personaAllows(rec)) return false;
    const scope = activeScope();
    if (scope === 'all') return true;
    return rec.__directorate === scope;
  }

  // ─── defensive copy ──────────────────────────────────────────────────────────
  function frozen(value) {
    if (value == null) return value;
    return Object.freeze(structuredClone(value));
  }
  function deepFreeze(value) {
    const clone = structuredClone(value);
    const seen = new Set();
    (function walk(o) {
      if (!o || typeof o !== 'object' || seen.has(o)) return;
      seen.add(o);
      Object.freeze(o);
      for (const k of Object.keys(o)) walk(o[k]);
    })(clone);
    return clone;
  }

  /** Unscoped, raw bundle assembly — used internally by archive() (a system action). */
  function rawBundle(refId) {
    const id = String(refId);
    const out = { referenceId: id };
    for (const child of RELATIONSHIPS.reference) out[child] = [...(_byRef[child]?.get(id) || [])];
    out.reference = _store.reference.get(id) || null;
    return out;
  }

  // ─── authority (Authority Cheat Sheet / Gate D) ──────────────────────────────
  function personaTier() {
    const P = globalThis.Platform && globalThis.Platform.Persona;
    const id = (P && typeof P.current === 'function' && P.current()) || 'general';
    return id === 'admin' ? 3 : id === 'executive' ? 2 : 1;
  }
  function authorityFor(to, by, refRec) {
    const P = globalThis.Platform && globalThis.Platform.Persona;
    const assigner = refRec.assignedBy || refRec.AssignedBy || refRec.createdBy || null;
    const isAssigner = !!(by && assigner && String(by) === String(assigner));
    // Explicit persona capabilities take precedence once later slices implement them (F-7, G-7).
    if (REVIEW_TOKENS.has(to) && P && typeof P.canReview === 'function') {
      if (P.canReview(refRec) || isAssigner) return { ok: true };
    }
    if (to === 'closed' && P && typeof P.canClose === 'function') {
      if (P.canClose(refRec) || isAssigner) return { ok: true };
    }
    const need = REQUIRED_TIER[to] ?? 1;
    const have = personaTier();
    if (have >= need) return { ok: true };
    if (isAssigner && need <= 2) return { ok: true };  // original-assigner authority (Cheat Sheet)
    return { ok: false, kind: 'NOT_AUTHORIZED', message: 'insufficient authority for state "' + to + '"' };
  }

  function fail(kind, message, extra) {
    return Object.freeze({ ok: false, kind, message: message || kind, ...(extra || {}) });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC FACADE — only these readers/writers escape the closure.
  // ─────────────────────────────────────────────────────────────────────────
  const facade = {
    /** Map a FETCH_ALL bundle (or any collection map) into the typed store. */
    ingest(data) {
      if (!data || typeof data !== 'object') return;
      const hasColl = (o) => Object.keys(o || {}).some((k) => COLL_TO_TYPE[k] || COLL_TO_TYPE[String(k).toLowerCase()]);
      let src = data;
      if (!hasColl(src)) {
        for (const v of Object.values(data)) {
          if (v && typeof v === 'object' && !Array.isArray(v) && hasColl(v)) { src = v; break; }
        }
      }
      for (const [coll, val] of Object.entries(src)) {
        const type = COLL_TO_TYPE[coll] || COLL_TO_TYPE[String(coll).toLowerCase()] || (ENTITY_TYPES[coll] ? coll : null);
        if (!type) continue;
        const rows = Array.isArray(val) ? val : firstArray(val);
        for (const r of rows) if (r && typeof r === 'object') admit(type, r);
      }
      // Synthesize reference rows from any child that carries a ref but has no explicit reference
      // record. The synthesized reference inherits its directorate structurally from that child
      // (bundle-structural derivation, NOT a legacy mapping table — Q-6 compliant).
      for (const type of Object.keys(_byRef)) {
        if (type === 'reference') continue;
        for (const [ref, arr] of _byRef[type]) {
          if (_store.reference.has(ref)) continue;
          const donor = (arr || []).find((r) => r.__directorate != null) || (arr || [])[0] || {};
          indexRaw('reference', { referenceId: ref, __directorate: donor.__directorate ?? null });
        }
      }
      // Documents whose own numeric ID is their reference identity become both document AND reference.
      for (const rec of _store.document.values()) {
        if (rec.__ref || !rec.__id) continue;
        rec.__ref = String(rec.__id);
        const arr = _byRef.document.get(rec.__ref) || []; arr.push(rec); _byRef.document.set(rec.__ref, arr);
        if (!_store.reference.has(rec.__ref))
          indexRaw('reference', { referenceId: rec.__ref, title: rec.title || '', status: rec.status || '', __directorate: rec.__directorate ?? null });
      }
    },

    async bootstrap(force) {
      if (hydrated && !force) return true;
      Bus.emit('entity:loading', { loading: true });
      for (const t of Object.keys(_store)) { _store[t].clear(); _byRef[t].clear(); }
      _quarantine.clear(); _dedup.clear();
      let ok = false;
      const res = await fetchAll({ action: 'fetchAll' });
      // Retain a shallow copy of the last raw response for incident triage (in-memory only).
      try {
        const envelope = { ok: res.ok, kind: res.kind, status: res.status, correlationId: res.correlationId,
          durationMs: res.durationMs, errors: res.errors, ts: new Date().toISOString() };
        const sample = JSON.stringify(res.body || res.data || null);
        lastRaw = sample.length < 5_000_000
          ? { ...envelope, body: res.body || res.data || null }
          : { ...envelope, body: null, _bodyOmitted: 'Response too large (' + Math.round(sample.length / 1024 / 1024) + ' MB) to retain in memory.' };
      } catch (_) { lastRaw = null; }
      const sources = [
        res.data,
        res.body && typeof res.body === 'object' ? res.body.data : null,
        res.body && typeof res.body === 'object' ? res.body : null
      ].filter((s) => s && typeof s === 'object');
      const before = Object.values(_store).reduce((n, m) => n + m.size, 0);
      for (const s of sources) {
        this.ingest(s);
        const after = Object.values(_store).reduce((n, m) => n + m.size, 0);
        if (after > before) { ok = true; break; }
      }
      if (!ok) {
        (globalThis.Platform?.Log)?.warn('entity.fetch-failed', {
          message: (res.errors && res.errors[0] && res.errors[0].message) || res.kind || 'no records ingested',
          triedSources: sources.length, httpStatus: res.status, quarantined: _quarantine.size
        });
      } else {
        (globalThis.Platform?.Log)?.info('entity.fetch-ok', { counts: this.counts(), quarantined: _quarantine.size });
      }
      hydrated = true; this.source = source;
      if (globalThis.Platform?.State) globalThis.Platform.State.set('shared.connectivity.dataOk', ok);
      Bus.emit('entity:bootstrapped', { ok, source, counts: this.counts() });
      Bus.emit('data:refresh', { source, counts: this.counts() });
      return ok;
    },

    isHydrated() { return hydrated; },
    lastRawResponse() { return lastRaw || null; },

    // ─── scoped, frozen readers (A-1, A-2, A-8) ───────────────────────────────
    all(type) {
      if (!_store[type]) return [];
      const out = [];
      for (const r of _store[type].values()) if (visible(r)) out.push(frozen(r));
      return out;
    },
    get(type, id) {
      const rec = _store[type]?.get(String(id)) || null;
      if (!rec) return null;
      if (!visible(rec)) {
        Bus.emit('audit:unauthorized-access-attempt', {
          persona: (globalThis.Platform?.Persona?.current && globalThis.Platform.Persona.current()) || null,
          attemptedRef: rec.__ref || null, requiredDirectorate: rec.__directorate || null, ts: new Date().toISOString()
        });
        return null;
      }
      return frozen(rec);
    },
    byReference(refId) {
      const id = String(refId);
      const out = { referenceId: id };
      for (const child of RELATIONSHIPS.reference)
        out[child] = [...(_byRef[child]?.get(id) || [])].filter(visible);
      const refRec = _store.reference.get(id) || null;
      out.reference = (refRec && visible(refRec)) ? refRec : null;
      return frozen(out);
    },

    /** Rollups for aggregator modules — counts only the records the active scope may see. */
    counts() {
      const c = {};
      for (const t of Object.keys(_store)) {
        let n = 0; for (const r of _store[t].values()) if (visible(r)) n++;
        c[t] = n;
      }
      const status = {}, priority = {}, assignee = {};
      const overdue = []; const now = Date.now();
      const isClosed = (s) => /closed|done|complete|resolved|archived/.test(String(s || '').toLowerCase());
      for (const t of ['document', 'task', 'approval', 'email']) for (const r of _store[t].values()) {
        if (!visible(r)) continue;
        const s = (r.status || 'unknown').toString().toLowerCase();
        status[s] = (status[s] || 0) + 1;
        const p = (r.priority || '').toString();
        if (p) priority[p] = (priority[p] || 0) + 1;
      }
      for (const t of ['task', 'document']) for (const r of _store[t].values()) {
        if (!visible(r)) continue;
        const a = (r.assignedTo || '').toString();
        if (a) assignee[a] = (assignee[a] || 0) + 1;
      }
      for (const t of ['task', 'document']) for (const r of _store[t].values()) {
        if (!visible(r)) continue;
        const due = r.dueDate; if (!due) continue;
        const ms = Date.parse(due);
        if (!Number.isNaN(ms) && ms < now && !isClosed(r.status))
          overdue.push({ ref: r.__ref, title: r.title || r.subject || r.__id, due, assignedTo: r.assignedTo || '', type: t });
      }
      const recent = [..._store.reference.values()]
        .filter((r) => visible(r) && r.ts).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)).slice(0, 8)
        .map((r) => frozen(r));
      const DAY = 86400000, today = new Date(); today.setHours(0, 0, 0, 0);
      const days = []; for (let i = 13; i >= 0; i--) days.push(new Date(today.getTime() - i * DAY));
      const bucket = Object.fromEntries(days.map((d) => [d.toISOString().slice(0, 10), 0]));
      for (const t of Object.keys(_store)) for (const r of _store[t].values()) {
        if (!visible(r)) continue;
        const ms = Date.parse(r.ts || r.createdAt); if (Number.isNaN(ms)) continue;
        const key = new Date(ms).toISOString().slice(0, 10);
        if (key in bucket) bucket[key] += 1;
      }
      c.timeline = days.map((d) => { const k = d.toISOString().slice(0, 10); return { date: k, count: bucket[k] }; });
      c.byStatus = status; c.byPriority = priority; c.byAssignee = assignee;
      c.overdue = { count: overdue.length, items: overdue.slice(0, 12) };
      c.recent = recent;
      return c;
    },

    /** Insert/update one record through the admission gate; notify dependent lenses. */
    upsert(type, record) {
      if (!_store[type]) return null;
      const rec = admit(type, { ...record });
      if (!rec) return null;   // quarantined (orphan / directorate-underivable)
      Bus.emit('entity:' + type + ':changed', { id: rec.__id, ref: rec.__ref });
      if (rec.__ref) Bus.emit('entity:reference:updated', { ref: rec.__ref, type });
      Bus.emit('entity:changed', { type, id: rec.__id, ref: rec.__ref });
      Bus.emit('entity:update', { type, id: rec.__id, ref: rec.__ref });
      return frozen(rec);
    },

    /** THE phase-gate chokepoint (C-7). Sole status mutator. Validates the canonical state
     *  machine, checks persona authority, enforces the four integrity contracts, audits. */
    transitionStatus(ref, from, to, by) {
      const refId = String(ref);
      const target = String(to || '');
      if (!ALL_TOKENS.has(target)) return fail('INVALID_STATE', 'unknown status token "' + target + '"');
      const refRec = _store.reference.get(refId);
      if (!refRec) return fail('NO_REFERENCE', 'no reference record for "' + refId + '" (No Orphan contract)');
      if (_archive.has(refId)) return fail('IMMUTABLE', 'reference "' + refId + '" is archived and immutable');

      const current = String(refRec.status || '');
      if (from != null && from !== '' && current && current !== String(from))
        return fail('STATE_CONFLICT', 'expected from "' + from + '" but current is "' + current + '"', { current });

      const allowed = TRANSITIONS[current] || TRANSITIONS[''];
      if (!allowed || !allowed.has(target))
        return fail('ILLEGAL_TRANSITION', 'cannot move "' + (current || '∅') + '" → "' + target + '"', { current });

      const auth = authorityFor(target, by, refRec);
      if (!auth.ok) {
        Bus.emit('audit:unauthorized-access-attempt', {
          persona: (globalThis.Platform?.Persona?.current && globalThis.Platform.Persona.current()) || null,
          attemptedRef: refId, action: 'transition:' + target, by: by || null, ts: new Date().toISOString()
        });
        return fail(auth.kind, auth.message, { ref: refId });
      }

      // Closure Gate contract (A-5): a reference may only close once all dependents are resolved.
      if (target === 'closed') {
        const gate = facade.canClose(refId);
        if (!gate.ok) return fail('CLOSURE_BLOCKED', 'closure prerequisites unmet', { reasons: gate.reasons });
      }
      // Atomic Archive contract (A-4/H-5/H-6): snapshot the whole bundle, deep-freeze, all-or-nothing.
      if (target === 'archived') {
        const archived = facade.archive(refId);
        if (!archived.ok) return archived;
      }

      const ts = new Date().toISOString();
      refRec.status = target;
      refRec.__lastTransition = { from: current, to: target, by: by || null, ts };

      // Activity Audit Thread contract — ref-keyed audit event for the audit log + timeline.
      Bus.emit('audit:phase-transition', {
        ref: refId, from: current, to: target, by: by || null, ts,
        fromPhase: STATUS_PHASE[current] || null, toPhase: STATUS_PHASE[target] || null
      });
      Bus.emit('entity:reference:updated', { ref: refId, type: 'reference' });
      Bus.emit('entity:changed', { type: 'reference', id: refRec.__id, ref: refId });
      return Object.freeze({ ok: true, ref: refId, from: current, to: target, by: by || null, ts });
    },

    /** Closure-Gate evaluator (A-5): all tasks terminal, all approvals resolved, all dispatch resolved. */
    canClose(ref) {
      const refId = String(ref);
      if (!_store.reference.get(refId)) return { ok: false, reasons: ['no-reference'] };
      const reasons = [];
      for (const tk of (_byRef.task.get(refId) || []))
        if (!TERMINAL_TASK.has(String(tk.status || '').toLowerCase())) reasons.push('task-not-terminal:' + tk.__id);
      for (const ap of (_byRef.approval.get(refId) || []))
        if (!RESOLVED_APPR.has(String(ap.status || '').toLowerCase())) reasons.push('approval-open:' + ap.__id);
      for (const ac of (_byRef.activity.get(refId) || [])) {
        const kind = String(ac.kind || ac.type || '').toLowerCase();
        if (kind.indexOf('dispatch') === -1) continue;
        if (!RESOLVED_DISP.has(String(ac.status || '').toLowerCase())) reasons.push('dispatch-unresolved:' + ac.__id);
      }
      return { ok: reasons.length === 0, reasons };
    },

    /** Atomic-Archive writer (A-4/H-3): deep-frozen all-or-nothing bundle snapshot; append-only. */
    archive(ref) {
      const refId = String(ref);
      const refRec = _store.reference.get(refId);
      if (!refRec) return fail('NO_REFERENCE', 'cannot archive missing reference "' + refId + '"');
      if (_archive.has(refId)) return Object.freeze({ ok: true, ref: refId, kind: 'ALREADY_ARCHIVED' });
      let snapshot;
      try {
        snapshot = deepFreeze({ ...rawBundle(refId), __archivedAt: new Date().toISOString() });
      } catch (e) {
        return fail('ARCHIVE_FAILED', String((e && e.message) || e));
      }
      _archive.set(refId, snapshot);   // commit only after the frozen snapshot is fully built (atomic)
      Bus.emit('audit:archived', { ref: refId, ts: snapshot.__archivedAt });
      return Object.freeze({ ok: true, ref: refId });
    },

    /** Read an archived bundle (already immutable). Audited as an archive access. */
    archived(ref) {
      const refId = String(ref);
      const snap = _archive.get(refId) || null;
      if (snap) Bus.emit('audit:archive-accessed', {
        ref: refId, persona: (globalThis.Platform?.Persona?.current && globalThis.Platform.Persona.current()) || null, ts: new Date().toISOString()
      });
      return snap;
    },

    /** Quarantined orphan records — admin persona only (Section 3.4 / Quarantine). */
    quarantine() {
      const id = (globalThis.Platform?.Persona?.current && globalThis.Platform.Persona.current()) || 'general';
      if (id !== 'admin') return [];
      return [..._quarantine.values()].map((r) => frozen(r));
    },

    subscribe(typeOrAll, fn) {
      const ev = typeOrAll === '*' ? 'entity:changed' : 'entity:' + typeOrAll + ':changed';
      return Bus.on(ev, fn);
    },

    source
  };

  return facade;
})();

export default Entities;
__OBSIDIAN_DEPLOY_EOF__

write 'core/error-router.js' <<'__OBSIDIAN_DEPLOY_EOF__'
/** OBSIDIAN v4.0 — error-router.js · the canonical kind → UI behaviour map (register A-10 / S1).
 *  Consumes the machine-readable `result.errorKind` attached by core/api.js and routes each failure
 *  to its locked behaviour: re-auth prompts, OTP-modal mount requests, and danger/warning toasts with
 *  the correct aria-live urgency. UI.toastError delegates here at runtime (no static import cycle:
 *  this module imports UI, ui.js only reaches ErrorRouter via globalThis.Platform). */
import { Bus } from './bus.js';
import { UI } from './ui.js';

function t(key, vars) { return globalThis.Platform?.I18n?.t ? globalThis.Platform.I18n.t(key, vars) : key; }

/** The 13-row taxonomy. variant drives toast colour + aria-live (danger ⇒ assertive in pf-toast).
 *  behaviour fires a canonical side-effect event; suppress hides the toast (handled elsewhere). */
const TAXONOMY = {
  OK:                   { variant: 'success', i18nKey: null,                     behaviour: null,    retryable: false, suppress: true },
  AUTH_FAILED:          { variant: 'danger',  i18nKey: 'error.auth.failed',      behaviour: 'auth',  retryable: false },
  OTP_REQUIRED:         { variant: 'info',    i18nKey: 'otp.required',           behaviour: 'otp',   retryable: false },
  OTP_INVALID:          { variant: 'danger',  i18nKey: 'otp.invalid',            behaviour: null,    retryable: true },
  OTP_EXPIRED:          { variant: 'warning', i18nKey: 'otp.expired',            behaviour: null,    retryable: true },
  DIRECTORATE_MISMATCH: { variant: 'warning', i18nKey: 'error.directorate.mismatch', behaviour: null, retryable: false },
  RATE_LIMITED:         { variant: 'warning', i18nKey: 'error.rateLimited',      behaviour: 'rate',  retryable: true },
  VALIDATION_FAILED:    { variant: 'warning', i18nKey: 'error.validation',       behaviour: null,    retryable: true },
  NOT_AUTHORIZED:       { variant: 'danger',  i18nKey: 'error.notAuthorized',    behaviour: 'denied', retryable: false },
  DISPATCH_FAILED:      { variant: 'danger',  i18nKey: 'dispatch.failed',        behaviour: null,    retryable: true },
  CONFLICT_IDEMPOTENT:  { variant: 'info',    i18nKey: 'info.alreadyApplied',    behaviour: null,    retryable: false },
  UPSTREAM_TIMEOUT:     { variant: 'warning', i18nKey: 'error.timeout',          behaviour: null,    retryable: true },
  INTERNAL_ERROR:       { variant: 'danger',  i18nKey: 'error.internal',         behaviour: null,    retryable: false }
};

function entryFor(kind) { return TAXONOMY[kind] || TAXONOMY.INTERNAL_ERROR; }

export const ErrorRouter = {
  TAXONOMY,
  /** Look up the taxonomy entry for a normalized API result (or a raw kind string).
   *  Unknown kinds normalize to INTERNAL_ERROR so callers never branch on an unmapped label. */
  classify(resultOrKind) {
    const raw = typeof resultOrKind === 'string' ? resultOrKind : (resultOrKind && resultOrKind.errorKind);
    const kind = (raw && TAXONOMY[raw]) ? raw : 'INTERNAL_ERROR';
    return { kind, ...entryFor(kind) };
  },

  /** Route a failed API result to its canonical UI behaviour. Returns the toast id (or null). */
  handle(result) {
    if (!result || result.ok) return null;
    const kind = result.errorKind || 'INTERNAL_ERROR';
    const e = entryFor(kind);

    // Canonical side-effects (the UI shell / flows subscribe to these).
    if (e.behaviour === 'auth')   Bus.emit('auth:required', { result, ts: new Date().toISOString() });
    if (e.behaviour === 'otp')    Bus.emit('otp:required', { result, ts: new Date().toISOString() });
    if (e.behaviour === 'rate')   Bus.emit('rate:limited', { retryAfter: result.retryAfter || null });
    if (e.behaviour === 'denied') Bus.emit('audit:unauthorized-access-attempt', {
      persona: (globalThis.Platform?.Persona?.current && globalThis.Platform.Persona.current()) || null,
      action: (result.errors && result.errors[0] && result.errors[0].code) || 'api', ts: new Date().toISOString() });

    if (e.suppress || !e.i18nKey) return null;

    const detail = (Array.isArray(result.errors) && result.errors[0] && result.errors[0].message) || '';
    const base = t(e.i18nKey);
    const text = detail && detail !== base ? base + ' — ' + detail : base;
    const timeout = (kind === 'RATE_LIMITED' && result.retryAfter)
      ? Math.min(Math.max(result.retryAfter * 1000, 5000), 30000)
      : (e.variant === 'danger' ? 7000 : 5500);
    return UI.toast({ message: text, variant: e.variant, timeout });
  },

  /** Subscribe to the global error bus so uncaught platform errors also route through the taxonomy. */
  install() {
    Bus.on('platform:error', (result) => { try { ErrorRouter.handle(result); } catch (_) { /* never throw from a handler */ } });
    return ErrorRouter;
  }
};

export default ErrorRouter;
__OBSIDIAN_DEPLOY_EOF__

write 'core/idempotency.js' <<'__OBSIDIAN_DEPLOY_EOF__'
// FILE: core/idempotency.js
/** OBSIDIAN v4.0 — core/idempotency.js · Idempotency key builder + bounded request log (A-11).
 *  Deterministic-within-bucket keys so identical retries reuse the same key and Power Automate
 *  de-dupes server-side. Default bucket is 300000 ms (5 min) — longer than the OTP email delay so an
 *  OTP-gated bulk retry keeps its key (register A-11). Pass bucketMs:0/false for a fully stable key. */

const DEFAULT_BUCKET_MS = 300000;
const LOG_CAP = 500;
const PERSIST_KEY = 'obsidian.requestLog.v1';
const log = [];

/** Actions that are reads — callers/api use this to avoid stamping idempotency on reads. */
const READ_ACTIONS = new Set([
  'fetchall', 'getdocs', 'lookups', 'init', 'refresh_emails', 'load_email_details', 'load_event_info',
  'track', 'get_all', 'get_bootstrap', 'listdocs', 'getdoc', 'getreferences', 'list-activities', 'read'
]);

function isReadAction(action) {
  return !!action && READ_ACTIONS.has(String(action).toLowerCase());
}

/** Deterministic stable serialization — object keys sorted recursively so two logically equal
 *  payloads always serialize identically regardless of property insertion order. */
function stableStringify(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    let out = '[';
    for (let i = 0; i < value.length; i++) {
      if (i > 0) out += ',';
      out += stableStringify(value[i]);
    }
    return out + ']';
  }
  const keys = Object.keys(value).sort();
  let out = '{';
  let first = true;
  for (const k of keys) {
    if (value[k] === undefined) continue;
    if (!first) out += ',';
    out += JSON.stringify(k) + ':' + stableStringify(value[k]);
    first = false;
  }
  return out + '}';
}

/** Lightweight deterministic 32-bit FNV-1a hash, base36 — no external packages. */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return (h >>> 0).toString(36);
}

/** Fingerprint of a payload, excluding volatile envelope fields that must not change identity. */
function fingerprintOf(payload) {
  const clone = {};
  if (payload && typeof payload === 'object') {
    for (const k of Object.keys(payload)) {
      if (k === 'idempotencyKey' || k === 'correlationId' || k === 'ts' || k === 'timestamp') continue;
      clone[k] = payload[k];
    }
  }
  return fnv1a(stableStringify(clone));
}

function refOf(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const v = payload.refId || payload.referenceId || payload.Reference_ID || payload.RefIDD || payload.target ||
    (payload.Selected && (payload.Selected.RefIDD || payload.Selected.ID)) || '';
  return String(v || '');
}

function token(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_-]+/g, '');
}

// Restore prior log on module load — survives reloads, useful for incident debugging.
(function _restore() {
  try {
    const raw = globalThis.localStorage && localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) for (const e of arr.slice(-LOG_CAP)) log.push(e);
  } catch (_) { /* private mode / corrupted — skip */ }
})();

let _persistTimer = null;
function _persistSoon() {
  if (_persistTimer) return;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    try { globalThis.localStorage && localStorage.setItem(PERSIST_KEY, JSON.stringify(log)); }
    catch (_) { /* over-quota / private mode — skip */ }
  }, 1000);
}

export const Idempotency = {
  DEFAULT_BUCKET_MS,
  isReadAction,
  stableStringify,
  fingerprint: fingerprintOf,

  /** Build a deterministic idempotency key. Preserves a provided key verbatim.
   *  bucketMs 0/false disables the time bucket so the key is stable for an identical payload. */
  build({ endpointKey, action, operation, refId, referenceId, target, payload, bucketMs, key } = {}) {
    if (key) return String(key);
    const verb = token(String(action || operation || (payload && (payload.action || payload.operation)) || 'write').toLowerCase());
    const ep = token(endpointKey || '');
    const ref = token(refId || referenceId || target || refOf(payload));
    const fp = fingerprintOf(payload || {});
    const disabled = bucketMs === 0 || bucketMs === false;
    const ms = (typeof bucketMs === 'number' && bucketMs > 0) ? bucketMs : DEFAULT_BUCKET_MS;
    const bucket = disabled ? 'stable' : String(Math.floor(Date.now() / ms));
    return ['obsidian', ep || 'na', verb || 'write', ref || 'na', fp, bucket].join('.');
  },

  /** Normalize an idempotency input. Returns { idempotencyKey, source, bucketMs, fingerprint }.
   *  Preserves a provided key (source 'provided'); otherwise derives one (source 'derived'). */
  normalizeInput({ endpointKey, action, operation, refId, referenceId, target, payload, opts, bucketMs, key } = {}) {
    const provided = key || (payload && payload.idempotencyKey) || (opts && opts.idempotencyKey) || null;
    const effectiveBucket = (bucketMs !== undefined) ? bucketMs
      : (opts && opts.bucketMs !== undefined) ? opts.bucketMs
      : DEFAULT_BUCKET_MS;
    const fingerprint = fingerprintOf(payload || {});
    if (provided) {
      return { idempotencyKey: String(provided), source: 'provided', bucketMs: effectiveBucket, fingerprint };
    }
    const idempotencyKey = this.build({
      endpointKey, action: action || (payload && payload.action),
      operation: operation || (payload && payload.operation),
      refId, referenceId, target, payload, bucketMs: effectiveBucket
    });
    return { idempotencyKey, source: 'derived', bucketMs: effectiveBucket, fingerprint };
  },

  /** Record a request entry in the bounded ring buffer for diagnostics. */
  record({ endpointKey, action, key, ok, status, durationMs, errorMessage } = {}) {
    if (log.length >= LOG_CAP) log.shift();
    log.push({
      ts: new Date().toISOString(),
      endpointKey: endpointKey || '', action: action || '',
      key: key || '',
      ok: !!ok, status: status || null,
      durationMs: durationMs || null,
      errorMessage: errorMessage || null
    });
    _persistSoon();
  },

  /** Inspect the request log (newest first). */
  log({ limit = 100, endpointKey = null, action = null, okOnly = false, errOnly = false } = {}) {
    let out = log.slice().reverse();
    if (endpointKey) out = out.filter((e) => e.endpointKey === endpointKey);
    if (action) out = out.filter((e) => e.action === action);
    if (okOnly) out = out.filter((e) => e.ok);
    if (errOnly) out = out.filter((e) => !e.ok);
    return out.slice(0, limit);
  },

  clear() {
    log.length = 0;
    try { globalThis.localStorage && localStorage.removeItem(PERSIST_KEY); } catch (_) { /* ignore */ }
  }
};
export default Idempotency;
// END FILE: core/idempotency.js
__OBSIDIAN_DEPLOY_EOF__

write 'core/platform.js' <<'__OBSIDIAN_DEPLOY_EOF__'
/** OBSIDIAN v4.0 — platform.js · composes window.Platform from the emitted core/config.
 *  Later batches attach Forms/Tables/Charts/Palette/Shortcuts/Observability via Platform.extend(). */
import { AppConfig } from '../config/app.config.js';
import { Endpoints } from '../config/endpoints.config.js';
import { FeatureFlags } from '../config/feature-flags.config.js';
import { PERSONAS } from '../config/personas.config.js';
import { StateSchema } from '../config/state.schema.js';
import { BRANDS } from '../config/brand.config.js';
import { RoutesConfig } from '../config/routes.config.js';

import { Log } from './log.js';
import { Bus } from './bus.js';
import { Storage } from './storage.js';
import { State } from './state.js';
import { Errors } from './errors.js';
import { Format } from './format.js';
import { A11y } from './a11y.js';
import { I18n } from './i18n.js';
import { API } from './api.js';
import { BaseService } from './base-service.js';
import { Modules } from './modules-registry.js';
import { Theme } from './theme-manager.js';
import { Brand } from './brand-manager.js';
import { Persona } from './persona-controller.js';
import { Router } from './router.js';
import { Nav } from './nav-controller.js';
import { UI } from './ui.js';
import { Lifecycle } from './lifecycle.js';
import { Entities } from './entity-store.js';
import { Context, goToEntity } from './context.js';
import { Idempotency } from './idempotency.js';
import { AuditLog } from './audit-log.js';
import { ErrorRouter } from './error-router.js';

const Platform = {
  Config:AppConfig, Endpoints, Flags:FeatureFlags, Routes:RoutesConfig,
  Personas:PERSONAS, StateSchema, BrandConfig:BRANDS,
  Log, Bus, Storage, State, Errors, Format, A11y, I18n,
  API, BaseService, Modules, Theme, Brand, Persona, Router, Nav, UI, Lifecycle,
  Entities, Context, goToEntity, Idempotency, AuditLog, ErrorRouter,
  extend(obj) { Object.assign(Platform, obj); return Platform; }
};
if (typeof window !== 'undefined') window.Platform = Platform;
// A-10 — route uncaught platform errors through the canonical taxonomy too.
ErrorRouter.install();


// Global keyboard shortcuts — install once at platform boot.
(function _installShortcuts() {
  if (typeof globalThis === 'undefined' || typeof globalThis.addEventListener !== 'function') return;
  if (globalThis.document) {
    let gPressed = false; let gTimer = null;
    const isTyping = (e) => {
      const t = e.target;
      if (!t || !t.tagName) return false;
      const tag = t.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
    };
    globalThis.document.addEventListener('keydown', (e) => {
      // '?' opens shortcuts cheatsheet
      if (!isTyping(e) && e.key === '?') { e.preventDefault(); Platform.UI?.openShortcuts?.(); return; }
      // '/' focuses lookup module's search if available
      if (!isTyping(e) && e.key === '/') {
        const lookupQ = globalThis.document.getElementById('lookup-q');
        if (lookupQ) { e.preventDefault(); lookupQ.focus(); return; }
      }
      // 'g' then letter → navigate
      if (!isTyping(e) && e.key === 'g' && !gPressed) {
        gPressed = true; if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 700);
        return;
      }
      if (!isTyping(e) && gPressed) {
        const TARGETS = { h:'home', o:'ops-hub', l:'lookup', r:'response-tracking', s:'settings', d:'diagnostics', c:'correspondence', a:'assignment' };
        const tgt = TARGETS[e.key.toLowerCase()];
        if (tgt) { e.preventDefault(); gPressed = false; Platform.Router?.navigate?.(tgt); return; }
      }
      // 'r' refresh fabric
      if (!isTyping(e) && e.key === 'r') {
        Platform.Entities?.bootstrap?.(true).catch(() => {});
        Platform.Lookups?.load?.(true).catch(() => {});
      }
      // 'n' open new assignment
      if (!isTyping(e) && e.key === 'n') {
        Platform.Router?.navigate?.('single-item-ops');
      }
    });
  }
})();

export default Platform;
export { Platform };
__OBSIDIAN_DEPLOY_EOF__

write 'core/ui.js' <<'__OBSIDIAN_DEPLOY_EOF__'
/** OBSIDIAN v4.0 — ui.js · toast + modal orchestration (drives shell components via Bus).
 *  No raw UI strings: error toasts map normalized API result.kind -> i18n key. */
import { Bus } from './bus.js';
const ERR_KEY = { network:'errors.api.network', timeout:'errors.api.timeout', server:'errors.api.server',
  client:'errors.api.client', parse:'errors.api.parse', notImplemented:'errors.api.notImplemented',
  config:'errors.api.unknownEndpoint',
  rateLimit:'errors.api.rateLimit', unavailable:'errors.api.unavailable', auth:'errors.api.auth',
  duplicate:'errors.api.duplicate', abort:null };
function t(key, vars) { return (globalThis.Platform?.I18n?.t) ? globalThis.Platform.I18n.t(key, vars) : key; }
let seq = 0;
export const UI = {
  toast({ messageKey, message, variant='info', timeout=5000, vars, action }) {
    const id = ++seq;
    Bus.emit('platform:ui:toast', { id, text: message ?? t(messageKey, vars), variant, timeout, action: action || null });
    return id;
  },
  /** Mandatory preview/confirmation before any write/state-change/backend trigger.
   *  Opens a modal showing the intended action + details; resolves true only on explicit confirm. */
  confirm({ titleKey, summaryKey, summary, details = [], confirmKey = 'common.actions.confirm', danger = false } = {}) {
    return new Promise((resolve) => {
      const id = 'cfm-' + Math.random().toString(36).slice(2, 8);
      let settled = false;
      const done = (v) => { if (settled) return; settled = true; resolve(v); };
      const yes = 'platform:ui:confirm:' + id + ':yes', no = 'platform:ui:confirm:' + id + ':no';
      Bus.once(yes, () => done(true));
      Bus.once(no, () => done(false));
      Bus.once('platform:ui:modal-close', () => done(false));
      Bus.emit('platform:ui:modal', { id, titleKey, preview: { summaryKey, summary, details },
        actions: [ { labelKey: confirmKey, variant: danger ? 'danger' : 'primary', event: yes },
                   { labelKey: 'common.actions.cancel', event: no } ] });
    });
  },
  /** Emit completion event + show success toast with optional "View" deep-link when meta carries
   *  module (+ target). Backward-compatible: meta without module produces a plain success toast. */
  actionCompleted(key, meta = {}) {
    Bus.emit('ui:action:completed', { key, ...meta });
    let action = null;
    if (meta && meta.module) {
      const deepLink = meta.target ? `#/${meta.module}/${meta.target}` : `#/${meta.module}`;
      action = { label: t('common.actions.view'), deepLink };
    }
    return UI.toast({ messageKey: key, variant: 'success', vars: meta, action, timeout: 6500 });
  },
  toastSuccess(messageKey, vars, action) { return UI.toast({ messageKey, variant:'success', vars, action }); },
  toastError(result) {
    // A-10: when the API attached a canonical errorKind, route through the taxonomy (re-auth / OTP /
    // rate-limit behaviours + correct aria-live). Falls back to the legacy transport-kind map below.
    const R = globalThis.Platform && globalThis.Platform.ErrorRouter;
    if (R && result && result.errorKind) return R.handle(result);
    const kind = result && result.kind; const key = ERR_KEY[kind] ?? 'errors.api.client';
    if (key === null) return null; // aborted: silent
    const detail = (result && Array.isArray(result.errors) && result.errors[0] && result.errors[0].message) || '';
    const base = t(key);
    const text = detail ? `${base} — ${detail}` : base;
    const timeout = kind === 'rateLimit' && result.retryAfter
      ? Math.min(Math.max(result.retryAfter * 1000, 5000), 30000)
      : 5500;
    return UI.toast({ message: text, variant:'danger', timeout });
  },
  dismiss(id) { Bus.emit('platform:ui:toast-dismiss', { id }); },
  modal({ titleKey, title, bodyKey, bodyEl, component, props, preview, actions }) {
    const id = ++seq;
    Bus.emit('platform:ui:modal', { id, titleKey, title, bodyKey, bodyEl, component, props, preview, actions: actions || [] });
    return { id, close: () => Bus.emit('platform:ui:modal-close', { id }) };
  },
  /** Open a Task Update workspace — status / priority / due date / notes — and commit changes
   *  through SUBSIDIARY_ACTIONS#UPDATE_TASK. Returns a promise that resolves with the result. */
  openTaskUpdate(task) {
    return new Promise((resolve) => {
      import('../shared/utils/dom.js').then(({ el, clear }) => {
        const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
        const T = (k, vars) => I.t(k, vars);
        const PRIORITIES = ['P1 (High)', 'P2 (Medium)', 'P3 (Normal)', 'P4 (Low)'];
        const STATUSES = ['New', 'In Progress', 'Pending Review', 'Completed', 'On Hold'];
        const draft = {
          status: task.status || task.Status || 'New',
          priority: task.priority || task.Priority || 'P3 (Normal)',
          dueDate: task.dueDate || task.taskDue || task.DueDate || '',
          notes: ''
        };
        const root = el('div', { class: 'pf-task-update' });
        // Status chips
        const stWrap = el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', text: T('field.status.label') }),
          el('div', { class: 'pf-chipgroup', id: 'tu-status', role: 'radiogroup' },
            STATUSES.map((s) => {
              const b = el('button', { type: 'button', class: 'pf-chip' + (s === draft.status ? ' pf-chip--selected' : ''),
                'data-val': s, text: s });
              b.addEventListener('click', () => {
                stWrap.querySelectorAll('.pf-chip').forEach((c) => c.classList.remove('pf-chip--selected'));
                b.classList.add('pf-chip--selected'); draft.status = s;
              });
              return b;
            }))
        ]);
        // Priority chips
        const prWrap = el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', text: T('field.priority.label') }),
          el('div', { class: 'pf-chipgroup', id: 'tu-priority', role: 'radiogroup' },
            PRIORITIES.map((p) => {
              const b = el('button', { type: 'button', class: 'pf-chip' + (p === draft.priority ? ' pf-chip--selected' : ''),
                'data-val': p, text: p });
              b.addEventListener('click', () => {
                prWrap.querySelectorAll('.pf-chip').forEach((c) => c.classList.remove('pf-chip--selected'));
                b.classList.add('pf-chip--selected'); draft.priority = p;
              });
              return b;
            }))
        ]);
        const due = el('input', { class: 'pf-input', type: 'date', value: draft.dueDate });
        due.addEventListener('change', () => { draft.dueDate = due.value; });
        const notes = el('textarea', { class: 'pf-input', rows: '3', placeholder: T('module.single-item-ops.commentsHint') });
        notes.addEventListener('input', () => { draft.notes = notes.value; });

        root.append(stWrap, prWrap,
          el('div', { class: 'pf-field' }, [el('label', { class: 'pf-label', text: T('field.taskDue.label') }), due]),
          el('div', { class: 'pf-field' }, [el('label', { class: 'pf-label', text: T('field.comments.label') }), notes]));

        let submitting = false;
        const id = ++seq;
        const close = (result) => { Bus.emit('platform:ui:modal-close', { id }); resolve(result); };
        Bus.emit('platform:ui:modal', { id, title: T('task.update.title'), bodyEl: root, actions: [
          { labelKey: 'common.actions.cancel', variant: 'ghost' },
          { labelKey: 'task.update.submit', variant: 'primary', close: false, event: '__tu_submit_' + id }
        ] });
        Bus.on('__tu_submit_' + id, async () => {
          if (submitting) return; submitting = true;
          try {
            const P = globalThis.Platform;
            const svc = await import('../core/base-service.js');
            const update = svc.BaseService.endpoint('SUBSIDIARY_ACTIONS', { expectedKeys: ['ok', 'data'] });
            const ref = task.__ref || task.referenceId || task.RefIDD || '';
            const res = await update({ action: 'UPDATE_TASK', RefIDD: ref, taskId: task.__id || task.id,
              status: draft.status, priority: draft.priority, dueDate: draft.dueDate, notes: draft.notes });
            if (res.ok) {
              P.Entities.upsert('task', { ...task, status: draft.status, priority: draft.priority, dueDate: draft.dueDate });
              P.UI.actionCompleted('task.updated', { module: 'response-tracking', target: ref });
              close({ ok: true, draft });
            } else { submitting = false; }
          } catch (err) { submitting = false; }
        });
      });
    });
  },
  /** Open a Flag-for-DG-Attention modal (reason + urgency). Fires SUBSIDIARY_ACTIONS#flagDocument
   *  on submit. Returns a promise that resolves with { ok, draft } or { ok:false }. */
  openFlagDocument(doc) {
    return new Promise((resolve) => {
      Promise.all([
        import('../shared/utils/dom.js'),
        import('./base-service.js')
      ]).then(([{ el }, svc]) => {
        const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
        const T = (k, vars) => I.t(k, vars);
        const draft = { urgency: 'High', reason: '', classification: 'Action Required' };
        const URGENCIES = ['High', 'Medium', 'Low'];
        const CLASSIFICATIONS = ['Action Required', 'Information', 'Escalation'];
        const root = el('div', { class: 'pf-flagdoc' });
        const docTitle = doc.title || doc.Title || doc.__id || doc.__ref || 'Document';
        const ref = doc.__ref || doc.__id || '';

        root.append(
          el('p', { style: 'color:var(--color-text-muted);font-size:var(--size-body-sm);margin-bottom:var(--space-3)',
            text: T('opshub.flagBlurb') }),
          el('dl', { class: 'pf-preview', style: 'margin-bottom:var(--space-4)' }, [
            el('div', { class: 'row' }, [el('span', { class: 'k', text: 'Document' }), el('span', { class: 'v', text: docTitle.slice(0, 80) })]),
            el('div', { class: 'row' }, [el('span', { class: 'k', text: 'Reference' }), el('span', { class: 'v', text: ref || '—' })])
          ])
        );
        // Urgency chips
        const urgWrap = el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', text: T('opshub.flagUrgency') }),
          el('div', { class: 'pf-chipgroup', role: 'radiogroup' },
            URGENCIES.map((u) => {
              const b = el('button', { type: 'button', class: 'pf-chip' + (u === draft.urgency ? ' pf-chip--selected' : ''),
                'data-val': u, text: u });
              b.addEventListener('click', () => {
                urgWrap.querySelectorAll('.pf-chip').forEach((c) => c.classList.remove('pf-chip--selected'));
                b.classList.add('pf-chip--selected'); draft.urgency = u;
              });
              return b;
            }))
        ]);
        const classWrap = el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', text: T('opshub.flagClassification') }),
          el('div', { class: 'pf-chipgroup', role: 'radiogroup' },
            CLASSIFICATIONS.map((c) => {
              const b = el('button', { type: 'button', class: 'pf-chip' + (c === draft.classification ? ' pf-chip--selected' : ''),
                'data-val': c, text: c });
              b.addEventListener('click', () => {
                classWrap.querySelectorAll('.pf-chip').forEach((x) => x.classList.remove('pf-chip--selected'));
                b.classList.add('pf-chip--selected'); draft.classification = c;
              });
              return b;
            }))
        ]);
        // Reason
        const reason = el('textarea', { class: 'pf-input', rows: '4', placeholder: T('opshub.flagReasonHint') });
        reason.addEventListener('input', () => { draft.reason = reason.value; });
        const reasonWrap = el('div', { class: 'pf-field pf-field--required' }, [
          el('label', { class: 'pf-label', text: T('opshub.flagReason') }, [el('abbr', { class: 'pf-label__req', text: ' *' })]),
          reason
        ]);
        root.append(urgWrap, classWrap, reasonWrap);

        const id = ++seq;
        let submitting = false;
        const close = (result) => { Bus.emit('platform:ui:modal-close', { id }); resolve(result); };
        Bus.emit('platform:ui:modal', { id, title: T('opshub.flagTitle'), bodyEl: root, actions: [
          { labelKey: 'common.actions.cancel', variant: 'ghost' },
          { labelKey: 'opshub.flagSubmit', variant: 'danger', close: false, event: '__fl_submit_' + id }
        ] });
        Bus.on('__fl_submit_' + id, async () => {
          if (submitting) return;
          if (!draft.reason || draft.reason.trim().length < 3) {
            globalThis.Platform.UI.toast({ messageKey: 'opshub.flagReasonRequired', variant: 'danger' });
            return;
          }
          submitting = true;
          const flag = svc.BaseService.endpoint('SUBSIDIARY_ACTIONS', { expectedKeys: ['ok'] });
          const res = await flag({ action: 'flagDocument', RefIDD: ref, documentId: doc.__id || ref,
            dgAttention: true, urgency: draft.urgency, classification: draft.classification, reason: draft.reason });
          if (res.ok) {
            const P = globalThis.Platform;
            P.Entities.upsert('document', { ...doc, status: 'Action Required', dgFlagged: true, dgFlagReason: draft.reason });
            P.Entities.upsert('task', { referenceId: ref, title: T('opshub.dgReview', { t: docTitle }),
              priority: draft.urgency === 'High' ? 'P1 (High)' : draft.urgency === 'Medium' ? 'P2 (Medium)' : 'P3 (Normal)',
              status: 'Created', ts: new Date().toISOString() });
            P.UI.actionCompleted('opshub.flagged', { module: 'ops-hub', target: ref });
            close({ ok: true, draft });
          } else { submitting = false; }
        });
      });
    });
  },

  /** Open an Email-to-Task workflow modal — same rich-picker grammar as single-item-ops but
   *  with the source being an email object (subject/body/sender pre-filled). Fires
   *  EMAIL_RELATED_TASK on submit with the canonical payload. */
  openEmailToTask(email) {
    return new Promise((resolve) => {
      Promise.all([
        import('../shared/utils/dom.js'),
        import('../shared/utils/lookups.js'),
        import('./base-service.js'),
        import('../shared/components/pf-rich-picker.js')
      ]).then(([{ el }, { Lookups }, svc]) => {
        const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
        const T = (k, vars) => I.t(k, vars);
        const PRIORITIES = ['P1 (High)', 'P2 (Medium)', 'P3 (Normal)', 'P4 (Low)'];
        const ACTIONS = ['', 'Review', 'Approval', 'Information'];
        const draft = {
          category: '', categoryCode: '', subCategory: '', subCategoryCode: '', categoryRaw: null,
          assignedTo: '', assignedToTitle: '', primaryDSU: '',
          supportAssignedTo: '', supportDSU: '',
          copyTo: [], priority: 'P3 (Normal)', actionRequired: '',
          dueDate: '', notes: ''
        };
        const mkPicker = ({ placeholder, placeholderIcon, mode = 'single', tabs, items, itemsByTab }) => {
          const p = document.createElement('pf-rich-picker');
          p.placeholder = placeholder; p.placeholderIcon = placeholderIcon; p.mode = mode;
          if (tabs) { p.tabs = tabs; p.itemsByTab = itemsByTab || {}; } else { p.items = items || []; }
          return p;
        };
        const deptItems = () => Lookups.departments().map((d) => ({
          value: d.raw && d.raw.DSU_KEY || d.value, label: d.raw && d.raw.Title || d.label,
          sub: d.raw && d.raw.DSU_HeadTitle || '', raw: d.raw }));
        const userItems = () => Lookups.users().slice(0, 800).map((u) => ({
          value: u.value, label: u.raw && u.raw.name || u.label,
          sub: u.raw && (u.raw.jobTitle || u.raw.department) || '', raw: u.raw }));
        const cats = Lookups.categories();
        const catPicker = mkPicker({ placeholder: 'Choose a Category', placeholderIcon: '📂',
          items: cats.map((c) => ({ value: c.value, label: c.raw.Category || c.label,
            sub: c.raw.Subcategory ? `Subcategory: ${c.raw.Subcategory}` : '', raw: c.raw })) });
        const assigneePicker = mkPicker({ placeholder: 'Select Assignee', placeholderIcon: '👤',
          tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
          itemsByTab: { dept: deptItems(), user: userItems() } });
        const coassPicker = mkPicker({ placeholder: 'Select Co-Assignee', placeholderIcon: '👥',
          tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
          itemsByTab: { dept: deptItems(), user: userItems() } });
        const ccPicker = mkPicker({ placeholder: 'Choose CC recipients', placeholderIcon: '📋', mode: 'multi',
          tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
          itemsByTab: { dept: deptItems(), user: userItems() } });

        catPicker.addEventListener('pf-picker:change', (e) => {
          const raw = e.detail.raw || {};
          draft.category = raw.Category || ''; draft.categoryCode = raw['Category Code'] || '';
          draft.subCategory = raw.Subcategory || ''; draft.subCategoryCode = raw['SubCategory Code'] || '';
          draft.categoryRaw = raw;
          // Cascade: default assignee from category's Default Primary Responsible (DSU_KEY → dept head)
          const dsuKey = raw['Default Primary Responsible'];
          if (dsuKey && !draft.assignedTo) {
            const dept = Lookups.departments().find((d) => d.raw && d.raw.DSU_KEY === dsuKey);
            if (dept) {
              draft.assignedTo = dept.raw.DSU_HeadEmail || dept.raw.DSU_HeadPersonalEmail || '';
              draft.assignedToTitle = dept.raw.DSU_HeadTitle || dept.raw.Title || '';
              draft.primaryDSU = dept.raw.DSU_KEY;
              assigneePicker.value = draft.assignedTo;
              assigneePicker.selectedLabel = `👤 ${dept.raw.Title} — ${dept.raw.DSU_HeadTitle || ''}`;
              globalThis.Platform.UI.toast({ messageKey: 'module.single-item-ops.cascadeApplied',
                vars: { dept: dept.raw.Title }, variant: 'info', timeout: 3000 });
            }
          }
        });
        assigneePicker.addEventListener('pf-picker:change', (e) => {
          const raw = e.detail.raw || {};
          if (raw.DSU_KEY) {
            draft.assignedTo = raw.DSU_HeadEmail || raw.DSU_HeadPersonalEmail || '';
            draft.assignedToTitle = raw.DSU_HeadTitle || raw.Title || '';
            draft.primaryDSU = raw.DSU_KEY;
          } else if (raw.email) {
            draft.assignedTo = raw.email; draft.assignedToTitle = raw.name || '';
            draft.primaryDSU = raw.department || draft.primaryDSU;
          }
        });
        coassPicker.addEventListener('pf-picker:change', (e) => {
          const raw = e.detail.raw || {};
          if (raw.DSU_KEY) { draft.supportAssignedTo = raw.DSU_HeadEmail || raw.DSU_HeadPersonalEmail || ''; draft.supportDSU = raw.DSU_KEY; }
          else if (raw.email) draft.supportAssignedTo = raw.email;
        });
        ccPicker.addEventListener('pf-picker:change', (e) => { draft.copyTo = Array.isArray(e.detail.value) ? e.detail.value : []; });

        // Chip groups
        const mkChips = (items, init, onChange) => {
          const host = el('div', { class: 'pf-chipgroup', role: 'radiogroup' });
          items.forEach((v) => {
            const b = el('button', { type: 'button', class: 'pf-chip' + (v === init ? ' pf-chip--selected' : ''),
              'data-val': v, text: v || 'Not set' });
            b.addEventListener('click', () => {
              host.querySelectorAll('.pf-chip').forEach((c) => c.classList.remove('pf-chip--selected'));
              b.classList.add('pf-chip--selected'); onChange(v);
            });
            host.append(b);
          });
          return host;
        };
        const priorityChips = mkChips(PRIORITIES, draft.priority, (v) => { draft.priority = v; });
        const actionChips = mkChips(ACTIONS, draft.actionRequired, (v) => { draft.actionRequired = v; });

        const due = el('input', { class: 'pf-input', type: 'date' });
        due.addEventListener('change', () => { draft.dueDate = due.value; });
        const notes = el('textarea', { class: 'pf-input', rows: '3', placeholder: T('module.single-item-ops.commentsHint') });
        notes.addEventListener('input', () => { draft.notes = notes.value; });

        const field = (label, ctrl, required) => el('div', { class: 'pf-field' + (required ? ' pf-field--required' : '') }, [
          el('label', { class: 'pf-label', text: label },
            required ? [el('abbr', { class: 'pf-label__req', text: ' *' })] : []),
          ctrl
        ]);

        const root = el('div', { class: 'pf-etask' });
        root.append(
          el('div', { class: 'pf-preview', style: 'margin-bottom:var(--space-4)' }, [
            el('div', { class: 'row' }, [el('span', { class: 'k', text: 'From' }), el('span', { class: 'v', text: (email.sender || email.from || '—') })]),
            el('div', { class: 'row' }, [el('span', { class: 'k', text: 'Subject' }), el('span', { class: 'v', text: (email.subject || '—').slice(0, 80) })])
          ]),
          field('Category', catPicker, true),
          field('Assignee', assigneePicker, true),
          field('Co-Assignee (optional)', coassPicker),
          field('CC Recipients (optional)', ccPicker),
          field('Priority', priorityChips, true),
          field('Action Required', actionChips),
          field(T('field.taskDue.label'), due),
          field(T('module.single-item-ops.comments'), notes)
        );

        const id = ++seq;
        let submitting = false;
        const close = (result) => { Bus.emit('platform:ui:modal-close', { id }); resolve(result); };
        Bus.emit('platform:ui:modal', { id, title: T('email.taskTitle'), bodyEl: root, actions: [
          { labelKey: 'common.actions.cancel', variant: 'ghost' },
          { labelKey: 'email.taskSubmit', variant: 'primary', close: false, event: '__et_submit_' + id }
        ] });
        Bus.on('__et_submit_' + id, async () => {
          if (submitting) return;
          if (!draft.category || !draft.assignedTo) {
            globalThis.Platform.UI.toast({ messageKey: 'form.fixErrors', variant: 'danger' });
            return;
          }
          submitting = true;
          const P = globalThis.Platform;
          const today = new Date().toISOString().split('T')[0];
          const userEmail = (P.Persona?.email && P.Persona.email()) || 'web-ops@nitda.gov.ng';
          const fire = svc.BaseService.endpoint('EMAIL_RELATED_TASK', { expectedKeys: ['ok'] });
          const payload = {
            action: 'emailtotaskassignment', operation: 'create', mode: 'email-to-task',
            source: 'OBSIDIAN_v4', userEmail, method: 'POST', device: { id: 'obsidian-platform' },
            AssignmentType: 'newassignment',
            NewActivityTask: {
              StartDate: today, ActivityID: email.__id || email.id || '',
              Title: email.subject || 'Email task', Status: 'New',
              Category: draft.category, CategoryCode: draft.categoryCode,
              SubCategory: draft.subCategory, SubCategoryCode: draft.subCategoryCode,
              PrimaryDSU: draft.primaryDSU, AssignedTo: draft.assignedTo,
              AssignedToTitle: draft.assignedToTitle, AssignedDSU: draft.primaryDSU,
              SupportAssignedTo: draft.supportAssignedTo, SupportDSU: draft.supportDSU,
              Priority: draft.priority, Comments: draft.notes,
              ActionRequired: draft.actionRequired,
              CreatedBy: userEmail, Categorization: draft.category + (draft.subCategory ? '-' + draft.subCategory : ''),
              TaskDue: draft.dueDate, CopyTo: draft.copyTo.join(';')
            },
            SourceEmail: { id: email.__id || email.id, subject: email.subject || '', sender: email.sender || email.from || '', body: email.body || email.bodyContent || '' },
            payload: { email: { id: email.__id, subject: email.subject }, task: draft, assignment: { type: 'newassignment' } }
          };
          const res = await fire(payload);
          if (res.ok) {
            P.Entities.upsert('email', { ...email, status: 'Routed', actionedAt: new Date().toISOString() });
            P.Entities.upsert('task', { referenceId: email.__ref || '', title: email.subject || 'Email task',
              assignedTo: draft.assignedTo, priority: draft.priority, status: 'Assigned', ts: new Date().toISOString() });
            P.UI.actionCompleted('email.taskCreated', { module: 'response-tracking', target: email.__ref || '' });
            close({ ok: true, draft });
          } else { submitting = false; }
        });
      });
    });
  },

  /** Open a preview of the notification email that will be sent on assignment.
   *  Builds the HTML via core/notification-email.buildNotificationEmail, then renders it in
   *  pf-sandboxed-iframe so the preview matches the eventual email rendering closely while
   *  remaining safely sandboxed (no script execution, no parent-DOM access). */
  previewNotification(data) {
    return Promise.all([
      import('../shared/utils/dom.js'),
      import('./notification-email.js')
    ]).then(([{ el }, ne]) => {
      const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
      const T = (k, vars) => I.t(k, vars);
      const { subject, html } = ne.buildNotificationEmail(data || {});
      const root = el('div', { class: 'pf-notif-preview' }, [
        el('div', { class: 'pf-overline', style: 'margin-bottom:var(--space-2)', text: T('notif.subject') }),
        el('div', { class: 'pf-card', style: 'padding:var(--space-3);margin-bottom:var(--space-3);font-weight:var(--fw-semibold);background:var(--color-surface-sunken)', text: subject })
      ]);
      const iframe = document.createElement('pf-sandboxed-iframe');
      iframe.html = html;
      iframe.setAttribute('max-height', '500');
      root.append(el('div', { class: 'pf-overline', style: 'margin-bottom:var(--space-2)', text: T('notif.preview') }), iframe);
      const id = ++seq;
      Bus.emit('platform:ui:modal', { id, title: T('notif.title'), bodyEl: root, actions: [
        { labelKey: 'common.actions.close', variant: 'ghost' }
      ] });
      return { close: () => Bus.emit('platform:ui:modal-close', { id }) };
    });
  },

  /** Open a Comments modal — full thread view for a Reference with inline composer.
   *  Reads from the shared fabric (Entities.byReference(ref).comment), writes via
   *  DYNAMIC_GLOBAL_ACTIONS (the canonical comment action), upserts locally on success. */
  openComments(reference) {
    return Promise.all([
      import('../shared/utils/dom.js'),
      import('./base-service.js'),
      import('../shared/components/pf-comment-thread.js')
    ]).then(([{ el }, svc]) => {
      const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
      const T = (k, vars) => I.t(k, vars);
      const P = globalThis.Platform;
      const ref = reference || P.Context?.activeReference?.() || '';

      const thread = document.createElement('pf-comment-thread');
      thread.reference = ref;
      const refresh = () => {
        const items = ref ? P.Entities.byReference(ref).comment : P.Entities.all('comment');
        thread.items = items;
      };
      refresh();

      const root = el('div', { class: 'pf-comments-modal' }, [
        el('div', { class: 'pf-preview', style: 'margin-bottom:var(--space-3)' }, [
          el('div', { class: 'row' }, [el('span', { class: 'k', text: T('comments.scopeLabel') }), el('span', { class: 'v', text: ref || T('comments.scopeAllShort') })]),
          el('div', { class: 'row' }, [el('span', { class: 'k', text: T('comments.count') }), el('span', { class: 'v', id: 'cm-count', text: String((thread.items || []).length) })])
        ]),
        thread
      ]);

      const id = ++seq;
      const close = () => { Bus.emit('platform:ui:modal-close', { id }); };
      const addComment = svc.BaseService.endpoint('DYNAMIC_GLOBAL_ACTIONS', { expectedKeys: ['ok', 'data'] });

      // Listen for thread submit events while modal is open
      const submitHandler = async (e) => {
        const detail = e.detail || {};
        if (!detail.text) return;
        const author = (P.Persona?.email && P.Persona.email()) || `${(P.Persona?.current && P.Persona.current()) || 'web-ops'}@nitda.gov.ng`;
        const payload = {
          action: 'addComment', operation: 'create',
          referenceId: ref || detail.reference || null,
          body: detail.text, sentiment: detail.sentiment, priority: detail.priority,
          author, ts: new Date().toISOString()
        };
        const res = await addComment(payload);
        if (res.ok) {
          const newId = (res.data && (res.data.id || res.data.commentId)) || ('local-' + Date.now());
          P.Entities.upsert('comment', {
            id: newId, referenceId: ref, body: detail.text,
            sentiment: detail.sentiment, priority: detail.priority,
            author, ts: payload.ts
          });
          Bus.emit('entity:comment:changed', { ref });
          refresh();
          const c = document.getElementById('cm-count'); if (c) c.textContent = String(thread.items.length);
          P.UI.toast({ messageKey: 'comments.added', variant: 'success' });
        }
      };
      thread.addEventListener('pf-comment:submit', submitHandler);

      // Reply event — same payload shape as submit, but with parentId set
      // (the thread already forwards parentId on its submit event when replyTo is active,
      // so submitHandler covers it). No separate listener needed.

      // Edit own comment
      thread.addEventListener('pf-comment:edit', async (e) => {
        const { id, text } = e.detail || {};
        if (!id || !text) return;
        const res = await addComment({
          action: 'editComment', operation: 'update',
          commentId: id, referenceId: ref || null,
          body: text, editedAt: new Date().toISOString()
        });
        if (res.ok) {
          const existing = P.Entities.all('comment').find((c) => (c.__id === id || c.id === id || c.commentId === id));
          if (existing) P.Entities.upsert('comment', { ...existing, body: text, editedAt: new Date().toISOString() });
          refresh();
          P.UI.toast({ messageKey: 'comments.edited', variant: 'success' });
        }
      });

      // Delete own comment (with confirm)
      thread.addEventListener('pf-comment:delete', async (e) => {
        const { id } = e.detail || {};
        if (!id) return;
        const ok = await P.UI.confirm({
          titleKey: 'comments.delete', summaryKey: 'comments.deleteConfirm',
          confirmKey: 'comments.delete', danger: true,
          details: [{ label: 'Comment', value: String(id) }]
        });
        if (!ok) return;
        const res = await addComment({
          action: 'deleteComment', operation: 'delete',
          commentId: id, referenceId: ref || null
        });
        if (res.ok) {
          // Soft-remove locally: re-pull all comments minus this one
          const all = P.Entities.all('comment').filter((c) => (c.__id || c.id || c.commentId) !== id);
          // Entity store has no .remove; replace by re-indexing (acceptable for tiny comment set)
          // Simplest: mark as deleted and let refresh filter
          const target = P.Entities.all('comment').find((c) => (c.__id || c.id || c.commentId) === id);
          if (target) P.Entities.upsert('comment', { ...target, _deleted: true, body: '(deleted)', deletedAt: new Date().toISOString() });
          Bus.emit('entity:comment:changed', { ref });
          // Re-read the thread items excluding deleted ones
          thread.items = (ref ? P.Entities.byReference(ref).comment : P.Entities.all('comment')).filter((c) => !c._deleted);
          const cEl = document.getElementById('cm-count'); if (cEl) cEl.textContent = String(thread.items.length);
          P.UI.toast({ messageKey: 'comments.deleted', variant: 'success' });
        }
      });

      // Set the currentUser so the thread can show Edit/Delete on own comments
      thread.currentUser = (P.Persona?.email && P.Persona.email()) ||
        ((P.Persona?.current && P.Persona.current()) ? P.Persona.current() + '@nitda.gov.ng' : '');

      Bus.emit('platform:ui:modal', { id, title: T('comments.modalTitle', { ref: ref || T('comments.scopeAllShort') }),
        bodyEl: root, actions: [{ labelKey: 'common.actions.close', variant: 'ghost' }] });
      return { close };
    });
  },

  /** Push a persistent warning into the top banner. Survives data refreshes until dismissed.
   *  @param {{key?:string, text:string, dismissable?:boolean, variant?:'warning'|'critical'}} w */
  pushWarning(w) { Bus.emit('platform:warning:push', w); },
  /** Dismiss a persistent warning by key. */
  dismissWarning(key) { Bus.emit('platform:warning:dismiss', { key }); },

  /** Open a Profile Setup modal — first-launch user setup. Asks for fullName/email/department/
   *  jobTitle and persists via Persona.setProfile(). Returns the saved profile (or null on cancel). */
  openProfileSetup() {
    return new Promise((resolve) => {
      Promise.all([
        import('../shared/utils/dom.js'),
        import('./persona-controller.js'),
        import('../shared/utils/lookups.js')
      ]).then(([{ el }, { Persona }, { Lookups }]) => {
        const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
        const T = (k, vars) => I.t(k, vars);
        const existing = Persona.profile() || {};
        const draft = {
          fullName: existing.fullName || '',
          email:    existing.email || '',
          department: existing.department || '',
          jobTitle: existing.jobTitle || ''
        };

        const field = (id, label, type, value, opts = {}) => {
          const wrap = el('div', { class: 'pf-field' + (opts.required ? ' pf-field--required' : '') });
          wrap.append(el('label', { class: 'pf-label', for: id },
            [document.createTextNode(label),
             opts.required ? el('abbr', { class: 'pf-label__req', text: ' *' }) : null].filter(Boolean)));
          const input = el('input', { id, class: 'pf-input', type, value, placeholder: opts.placeholder || '' });
          wrap.append(input);
          if (opts.help) wrap.append(el('p', { class: 'pf-field__help', text: opts.help }));
          return { wrap, input };
        };

        const nameF = field('prof-fullname', T('profile.fullName'), 'text', draft.fullName, { required: true, help: T('profile.fullNameHelp') });
        const emailF = field('prof-email', T('profile.email'), 'email', draft.email, { required: true, help: T('profile.emailHelp') });
        nameF.input.addEventListener('input', () => { draft.fullName = nameF.input.value.trim(); });
        emailF.input.addEventListener('input', () => { draft.email = emailF.input.value.trim(); });

        // Department dropdown sourced from Lookups (or text input fallback)
        let deptInput;
        const depts = Lookups.departments?.() || [];
        if (depts.length) {
          const sel = el('select', { id: 'prof-dept', class: 'pf-input' },
            [el('option', { value: '', text: '— ' + T('profile.pickDept') + ' —' }),
              ...depts.map((d) => el('option', { value: d.raw?.Title || d.label, text: d.raw?.Title || d.label,
                ...(draft.department === (d.raw?.Title || d.label) ? { selected: 'selected' } : {}) }))]);
          sel.addEventListener('change', () => { draft.department = sel.value; });
          deptInput = sel;
        } else {
          const inp = el('input', { id: 'prof-dept', class: 'pf-input', type: 'text', value: draft.department });
          inp.addEventListener('input', () => { draft.department = inp.value.trim(); });
          deptInput = inp;
        }
        const deptF = el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', for: 'prof-dept', text: T('profile.department') }),
          deptInput,
          el('p', { class: 'pf-field__help', text: T('profile.departmentHelp') })
        ]);

        const titleF = field('prof-title', T('profile.jobTitle'), 'text', draft.jobTitle, { help: T('profile.jobTitleHelp') });
        titleF.input.addEventListener('input', () => { draft.jobTitle = titleF.input.value.trim(); });

        const root = el('div', { class: 'pf-profile-setup' }, [
          el('p', { class: 'pf-muted', style: 'margin-bottom:var(--space-4)', text: T('profile.blurb') }),
          nameF.wrap, emailF.wrap, deptF, titleF.wrap
        ]);

        const id = ++seq;
        const close = (result) => { Bus.emit('platform:ui:modal-close', { id }); resolve(result); };

        Bus.emit('platform:ui:modal', { id, title: T('profile.title'), bodyEl: root, actions: [
          { labelKey: 'common.actions.cancel', variant: 'ghost' },
          { labelKey: 'profile.save', variant: 'primary', close: false, event: '__pr_save_' + id }
        ] });
        Bus.on('__pr_save_' + id, () => {
          if (!draft.fullName) { globalThis.Platform.UI.toast({ messageKey: 'profile.nameRequired', variant: 'danger' }); nameF.input.focus(); return; }
          if (!draft.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email)) {
            globalThis.Platform.UI.toast({ messageKey: 'profile.emailRequired', variant: 'danger' });
            emailF.input.focus(); return;
          }
          Persona.setProfile(draft);
          globalThis.Platform.UI.toast({ messageKey: 'profile.saved', variant: 'success' });
          close(draft);
        });
      });
    });
  },

  /** Open the keyboard-shortcuts cheatsheet modal. Categories: Navigation, Actions, Forms. */
  openShortcuts() {
    return new Promise((resolve) => {
      import('../shared/utils/dom.js').then(({ el }) => {
        const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
        const T = (k, vars) => I.t(k, vars);
        const groups = [
          { titleKey: 'shortcuts.navigation', items: [
            { keys: ['?'], descKey: 'shortcuts.help' },
            { keys: ['Esc'], descKey: 'shortcuts.closeModal' },
            { keys: ['/'], descKey: 'shortcuts.focusSearch' },
            { keys: ['g', 'h'], descKey: 'shortcuts.goHome' },
            { keys: ['g', 'o'], descKey: 'shortcuts.goOpsHub' },
            { keys: ['g', 'l'], descKey: 'shortcuts.goLookup' },
            { keys: ['g', 'r'], descKey: 'shortcuts.goRT' },
            { keys: ['g', 's'], descKey: 'shortcuts.goSettings' },
            { keys: ['g', 'd'], descKey: 'shortcuts.goDiagnostics' }
          ]},
          { titleKey: 'shortcuts.actions', items: [
            { keys: ['r'], descKey: 'shortcuts.refresh' },
            { keys: ['n'], descKey: 'shortcuts.newAssign' }
          ]},
          { titleKey: 'shortcuts.forms', items: [
            { keys: ['Enter'], descKey: 'shortcuts.submit' },
            { keys: ['Esc'], descKey: 'shortcuts.cancel' }
          ]}
        ];
        const root = el('div', { class: 'pf-shortcuts' });
        groups.forEach((g) => {
          const section = el('section', { class: 'pf-shortcuts__group' });
          section.append(el('h3', { class: 'pf-overline', text: T(g.titleKey) }));
          const dl = el('dl', { class: 'pf-shortcuts__list' });
          g.items.forEach((it) => {
            const dt = el('dt', { class: 'pf-shortcuts__keys' });
            it.keys.forEach((k, i) => {
              if (i > 0) dt.append(el('span', { class: 'pf-shortcuts__sep', text: 'then' }));
              dt.append(el('kbd', { class: 'pf-shortcuts__kbd', text: k }));
            });
            section.append(dt, el('dd', { class: 'pf-shortcuts__desc', text: T(it.descKey) }));
          });
          section.append(dl);
          root.append(section);
        });
        const id = ++seq;
        Bus.emit('platform:ui:modal', { id, title: T('shortcuts.title'), bodyEl: root,
          actions: [{ labelKey: 'common.actions.close', variant: 'ghost' }] });
        resolve({ close: () => Bus.emit('platform:ui:modal-close', { id }) });
      });
    });
  },

  closeModal(id) { Bus.emit('platform:ui:modal-close', { id }); }
};

// SW update-available toast — fires when a new version of the shell is cached and ready
Bus.on('platform:sw:update-available', () => {
  try {
    UI.toast({ messageKey: 'sw.updateAvailable', variant: 'info', timeout: 8000,
      action: { labelKey: 'sw.reload', onClick: () => globalThis.location?.reload?.() } });
  } catch (_) {}
});

export default UI;
__OBSIDIAN_DEPLOY_EOF__

write 'modules/assistant/index.js' <<'__OBSIDIAN_DEPLOY_EOF__'
/** OBSIDIAN v4.0 — module 'assistant' (Operations · ACTION · audience:all).
 *  Live AI assistant over AI_CHAT (shared/utils/ai.js). Conversation state is held per session;
 *  each turn sends the full history to the flow and renders the reply. No placeholder content. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';
import { AI } from '../../shared/utils/ai.js';

class AssistantModule extends BaseModule {
  static id = 'assistant'; static label = 'module.assistant.title'; static icon = 'message-circle';
  static nav = { group: 'Operations', order: 6 }; static audience = 'all'; static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    this._messages = this._messages || [];
    this._log = root.querySelector('[data-region="log"]');
    const form = root.querySelector('[data-region="composer"]');
    if (!form) return;
    clear(form);
    this._input = el('textarea', { class: 'pf-asst__input', rows: '2', 'aria-label': this.t('assistant.inputAria'),
      placeholder: this.t('assistant.placeholder') });
    const send = el('button', { class: 'pf-btn pf-btn--primary', type: 'button', text: this.t('assistant.send') });
    this.on(send, 'click', () => this._send());
    this.on(this._input, 'keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); this._send(); } });
    form.append(this._input, send);
    this._paint();
  }

  _paint() {
    if (!this._log) return;
    clear(this._log);
    if (!this._messages.length) {
      this._log.append(el('p', { class: 'pf-muted pf-asst__empty', text: this.t('assistant.empty') }));
      return;
    }
    this._messages.forEach((m) => {
      this._log.append(el('div', { class: 'pf-asst__msg pf-asst__msg--' + (m.role === 'user' ? 'user' : 'ai') }, [
        el('span', { class: 'pf-asst__role', text: this.t(m.role === 'user' ? 'assistant.you' : 'assistant.ai') }),
        el('div', { class: 'pf-asst__body', text: m.content })
      ]));
    });
    this._log.scrollTop = this._log.scrollHeight;
  }

  async _send() {
    const text = (this._input.value || '').trim();
    if (!text) return;
    this._messages.push({ role: 'user', content: text });
    this._input.value = ''; this._paint();
    const pending = el('div', { class: 'pf-asst__msg pf-asst__msg--ai pf-asst__pending', text: this.t('assistant.thinking') });
    this._log.append(pending); this._log.scrollTop = this._log.scrollHeight;
    // K-8b — stamp the active directorate scope + identity onto every AI payload so the flow has the
    // telemetry to enforce role-based compliance. Scope is read from the sealed Context getter; the
    // assistant never reaches the fabric directly.
    const P = globalThis.Platform || {};
    const scope = {
      directorate: (P.Context && P.Context.directorate && P.Context.directorate()) || 'all',
      persona: (P.Persona && P.Persona.current && P.Persona.current()) || null,
      userEmail: (P.Persona && P.Persona.email && P.Persona.email()) || null
    };
    const res = await this.call(() => AI.chat(this._messages, { scope, ...scope }));
    pending.remove();
    const reply = res.ok ? (AI.summaryOf(res) || this.t('assistant.noReply')) : this.t('assistant.failed');
    this._messages.push({ role: 'assistant', content: reply });
    this._paint();
  }
}
Modules.register(AssistantModule);
export default AssistantModule;
__OBSIDIAN_DEPLOY_EOF__

write 'shared/components/pf-otp-modal.js' <<'__OBSIDIAN_DEPLOY_EOF__'
/** OBSIDIAN v4.0 — <pf-otp-modal> · stateless PA-handshake OTP gate (register B-1 / D-7).
 *
 *  This component holds NO OTP logic of its own. It is a thin UI consumer of the two-step Power
 *  Automate handshake:
 *    1. request-otp  → OTP_GENERATE  : server emails the code; UI caches { otpId, expiresAt }.
 *    2. verify-otp   → OTP_VERIFY     : UI submits the user-typed code; PA validates server-side.
 *  The plaintext code is NEVER generated or compared client-side.
 *
 *  Usage:  const r = await PfOtpModal.require({ purpose:'BULK_ASSIGNMENT', userEmail, context });
 *    resolves → { ok:true,  verificationToken, otpId, code }                       (verified)
 *             → { ok:false, kind:'ASSIGNMENT_FAILED' }   on exhausted attempts (B-1 rollback)
 *             → { ok:false, kind:'CANCELLED' }           on user cancel / Escape
 *             → { ok:false, kind:'GENERATE_FAILED' }     if the code could not be sent
 *
 *  On OTP_INVALID the attempt matrix decrements; at zero it fires an ASSIGNMENT-FAILED rollback
 *  (audit + bus event) so the caller can revert the optimistic `assigning` state. */
import { PfBaseElement } from './_base.js';
import { BaseService } from '../../core/base-service.js';

const requestOtp = BaseService.endpoint('OTP_GENERATE', { expectedKeys: ['ok', 'data'] });
const verifyOtp  = BaseService.endpoint('OTP_VERIFY', { expectedKeys: ['ok', 'data'] });

const DEFAULT_ATTEMPTS = 5;

class PfOtpModal extends PfBaseElement {
  /** Mount, run the handshake, resolve a structured result (see file header). */
  static require(opts = {}) {
    return new Promise((resolve) => {
      const el = document.createElement('pf-otp-modal');
      el._opts = opts || {};
      el._resolve = resolve;
      document.body.appendChild(el);
    });
  }

  onConnect() {
    this._settled = false;
    this._otpId = null;
    this._expiresAt = 0;
    this._attemptsLeft = Number(this._opts.maxAttempts) || DEFAULT_ATTEMPTS;
    this._countdownTimer = null;

    const reason = this._opts.reason || this.t('otp.defaultReason');
    this.render(`<style>
      :host{ position:fixed; inset:0; z-index:var(--z-modal, 1000); display:grid; place-items:center;
        background:color-mix(in srgb, var(--color-text) 45%, transparent); }
      .card{ width:min(28rem,92vw); background:var(--color-surface-raised); border:1px solid var(--color-border);
        border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); padding:var(--space-6); display:grid; gap:var(--space-4); }
      h2{ font:var(--font-display); font-size:var(--size-h3); margin:0; color:var(--color-text); }
      p{ margin:0; color:var(--color-text-muted); font-size:var(--size-body-sm); }
      input{ font:inherit; font-size:var(--size-h3); letter-spacing:.4em; text-align:center; padding:var(--space-3);
        border:1px solid var(--color-border-strong); border-radius:var(--radius-md);
        background:var(--color-surface); color:var(--color-text); }
      input:disabled{ opacity:.5; }
      .row{ display:flex; gap:var(--space-3); justify-content:flex-end; align-items:center; }
      .row .spacer{ margin-right:auto; }
      button{ padding:var(--space-2) var(--space-4); border-radius:var(--radius-md); font-weight:var(--fw-semibold); font-size:var(--size-body-sm); }
      button:disabled{ opacity:.5; cursor:not-allowed; }
      .primary{ background:var(--color-brand-primary); color:var(--color-text-inverse); }
      .ghost{ background:transparent; color:var(--color-text-muted); border:1px solid var(--color-border); }
      .link{ background:none; color:var(--color-brand-primary); padding:var(--space-1) var(--space-2); }
      .meta{ font-size:var(--size-caption); color:var(--color-text-muted); min-height:1.2em; }
      .err{ font-size:var(--size-caption); color:var(--color-danger); min-height:1.2em; }
    </style>
    <div class="card" role="dialog" aria-modal="true" aria-label="${this.t('otp.title')}">
      <h2>${this.t('otp.title')}</h2>
      <p>${reason}</p>
      <p id="dest" class="meta" role="status" aria-live="polite"></p>
      <input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8"
             placeholder="••••••" aria-label="${this.t('otp.codeLabel')}" disabled>
      <p id="countdown" class="meta" role="status" aria-live="polite"></p>
      <div id="msg" class="err" role="alert" aria-live="assertive"></div>
      <div class="row">
        <button class="link spacer" id="resend" hidden>${this.t('otp.resend')}</button>
        <button class="ghost" id="cancel">${this.t('common.actions.cancel')}</button>
        <button class="primary" id="verify" disabled>${this.t('otp.verify')}</button>
      </div>
    </div>`);

    this.on(this.$('#cancel'), 'click', () => this._finish({ ok: false, kind: 'CANCELLED' }));
    this.on(this.$('#verify'), 'click', () => this._verify());
    this.on(this.$('#resend'), 'click', () => this._request());
    this.on(this.$('#code'), 'keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this._verify(); } });
    this.on(this, 'keydown', (e) => { if (e.key === 'Escape') this._finish({ ok: false, kind: 'CANCELLED' }); });

    this._request();
  }

  onDisconnect() { this._stopCountdown(); }

  /** Step 1 — request a fresh code (request-otp → OTP_GENERATE). */
  async _request() {
    this._stopCountdown();
    const msg = this.$('#msg'); msg.textContent = '';
    this.$('#resend').hidden = true;
    this.$('#dest').textContent = this.t('otp.sendingCode');
    this.$('#code').disabled = true; this.$('#verify').disabled = true;

    const res = await requestOtp({
      purpose: this._opts.purpose || 'VERIFICATION',
      channel: 'email',
      userEmail: this._opts.userEmail || this._personaEmail(),
      context: this._opts.context || {}
    });

    if (!res.ok) {
      this._otpId = null;
      this.$('#dest').textContent = '';
      msg.textContent = this._detail(res) || this.t('otp.genFailed');
      this.$('#resend').hidden = false;
      return;
    }
    const d = res.data || {};
    this._otpId = d.otpId || d.id || null;
    this._attemptsLeft = Number(this._opts.maxAttempts) || DEFAULT_ATTEMPTS;
    const ttl = Number(d.ttlSeconds) || 0;
    this._expiresAt = d.expiresAt ? Date.parse(d.expiresAt) : (ttl ? Date.now() + ttl * 1000 : 0);
    this.$('#dest').textContent = this.t('otp.sent', { to: d.sentTo || d.channel || 'email', ttl: ttl || 0 });
    const input = this.$('#code');
    input.disabled = false; input.value = ''; input.maxLength = Number(d.codeLength) || 8;
    this.$('#verify').disabled = false;
    input.focus();
    this._startCountdown();
  }

  /** Step 2 — verify the user-typed code (verify-otp → OTP_VERIFY). */
  async _verify() {
    const input = this.$('#code');
    const code = (input.value || '').trim();
    const msg = this.$('#msg'); msg.textContent = '';
    if (!this._otpId) { msg.textContent = this.t('otp.expired'); this.$('#resend').hidden = false; return; }
    if (!code) { msg.textContent = this.t('otp.needCode'); return; }
    if (this._expiresAt && Date.now() > this._expiresAt) { this._onExpired(); return; }

    this.$('#verify').disabled = true;
    this.$('#countdown').textContent = this.t('otp.verifying');
    const res = await verifyOtp({ otpId: this._otpId, code, userEmail: this._opts.userEmail || this._personaEmail() });
    this.$('#verify').disabled = false;

    const verified = !!(res.ok && res.data && (res.data.verified === true || res.data.verificationToken));
    if (verified) {
      this._finish({ ok: true, otpId: this._otpId, code,
        verificationToken: (res.data && res.data.verificationToken) || null });
      return;
    }

    const kind = res.errorKind || '';
    if (kind === 'OTP_EXPIRED') { this._onExpired(); return; }

    // OTP_INVALID (or any other non-verified result) — decrement the attempt matrix.
    const serverLeft = res.data && Number.isFinite(res.data.remainingAttempts) ? Number(res.data.remainingAttempts) : null;
    this._attemptsLeft = serverLeft != null ? serverLeft : (this._attemptsLeft - 1);
    if (this._attemptsLeft <= 0) { this._rollback(); return; }
    msg.textContent = this.t('otp.invalid') + ' ' + this.t('otp.attemptsLeft', { n: this._attemptsLeft });
    input.focus(); input.select();
  }

  _onExpired() {
    this._stopCountdown();
    this._otpId = null;
    this.$('#code').disabled = true; this.$('#verify').disabled = true;
    this.$('#countdown').textContent = '';
    this.$('#msg').textContent = this.t('otp.expired');
    this.$('#resend').hidden = false;
  }

  /** B-1 rollback — attempts exhausted: fire ASSIGNMENT-FAILED so the caller reverts optimistic state. */
  _rollback() {
    const Bus = globalThis.Platform && globalThis.Platform.Bus;
    const payload = { reason: 'otp-attempts-exhausted', purpose: this._opts.purpose || null,
      context: this._opts.context || {}, ts: new Date().toISOString() };
    if (Bus) { Bus.emit('assignment:failed', payload); Bus.emit('audit:assignment-failed', payload); }
    this.$('#msg').textContent = this.t('otp.rollback');
    this._finish({ ok: false, kind: 'ASSIGNMENT_FAILED' });
  }

  _startCountdown() {
    if (!this._expiresAt) { this.$('#countdown').textContent = ''; return; }
    const tick = () => {
      const s = Math.max(0, Math.round((this._expiresAt - Date.now()) / 1000));
      this.$('#countdown').textContent = this.t('otp.expiresIn', { s });
      if (s <= 0) this._onExpired();
    };
    tick();
    this._countdownTimer = setInterval(tick, 1000);
  }
  _stopCountdown() { if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; } }

  _personaEmail() {
    const P = globalThis.Platform && globalThis.Platform.Persona;
    return (P && P.email && P.email()) || null;
  }
  _detail(res) {
    return (res && Array.isArray(res.errors) && res.errors[0] && res.errors[0].message) || '';
  }

  _finish(result) {
    if (this._settled) return;
    this._settled = true;
    this._stopCountdown();
    const resolve = this._resolve; this._resolve = null;
    this.remove();
    if (resolve) resolve(result);
  }
}
customElements.define('pf-otp-modal', PfOtpModal);
export { PfOtpModal };
export default PfOtpModal;
__OBSIDIAN_DEPLOY_EOF__

write 'shared/components/pf-toast.js' <<'__OBSIDIAN_DEPLOY_EOF__'
/** OBSIDIAN v4.0 — <pf-toast> · live-region toast stack driven by platform:ui:toast.
 *  Supports an optional clickable action (e.g. "View") that navigates to a deep-link hash route.
 *  DOM-built (not innerHTML for user strings) — XSS-safe for action labels and deep-links. */
import { PfBaseElement } from './_base.js';
class PfToast extends PfBaseElement {
  onConnect() {
    this.render(`<style>
      :host{ position:fixed; right:var(--space-5); bottom:var(--space-5); z-index:var(--z-toast);
        display:flex; flex-direction:column; gap:var(--space-2); max-width:min(92vw,420px); pointer-events:none; }
      .t{ pointer-events:auto; }
      .t{ display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3) var(--space-4);
        border-radius:var(--radius-md); background:var(--color-surface-raised);
        box-shadow:var(--shadow-lg); border-left:4px solid var(--color-info);
        animation:slide var(--duration-base) var(--easing-standard); }
      .t[data-variant="success"]{ border-left-color:var(--color-success); }
      .t[data-variant="danger"]{ border-left-color:var(--color-danger); }
      .t[data-variant="warning"]{ border-left-color:var(--color-warning); }
      .t__text{ flex:1; font-size:var(--size-body-sm); color:var(--color-text); min-width:0; word-break:break-word; }
      .t__action{ background:transparent; border:1px solid transparent; color:var(--color-brand-primary);
        font:inherit; font-size:var(--size-body-sm); font-weight:var(--fw-semibold); cursor:pointer;
        padding:var(--space-1) var(--space-3); border-radius:var(--radius-sm); white-space:nowrap;
        transition:all var(--duration-fast) var(--easing-standard); }
      .t__action:hover{ background:color-mix(in srgb, var(--color-brand-primary) 10%, transparent); }
      .t__action:focus-visible{ outline:2px solid var(--color-brand-primary); outline-offset:2px; }
      .t__dismiss{ background:none; border:none; cursor:pointer; color:var(--color-text-muted);
        font-size:1.25rem; line-height:1; padding:0 var(--space-2); }
      .t__dismiss:hover{ color:var(--color-text); }
      .t__dismiss:focus-visible{ outline:2px solid var(--color-brand-primary); outline-offset:2px; border-radius:var(--radius-sm); }
      @keyframes slide{ from{ transform:translateY(8px); opacity:0; } to{ transform:none; opacity:1; } }
      @media (prefers-reduced-motion:reduce){ .t{ animation:none; } }
    </style>
    <div id="stack" role="status" aria-live="polite" aria-atomic="false"></div>
    <div id="stack-assertive" role="alert" aria-live="assertive" aria-atomic="true"></div>`);
    this.bus('platform:ui:toast', (d) => this.add(d));
    this.bus('platform:ui:toast-dismiss', (d) => this.remove(d.id));
  }
  add({ id, text, variant = 'info', timeout = 5000, action = null }) {
    // A-23 — errors land in the assertive live region so screen-reader users are interrupted; the rest
    // stay polite. Danger/critical ⇒ assertive; everything else ⇒ polite.
    const assertive = variant === 'danger' || variant === 'critical';
    const stack = this.$(assertive ? '#stack-assertive' : '#stack'); if (!stack) return;
    // Cap stack: auto-dismiss the oldest when more than 3 are visible
    const visible = stack.querySelectorAll('.t');
    if (visible.length >= 3) this.remove(Number(visible[0].dataset.id));
    const root = document.createElement('div');
    root.className = 't'; root.dataset.variant = variant; root.dataset.id = id;
    const span = document.createElement('span'); span.className = 't__text'; span.textContent = text;
    root.appendChild(span);
    if (action && action.label && action.deepLink) {
      const a = document.createElement('button');
      a.type = 'button'; a.className = 't__action'; a.textContent = action.label;
      a.addEventListener('click', () => {
        const dl = action.deepLink;
        if (dl.startsWith('#')) window.location.hash = dl.slice(1);
        else if (dl.startsWith('/')) window.location.hash = dl;
        else window.location.hash = '/' + dl;
        this.remove(id);
      });
      root.appendChild(a);
    }
    const d = document.createElement('button');
    d.type = 'button'; d.className = 't__dismiss';
    d.setAttribute('aria-label', this.t('common.actions.dismiss'));
    d.innerHTML = '&times;';
    d.addEventListener('click', () => this.remove(id));
    root.appendChild(d);
    stack.appendChild(root);
    // Pause-on-hover: clear pending dismiss; re-arm on mouse-leave / focus-out
    let timer = null;
    const arm = () => { if (timeout) timer = setTimeout(() => this.remove(id), timeout); };
    const disarm = () => { if (timer) { clearTimeout(timer); timer = null; } };
    if (timeout) {
      arm();
      root.addEventListener('mouseenter', disarm); root.addEventListener('mouseleave', arm);
      root.addEventListener('focusin', disarm);    root.addEventListener('focusout', arm);
    }
  }
  remove(id) { const el = this.$(`.t[data-id="${id}"]`); if (el) el.remove(); }
}
customElements.define('pf-toast', PfToast);
export default PfToast;
__OBSIDIAN_DEPLOY_EOF__

write 'tools/real-response-smoke.mjs' <<'__OBSIDIAN_DEPLOY_EOF__'
/** OBSIDIAN v4.0 — tools/real-response-smoke.mjs
 *  Ingests a local FETCH_ALL response into the SEALED entity-store and reports exactly how many
 *  records were accepted into the fabric vs. quarantined (Q-6: missing PrimaryDSU/AssignedDSU, or
 *  No-Orphan: missing reference). Zero dependencies; Node 18+ (uses structuredClone).
 *
 *  Usage (from platform-root/):
 *    echo '{"type":"module"}' > package.json
 *    node tools/real-response-smoke.mjs /tmp/real-response.json
 *    rm -f package.json
 *
 *  Exit code 0 = ingest produced records; 2 = file unreadable; 3 = zero records ingested. */

import { readFileSync } from 'node:fs';

// Minimal Platform shim so the sealed readers + quarantine() resolve. Admin persona => quarantine visible.
globalThis.Platform = {
  Persona: { current: () => 'admin', email: () => 'admin@nitda.gov.ng' },
  Context: { directorate: () => 'all' },
  Log: { info() {}, warn() {}, error() {} },
  State: { set() {}, get() {} }
};

const PATH = process.argv[2] || '/tmp/real-response.json';
let raw;
try {
  raw = readFileSync(PATH, 'utf8');
} catch (e) {
  console.error('[smoke] cannot read ' + PATH + ' — ' + (e && e.message));
  process.exit(2);
}

// Stub fetch so Entities.bootstrap() ingests the local file as if it were the live FETCH_ALL body.
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  headers: { forEach: (cb) => cb('application/json', 'content-type') },
  text: async () => raw
});

const { Entities } = await import('../core/entity-store.js');

await Entities.bootstrap(true);

const counts = Entities.counts();
const TYPES = ['reference', 'document', 'task', 'email', 'approval', 'comment', 'activity'];
const acceptedRows = TYPES.map((t) => ({ type: t, accepted: counts[t] || 0 }));
const acceptedTotal = acceptedRows.reduce((n, r) => n + r.accepted, 0);

const quarantine = Entities.quarantine(); // admin-only
const byReason = {};
for (const q of quarantine) {
  const reason = q.__quarantineReason || 'unknown';
  byReason[reason] = (byReason[reason] || 0) + 1;
}
const quarantineRows = Object.keys(byReason).sort().map((r) => ({ reason: r, count: byReason[r] }));
const quarantinedTotal = quarantine.length;

console.log('\n==================== OBSIDIAN INGEST SMOKE ====================');
console.log('source: ' + PATH + '  (' + raw.length + ' bytes)');

console.log('\n--- ACCEPTED into sealed fabric (visible at scope=all) ---');
console.table(acceptedRows);
console.log('accepted total: ' + acceptedTotal);

console.log('\n--- QUARANTINED (kept out of the live fabric) ---');
if (quarantineRows.length) {
  console.table(quarantineRows);
} else {
  console.log('(none)');
}
console.log('quarantined total: ' + quarantinedTotal);
console.log('  reason "directorate-underivable" = record had neither PrimaryDSU nor AssignedDSU (Q-6).');
console.log('  reason "reference-missing"        = record had no derivable Reference id (No-Orphan).');

console.log('\n--- SUMMARY ---');
const grandTotal = acceptedTotal + quarantinedTotal;
const acceptRate = grandTotal ? ((acceptedTotal / grandTotal) * 100).toFixed(1) : '0.0';
console.table([{
  acceptedTotal,
  quarantinedTotal,
  grandTotal,
  acceptRatePct: acceptRate
}]);

// The canonical preserved response is documented as ref 302 | doc 300 | task 100 | email 50 | comment 2.
const EXPECT = { reference: 302, document: 300, task: 100, email: 50, comment: 2 };
const matchesCanonical = Object.keys(EXPECT).every((k) => (counts[k] || 0) === EXPECT[k]);
console.log('matches documented canonical counts (302/300/100/50/2): ' + (matchesCanonical ? 'YES' : 'NO'));
if (!matchesCanonical && quarantinedTotal > 0) {
  console.log('NOTE: records were quarantined — if this payload should be fully accepted, the live');
  console.log('      FETCH_ALL rows are missing PrimaryDSU/AssignedDSU. Report the counts above so the');
  console.log('      Q-6 derivation can be reconciled against the real DGCEO data shape.');
}

if (acceptedTotal === 0) {
  console.error('[smoke] FAIL — zero records ingested.');
  process.exit(3);
}
console.log('\n[smoke] OK — ingest produced ' + acceptedTotal + ' records (' + quarantinedTotal + ' quarantined).');
process.exit(0);
__OBSIDIAN_DEPLOY_EOF__

write 'ui-sandbox.html' <<'__OBSIDIAN_DEPLOY_EOF__'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>OBSIDIAN UI Isolation Sandbox — Toast + Error Router + OTP</title>
<!--
  OBSIDIAN v4.0 — ui-sandbox.html
  Standalone visual harness for the S1 UI surfaces ONLY:
    core/error-router.js · shared/components/pf-toast.js · shared/components/pf-otp-modal.js
  Zero external dependencies. Offline: fetch() is stubbed so the OTP handshake runs without a network.
  Serve platform-root/ over http (Termux: python -m http.server 8080) and open /ui-sandbox.html
  on the Galaxy Tab A9 in landscape. Use it to check touch targets, aria-live assertiveness, and
  one-handed ergonomics BEFORE merging into the main fabric.
-->
<style>
  /* Design tokens (sandbox-local; mirror DGO light theme so the imported components render). */
  :root{
    --font-body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --font-display: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --color-bg: #0f1623;
    --color-surface: #ffffff;
    --color-surface-raised: #ffffff;
    --color-surface-sunken: #f3f5f9;
    --color-surface-inverse: #0b1220;
    --color-text: #16203a;
    --color-text-muted: #5a6781;
    --color-text-inverse: #ffffff;
    --color-border: #d8deea;
    --color-border-strong: #b7c1d4;
    --color-brand-primary: #1f6feb;
    --color-info: #1f6feb;
    --color-success: #1f9d57;
    --color-warning: #c9821a;
    --color-danger: #d23b3b;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --shadow-lg: 0 10px 30px rgba(10,20,40,.18);
    --shadow-xl: 0 18px 48px rgba(10,20,40,.28);
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 28px;
    --size-caption: .78rem;
    --size-body-sm: .92rem;
    --size-h3: 1.3rem;
    --fw-semibold: 600;
    --tracking-overline: .08em;
    --z-toast: 9000;
    --z-modal: 9500;
    --z-drawer: 9400;
    --duration-fast: 120ms;
    --duration-base: 200ms;
    --easing-standard: cubic-bezier(.2,.0,.2,1);
    --focus-ring: 0 0 0 3px rgba(31,111,235,.45);
  }
  *{ box-sizing: border-box; }
  html, body{ margin:0; height:100%; }
  body{
    font-family: var(--font-body);
    color: var(--color-text);
    background: linear-gradient(160deg, #0f1623, #182338);
    -webkit-text-size-adjust: 100%;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
  }
  .wrap{
    max-width: 1280px; margin: 0 auto; min-height: 100%;
    display: flex; flex-direction: column;
    padding: var(--space-4) var(--space-4) 96px;
  }
  header{ color: var(--color-text-inverse); margin-bottom: var(--space-4); }
  header h1{ font-size: 1.15rem; margin: 0 0 var(--space-1); }
  header p{ margin: 0; color: #aebbd6; font-size: var(--size-body-sm); }
  .vp{ font-size: var(--size-caption); color:#7d8db0; margin-top: var(--space-2); }
  .vp b{ color:#cdd8ef; }

  .grid{
    display: grid; gap: var(--space-3);
    grid-template-columns: repeat(2, minmax(0,1fr));
  }
  @media (min-width: 760px){ .grid{ grid-template-columns: repeat(3, minmax(0,1fr)); } }
  @media (min-width: 1100px) and (orientation: landscape){ .grid{ grid-template-columns: repeat(4, minmax(0,1fr)); } }

  .card{
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    display: flex; flex-direction: column; gap: var(--space-2);
  }
  .card h2{ font-size: var(--size-body-sm); margin: 0; color: var(--color-text-muted);
    text-transform: uppercase; letter-spacing: var(--tracking-overline); font-weight: var(--fw-semibold); }

  button.touch{
    font: inherit; font-weight: var(--fw-semibold);
    min-height: 56px; padding: 0 var(--space-4);
    border-radius: var(--radius-md); border: 1px solid transparent;
    cursor: pointer; width: 100%;
    display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  }
  button.touch:focus-visible{ outline: none; box-shadow: var(--focus-ring); }
  .btn-primary{ background: var(--color-brand-primary); color: var(--color-text-inverse); }
  .btn-danger{ background: var(--color-danger); color: var(--color-text-inverse); }
  .btn-warning{ background: var(--color-warning); color: var(--color-text-inverse); }
  .btn-success{ background: var(--color-success); color: var(--color-text-inverse); }
  .btn-ghost{ background: var(--color-surface-sunken); color: var(--color-text); border-color: var(--color-border); }

  .readout{
    margin-top: var(--space-4);
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-lg); padding: var(--space-4);
  }
  .readout h2{ font-size: var(--size-body-sm); margin: 0 0 var(--space-2); color: var(--color-text-muted);
    text-transform: uppercase; letter-spacing: var(--tracking-overline); }
  pre{ margin: 0; white-space: pre-wrap; word-break: break-word; font-size: var(--size-body-sm);
    background: var(--color-surface-sunken); border-radius: var(--radius-md); padding: var(--space-3); }
  .hint{ color: var(--color-text-muted); font-size: var(--size-caption); margin-top: var(--space-2); }

  /* Thumb-reachable action bar pinned to the bottom for one-handed landscape use. */
  .thumbbar{
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 8000;
    display: flex; gap: var(--space-3);
    padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
    background: rgba(11,18,32,.92); backdrop-filter: blur(8px);
    border-top: 1px solid rgba(255,255,255,.08);
  }
  .thumbbar button.touch{ width: auto; flex: 1; }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>OBSIDIAN — UI Isolation Sandbox</h1>
      <p>S1 surfaces only: error-router taxonomy → pf-toast (aria-live), and the PA-handshake pf-otp-modal. Offline; no network.</p>
      <div class="vp">viewport <b id="vp-size">—</b> · orientation <b id="vp-orient">—</b> · DPR <b id="vp-dpr">—</b></div>
    </header>

    <div class="grid">
      <div class="card">
        <h2>Auth failed (danger)</h2>
        <button class="touch btn-danger" data-kind="AUTH_FAILED">AUTH_FAILED</button>
      </div>
      <div class="card">
        <h2>Not authorized (danger)</h2>
        <button class="touch btn-danger" data-kind="NOT_AUTHORIZED">NOT_AUTHORIZED</button>
      </div>
      <div class="card">
        <h2>Dispatch failed (danger)</h2>
        <button class="touch btn-danger" data-kind="DISPATCH_FAILED">DISPATCH_FAILED</button>
      </div>
      <div class="card">
        <h2>Internal error (danger)</h2>
        <button class="touch btn-danger" data-kind="INTERNAL_ERROR">INTERNAL_ERROR</button>
      </div>
      <div class="card">
        <h2>Rate limited (warning)</h2>
        <button class="touch btn-warning" data-kind="RATE_LIMITED">RATE_LIMITED</button>
      </div>
      <div class="card">
        <h2>Directorate mismatch (warning)</h2>
        <button class="touch btn-warning" data-kind="DIRECTORATE_MISMATCH">DIRECTORATE_MISMATCH</button>
      </div>
      <div class="card">
        <h2>Validation (warning)</h2>
        <button class="touch btn-warning" data-kind="VALIDATION_FAILED">VALIDATION_FAILED</button>
      </div>
      <div class="card">
        <h2>Upstream timeout (warning)</h2>
        <button class="touch btn-warning" data-kind="UPSTREAM_TIMEOUT">UPSTREAM_TIMEOUT</button>
      </div>
      <div class="card">
        <h2>Already applied (info)</h2>
        <button class="touch btn-ghost" data-kind="CONFLICT_IDEMPOTENT">CONFLICT_IDEMPOTENT</button>
      </div>
      <div class="card">
        <h2>OTP required (info)</h2>
        <button class="touch btn-ghost" data-kind="OTP_REQUIRED">OTP_REQUIRED</button>
      </div>
      <div class="card">
        <h2>Success toast</h2>
        <button class="touch btn-success" id="btn-success">Success</button>
      </div>
      <div class="card">
        <h2>Clear stack</h2>
        <button class="touch btn-ghost" id="btn-clear">Dismiss all</button>
      </div>
    </div>

    <div class="readout">
      <h2>OTP handshake result</h2>
      <pre id="otp-result">No handshake run yet.</pre>
      <p class="hint">Demo code that verifies: <b>123456</b>. Any other 6 digits fails and decrements the attempt matrix; after 5 failures the modal fires the ASSIGNMENT-FAILED rollback. Each invalid try also raises an assertive error toast via the taxonomy.</p>
    </div>
  </div>

  <div class="thumbbar">
    <button class="touch btn-primary" id="btn-otp">Open OTP handshake</button>
    <button class="touch btn-danger" id="btn-quick-error">Quick error toast</button>
  </div>

  <!-- Toast host -->
  <pf-toast></pf-toast>

  <script type="module">
    import { Bus } from './core/bus.js';
    import { UI } from './core/ui.js';
    import { ErrorRouter } from './core/error-router.js';
    import './shared/components/pf-toast.js';
    import { PfOtpModal } from './shared/components/pf-otp-modal.js';

    // ── Minimal i18n stub covering every key the three components reference. {var} interpolation. ──
    const DICT = {
      'common.actions.cancel': 'Cancel',
      'common.actions.processing': 'Working…',
      'common.actions.dismiss': 'Dismiss',
      'otp.title': 'Security verification',
      'otp.defaultReason': 'Confirm your identity to authorise this bulk assignment.',
      'otp.codeLabel': 'One-time code',
      'otp.verify': 'Verify',
      'otp.sent': 'Code sent to {to} · expires in {ttl}s',
      'otp.genFailed': 'Could not send a code. Try again.',
      'otp.needCode': 'Enter the code.',
      'otp.invalid': 'Invalid or expired code.',
      'otp.required': 'A one-time code is required to continue.',
      'otp.expired': 'The code expired. Request a new one.',
      'otp.resend': 'Resend code',
      'otp.verifying': 'Verifying…',
      'otp.expiresIn': 'Expires in {s}s',
      'otp.attemptsLeft': '{n} attempt(s) left.',
      'otp.failed': 'Verification failed. The assignment was rolled back.',
      'otp.sendingCode': 'Sending a code…',
      'otp.rollback': 'Too many incorrect attempts — assignment cancelled.',
      'error.auth.failed': 'Your session could not be verified. Please re-authenticate.',
      'error.directorate.mismatch': 'Cross-directorate action requires DG approval.',
      'error.rateLimited': 'Too many requests. Please wait a moment and retry.',
      'error.validation': 'Some details need correcting before this can proceed.',
      'error.notAuthorized': 'You do not have authority for this action.',
      'error.timeout': 'The service took too long to respond. Please retry.',
      'error.internal': 'Something went wrong on our side. The team has been notified.',
      'dispatch.failed': 'Dispatch failed. You can retry from the dispatch queue.',
      'info.alreadyApplied': 'Already applied — no change needed.'
    };
    function t(key, vars) {
      let s = DICT[key];
      if (s === undefined) return key;
      if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
      return s;
    }

    // ── Compose the Platform namespace the imported modules expect (same Bus singleton as UI). ──
    globalThis.Platform = {
      Bus, UI, ErrorRouter,
      I18n: { t },
      Persona: { current: () => 'web-ops', email: () => 'officer@nitda.gov.ng' },
      Log: { info() {}, warn() {}, error() {} }
    };

    // ── Offline fetch stub: drives the OTP handshake (OTP_GENERATE / OTP_VERIFY) with no network. ──
    const VALID_CODE = '123456';
    let serverRemaining = 5;
    function jsonResponse(status, bodyObj) {
      return {
        status, ok: status < 400,
        headers: { forEach: (cb) => cb('application/json', 'content-type') },
        text: async () => JSON.stringify(bodyObj)
      };
    }
    globalThis.fetch = async (_url, options) => {
      let payload = {};
      try { payload = JSON.parse((options && options.body) || '{}'); } catch (_) { payload = {}; }
      const action = String(payload.action || '').toLowerCase();
      await new Promise((r) => setTimeout(r, 250)); // simulate latency so spinners/countdown show

      if (action === 'otpgenerate') {
        serverRemaining = 5;
        const now = Date.now();
        return jsonResponse(200, { ok: true, data: {
          otpId: 'otp_demo_' + now.toString(36),
          ttlSeconds: 120,
          codeLength: 6,
          sentTo: payload.userEmail || 'officer@nitda.gov.ng',
          channel: 'email',
          expiresAt: new Date(now + 120000).toISOString(),
          resendAvailableAt: new Date(now + 30000).toISOString()
        } });
      }
      if (action === 'otpverify') {
        if (String(payload.code || '') === VALID_CODE) {
          return jsonResponse(200, { ok: true, data: {
            otpId: payload.otpId, verified: true,
            verificationToken: 'vt_demo_' + Math.random().toString(36).slice(2, 12),
            tokenExpiresAt: new Date(Date.now() + 600000).toISOString()
          } });
        }
        serverRemaining = Math.max(0, serverRemaining - 1);
        return jsonResponse(401, {
          ok: false,
          errors: [{ kind: 'OTP_INVALID', field: 'otp.code', message: 'The verification code is incorrect.' }],
          remainingAttempts: serverRemaining
        });
      }
      // Any other action: succeed quietly.
      return jsonResponse(200, { ok: true, data: {} });
    };

    // ── Wire taxonomy buttons → ErrorRouter.handle (the real S1 routing path). ──
    function fakeResult(kind) {
      const detailByKind = {
        AUTH_FAILED: 'Session token rejected by the flow.',
        NOT_AUTHORIZED: 'Persona web-ops lacks authority for this state.',
        DISPATCH_FAILED: 'Downstream mail relay timed out.',
        INTERNAL_ERROR: 'Unhandled exception in flow run 8f3a.',
        RATE_LIMITED: 'Quota exceeded.',
        DIRECTORATE_MISMATCH: 'REF-2026-000204 belongs to DSU-LEGAL.',
        VALIDATION_FAILED: 'dueDate must be in the future.',
        UPSTREAM_TIMEOUT: 'Gateway did not respond in 45s.',
        CONFLICT_IDEMPOTENT: 'Duplicate idempotency key.',
        OTP_REQUIRED: 'This batch (>5) needs an OTP.'
      };
      return {
        ok: false,
        errorKind: kind,
        status: 0,
        retryAfter: kind === 'RATE_LIMITED' ? 8 : null,
        errors: [{ code: kind, kind, message: detailByKind[kind] || kind }]
      };
    }
    document.querySelectorAll('button[data-kind]').forEach((b) => {
      b.addEventListener('click', () => ErrorRouter.handle(fakeResult(b.getAttribute('data-kind'))));
    });

    document.getElementById('btn-success').addEventListener('click', () => {
      UI.toast({ message: 'Assignment saved for 14 references.', variant: 'success', timeout: 5000 });
    });
    document.getElementById('btn-clear').addEventListener('click', () => {
      // Dismiss everything currently shown (ids are sequential; clear a wide range).
      for (let i = 0; i < 200; i++) Bus.emit('platform:ui:toast-dismiss', { id: i });
    });
    document.getElementById('btn-quick-error').addEventListener('click', () => {
      ErrorRouter.handle(fakeResult('AUTH_FAILED'));
    });

    // ── OTP handshake trigger. ──
    const otpResult = document.getElementById('otp-result');
    async function runOtp() {
      otpResult.textContent = 'OTP modal open…';
      const r = await PfOtpModal.require({
        purpose: 'BULK_ASSIGNMENT',
        userEmail: 'officer@nitda.gov.ng',
        context: { batchSize: 14, referenceIds: ['REF-2026-000118', 'REF-2026-000119'] }
      });
      otpResult.textContent = JSON.stringify(r, null, 2);
    }
    document.getElementById('btn-otp').addEventListener('click', runOtp);

    // ── Live viewport readout for the ergonomic check. ──
    function paintViewport() {
      document.getElementById('vp-size').textContent = window.innerWidth + ' × ' + window.innerHeight + ' px';
      document.getElementById('vp-orient').textContent =
        (window.innerWidth >= window.innerHeight) ? 'landscape' : 'portrait';
      document.getElementById('vp-dpr').textContent = String(window.devicePixelRatio || 1);
    }
    paintViewport();
    window.addEventListener('resize', paintViewport);
    window.addEventListener('orientationchange', paintViewport);
  </script>
</body>
</html>
__OBSIDIAN_DEPLOY_EOF__

echo "[deploy] done — 14 files written."
echo "[deploy] next: bash tools/verify.sh   (expect STATIC VERIFICATION: PASS)"
