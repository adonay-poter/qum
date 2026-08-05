/** Android package / Capacitor app id — also used as the custom URL scheme for deep links. */
export const APP_ID = 'com.arch.surf';

/** Opens the installed app from email links, e.g. com.arch.surf://auth/callback */
export function getAuthDeepLinkUrl(): string {
  return `${APP_ID}://auth/callback`;
}
