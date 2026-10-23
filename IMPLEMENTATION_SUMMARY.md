# Implementation Summary

The active application is the PayPal sandbox wallet and merchant checkout documented in [README.md](README.md). It includes personal and merchant roles, QR/payment links, PayPal Orders/Payouts/refunds, verified webhooks plus payout polling, merchant sales-backed AI credit review with human approval, requests/splits, and an AG Grid staff ledger.

The app uses a SQLite ledger with integer cents, hashed passwords, rate-limited login, HTTP-only sessions, explicit recipient confirmation, staff audit controls, and configurable amortized loan schedules. No balances are seeded. The old Java and JSON demos are retired.