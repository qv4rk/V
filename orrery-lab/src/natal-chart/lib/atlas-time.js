/* Local civil time -> UTC with the browser's IANA timezone rules. */
(function(root){
 const stamp=f=>{const d=new Date(0);d.setUTCFullYear(f.year,f.month-1,f.day);d.setUTCHours(f.hour||0,f.minute||0,f.second||0,0);return +d;};
 const fields=(date,zone)=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);const x={};for(const a of p)if(a.type!=='literal')x[a.type]=+a.value;return x;};
 function resolve(f,zone){
  const target=stamp(f),offsets=new Set();
  for(const h of [-48,-24,-12,0,12,24,48]){const t=target+h*3600000;offsets.add(Math.round((stamp(fields(new Date(t),zone))-t)/1000));}
  const choices=[];for(const seconds of offsets){const d=new Date(target-seconds*1000),v=fields(d,zone);if(['year','month','day','hour','minute'].every(k=>v[k]===(f[k]||0)))choices.push({date:d,offsetHours:seconds/3600});}
  choices.sort((a,b)=>+a.date-+b.date);if(!choices.length)throw Error('That local time does not exist in this timezone (the clocks moved forward). Please check the recorded birth time.');return choices;
 }
 root.AtlasTime={resolve,fields};
})(globalThis);
