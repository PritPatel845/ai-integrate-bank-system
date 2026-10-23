const { parseCents } = require('./money-utils');

/**
 * Intent Router: Maps Natural Language to API Actions
 * This removes the need for UI buttons and forms.
 */
class IntentRouter {
  constructor(db) {
    this.db = db;
  }

  async resolve(text, user) {
    const input = text.toLowerCase();
    
    // 1. Transfer Intent: "Pay [Name/Email] [Amount] for [Reason]"
    const transferMatch = input.match(/(?:pay|send)\s+([\w\.\@]+)\s+([\$]?\d+(?:\.\d{2})?)\s*(?:for\s+)?(.*)/i);
    if (transferMatch) {
      return {
        action: 'TRANSFER',
        params: {
          recipient: transferMatch[1],
          amount: transferMatch[2],
          reason: transferMatch[3] || 'P2P Transfer'
        }
      };
    }

    // 2. Request Intent: "Request [Amount] from [Name/Email]"
    const requestMatch = input.match(/(?:request|ask for)\s+([\$]?\d+(?:\.\d{2})?)\s+from\s+([\w\.\@]+)/i);
    if (requestMatch) {
      return {
        action: 'REQUEST',
        params: {
          amount: requestMatch[1],
          recipient: requestMatch[2]
        }
      };
    }

    // 3. Balance/Safe-Spend Intent: "how much do I have" or "safe to spend"
    if (input.includes('balance') || input.includes('how much') || input.includes('safe')) {
      return {
        action: 'GET_BALANCE',
        params: {}
      };
    }

    // 4. Contribution Intent: "I helped [Someone] with [Task]"
    const contributeMatch = input.match(/helped\s+(.*)\s+with\s+(.*)/i);
    if (contributeMatch) {
      return {
        action: 'CONTRIBUTE',
        params: {
          target: contributeMatch[1],
          task: contributeMatch[2]
        }
      };
    }

    return { action: 'UNKNOWN', params: {} };
  }
}

module.exports = IntentRouter;
