import { spawn } from 'node:child_process'
import { appendFile, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const transcript=join(tmpdir(),'phase3c1-verification.log');await writeFile(transcript,'');const output=console.log;console.log=(...args)=>{output(...args);void appendFile(transcript,args.join(' ')+'\n')};
const profile=await mkdtemp(join(tmpdir(),'lounge-verify-'))
const edge=spawn(process.env.BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=9352',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'})
const pause=ms=>new Promise(r=>setTimeout(r,ms));let ws
try {
 await pause(4000)
 const pages=await(await fetch('http://127.0.0.1:9352/json')).json()
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
 await new Promise(r=>ws.addEventListener('open',r,{once:true}))
 let id=0;const pending=new Map();const errors=[]
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(JSON.stringify(m.params.args))})
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>reject(Error('CDP timeout '+method)),10000);pending.set(n,m=>{clearTimeout(timer);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)});ws.send(JSON.stringify({id:n,method,params}))})
 const ev=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
 const check=async(expr,label)=>{if(!await ev(`Promise.resolve(${expr}).then(Boolean)`))throw Error(label+' / APP ERRORS: '+JSON.stringify(errors));console.log('PASS '+label)}
 const click=async text=>{await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.includes(${JSON.stringify(text)}));if(!b||b.disabled)throw Error('Missing or disabled '+${JSON.stringify(text)});b.click()})()`);await pause(200)}
 const radio=async(name,value)=>{await ev(`document.querySelector('input[name="${name}"][value="${value}"]').click()`);await pause(150)}
 const nav=async path=>{await cdp('Page.navigate',{url:'http://127.0.0.1:5173'+path});await pause(1100)}



 await cdp('Page.enable');await cdp('Runtime.enable');
 const shot=async(name)=>{const r=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(join(tmpdir(),'phase3c1-'+name+'.png'),Buffer.from(r.data,'base64'))};
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await nav('/');await shot('home');
 await nav('/dashboard');await click('Continue as demo customer');await shot('customer');
 await click('Log out');await nav('/admin');await click('Continue as demo administrator');
 const routes=['/admin','/admin/floor','/admin/stations','/admin/bookings','/admin/food','/admin/orders','/admin/payments','/admin/analytics','/admin/customers','/admin/settings'];
 await nav('/admin/bookings');const detail=await ev("document.querySelector('.ops-booking-management-list a').getAttribute('href')");routes.push(detail);
 for(const width of [390,768,1280,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
  for(const path of routes){await nav(path);await check("!!document.querySelector('.admin-shell')&&document.documentElement.scrollWidth<=document.documentElement.clientWidth",path+' no overflow '+width);await check("getComputedStyle(document.querySelector('.admin-shell')).backgroundColor==='rgb(16, 17, 15)'",path+' shared background '+width);if(path==='/admin'||path==='/admin/floor'){if(path==='/admin/floor')await ev("document.querySelector('.ops-floor').scrollIntoView({block:'start'})");await shot((path==='/admin'?'overview':'floor')+'-'+width);}}
  for(const [path,label] of [['/admin/stations','Add station'],['/admin/bookings','Create walk-in booking'],['/admin/food','Add menu item']]){await nav(path);await ev("(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==="+JSON.stringify(label)+");b.focus();b.click()})()");await pause(150);await shot(label.replaceAll(' ','-')+'-'+width);await check("document.querySelector('dialog[open]').scrollWidth<=document.querySelector('dialog[open]').clientWidth",label+' dialog overflow '+width);await check("getComputedStyle(document.querySelector('dialog')).backgroundColor==='rgb(16, 17, 15)'",label+' charcoal dialog '+width);await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(150);await check("!document.querySelector('dialog[open]')&&document.activeElement.textContent.trim()==="+JSON.stringify(label),'Escape focus restoration '+label+' '+width);}
  await nav('/admin/floor');await ev("document.querySelector('.ops-station').focus()");await check("getComputedStyle(document.querySelector('.ops-station-tooltip')).display==='grid'",'keyboard station preview '+width);await shot('preview-'+width);await ev("document.querySelector('.ops-station').click()");await pause(150);await check("document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth",'station drawer overflow '+width);await shot('drawer-'+width);await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(100);await check("document.activeElement.matches('.ops-station')",'drawer restores station focus '+width);
  if(width===390){await ev("document.querySelector('.ops-menu-toggle').click()");await check("document.querySelector('.admin-sidebar').classList.contains('is-open')",'mobile navigation opens');await shot('mobile-navigation');await ev("document.querySelector('.admin-sidebar a').focus()");await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(100);await check("!document.querySelector('.admin-sidebar').classList.contains('is-open')&&document.activeElement.matches('.ops-menu-toggle')",'mobile navigation Escape focus');}
 }
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await check("getComputedStyle(document.querySelector('.ops-station')).transitionDuration==='0s'",'reduced motion');
 const colors=await ev("Object.fromEntries(['available','occupied','reserved','maintenance'].map(status=>{const s=document.createElement('span');s.className='ops-badge ops-'+status;document.querySelector('main').append(s);const c=getComputedStyle(s).color;s.remove();return [status,c]}))");console.log('STATUS COLORS '+JSON.stringify(colors));
 await check("new Set("+JSON.stringify(Object.values(colors))+").size===4",'four distinct semantic status colors');
 await cdp('Emulation.setDeviceMetricsOverride',{width:2880,height:1000,deviceScaleFactor:1,mobile:false});await nav('/admin');await ev(`document.body.innerHTML='<div style="display:flex;height:100vh"><iframe title="Original public website" src="/" style="border:0;width:50%;height:100%"></iframe><iframe title="Unified admin" src="/admin" style="border:0;width:50%;height:100%"></iframe></div>'`);await pause(2000);await shot('comparison');
 if(errors.length)throw Error(JSON.stringify(errors));console.log('PASS no runtime errors; screenshots in '+tmpdir());
}finally{ws?.close();edge.kill()}
