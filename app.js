// Global variables
let lineBD, barsVisitors, bedChart;
let map;
const ORIGINAL = new Map();

// Layer metadata
const layerMeta = [
  {key:'Blood Banks',file:'Blood Banks.geojson',color:'#ff6b6b',type:'point'},
  {key:'Clinics',file:'Clinic.geojson',color:'#f59e0b',type:'point'},
  {key:'Diagnostic Center',file:'Diagnostic Center.geojson',color:'#22d3ee',type:'point'},
  {key:'Health Centers',file:'Health Centers.geojson',color:'#34d399',type:'point'},
  {key:'Health Complex',file:'Health Complex.geojson',color:'#a78bfa',type:'point'},
  {key:'Hospital Locations',file:'Hospital Locations.geojson',color:'#60a5fa',type:'point'},
  {key:'Pharmacies',file:'Pharmacies.geojson',color:'#eab308',type:'point'}
];

const ICONS_BY_LAYER = {
  'Blood Banks':'\uD83E\uDE78',
  'Clinics':'\uD83C\uDFE5',
  'Diagnostic Center':'\uD83E\uDDEA',
  'Health Centers':'\uD83C\uDFE5',
  'Health Complex':'\uD83C\uDFE5',
  'Hospital Locations':'\uD83C\uDFE5',
  'Pharmacies':'\uD83D\uDC8A'
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  initLogo();
  initCharts();
  initMap();
  loadAllData();
  initializeDraggablePanels();
  addResetButton();
});

// Logo handling
function initLogo() {
  const img = document.getElementById('brandLogo'); 
  if(!img) return;
  
  window.__logoSources = [
    'data/moh-oman-logo.png',
    'data/moh-oman-logo.jpg',
    'data/moh-oman-logo.jpeg',
    'data/moh-oman-logo.svg',
    'data/moh-oman-logo',
    'https://share.google/images/hrmXsijycIiUqC8Fx'
  ];
  
  img.onerror = function(){handleLogoError(img)};
  img.onload = function(){ 
    img.style.display='block'; 
    const fb=img.nextElementSibling; 
    if(fb) fb.style.display='none'; 
  };
  img.dataset.logoIndex='0';
  img.src=window.__logoSources[0];
}

function handleLogoError(img) {
  try{
    img.dataset.logoIndex = String((+img.dataset.logoIndex||0)+1);
    const idx=+img.dataset.logoIndex;
    const next=window.__logoSources[idx];
    if(next){ img.src=next; return; }
    img.removeAttribute('src'); img.style.display='none';
    const fb=img.nextElementSibling; if(fb) fb.style.display='grid';
  }catch(e){}
}

