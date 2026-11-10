# Liquid Glass design research

Checked 29 October 2026. The implementation is a web interpretation of Apple's material, with no claim of native OS rendering parity.

- [Apple: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/): use the material for floating navigation and controls, preserve readable content, and avoid stacking glass layers. Applied to the sidebar, toolbar, composer and menus; their child controls use thin fills.
- [Apple: Materials](https://developer.apple.com/design/human-interface-guidelines/materials): source for material roles and regular/clear variants. The regular, readability-first direction fits this text-heavy application.
- [Kube: Liquid Glass in the Browser](https://kube.io/blog/liquid-glass-css-svg/): explains lens edges, highlights and SVG displacement. The author marks its SVG backdrop filtering as experimental and Chrome-specific. Used as an optical reference, not copied as a production renderer.
- [Liquid Glass React](https://github.com/rdev/liquid-glass-react/blob/master/README.md), read through the GitHub connector, README SHA `e8371e32f3266e99fc09c0650f0247c5e344606b`: demonstrates configurable frosting, edge lighting and interaction. Its documented partial Safari/Firefox displacement support informed the portable CSS choice. No package installed.
- [Shuding's Liquid Glass](https://github.com/shuding/liquid-glass/blob/main/README.md), read through the GitHub connector, README SHA `8edf26581a7cb7cf9f6fc2b2509b8e560b46370b`: another SVG-filter prototype; no console injection or library code used.
- [MDN: backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter): background transparency is required to see the filtered backdrop; nested backdrop roots limit the sampled content. Applied with translucent fills and a standard CSS fallback.

`concept.png` was generated with the built-in image tool from the preceding Fieldnote screenshot. It is a design reference, not a runtime UI image. All visible controls, text, gradients and surfaces in the application are real HTML/CSS/shadcn components.

## Visual verification

Reference size: 1505 by 1045 pixels. The Chromium desktop capture uses that exact viewport. Checked against the concept: inset rounded sidebar; floating title-only toolbar; white central reading field with silver edge lighting; system typography and existing copy; curved raised composer; left-hand attachment/search and right-hand model/Send; and mobile continuity. The selected model name in test captures differs because the integration test selects a catalog model. Control targets and reading-column width follow the application's accessibility/layout scale rather than raster text measurements. The glass is implemented as blur, translucency, rim lighting and depth, without live optical refraction.

No continuous JavaScript animation or new runtime dependency was added. Desktop/mobile interaction and accessibility checks use local protocol fixtures. Safari, Firefox, iOS devices and real-device GPU performance were not measured.
