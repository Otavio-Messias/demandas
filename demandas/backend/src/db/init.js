require('dotenv').config();
const { query } = require('./connection');
const bcrypt = require('bcryptjs');

async function initDB() {
  console.log('🔧 Criando tabelas...');

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

  console.log('✅ Tabelas criadas!');

  // Cria admin se não existir
  const existing = await query("SELECT id FROM users WHERE email = 'admin@empresa.com'");
  if (existing.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await query(
      `INSERT INTO users (name, email, password, initials, role, color) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['Administrador', 'admin@empresa.com', hash, 'AD', 'admin', '#1e293b']
    );
    console.log('✅ Admin criado: admin@empresa.com / admin123');
  } else {
    console.log('ℹ️  Admin já existe, pulando...');
  }

  console.log('\n🚀 Banco inicializado com sucesso!');
  process.exit(0);
}

initDB().catch(err => {
  console.error('❌ Erro ao inicializar banco:', err.message);
  process.exit(1);
});
