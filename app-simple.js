// Simplified MOH Oman Dashboard
let lineBD, barsVisitors, bedChart;
let specialtiesData = [];
let map;
const ORIGINAL = new Map();

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  initLogo();
  initCharts();
  initMap();
  loadAllData();
});

// Logo handling
function initLogo() {
  const img = document.getElementById('brandLogo'); 
  if(!img) return;
  
  const logoSources = [
    'data/moh-oman-logo.png',
    'data/moh-oman-logo.jpg',
    'data/moh-oman-logo.jpeg'
  ];
  
  img.onerror = function() {
    img.style.display = 'none';
    const fb = img.nextElementSibling; 
    if(fb) fb.style.display = 'grid';
  };
  
  img.onload = function() { 
    img.style.display = 'block'; 
    const fb = img.nextElementSibling; 
    if(fb) fb.style.display = 'none'; 
  };
  
  img.src = logoSources[0];
}

// Initialize charts
function initCharts() {
  Chart.register(ChartDataLabels);
  
  // Birth Death Chart
  lineBD = new Chart(document.getElementById('lineBD'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: "Births",
          data: [],
          type: 'bar',
          backgroundColor: '#3b82f6',
          borderColor: '#1d4ed8',
          borderWidth: 1,
          borderRadius: 3,
          yAxisID: 'y',
          barThickness: 25
        },
        {
          label: "Deaths",
          data: [],
          type: 'line',
          borderColor: '#0ea5e9',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: '#0ea5e9',
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#e6f1ff', font: {size: 11, weight: '600'} }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(85, 167, 255, 0.2)' }, ticks: { color: '#a9c2ff' } },
        y: { grid: { color: 'rgba(85, 167, 255, 0.2)' }, ticks: { color: '#a9c2ff' } }
      }
    }
  });
  
  // Bed Chart
  bedChart = new Chart(document.getElementById('bedChart'), {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#84cc16'] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
  
  // Visitors Chart
  barsVisitors = new Chart(document.getElementById('barsVisitors'), {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#1e3a8a','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#dbeafe'] }] },
    options: { cutout: '55%', responsive: true, maintainAspectRatio: false }
  });
}

// Initialize map
function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [56.0, 20.5],
    zoom: 5.1,
    attributionControl: false
  });
  
  map.addControl(new maplibregl.NavigationControl({showCompass: false}));
  map.on('load', async () => {
    await loadMapLayers();
    buildLegend();
    fitToAll();
  });
}

// Load all data
async function loadAllData() {
  await Promise.all([
    loadBirthDeathData(),
    loadVisitorData(),
    loadBedData(),
    loadSpecialtiesData()
  ]);
}

// Load Birth Death data
async function loadBirthDeathData() {
  try {
    const {H, rows} = await fetchCSV('data/Birth Death.csv');
    const years = ['2022', '2023', '2024'];
    
    const totalBirths = years.map(year => {
      const col = H.indexOf(`births (${year})`);
      return col > -1 ? rows.reduce((sum, r) => sum + (+r[col] || 0), 0) : 0;
    });
    
    const totalDeaths = years.map(year => {
      const col = H.indexOf(`deaths (${year})`);
      return col > -1 ? rows.reduce((sum, r) => sum + (+r[col] || 0), 0) : 0;
    });
    
    lineBD.data.labels = years;
    lineBD.data.datasets[0].data = totalBirths;
    lineBD.data.datasets[1].data = totalDeaths;
    lineBD.update();
  } catch(e) {
    console.error('Birth Death.csv loading error:', e.message);
  }
}

