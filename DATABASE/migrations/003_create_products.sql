-- Criando a tabela de produtos
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id INTEGER NOT NULL,
  brand VARCHAR(50),
  team VARCHAR(100),
  sport VARCHAR(30),
  size_options JSON NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  sku VARCHAR(50) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Chave estrangeira para tabela de categorias
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON DELETE RESTRICT
);

-- Índices para melhorar performance das consultas
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_brand ON products (brand);
CREATE INDEX idx_products_team ON products (team);
CREATE INDEX idx_products_sport ON products (sport);
CREATE INDEX idx_products_price ON products (price);
CREATE INDEX idx_products_active ON products (is_active);
CREATE INDEX idx_products_sku ON products (sku);

-- Inserindo produtos iniciais da DK STORE
INSERT INTO products (name, description, price, category_id, brand, team, sport, size_options, stock_quantity, sku) VALUES
('Flamengo Home 2024', 'Flamengo temporada 2024', 180.00, 1, 'Adidas', 'Flamengo', 'Futebol', '["P", "M", "G", "GG"]', 50, 'FLA-HOME-2024'),
('Atlético-MG Home 2024', 'Atlético Mineiro temporada 2024', 180.00, 1, 'Adidas', 'Atlético-MG', 'Futebol', '["P", "M", "G", "GG"]', 30, 'CAM-HOME-2024'),
('Vasco Home 2024', 'Vasco da Gama temporada 2024', 180.00, 1, 'Kappa', 'Vasco', 'Futebol', '["P", "M", "G", "GG"]', 25, 'VAS-HOME-2024'),
('Cruzeiro Home 2024', 'Cruzeiro temporada 2024', 180.00, 1, 'Adidas', 'Cruzeiro', 'Futebol', '["P", "M", "G", "GG"]', 40, 'CRU-HOME-2024');

-- Comentários explicativos para cada tabela e coluna
COMMENT ON TABLE products IS 'Produtos da DK STORE (camisas e uniformes)';
COMMENT ON COLUMN products.id IS 'Identificador único do produto';
COMMENT ON COLUMN products.name IS 'Nome completo do produto';
COMMENT ON COLUMN products.description IS 'Descrição detalhada do produto';
COMMENT ON COLUMN products.price IS 'Preço de venda em reais (R$)';
COMMENT ON COLUMN products.category_id IS 'ID da categoria (referência à tabela categories)';
COMMENT ON COLUMN products.brand IS 'Marca do produto (Nike, Adidas, etc.)';
COMMENT ON COLUMN products.team IS 'Time/equipe do produto';
COMMENT ON COLUMN products.sport IS 'Modalidade esportiva (Futebol, Basquete)';
COMMENT ON COLUMN products.size_options IS 'Tamanhos disponíveis em formato JSON';
COMMENT ON COLUMN products.stock_quantity IS 'Quantidade disponível em estoque';
COMMENT ON COLUMN products.sku IS 'Código único do produto (Stock Keeping Unit)';
COMMENT ON COLUMN products.is_active IS 'Indica se o produto está ativo para venda';
COMMENT ON COLUMN products.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN products.updated_at IS 'Data e hora da última atualização';