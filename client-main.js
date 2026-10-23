const api = {
  async request(route, data = {}) {
    const res = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  async get(route) {
    const res = await fetch(route);
    if (!res.ok) throw await res.json();
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
  console.log('Sovereign Wallet Client Loaded');

  // --- AUTHENTICATION HANDLERS ---
  const loginForm = document.getElementById('signin-form'); // Fixed ID to match login.html
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const data = { 
          email: document.getElementById('signinEmail').value, 
          password: document.getElementById('signinPassword').value 
        };
        const result = await api.request('/api/auth/login', data);
        window.location.href = result.user.role === 'merchant' ? '/merchant.html' : '/bank-interface.html';
      } catch (err) {
        alert(err.error || 'Login failed');
      }
    };
  }

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const data = { 
          name: document.getElementById('signupName').value, 
          email: document.getElementById('signupEmail').value, 
          password: document.getElementById('signupPassword').value, 
          role: document.getElementById('signupRole').value,
          paypalEmail: document.getElementById('signupPaypalEmail').value
        };
        const result = await api.request('/api/auth/signup', data);
        window.location.href = result.user.role === 'merchant' ? '/merchant.html' : '/bank-interface.html';
      } catch (err) {
        alert(err.error || 'Signup failed');
      }
    };
  }

  // --- DASHBOARD HANDLERS ---
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.onclick = () => {
      const viewId = btn.getAttribute('data-view');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(viewId).classList.add('active');
      btn.classList.add('active');
      
      if (viewId === 'activity') loadTransactions();
    };
  });

  const signOutBtn = document.querySelector('.icon-btn[title="Sign out"]');
  if (signOutBtn) {
    signOutBtn.onclick = async () => {
      await api.request('/api/auth/logout');
      window.location.href = '/login.html';
    };
  }

  // --- DATA LOADING ---
  async function loadDashboard() {
    try {
      const user = await api.get('/api/auth/me');
      const accounts = await api.get('/api/accounts');
      
      document.getElementById('identity').textContent = `${user.user.name} · ${user.user.email}`;
      document.getElementById('greeting').textContent = `Good day, ${user.user.name.split(' ')[0]}`;
      
      const account = accounts[0];
      if (account) {
        document.getElementById('balance').textContent = currency(account.balance);
        const balanceData = await api.get(`/api/accounts/${account.accountId}/balance`);
        // Update safe balance or insights if UI elements exist
      }
    } catch (err) {
      if (err.error === 'Sign in required') window.location.href = '/login.html';
    }
  }

  async function loadTransactions() {
    try {
      const user = await api.get('/api/auth/me');
      const accounts = await api.get('/api/accounts');
      const txs = await api.get(`/api/accounts/${accounts[0].accountId}/transactions`);
      
      const list = document.getElementById('all-transactions');
      if (!txs.length) {
        list.innerHTML = '<div class="empty">No transactions found.</div>';
        return;
      }
      
      list.innerHTML = txs.map(tx => `
        <div class="tx">
          <div class="tx-icon">${['paypal_deposit','transfer_in','merchant_sale'].includes(tx.type) ? '↓' : '↑'}</div>
          <div>
            <div class="tx-title">${escapeHtml(tx.reason || tx.type)}</div>
            <div class="tx-meta">${new Date(tx.timestamp).toLocaleString()}</div>
          </div>
          <div class="tx-amount ${['paypal_deposit','transfer_in','merchant_sale'].includes(tx.type) ? 'positive' : 'negative'}">
            ${['paypal_deposit','transfer_in','merchant_sale'].includes(tx.type) ? '+' : '−'}${currency(tx.amount)}
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to load transactions', err);
    }
  }

  if (document.getElementById('balance')) {
    loadDashboard();
  }
});
