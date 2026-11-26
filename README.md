# OmniGenesis

**Act I — From the Unknown to Earth** is a scroll-controlled, twelve-chapter journey through cosmic history. It opens on a symbolic point of light and ends with the formation of Earth. Act II is announced as forthcoming.

## Run locally

Use Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Scroll, swipe, or use the arrow keys. Select a caption for evidence. The diamond opens the chapter index, reading mode and settings. The waveform in the lower corner switches the score on or off. Home and End seek to the limits of Act I. Select an epoch in the index to jump there, or open Evidence for its science notes.

## Build and deploy

```sh
npm run build
npm run preview
```

The production site is the contents of `dist/`. For Cloudflare Pages, select `npm run build` and the `dist` output directory. For GitHub Pages, upload that directory as a Pages deployment artifact. Vite emits relative asset paths for project subdirectories. The site uses local fonts and runs without a server-side application, credentials or paid services.

## How the experience works

- **Timeline.** Native document scroll determines one global progress value. Chapter weights assign each epoch a share of the scroll range. A pure evaluator returns the chapter, local progress and transition amount. Fast flings travel at a bounded visual speed and ease into the native position. A reversal cancels pending travel. Chapter links and Home/End seek directly. A history-entry position restores the journey across reloads.
- **Rendering.** A single WebGL context draws an oversized triangle with deterministic procedural fragment shaders. Each scene ID selects a field. Scroll sets its historical state. A separate ambient clock drives cloud flow, stellar parallax, disk motion and Earth’s rotation. Neighbouring fields share a spatial transition over the end of an epoch. The renderer issues one draw for an isolated chapter or two during a transition. The opening is a single symbolic light.
- **Performance.** The opening paints before the shader module loads. All chapter fields share one linked program. The engine animates the active field while the journey is visible. It rests on the opening, pauses behind the menu and sleeps in a hidden tab. Reduced motion uses still chapter poses. Auto quality uses sustained frame intervals and a longer recovery window to adjust the pixel budget, star sampling and noise detail. A lost context leaves navigation and text available while the renderer rebuilds its resources.
- **Captions.** Each chapter settles into view before its sentence fades in. A new scroll gesture releases the lettering into a 1.75-second drift. A small 2D canvas samples its actual glyph positions and carries their grains along curved paths. Font loading and resizing invalidate the glyph map. Reduced motion presents the line immediately.
- **Interface.** Scientific details, sound and chapter navigation live in the diamond menu. A native modal dialog handles focus containment. Reduced motion follows the system preference until overridden, and keeps a representative pose for each chapter. A text reading mode includes the entire narrative. Web Audio synthesises an optional user-activated score and fades its gain during navigation and tab changes.
- **Extending the journey.** Add a chapter record with a unique ID, positive weight, evidence notes and references. Route its ID to a field in the renderer and add its GLSL evaluator. Scroll ranges and chapter navigation derive from the records. Additional acts can instantiate the same timeline and renderer with their own ordered chapter lists.

## Science and artwork

Chapter text, dates, confidence notes, pacing weights and source IDs live in [chapters.ts](src/content/chapters.ts). [sources.ts](src/content/sources.ts) records authoritative URLs, known publication dates and verification dates. Evidence panels identify observations, hypotheses and artistic interpretations. Epochs overlap and the journey uses non-linear pacing. The opening zero represents an undefined clock.

Chapter 07 includes the dated Webb observation of MoM-z14 at about 280 million years after the Big Bang. Its evidence panel links to [NASA’s January 28, 2026 release](https://science.nasa.gov/missions/webb/nasa-webb-pushes-boundaries-of-observable-universe-closer-to-big-bang/).

The shader fields, lettering effects and audio were created for this project. The Milky Way flight enters a spiral arm and shares a focal cloud with the solar-system scene. The synthesised score pairs low sustained tones with a sparse forty-second melody. The menu pairs self-hosted Radley headings with Charter or a system serif for longer notes. The last-scattering veils, young planets and molten surface are artistic interpretations. Radley, Instrument Serif and IBM Plex Mono are self-hosted under the SIL Open Font License. The licences ship in [public/licenses](public/licenses/).

## Verification

```sh
npm test
npm run test:browser
npx playwright install webkit
WEBKIT=1 npm run test:browser
```

The browser suite defaults to installed Google Chrome. It can use another Chromium channel through `PLAYWRIGHT_CHANNEL`. The WebKit run uses Playwright’s installed WebKit build. Tests start Vite automatically or reuse the server on port 5173. Screenshots are written to the ignored `test-results/` directory.

The tests cover weighted boundaries, reverse traversal, reconstruction of a reduced-motion scene, ambient movement at rest, delayed caption appearance, glyph dispersal, source integrity, native wheel scrolling, rapid touch swipes, keyboard seeking, reload restoration, viewport rotation, menu focus, sound controls, reading mode, user preferences, missing graphics code, context loss and restoration.

**Visual checks.** Inspected the minimal opening, Cosmic Dawn, moving Earth and the dust leaving the letterforms. Compact-phone checks keep captions within the viewport. The WebKit run checks the interface and graphics on the desktop engine. Physical iPhone, Android, trackpad hardware and audible output still need device checks.

**Performance diagnostic.** Open the development server with `?diagnostics=1` to see the frame interval, estimated FPS, draw count and active quality. It is omitted from production builds. The traversal test records median and 95th-percentile animation-frame intervals over 180 frames at 1280 × 800. These are browser frame-delivery measurements rather than GPU timer queries.

On a MacBook Air with Apple M1, 8 GB memory and macOS 26.6.2, a 180-frame sample at Balanced quality returned these intervals on the local development build.

| Browser environment | Median | 95th percentile |
| --- | ---: | ---: |
| Headless Google Chrome, ANGLE Metal | 16.7 ms | 16.7 ms |
| Playwright WebKit 26.0, Apple GPU | 17 ms | 18 ms |

For a manual device check, begin with sound off, reverse direction during the first stellar ignition, then jump to Earth and back through the index. Rotate the device while the chapter is visible and check the caption against the timeline. Enable the score with a tap, background the tab and return. Use the reading view for the same chapter and open its evidence links.
# omnigenesis
