(() => {
  const buttons = [...document.querySelectorAll('[data-api-status]')];
  if (!buttons.length) return;
  let checking = false;
  let pendingCheck = false;
  async function check(force = false) {
    if (checking) { pendingCheck=true; return; }
    checking = true;
    buttons.forEach(button => { button.dataset.state='checking'; button.querySelector('span').textContent='Checking AI…'; button.title='Checking enabled AI providers'; });
    try {
      const response = await fetch(`/api/status${force?'?refresh=1':''}`, {cache:'no-store',headers:window.AiplayAISettings?.headers()||{}});
      const result = await response.json();
      if(Array.isArray(result.providers))document.dispatchEvent(new CustomEvent('aiplay-ai-providers',{detail:result.providers}));
      if (!response.ok || !result.ok) throw new Error(result.message || 'AI service is unavailable');
      const label=result.providers?.find(item=>item.id===result.activeProvider)?.label||'AI';
      buttons.forEach(button => { button.dataset.state='online'; button.querySelector('span').textContent='AI working'; button.title=`${label} is responding. Click to check again.`; button.setAttribute('aria-label',`${label} is working. Click to check again.`); });
    } catch (error) {
      const detail=String(error.message||'AI service is unavailable');
      buttons.forEach(button => { button.dataset.state='offline'; button.querySelector('span').textContent='AI not working'; button.title=`${detail}. Click to retry.`; button.setAttribute('aria-label',`AI is not working: ${detail}. Click to retry.`); });
    } finally { checking=false;if(pendingCheck){pendingCheck=false;check(true);} }
  }
  buttons.forEach(button=>button.addEventListener('click',()=>check(true)));
  document.addEventListener('aiplay-ai-settings-changed',()=>check(true));
  check(); window.setInterval(()=>check(false),120000);
})();
