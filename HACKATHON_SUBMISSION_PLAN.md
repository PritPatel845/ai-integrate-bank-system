# Current Wallet AI — Hackathon Completion & Submission Plan

Updated: 16 October 2026  
Purpose: working execution checklist for the PayPal AI Hackathon. Confirm the final event deadline, required assets, judging language, and submission fields in the official event dashboard before submission.

## 1. Product decision

**Recommended primary user:** solo and very small online sellers who take orders through WhatsApp, Instagram DMs, email, or other informal channels and then manually calculate totals and create payment requests.

**Problem statement:** informal order messages are easy to lose or misread. Sellers manually re-enter customer details, item quantities, prices, and delivery fees into payment links. This creates avoidable errors, delays collection, and makes it hard to see which orders are still unpaid.

**Promise:** turn a plain-language order into a reviewed, correctly calculated PayPal checkout request, then keep the order status tied to verified payment evidence.

**Positioning:** “Current Wallet AI — from customer message to paid order, with the merchant in control.”

This is a strong, testable target-user hypothesis, not completed market validation. Before final submission, interview or obtain feedback from at least 3–5 small sellers. Ask them to walk through their current order-to-payment process and record concrete examples, time/errors, and whether they would use this workflow. Do not claim customer validation unless it actually happens.

## 2. Feature and scope audit

Status meanings: **Implemented in source** means code/UI is present; **automated test** means a test exists; **verified live** means exercised against the real provider or deployment. These are not interchangeable.

| Scope item | Current status | Evidence / remaining work |
|---|---|---|
| Customer and merchant accounts / sessions | Implemented in source | Run full login/signup/logout browser regression |
| Merchant fixed-price PayPal payment links and QR | Implemented in source | Re-run full sandbox checkout and capture |
| PayPal Orders, captures, payouts, refunds | Implemented in source | Live sandbox regression still outstanding |
| Verified PayPal webhook signature and event deduplication | Implemented in source | Verify with actual sandbox webhook delivery |
| Wallet transfers, requests, bill splits | Implemented in source | Run regression for both roles and edge cases |
| Merchant sales ledger and refunds | Implemented in source | Verify provider refund round trip |
| AI-assisted credit review with human decision | Implemented in source | Verify AI provider and staff decision path; keep secondary in pitch |
| Staff/monitor views and audit controls | Implemented in source | Run role-by-role authorization regression |
| Merchant natural-language order extraction | Implemented in source | LLM path and deterministic fallback are coded; mock-provider tests exist |
| Server-side exact-cent totals | Implemented in source | Unit tests included; syntax passes |
| Editable order draft | Implemented in source | Browser flow was recorded as tested in the build changelog; repeat on this exact ZIP after installing dependencies |
| Exact-total merchant approval before link creation | Implemented in source | Automated tests included; run them locally |
| PayPal payment link from approved order | Implemented in source | Real PayPal sandbox end-to-end test outstanding |
| Paid status only from verified ledger capture | Implemented in source | Trigger logic is coded; automated test simulates the verified ledger write, not a real webhook |
| Unpaid-order list and reminder text | Implemented in source | Reminder is copy-only; no automatic email/SMS is implemented or promised |
| AI autonomous tool/function calling | **Not implemented / not needed for safe MVP** | Current LLM extracts order data only. Deterministic server routes perform operations after explicit merchant approval. Describe it accurately as an AI-assisted workflow, not an autonomous tool-using agent. |
| Customer discovery / proof of demand | **Outstanding** | Interview 3–5 target sellers; capture anonymized notes and permission for quotes |
| Automated tests | **Present, execution blocked in this environment** | `npm test` attempted; server tests could not start because dependencies were not installed. `npm ci` could not complete here. Run on a normal internet-connected Node 22.13+ machine. |
| Static syntax checks | **Passed** | `npm run check`; inline scripts from six HTML pages also passed `node --check` |
| Full browser regression on this exact ZIP | **Not independently reverified here** | Repeat after install; test desktop and mobile widths |
| PayPal sandbox capture/webhook/refund/payout | **Outstanding** | Requires sandbox credentials and webhook endpoint |
| Public deployment and demo stability | **Outstanding** | Local laptop + tunnel is the low-cost demo path; test the final URL and webhook |
| Final pitch, demo recording, screenshots, architecture diagram | **Outstanding deliverables** | Create only from the final stable build |

## 3. What to build next (priority order)

### P0 — must finish before calling the build submission-ready

