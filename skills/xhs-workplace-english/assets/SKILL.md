---
name: assets
description: Legacy reference only — assets rules are inlined in orchestration/SKILL.md; do not read this file in normal runs.
---

# assets

## Input

Read `output/<runId>/dialogue.md`, `topic.md`, `knowledge.md`.

## Templates

Read these skeletons (paths are virtual, under backend root):

- `/skills/xhs-workplace-english/templates/post_skeleton.md`
- `/skills/xhs-workplace-english/templates/slides_skeleton.md`

## Output files

Under `output/<runId>/`:

1. `post.md` — filled **post_skeleton** (title, hook, bullets, CTA).
2. `slides.md` — **5–8** "cards" as Markdown sections (each `## Card n` with title + body + optional English highlight).
3. Ensure paths are listed in `state.json` under `assets_summary`.

Update `state.json`: `stage: "assets"`.

## Visuals

No image generation required; if needed, one line per card: `【配图建议】...` in Chinese.
