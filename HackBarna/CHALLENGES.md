# HackBarna Challenges

## Vonage — Best use of the Vonage Video API

Build an innovative real-time video application that solves a real problem, for any industry or audience.

Useful Video API capabilities include real-time video, screen sharing, recording, live captions, background effects, and AI audio pipelines across Web, iOS, Android, and React Native.

**Project fit:** A `SIMULATED INCIDENT BRIEFING` video room. A coordinator joins a Vonage session with an AI field liaison, shares the incident map, and receives grounded explanations of the historical wildfire replay. The experience must be explicitly labeled simulated.

---

## Preply — Best use of AI for Learning

Build something that helps a user learn: languages, coding, music, or another subject.

Judging criteria:
- Effectiveness: signal of progress
- Engagement: reason to return tomorrow
- Polished, intuitive UX
- Creative use beyond a chat wrapper

**Possible project fit:** A wildfire incident-command training mode: make a decision at a replay checkpoint, see the outcome, and track decision calibration over time.

---

## Norrsken — AI for Wildfire

Use AI and real-time or near-real-time data to detect, track, or predict wildfires and produce actionable signal for firefighters or emergency coordinators.

Tracks:
- **Early detection:** detect fires from cameras, satellites, or other feeds.
- **Monitoring:** draw active-fire perimeters, determine spread direction, and simulate movement.
- **Prediction:** identify high-risk places and times from weather conditions.
- **Values at risk:** identify infrastructure, people, and assets in danger and help make evacuation calls.

**Project fit:** Primary challenge. FastAndSlow is an explainable incident-response sandbox, especially aligned with **Values at risk**, supported by monitoring evidence. Preserve the human approval boundary and simulation-only status.

---

## Mastra — Build an agent people can message

Build with `@mastra/core` and make the agent reachable on Telegram, Discord, Slack, WhatsApp, Teams, or iMessage. The remote judge will message it cold from their phone.

Requirements:
- More than plain Q&A: use memory, tools/actions with approval, a pausable workflow, or proactive scheduled messages.
- Reliable for a stranger, coherent for unexpected messages, and useful enough to keep.
- Public repository and README.
- Keep the bot live through judging.

**Possible project fit:** A Telegram/Discord wildfire briefing companion that remembers a coordinator's watched assets, sends simulated updates, and asks approval before creating simulated actions. Defer unless someone owns deployment and reliability.

---

## Nebius — Build, adapt, and ship with Token Factory

Use Nebius Token Factory meaningfully in a working AI product. It should contribute measurable improvement in quality, grounding, evaluation, speed, cost, reliability, workflow optimization, data, or model customization.

**Possible project fit:** Only enter if Token Factory becomes part of an evaluated core system, such as measured grounding/evidence-quality improvement. Do not add it as a superficial model endpoint.

---

## Cognition — Devin for X: Building the Autonomous Layer

Build a domain-specific autonomous layer using Devin through its API, rather than the web UI.

Requirements:
- Inputs go beyond chat.
- A programmatic external trigger creates and drives Devin sessions.
- Code independently decides whether each output passes: a simulator, solver, test suite, or validator—not a person or model opinion.
- Failed outputs are returned to Devin for retry.
- Demonstrate a run where the first attempt was wrong and the system repaired it autonomously.

Judging emphasizes autonomy, guardrails, product utility, and creative orchestration.

**Project fit:** Primary challenge. A fire/timeline event triggers Devin to create a response plan; deterministic simulation and policy checks approve or reject it; failures return to Devin for repair.

---

## fal.ai — Infinite livestream with H3 Max Director

Use MiniMax H3 Max Director through the fal API as the core of an infinite livestream application.

Requirements:
- Video is generated live, not pre-rendered.
- The app steers Director while it streams.
- The stream is viewable in a browser or app.
- A strong submission includes a public repository, README, short demo video, and a creative use beyond a plain text-to-video call.

**Possible project fit:** `Living Fireline Window`: an infinite, live, Director-generated illustrative visualization steered by authoritative replay events (new hotspots, wind shifts, drone reroutes, and assets at risk). It must be labeled **AI-GENERATED ILLUSTRATIVE VISUALIZATION — NOT SENSOR FOOTAGE**. Stretch goal; first prove live generation, steering, and browser playback.

---

## QualityClouds — Production readiness with Norma

Build anything, then use Norma deterministic checks to improve and defend the codebase.

Requirement:
1. Run a scan.
2. Fix at least one issue.
3. Run a rescan.

Judging emphasizes final production-ready score, audit-trail improvement, and a two-minute explanation of one fixed and one consciously accepted finding.

**Project fit:** High-leverage supporting entry. Run Norma against FastAndSlow, fix an identified issue, and retain the before/after report.

---

## Galtea — Find your AI's worst flaw and prove you can fix it

Point Galtea at a chatbot, RAG app, voice agent, or tool-using system. Define its intended behavior in one line, then use adversarial testing to discover a meaningful failure, fix the cause, and rerun the evaluation.

Judging criteria:
- Impact of the discovered failure
- Whether testing found an unknown flaw
- Quality of the fix
- Before/after proof

**Project fit:** Test the video/voice liaison and response agent for invented live data, unsupported evacuation recommendations, dangerous external-action requests, data prompt injection, and fabricated citations. Use the failure/fix/rerun as a central safety story.

---

## Make

No specific challenge is defined. Make provides a visual automation platform with integrations for workflows and AI agents.

---

## SLNG — Best use of the SLNG platform

Use SLNG at the core of the project through STT, TTS, or a full voice agent. Include a live or recorded voice-agent walkthrough and real measurements for latency, cost, or audio quality. Building on unmute is a bonus.

**Project fit:** Use SLNG STT/TTS as the core voice interface for the simulated field liaison in the Vonage briefing. Display or record measured speech-to-text, time-to-first-audio, and end-to-end response latency.

---

## Titan OS — Conversational TV recommendation agent

Build a TV-first conversational agent that recommends movies, shows, or live TV.

Requirements:
- Working dialogue with natural-language requests and follow-ups.
- Clarifying questions and refined recommendations.
- TV-screen UX usable by voice or remote from the couch.
- Any public content catalogue/metadata source is allowed.

**Project fit:** Not aligned with FastAndSlow.

---

## Suggested Focus

**Commit:** Norrsken, Cognition, Vonage, SLNG, Galtea, QualityClouds.

**Stretch:** fal.ai.

**Defer unless a teammate owns it:** Mastra, Nebius, Preply.
