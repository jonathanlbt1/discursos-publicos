import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://discursos.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para adicionar token JWT em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Autenticação
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.post('/auth/change-password', data);

// Usuários (Admin)
export const getUsuarios = (params) => api.get('/usuarios', { params });
export const getUsuario = (id) => api.get(`/usuarios/${id}`);
export const createUsuario = (data) => api.post('/usuarios', data);
export const updateUsuario = (id, data) => api.put(`/usuarios/${id}`, data);
export const deleteUsuario = (id) => api.delete(`/usuarios/${id}`);
export const resetPassword = (id, data) => api.post(`/usuarios/${id}/reset-password`, data);

// Congregações
export const getCongregacoes = (params) => api.get('/congregacoes', { params });
export const getCongregacao = (id) => api.get(`/congregacoes/${id}`);
export const createCongregacao = (data) => api.post('/congregacoes', data);
export const updateCongregacao = (id, data) => api.put(`/congregacoes/${id}`, data);
export const deleteCongregacao = (id) => api.delete(`/congregacoes/${id}`);
export const getHistoricoCongregacao = (id) => api.get(`/congregacoes/${id}/historico`);

// Discursos
export const getDiscursos = (params) => api.get('/discursos', { params });
export const getDiscurso = (id) => api.get(`/discursos/${id}`);
export const createDiscurso = (data) => api.post('/discursos', data);
export const updateDiscurso = (id, data) => api.put(`/discursos/${id}`, data);
export const deleteDiscurso = (id) => api.delete(`/discursos/${id}`);
export const checkDisponibilidadeDiscurso = (id) => api.get(`/discursos/${id}/disponibilidade`);
export const getHistoricoDiscurso = (id) => api.get(`/discursos/${id}/historico`);

// Oradores
export const getOradores = (params) => api.get('/oradores', { params });
export const getOrador = (id) => api.get(`/oradores/${id}`);
export const createOrador = (data) => api.post('/oradores', data);
export const updateOrador = (id, data) => api.put(`/oradores/${id}`, data);
export const deleteOrador = (id) => api.delete(`/oradores/${id}`);
export const getHistoricoOrador = (id) => api.get(`/oradores/${id}/historico`);

// Relatórios (JSON endpoints)
export const getReportOradoresJardim = () => api.get('/reports/oradores-jardim-santista');
export const getCongregacoesList = (params) => api.get('/congregacoes', { params });

// Agendamentos
export const getAgendamentos = (params) => api.get('/agendamentos', { params });
export const getAgendamentosFuturos = (params) => api.get('/agendamentos/futuros', { params });
export const getAgendamento = (id) => api.get(`/agendamentos/${id}`);
export const createAgendamento = (data) => api.post('/agendamentos', data);
export const updateAgendamento = (id, data) => api.put(`/agendamentos/${id}`, data);
export const deleteAgendamento = (id) => api.delete(`/agendamentos/${id}`);
export const marcarComoRealizado = (id) => api.post(`/agendamentos/${id}/realizar`);
export const exportarCSV = () => api.get('/agendamentos/export/csv', { responseType: 'blob' });
export const verificarSemanasVazias = () => api.get('/agendamentos/verificar/semanas-vazias');

// Arranjos
export const getArranjos = (params) => api.get('/arranjos', { params });
export const getArranjo = (id) => api.get(`/arranjos/${id}`);
export const createArranjo = (data) => api.post('/arranjos', data);
export const updateArranjo = (id, data) => api.put(`/arranjos/${id}`, data);
export const deleteArranjo = (id) => api.delete(`/arranjos/${id}`);

export default api;

