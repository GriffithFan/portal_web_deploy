# Portal Meraki Docker Configuration

# Build stage
FROM node:18-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache python3 make g++

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Instalar dependencias del backend
WORKDIR /app/backend
RUN npm ci --only=production

# Instalar dependencias del frontend
WORKDIR /app/frontend
RUN npm ci

# Copiar código fuente
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build del frontend
WORKDIR /app/frontend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S portal -u 1001

# Instalar curl para health checks
RUN apk add --no-cache curl

# Configurar directorio de trabajo
WORKDIR /app

# Copiar backend desde builder
COPY --from=builder --chown=portal:nodejs /app/backend ./backend
COPY --from=builder --chown=portal:nodejs /app/frontend/dist ./frontend/dist

# Crear directorios necesarios
RUN mkdir -p /app/backend/data /app/backend/logs
RUN chown -R portal:nodejs /app

# Cambiar a usuario no-root
USER portal

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PUERTO=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Comando de inicio
CMD ["node", "backend/src/servidor.js"]