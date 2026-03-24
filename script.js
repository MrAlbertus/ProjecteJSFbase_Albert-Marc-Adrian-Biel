// mapa config
const map = L.map('map', { scrollWheelZoom: false }).setView([41.539, 2.444], 14);

const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

// Moure mapa i mostrar punts
function focusLocation(lat, lng, name, types, parking, schedules) {
    map.flyTo([lat, lng], 16);
    const parkingStatus = parking ? "✅ Disponible" : "❌ No disponible";
    
    L.popup()
        .setLatLng([lat, lng])
        .setContent(`
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 5px;">
                <b style="font-size:1rem; color:#10B981">${name}</b><br>
                <div style="margin-top:5px; font-size:0.85rem">
                    <b>Tipus:</b> ${types.join(', ')}<br>
                    <b>Pàrquing:</b> ${parkingStatus}<br>
                    <b>Horari:</b> ${schedules}
                </div>
            </div>
        `)
        .openOn(map);
}

// Tema pàgina principal (clar/obscur)
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

// Aqui és la simulació del login (adrian, esto lo puedes modificar)
document.getElementById('btn-login').onclick = () => {
    document.getElementById('nav-gestio').classList.remove('hidden');
    document.getElementById('gestio').classList.remove('hidden');
    document.getElementById('auth-status').textContent = "Perfil";
    alert("Benvingut! Secció de gestió habilitada.");
    window.location.hash = "#home";
};

// Aqui és la simulació del login (adrian, esto lo puedes modificar)
document.getElementById('add-form').onsubmit = (e) => {
    e.preventDefault();
    console.log("Enviant a Firebase...");
    alert("Punt guardat correctament amb l'estructura NoSQL!");
};