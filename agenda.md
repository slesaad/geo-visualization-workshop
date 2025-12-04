# 🌟 **Two-Day Interactive Visualization Workshop (Refined Agenda)**

---

# **🟦 DAY 1 — Foundations → Deck.gl Core → Shaders → Custom Layers**


## **1. Fundamentals of 3D Visualization (Graphics Pipeline) — 45 min**

Explain *only* what maps to the tasks they’ll do later:

* Coordinate spaces (model → world → view → clip → screen)
* Buffers & attributes
* Vertex vs fragment shaders
* Uniforms vs attributes
* Textures (very high-level)
* Animation on the GPU (time uniform)

👉 **Mini-exercise:** “Identify where animation lives” (CPU vs shader vs attribute update).

---
## **2. Deck.gl Intro**

* Install / check environment
* Run a simple deck.gl starter with a single ScatterplotLayer
* Quick warm-up: change colors, sizes, add tooltip

---

## **3. Deck.gl Architecture & Existing Layers — 45 min**

Cover how deck.gl renders WebGL without requiring boilerplate:

* Life cycle: initializeState → updateState → draw
* Accessors (`getPosition`, `getFillColor`)
* Using built-in layers: Scatterplot, GeoJson, Icon, Path, Arc, Text, Terrain, Trips
* Layer ordering, blending, coordinate systems

👉 **Follow-along:**
Build a small 3-layer viz:

* GeoJsonLayer of city boundaries
* ScatterplotLayer of points
* TextLayer for labels

---

## **4. Extensions (Clip, Filter, Mask, Terrain) — 1 hr**

Show examples + quick code:

* ClipExtension → rectangular crop
* DataFilterExtension → attribute-based filtering
* MaskExtension → mask layer with GeoJSON
* TerrainExtension → drape data onto DEM terrain

👉 **Hands-on challenge:**
“**Geofenced Explorer**”:
Mask to a polygon → filter by year slider → clip a bounding box.

---

## **5. Shader Injection — 1 hr**

Concept:

* Inject GLSL snippets into deck.gl’s shader hooks
* Post-process color, position, size
* Introduce `time` uniform

👉 **Exercise:**

* Make points pulse
* Make points fade in/out
* Add noise or waves with `sin(time + x)`

This builds intuition for shader code without full custom-layer complexity.

---

## **6. Custom Deck.gl Layer — 1.5 hr**

Deep dive into:

* Creating a new Layer class
* Defining attributes (positions, sizes, UVs)
* `initializeState` / `updateState`
* Using custom vertex + fragment shaders

👉 **Main hands-on project:** **CustomSquareLayer**

* Takes `{position, size}`
* Renders instanced squares
* Adds animated color or size via `time` uniform

This is the core technical skill they’ll need for Day 2.

---

## **✨ End of Day 1 Mini-Project (45 min)**

“**Your First Custom Visualization**”
Participants choose 1:

* Animated squares that follow a path
* Pulsing points with shader injection + filtering
* Masked & filtered geospatial map
* Custom icons on terrain

Keep it small, fun, and reinforcing.

---

# **🟩 DAY 2 — 3D Models → Orbits → Textures → Particle Systems**

Now that they know the fundamentals and how to make custom layers, Day 2 becomes creative and exciting.

---

## **7. Custom Animation & Time-Based Effects — 45 min**

Topics:

* RequestAnimationFrame loop
* Passing time uniform
* CPU vs GPU animation
* Mixing user interaction + animation

👉 **Exercise:**
Move objects along predefined paths (like buses or satellites).
They animate a marker along a series of coordinates.

---

## **8. 3D Model Animation on a Map — 1 hr**

Show:

* Loading GLTF models into deck.gl (SimpleMeshLayer or custom layer)
* Rotating, scaling
* Updating position each frame
* Keeping model aligned to the globe (if using Mapbox/Terria/etc.)

👉 **Project:**
Animate a **3D car / plane / drone** moving across the map using animation time.
Stretch goal: rotate model based on bearing.

---

## **9. Moon/Sun Sphere & Texture Mapping — 45 min**

Teach:

* Sphere geometry
* UV coordinates
* Loading texture images
* Rotating a textured sphere
* Using fragment shaders to adjust brightness/emission

👉 **Exercise:**

* Build a sphere
* Apply moon texture
* Add rotation & specular or glow
* Optional: create the sun with glowing shader

---

## **10. Orbit Animation (Planet Around Sun) — 45 min**

Build on the sphere work:

* Compute orbit positions (sin/cos around a center)
* Animating revolution + rotation
* Use groups of layers or custom layer for parent/child transform

👉 **Exercise:**
Create a small solar-system model:

* Sun at center
* Planet with orbital radius
* Moon orbiting the planet
* All spinning

Super visual, very fun, introduces hierarchical transforms.

---

## **11. Textures (Deep Dive) — 45 min**

Cover:

* Sampling textures in fragment shader
* UV transformation
* Using textures as data (velocity fields)
* Video textures (optional)

👉 **Exercise:**
Apply a texture to:

* A quad made with a custom layer OR
* A mesh (if using SimpleMeshLayer)

---

## **12. Particle Systems / Particle Advection — 1.5 hr**

This is the big finale.

Teach:

* GPU particle simulation basics
* Framebuffer ping-pong
* Using textures to store particle positions
* Reading velocity from a field (winds, ocean currents)
* Updating particles every frame
* Rendering with instancing

👉 **Hands-On Project:**
A fully working **GPU particle advection layer**:

* Particles drift slowly
* Optionally follow a velocity texture
* Fade in/out trails using blending

Optional stretch: toggle between wind field textures or change particle density.

---

## **✨ Final Project (45–60 min)**

Participants build one of the following:

* **Wind advection visualization** (particles + textures)
* **Orbiting planets with moon + custom shading**
* **3D airplane/drone flight animation**
* **Shader-art layer with geospatial data**
* **Terrain-based 3D visualization with moving objects**

They present demos at the end.

---

# 🎁 Deliverables You Can Prepare for Participants

I can generate all of these if you want:

* Starter repos:

  * `01-basics`, `02-shader-injection`, `03-custom-layer`, `04-animation`, `05-models`, `06-planets`, `07-particles`
* Step-by-step Jupyter-like notebooks (Markdown-based)
* A printable “Deck.gl Cheat Sheet”
* A short “Graphics Pipeline for JS Devs” PDF
* A bonus “Shader Cookbook” with GLSL snippets
* A curated set of textures (moon, sun, earth, noise, wind fields)