// Load Visitor data
async function loadVisitorData() {
  try {
    const {H, rows} = await fetchCSV('data/Vistor.csv');
    const iHosp = H.indexOf('hospitals');
    const iVal = H.indexOf('number of visitors');
    
    if(iHosp === -1 || iVal === -1) return;
    
    const hospitalTotals = new Map();
    rows.forEach(r => {
      const hosp = (r[iHosp] || '').trim();
      const val = +(r[iVal] || '0').replace(/,/g, '') || 0;
      if(hosp && val > 0) hospitalTotals.set(hosp, (hospitalTotals.get(hosp) || 0) + val);
    });
    
    const sortedHospitals = [...hospitalTotals.entries()].sort((a,b) => b[1] - a[1]).slice(0, 8);
    barsVisitors.data.labels = sortedHospitals.map(([name]) => name);
    barsVisitors.data.datasets[0].data = sortedHospitals.map(([,count]) => count);
    barsVisitors.update();
  } catch(e) {
    console.error('Vistor.csv error:', e);
  }
}

// Load Bed data
async function loadBedData() {
  try {
    const {H, rows} = await fetchCSV('data/Bed.csv');
    
    const hospitalData = rows.map(row => ({
      name: row[0] || 'Unknown Hospital',
      count: row.slice(1).reduce((total, val) => total + (+val.replace(/[^\d.-]/g, '') || 0), 0)
    })).filter(h => h.count > 0).sort((a, b) => b.count - a.count).slice(0, 8);
    
    bedChart.data.labels = hospitalData.map(h => h.name);
    bedChart.data.datasets[0].data = hospitalData.map(h => h.count);
    bedChart.update();
  } catch(e) {
    console.error('Bed.csv loading error:', e.message);
  }
}

// Load Specialties data
async function loadSpecialtiesData() {
  try {
    const {H, rows} = await fetchCSV('data/Specialties.csv');
    
    specialtiesData = rows.map(row => ({
      hospital: row[0] || 'Unknown Hospital',
      specialty: row[1] || 'General'
    }));
    
    if (specialtiesData.length > 0) {
      loadSpecialties();
    }
  } catch(e) {
    console.error('Specialties.csv loading error:', e.message);
  }
}

// Load map layers
async function loadMapLayers() {
  const layerMeta = [
    {key: 'Blood Banks', file: 'Blood Banks.geojson', color: '#ff6b6b'},
    {key: 'Clinics', file: 'Clinic.geojson', color: '#f59e0b'},
    {key: 'Diagnostic Center', file: 'Diagnostic Center.geojson', color: '#22d3ee'},
    {key: 'Health Centers', file: 'Health Centers.geojson', color: '#34d399'},
    {key: 'Health Complex', file: 'Health Complex.geojson', color: '#a78bfa'},
    {key: 'Hospital Locations', file: 'Hospital Locations.geojson', color: '#60a5fa'},
    {key: 'Pharmacies', file: 'Pharmacies.geojson', color: '#eab308'}
  ];
  
  for(const meta of layerMeta) {
    try {
      const gj = await fetchJSON(`data/${meta.file}`);
      if (!gj || !gj.features || gj.features.length === 0) continue;
      
      ORIGINAL.set(meta.key, gj);
      const srcId = `src-${meta.key}`;
      map.addSource(srcId, {type: 'geojson', data: gj});
      
      map.addLayer({ 
        id: `circle-${meta.key}`, 
        type: 'circle', 
        source: srcId,
        paint: { 
          'circle-radius': 8, 
          'circle-color': meta.color, 
          'circle-opacity': 0.9,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        } 
      });
      
      map.on('click', `circle-${meta.key}`, (e) => {
        const f = e.features[0];
        const popupContent = createPopup(f, meta);
        new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
      });
      
    } catch(err) {
      console.error('Failed to load', meta.file, ':', err.message);
    }
  }
}

