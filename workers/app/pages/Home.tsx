import type { HomePageProps } from "../types/inertia-pages";
import { GlobeSpeaker } from "../components/GlobeSpeaker";
import { formatStationDisplay } from "../lib/radio/now-playing";
import { useRadioPlayer } from "../lib/radio/use-radio-player";

function ListenerCountBadge({ count }: { count: number | null }) {
  return (
    <span
      className="badge badge-outline badge-sm gap-2 tracking-wide"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="opacity-70">LISTENERS</span>
      <span className="text-accent">{count ?? "—"}</span>
    </span>
  );
}

function statusLabel({
  agentError,
  agentEngaged,
  agentConnected,
  agentConnecting,
  mpdState,
  streamConnected,
  streamAudible,
  detailed = false,
}: {
  agentError: string | null;
  agentEngaged?: boolean;
  agentConnected?: boolean;
  agentConnecting?: boolean;
  mpdState: string | null;
  streamConnected: boolean;
  streamAudible: boolean;
  detailed?: boolean;
}): string {
  if (agentError) return "FAULT";
  if (streamConnected && !streamAudible) return "MUTED";
  if (detailed && agentEngaged && !agentConnected) {
    return agentConnecting ? "SYNC" : "LINK";
  }
  if (mpdState === "play" || streamAudible) return "ON AIR";
  if (detailed && streamConnected) return "LIVE";
  return detailed ? "IDLE" : "STANDBY";
}

