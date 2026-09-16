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

  const playLabel = isBuffering ? "Connecting…" : isPlaying ? "Stop" : "Play";

  return (
    <div
      className={`min-h-dvh overflow-x-hidden bg-base-100 font-sans text-base-content antialiased ${sceneGlow}`}
    >
      {mpdAgentSync}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 border-b broadcast-hairline px-4 py-4 sm:gap-4 sm:px-8 sm:py-5">
        <span className="flex items-center gap-2.5">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          <span className="broadcast-brand">RADIO</span>
        </span>
        <span className="broadcast-status" role="status">
          <span className={`status status-sm ${statusColor}`} aria-hidden="true" />
          {status}
        </span>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-8">
        <div className="py-5 sm:py-7">
          <p className="broadcast-eyebrow mb-3" id="station-label">Tune in</p>
          <div
            className="station-scroll"
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
                  data-selected={selected ? "true" : "false"}
                  className="station-chip"
                  onClick={() => selectStation(configuredStation.id)}
                >
                  {configuredStation.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] md:gap-12 lg:gap-16">
          <figure className="relative min-w-0 px-0 text-center sm:px-4">
            <div className="mx-auto w-full max-w-[min(84vw,22rem)] sm:max-w-[min(70vw,28rem)] md:max-w-[min(100%,calc(100svh-14rem))]">
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
              className="relative z-10 space-y-0.5 pt-3 pb-2 sm:space-y-1 sm:pt-4 sm:pb-4"
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="broadcast-eyebrow">Broadcast base</p>
              <p className="text-lg font-medium tracking-tight sm:text-xl">{location.label}</p>
              <p className="font-mono text-xs tabular-nums text-base-content/55">
                {formatGeo(location.coordinates[0], location.coordinates[1])}
              </p>
            </figcaption>
          </figure>

          <section className="broadcast-console min-w-0" aria-labelledby="now-playing-title">
            <div className="flex flex-col gap-6 p-5 sm:gap-7 sm:p-7">
              <div className="space-y-2.5 sm:space-y-3" aria-live="polite" aria-atomic="true">
                <p className="broadcast-eyebrow">
                  {isExternalStation ? "Live radio" : "On the station"}
                </p>
                <h1
                  id="now-playing-title"
                  className="text-[clamp(1.5rem,6vw,2.25rem)] leading-[1.08] font-semibold tracking-tight wrap-break-word"
                >
                  {headline}
                </h1>
                {artist ? (
                  <p className="text-base text-base-content/85 sm:text-lg">{artist}</p>
                ) : null}
                {album ? <p className="text-sm text-base-content/55">{album}</p> : null}
                {variant === "instrumental" ? (
                  <span className="badge badge-outline badge-sm border-base-300/80 text-base-content/70">
                    Instrumental
                  </span>
                ) : null}
                <p className="text-sm leading-relaxed text-base-content/55">
                  {isExternalStation
                    ? "Track details are not provided by this station."
                    : stationLabel}
                </p>
              </div>

              <div
                className="space-y-5 border-t broadcast-hairline pt-6"
                aria-label="Player controls"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3">
                  <button
                    type="button"
                    className="btn btn-primary min-h-12 flex-1 rounded-full font-semibold tracking-[0.02em]"
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
                    {playLabel}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-12 min-w-[5.5rem] rounded-full border broadcast-hairline px-4 text-base-content/80"
                    aria-label={isMuted ? "Unmute stream" : "Mute stream"}
                    aria-pressed={isMuted}
                    onClick={toggleMute}
                  >
                    {isMuted ? "Unmute" : "Mute"}
                  </button>
                </div>

                <label className="block space-y-2.5">
                  <span className="flex items-center justify-between broadcast-eyebrow normal-case tracking-[0.08em]">
                    <span>{isMuted ? "Volume · muted" : "Volume"}</span>
                    <span className="font-mono tabular-nums">{Math.round(volume * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    className="volume-range"
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
                  <p className="text-sm leading-relaxed text-error" role="alert">
                    {streamErrorMessage}. Try Play again or choose another station.
                  </p>
                ) : null}
                {!isExternalStation && agentErrorMessage ? (
                  <p className="text-sm leading-relaxed text-base-content/55">
                    Track information is temporarily unavailable.
                  </p>
                ) : null}
                {!isExternalStation ? (
                  <p
                    className="flex items-baseline gap-2 broadcast-eyebrow tracking-[0.18em]"
                    aria-live="polite"
                  >
                    <span>Listeners</span>
                    <span className="font-mono text-sm tracking-normal tabular-nums text-base-content/80">
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
