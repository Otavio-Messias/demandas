require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const { query } = require('./db/connection');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function initDB() {
  try {
    console.log('🔧 Verificando banco de dados...');

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        initials TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        color TEXT NOT NULL DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        requester TEXT NOT NULL,
        assignee_id INTEGER NOT NULL REFERENCES users(id),
        priority TEXT NOT NULL DEFAULT 'Média',
        deadline TEXT,
        status TEXT NOT NULL DEFAULT 'Pendente',
        description TEXT DEFAULT '',
        what_to_do TEXT DEFAULT '',
        created_by INTEGER NOT NULL REFERENCES users(id),
        rejection_reason TEXT,
        checklist JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'comment',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migração: adiciona coluna checklist se não existir (bancos já criados antes dessa feature)
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb`);

    // Cria admin se não existir
    const admins = await query("SELECT id FROM users WHERE email = 'admin@empresa.com'");
    if (admins.length === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      await query(
        `INSERT INTO users (name, email, password, initials, role, color) VALUES ($1,$2,$3,$4,$5,$6)`,
        ['Administrador', 'admin@empresa.com', hash, 'AD', 'admin', '#1e293b']
      );
      console.log('✅ Admin criado: admin@empresa.com / admin123');
    }

    console.log('✅ Banco de dados pronto!');
  } catch (err) {
    console.error('❌ Erro ao inicializar banco:', err.message);
  }
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend rodando em http://localhost:${PORT}\n`);
  });
});
