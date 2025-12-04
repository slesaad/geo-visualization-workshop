# 🌟 **Two-Day Interactive Visualization Workshop (Revised Agenda)**

---

## 📋 **Pre-Workshop Checklist (Send 1 Week Before)**

Participants must complete before Day 1:

- [ ] Node.js v18+ installed
- [ ] Browser with WebGL2 support (Chrome/Firefox/Edge recommended)
- [ ] Clone starter repo and run `npm install && npm run dev`
- [ ] Verify you see a spinning cube at `localhost:3000`
- [ ] Install VS Code extensions: GLSL Lint, Shader languages support
- [ ] Join the workshop Slack/Teams channel

**Troubleshooting doc:** [Link to shared Google Doc]

---

# **🟦 DAY 1 — Foundations → Deck.gl Core → Shaders → Custom Layers**

| Time | Section | Duration |
|------|---------|----------|
| 9:00 | Section 1: Graphics Pipeline | 45 min |
| 9:45 | ☕ Break | 15 min |
| 10:00 | Section 2: Deck.gl Intro | 30 min |
| 10:30 | Section 3: Architecture & Layers | 45 min |
| 11:15 | ☕ Break | 15 min |
| 11:30 | Section 4: Extensions | 60 min |
| 12:30 | 🍽️ Lunch | 60 min |
| 13:30 | Section 5: Shader Injection | 60 min |
| 14:30 | ☕ Break | 15 min |
| 14:45 | Section 6: Custom Layers | 90 min |
| 16:15 | ☕ Break | 15 min |
| 16:30 | End of Day Mini-Project | 45 min |
| 17:15 | Demos & Wrap-up | 15 min |

---

## **1. Fundamentals of 3D Visualization (Graphics Pipeline) — 45 min**

Explain *only* what maps to the tasks they'll do later:

* Coordinate spaces (model → world → view → clip → screen)
* Buffers & attributes
* Vertex vs fragment shaders
* Uniforms vs attributes
* Textures (very high-level)
* Animation on the GPU (time uniform)

👉 **Mini-exercise (10 min):** "Identify where animation lives"
- Given 5 code snippets, classify each as: CPU animation / shader animation / attribute update
- Quick group discussion of answers

**🎯 Checkpoint:** Thumbs up in chat when done

---

## **2. Deck.gl Intro — 30 min**

* Install / check environment (should be pre-done)
* Run a simple deck.gl starter with a single ScatterplotLayer
* Quick warm-up: change colors, sizes, add tooltip

👉 **Follow-along:** Get the starter running, customize one visual property

**🔧 Stretch goal:** Add a second layer type (try ArcLayer)

**🎯 Checkpoint:** Screenshot your customized map in chat

---

## **3. Deck.gl Architecture & Existing Layers — 45 min**

Cover how deck.gl renders WebGL without requiring boilerplate:

* Life cycle: initializeState → updateState → draw
* Accessors (`getPosition`, `getFillColor`)
* Using built-in layers: Scatterplot, GeoJson, Icon, Path, Arc, Text, Terrain, Trips
* Layer ordering, blending, coordinate systems

👉 **Follow-along (20 min):** Build a 3-layer viz:
* GeoJsonLayer of city boundaries
* ScatterplotLayer of points
* TextLayer for labels

**🔧 Stretch goal:** Add an ArcLayer connecting points

**🎯 Checkpoint:** Share screenshot of your 3-layer map

---

## **4. Extensions (Clip, Filter, Mask, Terrain) — 60 min**

Show examples + quick code:

* ClipExtension → rectangular crop
* DataFilterExtension → attribute-based filtering
* MaskExtension → mask layer with GeoJSON
* TerrainExtension → drape data onto DEM terrain

👉 **Hands-on challenge (30 min):** "**Geofenced Explorer**"
Mask to a polygon → filter by year slider → clip a bounding box.

**🔧 Stretch goal:** Add a terrain layer and drape your filtered data onto it

**🎯 Checkpoint:** Demo your geofenced explorer to a neighbor (pair up!)

---

## **5. Shader Injection — 60 min**

Concept:

* Inject GLSL snippets into deck.gl's shader hooks
* Post-process color, position, size
* Introduce `time` uniform

👉 **Exercise (35 min):** Pick 2 of these:
* Make points pulse (size oscillation)
* Make points fade in/out (alpha oscillation)
* Add waves with `sin(time + position.x)`
* Color gradient based on time

**🐛 Debugging exercise (10 min):** Fix 3 bugs in provided shader code
- Provided code has: wrong uniform name, missing precision, syntax error
- First to fix all 3 wins a prize 🏆

