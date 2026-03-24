// 🔐 AUTHENTICATION
const loginForm = document.getElementById('login-form');
const loginContainer = document.getElementById('login-container');
const adminDashboard = document.getElementById('admin-dashboard');
const authStatusBtn = document.getElementById('auth-status');
const navGestio = document.getElementById('nav-gestio');
const gestioSection = document.getElementById('gestio');

auth.onAuthStateChanged(user => {
    if (user) {
        // Logged in
        loginContainer.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        navGestio.classList.remove('hidden');
        gestioSection.classList.remove('hidden');
        document.getElementById('edit-mode-container').classList.remove('hidden');
        authStatusBtn.textContent = "Admin";
        userLogged = true;
        updateDashboardStats();
    } else {
        // Logged out
        loginContainer.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
        navGestio.classList.add('hidden');
        gestioSection.classList.add('hidden');
        document.getElementById('edit-mode-container').classList.add('hidden');
        document.getElementById('edit-mode').checked = false;
        authStatusBtn.textContent = "Login";
        userLogged = false;
    }
});

loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        alert("Benvingut!");
    } catch (error) {
        alert("Error d'accés: " + error.message);
    }
};

document.getElementById('btn-logout').onclick = () => {
    auth.signOut();
};

// 📊 DASHBOARD STATS
async function updateDashboardStats() {
    const collections = ['points', 'products', 'clients', 'purchase', 'donate'];
    for (const coll of collections) {
        const snap = await db.collection(coll).get();
        let displayId = coll === 'purchase' ? 'count-purchases' : `count-${coll}`;
        if (coll === 'donate') displayId = 'count-donations'; // Map to UI ID

        const element = document.getElementById(displayId);
        if (element) element.textContent = snap.size;
    }
}

