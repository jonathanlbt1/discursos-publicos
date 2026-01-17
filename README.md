# Sistema de Gerenciamento de Discursos Bíblicos

Um sistema completo para agendamento e acompanhamento de discursos bíblicos, desenvolvido com React, Node.js e PostgreSQL.

## 📋 Funcionalidades

### ✅ Gerenciamento de Discursos

- Cadastro de quase 200 discursos com número, tema e data da versão do esboço
- Histórico completo de todas as vezes que cada discurso foi proferido
- Alertas automáticos quando tentar agendar um discurso:
  - **Alerta de erro**: Se foi proferido há menos de 6 meses
  - **Alerta de aviso**: Se foi proferido entre 6 e 12 meses

### 📅 Agendamentos

- Criação de agendamentos futuros com três tipos:
  - **Local**: Discurso na própria congregação
  - **Enviado**: Irmão da congregação enviado para outra congregação
  - **Recebido**: Orador recebido de outra congregação
- Visualização de agendamentos futuros
- Marcação de agendamentos como realizados (movidos para histórico)
- Detecção automática de semanas sem discurso programado
- Exportação de agendamentos em formato CSV

### 👥 Gerenciamento de Oradores

- Cadastro de irmãos da congregação (oradores)
- Controle de status (ativo/inativo)
- Histórico completo de discursos enviados para outras congregações
- Informações de contato (celular, e-mail)

### ⛪ Gerenciamento de Congregações

- Cadastro de congregações parceiras
- Informações: nome, endereço, horário, contato
- Histórico de oradores recebidos de cada congregação
- Histórico de discursos proferidos

### 📊 Dashboard

- Visão geral dos próximos agendamentos
- Alertas de semanas sem discurso programado
- Estatísticas rápidas
- Exportação rápida de dados em CSV

### 📱 Design Responsivo

- Interface otimizada para desktop
- Totalmente responsivo para tablets
- Otimizado para navegadores mobile
- Interface moderna e intuitiva

### 🔐 Autenticação e Segurança

- **Sistema de Login** com JWT (JSON Web Tokens)
- **Dois Níveis de Acesso**: Administrador e Usuário
- **Proteção de Rotas** no backend e frontend
- **Gerenciamento de Usuários** (apenas administradores)
- **Senhas Criptografadas** com bcrypt
- **Sessões Persistentes** com tokens de 24h
- **Logout Seguro** com limpeza de credenciais

## 🚀 Tecnologias Utilizadas

### Backend

- Node.js
- Express.js
- PostgreSQL
- date-fns
- **bcrypt** - Criptografia de senhas
- **jsonwebtoken** - Autenticação JWT

### Frontend

- React 18
- Axios (com interceptors)
- date-fns
- CSS3 com design moderno
- LocalStorage para sessões

## 📦 Instalação

### Pré-requisitos

- Node.js (versão 14 ou superior)
- PostgreSQL (versão 12 ou superior)
- npm ou yarn

### Passo 1: Clonar o repositório

```bash
cd /Users/jonathan.moraes.gft/dev/nu/discursos
```

### Passo 2: Configurar o Banco de Dados

1. Crie um banco de dados PostgreSQL:

```sql
CREATE DATABASE discursos;
```

1. Insira as variáveis de ambiente no seu servidor:

```txt
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discursos
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui

# env vars do key user
ADMIN_EMAIL: seu_email_aqui
ADMIN_PASSWORD: "Sua_senha_aqui"
ADMIN_NAME: Seu Nome Aqui

# Autenticação JWT
JWT_SECRET=seu-secret-super-secreto-mude-em-producao
JWT_EXPIRES_IN=24h
```

**⚠️ IMPORTANTE:** Altere o `JWT_SECRET` para um valor aleatório e seguro em produção!

### Passo 3: Instalar Dependências

```bash
# Instalar dependências do backend e frontend
npm run setup
```

Ou manualmente:

```bash
# Backend
cd backend
npm install

cd ..

# Frontend
cd frontend
cd frontend
npm install
cd ..
```

### Passo 4: Executar Migrações do Banco de Dados

1. Abra a pasta backend/migrations e execute manualmente todas as migrations no PgAdmin. 

#### Desenvolvimento: Executar arquivo docker-composer.yaml que está na raiz do projeto

```bash
docker compose up -d --build
```



### Passo 6: Acessar a Aplicação

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 📖 Estrutura do Projeto

