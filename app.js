const $ = s => document.querySelector(s);
const app = $('#app');
let tab='home';
let students = JSON.parse(localStorage.getItem('ag_students')||'[]');
let attendance = JSON.parse(localStorage.getItem('ag_attendance')||'{}');
let files = [];\nlet db;\nconst dbReady = new Promise((resolve,reject)=>{const req=indexedDB.open('AsistenGuruDB',1);req.onupgradeneeded=()=>req.result.createObjectStore('files',{keyPath:'id',autoIncrement:true});req.onsuccess=()=>{db=req.result;loadFiles().then(resolve)};req.onerror=()=>reject(req.error)});\nfunction tx(mode='readonly'){return db.transaction('files',mode).objectStore('files');}\nfunction loadFiles(){return new Promise(resolve=>{const r=tx().getAll();r.onsuccess=()=>{files=r.result||[];resolve(files)};r.onerror=()=>resolve([])})}
const today = () => new Date().toLocaleDateString('en-CA');
const key = (name, date=today()) => `${date}|${name}`;
const save = () => { localStorage.setItem('ag_students',JSON.stringify(students)); localStorage.setItem('ag_attendance',JSON.stringify(attendance)); };
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setTab(t){tab=t;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));render();}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
function render(){
 if(tab==='home') home(); if(tab==='students') studentPage(); if(tab==='attendance') attendancePage(); if(tab==='files') filePage(); if(tab==='report') reportPage();
}
function home(){
 app.innerHTML=`<h1>Selamat datang, Bapak/Ibu Guru!</h1><p class="muted">Ringkasan administrasi kelas</p>
 <div class="stats"><div class="stat"><b>${students.length}</b><span>Jumlah siswa</span></div><div class="stat"><b>${Object.keys(attendance).filter(k=>k.startsWith(today()+'|')).length}</b><span>Absensi hari ini</span></div><div class="stat"><b>${files.length}</b><span>File tersimpan</span></div><div class="stat"><b>4</b><span>Status absensi</span></div></div>
 <div class="card"><h2>Menu cepat</h2><div class="row"><button onclick="setTab('students')">＋ Tambah siswa</button><button class="secondary" onclick="setTab('attendance')">Isi absensi</button></div><div class="row" style="margin-top:8px"><button class="secondary" onclick="setTab('files')">Simpan file</button><button class="secondary" onclick="setTab('report')">Lihat laporan</button></div></div>
 <div class="notice">Mode offline: data siswa dan absensi disimpan di browser HP ini. Jangan hapus data browser sebelum membuat cadangan.</div>`;
}
function studentPage(){
 app.innerHTML=`<h1>Data Siswa</h1><div class="card"><label>Nama lengkap siswa</label><input id="studentName" placeholder="Contoh: Aisyah Putri"><label>NIS (opsional)</label><input id="studentNis" placeholder="Nomor induk siswa"><button style="margin-top:12px" onclick="addStudent()">＋ Tambahkan siswa</button></div><div class="card"><h2>Daftar siswa (${students.length})</h2>${students.length?students.map((s,i)=>`<div class="student"><div class="name"><b>${esc(s.name)}</b><div class="muted">${esc(s.nis||'Tanpa NIS')}</div></div><button class="danger small" onclick="deleteStudent(${i})">Hapus</button></div>`).join(''):'<div class="empty">Belum ada siswa. Tambahkan nama di atas.</div>'}</div>`;
}
function addStudent(){let name=$('#studentName').value.trim(),nis=$('#studentNis').value.trim();if(!name)return alert('Nama siswa harus diisi.');if(students.some(s=>s.name.toLowerCase()===name.toLowerCase()))return alert('Nama siswa sudah ada.');students.push({name,nis});save();studentPage();}
function deleteStudent(i){if(confirm('Hapus data siswa ini?')){students.splice(i,1);save();studentPage();}}
function attendancePage(){
 let date=today();
 app.innerHTML=`<h1>Absensi Siswa</h1><div class="card"><label>Tanggal absensi</label><input id="attDate" type="date" value="${date}" onchange="drawAttendance()"><p class="muted">Pilih status untuk setiap siswa. Perubahan tersimpan otomatis.</p><div id="attList"></div></div>`;
 drawAttendance();
}
function drawAttendance(){
 let date=$('#attDate').value||today(),list=$('#attList');
 if(!students.length){list.innerHTML='<div class="empty">Tambahkan data siswa terlebih dahulu di menu Data Siswa.</div>';return;}
 list.innerHTML=students.map((s,i)=>{let v=attendance[key(s.name,date)]||'';return `<div class="attrow"><strong>${i+1}. ${esc(s.name)}</strong><div class="choices">${['Hadir','Sakit','Izin','Alpa'].map(x=>`<button class="${v===x?'chosen':''}" onclick="mark('${encodeURIComponent(s.name)}','${date}','${x}')">${x}</button>`).join('')}</div></div>`}).join('');
}
function mark(n,d,v){attendance[key(decodeURIComponent(n),d)]=v;save();drawAttendance();}
function filePage(){
 app.innerHTML=`<h1>File Saya</h1><div class="card"><p class="muted">Pilih dokumen, foto, PDF, Word atau Excel dari HP. Salinannya disimpan di penyimpanan lokal aplikasi pada browser ini.</p><label>Pilih file dari HP</label><input type="file" id="fileInput" multiple><div id="fileList"></div></div><div class="notice">File dan data tersimpan di browser HP ini. Jangan hapus data situs/browser jika ingin mempertahankannya.</div>`;
 dbReady.then(()=>drawFiles());
 $('#fileInput').addEventListener('change',async e=>{
   const selected=[...e.target.files];
   for(const f of selected){
     await new Promise((resolve,reject)=>{
       const req=tx('readwrite').add({name:f.name,size:f.size,type:f.type,blob:f,lastModified:f.lastModified});
       req.onsuccess=resolve;req.onerror=reject;
     });
   }
   await loadFiles(); drawFiles(); e.target.value='';
 });
}
function drawFiles(){
 let el=$('#fileList');if(!el)return;
 el.innerHTML=files.length?'<h2>File tersimpan ('+files.length+')</h2>'+files.map((f,i)=>`<div class="fileitem"><div class="name">📄 ${esc(f.name)}<div class="muted">${(f.size/1024).toFixed(1)} KB</div></div><button class="secondary small" onclick="downloadFile(${f.id})">Buka/Unduh</button><button class="danger small" onclick="removeFile(${f.id})">Hapus</button></div>`).join(''):'<div class="empty">Belum ada file tersimpan.</div>';
}
function downloadFile(id){
 const f=files.find(x=>x.id===id);if(!f)return;
 const url=URL.createObjectURL(f.blob);const a=document.createElement('a');a.href=url;a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function removeFile(id){
 if(!confirm('Hapus file ini?'))return;
 await new Promise(resolve=>{const r=tx('readwrite').delete(id);r.onsuccess=resolve;r.onerror=resolve;});
 await loadFiles();drawFiles();
}
function reportPage(){
 let date=today(),rows=students.map(s=>({name:s.name,status:attendance[key(s.name,date)]||'Belum diisi'}));
 let counts=['Hadir','Sakit','Izin','Alpa','Belum diisi'].map(st=>[st,rows.filter(r=>r.status===st).length]);
 app.innerHTML=`<h1>Laporan Absensi</h1><div class="card"><label>Tanggal laporan</label><input type="date" id="reportDate" value="${date}" onchange="drawReport()"><div id="reportContent"></div></div>`;
 drawReport();
}
function drawReport(){
 let d=$('#reportDate').value||today(),rows=students.map(s=>({name:s.name,status:attendance[key(s.name,d)]||'Belum diisi'}));
 $('#reportContent').innerHTML=`<h2>Rekap ${new Date(d+'T00:00:00').toLocaleDateString('id-ID')}</h2><div class="stats">${['Hadir','Sakit','Izin','Alpa','Belum diisi'].map(st=>`<div class="stat"><b>${rows.filter(r=>r.status===st).length}</b><span>${st}</span></div>`).join('')}</div><h2>Daftar kehadiran</h2>${rows.length?rows.map(r=>`<div class="student"><span class="name">${esc(r.name)}</span><span class="pill">${r.status}</span></div>`).join(''):'<div class="empty">Belum ada siswa.</div>'}<button style="margin-top:14px" onclick="exportCsv('${d}')">Unduh laporan CSV</button>`;
}
function exportCsv(d){let rows=[['Nama Siswa','Tanggal','Status'],...students.map(s=>[s.name,d,attendance[key(s.name,d)]||'Belum diisi'])];let csv=rows.map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='laporan-absensi-'+d+'.csv';a.click();URL.revokeObjectURL(a.href);}
render();
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
