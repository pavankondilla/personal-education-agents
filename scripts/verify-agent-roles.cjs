const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const lesson={title:'Salt and melting ice',summary:'Salt lowers the freezing point of water.',prerequisites:'Know what freezing and melting mean.',history:'People used sand before road salt.',industry:'Road crews spread salt on icy roads.',insights:'Salt is less useful at very low temperatures.',timeline:'Learn the basics, apply the mechanism, then test the limits.',steps:[
  {id:'step-1',objective:'Understand melting',explanation:'When ice absorbs heat, its ordered water molecules loosen and can move as liquid water. Melting changes the state of water without changing its chemical identity.',example:'An ice cube in a warm room becomes liquid water as it absorbs heat.',misconception:'Melting does not turn water into steam.',check:{question:'What forms when ice melts?',options:['Water','Steam','Salt','Sand'],answer:'Water',explanation:'Melting ice becomes liquid water.'}},
  {id:'step-2',objective:'Explain salt action',explanation:'Salt dissolves in liquid water and lowers its freezing point. At suitable temperatures, this helps an icy surface become a salty liquid instead of remaining solid ice.',example:'A road crew spreads salt over a thin wet icy layer to reduce ice.',misconception:'Salt does not create heat by itself.',check:{question:'What lowers freezing point here?',options:['Salt','Air','Wood','Sand'],answer:'Salt',explanation:'Dissolved salt lowers the freezing point.'}},
  {id:'step-3',objective:'Apply the limit',explanation:'A salty solution can remain liquid below the ordinary freezing point, but the effect has limits at very low temperatures. Road crews need to consider temperature and environmental impact.',example:'Salt can help clear a lightly icy bridge when the air is only a little below freezing.',misconception:'Salt does not work equally well at every temperature.',check:{question:'What surface could a crew treat?',options:['Bridge','Book','Desk','Lamp'],answer:'Bridge',explanation:'An icy bridge is a road surface.'}}
]};
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const errors=[],lessonCalls=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  await context.route('**/api/status*',route=>route.fulfill({json:{ok:true,message:'Ready'}}));
  await context.route('**/api/lesson',route=>{lessonCalls.push(route.request().postDataJSON());return route.fulfill({json:{lesson}});});
  await context.route('**/api/questions',route=>route.fulfill({json:{questions:[]}}));
  try{
    const teacher=await context.newPage();await teacher.goto('http://127.0.0.1:4173/');
    for(const phrase of ['A place to start','Start from','Study time','Learn with Teacher Mira','Your question starts a real conversation'])assert.equal(await teacher.getByText(phrase,{exact:false}).count(),0);
    assert.match(await teacher.locator('[data-agent-choice=teacher]').innerText(),/Easy → medium → hard/);
    await teacher.locator('#topic').fill('Why does salt melt ice?');await teacher.locator('#startSession').click();await teacher.waitForURL('**/assistant.html');await teacher.locator('.lesson-step.active').waitFor();
    assert.deepEqual(await teacher.locator('.step-difficulty').allTextContents(),['EASY','MEDIUM','HARD']);
    await teacher.locator('.lesson-step.active .step-options button').filter({hasText:'Steam'}).click();assert.match(await teacher.locator('.step-feedback').first().innerText(),/Hint:/);
    await teacher.locator('.lesson-step.active .step-options button').filter({hasText:'Steam'}).click();assert.match(await teacher.locator('.step-feedback').first().innerText(),/slow down/);
    const exam=await context.newPage();await exam.goto('http://127.0.0.1:4173/');await exam.locator('[data-agent-choice=exam]').click();await exam.locator('#exam').selectOption('Unit test');await exam.locator('#topic').fill('Freezing and melting\nSalt and roads');
    const future=new Date(Date.now()+10*86400000).toISOString().slice(0,10);await exam.locator('#examDate').fill(future);await exam.locator('#startSession').click();await exam.waitForURL('**/assistant.html');await exam.locator('.lesson-step.active').waitFor();
    assert.equal(await exam.locator('.roadmap-topic').count(),2);assert.equal(lessonCalls.at(-1).topic,'Freezing and melting');assert.match(await exam.locator('#examRoadmap').innerText(),/Revision due/);
    for(const answer of ['Water','Salt','Bridge'])await exam.locator('.lesson-step.active .step-options button').filter({hasText:answer}).click();
    await exam.locator('.roadmap-topic').nth(1).locator('button').click();await exam.locator('.lesson-step.active').waitFor();assert.equal(lessonCalls.at(-1).topic,'Salt and roads');
    for(const answer of ['Water','Salt','Bridge'])await exam.locator('.lesson-step.active .step-options button').filter({hasText:answer}).click();
    await exam.locator('.roadmap-topic').first().locator('button').click();await exam.locator('.lesson-step.active').waitFor();
    for(const answer of ['Water','Salt','Bridge'])await exam.locator('.lesson-step.active .step-options button').filter({hasText:answer}).click();
    assert.match(await exam.locator('.roadmap-topic').first().innerText(),/Revised/);
    await exam.reload();await exam.locator('.roadmap-topic').first().waitFor();assert.match(await exam.locator('.roadmap-topic').first().innerText(),/Revised/);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,checks:['removed old home sections','teacher difficulty and adaptive support','exam topic plan and date','topic completion and revision','reload persistence','no browser errors']},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
