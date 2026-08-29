# listener-home-ui Specification

## Purpose
リスナー向け Home 画面で、モバイル・デスクトップ双方に最適化された没入型 UI と、ライブ配信中のストリーム接続数を提供する。

## Requirements

### Requirement: Responsive listener home layout

The system SHALL render the listener Home page with a minimal single-column layout that adapts to mobile and desktop viewports without horizontal scrolling or clipped primary controls.

#### Scenario: Mobile viewport layout

- **WHEN** a user opens Home on a viewport width below 768px
- **THEN** the globe speaker, now-playing panel, play control, and listener count remain visible without horizontal scroll
- **AND** interactive controls meet a minimum touch target of 44×44 CSS pixels

#### Scenario: Desktop viewport layout

- **WHEN** a user opens Home on a viewport width at or above 768px
- **THEN** the layout uses a centered single column with a large globe speaker above the now-playing text block
- **AND** typography and spacing scale up for readability without breaking proportions

### Requirement: Globe speaker visualization

The system SHALL display a central globe speaker on Home using an interactive 3D globe (cobe) rendered on a canvas element with the stable CSS class `globe-speaker`.

#### Scenario: Globe structure visible

- **WHEN** Home is rendered after client hydration
- **THEN** a single globe canvas is visible in the center of the main content area
- **AND** the canvas exposes `aria-label="Rotating globe"` for assistive technology and E2E discovery

#### Scenario: Playback and broadcast motion coupling

- **WHEN** the user is actively playing the live stream or MPD reports `play` state
- **THEN** the globe MAY include subtle rotation and/or rim pulse motion
- **AND** when `prefers-reduced-motion: reduce` is set, decorative motion is disabled while static styling remains

#### Scenario: Error indication

- **WHEN** MpdAgent reports a persistent error to the client
- **THEN** the globe canvas MAY add the `globe-speaker-error` class for visual fault indication

### Requirement: Live listener count on Home

The system SHALL display the current MPD stream listener count on the listener Home page, labeled for end users (e.g., "LISTENERS" or localized equivalent).

#### Scenario: Initial render with SSR data

- **WHEN** Home is server-rendered
- **THEN** the page shows a non-negative integer listener count from the latest available MPD `status` `listeners` value
- **AND** if the value is unavailable, the UI shows `0` or an explicit unavailable state without breaking the page

#### Scenario: Live update via agent state

- **WHEN** MpdAgent detects a change in MPD `listeners` while a client is connected
- **THEN** the displayed listener count updates without a full page reload
- **AND** the update uses the same Agents SDK state push channel as current-song metadata

#### Scenario: Listener count accessibility

- **WHEN** the listener count is shown
- **THEN** it is exposed to assistive technology via a live region or status role so changes are announced politely

### Requirement: Preserve existing playback behavior

The system SHALL NOT regress existing live audio playback, current-song metadata display, or play/stop controls on Home as part of this UI change.

#### Scenario: Play and metadata unchanged

- **WHEN** a user plays or stops the stream on the upgraded Home page
- **THEN** audio connects to the configured stream URL as before
- **AND** title, artist, and album metadata continue to update via the existing MpdAgent watch path
