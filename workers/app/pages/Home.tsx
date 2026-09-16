import type { HomePageProps } from "../types/inertia-pages";
import { GlobeSpeaker } from "../components/GlobeSpeaker";
import { formatGeo } from "../lib/radio/globe-view";
import { formatStationDisplay } from "../lib/radio/now-playing";
import { RADIO_STATIONS } from "../lib/radio/stations";
import { useRadioPlayer } from "../lib/radio/use-radio-player";

export default function Home({
  initialCurrentSong,
  listenerCount: initialListenerCount,
  config: radioConfig,
}: HomePageProps) {
  const {
    audioRef,
    mpdAgentSync,
    isMuted,
    volume,
    setVolume,
    station,
    stationId,
    selectStation,
    isPlaying,
    isBuffering,
    isStreamAudible,
    togglePlayback,
    toggleMute,
    onAudioError,
    onAudioWaiting,
    onAudioPlaying,
    currentSong,
    listenerCount,
    agentErrorMessage,
    streamErrorMessage,
  } = useRadioPlayer({
    initialSong: initialCurrentSong ?? null,
    initialListenerCount,
    stations: radioConfig.stations,
    defaultStationId: radioConfig.defaultStationId,
  });

  const isExternalStation = station?.kind === "external";
  const stationLabel = station?.label ?? radioConfig.titleFallback;
  const location = station?.broadcastLocation ?? RADIO_STATIONS[0].broadcastLocation;

  const { headline, artist, album, variant } = formatStationDisplay(
    station,
    currentSong,
    radioConfig.titleFallback,
  );

  const status = streamErrorMessage
    ? "UNAVAILABLE"
    : isBuffering
      ? "CONNECTING"
      : isStreamAudible
        ? "LIVE"
        : isPlaying
          ? "MUTED"
          : "READY";

  const statusColor = streamErrorMessage
    ? "status-error"
    : isBuffering
      ? "status-warning"
      : isStreamAudible
        ? "status-success"
        : "status-neutral";

  const sceneGlow = streamErrorMessage
    ? "bg-[radial-gradient(ellipse_at_70%_-10%,color-mix(in_oklch,var(--color-error)_12%,transparent),transparent_58%)]"
    : isBuffering
      ? "bg-[radial-gradient(ellipse_at_70%_-10%,color-mix(in_oklch,var(--color-warning)_12%,transparent),transparent_58%)]"
      : isStreamAudible
        ? "bg-[radial-gradient(ellipse_at_70%_-10%,color-mix(in_oklch,var(--color-primary)_14%,transparent),transparent_58%)]"
        : "bg-[radial-gradient(ellipse_at_70%_-10%,color-mix(in_oklch,var(--color-primary)_8%,transparent),transparent_58%)]";

  return (
    <div className={`min-h-dvh overflow-x-hidden bg-base-100 font-sans text-base-content antialiased ${sceneGlow}`}>
      {mpdAgentSync}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-8 sm:py-5">
        <span className="flex items-center gap-3">
          <span
            className="size-1.5 rounded-full bg-primary shadow-[0_0_14px_var(--color-primary)]"
            aria-hidden="true"
          />
          <span className="text-[0.8125rem] font-semibold tracking-[0.28em] text-primary">
            RADIO
          </span>
        </span>
        <span
          className="badge badge-ghost h-8 shrink-0 gap-2 border-base-300/70 bg-base-200/40 px-2.5 text-[0.625rem] font-medium tracking-[0.14em] text-base-content/70 sm:px-3 sm:text-[0.6875rem] sm:tracking-[0.18em]"
          role="status"
        >
          <span className={`status status-sm ${statusColor}`} aria-hidden="true" />
          {status}
        </span>
      </header>

      <main className="mx-auto max-w-6xl border-t border-base-300/70 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-8">
        <div className="py-4 sm:py-6">
          <p
            className="mb-3 text-[0.6875rem] tracking-[0.22em] text-base-content/55 uppercase"
            id="station-label"
          >
            Tune in
          </p>
          <div
            className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
            role="radiogroup"
            aria-labelledby="station-label"
          >
            {radioConfig.stations.map((configuredStation) => {
              const selected = configuredStation.id === stationId;

              return (
                <button
                  key={configuredStation.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`btn min-h-11 shrink-0 snap-start rounded-full px-3 text-xs sm:px-4 sm:text-sm ${selected ? "btn-ghost border-primary/50 bg-primary/10 text-primary" : "btn-ghost border-base-300/70 text-base-content/80"}`}
                  onClick={() => selectStation(configuredStation.id)}
                >
                  {configuredStation.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] md:gap-12 lg:gap-16">
          <figure className="relative min-w-0 px-0 pt-1 text-center sm:px-6 sm:pt-4">
            <div className="mx-auto w-full max-w-[min(84vw,22rem)] sm:max-w-[min(70vw,28rem)] md:max-w-[min(100%,calc(100svh-16rem))]">
              <GlobeSpeaker
                audioRef={audioRef}
                location={location.coordinates}
                locationLabel={location.label}
                stationId={stationId}
                stations={radioConfig.stations}
                isStreamAudible={isStreamAudible}
                isBuffering={isBuffering}
                hasError={Boolean(streamErrorMessage)}
              />
            </div>
            <figcaption
              className="relative z-10 space-y-1 pt-2 pb-5 sm:pt-3 sm:pb-8"
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="text-[0.6875rem] tracking-[0.22em] text-base-content/55 uppercase">
                Broadcast base
              </p>
              <p className="text-lg font-medium tracking-tight">{location.label}</p>
              <p className="font-mono text-xs text-base-content/55">
                {formatGeo(location.coordinates[0], location.coordinates[1])}
              </p>
            </figcaption>
          </figure>

          <section
            className="card card-border min-w-0 border-base-300/70 bg-base-200/60 backdrop-blur-sm"
            aria-labelledby="now-playing-title"
          >
            <div className="card-body gap-6 p-4 sm:gap-8 sm:p-7">
              <div className="space-y-3" aria-live="polite" aria-atomic="true">
                <p className="text-[0.6875rem] tracking-[0.22em] text-base-content/55 uppercase">
                  {isExternalStation ? "Live radio" : "On the station"}
                </p>
                <h1
                  id="now-playing-title"
                  className="text-[clamp(1.875rem,8vw,2.25rem)] leading-[1.1] font-semibold tracking-tight wrap-break-word"
                >
                  {headline}
                </h1>
                {artist ? <p className="text-lg text-base-content/85">{artist}</p> : null}
                {album ? <p className="text-sm text-base-content/55">{album}</p> : null}
                {variant === "instrumental" ? (
                  <span className="badge badge-outline badge-sm border-base-300/80 text-base-content/70">
                    Instrumental
                  </span>
                ) : null}
                <p className="text-sm text-base-content/55">
                  {isExternalStation
                    ? "Track details are not provided by this station."
                    : stationLabel}
                </p>
              </div>

              <div
                className="space-y-4 border-t border-base-300/70 pt-6"
                aria-label="Player controls"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <button
                    type="button"
                    className="btn btn-primary min-h-12 flex-1 rounded-full font-semibold tracking-[0.04em]"
                    aria-label={isPlaying ? "Stop playback" : "Play live stream"}
                    aria-pressed={isPlaying}
                    onClick={togglePlayback}
                  >
                    {isBuffering ? (
                      <span
                        className="loading loading-spinner loading-xs motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : null}
                    {isPlaying ? "Stop" : "Play"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-12 min-w-0 rounded-full border border-base-300/70 px-4"
                    aria-label={isMuted ? "Unmute stream" : "Mute stream"}
                    aria-pressed={isMuted}
                    onClick={toggleMute}
                  >
                    {isMuted ? "Unmute" : "Mute"}
                  </button>
                </div>
                <label className="block space-y-2">
                  <span className="flex items-center justify-between text-[0.6875rem] tracking-[0.08em] text-base-content/55">
                    <span>{isMuted ? "Volume · muted" : "Volume"}</span>
                    <span className="tabular-nums">{Math.round(volume * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    className="range range-primary range-sm box-content w-full border-y-12 border-transparent"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(volume * 100)}
                    aria-label="Volume"
                    aria-valuetext={`${Math.round(volume * 100)}%`}
                    onChange={(event) => setVolume(event.currentTarget.valueAsNumber / 100)}
                  />
                </label>
                {streamErrorMessage ? (
                  <p className="text-sm text-error" role="alert">
                    {streamErrorMessage}. Try Play again or choose another station.
                  </p>
                ) : null}
                {!isExternalStation && agentErrorMessage ? (
                  <p className="text-sm text-base-content/55">
                    Track information is temporarily unavailable.
                  </p>
                ) : null}
                {!isExternalStation ? (
                  <p
                    className="flex gap-2 text-[0.6875rem] tracking-[0.18em] text-base-content/55"
                    aria-live="polite"
                  >
                    LISTENERS
                    <span className="font-mono tracking-normal tabular-nums text-base-content/80">
                      {listenerCount}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </main>

      <audio
        className="hidden"
        ref={audioRef}
        preload="none"
        crossOrigin="anonymous"
        aria-label="Live radio stream"
        onError={onAudioError}
        onWaiting={onAudioWaiting}
        onPlaying={onAudioPlaying}
      >
        <track kind="captions" src="/live-captions.vtt" label="Live audio (no speech captions)" />
      </audio>
    </div>
  );
}
