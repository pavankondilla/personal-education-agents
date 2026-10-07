(() => {
  const $=selector=>document.querySelector(selector), agents=window.MiraAgents, study=window.MiraStudy;
  const input=$('#chatInput'), conversation=$('#conversation'), scroll=$('#chatScroll');
  const request=study.read('aiplay_lesson_request',{});
  let context=study.context(request.studyContext||study.read('aiplay_study_context',{}));
  if(request.level)context.level=['Beginner','Intermediate','Advanced'].includes(request.level)?request.level:context.level;
  let topic='',history=[],questions=[],lesson=null,busy=false,moodTimer;
  const loadedHistory=study.read('aiplay_chat_history',[]);
  if(Array.isArray(loadedHistory))history=loadedHistory.filter(item=>item&&['user','assistant'].includes(item.role)&&typeof item.content==='string').slice(-16);
  const loadedQuestions=study.read('aiplay_dynamic_questions',[]);
  if(validBank(loadedQuestions))questions=loadedQuestions;
  lesson=study.read('aiplay_last_lesson',null);
  try{topic=sessionStorage.getItem('aiplay_current_topic')||'';}catch{}
  let lessonLoaded=Boolean(topic&&history.length&&questions.length===9);
  const headings=['The Concept:','Where It Lives (Real-World Use)','The "Apocalypse" Test (What Breaks?)','The Trade-offs (Pros vs. Cons)','The Ultimate Analogy'];

  function validBank(bank){return Array.isArray(bank)&&bank.length===9&&bank.every(q=>q&&typeof q.question==='string'&&Array.isArray(q.options)&&q.options.length===4&&new Set(q.options.map(x=>String(x).toLowerCase())).size===4&&q.options.every(x=>typeof x==='string'&&/^[A-Za-z]{1,16}$/.test(x))&&q.options.includes(q.answer));}
  function setTopic(value){topic=String(value||'');$('#topicName').textContent=topic.length>100?`${topic.slice(0,100)}…`:topic;$('#topicBanner').hidden=!topic;}
  function scrollDown(){scroll.scrollTop=scroll.scrollHeight;}
  function setMood(state){clearTimeout(moodTimer);document.body.dataset.mood=state;$('#welcomeMira').dataset.state=state;}
  function setBusy(value){busy=value;['#sendButton','#attachButton','#clearTopic','#startGames','#newChat','#mobileNewChat'].forEach(selector=>{$(selector).disabled=value;});document.querySelectorAll('[data-select-agent],.suggestions button').forEach(button=>button.disabled=value);$('#chatForm').setAttribute('aria-busy',String(value));}
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
  function frameworkText(data){return `### The Concept: ${data.title}\n${data.concept}\n\n### Where It Lives (Real-World Use)\n${data.realWorldUse}\n\n### The "Apocalypse" Test (What Breaks?)\n${data.apocalypseTest}\n\n### The Trade-offs (Pros vs. Cons)\n* **The Good:** ${data.good}\n* **The Bad:** ${data.bad}\n\n### The Ultimate Analogy\n${data.analogy}`;}
  function save(){study.write('aiplay_chat_history',history.slice(-16));study.write('aiplay_study_context',context);sessionStorage.setItem('aiplay_current_topic',topic);if(lesson)study.write('aiplay_last_lesson',lesson);}
  function showGames(){const ready=validBank(questions);$('#gameReady').hidden=!ready;if(ready){study.write('aiplay_dynamic_questions',questions);$('#gameTopicLabel').textContent=`Practise: ${lesson?.title||topic}`;}}
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
    const changed=context.agent!==id;context.agent=id;const agent=agents[id];document.body.dataset.agent=id;
    $('#currentAgentName').textContent=agent.name;$('#sideName').textContent=agent.name;$('#sideMira').dataset.agent=id;$('#welcomeMira').dataset.agent=id;$('#welcomeMira').setAttribute('aria-label',agent.name);$('#welcomeTitle').textContent=`Hi, I’m ${agent.name}.`;$('#welcomeText').textContent=agent.welcome;input.placeholder=agent.placeholder;$('#rulesLink').href=`characters.html#${id}`;
    $('#studyContextLabel').textContent=[context.exam,context.subject,`${context.minutes}-minute session`,context.level].filter(Boolean).join(' · ');
    $('#sidebarRules').replaceChildren(...agent.rules.map(rule=>{const li=document.createElement('li');li.textContent=rule;return li;}));
    document.querySelectorAll('[data-select-agent]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.selectAgent===id)));
    const prompts=lessonLoaded?['Explain that more simply.','Show me a worked example.','What mistake should I watch for?']:agent.prompts;
    $('#suggestions').replaceChildren(...prompts.map((prompt,index)=>{const button=document.createElement('button');button.type='button';button.textContent=lessonLoaded?prompt:['Try a topic','Work through an example','Explore a question'][index];button.title=prompt;button.addEventListener('click',()=>{input.value=prompt;input.focus();});return button;}));
    try{study.write('aiplay_study_context',context);}catch(error){$('#inputError').textContent=error.message;}
    if(changed&&announce){setMood('idle');const note=document.createElement('p');note.className='context-notice';note.textContent=`${agent.name} is here. Your conversation stays with you.`;conversation.append(note);scrollDown();}
  }
  async function requestReply(path,body){
    const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(165000)});
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
        if(!data||!['title','concept','realWorldUse','apocalypseTest','good','bad','analogy'].every(key=>typeof data[key]==='string'&&data[key].trim())||!validBank(data.questions))throw new Error('The lesson was incomplete. Please retry so Mira can prepare a complete explanation.');
        lesson=data;questions=data.questions;answer=frameworkText(data);setTopic(data.title);lessonLoaded=true;sessionStorage.removeItem('aiplay_lesson_request');
      }else{
        const recent=history.slice(-8).map(item=>({role:item.role,content:item.content.slice(0,8000)}));
        const payload=await requestReply('/api/chat',{topic,level:context.level,studyContext:context,history:recent,message});
        if(typeof payload.answer!=='string'||!headings.every(heading=>payload.answer.includes(`### ${heading}`)))throw new Error('The reply did not contain the full learning framework. Please retry.');
        answer=payload.answer;
      }
      pending.remove();const responseRow=appendMessage('assistant',answer,{framework:true,agent:agentId});
      const sprite=responseRow.querySelector('.mira-sprite');sprite.dataset.static='false';sprite.dataset.state='speaking';
      history.push({role:'user',content:message},{role:'assistant',content:answer,agent:agentId});
      save();showGames();setMood(firstLesson?'celebrating':'speaking');moodTimer=setTimeout(()=>{setMood('idle');sprite.dataset.static='true';sprite.dataset.state='idle';},5000);
    }catch(error){pending.remove();const messageText=error.name==='TimeoutError'?'This response is taking longer than expected. Please try again.':error.message==='Failed to fetch'?'The tutor could not connect. Check the AI status button and retry.':error.message;appendMessage('assistant',messageText,{error:true,retry:message,agent:agentId});setMood('idle');}
    finally{setBusy(false);selectAgent(context.agent);input.focus();scrollDown();}
  }
  function reset(){if(busy)return;['aiplay_lesson_request','aiplay_chat_history','aiplay_current_topic','aiplay_dynamic_questions','aiplay_assistant_launch','aiplay_assistant_active','aiplay_last_lesson'].forEach(key=>sessionStorage.removeItem(key));location.assign('assistant.html');}
  $('#chatForm').addEventListener('submit',event=>{event.preventDefault();const message=input.value.trim();if(busy)return;if(message.length<2){$('#inputError').textContent='Type your topic or question to start.';input.focus();return;}input.value='';input.style.height='auto';ask(message);});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#chatForm').requestSubmit();}});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=`${Math.min(input.scrollHeight,130)}px`;$('#inputError').textContent='';});
  $('#attachButton').addEventListener('click',()=>$('#fileInput').click());
  $('#fileInput').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;$('#attachButton').disabled=true;try{const notes=await study.notes(file);const combined=input.value.trim()?`${input.value.trim()}\n\n${notes}`:notes;if(combined.length>study.maxInput)throw new Error('Your question and notes exceed 20,000 characters. Use a smaller passage.');input.value=combined;input.dispatchEvent(new Event('input'));$('#attachmentNote').textContent=`${file.name} attached. Send when you’re ready.`;input.focus();}catch(error){$('#inputError').textContent=error.message;}finally{event.target.value='';$('#attachButton').disabled=busy;}});
  $('#newChat').addEventListener('click',reset);$('#mobileNewChat').addEventListener('click',reset);$('#clearTopic').addEventListener('click',reset);
  $('#startGames').addEventListener('click',()=>{if(busy||!validBank(questions))return;study.write('aiplay_dynamic_questions',questions);sessionStorage.setItem('aiplay_assistant_launch','dynamic');sessionStorage.setItem('aiplay_assistant_active','true');location.assign('game2.html');});
  renderAgentControls();selectAgent(context.agent);
  if(typeof request.topic==='string'&&request.topic.trim()){history=[];questions=[];lesson=null;lessonLoaded=false;ask(request.topic.trim());}
  else if(lessonLoaded){setTopic(topic);history.forEach(item=>appendMessage(item.role,item.content,{framework:item.role==='assistant',agent:item.agent}));showGames();scrollDown();}
  else{history=[];questions=[];lesson=null;setTopic('');}
})();
