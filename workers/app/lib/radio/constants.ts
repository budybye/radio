export const CURRENT_SONG_POLL_MS = 4_000;
/** 曲が変わらないとき hub が使う間隔（MPD 負荷軽減） */
export const CURRENT_SONG_UNCHANGED_POLL_MS = 8_000;
export const WS_RECONNECT_BASE_MS = 2_000;
export const WS_RECONNECT_MAX_MS = 30_000;
/** visibility 復帰時の metadata HTTP 再取得デバウンス */
export const METADATA_REFRESH_DEBOUNCE_MS = 3_000;
export const SSR_CURRENT_SONG_CACHE_MS = 3_000;
export const TITLE_FALLBACK = "320kbps";
