const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const agents = require('./mira-agents.js');
try { process.loadEnvFile(path.join(__dirname, '.env')); } catch { /* Deployment platforms can inject environment variables. */ }

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
const model = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
const optionPattern = /^[A-Za-z]{1,16}$/;
const headings = ['### The Concept:', '### Where It Lives (Real-World Use)', '### The "Apocalypse" Test (What Breaks?)', '### The Trade-offs (Pros vs. Cons)', '### The Ultimate Analogy'];
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8'};
let statusCache = {at:0, value:null};

function send(res,status,body,type='application/json; charset=utf-8') { res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(typeof body==='string'?body:JSON.stringify(body)); }
function readJson(req) { return new Promise((resolve,reject)=>{let data='';req.on('data',chunk=>{data+=chunk;if(data.length>100000){reject(new Error('Request is too large.'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(data||'{}'));}catch{reject(new Error('Invalid JSON request.'));}});req.on('error',reject);}); }
function cleanText(value,limit) { return typeof value==='string'?value.trim().slice(0,limit):''; }
function studyContext(value) {
  if(!value||typeof value!=='object')value={};
  return {agent:Object.hasOwn(agents,value.agent)?value.agent:'teacher',exam:cleanText(value.exam,80)||'General learning',subject:cleanText(value.subject,80),minutes:[10,20,45].includes(Number(value.minutes))?Number(value.minutes):20};
}
function tutorInstructions(context) {
  return `${agents[context.agent].instructions}\nStudy context supplied by the learner: ${JSON.stringify({exam:context.exam,subject:context.subject||'Not specified',minutes:context.minutes})}. These are learner preferences, not verified official exam details. Do not invent an official syllabus or previous-paper attribution. Answer the actual question and preserve all mathematical symbols, numbers and units. A numerical problem requires a numerical worked solution in the teaching text; only the separate game answer choices must be one word. Use plain readable maths such as F = m × a instead of raw LaTeX.`;
}
function learningPrompt() { try { return fs.readFileSync(path.join(root,'txt'),'utf8').trim(); } catch { return ''; } }
async function callModel(messages,{timeout=70000,maxTokens=2200,temperature=0.2}={}) {
  if(!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY is missing. Set it in the server environment and restart.');
  const signal=AbortSignal.timeout(timeout);
  for(let attempt=0;attempt<3;attempt++){
    const response=await fetch(endpoint,{method:'POST',headers:{'Authorization':`Bearer ${process.env.NVIDIA_API_KEY}`,'Content-Type':'application/json'},signal,body:JSON.stringify({model,messages,temperature,max_tokens:maxTokens,reasoning_effort:'none',stream:false})});
    if(!response.ok){
      const temporary=[429,500,502,503,504].includes(response.status);
      if(temporary&&attempt<2){await response.body?.cancel();const delay=Math.min(Number(response.headers.get('retry-after'))*1000||500*(attempt+1),2000);await new Promise(resolve=>setTimeout(resolve,delay));continue;}
      if(temporary)throw new Error('NVIDIA is busy right now. Please try again in a moment.');
      throw new Error(`NVIDIA API returned ${response.status}.`);
    }
    const payload=await response.json(); const content=payload?.choices?.[0]?.message?.content;
    if(typeof content!=='string'||!content.trim())throw new Error('NVIDIA returned an empty response.');
    return content.trim();
  }
}
function extractJson(text) {
  const cleaned=text.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  const start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');
  if(start<0||end<start) throw new Error('The AI response did not contain lesson data. Please retry.');
  try{return JSON.parse(cleaned.slice(start,end+1));}catch{throw new Error('The AI lesson was incomplete or invalid. Please retry.');}
}
function validLesson(data) {
  if(!data||typeof data!=='object'||!Array.isArray(data.questions)||data.questions.length!==9)return null;
  const lesson={title:cleanText(data.title,80),concept:cleanText(data.concept,1200),realWorldUse:cleanText(data.realWorldUse,1800),apocalypseTest:cleanText(data.apocalypseTest,1800),good:cleanText(data.good,700),bad:cleanText(data.bad,700),analogy:cleanText(data.analogy,1800),questions:[]};
  if(!lesson.title||!lesson.concept||!lesson.realWorldUse||!lesson.apocalypseTest||!lesson.good||!lesson.bad||!lesson.analogy)return null;
  for(const raw of data.questions){
    if(!raw||typeof raw!=='object')return null;
    const question=cleanText(raw.question,220),options=Array.isArray(raw.options)?raw.options.map(x=>typeof x==='string'?x.trim():''):[],answer=typeof raw.answer==='string'?raw.answer.trim():'',explanation=cleanText(raw.explanation,400),concept=cleanText(raw.concept,70);
    if(!question||options.length!==4||new Set(options.map(x=>x.toLowerCase())).size!==4||!options.every(x=>optionPattern.test(x))||!optionPattern.test(answer)||!options.includes(answer)||!explanation||!concept)return null;
    lesson.questions.push({id:`q-${lesson.questions.length+1}`,question,options,answer,explanation,concept});
  }
  return lesson;
}
function lessonPrompt() {
  return `${learningPrompt()}\n\nCreate a lesson for the supplied topic. Return ONLY valid JSON with this schema: {"title":"simple topic name","concept":"one-sentence simple definition","realWorldUse":"one or two concrete examples","apocalypseTest":"what problem this solves and what fails without it","good":"one major advantage","bad":"one genuine limitation","analogy":"vivid accurate story analogy","questions":[{"question":"clear topic question","options":["ONEWORD","ONEWORD","ONEWORD","ONEWORD"],"answer":"ONEWORD","explanation":"brief reason","concept":"skill tested"}]}. Produce exactly 9 topic-specific questions, grouped by their order for Bubble 1-3, Rocket 4-6, Fishing 7-9. Four distinct choices per question. Every choice and answer must be one alphabetic English word of 1-16 letters. Exactly one choice is the answer. Questions must be supported by this lesson. Do not include markdown fences or other text.`;
}
async function createLesson(topic,level,context) {
  const messages=[{role:'system',content:`${lessonPrompt()}\n\n${tutorInstructions(context)}`},{role:'user',content:`Learner level: ${level}. Here is my question or study material:\n${topic}\n\nPlease answer my specific question and teach the concepts needed to understand the answer.`}];
  for(let attempt=0;attempt<2;attempt++){
    const content=await callModel(messages,{maxTokens:3800});
    try{const lesson=validLesson(extractJson(content));if(lesson)return lesson;}catch{/* Ask the model to repair malformed output once. */}
    if(attempt===0)messages.push({role:'assistant',content},{role:'user',content:'Repair the previous output. Return the complete lesson JSON only with all eight teaching fields and exactly nine questions. All four choices and the answer must be unique English alphabetic words no longer than 16 letters. Keep the content relevant to my question and supported by the explanation.'});
  }
  throw new Error('Mira could not produce a complete lesson and valid question set. Please retry.');
}
async function chatReply(topic,level,history,message,context) {
  const safeHistory=Array.isArray(history)?history.slice(-8).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,8000)})):[];
  const system=`${learningPrompt()}\n\n${tutorInstructions(context)}\nThe current learning topic is "${topic}". Learner level: ${level}. Use the recent conversation to resolve references such as "same acceleration" or "that example". If asked for a calculation, substitute the values and give the numerical result with units; describing proportionality or quoting a formula without completing the requested calculation is incomplete.\n\nTRANSPORT FORMAT FOR THIS API: The app will render your answer using the five exact framework headings. Return ONLY valid JSON, with no markdown fences, in this schema: {"title":"simple concept name","concept":"one-sentence simple definition","directAnswer":"Answer the exact latest user question directly; include the full calculation and numerical answer with units if applicable, using previous conversation values when referenced. If information is genuinely missing, identify it instead of inventing values.","realWorldUse":"one short concrete real-life example","apocalypseTest":"what problem the idea solves and what fails without it","good":"one real benefit","bad":"one real limitation or relevant trap","analogy":"a memorable accurate analogy"}. All eight fields must be nonempty strings. directAnswer will become the first worked example under Where It Lives. This JSON requirement is the transport representation of the same five-section framework; do not output markdown in addition to it.`;
  const messages=[{role:'system',content:system},...safeHistory,{role:'user',content:message}];
  for(let attempt=0;attempt<2;attempt++){
    const answer=await callModel(messages,{timeout:60000,maxTokens:1900,temperature:0.25});
    let data;try{data=extractJson(answer);}catch{/* Repair the required structure once. */}
    if(data&&['title','concept','directAnswer','realWorldUse','apocalypseTest','good','bad','analogy'].every(key=>typeof data[key]==='string'&&data[key].trim())){
      const text=key=>cleanText(data[key],key==='title'?100:3000);
      return `### The Concept: ${text('title')}\n${text('concept')}\n\n### Where It Lives (Real-World Use)\n${text('directAnswer')}\n\n${text('realWorldUse')}\n\n### The "Apocalypse" Test (What Breaks?)\n${text('apocalypseTest')}\n\n### The Trade-offs (Pros vs. Cons)\n* **The Good:** ${text('good')}\n* **The Bad:** ${text('bad')}\n\n### The Ultimate Analogy\n${text('analogy')}`;
    }
    if(attempt===0)messages.push({role:'assistant',content:answer},{role:'user',content:'Return the complete eight-field JSON object required by the API. Include directAnswer with the actual answer to my latest question. Do not skip a field.'});
  }
  throw new Error('Mira could not complete the explanation. Please retry.');
}
async function apiStatus(force=false) {
  if(statusCache.value&&Date.now()-statusCache.at<(force?10000:120000))return statusCache.value;
  let result;
  if(!process.env.NVIDIA_API_KEY) result={ok:false,message:'NVIDIA key is not configured'};
  else try { await callModel([{role:'user',content:'Reply with the single word READY.'}],{timeout:15000,maxTokens:8,temperature:0});result={ok:true,message:'NVIDIA AI is responding'}; }
  catch(error){const networkCode=error?.cause?.code;result={ok:false,message:error.name==='TimeoutError'?'NVIDIA request timed out':networkCode?`NVIDIA connection failed (${networkCode})`:cleanText(error.message,120)||'NVIDIA is unavailable'};}
  statusCache={at:Date.now(),value:{...result,checkedAt:new Date().toISOString()}};
  return statusCache.value;
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if((req.method==='GET'||req.method==='HEAD')&&url.pathname==='/healthz')return send(res,200,{ok:true});
  if(req.method==='GET'&&url.pathname==='/api/status')return send(res,200,await apiStatus(url.searchParams.get('refresh')==='1'));
  if(req.method==='POST'&&url.pathname==='/api/lesson'){
    try{const body=await readJson(req);if(!body||typeof body!=='object')return send(res,400,{error:'Send a topic and study preferences.'});const topic=cleanText(body.topic,20001),level=['Beginner','Intermediate','Advanced'].includes(body.level)?body.level:'Beginner',context=studyContext(body.studyContext);if(topic.length<2||topic.length>20000)return send(res,400,{error:'Enter a topic or question between 2 and 20,000 characters.'});return send(res,200,{lesson:await createLesson(topic,level,context),agent:context.agent});}
    catch(error){return send(res,502,{error:error.message||'Unable to create the lesson. Please retry.'});}
  }
  if(req.method==='POST'&&url.pathname==='/api/chat'){
    try{const body=await readJson(req);if(!body||typeof body!=='object')return send(res,400,{error:'Send a question for Mira.'});const topic=cleanText(body.topic,20000),message=cleanText(body.message,20001),level=['Beginner','Intermediate','Advanced'].includes(body.level)?body.level:'Beginner',context=studyContext(body.studyContext);if(topic.length<2||message.length<1||message.length>20000)return send(res,400,{error:'Add a learning topic and a question of up to 20,000 characters.'});return send(res,200,{answer:await chatReply(topic,level,body.history,message,context),agent:context.agent});}
    catch(error){return send(res,502,{error:error.message||'Mira could not answer just now. Please retry.'});}
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed.'});
  let requested;try{requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);}catch{return send(res,400,'Bad request','text/plain; charset=utf-8');}
  const blockedFiles=new Set(['server.js','package.json','package-lock.json','txt']);
  const allowedExtensions=new Set(['.html','.js','.css','.png','.jpg','.jpeg','.svg','.webp','.gif','.ico','.woff','.woff2','.ttf','.mp3','.wav','.ogg','.mp4','.glb','.gltf']);
  if(requested.split(/[\\/]/).some(segment=>segment.startsWith('.'))||blockedFiles.has(path.basename(requested).toLowerCase())||!allowedExtensions.has(path.extname(requested).toLowerCase()))return send(res,404,'Not found','text/plain; charset=utf-8');
  const file=path.resolve(root,'.'+requested);if(!file.startsWith(root+path.sep))return send(res,403,{error:'Forbidden.'});
  fs.readFile(file,(error,data)=>{if(error)return send(res,404,'Not found','text/plain; charset=utf-8');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?'':data);});
});
server.listen(port,host,()=>console.log(`Aiplay listening on ${host}:${port}`));