export default function Home({
  song,
  listenerCount: initialListenerCount,
  config,
}: HomePageProps) {
  const {
    audioRef,
    agentSync,
    isMuted,
    station,
    stationId,
    selectStation,
    streamConnected,
    streamAudible,
    toggle,
    toggleMute,
    prepareStream,
    onAudioError,
    currentSong,
    listenerCount,
    mpdState,
    agentError,
    streamError,
    agentEngaged,
    agentConnected,
    agentConnecting,
  } = useRadioPlayer({
    initialSong: song ?? null,
    initialListenerCount,
    stations: config.stations,
    defaultStationId: config.defaultStationId,
  });

  const isExternalStation = station?.kind === "external";
  const stationLabel = station?.label ?? config.titleFallback;
  const nowPlaying = formatStationDisplay(
    station,
    currentSong,
    config.titleFallback,
  );
  const { headline: title, artist, album, variant } = nowPlaying;
  const statusFlags = {
    agentError: agentError ?? streamError,
    agentEngaged,
    agentConnected,
    agentConnecting,
    mpdState,
    streamConnected,
    streamAudible,
  };
  const headerStatus = statusLabel(statusFlags);
  const dockStatus = statusLabel({ ...statusFlags, detailed: true });
  const onAirVisual =
    !streamError &&
    (mpdState === "play" || streamAudible || (streamConnected && !isMuted));


  return (
    <div className="home-shell flex min-h-dvh flex-col overflow-x-hidden overscroll-y-contain font-sans">
      {agentSync}

      <header className="navbar sticky top-0 z-10 border-b border-base-300 bg-base-200/95 px-4 backdrop-blur-md">
        <div className="navbar-start">
          <span className="text-sm font-semibold tracking-wide sm:text-base">
            {stationLabel}
          </span>
        </div>
        <div className="navbar-center">
          <ListenerCountBadge count={isExternalStation ? null : listenerCount} />
        </div>
        <div className="navbar-end">
          <span
            className={`badge badge-sm gap-2 tracking-wide ${
              onAirVisual ? "badge-soft badge-success" : "badge-ghost"
            }`}
            aria-live="polite"
          >
            <span
              className={`status status-sm ${
                onAirVisual ? "status-success led-live" : "status-neutral"
              }`}
            />
            {headerStatus}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xs px-2 pt-4 sm:px-4">
        <label
          className="label px-1 text-xs tracking-[0.2em] text-base-content/55 uppercase"
          htmlFor="station-select"
        >
          Station
        </label>
        <select
          id="station-select"
          className="select select-bordered w-full"
          value={stationId}
          onChange={(event) => {
            const station = config.stations.find(
              ({ id }) => id === event.currentTarget.value,
            );
            if (station) selectStation(station.id);
          }}
          >
          {config.stations.map((configuredStation) => (
            <option key={configuredStation.id} value={configuredStation.id}>
              {configuredStation.label}
            </option>
          ))}
        </select>
      </div>

      <main className="home-main mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-center gap-8 overflow-y-auto px-2 py-8 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-12 sm:pb-32">
        <section
          aria-labelledby="now-playing-title"
          className="flex w-full flex-col items-center gap-6 sm:gap-8"
        >
          <div className="home-globe-frame w-full max-w-[min(100vw-1rem,64rem)] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl">
            <GlobeSpeaker
              audioRef={audioRef}
              active={streamConnected}
              listenerCount={isExternalStation ? 0 : listenerCount}
              mpdState={mpdState}
              hasError={Boolean(agentError ?? streamError)}
            />
          </div>

          <div className="w-full max-w-2xl text-center" aria-live="polite">
            <p className="mb-2 text-xs tracking-[0.2em] text-base-content/50 uppercase">
              Now playing
            </p>
            {artist ? (
              <p className="text-sm font-medium tracking-wide text-success/90 sm:text-base">
                {artist}
              </p>
            ) : null}
            <h1
              id="now-playing-title"
              className="mt-1 text-2xl leading-tight font-semibold wrap-break-word sm:text-3xl md:text-4xl"
            >
              {title}
            </h1>

            {isExternalStation ? (
              <p className="mt-2 text-xs tracking-[0.18em] text-base-content/50 uppercase">
                {streamError ?? "Metadata unavailable"}
              </p>
            ) : null}
            {variant === "instrumental" ? (
              <p className="mt-2 text-xs tracking-[0.18em] text-base-content/45 uppercase">
                Instrumental
              </p>
            ) : null}
            {album ? (
              <p className="mt-1 text-xs text-base-content/50 sm:text-sm">{album}</p>
            ) : null}
          </div>
        </section>
      </main>

      <audio
        className="hidden"
        ref={audioRef}
        preload="none"
        crossOrigin="anonymous"
        aria-label="Live radio stream"
        onError={onAudioError}
      >
        <track
          kind="captions"
          src="/live-captions.vtt"
          label="Live audio (no speech captions)"
        />
      </audio>

      <footer
        className="dock dock-md z-20 border-t border-base-300 bg-base-200/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:px-6"
        aria-label="Player controls"
      >
        <div className="min-w-0 max-w-64">
          <span className="block w-full truncate px-2 text-left text-xs font-medium tracking-wide sm:text-sm">
            {artist || title}
          </span>
          <span className="dock-label block truncate opacity-60">
            {artist
              ? title
              : isExternalStation
                ? streamError ?? "External station"
                : streamAudible
                  ? "Live"
                  : streamConnected
                    ? "Muted"
                    : "Press play"}
          </span>
        </div>

        <button
          type="button"
          className={`btn btn-circle btn-ghost size-12 min-h-12 min-w-12 ${
            isMuted ? "btn-active text-warning" : ""
          }`}
          aria-label={isMuted ? "Unmute stream" : "Mute stream"}
          aria-pressed={isMuted}
          disabled={!streamConnected}
          onClick={toggleMute}
        >
          <span className="dock-label">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <button
          type="button"
          className={`btn btn-circle btn-primary size-14 min-h-14 min-w-14 cursor-pointer shadow-lg transition-transform duration-150 motion-safe:hover:-translate-y-0.5 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${
            streamConnected ? "btn-active" : ""
          }`}
          aria-label={streamConnected ? "Stop playback" : "Play live stream"}
          aria-pressed={streamConnected}
          onPointerEnter={prepareStream}
          onFocus={prepareStream}
          onClick={toggle}
        >
          <span className="dock-label">{streamConnected ? "Stop" : "Play"}</span>
        </button>

        <div
          className="hidden items-center gap-2 text-xs tracking-wide text-base-content/55 uppercase sm:flex"
          role="status"
          aria-live="polite"
        >
          <span
            className={`status ${
              (agentError ?? streamError)
                ? "status-error"
                : streamAudible
                  ? "status-success led-live"
                  : agentEngaged && !agentConnected
                    ? "status-warning"
                    : "status-neutral"
            }`}
            aria-hidden
          />
          <span>{dockStatus}</span>
        </div>
      </footer>
    </div>
  );
}
