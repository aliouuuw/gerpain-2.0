import { Hono } from "hono";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Middleware
import { authMiddleware } from "./middleware/auth.js";
import { requestLogger } from "./middleware/request-logger.js";
import { errorHandler } from "./middleware/error-handler.js";

// Routes
import { auth } from "./domains/auth/routes.js";
import { health } from "./domains/health/routes.js";
import { admin } from "./domains/admin/routes.js";
import { core } from "./domains/core/routes.js";
import { inventoryRoutes } from "./domains/inventory/routes.js";
import { locationsRoutes } from "./domains/locations/routes.js";
import { productsRoutes } from "./domains/products/routes.js";
import { employeesRoutes } from "./domains/employees/routes.js";
import { deliveriesRoutes } from "./domains/deliveries/routes.js";
import { collectionsRoutes } from "./domains/collections/routes.js";
import { bakeriesRoutes } from "./domains/bakeries/routes.js";
import categoriesRoutes from "./domains/categories/routes.js";
import { pricingRoutes } from "./domains/pricing/routes.js";

// Logger
import { Logger } from "./shared/utils/logger.js";

const app = new Hono();

// Global middleware
const corsOrigins = process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"];
console.log("CORS Origins:", corsOrigins);

app.use("*", cors({
  origin: corsOrigins,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'User-Agent', 'DNT', 'Cache-Control', 'X-Mx-ReqToken', 'Keep-Alive', 'X-Requested-With', 'If-Modified-Since', 'X-Organization-ID', 'X-Bakery-ID'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 86400, // 24 hours
}));

app.use("*", logger());
app.use("*", requestLogger);
app.use("*", authMiddleware);

// Error handler
app.onError(errorHandler);

// Health checks (not behind /api/v1 for load balancer access)
app.route("/health", health);

// API v1 routes
const api = new OpenAPIHono();

// OpenAPI JSON and Swagger UI
api.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Base Backend API",
    version: "1.0.0",
    description: "API documentation for Base Backend (Hono + Bun)",
  },
  servers: [{ url: process.env.BASE_URL || `http://localhost:${process.env.PORT ? parseInt(process.env.PORT) : 3000}` }],
});

// Mount Scalar UI at /api/v1/docs using middleware to avoid route config overload typing
app.use("/api/v1/docs", apiReference({
  theme: "kepler",
  url: "/api/v1/openapi.json",
  layout: "modern",
  title: "Base Backend API Reference",
}));
api.route("/auth", auth);
api.route("/admin", admin);
api.route("/core", core);
api.route("/inventory", inventoryRoutes);
api.route("/locations", locationsRoutes);
api.route("/products", productsRoutes);
api.route("/employees", employeesRoutes);
api.route("/delivery-runs", deliveriesRoutes);
api.route("/cash-collections", collectionsRoutes);
api.route("/bakeries", bakeriesRoutes);
api.route("/categories", categoriesRoutes);
api.route("/pricing", pricingRoutes);

app.route("/api/v1", api);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    success: true,
    data: {
      message: "Base Backend API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      endpoints: {
        health: "/health",
        api: "/api/v1",
        auth: "/api/v1/auth",
        admin: "/api/v1/admin",
        core: "/api/v1/core",
        inventory: "/api/v1/inventory",
        docs: "/api/v1/docs",
      }
    }
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    }
  }, 404);
});

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

Logger.info(`🚀 Server starting on port ${port}`);
Logger.info(`📚 API Documentation: http://localhost:${port}/`);
Logger.info(`❤️  Health Check: http://localhost:${port}/health`);
Logger.info(`📚 API Documentation: http://localhost:${port}/docs`);

export default {
  port,
  fetch: app.fetch,
};