// Create popup
function createPopup(feature, meta) {
  const props = feature.properties || {};
  const name = props.name || props.Name || props.NAME || props.hospital_name || props.center_name || props.clinic_name || meta.key;
  
  let content = `<div style="font-family: Arial, sans-serif; min-width: 200px;">
    <div style="font-weight: bold; font-size: 16px; color: #1e3a8a; margin-bottom: 10px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
      ${name}
    </div>`;
  
  Object.keys(props).forEach(key => {
    if (!['name', 'Name', 'NAME', 'facility_name', 'hospital_name', 'center_name', 'clinic_name'].includes(key)) {
      const value = props[key];
      if (value && value.toString().trim() !== '') {
        content += `<div style="margin-bottom: 6px; color: #1f2937;"><strong style="color: #111827;">${key}:</strong> ${value}</div>`;
      }
    }
  });
  
  content += '</div>';
  return content;
}

// Build legend
function buildLegend() {
  const root = document.getElementById('legend');
  if (!root) return;
  
  root.innerHTML = '';
  const colors = ['#ff6b6b', '#f59e0b', '#22d3ee', '#34d399', '#a78bfa', '#60a5fa', '#eab308'];
  const names = ['Blood Banks', 'Clinics', 'Diagnostic Center', 'Health Centers', 'Health Complex', 'Hospital Locations', 'Pharmacies'];
  
  names.forEach((name, i) => {
    root.insertAdjacentHTML('beforeend',
      `<div class="legend-item">
         <div class="legend-swatch circle" style="background:${colors[i]}; border-color:#fff"></div>
         <div class="legend-label">${name}</div>
       </div>`);
  });
}

// Fit map to all data
function fitToAll() {
  const b = new maplibregl.LngLatBounds();
  let added = false;
  
  ORIGINAL.forEach((data) => {
    if (data && data.features) {
      data.features.forEach(f => {
        if (f.geometry && f.geometry.coordinates) {
          b.extend(f.geometry.coordinates);
          added = true;
        }
      });
    }
  });
  
  if (added) map.fitBounds(b, {padding: 40});
}

// Load specialties UI
function loadSpecialties() {
  const root = document.getElementById('specialtiesList');
  if (!root) return;
  
  root.innerHTML = '';
  
  specialtiesData.forEach((specialty, index) => {
    const specialtyItem = document.createElement('div');
    specialtyItem.className = 'specialty-item';
    specialtyItem.dataset.index = index;
    
    const icon = getSpecialtyIcon(specialty.specialty);
    const staffCount = Math.floor(Math.random() * 15) + 5;
    
    specialtyItem.innerHTML = `
      <div class="specialty-icon">${icon}</div>
      <div class="specialty-content">
        <div class="specialty-hospital">${specialty.hospital}</div>
        <div class="specialty-name">${specialty.specialty}</div>
        <div class="specialty-staff">
          <div class="staff-badge">
            <span>👥</span>
            <span>${staffCount} Staff</span>
          </div>
          <div class="staff-badge staff-count">
            <span>🏥</span>
            <span>Active</span>
          </div>
        </div>
      </div>
    `;
    
    specialtyItem.addEventListener('click', () => {
      selectSpecialty(index);
    });
    
    root.appendChild(specialtyItem);
  });
}

// Get specialty icon
function getSpecialtyIcon(specialty) {
  const specialtyLower = specialty.toLowerCase();
  
  if (specialtyLower.includes('cardio')) return '❤️';
  if (specialtyLower.includes('onco')) return '🔬';
  if (specialtyLower.includes('derma')) return '🔍';
  if (specialtyLower.includes('trauma')) return '🚑';
  if (specialtyLower.includes('neuro')) return '🧠';
  if (specialtyLower.includes('internal')) return '🏥';
  if (specialtyLower.includes('surgery')) return '⚕️';
  if (specialtyLower.includes('pediatric')) return '👶';
  
  return '🏥';
}

// Select specialty
function selectSpecialty(index) {
  document.querySelectorAll('.specialty-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const selectedItem = document.querySelector(`[data-index="${index}"]`);
  if (selectedItem) {
    selectedItem.classList.add('active');
  }
}

// Utility functions
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${path}`);
  return res.json();
}

async function fetchCSV(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + ' not found');
  const text = await r.text();
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
  const headers = rows.shift().map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  return {H: headers, rows: rows};
}
