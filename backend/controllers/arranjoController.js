const Arranjo = require('../models/arranjo');

exports.getAll = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const arranjos = await Arranjo.getAll({}, { limit, offset });
    res.json(arranjos);
  } catch (error) {
    console.error('Erro ao buscar arranjos:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const arranjo = await Arranjo.getById(req.params.id);
    if (!arranjo) {
      return res.status(404).json({ error: 'Arranjo não encontrado' });
    }
    res.json(arranjo);
  } catch (error) {
    console.error('Erro ao buscar arranjo:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { ano, mes, congregacoes } = req.body;

    if (!ano || !mes) {
      return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
    }

    if (!congregacoes || !Array.isArray(congregacoes) || congregacoes.length === 0) {
      return res.status(400).json({ error: 'É necessário selecionar pelo menos uma congregação' });
    }

    const arranjo = await Arranjo.create({ ano, mes, congregacoes });
    res.status(201).json(arranjo);
  } catch (error) {
    console.error('Erro ao criar arranjo:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { ano, mes, congregacoes } = req.body;

    if (!ano || !mes) {
      return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
    }

    if (!congregacoes || !Array.isArray(congregacoes) || congregacoes.length === 0) {
      return res.status(400).json({ error: 'É necessário selecionar pelo menos uma congregação' });
    }

    const arranjo = await Arranjo.update(req.params.id, { ano, mes, congregacoes });
    if (!arranjo) {
      return res.status(404).json({ error: 'Arranjo não encontrado' });
    }
    res.json(arranjo);
  } catch (error) {
    console.error('Erro ao atualizar arranjo:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Arranjo.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir arranjo:', error);
    res.status(500).json({ error: error.message });
  }
};

