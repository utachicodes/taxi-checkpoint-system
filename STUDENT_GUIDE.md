# TaxiGuard — Student Onboarding Guide

Welcome to TaxiGuard. This guide gets a new student contributor from "cloned the repo" to "understands the system and knows what's still broken." Read it in order — each section builds on the last.

It does **not** replace [README.md](README.md), [SETUP.md](SETUP.md), or [TECHNICAL_REPORT.md](TECHNICAL_REPORT.md). Those tell you *how to run things*. This tells you *what to learn, in what order, and where the project still has open problems* — which is usually what's missing when you inherit someone else's codebase.

---

## 0. One-command setup

Before reading further, run the setup script from the repo root:

```bash
# macOS / Linux
./setup.sh

# Windows (PowerShell)
.\setup.ps1
```

This installs Node + Python dependencies, creates your `.env` files from the examples, and tells you exactly which secrets you still need to fill in by hand (Supabase keys, AI API keys). It does **not** fill in secrets for you — those are per-person/per-deployment and must come from whoever manages the Supabase project.

Once it finishes, come back here before running anything else.

---

## 1. What this project actually is

TaxiGuard is an automated checkpoint system: a camera watches a lane, detects a vehicle, reads its license plate, and checks a database for whether that vehicle paid its daily municipal tax. An operator standing at the checkpoint sees a green/red light on a dashboard instead of manually checking paperwork.

It is **three separate programs that talk to each other**, not one app:

| Piece | Language/Framework | Lives in | Job |
|---|---|---|---|
| Dashboard | Next.js / TypeScript | `app/`, `components/`, `lib/` | What the operator and admin see in a browser |
| Vision API | Django / Python | `vision/` | Receives an image, runs AI on it, returns a plate number |
| Camera bridge | Python (OpenCV) | `edge/camera_bridge.py`, `edge/huskylens_bridge.py` | Grabs frames from a physical camera and sends them to the Vision API |

