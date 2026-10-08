(() => {
  const $ = selector => document.querySelector(selector);
  const topic = $('#topic'), error = $('#topicError'), agents = window.MiraAgents, study = window.MiraStudy;
  const saved = study.context(study.read('aiplay_study_context', {}));
  const savedExam = study.read('aiplay_exam_context', {});
  let agentId = new URLSearchParams(location.search).get('agent') || saved.agent;
  if (!Object.hasOwn(agents, agentId)) agentId = 'teacher';
  function selectAgent(id) {
    agentId = id; const agent = agents[id]; document.body.dataset.agent = id;
    document.querySelectorAll('[data-agent-choice]').forEach(button => {const selected=button.dataset.agentChoice===id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
    $('#heroMira').dataset.agent=id; $('#heroMira').setAttribute('aria-label', agent.name);
    $('#agentName').textContent=`Hi, I’m ${agent.name}.`; $('#agentTraits').textContent=agent.traits;
    $('#agentDescription').textContent=agent.description; $('#agentTagline').textContent=agent.tagline;
    $('#startLabel').textContent=id==='exam'?'Build my exam plan':id==='scientist'?'Explore this question':'Begin learning'; $('#rulesLink').href=`characters.html#${id}`;
    topic.placeholder=agent.placeholder;$('#examOptions').hidden=id!=='exam';$('#customExamLabel').hidden=id!=='exam'||$('#exam').value!=='Other';
    $('#agentRules').replaceChildren(...agent.rules.map(rule=>{const li=document.createElement('li');li.textContent=rule;return li;}));
  }
  document.querySelectorAll('[data-agent-choice]').forEach(button=>button.addEventListener('click',()=>selectAgent(button.dataset.agentChoice)));
  const examValues=[...$('#exam').options].map(option=>option.value);
  const examValue=savedExam.exam||saved.exam||'General learning';
  $('#exam').value=examValues.includes(examValue)?examValue:'Other';
  $('#customExam').value=examValues.includes(examValue)?'':examValue;
  $('#subject').value=savedExam.subject||saved.subject||'';$('#semester').value=savedExam.semester||'';$('#branch').value=savedExam.branch||'';$('#units').value=savedExam.units||'';$('#governmentExam').value=savedExam.governmentExam||'';$('#examDate').value=savedExam.examDate||'';
  const showExamFields=()=>{const exam=$('#exam').value;$('#customExamLabel').hidden=agentId!=='exam'||exam!=='Other';$('#semesterLabel').hidden=exam!=='B.Tech semester exam';$('#branchLabel').hidden=exam!=='B.Tech semester exam';$('#unitsLabel').hidden=exam!=='Unit test';$('#governmentExamLabel').hidden=exam!=='Government exam';};
  $('#exam').addEventListener('change',showExamFields);showExamFields();
  $('#attachNotes').addEventListener('click',()=>$('#notesFile').click());
  $('#notesFile').addEventListener('change',async event=>{
    const file=event.target.files[0]; if(!file)return;
    $('#attachNotes').disabled=true;$('#startSession').disabled=true;topic.readOnly=true;error.textContent='';$('#inputHint').textContent='Reading your paper… Please wait.';$('#inputHint').setAttribute('role','status');$('#lessonForm').setAttribute('aria-busy','true');
    try { let text;if(study.isImage(file)){const image=await study.imageData(file);const response=await fetch('/api/image-topic',{method:'POST',headers:{'Content-Type':'application/json',...window.AiplayAISettings?.headers()},body:JSON.stringify({image}),signal:AbortSignal.timeout(190000)});const data=await response.json().catch(()=>{throw new Error('The image service returned an unreadable response. Please retry.');});if(!response.ok)throw new Error(data.error||'Could not read this image. Try again or type the topic.');if(typeof data.summary!=='string'||!data.summary.trim())throw new Error('No readable questions found. Try a clearer image.');text=`Question paper from ${image.name}:\n${data.summary}`;}else text=await study.notes(file);const combined=topic.value.trim()?`${topic.value.trim()}\n\n${text}`:text;if(combined.length>study.maxInput)throw new Error('Your question and notes exceed 20,000 characters. Shorten them before attaching.');topic.value=combined;$('#inputHint').textContent=`${file.name} · review the extracted notes before starting`;error.textContent='';topic.focus(); }
    catch(failure){error.textContent=study.uploadError(failure);$('#inputHint').textContent='Upload unsuccessful. Choose a clearer page and try again.';}finally{event.target.value='';$('#attachNotes').disabled=false;$('#startSession').disabled=false;topic.readOnly=false;$('#lessonForm').setAttribute('aria-busy','false');}
  });
  topic.addEventListener('input',()=>{error.textContent='';topic.removeAttribute('aria-invalid');});
  $('#lessonForm').addEventListener('submit',event=>{
    event.preventDefault();if($('#attachNotes').disabled)return;const value=topic.value.trim();
    if(value.length<2||value.length>study.maxInput){error.textContent='Enter a topic or question between 2 and 20,000 characters.';topic.setAttribute('aria-invalid','true');topic.focus();return;}
    if(agentId==='exam'&&$('#exam').value==='Other'&&!$('#customExam').value.trim()){error.textContent='Add your exam name, or choose “Any exam / learning”.';$('#customExam').focus();return;}
    const examContext={exam:$('#exam').value==='Other'?$('#customExam').value:$('#exam').value,subject:$('#subject').value,semester:$('#semester').value,branch:$('#branch').value,units:$('#units').value,governmentExam:$('#governmentExam').value,examDate:$('#examDate').value};
    const studyContext=study.context({agent:agentId,...(agentId==='exam'?examContext:{})});
    try {
      ['aiplay_chat_history','aiplay_current_topic','aiplay_dynamic_questions','aiplay_assistant_launch','aiplay_assistant_active','aiplay_last_lesson','aiplay_lesson_progress','aiplay_exam_roadmap'].forEach(key=>sessionStorage.removeItem(key));
      if(agentId==='exam'){
        const roadmap=window.MiraRoadmap.create(value,examContext.examDate);
        study.write('aiplay_exam_roadmap',roadmap);
        study.write('aiplay_exam_context',examContext);
      }
      study.write('aiplay_study_context',studyContext);study.write('aiplay_lesson_request',{topic:agentId==='exam'?study.read('aiplay_exam_roadmap',{}).topics[0].title:value,level:studyContext.level,studyContext});
      $('#startSession').disabled=true; location.assign('assistant.html');
    } catch(failure){error.textContent=failure.message;$('#startSession').disabled=false;}
  });
  selectAgent(agentId);
})();
