# OmaBerry branding

The project owner supplied the green OmaBerry logo on October 21, 2026. Its original transparent PNG is preserved byte for byte as [logo.png](logo.png). The mark combines the frame motif with the BlackBerry dot motif.

| Asset | Use |
| --- | --- |
| `docs/banner.png` | Owner-supplied rocket launch artwork for the README banner |
| `docs/logo.png` | Original 1254 × 1254 source |
| `docs/icon.png` | 512 × 512 repository / README icon |
| `native/src/icon-omaberry.png` | 256 × 256 native texture, top-left bar and centered menu |
| `native/host/icon.png` | 114 × 114 BB10 launcher icon |

Variants are proportional resizes of the supplied PNG, retaining transparency, colors and the artwork's existing margins. The native build uses the launcher icon from `native/host`; it does not load the historical browser icon.

Regenerate these assets on macOS:

```sh
sips -z 512 512 docs/logo.png --out docs/icon.png
sips -z 256 256 docs/logo.png --out native/src/icon-omaberry.png
sips -z 114 114 docs/logo.png --out native/host/icon.png
```

The native texture is listed in `native/src/images.json` for linear sampling. Static image references in `app.tsx` ensure it is included in the resource pack. The packaged-resource check compares its decoded pixels with the source variant.

The README banner preserves the owner-supplied rocket launch artwork. The existing green icon remains in the README and native app. The old browser icons are historical assets; the current README and native build use the assets above. Product and upstream names remain attributed in the project README; this artwork does not imply affiliation with BlackBerry or Omarchy.
