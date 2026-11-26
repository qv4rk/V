const STATES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
const clean=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
let countries;try{countries=new Intl.DisplayNames(['en'],{type:'region'});}catch{}
export function placeLabel(c){return [c[0],c[2]==='US'?(STATES[c[1]]||c[1]):(/^[A-Z]{2,3}$/.test(c[1])?c[1]:''),countries?.of(c[2])||c[2]].filter(Boolean).join(', ');}
export function searchPlaces(cities,text){
 const q=clean(text).replace(/^(i was born in|born in|city of) /,'').replace(/\b(usa|u s a)\b/g,'united states').replace(/\buk\b/g,'united kingdom'),tokens=q.split(' ').filter(Boolean);
 if(q.length<2)return [];
 return cities.map(c=>({c,name:clean(c[0]),hay:clean(placeLabel(c)+' '+c[1]+' '+c[2])})).filter(x=>tokens.every(t=>x.hay.includes(t))).sort((a,b)=>(a.name===q?-3:a.name.startsWith(tokens[0])?-2:0)-(b.name===q?-3:b.name.startsWith(tokens[0])?-2:0)||(b.c[5]||0)-(a.c[5]||0)).slice(0,8).map(x=>x.c);
}
export function bindPlaceSearch(input,list,cities,onSelect){
 let matches=[],active=-1;
 const select=i=>{const c=matches[i];if(!c)return;input.value=placeLabel(c);list.hidden=true;onSelect({name:input.value,lat:c[3],lon:c[4]});};
 const render=()=>{list.replaceChildren();list.hidden=!matches.length;matches.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.textContent=placeLabel(c);b.setAttribute('role','option');b.setAttribute('aria-selected',String(i===active));b.onmousedown=e=>e.preventDefault();b.onclick=()=>select(i);list.append(b);});};
 input.addEventListener('input',()=>{matches=searchPlaces(cities,input.value);active=-1;render();});
 input.addEventListener('keydown',e=>{if(!matches.length)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();active=Math.max(0,Math.min(matches.length-1,active+(e.key==='ArrowDown'?1:-1)));render();}else if(e.key==='Enter'){e.preventDefault();select(active<0?0:active);}else if(e.key==='Escape')list.hidden=true;});
 return {selectFirst:()=>{matches=searchPlaces(cities,input.value);if(matches.length===1){select(0);return true;}render();return false;}};
}
