# listener-home-ui Specification

## Purpose
リスナー向け Home 画面で、モバイル・デスクトップ双方に最適化された没入型 UI と、ライブ配信中のストリーム接続数を提供する。

## Requirements

### Requirement: Responsive listener home layout

The system SHALL render the listener Home page with a cohesive boombox-style layout that adapts to mobile and desktop viewports without horizontal scrolling or clipped primary controls.

#### Scenario: Mobile viewport layout

- **WHEN** a user opens Home on a viewport width below 768px
- **THEN** the now-playing panel, play control, and listener count remain visible without horizontal scroll
- **AND** interactive controls meet a minimum touch target of 44×44 CSS pixels

#### Scenario: Desktop viewport layout

- **WHEN** a user opens Home on a viewport width at or above 768px
- **THEN** the layout uses a three-column boombox composition with side speakers flanking the center display
- **AND** typography and spacing scale up for readability without breaking the shell proportions

### Requirement: Bass-reflex speaker visualization

The system SHALL display left and right speakers on Home using a bass-reflex (ported enclosure) visual design that includes a visible driver cone and a port opening, distinct from the current flat grill-only appearance.

#### Scenario: Speaker structure visible

- **WHEN** Home is rendered
- **THEN** each side speaker shows a driver element and a port element within an enclosure frame
- **AND** the enclosure uses depth cues (shadow, gradient, or equivalent) so the speaker reads as three-dimensional

#### Scenario: Playback motion coupling

- **WHEN** the user is actively playing the live stream
- **THEN** the speaker visualization MAY include subtle motion tied to playback (e.g., driver pulse or port glow)
- **AND** when `prefers-reduced-motion: reduce` is set, decorative motion is disabled while static styling remains

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
