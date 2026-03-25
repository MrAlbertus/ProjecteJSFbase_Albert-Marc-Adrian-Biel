// Estat Global de la Botiga
let shopProducts = [];
const pointPoblationCache = {};
const shopPointsIndex = {};

// Jump from shop → map and focus the product's ReBit Point
window.goToPointFromShop = function (pointId, lat = null, lng = null, pointName = 'ReBit Point') {
    const safeId = (pointId && pointId !== 'null' && pointId !== 'undefined') ? pointId : '';
    const p = safeId ? shopPointsIndex[safeId] : null;
    const finalLat = p?.lat ?? lat;
    const finalLng = p?.lng ?? lng;
    if (finalLat == null || finalLng == null) return;

    // Ensure the main SPA router runs even if hash doesn't change
    if (window.location.hash !== '#mapa') {
        window.location.hash = '#mapa';
    } else {
        window.dispatchEvent(new Event('hashchange'));
    }

    setTimeout(() => {
        if (typeof window.focusLocation === 'function') {
            window.focusLocation(
                finalLat,
                finalLng,
                p?.name || pointName,
                p?.types || [],
                p?.parking || false,
                p?.schedules || '-',
                p?.address || '',
                p?.id || safeId
            );
        }
    }, 650);
};

document.addEventListener('DOMContentLoaded', () => {
    // Carregar productes al iniciar
    loadShopProducts();

    // Listeners pels filtres
    document.getElementById('shop-search')?.addEventListener('input', renderShopProducts);
    document.getElementById('shop-in-stock')?.addEventListener('change', renderShopProducts);
    document.getElementById('shop-point-filter')?.addEventListener('change', renderShopProducts);
    document.getElementById('shop-type-filter')?.addEventListener('change', renderShopProducts);
    document.querySelectorAll('input[name="shop-poblation"]').forEach(cb => cb.addEventListener('change', renderShopProducts));

    // Navegació cap a la botiga SPA func
    const navBotiga = document.querySelector('a[href="#botiga"]');
    navBotiga?.addEventListener('click', (e) => {
        e.preventDefault();
        showShopSection();
    });

    // Add Botiga to specific SPA routing if needed (index.html uses native anchor sometimes but we can force it)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const trg = e.target.getAttribute('href').substring(1);
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(trg)?.classList.add('active');
        });
    });
});

function showShopSection() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('botiga')?.classList.add('active');
}

