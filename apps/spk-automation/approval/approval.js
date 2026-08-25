(function(){
  'use strict';
  var AUTH_KEY='pgm:spk-auth-v1';
  var state={token:'',user:null,roles:[],users:[],queue:null};
  var $=function(id){return document.getElementById(id)};

  function rpc(method){
    var args=Array.prototype.slice.call(arguments,1);
    return new Promise(function(resolve,reject){
      var runner=google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      runner[method].apply(runner,args);
    });
  }
  function alertError(message){return Swal.fire({icon:'error',title:'Tidak berhasil',text:message||'Terjadi kesalahan.',confirmButtonColor:'#17191f'});}
  function setBusy(value){document.body.classList.toggle('loading',Boolean(value));}
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}
  function savedAuth(){try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'null')||{};}catch(e){return {};}}
  function saveAuth(token,user){state.token=token;state.user=user;localStorage.setItem(AUTH_KEY,JSON.stringify({token:token,user:user}));}
  function clearAuth(){state.token='';state.user=null;localStorage.removeItem(AUTH_KEY);}
  function fileData(file){return new Promise(function(resolve,reject){if(!file){resolve('');return;}if(file.size>1000000){reject(new Error('Ukuran gambar maksimal 1 MB.'));return;}var reader=new FileReader();reader.onload=function(){resolve(reader.result);};reader.onerror=function(){reject(new Error('Gambar gagal dibaca.'));};reader.readAsDataURL(file);});}

  async function init(){
    bind();setBusy(true);
    try{
      var bootstrap=await rpc('getApprovalBootstrapStatus');
      state.roles=bootstrap.roles||[];
      $('showSetupButton').hidden=!bootstrap.needsBootstrap;
      var auth=savedAuth();
      if(auth.token){var session=await rpc('getApprovalSession',auth.token);if(session&&session.status==='success'){saveAuth(auth.token,session.user);await showApp();return;}clearAuth();}
      showLogin();
    }catch(error){alertError(error.message);showLogin();}finally{setBusy(false);}
  }
  function bind(){
    $('loginForm').addEventListener('submit',login);
    $('logoutButton').addEventListener('click',logout);
    $('showSetupButton').addEventListener('click',function(){$('loginView').hidden=true;$('setupView').hidden=false;});
    $('cancelSetup').addEventListener('click',showLogin);
    $('setupForm').addEventListener('submit',setup);
    $('refreshButton').addEventListener('click',loadQueue);
    $('newUserButton').addEventListener('click',function(){openUser();});
    $('closeUserDialog').addEventListener('click',function(){$('userDialog').close();});
    $('cancelUser').addEventListener('click',function(){$('userDialog').close();});
    $('userForm').addEventListener('submit',saveUser);
    $('queueList').addEventListener('click',function(event){var button=event.target.closest('[data-approve]');if(button)approve(button.dataset.approve);});
    $('userList').addEventListener('click',function(event){var button=event.target.closest('[data-user]');if(button)openUser(state.users.find(function(u){return u.userId===button.dataset.user;}));});
  }
  function showLogin(){$('loginView').hidden=false;$('setupView').hidden=true;$('appView').hidden=true;$('userbar').hidden=true;}
  async function login(event){event.preventDefault();setBusy(true);try{var response=await rpc('loginApprovalUser',$('loginEmail').value,$('loginPassword').value);if(!response||response.status!=='success')throw new Error(response&&response.message);saveAuth(response.token,response.user);$('loginPassword').value='';await showApp();}catch(error){alertError(error.message);}finally{setBusy(false);}}
  async function logout(){try{if(state.token)await rpc('logoutApprovalUser',state.token);}catch(e){}clearAuth();showLogin();}
  async function setup(event){event.preventDefault();setBusy(true);try{var form=new FormData(event.currentTarget);var signature=await fileData(form.get('signature'));var response=await rpc('bootstrapApprovalAdmin',form.get('setupCode'),{email:form.get('email'),name:form.get('name'),password:form.get('password'),signatureData:signature,signatureName:form.get('name')});if(!response||response.status!=='success')throw new Error(response&&response.message);await Swal.fire({icon:'success',title:'Akun dibuat',text:'Silakan masuk memakai email dan password Admin PPIC.',confirmButtonColor:'#17191f'});event.currentTarget.reset();$('showSetupButton').hidden=true;showLogin();}catch(error){alertError(error.message);}finally{setBusy(false);}}
  async function showApp(){$('loginView').hidden=true;$('setupView').hidden=true;$('appView').hidden=false;$('userbar').hidden=false;$('currentName').textContent=state.user.name||state.user.email;$('currentRole').textContent=state.user.roleLabel||'';$('adminPanel').hidden=state.user.roleKey!=='admin_ppic';await loadQueue();if(state.user.roleKey==='admin_ppic')await loadUsers();}
  async function loadQueue(){setBusy(true);try{var response=await rpc('getApprovalQueue',state.token);if(!response||response.status!=='success')throw new Error(response&&response.message);state.queue=response;$('pendingCount').textContent=response.counts.pending;$('approvedCount').textContent=response.counts.approved;$('signatureState').textContent=response.signatureReady?'TERSEDIA':'BELUM ADA';$('signatureWarning').hidden=response.signatureReady;renderQueue(response.items||[],response.signatureReady);}catch(error){if(/sesi|login|akun/i.test(error.message||'')){clearAuth();showLogin();}alertError(error.message);}finally{setBusy(false);}}
  function renderQueue(items,signatureReady){
    if(!items.length){$('queueList').innerHTML='<div class="empty">Belum ada SPK pada antrean jabatan ini.</div>';return;}
    $('queueList').innerHTML=items.map(function(item){
      var progress=item.progress||{approved:0,required:0};
      var width=progress.required?Math.round(progress.approved/progress.required*100):0;
      var pending=item.status==='MENUNGGU';
      var routes=(item.routing||[]).map(function(route){return '<span class="tag">'+escapeHtml(route)+'</span>';}).join('');
      return '<article class="queue-card"><div><h3>'+escapeHtml(item.spk)+'</h3><p>'+escapeHtml(item.customer||'Tanpa customer')+' · '+escapeHtml(item.article||'Tanpa artikel')+'</p><div>'+routes+'</div></div><div><span class="tag '+(item.approvalStatus==='SIAP_RELEASE'?'ok':'wait')+'">'+escapeHtml(item.approvalStatus.replace(/_/g,' '))+'</span><div class="progress"><i style="width:'+width+'%"></i></div><p>'+progress.approved+' dari '+progress.required+' persetujuan lengkap</p></div><div>'+(pending?'<button class="button primary" data-approve="'+escapeHtml(item.spk)+'" '+(signatureReady?'':'disabled')+'>Setujui &amp; Paraf</button>':'<span class="state">Disetujui<br><small>'+escapeHtml(item.signedAt)+'</small></span>')+'</div></article>';
    }).join('');
  }
  async function approve(spk){var confirmation=await Swal.fire({icon:'question',title:'Setujui SPK '+spk+'?',text:'Tanda tangan akun Anda akan dibubuhkan dan tindakan ini dicatat beserta waktu persetujuan.',showCancelButton:true,confirmButtonText:'Ya, setujui',cancelButtonText:'Batal',confirmButtonColor:'#17191f'});if(!confirmation.isConfirmed)return;setBusy(true);try{var response=await rpc('approveSpk',state.token,spk);if(!response||response.status!=='success')throw new Error(response&&response.message);await Swal.fire({icon:'success',title:'Persetujuan tersimpan',text:response.message,confirmButtonColor:'#17191f'});await loadQueue();}catch(error){alertError(error.message);}finally{setBusy(false);}}
  async function loadUsers(){var response=await rpc('listApprovalUsers',state.token);if(!response||response.status!=='success')throw new Error(response&&response.message);state.users=response.users||[];state.roles=response.roles||state.roles;renderUsers();fillRoles();}
  function renderUsers(){$('userList').innerHTML=state.users.map(function(user){return '<article class="user-card"><div><h3>'+escapeHtml(user.name)+'</h3><p>'+escapeHtml(user.email)+'</p><p>'+escapeHtml(user.roleLabel)+' · TTD '+(user.signatureReady?'tersedia':'belum ada')+'</p></div><button class="button ghost" data-user="'+escapeHtml(user.userId)+'">Ubah</button></article>';}).join('')||'<div class="empty">Belum ada pengguna.</div>';}
  function fillRoles(){$('roleSelect').innerHTML=state.roles.map(function(role){return '<option value="'+escapeHtml(role.key)+'">'+escapeHtml(role.label)+'</option>';}).join('');}
  function openUser(user){var form=$('userForm');form.reset();fillRoles();form.elements.userId.value=user?user.userId:'';form.elements.email.value=user?user.email:'';form.elements.name.value=user?user.name:'';form.elements.roleKey.value=user?user.roleKey:'head_blowing';form.elements.active.checked=user?user.active:true;form.elements.password.required=!user;$('userDialogTitle').textContent=user?'Ubah pengguna':'Tambah pengguna';$('userDialog').showModal();}
  async function saveUser(event){event.preventDefault();var form=event.currentTarget;setBusy(true);try{var data=new FormData(form);var signature=await fileData(data.get('signature'));var payload={userId:data.get('userId'),email:data.get('email'),name:data.get('name'),roleKey:data.get('roleKey'),password:data.get('password'),active:form.elements.active.checked,signatureData:signature,signatureName:data.get('name')};var response=await rpc('saveApprovalUser',state.token,payload);if(!response||response.status!=='success')throw new Error(response&&response.message);$('userDialog').close();await loadUsers();await Swal.fire({icon:'success',title:'Pengguna tersimpan',text:response.message,confirmButtonColor:'#17191f'});}catch(error){alertError(error.message);}finally{setBusy(false);}}
  init();
})();
