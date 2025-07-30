
-- Criando tabela que armazena quais produtos estão em cada pedido
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    size VARCHAR(10) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Chaves estrangeiras
    CONSTRAINT fk_order_items_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_order_items_product 
        FOREIGN KEY (product_id) 
        REFERENCES products(id) 
        ON DELETE RESTRICT,
    
    -- Validações
    CONSTRAINT check_quantity_positive 
        CHECK (quantity > 0),
        
    CONSTRAINT check_unit_price_positive 
        CHECK (unit_price > 0),
        
    CONSTRAINT check_total_price_positive 
        CHECK (total_price > 0),
        
    -- Garantir que não haja itens duplicados no mesmo pedido
    CONSTRAINT unique_product_size_per_order 
        UNIQUE (order_id, product_id, size)
);

-- Índices para melhorar performance das consultas
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_size ON order_items(size);

-- Trigger para calcular total_price automaticamente
CREATE OR REPLACE FUNCTION calculate_order_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_order_item_total
    BEFORE INSERT OR UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_item_total();

-- Comentários explicativos para cada tabela e coluna
COMMENT ON TABLE order_items IS 'Itens individuais de cada pedido';
COMMENT ON COLUMN order_items.id IS 'Identificador único do item';
COMMENT ON COLUMN order_items.order_id IS 'ID do pedido (referência à tabela orders)';
COMMENT ON COLUMN order_items.product_id IS 'ID do produto (referência à tabela products)';
COMMENT ON COLUMN order_items.quantity IS 'Quantidade comprada do produto';
COMMENT ON COLUMN order_items.size IS 'Tamanho escolhido (P, M, G, GG)';
COMMENT ON COLUMN order_items.unit_price IS 'Preço unitário na época da compra';
COMMENT ON COLUMN order_items.total_price IS 'Preço total do item (quantity × unit_price)';
COMMENT ON COLUMN order_items.created_at IS 'Data e hora de adição do item';