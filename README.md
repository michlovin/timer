# Forest Timer

A forest-themed Pomodoro timer with a customizable Three.js character. Built with HTML, CSS, and JavaScript; no build step or framework required.

## How It Was Built

I developed Forest Timer using references, screenshots, and iterative feedback to shape the design. Three.js builds the character from geometry and extruded mask outlines; canvas textures supply wood grain and shading. Copilot helped implement and explain changes, but reviewing and testing the results was part of the process.

## What I Learned

### 3D Animation

I learned that believable animation depends on how a character’s parts are connected, where they rotate, and how they transition between poses. Every part has its own position, rotation, and pivot point. When the legs looked disconnected in the sitting pose, I realized the pivot was in the wrong place. Moving it to the hip let the legs extend forward while staying attached to the body. Grouping objects also helped details, like the leaves on the horns, move along with their parent object.

I also learned how the three axes affect movement—and that Three.js uses radians for rotation. A 90-degree turn is written as Math.PI / 2. Choosing the right axis and pivot made a big difference when creating the sitting and sleeping poses.

For movement to feel smooth, changes need to happen gradually over several frames. I used requestAnimationFrame to schedule each frame and interpolation to transition between standing, sitting, and sleeping. Sine waves added gentle breathing, bouncing, and dancing instead of sudden, jerky movements.

One challenge was getting the character to face the right way. I learned that continuous spinning and pose orientation are separate things: changing the spin speed doesn’t reliably control which way the character faces after a pause or a different session length. Resetting the orientation and setting a clear direction for the break and celebration poses made the behavior predictable.

Finally, I learned that passing code tests isn’t enough—you have to check how the animation looks. Front and side views helped me spot connection issues, while desktop and mobile checks revealed framing problems. I also made sure reduced-motion settings showed the right pose without requiring the animation.

### Other Lessons

- **Visual design:** textures can suggest soft detail more naturally than extra geometry, while CSS layout affects how the model fits the page.
- **Accessibility and release preparation:** keyboard support, reduced motion, third-party resources, secrets, and asset permissions need deliberate attention.
- **AI collaboration:** small requests, specific feedback, and independent checks were more useful than assuming generated code was finished.

## Code Guide

| File                             | Responsibility                                                             |
| -------------------------------- | -------------------------------------------------------------------------- |
| [index.html](index.html)         | Page structure, accessible controls, and script loading order              |
| [styles.css](styles.css)         | Forest theme, responsive layout, and CSS fallback character                |
| [app.js](app.js)                 | Button events, settings, saved preferences, sound, and floating mode       |
| [timer.js](timer.js)             | Countdown state and session rules, with no HTML or 3D dependencies         |
| [korok.js](korok.js)             | Camera, lighting, character geometry, poses, mask switching, and animation |
| [mask-shapes.js](mask-shapes.js) | The five flat mask outlines                                                |
| [textures.js](textures.js)       | Canvas-painted wood, eyes, mask shading, and Three.js materials            |
| [timer.test.js](timer.test.js)   | Repeatable countdown and session-transition tests                          |

The page reads timer snapshots with `getState()`; the character cannot change the countdown. Deferred scripts load in dependency order: timer, shapes, textures, Korok, then app. No Vite is required.

## Development Checks

Node.js 20 or newer is needed only for development checks, not for using the timer. There are no npm dependencies to install.

```sh
npm run check
npm test
```

Countdown tests use a controlled clock. GitHub Actions runs syntax checks and tests on pushes and pull requests; browser checks remain separate.

## Publishing Files

Run `npm run build` to generate [dist/index.html](dist/index.html) and its eight supporting files. The build uses an explicit public-file list in [build.js](build.js), excluding tests, documentation, and development files.

Edit the source files, not `dist/`: each build replaces that generated folder. Keep `dist/` ignored by Git and commit the source and build script instead.

To publish:

1. Push the source project, including `.github/workflows`, to the `main` branch on GitHub. Do not upload secrets or generated `dist/` files.
2. In the repository's **Settings > Pages**, set **Source** to **GitHub Actions**, not **Deploy from a branch**.
3. In **Actions**, run **Deploy GitHub Pages** on `main`, or push another change to `main`. The workflow checks the code, builds the app, and publishes only `dist/`.
4. Open the URL shown by the successful deployment and enable **Enforce HTTPS** in Pages settings when available.

The [deployment workflow](.github/workflows/pages.yml) is configured locally; it does not create a repository or publish anything until it is pushed and run on GitHub. If your default branch is not `main`, update the workflow's branch filter and deployment condition.

## Accessibility and Release Notes

The app includes keyboard controls, visible focus, screen-reader announcements, reduced-motion support, and a CSS fallback. It targets [WCAG 2.2 AA](https://www.w3.org/WAI/WCAG22/quickref/), but full conformance has not been verified.
