// 🔐 AUTHENTICATION
const loginForm = document.getElementById('login-form');
const loginContainer = document.getElementById('login-container');
const adminDashboard = document.getElementById('admin-dashboard');
const authStatusBtn = document.getElementById('auth-status');
const gestioSection = document.getElementById('gestio');

auth.onAuthStateChanged(user => {
    if (user) {
        // Logged in
        loginContainer.classList.add('hidden');
        adminDashboard?.classList.remove('hidden');
        gestioSection.classList.remove('hidden');
        document.getElementById('edit-mode-container').classList.remove('hidden');
        authStatusBtn.textContent = "Admin";
        authStatusBtn.setAttribute('href', '#gestio');
        userLogged = true;
        updateDashboardStats();
    } else {
        // Logged out
        loginContainer.classList.remove('hidden');
        adminDashboard?.classList.add('hidden');
        gestioSection.classList.add('hidden');
        document.getElementById('edit-mode-container').classList.add('hidden');
        document.getElementById('edit-mode').checked = false;
        authStatusBtn.textContent = "Login";
        authStatusBtn.setAttribute('href', '#perfil');
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
                    <small>${type === 'clients' ? (data.points || 0) + ' ReBit Coins' : ''}</small>
                </td>
                <td>
                    <button class="btn-secondary-sm" onclick="deleteEntry('${type}', '${doc.id}')">🗑️</button>
                    ${type === 'clients' ? `<button class="btn-primary-xs" onclick="addPoints('${doc.id}', ${data.points || 0})">+ ReBit Coins</button>` : ''}
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
    const amount = prompt("Quants ReBit Coins vols afegir?", "10");
    if (amount) {
        await db.collection('clients').doc(clientId).update({
            points: parseInt(currentPoints) + parseInt(amount)
        });
        alert("ReBit Coins actualitzats!");
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

    if (tabId === 'tab-recycle' || tabId === 'tab-purchase' || tabId === 'tab-products') {
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

    const pointsAll = pointsSnap.docs;
    // Points created from the map use `hasShop` (see `public/js/map.js`)
    const pointsShop = pointsAll.filter(doc => doc.data().hasShop === true);

    const prodPointOptions = '<option value="">Selecciona ReBit Point...</option>' +
        pointsShop.map(doc => `<option value="${doc.id}">${doc.data().name}</option>`).join('');

    const recyclePointOptions = '<option value="">Selecciona ReBit Point...</option>' +
        pointsAll.map(doc => `<option value="${doc.id}">${doc.data().name}</option>`).join('');

    const elProd = document.getElementById('prod-point');
    if (elProd) elProd.innerHTML = prodPointOptions;

    const elRecycle = document.getElementById('recycle-point');
    if (elRecycle) elRecycle.innerHTML = recyclePointOptions;

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
        if (e.target.dataset.editId) {
            await db.collection('clients').doc(e.target.dataset.editId).update({
                name, lastname, nif, email, address
            });
            alert("Client actualitzat correctament!");
            e.target.removeAttribute('data-edit-id');
            e.target.querySelector('button[type="submit"]').textContent = 'Registrar Client';
        } else {
            await db.collection('clients').add({
                name, lastname, nif, email, address,
                punts: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Client registrat!");
        }

        e.target.reset();
        updateDashboardStats();
        showTab('tab-data');
        loadCollectionData('clients');
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
    const typesCheckboxes = Array.from(document.querySelectorAll('input[name="prod-type"]:checked')).map(cb => cb.value);

    try {
        if (e.target.dataset.editId) {
            await db.collection('products').doc(e.target.dataset.editId).update({
                name, image, price, quantity, description,
                type: typesCheckboxes,
                punt: db.doc(`points/${pointId}`) // Firestore Reference
            });
            alert("Producte actualitzat correctament!");
            e.target.removeAttribute('data-edit-id');
            e.target.querySelector('button[type="submit"]').textContent = 'Afegir al Catàleg';
        } else {
            await db.collection('products').add({
                name, image, price, quantity, description,
                type: typesCheckboxes,
                punt: db.doc(`points/${pointId}`) // Firestore Reference
            });
            alert("Producte afegit!");
        }
        e.target.reset();
        updateDashboardStats();
        showTab('tab-data');
        loadCollectionData('products');
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
        if (e.target.dataset.editId) {
            const donateRef = db.collection('donate').doc(e.target.dataset.editId);
            const prevSnap = await donateRef.get();
            if (!prevSnap.exists) return alert("El registre a editar no existeix.");
            const prev = prevSnap.data() || {};
            const prevClientId = prev.client?.id || null;
            const prevEarned = parseInt(prev.earnedPoints || 0);

            // Edit existing donate record
            await donateRef.update({
                client: db.doc(`clients/${clientId}`),
                point: db.doc(`points/${pointId}`),
                types,
                earnedPoints,
                quantity
            });

            // Adjust client coins by delta (avoid double counting on edit)
            const newEarned = parseInt(earnedPoints || 0);
            const newClientId = clientId || null;
            if (prevClientId && prevClientId !== newClientId) {
                const prevUserRef = db.collection('clients').doc(prevClientId);
                const prevUserDoc = await prevUserRef.get();
                await prevUserRef.update({ punts: (prevUserDoc.data().punts || 0) - prevEarned });
            } else if (prevClientId && prevClientId === newClientId) {
                const delta = newEarned - prevEarned;
                if (delta !== 0) {
                    const userRef = db.collection('clients').doc(newClientId);
                    const userDoc = await userRef.get();
                    await userRef.update({ punts: (userDoc.data().punts || 0) + delta });
                }
            }
            if (newClientId && prevClientId !== newClientId) {
                const newUserRef = db.collection('clients').doc(newClientId);
                const newUserDoc = await newUserRef.get();
                await newUserRef.update({ punts: (newUserDoc.data().punts || 0) + newEarned });
            }

            alert(`Reciclatge actualitzat!`);
            e.target.removeAttribute('data-edit-id');
            e.target.querySelector('button[type="submit"]').textContent = 'Confirmar Reciclatge';
        } else {
            // Create new donate record
            await db.collection('donate').add({
                client: db.doc(`clients/${clientId}`),
                point: db.doc(`points/${pointId}`),
                types, // New field for waste types
                earnedPoints, quantity,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert(`Reciclatge registrat! +${earnedPoints} ReBit Coins.`);
        }

        // Only apply coin increment on creation (edit already handled with delta)
        if (!e.target.dataset.editId) {
            const userRef = db.collection('clients').doc(clientId);
            const userDoc = await userRef.get();
            await userRef.update({ punts: (userDoc.data().punts || 0) + earnedPoints });
        }

        e.target.reset();
        updateDashboardStats();
        showTab('tab-data');
        loadCollectionData('donate');
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
            return alert(`El client no té ReBit Coins suficients! (Té: ${currentPunts})`);
        }

        const totalPrice = (pricePerUnit * quantity) - (appliedDiscount / 100); // Ex: 100 ReBit Coins = 1€ descompte

        if (e.target.dataset.editId) {
            const purchaseRef = db.collection('purchase').doc(e.target.dataset.editId);
            const prevSnap = await purchaseRef.get();
            if (!prevSnap.exists) return alert("El registre a editar no existeix.");
            const prev = prevSnap.data() || {};
            const prevClientId = prev.client?.id || null;
            const prevDiscount = parseFloat(prev.appliedDiscount || 0);

            await purchaseRef.update({
                client: db.doc(`clients/${clientId}`),
                product: db.doc(`products/${productId}`),
                quantity,
                appliedDiscount,
                totalPrice: Math.max(0, totalPrice)
            });

            // Adjust client coins by delta (avoid double counting on edit)
            const newDiscount = parseFloat(appliedDiscount || 0);
            const newClientId = clientId || null;
            if (prevClientId && prevClientId !== newClientId) {
                const prevUserRef = db.collection('clients').doc(prevClientId);
                const prevUserDoc = await prevUserRef.get();
                await prevUserRef.update({ punts: (prevUserDoc.data().punts || 0) + prevDiscount });
            } else if (prevClientId && prevClientId === newClientId) {
                const delta = newDiscount - prevDiscount;
                if (delta !== 0) {
                    const uRef = db.collection('clients').doc(newClientId);
                    const uDoc = await uRef.get();
                    await uRef.update({ punts: (uDoc.data().punts || 0) - delta });
                }
            }
            if (newClientId && prevClientId !== newClientId) {
                const newUserRef = db.collection('clients').doc(newClientId);
                const newUserDoc = await newUserRef.get();
                await newUserRef.update({ punts: (newUserDoc.data().punts || 0) - newDiscount });
            }

            alert(`Compra actualitzada!`);
            e.target.removeAttribute('data-edit-id');
            e.target.querySelector('button[type="submit"]').textContent = 'Finalitzar Compra';
        } else {
            await db.collection('purchase').add({
                client: db.doc(`clients/${clientId}`),
                product: db.doc(`products/${productId}`),
                quantity,
                appliedDiscount, // Points used as discount
                totalPrice: Math.max(0, totalPrice),
                datePurchase: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert(`Compra realitzada! S'han restat ${appliedDiscount} ReBit Coins.`);
        }

        // Only deduct coins on creation (edit already handled with delta)
        if (!e.target.dataset.editId) {
            await userRef.update({ punts: currentPunts - appliedDiscount });
        }

        e.target.reset();
        updateDashboardStats();
        showTab('tab-data');
        loadCollectionData('purchase');
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
            <div class="data-field"><span class="label">ReBit Coins</span><span class="value">${data.punts || 0}</span></div>
            <div class="data-field"><span class="label">Adreça</span><span class="value">${(data.address || []).join(', ')}</span></div>
        `;
    } else if (col === 'products') {
        title = data.name;
        const pointName = await resolveRefName(data.punt);
        content = `
            <div class="data-field"><span class="label">Preu</span><span class="value">${data.price}€</span></div>
            <div class="data-field"><span class="label">Stock</span><span class="value">${data.quantity}</span></div>
            <div class="data-field"><span class="label">ReBit Point</span><span class="value">${pointName}</span></div>
            <div class="data-field"><span class="label">Tipus</span><span class="value">${Array.isArray(data.type) ? data.type.join(', ') : (data.type || '-')}</span></div>
            <div class="data-field"><span class="label">ID</span><span class="value">${id}</span></div>
        `;
    } else if (col === 'donate') {
        const clientName = await resolveRefName(data.client);
        const pointName = await resolveRefName(data.point);
        title = `Donació - ${formatDate(data.date)}`;
        content = `
            <div class="data-field"><span class="label">Client</span><span class="value">${clientName}</span></div>
            <div class="data-field"><span class="label">ReBit Point</span><span class="value">${pointName}</span></div>
            <div class="data-field"><span class="label">ReBit Coins Guanyats</span><span class="value">+${data.earnedPoints}</span></div>
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
            const colors = { "Oli": "#fbbf24", "Piles": "#f87171", "Roba": "#a78bfa", "Plàstic": "#60a5fa", "Vidre": "#34d399", "Paper": "#f97316", "Runes": "#9ca3af", "Medicaments": "#f472b6" };
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
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span class="id-label">${id}</span>
                    <button onclick="editDataRecord('${col}', '${id}')" class="btn-secondary-sm" style="padding: 4px 10px; font-size: 0.8rem;">Editar</button>
                    <button onclick="deleteDataRecord('${col}', '${id}')" class="btn-secondary-sm" style="padding: 4px 10px; font-size: 0.8rem; border-color: rgba(239, 68, 68, 0.35); color: #ef4444;">Eliminar</button>
                    <!-- Eliminarem l'antic entry i utilitzarem alertes des de editDataRecord més endavant -->
                </div>
            </div>
            <div class="card-body">
                ${content}
            </div>
        </div>
    `;
}

async function deleteDataRecord(col, id) {
    if (!col || !id) return;
    if (!confirm("Segur que vols eliminar aquest registre? Aquesta acció no es pot desfer.")) return;
    try {
        await db.collection(col).doc(id).delete();
        alert("Registre eliminat!");
        updateDashboardStats?.();
        const select = document.getElementById('data-collection-select');
        if (select && select.value) loadCollectionData(select.value);
    } catch (err) {
        alert("Error eliminant: " + err.message);
    }
}

async function editDataRecord(col, id) {
    // We support quick-edit for the collections exposed in the Data hub selector.
    if (!['clients', 'products', 'points', 'donate', 'purchase'].includes(col)) {
        alert("L'edició ràpida està restringida de moment a aquests tipus de dades.");
        return;
    }

    try {
        const doc = await db.collection(col).doc(id).get();
        if (!doc.exists) return alert("El registre no existeix.");
        const data = doc.data();

        if (col === 'clients') {
            document.getElementById('client-name').value = data.name || '';
            document.getElementById('client-lastname').value = data.lastname || '';
            document.getElementById('client-nif').value = data.nif || '';
            document.getElementById('client-email').value = data.email || '';
            document.getElementById('client-street').value = (data.address && data.address[0]) || '';
            document.getElementById('client-province').value = (data.address && data.address[1]) || '';
            document.getElementById('client-poblation').value = (data.address && data.address[2]) || '';
            document.getElementById('client-postal').value = (data.address && data.address[3]) || '';

            const form = document.getElementById('form-client');
            form.dataset.editId = id;
            form.querySelector('button[type="submit"]').textContent = 'Guardar Canvis';
            showTab('tab-clients');

        } else if (col === 'products') {
            document.getElementById('prod-name').value = data.name || '';
            document.getElementById('prod-image').value = data.image || '';
            document.getElementById('prod-price').value = data.price || '';
            document.getElementById('prod-quantity').value = data.quantity || '';
            document.getElementById('prod-desc').value = data.description || '';

            if (data.punt && data.punt.id) {
                document.getElementById('prod-point').value = data.punt.id;
            }

            const cbx = document.querySelectorAll('input[name="prod-type"]');
            cbx.forEach(c => c.checked = false);
            if (Array.isArray(data.type)) {
                cbx.forEach(c => {
                    if (data.type.includes(c.value)) c.checked = true;
                });
            }

            const form = document.getElementById('form-product');
            form.dataset.editId = id;
            form.querySelector('button[type="submit"]').textContent = 'Guardar Canvis';
            showTab('tab-products');
        } else if (col === 'points') {
            document.getElementById('edit-point-name').value = data.name || '';
            document.getElementById('edit-point-poblation').value = data.poblation || '';
            document.getElementById('edit-point-open').value = data.schedules?.open || '';
            document.getElementById('edit-point-close').value = data.schedules?.close || '';
            document.getElementById('edit-point-parking').checked = data.parking || false;
            document.getElementById('edit-point-shop').checked = (data.hasShop === true) || (data.shop === true);

            const cbx = document.querySelectorAll('input[name="edit-p-type"]');
            cbx.forEach(c => c.checked = false);
            if (Array.isArray(data.type)) {
                cbx.forEach(c => {
                    if (data.type.includes(c.value)) c.checked = true;
                });
            }

            const form = document.getElementById('form-edit-point');
            form.dataset.editId = id;
            document.getElementById('edit-point-modal').classList.remove('hidden');
            return; // No fem scroll into view pq és un modal overlay
        } else if (col === 'donate') {
            showTab('tab-recycle');
            await loadDropdowns();

            // Resolve refs to ids
            const clientId = data.client?.id || '';
            const pointId = data.point?.id || '';

            document.getElementById('recycle-client').value = clientId;
            document.getElementById('recycle-point').value = pointId;
            document.getElementById('recycle-quantity').value = data.quantity ?? '';
            document.getElementById('earned-points').value = data.earnedPoints ?? '';

            const cbx = document.querySelectorAll('input[name="r-type"]');
            cbx.forEach(c => c.checked = false);
            if (Array.isArray(data.types)) {
                cbx.forEach(c => {
                    if (data.types.includes(c.value)) c.checked = true;
                });
            }

            const form = document.getElementById('form-recycle');
            form.dataset.editId = id;
            form.querySelector('button[type="submit"]').textContent = 'Guardar Canvis';
        } else if (col === 'purchase') {
            showTab('tab-purchase');
            await loadDropdowns();

            const clientId = data.client?.id || '';
            const productId = data.product?.id || '';

            document.getElementById('purchase-client').value = clientId;
            document.getElementById('purchase-product').value = productId;
            document.getElementById('purchase-quantity').value = data.quantity ?? '';
            document.getElementById('purchase-discount').value = data.appliedDiscount ?? 0;

            const form = document.getElementById('form-purchase');
            form.dataset.editId = id;
            form.querySelector('button[type="submit"]').textContent = 'Guardar Canvis';
        }

        document.getElementById('gestio').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert("Error carregant dades per edició: " + err.message);
    }
}

// Handler pel modal nou dels ReBit Points
document.getElementById('form-edit-point')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = e.target.dataset.editId;
    if (!id) return;

    const name = document.getElementById('edit-point-name').value;
    const poblation = document.getElementById('edit-point-poblation').value;
    const open = document.getElementById('edit-point-open').value;
    const close = document.getElementById('edit-point-close').value;
    const parking = document.getElementById('edit-point-parking').checked;
    const hasShop = document.getElementById('edit-point-shop').checked;
    const type = Array.from(document.querySelectorAll('input[name="edit-p-type"]:checked')).map(cb => cb.value);

    try {
        await db.collection('points').doc(id).update({
            name, poblation, parking, hasShop, shop: hasShop, type,
            schedules: { open, close }
        });
        alert('ReBit Point actualitzat!');
        document.getElementById('edit-point-modal').classList.add('hidden');
        loadCollectionData('points');
    } catch (err) { alert(err.message); }
});

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

    if (tabId === 'tab-recycle' || tabId === 'tab-purchase' || tabId === 'tab-products') {
        loadDropdowns();
    }

    if (tabId === 'tab-data') {
        const select = document.getElementById('data-collection-select');
        if (select) loadCollectionData(select.value);
    }
};
