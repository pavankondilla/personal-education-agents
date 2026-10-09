(() => {
  const ids=['nvidia','openrouter','groq'];
  const key='aiplay_ai_provider_order_v2';
  let order=['nvidia','openrouter','groq'];
  try { const current=localStorage.getItem(key),saved=JSON.parse(current??localStorage.getItem('aiplay_ai_provider_order'));if(Array.isArray(saved)){order=[...new Set(saved.map(id=>id==='grok'?'groq':id).filter(id=>ids.includes(id)))];if(current===null&&!saved.includes('grok')&&!saved.includes('groq'))order.push('groq');} } catch { /* Browser storage may be unavailable. */ }
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(order));}catch{/* Keep in-memory choice. */}};
  window.AiplayAISettings={headers:()=>({'X-AI-Providers':order.join(',')})};
  const descriptions={nvidia:'NVIDIA Build',openrouter:'OpenRouter · Nemotron free model',groq:'Groq · GPT-OSS 120B text model'};
  const buttons=[...document.querySelectorAll('[data-api-status]')];
  if(!buttons.length)return;
  let providers=[];
  const panels=[];
  function render(){
    for(const panel of panels){
      panel.replaceChildren();
      const heading=document.createElement('strong');heading.textContent='AI provider order';panel.append(heading);
      const hint=document.createElement('p');hint.textContent='Choose who is on. Use first changes priority. Another enabled provider takes over if one fails.';panel.append(hint);
      const sorted=[...ids].sort((a,b)=>{const ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi);});
      for(const id of sorted){
        const info=providers.find(item=>item.id===id);
        const row=document.createElement('div');row.className='ai-provider-row';
        const words=document.createElement('div');const name=document.createElement('b');name.textContent=info?.label||id;
        const note=document.createElement('small');note.textContent=!info?.configured?'Key not set on server':info.coolingDown?'Cooling down after an API error':descriptions[id];words.append(name,note);
        const toggle=document.createElement('button');toggle.type='button';toggle.className='ai-provider-toggle';toggle.disabled=!info?.configured;toggle.setAttribute('aria-pressed',String(order.includes(id)));toggle.textContent=order.includes(id)?'On':'Off';
        toggle.addEventListener('click',()=>{order=order.includes(id)?order.filter(item=>item!==id):[...order,id];save();render();document.dispatchEvent(new Event('aiplay-ai-settings-changed'));});
        row.append(words,toggle);
        if(order.includes(id)&&order[0]!==id){const first=document.createElement('button');first.type='button';first.className='ai-provider-first';first.textContent='Use first';first.setAttribute('aria-label',`Use ${info?.label||id} first`);first.addEventListener('click',()=>{order=[id,...order.filter(item=>item!==id)];save();render();document.dispatchEvent(new Event('aiplay-ai-settings-changed'));});row.append(first);}
        panel.append(row);
      }
      const demo=document.createElement('button');demo.type='button';demo.className='ai-demo-button';demo.textContent='Explore demo topics';demo.addEventListener('click',()=>window.AiplayDemo?.prompt());panel.append(demo);
      const foot=document.createElement('p');foot.className='ai-settings-foot';foot.textContent='Keys stay on the server. Choices are saved in this browser. Groq free-plan limits and account billing still apply.';panel.append(foot);
    }
  }
  for(const button of buttons){
    const group=document.createElement('div');group.className='ai-controls';button.replaceWith(group);group.append(button);
    const settings=document.createElement('button');settings.type='button';settings.className='ai-settings-button';settings.textContent='AI settings';settings.setAttribute('aria-expanded','false');
    const panel=document.createElement('div');panel.className='ai-settings-panel';panel.hidden=true;panel.setAttribute('role','group');panel.setAttribute('aria-label','AI provider settings');panels.push(panel);
    settings.addEventListener('click',()=>{panel.hidden=!panel.hidden;settings.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)render();});
    group.append(settings,panel);
  }
  document.addEventListener('click',event=>{if(event.target.closest('.ai-controls'))return;for(const panel of panels){panel.hidden=true;panel.previousSibling.setAttribute('aria-expanded','false');}});
  document.addEventListener('aiplay-ai-providers',event=>{providers=event.detail;render();});
  fetch('/api/ai/providers',{cache:'no-store'}).then(response=>response.json()).then(result=>{providers=Array.isArray(result.providers)?result.providers:[];render();}).catch(()=>{render();});
})();
