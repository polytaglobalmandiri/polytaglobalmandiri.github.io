(function(){
  'use strict';
  var KEY='pgm:spk-auth-v1';
  var state={token:'',users:[],roles:[],accessCatalog:{pages:[],menus:[],methods:[]},query:''};
  var userSignaturePad=null,pdfJsPromise=null;
  var $=function(id){return document.getElementById(id);};
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}
  function rpc(method){var args=[].slice.call(arguments,1);return new Promise(function(resolve,reject){var runner=google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);runner[method].apply(runner,args);});}
  function showAlert(options){setBusy(false);if(window.Swal)return window.Swal.fire(options);window.alert(options.text||options.title||'Selesai');return Promise.resolve();}
  function alertError(message){return showAlert({icon:'error',title:'Tidak berhasil',text:message||'Terjadi kesalahan.'});}
  function setBusy(value,title,detail){document.body.classList.toggle('loading',Boolean(value));$('busyOverlay').hidden=!value;if(title)$('busyTitle').textContent=title;if(detail)$('busyDetail').textContent=detail;}
  function readFileAsDataUrl(file){
    return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(reader.result);};reader.onerror=function(){reject(new Error('File tanda tangan gagal dibaca.'));};reader.readAsDataURL(file);});
  }

  function loadPdfJs(){
    if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
    if(pdfJsPromise)return pdfJsPromise;
    pdfJsPromise=new Promise(function(resolve,reject){
      var script=document.createElement('script');
      script.src='/assets/vendor/pdfjs/pdf-3.11.174.min.js';
      script.onload=function(){resolve(window.pdfjsLib);};
      script.onerror=function(){pdfJsPromise=null;reject(new Error('Pemroses PDF gagal dimuat. Periksa koneksi lalu coba kembali.'));};
      document.head.appendChild(script);
    });
    return pdfJsPromise;
  }

  async function pdfSignatureData(file){
    if(file.size>5000000)throw new Error('Ukuran PDF tanda tangan maksimal 5 MB.');
    await loadPdfJs();
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='/assets/vendor/pdfjs/pdf.worker-3.11.174.min.js';
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

  async function loadUsers(renderResult){var response=await rpc('listApprovalUsers',state.token);if(!response||response.status!=='success')throw new Error(response&&response.message);state.users=response.users||[];state.roles=response.roles||state.roles;state.accessCatalog=response.accessCatalog||state.accessCatalog;if(renderResult!==false){renderUsers();fillRoles();}}
  function renderUsers(){
    var query=String(state.query||'').toLowerCase();
    var users=state.users.filter(function(user){return !query||[user.name,user.email,user.roleLabel,user.department].join(' ').toLowerCase().indexOf(query)!==-1;});
    $('totalUsers').textContent=state.users.length;
    $('activeUsers').textContent=state.users.filter(function(user){return user.active;}).length;
    $('roleCount').textContent=new Set(state.users.map(function(user){return user.roleKey;})).size;
    $('userList').innerHTML=users.map(function(user){
      var initial=String(user.name||user.email||'P').trim().charAt(0).toUpperCase();
      return '<article class="user-card"><span class="user-avatar">'+escapeHtml(initial)+'</span><div class="user-info"><h3>'+escapeHtml(user.name)+'</h3><p>'+escapeHtml(user.email)+'</p><div class="user-meta"><span class="state '+(user.active?'':'off')+'">'+(user.active?'Aktif':'Nonaktif')+'</span><span class="role-pill">'+escapeHtml(user.isOwner?'Master · '+user.roleLabel:user.roleLabel)+'</span></div></div><button class="edit-user" type="button" data-user="'+escapeHtml(user.userId)+'" aria-label="Ubah '+escapeHtml(user.name)+'"><i class="fa-solid fa-pen" aria-hidden="true"></i></button></article>';
    }).join('')||'<div class="empty">'+(query?'Tidak ada pengguna yang cocok dengan pencarian.':'Belum ada pengguna.')+'</div>';
  }
  function fillRoles(){$('roleSelect').innerHTML=state.roles.map(function(role){return '<option value="'+escapeHtml(role.key)+'">'+escapeHtml(role.label)+'</option>';}).join('');}
  function permissionAction(method,item){if(item&&item.action)return item.action;if(/^(get|list|check)/.test(method))return 'read';if(/^(save|submit|begin|extract)/.test(method))return 'create';if(/^(update|acknowledge)/.test(method))return 'update';if(/^(delete|remove)/.test(method))return 'delete';if(/^(cancel|reject)/.test(method))return 'cancel';return 'approve';}
  function actionLabel(action){return{read:'Lihat / baca',create:'Tambah / simpan',update:'Edit / perbarui',delete:'Hapus',cancel:'Batalkan / kembalikan',approve:'Setujui / rilis'}[action]||'Tindakan';}
  function permissionRow(group,item,value,description){var stateValue=value==null?'default':value===true?'allow':'deny';return '<label class="permission-row"><span class="permission-copy"><strong>'+escapeHtml(item.label)+'</strong><small>'+escapeHtml(description||item.path||item.key)+'</small></span><select data-permission-group="'+group+'" data-permission-key="'+escapeHtml(item.key)+'" data-state="'+stateValue+'"><option value="default"'+(value==null?' selected':'')+'>Ikuti jabatan</option><option value="allow"'+(value===true?' selected':'')+'>Izinkan</option><option value="deny"'+(value===false?' selected':'')+'>Blokir</option></select></label>';}
  function permissionGroup(title,icon,rows,count,open){return '<details class="permission-group"'+(open?' open':'')+'><summary><span><i class="fa-solid '+icon+'" aria-hidden="true"></i>'+escapeHtml(title)+'</span><b>'+count+'</b></summary><div class="permission-rows">'+rows+'</div></details>';}
  function renderPermissionEditor(user){
    var permissions=user&&user.permissions||{pages:{},menus:{},methods:{}};
    var pages=state.accessCatalog.pages||[],menus=state.accessCatalog.menus||[],methods=state.accessCatalog.methods||[];
    var html='<p class="permission-intro"><strong>Ikuti jabatan</strong> memakai izin standar sesuai peran. Gunakan <strong>Izinkan</strong> atau <strong>Blokir</strong> hanya sebagai pengecualian untuk pengguna ini.</p><div class="permission-legend"><span>Halaman = dapat membuka</span><span>Modul = tampil di portal</span><span>Data = tindakan di dalam aplikasi</span></div>';
    html+=permissionGroup('Akses halaman','fa-window-maximize',pages.map(function(item){return permissionRow('pages',item,permissions.pages&&permissions.pages[item.key],(item.module||'Portal')+' · '+item.key);}).join(''),pages.length,true);
    html+=permissionGroup('Modul di portal','fa-table-cells-large',menus.map(function(item){return permissionRow('menus',item,permissions.menus&&permissions.menus[item.key],item.path);}).join(''),menus.length,false);
    var modules={};methods.forEach(function(item){var module=item.module||'Operasional';(modules[module]||(modules[module]=[])).push(item);});
    Object.keys(modules).sort().forEach(function(module){var items=modules[module];var rows=items.map(function(item){return permissionRow('methods',item,permissions.methods&&permissions.methods[item.key],actionLabel(permissionAction(item.key,item)));}).join('');html+=permissionGroup('Data · '+module,'fa-database',rows,items.length,false);});
    $('permissionEditor').innerHTML=html;
  }
  function openUser(user){var form=$('userForm');form.reset();userSignaturePad.clear();fillRoles();form.elements.userId.value=user?user.userId:'';form.elements.email.value=user?user.email:'';form.elements.name.value=user?user.name:'';form.elements.roleKey.value=user?user.roleKey:'head_blowing';form.elements.active.checked=user?user.active:true;form.elements.password.required=!user;renderPermissionEditor(user);$('userDialogTitle').textContent=user?'Ubah pengguna':'Tambah pengguna';$('userDialog').showModal();window.setTimeout(function(){userSignaturePad.resize();},0);}
  async function saveUser(event){event.preventDefault();var form=event.currentTarget;setBusy(true,'Menyimpan pengguna','Data akun dan tanda tangan sedang diperbarui…');try{var data=new FormData(form);var isNew=!data.get('userId');var signature=await selectedSignatureData(data.get('signature'),userSignaturePad,isNew);var permissions={pages:{},menus:{},methods:{}};$('permissionEditor').querySelectorAll('select[data-permission-group]').forEach(function(select){if(select.value!=='default')permissions[select.dataset.permissionGroup][select.dataset.permissionKey]=select.value==='allow';});var payload={userId:data.get('userId'),email:data.get('email'),name:data.get('name'),roleKey:data.get('roleKey'),password:data.get('password'),active:form.elements.active.checked,signatureData:signature,signatureName:data.get('name'),permissions:permissions};var response=await rpc('saveApprovalUser',state.token,payload);if(!response||response.status!=='success')throw new Error(response&&response.message);$('userDialog').close();await loadUsers();await showAlert({icon:'success',title:'Pengguna tersimpan',text:response.message,confirmButtonColor:'#b41420'});}catch(error){alertError(error.message);}finally{setBusy(false);}}
  async function init(){
    var auth;
    try{auth=JSON.parse(sessionStorage.getItem(KEY)||localStorage.getItem(KEY)||'null');}catch(ignore){}
    if(!auth||!auth.token){location.replace('/login/?next='+encodeURIComponent(location.pathname));return;}
    state.token=auth.token;
    userSignaturePad=createSignaturePad($('userSignaturePad'),$('clearUserSignature'));
    $('newUserButton').addEventListener('click',function(){openUser();});
    $('closeUserDialog').addEventListener('click',function(){$('userDialog').close();});
    $('cancelUser').addEventListener('click',function(){$('userDialog').close();});
    $('userForm').addEventListener('submit',saveUser);
    $('userSearch').addEventListener('input',function(event){state.query=event.target.value;renderUsers();});
    $('permissionEditor').addEventListener('change',function(event){if(event.target.matches('select[data-permission-group]'))event.target.dataset.state=event.target.value;});
    $('userList').addEventListener('click',function(event){var button=event.target.closest('[data-user]');if(button)openUser(state.users.find(function(user){return user.userId===button.dataset.user;}));});
    var verification=window.POLYTA_PORTAL_AUTH&&window.POLYTA_PORTAL_AUTH.ready
      ? window.POLYTA_PORTAL_AUTH.ready
      : rpc('getApprovalSession',state.token).then(function(result){return result.user;});
    var results=await Promise.allSettled([verification,loadUsers(false)]);
    var user=results[0].status==='fulfilled'&&results[0].value;
    if(!user||!user.isOwner)return;
    if(results[1].status==='rejected')$('userList').textContent=results[1].reason&&results[1].reason.message||'Panel tidak dapat dimuat.';
    else{renderUsers();fillRoles();}
  }
  init();
})();
