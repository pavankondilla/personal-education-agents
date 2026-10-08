const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright-core');
const base = 'http://127.0.0.1:4173';
const output = path.join(__dirname,'..','.artifacts');
fs.mkdirSync(output,{recursive:true});
const lesson = {title:'Salt and melting ice',summary:'Salt lowers the freezing point of water, so ice can melt at temperatures below zero degrees Celsius.',prerequisites:'Know that water can freeze into ice and melt back into liquid.',history:'Before modern road salt, people used sand to add grip on ice.',industry:'Road crews spread salt to reduce ice on roads.',insights:'Salt works less well in very cold conditions.',timeline:'First learn freezing, then dissolved particles, then road applications.',steps:[
  {id:'step-1',objective:'Explain freezing and melting',explanation:'Water freezes when it cools enough for molecules to form an ordered solid. Ice melts when heat makes the ordered structure loosen into liquid water. The freezing point is the temperature where both forms can coexist.',example:'An ice cube in a warm room absorbs heat and melts into liquid water.',misconception:'Melting is not the same as evaporating.',check:{question:'What does an ice cube become when it melts?',options:['Water','Steam','Salt','Sand'],answer:'Water',explanation:'Melting produces liquid water.'}},
  {id:'step-2',objective:'Explain freezing point depression',explanation:'Dissolved salt particles get between water molecules and make it harder for an ordered ice crystal to form. This lowers the freezing point, so a salty mixture can stay liquid below the temperature where pure water freezes.',example:'Salt on a thin icy film dissolves in the available liquid water and makes salty water that can stay liquid.',misconception:'Salt does not heat the ice by itself.',check:{question:'Which substance lowers the freezing point here?',options:['Salt','Sand','Air','Wood'],answer:'Salt',explanation:'Dissolved salt lowers the freezing point.'}},
  {id:'step-3',objective:'Apply the idea to roads',explanation:'On a winter road, salt can reduce icy patches when some liquid water is present. Road crews use salt to make travel safer, though very cold conditions reduce its effect and excess salt can harm plants.',example:'A road crew treats a lightly icy bridge with salt before traffic arrives.',misconception:'Salt is not effective at every temperature.',check:{question:'Where might a road crew spread salt?',options:['Bridge','Roof','Desk','Book'],answer:'Bridge',explanation:'An icy bridge is a road surface that crews may treat.'}}
]};
const words=['Water','Ice','Melt','Salt','Road','Bridge','Liquid','Crystal','Plants'];
const questions=words.map((answer,index)=>({id:`q-${index+1}`,question:`Which lesson term fits example ${index+1}?`,options:[answer,'Cloud','Stone','Paper'],answer,explanation:'This word appeared in the completed lesson.',objective:lesson.steps[index%3].objective,evidence:`The lesson explains ${answer}.`}));
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const errors=[],lessonCalls=[],questionCalls=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  await context.route('**/api/status*',route=>route.fulfill({json:{ok:true,message:'Test AI ready'}}));
  await context.route('**/api/lesson',route=>{lessonCalls.push(route.request().postDataJSON());return route.fulfill({json:{lesson}});});
  await context.route('**/api/questions',route=>{questionCalls.push(route.request().postDataJSON());return route.fulfill({json:{questions}});});
  await context.route('**/api/image-topic',route=>route.fulfill({json:{summary:'A diagram about salt lowering the freezing point of water.'}}));
  try{
    const page=await context.newPage();await page.goto(base);
    assert.equal(await page.locator('#examOptions').isVisible(),false);
    await page.locator('[data-agent-choice=exam]').click();assert.equal(await page.locator('#examOptions').isVisible(),true);
    for(const option of ['B.Tech semester exam','Unit test','Government exam'])assert.equal(await page.locator(`#exam option[value="${option}"]`).count(),1);
    await page.locator('#exam').selectOption('B.Tech semester exam');assert.equal(await page.locator('#semesterLabel').isVisible(),true);
    await page.locator('#subject').fill('Physics');
    await page.locator('[data-agent-choice=scientist]').click();assert.equal(await page.locator('#examOptions').isVisible(),false);
    await page.locator('#topic').fill('Why does salt melt ice?');
    await page.locator('#notesFile').setInputFiles({name:'topic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRWsAAAAASUVORK5CYII=','base64')});
    await page.waitForFunction(()=>document.querySelector('#topic').value.includes('diagram about salt'));
    await page.locator('#startSession').click();await page.waitForTimeout(300);if(!page.url().endsWith('/assistant.html'))console.log(JSON.stringify({url:page.url(),formError:await page.locator('#topicError').innerText(),pageErrors:errors}));await page.waitForURL('**/assistant.html');
    await page.locator('.lesson-step').first().waitFor();
    assert.equal(lessonCalls.length,1);assert.equal(lessonCalls[0].studyContext.agent,'scientist');assert.equal(Object.hasOwn(lessonCalls[0].studyContext,'subject'),false);
    assert.equal(await page.locator('.lesson-step').count(),3);assert.equal(await page.locator('#gameReady').isVisible(),false);
    await page.locator('.lesson-step.active .step-options button').filter({hasText:'Steam'}).click();assert.match(await page.locator('.step-feedback').first().innerText(),/Try again/);
    for(const answer of ['Water','Salt','Bridge'])await page.locator('.lesson-step.active .step-options button').filter({hasText:answer}).click();
    await page.locator('#gameReady:not([hidden])').waitFor();assert.equal(questionCalls.length,1);assert.equal(questionCalls[0].lesson.steps.length,3);
    await page.screenshot({path:path.join(output,'plan-02-lesson.png'),fullPage:true});
    await page.reload();await page.locator('#gameReady:not([hidden])').waitFor();assert.equal(lessonCalls.length,1);
    await page.locator('#startGames').click();await page.waitForURL('**/game2.html');await page.locator('#summaryTitle').filter({hasText:'Salt and melting ice'}).waitFor();
    assert.equal(await page.locator('.topic-grid').isVisible(),false);assert.equal(await page.locator('#qaItems .qa-item').count(),3);
    assert.match(await page.locator('#summaryTitle').innerText(),/Salt and melting ice/);
    await page.screenshot({path:path.join(output,'plan-02-game.png'),fullPage:true});
    await page.locator('#startGameBtn').click();await page.locator('#bubbleStartBtn').click();
    await page.locator('.bubble[data-value="Water"]').evaluate(element=>element.click());await page.locator('.lesson-answer-shade').waitFor();
    assert.match(await page.locator('.lesson-answer-card').innerText(),/From your lesson/);
    await page.locator('.lesson-answer-card button').click();await page.locator('.lesson-answer-shade').waitFor({state:'detached'});
    await page.evaluate(()=>{sessionStorage.setItem('aiplay_topic','dynamic');sessionStorage.setItem('aiplay_nextIndex','3');sessionStorage.setItem('aiplay_game1Score','1');});
    await page.goto(`${base}/game1.html`);await page.waitForTimeout(400);assert.equal(errors.length,0);
    await page.evaluate(()=>{sessionStorage.setItem('aiplay_nextIndex','6');sessionStorage.setItem('aiplay_game2Score','1');});
    await page.goto(`${base}/game3.html`);await page.locator('#questionDisplay').filter({hasText:'Question 1 of 3'}).waitFor();
    const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});await mobile.goto(base);
    await mobile.locator('[data-agent-choice=exam]').click();await mobile.locator('#exam').selectOption('B.Tech semester exam');
    await mobile.locator('#subject').fill('Physics');await mobile.locator('#semester').fill('Semester 3');await mobile.locator('#branch').fill('Mechanical Engineering');
    await mobile.locator('#topic').fill('Explain Newton’s second law.');await mobile.locator('#startSession').click();await mobile.waitForURL('**/assistant.html');await mobile.locator('.lesson-step').first().waitFor();
    assert.equal(lessonCalls.at(-1).studyContext.exam,'B.Tech semester exam');assert.equal(lessonCalls.at(-1).studyContext.semester,'Semester 3');assert.equal(lessonCalls.at(-1).studyContext.branch,'Mechanical Engineering');
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await mobile.screenshot({path:path.join(output,'plan-02-exam-mobile.png'),fullPage:true});
    const gated=await context.newPage();await gated.goto(`${base}/game2.html`);await gated.locator('#summaryTitle').filter({hasText:'Your lesson comes first'}).waitFor();assert.equal(await gated.locator('.topic-grid').isVisible(),false);
    await gated.goto(`${base}/game1.html`);await gated.waitForURL('**/assistant.html');
    await gated.goto(`${base}/game3.html`);await gated.waitForURL('**/assistant.html');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,checks:['exam-only controls','three requested exam types','image attachment','agent context isolation','three lesson checks','game lock and unlock','refresh persistence','personalized game without subject picker','game answer explanation','Rocket and Fishing handoff','B.Tech exam payload and mobile layout','direct game routes require a lesson'],screenshots:output},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
