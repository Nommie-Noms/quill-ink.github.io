(function () {
 'use strict';
 var $ = function (id) { return document.getElementById(id); };
 var config = window.PORTAL_CONFIG;
 var page=document.body.getAttribute('data-portal-page') || 'dashboard';
 var mode = 'login', user = null, profile = null, staff = false, administrator = false, selected = null, version = 0;
 var memberships=[],businesses=[],memberIds={},staffSenderIds={};
 var names = {}, usernames = {}, staffIds = [], busy = false, links = {contract:'',documentation:''};
 var client,toastTimer,notificationTimer=null,notificationRun=0,notificationBusy=false,notificationKnown=null,notificationSignature='',requestedMessage=null;
 function toast(text,info) {
  clearTimeout(toastTimer);
  $('copy-toast').textContent=text;
  $('copy-toast').className='toast visible'+(info?' info':'');
  toastTimer=setTimeout(function(){$('copy-toast').className='toast';$('copy-toast').textContent='';},info?6000:4000);
 }
 function status(text) { $('status').textContent = text || ''; }
 function hide(id, hidden) {if($(id))$(id).hidden=hidden;}
 function value(id,text){if($(id))$(id).value=text;}
 function text(id,message){if($(id))$(id).textContent=message;}
 function bind(id,event,handler){if($(id))$(id)[event]=handler;}
 function money(value) { return '$' + Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
 function syncCopyButtons() {if(page!=='dashboard')return; $('copy-contract').disabled=busy || !links.contract; $('copy-documentation').disabled=busy || !links.documentation; }
 function clearPackage() {
  links={contract:'',documentation:''};text('package-name','Not assigned');text('monthly-cost','—');
  value('package-input','');value('cost-input','0');value('contract-input','');value('documentation-input','');value('manual-copy','');
  hide('manual-copy-label',true);text('links-note','');syncCopyButtons();
 }
 function fillPackageEditor(service) {
  if(!service)return;
  value('package-input',service.package_name);value('cost-input',service.monthly_cost);
  value('contract-input',service.contract_url);value('documentation-input',service.documentation_url);
 }

 function check(result) { if(result.error) throw new Error(result.error.message); return result.data; }
 function setMode(next) {
  mode = next;
  hide('display-label',next!=='register'); hide('recovery-label',next!=='recover');
  $('display-name').required = next==='register'; $('recovery-input').required = next==='recover';
  $('password').autocomplete = next==='login' ? 'current-password' : 'new-password';
  $('auth-title').textContent = next==='login' ? 'Sign in' : next==='register' ? 'Create account' : 'Reset your password';
  $('auth-submit').textContent = next==='login' ? 'Sign in' : next==='register' ? 'Create account' : 'Reset password';
  document.querySelectorAll('[data-mode]').forEach(function(button) {button.setAttribute('aria-pressed',String(button.dataset.mode===next));});
  status('');
 }
 async function run(task) {
  if(busy) return;
  busy=true;
  var buttons=Array.from(document.querySelectorAll('button, input, select, textarea'));
  buttons.forEach(function(button){button.disabled=true;});
  try {await task();} catch(error) {status(error.message || 'Something went wrong. Please try again.');}
  finally {busy=false; buttons.forEach(function(button){button.disabled=false;});syncCopyButtons();}
 }
 function clearDashboard() {
  stopNotifications();hide('notification-panel',true);hide('notifications-button',true);if($('notifications-button'))$('notifications-button').setAttribute('aria-expanded','false');text('notification-list','');text('notification-count','0');text('notification-state','');
  clearOwnRecovery();
  hide('restricted',true);hide('account-deletion',true);hide('management-link',true);
  ['settings-username','settings-business','settings-password','delete-confirm','delete-password','issued-password','issued-code','current-temporary','permanent-password','verification-note'].forEach(function(id){value(id,'');});
  if($('delete-acknowledged'))$('delete-acknowledged').checked=false;
  if($('identity-confirmed'))$('identity-confirmed').checked=false;
  ['own-current-password','own-new-password','own-confirm-password','member-username'].forEach(function(id){value(id,'');});
  ['business-member-list','business-invitations','joined-business-list'].forEach(function(id){text(id,'');});
  ['business-members-section','business-invitations-section','joined-business-section'].forEach(function(id){hide(id,true);});
  hide('password-change',true);hide('staff-recovery',true);hide('staff-reset-result',true);
  version++;user=null;profile=null;selected=null;staff=false;administrator=false;names={};usernames={};staffIds=[];memberships=[];businesses=[];memberIds={};staffSenderIds={};
  clearPackage();hide('service-editor',true);text('messages','');text('client-select','');
  text('account-name','');value('message','');
  hide('dashboard',true);hide('account',false);
 }
 async function loadDashboard(session) {
  var preferred=selected;clearDashboard();
  if(page==='dashboard'){var parameters=new URLSearchParams(window.location.search);if(!preferred)preferred=parameters.get('client');requestedMessage=parameters.get('message');}
  if(!session) return;
  user=session.user;
  var accountId=user.id;
  var security=check(await client.from('account_security').select('password_required,revoked_before,phase').eq('user_id',accountId).maybeSingle());
  if(security && ['editing_profile','deleting'].includes(security.phase)) {hide('account',true);status('An account change is in progress. Contact an administrator if it does not finish.');return;}
  if(security && security.password_required) {
   hide('account',true);hide('password-change',false);
   status(security.phase==='awaiting_change'?'Change your temporary password to continue.':'Account recovery needs staff assistance. Ask staff to issue a new temporary password.');
   return;
  }
  if(security && security.revoked_before) {
   var claims=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
   if(Number(claims.iat)<=Number(security.revoked_before)){check(await client.auth.signOut({scope:'local'}));clearDashboard();status('This session has been revoked. Sign in again.');return;}
  }
  var results=await Promise.all([client.from('profiles').select('id,username,display_name').eq('id',accountId).single(),client.from('staff').select('user_id'),client.from('administrators').select('user_id').eq('user_id',accountId)]);
  profile=check(results[0]);staffIds=check(results[1]).map(function(item){return item.user_id;});staff=staffIds.includes(accountId);administrator=check(results[2]).some(function(item){return item.user_id===accountId;});
  value('settings-username',profile.username);value('settings-business',profile.display_name);
  names[accountId]=profile.display_name;usernames[accountId]=profile.username;
  $('account-name').textContent=profile.display_name;
  $('role-label').textContent=staff?'STAFF ACCOUNT':'CLIENT ACCOUNT';
  hide('notifications-button',!staff);hide('management-link',!staff);hide('client-label',!staff);hide('service-editor',true);
  if(page==='settings'){hide('account',true);hide('dashboard',false);await loadBusinessSettings();if(staff)startNotifications();return;}
  if(page==='management' && !staff){hide('account',true);hide('restricted',false);status('Staff access is required for account management.');return;}
  if(staff) {
   // Paginate profiles so staff can reach every client, beyond the API's default row limit.
   var clients=[],offset=0,batch;
   do {batch=check(await client.from('profiles').select('id,username,display_name').order('username').range(offset,offset+499));clients=clients.concat(batch);offset+=500;} while(batch.length===500);
   if(page==='management'){var placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose an account';$('client-select').appendChild(placeholder);}
   clients.forEach(function(item){if(page==='management' && item.id===accountId)return;names[item.id]=item.display_name;usernames[item.id]=item.username;var option=document.createElement('option');option.value=item.id;option.textContent=(administrator && item.id===accountId?'Your administrator account':item.display_name)+' (@'+item.username+')';$('client-select').appendChild(option);});
   selected=clients.some(function(item){return item.id===preferred && (page!=='management' || item.id!==accountId);})?preferred:(page==='management'?null:(administrator?accountId:(clients.length?clients[0].id:accountId)));$('client-select').value=selected || '';
  } else {
   memberships=check(await client.from('business_members').select('business_id,user_id,accepted_at'));
   var ids=[accountId];memberships.forEach(function(m){if(m.user_id===accountId && m.accepted_at && !ids.includes(m.business_id))ids.push(m.business_id);});
   var visible=check(await client.from('profiles').select('id,username,display_name').order('username'));
   visible.forEach(function(item){names[item.id]=item.display_name;usernames[item.id]=item.username;});
   businesses=ids.map(function(id){return {id:id,name:names[id] || 'Business'};});
   businesses.forEach(function(item){var option=document.createElement('option');option.value=item.id;option.textContent=item.name+(item.id===accountId?' (owner)':' (member)');$('client-select').appendChild(option);});
   selected=ids.includes(preferred)?preferred:((ids.length>1)?ids[1]:accountId);$('client-select').value=selected;
   hide('client-label',businesses.length<2);
  }
  hide('account',true);hide('dashboard',false);
  await refresh();if(staff)startNotifications();
 }
 async function refresh() {
  if(!user)return;
  if(page==='management'){
   var requested=selected,requestTicket=++version;
   var permitted=!!selected && selected!==user.id;
   var packageAllowed=permitted && !staffIds.includes(selected);
   clearPackage();hide('service-editor',!packageAllowed);
   hide('staff-recovery',!(permitted && (administrator || !staffIds.includes(selected))));
   hide('account-deletion',!(permitted && administrator && !staffIds.includes(selected)));
   text('delete-target','Selected account: @'+(usernames[selected] || ''));
   text('management-note',!selected?'Select an account to manage its package, recovery, or deletion.':staffIds.includes(selected)?(administrator?'This is a staff account. Recovery is available; deletion is protected.':'Only an administrator can recover this staff account.'):'Package management and recovery are available for this customer.'+(administrator?' Deletion is also available.':''));
   if(packageAllowed){
    var service=check(await client.from('client_services').select('package_name,monthly_cost,contract_url,documentation_url').eq('client_id',requested).maybeSingle());
    if(requestTicket!==version || selected!==requested || !user)return;
    fillPackageEditor(service);
   }
   return;
  }
  if(page==='settings' || !selected)return;
  var target=selected,requestVersion=++version;
  text('business-view-role',staff?'STAFF VIEW':selected===user.id?'BUSINESS OWNER':'BUSINESS MEMBER');
  var ownAdministrator=administrator && selected===user.id;
  hide('client-content',ownAdministrator);hide('administrator-home-note',!ownAdministrator);
  clearPackage();$('messages').textContent='';
  if(ownAdministrator)return;
  text('package-eyebrow',selected===user.id?'YOUR CURRENT PACKAGE':'CURRENT CLIENT PACKAGE');
  text('conversation-title',selected===user.id?'Private discussion':'Discussion with '+(names[selected] || 'client'));
  $('package-name').textContent='Loading…';
  var results=await Promise.all([
   client.from('client_services').select('package_name,monthly_cost,contract_url,documentation_url').eq('client_id',target).maybeSingle(),
   client.from('messages').select('id,sender_id,body,created_at').eq('client_id',target).order('created_at',{ascending:false}).limit(100),
   client.from('business_members').select('business_id,user_id,accepted_at').eq('business_id',target),
   client.rpc('business_message_authors',{business:target})
  ]);
  if(requestVersion!==version || selected!==target || !user) return;
  var service=check(results[0]),messages=check(results[1]);
  memberIds={};check(results[2]).forEach(function(m){if(m.accepted_at)memberIds[m.user_id]=true;});
  staffSenderIds={};check(results[3]).forEach(function(p){names[p.id]=p.display_name;usernames[p.id]=p.username;staffSenderIds[p.id]=p.is_staff;});
  $('package-name').textContent=service && service.package_name ? service.package_name : 'Not assigned';
  $('monthly-cost').textContent=service && service.package_name ? money(service.monthly_cost) : '—';
  if(service) {
   fillPackageEditor(service);
   links.contract=validLink(service.contract_url);links.documentation=validLink(service.documentation_url);
  }
  $('links-note').textContent=(!links.contract || !links.documentation)?'Your team will add any missing document links.':'';
  syncCopyButtons();
  await addRequestedMessage(messages,target);
  if(requestVersion!==version || selected!==target || !user)return;
  renderMessages(messages,target,true);
  await acknowledgeMessages(messages);
 } 
 async function addRequestedMessage(messages,target) {
  if(!requestedMessage || !/^[a-f0-9-]{36}$/i.test(requestedMessage) || messages.some(function(item){return item.id===requestedMessage;}))return;
  var extra=check(await client.from('messages').select('id,sender_id,body,created_at').eq('client_id',target).eq('id',requestedMessage).maybeSingle());
  if(extra)messages.push(extra);
 }
 function renderMessages(messages,target,forceBottom) {
  var container=$('messages'),scroll=container.scrollTop,atBottom=container.scrollHeight-scroll-container.clientHeight<40;
  container.textContent='';
  messages.slice().sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at);}).forEach(function(message){
   var box=document.createElement('div');box.className='message'+((staffIds.includes(message.sender_id) || staffSenderIds[message.sender_id])?' staff':'');box.id='message-'+message.id;
   var author=document.createElement('small');author.textContent=(names[message.sender_id] || (message.sender_id===null?'Deleted user':(staffIds.includes(message.sender_id) || staffSenderIds[message.sender_id])?'Quill & Ink staff':'Business member'))+' · '+new Date(message.created_at).toLocaleString();
   var body=document.createElement('p');body.textContent=message.body;box.appendChild(author);box.appendChild(body);
   if(user && message.sender_id===user.id){
    var tools=document.createElement('div');tools.className='message-actions';
    var ask=document.createElement('button');ask.type='button';ask.textContent='Delete message';
    var confirm=document.createElement('span');confirm.className='message-actions';confirm.hidden=true;
    var prompt=document.createElement('span');prompt.textContent='Delete this message for both sides?';
    var remove=document.createElement('button');remove.type='button';remove.className='message-delete';remove.textContent='Delete';
    var cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
    ask.onclick=function(){ask.hidden=true;confirm.hidden=false;};cancel.onclick=function(){confirm.hidden=true;ask.hidden=false;};
    remove.onclick=function(){run(async function(){
     if(!user || selected!==target)return;
     var deleted=check(await client.from('messages').delete().eq('id',message.id).eq('sender_id',user.id).select('id'));
     await loadConversation(target,version);
     if(staff)await pollNotifications(true);
     status(deleted.length?'Message deleted.':'The message is already deleted or is no longer accessible.');
     toast(deleted.length?'Message deleted.':'Message no longer available.',!deleted.length);
    });};
    confirm.appendChild(prompt);confirm.appendChild(remove);confirm.appendChild(cancel);tools.appendChild(ask);tools.appendChild(confirm);box.appendChild(tools);
   }
   container.appendChild(box);
  });
  if(!messages.length)container.textContent='Start your private discussion below.';
  container.scrollTop=forceBottom || atBottom?container.scrollHeight:scroll;
 }
 async function acknowledgeMessages(messages) {
  if(!staff || document.hidden || !messages.length)return;
  check(await client.rpc('mark_message_notifications',{message_ids:messages.map(function(item){return item.id;})}));
 }
 async function loadConversation(target,expectedVersion) {
  if(page!=='dashboard' || !user || (administrator && target===user.id))return;
  var messages=check(await client.from('messages').select('id,sender_id,body,created_at').eq('client_id',target).order('created_at',{ascending:false}).limit(100));
  await addRequestedMessage(messages,target);
  if(!user || selected!==target || version!==expectedVersion)return;
  renderMessages(messages,target,false);await acknowledgeMessages(messages);
 }
 function stopNotifications() {
  if(notificationTimer)clearInterval(notificationTimer);notificationTimer=null;notificationRun++;notificationKnown=null;notificationSignature='';notificationBusy=false;
 }
 function startNotifications() {
  stopNotifications();
  pollNotifications(true);
  notificationTimer=setInterval(function(){if(!document.hidden && !busy)pollNotifications(false);},15000);
 }
 async function pollNotifications(silent,skipConversation) {
  if(!user || !staff || notificationBusy)return;
  notificationBusy=true;var cycle=notificationRun;
  try {
   var results=await Promise.all([client.rpc('staff_message_notifications'),client.rpc('staff_unread_message_count')]);
   if(cycle!==notificationRun || !user || !staff)return;
   var notifications=check(results[0]),count=Number(check(results[1])),known={};
   notifications.forEach(function(item){known[item.notification_id]=true;});
   var fresh=notificationKnown===null?[]:notifications.filter(function(item){return !notificationKnown[item.notification_id];});
   notificationKnown=known;
   if($('notification-count').textContent!==String(count))text('notification-count',String(count));
   $('notifications-button').setAttribute('aria-label','Notifications: '+count+' unread client messages');
   var state=count+' unread client message'+(count===1?'':'s')+(count>20?' · showing latest 20':'');
   if($('notification-state').textContent!==state)text('notification-state',state);
   var signature=JSON.stringify(notifications);
   if(signature!==notificationSignature){notificationSignature=signature;renderNotifications(notifications);}
   if(!silent && fresh.length)toast(fresh.length===1?'New message from '+fresh[0].client_name: fresh.length+' new client messages.');
   if(page==='dashboard' && !busy && !document.hidden && selected && !skipConversation){
    await loadConversation(selected,version);
    notificationBusy=false;
    if(!silent && notifications.some(function(item){return item.client_id===selected;}))await pollNotifications(true,true);
   }
  } catch(error) {if(cycle===notificationRun)text('notification-state','Notifications could not update. Retrying shortly.');}
  finally {if(cycle===notificationRun)notificationBusy=false;}
 }
 function renderNotifications(notifications) {
  var container=$('notification-list');container.textContent='';
  if(!notifications.length){container.textContent='No unread client messages.';return;}
  notifications.forEach(function(item){
   var row=document.createElement('div');row.className='notification-item';
   var heading=document.createElement('strong');heading.textContent=item.client_name+' (@'+item.username+')';
   var when=document.createElement('small');when.textContent=new Date(item.created_at).toLocaleString();
   var preview=document.createElement('p');preview.textContent=item.preview;
   var open=document.createElement('a');open.className='button-link';open.textContent='Open conversation';
   open.href='portal.html?client='+encodeURIComponent(item.client_id)+'&message='+encodeURIComponent(item.message_id);
   if(page==='dashboard')open.onclick=function(event){event.preventDefault();if(busy)return;run(async function(){if(selected!==item.client_id)value('message','');selected=item.client_id;requestedMessage=item.message_id;$('client-select').value=selected;hide('notification-panel',true);$('notifications-button').setAttribute('aria-expanded','false');await refresh();await pollNotifications(true);if($('messages').scrollIntoView)$('messages').scrollIntoView({block:'nearest'});});};
   row.appendChild(heading);row.appendChild(when);row.appendChild(preview);row.appendChild(open);container.appendChild(row);
  });
 }
 bind('notifications-button','onclick',function(){var visible=$('notification-panel').hidden;hide('notification-panel',!visible);$('notifications-button').setAttribute('aria-expanded',String(visible));if(visible)pollNotifications(true);});
 window.addEventListener('pagehide',stopNotifications);
 window.addEventListener('pageshow',function(){if(user && staff && !notificationTimer)startNotifications();});

 async function accountAction(data) {
  var controller=typeof AbortController!=='undefined'?new AbortController():null;
  var timer=controller?setTimeout(function(){controller.abort();},20000):null;
  try {
   var requestHeaders={'Content-Type':'application/json',apikey:config.supabasePublishableKey};
   if(['staff-reset','change-temporary','update-profile','delete-account','rotate-recovery','change-password'].includes(data.action)) {
    var currentSession=check(await client.auth.getSession()).session;
    if(!currentSession)throw new Error('Sign in again.');
    requestHeaders.Authorization='Bearer '+currentSession.access_token;
   }
   var response=await fetch(config.supabaseUrl+'/functions/v1/accounts',{method:'POST',headers:requestHeaders,body:JSON.stringify(data),signal:controller?controller.signal:undefined});
   var body=await response.json();
   if(!response.ok)throw new Error(body.error || 'Account service failed. Check that the accounts function is deployed.');
   return body;
  } finally {if(timer)clearTimeout(timer);}
 }
 try {
  if(!config) throw new Error('The configuration script did not load. Check assets/js/portal-config.js.');
  if(!window.supabase) throw new Error('The authentication library did not load or could not run. '+((window.PORTAL_LOAD_ERRORS || []).join(' | ') || 'Check assets/vendor/supabase-2.57.4-compat.js.'));
  if(typeof window.fetch!=='function') throw new Error('This browser does not support fetch requests.');
  if(typeof window.URL!=='function') throw new Error('This browser does not support the URL API.');
  // Refuse a silent in-memory session: the phone must support durable storage.
  localStorage.setItem('quill-portal-storage-check','ok');localStorage.removeItem('quill-portal-storage-check');
  client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'quill-test-auth-v1'}});
 } catch(error) {status('This browser cannot initialise the portal: '+error.message);$('auth-submit').disabled=true;return;}
 document.querySelectorAll('[data-mode]').forEach(function(button){button.onclick=function(){setMode(button.dataset.mode);};});
 $('auth-form').onsubmit=function(event){event.preventDefault();run(async function(){
  status('');var username=$('username').value.trim().toLowerCase(),password=$('password').value;
  if(mode==='login') {
   var result=await client.auth.signInWithPassword({email:username+'@accounts.quill-ink.invalid',password:password});
   if(result.error)throw new Error('Could not sign in. Check your username and password.');
   $('password').value='';await loadDashboard(result.data.session);
  } else {
   var result=await accountAction({action:mode,username:username,password:password,displayName:$('display-name').value,recoveryCode:$('recovery-input').value});
   $('password').value='';$('recovery-input').value='';$('recovery-output').value=result.recoveryCode;
   hide('account',true);hide('recovery-result',false);status('Save the code, then sign in with your password.');
  }
 });};
 $('recovery-saved').onclick=function(){$('recovery-output').value='';hide('recovery-result',true);hide('account',false);setMode('login');};
 bind('client-select','onchange',function(){hide('staff-reset-result',true);['issued-password','issued-code','verification-note','delete-password','delete-confirm'].forEach(function(id){value(id,'');});if($('identity-confirmed'))$('identity-confirmed').checked=false;if($('delete-acknowledged'))$('delete-acknowledged').checked=false;if(selected!==(this.value || null))value('message','');selected=this.value || null;requestedMessage=null;status('');run(refresh);});
 bind('logo-refresh','onclick',function(event){event.preventDefault();if(!busy)window.location.reload();});
 bind('logout','onclick',function(){run(async function(){check(await client.auth.signOut({scope:'local'}));clearDashboard();status('Signed out.');});});
 bind('restricted-logout','onclick',function(){$('logout').click();});
 function clearOwnRecovery() {
  value('own-recovery-password','');value('own-recovery-code','');hide('own-recovery-result',true);
 }
 window.addEventListener('pagehide',clearOwnRecovery);
 bind('recovery-code-form','onsubmit',function(event){event.preventDefault();run(async function(){
  value('own-recovery-code','');hide('own-recovery-result',true);
  try {
   var result=await accountAction({action:'rotate-recovery',currentPassword:$('own-recovery-password').value});
   $('own-recovery-code').value=result.recoveryCode;hide('own-recovery-result',false);
   status('New recovery code generated. Your previous code is no longer valid. Save this code privately.');
   toast('New recovery code generated.');
  } finally {value('own-recovery-password','');}
 });});
 bind('copy-own-recovery','onclick',async function(){
  var code=$('own-recovery-code');if(!code.value)return;
  try {if(!navigator.clipboard || !navigator.clipboard.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(code.value);toast('Recovery code copied.');return;}catch(error){}
  code.focus();code.select();
  try {if(document.execCommand('copy')){toast('Recovery code copied.');return;}}catch(error){}
  status('Copy the selected recovery code manually.');toast('Copy the selected code manually.',true);
 });
 bind('hide-own-recovery','onclick',clearOwnRecovery);
 async function loadBusinessSettings() {
  if(page!=='settings' || !user)return;
  var current=user.id,ticket=++version;
  var results=await Promise.all([client.from('business_members').select('business_id,user_id,accepted_at'),client.from('profiles').select('id,username,display_name').order('username'),client.rpc('my_business_invitations')]);
  if(!user || user.id!==current || ticket!==version)return;
  var rows=check(results[0]),people=check(results[1]),invitations=check(results[2]);
  people.forEach(function(p){names[p.id]=p.display_name;usernames[p.id]=p.username;});
  hide('business-members-section',staff);hide('business-invitations-section',!invitations.length);
  text('business-member-list','');text('business-invitations','');text('joined-business-list','');
  function actionButton(label,action) {
   var b=document.createElement('button');b.type='button';b.textContent=label;
   b.onclick=function(){run(async function(){await action();await loadBusinessSettings();status('Business membership updated.');});};return b;
  }
  function removeControl(row,business,member,label) {
   var confirmation=document.createElement('span');confirmation.hidden=true;
   var ask=document.createElement('button');ask.type='button';ask.textContent=label;
   ask.onclick=function(){ask.hidden=true;confirmation.hidden=false;};
   confirmation.appendChild(actionButton('Confirm',async function(){check(await client.rpc('remove_business_member',{business:business,member:member}));}));
   var cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=function(){confirmation.hidden=true;ask.hidden=false;};
   confirmation.appendChild(cancel);row.appendChild(ask);row.appendChild(confirmation);
  }
  var own=rows.filter(function(m){return m.business_id===current;});
  if(!own.length)text('business-member-list','No members invited yet.');
  own.forEach(function(m){
   var row=document.createElement('div');row.className='membership-row';
   var label=document.createElement('span');label.textContent='@'+(usernames[m.user_id] || 'customer')+' · '+(m.accepted_at?'Member':'Invitation pending');row.appendChild(label);
   removeControl(row,current,m.user_id,m.accepted_at?'Remove member':'Cancel invitation');$('business-member-list').appendChild(row);
  });
  invitations.forEach(function(i){
   var row=document.createElement('div');row.className='membership-row';
   var label=document.createElement('span');label.textContent=i.business_name+' · owner @'+i.owner_username;row.appendChild(label);
   [true,false].forEach(function(accept){row.appendChild(actionButton(accept?'Accept':'Decline',async function(){check(await client.rpc('respond_business_invite',{business:i.business_id,accept_invite:accept}));}));});
   $('business-invitations').appendChild(row);
  });
  var joined=rows.filter(function(m){return m.user_id===current && m.accepted_at;});
  hide('joined-business-section',!joined.length);
  joined.forEach(function(m){
   var row=document.createElement('div');row.className='membership-row';
   var label=document.createElement('span');label.textContent=names[m.business_id] || 'Business';row.appendChild(label);
   removeControl(row,m.business_id,current,'Leave business');$('joined-business-list').appendChild(row);
  });
 }
 bind('member-invite-form','onsubmit',function(event){event.preventDefault();run(async function(){
  check(await client.rpc('invite_business_member',{account_name:$('member-username').value.trim().toLowerCase()}));
  value('member-username','');await loadBusinessSettings();status('Invitation sent. The person can accept it in Account Settings.');toast('Business invitation sent.');
 });});
 bind('own-password-form','onsubmit',function(event){event.preventDefault();run(async function(){
  if($('own-new-password').value!==$('own-confirm-password').value)throw new Error('New passwords do not match.');
  var result=await accountAction({action:'change-password',currentPassword:$('own-current-password').value,password:$('own-new-password').value});
  check(await client.auth.signOut({scope:'local'}));clearDashboard();hide('account',true);
  value('recovery-output',result.recoveryCode);hide('recovery-result',false);status('Your password changed. Save your replacement recovery code, then sign in again.');
 });});
 bind('profile-form','onsubmit',function(event){event.preventDefault();run(async function(){
  var username=$('settings-username').value.trim().toLowerCase();
  var result=await accountAction({action:'update-profile',username:username,displayName:$('settings-business').value.trim(),currentPassword:$('settings-password').value});
  $('settings-password').value='';
  if(result.usernameChanged){
   await client.auth.signOut({scope:'local'});clearDashboard();$('username').value=result.username;
   $('recovery-output').value=result.recoveryCode;hide('account',true);hide('recovery-result',false);
   status('Username updated. Save your new recovery code, then sign in with your new username and existing password.');
  }else{var session=check(await client.auth.getSession()).session;await loadDashboard(session);status('Your own business or character name updated.');toast('Account name updated.');}
 });});
 bind('delete-form','onsubmit',function(event){event.preventDefault();run(async function(){
  if(!administrator || !selected || selected===user.id || staffIds.includes(selected))throw new Error('Select a customer account. Staff accounts are protected.');
  if(!$('delete-acknowledged').checked || $('delete-confirm').value!==usernames[selected])throw new Error('Confirm deletion and type the exact selected customer username.');
  var result=await accountAction({action:'delete-account',targetId:selected,confirmUsername:$('delete-confirm').value,currentPassword:$('delete-password').value});
  $('delete-password').value='';selected=null;
  var session=check(await client.auth.getSession()).session;await loadDashboard(session);
  status(result.auditWarning?'Customer deleted. The audit completion could not be recorded; check Supabase before proceeding.':'Customer account and portal records deleted.');toast('Customer account deleted.');
 });});
 bind('staff-reset-form','onsubmit',function(event){event.preventDefault();run(async function(){
  if(!staff || !selected || selected===user.id)throw new Error('Select another customer. You cannot reset your own account here.');
  if(!$('identity-confirmed').checked)throw new Error('Verify the account owner first.');
  var result=await accountAction({action:'staff-reset',targetId:selected,reason:$('verification-note').value.trim()});
  $('issued-password').value=result.temporaryPassword;$('issued-code').value=result.recoveryCode;hide('staff-reset-result',false);status('Reset recorded. Deliver the temporary credentials privately to the verified owner.');
 });});
 bind('dismiss-credentials','onclick',function(){hide('staff-reset-result',true);$('issued-password').value='';$('issued-code').value='';$('verification-note').value='';$('identity-confirmed').checked=false;});
 bind('temporary-form','onsubmit',function(event){event.preventDefault();run(async function(){
  var result=await accountAction({action:'change-temporary',currentPassword:$('current-temporary').value,password:$('permanent-password').value});
  check(await client.auth.signOut({scope:'local'}));clearDashboard();hide('account',true);hide('password-change',true);
  $('recovery-output').value=result.recoveryCode;hide('recovery-result',false);status('Password updated. Save your replacement recovery code, then sign in again.');
 });});
 bind('temporary-logout','onclick',function(){run(async function(){check(await client.auth.signOut({scope:'local'}));clearDashboard();status('Signed out.');});});
 function validLink(value) {
  try {var url=new URL(value);return url.protocol==='https:' && url.hostname && !url.username && !url.password ? url.href : '';} catch(error) {return '';}
 }
 async function copyLink(kind) {
  var value=links[kind];if(!value)return;
  hide('manual-copy-label',true);
  try {if(!navigator.clipboard || !navigator.clipboard.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(value);status('');toast(kind==='contract'?'Contract link copied.':'Documentation link copied.');return;}catch(error){}
  $('manual-copy').value=value;hide('manual-copy-label',false);$('manual-copy').focus();$('manual-copy').select();
  try {if(document.execCommand('copy')){hide('manual-copy-label',true);status('');toast(kind==='contract'?'Contract link copied.':'Documentation link copied.');return;}}catch(error){}
  status('Automatic copying is unavailable in this browser. Copy the selected link manually.');toast('Copy the selected link manually.',true);
 }
 bind('copy-contract','onclick',function(){copyLink('contract');});
 bind('copy-documentation','onclick',function(){copyLink('documentation');});
 bind('service-form','onsubmit',function(event){event.preventDefault();run(async function(){
  if(page!=='management' || !staff || !selected || staffIds.includes(selected))throw new Error('Select a customer in Account Management.');
  var contract=$('contract-input').value.trim(),documentation=$('documentation-input').value.trim();
  if((contract && !validLink(contract)) || (documentation && !validLink(documentation)))throw new Error('Use full HTTPS document links without embedded usernames or passwords.');
  var packageName=$('package-input').value.trim(),cost=Number($('cost-input').value);
  if(!packageName && cost!==0)throw new Error('Enter a package name or set the monthly cost to zero.');
  check(await client.from('client_services').upsert({client_id:selected,package_name:packageName,monthly_cost:cost,contract_url:contract,documentation_url:documentation,updated_by:user.id},{onConflict:'client_id'}));
  await refresh();status('Package details saved.');
 });});
 bind('message-form','onsubmit',function(event){event.preventDefault();run(async function(){
  if(!user || !selected)throw new Error('Please sign in again.');
  var body=$('message').value.trim();if(!body)throw new Error('Enter a message.');
  check(await client.from('messages').insert({client_id:selected,sender_id:user.id,body:body}));
  $('message').value='';await refresh();status('Message sent.');
 });});
 client.auth.onAuthStateChange(function(event,session){
  if(event==='SIGNED_OUT'){clearDashboard();}
  // Keep database work outside the synchronous auth callback.
  if(event==='SIGNED_IN' && user && user.id!==session.user.id)setTimeout(function(){run(function(){return loadDashboard(session);});},0);
 });
 setMode('login');
 run(async function(){var data=check(await client.auth.getSession());await loadDashboard(data.session);});
}());
