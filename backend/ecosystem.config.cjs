module.exports = {
  apps: [
    {
      name: "core",
      cwd: "/root/core.azonline.com.ar/backend",
      script: "src/index.ts",
      interpreter: "/root/.bun/bin/bun",
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "200M",
      env_file: "/root/core.azonline.com.ar/backend/.env",
      out_file: "/root/core.azonline.com.ar/backend/logs/out.log",
      error_file: "/root/core.azonline.com.ar/backend/logs/err.log",
      time: true,
    },
  ],
};
