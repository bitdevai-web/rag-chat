// ─────────────────────────────────────────────────────────────────────────────
//  CogniBase — PM2 Ecosystem Config (Phase 2)
//  For bare-metal / VPS deployments without Docker.
//
//  Commands:
//    pm2 start ecosystem.config.js       # start
//    pm2 reload rag-chat                 # zero-downtime reload
//    pm2 restart rag-chat                # hard restart
//    pm2 stop rag-chat                   # stop
//    pm2 logs rag-chat                   # stream logs
//    pm2 status                          # status table
//    pm2 save && pm2 startup             # auto-start on server reboot
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  apps: [
    {
      name            : "cognibase",
      script          : "node_modules/.bin/next",
      args            : "start",
      cwd             : __dirname,
      instances       : 1,           // SQLite is single-writer — keep at 1
      exec_mode       : "fork",

      // Load env from .env file in the project root
      env_file        : ".env",
      env             : {
        NODE_ENV      : "production",
        PORT          : 3000,
      },

      // Memory guard — restart if over 1 GB (embedding model is ~90 MB)
      max_memory_restart : "1G",

      // Logging
      error_file      : "logs/err.log",
      out_file        : "logs/out.log",
      merge_logs      : true,
      log_date_format : "YYYY-MM-DD HH:mm:ss Z",

      // Crash recovery
      autorestart     : true,
      restart_delay   : 3000,
      max_restarts    : 10,

      // File watching — off in production
      watch           : false,
    },
  ],
};
