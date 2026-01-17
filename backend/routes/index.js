const express = require('express');
const router = express.Router();

const congregacaoController = require('../controllers/congregacaoController');
const discursoController = require('../controllers/discursoController');
const oradorController = require('../controllers/oradorController');
const agendamentoController = require('../controllers/agendamentoController');
const arranjoController = require('../controllers/arranjoController');
const authController = require('../controllers/authController');
const usuarioController = require('../controllers/usuarioController');
const calendarController = require('../controllers/calendarController');
const reportController = require('../controllers/reportController');
const { authenticate, isAdmin } = require('../middleware/auth');

// ===== Rotas Públicas (sem autenticação) =====
// Rotas de Autenticação
// By default public registration is disabled for security. To allow public signup set ALLOW_PUBLIC_REGISTRATION=true
if (process.env.ALLOW_PUBLIC_REGISTRATION && process.env.ALLOW_PUBLIC_REGISTRATION.toLowerCase() === 'true') {
	router.post('/auth/register', authController.register);
} else {
	// Registration disabled — admins should create users via the admin endpoints or use the create-admin script.
	// Keep the route out of the router when disabled.
}
router.post('/auth/login', authController.login);

// ===== Rotas Protegidas (requerem autenticação) =====
// Perfil do usuário
router.get('/auth/me', authenticate, authController.getMe);
router.put('/auth/profile', authenticate, authController.updateProfile);
router.post('/auth/change-password', authenticate, authController.changePassword);

// Rotas de Congregações (protegidas)
router.get('/congregacoes', authenticate, congregacaoController.getAll);
router.get('/congregacoes/:id', authenticate, congregacaoController.getById);
router.post('/congregacoes', authenticate, isAdmin, congregacaoController.create);
router.put('/congregacoes/:id', authenticate, isAdmin, congregacaoController.update);
router.delete('/congregacoes/:id', authenticate, isAdmin, congregacaoController.delete);
router.get('/congregacoes/:id/historico', authenticate, congregacaoController.getHistoricoRecebidos);

// Rotas de Discursos (protegidas)
router.get('/discursos', authenticate, discursoController.getAll);
router.get('/discursos/:id', authenticate, discursoController.getById);
router.post('/discursos', authenticate, discursoController.create);
router.put('/discursos/:id', authenticate, discursoController.update);
router.delete('/discursos/:id', authenticate, discursoController.delete);
router.get('/discursos/:discursoId/disponibilidade', authenticate, discursoController.checkDisponibilidade);
router.get('/discursos/:id/historico', authenticate, discursoController.getHistorico);

// Rotas de Oradores (protegidas)
router.get('/oradores', authenticate, oradorController.getAll);
router.get('/oradores/:id', authenticate, oradorController.getById);
router.post('/oradores', authenticate, isAdmin, oradorController.create);
router.put('/oradores/:id', authenticate, isAdmin, oradorController.update);
router.delete('/oradores/:id', authenticate, isAdmin, oradorController.delete);
router.get('/oradores/:id/historico', authenticate, oradorController.getHistorico);

// Rotas de Agendamentos (protegidas)
router.get('/agendamentos', authenticate, agendamentoController.getAll);
router.get('/agendamentos/futuros', authenticate, agendamentoController.getFuturos);
router.get('/agendamentos/:id', authenticate, agendamentoController.getById);
router.post('/agendamentos', authenticate, agendamentoController.create);
router.put('/agendamentos/:id', authenticate, agendamentoController.update);
router.delete('/agendamentos/:id', authenticate, agendamentoController.delete);
router.post('/agendamentos/:id/realizar', authenticate, agendamentoController.marcarComoRealizado);
router.get('/agendamentos/export/csv', authenticate, agendamentoController.exportarCSV);
router.get('/agendamentos/verificar/semanas-vazias', authenticate, agendamentoController.verificarSemanasVazias);

// Rotas de Arranjos (protegidas)
router.get('/arranjos', authenticate, arranjoController.getAll);
router.get('/arranjos/:id', authenticate, arranjoController.getById);
router.post('/arranjos', authenticate, arranjoController.create);
router.put('/arranjos/:id', authenticate, arranjoController.update);
router.delete('/arranjos/:id', authenticate, arranjoController.delete);

// ===== Rotas de Administração (requerem autenticação + admin) =====
// GET /usuarios - Admin vê todos, usuário comum vê apenas o próprio
router.get('/usuarios', authenticate, usuarioController.getAll);
router.get('/usuarios/:id', authenticate, usuarioController.getById);
router.post('/usuarios', authenticate, isAdmin, usuarioController.create);
// PUT e DELETE - Admin pode editar/deletar qualquer um, usuário comum apenas o próprio
router.put('/usuarios/:id', authenticate, usuarioController.update);
router.delete('/usuarios/:id', authenticate, usuarioController.delete);
// Reset password - Admin pode resetar qualquer um, usuário comum apenas o próprio
router.post('/usuarios/:id/reset-password', authenticate, usuarioController.resetPassword);

// ===== Rotas de Calendário (requerem autenticação) =====
router.get('/calendar/export', authenticate, calendarController.exportarICS);
router.get('/calendar/export/:id', authenticate, calendarController.exportarAgendamento);

// ===== Rota pública para próximos discursos =====
router.get('/proximos-discursos', calendarController.getProximosDiscursos);

// ===== Rotas de Relatórios PDF (requerem autenticação) =====
router.get('/reports/agendamentos-futuros', authenticate, reportController.relatorioAgendamentosFuturos);
router.get('/reports/historico-discursos', authenticate, reportController.relatorioHistoricoDiscursos);
router.get('/reports/oradores', authenticate, reportController.relatorioOradores);
router.get('/reports/programacao-mensal', authenticate, reportController.relatorioProgramacaoMensal);
router.get('/reports/estatisticas', authenticate, reportController.relatorioEstatisticas);
router.get('/reports/discursos-disponiveis', authenticate, reportController.relatorioDiscursosDisponiveis);
router.get('/reports/oradores-jardim-santista', authenticate, reportController.relatorioOradoresJardimSantista);
router.get('/reports/oradores-por-congregacao', authenticate, reportController.relatorioOradoresPorCongregacao);
router.get('/reports/carta-convite/:id', authenticate, reportController.cartaConvite);

module.exports = router;

