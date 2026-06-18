const { Pool } = require('pg');

// Quando estiver no Render, usa a variável DATABASE_URL automaticamente
// Quando estiver rodando local, usa as variáveis do arquivo .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Necessário no Render (SSL obrigatório)
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

// Função simples: executa uma query e retorna as linhas
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// Retorna só a primeira linha (ou undefined)
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0];
}

module.exports = { query, queryOne, pool };
