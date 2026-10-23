# ⚠️ CRITICAL SECURITY NOTICE

This project is a conceptual prototype for an AI-driven Financial OS. It is **NOT** production-ready and should **NOT** be used with real money or sensitive data.

## Known Security Limitations:
- **No MFA, KYC/AML or encryption at rest**; not suitable for real money.
- **CSP is disabled** because the pages use inline scripts and handlers; moving to external scripts would allow a strict CSP.
- **Single-instance SQLite**, no automated backups or monitoring.
- **Account enumeration** through transfer quotes and signup messages.
- **Credit Inflation Risk**: A merchant can create fake "sales" between their own sandbox accounts to inflate credit evidence; real use would need counterparty and velocity checks.
- **Unverified Sandbox Flow**: Live PayPal sandbox regression (checkout, capture, webhook signature) has not been run in this build.
- **Limited Automation**: Automatic reminder sending is intentionally not implemented.
