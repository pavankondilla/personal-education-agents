(() => {
  const state={user:null,error:null};
  const demo=location.pathname.endsWith('/dashboard.html')&&new URLSearchParams(location.search).get('demo')==='1';
  const demoData={lessons:3,chats:5,games:4,correct:9,questions:12,accuracy:75,uniqueTopics:3,rematches:1,today:{lessons:1,chats:2,games:1,topics:['Newton’s laws']},topics:[{topic:'Newton’s laws',sessions:2,questions:3},{topic:'Derivatives',sessions:1,questions:1},{topic:'SQL joins',sessions:0,questions:1}],gameHistory:[{game:'Fishing',topic:'Newton’s laws',correct:2,questions:3,createdAt:new Date().toISOString()},{game:'Bubble',topic:'Newton’s laws',correct:3,questions:3,createdAt:new Date().toISOString()}],recent:[{type:'game',topic:'Newton’s laws',createdAt:new Date().toISOString()},{type:'chat',topic:'Derivatives',createdAt:new Date().toISOString()}]};
  async function request(url,options={}){
    if(demo&&url.startsWith('/api/dashboard'))return demoData;
    const response=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Something went wrong. Please try again.');
    return data;
  }
  async function refresh(){
    if(demo){state.user={id:'demo',name:'Demo student',email:''};state.error=null;document.dispatchEvent(new CustomEvent('aiplay:auth',{detail:state.user}));return state.user;}
    try{state.user=(await request('/api/auth/me')).user;state.error=null;}
    catch(error){state.error=error;if(location.pathname.endsWith('/dashboard.html')){const summary=document.querySelector('#summary');if(summary)summary.textContent='Could not reach your account. Refresh this page to retry.';return null;}}
    document.dispatchEvent(new CustomEvent('aiplay:auth',{detail:state.user}));
    return state.user;
  }
  async function signOut(){
    await request('/api/auth/logout',{method:'POST',body:'{}'});
    state.user=null;
    for(const key of Object.keys(sessionStorage))if(key.startsWith('aiplay_'))sessionStorage.removeItem(key);
    location.href='index.html';
  }
  function renderNav(){
    document.querySelectorAll('[data-auth-nav]').forEach(slot=>{
      slot.replaceChildren();
      const link=document.createElement('a');
      link.className='account-link';
      link.href=demo?'auth.html':state.user?'dashboard.html':'auth.html';
      link.textContent=demo?'Create account':state.user?state.user.name.split(' ')[0]+"'s dashboard":'Sign in';
      slot.append(link);
      if(!state.user&&!demo){const join=document.createElement('a');join.className='account-link join-link';join.href='auth.html?mode=register';join.textContent='Create account';slot.append(join);}
      if(state.user&&!demo){
        const button=document.createElement('button');
        button.className='signout-link';button.type='button';button.textContent='Sign out';
        button.addEventListener('click',signOut);slot.append(button);
      }
    });
  }
  window.aiplayAuth={state,request,refresh,signOut};
  if(location.pathname.endsWith('/dashboard.html'))document.addEventListener('DOMContentLoaded',()=>{
    const script=document.createElement('script');script.src='dashboard-extra.js';document.body.append(script);
  });
  if(location.pathname.endsWith('/auth.html')){
    document.addEventListener('DOMContentLoaded',()=>{
      const card=document.querySelector('.auth-card');if(!card)return;
      const label=document.createElement('p');label.className='password-help';label.textContent='Use your email and create an Aiplay password. Do not enter your email account password.';
      document.querySelector('#password')?.closest('label')?.after(label);
      const demo=document.createElement('div');demo.className='demo-entry';
      const heading=document.createElement('span');heading.textContent='OR TAKE A LOOK FIRST';
      const copy=document.createElement('p');copy.textContent='Preview a sample student dashboard without creating an account.';
      const link=document.createElement('a');link.href='dashboard.html?demo=1';link.className='demo-link';link.textContent='Try the demo dashboard →';
      demo.append(heading,copy,link);card.append(demo);
      const password=document.querySelector('#password');const toggle=document.createElement('button');toggle.type='button';toggle.className='auth-switch show-password';toggle.textContent='Show password';toggle.onclick=()=>{password.type=password.type==='password'?'text':'password';toggle.textContent=password.type==='password'?'Show password':'Hide password';};password.closest('label').after(toggle);
      if(new URLSearchParams(location.search).get('mode')==='register')document.querySelector('#switch')?.click();
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{renderNav();refresh().then(renderNav);});
})();
