/** mpc-bridge の origin。本番は https://MPC_HOST、E2E ダミーは MPC_BRIDGE_BASE_URL */
export function mpcBridgeOrigin(
  mpcHost: string,
  baseUrl?: string,
): string {
  if (baseUrl) {
    const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return new URL(normalized).origin;
  }
  return `https://${mpcHost}`;
}

export function mpcBridgeUrl(
  mpcHost: string,
  cmd: string,
  baseUrl?: string,
): string {
  return `${mpcBridgeOrigin(mpcHost, baseUrl)}/mpd.cgi?cmd=${encodeURIComponent(cmd)}`;
}