// Chart initialization
function initCharts() {
  Chart.register(ChartDataLabels);
  
  lineBD = new Chart(document.getElementById('lineBD'), {
    type:'bar',
    data:{
      labels:[],
      datasets:[
        {
          label:"Births",
          data:[],
          type:'bar',
          backgroundColor:'#3b82f6',
          borderColor:'#1d4ed8',
          borderWidth:1,
          borderRadius:3,
          borderSkipped:false,
          yAxisID:'y',
          barThickness: 25,
          maxBarThickness: 30
        },
        {
          label:"Deaths",
          data:[],
          type:'line',
          backgroundColor:'rgba(59, 130, 246, 0.1)',
          borderColor:'#0ea5e9',
          borderWidth:3,
          tension:0.4,
          fill:false,
          pointBackgroundColor:'#0ea5e9',
          pointBorderColor:'#ffffff',
          pointBorderWidth:2,
          pointRadius:4,
          pointHoverRadius:6,
          yAxisID:'y'
        }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      layout: {
        padding: { top: 10, right: 10, bottom: 10, left: 10 }
      },
      plugins:{
        legend:{
          position:'top',
          labels:{
            color:'#ffffff', // Changed to white for better readability
            font:{size:11, weight:'600'},
            usePointStyle:true,
            padding:15
          }
        },
        tooltip:{
          backgroundColor:'rgba(7,18,46,0.95)',
          titleColor:'#ffffff',
          bodyColor:'#ffffff', // Changed to white for better readability
          borderColor:'#55a7ff',
          borderWidth:1,
          cornerRadius:8,
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y.toLocaleString();
            }
          }
        }
      },
      scales:{
        x:{
          grid:{ color:'rgba(85, 167, 255, 0.2)', drawBorder:false },
          ticks:{ color:'#ffffff', font:{size:10, weight:'500'} } // Changed to white
        },
        y:{
          beginAtZero:true,
          grid:{ color:'rgba(85, 167, 255, 0.2)', drawBorder:false },
          ticks:{
            color:'#ffffff', // Changed to white for better readability
            font:{size:10, weight:'500'},
            callback: function(value) { return value.toLocaleString(); }
          }
        }
      },
      interaction:{ intersect:false, mode:'index' }
    }
  });
  
  
  barsVisitors = new Chart(document.getElementById('barsVisitors'), {
    type:'doughnut',
    data:{
      labels:[], 
      datasets:[{
        data:[], 
        backgroundColor:['#1e3a8a','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#dbeafe']
      }]
    },
    options:{
      cutout:'55%',
      plugins:{
        legend:{
          position:'bottom',
          labels:{
            color:'#ffffff', // Changed to white for better readability
            font:{size:10, weight:'600'},
            padding:8
          }
        },
        datalabels:{
          color:'#ffffff', // Changed to white for better readability
          formatter:v=>v, 
          font:{weight:'700'}
        },
        tooltip:{
          backgroundColor:'rgba(7,18,46,0.95)',
          titleColor:'#ffffff',
          bodyColor:'#ffffff', // Changed to white for better readability
          borderColor:'#55a7ff',
          borderWidth:1,
          cornerRadius:8
        }
      }
    }
  });
}


function initMap() {
  map = new maplibregl.Map({
    container:'map', 
    style:'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center:[56.0,20.5], 
    zoom:5.1, 
    attributionControl:false
  });
  
  map.addControl(new maplibregl.NavigationControl({showCompass:false}));
  map.on('load', async ()=>{
    console.log('Map loaded, loading layers...');
    await loadAllLayers();
    buildFilterList();
    fitToAll();
  });
}

async function loadAllData() {
  await Promise.all([
    loadBirthDeathData(),
    loadVisitorData()
  ]);
}

async function loadBirthDeathData() {
  try{
    console.log('Loading Birth Death.csv data...');
    const {H,rows} = await fetchCSV('data/Birth Death.csv');
    
    const years = ['2022', '2023', '2024'];
    const birthData = {};
    const deathData = {};
    
    years.forEach((year) => {
      const birthCol = H.indexOf(`births (${year})`);
      const deathCol = H.indexOf(`deaths (${year})`);
      
      if (birthCol > -1 && deathCol > -1) {
        birthData[year] = rows.map(r => {
          const val = r[birthCol];
          return val ? +val.replace(/[^\d.-]/g, '') || 0 : 0;
        });
        
        deathData[year] = rows.map(r => {
          const val = r[deathCol];
          return val ? +val.replace(/[^\d.-]/g, '') || 0 : 0;
        });
      }
    });
    
    const labels = years;
    const totalBirths = years.map(year => 
      birthData[year] ? birthData[year].reduce((sum, val) => sum + val, 0) : 0
    );
    const totalDeaths = years.map(year => 
      deathData[year] ? deathData[year].reduce((sum, val) => sum + val, 0) : 0
    );
    
    lineBD.data.labels = labels;
    lineBD.data.datasets[0].data = totalBirths;
    lineBD.data.datasets[1].data = totalDeaths;
    lineBD.update();
    
    console.log('Birth Death chart updated successfully');
  }catch(e){ 
    console.error('Birth Death.csv loading error:', e.message); 
  }
}

