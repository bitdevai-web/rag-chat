// PM2 ecosystem config — used by both setup-vps.sh and CI/CD deploy
// Start:   pm2 start ecosystem.config.js
// Restart: pm2 reload rag-chat
// Logs:    pm2 logs rag-chat
// Status:  pm2 status

module.exports = {
  apps: [
    {
      name            : "rag-chat",
      script          : "node_modules/.bin/next",
      args            : "start",
      cwd             : __dirname,
      instances       : 1,          // increase to "max" for cluster mode on multi-core VPS
      exec_mode       : "fork",
      env             : {
        NODE_ENV      : "production",
        PORT          : 3000,
      },
      env_file        : ".env",      // loads LOGIN_*, SESSION_SECRET, LLM_* etc.
      watch           : false,
      max_memory_restart : "800M",
      // Logging
      error_file      : "logs/err.log",
      out_file        : "logs/out.log",
      merge_logs      : true,
      log_date_format : "YYYY-MM-DD HH:mm:ss",
      // Auto-restart on crash
      autorestart     : true,
      restart_delay   : 3000,
      max_restarts    : 10,
    },
  ],
}
