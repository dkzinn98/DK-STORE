-- Criando a tabela de categorias
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  slug VARCHAR(60) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance das consultas
CREATE INDEX idx_categories_name ON categories (name);
CREATE INDEX idx_categories_slug ON categories (slug);
CREATE INDEX idx_categories_active ON categories (is_active);

-- Inserindo categorias iniciais da DK STORE
INSERT INTO categories (name, description, slug, is_active) VALUES
('Futebol','Camisa e uniformes de times de futebol', 'futebol', true),
('Basquete','Camisa e uniformes de times de basquete', 'basquete', true),
('Trainning Suits', 'Uniformes de treino e roupas esportivas', 'trainning-suits', true);


-- Comentários explicativos para cada tabela e coluna
COMMENT ON TABLE categories IS 'Categorias de produtos da DK STORE';
COMMENT ON COLUMN categories.id IS 'Identificador único da categoria';
COMMENT ON COLUMN categories.name IS 'Nome da categoria (Futebol, Basquete)';
COMMENT ON COLUMN categories.description IS 'Descrição detalhada da categoria';
COMMENT ON COLUMN categories.slug IS 'URL amigável (futebol, basquete, trainning-suits)';
COMMENT ON COLUMN categories.is_active IS 'Indica se a categoria está ativa (TRUE) ou inativa (FALSE)';
COMMENT ON COLUMN categories.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN categories.updated_at IS 'Data e hora da última atualização do registro';