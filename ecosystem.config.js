module.exports = {
  apps: [
    {
      name: 'spider-server',
      script: 'server_manager.js',
      instances: 1,
      exec_mode: 'fork',
      
      // 环境配置
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // 资源限制
      max_memory_restart: '1G',
      
      // 日志配置
      log_file: './logs/pm2.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 自动重启配置
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // 监控配置
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'output',
        '.git'
      ],
      
      // 进程配置
      kill_timeout: 30000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // 集群配置（如果需要）
      merge_logs: true,
      
      // cron重启（每天凌晨2点重启）
      cron_restart: '0 2 * * *',
      
      // 监控
      monitoring: false
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/spider-puppeteer.git',
      path: '/var/www/spider-puppeteer',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 