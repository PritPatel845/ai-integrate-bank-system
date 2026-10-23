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