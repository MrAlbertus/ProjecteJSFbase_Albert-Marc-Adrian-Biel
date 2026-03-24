// 🧠 Estado de autenticación
let userLogged = false;

firebase.auth().onAuthStateChanged(user => {
    userLogged = !!user;
});

// 🗺️ MAPA
const map = L.map('map', { scrollWheelZoom: false }).setView([41.539, 2.444], 14);

const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

// 📍 CAPA DE MARCADORS
const markersLayer = L.layerGroup().addTo(map);

// 🔍 SINCRONITZACIÓ EN TEMPS REAL AMB FIRESTORE
let allPoints = []; // Estocarem tots els punts localment per filtrar ràpid

function initRealTimeSync() {
    db.collection("points").onSnapshot(snapshot => {
        allPoints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyFilters();
    }, error => {
        console.error("Error en el listener de Firestore:", error);
    });
}

function applyFilters() {
    const typeFilter = document.getElementById('filter-type').value;
    const parkingFilter = document.getElementById('filter-parking').checked;

    const filtered = allPoints.filter(p => {
        // Normalitzem el tipus (pot ser array o string)
        const pointTypes = Array.isArray(p.type) ? p.type : (p.type ? [p.type] : []);
        
        const matchesType = typeFilter === 'all' || 
            pointTypes.some(t => t.toLowerCase().trim() === typeFilter.toLowerCase().trim());
            
        const matchesParking = !parkingFilter || p.hasParking === true;
        
        return matchesType && matchesParking;
    });

    renderMarkers(filtered);
}

function renderMarkers(points) {
    markersLayer.clearLayers();
    const listContainer = document.getElementById('locations-list');
    listContainer.innerHTML = '';

    points.forEach(p => {
        const { name, location, type, hasParking, schedules } = p;
        if (location && (location.latitude || location.lat)) {
            const lat = location.latitude || location.lat;
            const lng = location.longitude || location.lng;
            const typeList = Array.isArray(type) ? type : [type || 'General'];

            // Marcador
            L.marker([lat, lng])
                .addTo(markersLayer)
                .bindPopup(`
                    <div class="popup-info">
                        <b style="color:#10B981">${name || 'Sense nom'}</b><br>
                        <small>${typeList.join(', ')}</small><br>
                        <button class="btn-primary-xs" onclick="focusLocation(${lat}, ${lng}, '${name || 'Punt'}', ${JSON.stringify(typeList).replace(/"/g, '&quot;')}, ${!!hasParking}, '${schedules?.open || '09:00'} - ${schedules?.close || '20:00'}')">Ver detalles</button>
                    </div>
                `);

            // Llista
            const card = document.createElement('div');
            card.className = 'location-card';
            card.onclick = () => focusLocation(lat, lng, name, typeList, !!hasParking, `${schedules?.open || '09:00'} - ${schedules?.close || '20:00'}`);
            card.innerHTML = `
                <div class="icon">📍</div>
                <div class="card-info">
                    <h4>${name || 'Sense nom'}</h4>
                    <p class="types">Residus: ${typeList.join(', ')}</p>
                    ${hasParking ? '<span class="parking-tag">🅿️ Pàrquing disponible</span>' : ''}
                </div>
            `;
            listContainer.appendChild(card);
        }
    });
}

// Listeners per als filtres
document.getElementById('filter-type').addEventListener('change', applyFilters);
document.getElementById('filter-parking').addEventListener('change', applyFilters);
document.getElementById('btn-reset-filters').onclick = () => {
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-parking').checked = false;
    applyFilters();
};

// Inicialitzar la sincronització
initRealTimeSync();

// 📍 POPUP INFO EXISTENTE
function focusLocation(lat, lng, name, types, parking, schedules) {
    map.flyTo([lat, lng], 16);
    const parkingStatus = parking ? "✅ Disponible" : "❌ No disponible";
    
    L.popup()
        .setLatLng([lat, lng])
        .setContent(`
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 5px;">
                <b style="font-size:1rem; color:#10B981">${name}</b><br>
                <div style="margin-top:5px; font-size:0.85rem">
                    <b>Tipus:</b> ${Array.isArray(types) ? types.join(', ') : types}<br>
                    <b>Pàrquing:</b> ${parkingStatus}<br>
                    <b>Horari:</b> ${schedules}
                </div>
            </div>
        `)
        .openOn(map);
}

