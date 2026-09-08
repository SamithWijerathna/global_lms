module.exports = {
  apps: [
    {
      name: "global-lms-backend",
      script: "dist/index.js",
      cwd: "./backend",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5050,
      },
    },
    {
      name: "global-lms-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3050",
      cwd: "./frontend",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3050,
      },
    },
  ],
};
