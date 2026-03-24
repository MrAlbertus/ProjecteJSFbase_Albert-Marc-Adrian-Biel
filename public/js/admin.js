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
