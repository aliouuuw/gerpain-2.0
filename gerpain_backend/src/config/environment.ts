export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost:5432/base_backend_dev",
  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000", "http://localhost:5173"],
  
  // AWS (for future file uploads)
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  
  // Redis (for future background jobs)
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  
  // OAuth (for future social login)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,

  // Email service (for email verification and password reset)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  FROM_EMAIL: process.env.FROM_EMAIL || "noreply@yourapp.com",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
} as const;

export function validateRequiredEnvVars() {
  const required = ["DATABASE_URL"];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

