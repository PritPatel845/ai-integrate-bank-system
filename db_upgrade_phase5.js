const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./bank.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS mandates (
    id TEXT PRIMARY KEY, 
    account_id TEXT NOT NULL REFERENCES accounts(id), 
    category TEXT NOT NULL, 
    limit_cents INTEGER NOT NULL, 
    period TEXT NOT NULL, 
    status TEXT NOT NULL, 
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS mandate_account_idx ON mandates(account_id);
`);
console.log("Database upgraded: Sovereign Mandates enabled.");
