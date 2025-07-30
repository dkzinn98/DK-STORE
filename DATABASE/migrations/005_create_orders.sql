-- Criando tabela de armazenamento de pedidos feitos
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(30),
    payment_status VARCHAR(20) DEFAULT 'pending',
    shipping_address JSON NOT NULL,
    tracking_code VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Chave estrangeira para usuários
    CONSTRAINT fk_orders_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE RESTRICT,
    
    -- Validação de status do pedido
    CONSTRAINT check_order_status 
        CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled')),
    
    -- Validação de método de pagamento
    CONSTRAINT check_payment_method 
        CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'boleto')),
    
    -- Validação de status do pagamento
    CONSTRAINT check_payment_status 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'))
);

-- Índices para melhorar performance das consultas
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Função para gerar número do pedido automaticamente
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'DK' || TO_CHAR(NEW.created_at, 'YYYY') || LPAD(NEW.id::text, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número do pedido
CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Comentários explicativos para cada tabela e coluna
COMMENT ON TABLE orders IS 'Pedidos realizados pelos clientes';
COMMENT ON COLUMN orders.id IS 'Identificador único do pedido';
COMMENT ON COLUMN orders.user_id IS 'ID do cliente (referência à tabela users)';
COMMENT ON COLUMN orders.order_number IS 'Número do pedido (DK2024000001)';
COMMENT ON COLUMN orders.total_amount IS 'Valor total do pedido em reais';
COMMENT ON COLUMN orders.status IS 'Status do pedido (pending, confirmed, processing, shipped, delivered, cancelled)';
COMMENT ON COLUMN orders.payment_method IS 'Método de pagamento escolhido';
COMMENT ON COLUMN orders.payment_status IS 'Status do pagamento (pending, paid, failed, refunded)';
COMMENT ON COLUMN orders.shipping_address IS 'Endereço de entrega em formato JSON';
COMMENT ON COLUMN orders.tracking_code IS 'Código de rastreamento dos Correios';
COMMENT ON COLUMN orders.notes IS 'Observações do pedido';
COMMENT ON COLUMN orders.created_at IS 'Data e hora de criação do pedido';
COMMENT ON COLUMN orders.updated_at IS 'Data e hora da última atualização';