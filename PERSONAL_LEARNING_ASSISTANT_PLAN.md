# Aiplay Personal Learning Assistant — Implementation Plan

## Goal

Create a friendly learning assistant that explains a student’s chosen topic in simple language, teaches it in small steps, generates safe quiz content, runs three topic-specific games, then shows performance, weak concepts, and the next study action.

## Student journey

1. **Ask** — The student writes a topic or question in Mira’s chat.
2. **Understand** — Mira returns a structured lesson: a simple definition, why it matters, a real example, key ideas, common mistakes, and a short summary.
3. **Practise** — The student chooses a recall activity or begins the Bubble → Rocket → Fishing journey.
4. **Measure** — Every answer records the concept tested, answer choice, correctness, and attempt time.
5. **Improve** — Mira shows strengths, weak concepts, a revision card, and the recommended next topic or retry.

## Lesson architecture

Every answer from the AI must follow one validated structure. This prevents random text from breaking the interface or games.

```text
Lesson
  title, level, learning objective
  simple explanation
  real-world example
  key concepts (3–5)
  common mistake
  memory hook
  question bank (9 questions)
```

Each question must have exactly four options, one correct answer, an explanation, one concept tag, and a difficulty level.

## Game architecture

Create one shared `question-bank` source. Bubble, Rocket, and Fishing must read the same session question bank rather than maintaining three copied topic lists.

```text
Assistant API / validated fallback
  ↓
sessionStorage question bank
  ↓
Bubble: questions 1–3
Rocket: questions 4–6
Fishing: questions 7–9
  ↓
performance summary by concept
```

## Reliability requirements

- Keep the LLM key on a backend/serverless function only.
- Validate topic text, AI JSON, option count, answer indexes, and text lengths before starting a game.
- Store a safe local fallback for supported topics when AI is unavailable.
- Never render raw student or AI HTML into the page.
- If the question bank is invalid, show a retry message and do not launch a game.
- Keep one error boundary/try-catch around assistant startup and display a useful recovery action.

## Build phases

### Phase 1 — Assistant UX

- Add Mira’s cute character artwork and chat workspace.
- Show starter prompts and lesson navigation.
- Support a strong Prompt Engineering lesson as the first featured example.

### Phase 2 — Lesson generator

- Add secure `/api/lesson` backend endpoint.
- Request strict JSON only and validate it.
- Display: simple explanation, analogy, examples, use cases, exercise, and memory hook.

### Phase 3 — Shared game content

- Move game questions into a single `question-bank.js` adapter.
- Update game2, game1, and game3 to consume the selected topic’s validated question bank.
- Retain existing static topic data as an offline fallback.

### Phase 4 — Learning analytics

- Record per-question results.
- Calculate accuracy by concept.
- Surface weak concepts only after sufficient attempts.
- Recommend a concrete revision action and next topic.

### Phase 5 — QA

- Test every supported topic across all three games.
- Test empty topic, malformed API output, lost session, refresh, mobile, and slow/offline states.
- Run JavaScript syntax checks and browser-console checks before release.