**🎯 Checkpoint:** Screen share your animated layer (volunteers)

---

## **6. Custom Deck.gl Layer — 90 min** 👥 *Pair Programming Recommended*

Deep dive into:

* Creating a new Layer class
* Defining attributes (positions, sizes, UVs)
* `initializeState` / `updateState`
* Using custom vertex + fragment shaders

👉 **Main hands-on project (60 min):** **CustomSquareLayer**
* Takes `{position, size}`
* Renders instanced squares
* Adds animated color or size via `time` uniform

**Pairing:** Work in pairs. One person "drives" (types), the other "navigates" (guides). Switch roles at 30 min.

**🔧 Stretch goals:**
- Add a `getColor` accessor
- Make squares rotate based on time
- Add mouse interaction (hover effect)

**🎯 Checkpoint:** Each pair demos their layer (30 seconds each)

---

## **✨ End of Day 1 Mini-Project — 45 min**

"**Your First Custom Visualization**"

Choose 1 starter template (80% complete) and finish it:

| Option | What's Done | What You Add |
|--------|-------------|--------------|
| A. Animated Path | Square layer + path data | Animation along path |
| B. Pulsing Points | Shader injection setup | Filtering + interaction |
| C. Masked Map | GeoJSON + mask setup | Filter slider + styling |
| D. Terrain Icons | Terrain layer + icons | Custom icon placement |

**🎯 Demo Round (15 min):** Lightning demos — 1 minute each, volunteer basis

---

## **📝 Day 1 Quiz (Take-Home or Start of Day 2)**

5 quick questions to reinforce learning:
1. What's the difference between a uniform and an attribute?
2. In which shader do you modify vertex positions?
3. What does `getPosition` return in deck.gl?
4. Name two deck.gl extensions and their use cases.
5. What's the purpose of `initializeState` in a custom layer?

---

# **🟩 DAY 2 — 3D Models → Orbits → Textures → Particle Systems**

| Time | Section | Duration |
|------|---------|----------|
| 9:00 | Quiz Review & Q&A | 15 min |
| 9:15 | Section 7: Animation & Time | 45 min |
| 10:00 | ☕ Break | 15 min |
| 10:15 | Section 8: 3D Models | 60 min |
| 11:15 | ☕ Break | 15 min |
| 11:30 | Section 9: Texture Mapping | 45 min |
| 12:15 | 🍽️ Lunch | 60 min |
| 13:15 | Section 10: Orbit Animation | 45 min |
| 14:00 | Section 11: Textures Deep Dive | 45 min |
| 14:45 | ☕ Break | 15 min |
| 15:00 | Section 12: Particle Systems | 90 min |
| 16:30 | ☕ Break | 15 min |
| 16:45 | Final Project | 60 min |
| 17:45 | Demos & Wrap-up | 30 min |

---

## **Day 2 Kickoff — Quiz Review & Q&A — 15 min**

* Review quiz answers together
* Address any Day 1 concepts that need reinforcement
* Preview Day 2 excitement

---

## **7. Custom Animation & Time-Based Effects — 45 min**

Topics:

* RequestAnimationFrame loop
* Passing time uniform
* CPU vs GPU animation trade-offs
* Mixing user interaction + animation

👉 **Exercise (25 min):** Move objects along predefined paths
- Animate a marker along a series of coordinates (like a bus route)
- Use provided coordinate array

**🔧 Stretch goal:** Add speed control slider, pause/play button

**🎯 Checkpoint:** GIF or screen recording of your animation

---

## **8. 3D Model Animation on a Map — 60 min** 👥 *Pairing Optional*

Show:

* Loading GLTF models into deck.gl (SimpleMeshLayer or custom layer)
* Rotating, scaling
* Updating position each frame
* Keeping model aligned to the globe

👉 **Project (40 min):** Animate a **3D vehicle** moving across the map
- Choose: car / plane / drone / boat (models provided)
- Animate position using time

**🔧 Stretch goal:** Rotate model based on bearing/heading

**🎯 Checkpoint:** Share a recording of your flying/driving model

---

## **9. Moon/Sun Sphere & Texture Mapping — 45 min**

Teach:

* Sphere geometry
* UV coordinates
* Loading texture images
* Rotating a textured sphere
* Fragment shader adjustments (brightness/emission)

👉 **Exercise (25 min):**
* Build a sphere
* Apply moon texture (provided)
* Add rotation

**🔧 Stretch goals:**
- Add specular highlight or glow effect
- Create a glowing sun with emissive shader
- Add Earth texture with day/night shader

