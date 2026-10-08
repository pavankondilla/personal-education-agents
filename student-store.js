const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { DatabaseSync } = require('node:sqlite');
const scrypt = promisify(crypto.scrypt);
const dir = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
fs.mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(path.join(dir, 'aiplay.sqlite'));
db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,hash TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activities(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),type TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS activities_owner_time ON activities(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL);`);
const oldFile = path.join(__dirname, 'data', 'aiplay-data.json');
if (fs.existsSync(oldFile) && !db.prepare("SELECT 1 FROM migrations WHERE name='legacy-json'").get()) {
  const old = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
  if (!Array.isArray(old.users) || !Array.isArray(old.activities)) throw new Error('Existing student data is invalid. Restore it before starting.');
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const u of old.users) db.prepare('INSERT OR IGNORE INTO users VALUES (?,?,?,?,?,?)').run(u.id,u.name,u.email,u.salt,u.hash,u.createdAt);
    for (const a of old.activities) db.prepare('INSERT OR IGNORE INTO activities VALUES (?,?,?,?,?)').run(a.id,a.userId,a.type==='game'?'legacy-game':a.type,JSON.stringify(a.payload||{}),a.createdAt);
    db.prepare('INSERT INTO migrations VALUES (?,?)').run('legacy-json',new Date().toISOString()); db.exec('COMMIT');
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}
const publicUser = row => row && ({id:row.id,name:row.name,email:row.email,createdAt:row.created_at});
const tokenHash = value => crypto.createHash('sha256').update(value).digest('hex');
async function createUser({name,email,password}) {
  const salt=crypto.randomBytes(16).toString('hex'),hash=(await scrypt(password,salt,64)).toString('hex');
  db.exec('BEGIN IMMEDIATE');
  try {
    if(db.prepare('SELECT 1 FROM users WHERE email=?').get(email))throw new Error('An account exists for this email. Sign in instead.');
    if(db.prepare('SELECT COUNT(*) AS total FROM users').get().total>=20)throw new Error('All 20 student places are filled. Existing students can still sign in.');
    const user={id:crypto.randomUUID(),name,email,createdAt:new Date().toISOString()};
    db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(user.id,name,email,salt,hash,user.createdAt);db.exec('COMMIT');return user;
  }catch(error){db.exec('ROLLBACK');throw error;}
}
async function authenticate(email,password){const row=db.prepare('SELECT * FROM users WHERE email=?').get(email);const calculated=await scrypt(password,row?.salt||'00000000000000000000000000000000',64);return row&&crypto.timingSafeEqual(calculated,Buffer.from(row.hash,'hex'))?publicUser(row):null;}
function startSession(userId){const token=crypto.randomBytes(32).toString('base64url');db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(tokenHash(token),userId,new Date(Date.now()+14*86400000).toISOString());return token;}
function getSessionUser(token){if(!token||typeof token!=='string'||token.length>100)return null;return publicUser(db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(tokenHash(token),new Date().toISOString()));}
function endSession(token){if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token));}
function record(userId,type,payload={},id=crypto.randomUUID()){db.prepare('INSERT OR IGNORE INTO activities VALUES (?,?,?,?,?)').run(id,userId,type,JSON.stringify(payload),new Date().toISOString());return id;}
function dashboard(userId,timezone='Asia/Kolkata'){
  let format;try{format=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'});format.format(new Date());}catch{format=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});}
  const day=date=>format.format(new Date(date)),today=day(Date.now());
  const all=db.prepare('SELECT * FROM activities WHERE user_id=? ORDER BY created_at DESC').all(userId).map(a=>({id:a.id,type:a.type,createdAt:a.created_at,payload:JSON.parse(a.payload)}));
  const lessons=all.filter(a=>a.type==='lesson'),chats=all.filter(a=>a.type==='chat'),games=all.filter(a=>a.type==='game');
  const topics=new Map();for(const a of [...lessons,...chats]){const name=String(a.payload.topic||'').trim();if(!name)continue;const key=name.toLocaleLowerCase(),value=topics.get(key)||{topic:name,sessions:0,questions:0};value.sessions+=a.type==='lesson'?1:0;value.questions+=a.type==='chat'?1:0;topics.set(key,value);}
  const correct=games.reduce((n,a)=>n+Number(a.payload.correct||0),0),questions=games.reduce((n,a)=>n+Number(a.payload.questions||0),0),todayActivities=all.filter(a=>day(a.createdAt)===today);
  const previous=new Set();let rematches=0;for(const a of [...games].reverse()){const key=`${a.payload.topic||''}:${a.payload.game||''}`;if(previous.has(key))rematches++;previous.add(key);}
  return {lessons:lessons.length,chats:chats.length,games:games.length,correct,questions,accuracy:questions?Math.round(correct/questions*100):0,rematches,uniqueTopics:topics.size,today:{date:today,lessons:todayActivities.filter(a=>a.type==='lesson').length,chats:todayActivities.filter(a=>a.type==='chat').length,games:todayActivities.filter(a=>a.type==='game').length,topics:[...new Set(todayActivities.map(a=>a.payload.topic).filter(Boolean))]},topics:[...topics.values()].sort((a,b)=>b.sessions+b.questions-a.sessions-a.questions).slice(0,12),gameHistory:games.slice(0,20).map(a=>({id:a.id,createdAt:a.createdAt,...a.payload})),recent:all.slice(0,20).map(a=>({type:a.type,createdAt:a.createdAt,topic:a.payload.topic||a.payload.game||'Learning activity',question:a.type==='chat'?a.payload.question:undefined,answer:a.type==='chat'?a.payload.answer:undefined}))};
}
module.exports={createUser,authenticate,startSession,getSessionUser,endSession,record,dashboard};
