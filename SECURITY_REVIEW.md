# Security review — Current Wallet

## Changes made in this working copy

- Fixed `ownAccount()` so account-scoped customer and merchant routes require the authenticated user to own the account.
- Staff access must use dedicated staff endpoints with explicit role checks; staff sessions cannot inherit access through user-facing account routes.
- Expanded `.gitignore` to exclude environment files, SQLite databases/WAL files, session stores, logs, and editor metadata.

## Fixed and covered by `npm test`

| Issue | Status |
|---|---|
| Merchant accounts could read/transfer/pay out from any account | Fixed; 403 tests |
| Valid amounts ($8.20, $1.15, $0.29, ...) rejected by float comparison | Fixed with string-based parsing; unit tests |
| Merchant refund could drive wallet balance negative | Fixed; 409 test |
| Capture attempted on a retired/paid link (customer charged, no sale recorded) | Fixed: link checked before capture |
| Abandoned repayment checkouts blocked repayment capacity forever | Fixed: pending orders expire after 1 hour |
| Unknown-email login faster than known-email (timing leak) | Fixed with dummy bcrypt compare |
| All visitors shared one rate-limit bucket behind a tunnel/proxy | Fixed: `NODE_ENV=production` or `TRUST_PROXY=1` |
| No rate limit on money-moving routes | Added (20/min per user) |
| Loan requests could be spammed (AI cost, stacked loans) | One open loan per account |
| AI agent: model output trusted for money | Server-side integer totals; approval must quote the exact total; paid only via ledger trigger |

## Still open (honest list)

- No MFA, KYC/AML or encryption at rest; not suitable for real money.
- CSP is disabled because the pages use inline scripts and handlers; moving to external scripts would allow a strict CSP.
- Single-instance SQLite, no automated backups or monitoring.
- Account enumeration through transfer quotes and signup messages.
- A merchant can create fake "sales" between their own sandbox accounts to inflate credit evidence; real use would need counterparty and velocity checks.
- Live PayPal sandbox regression (checkout, capture, webhook signature) has not been run in this build.
- Automatic reminder sending is intentionally not implemented.

## Before publishing

1. Rotate every credential that was present in the uploaded `.env`, even if it is a sandbox credential.
2. Keep `.env` out of Git history. If it was ever committed, revoke/rotate the credentials; deleting the file in a later commit is not sufficient.
3. Use a unique, high-entropy `SESSION_SECRET` in each environment.
4. Configure PayPal sandbox credentials and webhook ID through the deployment provider's secret manager.
5. Confirm webhook signature verification against PayPal's sandbox before treating an order as paid.
6. Never trust browser-supplied payment status, amount, account owner, or capture identifiers without server-side validation.
7. Run cross-account authorization tests for every account-scoped endpoint.
8. Use synthetic demo identities and transactions only in public demos.

## Known limitation

This is a source-level fix and review, not a penetration test or proof that every route is secure. The application still requires endpoint-by-endpoint authorization, payment-state, input-validation, and dependency review before production use.
