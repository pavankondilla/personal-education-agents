(function (root) {
  const day = 86400000;
  function dateText(value) { return new Date(value).toISOString().slice(0, 10); }
  function create(source, examDate = '') {
    const lines = String(source || '').replace(/\r/g, '').split(/\n|;|•|(?<=\S),\s+(?=[A-Z0-9])/);
    const seen = new Set();
    const titles = lines.map(line => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').replace(/^Image notes from [^:]+:\s*/i, '').trim()).filter(Boolean).filter(title => {
      const key = title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    if (!titles.length) throw new Error('Add at least one exam topic. Put each topic on a new line.');
    if (titles.length > 60) throw new Error('Add up to 60 exam topics in one plan. Group closely related subtopics together.');
    const today = Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const exam = /^\d{4}-\d{2}-\d{2}$/.test(examDate) ? Date.parse(`${examDate}T00:00:00Z`) : NaN;
    const days = Number.isFinite(exam) && exam >= today ? Math.floor((exam - today) / day) : null;
    const studyDays = days === null ? null : Math.max(0, days - 1);
    return {examDate:days === null ? '' : examDate, source:String(source), active:0, reviewing:false, topics:titles.map((title, index) => {
      const offset = studyDays === null ? null : Math.floor(index * studyDays / Math.max(1, titles.length));
      const reviewOffset = studyDays === null ? null : Math.min(days, Math.max(offset + 1, days - 1));
      return {title, learned:false, reviewed:false, studyDate:offset === null ? '' : dateText(today + offset * day), reviewDate:reviewOffset === null ? '' : dateText(today + reviewOffset * day)};
    })};
  }
  const api = {create};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MiraRoadmap = api;
})(typeof window !== 'undefined' ? window : globalThis);
