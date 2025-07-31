// Criando sistema completo de upload de imagens para produtos

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
            message: 'Acesso negado. Apenas administradores podem fazer upload de imagens.'
        });
    }
    next();
}

// Configuração do Multer para upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../uploads/products');
        
        // Criar pasta se não existir
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Gerar nome único: productId_timestamp_originalname
        const productId = req.params.productId;
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const name = file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '-');
        
        const fileName = `product-${productId}-${timestamp}-${name}${extension}`;
        cb(null, fileName);
    }
});

// Filtros de arquivo
const fileFilter = (req, file, cb) => {
    // Verificar se é imagem
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos de imagem são permitidos'), false);
    }
};

// Configuração do multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 209715200, // 200MB padrão
        files: 10 // Máximo 10 arquivos por upload
    }
});

// POST /api/uploads/products/:productId/images - Upload de imagens para produto
router.post('/products/:productId/images', 
    authenticateToken, 
    requireAdmin, 
    upload.array('images', 10), 
    async (req, res) => {
    try {
        const { productId } = req.params;
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhuma imagem foi enviada'
            });
        }
        
        // Verificar se produto existe
        const product = await queryOne(
            'SELECT id, name FROM products WHERE id = $1 AND is_active = true',
            [productId]
        );
        
        if (!product) {
            // Deletar arquivos se produto não existe
            files.forEach(file => {
                fs.unlinkSync(file.path);
            });
            
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }
        
        // Verificar quantas imagens o produto já tem
        const existingImages = await queryOne(
            'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1',
            [productId]
        );
        
        const currentCount = parseInt(existingImages.count);
        const newCount = currentCount + files.length;
        
        if (newCount > 10) {
            // Deletar arquivos se exceder limite
            files.forEach(file => {
                fs.unlinkSync(file.path);
            });
            
            return res.status(400).json({
                success: false,
                message: `Produto pode ter no máximo 10 imagens. Atualmente tem ${currentCount}, tentando adicionar ${files.length}.`
            });
        }
        
        // Determinar se é a primeira imagem (será a principal)
        const isFirstImage = currentCount === 0;
        
        // Salvar informações das imagens no banco
        const savedImages = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const imageUrl = `/uploads/products/${file.filename}`;
            const altText = `${product.name} - Imagem ${currentCount + i + 1}`;
            const orderPosition = currentCount + i + 1;
            const isPrimary = isFirstImage && i === 0; // Primeira imagem é principal
            
            try {
                const savedImage = await queryOne(`
                    INSERT INTO product_images (
                        product_id, image_url, alt_text, order_position, is_primary, file_size
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id, product_id, image_url, alt_text, order_position, is_primary, created_at
                `, [
                    productId, 
                    imageUrl, 
                    altText, 
                    orderPosition, 
                    isPrimary,
                    file.size
                ]);
                
                savedImages.push(savedImage);
                
            } catch (error) {
                console.error('Erro ao salvar imagem no banco:', error);
                // Deletar arquivo se erro ao salvar
                fs.unlinkSync(file.path);
            }
        }
        
        console.log(`✅ ${savedImages.length} imagens enviadas para produto: ${product.name}`);
        
        res.status(201).json({
            success: true,
            message: `${savedImages.length} imagem(ns) enviada(s) com sucesso`,
            data: {
                product: {
                    id: product.id,
                    name: product.name
                },
                images: savedImages,
                totalImages: currentCount + savedImages.length
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        
        // Limpar arquivos em caso de erro
        if (req.files) {
            req.files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (unlinkError) {
                    console.error('Erro ao deletar arquivo:', unlinkError);
                }
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/uploads/products/:productId/images - Listar imagens de um produto
router.get('/products/:productId/images', async (req, res) => {
    try {
        const { productId } = req.params;
        
        // Verificar se produto existe
        const product = await queryOne(
            'SELECT id, name FROM products WHERE id = $1 AND is_active = true',
            [productId]
        );
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }
        
        // Buscar todas as imagens
        const images = await queryMany(`
            SELECT id, image_url, alt_text, order_position, is_primary, file_size, created_at
            FROM product_images
            WHERE product_id = $1
            ORDER BY order_position
        `, [productId]);
        
        res.json({
            success: true,
            message: 'Imagens encontradas com sucesso',
            data: {
                product: {
                    id: product.id,
                    name: product.name
                },
                images: images,
                totalImages: images.length
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar imagens:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/uploads/products/:productId/images/:imageId - Deletar imagem específica
router.delete('/products/:productId/images/:imageId', 
    authenticateToken, 
    requireAdmin, 
    async (req, res) => {
    try {
        const { productId, imageId } = req.params;
        
        // Buscar imagem
        const image = await queryOne(`
            SELECT pi.*, p.name as product_name
            FROM product_images pi
            INNER JOIN products p ON pi.product_id = p.id
            WHERE pi.id = $1 AND pi.product_id = $2
        `, [imageId, productId]);
        
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Imagem não encontrada'
            });
        }
        
        // Deletar arquivo físico
        const filePath = path.join(__dirname, '../..', image.image_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Deletar do banco
        await query('DELETE FROM product_images WHERE id = $1', [imageId]);
        
        // Se era imagem principal, definir outra como principal
        if (image.is_primary) {
            await query(`
                UPDATE product_images 
                SET is_primary = true 
                WHERE product_id = $1 
                AND id = (
                    SELECT id FROM product_images 
                    WHERE product_id = $1 
                    ORDER BY order_position 
                    LIMIT 1
                )
            `, [productId]);
        }
        
        console.log(`✅ Imagem deletada do produto: ${image.product_name}`);
        
        res.json({
            success: true,
            message: 'Imagem deletada com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao deletar imagem:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/uploads/products/:productId/images/:imageId/primary - Definir imagem como principal
router.put('/products/:productId/images/:imageId/primary', 
    authenticateToken, 
    requireAdmin, 
    async (req, res) => {
    try {
        const { productId, imageId } = req.params;
        
        // Verificar se imagem existe
        const image = await queryOne(
            'SELECT id FROM product_images WHERE id = $1 AND product_id = $2',
            [imageId, productId]
        );
        
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Imagem não encontrada'
            });
        }
        
        // Remover primary de todas as imagens do produto
        await query(
            'UPDATE product_images SET is_primary = false WHERE product_id = $1',
            [productId]
        );
        
        // Definir nova imagem como principal
        await query(
            'UPDATE product_images SET is_primary = true WHERE id = $1',
            [imageId]
        );
        
        console.log(`✅ Nova imagem principal definida para produto ${productId}`);
        
        res.json({
            success: true,
            message: 'Imagem principal definida com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao definir imagem principal:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;