# Mira: structural teaching assistant rebuild

## Product objective

Replace the seeded demo experience with a real, context-aware tutor. A student can start from a topic field or open the chat directly, ask follow-up questions, and receive every teaching response in the requested Structural Elaborative Mapping format. The assistant must show whether NVIDIA is reachable and only start games after it has a validated question set for the current topic.

## Student journey

1. The student enters a topic/question on the home page or starts directly in Mira's chat.
2. Mira identifies the current subject and makes a live NVIDIA request. The first response generates the full five-part lesson and nine game questions.
3. Mira displays the lesson as text using the required markdown headings. Follow-up questions use the same topic and recent chat history and follow the same format.
4. A persistent API indicator reports Working (green) or Not working (red), with a manual retry action.
5. The game journey stays disabled until nine topic-matched questions pass validation.
6. Bubble, Rocket, and Fishing use questions 1–3, 4–6, and 7–9 from that same validated set.

## Required answer framework

Every teaching reply uses these exact sections, in order:

```markdown
### The Concept: [simple concept name]
One sentence, plain language, no unexplained jargon.

### Where It Lives (Real-World Use)
One or two concrete examples.

### The "Apocalypse" Test (What Breaks?)
What problem this solves and what would fail without it.

### The Trade-offs (Pros vs. Cons)
* **The Good:** one major benefit.
* **The Bad:** one real limitation.

### The Ultimate Analogy
A memorable, vivid analogy that can help answer game questions.
```

The tutor prompt requires these headings for lesson generation and every follow-up response. The UI renders the model's text safely and preserves the headings and line breaks.

## Architecture and trust boundaries

```text
Browser chat + API status indicator
       ↓ same-origin JSON requests
Node server (validates input, reads .env, builds tutor prompt from txt)
       ↓ server-side NVIDIA key only
NVIDIA Nemotron 3 Ultra
       ↓ structured lesson + question bank
Server schema validation
       ↓ safe session storage
Bubble (1–3) → Rocket (4–6) → Fishing (7–9)
```

- Keep `NVIDIA_API_KEY` only in `.env`; never return it or place it in client code.
- `/api/status` performs a small authenticated request and caches the result briefly. It returns only status, timestamp, and safe error text.
- `/api/lesson` returns the five framework sections plus exactly nine validated questions.
- `/api/chat` accepts a bounded conversation history and current question; the system instruction requires the framework in every teaching response.
- The client persists only the current chat history and current question bank in `sessionStorage`.

## Validation rules

- Lesson fields for all five sections must be present and non-empty.
- Exactly nine questions are required before the game button becomes available.
- Each question has four distinct options; every option and answer is a single alphabetic word of at most 16 characters.
- The answer must equal one of the four options, and every question has an explanation and concept tag.
- Invalid model output is rejected with an explicit retry message. No fabricated lesson, quiz, score, or offline answer is substituted.
- API status becomes red for missing credentials, non-success HTTP responses, or timeouts; green only after a successful authenticated inference request.
- All generated text is inserted as text, not executable HTML.

## Interface changes

- Remove the demo topic default, fallback quiz, fabricated streak, profile initials, XP, and other unsupported progress claims.
- Make chat the main workspace: clear welcome state, topic/context chip, conversation history, response loading state, retry state, and game journey action.
- Show a green/red API status button in the home and chat headers. Clicking it forces a fresh health check.
- Preserve Mira artwork and subtle idle/thinking/responding animations; include a reduced-motion mode.
- Keep answer choices compact and prevent canvas/fish text overflow.

## Implementation sequence

1. Record this plan and align `txt` to the exact framework.
2. Update server schema, chat-context handling, API health route, safe errors, and NVIDIA payload.
3. Rebuild assistant chat to remove hard-coded lessons and scores, store conversation context, and render only live content.
4. Add shared API status button and state styling.
5. Connect the validated question bank to all three existing games and block game launch until it is ready.
6. Verify syntax, live API status, lesson schema, chat framework headings, single-word choices, mobile rendering, and browser errors.