- [ ] Install dependencies with `npm ci` on Node.js 22.13+.
- [ ] Run `npm run check` and `npm test`; fix every failure and record the output/date.
- [ ] Run the application from a clean database; confirm signup, login, merchant role, customer role, and session persistence.
- [ ] Exercise the order assistant: draft, edit, add/remove item, missing price, reject, approve exact total, refresh page, and inspect order state.
- [ ] Test AI extraction with a real configured provider key; also test no-key fallback and provider timeout/error. Never expose keys in screenshots or logs.
- [ ] Complete PayPal sandbox round trip: create order/link → customer approval → server capture → ledger row → order becomes paid → link cannot be reused.
- [ ] Deliver a real webhook to the public tunnel/deployed URL; verify signature success, duplicate event handling, and failure on invalid signature.
- [ ] Test refund, payout, and wallet deposit/transfer paths; confirm balances and ledger entries after each.
- [ ] Test authorization with two merchants and two customers: no cross-account read/write, and correct staff-only routes.
- [ ] Test mobile layout, keyboard-only use, clear errors, loading states, and no browser console errors.
- [ ] Ensure demo uses synthetic accounts and no real customer data.

### P1 — make the hackathon story convincing

- [ ] Interview 3–5 independent sellers and summarize the recurring pain points without inventing quotes or metrics.
- [ ] Pick one narrow seller scenario (for example, an Instagram/WhatsApp seller collecting payment for a multi-item order with delivery fee).
- [ ] Prepare one repeatable demo order with a deliberately ambiguous/missing-price case to show the safety review, then a clean order to show success.
- [ ] Show the merchant's explicit approval of the exact total before link creation.
- [ ] Show the customer completing PayPal sandbox checkout, then return to the merchant view and show verified Paid status.
- [ ] Explain the trust boundary: model extracts; server calculates; merchant approves; PayPal verifies; ledger records.
- [ ] Add a concise architecture diagram and a 60–90 second backup screen recording in case live sandbox/network fails.

### P2 — only after P0 and P1

- [ ] Add a short onboarding sample order and a clearer empty state if user testing reveals confusion.
- [ ] Add CSV export or a simple unpaid-order summary only if seller interviews identify it as important and time permits.
- [ ] Do not add automatic reminder sending, automatic refunds, automatic payouts, or autonomous money movement for the hackathon MVP.

## 4. Working judging scorecard

Use this as the preparation scorecard discussed for the event; verify the current official rubric in the event portal before finalizing claims.

| Dimension | Working weight | What the submission should prove |
|---|---:|---|
| Technology implementation | 20% | Reliable end-to-end flow, PayPal integration, robust server-side money/state handling, meaningful AI extraction, tests |
| Design / user experience | 20% | Clear merchant workflow, editable draft, transparent total, useful error states, mobile usability |
| Impact | 20% | Specific seller pain, evidence from interviews, time/error reduction measured in a small pilot if available |
| Innovation | 20% | Natural-language order-to-payment workflow with human control and verified settlement, not just a chatbot wrapper |
| Presentation | 20% | Crisp problem, focused demo, architecture/trust explanation, honest limitations, polished recording |

For each category, prepare one concrete artifact: test output (technology), screen recording/screenshots (design), interview evidence (impact), workflow/architecture explanation (innovation), and a timed pitch/demo (presentation).

## 5. Recommended 3-minute demo script

1. **0:00–0:25 — Problem:** “A small seller gets an order in a chat and has to manually retype every line into a payment request. Errors and unpaid orders get lost.”
2. **0:25–0:55 — AI intake:** Enter: `Ravi wants 2 hoodies at $25 each and 1 cap for $10, delivery $5`. Show extracted customer, lines, and fee.
3. **0:55–1:20 — Trust and correction:** Edit a quantity/price or show a missing-price warning. Explain the server recalculates exact cents and the model cannot set the payable total.
4. **1:20–1:40 — Approval:** Click approve and confirm the exact total. Show the generated checkout link.
5. **1:40–2:20 — PayPal:** Open customer checkout and complete sandbox payment. Avoid showing credentials or private account data.
6. **2:20–2:45 — Reconciliation:** Return to merchant workspace; refresh and show Paid only after verified capture/webhook ledger update.
7. **2:45–3:00 — Close:** “AI understands the order; the seller controls the money; PayPal confirms payment; Current Wallet keeps the record.”

