# Quick Start

1. Install Node.js 22.13 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`. Set a random `SESSION_SECRET` of at least 32 characters and monitor bootstrap email/password.
4. Configure PayPal sandbox credentials/webhook ID and optional AI provider key.
5. Run `npm start` and open `http://localhost:3000`. Merchant signup, checkout, QR links, sales, and credit requests are in Merchant Workspace.

Full configuration, workflow, and safety details are in [README.md](README.md).

### Free local AI option
Install Ollama, run `ollama pull llama3.2:3b`, then `ollama serve`. In `.env`, set `OPENAI_API_KEY=ollama-local`, `OPENAI_MODEL=llama3.2:3b`, and `OPENAI_API_URL=http://127.0.0.1:11434/v1/chat/completions`. This is local inference and does not require a paid API key. See README for staff-account setup and fallback behavior.
