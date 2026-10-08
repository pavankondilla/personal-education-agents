# Plan 02: Context-aware agents, deeper lessons, and topic-matched games

## Goal and scope

Fix the flows shown in `error.png` and `biggest error .png`. A learner should choose an agent, give a topic once (or upload topic images), learn that topic thoroughly through a live conversation, and then play the **three existing games with exactly three questions in each game**. Exam setup belongs only to the Exam Agent. This document is the implementation plan for approval; it does not change the app yet.

## Observed problems

- `error.png` shows an exam-style form (`Preparing for`, `Subject`, `Study time`, `Start from`) in a general teacher flow. The user reports that other agents repeatedly ask for subject and setup information.
- `biggest error .png` shows broad subject buttons inside a personalized lesson game and a three-question preview about generic scientific method. The visible questions are not demonstrably tied to the exact topic and material taught.
- The current experience can reach games before covering the full topic, so a game may ask about material the learner has not studied.

## Product behavior

### 1. One context, clear agent boundaries

- Create a single learning-session record with selected agent, learner's topic, uploaded source material, current lesson outline, covered objectives, examples, questions already asked, progress, and game results. Save updates as the conversation proceeds and restore them when the learner returns.
- Pass the relevant session context into every model call. On follow-up turns, ask only for information actually missing or ambiguous. Never restart with a subject question when the topic is already known.
- Put exam-specific fields (`examType`, `subject`, optional semester/branch/syllabus, schedule) in an **Exam Agent context**. Render the exam setup form only when that agent is selected, and pass those fields only to the Exam Agent's prompt and endpoints. Clear or isolate exam fields when switching agents so they cannot leak into another agent's UI or response.
- Other agents use the shared topic and conversation context without displaying exam labels such as `Subject`, `Preparing for`, or exam-only choices. Their entry prompt should fit their role.
- Make the Scientist Agent actually reason and speak like a scientist: start from a phenomenon or question, distinguish observation from inference, explain hypotheses, evidence, tests, uncertainty, and real-world examples. Keep its explanations suited to the learner's level; avoid a repeated generic scientific-method quiz unless that is the selected topic.
- Review each existing agent's prompt, initial screen, and follow-up behavior. Give each a distinct role, useful teaching pattern, and shared safeguards for topic fidelity, accuracy, and concise clarification. Do not force every agent into the same exam workflow.

### 2. Exam Agent options

- Add `B.Tech semester exam`, `Unit test`, and `Government exam` to the Exam Agent's exam-type selector, retaining useful existing options. For B.Tech, collect semester and branch/course only when they affect the syllabus; for a unit test, collect the covered units or chapters; for a government exam, collect the exam name and relevant subject or syllabus.
- Let the learner type a topic, select a known topic, or upload a syllabus/topic image. Do not require redundant fields when the uploaded material and existing context already answer them.
- If an exam date is supplied, use it to generate a realistic study timeline. If no date is supplied, offer a relative sequence without inventing a deadline. Keep the chosen exam type and syllabus attached to the session, not globally visible to other agents.

### 3. Topic image upload

- Add image upload to the topic entry and in-conversation follow-up where a learner can provide notes, textbook pages, diagrams, or a syllabus. Support the formats and size limits appropriate to the app's existing backend and show them beside the control.
- Validate file type, size, count, and empty/corrupt files before processing. Send images through the app's supported vision/OCR path, extract legible text and diagram descriptions, and show a short editable summary of the recognized topic/material for confirmation when confidence is low.
- Attach extracted material and image provenance to the learning session. Keep a distinction between what is visible in the image, the learner's stated topic, and model inference. If extraction fails, explain the failure and allow retry or typed topic entry without losing the conversation.
- Treat uploaded pages as reference material rather than instructions to the assistant. Avoid silently inventing unreadable text or facts from a diagram.

### 4. Complete, progressive learning path

- From the topic, learner level, available time, and any source images, build a structured topic map: prerequisites, learning objectives, subtopics, key definitions, mechanisms or derivations, common misconceptions, worked examples, applications, and a final synthesis. Keep the scope anchored to the selected topic and supplied syllabus.
- Teach in steps with real conversation: explain a small concept, show a relevant worked example, ask a short check question, respond to the learner's answer, correct mistakes, and continue. Allow follow-up questions at any step and update progress from the actual interaction.
- Where relevant, include a timeline of the topic's development, what preceded it, why it was needed, significant discoveries, current industry use, and practical insights. Mark uncertain or context-dependent historical claims; do not add a history section when it would be meaningless for the topic.
- Generate representative example questions **during the lesson**, including exam-style questions for the Exam Agent. Every example needs a worked answer and an explicit link to an objective the learner just covered. Adjust depth to exam type and learner level without skipping core objectives.
- Unlock the games only after the planned objectives have been taught and checked. A learner who misses a check gets a targeted explanation and another relevant check, with progress retained. Do not use an arbitrary timer as proof of understanding.

