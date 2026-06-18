const express = require('express');
const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../db/connection');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json(await query('SELECT id, name, email, role, initials, color, created_at FROM users ORDER BY name'));
    }
    res.json([await queryOne('SELECT id, name, email, role, initials, color FROM users WHERE id = $1', [req.user.id])]);
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/all', authMiddleware, async (req, res) => {
  try {
    res.json(await query('SELECT id, name, email, initials, color FROM users ORDER BY name'));
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, password, role = 'user', color = '#6366f1' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const hash = bcrypt.hashSync(password, 10);
    const result = await queryOne(
      'INSERT INTO users (name, email, password, initials, role, color) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [name, email.toLowerCase().trim(), hash, initials, role, color]
    );
    res.status(201).json({ id: result.id, name, email, role, initials, color });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && req.user.id !== targetId) return res.status(403).json({ error: 'Sem permissão' });

    const existing = await queryOne('SELECT * FROM users WHERE id = $1', [targetId]);
    if (!existing) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { name, email, password, role, color } = req.body;
    const newPass = password ? bcrypt.hashSync(password, 10) : existing.password;
    const newName = isAdmin && name ? name : existing.name;
    const newEmail = isAdmin && email ? email.toLowerCase().trim() : existing.email;
    const newRole = isAdmin && role ? role : existing.role;
    const newColor = isAdmin && color ? color : existing.color;
    const newInitials = newName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    await query(
      'UPDATE users SET name=$1, email=$2, password=$3, initials=$4, role=$5, color=$6 WHERE id=$7',
      [newName, newEmail, newPass, newInitials, newRole, newColor, targetId]
    );
    res.json({ id: targetId, name: newName, email: newEmail, role: newRole, initials: newInitials, color: newColor });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.user.id) return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    await query('DELETE FROM users WHERE id = $1', [targetId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

module.exports = router;
