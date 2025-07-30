-- Criando a tabela de usuários
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'customer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance das consultas
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_cpf ON users (cpf);
CREATE INDEX idx_users_role ON users (role);

-- Comentários explicativos para cada tabela e coluna

COMMENT ON TABLE users IS 'Tabela de usuários (normais e admins)';
COMMENT ON COLUMN users.id IS 'Identificador único do usuário';
COMMENT ON COLUMN users.name IS 'Nome completo do usuário';
COMMENT ON COLUMN users.email IS 'Endereço de e-mail do usuário';
COMMENT ON COLUMN users.password IS 'Senha criptografada do usuário';
COMMENT ON COLUMN users.phone IS 'Número de telefone do usuário';
COMMENT ON COLUMN users.cpf IS 'CPF do usuário';
COMMENT ON COLUMN users.role IS 'Tipo de usuário (customer/normal, admin)';
COMMENT ON COLUMN users.is_active IS 'Indica se o usuário está ativo (TRUE) ou inativo (FALSE)';
COMMENT ON COLUMN users.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN users.updated_at IS 'Data e hora da última atualização do registro';