// Criando mensagens de validação padronizadas para Frontend e Backend

const validationMessages = {
    // Campos obrigatórios
    required: {
        name: 'Nome completo é obrigatório',
        email: 'Email é obrigatório',
        password: 'Senha é obrigatória',
        phone: 'Telefone é obrigatório',
        cpf: 'CPF é obrigatório',
        allFields: 'Todos os campos são obrigatórios'
    },
    
    // Formatos inválidos
    format: {
        email: 'Email deve ter um formato válido',
        phone: 'Telefone deve ter um formato válido',
        cpf: 'CPF deve ter um formato válido',
        password: 'Senha deve ter pelo menos 6 caracteres'
    },
    
    // Duplicatas (só backend)
    duplicate: {
        email: 'Este email já está cadastrado',
        cpf: 'Este CPF já está cadastrado'
    },
    
    // Login
    login: {
        invalidCredentials: 'Email ou senha incorretos',
        userInactive: 'Usuário desativado. Entre em contato com o suporte.',
        missingFields: 'Email e senha são obrigatórios'
    },
    
    // Sucesso
    success: {
        register: 'Usuário cadastrado com sucesso!',
        login: 'Login realizado com sucesso!',
        profileFound: 'Perfil encontrado com sucesso'
    },
    
    // Autenticação
    auth: {
        tokenRequired: 'Token de acesso requerido',
        tokenInvalid: 'Token inválido ou expirado',
        userNotFound: 'Usuário não encontrado'
    },
    
    // Erros gerais
    general: {
        serverError: 'Erro interno do servidor',
        notFound: 'Recurso não encontrado'
    }
};

// Função para validar email (mesmo regex para front e back)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateEmail = (email) => emailRegex.test(email);

// Função para validar CPF (mesmo regex para front e back)
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;
const validateCPF = (cpf) => cpfRegex.test(cpf);

// Função para validar telefone (mesmo regex para front e back)
const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/;
const validatePhone = (phone) => phoneRegex.test(phone);

// Função para validar senha
const validatePassword = (password) => password && password.length >= 6;

// Função para validar todos os campos obrigatórios
const validateRequiredFields = (fields) => {
    const errors = [];
    
    if (!fields.name?.trim()) errors.push(validationMessages.required.name);
    if (!fields.email?.trim()) errors.push(validationMessages.required.email);
    if (!fields.password?.trim()) errors.push(validationMessages.required.password);
    if (!fields.phone?.trim()) errors.push(validationMessages.required.phone);
    if (!fields.cpf?.trim()) errors.push(validationMessages.required.cpf);
    
    return errors;
};

// Função para validar formatos
const validateFormats = (fields) => {
    const errors = [];
    
    if (fields.email && !validateEmail(fields.email)) {
        errors.push(validationMessages.format.email);
    }
    
    if (fields.phone && !validatePhone(fields.phone)) {
        errors.push(validationMessages.format.phone);
    }
    
    if (fields.cpf && !validateCPF(fields.cpf)) {
        errors.push(validationMessages.format.cpf);
    }
    
    if (fields.password && !validatePassword(fields.password)) {
        errors.push(validationMessages.format.password);
    }
    
    return errors;
};

module.exports = {
    validationMessages,
    validateEmail,
    validateCPF,
    validatePhone,
    validatePassword,
    validateRequiredFields,
    validateFormats
};