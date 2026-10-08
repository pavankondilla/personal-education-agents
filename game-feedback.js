(() => {
  function show(question, correct, next) {
    if (!question || typeof question.explanation !== 'string' || !question.explanation.trim()) { next(); return; }
    const shade = document.createElement('div');shade.className = 'lesson-answer-shade';shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.setAttribute('aria-label','Answer explanation');
    const card = document.createElement('div');card.className = 'lesson-answer-card';
    const state = document.createElement('span');state.className = correct ? 'lesson-answer-state correct' : 'lesson-answer-state wrong';state.textContent = correct ? 'Correct answer' : 'Let’s learn from that one';
    const title = document.createElement('h2');title.textContent = question.answer;
    const explanation = document.createElement('p');explanation.textContent = question.explanation;
    const objective = document.createElement('small');objective.textContent = question.objective ? `From your lesson: ${question.objective}` : 'From this topic';
    const button = document.createElement('button');button.type = 'button';button.textContent = 'Continue →';button.addEventListener('click',() => {shade.remove();next();});
    card.append(state,title,explanation,objective,button);shade.append(card);document.body.append(shade);button.focus();
  }
  window.AiplayFeedback = {show};
})();
