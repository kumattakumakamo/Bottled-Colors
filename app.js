const STORAGE_KEY = 'color-jar-palettes-v1';
const defaults = { base:'#EA7A62', sub:'#F4BE5D', accent:'#AF85D8' };
let palettes = loadPalettes();
let colors = {...defaults};
let activeRole = 'base';
let editingId = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const views = { shelf:$('#shelfView'), editor:$('#editorView'), detail:$('#detailView') };
const backBtn=$('#backBtn'), newBtn=$('#newBtn'), nameInput=$('#nameInput'), hexInput=$('#hexInput');
const hRange=$('#hRange'), sRange=$('#sRange'), vRange=$('#vRange');
const hOut=$('#hOut'), sOut=$('#sOut'), vOut=$('#vOut');
const hueWheel=$('#hueWheel'), huePointer=$('#huePointer'), svSquare=$('#svSquare'), svPointer=$('#svPointer');

function loadPalettes(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]} }
function persist(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(palettes)); }
function uid(){ return crypto?.randomUUID?.() || String(Date.now()+Math.random()); }
function showView(name){ Object.entries(views).forEach(([k,v])=>v.classList.toggle('active',k===name)); backBtn.hidden=name==='shelf'; newBtn.hidden=name==='editor'; }
function toast(msg){ const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1200); }
function hexToRgb(hex){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:null; }
function rgbToHex(r,g,b){ return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase(); }
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return {h,s:max?d/max*100:0,v:max*100};}
function hsvToRgb(h,s,v){s/=100;v/=100;const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let rp=0,gp=0,bp=0;if(h<60){rp=c;gp=x}else if(h<120){rp=x;gp=c}else if(h<180){gp=c;bp=x}else if(h<240){gp=x;bp=c}else if(h<300){rp=x;bp=c}else{rp=c;bp=x}return {r:(rp+m)*255,g:(gp+m)*255,b:(bp+m)*255};}
function hsvToHex(h,s,v){const c=hsvToRgb(h,s,v);return rgbToHex(c.r,c.g,c.b)}
function hexToHsv(hex){const rgb=hexToRgb(hex);return rgb?rgbToHsv(rgb.r,rgb.g,rgb.b):{h:0,s:0,v:0}}

function updateVisuals(){
  ['base','sub','accent'].forEach(role=>{
    $$(`[data-layer="${role}"]`).forEach(el=>el.style.background=colors[role]);
    const tab=$(`.color-tab[data-role="${role}"]`); if(tab) tab.style.setProperty('--mini',colors[role]);
  });
  const hsv=hexToHsv(colors[activeRole]);
  hRange.value=Math.round(hsv.h);sRange.value=Math.round(hsv.s);vRange.value=Math.round(hsv.v);
  hOut.value=Math.round(hsv.h);sOut.value=Math.round(hsv.s);vOut.value=Math.round(hsv.v);hexInput.value=colors[activeRole];
  svSquare.style.background=`linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${hsv.h} 100% 50%))`;
  const rad=(hsv.h-90)*Math.PI/180,r=45;huePointer.style.left=`${50+Math.cos(rad)*r}%`;huePointer.style.top=`${50+Math.sin(rad)*r}%`;
  svPointer.style.left=`${hsv.s}%`;svPointer.style.top=`${100-hsv.v}%`;
}
function setFromHSV(){ colors[activeRole]=hsvToHex(+hRange.value,+sRange.value,+vRange.value);updateVisuals(); }

