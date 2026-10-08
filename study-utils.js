(() => {
  const maxInput = 20000;
  const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
  function read(key, fallback) { try { return JSON.parse(sessionStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
  function write(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { throw new Error('This browser cannot save the study session. Allow site storage and try again.'); } }
  function context(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    const agent = Object.hasOwn(window.MiraAgents, value.agent) ? value.agent : 'teacher';
    const common = {agent, minutes:[10,20,45].includes(Number(value.minutes)) ? Number(value.minutes) : 20, level:['Beginner','Intermediate','Advanced'].includes(value.level) ? value.level : 'Beginner'};
    if (agent !== 'exam') return common;
    const field = (key, length = 80) => typeof value[key] === 'string' ? value[key].trim().slice(0,length) : '';
    return {...common, exam:field('exam') || 'General learning', subject:field('subject'), semester:field('semester',40), branch:field('branch'), units:field('units',160), governmentExam:field('governmentExam'), examDate:field('examDate',20)};
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
  async function imageData(file) {
    if (!isImage(file)) throw new Error('Choose a PNG, JPEG, or WebP image of your question paper.');
    if (!file.size) throw new Error('This image is empty. Choose another image.');
    if (file.size > 20 * 1024 * 1024) throw new Error('Choose a question-paper image under 20 MB. Upload one page at a time.');
    const url=URL.createObjectURL(file);
    try {
      const picture=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('This image could not be opened. Save it as JPG or PNG and try again.'));img.src=url;});
      const scale=Math.min(1,2600/Math.max(picture.naturalWidth,picture.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(picture.naturalWidth*scale));canvas.height=Math.max(1,Math.round(picture.naturalHeight*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not prepare this image. Try another browser.');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(picture,0,0,canvas.width,canvas.height);
      let dataUrl=canvas.toDataURL('image/jpeg',.94);
      if(dataUrl.length>6900000)dataUrl=canvas.toDataURL('image/jpeg',.8);
      if(dataUrl.length>6900000)throw new Error('Crop the image to one page and attach it again.');
      return {name:file.name.slice(0,100),type:'image/jpeg',dataUrl};
    } finally {URL.revokeObjectURL(url);}
  }
  function isImage(file){return !!file&&(imageTypes.has(file.type)||(!file.type&&/\.(png|jpe?g|webp)$/i.test(file.name)));}
  function uploadError(error){return error.name==='TimeoutError'?'Reading this paper took too long. Try a clearer photo of one page.':error.message==='Failed to fetch'?'Upload could not connect. Check your connection and try again.':error.message;}
  window.MiraStudy = {read,write,context,notes,imageData,isImage,uploadError,maxInput};
})();