async function loadVisitorData() {
  try{
    const {H,rows} = await fetchCSV('data/Vistor.csv');
    const iHosp = H.indexOf('hospitals');
    const iVal = H.indexOf('number of visitors');
    
    if(iHosp === -1 || iVal === -1) { 
      console.error('Required columns not found in Vistor.csv'); 
      return; 
    }
    
    const hospitalTotals = new Map();
    rows.forEach(r=>{
      const hosp = (r[iHosp]||'').trim();
      const val = +(r[iVal]||'0').replace(/,/g, '') || 0;
      if(hosp && val > 0) hospitalTotals.set(hosp, (hospitalTotals.get(hosp)||0) + val);
    });
    
    const sortedHospitals = [...hospitalTotals.entries()].sort((a,b) => b[1] - a[1]).slice(0, 8);
    barsVisitors.data.labels = sortedHospitals.map(([name]) => name);
    barsVisitors.data.datasets[0].data = sortedHospitals.map(([,count]) => count);
    barsVisitors.update();
  }catch(e){ 
    console.error('Vistor.csv error:', e); 
  }
}



async function loadAllLayers() {
  console.log('Starting to load all layers...');
  let loadedCount = 0;
  let errorCount = 0;
  
  for(const meta of layerMeta){
    try{
      console.log('Loading layer:', meta.key, 'from file:', meta.file);
      const gj = await fetchJSON(`data/${meta.file}`);
      console.log(meta.key, 'features:', gj?.features?.length ?? 0);
      
      if (!gj || !gj.features || gj.features.length === 0) {
        console.warn('No features found in', meta.file);
        continue;
      }
      
      ORIGINAL.set(meta.key, gj);
      const srcId = `src-${meta.key}`;
      map.addSource(srcId,{type:'geojson',data:gj});

      const iconId = `icon-${meta.key}`;
      const emoji = ICONS_BY_LAYER[meta.key] || '\uD83D\uDCCD';
      
      try {
        const canvas = createIconCanvas(emoji, meta.color);
        map.addImage(iconId, canvas, {pixelRatio:2});
        
        map.addLayer({ 
          id:`lyr-${meta.key}`, 
          type:'symbol', 
          source:srcId,
          layout:{ 
            'icon-image': iconId, 
            'icon-size': 0.8, 
            'icon-allow-overlap': true
          }
        });
        
        map.addLayer({ 
          id:`circle-${meta.key}`, 
          type:'circle', 
          source:srcId,
          paint:{ 
            'circle-radius': 6, 
            'circle-color': meta.color, 
            'circle-opacity': 0.8,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          } 
        });
        
        map.on('click',`lyr-${meta.key}`,(e)=>{
          const f=e.features[0];
          const popupContent = createDetailedPopup(f, meta);
          new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
        });
        
        map.on('click',`circle-${meta.key}`,(e)=>{
          const f=e.features[0];
          const popupContent = createDetailedPopup(f, meta);
          new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
        });
        
      } catch (iconError) {
        console.warn('Icon creation failed for', meta.key, ':', iconError);
        map.addLayer({ 
          id:`circle-${meta.key}`, 
          type:'circle', 
          source:srcId,
          paint:{ 
            'circle-radius': 8, 
            'circle-color': meta.color, 
            'circle-opacity': 0.9,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          } 
        });
        
        map.on('click',`circle-${meta.key}`,(e)=>{
          const f=e.features[0];
          const popupContent = createDetailedPopup(f, meta);
          new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
        });
      }
      
      loadedCount++;
      console.log('Successfully loaded layer:', meta.key);
      
    }catch(err){ 
      errorCount++;
      console.error('Failed to load', meta.file, ':', err.message); 
    }
  }
  
  console.log(`Layer loading complete. Loaded: ${loadedCount}, Errors: ${errorCount}`);
  
  if (loadedCount === 0) {
    console.error('No layers were loaded successfully. Check the console for errors.');
  } else {
    buildLegend();
  }
}