Have a backup recording ready. If the live PayPal environment is unavailable, say so and show a clearly labeled recorded sandbox run; do not fake a live transaction.

## 6. Local demo and deployment runbook

### Lowest-cost route: laptop + public tunnel

1. Install Node.js 22.13+ and Git (if using a repository).
2. In the project directory run `npm ci`.
3. Copy `.env.example` to `.env` and set a unique `SESSION_SECRET` (32+ random characters), `MONITOR_EMAIL`, and `MONITOR_PASSWORD`.
4. Add PayPal **sandbox** client ID, secret, and webhook ID. Add `OPENAI_API_KEY` only if demonstrating live extraction; the deterministic fallback still creates drafts.
5. Set `APP_ORIGIN` to the exact public HTTPS tunnel URL. Set `NODE_ENV=production` when using secure cookies; use the tunnel's documented command to expose local port 3000.
6. Start with `npm start`; check `http://localhost:3000/api/auth/me` and open the app in a private browser window.
7. In the PayPal Developer dashboard register `https://YOUR_TUNNEL_HOST/api/paypal/webhook` and subscribe to the event types documented in README.
8. Test one full payment and one webhook before the presentation. Keep the laptop awake, tunnel running, and network stable.
9. Stop the server/tunnel after the demo. Never publish `.env` or the SQLite database.

### Hosted route

The repository includes `Dockerfile` and `render.yaml`. Create the Render service/Blueprint, attach persistent storage for SQLite, set `APP_ORIGIN` to the final HTTPS domain, and add all secrets through the provider's environment settings. The included setup notes say persistent disk requires a paid Render instance. After deploy, test login, static pages, PayPal return URL, webhook verification, persistent data after restart, and logs. Do not assume a successful deploy means the payment workflow is verified.

## 7. Submission checklist

### Product and evidence
- [ ] Final product name and one-sentence value proposition are consistent everywhere.
- [ ] Target user and problem are specific; discovery evidence is genuine and anonymized.
- [ ] Public demo URL works without developer tools or local-only URLs.
- [ ] Demo account credentials are separate from real accounts and are shared only in the intended submission field.
- [ ] PayPal sandbox integration is clearly labeled as sandbox/test money.
- [ ] README setup steps work from a clean clone.
- [ ] Architecture diagram identifies browser, backend, AI extraction, approval boundary, PayPal, webhook verification, and ledger.
- [ ] Screenshots show the order assistant, review/approval, checkout, and paid reconciliation.
- [ ] Demo video/backup recording is uploaded and checked for audio, permissions, and accidental secrets.

### Engineering and security
- [ ] `npm ci`, `npm run check`, `npm test`, and `npm audit --omit=dev` results reviewed.
- [ ] No `.env`, API keys, webhook secrets, session secrets, database, WAL/SHM, real personal data, or `node_modules` in repository/archive.
- [ ] Rotate any credentials previously included in an upload or commit.
- [ ] Session secret is unique and strong; production cookies are secure; HTTPS is enabled.
- [ ] PayPal webhook signature and duplicate-event handling tested.
- [ ] Account ownership and role checks tested for every sensitive route.
- [ ] Known limitations and unverified behavior are disclosed accurately.

### Event portal
- [ ] Confirm official deadline and timezone in the event dashboard.
- [ ] Confirm required project fields, team/solo rules, AI disclosure, PayPal integration evidence, and video/demo requirements.
- [ ] Submit project description, problem, solution, technical implementation, impact, innovation, and demo links.
- [ ] Verify every URL in an incognito browser and submit before the final hour.

## 8. Risks and honest limitations

- This is a hackathon sandbox prototype, not a regulated bank or production-ready financial service.
- No MFA, KYC/AML, encryption at rest, multi-instance database architecture, automated backups, or production monitoring.
- Current AI role is structured extraction; it does not independently call arbitrary tools or move money. All money actions are deterministic server operations gated by merchant approval and PayPal verification.
- Reminder messages are drafted only; there is no automatic sending.
- Existing credit-review feature can be manipulated by circular/fake sandbox sales and must not be presented as a reliable real-world credit decision system.
- Automated test code is included, but this uploaded archive still needs dependency installation and a successful test run before the test suite can be claimed as passing.

## 9. Immediate next milestone

Do not expand features until P0 is green. First get a clean install and green automated tests on the exact uploaded ZIP; then run the PayPal sandbox/webhook round trip. Only after those pass should the team freeze scope, collect seller evidence, and produce the final demo assets.
