FROM node:18-alpine

WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências (usa npm install para evitar erro sem lockfile)
RUN npm install

# Copia o resto do código
COPY . .

# Define variável de ambiente para o build do React
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Build da aplicação para produção
RUN npm run build

# Instala o serve globalmente para servir os arquivos estáticos
RUN npm install -g serve

# Expõe a porta 3000
EXPOSE 3000

# Serve a aplicação buildada
CMD ["serve", "-s", "build", "-l", "3000"]
