import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ContentfulStatusCode } from "hono/utils/http-status";

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(error: Error, c: Context) {
  console.error("Error:", {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: c.req.url,
    method: c.req.method,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    timestamp: new Date().toISOString(),
  });

  // Handle Hono HTTP exceptions
  if (error instanceof HTTPException) {
    return c.json({
      success: false,
      error: {
        code: "HTTP_ERROR",
        message: error.message,
      }
    }, error.status);
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    return c.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      }
    }, error.statusCode as ContentfulStatusCode);
  }

  // Handle Zod validation errors
  if (error.name === "ZodError") {
    return c.json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.message,
      }
    }, 400);
  }

  // Handle unknown errors
  return c.json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    }
  }, 500);
}


