# Contract Family — Security / Utility (F6)

Canonical Wire Tickets for the Security / Utility family. Authority: Power Automate HTTP Flows — Canonical Response Contract v1. Pointers in `/config/endpoints.config.js` (`@see` this file).

**`data.*` shape:** { "channel":…, "recipient":…, "expiresAt":…, "ttlSeconds":N, "verified":bool, "sessionToken":… }.

## OTP_GENERATE
- **Flow:** `OTP Generate`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F6
- **request.action:** `otpGenerate`
- **URL:** see `Endpoints.OTP_GENERATE.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('OTP_GENERATE', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.

## OTP_VERIFY
- **Flow:** `OTP Verify`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F6
- **request.action:** `otpVerify`
- **URL:** see `Endpoints.OTP_VERIFY.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('OTP_VERIFY', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.
