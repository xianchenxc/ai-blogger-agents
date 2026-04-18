---
name: review
description: Legacy reference only — review rules are inlined in orchestration/SKILL.md; do not read this file in normal runs.
---

# review

## Input

Read `output/<runId>/post.md`, `slides.md`, and skim `dialogue.md`, `topic.md`. Optionally re-check `memory_search_recent` if duplicate risk.

## Checklist

1. **职场英语** fit (not general life English unless tied to work).
2. **English accuracy** (collocations, register, no obvious grammar errors).
3. **小红书 tone** — concise, scannable; not academic long-form.
4. **Risk** — no医疗/投资理财承诺/夸大疗效; no攻击歧视; no侵权虚构名人言论.
5. **Dedup** — not substantially the same angle as recent memory entries.

## Verdict

Append to `output/<runId>/review.json` a single JSON object (one line or pretty-printed file):

```json
{
  "status": "pass" | "fail",
  "issues": ["..."],
  "resume_from": "topic" | "knowledge" | "dialogue" | "assets" | null,
  "notes": "short Chinese summary"
}
```

Rules:

- If `status` is `fail`, set `resume_from` to the **earliest** stage that must be redone (e.g. dialogue problem → `"dialogue"`).
- If `status` is `pass`, set `resume_from` to `null`.

Update `state.json`: `stage: "review"`, embed same verdict under `review`.

## After pass

Call `memory_record_generation` with:

- `fingerprint`: normalized title + `|` + sorted primary keywords (ASCII lowercased)
- `title`: Chinese title from topic
- `tags`: e.g. `["xhs","workplace-english","<template>"]`
- `paths`: relative paths written, e.g. `["output/<runId>/post.md", ...]`

Then set `state.json` `stage` to `"done"`.
