// Criando rotas para gerenciar usuários (cadastro, login, perfil)

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { queryOne, queryMany, query } = require('../config/database');

const { 
    validationMessages, 
    validateRequiredFields, 
    validateFormats 
} = require('../utils/validationMessages');

// POST /api/users/register - Cadastro de novo usuário
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, cpf } = req.body;
        
        // Validações básicas
        if (!name || !email || !password || !phone || !cpf) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos são obrigatórios'
            });
        }
        
        // Verificar se email já existe
        const existingUser = await queryOne(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: validationMessages.duplicate.email
            });
        }
        
        // Verificar se CPF já existe
        const existingCpf = await queryOne(
            'SELECT id FROM users WHERE cpf = $1',
            [cpf]
        );
        
        if (existingCpf) {
            return res.status(409).json({
                success: false,
                message: validationMessages.duplicate.cpf
            });
        }
        
        // Criptografar senha
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Inserir usuário no banco
        const newUser = await queryOne(`
            INSERT INTO users (name, email, password, phone, cpf, role)
            VALUES ($1, $2, $3, $4, $5, 'customer')
            RETURNING id, name, email, phone, cpf, role, is_active, created_at
        `, [name, email, hashedPassword, phone, cpf]);
        
        console.log('✅ Novo usuário cadastrado:', newUser.email);
        
        res.status(201).json({
            success: true,
            message: validationMessages.success.register,
            data: newUser
        });
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/users/login - Login do usuário
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validações básicas - só email e senha para login
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email e senha são obrigatórios'
            });
        }
        
        // Buscar usuário por email
        const user = await queryOne(
            'SELECT id, name, email, password, phone, cpf, role, is_active FROM users WHERE email = $1',
            [email]
        );
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }
        
        // Verificar se usuário está ativo
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Usuário desativado. Entre em contato com o suporte.'
            });
        }
        
        // Verificar senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }
        
        // Gerar JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Token válido por 7 dias
        );
        
        // Remover senha da resposta
        const { password: _, ...userWithoutPassword } = user;
        
        console.log('✅ Login realizado:', user.email);
        
        res.json({
            success: true,
            message: 'Login realizado com sucesso!',
            data: {
                user: userWithoutPassword,
                token
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/users/profile - Buscar perfil do usuário logado
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const user = await queryOne(
            'SELECT id, name, email, phone, cpf, role, is_active, created_at FROM users WHERE id = $1',
            [userId]
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Perfil encontrado com sucesso',
            data: user
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Middleware de autenticação JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acesso requerido'
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token inválido ou expirado'
            });
        }
        
        req.user = user;
        next();
    });
}

module.exports = router;