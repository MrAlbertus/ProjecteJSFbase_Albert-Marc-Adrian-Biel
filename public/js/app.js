// 📍 Inicializar mapa (Barcelona por defecto)
const map = L.map('map').setView([41.3851, 2.1734], 13);

// 🗺️ Cargar mapa base (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);


// 🔎 Cargar puntos de reciclaje desde Overpass
async function cargarReciclaje() {
  const query = `
    [out:json];
    node["amenity"="recycling"](around:3000,41.3851,2.1734);
    out;
  `;

  const url = "https://overpass-api.de/api/interpreter";

  try {
    const response = await fetch(url, {
      method: "POST",
      body: query
    });

    const data = await response.json();

    data.elements.forEach(el => {
      if (el.lat && el.lon) {
        const nombre = el.tags?.name || "Punto de reciclaje";
        const tipo = el.tags?.recycling_type || "General";

        L.marker([el.lat, el.lon])
          .addTo(map)
          .bindPopup(`
            <b>${nombre}</b><br>
            Tipo: ${tipo}
          `);
      }
    });

  } catch (error) {
    console.error("Error cargando datos:", error);
  }
}

cargarReciclaje();


// ➕ Añadir nuevos puntos haciendo click
map.on('click', function(e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  const popupContent = `
    <div class="popup-form">
      <input id="name" placeholder="Nombre del punto" />
      <select id="type">
        <option value="glass">Vidrio</option>
        <option value="plastic">Plástico</option>
        <option value="paper">Papel</option>
        <option value="general">General</option>
      </select>
      <button onclick="guardarPunto(${lat}, ${lng})">Guardar</button>
    </div>
  `;

  L.popup()
    .setLatLng([lat, lng])
    .setContent(popupContent)
    .openOn(map);
});


// 💾 Guardar punto (por ahora solo en mapa + consola)
function guardarPunto(lat, lng) {
  const name = document.getElementById("name").value;
  const type = document.getElementById("type").value;

  L.marker([lat, lng])
    .addTo(map)
    .bindPopup(`
      <b>${name || "Nuevo punto"}</b><br>
      Tipo: ${type}
    `);

  console.log("Nuevo punto:", { lat, lng, name, type });

  map.closePopup();
}


// 📍 Geolocalización usuario (opcional)
map.locate({ setView: true, maxZoom: 15 });

map.on('locationfound', function(e) {
  L.circle(e.latlng, {
    radius: 50
  }).addTo(map).bindPopup("Estás aquí");
});