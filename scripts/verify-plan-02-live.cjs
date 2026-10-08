const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {validLesson,validBank} = require('../learning-pipeline.js');
const base = process.env.AIPLAY_URL || 'http://127.0.0.1:4173';
const savedLesson = path.join(__dirname,'..','.artifacts','plan-02-lesson.json');

async function post(route,body) {
  const response = await fetch(`${base}${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(240000)});
  const data = await response.json();
  if (!response.ok) throw new Error(`${route}: ${data.error || response.status}`);
  return data;
}

(async () => {
  const studyContext = {agent:'scientist',level:'Beginner',minutes:20,exam:'SHOULD_NOT_LEAK',subject:'SHOULD_NOT_LEAK'};
  let imageResponse={summary:''};
  const imagePath=path.join(__dirname,'..','error.png');
  if (!process.env.AIPLAY_SKIP_IMAGE && fs.existsSync(imagePath)) {
    const image = fs.readFileSync(imagePath);
    imageResponse = await post('/api/image-topic',{image:{name:'error.png',dataUrl:`data:image/png;base64,${image.toString('base64')}`}});
    assert.ok(imageResponse.summary.length>=12,'The vision endpoint must describe an uploaded image');
  }
  const topic = 'Why does salt help melt ice? Explain freezing point depression with a simple real-life example.';
  const lessonResponse = process.env.AIPLAY_REUSE_LESSON && fs.existsSync(savedLesson) ? {lesson:JSON.parse(fs.readFileSync(savedLesson,'utf8'))} : await post('/api/lesson',{topic,level:'Beginner',studyContext});
  const lesson = validLesson(lessonResponse.lesson);
  assert.ok(lesson,'The model must return a complete stepwise lesson');
  assert.ok(lesson.steps.length>=3 && lesson.steps.length<=5);
  fs.mkdirSync(path.dirname(savedLesson),{recursive:true});fs.writeFileSync(savedLesson,JSON.stringify(lesson));
  const bankResponse = await post('/api/questions',{lesson,studyContext});
  const bank = validBank(bankResponse.questions,lesson);
  assert.equal(bank?.length,9,'All nine game questions must quote the lesson and have distinct correct answers');
  console.log(JSON.stringify({ok:true,title:lesson.title,steps:lesson.steps.length,questions:bank.length,firstObjective:lesson.steps[0].objective,imageSummaryLength:imageResponse.summary.length},null,2));
})().catch(error => {console.error(error);process.exitCode=1;});
