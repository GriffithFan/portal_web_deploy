# Dockerfile para Backend - Portal Meraki
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache python3 make g++

# Configurar directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY src ./src
COPY scripts ./scripts
COPY data ./data

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S portal -u 1001 && \
    chown -R portal:nodejs /app

# Cambiar a usuario no-root
USER portal

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar la aplicación
CMD ["node", "src/servidor.js"]
