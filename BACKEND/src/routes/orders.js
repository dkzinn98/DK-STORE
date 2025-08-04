// Cirando sistema completo de carrinho e pedidos

const express = require('express');
const router = express.Router();
const { queryOne, queryMany, query } = require('../config/database');

// Middleware de autenticação
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
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

// ===== CARRINHO DE COMPRAS ===== //

// GET /api/orders/cart - Visualizar carrinho do usuário
router.get('/cart', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Buscar itens do carrinho com informações do produto
        const cartItems = await queryMany(`
            SELECT 
                ci.id, ci.quantity, ci.size, ci.created_at,
                p.id as product_id, p.name as product_name, p.price, p.brand, p.team,
                p.stock_quantity, p.size_options, p.is_active,
                pi.image_url as product_image,
                c.name as category_name,
                (ci.quantity * p.price) as item_total
            FROM cart_items ci
            INNER JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ci.user_id = $1 AND p.is_active = true
            ORDER BY ci.created_at DESC
        `, [userId]);
        
        // Calcular total do carrinho
        const cartTotal = cartItems.reduce((total, item) => {
            return total + parseFloat(item.item_total);
        }, 0);
        
        res.json({
            success: true,
            message: 'Carrinho encontrado com sucesso',
            data: {
                items: cartItems,
                summary: {
                    totalItems: cartItems.length,
                    totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
                    totalAmount: cartTotal.toFixed(2)
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/orders/cart/add - Adicionar produto ao carrinho
router.post('/cart/add', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { product_id, quantity = 1, size } = req.body;
        
        // Validações básicas
        if (!product_id || !size) {
            return res.status(400).json({
                success: false,
                message: 'Produto e tamanho são obrigatórios'
            });
        }
        
        if (quantity <= 0 || quantity > 10) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade deve ser entre 1 e 10'
            });
        }
        
        // Verificar se produto existe e está ativo
        const product = await queryOne(`
            SELECT id, name, price, size_options, stock_quantity, is_active
            FROM products 
            WHERE id = $1 AND is_active = true
        `, [product_id]);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado ou inativo'
            });
        }
        
        // Verificar se tamanho está disponível
        let availableSizes;
        try {
          if (Array.isArray(product.size_options)) {
          // Já é array
          availableSizes = product.size_options;
      } else if (typeof product.size_options === 'string') {
        if (product.size_options.startsWith('[')) {
            // JSON string
            availableSizes = JSON.parse(product.size_options);
        } else {
            // String separada por vírgula
            availableSizes = product.size_options.split(',').map(s => s.trim());
        }
    } else {
        throw new Error('Formato de tamanhos inválido');
    }
} catch (error) {
    console.error('Erro ao processar tamanhos:', error);
    return res.status(500).json({
        success: false,
        message: 'Erro ao processar tamanhos do produto'
    });
}
        
        // Verificar estoque
        if (product.stock_quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: `Estoque insuficiente. Disponível: ${product.stock_quantity}`
            });
        }
        
        // Verificar se item já existe no carrinho
        const existingItem = await queryOne(`
            SELECT id, quantity FROM cart_items 
            WHERE user_id = $1 AND product_id = $2 AND size = $3
        `, [userId, product_id, size]);
        
        if (existingItem) {
            // Atualizar quantidade do item existente
            const newQuantity = existingItem.quantity + quantity;
            
            if (newQuantity > 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantidade máxima por item: 10 unidades'
                });
            }
            
            if (newQuantity > product.stock_quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Estoque insuficiente. Disponível: ${product.stock_quantity}`
                });
            }
            
            await query(`
                UPDATE cart_items 
                SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2
            `, [newQuantity, existingItem.id]);
            
            console.log(`✅ Item atualizado no carrinho: ${product.name} (${size})`);
            
        } else {
            // Adicionar novo item ao carrinho
            await query(`
                INSERT INTO cart_items (user_id, product_id, quantity, size)
                VALUES ($1, $2, $3, $4)
            `, [userId, product_id, quantity, size]);
            
            console.log(`✅ Item adicionado ao carrinho: ${product.name} (${size})`);
        }
        
        res.status(201).json({
            success: true,
            message: 'Produto adicionado ao carrinho com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao adicionar ao carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/orders/cart/:itemId - Atualizar quantidade do item no carrinho
router.put('/cart/:itemId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemId } = req.params;
        const { quantity } = req.body;
        
        if (!quantity || quantity <= 0 || quantity > 10) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade deve ser entre 1 e 10'
            });
        }
        
        // Verificar se item pertence ao usuário
        const cartItem = await queryOne(`
            SELECT ci.*, p.name as product_name, p.stock_quantity
            FROM cart_items ci
            INNER JOIN products p ON ci.product_id = p.id
            WHERE ci.id = $1 AND ci.user_id = $2
        `, [itemId, userId]);
        
        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado no carrinho'
            });
        }
        
        // Verificar estoque
        if (quantity > cartItem.stock_quantity) {
            return res.status(400).json({
                success: false,
                message: `Estoque insuficiente. Disponível: ${cartItem.stock_quantity}`
            });
        }
        
        // Atualizar quantidade
        await query(`
            UPDATE cart_items 
            SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
        `, [quantity, itemId]);
        
        console.log(`✅ Quantidade atualizada: ${cartItem.product_name}`);
        
        res.json({
            success: true,
            message: 'Quantidade atualizada com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/orders/cart/:itemId - Remover item do carrinho
router.delete('/cart/:itemId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemId } = req.params;
        
        // Verificar se item pertence ao usuário
        const cartItem = await queryOne(`
            SELECT ci.*, p.name as product_name
            FROM cart_items ci
            INNER JOIN products p ON ci.product_id = p.id
            WHERE ci.id = $1 AND ci.user_id = $2
        `, [itemId, userId]);
        
        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado no carrinho'
            });
        }
        
        // Remover item
        await query('DELETE FROM cart_items WHERE id = $1', [itemId]);
        
        console.log(`✅ Item removido do carrinho: ${cartItem.product_name}`);
        
        res.json({
            success: true,
            message: 'Item removido do carrinho com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao remover do carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/orders/cart - Limpar carrinho completo
router.delete('/cart', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        await query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
        
        console.log(`✅ Carrinho limpo para usuário: ${userId}`);
        
        res.json({
            success: true,
            message: 'Carrinho limpo com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao limpar carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ===== PEDIDOS ===== //

// POST /api/orders/checkout - Finalizar compra (criar pedido)
router.post('/checkout', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { 
            payment_method = 'credit_card',
            shipping_address,
            notes 
        } = req.body;
        
        // Validar endereço de entrega
        if (!shipping_address || !shipping_address.street || !shipping_address.city || !shipping_address.zipcode) {
            return res.status(400).json({
                success: false,
                message: 'Endereço de entrega completo é obrigatório'
            });
        }
        
        // Buscar itens do carrinho
        const cartItems = await queryMany(`
            SELECT 
                ci.*, p.name as product_name, p.price, p.stock_quantity
            FROM cart_items ci
            INNER JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = $1 AND p.is_active = true
        `, [userId]);
        
        if (cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Carrinho está vazio'
            });
        }
        
        // Verificar estoque de todos os itens
        for (const item of cartItems) {
            if (item.quantity > item.stock_quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Estoque insuficiente para ${item.product_name}. Disponível: ${item.stock_quantity}`
                });
            }
        }
        
        // Calcular total
        const totalAmount = cartItems.reduce((total, item) => {
            return total + (item.quantity * parseFloat(item.price));
        }, 0);
        
        // Criar pedido
        const newOrder = await queryOne(`
            INSERT INTO orders (
                user_id, total_amount, payment_method, shipping_address, notes
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, order_number, total_amount, status, payment_status, created_at
        `, [
            userId, 
            totalAmount, 
            payment_method, 
            JSON.stringify(shipping_address), 
            notes
        ]);
        
        // Criar itens do pedido e atualizar estoque
        const orderItems = [];
        for (const item of cartItems) {
            // Inserir item do pedido
            const orderItem = await queryOne(`
                INSERT INTO order_items (
                    order_id, product_id, quantity, size, unit_price, total_price
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, product_id, quantity, size, unit_price, total_price
            `, [
                newOrder.id,
                item.product_id,
                item.quantity,
                item.size,
                item.price,
                item.quantity * parseFloat(item.price)
            ]);
            
            orderItems.push({
                ...orderItem,
                product_name: item.product_name
            });
            
            // Atualizar estoque
            await query(`
                UPDATE products 
                SET stock_quantity = stock_quantity - $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [item.quantity, item.product_id]);
        }
        
        // Limpar carrinho
        await query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
        
        console.log(`✅ Pedido criado: ${newOrder.order_number} - Total: R$ ${totalAmount}`);
        
        res.status(201).json({
            success: true,
            message: 'Pedido criado com sucesso',
            data: {
                order: newOrder,
                items: orderItems
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no checkout:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/orders - Listar pedidos do usuário
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 10 } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Buscar pedidos do usuário
        const orders = await queryMany(`
            SELECT 
                id, order_number, total_amount, status, payment_method, 
                payment_status, tracking_code, created_at, updated_at
            FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);
        
        // Contar total de pedidos
        const totalResult = await queryOne(
            'SELECT COUNT(*) as total FROM orders WHERE user_id = $1',
            [userId]
        );
        
        const total = parseInt(totalResult.total);
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            success: true,
            message: 'Pedidos encontradas com sucesso',
            data: orders,
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
        console.error('❌ Erro ao buscar pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/orders/:orderId - Buscar pedido específico
router.get('/:orderId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { orderId } = req.params;
        
        // Buscar pedido
        const order = await queryOne(`
            SELECT * FROM orders 
            WHERE id = $1 AND user_id = $2
        `, [orderId, userId]);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Buscar itens do pedido
        const orderItems = await queryMany(`
            SELECT 
                oi.*, p.name as product_name, p.brand, p.team,
                pi.image_url as product_image
            FROM order_items oi
            INNER JOIN products p ON oi.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
            WHERE oi.order_id = $1
        `, [orderId]);
        
        // Parse do endereço JSON
        order.shipping_address = JSON.parse(order.shipping_address);
        
        res.json({
            success: true,
            message: 'Pedido encontrado com sucesso',
            data: {
                order,
                items: orderItems
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/orders/admin/all - Listar todos os pedidos (admin)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            payment_status 
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 0;
        
        if (status) {
            paramCount++;
            whereConditions.push(`status = $${paramCount}`);
            queryParams.push(status);
        }
        
        if (payment_status) {
            paramCount++;
            whereConditions.push(`payment_status = $${paramCount}`);
            queryParams.push(payment_status);
        }
        
        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}`  
            : '';
        
        // Query dos pedidos
        paramCount++;
        const limitParam = paramCount;
        queryParams.push(parseInt(limit));
        
        paramCount++;
        const offsetParam = paramCount;
        queryParams.push(offset);
        
        const orders = await queryMany(`
            SELECT 
                o.*, u.name as customer_name, u.email as customer_email
            FROM orders o
            INNER JOIN users u ON o.user_id = u.id
            ${whereClause}
            ORDER BY o.created_at DESC
            LIMIT $${limitParam} OFFSET $${offsetParam}
        `, queryParams);
        
        // Contar total
        const totalResult = await queryOne(`
            SELECT COUNT(*) as total FROM orders o ${whereClause}
        `, queryParams.slice(0, -2));
        
        const total = parseInt(totalResult.total);
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            success: true,
            message: 'Pedidos encontrados com sucesso',
            data: orders,
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
        console.error('❌ Erro ao buscar pedidos (admin):', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/orders/:orderId/status - Atualizar status do pedido (admin)
router.put('/:orderId/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, payment_status, tracking_code } = req.body;
        
        // Verificar se pedido existe
        const order = await queryOne(
            'SELECT id, order_number FROM orders WHERE id = $1',
            [orderId]
        );
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Atualizar status
        const updatedOrder = await queryOne(`
            UPDATE orders SET
                status = COALESCE($1, status),
                payment_status = COALESCE($2, payment_status),
                tracking_code = COALESCE($3, tracking_code),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, order_number, status, payment_status, tracking_code, updated_at
        `, [status, payment_status, tracking_code, orderId]);
        
        console.log(`✅ Status atualizado para pedido: ${order.order_number}`);
        
        res.json({
            success: true,
            message: 'Status do pedido atualizado com sucesso',
            data: updatedOrder
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;