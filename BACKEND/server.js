// importando dependências necessárias
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { testConnection } = require('./src/config/database');

const categoriesRoutes = require('./src/routes/categories');
const usersRoutes = require('./src/routes/users');
const productsRoutes = require('./src/routes/products');
const uploadsRoutes = require('./src/routes/uploads');

require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env
const app = express(); // Cria instância do Express e inicia o servidor
const PORT = process.env.PORT || 3001; // Define a porta do servidor

// === MIDDLEWARES DE SEGURANÇA === \\
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// === MIDDLEWARES BÁSICOS === \\
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Frontend React/Vite
  credentials: true
}));

app.use(express.json({ limit: '50mb'})); // Para lidar com JSON no corpo das requisições
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Para lidar com formulários

// === SERVIR ARQUIVOS ESTÁTICOS (UPLOADS) === \\
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== ROTAS DA API ===== \\
app.use('/api/categories', categoriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/uploads', uploadsRoutes);

// === ROTA DE TESTE === \\
app.get('/', (req, res) => {
  res.json({
    message: '🏆 DK Store API está funcionando!',
    version: '1.0.0',
    status: 'ONLINE',
    endpoints: {
      categories: '/api/categories',
      users: '/api/users',
      products: '/api/products',
      uploads: '/api/uploads',
      orders: '/api/orders'
    }
  });
});

// === ROTA DE HEALTH CHECK === \\
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// ===  MIDDLEWARE DE ERRO 404 === \\
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.originalUrl} não existe nesta API`
  });
});

// ===== MIDDLEWARE DE TRATAMENTO DE ERROS ===== \\
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);

  res.status(err.status || 500).json({
    error: 'Erro interno do servidor',
    messagem: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado!'
  });
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, async () => {
    console.log(`
🚀 ============================================
🏆 DK Store Backend iniciado com sucesso!
🌐 Servidor rodando em: http://localhost:${PORT}
📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}
🔧 Ambiente: ${process.env.NODE_ENV || 'development'}
============================================
    `);
    
    // Testar conexão com banco
    console.log('\n🔍 Testando conexão com PostgreSQL...');
    await testConnection();
});

// ===== TRATAMENTO DE SINAIS =====
process.on('SIGTERM', () => {
  console.log('🛑 Servidor sendo finalizado...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Servidor interrompido pelo usuário');
  process.exit(0);
});
