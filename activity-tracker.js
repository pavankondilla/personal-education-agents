(() => {
  let saving=false;
  const queueKey='aiplay_pending_game_results';
  function pending(){try{return JSON.parse(sessionStorage.getItem(queueKey)||'[]');}catch{return [];}}
  async function flush(){
    if(saving||!window.aiplayAuth?.state.user)return;
    saving=true;
    try{
      for(const result of pending()){
        if(result.userId!==aiplayAuth.state.user.id)continue;
        try{const response=await fetch('/api/activity',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(result.body),keepalive:true});if(!response.ok)break;sessionStorage.setItem(queueKey,JSON.stringify(pending().filter(item=>item.body.id!==result.body.id)));}
        catch{break;}
      }
    }finally{saving=false;}
  }
  window.saveAiplayGame=async(game,correct,topic)=>{
    if(!window.aiplayAuth?.state.user)return;
    const id=crypto.randomUUID();
    const payload={type:'game',id,payload:{game,topic:topic||sessionStorage.getItem('aiplay_topic')||'Lesson recall',correct,questions:3}};
    sessionStorage.setItem(queueKey,JSON.stringify([...pending(),{userId:aiplayAuth.state.user.id,body:payload}]));
    await flush();
  };
  document.addEventListener('aiplay:auth',flush);
  if(window.aiplayAuth?.state.user)flush();
})();
