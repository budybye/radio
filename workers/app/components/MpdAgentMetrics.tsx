import { useMpdAgentMetrics } from "../lib/radio/use-mpd-agent-metrics";

function formatTime(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleTimeString();
}

export function MpdAgentMetrics() {
  const { metrics, loadError, agentState } = useMpdAgentMetrics();

  return (
    <details className="mx-auto mt-6 max-w-md text-xs opacity-70">
      <summary className="cursor-pointer text-center">MPD Agent</summary>
      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 font-mono">
        <dt>state</dt>
        <dd>{agentState?.mpdState ?? "—"}</dd>
        <dt>songid</dt>
        <dd>{agentState?.songid || "—"}</dd>
        <dt>polls</dt>
        <dd>{metrics?.pollCount ?? "…"}</dd>
        <dt>errors</dt>
        <dd>{metrics?.errorCount ?? "…"}</dd>
        <dt>last poll</dt>
        <dd>{formatTime(metrics?.lastPollAt ?? 0)}</dd>
        <dt>last OK</dt>
        <dd>{formatTime(metrics?.lastSuccessAt ?? 0)}</dd>
        {metrics?.lastError && (
          <>
            <dt>last err</dt>
            <dd className="col-span-1 truncate text-error" title={metrics.lastError}>
              {metrics.lastError}
            </dd>
          </>
        )}
        {loadError && (
          <>
            <dt>agent</dt>
            <dd className="text-error">{loadError}</dd>
          </>
        )}
      </dl>
    </details>
  );
}
