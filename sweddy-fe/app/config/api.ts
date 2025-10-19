const DEFAULT_REMOTE_ORIGIN = "https://sweddy.onrender.com";
const DEFAULT_LOCAL_ORIGIN = "http://localhost:3001";

function resolveFromEnv(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_API_ORIGIN ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (raw && raw.trim().length > 0) {
    return raw.trim().replace(/\/+$/, "");
  }
  return undefined;
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getApiOrigin(): string {
  const envOrigin = resolveFromEnv();
  if (envOrigin) {
    return envOrigin;
  }

  if (typeof window !== "undefined") {
    if (isLocalHost(window.location.hostname)) {
      return DEFAULT_LOCAL_ORIGIN;
    }
  } else if (process.env.NODE_ENV !== "production") {
    return DEFAULT_LOCAL_ORIGIN;
  }

  return DEFAULT_REMOTE_ORIGIN;
}

export function getApiBaseUrl(): string {
  return `${getApiOrigin()}/api`;
}
