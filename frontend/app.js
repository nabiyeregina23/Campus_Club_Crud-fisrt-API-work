const params = new URLSearchParams(location.search);
const API_BASE = (params.get('api') || (location.protocol === 'file:' ? 'http://localhost:3000' : '')).replace(/\/$/, '');
const API = `${API_BASE}/api/clubs`;

const $ = (id) => document.getElementById(id);
const form = $('club-form');
const rows = $('club-rows');
const FIELDS = ['name', 'category', 'description', 'president', 'contact_email', 'meeting_day', 'member_count'];
let clubs = [];

function toast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = ''), 3200);
}

async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new Error('Cannot reach the server. Check that the API is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.details && data.details.join(', ')) || data.error || `Request failed (${res.status})`);
  return data;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render(flashId) {
  const q = $('search').value.trim().toLowerCase();
  const list = clubs.filter((c) =>
    !q || [c.name, c.category, c.president, c.meeting_day, c.description].some((v) => (v || '').toLowerCase().includes(q))
  );
  $('count').textContent = `(${list.length}${q ? ` of ${clubs.length}` : ''})`;
  $('empty').hidden = list.length > 0;
  $('empty').textContent = clubs.length ? 'No clubs match your search.' : 'No clubs yet. Add the first one using the form.';
  rows.innerHTML = list.map((c) => `
    <tr data-id="${c.id}" class="${c.id === flashId ? 'flash' : ''}">
      <td class="name"><strong>${esc(c.name)}</strong><span>${esc(c.description || '')}</span></td>
      <td>${esc(c.category)}</td>
      <td>${esc(c.president || '-')}${c.contact_email ? `<br><span style="font-size:.85rem">${esc(c.contact_email)}</span>` : ''}</td>
      <td>${esc(c.meeting_day || '-')}</td>
      <td class="num">${c.member_count}</td>
      <td><div style="display:flex;gap:.4rem">
        <button class="small edit" data-act="edit" data-id="${c.id}">Edit</button>
        <button class="small del" data-act="delete" data-id="${c.id}">Delete</button>
      </div></td>
    </tr>`).join('');
}

async function load() {
  try {
    clubs = await request(API);
    render();
  } catch (e) {
    toast(e.message, true);
  }
}

function resetForm() {
  form.reset();
  $('club-id').value = '';
  $('form-title').textContent = 'Add a club';
  $('save-btn').textContent = 'Add club';
  $('cancel-btn').hidden = true;
  form.classList.remove('editing');
}

function startEdit(id) {
  const c = clubs.find((x) => x.id === id);
  if (!c) return;
  $('club-id').value = c.id;
  FIELDS.forEach((f) => ($(f).value = c[f] ?? ''));
  $('form-title').textContent = `Edit club #${c.id}`;
  $('save-btn').textContent = 'Save changes';
  $('cancel-btn').hidden = false;
  form.classList.add('editing');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('name').focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!$('name').value.trim()) { toast('Club name is required', true); $('name').focus(); return; }
  const body = {};
  FIELDS.forEach((f) => (body[f] = $(f).value));
  const id = $('club-id').value;
  try {
    const saved = id
      ? await request(`${API}/${id}`, { method: 'PUT', body: JSON.stringify(body) })
      : await request(API, { method: 'POST', body: JSON.stringify(body) });
    toast(id ? 'Changes saved' : 'Club added');
    resetForm();
    clubs = await request(API);
    render(saved.id);
  } catch (err) {
    toast(err.message, true);
  }
});

rows.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.act === 'edit') return startEdit(id);
  const club = clubs.find((c) => c.id === id);
  if (!confirm(`Delete "${club ? club.name : 'this club'}"? This cannot be undone.`)) return;
  try {
    await request(`${API}/${id}`, { method: 'DELETE' });
    toast('Club deleted');
    if (Number($('club-id').value) === id) resetForm();
    clubs = clubs.filter((c) => c.id !== id);
    render();
  } catch (err) {
    toast(err.message, true);
  }
});

$('cancel-btn').addEventListener('click', resetForm);
$('search').addEventListener('input', () => render());
load();