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

- `/skills/xhs-workplace-english/assets/references/slides_skeleton.md`

## Stage D — copy then render

1. Write `output/<runId>/slides.md` (**5–8** `## Card n — title` sections; body under each header).
2. Call tool **`xhs_assets_render`** with `{ "runId": "<same runId>", "viewport": "540x720" }` (viewport optional; default uses 2× `deviceScaleFactor` for PNG sharpness).
3. The tool runs `skills/xhs-workplace-english/assets/scripts/render-assets.mjs` with CLI flags; you do **not** run `node` yourself. It **renders Markdown to HTML** (via `marked`), strips slide skeleton hints (`【配图建议】`, `大标题：`, `副标：`), then screenshots. Shared CSS is **`assets/scripts/templates/styles.css`**. Each slide uses a dedicated shell under **`assets/scripts/templates/cards/`** (`card-01-cover.html` … `card-06-cta.html`, aligned with `slides_skeleton.md`). If `slides.md` has more than six `## Card` sections, the renderer **cycles** those six shells in order: Card 7 uses the Card‑1 layout, and so on. `post.html` / `post.png` reuse **Card 1** content and shell, and `slide-01` is intentionally skipped to avoid duplicate outputs.

### CLI (for humans / CI; same flags the tool passes)

```text
node skills/xhs-workplace-english/assets/scripts/render-assets.mjs \
  --runId=<id> \
  --backendRoot=<repo or XHS_BACKEND_ROOT> \
  --packageRoot=<repo root containing skills/> \
  [--viewport=540x720] \
  [--deviceScaleFactor=2]
```

- **Prerequisite**: after `npm install`, run once: `npx playwright install chromium`.

### Outputs under `output/<runId>/`

| Path | Purpose |
|------|---------|
| `slides.md` | Model-authored source copy |
| `html/post.html` | Post page HTML (same as Card 1 content/shell) |
| `html/slide-NN.html` | One file per `## Card NN` (except `slide-01`) |
| `screenshots/post.png`, `screenshots/slide-NN.png` | Playwright captures (except `slide-01.png`) |
| `render_report.json` | Technical status (`ok` / `error`), page list, bytes, errors — for CI / debugging, **not** for LLM “image quality” review |

Update `state.json`: `stage: "assets"`, `assets_summary` lists `slides.md`, `html/`, `screenshots/`, `render_report.json`.

## Review (Stage E)

**Do not** review screenshots or layout as model output: templates are fixed. Stage E only reviews **Markdown text** (`slides.md`, etc.) per orchestration.

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
