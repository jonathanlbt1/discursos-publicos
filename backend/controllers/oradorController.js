const Orador = require('../models/orador');
const pool = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const filters = {
      busca: req.query.busca,
      ativo: req.query.ativo !== undefined ? req.query.ativo === 'true' : undefined,
      congregacao_id: req.query.congregacao_id || undefined
    };
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const oradores = await Orador.getAll(filters, { limit, offset });
    res.json(oradores);
  } catch (error) {
    console.error('Erro ao buscar oradores:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const orador = await Orador.getById(req.params.id);
    if (!orador) {
      return res.status(404).json({ error: 'Orador não encontrado' });
    }
    res.json(orador);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { congregacao_id } = req.body;
    if (congregacao_id) {
      const c = await pool.query('SELECT id FROM congregacoes WHERE id = $1', [congregacao_id]);
      if (c.rowCount === 0) {
        return res.status(400).json({ error: 'Congregação inválida' });
      }
    }
    const orador = await Orador.create(req.body);
    res.status(201).json(orador);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { congregacao_id } = req.body;
    if (congregacao_id) {
      const c = await pool.query('SELECT id FROM congregacoes WHERE id = $1', [congregacao_id]);
      if (c.rowCount === 0) {
        return res.status(400).json({ error: 'Congregação inválida' });
      }
    }
    const orador = await Orador.update(req.params.id, req.body);
    if (!orador) {
      return res.status(404).json({ error: 'Orador não encontrado' });
    }
    res.json(orador);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Orador.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHistorico = async (req, res) => {
  try {
    const historico = await Orador.getHistorico(req.params.id);
    res.json(historico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

