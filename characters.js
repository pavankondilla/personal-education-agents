(() => {
  const grid=document.querySelector('#characterCards');
  const states=[['idle','Idle'],['thinking','Thinking'],['speaking','Explaining'],['celebrating','Encouraging']];
  for(const agent of Object.values(window.MiraAgents)){
    const card=document.createElement('article');card.className='character-card';card.id=agent.id;card.dataset.agent=agent.id;
    const stage=document.createElement('div');stage.className='character-stage';
    const sprite=document.createElement('span');sprite.className='mira-sprite';sprite.dataset.agent=agent.id;sprite.dataset.state='idle';sprite.setAttribute('role','img');sprite.setAttribute('aria-label',`${agent.name}, idle animation`);stage.append(sprite);
    const content=document.createElement('div');content.className='character-content';
    const traits=document.createElement('p');traits.className='agent-traits';traits.textContent=agent.traits;
    const title=document.createElement('h2');title.textContent=agent.name;
    const description=document.createElement('p');description.textContent=agent.description;
    const controls=document.createElement('div');controls.className='animation-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label',`${agent.name} animation`);
    states.forEach(([state,label])=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed',String(state==='idle'));button.addEventListener('click',()=>{sprite.dataset.state=state;sprite.setAttribute('aria-label',`${agent.name}, ${label.toLowerCase()} animation`);controls.querySelectorAll('button').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));});controls.append(button);});
    const list=document.createElement('ul');agent.rules.forEach(rule=>{const item=document.createElement('li');item.textContent=rule;list.append(item);});
    const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Read the full teaching rules';const instructions=document.createElement('p');instructions.textContent=agent.instructions;details.append(summary,instructions);
    const sheetDetails=document.createElement('details');const sheetSummary=document.createElement('summary');sheetSummary.textContent='View the 16-frame sprite sheet';const sheet=document.createElement('img');sheet.src=`assets/mira/${agent.id}-sheet.png`;sheet.alt=`${agent.name}: four rows of four frames for idle, thinking, explaining and encouraging`;sheet.loading='lazy';const download=document.createElement('a');download.href=sheet.src;download.download=`mira-${agent.id}-sheet.png`;download.textContent='Download transparent PNG ↓';sheetDetails.append(sheetSummary,sheet,download);
    const choose=document.createElement('a');choose.className='primary';choose.href=`index.html?agent=${agent.id}`;choose.textContent=`Study with ${agent.shortName} Mira ↗`;
    content.append(traits,title,description,controls,list,details,sheetDetails,choose);card.append(stage,content);grid.append(card);
  }
  if(location.hash){const target=document.getElementById(location.hash.slice(1));if(target)target.scrollIntoView({block:'start'});}
})();