// 🛠️ ADMIN ACTIONS (Modals/CRUD)
function showAdminSection(type) {
    const modal = document.getElementById('admin-modal');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    title.textContent = `Gestió de ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    loadAdminData(type, content);
}

function closeModal() {
    document.getElementById('admin-modal').classList.add('hidden');
    document.getElementById('admin-modal').style.display = 'none';
}

async function loadAdminData(type, container) {
    container.innerHTML = '<p>Carregant dades...</p>';
    try {
        const snap = await db.collection(type).get();
        let html = '<table style="width:100%; text-align:left; border-collapse:collapse;">';
        html += '<tr style="border-bottom: 2px solid var(--primary);"><th>Detalls</th><th>Accions</th></tr>';

        snap.forEach(doc => {
            const data = doc.data();
            html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.1); padding: 5px;">
                <td style="padding: 10px;">
                    <b>${data.name || data.lastname || doc.id}</b><br>
                    <small>${type === 'clients' ? (data.points || 0) + ' punts' : ''}</small>
                </td>
                <td>
                    <button class="btn-secondary-sm" onclick="deleteEntry('${type}', '${doc.id}')">🗑️</button>
                    ${type === 'clients' ? `<button class="btn-primary-xs" onclick="addPoints('${doc.id}', ${data.points || 0})">+ Punts</button>` : ''}
                </td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

async function deleteEntry(type, id) {
    if (confirm("Segur que vols eliminar aquest element?")) {
        await db.collection(type).doc(id).delete();
        alert("Eliminat!");
        showAdminSection(type); // Refresh
        updateDashboardStats();
    }
}

async function addPoints(clientId, currentPoints) {
    const amount = prompt("Quants punts vols afegir?", "10");
    if (amount) {
        await db.collection('clients').doc(clientId).update({
            points: parseInt(currentPoints) + parseInt(amount)
        });
        alert("Punts actualitzats!");
        showAdminSection('clients');
    }
}
// 🛠️ MANAGEMENT HUB LOGIC
function showTab(tabId) {
    document.querySelectorAll('.management-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    const btn = document.querySelector(`button[onclick="showTab('${tabId}')"]`);
    if (btn) btn.classList.add('active');

    if (tabId === 'tab-recycle' || tabId === 'tab-purchase') {
        loadDropdowns();
    }
}

async function loadDropdowns() {
    const clientsSnap = await db.collection('clients').get();
    const prodsSnap = await db.collection('products').get();
    const pointsSnap = await db.collection('points').get(); // Reciclying points

    const clientSelects = ['recycle-client', 'purchase-client'];
    const clientOptions = '<option value="">Selecciona Client...</option>' +
        clientsSnap.docs.map(doc => `<option value="${doc.id}">${doc.data().name} ${doc.data().lastname || ''}</option>`).join('');

    clientSelects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = clientOptions;
    });

    const pointSelects = ['prod-point', 'recycle-point'];
    const pointOptions = '<option value="">Selecciona Punt...</option>' +
        pointsSnap.docs.map(doc => `<option value="${doc.id}">${doc.data().name}</option>`).join('');

    pointSelects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = pointOptions;
    });

    const prodSelect = document.getElementById('purchase-product');
    if (prodSelect) {
        prodSelect.innerHTML = '<option value="">Selecciona Producte...</option>' +
            prodsSnap.docs.map(doc => `<option value="${doc.id}" data-price="${doc.data().price || 0}">${doc.data().name} (${doc.data().price || 0}€)</option>`).join('');
    }
}

// FORM SUBMISSIONS
document.getElementById('form-client')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('client-name').value;
    const lastname = document.getElementById('client-lastname').value;
    const nif = document.getElementById('client-nif').value;
    const email = document.getElementById('client-email').value;
    const address = [
        document.getElementById('client-street').value,
        document.getElementById('client-province').value,
        document.getElementById('client-poblation').value,
        document.getElementById('client-postal').value
    ];

    try {
        await db.collection('clients').add({
            name, lastname, nif, email, address,
            punts: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Client registrat!");
        e.target.reset();
        updateDashboardStats();
    } catch (err) { alert(err.message); }
});

document.getElementById('form-product')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prod-name').value;
    const image = document.getElementById('prod-image').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const quantity = parseInt(document.getElementById('prod-quantity').value);
    const pointId = document.getElementById('prod-point').value;
    const description = document.getElementById('prod-desc').value;

    try {
        await db.collection('products').add({
            name, image, price, quantity, description,
            punt: db.doc(`points/${pointId}`) // Firestore Reference
        });
        alert("Producte afegit!");
        e.target.reset();
        updateDashboardStats();
    } catch (err) { alert(err.message); }
});

document.getElementById('form-recycle')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = document.getElementById('recycle-client').value;
    const pointId = document.getElementById('recycle-point').value;
    const quantity = parseInt(document.getElementById('recycle-quantity').value);
    const earnedPoints = parseInt(document.getElementById('earned-points').value);
    const types = Array.from(document.querySelectorAll('input[name="r-type"]:checked')).map(cb => cb.value);

    if (types.length === 0) return alert("Selecciona almenys un tipus de residu");

    try {
        await db.collection('donate').add({
            client: db.doc(`clients/${clientId}`),
            point: db.doc(`points/${pointId}`),
            types, // New field for waste types
            earnedPoints, quantity,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

        const userRef = db.collection('clients').doc(clientId);
        const userDoc = await userRef.get();
        await userRef.update({ punts: (userDoc.data().punts || 0) + earnedPoints });

        alert(`Reciclatge registrat! +${earnedPoints} punts.`);
        e.target.reset();
        updateDashboardStats();
    } catch (err) { alert(err.message); }
});

document.getElementById('form-purchase')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = document.getElementById('purchase-client').value;
    const selectProd = document.getElementById('purchase-product');
    const productId = selectProd.value;
    const quantity = parseInt(document.getElementById('purchase-quantity').value);
    const appliedDiscount = parseFloat(document.getElementById('purchase-discount').value) || 0;
    const pricePerUnit = parseFloat(selectProd.options[selectProd.selectedIndex].dataset.price);

    try {
        const userRef = db.collection('clients').doc(clientId);
        const userDoc = await userRef.get();
        const currentPunts = userDoc.data().punts || 0;

        // Verify if client has enough points for the discount
        if (currentPunts < appliedDiscount) {
            return alert(`El client no té punts suficients! (Té: ${currentPunts})`);
        }

        const totalPrice = (pricePerUnit * quantity) - (appliedDiscount / 100); // Ex: 100 punts = 1€ descompte

        await db.collection('purchase').add({
            client: db.doc(`clients/${clientId}`),
            product: db.doc(`products/${productId}`),
            quantity,
            appliedDiscount, // Points used as discount
            totalPrice: Math.max(0, totalPrice),
            datePurchase: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Deduct points
        await userRef.update({ punts: currentPunts - appliedDiscount });

        alert(`Compra realitzada! S'han restat ${appliedDiscount} punts.`);
        e.target.reset();
        updateDashboardStats();
    } catch (err) { alert(err.message); }
});

// 📊 DATA HUB RENDERING
async function loadCollectionData(col) {
    const displayArea = document.getElementById('data-display-area');
    if (!col) {
        displayArea.innerHTML = '<p class="placeholder-text">Selecciona una col·lecció per visualitzar els registres.</p>';
        return;
    }

    displayArea.innerHTML = '<p class="placeholder-text">Carregant dades...</p>';

    try {
        let snap;
        if (col === 'clients' || col === 'products' || col === 'points') {
            snap = await db.collection(col).orderBy('name').get();
        } else {
            snap = await db.collection(col).orderBy(col === 'purchase' ? 'datePurchase' : 'date', 'desc').get();
        }

        if (snap.empty) {
            displayArea.innerHTML = '<p class="placeholder-text">No hi ha registres en aquesta col·lecció.</p>';
            return;
        }

        let html = '';
        for (const doc of snap.docs) {
            const data = doc.data();
            html += await renderItemCard(col, doc.id, data);
        }
        displayArea.innerHTML = html;
    } catch (err) {
        console.error(err);
        displayArea.innerHTML = `<p class="placeholder-text" style="color:#ef4444;">Error: ${err.message}</p>`;
    }
}

