// 🧠 Estado de autenticación
let userLogged = false;

firebase.auth().onAuthStateChanged(user => {
    userLogged = !!user;
});

// 🗺️ MAPA
const map = L.map('map', {
    scrollWheelZoom: true, // Habilitat com ha demanat l'usuari
    zoomControl: false
}).setView([41.539, 2.444], 14);

L.control.zoom({ position: 'bottomright' }).addTo(map);

const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

// 🧭 NAVEGACIÓ SPA
function handleRouting() {
    const hash = window.location.hash || '#home';
    const sections = document.querySelectorAll('.section');
    const navBtns = document.querySelectorAll('.nav-btn');

    sections.forEach(s => s.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));

    const activeSection = document.querySelector(hash);
    if (activeSection) {
        activeSection.classList.add('active');
        // Necessari per Leaflet quan el contenidor era hidden
        if (hash === '#mapa') {
            setTimeout(() => map.invalidateSize(), 150);
        }
    } else {
        document.getElementById('home').classList.add('active');
    }

    // Activar botó nav
    const activeBtn = document.querySelector(`a[href="${hash}"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);

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
        const { id, name, location, coords, type, hasParking, parking, schedules, address } = p;
        const loc = location || coords;
        if (loc && (loc.latitude !== undefined || loc.lat !== undefined)) {
            const lat = loc.latitude !== undefined ? loc.latitude : loc.lat;
            const lng = loc.longitude !== undefined ? loc.longitude : loc.lng;
            const typeList = Array.isArray(type) ? type : [type || 'General'];
            const isParking = hasParking !== undefined ? hasParking : !!parking;
            const addressStr = typeof address === 'string' ? address : '';
            
            const schedulesStr = typeof schedules === 'string' 
                ? schedules 
                : `${schedules?.open || '09:00'} - ${schedules?.close || '20:00'}`;

            // Marcador
            L.marker([lat, lng])
                .addTo(markersLayer)
                .bindPopup(`
                    <div style="font-family: 'Outfit', 'Inter', sans-serif;">
                        <b style="color:#0db175">${name || 'Sense nom'}</b><br>
                        <small>${typeList.join(', ')}</small><br>
                        <button class="btn-primary-xs" style="margin-top: 5px; cursor: pointer; border:none; border-radius: 4px; padding: 4px 8px; background: var(--primary); color: white;" onclick="focusLocation(${lat}, ${lng}, '${(name || 'ReBit Point').replace(/'/g, "\\'")}', [${typeList.map(t => `'${t}'`).join(',')}], ${isParking}, '${schedulesStr.replace(/'/g, "\\'")}', '${addressStr.replace(/'/g, "\\'")}', '${id || ''}')">Veure detalls</button>
                    </div>
                `);

            // Llista
            const card = document.createElement('div');
            card.className = 'location-card';
            card.onclick = () => focusLocation(lat, lng, name, typeList, isParking, schedulesStr, addressStr, id);
            
            // Map types to emojis/badges
            const typeBadges = typeList.map(t => {
                const colors = { "Oli": "#fbbf24", "Piles": "#f87171", "Roba": "#a78bfa", "Plàstic": "#60a5fa", "Vidre": "#34d399", "Paper": "#f97316", "Runes": "#9ca3af", "Medicaments": "#f472b6" };
                const color = colors[t] || "var(--primary)";
                return `<span style="display:inline-block; padding:2px 8px; border-radius:6px; background:${color}22; color:${color}; border:1px solid ${color}44; font-size:0.7rem; margin-right:4px; font-weight:700;">${t}</span>`;
            }).join('');

            card.innerHTML = `
                <div class="icon" style="background:var(--nav-btn-bg); width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:12px; font-size:1.2rem;">📍</div>
                <div class="card-info">
                    <h4 style="margin-bottom:4px;">${name || 'Sense nom'}</h4>
                    <div class="types-badges" style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px;">
                        ${typeBadges}
                    </div>
                    ${hasParking ? '<span class="parking-tag" style="color:var(--primary); font-size:0.7rem; font-weight:800;">🅿️ Pàrquing disponible</span>' : ''}
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

// Reverse geocoding helper (Nominatim)
async function reverseGeocode(lat, lng) {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const addr = data?.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || "Desconeguda";
    const display = data?.display_name || "";
    return { city, address: display };
}

// 📍 POPUP INFO (with address)
function focusLocation(lat, lng, name, types, parking, schedules, address = '', pointId = '') {
    map.flyTo([lat, lng], 16);
    const parkingStatus = parking ? "✅ Disponible" : "❌ No disponible";
    const hasAddress = typeof address === 'string' && address.trim() !== '';
    const addressLine = hasAddress ? `<b>Adreça:</b> ${address}<br>` : `<b>Adreça:</b> <span style="opacity:0.7;">Carregant...</span><br>`;

    const popup = L.popup()
        .setLatLng([lat, lng])
        .setContent(`
            <div style="font-family: 'Outfit', 'Inter', sans-serif; padding: 5px;">
                <b style="font-size:1rem; color:#0db175">${name}</b><br>
                <div style="margin-top:5px; font-size:0.85rem">
                    <b>Tipus:</b> ${Array.isArray(types) ? types.join(', ') : types}<br>
                    <b>Pàrquing:</b> ${parkingStatus}<br>
                    <b>Horari:</b> ${schedules}<br>
                    ${addressLine}
                </div>
            </div>
        `)
        .openOn(map);

    if (!hasAddress && pointId) {
        // Lazy-fill address for older points (and persist)
        reverseGeocode(lat, lng).then(async ({ city, address: addr }) => {
            if (!addr) return;
            try {
                await db.collection("points").doc(pointId).update({
                    address: addr,
                    poblation: city
                });
            } catch (e) {
                // ignore write errors (rules/offline)
            }
            popup.setContent(`
                <div style="font-family: 'Outfit', 'Inter', sans-serif; padding: 5px;">
                    <b style="font-size:1rem; color:#0db175">${name}</b><br>
                    <div style="margin-top:5px; font-size:0.85rem">
                        <b>Tipus:</b> ${Array.isArray(types) ? types.join(', ') : types}<br>
                        <b>Pàrquing:</b> ${parkingStatus}<br>
                        <b>Horari:</b> ${schedules}<br>
                        <b>Adreça:</b> ${addr}<br>
                    </div>
                </div>
            `);
        }).catch(() => { /* ignore */ });
    }
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
map.on('click', function (e) {
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
                ➕ Afegir ReBit Point aquí
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
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00');
    const types = ["Oli", "Piles", "Roba", "Plàstic", "Vidre", "Paper", "Runes", "Medicaments"];

    const formHTML = `
        <div class="glass-popup form-rebit" style="padding:20px; min-width:280px; max-width:320px;">
            <h4 style="margin-bottom:15px; color:var(--primary);">📍 Nou ReBit Point</h4>

            <input id="p-name" placeholder="Nom del lloc" required />
            
            <div class="type-selection-small" style="margin:10px 0; background:rgba(255,255,255,0.02); padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                <p style="font-size:0.75rem; margin-bottom:8px; opacity:0.6; font-weight:700;">TIPUS DE RESIDU:</p>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                    ${types.map(t => `
                        <label style="font-size:0.8rem; display:flex; align-items:center; gap:6px; cursor:pointer;">
                            <input type="checkbox" name="p-type" value="${t}"> ${t}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                <label style="font-size:0.8rem; display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="p-parking"> Pàrquing
                </label>
                <label style="font-size:0.8rem; display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="p-shop"> Botiga
                </label>
            </div>

            <div style="display:grid; grid-template-columns: 1fr auto 1fr; align-items:center; gap:8px;">
                <select id="p-open">${hours.map(h => `<option value="${h}" ${h === '09:00' ? 'selected' : ''}>${h}</option>`).join('')}</select>
                <span style="opacity:0.4;">—</span>
                <select id="p-close">${hours.map(h => `<option value="${h}" ${h === '20:00' ? 'selected' : ''}>${h}</option>`).join('')}</select>
            </div>

            <button class="btn-primary" onclick="savePoint(${lat}, ${lng})" style="margin-top:15px; width:100%; padding:12px; font-weight:700;">
                Guardar ReBit Point
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

        // Extreure Població + Adreça via Reverse Geocoding (Nominatim)
        let city = "Desconeguda";
        let address = "";
        try {
            const geo = await reverseGeocode(lat, lng);
            city = geo.city || "Desconeguda";
            address = geo.address || "";
        } catch (e) {
            console.warn("No s'ha pogut obtenir la ubicació");
        }

        const newPoint = {
            name: name,
            poblation: city,
            address: address,
            coords: new firebase.firestore.GeoPoint(lat, lng), // Schema: coords
            type: types,
            parking: hasParking, // Schema: parking
            hasShop: hasShop,
            schedules: `${open} - ${close}`, // Schema: string
            createdBy: firebase.auth().currentUser?.uid || "admin_manual"
        };

        await db.collection("points").add(newPoint);
        map.closePopup();
        alert("ReBit Point afegit correctament! 🔥");

    } catch (error) {
        console.error(error);
        alert("Error guardant: " + error.message);
    }
}
