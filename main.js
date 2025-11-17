/* Lightweight front-end hooks for auth, products, checkout, exams.
   Replace API_BASE with your backend base URL.
   NOTE: storing JWT in localStorage here only for demo. Use HttpOnly cookies in production.
*/
const API_BASE = '/api'; // change to backend origin if needed

function setToken(token){ localStorage.setItem('token', token) }
function getToken(){ return localStorage.getItem('token') }
function authHeaders(){
  const t = getToken(); return t ? { 'Authorization': 'Bearer '+t } : {}
}

async function api(path, opts={}){
  const headers = opts.headers || {};
  opts.headers = Object.assign({'Content-Type':'application/json'}, headers, authHeaders());
  const res = await fetch(API_BASE + path, opts);
  if(res.status===401) {
    // not authorized -> redirect to login
    if(location.pathname !== '/login.html') location.href = '/login.html';
    throw new Error('Unauthorized');
  }
  return res.json();
}

/* Auth forms */
async function registerUser(e){
  e.preventDefault();
  const f = e.target;
  const body = { email: f.email.value, password: f.password.value, name: f.name.value };
  const r = await fetch(API_BASE + '/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  const data = await r.json();
  if(data.token){ setToken(data.token); location.href = '/dashboard.html'; } else { alert(data.error || 'Register failed'); }
}

async function loginUser(e){
  e.preventDefault();
  const f = e.target;
  const body = { email: f.email.value, password: f.password.value };
  const r = await fetch(API_BASE + '/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  const data = await r.json();
  if(data.token){ setToken(data.token); location.href = '/dashboard.html'; } else { alert(data.error || 'Login failed'); }
}

/* listing products (pricing page) */
async function loadProducts(el){
  try{
    const data = await api('/products');
    el.innerHTML = data.map(p=>`
      <div class="card">
        <h4>${p.product.name || p.product.id}</h4>
        <p class="muted">${p.recurring ? 'Subscription' : 'One-off'}</p>
        <div style="display:flex;align-items:center;gap:.5rem;margin-top:.5rem">
          <strong>${(p.unit_amount/100).toFixed(2)} ${p.currency.toUpperCase()}</strong>
          <button class="btn" onclick="startCheckout('${p.id}')">Buy</button>
        </div>
      </div>
    `).join('');
  }catch(err){ el.innerHTML = '<div class="card">無法取得產品資訊</div>' }
}

/* checkout */
async function startCheckout(priceId){
  try{
    // Expect backend to return { url } or { sessionId }
    const res = await api('/create-checkout-session', { method:'POST', body: JSON.stringify({ priceId }) });
    const data = await res;
    if(data.url){ window.location.href = data.url; }
    else if(data.sessionId){ /* if using Stripe.js */ }
  }catch(err){ alert('無法開始支付流程'); }
}

/* dashboard: load exams */
async function loadExams(el){
  try{
    const data = await api('/exams');
    el.innerHTML = data.map(e=>`
      <li>
        <strong>${e.title}</strong>
        <div class="muted">${e.time_limit} minutes • ${e.price ? (e.price/100).toFixed(2)+' HKD' : 'Free'}</div>
        <div style="margin-top:.5rem">
          <a class="btn" href="/exam.html?id=${e.id}">Take exam</a>
        </div>
      </li>
    `).join('');
  }catch(err){
    el.innerHTML = '<li>無法加載考試</li>'
  }
}

/* exam page: start attempt and submit (sketch) */
async function startAttempt(examId){
  const res = await api(`/exams/${examId}/start`, { method:'POST' });
  const data = await res;
  if(data.attemptId) location.href = `/exam.html?id=${examId}&attempt=${data.attemptId}`;
}

/* results page: load attempt and feedback */
async function loadResult(attemptId, el){
  const data = await api(`/attempts/${attemptId}`);
  if(data){
    el.innerHTML = `<div class="card"><h3>Score: ${data.score}</h3><pre>${JSON.stringify(data.feedback,null,2)}</pre></div>`;
  }
}
