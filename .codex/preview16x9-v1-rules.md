# Preview16x9 v1 rules

Source checked: existing `Preview16x9`, template editor canvas/types/nodes, and the implementation brief for the new Preview16x9.

Mandatory for the first implementation:

- Render against a virtual 16:9 canvas.
- Use 1920x1080 as the recommended default virtual canvas size.
- Fit the virtual canvas into the available preview area with one uniform scale factor.
- Apply scale to the canvas/stage wrapper as a whole, not independently to each layer.
- Preserve aspect ratio: text, images, and shapes must not be stretched or distorted.
- Render only visible layers, ordered by `zIndex`.
- Support only these first-pass render targets: `background`, `text`, `image`, `shape`.
- Keep the preview responsive inside its container so it does not push the rest of the UI off screen.

Explicitly excluded from v1:

- safe area
- layer bounds
- group layers
- OnAir Player
- OSC
- LiveBoard
- external datasource
- export/import template

Mental confirmation:

- V1 scope is only `text`, `image`, `shape`, and `background`.
- Anything outside those four categories should be ignored or left unimplemented in this pass.
