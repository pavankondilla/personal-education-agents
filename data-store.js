const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, 'data', 'aiplay-data.json');
let queue = Promise.resolve();
const empty = () => ({ users: [], activities: [] });
function load() { try { const d = JSON.parse(fs.readFileSync(file, 'utf8')); return { users: Array.isArray(d.users) ? d.users : [], activities: Array.isArray(d.activities) ? d.activities : [] }; } catch { return empty(); } }
function update(change) { queue = queue.then(() => { const d = load(), result = change(d); fs.mkdirSync(path.dirname(file), { recursive: true }); const temp = `${file}.${process.pid}.tmp`; fs.writeFileSync(temp, JSON.stringify(d), { encoding: 'utf8', mode: 0o600 }); fs.renameSync(temp, file); return result; }); return queue; }
const id = () => crypto.randomUUID();
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt });
function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) { return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') }; }
function same(a,b) { try { return crypto.timingSafeEqual(Buffer.from(a,'hex'), Buffer.from(b,'hex')); } catch { return false; } }
async function createUser({ name, email, password }) { return update(d => { if (d.users.some(u => u.email === email)) { const e = new Error('An account already exists for this email. Sign in instead.'); e.code = 'EXISTS'; throw e; } const user = { id:id(), name, email, ...passwordHash(password), createdAt:new Date().toISOString() }; d.users.push(user); return publicUser(user); }); }
async function authenticate(email,password) { const user = load().users.find(u => u.email === email); return user && same(passwordHash(password,user.salt).hash,user.hash) ? publicUser(user) : null; }
const getUser = userId => { const u = load().users.find(x => x.id === userId); return u ? publicUser(u) : null; };
async function record(userId,type,payload={}) { return update(d => { d.activities.push({id:id(),userId,type,payload,createdAt:new Date().toISOString()}); if(d.activities.length>25000)d.activities.splice(0,d.activities.length-25000); }); }
function dashboard(userId) { const a=load().activities.filter(x=>x.userId===userId).sort((x,y)=>x.createdAt.localeCompare(y.createdAt)), lessons=a.filter(x=>x.type==='lesson'),chats=a.filter(x=>x.type==='chat'),games=a.filter(x=>x.type==='game'),topics=new Map(); lessons.forEach(x=>{const t=String(x.payload.topic||'Untitled topic');topics.set(t,(topics.get(t)||0)+1)}); const correct=games.reduce((s,x)=>s+Number(x.payload.correct||0),0),questions=games.reduce((s,x)=>s+Number(x.payload.questions||0),0); return {lessons:lessons.length,chats:chats.length,games:games.length,correct,questions,accuracy:questions?Math.round(correct/questions*100):0,topics:[...topics.entries()].map(([topic,sessions])=>({topic,sessions})).sort((x,y)=>y.sessions-x.sessions).slice(0,8),recent:a.slice(-8).reverse().map(x=>({type:x.type,createdAt:x.createdAt,topic:x.payload.topic||x.payload.game||'Learning activity'}))}; }
module.exports={createUser,authenticate,getUser,record,dashboard};
