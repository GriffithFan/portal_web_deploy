module.exports = {
  apps: [{
    name: 'portal-meraki',
    script: './src/servidor.js',
    cwd: '/home/portal-meraki/backend',
    instances: 1,
    exec_mode: 'fork',
    
    // Variables de entorno
    env: {
      NODE_ENV: 'development',
      PUERTO: 3000,
      HOST: '127.0.0.1'
    },
    env_production: {
      NODE_ENV: 'production',
      PUERTO: 3000,
      HOST: '127.0.0.1'
    },
    
    // Logs simplificados
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configuración de reinicio
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    
    // Configuración básica
    watch: false,
    autorestart: true,
    merge_logs: true,
    
    // Configuración optimizada para VPS
    kill_timeout: 5000,
    listen_timeout: 3000,
    max_memory_restart: '300M'
  }]
};