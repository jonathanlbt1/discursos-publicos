const Discurso = require('../models/discurso');
const { differenceInMonths, parseISO } = require('date-fns');

exports.getAll = async (req, res) => {
  try {
    const filters = {
      busca: req.query.busca
    };
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const discursos = await Discurso.getAll(filters, { limit, offset });
    res.json(discursos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const discurso = await Discurso.getById(req.params.id);
    if (!discurso) {
      return res.status(404).json({ error: 'Discurso não encontrado' });
    }
    res.json(discurso);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const discurso = await Discurso.create(req.body);
    res.status(201).json(discurso);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const discurso = await Discurso.update(req.params.id, req.body);
    if (!discurso) {
      return res.status(404).json({ error: 'Discurso não encontrado' });
    }
    res.json(discurso);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Discurso.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.checkDisponibilidade = async (req, res) => {
  try {
    const { discursoId } = req.params;
    const ultimaData = await Discurso.getUltimaDataLocal(discursoId);
    
    if (!ultimaData) {
      return res.json({ 
        disponivel: true, 
        alerta: null,
        ultimaData: null 
      });
    }

    const hoje = new Date();
    const mesesDesdeUltimoDiscurso = differenceInMonths(hoje, new Date(ultimaData));

    let alerta = null;
    if (mesesDesdeUltimoDiscurso <= 6) {
      alerta = {
        tipo: 'erro',
        mensagem: `Este discurso foi feito recentemente (${mesesDesdeUltimoDiscurso} meses atrás). Recomendamos aguardar.`
      };
    } else if (mesesDesdeUltimoDiscurso <= 12) {
      alerta = {
        tipo: 'aviso',
        mensagem: `Este discurso foi feito há menos de um ano (${mesesDesdeUltimoDiscurso} meses atrás).`
      };
    }

    res.json({ 
      disponivel: true, 
      alerta,
      ultimaData,
      mesesDesdeUltimo: mesesDesdeUltimoDiscurso
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHistorico = async (req, res) => {
  try {
    const historico = await Discurso.getHistorico(req.params.id);
    res.json(historico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