async function renderItemCard(col, id, data) {
    let content = '';
    let title = id;

    if (col === 'clients') {
        title = `${data.name} ${data.lastname || ''}`;
        content = `
            <div class="data-field"><span class="label">Email</span><span class="value">${data.email || '-'}</span></div>
            <div class="data-field"><span class="label">NIF</span><span class="value">${data.nif || '-'}</span></div>
            <div class="data-field"><span class="label">Punts</span><span class="value">${data.punts || 0}</span></div>
            <div class="data-field"><span class="label">Adreça</span><span class="value">${(data.address || []).join(', ')}</span></div>
        `;
    } else if (col === 'products') {
        title = data.name;
        const pointName = await resolveRefName(data.punt);
        content = `
            <div class="data-field"><span class="label">Preu</span><span class="value">${data.price}€</span></div>
            <div class="data-field"><span class="label">Stock</span><span class="value">${data.quantity}</span></div>
            <div class="data-field"><span class="label">Punt</span><span class="value">${pointName}</span></div>
            <div class="data-field"><span class="label">ID</span><span class="value">${id}</span></div>
        `;
    } else if (col === 'donate') {
        const clientName = await resolveRefName(data.client);
        const pointName = await resolveRefName(data.point);
        title = `Donació - ${formatDate(data.date)}`;
        content = `
            <div class="data-field"><span class="label">Client</span><span class="value">${clientName}</span></div>
            <div class="data-field"><span class="label">Punt</span><span class="value">${pointName}</span></div>
            <div class="data-field"><span class="label">Punts Guanyats</span><span class="value">+${data.earnedPoints}</span></div>
            <div class="data-field"><span class="label">Tipus</span><span class="value">${(data.types || []).join(', ')}</span></div>
        `;
    } else if (col === 'purchase') {
        const clientName = await resolveRefName(data.client);
        const prodName = await resolveRefName(data.product);
        title = `Compra - ${formatDate(data.datePurchase)}`;
        content = `
            <div class="data-field"><span class="label">Client</span><span class="value">${clientName}</span></div>
            <div class="data-field"><span class="label">Producte</span><span class="value">${prodName}</span></div>
            <div class="data-field"><span class="label">Quantitat</span><span class="value">${data.quantity}</span></div>
            <div class="data-field"><span class="label">Total</span><span class="value">${data.totalPrice}€</span></div>
        `;
    } else if (col === 'points') {
        title = data.name;
        // Resolve Horari (Handle an object or string)
        let horariStr = data.schedules || '-';
        if (typeof data.schedules === 'object' && data.schedules !== null) {
            horariStr = `${data.schedules.open || 'N/A'} - ${data.schedules.close || 'N/A'}`;
        }

        // Enhance types with badges
        const typesArr = Array.isArray(data.type) ? data.type : (data.type ? [data.type] : []);
        const typesHtml = typesArr.map(t => {
            const colors = { "Oli": "#fbbf24", "Piles": "#f87171", "Roba": "#a78bfa", "Plàstic": "#60a5fa", "Vidre": "#34d399", "Paper": "#f97316" };
            const color = colors[t] || "var(--primary)";
            return `<span style="display:inline-block; padding:2px 8px; border-radius:6px; background:${color}22; color:${color}; border:1px solid ${color}44; font-size:0.7rem; margin-right:4px; font-weight:700;">${t}</span>`;
        }).join('');

        content = `
            <div class="data-field"><span class="label">Tipus</span><div class="value">${typesHtml || '-'}</div></div>
            <div class="data-field"><span class="label">Horari</span><span class="value">${horariStr}</span></div>
            <div class="data-field"><span class="label">Pàrquing</span><span class="value">${data.parking ? '✅ SÍ' : '❌ NO'}</span></div>
        `;
    }

    return `
        <div class="data-item-card">
            <div class="card-header">
                <h4>${title}</h4>
                <span class="id-label">${id}</span>
            </div>
            <div class="card-body">
                ${content}
            </div>
        </div>
    `;
}

async function resolveRefName(ref) {
    if (!ref) return 'Desconegut';
    try {
        if (typeof ref === 'string') return ref;
        const doc = await ref.get();
        if (!doc.exists) return 'N/A';
        const data = doc.data();
        return data.name || data.id || ref.id;
    } catch { return ref.id || 'Error'; }
}

function formatDate(ts) {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Injecció de la lògica de canvi de pestanya
const oldShowTab = window.showTab;
window.showTab = (tabId) => {
    // Crida la funció original des de l'index si existeix, o la gestiona directament
    document.querySelectorAll('.management-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');

    const btn = document.querySelector(`button[onclick="showTab('${tabId}')"]`);
    if (btn) btn.classList.add('active');

    if (tabId === 'tab-recycle' || tabId === 'tab-purchase') {
        loadDropdowns();
    }

    if (tabId === 'tab-data') {
        const select = document.getElementById('data-collection-select');
        if (select) loadCollectionData(select.value);
    }
};
