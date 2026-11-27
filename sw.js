const CACHE='forja-v3';
const FILES=['./','index.html','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(new Request(f,{cache:'reload'}))))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!=='forja-cfg').map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
/* Abre al instante desde la copia guardada y la actualiza en segundo plano. */
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(e.request,{ignoreSearch:true});
    const net=fetch(e.request).then(r=>{if(r&&r.ok)c.put(e.request,r.clone());return r;}).catch(()=>null);
    return hit||(await net)||c.match('index.html');
  }));
});
/* Botón «Bebí 250 ml» de la notificación, o toque sobre ella. */
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const drank=e.action==='drank';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    if(list.length){
      const c=list[0];
      if(drank){c.postMessage({type:'drank',ml:250});return;}
      return c.focus();
    }
    return self.clients.openWindow(drank?'./?water=250':'./');
  }));
});
/* Intento de aviso en segundo plano (Android decide si lo permite; no es fiable). */
self.addEventListener('periodicsync',e=>{if(e.tag==='forja-agua')e.waitUntil(remind());});
async function remind(){
  try{
    const c=await caches.open('forja-cfg'), r=await c.match(new URL('cfg.json',self.location).href); if(!r)return;
    const W=await r.json(), n=new Date(), hr=n.getHours()+n.getMinutes()/60;
    const p=x=>String(x).padStart(2,'0'), today=n.getFullYear()+'-'+p(n.getMonth()+1)+'-'+p(n.getDate());
    const ml=W.date===today?W.ml:0;
    if(!W.on||hr<W.from||hr>=W.to||ml>=W.goal)return;
    await self.registration.showNotification('Forja',{body:'Hora de tomar agua. Llevas '+ml+' de '+W.goal+' ml.',icon:'icon-192.png',badge:'icon-192.png',tag:'forja-agua',renotify:true,vibrate:[200,100,200],actions:[{action:'drank',title:'Bebí 250 ml'}]});
  }catch(e){}
}
