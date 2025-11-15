import { Hono } from "hono";
import { HealthHandlers } from "./handlers.js";

const health = new Hono();

health.get("/", HealthHandlers.healthCheck);
health.get("/ready", HealthHandlers.readinessCheck);
health.get("/live", HealthHandlers.livenessCheck);

export { health };


