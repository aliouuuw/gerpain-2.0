module.exports = {
  apps: [
    {
      name: "gerpain-backend",
      cwd: "./gerpain_backend",
      script: "/home/aliou/.bun/bin/bun",
      args: "run src/index.ts",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      watch: false,
      max_memory_restart: "300M",
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      merge_logs: true,
    },
    {
      name: "gerpain-frontend",
      cwd: "./nextjs_frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3003",
      env: {
        NODE_ENV: "production",
        NEXT_PUBLIC_API_BASE_URL: "https://gerpain.com",
      },
      watch: false,
      max_memory_restart: "500M",
      error_file: "./logs/frontend-error.log",
      out_file: "./logs/frontend-out.log",
      merge_logs: true,
    },
  ],
};
