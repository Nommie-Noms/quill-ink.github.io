(function () {
 'use strict';
 var $ = function (id) { return document.getElementById(id); };
 var config = window.PORTAL_CONFIG;
 var page=document.body.getAttribute('data-portal-page') || 'dashboard';
 var mode = 'login', user = null, profile = null, staff = false, administrator = false, selected = null, version = 0;
 var accountTypes={},employeeDirectory=[],ownAdminChat=false,employeeChatTimer=null,employeeChatSignature="",employeeChatLoadedTarget=null,employeeRequestedMessage=null,employeeChatBusy=false;
 var staffDirectory=[],scopeClients=[],scopeSignature="",staffChatSignature="";
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
  hide('registration-type-label',next!=='register');hide('display-label',next!=='register'); hide('recovery-label',next!=='recover');
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
  if(sessionTimer)clearInterval(sessionTimer);sessionTimer=null;sessionCheckBusy=false;
  clearDowngrade();stopNotifications();ownAdminChat=false;hide('owner-upgrade-panel',true);value('owner-business-name','');if($('owner-upgrade-confirmed'))$('owner-upgrade-confirmed').checked=false;if(employeeChatTimer)clearInterval(employeeChatTimer);employeeChatTimer=null;employeeChatSignature='';employeeChatLoadedTarget=null;employeeRequestedMessage=null;employeeChatBusy=false;hide('employee-admin-chat',true);text('employee-chat-messages','');value('employee-chat-message','');hide('notification-panel',true);hide('notifications-button',true);if($('notifications-button'))$('notifications-button').setAttribute('aria-expanded','false');text('notification-list','');text('notification-count','0');hide('notification-count',true);text('notification-state','');
  clearOwnRecovery();
  hide('restricted',true);hide('account-deletion',true);hide('management-link',true);hide('staff-chat-link',true);hide('staff-assignment-panel',true);text('staff-assignment-list','');text('assignment-staff','');text('staff-chat-messages','');value('staff-chat-message','');staffDirectory=[];scopeClients=[];scopeSignature='';staffChatSignature='';
  ['settings-username','settings-business','settings-password','delete-confirm','delete-password','issued-password','issued-code','current-temporary','permanent-password','verification-note'].forEach(function(id){value(id,'');});
  if($('delete-acknowledged'))$('delete-acknowledged').checked=false;
  if($('identity-confirmed'))$('identity-confirmed').checked=false;
  ['own-current-password','own-new-password','own-confirm-password','member-username'].forEach(function(id){value(id,'');});
  ['business-member-list','business-invitations','joined-business-list'].forEach(function(id){text(id,'');});
  ['business-members-section','business-invitations-section','joined-business-section'].forEach(function(id){hide(id,true);});
  hide('password-change',true);hide('staff-recovery',true);hide('staff-reset-result',true);
  version++;user=null;profile=null;selected=null;staff=false;administrator=false;names={};usernames={};staffIds=[];accountTypes={};employeeDirectory=[];hide('employee-members-panel',true);text('employee-member-list','');text('employee-select','');memberships=[];businesses=[];memberIds={};staffSenderIds={};
  clearPackage();hide('service-editor',true);text('messages','');text('client-select','');
  text('account-name','');value('message','');
  hide('dashboard',true);hide('account',false);
 }
 var sessionTimer=null,sessionCheckBusy=false;
 function sessionId(session) {
  try {return JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id || null;}catch(error){return null;}
 }
 async function displacedSession() {
  clearDashboard();value('recovery-output','');hide('recovery-result',true);
  try {check(await client.auth.signOut({scope:'local'}));}catch(error){/* Keep private UI cleared even if the logout request fails. */}
  status('You were signed out because this account signed in elsewhere or its access changed. Sign in again.');
 }
 async function checkPortalSession() {
  if(!user || busy || sessionCheckBusy)return;
  sessionCheckBusy=true;var expectedVersion=version,accountId=user.id;
  try {
   var current=check(await client.auth.getSession()).session;
   if(!current || current.user.id!==accountId)return;
   var expectedId=sessionId(current);
   var security=check(await client.from('account_security').select('active_session_id').eq('user_id',accountId).maybeSingle());
   if(version!==expectedVersion || !user || user.id!==accountId)return;
   var latest=check(await client.auth.getSession()).session;
   // Ignore a late response when another tab has already installed a new session.
   if(sessionId(latest)!==expectedId)return;
   if(!expectedId || !security || security.active_session_id!==expectedId)await displacedSession();
  }catch(error){/* Offline checks retry; the database still enforces the active session. */}
  finally {if(version===expectedVersion)sessionCheckBusy=false;}
 }
 function watchPortalSession() {
  if(sessionTimer)clearInterval(sessionTimer);
  sessionTimer=setInterval(checkPortalSession,5000);
 }
 document.addEventListener('visibilitychange',function(){if(!document.hidden)checkPortalSession();});
 window.addEventListener('focus',checkPortalSession);
 window.addEventListener('pageshow',checkPortalSession);
 async function loadDashboard(session) {
  var preferred=selected;clearDashboard();
  if(page==='dashboard'){var parameters=new URLSearchParams(window.location.search);if(!preferred)preferred=parameters.get('employee') || parameters.get('client');requestedMessage=parameters.get('message');employeeRequestedMessage=parameters.get('employee_message');}
  if(!session) return;
  user=session.user;
  var accountId=user.id;
  var security=check(await client.from('account_security').select('password_required,revoked_before,phase,active_session_id').eq('user_id',accountId).maybeSingle());
  if(!sessionId(session) || !security || security.active_session_id!==sessionId(session)){await displacedSession();return;}
  watchPortalSession();
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
  var results=await Promise.all([client.from('profiles').select('id,username,display_name,account_type').eq('id',accountId).single(),client.from('staff').select('user_id'),client.from('administrators').select('user_id').eq('user_id',accountId)]);
  profile=check(results[0]);staffIds=check(results[1]).map(function(item){return item.user_id;});staff=staffIds.includes(accountId);administrator=check(results[2]).some(function(item){return item.user_id===accountId;});
  accountTypes[accountId]=profile.account_type || 'business_owner';
  text('settings-name-label',accountTypes[accountId]==='employee'?'Your name':'Your business name');
  value('settings-username',profile.username);value('settings-business',profile.display_name);
  names[accountId]=profile.display_name;usernames[accountId]=profile.username;
  $('account-name').textContent=profile.display_name;
  $('role-label').textContent=staff?'STAFF ACCOUNT':accountTypes[accountId]==='employee'?'EMPLOYEE ACCOUNT':'BUSINESS OWNER';
  hide('notifications-button',!staff);hide('management-link',!staff);hide('staff-chat-link',!staff);hide('client-label',!staff);hide('service-editor',true);
  if(page==='settings'){hide('account',true);hide('dashboard',false);await loadBusinessSettings();if(staff)startNotifications();return;}
  if((page==='management' || page==='staff-chat') && !staff){hide('account',true);hide('restricted',false);status('Staff access is required for this page.');return;}
  if(page==='staff-chat'){
   hide('account',true);hide('dashboard',false);await loadStaffChat(true);if(staff)startNotifications();return;
  }
  if(staff) {
   staffDirectory=check(await client.rpc('staff_directory'));
   staffDirectory.forEach(function(p){names[p.id]=p.display_name;usernames[p.id]=p.username;});
   // Paginate accessible accounts, excluding unassigned customers from the selector.
   var clients=await accessibleStaffAccounts();
   scopeClients=clients;scopeSignature=JSON.stringify(clients);
   rebuildStaffSelector(clients,preferred,true);
  } else {
   memberships=check(await client.from('business_members').select('business_id,user_id,accepted_at'));
   var ids=accountTypes[accountId]==='employee'?[]:[accountId];memberships.forEach(function(m){if(m.user_id===accountId && m.accepted_at && !ids.includes(m.business_id))ids.push(m.business_id);});
   var visible=check(await client.from('profiles').select('id,username,display_name').order('username'));
   visible.forEach(function(item){names[item.id]=item.display_name;usernames[item.id]=item.username;});
   businesses=ids.map(function(id){return {id:id,name:names[id] || 'Business'};});
   businesses.forEach(function(item){var option=document.createElement('option');option.value=item.id;option.textContent=item.name+(item.id===accountId?' (owner)':' (member)');$('client-select').appendChild(option);});
   selected=ids.includes(preferred)?preferred:(accountTypes[accountId]==='employee'?(ids[0] || null):accountId);$('client-select').value=selected || '';
   hide('client-label',businesses.length<2);
  }
  hide('account',true);hide('dashboard',false);
  await refresh();if(staff)startNotifications();else if(page==='dashboard' && ownAdminChat)startEmployeeChatPolling();
 }
 async function refresh() {
  if(!user)return;
  if(page==='management'){
   var requested=selected,requestTicket=++version;
   var permitted=!!selected && selected!==user.id;
   hide('owner-upgrade-panel',!(permitted && administrator && accountTypes[selected]==='employee' && !staffIds.includes(selected)));
   hide('owner-downgrade-panel',!(permitted && administrator && accountTypes[selected]==='business_owner' && !staffIds.includes(selected)));
   text('owner-downgrade-target','Selected business owner: @'+(usernames[selected] || ''));
   text('owner-upgrade-target','Selected employee: @'+(usernames[selected] || ''));
   var packageAllowed=permitted && !staffIds.includes(selected) && accountTypes[selected]!=='employee';
   clearPackage();hide('service-editor',!packageAllowed);hide('staff-assignment-panel',!(administrator && packageAllowed));text('staff-assignment-list','');
   hide('employee-members-panel',!(administrator && packageAllowed));text('employee-member-list','');
   if(administrator && packageAllowed){await loadAssignments(requested,requestTicket);await loadEmployeeMembers(requested,requestTicket);}
   hide('staff-recovery',!(permitted && administrator));
   hide('account-deletion',!(permitted && administrator && !staffIds.includes(selected)));
   text('delete-target','Selected account: @'+(usernames[selected] || ''));
   text('management-note',!selected?(administrator?'Select an account to manage assignments, packages, recovery, or deletion.':'Select an assigned business to manage its package.'):staffIds.includes(selected)?(administrator?'This is a staff account. Recovery is available; deletion is protected.':'Only an administrator can recover this staff account.'):(administrator?'Assignments, package management, recovery and deletion are available for this customer.':'Package management is available for this assigned business. Account recovery and deletion require an administrator.'));
   if(accountTypes[selected]==='employee' && !staffIds.includes(selected))text('management-note','This is an employee login. Select a business owner to add this employee to that business. Administrators can upgrade this login to a business owner, recover it or delete it.');
   if(packageAllowed){
    var service=check(await client.from('client_services').select('package_name,monthly_cost,contract_url,documentation_url').eq('client_id',requested).maybeSingle());
    if(requestTicket!==version || selected!==requested || !user)return;
    fillPackageEditor(service);
   }
   return;
  }
  if(page==='settings' || page==='staff-chat')return;
  await loadEmployeeChat(true);
  if(!user)return;
  if(!selected){
   clearPackage();text('messages','');hide('client-content',true);hide('administrator-home-note',false);
   text('administrator-home-note',staff?'No customer business selected. Choose an assigned business, or ask an administrator to assign one. Staff chat is available from the navigation.':'You have not been added to a business yet. An administrator can add your username, or you can accept a business invitation in Account Settings.');
   return;
  }
  var target=selected,requestVersion=++version;
  text('business-view-role',staff?'STAFF VIEW':selected===user.id?'BUSINESS OWNER':'BUSINESS MEMBER');
  var ownAdministrator=administrator && selected===user.id;
  var employeeSelected=staff && accountTypes[selected]==='employee';
  hide('client-content',ownAdministrator || employeeSelected);hide('administrator-home-note',!(ownAdministrator || employeeSelected));
  if(employeeSelected)text('administrator-home-note','This employee\'s private administrator discussion is below. Select a business owner to view its package and business discussion.');
  if(ownAdministrator)text('administrator-home-note','Use Account Management to assign staff and edit client packages, or open Staff chat to talk with your team. Select a customer to view their package and discussion.');
  clearPackage();$('messages').textContent='';
  if(ownAdministrator || employeeSelected)return;
  text('package-eyebrow',selected===user.id?'YOUR CURRENT PACKAGE':'CURRENT CLIENT PACKAGE');
  text('conversation-title','Shared business discussion'+(selected!==user.id?' — '+(names[selected] || 'business'):''));
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
  if(page!=='dashboard' || !user || (administrator && target===user.id) || (staff && accountTypes[target]==='employee'))return;
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
   if(page==='staff-chat')await loadStaffChat(false);
   else if(!administrator && (page==='dashboard' || page==='management'))await syncStaffScope();
   if(cycle!==notificationRun || !user || !staff)return;
   if(page==='dashboard' && administrator)await loadEmployeeChat(false);
   var results=await Promise.all([client.rpc('staff_message_notifications'),client.rpc('staff_unread_message_count'),administrator?client.rpc('admin_employee_notifications'):Promise.resolve({data:[],error:null}),administrator?client.rpc('admin_employee_unread_count'):Promise.resolve({data:0,error:null})]);
   if(cycle!==notificationRun || !user || !staff)return;
   var notifications=check(results[0]).concat(check(results[2]).map(function(item){item.channel='employee';return item;})).sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at);}).slice(0,20),count=Number(check(results[1]))+Number(check(results[3])),known={};
   notifications.forEach(function(item){known[(item.channel || 'business')+':'+item.notification_id]=true;});
   var fresh=notificationKnown===null?[]:notifications.filter(function(item){return !notificationKnown[(item.channel || 'business')+':'+item.notification_id];});
   notificationKnown=known;
   var badge=count>99?'99+':String(count);
   if($('notification-count').textContent!==badge)text('notification-count',badge);hide('notification-count',count===0);
   $('notifications-button').setAttribute('aria-label','Notifications: '+count+' unread messages');
   var state=count+' unread message'+(count===1?'':'s')+(count>20?' · showing latest 20':'');
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
  if(!notifications.length){container.textContent='No unread messages.';return;}
  notifications.forEach(function(item){
   var row=document.createElement('div');row.className='notification-item';
   var heading=document.createElement('strong');heading.textContent=(item.channel==='employee'?'Private · ':'Business · ')+item.client_name+' (@'+item.username+')';
   var when=document.createElement('small');when.textContent=new Date(item.created_at).toLocaleString();
   var preview=document.createElement('p');preview.textContent=item.preview;
   var open=document.createElement('a');open.className='button-link';open.textContent='Open conversation';
   open.href=item.channel==='employee'?'portal.html?employee='+encodeURIComponent(item.client_id)+'&employee_message='+encodeURIComponent(item.message_id):'portal.html?client='+encodeURIComponent(item.client_id)+'&message='+encodeURIComponent(item.message_id);
   if(page==='dashboard')open.onclick=function(event){event.preventDefault();if(busy)return;run(async function(){if(selected!==item.client_id)value('message','');selected=item.client_id;requestedMessage=item.channel==='employee'?null:item.message_id;employeeRequestedMessage=item.channel==='employee'?item.message_id:null;$('client-select').value=selected || '';hide('notification-panel',true);$('notifications-button').setAttribute('aria-expanded','false');await refresh();await pollNotifications(true);var destination=item.channel==='employee'?$('employee-admin-chat'):$('messages');if(destination && destination.scrollIntoView)destination.scrollIntoView({block:'nearest'});});};
   row.appendChild(heading);row.appendChild(when);row.appendChild(preview);row.appendChild(open);container.appendChild(row);
  });
 }
 function closeNotifications(returnFocus) {
  hide('notification-panel',true);if($('notifications-button'))$('notifications-button').setAttribute('aria-expanded','false');
  if(returnFocus && $('notifications-button') && !$('notifications-button').hidden)$('notifications-button').focus();
 }
 bind('notifications-button','onclick',function(){var visible=$('notification-panel').hidden;hide('notification-panel',!visible);$('notifications-button').setAttribute('aria-expanded',String(visible));if(visible)pollNotifications(true);});
 bind('close-notifications','onclick',function(){closeNotifications(true);});
 document.addEventListener('keydown',function(event){if(event.key==='Escape' && !$('notification-panel').hidden)closeNotifications(true);});
 document.addEventListener('click',function(event){
  if(!$('notification-panel').hidden && !$('notification-panel').contains(event.target) && !$('notifications-button').contains(event.target))closeNotifications(false);
 });
 window.addEventListener('pagehide',stopNotifications);
 window.addEventListener('pageshow',function(){if(user && staff && !notificationTimer)startNotifications();});

 function employeeChatTarget() {
  if(page!=='dashboard' || !user)return null;
  if(administrator && selected && accountTypes[selected]==='employee' && !staffIds.includes(selected))return selected;
  if(!staff && profile && profile.account_type==='employee')return user.id;
  return null;
 }
 function startEmployeeChatPolling() {
  if(employeeChatTimer)clearInterval(employeeChatTimer);
  employeeChatTimer=setInterval(function(){if(!document.hidden && !busy && !employeeChatBusy){
   employeeChatBusy=true;loadEmployeeChat(false).then(function(){employeeChatBusy=false;},function(error){employeeChatBusy=false;if(user && employeeChatTarget())status('Administrator chat could not update. Try refreshing.');});
  }},15000);
 }
 window.addEventListener('pagehide',function(){if(employeeChatTimer)clearInterval(employeeChatTimer);employeeChatTimer=null;});
 window.addEventListener('pageshow',function(){if(user && !staff && page==='dashboard' && ownAdminChat && !employeeChatTimer)startEmployeeChatPolling();});
 async function loadEmployeeChat(forceBottom) {
  var target=employeeChatTarget();
  if(target!==employeeChatLoadedTarget){employeeChatLoadedTarget=target;employeeChatSignature='';text('employee-chat-messages','');value('employee-chat-message','');}
  if(!target){ownAdminChat=false;hide('employee-admin-chat',true);text('employee-chat-messages','');value('employee-chat-message','');employeeChatSignature='';return;}
  var actor=user.id,ticket=version;
  var permitted=check(await client.rpc('employee_chat_access',{target:target}));
  if(!user || user.id!==actor || ticket!==version || target!==employeeChatTarget())return;
  if(!staff)ownAdminChat=permitted===true;
  if(permitted!==true){hide('employee-admin-chat',true);text('employee-chat-messages','');value('employee-chat-message','');employeeChatSignature='';return;}
  hide('employee-admin-chat',false);
  text('employee-chat-title',administrator?'Private discussion with '+(names[target] || 'employee'):'Message an administrator');
  var results=await Promise.all([client.from('employee_admin_messages').select('id,sender_id,body,created_at').eq('employee_id',target).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100),client.rpc('employee_chat_authors',{target:target})]);
  if(!user || user.id!==actor || ticket!==version || target!==employeeChatTarget())return;
  var messages=check(results[0]),authors=check(results[1]);authors.forEach(function(p){names[p.id]=p.display_name;});
  if(employeeRequestedMessage && /^[a-f0-9-]{36}$/i.test(employeeRequestedMessage) && !messages.some(function(m){return m.id===employeeRequestedMessage;})){
   var extra=check(await client.from('employee_admin_messages').select('id,sender_id,body,created_at').eq('employee_id',target).eq('id',employeeRequestedMessage).maybeSingle());
   if(extra)messages.push(extra);
  }
  if(!user || user.id!==actor || ticket!==version || target!==employeeChatTarget())return;
  var container=$('employee-chat-messages'),signature=JSON.stringify({messages:messages,authors:authors}),scroll=container.scrollTop,atBottom=container.scrollHeight-scroll-container.clientHeight<40;
  if(signature!==employeeChatSignature){
   employeeChatSignature=signature;container.textContent='';
   messages.slice().sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at);}).forEach(function(m){
    var row=document.createElement('div');row.className='message'+(m.sender_id!==target?' staff':'');
    var author=document.createElement('small');author.textContent=(names[m.sender_id] || (m.sender_id===null?'Deleted account':m.sender_id===target?'Employee':'Administrator'))+' · '+new Date(m.created_at).toLocaleString();
    var body=document.createElement('p');body.textContent=m.body;row.appendChild(author);row.appendChild(body);
    if(m.sender_id===actor){
     var controls=document.createElement('div');controls.className='message-actions';
     var ask=document.createElement('button');ask.type='button';ask.textContent='Delete message';
     var confirmation=document.createElement('span');confirmation.hidden=true;
     var remove=document.createElement('button');remove.type='button';remove.textContent='Confirm deletion';remove.className='message-delete';
     var cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
     ask.onclick=function(){ask.hidden=true;confirmation.hidden=false;};cancel.onclick=function(){confirmation.hidden=true;ask.hidden=false;};
     remove.onclick=function(){run(async function(){
      if(!user || actor!==user.id || target!==employeeChatTarget())return;
      var deleted=check(await client.from('employee_admin_messages').delete().eq('id',m.id).eq('sender_id',actor).select('id'));
      await loadEmployeeChat(false);if(administrator)await pollNotifications(true);
      status(deleted.length?'Message deleted.':'Message no longer available.');
     });};
     confirmation.appendChild(remove);confirmation.appendChild(cancel);controls.appendChild(ask);controls.appendChild(confirmation);row.appendChild(controls);
    }
    container.appendChild(row);
   });
   if(!messages.length)container.textContent='Start your private discussion below.';
   container.scrollTop=forceBottom || atBottom?container.scrollHeight:scroll;
  }else if(forceBottom)container.scrollTop=container.scrollHeight;
  if(administrator && !document.hidden && messages.length)check(await client.rpc('mark_employee_notifications',{message_ids:messages.map(function(m){return m.id;})}));
 }
 bind('employee-chat-form','onsubmit',function(event){event.preventDefault();run(async function(){
  var target=employeeChatTarget();if(!target)throw new Error('Select an employee conversation.');
  var body=$('employee-chat-message').value.trim();if(!body)throw new Error('Enter a message.');
  check(await client.from('employee_admin_messages').insert({employee_id:target,sender_id:user.id,body:body}));
  value('employee-chat-message','');await loadEmployeeChat(true);if(administrator)await pollNotifications(true);status('Private message sent.');
 });});
 async function accessibleStaffAccounts() {
  var rows=[],offset=0,batch;
  do {batch=check(await client.rpc('staff_client_accounts').range(offset,offset+499));rows=rows.concat(batch);offset+=500;} while(batch.length===500);
  return rows;
 }
 function rebuildStaffSelector(clients,preferred,initial) {
  if(!$('client-select'))return;
  text('client-select','');
  if(page==='management' || !administrator){
   var placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=clients.length?'Choose an account':'No assigned customer accounts';$('client-select').appendChild(placeholder);
  }
  clients.forEach(function(item){
   names[item.id]=item.display_name;usernames[item.id]=item.username;accountTypes[item.id]=item.account_type || 'business_owner';
   if(page==='management' && item.id===user.id)return;
   var option=document.createElement('option');option.value=item.id;
   option.textContent=(administrator && item.id===user.id?'Your administrator account':item.display_name)+' (@'+item.username+')'+(accountTypes[item.id]==='employee'?' · Employee':'');$('client-select').appendChild(option);
  });
  selected=clients.some(function(item){return item.id===preferred && (page!=='management' || item.id!==user.id);})?preferred:
   (page==='management' || !initial?null:administrator?user.id:clients.length?clients[0].id:null);
  $('client-select').value=selected || '';
 }
 async function syncStaffScope() {
  var current=user.id,scopeVersion=version,rows=await accessibleStaffAccounts(),signature=JSON.stringify(rows);
  if(!user || user.id!==current || version!==scopeVersion)return;
  if(signature===scopeSignature)return;
  var previous=selected;scopeClients=rows;scopeSignature=signature;rebuildStaffSelector(rows,previous,false);
  if(previous && selected!==previous){
   version++;value('message','');clearPackage();text('messages','');hide('staff-reset-result',true);
   ['issued-password','issued-code','verification-note','delete-password','delete-confirm'].forEach(function(id){value(id,'');});
   await refresh();status('Your assignments changed. That customer account is no longer available.');
  }else if(!selected && page==='dashboard')await refresh();
 }
 async function loadEmployeeMembers(target,ticket) {
  var results=await Promise.all([client.from('business_members').select('business_id,user_id,accepted_at').eq('business_id',target),client.rpc('employee_accounts')]);
  if(!user || !administrator || selected!==target || ticket!==version)return;
  var rows=check(results[0]);employeeDirectory=check(results[1]);
  employeeDirectory.forEach(function(p){names[p.id]=p.display_name;usernames[p.id]=p.username;});
  text('employee-select','');text('employee-member-list','');
  var available=employeeDirectory.filter(function(p){return !rows.some(function(m){return m.user_id===p.id && m.accepted_at;});});
  var empty=document.createElement('option');empty.value='';empty.textContent=available.length?'Choose an employee':'No available employee logins';$('employee-select').appendChild(empty);
  available.forEach(function(p){var o=document.createElement('option');o.value=p.id;o.textContent=p.display_name+' (@'+p.username+')';$('employee-select').appendChild(o);});
  if(!rows.length)text('employee-member-list','No employees or members added yet.');
  rows.forEach(function(m){
   var row=document.createElement('div');row.className='membership-row';
   var label=document.createElement('span');label.textContent=(names[m.user_id] || 'Member')+' (@'+(usernames[m.user_id] || 'customer')+') · '+(m.accepted_at?'Active':'Invitation pending');row.appendChild(label);
   var ask=document.createElement('button');ask.type='button';ask.textContent='Remove member';
   var confirm=document.createElement('span');confirm.hidden=true;
   var remove=document.createElement('button');remove.type='button';remove.textContent='Confirm removal';
   var cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
   ask.onclick=function(){ask.hidden=true;confirm.hidden=false;};cancel.onclick=function(){confirm.hidden=true;ask.hidden=false;};
   remove.onclick=function(){run(async function(){
    if(!administrator || selected!==target)return;
    check(await client.rpc('admin_business_member',{business:target,employee:m.user_id,add_member:false}));await refresh();status('Business member removed.');
   });};
   confirm.appendChild(remove);confirm.appendChild(cancel);row.appendChild(ask);row.appendChild(confirm);$('employee-member-list').appendChild(row);
  });
 }
 function clearDowngrade() {
  hide('owner-downgrade-panel',true);value('employee-character-name','');value('owner-downgrade-username','');
  if($('owner-downgrade-confirmed'))$('owner-downgrade-confirmed').checked=false;
 }
 bind('owner-downgrade-form','onsubmit',function(event){event.preventDefault();run(async function(){
  var target=selected;
  if(!administrator || !target || target===user.id || accountTypes[target]!=='business_owner' || staffIds.includes(target))throw new Error('Select a customer business owner account.');
  if(!$('owner-downgrade-confirmed').checked)throw new Error('Confirm the selected business owner downgrade.');
  var characterName=$('employee-character-name').value.trim(),confirmation=$('owner-downgrade-username').value;
  if(!characterName || characterName.length>80)throw new Error('Enter a character name of 1–80 characters.');
  if(confirmation!==usernames[target])throw new Error('Type the selected account’s exact username.');
  check(await client.rpc('downgrade_owner_to_employee',{target:target,character_name:characterName,confirmation:confirmation}));
  clearDowngrade();var session=check(await client.auth.getSession()).session;await loadDashboard(session);
  status('Business owner downgraded to employee. Their former business records are retained. They must sign in again.');toast('Employee downgrade saved.');
 });});
 bind('owner-upgrade-form','onsubmit',function(event){event.preventDefault();run(async function(){
  var target=selected;
  if(!administrator || !target || accountTypes[target]!=='employee' || staffIds.includes(target))throw new Error('Select a customer employee account.');
  if(!$('owner-upgrade-confirmed').checked)throw new Error('Confirm the selected employee upgrade.');
  var businessName=$('owner-business-name').value.trim();
  if(!businessName || businessName.length>80)throw new Error('Enter a business name of 1–80 characters.');
  check(await client.rpc('upgrade_employee_to_owner',{target:target,business_name:businessName}));
  value('owner-business-name','');$('owner-upgrade-confirmed').checked=false;
  var session=check(await client.auth.getSession()).session;await loadDashboard(session);
  status('Employee upgraded to business owner. Their login and memberships are unchanged. They should refresh their portal.');toast('Business owner upgrade saved.');
 });});
 bind('employee-add-form','onsubmit',function(event){event.preventDefault();run(async function(){
  if(!administrator || !selected || accountTypes[selected]==='employee' || staffIds.includes(selected))throw new Error('Select a business owner account.');
  var employee=$('employee-select').value;if(!employee)throw new Error('Select an employee.');
  check(await client.rpc('admin_business_member',{business:selected,employee:employee,add_member:true}));await refresh();status('Employee added. They can refresh their portal to open this business.');toast('Employee added to business.');
 });});
 async function loadAssignments(target,ticket) {
  var rows=check(await client.from('staff_assignments').select('business_id,staff_id').eq('business_id',target));
  if(!user || !administrator || target!==selected || ticket!==version)return;
  text('assignment-staff','');text('staff-assignment-list','');
  var available=staffDirectory.filter(function(p){return !p.is_administrator && !rows.some(function(a){return a.staff_id===p.id;});});
  var placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=available.length?'Choose staff member':'No unassigned staff available';$('assignment-staff').appendChild(placeholder);
  available.forEach(function(p){var option=document.createElement('option');option.value=p.id;option.textContent=p.display_name+' (@'+p.username+')';$('assignment-staff').appendChild(option);});
  text('assignment-note','Administrators always have access. Multiple staff members can be assigned to this business.');
  if(!rows.length)text('staff-assignment-list','No staff assigned. Only administrators can manage this business.');
  rows.forEach(function(a){
   var row=document.createElement('div');row.className='membership-row';
   var label=document.createElement('span');label.textContent=(names[a.staff_id] || 'Staff member')+' (@'+(usernames[a.staff_id] || 'staff')+')';row.appendChild(label);
   var ask=document.createElement('button');ask.type='button';ask.textContent='Remove assignment';
   var confirmation=document.createElement('span');confirmation.hidden=true;
   var remove=document.createElement('button');remove.type='button';remove.textContent='Confirm removal';
   var cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
   ask.onclick=function(){ask.hidden=true;confirmation.hidden=false;};
   cancel.onclick=function(){confirmation.hidden=true;ask.hidden=false;};
   remove.onclick=function(){run(async function(){
    if(!administrator || selected!==target)return;
    check(await client.rpc('set_staff_assignment',{business:target,staff_user:a.staff_id,assign:false}));await refresh();status('Staff assignment removed.');
   });};
   confirmation.appendChild(remove);confirmation.appendChild(cancel);row.appendChild(ask);row.appendChild(confirmation);$('staff-assignment-list').appendChild(row);
  });
 }
 bind('staff-assignment-form','onsubmit',function(event){event.preventDefault();run(async function(){
  if(!administrator || !selected || staffIds.includes(selected))throw new Error('Select a customer business.');
  var staffId=$('assignment-staff').value;if(!staffId)throw new Error('Choose a staff member.');
  check(await client.rpc('set_staff_assignment',{business:selected,staff_user:staffId,assign:true}));await refresh();status('Staff member assigned to this business.');toast('Staff assignment saved.');
 });});
 async function loadStaffChat(forceBottom) {
  if(page!=='staff-chat' || !user || !staff)return;
  var current=user.id,ticket=version;
  var active=check(await client.rpc('is_staff'));
  if(!user || user.id!==current || ticket!==version)return;
  if(!active){hide('notifications-button',true);closeNotifications(false);hide('notification-count',true);text('staff-chat-messages','');value('staff-chat-message','');hide('dashboard',true);hide('restricted',false);staff=false;stopNotifications();status('Staff access is no longer available.');return;}
  var results=await Promise.all([client.from('staff_chat_messages').select('id,sender_id,body,created_at').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100),client.rpc('staff_directory')]);
  if(!user || user.id!==current || ticket!==version)return;
  var messages=check(results[0]),authors=check(results[1]);authors.forEach(function(p){names[p.id]=p.display_name;usernames[p.id]=p.username;});
  var container=$('staff-chat-messages'),signature=JSON.stringify({messages:messages,authors:authors});
  if(signature===staffChatSignature){if(forceBottom)container.scrollTop=container.scrollHeight;return;}
  staffChatSignature=signature;
  var scroll=container.scrollTop,atBottom=container.scrollHeight-scroll-container.clientHeight<40;
  container.textContent='';
  messages.slice().reverse().forEach(function(m){
   var row=document.createElement('div');row.className='message'+(m.sender_id===current?' staff':'');
   var author=document.createElement('small');author.textContent=(names[m.sender_id] || (m.sender_id?'Former staff member':'Deleted staff account'))+' · '+new Date(m.created_at).toLocaleString();
   var body=document.createElement('p');body.textContent=m.body;row.appendChild(author);row.appendChild(body);
   if(m.sender_id===current){
    var actions=document.createElement('div');actions.className='message-actions';
    var ask=document.createElement('button');ask.type='button';ask.textContent='Delete message';
    var confirm=document.createElement('span');confirm.hidden=true;
    var remove=document.createElement('button');remove.type='button';remove.textContent='Confirm deletion';remove.className='message-delete';
    var cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
    ask.onclick=function(){ask.hidden=true;confirm.hidden=false;};cancel.onclick=function(){confirm.hidden=true;ask.hidden=false;};
    remove.onclick=function(){run(async function(){
     if(!user || user.id!==current)return;
     check(await client.from('staff_chat_messages').delete().eq('id',m.id).eq('sender_id',current).select('id'));await loadStaffChat(false);status('Staff message deleted.');
    });};
    confirm.appendChild(remove);confirm.appendChild(cancel);actions.appendChild(ask);actions.appendChild(confirm);row.appendChild(actions);
   }
   container.appendChild(row);
  });
  if(!messages.length)container.textContent='Start a discussion with your team below.';
  container.scrollTop=forceBottom || atBottom?container.scrollHeight:scroll;
 }
 bind('staff-chat-form','onsubmit',function(event){event.preventDefault();run(async function(){
  if(!user || !staff)throw new Error('Staff access required.');
  var body=$('staff-chat-message').value.trim();if(!body)throw new Error('Enter a message.');
  check(await client.from('staff_chat_messages').insert({sender_id:user.id,body:body}));
  value('staff-chat-message','');await loadStaffChat(true);status('Message sent to staff room.');
 });});
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
 bind('registration-type','onchange',function(){text('registration-name-label',this.value==='employee'?'Your name':'Business name');});
 bind('copy-registration-recovery','onclick',async function(){
  var code=$('recovery-output');if(!code.value)return;
  try {if(!navigator.clipboard || !navigator.clipboard.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(code.value);toast('Recovery code copied.');return;}catch(error){}
  code.focus();code.select();
  try {if(document.execCommand('copy')){toast('Recovery code copied.');return;}}catch(error){}
  status('Copy the selected recovery code manually.');toast('Copy the selected code manually.',true);
 });
 document.querySelectorAll('[data-mode]').forEach(function(button){button.onclick=function(){setMode(button.dataset.mode);};});
 $('auth-form').onsubmit=function(event){event.preventDefault();run(async function(){
  status('');var username=$('username').value.trim().toLowerCase(),password=$('password').value;
  if(mode==='login') {
   var credentials=await accountAction({action:'login',username:username,password:password});
   var result=await client.auth.setSession({access_token:credentials.access_token,refresh_token:credentials.refresh_token});
   if(result.error)throw new Error('Could not sign in. Check your username and password.');
   $('password').value='';await loadDashboard(result.data.session);
  } else {
   var result=await accountAction({action:mode,username:username,password:password,displayName:$('display-name').value,accountType:$('registration-type').value,recoveryCode:$('recovery-input').value});
   $('password').value='';$('recovery-input').value='';$('recovery-output').value=result.recoveryCode;
   hide('account',true);hide('recovery-result',false);status('Save the code, then sign in with your password.');
  }
 });};
 $('recovery-saved').onclick=function(){$('recovery-output').value='';hide('recovery-result',true);hide('account',false);setMode('login');};
 bind('client-select','onchange',function(){clearDowngrade();hide('staff-reset-result',true);['issued-password','issued-code','verification-note','delete-password','delete-confirm'].forEach(function(id){value(id,'');});if($('identity-confirmed'))$('identity-confirmed').checked=false;if($('delete-acknowledged'))$('delete-acknowledged').checked=false;if(selected!==(this.value || null))value('message','');selected=this.value || null;value('owner-business-name','');if($('owner-upgrade-confirmed'))$('owner-upgrade-confirmed').checked=false;requestedMessage=null;employeeRequestedMessage=null;status('');run(refresh);});
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
  hide('business-members-section',staff || profile.account_type==='employee');hide('business-invitations-section',!invitations.length);
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
  if(!administrator || !selected || selected===user.id)throw new Error('An administrator must select another account for recovery.');
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
  if(page!=='management' || !staff || !selected || staffIds.includes(selected) || accountTypes[selected]==='employee')throw new Error('Select a customer in Account Management.');
  var contract=$('contract-input').value.trim(),documentation=$('documentation-input').value.trim();
  if((contract && !validLink(contract)) || (documentation && !validLink(documentation)))throw new Error('Use full HTTPS document links without embedded usernames or passwords.');
  var packageName=$('package-input').value.trim(),cost=Number($('cost-input').value);
  if(!packageName && cost!==0)throw new Error('Enter a package name or set the monthly cost to zero.');
  check(await client.from('client_services').upsert({client_id:selected,package_name:packageName,monthly_cost:cost,contract_url:contract,documentation_url:documentation,updated_by:user.id},{onConflict:'client_id'}));
  await refresh();status('Package details saved.');
 });});
 bind('message-form','onsubmit',function(event){event.preventDefault();run(async function(){
  if(!user || !selected || (staff && accountTypes[selected]==='employee') || (administrator && selected===user.id))throw new Error('Select a customer discussion.');
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
