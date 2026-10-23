const api = {
  async request(route, data = {}) {
    const res = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      let payload = null;
      try {
        payload = await res.json();
      } catch (error) {}
      throw payload || { error: 'Request failed' };
    }
    return res.json();
  },
  async get(route) {
    const res = await fetch(route);
    if (!res.ok) {
      let payload = null;
      try {
        payload = await res.json();
      } catch (error) {}
      throw payload || { error: 'Request failed' };
    }
    return res.json();
  }
};

function currency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('signin-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signinEmail')?.value || '';
      const password = document.getElementById('signinPassword')?.value || '';
      try {
        const result = await api.request('/api/auth/login', { email, password });
        if (result.user && result.user.role === 'merchant') {
          window.location.href = '/merchant.html';
          return;
        }
        window.location.href = '/bank-interface.html';
      } catch (err) {
        alert(err && err.error ? err.error : 'Login failed');
      }
    });
  }

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('signupName')?.value || '',
        email: document.getElementById('signupEmail')?.value || '',
        password: document.getElementById('signupPassword')?.value || '',
        role: document.getElementById('signupRole')?.value || 'customer',
        paypalEmail: document.getElementById('signupPaypalEmail')?.value || ''
      };
      try {
        const result = await api.request('/api/auth/signup', payload);
        if (result.user && result.user.role === 'merchant') {
          window.location.href = '/merchant.html';
          return;
        }
        window.location.href = '/bank-interface.html';
      } catch (err) {
        alert(err && err.error ? err.error : 'Signup failed');
      }
    });
  }

  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      const target = document.getElementById(viewId);
      if (target) target.classList.add('active');
      btn.classList.add('active');
      if (viewId === 'activity') loadTransactions();
    });
  });

  const signOutBtn = document.querySelector('.icon-btn[title="Sign out"]');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        await api.request('/api/auth/logout', {});
      } catch (error) {}
      window.location.href = '/login.html';
    });
  }

  async function loadDashboard() {
    try {
      const userResponse = await api.get('/api/auth/me');
      const accounts = await api.get('/api/accounts');
      const user = userResponse.user;

      const identityEl = document.getElementById('identity');
      const greetingEl = document.getElementById('greeting');
      if (identityEl) identityEl.textContent = `${user.name || user.email} · ${user.email}`;
      if (greetingEl) greetingEl.textContent = `Good day, ${(user.name || user.email).split(' ')[0]}`;

      const account = accounts[0];
      const balanceEl = document.getElementById('balance');
      if (account && balanceEl) {
        balanceEl.textContent = currency(account.balance);
        const balanceData = await api.get(`/api/accounts/${account.accountId}/balance`);
        const safeBalanceEl = document.getElementById('safe-balance');
        if (safeBalanceEl) safeBalanceEl.textContent = currency(balanceData.safeBalance || 0);
      }
    } catch (err) {
      if (err && err.error === 'Sign in required') {
        window.location.href = '/login.html';
      }
    }
  }

  async function loadTransactions() {
    try {
      const user = await api.get('/api/auth/me');
      const accounts = await api.get('/api/accounts');
      if (!accounts.length) return;
      const txs = await api.get(`/api/accounts/${accounts[0].accountId}/transactions`);
      const list = document.getElementById('all-transactions');
      if (!list) return;
      if (!txs.length) {
        list.innerHTML = '<div class="empty">No transactions found.</div>';
        return;
      }
      list.innerHTML = txs.map(tx => {
        const isPositive = ['paypal_deposit', 'transfer_in', 'merchant_sale'].includes(tx.type) || Number(tx.amount) >= 0;
        const sign = isPositive ? '+' : '−';
        return `
          <div class="tx">
            <div class="tx-icon">${isPositive ? '↓' : '↑'}</div>
            <div>
              <div class="tx-title">${escapeHtml(tx.reason || tx.type)}</div>
              <div class="tx-meta">${new Date(tx.timestamp).toLocaleString()}</div>
            </div>
            <div class="tx-amount ${isPositive ? 'positive' : 'negative'}">
              ${sign}${currency(tx.amount)}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load transactions', err);
    }
  }

  if (document.getElementById('balance')) {
    loadDashboard();
  }
});