function createIconCanvas(emoji, backgroundColor) {
  const size=64; const r=16;
  const canvas=document.createElement('canvas');
  canvas.width=size; canvas.height=size;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=backgroundColor;
  ctx.beginPath();
  ctx.moveTo(r,0); ctx.lineTo(size-r,0); ctx.quadraticCurveTo(size,0,size,r);
  ctx.lineTo(size,size-r); ctx.quadraticCurveTo(size,size,size-r,size);
  ctx.lineTo(r,size); ctx.quadraticCurveTo(0,size,0,size-r);
  ctx.lineTo(0,r); ctx.quadraticCurveTo(0,0,r,0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=2; ctx.stroke();
  ctx.font='36px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#ffffff';
  ctx.fillText(emoji, size/2, size/2+2);
  return canvas;
}

function createDetailedPopup(feature, meta) {
  const props = feature.properties || {};
  
  const name = props.name || props.Name || props.NAME || props.facility_name || props.hospital_name || props.center_name || props.clinic_name || meta.key;

  let popupContent = `
    <div style="font-family: Arial, sans-serif; min-width: 200px;">
      <div style="font-weight: bold; font-size: 16px; color: #1e3a8a; margin-bottom: 10px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
        NAME ${name}
      </div>
  `;
  
  Object.keys(props).forEach(key => {
    if (!['name', 'Name', 'NAME', 'facility_name', 'hospital_name', 'center_name', 'clinic_name', 
           'wlyt', 'Wlyt', 'WLYT', 'wilayat', 'Wilayat', 'WILAYAT',
           'governorate', 'Governorate', 'GOVERNORATE', 'muhafazah', 'Muhafazah', 'MUHAFAZAH',
           'address', 'Address', 'ADDRESS', 'location', 'Location', 'LOCATION',
           'phone', 'Phone', 'PHONE', 'telephone', 'Telephone', 'TELEPHONE',
           'email', 'Email', 'EMAIL', 'website', 'Website', 'WEBSITE', 'url', 'URL',
           'fid', 'FID', 'Fid'].includes(key)) {
      const value = props[key];
      if (value && value.toString().trim() !== '') {
        popupContent += `<div style="margin-bottom: 6px; color: #1f2937;"><strong style="color: #111827;">${key}:</strong> ${value}</div>`;
      }
    }
  });
  
  popupContent += '</div>';
  return popupContent;
}

function extendBounds(bounds, geom) {
  const T=geom?.type, C=geom?.coordinates;
  if(!T||!C) return;
  const walk=(coords)=>{
    if(typeof coords[0]==='number'){ bounds.extend([coords[0], coords[1]]); return; }
    coords.forEach(walk);
  };
  walk(C);
}

function fitToAll() {
  const b=new maplibregl.LngLatBounds(); let added=false;
  layerMeta.forEach(meta=>{
    const src=map.getSource(`src-${meta.key}`); if(!src) return;
    const data=src._data ?? ORIGINAL.get(meta.key); if(!data) return;
    (data.features||[]).forEach(f=>{ extendBounds(b, f.geometry); added=true; });
  });
  if(added) map.fitBounds(b,{padding:40});
}

function buildLegend() {
  const root=document.getElementById('legend'); if(!root) return;
  root.innerHTML='';
  layerMeta.forEach(meta=>{
    const swatchStyle = `background:${meta.color}; border-color:#fff`;
    root.insertAdjacentHTML('beforeend',
      `<div class="legend-item">
         <div class="legend-swatch circle" style="${swatchStyle}"></div>
         <div class="legend-label">${meta.key}</div>
       </div>`);
  });
}

// Filter functions
function buildFilterList() {
  const govSel=document.getElementById('governorateFilter');
  const facSel=document.getElementById('facilityFilter');
  populateFacilityOptions(facSel);
  populateGovernorateOptions();
  govSel.addEventListener('change', applyFilters);
  facSel.addEventListener('change', applyFilters);
  document.getElementById('resetFilters').addEventListener('click', resetFilters);
  resetFilters();
}

function detectGovernorateFromProps(props) {
  if(!props) return '';
  const direct = props.governorate||props.Governorate||props.muhafazah||props.Muhafazah
    || props.region || props.Region || props.REGION || props.GOVERNORATE || props.Gov || props.GOV
    || props.Governorate_Name || props.GOV_NAME || props.gov_name || props.name_en_gov;
  if(direct && String(direct).trim()) return String(direct).trim();
  for(const k in props){
    const lk=String(k).toLowerCase();
    if(lk.includes('govern') || lk.includes('muhaf') || lk.includes('region')){
      const v=props[k]; if(v && String(v).trim()) return String(v).trim();
    }
  }
  return '';
}

function populateGovernorateOptions() {
  const govSel=document.getElementById('governorateFilter');
  const set=new Set();
  layerMeta.forEach(meta=>{
    const gj=ORIGINAL.get(meta.key); if(!gj) return;
    gj.features?.forEach(f=>{
      const g = detectGovernorateFromProps(f.properties||{});
      if(g) set.add(g);
    });
  });
  govSel.innerHTML='<option value="">All Governorates</option>'; 
  [...set].sort().forEach(g=>{
    const o=document.createElement('option'); o.value=g; o.textContent=g; govSel.appendChild(o);
  });
}

function populateFacilityOptions(facSel) {
  if(!facSel) return;
  facSel.innerHTML = '';
  const all=document.createElement('option'); all.value=''; all.textContent='All Facilities'; facSel.appendChild(all);
  layerMeta.forEach(meta=>{
    const o=document.createElement('option'); o.value=meta.key; o.textContent=meta.key; facSel.appendChild(o);
  });
}

function featureGov(f) {
  const p=f.properties||{};
  return p.governorate||p.Governorate||p.muhafazah||p.Muhafazah||'';
}

function applyFilters() {
  const gov=document.getElementById('governorateFilter').value;
  const fac=document.getElementById('facilityFilter').value;

  layerMeta.forEach(meta=>{
    const base=ORIGINAL.get(meta.key);
    const src=map.getSource(`src-${meta.key}`); if(!src || !base) return;

    const show = !fac || fac===meta.key;

    const id=`lyr-${meta.key}`;
    const circleId=`circle-${meta.key}`;
    if(map.getLayer(id)) map.setLayoutProperty(id,'visibility', show?'visible':'none');
    if(map.getLayer(circleId)) map.setLayoutProperty(circleId,'visibility', show?'visible':'none');

    const feats = !gov ? base.features
                       : base.features.filter(f=> String(featureGov(f))===gov );
    src.setData({type:'FeatureCollection', features: feats});
  });

  fitToAll();
}

function resetFilters() {
  document.getElementById('governorateFilter').value='';
  document.getElementById('facilityFilter').value='';
  
  layerMeta.forEach(meta=>{
    const base=ORIGINAL.get(meta.key);
    const src=map.getSource(`src-${meta.key}`); if(!src||!base) return;
    src.setData(base);

    const id=`lyr-${meta.key}`; 
    const circleId=`circle-${meta.key}`;
    if(map.getLayer(id)) map.setLayoutProperty(id,'visibility','visible');
    if(map.getLayer(circleId)) map.setLayoutProperty(circleId,'visibility','visible');
  });
  fitToAll();
}


// Data fetching utilities
async function fetchJSON(path) {
  try {
    console.log('Fetching:', path);
    const res = await fetch(path);
    console.log('Response status:', res.status, 'for', path);
    if(!res.ok) {
      console.error(`Fetch failed (${res.status}) for ${path}`);
      throw new Error(`Fetch failed (${res.status}) for ${path}`);
    }
    const json = await res.json();
    console.log('Successfully loaded:', path, 'with', json.features?.length || 0, 'features');
    return json;
  } catch (error) {
    console.error('Error fetching', path, ':', error);
    throw error;
  }
}

async function fetchCSV(path) {
  const r=await fetch(path); if(!r.ok) throw new Error(path+' not found');
  const text=await r.text();
  const lineSplit = /\r?\n/;
  const safeSplit = /,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/g;
  const rawRows = text.trim().split(lineSplit).filter(Boolean);
  const rows = rawRows.map(line=> line.split(safeSplit).map(cell=> cell.trim()) );
  const H = rows.shift().map(h=>h.replace(/^\"|\"$/g,'').trim().toLowerCase());
  const norm = rows.map(r=> r.map(c=> c.replace(/^\"|\"$/g,'').trim()) );
  return {H,rows:norm};
}

// Panel dragging functionality
function initializeDraggablePanels() {
  const panels = document.querySelectorAll('.panel');
  
  panels.forEach(panel => {
    if (panel.id === 'map') return; // Don't make map draggable
    
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    // Load saved position
    const savedPosition = localStorage.getItem(`panel-${panel.className.split(' ')[0]}`);
    if (savedPosition) {
      const { left, top } = JSON.parse(savedPosition);
      panel.style.left = left;
      panel.style.top = top;
      panel.style.position = 'absolute';
    }
    
    // Mouse events
    panel.addEventListener('mousedown', startDrag);
    panel.addEventListener('mousemove', drag);
    panel.addEventListener('mouseup', endDrag);
    panel.addEventListener('mouseleave', endDrag);
    
    // Touch events for mobile
    panel.addEventListener('touchstart', startDragTouch);
    panel.addEventListener('touchmove', dragTouch);
    panel.addEventListener('touchend', endDrag);
    
    function startDrag(e) {
      if (e.target.closest('input, select, button, .specialty-item')) return;
      
      isDragging = true;
      panel.classList.add('dragging');
      
      startX = e.clientX || e.touches[0].clientX;
      startY = e.clientY || e.touches[0].clientY;
      
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      e.preventDefault();
    }
    
    function drag(e) {
      if (!isDragging) return;
      
      const currentX = e.clientX || e.touches[0].clientX;
      const currentY = e.clientY || e.touches[0].clientY;
      
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      
      panel.style.left = `${startLeft + deltaX}px`;
      panel.style.top = `${startTop + deltaY}px`;
      panel.style.position = 'absolute';
      
      e.preventDefault();
    }
    
    function dragTouch(e) {
      if (!isDragging) return;
      drag(e);
    }
    
    function endDrag() {
      if (!isDragging) return;
      
      isDragging = false;
      panel.classList.remove('dragging');
      
      // Save position
      const left = panel.style.left;
      const top = panel.style.top;
      if (left && top) {
        localStorage.setItem(`panel-${panel.className.split(' ')[0]}`, JSON.stringify({ left, top }));
      }
    }
  });
}

// Reset panel positions
function resetPanelPositions() {
  const panels = document.querySelectorAll('.panel');
  panels.forEach(panel => {
    if (panel.id === 'map') return;
    
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    
    // Remove saved position
    localStorage.removeItem(`panel-${panel.className.split(' ')[0]}`);
  });
}

// Add reset button to header
function addResetButton() {
  const header = document.querySelector('.header');
  if (header && !document.getElementById('resetPanels')) {
    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetPanels';
    resetBtn.innerHTML = '🔄 Reset Panels';
    resetBtn.style.cssText = `
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #1e3a8a;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      cursor: pointer;
      margin-left: auto;
      transition: all 0.2s ease;
    `;
    
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'rgba(255,255,255,0.2)';
      resetBtn.style.borderColor = 'rgba(255,255,255,0.3)';
    });
    
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'rgba(255,255,255,0.1)';
      resetBtn.style.borderColor = 'rgba(255,255,255,0.2)';
    });
    
    resetBtn.addEventListener('click', resetPanelPositions);
    
    header.appendChild(resetBtn);
  }
}
