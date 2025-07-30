// === CONFIG DA CONEXÃO COM O BANCO DE DADOS === \\

const { Pool } = require('pg');

const dbConfig ={
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dk_store',
  user: process.env.DB_USER || 'dk_admin',
  password: process.env.DB_PASSWORD || 'dk123456',

  // Configurações de pool de conexões \\
  max: 20, // Máximo de conexões simultâneas no pool
  idleTimeoutMillis: 30000, // Tempo limite para conexões inativas
  connectionTimeoutMillis: 2000, // Tempo limite para tentativas de conexão
};

// Cria pool de conexões \\
const pool = new Pool(dbConfig);

// Função para testar conexão \\
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');

    console.log('✅ Conexão com PostgreSQL estabelecida!');
    console.log('🕒 Data/Hora da conexão:', result.rows[0].now);

    client.release();
    return true;
  }
  
  catch (error) {
    console.error('❌ Erro ao conectar ao PostgreSQL:', error.message);
    return false;
  }
};

// Função para executar queries \\
const query = async (text, params) => {
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    console.log('🔍 Query executada:', { text, duration: `${duration}ms`, rows: result.rowCount });
    return result;
  }

  catch (error) {
    console.error('❌ Erro ao executar query:', { text, error: error.message });
    throw error;
  }
};

// Função para buscar um registro \\
const queryOne = async (text, params) => {
  const result = await query(text, params);
  return result.rows[0]|| null;
};

// Função para buscar múltiplos registros \\
const queryMany = async (text, params) => {
  const result = await query(text, params);
  return result.rows || [];
};

// Função para fechar conexões (cleanup) \\
const closePool = async () => {
  try {
    await pool.end();
    console.log('🔒 Conexão com PostgreSQL fechada!');
  }

  catch (error) {
    console.error('❌ Erro ao fechar conexão:', error.message);
  }
};

module.exports = {
  pool,
  query,
  queryOne,
  queryMany,
  testConnection,
  closePool
};