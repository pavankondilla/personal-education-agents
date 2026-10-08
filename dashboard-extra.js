(() => {
  const demo=new URLSearchParams(location.search).get('demo')==='1';
  const main=document.querySelector('.dashboard');if(!main)return;
  if(demo){const badge=document.createElement('p');badge.className='demo-badge';badge.textContent='DEMO PREVIEW · SAMPLE DATA';main.querySelector('.dashboard-header')?.after(badge);}
  const section=document.createElement('section');section.className='dashboard-more';section.innerHTML='<article class="panel"><small>TODAY</small><h2>What you learned today</h2><div id="todayLearning"></div></article><article class="panel"><small>YOUR PRACTICE</small><h2>Game results and rematches</h2><div id="gameHistory"></div></article><article class="panel"><small>YOUR QUESTIONS</small><h2>Recent chats</h2><div id="chatHistory"></div></article>';
  main.append(section);
  const more=document.createElement('div');more.className='dash-grid dash-extra-metrics';more.innerHTML='<article class="metric"><span>Unique topics</span><strong id="uniqueTopics">0</strong></article><article class="metric"><span>Rematches</span><strong id="rematches">0</strong></article><article class="metric"><span>Questions answered</span><strong id="answered">0</strong></article><article class="metric"><span>Correct answers</span><strong id="correctAnswers">0</strong></article>';
  main.querySelector('.dash-grid')?.after(more);
  const text=(parent,tag,value,className)=>{const element=document.createElement(tag);element.textContent=value;if(className)element.className=className;parent.append(element);return element;};
  async function render(){
    try{
      const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Kolkata';
      const d=await aiplayAuth.request(`/api/dashboard?timezone=${encodeURIComponent(zone)}`);
      for(const [id,value] of [['uniqueTopics',d.uniqueTopics],['rematches',d.rematches],['answered',d.questions],['correctAnswers',d.correct]])document.getElementById(id).textContent=value;
      const today=document.getElementById('todayLearning'),games=document.getElementById('gameHistory'),chats=document.getElementById('chatHistory');today.replaceChildren();games.replaceChildren();chats.replaceChildren();
      text(today,'p',`${d.today.lessons} lessons explored · ${d.today.chats} questions asked · ${d.today.games} game rounds`);
      if(d.today.topics.length)for(const topic of d.today.topics)text(today,'div',topic,'topic-row');else text(today,'p','No activity yet today. Pick a topic to begin.','empty');
      if(d.gameHistory.length)for(const game of d.gameHistory){const row=text(games,'div',`${game.game} · ${game.topic} · ${game.correct}/${game.questions} correct`,'activity-row');text(row,'small',new Date(game.createdAt).toLocaleString());}else text(games,'p','Complete a game to see your results.','empty');
      const recentChats=d.recent.filter(a=>a.type==='chat');if(recentChats.length)for(const chat of recentChats){const row=document.createElement('div');row.className='activity-row';text(row,'b',chat.topic);text(row,'p',chat.question||'Question saved');if(chat.answer){const details=document.createElement('details');text(details,'summary','Read Mira’s answer');text(details,'p',chat.answer);row.append(details);}chats.append(row);}else text(chats,'p','Your questions will appear here.','empty');
    }catch(error){text(document.getElementById('todayLearning'),'p',`Could not load progress: ${error.message}`,'auth-error');}
  }
  document.addEventListener('aiplay:auth',event=>{if(event.detail)render();});
  if(aiplayAuth.state.user)render();
})();
