const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
// Configure CORS explicitly so preflight (OPTIONS) requests include the
// necessary headers (notably Authorization) and are handled before auth
// middleware runs. This is important for browser clients calling the API
// with an Authorization header.
const corsOptions = {
  origin: true, // reflect request origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Ensure preflight requests are handled for all routes
app.options('*', cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rotas
app.use('/api', routes);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API de Gerenciamento de Discursos - Funcionando!' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor apenas se este arquivo for executado diretamente
// (não quando importado por index.js ou api/index.js)
// Isso permite que funcione tanto no Render (via index.js) quanto no Vercel (via api/index.js)
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

// Exportar o app para uso como função serverless (Vercel) ou servidor tradicional (Render)
module.exports = app;

