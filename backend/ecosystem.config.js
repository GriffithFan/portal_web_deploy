module.exports = {
  apps: [{
    name: 'portal-meraki',
    script: './src/servidor.js',
    cwd: '/var/www/portal-meraki/backend',
    instances: 1,
    exec_mode: 'fork',
    
    // Variables de entorno
    env: {
      NODE_ENV: 'development',
      PUERTO: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PUERTO: 3000
    },
    
    // Logs
    log_file: '/var/log/portal-meraki/combined.log',
    out_file: '/var/log/portal-meraki/out.log',
    error_file: '/var/log/portal-meraki/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configuración de reinicio
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    
    // Configuración de auto-restart
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'data'],
    
    // Configuración de cluster (si se necesita más rendimiento)
    // instances: 'max',
    // exec_mode: 'cluster',
    
    // Scripts de lifecycle
    post_update: ['npm install', 'npm run predios-check'],
    
    // Configuración de merge logs
    merge_logs: true,
    
    // Auto restart en caso de error
    autorestart: true,
    
    // Configuración de source maps
    source_map_support: true,
    
    // Variables específicas para hosting
    env_production: {
      NODE_ENV: 'production',
      PUERTO: 3000,
      HOST: '127.0.0.1', // Solo acceso local (via Nginx)
      LOG_LEVEL: 'info'
    }
  }]
};