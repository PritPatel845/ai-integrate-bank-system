const path = require('path');

class IntelligenceEngine {
  constructor(db) {
    this.db = db;
  }

  async predictUpcomingExpenses(accountId) {
    try {
      // FIXED: Changed 'type' to 'kind' to match the database schema
      const rows = this.db.prepare("SELECT amount_cents, reason FROM transactions WHERE account_id=? AND status='COMPLETED'").all(accountId);
      
      if (!rows || rows.length === 0) {
        return [];
      }

      const counts = {};
      rows.forEach(txn => {
        const amount = Number(txn.amount_cents);
        const reason = txn.reason || 'Unknown';
        const key = `${amount}_${reason}`;
        counts[key] = (counts[key] || 0) + 1;
      });

      const predictions = [];
      for (const [key, count] of Object.entries(counts)) {
        if (count >= 3) {
          const [amountStr] = key.split('_');
          predictions.push({ amountCents: Number(amountStr), confidence: 'HIGH' });
        }
      }
      return predictions;
    } catch (err) {
      console.error('Prediction Error:', err);
      return [];
    }
  }

  async calculateSafeBalance(accountId, currentBalanceCents) {
    const predictions = await this.predictUpcomingExpenses(accountId);
    const upcomingTotal = predictions.reduce((sum, p) => sum + p.amountCents, 0);
    return {
      currentBalanceCents,
      predictedOutflowCents: upcomingTotal,
      safeBalanceCents: currentBalanceCents - upcomingTotal,
      insights: predictions
    };
  }

  async detectAnomalies(accountId, amountCents, reason) {
    try {
      const rows = this.db.prepare("SELECT amount_cents FROM transactions WHERE account_id=? AND status='COMPLETED'").all(accountId);
      if (!rows || rows.length < 5) { return { isAnomalous: false }; }
      
      const amounts = rows.map(r => Number(r.amount_cents));
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      
      if (amountCents > avg * 3) { 
        return { isAnomalous: true, reason: 'Spending spike' }; 
      }
      return { isAnomalous: false };
    } catch (err) {
      return { isAnomalous: false };
    }
  }
}

module.exports = IntelligenceEngine;
