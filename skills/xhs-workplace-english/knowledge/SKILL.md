---
name: knowledge
description: Legacy reference only — knowledge rules are inlined in orchestration/SKILL.md; do not read this file in normal runs.
---

# knowledge

## Input

Read `output/<runId>/topic.md` (or `state.json` summary) for the chosen topic.

## Output

Write `output/<runId>/knowledge.md` with:

- Numbered list **3–7** items.
- Each item: **English pattern/phrase** + **中文释义** + **micro usage note** (one line).

Focus on: meetings, email, Slack/async updates, polite pushback, deadlines, clarifying questions.

Update `state.json`: `stage: "knowledge"`, `knowledge` summary (or path).
