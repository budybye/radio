import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";

import { CURRENT_SONG_SWR_KEY } from "./constants";
import type { CurrentSongClient } from "./serialize";

/** mutate-only キャッシュ。fetcher なし = 外部 push 専用ストア */
const MANUAL_CACHE = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  revalidateOnMount: false,
  shouldRetryOnError: false,
} as const;

/** SWR キャッシュから現在曲を読む（useContext 的） */
export function useCurrentSong(fallback: CurrentSongClient | null = null) {
  const { data } = useSWR<CurrentSongClient | null>(CURRENT_SONG_SWR_KEY, {
    ...MANUAL_CACHE,
    fallbackData: fallback,
  });
  return data ?? null;
}

/** DO watch / refresh から SWR キャッシュを更新する */
export function useCurrentSongMutate() {
  const { cache, mutate } = useSWRConfig();

  const get = useCallback(
    () =>
      (cache.get(CURRENT_SONG_SWR_KEY)?.data as
        | CurrentSongClient
        | null
        | undefined) ?? null,
    [cache],
  );

  const set = useCallback(
    (
      updater:
        | CurrentSongClient
        | null
        | ((prev: CurrentSongClient | null) => CurrentSongClient | null),
    ) =>
      mutate(
        CURRENT_SONG_SWR_KEY,
        (prev) =>
          typeof updater === "function"
            ? updater(prev ?? null)
            : updater,
        { revalidate: false },
      ),
    [mutate],
  );

  return { get, set };
}
