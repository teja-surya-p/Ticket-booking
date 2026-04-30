export const appConfig = {
  port: 3000,
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  sessionJwtSecret: process.env.SESSION_JWT_SECRET ?? "dev-session-secret-change-in-production",
  refreshJwtSecret: process.env.REFRESH_JWT_SECRET ?? "dev-refresh-secret-change-in-production",
  accessJwtSecret: process.env.ACCESS_JWT_SECRET ?? "dev-access-secret-change-in-production",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  frontendBaseUrl: process.env.FRONTEND_BASE_URL ?? "http://localhost:3001"
};
