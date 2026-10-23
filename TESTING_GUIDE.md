# Testing Guide

Run `npm ci`, `npm run check`, and `npm audit --omit=dev`. Start the app with a temporary `DATABASE_PATH` for integration checks so test accounts never enter the demo database.

Verify the following manually:

- Unauthenticated account requests return `401`; customer requests to employee/monitor routes return `403`.
- New customer accounts start at `$0.00`; no direct-deposit endpoint exists.
- Transfers require a risk quote and explicit confirmation, and cannot exceed available funds or daily limits.
- PayPal Orders credit only after capture; payout balances remain reserved until a verified webhook settles them.
- Missing AI credentials route loan applications to manual review. Human overrides and rejection reasons appear in the audit log.
- Monitor freezes block outgoing wallet operations; monitor pause blocks loan disbursement. Both actions are audited.
- Merchant checkout creates a verified sale; that sale appears in merchant sales and in the next credit-review evidence.
- Customer and merchant roles can see only their account; employee/monitor routes are denied to them. Staff must not call customer payout/transfer operations.

PayPal settlement and webhook signature validation require valid sandbox credentials and a registered webhook ID; they cannot be exercised against live PayPal from an unconfigured local installation.
## Loan Management Centre and safety controls

Run `npm test` to include `test/loan-management.test.js`. It checks that missing/ unverified documents block the first-stage pass, the workflow requires five distinct jury votes, duplicate votes are rejected, only the monitor can record the final decision, Safety Centre can block transfers, and demo in-app codes are single-use. The test suite needs dependencies installed with `npm ci` first. Also manually verify:

1. Create monitor and five employee accounts.
2. Assign each employee to a different department in Loan Management Centre.
3. Submit an application with synthetic amounts and upload synthetic files for all four required types.
4. Audit all four documents as verified and rerun preliminary checks.
5. Confirm that jury voting remains blocked until first-stage checks pass.
6. Cast five support votes; only then should the monitor see final approval and a separate Sandbox payout action.
7. Repeat with a `concern` vote; unanimous approval must be blocked.
8. Try a missing-document case, follow-up request/response, Ollama offline, expired/replayed in-app code, and disabled transfer controls.
9. Never test with live PayPal credentials or real identity documents.
