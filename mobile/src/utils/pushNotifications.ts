import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { apiRequest } from "../../session";

let initializedHandler = false;

export function ensureNotificationHandler() {
  if (initializedHandler || Platform.OS === "web") return;
  initializedHandler = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  ensureNotificationHandler();

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-guidance", {
        name: "Daily Horoscope & Guidance",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 150, 200],
        lightColor: "#E8B64C",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }
    if (finalStatus !== "granted") return null;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
        ?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenRes.data;
    if (!token) return null;

    await apiRequest(
      "/users/me/device-token",
      {
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
        appVersion: Constants.expoConfig?.version || "1.0.0",
      },
      true,
      "POST",
    );
    return token;
  } catch {
    return null;
  }
}

export async function triggerLocalTestNotificationAsync(
  title = "✦ Astro Galaxa",
  body = "Your daily cosmic guidance notifications are active on this device.",
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  ensureNotificationHandler();
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return false;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}
