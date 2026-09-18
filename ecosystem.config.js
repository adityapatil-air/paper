module.exports = {
  apps: [
    {
      name: 'researchpprs-backend',
      script: 'src/index.js',
      cwd: '/root/researchpprs/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/root/researchpprs/logs/backend-error.log',
      out_file: '/root/researchpprs/logs/backend-out.log',
      log_file: '/root/researchpprs/logs/backend-combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
