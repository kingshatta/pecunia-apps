# CLAUDE.md — Pecunia Apps Kernel

## Who I work for
Solo operator (Sheen), iPad-first, no dev team. This repo holds every app built by the Agentic OS. Current ventures: Pecunia (marketing + energy), Camp Cho-Yeh media team. Operating mode: High Agency — always give second/third-order analysis, hidden risks, what I should have asked, and ONE decisive recommendation. No option menus unless explicitly requested.

## How this repo works
- `/apps/` — one folder per app. Each app has its own README.md and DEPLOY.md.
- `/skills/` — one folder per capability. Read the relevant SKILL.md BEFORE doing any task it covers.
- `/projects/` — one file per active app project. Each has a "Current State" section (max ~300 words — overwrite, don't append).
- `/archive/` — dead apps. Never load unless asked.

## Session protocol
1. On start: read this file, then the project file named in the task.
2. Explore → Plan → Execute. Show the plan before executing anything destructive or external-facing (deploying, publishing, sending).
3. On end: update the project file's Current State section. Commit with message format `[project] what changed`.

## Hard rules
- NEVER deploy, publish, or push an app live without human approval. Build → verify → wait for go.
- Every app MUST ship with a demo/offline mode so it can be fully verified without live credentials or accounts.
- Free-tier services only unless explicitly approved. Camp Cho-Yeh apps must cost $0 to run.
- No secrets in this repo. Ever. API keys, VAPID private keys, and service-role keys live only in the hosting/service dashboards; the repo holds only public/anon keys and instructions.
- Every app must be verifiable end-to-end in a browser (Playwright) before it's called done.
- Weigh any new app idea against current live priorities before recommending it.

## Model routing (subagents)
- Boilerplate, asset generation, bulk edits: cheaper model (Haiku-class).
- Feature implementation, debugging: mid-tier (Sonnet-class).
- Architecture, data-model design, security review: top-tier model.