```txt
discursos/
├── backend/
│   ├── config/
│   │   └── database.js          # Configuração do PostgreSQL
│   ├── controllers/
│   │   ├── agendamentoController.js
│   │   ├── congregacaoController.js
│   │   ├── discursoController.js
│   │   └── oradorController.js
│   ├── migrations/
│   │   ├── migrate.js           # Script de migração
│   │   └── schema.sql           # Schema do banco de dados
│   ├── models/
│   │   ├── agendamento.js
│   │   ├── congregacao.js
│   │   ├── discurso.js
│   │   └── orador.js
│   ├── routes/
│   │   └── index.js             # Rotas da API
│   └── server.js                # Servidor Express
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── Agendamentos.js
│       │   ├── Congregacoes.js
│       │   ├── Dashboard.js
│       │   ├── Discursos.js
│       │   └── Oradores.js
│       ├── services/
│       │   └── api.js           # Cliente API
│       ├── App.js
│       ├── App.css
│       ├── index.js
│       └── index.css
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🔌 Endpoints da API

### Congregações

- `GET /api/congregacoes` - Listar todas
- `GET /api/congregacoes/:id` - Buscar por ID
- `POST /api/congregacoes` - Criar nova
- `PUT /api/congregacoes/:id` - Atualizar
- `DELETE /api/congregacoes/:id` - Excluir
- `GET /api/congregacoes/:id/historico` - Histórico de oradores recebidos

### Discursos

- `GET /api/discursos` - Listar todos
- `GET /api/discursos/:id` - Buscar por ID
- `POST /api/discursos` - Criar novo
- `PUT /api/discursos/:id` - Atualizar
- `DELETE /api/discursos/:id` - Excluir
- `GET /api/discursos/:id/disponibilidade` - Verificar disponibilidade
- `GET /api/discursos/:id/historico` - Histórico do discurso

### Oradores

- `GET /api/oradores` - Listar todos
- `GET /api/oradores/:id` - Buscar por ID
- `POST /api/oradores` - Criar novo
- `PUT /api/oradores/:id` - Atualizar
- `DELETE /api/oradores/:id` - Excluir
- `GET /api/oradores/:id/historico` - Histórico de discursos enviados

### Agendamentos

- `GET /api/agendamentos` - Listar todos
- `GET /api/agendamentos/futuros` - Listar agendamentos futuros
- `GET /api/agendamentos/:id` - Buscar por ID
- `POST /api/agendamentos` - Criar novo
- `PUT /api/agendamentos/:id` - Atualizar
- `DELETE /api/agendamentos/:id` - Excluir
- `POST /api/agendamentos/:id/realizar` - Marcar como realizado
- `GET /api/agendamentos/export/csv` - Exportar para CSV
- `GET /api/agendamentos/verificar/semanas-vazias` - Verificar semanas vazias

## 💡 Como Usar

### 1. Cadastrar Discursos

1. Acesse a aba "Discursos"
2. Clique em "+ Novo Discurso"
3. Preencha: número, tema e data da versão do esboço
4. Clique em "Criar"

### 2. Cadastrar Oradores

1. Acesse a aba "Oradores"
2. Clique em "+ Novo Orador"
3. Preencha os dados do orador
4. Clique em "Criar"

### 3. Cadastrar Congregações

1. Acesse a aba "Congregações"
2. Clique em "+ Nova Congregação"
3. Preencha os dados da congregação
4. Clique em "Criar"

### 4. Criar Agendamento

1. Acesse a aba "Agendamentos"
2. Clique em "+ Novo Agendamento"
3. Selecione:
   - Data
   - Tipo (Local, Enviado ou Recebido)
   - Discurso
   - Orador (se aplicável)
   - Congregação (se tipo for Enviado ou Recebido)
4. Se for agendamento local e o discurso foi feito recentemente, você verá um alerta
5. Clique em "Criar"

### 5. Marcar Agendamento como Realizado

1. Na lista de agendamentos, clique no botão "✓"
2. Confirme a ação
3. O agendamento será movido para o histórico

### 6. Exportar Agendamentos

1. No Dashboard ou na aba Agendamentos
2. Clique em "📥 Exportar CSV"
3. O arquivo será baixado automaticamente

### 7. Ver Históricos

- **Discursos**: Clique em "Histórico" para ver todas as vezes que foi proferido
- **Oradores**: Clique em "Histórico" para ver discursos enviados
- **Congregações**: Clique em "Histórico" para ver oradores recebidos

## 🎨 Screenshots

O sistema possui:

- Interface moderna com gradientes e sombras
- Cards organizados e responsivos
- Tabelas com hover effects
- Modais para formulários
- Badges coloridos para tipos de agendamento
- Alertas visuais para avisos importantes
- Design mobile-first

## 🔒 Segurança

- Validação de dados no frontend e backend
- Proteção contra SQL Injection (usando parametrized queries)
- CORS configurado
- Variáveis de ambiente para credenciais sensíveis

## 🐛 Troubleshooting

### Erro de conexão com o banco de dados

- Verifique se o PostgreSQL está rodando
- Confirme se todas as variáveis de ambiente foram criadas
- Verifique se o banco de dados foi criado


### Porta já em uso

- Backend: Altere a porta no docker-compose.yaml
- Frontend: O React perguntará se deseja usar outra porta

### Erro ao instalar dependências

```bash
# Limpe o cache e reinstale
rm -rf node_modules package-lock.json
npm install

cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📝 Notas Importantes

1. **Backup**: Faça backup regular do banco de dados
2. **Histórico**: Ao marcar como realizado, o agendamento vai para o histórico (não pode ser desfeito)
3. **Alertas**: Os alertas de 6 e 12 meses são apenas informativos, você ainda pode criar o agendamento
4. **CSV**: O arquivo CSV usa encoding UTF-8 com BOM para compatibilidade com Excel

## 🤝 Suporte

Para problemas ou dúvidas:

1. Verifique a seção de Troubleshooting
2. Consulte a documentação da API
3. Verifique os logs no console do navegador e terminal

## 📄 Licença

Este projeto foi desenvolvido como open source para irmãos que cuidam dos arranjos de discursos das congregações.

## 🔄 Se quiser colaborar com o projeto, faça o clone e abra um PR

---

Desenvolvido com ❤️ para auxiliar no gerenciamento de discursos bíblicos.
