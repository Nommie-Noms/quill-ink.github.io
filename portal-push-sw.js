'use strict';
// No fetch handler or offline cache: authenticated portal responses stay online.
self.addEventListener('install',function(event){event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',function(event){event.waitUntil(self.clients.claim());});
function safePortalURL(value) {
  var base=new URL('./portal.html',self.registration.scope),url;
  try {url=new URL(value || base.href,base);}catch(error){return base.href;}
  return url.origin===base.origin && url.pathname===base.pathname?url.href:base.href;
}
self.addEventListener('push',function(event){
  var payload={};try {payload=event.data?event.data.json():{};}catch(error){}
  event.waitUntil(self.registration.showNotification('Quill & Ink',{
    body:payload.channel==='employee'?'New employee message for administrators. Open the portal to read it.':'New client message. Open the portal to read it.',
    icon:new URL('./portal-push-icon.svg',self.registration.scope).href,
    tag:'quill-'+(payload.messageId || 'new-message'),
    data:{url:safePortalURL(payload.url)}
  }));
});
self.addEventListener('notificationclick',function(event){
  event.notification.close();var destination=safePortalURL(event.notification.data && event.notification.data.url);
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async function(windows){
    for(var client of windows){
      var url=new URL(client.url);
      if(url.origin===self.location.origin && url.pathname===new URL('./portal.html',self.registration.scope).pathname){
        if(client.navigate)await client.navigate(destination);
        return client.focus();
      }
    }
    return self.clients.openWindow(destination);
  }));
});
