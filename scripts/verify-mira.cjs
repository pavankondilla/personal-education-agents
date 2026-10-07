const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base='http://127.0.0.1:4173';
const output=path.join(__dirname,'..','.artifacts');
fs.mkdirSync(output,{recursive:true});
// Test-only network fixtures. These never ship as an application fallback.
const questions=Array.from({length:9},(_,i)=>({id:`q-${i+1}`,question:`Which idea describes a push or pull? (${i+1})`,options:['Force','Mass','Time','Energy'],answer:'Force',explanation:'A force is a push or pull.',concept:'Force'}));
const lesson={title:'Force and acceleration',concept:'A force is a push or pull that can change how an object moves.',realWorldUse:'For your question: F = m × a = 2 × 3 = 6 N. A shopping trolley speeds up when pushed.',apocalypseTest:'Without a force, we could not change an object’s motion.',good:'The relationship helps predict motion.',bad:'The simple model has limits.',analogy:'Imagine pushing an empty trolley and then a full one.',questions};
const answer=`### The Concept: Force\nA force is a push or pull.\n\n### Where It Lives (Real-World Use)\nFor the same acceleration, 4 × 3 = 12 N.\n\n### The "Apocalypse" Test (What Breaks?)\nMotion would not change without force.\n\n### The Trade-offs (Pros vs. Cons)\n* **The Good:** It predicts motion.\n* **The Bad:** Models have limits.\n\n### The Ultimate Analogy\nThink of pushing a shopping trolley.`;
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
  const ctx=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  const errors=[],lessons=[],chats=[];let online=true,failLesson=false;
  ctx.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  await ctx.route('**/api/status*',route=>route.fulfill({json:{ok:online,message:online?'AI test connection ready':'Test offline condition',checkedAt:new Date().toISOString()}}));
  await ctx.route('**/api/lesson',route=>{lessons.push(route.request().postDataJSON());return route.fulfill(failLesson?{status:502,json:{error:'Temporary test connection failure'}}:{json:{lesson,agent:lessons.at(-1).studyContext.agent}});});
  await ctx.route('**/api/chat',route=>{chats.push(route.request().postDataJSON());return route.fulfill({json:{answer,agent:chats.at(-1).studyContext.agent}});});
  try{
    const page=await ctx.newPage();await page.goto(base);await page.locator('[data-api-status][data-state=online]').waitFor();
    assert.ok((await page.locator('#heroMira').boundingBox()).width>200,'The selected tutor should have a large hero portrait');
    await page.screenshot({path:path.join(output,'mira-home-desktop.png'),fullPage:true});
    await page.locator('#startSession').click();assert.match(await page.locator('#topicError').innerText(),/Enter a topic/);
    await page.locator('[data-agent-choice=exam]').click();assert.equal(await page.locator('#heroMira').getAttribute('data-agent'),'exam');
    await page.locator('#exam').selectOption('JEE (IIT)');await page.locator('#subject').fill('Physics');await page.locator('#minutes').selectOption('10');await page.locator('#level').selectOption('Intermediate');
    await page.locator('#notesFile').setInputFiles({name:'unsupported.pdf',mimeType:'application/pdf',buffer:Buffer.from('test')});assert.match(await page.locator('#topicError').innerText(),/Choose a text/);
    await page.locator('#notesFile').setInputFiles({name:'physics.txt',mimeType:'text/plain',buffer:Buffer.from('A 2 kg object accelerates at 3 m/s². Find the net force.')});await page.waitForFunction(()=>document.querySelector('#topic').value.includes('2 kg'));
    await page.locator('#startSession').click();await page.waitForURL('**/assistant.html');await page.locator('#gameReady:not([hidden])').waitFor();
    assert.equal(lessons.length,1);assert.equal(lessons[0].studyContext.agent,'exam');assert.equal(lessons[0].studyContext.exam,'JEE (IIT)');assert.equal(lessons[0].studyContext.subject,'Physics');assert.equal(lessons[0].studyContext.minutes,10);assert.match(lessons[0].topic,/m\/s²/);
    assert.equal(await page.locator('.message-copy h3').count(),5);assert.match(await page.locator('.message-copy').innerText(),/6 N/);
    await page.locator('.sidebar [data-select-agent=scientist]').click();assert.equal(await page.locator('#currentAgentName').innerText(),'Scientist Mira');
    await page.locator('#chatInput').fill('What if the mass becomes 4 kg at the same acceleration?');await page.locator('#sendButton').click();await page.waitForFunction(()=>document.querySelectorAll('.message-copy h3').length===10);
    assert.equal(chats[0].studyContext.agent,'scientist');assert.equal(chats[0].history.length,2);assert.match(chats[0].history[1].content,/6 N/);
    await page.reload();await page.locator('#gameReady:not([hidden])').waitFor();assert.equal(await page.locator('.message-copy h3').count(),10);assert.equal(await page.locator('#currentAgentName').innerText(),'Scientist Mira');assert.equal(lessons.length,1);
    await page.screenshot({path:path.join(output,'mira-chat-desktop.png'),fullPage:true});
    online=false;await page.locator('[data-api-status]').click();await page.locator('[data-api-status][data-state=offline]').waitFor();online=true;await page.locator('[data-api-status]').click();await page.locator('[data-api-status][data-state=online]').waitFor();
    await page.locator('#startGames').click();await page.waitForURL('**/game2.html');assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('aiplay_dynamic_questions')).length),9);
    const gallery=await ctx.newPage();await gallery.goto(`${base}/characters.html`);assert.equal(await gallery.locator('.character-card').count(),3);await gallery.locator('#scientist .animation-controls button').filter({hasText:'Thinking'}).click();assert.equal(await gallery.locator('#scientist .character-stage .mira-sprite').getAttribute('data-state'),'thinking');
    await gallery.emulateMedia({reducedMotion:'no-preference'});const firstFrame=await gallery.locator('#scientist .character-stage .mira-sprite').evaluate(el=>getComputedStyle(el).backgroundPosition);await gallery.waitForTimeout(800);const nextFrame=await gallery.locator('#scientist .character-stage .mira-sprite').evaluate(el=>getComputedStyle(el).backgroundPosition);assert.notEqual(firstFrame,nextFrame,'Sprite frames should animate');await gallery.emulateMedia({reducedMotion:'reduce'});
    await gallery.screenshot({path:path.join(output,'mira-characters.png'),fullPage:true});
    const mobile=await ctx.newPage();await mobile.setViewportSize({width:390,height:844});await mobile.goto(base);await mobile.screenshot({path:path.join(output,'mira-home-mobile.png'),fullPage:true});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await mobile.locator('[data-agent-choice=scientist]').click();await mobile.locator('#topic').fill('Why does salt melt ice?');await mobile.locator('#startSession').click();await mobile.waitForURL('**/assistant.html');await mobile.locator('#gameReady:not([hidden])').waitFor();assert.equal(await mobile.locator('.mobile-tutor-bar').isVisible(),true);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await mobile.locator('#mobileAgents [data-select-agent=teacher]').click();assert.equal(await mobile.locator('#currentAgentName').innerText(),'Teacher Mira');await mobile.screenshot({path:path.join(output,'mira-chat-mobile.png'),fullPage:true});await mobile.setViewportSize({width:320,height:740});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.goto(base);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const failure=await ctx.newPage();await failure.goto(`${base}/assistant.html`);assert.equal(await failure.locator('#gameReady').isVisible(),false);failLesson=true;await failure.locator('#chatInput').fill('Explain acceleration');await failure.locator('#sendButton').click();await failure.locator('.error-message').waitFor();assert.equal(await failure.locator('#gameReady').isVisible(),false);assert.equal(await failure.locator('.message-copy h3').count(),0);failLesson=false;await failure.locator('.message-actions button').click();await failure.locator('#gameReady:not([hidden])').waitFor();assert.equal(await failure.locator('.user-message').count(),1);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:['desktop and mobile layout','three tutor choices','exam context payload','text attachment and type errors','five-section lesson and follow-up','agent switching with history','session restoration','red/green status','game handoff','sprite preview controls','failure and retry without dummy data'],screenshots:output},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
