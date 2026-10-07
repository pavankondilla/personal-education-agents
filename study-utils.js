(() => {
  const maxInput = 20000;
  function read(key, fallback) { try { return JSON.parse(sessionStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
  function write(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { throw new Error('This browser cannot save the study session. Allow site storage and try again.'); } }
  function context(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    return {agent:Object.hasOwn(window.MiraAgents, value.agent) ? value.agent : 'teacher', exam:typeof value.exam==='string'?value.exam.trim().slice(0,80):'General learning', subject:typeof value.subject==='string'?value.subject.trim().slice(0,80):'', minutes:[10,20,45].includes(Number(value.minutes))?Number(value.minutes):20, level:['Beginner','Intermediate','Advanced'].includes(value.level)?value.level:'Beginner'};
  }
  async function notes(file) {
    if (!file || !/\.(txt|md|csv)$/i.test(file.name)) throw new Error('Choose a text (.txt), Markdown (.md), or CSV (.csv) file.');
    if (file.size > 100000) throw new Error('This file is too large. Use a passage of up to 20,000 characters.');
    const text = (await file.text()).trim();
    if (text.length < 2) throw new Error('This file is empty. Add a topic or question instead.');
    if (text.length > maxInput) throw new Error('These notes are longer than 20,000 characters. Split them into a smaller section.');
    if (text.includes('\u0000')) throw new Error('This file does not look like plain text. Choose a .txt, .md, or .csv file.');
    return text;
  }
  window.MiraStudy = {read,write,context,notes,maxInput};
})();
