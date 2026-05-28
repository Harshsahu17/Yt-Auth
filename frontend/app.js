/*
  ┌─────────────────────────────────────────────────────────┐
  │  TOKEN STORAGE STRATEGY                                  │
  │                                                          │
  │  accessToken  →  JS memory (let accessToken = '')        │
  │    • Page refresh pe chala jaata hai (intentional)       │
  │    • XSS attacks se safe — DOM accessible nahi           │
  │    • localStorage / sessionStorage mein KABHI mat rakho  │
  │                                                          │
  │  refreshToken  →  httpOnly cookie (browser handle karta) │
  │    • JS se read nahi ho sakta                            │
  │    • credentials: 'include' se automatically jaata hai   │
  │    • Backend set / clear karta hai                       │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │  AUTO-REFRESH FLOW (authFetch)                           │
  │                                                          │
  │  1.  Request bhejo  +  Authorization: Bearer <token>     │
  │  2.  Response 401?                                       │
  │        → tryRefresh()  →  POST /refresh-token            │
  │          (cookie browser khud attach karta hai)          │
  │        → naya accessToken milega, memory update hoga     │
  │        → original request retry naye token se            │
  │  3.  Refresh bhi fail?                                   │
  │        → session khatam, login screen dikhao             │
  └─────────────────────────────────────────────────────────┘
*/

const BASE = 'http://localhost:3000/api/auth';

let accessToken  = '';   // sirf memory mein
let pendingEmail = '';   // verify screen ke liye
let isRefreshing = false;

// ── Helpers ───────────────────────────────────────────────

function $(id) {
  return document.getElementById(id);
}

function showAlert(id, msg, type) {
  const el = $(id);
  el.textContent = msg;
  el.className = 'alert ' + type + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 5000);
}

function setLoading(btn, loading, html) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Loading...'
    : html;
}

function updateTokenDisplay(token) {
  $('token-box').textContent = token;
  $('token-box').classList.remove('copied');
  const status = $('token-status');
  status.className = 'token-status valid';
  status.innerHTML = '<span class="dot"></span> valid';
}

function markTokenExpired() {
  const status = $('token-status');
  status.className = 'token-status expired';
  status.innerHTML = '<span class="dot"></span> expired';
}

// ── Screen navigation ─────────────────────────────────────

function switchTab(t) {
  const tabs = document.querySelectorAll('.tab');
  tabs[0].classList.toggle('active', t === 'login');
  tabs[1].classList.toggle('active', t === 'register');
  $('view-login').classList.toggle('active', t === 'login');
  $('view-register').classList.toggle('active', t === 'register');
}

function showAuth() {
  $('auth-card').style.display  = '';
  $('verify-card').style.display = 'none';
  $('dash-card').style.display   = 'none';
  accessToken = '';
}

function showVerify(email) {
  pendingEmail = email;
  $('verify-hint').textContent   = `OTP sent to ${email}`;
  $('otp-input').value           = '';
  $('auth-card').style.display   = 'none';
  $('verify-card').style.display = '';
  $('dash-card').style.display   = 'none';
  setTimeout(() => $('otp-input').focus(), 50);
}

function showDashboard(user, token) {
  accessToken = token;
  $('dash-username').textContent = user.username;
  $('dash-email').textContent    = user.email;
  $('dash-avatar').textContent   = user.username.charAt(0).toUpperCase();
  updateTokenDisplay(token);
  $('auth-card').style.display   = 'none';
  $('verify-card').style.display = 'none';
  $('dash-card').style.display   = '';
}

// ── Core: tryRefresh ──────────────────────────────────────
// Browser automatically refreshToken cookie attach karta hai
// kyunki credentials: 'include' set hai.

async function tryRefresh() {
  try {
    const r = await fetch(BASE + '/refresh-token', {
      method: 'POST',
      credentials: 'include'
    });
    if (!r.ok) return false;
    const d = await r.json();
    accessToken = d.accessToken;
    updateTokenDisplay(d.accessToken);
    showAlert('dash-alert', 'Token auto-refreshed silently ✓', 'info');
    return true;
  } catch {
    return false;
  }
}

// ── Core: authFetch ───────────────────────────────────────
// Har protected API call iske through karo.
// Token expire hone pe silently refresh + retry karta hai.

