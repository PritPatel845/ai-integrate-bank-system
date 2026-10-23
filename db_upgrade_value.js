const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./bank.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS value_ledger (
    id TEXT PRIMARY KEY, 
    account_id TEXT NOT NULL REFERENCES accounts(id), 
    contribution_type TEXT NOT NULL, 
    impact_score INTEGER NOT NULL, 
    description TEXT, 
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS value_account_idx ON value_ledger(account_id);
`);
console.log("Database upgraded: Contribution Matrix enabled.");
