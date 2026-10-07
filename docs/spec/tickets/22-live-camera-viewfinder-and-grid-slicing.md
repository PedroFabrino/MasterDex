## Parent
#27

## What to build
Build a responsive, mobile-friendly Live Camera Viewfinder modal that accesses the collector's device camera and renders transparent pocket grid guides (3x3 9-pocket, 4x3 12-pocket, 2x2 4-pocket). Collectors align physical binder pages with the guide and capture pages via tap-to-capture or stillness auto-snap. Also supports uploading batch photos or pre-recorded video files. The modal maintains a captured pages queue counter ("Pages Scanned: X"), allowing seamless multi-page flipping before review.

## Acceptance criteria
- [ ] `BinderScannerModal.tsx` implements live camera streaming via `navigator.mediaDevices.getUserMedia` with fallback to file upload.
- [ ] SVG overlay renders pocket grid boundaries matching selected layout: `3x3` (9-pocket), `4x3` (12-pocket), or `2x2` (4-pocket).
- [ ] Tap-to-snap and camera stillness detection capture high-resolution frame.
- [ ] Batch image upload and video keyframe extraction support scanning pre-existing files.
- [ ] Maintains scanned pages queue with thumbnail strip and "Review X Pages" action button.
- [ ] Full localization in `en-US` and `pt-BR`.
- [ ] Component line count <= 400 lines.

## Blocked by
- #29
