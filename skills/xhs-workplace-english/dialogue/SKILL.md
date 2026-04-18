---
name: dialogue
description: Legacy reference only — dialogue rules are inlined in orchestration/SKILL.md; do not read this file in normal runs.
---

# dialogue

## Input

Read `output/<runId>/knowledge.md` and `topic.md`.

## Template choice

Pick **one** family unless user asked otherwise:

1. Email thread — read `/skills/xhs-workplace-english/dialogue/reference/email_thread.md`
2. Slack — read `/skills/xhs-workplace-english/dialogue/reference/slack_thread.md`
3. Feishu IM — read `/skills/xhs-workplace-english/dialogue/reference/feishu_im.md`

## Output

Write `output/<runId>/dialogue.md`:

- State template family used.
- **6–14** total lines of dialogue (short turns).
- Naturally embed **2–4** knowledge items (English lines + implicit 中文可放在括号里极短提示，保持小红书节奏).

Tone: practical, friendly, slightly informal for 小红书; no long lectures.

Update `state.json`: `stage: "dialogue"`.
