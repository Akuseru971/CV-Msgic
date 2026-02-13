import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";

const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

if (!globalThis.__cvadaptMemoryStore) {
  globalThis.__cvadaptMemoryStore = {
    users: {},
    usedStripeSessions: {},
    transactions: [],
  };
}

const memory = globalThis.__cvadaptMemoryStore;

function nowIso() {
  return new Date().toISOString();
}

function defaultUser() {
  const now = nowIso();
  return {
    credits: 3,
    createdAt: now,
    updatedAt: now,
  };
}

function userKey(userId) {
  return `user:${userId}`;
}

function sessionKey(sessionId) {
  return `stripe:session:${sessionId}`;
}

export async function getOrCreateUser(userId) {
  if (hasRedis) {
    const key = userKey(userId);
    let user = await redis.get(key);
    if (!user) {
      user = defaultUser();
      await redis.set(key, user);
    }
    return user;
  }

  if (!memory.users[userId]) {
    memory.users[userId] = defaultUser();
  }
  return memory.users[userId];
}

export async function getCredits(userId) {
  const user = await getOrCreateUser(userId);
  return Number(user.credits || 0);
}

export async function updateCredits(userId, delta, reason, metadata = {}) {
  const user = await getOrCreateUser(userId);
  const nextCredits = Math.max(0, Number(user.credits || 0) + Number(delta || 0));

  const updatedUser = {
    ...user,
    credits: nextCredits,
    updatedAt: nowIso(),
  };

  const tx = {
    id: randomUUID(),
    userId,
    delta,
    reason,
    metadata,
    createdAt: nowIso(),
  };

  if (hasRedis) {
    await redis.set(userKey(userId), updatedUser);
    await redis.rpush("transactions", tx);
  } else {
    memory.users[userId] = updatedUser;
    memory.transactions.push(tx);
  }

  return nextCredits;
}

export async function isStripeSessionUsed(sessionId) {
  if (hasRedis) {
    return Boolean(await redis.get(sessionKey(sessionId)));
  }
  return Boolean(memory.usedStripeSessions[sessionId]);
}

export async function markStripeSessionUsed(sessionId) {
  if (hasRedis) {
    await redis.set(sessionKey(sessionId), 1);
    return;
  }
  memory.usedStripeSessions[sessionId] = true;
}
