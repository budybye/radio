## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Bass-reflex speaker visualization

**Reason**: Replaced by a single central GlobeSpeaker (cobe interactive globe) that better represents the world broadcast motif and simplifies the mobile layout.

**Migration**: E2E contract `ui.speakerClass` is `globe-speaker` on the canvas element. Remove references to left/right `bass-reflex-speaker` in docs and tests.

## ADDED Requirements

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
