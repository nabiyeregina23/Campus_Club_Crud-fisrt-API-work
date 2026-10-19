require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const origin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: origin === '*' ? true : origin.split(',').map((s) => s.trim()) }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const FIELDS = ['name', 'category', 'description', 'president', 'contact_email', 'meeting_day', 'member_count'];

function clean(body, existing = {}) {
  const merged = { ...existing };
  for (const f of FIELDS) {
    if (body[f] !== undefined) merged[f] = body[f];
  }
  for (const f of ['name', 'category', 'description', 'president', 'contact_email', 'meeting_day']) {
    if (typeof merged[f] === 'string') merged[f] = merged[f].trim();
    if (merged[f] === '') merged[f] = null;
  }
  if (merged.member_count === '' || merged.member_count == null) merged.member_count = 0;
  merged.member_count = Number(merged.member_count);
  if (!merged.category) merged.category = 'General';
  return merged;
}

function validate(c) {
  const errors = [];
  if (!c.name) errors.push('name is required');
  else if (c.name.length > 120) errors.push('name must be 120 characters or fewer');
  if (!Number.isInteger(c.member_count) || c.member_count < 0) errors.push('member_count must be a whole number, 0 or more');
  if (c.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contact_email)) errors.push('contact_email must be a valid email address');
  return errors;
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'id must be a positive integer' });
    return null;
  }
  return id;
}

const getById = db.prepare('SELECT * FROM clubs WHERE id = ?');

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/clubs', (req, res) => {
  res.json(db.prepare('SELECT * FROM clubs ORDER BY id').all());
});

app.get('/api/clubs/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const club = getById.get(id);
  if (!club) return res.status(404).json({ error: 'Club not found' });
  res.json(club);
});

app.post('/api/clubs', (req, res) => {
  const c = clean(req.body || {});
  const errors = validate(c);
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
  const info = db
    .prepare(`INSERT INTO clubs (${FIELDS.join(', ')}) VALUES (${FIELDS.map((f) => '@' + f).join(', ')})`)
    .run(FIELDS.reduce((o, f) => ({ ...o, [f]: c[f] ?? null }), {}));
  res.status(201).json(getById.get(info.lastInsertRowid));
});

app.put('/api/clubs/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const existing = getById.get(id);
  if (!existing) return res.status(404).json({ error: 'Club not found' });
  const c = clean(req.body || {}, existing);
  const errors = validate(c);
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
  db.prepare(
    `UPDATE clubs SET ${FIELDS.map((f) => `${f} = @${f}`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`
  ).run({ ...FIELDS.reduce((o, f) => ({ ...o, [f]: c[f] ?? null }), {}), id });
  res.json(getById.get(id));
});

app.delete('/api/clubs/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const existing = getById.get(id);
  if (!existing) return res.status(404).json({ error: 'Club not found' });
  db.prepare('DELETE FROM clubs WHERE id = ?').run(id);
  res.json({ message: 'Club deleted', deleted: existing });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Campus Clubs API running on port ${PORT}`));