async function loadShopProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    grid.innerHTML = '<p class="placeholder-text" style="grid-column: 1 / -1;">Carregant productes...</p>';
    
    try {
        const snap = await db.collection('products').get();
        shopProducts = [];
        Object.keys(shopPointsIndex).forEach(k => delete shopPointsIndex[k]);
        
        for (const doc of snap.docs) {
            const data = doc.data();
            // Resoldre el nom del punt si existeix
            let pointName = "Desconegut";
            let pointId = null;
            let pointPoblation = "";
            let pointTypes = [];
            let pointLat = null;
            let pointLng = null;
            let pointParking = false;
            let pointSchedules = '';
            let pointAddress = '';
            if (data.punt) {
                try {
                    pointId = data.punt.id;
                    const pointDoc = await data.punt.get();
                    if (pointDoc.exists) {
                        const pData = pointDoc.data();
                        pointName = pData.name || "ReBit Point";
                        pointTypes = Array.isArray(pData.type) ? pData.type : (pData.type ? [pData.type] : []);
                        pointParking = pData.hasParking !== undefined ? !!pData.hasParking : !!pData.parking;
                        pointSchedules = typeof pData.schedules === 'string'
                            ? pData.schedules
                            : `${pData.schedules?.open || '09:00'} - ${pData.schedules?.close || '20:00'}`;
                        pointAddress = pData.address || '';

                        const geo = pData.coords || pData.location;
                        if (geo && geo.latitude !== undefined && geo.longitude !== undefined) {
                            pointLat = geo.latitude;
                            pointLng = geo.longitude;
                        } else if (geo && geo.lat !== undefined && geo.lng !== undefined) {
                            pointLat = geo.lat;
                            pointLng = geo.lng;
                        }
                        
                        if (pData.poblation && typeof pData.poblation === 'string') {
                            pointPoblation = pData.poblation;
                        } else if (pointPoblationCache[pointId]) {
                            pointPoblation = pointPoblationCache[pointId];
                        } else {
                            const geo = pData.coords || pData.location; // Fallback to Geo object
                            if (geo && geo.latitude !== undefined && geo.longitude !== undefined) {
                                try {
                                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${geo.latitude}&lon=${geo.longitude}`);
                                    const rData = await res.json();
                                    if (rData && rData.address) {
                                        pointPoblation = rData.address.city || rData.address.town || rData.address.village || pData.name || "Desconeguda";
                                    } else {
                                        pointPoblation = pData.name || "Desconeguda";
                                    }
                                } catch (err) {
                                    pointPoblation = pData.name || "Desconeguda";
                                }
                            } else {
                                pointPoblation = pData.name || "Desconeguda";
                            }
                            pointPoblationCache[pointId] = pointPoblation;
                        }

                        // Index point data for "go to map" action
                        shopPointsIndex[pointId] = {
                            id: pointId,
                            name: pointName,
                            lat: pointLat,
                            lng: pointLng,
                            types: pointTypes,
                            parking: pointParking,
                            schedules: pointSchedules,
                            address: pointAddress
                        };
                    }
                } catch (e) {
                    console.warn("Could not resolve point for product", doc.id);
                }
            }
            
            const productOwnTypes = Array.isArray(data.type) && data.type.length > 0 
                ? data.type 
                : pointTypes;

            shopProducts.push({
                id: doc.id,
                ...data,
                pointId,
                pointName,
                pointPoblation,
                pointLat,
                pointLng,
                pointTypes: productOwnTypes
            });
        }
        
        populatePointFilter();
        populatePoblationFilter();
        renderShopProducts();
    } catch (err) {
        grid.innerHTML = `<p class="placeholder-text" style="grid-column: 1 / -1; color: #EF4444;">Error carregant productes: ${err.message}</p>`;
        console.error("Shop Load Error:", err);
    }
}

function populatePointFilter() {
    const pointSelect = document.getElementById('shop-point-filter');
    if (!pointSelect) return;
    
    // Obtenir punts únics
    const uniquePoints = {};
    shopProducts.forEach(p => {
        if (p.pointId) {
            uniquePoints[p.pointId] = p.pointName;
        }
    });
    
    // Manté el valor actual si existia per no reiniciar-lo al recarregar
    const currentValue = pointSelect.value;
    
    let html = '<option value="all">Tots els ReBit Points</option>';
    for (const [id, name] of Object.entries(uniquePoints)) {
        html += `<option value="${id}">${name}</option>`;
    }
    pointSelect.innerHTML = html;
    
    if (uniquePoints[currentValue]) {
        pointSelect.value = currentValue;
    }
}

function populatePoblationFilter() {
    const container = document.getElementById('shop-poblation-container');
    if (!container) return;

    // Obtenir poblacions des dels productes carregats
    const uniquePoblations = new Set();
    shopProducts.forEach(p => {
        if (p.pointPoblation && p.pointPoblation.trim() !== "Desconeguda" && p.pointPoblation.trim() !== "") {
            uniquePoblations.add(p.pointPoblation.trim());
        }
    });

    // Guardar valors actuals
    const selected = Array.from(document.querySelectorAll('input[name="shop-poblation"]:checked')).map(cb => cb.value);

    // Buidar
    container.innerHTML = '';
    
    // Sort
    const sorted = Array.from(uniquePoblations).sort((a, b) => a.localeCompare(b));
    
    // Omplir
    sorted.forEach(pob => {
        const isChecked = selected.includes(pob) ? 'checked' : '';
        const label = document.createElement('label');
        // Utilitzar els estils bàsics ja existents per checkboxes del sidebar
        label.innerHTML = `<input type="checkbox" name="shop-poblation" value="${pob}" ${isChecked}> ${pob}`;
        container.appendChild(label);
    });

    // Lligar els events un altre cop
    document.querySelectorAll('input[name="shop-poblation"]').forEach(cb => cb.addEventListener('change', renderShopProducts));
}

function renderShopProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const searchTerm = (document.getElementById('shop-search')?.value || '').toLowerCase();
    const inStockOnly = document.getElementById('shop-in-stock')?.checked || false;
    const pointFilter = document.getElementById('shop-point-filter')?.value || 'all';
    const typeFilter = document.getElementById('shop-type-filter')?.value || 'all';
    const selectedPoblation = Array.from(document.querySelectorAll('input[name="shop-poblation"]:checked')).map(cb => cb.value.toLowerCase());

    let filtered = shopProducts.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(searchTerm) || p.description?.toLowerCase().includes(searchTerm);
        const matchesStock = inStockOnly ? p.quantity > 0 : true;
        const matchesPoint = pointFilter === 'all' || p.pointId === pointFilter;
        const matchesType = typeFilter === 'all' || p.pointTypes.some(t => t.toLowerCase() === typeFilter.toLowerCase());
        
        const pobStr = (p.pointPoblation || "").toLowerCase();
        // Loose match: includes or normalizes Mataró/Mataro
        const matchesPob = selectedPoblation.length === 0 || selectedPoblation.some(city => pobStr.includes(city) || (city === "mataró" && pobStr.includes("mataro")));
        
        return matchesSearch && matchesStock && matchesPoint && matchesType && matchesPob;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="placeholder-text" style="grid-column: 1 / -1;">No s\'han trobat productes.</p>';
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const isSoldOut = p.quantity <= 0;
        return `
            <div class="product-card">
                <div class="product-card-img-wrapper">
                    ${isSoldOut ? '<span class="sold-out-badge">Exhaurit</span>' : ''}
                    <img src="${p.image || 'img/default-product.png'}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x200?text=Sense+Imatge'">
                    <div class="product-price-tag">${p.price}€</div>
                </div>
                <div class="product-card-body">
                    <h3>${p.name}</h3>
                    <p class="desc">${p.description || 'Sense descripció.'}</p>
                    
                    <div class="product-meta">
                        <button class="point clickable-point"
                            onclick="goToPointFromShop('${p.pointId || ''}', ${p.pointLat ?? 'null'}, ${p.pointLng ?? 'null'}, '${(p.pointName || 'ReBit Point').replace(/'/g, "\\'")}')"
                            style="cursor: pointer; transition: 0.2s; background: transparent; border: none; padding: 0; text-align: left; font: inherit;"
                            title="Veure aquest ReBit Point al mapa">
                            📍 ${p.pointName}
                        </button>
                        <span class="stock">${isSoldOut ? '0 en stock' : p.quantity + ' en stock'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// NOTE: "Buy" flow removed. Purchases are managed from backend/admin only.
