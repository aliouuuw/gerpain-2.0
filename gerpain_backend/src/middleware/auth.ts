import { Context, Next } from "hono";
import { lucia } from "../config/auth.js";
import { AuthService } from "../domains/auth/services.js";

export async function authMiddleware(c: Context, next: Next) {
  const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");
  
  if (!sessionId) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  const { session, user } = await lucia.validateSession(sessionId);
  
  if (session && session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    c.header("Set-Cookie", sessionCookie.serialize());
  }
  
  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    c.header("Set-Cookie", sessionCookie.serialize());
  }

  c.set("user", user);
  c.set("session", session);
  c.set("sessionId", sessionId);
  
  return next();
}

export async function requireAuth(c: Context, next: Next) {
  const user = c.get("user");
  
  if (!user) {
    return c.json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      }
    }, 401);
  }
  
  return next();
}

export async function apiKeyMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return next(); // Continue to session auth
  }

  const apiKey = authHeader.substring(7);
  const keyData = await AuthService.validateApiKey(apiKey);
  
  if (keyData) {
    c.set("user", keyData.user);
    c.set("apiKey", keyData);
    return next();
  }
  
  return next(); // Continue to session auth
}

export async function requireAuthOrApiKey(c: Context, next: Next) {
  // Try API key first
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.substring(7);
    const keyData = await AuthService.validateApiKey(apiKey);
    if (keyData) {
      c.set("user", keyData.user);
      c.set("apiKey", keyData);
      return next();
    }
  }
  
  // Try session auth
  const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");
  if (sessionId) {
    const { session, user } = await lucia.validateSession(sessionId);
    if (user) {
      c.set("user", user);
      c.set("session", session);
      return next();
    }
  }
  
  return c.json({
    success: false,
    error: {
      code: "UNAUTHORIZED",
      message: "Authentication required. Provide a valid session cookie or API key.",
    }
  }, 401);
}


