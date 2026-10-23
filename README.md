# Current Wallet

A shared wallet and merchant checkout demo backed by a server-owned SQLite ledger. Customers can fund wallets with PayPal Orders and transfer/request/split money internally. Merchants create fixed-price PayPal checkout links and QR codes; settled sales build the history used for AI-assisted, human-approved merchant credit.

## Current Wallet AI — merchant order-to-payment assistant (implemented)

In **Merchant Workspace → Order assistant**, a merchant types an order in plain words (for example `Ravi wants 2 hoodies at $25 each and 1 cap for $10, delivery $5`). The assistant:

1. Extracts customer, items, quantities, prices and fees (OpenAI if `OPENAI_API_KEY` is set; otherwise, or if the AI is down, slow or returns something invalid, a built-in deterministic reader).
2. **The server calculates every total** in integer cents. The model has no tools, no database access and no authority over money.
3. Shows an editable draft. Nothing is charged and no payment link exists yet.
4. On **Approve**, which must quote the exact total the merchant saw, creates a PayPal checkout link (reusing the existing checkout flow).
5. Reports **Paid** only when a verified PayPal capture or webhook is written to the ledger. A database trigger flips the order to paid exactly once and retires the link, so duplicate webhooks cannot double-count and the order cannot be charged twice.

Also: unpaid-order list and a reminder-text drafter (text only; nothing is ever sent automatically). See [AI_AGENT_SPEC.md](AI_AGENT_SPEC.md) for the design and [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for routes. Run `npm test` for the 22 automated tests (no PayPal credentials needed).

**Not yet verified:** the live PayPal sandbox round trip (checkout, capture, webhook) has not been run against real sandbox credentials in this build. The ledger/paid-state logic is tested by writing the same ledger row the server writes after a verified capture.

### Free live demo from your laptop (no domain, no hosting cost)

Run the server with `NODE_ENV=production` (secure cookies, correct client IPs) and put a free tunnel in front of it: `ngrok http --url=YOUR-STATIC-DOMAIN.ngrok-free.app 3000`, then set `APP_ORIGIN` to that URL and register `APP_ORIGIN/api/paypal/webhook` in your PayPal sandbox app. Take the tunnel down when you are not demoing.

## Hackathon readiness

See [HACKATHON_SUBMISSION_PLAN.md](HACKATHON_SUBMISSION_PLAN.md) for the feature audit, remaining P0/P1/P2 work, working judging scorecard, 3-minute demo script, deployment runbook, and submission checklist. The plan explicitly distinguishes implemented source code from automated-test and live-PayPal verification.

## Security status

Fixed in this build: account-ownership enforcement (merchants could previously act on other users' accounts), cent parsing (amounts such as $8.20 and $1.15 were rejected), refunds that could make a balance negative, payment capture on retired links, abandoned repayment checkouts blocking repayments, login timing leak, shared rate-limit IP behind proxies, rate limits on money-moving routes, and one open loan per account. See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for what is still open. `.env` and SQLite files are excluded from source archives; rotate any credentials that were ever shared.

## Quick Start

1. Install Node.js 22.13 or newer (Node 24 is used in Docker).
2. Run `npm ci`.
3. Copy `.env.example` to `.env`. Set `SESSION_SECRET` to a unique random value of at least 32 characters.
4. Set `MONITOR_EMAIL` and `MONITOR_PASSWORD` (at least 10 characters) to provision the first monitor at startup.
5. Configure PayPal sandbox REST credentials and `PAYPAL_WEBHOOK_ID` to test checkout, refunds, payouts, and verified webhooks. Configure `OPENAI_API_KEY` for AI credit review; missing/unavailable AI routes applications to employee review.
6. Run `npm start`, then open `http://localhost:3000`.

The server binds to `127.0.0.1` by default. To share on the same trusted Wi-Fi, run `npm run start:lan`, then use `http://YOUR_COMPUTER_LAN_IP:3000` from other devices. All devices use this one server/database but have separate sessions. Allow inbound port 3000 on the host firewall. Do not expose the LAN HTTP server to the public internet.

## Demo Flow

1. Sign up as a **Merchant**, optionally entering a separate PayPal payout email. Create a fixed-price link in Merchant Workspace and share the link or QR.
2. A customer opens the checkout link on any device and pays through PayPal sandbox. A completed capture adds a merchant sale record. The merchant sales dashboard refreshes from the ledger.
3. A merchant requests credit. AI review uses completed merchant sales, refunds, and recent wallet events and records its evidence/reasons. An employee reviews, approves/overrides with a reason, or rejects. Loan payout status can be polled from PayPal if a webhook cannot reach a local server.
4. Customer wallets also support exact-email/account-ID transfers, request money, and a natural-language split pattern such as `split $84 dinner with ravi@example.com and meera@example.com`. Names alone are deliberately not accepted as recipients.

Register as **Personal wallet** for customer funding, transfer, requests, and credit screens. Sign in with the provisioned monitor to create employee accounts and access account freezes, disbursement pause, audit history, and bank-wide views.

## Money and Safety

- Wallet funding, merchant checkout, loan repayments, and refunds use PayPal Orders/Captures APIs. Cash-outs and loan disbursements use PayPal Payouts.
- PayPal capture and payout records remain pending until the server capture/poll/webhook confirms the provider state. Payouts reserve available funds while pending. The customer and merchant views have status refresh controls.
- P2P transfers and accepted requests use paired, atomic internal ledger rows; they do not claim PayPal supports direct personal-account push transfers.
- Values are integer cents. Loan repayments use a stored `loan_id`, annual rate and fixed term (defaults: 12%, 12 months); monthly and total scheduled repayments are returned to the UI.
- Passwords are bcrypt hashes and sessions are HTTP-only, SQLite-backed cookies. Roles are `customer`, `merchant`, `employee`, and `monitor`. Login/signup have rate limits, and Helmet supplies security headers.
- Transfer recipients are exact email/account-ID matches. Quotes mask email addresses and warn on first-time/high-value sends. Splits and outgoing payments require explicit confirmation.
- AI is advisory; human approval is required. User-provided loan purpose is treated as untrusted text. Each review, payment, refund, approval, freeze, and pause action is audited.
- Monitor freezes prevent outgoing wallet actions and new loans. The monitor kill switch blocks loan payouts.

## PayPal and Webhooks

Create a PayPal Sandbox REST app and configure:

- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID` and webhook URL `https://YOUR_HOST/api/paypal/webhook`
- `APP_ORIGIN` as the exact reachable app origin. For LAN tests this is the host computer's LAN URL; for Render it is the deployed HTTPS URL.

Subscribe to capture completed/refunded/denied and payout batch success/denied events. The webhook signature is verified through PayPal's verification API and event IDs are deduplicated. Polling endpoints remain available when webhooks cannot reach localhost.

## Render Deployment

This repo includes `Dockerfile` and `render.yaml`. In Render, create a Blueprint from the repo. The blueprint uses Node 24 and a persistent disk for SQLite. Set `APP_ORIGIN` to the final HTTPS Render URL, and add PayPal/OpenAI keys in the Render dashboard. The persistent disk requires a paid Render instance; SQLite must not live on an ephemeral filesystem. Never commit secrets or database files.

## Free local AI (no paid API subscription)

Current Wallet can use Ollama on your own computer through its OpenAI-compatible local endpoint. This keeps model inference local and avoids a paid API key. Install Ollama from https://ollama.com, then run:

```bash
ollama pull llama3.2:3b
ollama serve
```

Copy `.env.example` to `.env` and set these values:

```dotenv
OPENAI_API_KEY=ollama-local
OPENAI_MODEL=llama3.2:3b
OPENAI_API_URL=http://127.0.0.1:11434/v1/chat/completions
```

The `OPENAI_*` names are kept for compatibility; the local Ollama server does not require a paid API account. Keep Ollama running while the app is running. Performance depends on your computer's RAM/CPU/GPU. For a public hosted demo, `127.0.0.1` points to the server itself, not your laptop; either run the app and Ollama locally for the live demo, or leave AI unconfigured and use the documented human-review fallback. Never expose Ollama's port publicly. AI credit review remains advisory and a human must make lending decisions.

## Creating a loan-review staff account

Public sign-up intentionally supports only customer and merchant accounts. Staff accounts must not be self-registered. On first run, configure `MONITOR_EMAIL` and `MONITOR_PASSWORD` in `.env` (password at least 10 characters), restart the server, and sign in with that monitor account. On the risk desk (`bankside.html`), use **Create loan-review staff account** to create an `employee` account. The employee can then sign in and review loan applications. The staff form remains mounted during dashboard refreshes so an in-progress form is not cleared every five seconds.

## Configuration / API

`.env.example` lists secrets, provider settings, payout limits, loan limits, interest rate, and term. Run `npm run check` and `npm audit --omit=dev` for local checks. See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for routes. Sandbox money is not real money, and this demo is not a bank.

## Latest checkout and UI fixes

See [CHECKOUT_FIX_SETUP.md](CHECKOUT_FIX_SETUP.md) for the 2026-10-16 checkout-origin, QR validation, CSS repair, and ngrok setup instructions.
