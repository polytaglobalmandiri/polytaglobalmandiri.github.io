(function(){
  'use strict';
  var AUTH_KEY='pgm:spk-auth-v1';
  var state={token:'',user:null,roles:[],users:[],queue:null};
  var $=function(id){return document.getElementById(id)};
  var setupSignaturePad=null;
  var userSignaturePad=null;
  var pdfJsPromise=null;
  var sweetAlertPromise=null;
  var busyDepth=0;
  var busyPaused=false;
  var previewSpk='';
  var previewFrameSpk='';
  var previewFrameLoaded=false;
  var previewPackageReady=false;
  var previewPackageMessage='';
  var previewWaitTimer=0;
  var loginBusy=false;
  var queueLoadPromise=null;

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
      var script=document.createElement('script');script.src='/assets/vendor/sweetalert2/sweetalert2-11.26.25.all.min.js';
      script.onload=function(){resolve(window.Swal);};script.onerror=function(){sweetAlertPromise=null;reject(new Error('Komponen notifikasi gagal dimuat.'));};document.head.appendChild(script);
    });
    return sweetAlertPromise;
  }
  async function showAlert(options){
    var alert=await loadSweetAlert();
    var wasPaused=busyPaused;
    busyPaused=true;applyBusy();
    try{return await alert.fire(options);}
    finally{busyPaused=wasPaused;applyBusy();}
  }
  function alertError(message){return showAlert({icon:'error',title:'Tidak berhasil',text:message||'Terjadi kesalahan.',confirmButtonColor:'#b41420'}).catch(function(){window.alert(message||'Terjadi kesalahan.');});}
  // Satu penanda proses per layar. Di ruang kerja dipakai overlay; di halaman login
  // cukup tombolnya, sehingga overlay ditahan selama proses login berjalan.
  // Kedalaman dihitung supaya alur bersarang (login -> showApp -> loadQueue)
  // tidak mematikan penanda lebih awal.
  function applyBusy(){
    var busy=busyDepth>0&&!busyPaused&&!loginBusy;
    document.body.classList.toggle('loading',busy);
    $('busyOverlay').hidden=!busy;
  }
  function setLoginBusy(value){
    loginBusy=Boolean(value);
    var button=$('loginButton');
    button.disabled=loginBusy;
    button.setAttribute('aria-busy',String(loginBusy));
    button.querySelector('i').className=loginBusy?'fa-solid fa-spinner':'fa-solid fa-right-to-bracket';
    button.querySelector('span').textContent=loginBusy?'Mohon tunggu…':'Masuk ke Persetujuan';
    applyBusy();
  }
  function setBusy(value,title,detail){
    busyDepth=Math.max(0,busyDepth+(value?1:-1));
    if(value&&title)$('busyTitle').textContent=title;
    if(value&&detail)$('busyDetail').textContent=detail;
    applyBusy();
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

  async function loadBootstrapStatus(){
    try{var bootstrap=await rpc('getApprovalBootstrapStatus');state.roles=bootstrap.roles||[];$('showSetupButton').hidden=!bootstrap.needsBootstrap;}
    catch(error){console.warn('Status aktivasi belum dapat dimuat:',error);}
  }
  async function init(){
    bind();showLogin();loadBootstrapStatus();
    var auth=savedAuth();
    if(!auth.token)return;
    setLoginBusy(true);
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
    $('queueList').addEventListener('click',function(event){
      var approveButton=event.target.closest('[data-approve]');
      if(approveButton){approve(approveButton.dataset.approve);return;}
      var previewButton=event.target.closest('[data-preview]');
      if(previewButton){openPreview(previewButton.dataset.preview);return;}
      var card=event.target.closest('.queue-card');
      if(!card||!card.dataset.spk)return;
      // Menyorot teks pada kartu berakhir dengan peristiwa klik juga. Tanpa
      // pemeriksaan ini, menyalin nama customer selalu membuka pratinjau.
      var selection=window.getSelection&&window.getSelection();
      if(selection&&!selection.isCollapsed)return;
      openPreview(card.dataset.spk);
    });
    $('closePreviewDialog').addEventListener('click',closePreview);
    $('previewDialog').addEventListener('close',releasePreviewFrame);
    $('previewApprove').addEventListener('click',approveFromPreview);
    $('previewRetry').addEventListener('click',retryPreview);
    window.addEventListener('message',handlePreviewMessage);
    $('userList').addEventListener('click',function(event){var button=event.target.closest('[data-user]');if(button)openUser(state.users.find(function(u){return u.userId===button.dataset.user;}));});
  }
  function showLogin(){$('loginView').hidden=false;$('setupView').hidden=true;$('appView').hidden=true;$('userbar').hidden=true;}
  async function login(event){event.preventDefault();setLoginBusy(true);try{var remember=$('rememberMe').checked;var response=await rpc('loginApprovalUser',$('loginEmail').value,$('loginPassword').value,remember);if(!response||response.status!=='success')throw new Error(response&&response.message);saveAuth(response.token,response.user,remember);$('loginPassword').value='';await showApp();}catch(error){$('loginPassword').value='';await alertError(error.message);$('loginEmail').focus();}finally{setLoginBusy(false);}}
  function logout(){var token=state.token;clearAuth();showLogin();if(token)rpc('logoutApprovalUser',token).catch(function(){});}
  async function setup(event){event.preventDefault();setBusy(true,'Mengaktifkan akun','Tanda tangan dan data pengguna sedang disimpan…');try{var form=new FormData(event.currentTarget);var signature=await selectedSignatureData(form.get('signature'),setupSignaturePad,true);var response=await rpc('bootstrapApprovalAdmin',form.get('setupCode'),{email:form.get('email'),name:form.get('name'),password:form.get('password'),signatureData:signature,signatureName:form.get('name')});if(!response||response.status!=='success')throw new Error(response&&response.message);await showAlert({icon:'success',title:'Akun dibuat',text:'Silakan masuk memakai email dan password Admin PPIC.',confirmButtonColor:'#b41420'});event.currentTarget.reset();setupSignaturePad.clear();$('showSetupButton').hidden=true;showLogin();}catch(error){alertError(error.message);}finally{setBusy(false);}}
  async function showApp(){$('loginView').hidden=true;$('setupView').hidden=true;$('appView').hidden=false;$('userbar').hidden=false;$('currentName').textContent=state.user.name||state.user.email;$('currentRole').textContent=state.user.roleLabel||'';var isAdmin=state.user.roleKey==='admin_ppic';$('adminPanel').hidden=!isAdmin;var tasks=[loadQueue()];if(isAdmin)tasks.push(loadUsers().catch(function(error){alertError(error.message);}));await Promise.all(tasks);}
  function loadQueue(){
    // Satu permintaan antrean pada satu waktu. Klik Muat ulang berulang
    // sebelumnya dapat membuat respons yang lebih lama datang belakangan dan
    // menimpa status terbaru yang baru saja ditampilkan.
    if(queueLoadPromise)return queueLoadPromise;
    queueLoadPromise=(async function(){
      setBusy(true,'Memuat antrean','Daftar SPK yang menunggu persetujuan sedang diambil…');
      try{
        var response=await rpc('getApprovalQueue',state.token);
        if(!response||response.status!=='success')throw new Error(response&&response.message);
        state.queue=response;
        $('pendingCount').textContent=response.counts.pending;
        $('approvedCount').textContent=response.counts.approved;
        $('signatureState').textContent=response.signatureReady?'TERSEDIA':'BELUM ADA';
        $('signatureWarning').hidden=response.signatureReady;
        renderQueue(response.items||[],response.signatureReady);
      }catch(error){
        if(/sesi|login|akun/i.test(error.message||'')){clearAuth();showLogin();}
        await alertError(error.message);
      }finally{
        setBusy(false);
        queueLoadPromise=null;
      }
    })();
    return queueLoadPromise;
  }
  // Lembar cetak ditampilkan lewat halaman cetak yang sudah ada, disematkan
  // dengan embed=1 supaya kerangkanya berganti menjadi bilah tab per alur.
  // Halaman itu membaca tokennya sendiri dari penyimpanan yang sama, jadi
  // tidak ada yang perlu dioper lewat URL.
  function openPreview(spk){
    if(!spk)return;
    var samePackage=previewFrameLoaded&&previewFrameSpk===spk;
    if(!samePackage)previewPackageReady=false;
    previewSpk=spk;
    previewPackageMessage='';
    $('previewTitle').textContent=spk;
    renderPreviewFoot(spk);
    $('previewDialog').showModal();

    if(samePackage){setPreviewLoading(false);renderPreviewFoot(spk);return;}
    setPreviewLoading(true);
    if(previewFrameLoaded){
      // Dokumen cetaknya sudah hidup; menukar nomor SPK lewat pesan jauh lebih
      // murah daripada memuat ulang halaman 180 KB beserta seluruh gayanya.
      $('previewFrame').contentWindow.postMessage(
        {source:'pgm-spk-preview-host',spk:spk},window.location.origin);
    }else{
      $('previewFrame').src='/apps/spk-automation/print-spk/?spk='+encodeURIComponent(spk)+'&mode=view&embed=1&preview=20260827-2';
    }
  }
  // Menyetujui SPK mengubah tanda tangan dan statusnya, sehingga paket yang
  // tersimpan di dokumen cetak menjadi basi dan harus digugurkan.
  function invalidatePreviewCache(){
    if(!previewFrameLoaded)return;
    previewFrameSpk='';
    $('previewFrame').contentWindow.postMessage(
      {source:'pgm-spk-preview-host',action:'invalidate',spk:'*'},window.location.origin);
  }
  // Apps Script dapat tetap bekerja lebih dari 45 detik saat paket memuat
  // banyak tanda tangan. Timer di sini hanya memperbarui keterangan; kegagalan
  // harus datang dari permintaan sebenarnya, bukan dari perkiraan frontend.
  var PREVIEW_SLOW_NOTICE=20000;
  var PREVIEW_LONG_NOTICE=90000;
  function setPreviewLoading(value,note){
    window.clearTimeout(previewWaitTimer);
    $('previewLoading').hidden=!value;
    if(!value)return;
    $('previewSpinner').hidden=false;
    $('previewRetry').hidden=true;
    $('previewLoadingTitle').textContent='Menyiapkan lembar';
    $('previewLoadingNote').textContent=note||'Paket SPK sedang diambil…';
    previewWaitTimer=window.setTimeout(function(){
      $('previewLoadingTitle').textContent='Server sedang menyiapkan data';
      $('previewLoadingNote').textContent='Tanda tangan dan lembar SPK sedang dirangkai. Dialog ini boleh tetap terbuka.';
      previewWaitTimer=window.setTimeout(function(){
        $('previewLoadingTitle').textContent='Masih diproses';
        $('previewLoadingNote').textContent='Permintaan tetap berjalan dan lembar akan muncul otomatis setelah siap.';
      },PREVIEW_LONG_NOTICE-PREVIEW_SLOW_NOTICE);
    },PREVIEW_SLOW_NOTICE);
  }
  function showPreviewProblem(message){
    window.clearTimeout(previewWaitTimer);
    $('previewLoading').hidden=false;
    $('previewSpinner').hidden=true;
    $('previewRetry').hidden=false;
    $('previewLoadingTitle').textContent='Lembar belum dapat ditampilkan';
    $('previewLoadingNote').textContent=message||'Lembar gagal dimuat.';
  }
  function retryPreview(){
    if(!previewSpk)return;
    setPreviewLoading(true,'Mencoba mengambil ulang…');
    if(previewFrameLoaded){
      $('previewFrame').contentWindow.postMessage(
        {source:'pgm-spk-preview-host',spk:previewSpk},window.location.origin);
    }else{
      $('previewFrame').src='/apps/spk-automation/print-spk/?spk='+encodeURIComponent(previewSpk)+'&mode=view&embed=1&preview=20260827-2';
    }
  }
  // Halaman cetak mengabari saat paketnya selesai dirender atau gagal.
  function handlePreviewMessage(event){
    if(event.origin!==window.location.origin)return;
    if(event.source!==$('previewFrame').contentWindow)return;
    var data=event.data;
    if(!data||data.source!=='pgm-spk-preview')return;
    previewFrameLoaded=true;
    // Respons lama dapat tiba setelah pengguna menutup dialog atau berpindah
    // ke SPK lain. Jangan biarkan respons itu mematikan loader dokumen aktif.
    if(!previewSpk||String(data.spk||'')!==previewSpk)return;
    // Gagal berarti tidak ada lembar yang tersaji, jadi SPK-nya tidak dicatat
    // sebagai tersaji. Tanpa itu, membuka SPK yang sama lagi akan dianggap
    // sudah siap dan hanya memperlihatkan kartu error yang basi.
    if(data.state==='error'){previewFrameSpk='';previewPackageReady=false;showPreviewProblem(data.message);return;}
    previewFrameSpk=data.spk||'';
    if(data.state==='content'){
      previewPackageReady=false;
      previewPackageMessage='Lembar sudah dapat diperiksa. Tanda tangan sedang dimuat di belakang layar…';
      setPreviewLoading(false);
      renderPreviewFoot(previewSpk);
      return;
    }
    if(data.state==='signature-error'){
      previewPackageReady=false;
      previewPackageMessage=data.message||'Tanda tangan belum berhasil dimuat. Tutup lalu buka kembali lembar untuk mencoba lagi.';
      setPreviewLoading(false);
      renderPreviewFoot(previewSpk);
      return;
    }
    previewPackageReady=true;
    previewPackageMessage='';
    setPreviewLoading(false);
    renderPreviewFoot(previewSpk);
  }
  // Tindakan persetujuan hanya ditawarkan bila SPK ini memang menunggu giliran
  // pengguna dan tanda tangannya sudah tersedia; keadaannya diambil dari
  // antrean yang sudah dimuat, bukan ditanyakan ulang ke server.
  function renderPreviewFoot(spk){
    var queue=state.queue||{};
    var item=(queue.items||[]).find(function(entry){return entry.spk===spk;});
    var pending=Boolean(item&&item.status==='MENUNGGU');
    var ready=Boolean(queue.signatureReady);
    $('previewFoot').hidden=!pending&&!previewPackageMessage;
    $('previewApprove').hidden=!pending;
    if(previewPackageMessage){
      $('previewApprove').disabled=true;
      $('previewNote').textContent=previewPackageMessage;
      return;
    }
    if(!pending)return;
    $('previewApprove').disabled=!ready||!previewPackageReady;
    $('previewNote').textContent=!previewPackageReady
      ?'Lembar sudah tampil. Tunggu sebentar sampai seluruh tanda tangan selesai dimuat.'
      :ready
      ?'Periksa seluruh tab sebelum menyetujui. Tanda tangan dan waktu persetujuan akan dicatat.'
      :'Tanda tangan akun Anda belum tersedia, jadi persetujuan belum dapat dilakukan.';
  }
  function closePreview(){$('previewDialog').close();}
  // Dialog konfirmasi dan overlay loader keduanya anak <body>. Selama <dialog>
  // native terbuka, keduanya berada di bawah top layer sehingga tak terlihat
  // dan tak dapat diklik. Maka pratinjau ditutup lebih dulu, baru alur
  // persetujuan yang sudah ada dijalankan seperti dari kartu antrean.
  async function approveFromPreview(){
    var spk=previewSpk;
    closePreview();
    if(!spk)return;
    // Dibatalkan berarti pengguna belum selesai memeriksa, jadi lembarnya
    // dikembalikan alih-alih meninggalkannya di antrean.
    if(!await approve(spk))openPreview(spk);
  }
  // Dokumen cetaknya sengaja dibiarkan hidup setelah ditutup. Membuangnya
  // berarti mengurai ulang seluruh halaman pada pratinjau berikutnya, sedangkan
  // menampilkan SPK lama sudah dicegah oleh penanda memuat di atas iframe.
  function releasePreviewFrame(){previewSpk='';window.clearTimeout(previewWaitTimer);}
  function renderQueue(items,signatureReady){
    if(!items.length){$('queueList').innerHTML='<div class="empty">Belum ada SPK pada antrean jabatan ini.</div>';return;}
    $('queueList').innerHTML=items.map(function(item){
      var progress=item.progress||{approved:0,required:0};
      var width=progress.required?Math.round(progress.approved/progress.required*100):0;
      var pending=item.status==='MENUNGGU';
      var routes=(item.routing||[]).map(function(route){return '<span class="tag">'+escapeHtml(route)+'</span>';}).join('');
      return '<article class="queue-card" data-spk="'+escapeHtml(item.spk)+'"><div><h3><i class="fa-regular fa-file-lines" aria-hidden="true"></i> '+escapeHtml(item.spk)+'</h3><p>'+escapeHtml(item.customer||'Tanpa customer')+' · '+escapeHtml(item.article||'Tanpa artikel')+'</p><div>'+routes+'</div></div><div><span class="tag '+(item.approvalStatus==='SIAP_RELEASE'?'ok':'wait')+'">'+escapeHtml(item.approvalStatus.replace(/_/g,' '))+'</span><div class="progress"><i style="width:'+width+'%"></i></div><p>'+progress.approved+' dari '+progress.required+' persetujuan lengkap</p></div><div>'+'<button class="button ghost" data-preview="'+escapeHtml(item.spk)+'" type="button"><i class="fa-solid fa-file-lines" aria-hidden="true"></i> Lihat lembar</button>'+(pending?'<button class="button primary" data-approve="'+escapeHtml(item.spk)+'" '+(signatureReady?'':'disabled')+'><i class="fa-solid fa-pen-nib" aria-hidden="true"></i> Setujui &amp; Paraf</button>':'<span class="state"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Disetujui<br><small>'+escapeHtml(item.signedAt)+'</small></span>')+'</div></article>';
    }).join('');
  }
  // Mengembalikan true hanya bila persetujuan benar-benar tersimpan.
  async function approve(spk){var confirmation=await showAlert({icon:'question',title:'Setujui SPK '+spk+'?',text:'Tanda tangan akun Anda akan dibubuhkan dan tindakan ini dicatat beserta waktu persetujuan.',showCancelButton:true,confirmButtonText:'Ya, setujui',cancelButtonText:'Batal',confirmButtonColor:'#b41420'});if(!confirmation.isConfirmed)return false;setBusy(true,'Menyimpan persetujuan','Tanda tangan dan waktu persetujuan sedang dicatat…');try{var response=await rpc('approveSpk',state.token,spk);if(!response||response.status!=='success')throw new Error(response&&response.message);await showAlert({icon:'success',title:'Persetujuan tersimpan',text:response.message,confirmButtonColor:'#b41420'});invalidatePreviewCache();await loadQueue();return true;}catch(error){alertError(error.message);return false;}finally{setBusy(false);}}
  async function loadUsers(){var response=await rpc('listApprovalUsers',state.token);if(!response||response.status!=='success')throw new Error(response&&response.message);state.users=response.users||[];state.roles=response.roles||state.roles;renderUsers();fillRoles();}
  function renderUsers(){$('userList').innerHTML=state.users.map(function(user){return '<article class="user-card"><div><h3><i class="fa-solid fa-user-shield" aria-hidden="true"></i> '+escapeHtml(user.name)+'</h3><p>'+escapeHtml(user.email)+'</p><p>'+escapeHtml(user.roleLabel)+' · TTD '+(user.signatureReady?'tersedia':'belum ada')+'</p><span class="state '+(user.active?'':'off')+'">'+(user.active?'AKTIF':'NONAKTIF')+'</span></div><button class="button ghost" data-user="'+escapeHtml(user.userId)+'"><i class="fa-solid fa-pen" aria-hidden="true"></i> Ubah</button></article>';}).join('')||'<div class="empty">Belum ada pengguna.</div>';}
  function fillRoles(){$('roleSelect').innerHTML=state.roles.map(function(role){return '<option value="'+escapeHtml(role.key)+'">'+escapeHtml(role.label)+'</option>';}).join('');}
  function openUser(user){var form=$('userForm');form.reset();userSignaturePad.clear();fillRoles();form.elements.userId.value=user?user.userId:'';form.elements.email.value=user?user.email:'';form.elements.name.value=user?user.name:'';form.elements.roleKey.value=user?user.roleKey:'head_blowing';form.elements.active.checked=user?user.active:true;form.elements.password.required=!user;$('userDialogTitle').textContent=user?'Ubah pengguna':'Tambah pengguna';$('userDialog').showModal();window.setTimeout(function(){userSignaturePad.resize();},0);}
  async function saveUser(event){event.preventDefault();var form=event.currentTarget;setBusy(true,'Menyimpan pengguna','Data akun dan tanda tangan sedang diperbarui…');try{var data=new FormData(form);var isNew=!data.get('userId');var signature=await selectedSignatureData(data.get('signature'),userSignaturePad,isNew);var payload={userId:data.get('userId'),email:data.get('email'),name:data.get('name'),roleKey:data.get('roleKey'),password:data.get('password'),active:form.elements.active.checked,signatureData:signature,signatureName:data.get('name')};var response=await rpc('saveApprovalUser',state.token,payload);if(!response||response.status!=='success')throw new Error(response&&response.message);$('userDialog').close();await loadUsers();await showAlert({icon:'success',title:'Pengguna tersimpan',text:response.message,confirmButtonColor:'#b41420'});}catch(error){alertError(error.message);}finally{setBusy(false);}}
  init();
})();
