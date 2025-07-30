-- Criando a tabela de imagens de produtos
CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(200),
  order_position INTEGER NOT NULL DEFAULT 1,
  is_primary BOOLEAN DEFAULT false,
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Chave estrangeira para tabela de produtos
  CONSTRAINT fk_product_images_products
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  -- Garantir que só uma imagem seja principal por produto
  CONSTRAINT unique_primary_per_product
    UNIQUE (product_id, is_primary)
    DEFERRABLE INITIALLY DEFERRED,

  -- Garantir ordem única por produto
  CONSTRAINT unique_order_per_product
    UNIQUE (product_id, order_position),

  -- Limitar a 10 imagens por produto
  CONSTRAINT check_max_images_per_product
    CHECK (order_position BETWEEN 1 AND 10)
);

-- Índices para melhorar performance das consultas
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(is_primary);
CREATE INDEX idx_product_images_order ON product_images(product_id, order_position);

-- ínserindo imagens iniciais para os produtos
INSERT INTO product_images (product_id, image_url, alt_text, order_position, is_primary) VALUES
-- Flamengo (product_id = 1)
(1, '/uploads/products/flamengo-home-2024-1.jpg', 'Camisa Flamengo Home 2024 - Frente', 1, true),
(1, '/uploads/products/flamengo-home-2024-2.jpg', 'Camisa Flamengo Home 2024 - Costas', 2, false),
-- Atlético-MG (product_id = 2)
(2, '/uploads/products/atletico-mg-home-2024-1.jpg', 'Camisa Atlético-MG Home 2024 - Frente', 1, true),
(2, '/uploads/products/atletico-mg-home-2024-2.jpg', 'Camisa Atlético-MG Home 2024 - Costas', 2, false),
-- Vasco (product_id = 3)
(3, '/uploads/products/vasco-home-2024-1.jpg', 'Camisa Vasco Home 2024 - Frente', 1, true),
(3, '/uploads/products/vasco-home-2024-2.jpg', 'Camisa Vasco Home 2024 - Costas', 2, false),
-- Cruzeiro (product_id = 4)
(4, '/uploads/products/cruzeiro-home-2024-1.jpg', 'Camisa Cruzeiro Home 2024 - Frente', 1, true),
(4, '/uploads/products/cruzeiro-home-2024-2.jpg', 'Camisa Cruzeiro Home 2024 - Costas', 2, false);


-- Comentários explicativos para cada tabela e coluna
COMMENT ON TABLE product_images IS 'Imagens dos produtos (até 10 por produto)';
COMMENT ON COLUMN product_images.id IS 'Identificador único da imagem';
COMMENT ON COLUMN product_images.product_id IS 'ID do produto (referência à tabela products)';
COMMENT ON COLUMN product_images.image_url IS 'Caminho/URL da imagem';
COMMENT ON COLUMN product_images.alt_text IS 'Texto alternativo para acessibilidade e SEO';
COMMENT ON COLUMN product_images.order_position IS 'Ordem de exibição (1 a 10)';
COMMENT ON COLUMN product_images.is_primary IS 'Indica se é a imagem principal do produto';
COMMENT ON COLUMN product_images.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN product_images.created_at IS 'Data e hora de upload da imagem';
COMMENT ON COLUMN product_images.updated_at IS 'Data e hora da última atualização';