// 🎨 TEMA
document.getElementById('checkbox').addEventListener('change', (e) => {
    document.body.classList.toggle('light-mode');
    if (e.target.checked) {
        map.removeLayer(darkTiles);
        lightTiles.addTo(map);
    } else {
        map.removeLayer(lightTiles);
        darkTiles.addTo(map);
    }
});

// 🔐 EL LOGIN ARA ES GESTIONA A admin.js AMB FIREBASE AUTH

// 🗺️ CLICK EN MAPA → POPUP
map.on('click', function(e) {
    console.log("Map clicked. userLogged:", userLogged); // Debug
    if (!userLogged) return;
    
    const editModeCheckbox = document.getElementById('edit-mode');
    console.log("Edit Mode Checkbox:", editModeCheckbox?.checked); // Debug
    
    if (!editModeCheckbox || !editModeCheckbox.checked) return;

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    const popupContent = `
        <div class="popup-add">
            <button class="btn-primary" onclick="showForm(${lat}, ${lng})">
                ➕ Afegir punt aquí
            </button>
        </div>
    `;

    L.popup()
        .setLatLng([lat, lng])
        .setContent(popupContent)
        .openOn(map);
});

// 🧾 FORMULARIO
function showForm(lat, lng) {
    const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0') + ':00');
    const types = ["Oli", "Piles", "Roba", "Plàstic", "Vidre", "Paper"];
    
    const formHTML = `
        <div class="popup-form-modern">
            <h4>Nou punt</h4>

            <input id="p-name" placeholder="Nom del lloc" />
            
            <div class="type-selection">
                <p style="font-size:0.8rem; margin-bottom:5px;">Tipus de residu:</p>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                    ${types.map(t => `
                        <label style="font-size:0.75rem;">
                            <input type="checkbox" name="p-type" value="${t}"> ${t}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="display:flex; gap:10px;">
                <label><input type="checkbox" id="p-parking" /> Pàrquing</label>
                <label><input type="checkbox" id="p-shop" /> Botiga</label>
            </div>

            <div style="display:flex; align-items:center; gap:5px; font-size:0.8rem;">
                <span>Horari:</span>
                <select id="p-open">${hours.map(h => `<option value="${h}" ${h === '09:00' ? 'selected' : ''}>${h}</option>`).join('')}</select>
                <span>-</span>
                <select id="p-close">${hours.map(h => `<option value="${h}" ${h === '20:00' ? 'selected' : ''}>${h}</option>`).join('')}</select>
            </div>

            <button class="btn-primary" onclick="savePoint(${lat}, ${lng})">
                Guardar
            </button>
        </div>
    `;

    L.popup()
        .setLatLng([lat, lng])
        .setContent(formHTML)
        .openOn(map);
}

// 💾 GUARDAR EN FIRESTORE
async function savePoint(lat, lng) {
    try {
        const name = document.getElementById("p-name").value;
        const typeCheckboxes = document.querySelectorAll('input[name="p-type"]:checked');
        const types = Array.from(typeCheckboxes).map(cb => cb.value);
        const hasParking = document.getElementById("p-parking").checked;
        const hasShop = document.getElementById("p-shop").checked;
        const open = document.getElementById("p-open").value;
        const close = document.getElementById("p-close").value;

        if (!name || types.length === 0) {
            alert("Siusplau, posa un nom i selecciona almenys un tipus de residu.");
            return;
        }

        const newPoint = {
            name: name,
            location: new firebase.firestore.GeoPoint(lat, lng),
            type: types,
            hasParking: hasParking,
            hasShop: hasShop,
            schedules: {
                open: open,
                close: close
            },
            createdBy: firebase.auth().currentUser?.uid || "admin_manual"
        };

        await db.collection("points").add(newPoint);
        map.closePopup();
        alert("Punt afegit 🔥");

    } catch (error) {
        console.error(error);
        alert("Error guardant: " + error.message);
    }
}