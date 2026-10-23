# Current Wallet — checkout and interface fixes

## What changed
- Fixed the scanner/footer CSS that was accidentally placed outside the `<style>` element and therefore appeared as text above the wallet.
- Fixed customer checkout-link parsing: a valid `/checkout/<token>` URL is no longer rejected only because its hostname differs from the page hostname. The app still asks its own backend to verify the token and active payment-link record.
- Unified generated checkout URLs and PayPal return/cancel URLs behind `appOrigin(req)`.
- Updated `.env.example` with tunnel setup guidance.

## Required local `.env` settings for your ngrok demo

In your real `.env` file (not `.env.example`), use:

```env
APP_ORIGIN=
TRUST_PROXY=1
```

Leaving `APP_ORIGIN` empty makes the app use the request's visible host/protocol. `TRUST_PROXY=1` is required when the request arrives through your ngrok reverse proxy. If you prefer a fixed public URL, set `APP_ORIGIN=https://YOUR-CURRENT-NGROK-DOMAIN.ngrok-free.dev` instead of leaving it empty.

Do not put quotes around the URL. Do not include a trailing slash.

## Apply and restart

1. Back up your current folder and database.
2. Extract this ZIP into a new folder.
3. Copy your existing `.env` and `bank.sqlite` into that new folder. Do not overwrite the `.env` with `.env.example`.
4. Edit `.env` as described above.
5. From the new project folder run `npm install` (or `npm ci` if your lockfile is current).
6. Start the server with `npm start`.
7. Start/restart ngrok to the same local port (3000), then open the HTTPS ngrok URL.
8. Sign in to the merchant page and create a **new** payment link. Existing QR codes may contain the old IP; regenerate/download the QR for the new link.
9. On the customer wallet, paste the new merchant checkout URL and press Review. The app should display merchant/title/amount before continuing.

## Important
- A pasted link can have a different hostname, but its `/checkout/<token>` path must match the expected route and the server must confirm that token is active. This does not authorize payment or skip PayPal capture verification.
- HTTPS ngrok is a secure browser context and should allow camera permission if Chrome grants it. If camera access still fails, use Scan image or paste link.
- This source archive does not include `.env`, credentials, SQLite data, or `node_modules`. Keep secrets out of screenshots and ZIP uploads.
- The automated test suite was not executed in this environment because dependencies are not included in the ZIP. Backend and inline JavaScript syntax checks passed. Run `npm test` locally after installing dependencies.
