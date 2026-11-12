# Open Flight

Fly a plane over the real world on a Meta Quest, standalone, in the browser. Pop balloons, shoot down drones and race through rings.

Play it: https://schitmuncher.github.io/Vr-Earth/ (open in the Meta Quest Browser and press Enter VR).

## Maps

- **Free world terrain (default):** needs no key and no account. Real elevation with satellite imagery.
- **Google photorealistic 3D:** paste a Google Maps key (needs a Google Cloud billing account), or a free Cesium ion token. Keys are stored only in the browser on that device.

## Controls (Quest)

- Right trigger: throttle. A: boost. Right grip: stop and hover.
- Right stick: turn, climb and dive. Settings can switch this to tilting your right hand like a toy plane.
- Left trigger or X: fire. Aim by pointing your left hand.
- Left grip: reverse. Left stick: side-slip and lift.
- B: switch between first person (you are the plane) and chase view. Y: back to the start.

Hover and route-rail flight styles are in Settings. With a GPX file loaded, the rings follow your track and your best time is saved.

"Play on this screen" runs the same game with a keyboard or touch, without a headset.

## Credits

- Elevation: Terrain Tiles (Mapzen, AWS Open Data).
- Imagery: Sentinel-2 cloudless (https://cloudless.eox.at) by EOX IT Services GmbH, contains modified Copernicus Sentinel data 2020.
- Google 3D map data © Google.
- Libraries: see `lib/NOTICE.md`.
