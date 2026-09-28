# Environment artwork

All 24 PNG files were downloaded from Kenney's official website on 2026-09-21.
They are bundled locally, not hotlinked. Original source files are unmodified.

| Local directory | Official asset pack | License |
| --- | --- | --- |
| `buildings/` | [Platformer Art Buildings](https://kenney.nl/assets/platformer-art-buildings) | CC0 |
| `industrial/` | [Platformer Pack Industrial](https://kenney.nl/assets/platformer-pack-industrial) | CC0 |
| `background/` | [Background Elements](https://kenney.nl/assets/background-elements) | CC0 |

Artist: **Kenney / Kenney Vleugels**. Each directory includes the original license notice.
License reference: https://creativecommons.org/publicdomain/zero/1.0/

The original packs permit personal and commercial use; credit is appreciated but not required.

## Usage

- Buildings: wall tiles, arched windows, fences, chimneys, anemometers and a hanging café sign.
- Industrial: cross-braced crate (`057`), green drum (`104`), steel beam (`035`), vent (`045`) and pipe (`085`).
- Background: two clouds and the full moon.

`environment.js` assembles building layers, caches nighttime shading, and crops the drum's transparent side margins to match its collision bounds. These are runtime rendering operations; the source PNG files are unchanged.

These are PNG exports of flat 2D artwork, not SVG files. The industrial source package also includes a vector sheet, available from the official download. The user's vector cat is not included or replaced here.

## Original downloads

- https://kenney.nl/media/pages/assets/platformer-art-buildings/6aec290935-1677696287/kenney_platformer-art-buildings.zip
- https://kenney.nl/media/pages/assets/platformer-pack-industrial/f61c3a5fc4-1677696008/kenney_platformer-pack-industrial.zip
- https://kenney.nl/media/pages/assets/background-elements/b66a1ddec7-1677670395/kenney_background-elements.zip
