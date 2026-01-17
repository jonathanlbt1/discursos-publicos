// Vercel Serverless Function Handler
// Este arquivo permite que o Express seja executado como função serverless no Vercel
const app = require('../backend/server');

// Exportar o app do Express para o Vercel
module.exports = app;

