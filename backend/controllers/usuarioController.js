const Usuario = require('../models/usuario');

exports.getAll = async (req, res) => {
  try {
    // Se não for admin, retornar apenas o próprio usuário
    if (req.usuario.role !== 'admin') {
      const usuario = await Usuario.getById(req.usuario.id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      return res.json({ items: [usuario], total: 1 });
    }

    // Admin vê todos os usuários
    const filters = {
      busca: req.query.busca,
      role: req.query.role,
      ativo: req.query.ativo !== undefined ? req.query.ativo === 'true' : undefined
    };
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const usuarios = await Usuario.getAll(filters, { limit, offset });
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
};

exports.getById = async (req, res) => {
  try {
    const usuario = await Usuario.getById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Se não for admin, só pode ver o próprio usuário
    if (req.usuario.role !== 'admin' && req.usuario.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode visualizar seu próprio perfil.' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

exports.create = async (req, res) => {
  try {
    const { nome, email, senha, role } = req.body;

    // Apenas roles permitidos: admin e usuario
    const allowedRoles = ['admin', 'usuario'];
    const roleToSet = allowedRoles.includes(role) ? role : 'usuario';

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se o email já existe
    const usuarioExistente = await Usuario.getByEmail(email);
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Este email já está cadastrado' });
    }

    const usuario = await Usuario.create({ nome, email, senha, role: roleToSet });
    res.status(201).json(usuario);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

exports.update = async (req, res) => {
  try {
    const { nome, email, role, ativo } = req.body;
    const userId = req.params.id;

    // Se não for admin, só pode editar o próprio usuário
    if (req.usuario.role !== 'admin' && req.usuario.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode editar seu próprio perfil.' });
    }

    // Verificar se o email já está em uso por outro usuário
    const usuarioAtual = await Usuario.getById(userId);
    if (!usuarioAtual) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (email !== usuarioAtual.email) {
      const emailExistente = await Usuario.getByEmail(email);
      if (emailExistente && emailExistente.id !== parseInt(userId)) {
        return res.status(400).json({ error: 'Este email já está em uso' });
      }
    }

    // Se não for admin, não pode alterar role ou ativo
    let roleToUpdate = role;
    let ativoToUpdate = ativo;
    if (req.usuario.role !== 'admin') {
      // Usuário comum não pode alterar role ou status ativo
      roleToUpdate = usuarioAtual.role;
      ativoToUpdate = usuarioAtual.ativo;
    } else {
      // Impedir que o admin remova seu próprio acesso admin
      if (req.usuario.id === parseInt(userId) && req.usuario.role === 'admin' && role !== 'admin') {
        return res.status(400).json({ error: 'Você não pode remover seu próprio acesso de administrador' });
      }

      // Validar role permitido
      if (role) {
        const allowedRoles = ['admin', 'usuario'];
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({ error: 'Role inválido. Apenas "admin" e "usuario" são permitidos.' });
        }
      }
    }

    const usuario = await Usuario.update(userId, { nome, email, role: roleToUpdate, ativo: ativoToUpdate });
    res.json(usuario);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

exports.delete = async (req, res) => {
  try {
    const userId = req.params.id;

    // Se não for admin, só pode deletar o próprio usuário
    if (req.usuario.role !== 'admin' && req.usuario.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode deletar sua própria conta.' });
    }

    // Impedir que o usuário delete a si mesmo (mesmo admin não pode deletar a si mesmo)
    if (req.usuario.id === parseInt(userId)) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    }

    await Usuario.delete(userId);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { novaSenha } = req.body;
    const userId = req.params.id;

    // Se não for admin, só pode resetar a própria senha
    if (req.usuario.role !== 'admin' && req.usuario.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode resetar sua própria senha.' });
    }

    if (!novaSenha) {
      return res.status(400).json({ error: 'Nova senha é obrigatória' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    await Usuario.updatePassword(userId, novaSenha);
    res.json({ message: 'Senha resetada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
};

