# API Reference

All routes are same-origin and use JSON unless returning an HTML checkout page. Amount inputs are dollars; the database stores cents. Authenticated calls use the HTTP-only server session cookie.

## Authentication and Profiles

- `POST /api/auth/signup`: `{name,email,password,role:'customer'|'merchant',paypalEmail?}`. Creates an empty wallet.
- `POST /api/auth/login`: `{email,password}`. Rate-limited; role returned in `user`.
- `POST /api/auth/logout`, `GET /api/auth/me`.
- `PATCH /api/profile/paypal-email`: `{paypalEmail}`. Saves a separate payout recipient address.
- `POST /api/admin/users/employee`: monitor-only; `{name,email,password,role:'employee'|'monitor'}`.

## Customer and Merchant Money

- `GET /api/accounts`, `GET /api/accounts/:accountId`, `GET /api/accounts/:accountId/transactions`.
- `POST /api/accounts/:accountId/deposit/order`: `{amount}` creates a PayPal Orders funding checkout.
- `POST /api/paypal/orders/:orderId/capture`: customer-session capture callback; validates against a local pending order and is idempotent.
- `POST /api/accounts/:accountId/transfer/quote`: `{recipient,amount}`. Recipient must be an exact registered email or account ID; response includes masked email.
- `POST /api/accounts/:accountId/transfer`: `{recipient,amount,confirmed:true}`.
- `POST /api/accounts/:accountId/requests`: `{recipient,amount,note?}`; `GET /api/accounts/:accountId/requests`; `POST /api/requests/:requestId/resolve` with `{accepted:true|false}`.
- `POST /api/accounts/:accountId/split/quote`: `{total,recipients:[emailOrAccountId,...]}`; `POST /api/accounts/:accountId/split` with the same values plus `confirmed:true`.
- `POST /api/accounts/:accountId/payout`: `{paypalEmail,amount,confirmed:true}`. Payouts reserve funds pending provider settlement.
- `POST /api/accounts/:accountId/payouts/:payoutId/sync`: polls PayPal batch status for the current wallet.

## Merchant Checkout

- `GET /api/public/payment-links/:linkId` returns only checkout product data.
- `POST /api/public/payment-links/:linkId/order` creates a PayPal checkout; the customer follows `approveUrl`.
- `GET /checkout/:linkId` is the public checkout page; `/checkout/:linkId?paypal=return&token=ORDER_ID` completes capture.
- `GET /api/merchant/payment-links`, `POST /api/merchant/payment-links` with `{title,description,amount}`.
- `GET /api/merchant/payment-links/:linkId/qr` returns a QR PNG data URL for a link owned by the merchant.
- `GET /api/merchant/dashboard` returns completed sales and refunds.
- `POST /api/merchant/sales/:captureId/refund` with optional `{amount,reason}`; refunds cannot exceed remaining sale value.

## Credit and Bank Operations

- `POST /api/loans`: customer/merchant `{amount,purpose}`. AI receives recent wallet transactions plus merchant sale/refund aggregates. A missing AI provider routes to `review_required`.
- `GET /api/loans` returns owned applications to customer/merchant and all applications to staff.
- `POST /api/loans/:loanId/approve`, `POST /api/loans/:loanId/reject`: employee-only human review. Payouts use the account's saved PayPal email.
- `POST /api/loans/:loanId/payout/sync`: owner or staff polls payout settlement.
- `POST /api/paypal/orders/repayment`: `{loanId,amount}` creates a repayment order, capped to outstanding amortized schedule amount. Repayments are linked by `loan_id`.
- `POST /api/paypal/webhook`: verifies PayPal signature, deduplicates event IDs, and records captures, refunds, and payout settlement.
- `GET /api/bank/summary`, `GET /api/transactions`, `GET /api/audit`: employee/monitor only.
- `GET /api/admin/accounts`: employee/monitor; `POST /api/admin/accounts/:accountId/freeze` and `POST /api/admin/agent-pause`: monitor only.

Environment setup, provider configuration, and deployment notes are in [README.md](README.md).

## Order assistant (merchant role only)

Object-level access is by owning merchant; another merchant's order returns 404 (no existence leak). Drafting is limited to 10/min and writes to 30/min per user.

- `POST /api/agent/orders/draft`: `{text}` for natural language, or `{items:[{name,quantity,unitPrice}],customerName?,fee?}` for manual entry. Returns `{order, notice}`. Never creates a payment. `order.source` is `ai`, `heuristic` or `manual`.
- `GET /api/agent/orders`, `GET /api/agent/orders/:orderId`, `GET /api/agent/unpaid`.
- `PATCH /api/agent/orders/:orderId`: edit a draft; the server recalculates totals.
- `POST /api/agent/orders/:orderId/approve`: `{confirmed:true, approvedTotal:"64.98"}`. Returns 428 without confirmation and 409 if the total changed or any price is missing. Creates exactly one payment link; repeating the call returns the same link.
- `POST /api/agent/orders/:orderId/reject`, `POST /api/agent/orders/:orderId/followup` (returns reminder text only).
- Order `status`: `draft`, `link_created` (awaiting payment), `paid` (set only by a verified ledger capture), `rejected`.
