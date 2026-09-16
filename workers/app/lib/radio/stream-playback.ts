import Hls from "hls.js";

export function isHlsStreamUrl(streamUrl: string): boolean {
  try {
    const { pathname } = new URL(streamUrl);

    return pathname.endsWith(".m3u8") || streamUrl.includes(".m3u8");
  } catch {
    return false;
  }
}

export type StreamAttachment = {
  destroy(): void;
};

export function attachStreamToAudio(audio: HTMLAudioElement, streamUrl: string): StreamAttachment {
  const teardownNative = (): void => {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  };

  if (!isHlsStreamUrl(streamUrl)) {
    audio.src = streamUrl;
    audio.load();

    return { destroy: teardownNative };
  }

  if (audio.canPlayType("application/vnd.apple.mpegurl")) {
    audio.src = streamUrl;
    audio.load();

    return { destroy: teardownNative };
  }

  if (!Hls.isSupported()) {
    audio.src = streamUrl;
    audio.load();

    return { destroy: teardownNative };
  }

  const hls = new Hls();

  hls.loadSource(streamUrl);
  hls.attachMedia(audio);

  return {
    destroy() {
      hls.destroy();
      teardownNative();
    },
  };
}
