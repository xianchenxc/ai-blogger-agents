---
name: orchestration
description: Use for any Xiaohongshu (小红书) "职场英语" short dialogue + graphic-text material request. Orchestrates topic → knowledge → dialogue → local assets → AI review loop with resume_from on failure.
---

# orchestration

## Goal

Produce **non-duplicate** workplace-English learning content for **小红书**, as **short dialogues** in workplace app templates (email / Slack / Feishu IM), then **write Markdown assets** under `output/<runId>/`. Finish with **AI review**; on fail, **restart from the stage** indicated by `resume_from` without redoing earlier stages unless they are explicitly questioned.

## Run id and state file

1. Pick a stable `runId` (e.g. `run-YYYYMMDD-HHMMSS` or UUID).
2. Maintain `output/<runId>/state.json` with fields:
   - `runId`, `stage` (`topic` | `knowledge` | `dialogue` | `assets` | `review` | `done`)
   - `topic`, `knowledge`, `dialogue`, `assets_summary` (short text or pointers to file paths you wrote)
   - `review`: `{ "status": "pass"|"fail", "issues": string[], "resume_from"?: "topic"|"knowledge"|"dialogue"|"assets" }`
3. After each major step, **update `state.json`** with `write_file` or `edit_file`.

## Pipeline

1. **Orchestration**: Read this skill first for full runs.
2. **Topic** (`topic` skill): Must call `memory_search_recent` before finalizing a title/angle.
3. **Knowledge** (`knowledge` skill): 3–7 teachable points tied to the topic.
4. **Dialogue** (`dialogue` skill): Short, punchy lines suitable for 小红书; pick one template family.
5. **Assets** (`assets` skill): Fill templates; write `post.md`, `slides.md`, optional `dialogue.md`.
6. **Review** (`review` skill): Strict checklist; output structured verdict JSON (see review skill). If **pass**, call `memory_record_generation` once with a **stable fingerprint** (normalized title + 2–4 English keywords). If **fail**, set `resume_from` and **only** re-execute from that stage onward (skip earlier stages if not challenged).

## User steering

If the user says "only fix dialogue" or "re-review", read `state.json`, obey explicit scope, and do minimal rework.
