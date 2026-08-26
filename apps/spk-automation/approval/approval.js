(function(){
  'use strict';
  var AUTH_KEY='pgm:spk-auth-v1';
  var state={token:'',user:null,roles:[],users:[],queue:null};
  var $=function(id){return document.getElementById(id)};
  var setupSignaturePad=null;
  var userSignaturePad=null;
  var pdfJsPromise=null;
  var sweetAlertPromise=null;

  function rpc(method){
    var args=Array.prototype.slice.call(arguments,1);
    return new Promise(function(resolve,reject){
      var runner=google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      runner[method].apply(runner,args);
    });
  }
  function loadSweetAlert(){
    if(window.Swal)return Promise.resolve(window.Swal);
    if(sweetAlertPromise)return sweetAlertPromise;
    sweetAlertPromise=new Promise(function(resolve,reject){
      var script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/sweetalert2@11';
      script.onload=function(){resolve(window.Swal);};script.onerror=function(){sweetAlertPromise=null;reject(new Error('Komponen notifikasi gagal dimuat.'));};document.head.appendChild(script);
    });
    return sweetAlertPromise;
  }
  async function showAlert(options){var alert=await loadSweetAlert();return alert.fire(options);}
  function alertError(message){return showAlert({icon:'error',title:'Tidak berhasil',text:message||'Terjadi kesalahan.',confirmButtonColor:'#b41420'}).catch(function(){window.alert(message||'Terjadi kesalahan.');});}
  function setBusy(value,title,detail){
    var busy=Boolean(value),overlay=$('busyOverlay');
    document.body.classList.toggle('loading',busy);
    overlay.hidden=!busy;
    if(title)$('busyTitle').textContent=title;
    if(detail)$('busyDetail').textContent=detail;
  }
  function setLoginBusy(value,message){
    var busy=Boolean(value),button=$('loginButton');
    button.disabled=busy;button.setAttribute('aria-busy',String(busy));
    button.querySelector('i').className=busy?'fa-solid fa-spinner':'fa-solid fa-right-to-bracket';
    button.querySelector('span').textContent=busy?'Mohon tunggu…':'Masuk ke Persetujuan';
    $('loginProgressText').textContent=message||'Memeriksa akun…';
    $('loginProgress').hidden=!busy;
  }
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}
  function savedAuth(){
    var raw=localStorage.getItem(AUTH_KEY),remember=true;
    if(!raw){raw=sessionStorage.getItem(AUTH_KEY);remember=false;}
    try{var auth=JSON.parse(raw||'null')||{};auth.remember=remember;return auth;}catch(e){return {};}
  }
  function saveAuth(token,user,remember){
    state.token=token;state.user=user;
    localStorage.removeItem(AUTH_KEY);sessionStorage.removeItem(AUTH_KEY);
    (remember?localStorage:sessionStorage).setItem(AUTH_KEY,JSON.stringify({token:token,user:user,remember:Boolean(remember)}));
  }
  function clearAuth(){state.token='';state.user=null;localStorage.removeItem(AUTH_KEY);sessionStorage.removeItem(AUTH_KEY);}
  function readFileAsDataUrl(file){
    return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(reader.result);};reader.onerror=function(){reject(new Error('File tanda tangan gagal dibaca.'));};reader.readAsDataURL(file);});
  }

  function loadPdfJs(){
    if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
    if(pdfJsPromise)return pdfJsPromise;
    pdfJsPromise=new Promise(function(resolve,reject){
      var script=document.createElement('script');
      script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload=function(){resolve(window.pdfjsLib);};
      script.onerror=function(){pdfJsPromise=null;reject(new Error('Pemroses PDF gagal dimuat. Periksa koneksi lalu coba kembali.'));};
      document.head.appendChild(script);
    });
    return pdfJsPromise;
  }

  async function pdfSignatureData(file){
    if(file.size>5000000)throw new Error('Ukuran PDF tanda tangan maksimal 5 MB.');
    await loadPdfJs();
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var documentTask=window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())});
    var pdf=await documentTask.promise;
    var page=await pdf.getPage(1);
    var viewport=page.getViewport({scale:1.5});
    var source=document.createElement('canvas');
    source.width=Math.ceil(viewport.width);source.height=Math.ceil(viewport.height);
    var sourceContext=source.getContext('2d',{willReadFrequently:true});
    sourceContext.fillStyle='#fff';sourceContext.fillRect(0,0,source.width,source.height);
    await page.render({canvasContext:sourceContext,viewport:viewport}).promise;

    // Area putih PDF dibuang agar tanda tangan tidak tampil sebagai satu
    // halaman A4. Batas non-putih dipotong lalu latarnya dibuat transparan.
    var image=sourceContext.getImageData(0,0,source.width,source.height);
    var pixels=image.data,minX=source.width,minY=source.height,maxX=-1,maxY=-1;
    for(var y=0;y<source.height;y+=1){
      for(var x=0;x<source.width;x+=1){
        var index=(y*source.width+x)*4;
        var isInk=pixels[index]<245||pixels[index+1]<245||pixels[index+2]<245;
        if(isInk){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
        else pixels[index+3]=0;
      }
    }
    if(maxX<minX||maxY<minY)throw new Error('Halaman pertama PDF tidak berisi tanda tangan yang dapat dibaca.');
    sourceContext.putImageData(image,0,0);
    var padding=16;
    minX=Math.max(0,minX-padding);minY=Math.max(0,minY-padding);
    maxX=Math.min(source.width-1,maxX+padding);maxY=Math.min(source.height-1,maxY+padding);
    var cropWidth=maxX-minX+1,cropHeight=maxY-minY+1;
    var scale=Math.min(1,900/cropWidth,350/cropHeight);
    var output=document.createElement('canvas');
    output.width=Math.max(1,Math.round(cropWidth*scale));output.height=Math.max(1,Math.round(cropHeight*scale));
    var outputContext=output.getContext('2d');
    outputContext.imageSmoothingEnabled=true;outputContext.imageSmoothingQuality='high';
    outputContext.drawImage(source,minX,minY,cropWidth,cropHeight,0,0,output.width,output.height);
    return output.toDataURL('image/png');
  }

  async function fileData(file){
    // FormData mengembalikan objek File kosong ketika pengguna tidak memilih
    // upload. Objek itu harus dianggap kosong agar hasil kanvas manual dipakai.
    if(!file||!file.name||file.size===0)return '';
    var type=String(file.type||'').toLowerCase();
    var isPdf=type==='application/pdf'||/\.pdf$/i.test(file.name);
    if(isPdf)return pdfSignatureData(file);
    if(type!=='image/png'&&type!=='image/jpeg'&&!/\.(png|jpe?g)$/i.test(file.name)){
      throw new Error('File tanda tangan harus berupa PNG, JPG, atau PDF.');
    }
    if(file.size>1000000)throw new Error('Ukuran gambar tanda tangan maksimal 1 MB.');
    return readFileAsDataUrl(file);
  }

  function createSignaturePad(canvas,clearButton){
    var context=canvas.getContext('2d'),drawing=false,hasInk=false,points=[];
    function configure(){
      context.lineWidth=2.15;
      context.lineCap='round';
      context.lineJoin='round';
      context.strokeStyle='#15171b';
      context.fillStyle='#15171b';
      context.imageSmoothingEnabled=true;
      if('imageSmoothingQuality' in context)context.imageSmoothingQuality='high';
    }
    function resize(){
      var rect=canvas.getBoundingClientRect();
      if(!rect.width)return;
      var ratio=Math.max(window.devicePixelRatio||1,1);
      canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);
      context.setTransform(ratio,0,0,ratio,0,0);configure();hasInk=false;points=[];
    }
    function point(event){var rect=canvas.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};}
    function addPoint(raw){
      var previous=points.length?points[points.length-1]:null;
      var next=raw;
      if(previous){
        // Titik yang bergerak sedikit mendapat penyaringan lebih kuat untuk
        // membuang getaran jari, sedangkan gerakan cepat tetap responsif.
        var distance=Math.hypot(raw.x-previous.x,raw.y-previous.y);
        var factor=distance>14?.62:(distance>6?.48:.34);
        next={x:previous.x+(raw.x-previous.x)*factor,y:previous.y+(raw.y-previous.y)*factor};
      }
      points.push(next);
      if(points.length<3)return;
      var a=points[points.length-3],b=points[points.length-2],c=points[points.length-1];
      var start={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      var end={x:(b.x+c.x)/2,y:(b.y+c.y)/2};
      context.beginPath();context.moveTo(start.x,start.y);context.quadraticCurveTo(b.x,b.y,end.x,end.y);context.stroke();
    }
    canvas.addEventListener('pointerdown',function(event){
      event.preventDefault();drawing=true;hasInk=true;points=[];canvas.setPointerCapture(event.pointerId);addPoint(point(event));
    });
    canvas.addEventListener('pointermove',function(event){
      if(!drawing)return;event.preventDefault();
      var samples=typeof event.getCoalescedEvents==='function'?event.getCoalescedEvents():[event];
      if(!samples.length)samples=[event];
      samples.forEach(function(sample){addPoint(point(sample));});
    });
    function stop(event){
      if(!drawing)return;drawing=false;
      if(points.length===1){context.beginPath();context.arc(points[0].x,points[0].y,context.lineWidth/2,0,Math.PI*2);context.fill();}
      else if(points.length>1){var last=points[points.length-1],before=points[points.length-2];context.beginPath();context.moveTo((before.x+last.x)/2,(before.y+last.y)/2);context.lineTo(last.x,last.y);context.stroke();}
      points=[];
      if(event&&canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    }
    canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('pointerleave',stop);
    function clear(){context.clearRect(0,0,canvas.width,canvas.height);hasInk=false;points=[];}
    clearButton.addEventListener('click',clear);
    resize();
    return{resize:resize,clear:clear,hasInk:function(){return hasInk;},dataUrl:function(){return hasInk?canvas.toDataURL('image/png'):'';}};
  }

  async function selectedSignatureData(file,pad,required){
    var uploaded=await fileData(file);
    var signature=uploaded||(pad&&pad.dataUrl())||'';
    if(required&&!signature)throw new Error('Upload atau gambar tanda tangan terlebih dahulu.');
    return signature;
  }

  async function loadBootstrapStatus(){
    try{var bootstrap=await rpc('getApprovalBootstrapStatus');state.roles=bootstrap.roles||[];$('showSetupButton').hidden=!bootstrap.needsBootstrap;}
    catch(error){console.warn('Status aktivasi belum dapat dimuat:',error);}
  }
  async function init(){
    bind();showLogin();loadBootstrapStatus();
    var auth=savedAuth();
    if(!auth.token)return;
    setLoginBusy(true,'Memulihkan sesi tersimpan…');
    try{
      var session=await rpc('getApprovalSession',auth.token);
      if(session&&session.status==='success'){saveAuth(auth.token,session.user,auth.remember);await showApp();return;}
      clearAuth();
    }catch(error){clearAuth();}
    finally{setLoginBusy(false);}
  }
  function bind(){
    setupSignaturePad=createSignaturePad($('setupSignaturePad'),$('clearSetupSignature'));
    userSignaturePad=createSignaturePad($('userSignaturePad'),$('clearUserSignature'));
    $('loginForm').addEventListener('submit',login);
    $('logoutButton').addEventListener('click',logout);
    $('showSetupButton').addEventListener('click',function(){$('loginView').hidden=true;$('setupView').hidden=false;window.setTimeout(function(){setupSignaturePad.resize();},0);});
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
  async function login(event){event.preventDefault();setLoginBusy(true,'Menghubungkan akun dengan sistem persetujuan…');try{var remember=$('rememberMe').checked;var response=await rpc('loginApprovalUser',$('loginEmail').value,$('loginPassword').value,remember);if(!response||response.status!=='success')throw new Error(response&&response.message);saveAuth(response.token,response.user,remember);$('loginPassword').value='';await showApp();}catch(error){alertError(error.message);}finally{setLoginBusy(false);}}
  function logout(){var token=state.token;clearAuth();showLogin();if(token)rpc('logoutApprovalUser',token).catch(function(){});}
  async function setup(event){event.preventDefault();setBusy(true,'Mengaktifkan akun','Tanda tangan dan data pengguna sedang disimpan…');try{var form=new FormData(event.currentTarget);var signature=await selectedSignatureData(form.get('signature'),setupSignaturePad,true);var response=await rpc('bootstrapApprovalAdmin',form.get('setupCode'),{email:form.get('email'),name:form.get('name'),password:form.get('password'),signatureData:signature,signatureName:form.get('name')});if(!response||response.status!=='success')throw new Error(response&&response.message);await showAlert({icon:'success',title:'Akun dibuat',text:'Silakan masuk memakai email dan password Admin PPIC.',confirmButtonColor:'#b41420'});event.currentTarget.reset();setupSignaturePad.clear();$('showSetupButton').hidden=true;showLogin();}catch(error){alertError(error.message);}finally{setBusy(false);}}
  async function showApp(){$('loginView').hidden=true;$('setupView').hidden=true;$('appView').hidden=false;$('userbar').hidden=false;$('currentName').textContent=state.user.name||state.user.email;$('currentRole').textContent=state.user.roleLabel||'';var isAdmin=state.user.roleKey==='admin_ppic';$('adminPanel').hidden=!isAdmin;$('queueList').innerHTML=queueSkeleton();var tasks=[loadQueue()];if(isAdmin)tasks.push(loadUsers().catch(function(error){alertError(error.message);}));await Promise.all(tasks);}
  function queueSkeleton(){return '<div class="queue-skeleton" aria-label="Memuat antrean SPK"><i></i><span></span><span></span></div><div class="queue-skeleton" aria-hidden="true"><i></i><span></span><span></span></div>';}
  async function loadQueue(){var refresh=$('refreshButton');refresh.disabled=true;refresh.classList.add('is-spinning');if(!state.queue)$('queueList').innerHTML=queueSkeleton();try{var response=await rpc('getApprovalQueue',state.token);if(!response||response.status!=='success')throw new Error(response&&response.message);state.queue=response;$('pendingCount').textContent=response.counts.pending;$('approvedCount').textContent=response.counts.approved;$('signatureState').textContent=response.signatureReady?'TERSEDIA':'BELUM ADA';$('signatureWarning').hidden=response.signatureReady;renderQueue(response.items||[],response.signatureReady);}catch(error){if(/sesi|login|akun/i.test(error.message||'')){clearAuth();showLogin();}alertError(error.message);}finally{refresh.disabled=false;refresh.classList.remove('is-spinning');}}
  function renderQueue(items,signatureReady){
    if(!items.length){$('queueList').innerHTML='<div class="empty">Belum ada SPK pada antrean jabatan ini.</div>';return;}
    $('queueList').innerHTML=items.map(function(item){
      var progress=item.progress||{approved:0,required:0};
      var width=progress.required?Math.round(progress.approved/progress.required*100):0;
      var pending=item.status==='MENUNGGU';
      var routes=(item.routing||[]).map(function(route){return '<span class="tag">'+escapeHtml(route)+'</span>';}).join('');
      return '<article class="queue-card"><div><h3><i class="fa-regular fa-file-lines" aria-hidden="true"></i> '+escapeHtml(item.spk)+'</h3><p>'+escapeHtml(item.customer||'Tanpa customer')+' · '+escapeHtml(item.article||'Tanpa artikel')+'</p><div>'+routes+'</div></div><div><span class="tag '+(item.approvalStatus==='SIAP_RELEASE'?'ok':'wait')+'">'+escapeHtml(item.approvalStatus.replace(/_/g,' '))+'</span><div class="progress"><i style="width:'+width+'%"></i></div><p>'+progress.approved+' dari '+progress.required+' persetujuan lengkap</p></div><div>'+(pending?'<button class="button primary" data-approve="'+escapeHtml(item.spk)+'" '+(signatureReady?'':'disabled')+'><i class="fa-solid fa-pen-nib" aria-hidden="true"></i> Setujui &amp; Paraf</button>':'<span class="state"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Disetujui<br><small>'+escapeHtml(item.signedAt)+'</small></span>')+'</div></article>';
    }).join('');
  }
  async function approve(spk){var confirmation=await showAlert({icon:'question',title:'Setujui SPK '+spk+'?',text:'Tanda tangan akun Anda akan dibubuhkan dan tindakan ini dicatat beserta waktu persetujuan.',showCancelButton:true,confirmButtonText:'Ya, setujui',cancelButtonText:'Batal',confirmButtonColor:'#b41420'});if(!confirmation.isConfirmed)return;setBusy(true,'Menyimpan persetujuan','Tanda tangan dan waktu persetujuan sedang dicatat…');try{var response=await rpc('approveSpk',state.token,spk);if(!response||response.status!=='success')throw new Error(response&&response.message);await showAlert({icon:'success',title:'Persetujuan tersimpan',text:response.message,confirmButtonColor:'#b41420'});await loadQueue();}catch(error){alertError(error.message);}finally{setBusy(false);}}
  async function loadUsers(){var response=await rpc('listApprovalUsers',state.token);if(!response||response.status!=='success')throw new Error(response&&response.message);state.users=response.users||[];state.roles=response.roles||state.roles;renderUsers();fillRoles();}
  function renderUsers(){$('userList').innerHTML=state.users.map(function(user){return '<article class="user-card"><div><h3><i class="fa-solid fa-user-shield" aria-hidden="true"></i> '+escapeHtml(user.name)+'</h3><p>'+escapeHtml(user.email)+'</p><p>'+escapeHtml(user.roleLabel)+' · TTD '+(user.signatureReady?'tersedia':'belum ada')+'</p><span class="state '+(user.active?'':'off')+'">'+(user.active?'AKTIF':'NONAKTIF')+'</span></div><button class="button ghost" data-user="'+escapeHtml(user.userId)+'"><i class="fa-solid fa-pen" aria-hidden="true"></i> Ubah</button></article>';}).join('')||'<div class="empty">Belum ada pengguna.</div>';}
  function fillRoles(){$('roleSelect').innerHTML=state.roles.map(function(role){return '<option value="'+escapeHtml(role.key)+'">'+escapeHtml(role.label)+'</option>';}).join('');}
  function openUser(user){var form=$('userForm');form.reset();userSignaturePad.clear();fillRoles();form.elements.userId.value=user?user.userId:'';form.elements.email.value=user?user.email:'';form.elements.name.value=user?user.name:'';form.elements.roleKey.value=user?user.roleKey:'head_blowing';form.elements.active.checked=user?user.active:true;form.elements.password.required=!user;$('userDialogTitle').textContent=user?'Ubah pengguna':'Tambah pengguna';$('userDialog').showModal();window.setTimeout(function(){userSignaturePad.resize();},0);}
  async function saveUser(event){event.preventDefault();var form=event.currentTarget;setBusy(true,'Menyimpan pengguna','Data akun dan tanda tangan sedang diperbarui…');try{var data=new FormData(form);var isNew=!data.get('userId');var signature=await selectedSignatureData(data.get('signature'),userSignaturePad,isNew);var payload={userId:data.get('userId'),email:data.get('email'),name:data.get('name'),roleKey:data.get('roleKey'),password:data.get('password'),active:form.elements.active.checked,signatureData:signature,signatureName:data.get('name')};var response=await rpc('saveApprovalUser',state.token,payload);if(!response||response.status!=='success')throw new Error(response&&response.message);$('userDialog').close();await loadUsers();await showAlert({icon:'success',title:'Pengguna tersimpan',text:response.message,confirmButtonColor:'#b41420'});}catch(error){alertError(error.message);}finally{setBusy(false);}}
  init();
})();
