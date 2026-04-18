---
name: orchestration
description: Single entry for Xiaohongshu (小红书) "职场英语" short dialogue + graphic-text runs. Contains the full pipeline; read this file once then execute without opening other SKILL.md files under this skill pack.
---

# orchestration

## Single entry (critical)

- For a **normal full run**, **`read_file` exactly once**: `/skills/xhs-workplace-english/orchestration/SKILL.md` (this file). **Do not** `read_file` `topic/knowledge/dialogue/assets/review/SKILL.md` unless the user explicitly asks to debug that stage.
- **Templates**: only `read_file` the **one** dialogue template you chose (email OR Slack OR Feishu) plus `post_skeleton.md` and `slides_skeleton.md` when doing assets — **three template reads max** for templates in a run.
- **Memory**: call `memory_search_recent` **at most twice** per full run — once before topic, optionally once during review if duplicate risk.

## Goal

Produce **non-duplicate** workplace-English learning content for **小红书**, as **short dialogues** in workplace app templates (email / Slack / Feishu IM), then **write Markdown** under `output/<runId>/`. Finish with **AI review**; on fail, restart from `resume_from` only.

## Run id and state

1. Pick `runId` (e.g. `run-YYYYMMDD-HHMMSS`).
2. Maintain `output/<runId>/state.json`: `runId`, `stage`, `topic`, `knowledge`, `dialogue`, `assets_summary`, `review` (`status` must be `"pass"` or `"fail"`, never null when review step ends).

---

## Stage A — topic

1. Call `memory_search_recent` (limit 30–50; optional `query` from user).
2. Choose a topic **clearly different** from recent memory (`title` / `fingerprint` / `tags`).
3. Write `output/<runId>/topic.md` with: `title` (Chinese, 职场英语), `angle`, `target_reader`, `primary_keywords` (2–4 English phrases), `dedup_note`.
4. Update `state.json`: `stage: "topic"`, short `topic` summary.
5. Constraints: 小红书职场英语 only; no医疗/投资理财承诺/夸大功效; teaching focus.

---

## Stage B — knowledge

1. Read `output/<runId>/topic.md` (already on disk).
2. Write `output/<runId>/knowledge.md`: **3–7** numbered items; each = **English pattern** + **中文释义** + one-line usage. Focus: meetings, email, Slack, polite pushback, deadlines, clarifying questions.
3. Update `state.json`: `stage: "knowledge"`.

---

## Stage C — dialogue

1. Read `topic.md` + `knowledge.md`.
2. Pick **one** template family; `read_file` **only that** template:
   - Email: `/skills/xhs-workplace-english/templates/email_thread.md`
   - Slack: `/skills/xhs-workplace-english/templates/slack_thread.md`
   - Feishu: `/skills/xhs-workplace-english/templates/feishu_im.md`
3. Write `output/<runId>/dialogue.md`: state template used; **6–14** short lines; embed **2–4** knowledge items; 小红书口语感.
4. Update `state.json`: `stage: "dialogue"`.

---

## Stage D — assets

1. Read `dialogue.md`, `topic.md`, `knowledge.md`.
2. `read_file` `/skills/xhs-workplace-english/templates/post_skeleton.md` and `slides_skeleton.md`.
3. Write `output/<runId>/post.md` and `slides.md` (5–8 `## Card n` sections); optional `【配图建议】` per card, no real image generation.
4. Update `state.json`: `stage: "assets"`, `assets_summary` lists paths.

---

## Stage E — review

1. Read `post.md`, `slides.md`; skim `dialogue.md`, `topic.md`.
2. Checklist: 职场英语贴合; English 正确; 小红书短平快; 风险（医疗/投资/歧视/侵权等）; 与 memory 不实质重复。
3. Write/append `output/<runId>/review.json` as one JSON object:

```json
{
  "status": "pass" | "fail",
  "issues": ["..."],
  "resume_from": "topic" | "knowledge" | "dialogue" | "assets" | null,
  "notes": "short Chinese summary"
}
```

`status` **must not** be null. On fail set `resume_from` to earliest stage to redo. On pass set `resume_from` to `null`.
4. Update `state.json`: `stage: "review"`, copy verdict into `review`.
5. **If pass**: call `memory_record_generation` once (`fingerprint` = normalized title + `|` + sorted keywords lowercased; `title`; `tags` like `["xhs","workplace-english","slack"]`; `paths`); then `stage: "done"`.

---

## User steering

If user says "only fix dialogue" / "re-review": read `state.json`, minimal scope, obey `resume_from` rules from `review.json` if present.
