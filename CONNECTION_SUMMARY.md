# System Connection Summary

The personal wallet, merchant workspace/checkout, employee review desk, and bank summary use the same-origin Express API. SQLite stores users, sessions, integer-cent wallet and merchant-sales ledger entries, payment links/orders/requests, structured loan repayment references, webhook event IDs, monitor controls, and the audit log.

Payouts can be polled as well as settled by signed webhooks. Merchant sales and refunds feed the credit-review evidence. See [README.md](README.md) for local/LAN/Render setup and [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for routes. No balances or statistics are seeded.