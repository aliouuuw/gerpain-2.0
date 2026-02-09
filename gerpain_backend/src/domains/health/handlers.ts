import { Context } from "hono";
import { db } from "../../config/database.js";
import { healthCheckLogs } from "../../shared/database/schema.js";
import { Logger } from "../../shared/utils/logger.js";
import { sql } from "drizzle-orm";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  responseTime: number;
  services: {
    database: {
      status: "healthy" | "unhealthy";
      responseTime?: number;
      error?: string;
    };
  };
}

export class HealthHandlers {
  static async healthCheck(c: Context): Promise<Response> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    const health: HealthStatus = {
      status: "healthy",
      timestamp,
      responseTime: 0,
      services: {
        database: { status: "healthy" }
      }
    };

    // Check database connectivity
    try {
      const dbStart = Date.now();
      await db.execute(sql`SELECT 1`);
      const dbResponseTime = Date.now() - dbStart;
      
      health.services.database = {
        status: "healthy",
        responseTime: dbResponseTime
      };
    } catch (error) {
      health.services.database = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown database error"
      };
      health.status = "unhealthy";
    }

    health.responseTime = Date.now() - startTime;

    // Log health check
    try {
      await db.insert(healthCheckLogs).values({
        status: health.status,
        responseTime: health.responseTime,
        details: JSON.stringify(health.services),
      });
    } catch (error) {
      Logger.error("Failed to log health check", { error: error instanceof Error ? error.message : error });
    }

    const statusCode = health.status === "healthy" ? 200 : 503;
    
    return c.json({
      success: health.status === "healthy",
      data: health
    }, statusCode);
  }

  static async readinessCheck(c: Context): Promise<Response> {
    try {
      // Check if all critical services are ready
      await db.execute(sql`SELECT 1`);
      
      return c.json({
        success: true,
        data: {
          status: "ready",
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      return c.json({
        success: false,
        data: {
          status: "not ready",
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }, 503);
    }
  }

  static async livenessCheck(c: Context): Promise<Response> {
    // Simple liveness check - if the process is running, it's alive
    return c.json({
      success: true,
      data: {
        status: "alive",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
  }
}


