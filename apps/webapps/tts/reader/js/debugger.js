(function() {
    const content = document.getElementById('uni-debug-content');
    const logs = [];
    function addLog(type, message, details='') {
        const time = new Date().toLocaleTimeString().split(' ')[0];
        let lineInfo = '';
        try { const stack=new Error().stack;if(stack){const lines=stack.split('\n');const caller=lines.find(l=>!l.includes('addLog')&&!l.includes('console.')&&l.includes('.html'));if(caller){const m=caller.match(/:(\d+):\d+/);if(m)lineInfo=`L${m[1]}`;}}} catch(e){}
        let fd='';if(details){try{fd=typeof details==='object'?JSON.stringify(details):String(details);}catch(e){fd='[Object]';}}
        const div=document.createElement('div');
        div.style.cssText='margin-bottom:3px;border-bottom:1px solid #222;padding-bottom:2px;word-wrap:break-word;';
        const colors={info:'#8cf',warn:'orange',error:'#f66',system:'#8f8'};
        div.innerHTML=`<span style="color:#555">[${time}]</span> <span style="float:right;color:#444;font-size:0.9em">${lineInfo}</span><strong style="color:${colors[type]||'#ccc'}">${type.toUpperCase()}:</strong> ${String(message).replace(/</g,'&lt;')} <span style="color:#777">${fd}</span>`;
        content.appendChild(div);content.scrollTop=content.scrollHeight;
        logs.push(`[${time}][${type.toUpperCase()}] ${message} ${fd} (${lineInfo})`);
        if(type==='error'){document.getElementById('uni-debug-panel').style.display='flex';document.getElementById('uni-debug-icon').style.background='#f00';}
    }
    window.debugLog=(a,d)=>addLog('info',a,d);
    window.onerror=(msg,url,line,col,error)=>{addLog('error',msg,`L:${line}`);return false;};
    window.onunhandledrejection=e=>addLog('error','Unhandled Promise',e.reason?.message||e.reason);
    const ol=console.log,ow=console.warn,oe=console.error;
    console.log=(...a)=>{ol.apply(console,a);addLog('info',a.join(' '));};
    console.warn=(...a)=>{ow.apply(console,a);addLog('warn',a.join(' '));};
    console.error=(...a)=>{oe.apply(console,a);addLog('error',a.join(' '));};
    window.toggleDebugPanel=()=>{const p=document.getElementById('uni-debug-panel');p.style.display=p.style.display==='flex'?'none':'flex';};
    window.clearDebugLog=()=>{content.innerHTML='';logs.length=0;document.getElementById('uni-debug-icon').style.background='#ff0055';};
    window.copyDebugReport=()=>{
        const report='=== FeistTech Reader v10 Debug Report ===\n'+new Date().toISOString()+'\n\n'+logs.join('\n');
        navigator.clipboard.writeText(report).then(()=>{
            const btns=document.querySelectorAll('#uni-debug-panel button');
            btns[0].innerText='✅ COPIED!';setTimeout(()=>btns[0].innerText='📋 COPY FOR AI',2000);
        });
    };
    addLog('system','FeistTech Reader v10 — Debugger Ready.');
})();
