/**
 * Autonomous Optimizer: The "Financial Agent"
 * Proactively finds "Wins" for the user.
 */
class Optimizer {
  static suggestWins(accountId, currentBalanceCents, transactions) {
    const wins = [];
    
    // Win 1: Idle Cash Detection
    if (currentBalanceCents > 100000) { // > $1,000
      wins.push({
        type: 'IDLE_CASH',
        message: 'You have over $1,000 sitting idle. Moving $500 to a High-Yield account could earn you ~$2.00/mo.',
        action: 'MOVE_TO_SAVINGS',
        amount: 50000
      });
    }

    // Win 2: Subscription Leak Detection
    const subscriptions = transactions.filter(t => t.kind === 'transfer_out' && t.reason.toLowerCase().includes('subscription'));
    if (subscriptions.length > 3) {
      wins.push({
        type: 'SUB_LEAK',
        message: `You have ${subscriptions.length} active subscriptions. Consider auditing them to save ~$${(subscriptions.length * 10).toFixed(2)}/mo.`,
        action: 'AUDIT_SUBSCRIPTIONS'
      });
    }

    return wins;
  }
}

module.exports = Optimizer;
