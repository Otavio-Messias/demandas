const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne } = require('../db/connection');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, initials: user.initials, color: user.color },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, initials: user.initials, color: user.color }
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, name, email, role, initials, color FROM users WHERE id = $1', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
