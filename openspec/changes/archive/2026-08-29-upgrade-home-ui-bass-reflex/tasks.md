## 1. Backend — MPD listeners in agent state

- [x] 1.1 Add `listeners` to `mpdStatusSchema` in `parse.ts` and parse to a non-negative integer; verify with a sample `status` payload containing `listeners: 3`
- [x] 1.2 Extend `MpdAgentState` with `listenerCount: number` in `mpd-agent-types.ts` and set `initialState.listenerCount` to `0`
- [x] 1.3 Update `MpdAgent.tick()` to read `listeners` from parsed status, include `listenerCount` in state, and mark `changed` when the count differs; verify via local dev that `setState` fires on listener connect/disconnect
- [x] 1.4 Expose initial `listenerCount` on SSR Home props (extend `index.tsx` / fetch helper); verify first paint shows a number without client JS

## 2. Client — wire listener count through existing agent watch

- [x] 2.1 Extend `useMpdAgentWatch` to propagate `listenerCount` from `onStateUpdate` (callback or returned state); verify count updates in React DevTools when MPD listeners change
- [x] 2.2 Add `listenerCount` to `useRadioPlayer` return value; verify Home receives live updates without page reload
- [x] 2.3 Add `aria-live="polite"` (or equivalent) on the listener count element; verify screen reader announces updates in manual a11y check

## 3. UI — bass-reflex speakers and responsive polish

- [x] 3.1 Create `BassReflexSpeaker` component (driver + port + enclosure) replacing flat `Speaker`; verify visual includes distinct driver and port on mobile and desktop
- [x] 3.2 Add CSS utilities in `style.css` (`bass-reflex-speaker`, optional `speaker-cone-pulse`); verify `prefers-reduced-motion: reduce` disables pulse while static styling remains
- [x] 3.3 Refine Home layout (header badge for listeners, spacing, touch targets ≥44px, safe-area on dock); verify no horizontal scroll at 375px and 1280px widths
- [x] 3.4 Couple subtle speaker motion to `isPlaying`; verify motion stops when playback stops and when reduced-motion is enabled

## 4. Verification and docs

- [x] 4.1 Run `cd workers && bun run build && bun run lint` and confirm both pass
- [x] 4.2 Manual smoke: play stream, confirm title/metadata, listener count, and play/stop still work on mobile and desktop
- [x] 4.3 Update `docs/requirements.md` to note Home listener count satisfies part of リスナー数モニタリング backlog; verify doc reflects new behavior
