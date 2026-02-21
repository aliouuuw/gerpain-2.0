import { Redis } from "ioredis";
import { env } from "./environment.js";

// Production-ready Redis configuration
const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error("Redis: max retries reached, giving up");
      return null; // stop retrying
    }
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  lazyConnect: true,
  enableReadyCheck: true,
  connectTimeout: 10000,
  // Connection pool settings
  keepAlive: 30000,
  family: 4, // IPv4
});

let isConnected = false;

redis.on("error", (err: Error) => {
  console.error("Redis connection error:", err.message);
  isConnected = false;
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
  isConnected = true;
});

redis.on("close", () => {
  console.log("Redis connection closed");
  isConnected = false;
});

// Connect on startup
redis.connect().catch((err: Error) => {
  console.error("Failed to connect to Redis:", err.message);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Closing Redis connection...");
  await redis.quit();
});

process.on("SIGINT", async () => {
  console.log("Closing Redis connection...");
  await redis.quit();
});

export { redis, isConnected };

// Cache namespace versions - increment to invalidate all keys in namespace
// This is O(1) vs KEYS pattern scan which is O(N)
const CACHE_VERSIONS: Record<string, number> = {};

async function getVersion(namespace: string): Promise<number> {
  // Check local cache first
  if (CACHE_VERSIONS[namespace] !== undefined) {
    return CACHE_VERSIONS[namespace];
  }
  // Fetch from Redis
  try {
    const version = await redis.get(`version:${namespace}`);
    CACHE_VERSIONS[namespace] = version ? parseInt(version, 10) : 1;
    return CACHE_VERSIONS[namespace];
  } catch {
    return 1;
  }
}

async function incrementVersion(namespace: string): Promise<number> {
  try {
    const newVersion = await redis.incr(`version:${namespace}`);
    CACHE_VERSIONS[namespace] = newVersion;
    return newVersion;
  } catch (err) {
    console.error(`Cache version increment error for ${namespace}:`, err);
    // Fallback: increment local version
    CACHE_VERSIONS[namespace] = (CACHE_VERSIONS[namespace] || 1) + 1;
    return CACHE_VERSIONS[namespace];
  }
}

// Cache namespaces for different data types
export const CacheNamespace = {
  COLLECTIONS_OVERVIEW: "col:overview",
  COLLECTIONS_AGGREGATES: "col:agg",
  EMPLOYEES: "emp",
  PRODUCTS: "prod",
  LOCATIONS: "loc",
  CATEGORIES: "cat",
  DELIVERIES: "del",
  DASHBOARD: "dash",
} as const;

// Default TTLs (seconds)
export const CacheTTL = {
  SHORT: 30,       // Frequently changing data
  MEDIUM: 120,     // Aggregates, overview
  LONG: 300,       // Reference data (employees, products)
  VERY_LONG: 900,  // Rarely changing data (categories, locations)
} as const;

// Production-ready cache utilities
export const cache = {
  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return isConnected;
  },

  /**
   * Get cached value with versioned key
   */
  async get<T>(namespace: string, key: string): Promise<T | null> {
    if (!isConnected) return null;
    try {
      const version = await getVersion(namespace);
      const fullKey = `${namespace}:v${version}:${key}`;
      const data = await redis.get(fullKey);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`Cache GET error for ${namespace}:${key}:`, err);
      return null;
    }
  },

  /**
   * Set cached value with versioned key and TTL
   */
  async set(namespace: string, key: string, value: unknown, ttlSeconds: number = CacheTTL.MEDIUM): Promise<void> {
    if (!isConnected) return;
    try {
      const version = await getVersion(namespace);
      const fullKey = `${namespace}:v${version}:${key}`;
      await redis.setex(fullKey, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.error(`Cache SET error for ${namespace}:${key}:`, err);
    }
  },

  /**
   * Invalidate entire namespace by incrementing version
   * This is O(1) - old keys expire naturally via TTL
   */
  async invalidate(namespace: string): Promise<void> {
    try {
      await incrementVersion(namespace);
    } catch (err) {
      console.error(`Cache invalidate error for ${namespace}:`, err);
    }
  },

  /**
   * Invalidate multiple namespaces at once
   */
  async invalidateMany(namespaces: string[]): Promise<void> {
    await Promise.all(namespaces.map(ns => this.invalidate(ns)));
  },

  /**
   * Delete a specific key (for fine-grained invalidation)
   */
  async del(namespace: string, key: string): Promise<void> {
    if (!isConnected) return;
    try {
      const version = await getVersion(namespace);
      const fullKey = `${namespace}:v${version}:${key}`;
      await redis.del(fullKey);
    } catch (err) {
      console.error(`Cache DEL error for ${namespace}:${key}:`, err);
    }
  },

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    namespace: string,
    key: string,
    compute: () => Promise<T>,
    ttlSeconds: number = CacheTTL.MEDIUM
  ): Promise<{ data: T; cached: boolean }> {
    // Try cache first
    const cached = await this.get<T>(namespace, key);
    if (cached !== null) {
      return { data: cached, cached: true };
    }
    // Compute and cache
    const data = await compute();
    await this.set(namespace, key, data, ttlSeconds);
    return { data, cached: false };
  },

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      const result = await redis.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  },
};
