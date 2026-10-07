(() => {
  const buttons = [...document.querySelectorAll('[data-api-status]')];
  if (!buttons.length) return;
  let checking = false;
  async function check(force = false) {
    if (checking) return;
    checking = true;
    buttons.forEach(button => { button.dataset.state='checking'; button.querySelector('span').textContent='Checking AI…'; button.title='Checking the NVIDIA AI connection'; });
    try {
      const response = await fetch(`/api/status${force?'?refresh=1':''}`, {cache:'no-store'});
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'AI service is unavailable');
      buttons.forEach(button => { button.dataset.state='online'; button.querySelector('span').textContent='AI working'; button.title=`Connected to NVIDIA AI${result.checkedAt?` · checked ${new Date(result.checkedAt).toLocaleTimeString()}`:''}. Click to check again.`; button.setAttribute('aria-label','NVIDIA AI is working. Click to check again.'); });
    } catch (error) {
      const detail=String(error.message||'AI service is unavailable');
      buttons.forEach(button => { button.dataset.state='offline'; button.querySelector('span').textContent='AI not working'; button.title=`${detail}. Click to retry.`; button.setAttribute('aria-label',`NVIDIA AI is not working: ${detail}. Click to retry.`); });
    } finally { checking=false; }
  }
  buttons.forEach(button=>button.addEventListener('click',()=>check(true)));
  check(); window.setInterval(()=>check(false),120000);
})();
