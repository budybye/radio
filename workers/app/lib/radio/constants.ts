export const CURRENT_SONG_POLL_MS = 4_000;
/** 曲が変わらないとき MpdAgent が使う間隔（MPD 負荷軽減） */
export const CURRENT_SONG_UNCHANGED_POLL_MS = 8_000;
/** 再生していないクライアント向けの低速ポーリング（listener / mpdState） */
export const WATCH_POLL_MS = 15_000;
/** visibility 復帰時の metadata HTTP 再取得デバウンス */
export const METADATA_REFRESH_DEBOUNCE_MS = 3_000;
/** MpdAgent `@callable` RPC（visibility refresh 等） */
export const MPD_AGENT_RPC_TIMEOUT_MS = 8_000;
export const SSR_CURRENT_SONG_CACHE_MS = 3_000;
export const TITLE_FALLBACK = "320kbps";
/** mpc-bridge HTTP 呼び出しのタイムアウト */
export const MPD_TIMEOUT_MS = 8_000;
/** MPD 配信拠点（Globe マーカー / 放送アーク起点） */
export const BROADCAST_HUB: readonly [number, number] = [35.6762, 139.6503];
