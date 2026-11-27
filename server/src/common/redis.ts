import { Redis } from "ioredis";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { createAdapter } from "@socket.io/redis-adapter";
import type { Server } from "socket.io";
import { env } from "./config.js";

type RedisLogger = {
  info?: (obj: unknown, msg?: string) => void;
  warn?: (obj: unknown, msg?: string) => void;
};

let sharedClient: Redis | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

function createRedisInstance(url: string, label: string, logger?: RedisLogger): Redis {
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    commandTimeout: 2000,
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });
  let loggedError = false;
  client.on("error", (err) => {
    if (!loggedError) {
      loggedError = true;
      logger?.warn?.(
        { label, err: err instanceof Error ? err.message : "unknown" },
        "Redis unavailable; failing open to primary storage",
      );
    }
  });
  client.on("ready", () => {
    loggedError = false;
  });
  return client;
}

/**
 * Returns the shared fail-open Redis client when REDIS_URL is configured, or null otherwise.
 */
export function getRedisClient(logger?: RedisLogger): Redis | null {
  const url = env.REDIS_URL;
  if (!url) return null;
  if (!sharedClient) {
    sharedClient = createRedisInstance(url, "cache", logger);
  }
  return sharedClient;
}

/**
 * Builds an express-rate-limit RedisStore backed by ioredis, or returns undefined if Redis is unconfigured.
 */
export function createRedisStore(prefix: string): RedisStore | undefined {
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]) =>
      client.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
  });
}

/**
 * Attaches the Socket.IO Redis adapter for horizontal scaling when REDIS_URL is configured.
 */
export async function attachSocketIoRedisAdapter(
  io: Server,
  logger?: RedisLogger,
): Promise<boolean> {
  const base = getRedisClient(logger);
  if (!base || !env.REDIS_URL) return false;

  try {
    pubClient = base.duplicate();
    subClient = base.duplicate();
    pubClient.on("error", () => {});
    subClient.on("error", () => {});
    await Promise.race([
      Promise.all([waitUntilReady(pubClient), waitUntilReady(subClient)]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis adapter timeout")), 3000),
      ),
    ]);
    io.adapter(createAdapter(pubClient, subClient));
    logger?.info?.({ redis: true }, "Attached Socket.IO Redis adapter");
    return true;
  } catch (err) {
    logger?.warn?.(
      { err: err instanceof Error ? err.message : "unknown" },
      "Could not attach Socket.IO Redis adapter; continuing with single-node memory adapter",
    );
    await Promise.allSettled([pubClient?.quit(), subClient?.quit()]);
    pubClient = null;
    subClient = null;
    return false;
  }
}

function waitUntilReady(client: Redis): Promise<void> {
  if (client.status === "ready") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      client.off("ready", onReady);
      client.off("error", onError);
    };
    client.on("ready", onReady);
    client.on("error", onError);
  });
}

/**
 * Reads a JSON value from Redis cache, returning null on miss, error, or disabled Redis.
 */
export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client || client.status !== "ready") return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Writes a JSON value to Redis cache with a TTL in seconds, failing open on errors.
 */
export async function cacheSetJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const client = getRedisClient();
  if (!client || client.status !== "ready") return;
  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Fail open: primary DB / API remains source of truth
  }
}

/**
 * Deletes one or more cache keys from Redis when available.
 */
export async function cacheDelete(...keys: string[]): Promise<void> {
  const client = getRedisClient();
  if (!client || client.status !== "ready" || keys.length === 0) return;
  try {
    await client.del(...keys);
  } catch {
    // Fail open
  }
}

/**
 * Gracefully disconnects all Redis connections during server shutdown.
 */
export async function closeRedisConnections(): Promise<void> {
  const clients = [pubClient, subClient, sharedClient].filter(
    (c): c is Redis => Boolean(c),
  );
  pubClient = null;
  subClient = null;
  sharedClient = null;
  await Promise.allSettled(clients.map((c) => c.quit()));
}