**🎯 Checkpoint:** Screenshot of your celestial body

---

## **10. Orbit Animation (Planet Around Sun) — 45 min**

Build on the sphere work:

* Compute orbit positions (sin/cos around a center)
* Animating revolution + rotation
* Hierarchical transforms (parent/child)

👉 **Exercise (30 min):** Create a mini solar system:
* Sun at center (stationary, glowing)
* Planet orbiting the sun
* Moon orbiting the planet
* All rotating on their axes

**🔧 Stretch goal:** Add Saturn with rings, or multiple planets at different orbital speeds

**🎯 Checkpoint:** Video of your solar system in action

---

## **11. Textures (Deep Dive) — 45 min**

Cover:

* Sampling textures in fragment shader
* UV transformation
* Using textures as data (velocity fields, heightmaps)
* Video textures (brief demo)

👉 **Exercise (25 min):** Apply a texture to:
* A quad made with a custom layer, OR
* A mesh using SimpleMeshLayer

**🔧 Stretch goal:** Animate UV coordinates for a scrolling texture effect

**🎯 Checkpoint:** Show your textured geometry

---

## **12. Particle Systems / Particle Advection — 90 min** 👥 *Pair Programming Recommended*

This is the grand finale!

Teach:

* GPU particle simulation basics
* Framebuffer ping-pong technique
* Using textures to store particle positions
* Reading velocity from a field (winds, ocean currents)
* Updating particles every frame
* Rendering with instancing

👉 **Hands-On Project (60 min):** **GPU Particle Advection Layer**
- Particles spawn and drift
- Follow a velocity texture (wind field provided)
- Fade trails using blending

**Starter provided:** 70% complete, you add the velocity sampling and trail fading

**🔧 Stretch goals:**
- Toggle between different wind field textures
- Add particle color based on velocity magnitude
- Adjust particle density with a slider

**🐛 Debugging challenge (15 min):** Common particle system bugs
- Particles stuck at origin
- Particles flying off screen
- Trails not fading

**🎯 Checkpoint:** Demo your particle system

---

## **✨ Final Project — 60 min**

Build one of the following (starters provided at 60-70% completion):

| Project | Difficulty | What You Add |
|---------|------------|--------------|
| Wind Advection Viz | ⭐⭐⭐ | Custom color mapping, UI controls |
| Orbiting Planets | ⭐⭐ | Additional bodies, custom shaders |
| 3D Flight Animation | ⭐⭐ | Multiple vehicles, path editing |
| Shader Art Layer | ⭐⭐⭐ | Original shader effects |
| Terrain Explorer | ⭐⭐ | Moving objects on terrain |

**📢 Demo Format (30 min):**
- 2 minutes per person/pair
- Show your viz, explain one thing you're proud of
- Questions from audience (30 sec)
- Voting for "Most Creative", "Best Technical", "Most Useful"

---

# 🎁 Workshop Materials

## Provided to Participants:

* **Starter repos:**
  * `01-basics` — Environment setup, hello deck.gl
  * `02-layers` — Built-in layers playground
  * `03-extensions` — Extension examples
  * `04-shader-injection` — Shader hook examples
  * `05-custom-layer` — CustomSquareLayer starter
  * `06-animation` — Time-based animation starter
  * `07-models` — 3D model loading
  * `08-spheres` — Celestial bodies starter
  * `09-particles` — Particle system starter
  * `10-final-projects` — Final project templates

* **Reference Materials:**
  * Deck.gl Cheat Sheet (printable PDF)
  * Graphics Pipeline for JS Devs (1-page PDF)
  * Shader Cookbook (GLSL snippets)
  * Common Errors & Debugging Guide

* **Assets:**
  * Textures: moon, sun, earth, noise patterns
  * Velocity fields: global wind, ocean currents
  * 3D Models: car, plane, drone, boat (GLTF)
  * GeoJSON: city boundaries, sample points

* **Shared Resources:**
  * Live troubleshooting doc (Google Doc)
  * Workshop Slack/Teams channel
  * Recording links (post-workshop)

---

## 🏆 Engagement Elements Summary

| Element | When Used |
|---------|-----------|
| 🎯 Checkpoints | End of each exercise |
| 👥 Pair Programming | Sections 6, 8, 12 |
| 🐛 Debug Challenges | Sections 5, 12 |
| 🔧 Stretch Goals | Every section |
| 📝 Quiz | End of Day 1 / Start of Day 2 |
| 🏆 Prizes | Debug races, final project voting |
| 💬 Shared Doc | Throughout |