A fourth piece, `anpr_platform/` + `frigate/`, is a **separate, experimental** ANPR (Automatic Number Plate Recognition) pipeline built on [Frigate](https://frigate.video/) and MQTT, aimed at running detection continuously off an RTSP camera stream instead of the polling-based `camera_bridge.py` approach. Treat it as a parallel prototype, not the production path, until a maintainer tells you otherwise.

**Read [README.md](README.md) and [TECHNICAL_REPORT.md](TECHNICAL_REPORT.md) in full before touching code.** They explain the "two-brain" AI design (a small fast model does detection, a bigger slower model does plate reading) and the fiscal logic (`GREEN` = paid today, `RED` = not paid). You need that mental model before any of the code will make sense.

---

## 2. What you need to learn, roughly in this order

Don't try to master all of this before writing code — skim top to bottom first, then go deep on whichever piece you're assigned to.

### 2.1 Baseline web stack (if you'll touch the dashboard)
- **Next.js App Router** — routing via `app/`, server vs. client components, server actions (`lib/actions/`).
- **TypeScript** basics — the whole frontend is typed; `lib/types.ts` defines the core data shapes.
- **Supabase**: Postgres + Auth + Realtime. Specifically:
  - Row Level Security (RLS) — this project enforces operator-vs-admin permissions at the database layer, not just in the UI. Read `scripts/001_create_tables.sql` onward to see the schema and policies.
  - Realtime subscriptions — how `scan_events` inserts push live to the dashboard via WebSockets.
- Tailwind CSS + shadcn/ui (`components/ui/`) — the component library already in use. Don't introduce a second UI library.

### 2.2 Backend / AI pipeline (if you'll touch vision or cameras)
- **Django** basics — views, URLs, settings (`vision/lpr_app/`, `vision/lpr_project/`).
- **Computer vision fundamentals**:
  - Object detection vs. OCR/VLM-based text reading — this project deliberately splits the two ("detect that a car exists" vs. "read the plate text") because one model doing both is slower and less accurate.
  - **YOLOv8** (Ultralytics) — used for the fast vehicle-detection step. The pretrained weights (`yolov8n.pt`) sit in the repo root.
  - Vision-language models (Qwen-VL) for OCR via an external API — understand *why* a VLM is used instead of classic OCR (Tesseract/EasyOCR): angled, dirty, or non-standard plates break traditional OCR, and a VLM reads them more like a human would.
- **OpenCV** — `edge/camera_bridge.py` uses it for frame capture, cropping, and resizing. You should be comfortable reading/writing basic OpenCV frame-processing code before modifying it.
- **MQTT** (if touching `anpr_platform/` or Frigate) — publish/subscribe messaging used to pass detection events between Frigate and the ANPR backend.
- **RTSP** — the streaming protocol IP cameras use (`rtsp://user:pass@ip:554/...`). You'll need to understand stream URLs, latency, and why RTSP behaves differently from a USB webcam.

### 2.3 Systems/ops basics
- Environment variables and why secrets never get committed (`.env.local`, `vision/.env` are gitignored — check `.gitignore` before ever running `git add`).
- Docker Compose — used to run Frigate + MQTT + the ANPR backend together (`docker-compose.yml`). You don't need to be a Docker expert, but you need to be able to read a compose file and bring services up/down.
- Basic Linux command line — because step 3 below means you'll eventually be SSHed into a Raspberry Pi with no GUI.

**Checkpoint:** before you're productive, you should be able to explain, in your own words, the sequence diagram in README.md — camera → frontend → Django → YOLO → Qwen → Supabase → dashboard — and why each hop exists.

### 2.4 Learning resources (docs & videos)

Official documentation first, video second — docs stay accurate as versions change, videos can drift. Where there wasn't one specific video we could verify still exists and matches the topic, we link the channel instead of guessing a video URL — search that channel for the topic, don't assume the first result is current.

**Frontend (§2.1)**
- Next.js App Router — [nextjs.org/learn](https://nextjs.org/learn/dashboard-app) (official interactive course, builds a dashboard app — closest analogue to this repo). Video: [youtube.com/@VercelHQ](https://youtube.com/@VercelHQ) (Vercel's own channel).
- TypeScript — [typescriptlang.org/docs/handbook](https://www.typescriptlang.org/docs/handbook/intro.html) (official Handbook). Video: search "TypeScript crash course" on [youtube.com/@freecodecamp](https://youtube.com/@freecodecamp).
- Supabase Auth — [supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth).
- Supabase Row Level Security — [supabase.com/docs/guides/auth/row-level-security](https://supabase.com/docs/guides/auth/row-level-security) (read this before touching any `scripts/*.sql` policy — it's exactly how operator/admin separation is enforced in this repo).
- Supabase Realtime — [supabase.com/docs/guides/realtime](https://supabase.com/docs/guides/realtime) (how `scan_events` pushes to the dashboard live).
- Tailwind CSS — [tailwindcss.com/docs](https://tailwindcss.com/docs/installation).
- shadcn/ui — [ui.shadcn.com/docs](https://ui.shadcn.com/docs) (the component system already used under `components/ui/`).

**Backend / AI pipeline (§2.2)**
- Django — [docs.djangoproject.com](https://docs.djangoproject.com/en/stable/intro/tutorial01/) (official tutorial, part 1 onward). Video: search "Django crash course" on [youtube.com/@freecodecamp](https://youtube.com/@freecodecamp).
- YOLOv8 / Ultralytics — [docs.ultralytics.com/models/yolov8](https://docs.ultralytics.com/models/yolov8/) (official docs for the exact model this repo uses). Video: [youtube.com/@Ultralytics](https://youtube.com/@Ultralytics) (Ultralytics' own channel — has walkthroughs of training and running YOLOv8).
- OpenCV + Python — [docs.opencv.org](https://docs.opencv.org/4.x/) (official tutorials). Video: search "OpenCV full course Python" on [youtube.com/@freecodecamp](https://youtube.com/@freecodecamp) (freeCodeCamp has a long full-course video on this exact topic).
- MQTT basics — [hivemq.com/mqtt-essentials](https://www.hivemq.com/mqtt-essentials/) (HiveMQ's well-known beginner series — publish/subscribe, topics, QoS, retained messages).
- RTSP vs. ONVIF for IP cameras — [reolink.com/blog/onvif-vs-rtsp](https://reolink.com/blog/onvif-vs-rtsp/) (vendor explainer, but accurate and exactly the distinction you need for `rtsp_bridge.py` and `frigate/config.yml`).

**Raspberry Pi deployment (§3.2 — this is the actual gap, so study this closely)**
- Ultralytics' own Raspberry Pi guide — [docs.ultralytics.com/guides/raspberry-pi](https://docs.ultralytics.com/guides/raspberry-pi/) — covers OS setup, installing YOLO on ARM, and expected performance on Pi 4/5. **Start here before writing any Pi install script.**
- Frigate NVR — [frigate.video](https://frigate.video/) (project site) and its docs at [docs.frigate.video](https://docs.frigate.video/) — relevant if you work on the `anpr_platform/`/Frigate path, since Frigate already runs well on Pi-class hardware with a Coral accelerator.

**Choosing the right camera (§3.1)**
- [kintronics.com/how-alpr-works](https://kintronics.com/how-alpr-works/) — explains why ALPR/LPR cameras are a different product category from generic security cameras: fixed fast shutter speed to freeze plates at speed, 850/940nm IR tuned to plate reflectivity, and resolution targets measured in pixels-across-the-plate (not just total megapixels) at your actual checkpoint distance. Read this before proposing a specific camera model.

Treat all of the above as a starting point, not a syllabus to complete before coding — pull up the specific doc page or video when you hit the relevant task, rather than front-loading everything.

---

## 3. The real gaps: what's unsolved right now

This section is the part most onboarding docs skip, and it's the part that will actually eat your time. The code you've inherited was built and tested on a **laptop with a webcam, talking to a cloud OCR API**. That setup works for development, but it is not the deployment target. The open problems fall into four buckets.

### 3.1 Getting a real camera working at a checkpoint

`camera_bridge.py` currently assumes either:
- a **USB/built-in webcam** addressed by index (`--cam 0`), or
- an **RTSP IP camera** (see `rtsp_bridge.py`, and the Frigate config at `frigate/config.yml`, which currently points at a hardcoded test camera: `rtsp://admin:123456@192.168.0.123:554/live/ch0`).

What's unsolved:
- **Choosing the right camera.** A checkpoint camera is not a webcam. You need, at minimum:
  - A fixed-lens or auto-focus **IP camera with RTSP output** (ONVIF-compliant is a strong plus — easier Frigate/NVR integration).
  - Enough **resolution** to read a plate from checkpoint distance (generally 1080p minimum; 4MP+ if the camera is more than ~5m from the lane) — resolution at the plate, not the frame, is what matters, so field of view and lens focal length matter as much as raw megapixels.
  - **Low-light / IR performance**, since checkpoints often operate at night or dawn/dusk — look for cameras explicitly rated for "license plate capture" or "LPR" use, which usually bundle the right shutter speed and IR configuration.
  - A **mechanical/environmental housing** suited to being outdoors (dust, rain, vibration from traffic).
  - This is a hardware-buying decision, not just a config change — flag it early to whoever owns budget/procurement rather than trying to make a cheap webcam work through software fixes alone.
- **Fast-moving vehicles blur.** A plate captured at low shutter speed smears at vehicle speed, and no amount of OCR model quality fixes a blurred source image. True LPR cameras fix this with a short, fixed shutter speed plus synced IR illumination; a standard security camera's auto-exposure will not do this correctly on its own. This needs to be solved at the hardware/firmware level before the software pipeline can help.
- **Capture timing.** The current `--int` polling interval (default 5s) and `--send-every N` frame-skipping were designed around "car idles at checkpoint for a few seconds," not "car rolls through at speed." If checkpoints ever operate as rolling (non-stop) lanes, the capture/trigger strategy needs to change — likely to a hardware trigger (inductive loop, laser/IR beam sensor, or Frigate's motion/object-crossing zones) rather than a timer.

### 3.2 Running the model on a Raspberry Pi, not the cloud

Right now the "Reader" brain (Qwen-VL) is a **cloud API call** (OpenRouter / an Ollama-hosted endpoint — see `QWEN_BASE_URL`/`QWEN_API_KEY` in `vision/.env.example`). That's fine for a laptop demo with Wi-Fi/4G. It is **not** validated for the target deployment: a Raspberry Pi at a checkpoint, likely with weak or no reliable internet.

What's unsolved:
- **No on-device OCR/VLM path exists yet.** `--local-llm` and `--local-yolo` flags exist in `camera_bridge.py` as stubs/partial implementations — read that code before assuming they work end-to-end. A real Pi deployment needs either:
  - A quantized local VLM or a dedicated LPR OCR engine (e.g., OpenALPR-style classic pipeline, or a small distilled OCR model) that runs entirely on-device, or
  - A hybrid mode that works offline and syncs once connectivity returns (the "Offline Mode" mentioned as future work in `TECHNICAL_REPORT.md` §7.2 does not exist yet).
- **Raspberry Pi performance is unproven.** YOLOv8n is light enough to run reasonably on a Pi 4/5 (especially with an accelerator like a Coral USB TPU or the Pi 5's extra CPU headroom), but no one has benchmarked actual frames-per-second or detection latency on real Pi hardware in this repo. That benchmarking is a concrete, well-scoped first task for a new student.
- **No Pi-specific deployment packaging.** There's no systemd service, no Pi-targeted install script, no documented OS image/dependency list (e.g., does `ultralytics`/PyTorch even install cleanly on Raspberry Pi OS's ARM architecture, and does it need a specific PyTorch wheel?). This needs to be built, not assumed.
- **Thermal/power constraints.** A Pi running continuous inference in an outdoor enclosure needs power and heat budgeting that a laptop doesn't — not addressed anywhere in current docs.

### 3.3 Accuracy and speed at real-world checkpoint speed

The architecture decouples a fast local detector (YOLO) from a slower, more accurate cloud reader (Qwen-VL) specifically so the system *feels* instant even though plate-reading isn't. But "feels instant" has only been tested against a webcam pointed at a screen or a slow-moving/stationary test vehicle. Open questions a new student should expect to investigate:
- What's the actual end-to-end latency budget (capture → detect → crop → OCR → DB lookup → dashboard update) once a real network and a real camera are in the loop, and does it still fit inside "vehicle transit time through the checkpoint"?
- What's the false-negative rate (plate not read at all) vs. false-positive/misread rate (wrong plate read, worse than not reading it) under motion blur, rain, headlight glare, and dirty plates? No test dataset for this currently exists in the repo — building one from real footage is valuable early work.
- Does the system need a **multi-frame voting** strategy (read the plate from several frames as the car passes and take the majority/most-confident result) instead of relying on a single snapshot? This is the standard approach in commercial ALPR and isn't implemented here yet.

### 3.4 The Frigate/ANPR prototype vs. the Django/camera_bridge pipeline

There are currently **two parallel, not-yet-unified** approaches in this repo:
1. `edge/camera_bridge.py` → Django `vision/` API → Supabase (documented, in `SETUP.md`).
2. Frigate (Docker) + MQTT → `anpr_platform/` (separate FastAPI-ish service + its own SQLite `anpr.db`) — see `docker-compose.yml`.

No one has yet decided (or at least documented) which becomes the production pipeline, or whether they merge (e.g., Frigate purely for motion-triggered capture + hardware acceleration, handing off frames to the existing Django OCR pipeline instead of maintaining a second backend and a second database). If you're assigned to this area, your first task should be reading both paths fully and writing up the tradeoff before building on top of either.

---

## 4. Suggested first tasks for a new student

Pick based on what you're assigned, but in rough order of how foundational they are:

1. Run the full stack locally (dashboard + Django + a laptop webcam) end-to-end per [SETUP.md](SETUP.md). Don't skip this even if you'll work on Pi/camera stuff — you need a working baseline to compare against.
2. Read `edge/camera_bridge.py` fully, including the `--local-yolo`/`--local-llm` code paths, and document (in a PR description, not just verbally) what currently works vs. what's a stub.
3. If working on hardware: research and propose 2-3 specific candidate LPR-rated IP camera models (with resolution, shutter, IR specs, and RTSP/ONVIF support) before any purchase — bring this to a maintainer for sign-off.
4. If working on the Pi: get YOLOv8n running on an actual Raspberry Pi (4 or 5) and benchmark real FPS/latency. Write the systemd service and an install script as you go — don't just get it running once interactively.
5. If working on accuracy: collect a small real-world test set (phone video of a moving vehicle's plate, varied lighting) and measure current OCR accuracy against it before proposing changes.

---

## 5. Where to ask questions

- Check `vision/django.log` and the browser console before asking "it's broken" — both docs (`SETUP.md` Troubleshooting section) and this guide assume you've checked logs first.
- If your question is about *why* something was built a certain way (not *how to run it*), check `TECHNICAL_REPORT.md` first — it documents the reasoning behind the two-brain architecture, the in-memory pipeline, and the fiscal logic.
- Everything in §3 above is an open problem, not a bug in your setup — if you hit one of those walls, that's expected; bring a proposal, not just the blocker.