async function authFetch(url, options = {}) {
  options.credentials = 'include';
  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`
  };

  let response = await fetch(url, options);

  if (response.status === 401 && !isRefreshing) {
    isRefreshing = true;
    markTokenExpired();

    const refreshed = await tryRefresh();
    isRefreshing = false;

    if (refreshed) {
      // Naye token ke saath original request dobara bhejo
      options.headers['Authorization'] = `Bearer ${accessToken}`;
      response = await fetch(url, options);
    } else {
      // Refresh bhi fail — session khatam
      showAuth();
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
}

// ── Register ──────────────────────────────────────────────

async function doRegister() {
  const btn = $('btn-register');
  const u   = $('reg-username').value.trim();
  const e   = $('reg-email').value.trim();
  const p   = $('reg-password').value;

  if (!u || !e || !p) {
    showAlert('reg-alert', 'All fields are required', 'error');
    return;
  }

  setLoading(btn, true);
  try {
    const r = await fetch(BASE + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, email: e, password: p })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message);
    showAlert('reg-alert', d.message, 'success');
    setTimeout(() => showVerify(e), 700);
  } catch (err) {
    showAlert('reg-alert', err.message, 'error');
  }
  setLoading(btn, false, 'Create account');
}

// ── Login ─────────────────────────────────────────────────

async function doLogin() {
  const btn = $('btn-login');
  const e   = $('login-email').value.trim();
  const p   = $('login-password').value;

  if (!e || !p) {
    showAlert('login-alert', 'All fields are required', 'error');
    return;
  }

  setLoading(btn, true);
  try {
    const r = await fetch(BASE + '/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, password: p })
    });
    const d = await r.json();
    if (r.status === 401 && d.message === 'Email not verified') {
      showVerify(e);
      return;
    }
    if (!r.ok) throw new Error(d.message);
    showDashboard(d.user, d.accessToken);
    await doGetMe(); // login ke baad turant get-me hit karo
  } catch (err) {
    showAlert('login-alert', err.message, 'error');
  }
  setLoading(btn, false, 'Login');
}

// ── Verify email ──────────────────────────────────────────

async function doVerify() {
  const btn = $('btn-verify');
  const otp = $('otp-input').value.trim();

  if (!otp) {
    showAlert('verify-alert', 'OTP is required', 'error');
    return;
  }

  setLoading(btn, true);
  try {
    const r = await fetch(BASE + '/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail, otp })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message);
    showAlert('verify-alert', 'Email verified! Please login.', 'success');
    setTimeout(() => showAuth(), 1200);
  } catch (err) {
    showAlert('verify-alert', err.message, 'error');
  }
  setLoading(btn, false, 'Verify');
}

// ── Get Me ────────────────────────────────────────────────
// accessToken se current user fetch karta hai.
// Token expire hua? authFetch silently refresh karega
// aur retry karega — user ko kuch nahi karna padta.

async function doGetMe() {
  const btn      = $('btn-getme');
  const origHTML = btn.innerHTML;
  setLoading(btn, true);
  try {
    const r = await authFetch(BASE + '/get-me');
    const d = await r.json();
    if (!r.ok) throw new Error(d.message);
    $('dash-username').textContent = d.user.username;
    $('dash-email').textContent    = d.user.email;
    $('dash-avatar').textContent   = d.user.username.charAt(0).toUpperCase();
    showAlert('dash-alert', `get-me success: ${d.user.email}`, 'success');
  } catch (err) {
    showAlert('dash-alert', err.message, 'error');
  }
  setLoading(btn, false, origHTML);
}

// ── Manual refresh ────────────────────────────────────────

async function doManualRefresh() {
  const btn      = $('btn-refresh');
  const origHTML = btn.innerHTML;
  setLoading(btn, true);
  try {
    const ok = await tryRefresh();
    if (!ok) throw new Error('Refresh failed — please login again');
    showAlert('dash-alert', 'Token manually refreshed', 'success');
  } catch (err) {
    showAlert('dash-alert', err.message, 'error');
  }
  setLoading(btn, false, origHTML);
}

// ── Logout ────────────────────────────────────────────────

async function doLogout() {
  try {
    const r = await authFetch(BASE + '/logout', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message);
  } catch (_) {
    // session invalid ho tab bhi locally logout karo
  }
  showAuth();
}

async function doLogoutAll() {
  try {
    const r = await authFetch(BASE + '/logout-all', { method: 'POST' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message);
  } catch (_) {
    // same as above
  }
  showAuth();
}

// ── Copy token ────────────────────────────────────────────

function copyToken() {
  if (!accessToken) return;
  navigator.clipboard.writeText(accessToken).then(() => {
    const box = $('token-box');
    box.classList.add('copied');
    box.textContent = '✓ Copied to clipboard';
    setTimeout(() => {
      box.classList.remove('copied');
      box.textContent = accessToken;
    }, 1500);
  });
}

// ── Enter key support ─────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if ($('verify-card').style.display !== 'none')       { doVerify();   return; }
  if ($('view-login').classList.contains('active'))    { doLogin();    return; }
  if ($('view-register').classList.contains('active')) { doRegister(); return; }
});
