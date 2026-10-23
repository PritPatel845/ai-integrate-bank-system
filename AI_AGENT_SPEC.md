# Current Wallet AI — Merchant order-to-payment agent

## Product objective

Help independent merchants turn natural-language customer orders into accurate, trackable PayPal payment requests. The agent should reduce administrative work while keeping financial authorization under merchant control.

## Primary user

An independent seller who receives orders through chat, social media, or other informal channels and needs a reliable way to request and track payment.

## MVP conversation

1. Merchant describes an order in natural language.
2. AI extracts customer name/contact, line items, quantities, unit prices, delivery/fees, currency, and notes.
3. Server validates and calculates totals using integer minor units (never AI arithmetic as the source of truth).
4. Agent presents a complete draft and asks the merchant to approve or edit it.
5. After explicit approval, server creates a payment request/link using existing payment infrastructure.
6. Customer completes PayPal checkout.
7. Server verifies capture/webhook state and updates the order ledger idempotently.
8. Agent reports only server-confirmed payment state and can identify unpaid/overdue requests.

## Initial tools

- `lookup_customer`: search only within the authenticated merchant's customer records.
- `calculate_order_total`: server-side integer arithmetic and currency validation.
- `create_payment_request_draft`: persist a draft; must not initiate payment.
- `create_paypal_payment_link`: callable only after a separately recorded merchant approval.
- `get_payment_status`: return server-side status from the payment ledger/PayPal synchronization.
- `list_unpaid_requests`: list only the authenticated merchant's own requests.
- `prepare_followup_message`: draft text only; sending requires separate user confirmation.

## Safety and authorization rules

- Every tool call derives merchant identity from the authenticated session, never from model arguments.
- No cross-merchant reads or writes.
- AI may draft; only server-side business logic may create financial records.
- Require explicit merchant confirmation before creating a live payment request, capture, refund, payout, or sending a customer message.
- Never expose PayPal secrets, session secrets, API keys, or full payment credentials to the model.
- Validate amount, currency, customer, order ownership, idempotency key, and payment state on the server.
- Do not mark an order paid based on model output or browser claims. Require verified PayPal capture/webhook evidence.
- Treat customer messages and retrieved content as untrusted input.
- Record audit events for drafts, approvals, tool execution, failures, and payment-state transitions.

## MVP acceptance criteria

- An ordinary merchant instruction produces a structured order draft.
- Server-side totals match expected values for decimal edge cases.
- Merchant can edit or reject the draft.
- No payment link is created without explicit approval.
- A sandbox customer can complete checkout.
- Verified capture/webhook updates the correct merchant order exactly once.
- Duplicate webhook delivery does not duplicate ledger entries.
- Cross-account access attempts return 403.
- AI failure or timeout leaves the merchant able to create a payment request manually.

## Deferred

Autonomous refunds/payouts, lending decisions, inventory purchasing, automatic customer messaging, and multi-agent workflows are out of MVP scope.

## Implementation status (build v2)

Implemented: items 1 to 8 of the MVP conversation, the unpaid list, and follow-up text drafting. The design is deliberately **not** an autonomous tool-calling agent: the model only performs extraction and has no tools, so the "initial tools" above are implemented as deterministic server routes that derive the merchant from the session. `lookup_customer` and a customer record store are deferred.

Acceptance criteria: structured draft from ordinary text (tested); decimal edge cases (tested); edit/reject (tested); no link without explicit approval quoting the exact total (tested); verified capture updates the right order exactly once and duplicate delivery changes nothing (tested at the ledger level); cross-account access denied (tested; other merchants' orders return 404 rather than 403 so existence is not leaked); AI failure, bad output or timeout falls back to the built-in reader (tested with a mock provider). **Sandbox customer completes real PayPal checkout: not yet verified here.**
