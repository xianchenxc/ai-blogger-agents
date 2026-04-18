---
name: topic
description: Use when selecting a Xiaohongshu title/angle for "职场英语" (workplace English) carousel content. Enforces de-duplication via memory_search_recent.
---

# topic

## Before writing

1. Call `memory_search_recent` with `limit` 30–50 (and optional `query` if user gave keywords).
2. Propose a topic that is **clearly different** from recent `title` / `fingerprint` / `tags`. If too similar, iterate until distinct.

## Output contract

Write or update `output/<runId>/topic.md` containing:

- `title` (Chinese, catchy, 职场英语 scoped)
- `angle` (1–2 sentences)
- `target_reader` (e.g. 外企新人 / 互联网打工人)
- `primary_keywords` (2–4 English phrases to teach)
- `dedup_note` (why this is not a duplicate of recent memory)

Then update `output/<runId>/state.json`: `stage: "topic"` and copy a short `topic` summary.

## Constraints

- Platform: 小红书; category: **职场英语** only.
- Avoid medical/financial/legal claims; no夸张功效; teaching focus.
