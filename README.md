# Open Flight

A standalone WebXR flight game for Meta Quest, flying over Google Photorealistic 3D Tiles. No helmet or drone frame.

## Setup

1. Turn on GitHub Pages for this repo (Settings → Pages → deploy from the `main` branch).
2. Open the Pages URL in the Meta Quest Browser.
3. On the Flight tab, pick a Map source:
   - **Google Maps:** paste a Google Maps API key. Needs a Google Cloud billing account. Restrict the key to the Map Tiles API and your Pages URL.
   - **Cesium ion:** paste a Cesium ion access token from a free cesium.com account. No billing needed. Serves the same Google 3D data with a free monthly allowance.
4. Press Save keys. Keys are stored only in that browser on that device.
5. Optionally load one or more GPX files and pick a route.
6. Press Enter VR.

## Controls

- Right trigger (hold): fly forward, or advance along the route.
- Left trigger (hold): fly backward, or go back along the route.
- Left stick: strafe and altitude.
- Right stick: turn.
- Grip (either hand): pause.

## Tuning

The Settings tab changes speeds, controls, route height, and graphics quality. Changes save on the device. Use Export and Import to copy your settings to another device.
