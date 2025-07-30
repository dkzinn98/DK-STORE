// Criando rotas para gerenciar categorias (Futebol, Basquete, Training Suits)

const express = require('express');
const router = express.Router();
const { queryMany, queryOne } = require('../config/database');

// GET /api/categories - Listar todas as categorias
router.get('/', async (req, res) => {
    try {
        console.log('📋 Buscando todas as categorias...');
        
        const categories = await queryMany(`
            SELECT id, name, description, slug, is_active, created_at
            FROM categories 
            WHERE is_active = true 
            ORDER BY name
        `);
        
        res.json({
            success: true,
            message: 'Categorias encontradas com sucesso',
            data: categories,
            count: categories.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar categorias:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/categories/:id - Buscar categoria por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🔍 Buscando categoria ID: ${id}`);
        
        const category = await queryOne(`
            SELECT id, name, description, slug, is_active, created_at
            FROM categories 
            WHERE id = $1 AND is_active = true
        `, [id]);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Categoria não encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Categoria encontrada com sucesso',
            data: category
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar categoria:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/categories/:slug/products - Buscar produtos de uma categoria
router.get('/:slug/products', async (req, res) => {
    try {
        const { slug } = req.params;
        
        console.log(`🛍️ Buscando produtos da categoria: ${slug}`);
        
        const products = await queryMany(`
            SELECT 
                p.id, p.name, p.description, p.price, p.brand, p.team, p.sport,
                p.size_options, p.stock_quantity, p.sku,
                c.name as category_name, c.slug as category_slug
            FROM products p
            INNER JOIN categories c ON p.category_id = c.id
            WHERE c.slug = $1 AND p.is_active = true AND c.is_active = true
            ORDER BY p.name
        `, [slug]);
        
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum produto encontrado para esta categoria'
            });
        }
        
        res.json({
            success: true,
            message: `Produtos da categoria ${slug} encontrados`,
            data: products,
            count: products.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar produtos da categoria:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;