(() => {
  const $ = selector => document.querySelector(selector);
  const topic = $('#topic'), error = $('#topicError'), agents = window.MiraAgents, study = window.MiraStudy;
  const saved = study.context(study.read('aiplay_study_context', {}));
  let agentId = new URLSearchParams(location.search).get('agent') || saved.agent;
  if (!Object.hasOwn(agents, agentId)) agentId = 'teacher';
  const labels = {teacher:['Newton’s laws','Derivatives, simply','DNA replication'],exam:['Revise quadratics','Solve a physics question','Equilibrium exam traps'],scientist:['Why salt melts ice','Earth without air','Inside a battery']};
  function selectAgent(id) {
    agentId = id; const agent = agents[id]; document.body.dataset.agent = id;
    document.querySelectorAll('[data-agent-choice]').forEach(button => {const selected=button.dataset.agentChoice===id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
    $('#heroMira').dataset.agent=id; $('#heroMira').setAttribute('aria-label', agent.name);
    $('#agentName').textContent=`Hi, I’m ${agent.name}.`; $('#agentTraits').textContent=agent.traits;
    $('#agentDescription').textContent=agent.description; $('#agentTagline').textContent=agent.tagline;
    $('#startLabel').textContent=`Learn with ${agent.name}`; $('#rulesLink').href=`characters.html#${id}`;
    topic.placeholder=agent.placeholder;
    $('#agentRules').replaceChildren(...agent.rules.map(rule=>{const li=document.createElement('li');li.textContent=rule;return li;}));
    $('#examplePrompts').replaceChildren(...agent.prompts.map((prompt,index)=>{const button=document.createElement('button');button.type='button';button.className='prompt-chip';button.textContent=labels[id][index];button.title=prompt;button.addEventListener('click',()=>{topic.value=prompt;error.textContent='';topic.focus();});return button;}));
  }
  document.querySelectorAll('[data-agent-choice]').forEach(button=>button.addEventListener('click',()=>selectAgent(button.dataset.agentChoice)));
  const examValues=[...$('#exam').options].map(option=>option.value);
  $('#exam').value=examValues.includes(saved.exam)?saved.exam:'Other';
  $('#customExam').value=examValues.includes(saved.exam)?'':saved.exam;
  $('#subject').value=saved.subject; $('#minutes').value=String(saved.minutes); $('#level').value=saved.level;
  const showCustomExam=()=>{$('#customExamLabel').hidden=$('#exam').value!=='Other';};
  $('#exam').addEventListener('change',showCustomExam);showCustomExam();
  $('#attachNotes').addEventListener('click',()=>$('#notesFile').click());
  $('#notesFile').addEventListener('change',async event=>{
    const file=event.target.files[0]; if(!file)return;
    $('#attachNotes').disabled=true;
    try { const text=await study.notes(file);const combined=topic.value.trim()?`${topic.value.trim()}\n\n${text}`:text;if(combined.length>study.maxInput)throw new Error('Your question and notes exceed 20,000 characters. Shorten them before attaching.');topic.value=combined;$('#inputHint').textContent=`${file.name} · ready to discuss`;error.textContent='';topic.focus(); }
    catch(failure){error.textContent=failure.message;}finally{event.target.value='';$('#attachNotes').disabled=false;}
  });
  topic.addEventListener('input',()=>{error.textContent='';topic.removeAttribute('aria-invalid');});
  $('#lessonForm').addEventListener('submit',event=>{
    event.preventDefault();const value=topic.value.trim();
    if(value.length<2||value.length>study.maxInput){error.textContent='Enter a topic or question between 2 and 20,000 characters.';topic.setAttribute('aria-invalid','true');topic.focus();return;}
    if($('#exam').value==='Other'&&!$('#customExam').value.trim()){error.textContent='Add your exam name, or choose “Any exam / learning”.';$('#customExam').focus();return;}
    const studyContext=study.context({agent:agentId,exam:$('#exam').value==='Other'?$('#customExam').value:$('#exam').value,subject:$('#subject').value,minutes:$('#minutes').value,level:$('#level').value});
    try {
      ['aiplay_chat_history','aiplay_current_topic','aiplay_dynamic_questions','aiplay_assistant_launch','aiplay_assistant_active','aiplay_last_lesson'].forEach(key=>sessionStorage.removeItem(key));
      study.write('aiplay_study_context',studyContext);study.write('aiplay_lesson_request',{topic:value,level:studyContext.level,studyContext});
      $('#startSession').disabled=true; location.assign('assistant.html');
    } catch(failure){error.textContent=failure.message;$('#startSession').disabled=false;}
  });
  selectAgent(agentId);
})();
