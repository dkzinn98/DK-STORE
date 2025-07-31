// Criando API completa para gerenciar produtos (CRUD)

const express = require('express');
const router = express.Router();
const { queryOne, queryMany, query } = require('../config/database');

// Middleware de autenticação (importado do users.js)
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acesso requerido'
        });
    }
    
    const jwt = require('jsonwebtoken');
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

// Middleware de autorização (só admin)
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado. Apenas administradores podem realizar esta ação.'
        });
    }
    next();
}

// GET /api/products - Listar todos os produtos (público)
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            category, 
            sport, 
            team, 
            brand,
            min_price,
            max_price,
            search 
        } = req.query;
        
        let whereConditions = ['p.is_active = true'];
        let queryParams = [];
        let paramCount = 0;
        
        // Filtros dinâmicos
        if (category) {
            paramCount++;
            whereConditions.push(`c.slug = $${paramCount}`);
            queryParams.push(category);
        }
        
        if (sport) {
            paramCount++;
            whereConditions.push(`p.sport ILIKE $${paramCount}`);
            queryParams.push(`%${sport}%`);
        }
        
        if (team) {
            paramCount++;
            whereConditions.push(`p.team ILIKE $${paramCount}`);
            queryParams.push(`%${team}%`);
        }
        
        if (brand) {
            paramCount++;
            whereConditions.push(`p.brand ILIKE $${paramCount}`);
            queryParams.push(`%${brand}%`);
        }
        
        if (min_price) {
            paramCount++;
            whereConditions.push(`p.price >= $${paramCount}`);
            queryParams.push(parseFloat(min_price));
        }
        
        if (max_price) {
            paramCount++;
            whereConditions.push(`p.price <= $${paramCount}`);
            queryParams.push(parseFloat(max_price));
        }
        
        if (search) {
            paramCount++;
            whereConditions.push(`(p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.team ILIKE $${paramCount})`);
            queryParams.push(`%${search}%`);
        }
        
        // Paginação
        const offset = (page - 1) * limit;
        paramCount++;
        const limitParam = paramCount;
        queryParams.push(parseInt(limit));
        
        paramCount++;
        const offsetParam = paramCount;
        queryParams.push(offset);
        
        // Query principal
        const productsQuery = `
            SELECT 
                p.id, p.name, p.description, p.price, p.brand, p.team, p.sport,
                p.size_options, p.stock_quantity, p.sku, p.created_at,
                c.name as category_name, c.slug as category_slug,
                pi.image_url as main_image
            FROM products p
            INNER JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY p.created_at DESC
            LIMIT $${limitParam} OFFSET $${offsetParam}
        `;
        
        // Query para contar total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM products p
            INNER JOIN categories c ON p.category_id = c.id
            WHERE ${whereConditions.join(' AND ')}
        `;
        
        const products = await queryMany(productsQuery, queryParams);
        const countResult = await queryOne(countQuery, queryParams.slice(0, -2)); // Remove limit e offset
        
        const total = parseInt(countResult.total);
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            success: true,
            message: 'Produtos encontrados com sucesso',
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar produtos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/products/:id - Buscar produto específico (público)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscar produto com categoria
        const product = await queryOne(`
            SELECT 
                p.id, p.name, p.description, p.price, p.brand, p.team, p.sport,
                p.size_options, p.stock_quantity, p.sku, p.is_active, p.created_at, p.updated_at,
                c.name as category_name, c.slug as category_slug
            FROM products p
            INNER JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1 AND p.is_active = true
        `, [id]);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }
        
        // Buscar todas as imagens do produto
        const images = await queryMany(`
            SELECT id, image_url, alt_text, order_position, is_primary
            FROM product_images
            WHERE product_id = $1
            ORDER BY order_position
        `, [id]);
        
        // Adicionar imagens ao produto
        product.images = images;
        
        res.json({
            success: true,
            message: 'Produto encontrado com sucesso',
            data: product
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/products - Criar novo produto (admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            category_id,
            brand,
            team,
            sport,
            size_options,
            stock_quantity = 0,
            sku
        } = req.body;
        
        // Validações básicas
        if (!name || !price || !category_id || !sport) {
            return res.status(400).json({
                success: false,
                message: 'Nome, preço, categoria e esporte são obrigatórios'
            });
        }
        
        // Verificar se categoria existe
        const categoryExists = await queryOne(
            'SELECT id FROM categories WHERE id = $1 AND is_active = true',
            [category_id]
        );
        
        if (!categoryExists) {
            return res.status(400).json({
                success: false,
                message: 'Categoria não encontrada ou inativa'
            });
        }
        
        // Verificar se SKU já existe (se fornecido)
        if (sku) {
            const existingSku = await queryOne(
                'SELECT id FROM products WHERE sku = $1 AND is_active = true',
                [sku]
            );
            
            if (existingSku) {
                return res.status(409).json({
                    success: false,
                    message: 'SKU já existe'
                });
            }
        }
        
        // Inserir produto
        const newProduct = await queryOne(`
            INSERT INTO products (
                name, description, price, category_id, brand, team, sport,
                size_options, stock_quantity, sku
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, name, description, price, category_id, brand, team, sport,
                     size_options, stock_quantity, sku, is_active, created_at
        `, [
            name, description, price, category_id, brand, team, sport,
            JSON.stringify(size_options), stock_quantity, sku
        ]);
        
        console.log('✅ Novo produto criado:', newProduct.name);
        
        res.status(201).json({
            success: true,
            message: 'Produto criado com sucesso',
            data: newProduct
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/products/:id - Atualizar produto (admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            price,
            category_id,
            brand,
            team,
            sport,
            size_options,
            stock_quantity,
            sku,
            is_active = true
        } = req.body;
        
        // Verificar se produto existe
        const existingProduct = await queryOne(
            'SELECT id FROM products WHERE id = $1',
            [id]
        );
        
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }
        
        // Verificar se categoria existe (se fornecida)
        if (category_id) {
            const categoryExists = await queryOne(
                'SELECT id FROM categories WHERE id = $1 AND is_active = true',
                [category_id]
            );
            
            if (!categoryExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Categoria não encontrada ou inativa'
                });
            }
        }
        
        // Verificar se SKU já existe em outro produto (se fornecido)
        if (sku) {
            const existingSku = await queryOne(
                'SELECT id FROM products WHERE sku = $1 AND id != $2 AND is_active = true',
                [sku, id]
            );
            
            if (existingSku) {
                return res.status(409).json({
                    success: false,
                    message: 'SKU já existe em outro produto'
                });
            }
        }
        
        // Atualizar produto
        const updatedProduct = await queryOne(`
            UPDATE products SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                price = COALESCE($3, price),
                category_id = COALESCE($4, category_id),
                brand = COALESCE($5, brand),
                team = COALESCE($6, team),
                sport = COALESCE($7, sport),
                size_options = COALESCE($8, size_options),
                stock_quantity = COALESCE($9, stock_quantity),
                sku = COALESCE($10, sku),
                is_active = COALESCE($11, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING id, name, description, price, category_id, brand, team, sport,
                     size_options, stock_quantity, sku, is_active, created_at, updated_at
        `, [
            name, description, price, category_id, brand, team, sport,
            size_options ? JSON.stringify(size_options) : null,
            stock_quantity, sku, is_active, id
        ]);
        
        console.log('✅ Produto atualizado:', updatedProduct.name);
        
        res.json({
            success: true,
            message: 'Produto atualizado com sucesso',
            data: updatedProduct
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/products/:id - Deletar produto (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se produto existe
        const existingProduct = await queryOne(
            'SELECT id, name FROM products WHERE id = $1',
            [id]
        );
        
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }
        
        // Soft delete - apenas desativar o produto
        await query(
            'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
        
        console.log('✅ Produto desativado:', existingProduct.name);
        
        res.json({
            success: true,
            message: 'Produto removido com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao deletar produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;