$$('.color-tab').forEach(btn=>btn.addEventListener('click',()=>{activeRole=btn.dataset.role;$$('.color-tab').forEach(b=>b.classList.toggle('active',b===btn));updateVisuals()}));
[hRange,sRange,vRange].forEach(i=>i.addEventListener('input',setFromHSV));
hexInput.addEventListener('change',()=>{let v=hexInput.value.trim();if(!v.startsWith('#'))v='#'+v;if(/^#[0-9a-fA-F]{6}$/.test(v)){colors[activeRole]=v.toUpperCase();updateVisuals()}else{toast('HEXは #RRGGBB で入力してください');updateVisuals()}});
$('#copyHexBtn').addEventListener('click',async()=>{await navigator.clipboard?.writeText(colors[activeRole]);toast('HEXをコピーしました');});

function bindPointer(el,fn){let down=false;const act=e=>{if(!down&&e.type!=='pointerdown')return;const r=el.getBoundingClientRect();fn(e.clientX-r.left,e.clientY-r.top,r);};el.addEventListener('pointerdown',e=>{down=true;el.setPointerCapture(e.pointerId);act(e)});el.addEventListener('pointermove',act);el.addEventListener('pointerup',()=>down=false);}
bindPointer(hueWheel,(x,y,r)=>{const cx=r.width/2,cy=r.height/2;let deg=Math.atan2(y-cy,x-cx)*180/Math.PI+90;if(deg<0)deg+=360;hRange.value=Math.round(deg);setFromHSV();});
bindPointer(svSquare,(x,y,r)=>{sRange.value=Math.round(Math.min(1,Math.max(0,x/r.width))*100);vRange.value=Math.round((1-Math.min(1,Math.max(0,y/r.height)))*100);setFromHSV();});

function bottleHTML(p,cls=''){return `<div class="bottle ${cls}"><div class="cork"></div><div class="glass"><div class="sand layer accent" style="background:${p.colors.accent}"></div><div class="sand layer sub" style="background:${p.colors.sub}"></div><div class="sand layer base" style="background:${p.colors.base}"></div></div></div>`}
function renderShelf(){const grid=$('#shelfGrid');if(!palettes.length){grid.innerHTML='<div class="empty-note">まだ瓶がありません。<br>最初の3色を作ってみよう ✦</div>';return}grid.innerHTML=palettes.map(p=>`<button class="shelf-card" data-id="${p.id}">${bottleHTML(p)}<h3>${escapeHTML(p.name)}</h3></button>`).join('');$$('.shelf-card').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.id)));}
function escapeHTML(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function openEditor(p=null){editingId=p?.id||null;colors=p?{...p.colors}:{...defaults};nameInput.value=p?.name||'';activeRole='base';$$('.color-tab').forEach(b=>b.classList.toggle('active',b.dataset.role==='base'));showView('editor');updateVisuals();}
function openDetail(id){const p=palettes.find(x=>x.id===id);if(!p)return;$('#detailContent').innerHTML=`<div class="detail-card">${bottleHTML(p,'large-bottle')}<h2>${escapeHTML(p.name)}</h2><div class="swatches">${['base','sub','accent'].map(r=>`<div class="swatch"><div class="chip" style="background:${p.colors[r]}"></div><button class="secondary copy-color" data-hex="${p.colors[r]}">${p.colors[r]} ⧉</button></div>`).join('')}</div><div class="actions"><button class="secondary" id="editPalette">編集する</button><button class="secondary" id="duplicatePalette">複製する</button><button class="danger" id="deletePalette">削除する</button></div></div>`;showView('detail');$$('.copy-color').forEach(b=>b.onclick=async()=>{await navigator.clipboard?.writeText(b.dataset.hex);toast('HEXをコピーしました')});$('#editPalette').onclick=()=>openEditor(p);$('#duplicatePalette').onclick=()=>{openEditor({...p,id:null,name:p.name+' copy'});editingId=null};$('#deletePalette').onclick=()=>{if(confirm(`「${p.name}」を削除しますか？`)){palettes=palettes.filter(x=>x.id!==p.id);persist();renderShelf();showView('shelf')}};}

async function saveWithAnimation(){const name=nameInput.value.trim();if(!name){toast('瓶に名前をつけてください');nameInput.focus();return}const overlay=$('#mixOverlay'), label=$('#mixLabel');overlay.style.setProperty('--base',colors.base);overlay.style.setProperty('--sub',colors.sub);overlay.style.setProperty('--accent',colors.accent);overlay.querySelectorAll('.base').forEach(e=>e.style.background=colors.base);overlay.querySelectorAll('.sub').forEach(e=>e.style.background=colors.sub);overlay.querySelectorAll('.accent').forEach(e=>e.style.background=colors.accent);overlay.className='mix-overlay show';overlay.setAttribute('aria-hidden','false');const wait=ms=>new Promise(r=>setTimeout(r,ms));label.textContent='75%の砂を注いでいます…';overlay.classList.add('phase-base');await wait(700);label.textContent='20%を重ねます…';overlay.classList.add('phase-sub');await wait(540);label.textContent='最後に5%のアクセント…';overlay.classList.add('phase-accent');await wait(460);label.textContent='瓶を閉じます ✦';overlay.classList.add('phase-cork');await wait(500);
  const now=new Date().toISOString();if(editingId){const i=palettes.findIndex(p=>p.id===editingId);palettes[i]={...palettes[i],name,colors:{...colors},updatedAt:now};}else{palettes.push({id:uid(),name,colors:{...colors},createdAt:now,updatedAt:now});}persist();renderShelf();overlay.className='mix-overlay';overlay.setAttribute('aria-hidden','true');showView('shelf');toast('棚にしまいました ✦');}
$('#saveBtn').addEventListener('click',saveWithAnimation);
$('#newBtn').addEventListener('click',()=>openEditor());$('#createFirstBtn').addEventListener('click',()=>openEditor());backBtn.addEventListener('click',()=>{renderShelf();showView('shelf')});
renderShelf();updateVisuals();
