(() => {
  const $=selector=>document.querySelector(selector), agents=window.MiraAgents, study=window.MiraStudy;
  const input=$('#chatInput'), conversation=$('#conversation'), scroll=$('#chatScroll');
  const request=study.read('aiplay_lesson_request',{});
  let context=study.context(request.studyContext||study.read('aiplay_study_context',{}));
  if(request.level)context.level=['Beginner','Intermediate','Advanced'].includes(request.level)?request.level:context.level;
  let topic='',history=[],questions=[],lesson=null,busy=false,moodTimer;
  let progress=study.read('aiplay_lesson_progress',{done:[],attempts:{},cleanStreak:0});
  if(!progress||!Array.isArray(progress.done))progress={done:[],attempts:{},cleanStreak:0};
  progress.attempts=progress.attempts&&typeof progress.attempts==='object'?progress.attempts:{};
  let roadmap=study.read('aiplay_exam_roadmap',null);
  if(!roadmap||!Array.isArray(roadmap.topics)||!roadmap.topics.length)roadmap=null;
  const loadedHistory=study.read('aiplay_chat_history',[]);
  if(Array.isArray(loadedHistory))history=loadedHistory.filter(item=>item&&['user','assistant'].includes(item.role)&&typeof item.content==='string').slice(-16);
  const loadedQuestions=study.read('aiplay_dynamic_questions',[]);
  if(validBank(loadedQuestions))questions=loadedQuestions;
  lesson=study.read('aiplay_last_lesson',null);
  try{topic=sessionStorage.getItem('aiplay_current_topic')||'';}catch{}
  let lessonLoaded=Boolean(topic&&lesson&&Array.isArray(lesson.steps)&&lesson.steps.length);
  const headings=['The Concept:','Where It Lives (Real-World Use)','The "Apocalypse" Test (What Breaks?)','The Trade-offs (Pros vs. Cons)','The Ultimate Analogy'];

  function validBank(bank){return Array.isArray(bank)&&bank.length===9&&bank.every(q=>q&&typeof q.question==='string'&&typeof q.objective==='string'&&typeof q.evidence==='string'&&Array.isArray(q.options)&&q.options.length===4&&new Set(q.options.map(x=>String(x).toLowerCase())).size===4&&q.options.every(x=>typeof x==='string'&&/^[A-Za-z0-9.+-]{1,16}$/.test(x))&&q.options.includes(q.answer));}
  function setTopic(value){topic=String(value||'');$('#topicName').textContent=topic.length>100?`${topic.slice(0,100)}…`:topic;$('#topicBanner').hidden=!topic;}
  function scrollDown(){scroll.scrollTop=scroll.scrollHeight;}
  function setMood(state){clearTimeout(moodTimer);document.body.dataset.mood=state;$('#welcomeMira').dataset.state=state;}
  function setBusy(value){busy=value;['#sendButton','#attachButton','#clearTopic','#startGames','#newChat','#mobileNewChat'].forEach(selector=>{$(selector).disabled=value;});document.querySelectorAll('[data-select-agent],.suggestions button,.roadmap-topic button').forEach(button=>button.disabled=value);$('#chatForm').setAttribute('aria-busy',String(value));}
  function appendInline(element,value){
    for(const part of String(value).split(/(\*\*[^*]+\*\*|`[^`]+`)/g)){
      if(part.startsWith('**')&&part.endsWith('**')){const strong=document.createElement('strong');strong.textContent=part.slice(2,-2);element.append(strong);}
      else if(part.startsWith('`')&&part.endsWith('`')){const code=document.createElement('code');code.textContent=part.slice(1,-1);element.append(code);}
      else element.append(document.createTextNode(part));
    }
  }
  function renderFramework(text,target){
    let paragraph=[];
    const flush=()=>{if(paragraph.length){const p=document.createElement('p');appendInline(p,paragraph.join('\n'));target.append(p);paragraph=[];}};
    for(const line of text.split(/\r?\n/)){
      const heading=line.match(/^###\s+(.+)$/);
      if(heading){flush();const h=document.createElement('h3');h.textContent=heading[1];target.append(h);}
      else if(/^\s*[*-]\s+/.test(line)){flush();const p=document.createElement('p');p.className='framework-bullet';appendInline(p,line.replace(/^\s*[*-]\s+/,''));target.append(p);}
      else if(line.trim()==='---')flush();
      else if(line.trim())paragraph.push(line.trim());else flush();
    }
    flush();
  }
  function appendMessage(role,text,options={}){
    const row=document.createElement('div');
    if(role==='user'){row.className='user-message';row.textContent=text;conversation.append(row);scrollDown();return row;}
    const id=Object.hasOwn(agents,options.agent)?options.agent:context.agent;
    row.className=`message${options.error?' error-message':''}${options.pending?' pending':''}`;row.dataset.agent=id;
    const sprite=document.createElement('span');sprite.className='mira-sprite';sprite.dataset.agent=id;sprite.dataset.state=options.pending?'thinking':'idle';sprite.dataset.static=String(!options.pending);sprite.setAttribute('aria-hidden','true');
    const bubble=document.createElement('div');bubble.className='bubble';const label=document.createElement('p');label.className='speaker';label.textContent=options.error?`${agents[id].name.toUpperCase()} · COULDN’T FINISH`:agents[id].name.toUpperCase();
    const copy=document.createElement('div');copy.className='message-copy';if(options.framework)renderFramework(text,copy);else copy.textContent=text;
    bubble.append(label,copy);row.append(sprite,bubble);
    if(options.retry){const actions=document.createElement('div');actions.className='message-actions';const button=document.createElement('button');button.type='button';button.textContent='Try again';button.addEventListener('click',()=>{if(busy)return;row.remove();ask(options.retry,true);});actions.append(button);bubble.append(actions);}
    conversation.append(row);scrollDown();return row;
  }
  function save(){study.write('aiplay_chat_history',history.slice(-16));study.write('aiplay_study_context',context);study.write('aiplay_lesson_progress',progress);if(roadmap)study.write('aiplay_exam_roadmap',roadmap);sessionStorage.setItem('aiplay_current_topic',topic);if(lesson)study.write('aiplay_last_lesson',lesson);}
  function complete(){return lessonLoaded&&lesson.steps.every(step=>progress.done.includes(step.id));}
  function showGames(){const done=complete(),ready=done&&validBank(questions);$('#gameReady').hidden=!done;if(done){if(ready)study.write('aiplay_dynamic_questions',questions);$('#gameTopicLabel').textContent=ready?`Practise: ${lesson.title}`:'Lesson complete — prepare your three games';$('#startGames').firstChild.textContent=ready?'Play this lesson ':'Prepare my games ';}}
  function textBlock(parent,label,value){if(!value)return;const section=document.createElement('div');section.className='path-context';const title=document.createElement('b');title.textContent=label;const p=document.createElement('p');p.textContent=value;section.append(title,p);parent.append(section);}
  function renderRoadmap(){
    const root=$('#examRoadmap');root.replaceChildren();root.hidden=context.agent!=='exam'||!roadmap;if(root.hidden)return;
    const learned=roadmap.topics.filter(item=>item.learned).length,reviewed=roadmap.topics.filter(item=>item.reviewed).length;
    const head=document.createElement('div');head.className='roadmap-head';const title=document.createElement('div');const eyebrow=document.createElement('span');eyebrow.textContent='EXAM COACH · YOUR SUPPLIED TOPICS';const h=document.createElement('h2');h.textContent='Learn every topic. Then revise each one.';const summary=document.createElement('p');summary.textContent=`${learned}/${roadmap.topics.length} learned · ${reviewed}/${roadmap.topics.length} revised${roadmap.examDate?` · Exam ${roadmap.examDate}`:''}`;title.append(eyebrow,h,summary);head.append(title);root.append(head);
    if(!roadmap.examDate){const note=document.createElement('p');note.className='roadmap-note';note.textContent='Add an exam date on the study studio page for calendar dates. Every supplied topic is still included here.';root.append(note);}
    const list=document.createElement('div');list.className='roadmap-list';roadmap.topics.forEach((item,index)=>{
      const row=document.createElement('div');row.className=`roadmap-topic${index===roadmap.active?' current':''}`;const details=document.createElement('div');const number=document.createElement('span');number.className='roadmap-number';number.textContent=String(index+1).padStart(2,'0');const copy=document.createElement('div');const name=document.createElement('b');name.textContent=item.title;const dates=document.createElement('small');dates.textContent=`${item.learned?'Learned':'To learn'}${item.studyDate?` · Study ${item.studyDate}`:''} · ${item.reviewed?'Revised':'Revision due'}${item.reviewDate?` ${item.reviewDate}`:''}`;copy.append(name,dates);details.append(number,copy);const button=document.createElement('button');button.type='button';button.textContent=item.learned?'Revise':'Study';button.disabled=busy||index===roadmap.active&&lessonLoaded&&!complete();button.addEventListener('click',()=>startRoadmapTopic(index));row.append(details,button);list.append(row);
    });root.append(list);
    if(reviewed===roadmap.topics.length){const done=document.createElement('p');done.className='roadmap-finished';done.textContent='Every supplied topic has been studied and revised. Keep practising the topics that feel least secure.';root.append(done);}
  }
  function startRoadmapTopic(index){
    if(busy||!roadmap||!roadmap.topics[index])return;
    roadmap.active=index;roadmap.reviewing=Boolean(roadmap.topics[index].learned);lesson=null;lessonLoaded=false;questions=[];progress={done:[],attempts:{},cleanStreak:0};sessionStorage.removeItem('aiplay_last_lesson');sessionStorage.removeItem('aiplay_dynamic_questions');setTopic('');$('#lessonPath').hidden=true;$('#gameReady').hidden=true;save();renderRoadmap();ask(roadmap.topics[index].title);
  }
  function finishRoadmapTopic(){
    if(context.agent!=='exam'||!roadmap||!complete())return;
    const item=roadmap.topics[roadmap.active];if(!item)return;
    if(roadmap.reviewing)item.reviewed=true;else item.learned=true;
    roadmap.reviewing=false;save();renderRoadmap();
  }
  function renderLessonPath(){
    const root=$('#lessonPath');root.replaceChildren();root.hidden=!lessonLoaded;if(!lessonLoaded)return;
    const title=document.createElement('div');title.className='path-heading';const h=document.createElement('h2');h.textContent=`Your path: ${lesson.title}`;const count=document.createElement('span');count.textContent=`${progress.done.length} / ${lesson.steps.length} steps checked`;title.append(h,count);root.append(title);
    const overview=document.createElement('div');overview.className='path-overview';textBlock(overview,'First, what you need',lesson.prerequisites);textBlock(overview,'What came before',lesson.history);textBlock(overview,'Where it helps in industry',lesson.industry);textBlock(overview,'Important insight',lesson.insights);textBlock(overview,'Your study timeline',lesson.timeline);root.append(overview);
    lesson.steps.forEach((step,index)=>{
      const done=progress.done.includes(step.id),active=!done&&lesson.steps.slice(0,index).every(item=>progress.done.includes(item.id));
      const card=document.createElement('article');card.className=`lesson-step${done?' done':''}${active?' active':''}`;
      const heading=document.createElement('div');heading.className='step-heading';const badge=document.createElement('span');badge.textContent=done?'✓':String(index+1).padStart(2,'0');const h3=document.createElement('h3');h3.textContent=step.objective;heading.append(badge,h3);if(context.agent==='teacher'){const difficulty=document.createElement('small');difficulty.className='step-difficulty';difficulty.textContent=index===0?'EASY':index===lesson.steps.length-1?'HARD':'MEDIUM';heading.append(difficulty);}card.append(heading);
      if(done||active){textBlock(card,'Understand',step.explanation);textBlock(card,'Worked example',step.example);textBlock(card,'Watch for this mistake',step.misconception);if(done)textBlock(card,'Why that check works',step.check.explanation);}
      if(active){const question=document.createElement('p');question.className='step-question';question.textContent=step.check.question;card.append(question);const options=document.createElement('div');options.className='step-options';const feedback=document.createElement('p');feedback.className='step-feedback';feedback.setAttribute('role','status');step.check.options.forEach(option=>{const button=document.createElement('button');button.type='button';button.textContent=option;button.addEventListener('click',()=>{if(option!==step.check.answer){progress.attempts[step.id]=(progress.attempts[step.id]||0)+1;progress.cleanStreak=0;context.level='Beginner';feedback.textContent=progress.attempts[step.id]===1?`Try again. Hint: ${step.misconception} Revisit the worked example above.`:`Let's slow down. ${step.explanation} ${step.example} ${step.check.explanation}`;feedback.classList.add('incorrect');save();return;}progress.cleanStreak=progress.attempts[step.id]?0:(progress.cleanStreak||0)+1;if(context.agent==='teacher')context.level=progress.cleanStreak>=2?'Advanced':progress.cleanStreak===1?'Intermediate':'Beginner';progress.done.push(step.id);save();renderLessonPath();showGames();if(complete()){finishRoadmapTopic();prepareGames();}scrollDown();});options.append(button);});card.append(options,feedback);}
      if(!done&&!active){const locked=document.createElement('p');locked.className='step-locked';locked.textContent='Complete the previous step to continue.';card.append(locked);}
      root.append(card);
    });
  }
  async function prepareGames(){if(!complete()||busy)return;setBusy(true);$('#startGames').disabled=true;$('#startGames').firstChild.textContent='Preparing questions… ';try{const payload=await requestReply('/api/questions',{lesson,studyContext:context});if(!validBank(payload.questions))throw new Error('The questions were incomplete. Please retry.');questions=payload.questions;save();showGames();}catch(error){$('#inputError').textContent=error.message||'Could not prepare the games. Please retry.';$('#startGames').firstChild.textContent='Retry game preparation ';}finally{setBusy(false);}}
  function renderAgentControls(){
    for(const selector of ['#sidebarAgents','#mobileAgents']){
      const target=$(selector);Object.values(agents).forEach(agent=>{
        const button=document.createElement('button');button.type='button';button.className='chat-agent-choice';button.dataset.selectAgent=agent.id;button.setAttribute('aria-pressed',String(agent.id===context.agent));
        const sprite=document.createElement('span');sprite.className='mira-sprite';sprite.dataset.agent=agent.id;sprite.dataset.static='true';sprite.setAttribute('aria-hidden','true');const words=document.createElement('span');const name=document.createElement('b');name.textContent=selector==='#mobileAgents'?agent.shortName:agent.name;const label=document.createElement('small');label.textContent=agent.label;words.append(name,label);button.append(sprite,words);button.addEventListener('click',()=>selectAgent(agent.id,true));target.append(button);
      });
    }
  }
  function selectAgent(id,announce=false){
    if(busy||!Object.hasOwn(agents,id))return;
    const changed=context.agent!==id;context=study.context({...context,agent:id,...(id==='exam'?study.read('aiplay_exam_context',{}):{})});const agent=agents[id];document.body.dataset.agent=id;
    $('#currentAgentName').textContent=agent.name;$('#sideName').textContent=agent.name;$('#sideMira').dataset.agent=id;$('#welcomeMira').dataset.agent=id;$('#welcomeMira').setAttribute('aria-label',agent.name);$('#welcomeTitle').textContent=`Hi, I’m ${agent.name}.`;$('#welcomeText').textContent=agent.welcome;input.placeholder=agent.placeholder;$('#rulesLink').href=`characters.html#${id}`;
    $('#studyContextLabel').textContent=[id==='exam'?context.exam:null,id==='exam'?context.subject:null,topic||agent.tagline].filter(Boolean).join(' · ');
    $('#sidebarRules').replaceChildren(...agent.rules.map(rule=>{const li=document.createElement('li');li.textContent=rule;return li;}));
    document.querySelectorAll('[data-select-agent]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.selectAgent===id)));
    const prompts=lessonLoaded?['Explain that more simply.','Show me a worked example.','What mistake should I watch for?']:agent.prompts;
    $('#suggestions').replaceChildren(...prompts.map((prompt,index)=>{const button=document.createElement('button');button.type='button';button.textContent=lessonLoaded?prompt:['Try a topic','Work through an example','Explore a question'][index];button.title=prompt;button.addEventListener('click',()=>{input.value=prompt;input.focus();});return button;}));
    try{study.write('aiplay_study_context',context);}catch(error){$('#inputError').textContent=error.message;}
    renderRoadmap();
    if(changed&&announce){setMood('idle');const note=document.createElement('p');note.className='context-notice';note.textContent=`${agent.name} is here. Your conversation stays with you.`;conversation.append(note);scrollDown();}
  }
  async function requestReply(path,body){
    const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(path==='/api/image-topic'?190000:220000)});
    let payload;try{payload=await response.json();}catch{throw new Error('The tutor service did not return a readable response. Check the AI status and retry.');}
    if(!response.ok)throw new Error(payload.error||'The tutor service is unavailable. Please retry.');return payload;
  }
  async function ask(message,retry=false){
    if(busy)return;if(message.length<2||message.length>study.maxInput){$('#inputError').textContent='Ask a question between 2 and 20,000 characters.';return;}
    $('#inputError').textContent='';$('#attachmentNote').textContent='';setBusy(true);setMood('thinking');
    const agentId=context.agent,firstLesson=!lessonLoaded;if(!retry)appendMessage('user',message);
    const pending=appendMessage('assistant',lessonLoaded?'Let me connect that to what we’ve discussed…':'I’m working through your question and preparing your practice…',{pending:true,agent:agentId});
    try{
      let answer;
      if(!lessonLoaded){
        setTopic(message);
        const payload=await requestReply('/api/lesson',{topic:message,level:context.level,studyContext:context});
        const data=payload.lesson;
        if(!data||!data.title||!data.summary||!Array.isArray(data.steps)||data.steps.length<3||data.steps.some(step=>!step.objective||!step.explanation||!step.example||!step.check))throw new Error('The lesson was incomplete. Please retry so Mira can prepare the full learning path.');
        lesson=data;questions=[];progress={done:[],attempts:{},cleanStreak:0};answer=`${data.summary}\n\nI’ve prepared ${data.steps.length} steps. Work through each check to unlock practice.`;setTopic(data.title);lessonLoaded=true;sessionStorage.removeItem('aiplay_lesson_request');
      }else{
        const recent=history.filter(item=>item.agent===agentId).slice(-8).map(item=>({role:item.role,content:item.content.slice(0,8000)}));
        const payload=await requestReply('/api/chat',{topic,level:context.level,studyContext:context,history:recent,message});
        if(typeof payload.answer!=='string'||!headings.every(heading=>payload.answer.includes(`### ${heading}`)))throw new Error('The reply did not contain the full learning framework. Please retry.');
        answer=payload.answer;
      }
      pending.remove();const responseRow=appendMessage('assistant',answer,{framework:!firstLesson,agent:agentId});
      const sprite=responseRow.querySelector('.mira-sprite');sprite.dataset.static='false';sprite.dataset.state='speaking';
      history.push({role:'user',content:message,agent:agentId},{role:'assistant',content:answer,agent:agentId});
      save();renderLessonPath();renderRoadmap();showGames();setMood(firstLesson?'celebrating':'speaking');moodTimer=setTimeout(()=>{setMood('idle');sprite.dataset.static='true';sprite.dataset.state='idle';},5000);
    }catch(error){pending.remove();const messageText=error.name==='TimeoutError'?'This response is taking longer than expected. Please try again.':error.message==='Failed to fetch'?'The tutor could not connect. Check the AI status button and retry.':error.message;appendMessage('assistant',messageText,{error:true,retry:message,agent:agentId});setMood('idle');}
    finally{setBusy(false);selectAgent(context.agent);input.focus();scrollDown();}
  }
  function reset(){if(busy)return;['aiplay_lesson_request','aiplay_chat_history','aiplay_current_topic','aiplay_dynamic_questions','aiplay_assistant_launch','aiplay_assistant_active','aiplay_last_lesson','aiplay_lesson_progress','aiplay_exam_roadmap'].forEach(key=>sessionStorage.removeItem(key));location.assign('assistant.html');}
  $('#chatForm').addEventListener('submit',event=>{event.preventDefault();const message=input.value.trim();if(busy)return;if(message.length<2){$('#inputError').textContent='Type your topic or question to start.';input.focus();return;}input.value='';input.style.height='auto';ask(message);});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#chatForm').requestSubmit();}});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=`${Math.min(input.scrollHeight,130)}px`;$('#inputError').textContent='';});
  $('#attachButton').addEventListener('click',()=>$('#fileInput').click());
  $('#fileInput').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file||busy)return;
    setBusy(true);input.readOnly=true;$('#inputError').textContent='';
    $('#attachmentNote').textContent='Reading your paper… Please wait.';
    try{
      let notes;
      if(study.isImage(file)){
        const image=await study.imageData(file);
        const payload=await requestReply('/api/image-topic',{image});
        if(typeof payload.summary!=='string'||!payload.summary.trim())throw new Error('No readable questions found. Try a clearer image.');
        notes=`Question paper from ${image.name}:\n${payload.summary}`;
      }else notes=await study.notes(file);
      const combined=input.value.trim()?`${input.value.trim()}\n\n${notes}`:notes;
      if(combined.length>study.maxInput)throw new Error('Your question and paper exceed 20,000 characters. Attach a smaller section.');
      input.value=combined;input.dispatchEvent(new Event('input'));
      $('#attachmentNote').textContent=`${file.name} attached. Review the questions and numbers, then send.`;
    }catch(error){$('#inputError').textContent=study.uploadError(error);$('#attachmentNote').textContent='Upload unsuccessful. Your existing text is unchanged.';}
    finally{event.target.value='';input.readOnly=false;setBusy(false);input.focus();}
  });
  $('#newChat').addEventListener('click',reset);$('#mobileNewChat').addEventListener('click',reset);$('#clearTopic').addEventListener('click',reset);
  $('#startGames').addEventListener('click',()=>{if(busy||!complete())return;if(!validBank(questions)){prepareGames();return;}study.write('aiplay_dynamic_questions',questions);sessionStorage.setItem('aiplay_assistant_launch','dynamic');sessionStorage.setItem('aiplay_assistant_active','true');location.assign('game2.html');});
  renderAgentControls();selectAgent(context.agent);
  if(typeof request.topic==='string'&&request.topic.trim()){history=[];questions=[];lesson=null;progress={done:[]};lessonLoaded=false;ask(request.topic.trim());}
  else if(lessonLoaded){setTopic(topic);history.forEach((item,index)=>appendMessage(item.role,item.content,{framework:item.role==='assistant'&&index>1,agent:item.agent}));renderRoadmap();renderLessonPath();showGames();scrollDown();}
  else{history=[];questions=[];lesson=null;setTopic('');}
})();
