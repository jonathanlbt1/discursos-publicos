const Congregacao = require('../models/congregacao');

exports.getAll = async (req, res) => {
  try {
    const filters = {
      busca: req.query.busca
    };
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const congregacoes = await Congregacao.getAll(filters, { limit, offset });
    res.json(congregacoes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const congregacao = await Congregacao.getById(req.params.id);
    if (!congregacao) {
      return res.status(404).json({ error: 'Congregação não encontrada' });
    }
    res.json(congregacao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const congregacao = await Congregacao.create(req.body);
    res.status(201).json(congregacao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const congregacao = await Congregacao.update(req.params.id, req.body);
    if (!congregacao) {
      return res.status(404).json({ error: 'Congregação não encontrada' });
    }
    res.json(congregacao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Congregacao.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHistoricoRecebidos = async (req, res) => {
  try {
    const historico = await Congregacao.getHistoricoRecebidos(req.params.id);
    res.json(historico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

