# Hackathon working-copy changes

## 2026-10-15

- Enforced account ownership on account-scoped customer/merchant routes. Cross-account requests now return HTTP 403.
- Removed implicit staff/monitor access from user-facing account routes; privileged monitoring must use dedicated endpoints with explicit role checks.
- Hardened `.gitignore` for `.env*`, SQLite databases and WAL/SHM files, session stores, dependencies, logs, and editor metadata.
- Added `SECURITY_REVIEW.md` with credential rotation and publication requirements.
- Added `AI_AGENT_SPEC.md` describing the proposed merchant order-to-payment agent and its safety boundaries.
- Updated README to distinguish existing functionality from proposed hackathon work.

## 2026-10-15 (build v2)

- Implemented the merchant order-to-payment agent: `merchant-agent.js`, `order_drafts` table, `/api/agent/*` routes, and an Order assistant panel in `merchant.html`.
- Added `money-utils.js` (string-based cent parsing) and fixed the `$8.20` rejection bug.
- Fixed refund-below-zero, capture-on-retired-link, abandoned repayment orders, login timing, proxy/rate-limit IP handling; added money-route rate limits and a one-open-loan rule.
- Added `test/agent-and-security.test.js` (22 tests: authorization, money parsing, agent safety rules, AI failure fallback). Disabling the exact-total approval check or the ownership check makes tests fail.
- Browser-tested the merchant flow (draft, edit, approve, checkout page, paid state) in Chromium with no page errors.
- New env vars: `AGENT_MAX_ORDER_CENTS`, `AGENT_LLM_TIMEOUT_MS`, `TRUST_PROXY`.

## Validation performed (v1)

- `node --check bank-api.js` passed under Node.js 22.16.0.
- Static inspection confirmed `ownAccount()` now rejects users who do not own the requested account.

## Not yet verified

- Full browser/UI regression tests.
- PayPal sandbox checkout/capture and webhook round trip.
- Cross-account API tests against a running server.
- AI provider connectivity and tool-calling execution.

## 2026-10-16 (submission readiness audit)

- Added `HACKATHON_SUBMISSION_PLAN.md`: feature-status audit, target-user hypothesis, validation plan, working judging scorecard, demo script, local/hosted deployment runbook, submission checklist, and prioritized remaining work.
- Re-ran `npm run check`: passed for backend and agent JavaScript.
- Extracted inline scripts from all six HTML pages and ran `node --check`: passed.
- Attempted `npm test`: test process could not start because dependencies were absent from the sanitized archive (`express` missing).
- Attempted dependency installation; package registry/cache was unavailable in this execution environment. Automated test results remain unverified, not passed.
- PayPal sandbox/webhook round trip, final deployment, and target-user interviews remain outstanding.


## 2026-10-16 — Checkout URL and wallet CSS fixes

- Moved the scanner/footer CSS rules into the existing `<style>` block in `bank interface.html`; previously those rules were emitted as visible page text.
- Merchant QR, merchant payment-link responses, wallet funding redirects, payment-link PayPal redirects, and loan repayment redirects now use one `appOrigin(req)` helper.
- The origin helper honors `APP_ORIGIN` when explicitly configured; otherwise it uses the request's externally visible protocol and host. For a trusted tunnel such as ngrok, set `TRUST_PROXY=1`.
- Customer QR-link parsing now accepts an HTTP or HTTPS checkout URL from another host when its path is exactly `/checkout/<token>`. The token is still verified against the application's database and must identify an active payment link; this does not bypass merchant/payment validation.
- Updated `.env.example` guidance for tunnel configuration.

Verification: backend syntax and HTML inline-script syntax checks are recorded in the accompanying handoff. A live ngrok/PayPal round trip still requires testing in the user's environment.
