(() => {
  let stopped=false, active=null;
  function paragraphs(){
    const root=document.querySelector('article, main, [role="main"]')||document.body;
    return [...root.querySelectorAll('p')].map(p=>({el:p,text:(p.innerText||'').trim()}))
      .filter(x=>x.text.length>=20 && getComputedStyle(x.el).display!=='none');
  }
  function findVoice(spec){
    const vs=speechSynthesis.getVoices();
    return vs.find(v=>v.name===spec?.name && v.lang===spec?.lang)||vs.find(v=>v.name===spec?.name)||null;
  }
  async function read(items,narrators){
    stopped=false;
    for(let i=0;i<items.length&&!stopped;i++){
      const item=items[i], spec=narrators[i%narrators.length];
      item.el.scrollIntoView({behavior:'smooth',block:'center'});
      item.el.dataset.readingRoomActive='true';
      await new Promise(resolve=>{
        const u=new SpeechSynthesisUtterance(item.text); active=u;
        const v=findVoice(spec); if(v){u.voice=v;u.lang=v.lang;}
        u.onend=u.onerror=resolve; speechSynthesis.speak(u);
      });
      delete item.el.dataset.readingRoomActive;
    }
    active=null;
  }
  chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
    if(msg.type==='RR_STOP'){stopped=true;speechSynthesis.cancel();sendResponse({message:'Stopped.'});return;}
    if(msg.type==='RR_START'){
      const items=paragraphs(), narrators=(msg.narrators||[]).slice(0,3);
      if(!items.length){sendResponse({message:'No readable paragraphs found.'});return;}
      if(!narrators.length){sendResponse({message:'Choose at least one narrator.'});return;}
      speechSynthesis.cancel(); read(items,narrators);
      sendResponse({message:'Reading '+items.length+' paragraphs with '+narrators.length+' narrator'+(narrators.length===1?'':'s')+'.'});
    }
  });
})();
