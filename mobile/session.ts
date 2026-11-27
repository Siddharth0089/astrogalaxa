import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const api =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:3000/api/v1"
    : "http://localhost:3000/api/v1");
const sessionKey = "nakshatra_session";
const deviceKey = "nakshatra_device_id";
type Session = { accessToken: string; refreshToken: string };
type Payload = Session & {
  user: {
    name?: string;
    nameSign?: unknown;
    sunSign?: string;
    onboardingComplete?: boolean;
    email?: string;
  };
  onboardingComplete: boolean;
};
let current: Session | null = null;
let pending: Promise<Payload> | null = null;
let memoryDeviceId: string | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function send(
  path: string,
  body?: unknown,
  token?: string,
  method?: string,
) {
  const response = await fetch(`${api}${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      json.error?.message || "Request failed",
    );
  return json.data;
}
async function read(key: string) {
  return Platform.OS === "web" ? null : SecureStore.getItemAsync(key);
}
async function write(key: string, value: string) {
  if (Platform.OS !== "web") await SecureStore.setItemAsync(key, value);
}
async function remove(key: string) {
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(key);
}
export async function deviceDetails() {
  let deviceId = memoryDeviceId ?? (await read(deviceKey));
  if (!deviceId) {
    deviceId = Crypto.randomUUID();
    await write(deviceKey, deviceId);
  }
  memoryDeviceId = deviceId;
  const platform =
    Platform.OS === "ios"
      ? "ios"
      : Platform.OS === "android"
        ? "android"
        : "web";
  return { deviceId, platform };
}
export async function saveSession(payload: Payload) {
  const next = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
  await write(sessionKey, JSON.stringify(next));
  current = next;
}
export async function restoreSession(): Promise<Payload | null> {
  const saved = await read(sessionKey);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string"
    )
      throw new Error("Invalid session");
    current = parsed;
  } catch {
    await remove(sessionKey);
    return null;
  }
  try {
    return await refreshSession();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      current = null;
      await remove(sessionKey);
      return null;
    }
    throw error;
  }
}
async function refreshSession(): Promise<Payload> {
  if (!pending)
    pending = (async () => {
      if (!current) throw new ApiError(401, "Please sign in again");
      const result = await send("/auth/refresh", {
        refreshToken: current.refreshToken,
        ...(await deviceDetails()),
      });
      await saveSession(result);
      return result;
    })().finally(() => {
      pending = null;
    });
  return pending;
}
export async function apiRequest(
  path: string,
  body?: unknown,
  authenticated = false,
  method?: string,
) {
  const attemptedToken = authenticated ? current?.accessToken : undefined;
  try {
    return await send(path, body, attemptedToken, method);
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      !authenticated ||
      !current
    )
      throw error;
    if (current.accessToken === attemptedToken) await refreshSession();
    return send(path, body, current?.accessToken, method);
  }
}
export async function logoutSession() {
  if (current)
    await send("/auth/logout", { refreshToken: current.refreshToken });
  await clearSession();
}
export async function clearSession() {
  current = null;
  await remove(sessionKey);
}