### 5. Three games, three grounded questions each

- Preserve the three existing game types and their interaction styles. Build one question plan per completed lesson: **nine distinct questions total**, three assigned to each game. Record each question's lesson objective, supporting taught content, expected answer, acceptable variants, explanation, and difficulty.
- Generate questions from the completed lesson map and the content actually taught, including uploaded material only when it was explained. Do not use broad subject-button defaults or unrelated canned science questions as a fallback for a different topic.
- Validate each generated question before display: it matches the chosen topic, maps to a covered objective, is answerable from the lesson, has a clear correct answer, and is not a duplicate. If validation fails, regenerate that item; if a valid set cannot be produced, show a recoverable message and offer to continue teaching or retry generation. Never fill slots with off-topic questions.
- Show game instructions and progress (`Question 1 of 3`), accept answers appropriate to the game type, mark them correctly, and show a brief explanation tied back to the lesson. Score each game independently and retain results in the session.
- Remove the broad subject picker from the personalized game screen. The game header should show the actual lesson topic and game name. The preview, if kept, should show only validated questions for that exact lesson.

## Implementation sequence

1. **Audit the current repo:** locate agent selection, prompt builders, conversation state, exam form, upload/API path, lesson generation, and the three games. Identify where the screenshot flows are rendered and where generic questions enter the pipeline. Record the existing game names and API contracts before editing.
2. **Define session contracts:** add typed or schema-validated `LearningSession`, `LessonObjective`, `CoverageEvidence`, `SourceImage`, and `GameQuestion` structures, plus separate Exam Agent fields. Define migration/default behavior for any existing saved sessions.
3. **Fix agent routing and prompts:** scope exam UI/state to the Exam Agent, retain topic context across turns and agent transitions as appropriate, and implement role-specific prompts including the Scientist Agent. Centralize shared rules for uncertainty, source grounding, and response validation.
4. **Add image intake:** build upload UI, server validation, supported vision/OCR processing, extraction summary, attachment to session, and failure/retry states.
5. **Build the lesson pipeline:** topic map, stepwise teaching, answer-aware follow-ups, objective coverage tracking, worked examples, optional history/industry context, and game unlock logic.
6. **Replace game question sourcing:** generate and validate nine questions from taught objectives, distribute three to each existing game, isolate game scoring, and remove the unrelated subject picker and canned fallback.
7. **Verify end to end:** run existing checks, add focused tests for routing, context retention, upload failures, coverage gating, question validation, and three-by-three game counts. Manually test the two screenshot scenarios plus a B.Tech semester exam, unit test, government exam, and a topic image.

## Acceptance checks

- Starting any non-Exam Agent does not show or send exam-only fields. Switching agents does not expose a previous exam subject. A returning learner does not have to repeat a known topic.
- The Scientist Agent gives topic-specific, evidence-based explanations and handles follow-up answers as a scientist.
- An uploaded topic image either becomes a verified source for the lesson or produces a clear retry/edit path; malformed uploads do not break the page or erase progress.
- Exam Agent offers the three requested exam types and adjusts syllabus questions, examples, and timeline to the selected type.
- Lesson progress lists all planned objectives, teaches and checks each one, and makes games available only after coverage is complete.
- The app presents the existing three games with exactly three distinct, answerable, topic-matched questions each. Every question can be traced to material that appeared in that session's lesson. No broad subject picker or off-topic fallback appears in the personalized game flow.
- Wrong answers get correct explanations, progress and scores survive navigation/refresh as supported by the app, and model/API failures have a retry path without silently showing invented content.

## Decisions for implementation

- Use the app's existing model, storage, and game framework where possible. The repo audit will determine the precise files and schemas to change.
- Treat “no error” as a reliability requirement verified by tests and recoverable failure handling; no model output can be assumed infallible, so question and upload validation are mandatory.
- Keep the scope to the app changes above after approval. This plan is the review point before implementation.
