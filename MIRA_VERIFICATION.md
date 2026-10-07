# Mira implementation verification

Verified locally on 8 October 2026.

## Browser checks — passed

Chrome checks used explicitly isolated test fixtures for AI responses. Fixtures exist only in `scripts/verify-mira.cjs`; they are not an offline fallback in the application.

- Desktop study page and mobile layouts at 390 px and 320 px: no horizontal page overflow.
- All three character selectors update the character, descriptions, prompts, and rules.
- Exam, subject, level, and study time reach the lesson request.
- Plain-text note attachments work; unsupported files produce a visible error.
- Empty input is rejected before navigation.
- Both initial lessons and follow-ups render the five required sections.
- Switching tutors preserves prior conversation context.
- Refresh restores the selected tutor and conversation without silently generating a new lesson.
- The API badge switches between green and red and can be manually rechecked.
- Valid question banks hand off to Bubble; failure keeps games unavailable.
- Retrying a failed lesson does not duplicate the user’s question or insert a canned answer.
- Each gallery character exposes all four animation states; sprite background positions change when animation is enabled and respect reduced-motion settings.
- No JavaScript page errors were observed in the tested flows.

## Live NVIDIA checks — passed

- Authenticated inference returned successfully.
- Teacher Mira, Exam Coach Mira, and Scientist Mira each generated a complete lesson with nine questions and four unique one-word options per question.
- The live exam lesson solved the 2 kg / 3 m/s² problem with a result of 6 N.
- An initial live follow-up omitted the requested numerical result. The server was changed to require a direct-answer field before rendering the framework.
- After that change, a live Scientist Mira follow-up used the earlier acceleration with a new mass of 4 kg and returned twelve newtons, with all five headings.
- A temporary NVIDIA 503 response was observed during verification; bounded retries for transient provider failures have been added.
- Requests for `.env`, server source, logs, and package configuration returned 404. Tests checked status only and did not print credentials.

## Run again

- Syntax: `npm run check`
- Browser: `node scripts/verify-mira.cjs` with Playwright installed, or `PLAYWRIGHT_MODULE` pointing to an existing installation. `CHROME_PATH` can select an installed Chrome binary.
- Live: `node scripts/verify-mira-live.cjs` against the running local server. This sends live NVIDIA requests.
- Focused live follow-up: `node scripts/verify-mira-live.cjs --follow-up-only`.

Screenshots are in `.artifacts/`. The server is local to this machine at `http://127.0.0.1:4173/`.

The checks cover the listed scenarios. They are not a guarantee that every model-generated answer is correct or that the external provider will always be available.
