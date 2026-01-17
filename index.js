// Root entry to satisfy hosts that run `node index.js` by default (Render does this when no start command is set)
// This file simply delegates to the backend server entrypoint.
const app = require('./backend/server');

// Se estamos executando diretamente (não como módulo), iniciar o servidor
// Isso funciona para Render e outros hosts que executam node index.js
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}
