function getConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

async function command(parts) {
  const { url, token } = getConfig();
  if (!url || !token) return null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parts),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    return payload?.result ?? null;
  } catch {
    // Cache failures must never break the ecommerce API.
    return null;
  }
}

export const cacheEnabled = () => Boolean(
  getConfig().url && getConfig().token,
);

export async function cacheGet(key) {
  const value = await command(['GET', key]);
  if (value == null) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  await command(['SET', key, JSON.stringify(value), 'EX', String(ttlSeconds)]);
}

export async function cacheDelete(key) {
  await command(['DEL', key]);
}

export async function cacheIncrement(key, ttlSeconds = 86400) {
  const value = await command(['INCR', key]);
  if (value !== null) {
    await command(['EXPIRE', key, String(ttlSeconds)]);
  }
  return Number(value || 1);
}

export function cacheKey(...parts) {
  return `zstore:v1:${parts
    .map((part) => String(part ?? '').trim().toLowerCase())
    .join(':')}`;
}
