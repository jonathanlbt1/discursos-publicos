const Usuario = require('../models/usuario');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-super-secreto-mude-isso-em-producao';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

exports.register = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Validação básica
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

    // Criar usuário
    const usuario = await Usuario.create({ nome, email, senha });

    // Gerar token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, role: usuario.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validação básica
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const usuario = await Usuario.getByEmail(email);
    if (!usuario) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Verificar se está ativo
    if (!usuario.ativo) {
      return res.status(401).json({ error: 'Usuário inativo. Contate o administrador.' });
    }

    // Verificar senha
    const senhaValida = await Usuario.verificarSenha(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Atualizar último acesso
    await Usuario.atualizarUltimoAcesso(usuario.id);

    // Re-fetch user to include updated ultimo_acesso and any other fields
    const usuarioAtualizado = await Usuario.getById(usuario.id);

    // Gerar token (use role from up-to-date record)
    const token = jwt.sign(
      { id: usuarioAtualizado.id, email: usuarioAtualizado.email, role: usuarioAtualizado.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      usuario: usuarioAtualizado
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const usuario = await Usuario.getById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { nome, email } = req.body;
    const usuarioId = req.usuario.id;

    // Verificar se o email já está em uso por outro usuário
    if (email !== req.usuario.email) {
      const emailExistente = await Usuario.getByEmail(email);
      if (emailExistente && emailExistente.id !== usuarioId) {
        return res.status(400).json({ error: 'Este email já está em uso' });
      }
    }

    const usuario = await Usuario.update(usuarioId, {
      nome,
      email,
      role: req.usuario.role, // Mantém o role atual
      ativo: true // Mantém ativo
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      usuario
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    const usuarioId = req.usuario.id;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar usuário com senha
    const usuario = await Usuario.getByEmail(req.usuario.email);
    
    // Verificar senha atual
    const senhaValida = await Usuario.verificarSenha(senhaAtual, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Atualizar senha
    await Usuario.updatePassword(usuarioId, novaSenha);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
};

