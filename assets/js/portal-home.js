(function () {
  'use strict';
  var modules = [
    { key:'ppic:Dashboard', label:'Dashboard Operasional', description:'Pantau ringkasan SPK, status proses, dan indikator kinerja.', path:'/apps/spk-automation/dashboard/', icon:'chart', group:'Pemantauan' },
    { key:'ppic:PO & SPK', label:'PO & SPK', description:'Kelola surat perintah kerja dan data pesanan produksi.', path:'/apps/spk-automation/', icon:'clipboard', group:'Perencanaan' },
    { key:'ppic:Persetujuan SPK', label:'Persetujuan SPK', description:'Tinjau, setujui, dan lacak kelengkapan persetujuan SPK.', path:'/apps/spk-automation/approval/', icon:'approval', group:'Persetujuan' },
    { key:'ppic:Bahan & Tinta', label:'Bahan & Tinta', description:'Kelola master material, komposisi, tinta, dan kebutuhan proses.', path:'/apps/spk-automation/material-management/', icon:'flask', group:'Material' },
    { key:'ppic:Keluar Bahan', label:'Keluar Bahan', description:'Catat kesiapan, jadwal pembelian, dan pengeluaran material.', path:'/apps/spk-automation/material-issue/', icon:'material-out', group:'Material' },
    { key:'ppic:Schedule Produksi', label:'Jadwal Produksi', description:'Susun urutan kerja sebelum SPK dilepas menuju produksi.', path:'/apps/spk-automation/schedule/', icon:'calendar', group:'Perencanaan' },
    { key:'ppic:Produksi', label:'Hasil Produksi', description:'Input dan verifikasi hasil produksi pada setiap tahapan proses.', path:'/apps/spk-automation/production/', icon:'factory', group:'Produksi' },
    { key:'ppic:Penarikan Data', label:'Penarikan Data', description:'Ambil serta sinkronkan data operasional yang dibutuhkan.', path:'/apps/spk-automation/data-retrieval/', icon:'cloud-down', group:'Data' },
    { key:'ppic:Serah Terima', label:'Serah Terima', description:'Dokumentasikan perpindahan SPK dan pekerjaan antarbagian.', path:'/apps/spk-automation/handover/', icon:'transfer', group:'Distribusi' }
  ];
  var grid=document.getElementById('moduleGrid'),search=document.getElementById('portalSearch'),empty=document.getElementById('emptyState');
  function authData(){return window.POLYTA_PORTAL_AUTH&&window.POLYTA_PORTAL_AUTH.stored();}
  function canOpen(item,user){if(!user)return false;if(user.isOwner)return true;var menus=user.permissions&&user.permissions.menus||{};if(Object.prototype.hasOwnProperty.call(menus,item.key)&&menus[item.key]===false)return false;return window.POLYTA_PORTAL_AUTH.allowed(item.path,user.roleKey,user.permissions,user.isOwner);}
  function icon(name){return '<svg class="portal-icon" aria-hidden="true" focusable="false"><use href="#icon-'+name+'"></use></svg>';}
  function card(item,index){var link=document.createElement('a');link.className='module-card';link.href=item.path;link.style.animationDelay=Math.min(index*35,210)+'ms';link.dataset.search=(item.label+' '+item.description+' '+item.group).toLowerCase();link.innerHTML='<span class="module-top"><span class="module-icon">'+icon(item.icon)+'</span><span class="module-arrow">'+icon('chevron')+'</span></span><h3>'+item.label+'</h3><p>'+item.description+'</p><span class="module-tag">'+item.group+'</span>';return link;}
  function filter(){var query=String(search.value||'').trim().toLowerCase(),visible=0;Array.prototype.forEach.call(grid.children,function(item){var show=!query||item.dataset.search.indexOf(query)!==-1;item.hidden=!show;if(show)visible+=1;});empty.hidden=visible!==0;if(!visible){document.getElementById('emptyTitle').textContent=query?'Modul tidak ditemukan':'Belum ada modul tersedia';document.getElementById('emptyDescription').textContent=query?'Coba gunakan kata pencarian lain.':'Hubungi pengelola akses untuk membuka ruang kerja yang Anda perlukan.';}}
  function render(user){var available=modules.filter(function(item){return canOpen(item,user);});grid.textContent='';available.forEach(function(item,index){grid.appendChild(card(item,index));});filter();}
  search.addEventListener('input',filter);
  document.addEventListener('keydown',function(event){if(event.key==='/'&&!/input|textarea|select/i.test(document.activeElement.tagName)){event.preventDefault();search.focus();}if(event.key==='Escape'&&document.activeElement===search){search.value='';filter();search.blur();}});
  var cached=authData();if(cached&&cached.user)render(cached.user);
  if(window.POLYTA_PORTAL_AUTH&&window.POLYTA_PORTAL_AUTH.ready)window.POLYTA_PORTAL_AUTH.ready.then(function(user){if(user)render(user);});
})();
