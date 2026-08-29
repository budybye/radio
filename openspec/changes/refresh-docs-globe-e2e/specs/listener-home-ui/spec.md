## MODIFIED Requirements

### Requirement: Responsive listener home layout

The system SHALL render the listener Home page with a cohesive boombox-style layout that adapts to mobile and desktop viewports without horizontal scrolling or clipped primary controls.

#### Scenario: Mobile viewport layout

- **WHEN** a user opens Home on a viewport width below 768px
- **THEN** the now-playing panel, play control, and listener count remain visible without horizontal scroll
- **AND** interactive controls meet a minimum touch target of 44×44 CSS pixels

#### Scenario: Desktop viewport layout

- **WHEN** a user opens Home on a viewport width at or above 768px
- **THEN** the layout uses a single-column boombox composition with a central globe speaker above the now-playing LCD panel
- **AND** typography and spacing scale up for readability without breaking the shell proportions

## REMOVED Requirements

### Requirement: Bass-reflex speaker visualization

**Reason**: Replaced by a single central GlobeSpeaker (cobe interactive globe) that better represents the world broadcast motif and simplifies the mobile layout.

**Migration**: E2E contract `ui.speakerClass` is `globe-speaker`. Remove references to left/right `bass-reflex-speaker` in docs and tests.

## ADDED Requirements

### Requirement: Globe speaker visualization

The system SHALL display a central globe speaker on Home using an interactive 3D globe visualization within a ported-enclosure frame, including a visible rim/canvas area and a port opening beneath the globe.

#### Scenario: Globe structure visible

- **WHEN** Home is rendered after client hydration
- **THEN** a single globe speaker element is visible in the center of the boombox shell
- **AND** the enclosure uses depth cues (shadow, gradient, or equivalent) so the speaker reads as three-dimensional

#### Scenario: Playback and broadcast motion coupling

- **WHEN** the user is actively playing the live stream or MPD reports `play` state
- **THEN** the globe speaker MAY include subtle motion (globe rotation and/or rim pulse)
- **AND** when `prefers-reduced-motion: reduce` is set, decorative motion is disabled while static styling remains

#### Scenario: Globe interaction

- **WHEN** a user drags the globe canvas on a pointer-capable device
- **THEN** the globe rotates in response to the drag gesture
- **AND** rotation does not block primary play/stop controls
