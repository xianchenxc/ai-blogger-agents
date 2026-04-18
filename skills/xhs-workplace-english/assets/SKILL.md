---
name: assets
description: Stage D assets — Markdown copy, HTML templates, Playwright screenshots via xhs_assets_render; read for single-stage debugging only (full pipeline uses orchestration/SKILL.md).
---

# assets

## When to use

- **Normal full runs**: follow [orchestration/SKILL.md](../orchestration/SKILL.md) only.
- **Assets-only fixes**: use this file for paths, CLI, and expected artifacts.

## Inputs

Read `output/<runId>/dialogue.md`, `topic.md`, `knowledge.md` when authoring copy.

## Markdown skeletons (virtual paths)

- `/skills/xhs-workplace-english/assets/reference/post_skeleton.md`
- `/skills/xhs-workplace-english/assets/reference/slides_skeleton.md`

## Stage D — copy then render

1. Write `output/<runId>/post.md` and `slides.md` (**5–8** `## Card n — title` sections; body under each header).
2. Call tool **`xhs_assets_render`** with `{ "runId": "<same runId>", "viewport": "1080x1920" }` (viewport optional).
3. The tool runs `skills/xhs-workplace-english/assets/scripts/render-assets.mjs` with CLI flags; you do **not** run `node` yourself. HTML shells and CSS live under **`assets/templates/html/`** (this skill only).

### CLI (for humans / CI; same flags the tool passes)

```text
node skills/xhs-workplace-english/assets/scripts/render-assets.mjs \
  --runId=<id> \
  --backendRoot=<repo or XHS_BACKEND_ROOT> \
  --packageRoot=<repo root containing skills/> \
  [--viewport=1080x1920] \
  [--deviceScaleFactor=1]
```

- **Prerequisite**: after `npm install`, run once: `npx playwright install chromium`.

### Outputs under `output/<runId>/`

| Path | Purpose |
|------|---------|
| `post.md`, `slides.md` | Model-authored source copy |
| `html/post.html` | Post page HTML (from templates) |
| `html/slide-NN.html` | One file per `## Card NN` |
| `screenshots/post.png`, `screenshots/slide-NN.png` | Playwright captures |
| `render_report.json` | Technical status (`ok` / `error`), page list, bytes, errors — for CI / debugging, **not** for LLM “image quality” review |

Update `state.json`: `stage: "assets"`, `assets_summary` lists `post.md`, `slides.md`, `html/`, `screenshots/`, `render_report.json`.

## Review (Stage E)

**Do not** review screenshots or layout as model output: templates are fixed. Stage E only reviews **Markdown text** (`post.md`, `slides.md`, etc.) per orchestration.

## `review.json` (unchanged shape)

```json
{
  "status": "pass" | "fail",
  "issues": ["..."],
  "resume_from": "topic" | "knowledge" | "dialogue" | "assets" | null,
  "notes": "short Chinese summary"
}
```

If `render_report.json` has `"status": "error"`, fix assets (md or environment) and re-run **`xhs_assets_render`** before passing review.
