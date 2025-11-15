import { Context, Next } from "hono";
import { Logger } from "../shared/utils/logger.js";

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const { method, url } = c.req;
  
  Logger.info(`→ ${method} ${url}`);
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  
  Logger.request(method, url, status, duration);
}


