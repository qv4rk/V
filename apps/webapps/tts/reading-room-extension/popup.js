const count=document.getElementById('count'), box=document.getElementById('voices'), status=document.getElementById('status');
let allVoices=[];
function loadVoices(){
  allVoices=speechSynthesis.getVoices();
  render();
}
function render(){
  const n=Number(count.value); box.innerHTML='';
  for(let i=0;i<n;i++){
    const row=document.createElement('div'); row.className='voice';
    const label=document.createElement('label'); label.textContent=String.fromCharCode(65+i);
    const sel=document.createElement('select'); sel.id='voice'+i;
    allVoices.forEach((v,j)=>{const o=document.createElement('option');o.value=j;o.textContent=v.name+' · '+v.lang;if(j===i)o.selected=true;sel.appendChild(o);});
    row.append(label,sel); box.appendChild(row);
  }
}
count.onchange=render;
speechSynthesis.onvoiceschanged=loadVoices;
document.getElementById('refresh').onclick=loadVoices;
document.getElementById('stop').onclick=async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});chrome.tabs.sendMessage(tab.id,{type:'RR_STOP'});status.textContent='Stopped.';};
document.getElementById('read').onclick=async()=>{
  const narrators=[...box.querySelectorAll('select')].map(s=>{const v=allVoices[Number(s.value)];return v?{name:v.name,lang:v.lang}:null;}).filter(Boolean);
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  chrome.tabs.sendMessage(tab.id,{type:'RR_START',narrators},r=>{status.textContent=r?.message||'Reading started.';});
};
loadVoices();
