
-- Criando tabela que armazena produtos adicionados ao carrinho antes da finalização
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    size VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Chaves estrangeiras
    CONSTRAINT fk_cart_items_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_cart_items_product 
        FOREIGN KEY (product_id) 
        REFERENCES products(id) 
        ON DELETE CASCADE,
    
    -- Validações
    CONSTRAINT check_cart_quantity_positive 
        CHECK (quantity > 0),
        
    CONSTRAINT check_cart_quantity_limit 
        CHECK (quantity <= 10),
    
    -- Garantir que não haja itens duplicados no carrinho
    CONSTRAINT unique_product_size_per_user 
        UNIQUE (user_id, product_id, size)
);

-- Índices para melhorar performance das consultas
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);
CREATE INDEX idx_cart_items_created ON cart_items(created_at);

-- Função para limpar carrinho antigo (itens com mais de 30 dias)
CREATE OR REPLACE FUNCTION clean_old_cart_items()
RETURNS VOID AS $$
BEGIN
    DELETE FROM cart_items 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cart_timestamp
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_cart_timestamp();

-- Comentários explicativos para cada tabela e coluna
COMMENT ON TABLE cart_items IS 'Itens temporários no carrinho de compras';
COMMENT ON COLUMN cart_items.id IS 'Identificador único do item no carrinho';
COMMENT ON COLUMN cart_items.user_id IS 'ID do usuário (referência à tabela users)';
COMMENT ON COLUMN cart_items.product_id IS 'ID do produto (referência à tabela products)';
COMMENT ON COLUMN cart_items.quantity IS 'Quantidade desejada (máximo 10)';
COMMENT ON COLUMN cart_items.size IS 'Tamanho escolhido (P, M, G, GG)';
COMMENT ON COLUMN cart_items.created_at IS 'Data e hora de adição ao carrinho';
COMMENT ON COLUMN cart_items.updated_at IS 'Data e hora da última modificação';