# Mira study team: characters, rules, and implementation

## Product plan

1. Generate one separate transparent 4 × 4 sprite sheet for each Mira, preserving the original Mira identity.
2. Build a personal study studio with a question box, text-note attachment, tutor selection, exam, subject, study time, and learner level.
3. Pass these preferences to the server for both the first lesson and follow-up messages.
4. Switch tutors in the chat sidebar (or the mobile tutor bar) without discarding the conversation.
5. Animate the selected character while idle, thinking, explaining, and encouraging. Honour reduced-motion preferences.
6. Keep every teaching answer in Structural Elaborative Mapping format. Unlock the three games only after a valid topic question bank is available.
7. Verify the home-to-chat flow, all character choices, uploads, context restoration, offline errors, mobile layout, and real NVIDIA responses.

## Character and role definitions

| Agent | Character | Personality | Teaching role |
| --- | --- | --- | --- |
| Teacher Mira | Cream cardigan, plum dress, round gold glasses, coral textbook | Patient, clear, encouraging | Build an understanding from simple ideas and worked examples. |
| Exam Coach Mira | Indigo study jacket, amber headband, stopwatch, checklist | Focused, calm, practical | Use the student’s exam, subject, level, and available time for revision and solving questions. |
| Scientist Mira | White lab coat, teal vest, goggles, aqua flask | Curious, precise, imaginative | Explain causes, explore predictions, and distinguish observations from assumptions. |

These are three separately instructed tutor personas on the same NVIDIA model, not three independent autonomous processes. Switching changes the server-side teaching instructions used for the next answer. Recent conversation context stays available to the selected tutor.

## Teacher Mira rules

- Begin with what the learner says they know; do not assume expertise or mastery.
- Give a clear, jargon-light definition, then build one idea at a time.
- Answer the actual question. Put a short worked solution inside a framework example when relevant.
- Explain why each step works and define unfamiliar words.
- Respond patiently to confusion; use another example without shaming the student.
- Identify a misunderstanding without pretending an incorrect answer is correct.

## Exam Coach Mira rules

- Use the supplied exam, subject, time, and learner level in the explanation.
- For a specific numerical problem, give the calculation, units, answer, and a quick check in the teaching text.
- For revision, prioritise a small feasible sequence within the chosen study time.
- Call attention to common traps and explain the method, not just the answer.
- Do not invent official syllabuses, previous-year questions, cut-offs, or marks/rank guarantees.
- Treat ambiguous labels such as NIAT as learner context; request syllabus detail when necessary.
- Describe the three games as concept-recall practice, not complete JEE/NEET/other exam simulations.

## Scientist Mira rules

- Answer the student’s why, how, or what-if question with a causal explanation.
- Distinguish facts, observations, models, assumptions, and predictions.
- Use a safe everyday observation or thought experiment; describe a prediction and its reasoning.
- Do not claim to have performed an experiment or fabricate measurements or citations.
- Explain where an analogy breaks down and state relevant uncertainty.
- For a numerical/scientific question, solve the actual problem and preserve units.

## Shared explanation framework

Every tutor uses these headings, in order:

1. **The Concept:** a simple name and one-sentence definition.
2. **Where It Lives (Real-World Use):** one or two relatable examples; a supplied exam question can be the worked example.
3. **The "Apocalypse" Test (What Breaks?):** the problem this idea solves and what becomes harder without it.
4. **The Trade-offs (Pros vs. Cons):** a real benefit and a real limitation.
5. **The Ultimate Analogy:** a vivid, useful mental model.

The shared teaching prompt lives in `txt`. Character-specific runtime instructions live in `mira-agents.js`, which is consumed by both the Node backend and the browser. Student controls never supply arbitrary system roles: the server selects from the three approved agent identifiers.

For follow-ups, the server requests structured teaching fields plus an explicit direct answer, then renders the five markdown headings itself. The direct answer appears as the worked example under Where It Lives. This prevents the framework from replacing the answer to a specific numerical question with only a general explanation.

## Animation assets

- `assets/mira/teacher-sheet.png`
- `assets/mira/exam-sheet.png`
- `assets/mira/scientist-sheet.png`

Each image is a transparent 1254 × 1254 PNG, containing four columns and four rows. CSS uses proportional background positions, so fractional cell widths do not require destructive image cropping.

| Row | State | App trigger |
| --- | --- | --- |
| 1 | Idle / blink | Waiting for a question |
| 2 | Thinking | A lesson or chat request is in progress |
| 3 | Explaining | A reply has arrived |
| 4 | Encouraging | Available in the character preview; used for a completed learning action |

The preview gallery is `characters.html`. Each character has four animation controls, full role rules, the entire sprite sheet, and a PNG download link. The animation represents app activity, not sentience or human feelings.

## Inputs, memory, and games

- Questions and pasted material support up to 20,000 characters. Files support `.txt`, `.md`, and `.csv`; files are read locally into the draft and sent to the AI only when the student submits.
- The student can choose JEE (IIT), NEET, NIAT, school/board exams, college exams, or an exam name of their own. These labels provide context, not a verified official syllabus.
- The session remembers the selected agent, exam settings, current topic, recent turns, and question bank in browser session storage. A new chat clears the active conversation and question bank.
- The initial lesson prepares exactly nine questions: Bubble 1–3, Rocket 4–6, Fishing 7–9. Each question requires four distinct one-word alphabetic options of at most 16 characters and an answer that matches one option.
- The game card names the lesson that its questions cover. Follow-up chat answers do not silently relabel the original game bank.
- Failed or invalid AI responses show a retry action; there are no canned lessons or fabricated scores in this flow.
- Transient provider errors receive up to two automatic retries within the request deadline. Invalid lesson/response structure gets one model repair attempt before an explicit error is shown.
- The API indicator performs authenticated NVIDIA checks and shows green or red, with a click-to-recheck action.
- The local server binds to 127.0.0.1 and excludes secrets, server source, configuration, logs, and instruction files from public static routes.

## Verification scope

Browser checks cover real rendered controls, switching tutors, attachment validation, input/context payloads, five-section answer rendering, session restoration, error recovery, game handoff, mobile overflow, and animation controls. Separate live inference checks validate the NVIDIA connection, structured lesson fields, strict choices, and follow-up headings. These checks reduce errors; generated answers still need comparison with course material when accuracy matters.
