class SovereignAgent {
  constructor(db) {
    // Now expects the DatabaseSync instance from bank-api.js
    this.db = db;
  }

  /**
   * Create a Mandate: A rule the AI must follow autonomously.
   */
  async createMandate(accountId, category, limitCents, period = 'monthly') {
    const mandateId = `mandate_${Date.now()}`;
    this.db.prepare(`
      INSERT INTO mandates (id, account_id, category, limit_cents, period, status, created_at) 
      VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))
    `).run(mandateId, accountId, category, limitCents, period);
    return mandateId;
  }

  /**
   * Execute Autonomous Optimization
   */
  async runAutonomousCycle(accountId) {
    const results = [];
    const mandates = this.db.prepare("SELECT * FROM mandates WHERE account_id=? AND status='active'").all(accountId);
    
    for (const mandate of mandates) {
      results.push({
        mandateId: mandate.id,
        status: 'OPTIMIZING',
        action: `Scanning for best value in ${mandate.category}...`
      });
    }
    
    return results;
  }
}

module.exports = SovereignAgent;
