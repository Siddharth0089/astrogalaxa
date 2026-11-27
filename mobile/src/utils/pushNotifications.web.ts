/**
 * Web-safe no-op implementation so Metro Web never bundles native expo-notifications modules.
 */
export function ensureNotificationHandler(): void {
  // Native notification foreground handler is mobile-only.
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  return null;
}

export async function triggerLocalTestNotificationAsync(
  _title = "✦ Astro Galaxa",
  _body = "Your daily cosmic guidance notifications are active on this device.",
): Promise<boolean> {
  return false;
}
