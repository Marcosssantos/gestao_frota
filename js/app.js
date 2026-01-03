/* ================= CONFIGURAÇÕES ================= */
const BACKUP_URL = "https://script.google.com/macros/s/AKfycbz21S1xBvLoYv5sagsFJkNiFs9pgSvFYppuS3ElmHPjb4pT0W5K9WLHHQwZJK_v1TZ5fQ/exec";

// FUNÇÃO CRUCIAL: Garante que o usuário admin exista no sistema
function inicializarUsuarios() {
    let users = JSON.parse(localStorage.getItem("users")) || [];
    const adminExists = users.some(u => u.login === "admin");
    
    if (!adminExists) {
        users.push({ nome: "Administrador", login: "admin", senha: "123" });
        localStorage.setItem("users", JSON.stringify(users));
    }
}

/* ================= LOGIN ================= */
function login() {
    inicializarUsuarios(); // Garante o admin antes de verificar
    const loginInput = document.getElementById("loginUser").value;
    const senhaInput = document.getElementById("senha").value;
    const usuarios = JSON.parse(localStorage.getItem("users")) || [];

    const user = usuarios.find(u => u.login === loginInput && u.senha === senhaInput);

    if (user) {
        localStorage.setItem("logged", "true");
        localStorage.setItem("currentUser", user.nome);
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("app").style.display = "flex";
        document.getElementById("userNameDisplay").innerText = user.nome;
        atualizarData();
        loadPage('dashboard');
    } else {
        document.getElementById("loginError").style.display = "block";
    }
}

function logout() {
    localStorage.removeItem("logged");
    localStorage.removeItem("currentUser");
    location.reload();
}

/* ================= INIT ================= */
window.onload = () => {
    inicializarUsuarios();
    if (localStorage.getItem("logged") === "true") {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("app").style.display = "flex";
        document.getElementById("userNameDisplay").innerText = localStorage.getItem("currentUser");
        atualizarData();
        loadPage("dashboard");
    }
    setupMobileNav();
};

// Mobile/top-nav behavior
function setupMobileNav() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const toggle = document.getElementById('navToggle');
    const overlay = document.getElementById('navOverlay');

    // Toggle nav (hamburger) handler
    if (toggle) {
        toggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('nav-open');
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (overlay) overlay.classList.toggle('show', isOpen);
        });
        // keyboard support
        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }
        });
    }

    // Close nav when clicking overlay
    if (overlay) overlay.addEventListener('click', closeMobileNav);

    // Event delegation: respond to clicks on nav links
    sidebar.addEventListener('click', (ev) => {
        const a = ev.target.closest('a[data-page], a[data-action]');
        if (!a) return;
        const page = a.dataset.page;
        const action = a.dataset.action;
        if (action === 'logout') { logout(); return; }
        if (page) {
            loadPage(page);
            // Close nav after selection on mobile
            if (sidebar.classList.contains('nav-open')) closeMobileNav();
            // On small screens, scroll content into view and focus first input
            if (window.innerWidth <= 768) {
                const contentArea = document.getElementById('contentArea');
                setTimeout(() => {
                    if (contentArea) {
                        contentArea.scrollIntoView({ behavior: 'smooth' });
                        const focusEl = contentArea.querySelector('input,select,button,textarea');
                        if (focusEl) focusEl.focus();
                    }
                }, 150);
            }
        }
    });

    // Close with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('nav-open')) closeMobileNav();
    });

    // Close when resizing to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && sidebar.classList.contains('nav-open')) closeMobileNav();
    });
}

function closeMobileNav() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('navOverlay');
    const toggle = document.getElementById('navToggle');
    if (sidebar) sidebar.classList.remove('nav-open');
    if (overlay) overlay.classList.remove('show');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function atualizarData() {
    const agora = new Date();
    const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("currentDate").innerText = agora.toLocaleDateString('pt-BR', opcoes);
}

/* ================= NAVEGAÇÃO ================= */
let chartInstance = null;

function loadPage(page) {
    const content = document.getElementById("contentArea");
    const title = document.getElementById("pageTitle");

    const pages = {
        dashboard: {
            title: "Painel de Controle",
            html: `
            <div class="card-container">
                <div class="stat-box" style="background:#2c3e50"><i class="fa fa-car"></i><p>Frota</p><h2 id="countV">0</h2></div>
                <div class="stat-box" style="background:#27ae60"><i class="fa fa-gas-pump"></i><p>Gasto Total</p><h2 id="totalG">R$ 0,00</h2></div>
            </div>
            <div class="card"><h3>Gastos por Veículo</h3><div class="chart-container"><canvas id="chartGastos"></canvas></div></div>
            <div class="card"><h3>Alertas de Manutenção</h3><ul id="listaAlertas"></ul></div>
            <div class="card"><h3>Dados</h3><div><button id="exportBtn" class="btn-mini">Exportar JSON</button> <input id="importFile" type="file" accept=".json" style="display:none"> <button id="importBtn" class="btn-mini">Importar JSON</button></div></div>`
        },
        usuarios: {
            title: "Operadores",
            html: `<div class="card">
                <form onsubmit="saveUser(event)">
                    <input id="uNome" placeholder="Nome do Operador" required>
                    <input id="uLogin" placeholder="Login de Acesso" required>
                    <input id="uSenha" type="password" placeholder="Senha" required>
                    <button type="submit">Cadastrar Operador</button>
                </form>
            </div><ul id="u-list" class="list-render"></ul>`
        },
        frota: {
            title: "Veículos",
            html: `<div class="card"><form onsubmit="saveVehicle(event)">
                <input id="placa" placeholder="Placa" required>
                <input id="modelo" placeholder="Modelo" required>
                <input id="km" type="number" placeholder="KM" required>
                <input id="vencDoc" type="date" required>
                <button type="submit">Salvar</button>
            </form></div><ul id="v-list" class="list-render"></ul>`
        },
        motoristas: {
            title: "Motoristas",
            html: `<div class="card">
                <form onsubmit="saveDriver(event)">
                    <input id="dNome" placeholder="Nome do Motorista" required>
                    <input id="dCnh" placeholder="CNH" required>
                    <button type="submit">Cadastrar Motorista</button>
                </form>
            </div><ul id="d-list" class="list-render"></ul>`
        },
        abastecimento: {
            title: "Abastecer",
            html: `<div class="card"><form onsubmit="saveFuel(event)">
                <select id="fDriver" required><option value="">Selecione um motorista</option></select>
                <select id="fPlaca" required><option value="">Selecione um veículo</option></select>
                <input id="fValor" type="number" step="0.01" placeholder="Valor R$" required>
                <input id="fLitros" type="number" step="0.01" placeholder="Litros" required>
                <input id="fData" type="date" required>
                <button type="submit">Salvar</button>
            </form></div>
            <div class="card"><h3>Histórico de Abastecimentos</h3><ul id="fuelings-list"></ul></div>`
        }
    };

    if (pages[page]) {
        content.innerHTML = pages[page].html;
        title.innerText = pages[page].title;

        // Attach page-specific behavior
        if (page === 'dashboard') {
            const exportBtn = document.getElementById('exportBtn');
            const importBtn = document.getElementById('importBtn');
            const importFile = document.getElementById('importFile');
            if (exportBtn) exportBtn.onclick = exportData;
            if (importBtn && importFile) importBtn.onclick = () => importFile.click();
            if (importFile) importFile.onchange = handleImportFile;
            // Ensure dashboard renders
            updateDashboard(); carregarAlertas(); setTimeout(renderChart, 200);
        }

        if (page === 'abastecimento') {
            populateSelects();
            const form = document.querySelector('#contentArea form');
            if (form) form.onsubmit = saveFuel;
            renderFuelings();
        }

        if (page === 'frota') renderList("vehicles", "v-list");
        if (page === 'usuarios') renderList("users", "u-list");
        if (page === 'motoristas') renderList("drivers", "d-list");
    }
}

/* ================= BACKUP E STORAGE ================= */
function backupNuvem(tipo, payload) {
    // mode: 'no-cors' mantido para compatibilidade com Google Script endpoints.
    try {
        fetch(BACKUP_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ tipo, payload })
        }).then(() => console.debug("Backup request sent", { tipo, payload }))
          .catch(e => console.warn("Backup failed (silent):", e));
    } catch (e) {
        console.warn("Backup exception:", e);
    }
}

function saveData(key, data) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    list.push(data);
    localStorage.setItem(key, JSON.stringify(list));
    backupNuvem(key, data);
}

function saveUser(e) {
    e.preventDefault();
    const loginVal = uLogin.value.trim();
    if (!loginVal) { showToast('Login obrigatório', 'error'); return; }
    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.some(u => u.login === loginVal)) { showToast('Login já existe', 'error'); return; }
    saveData("users", { nome: uNome.value.trim(), login: loginVal, senha: uSenha.value });
    e.target.reset();
    renderList("users", "u-list");
    showToast('Operador salvo', 'success');
} 

function saveDriver(e) {
    e.preventDefault();
    const name = dNome.value.trim();
    const cnhVal = dCnh.value.trim();
    if (!name) { showToast('Nome do motorista obrigatório', 'error'); return; }
    if (!validateCNH(cnhVal)) { showToast('CNH inválida', 'error'); return; }
    saveData("drivers", { nome: name, cnh: cnhVal });
    e.target.reset();
    renderList("drivers", "d-list");
    showToast('Motorista salvo', 'success');
} 

function saveVehicle(e) {
    e.preventDefault();
    const plateVal = placa.value.toUpperCase().trim();
    if (!validatePlate(plateVal)) { showToast('Placa inválida', 'error'); return; }
    const kmVal = +km.value;
    if (isNaN(kmVal) || kmVal < 0) { showToast('KM inválido', 'error'); return; }
    saveData("vehicles", { placa: plateVal, modelo: modelo.value.trim(), km: kmVal, vencDoc: vencDoc.value || null });
    e.target.reset();
    renderList("vehicles", "v-list");
    updateDashboard();
    carregarAlertas();
    renderChart();
    showToast('Veículo salvo', 'success');
} 

function saveFuel(e) {
    e.preventDefault();
    const placaVal = (document.getElementById('fPlaca').value || '').toUpperCase().trim();
    const driverVal = (document.getElementById('fDriver').value || '').trim();
    const valorVal = +document.getElementById('fValor').value;
    const litrosVal = +document.getElementById('fLitros').value;
    const dataVal = document.getElementById('fData').value;
    if (!driverVal) { showToast('Selecione um motorista', 'error'); return; }
    if (!validatePlate(placaVal)) { showToast('Placa inválida', 'error'); return; }
    if (isNaN(valorVal) || valorVal <= 0) { showToast('Valor inválido', 'error'); return; }
    if (isNaN(litrosVal) || litrosVal <= 0) { showToast('Litros inválidos', 'error'); return; }
    saveData("fuelings", { placa: placaVal, valor: valorVal, litros: litrosVal, motorista: driverVal, data: dataVal });
    e.target.reset();
    updateDashboard();
    renderChart();
    carregarAlertas();
    renderFuelings();
    showToast('Abastecimento salvo', 'success');
} 

function renderList(key, id) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = list.map((item, index) => `
        <li style="background:white; padding:10px; margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
            <span>${item.placa || item.nome} (${item.modelo || item.login || item.cnh || ''})</span>
            <div class="actions">
                <button class="btn-edit" onclick="editItem('${key}',${index})">✏️</button>
                <button class="btn-delete" onclick="deleteItem('${key}',${index})">🗑</button>
            </div>
        </li>
    `).join("");
}

function deleteItem(key, index) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    if (!confirm('Confirma exclusão deste item?')) return;
    list.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(list));
    // Re-render affected UI without full reload
    if (key === 'vehicles') {
        renderList('vehicles', 'v-list');
        updateDashboard();
        carregarAlertas();
        renderChart();
    } else if (key === 'users') {
        renderList('users', 'u-list');
    } else if (key === 'drivers') {
        renderList('drivers', 'd-list');
    } else if (key === 'fuelings') {
        renderFuelings();
        updateDashboard();
        renderChart();
    }
} 

function updateDashboard() {
    const v = JSON.parse(localStorage.getItem("vehicles")) || [];
    const f = JSON.parse(localStorage.getItem("fuelings")) || [];
    if (document.getElementById("countV")) document.getElementById("countV").innerText = v.length;
    const total = f.reduce((s, i) => s + i.valor, 0);
    if (document.getElementById("totalG")) document.getElementById("totalG").innerText = `R$ ${total.toFixed(2)}`;
}

function renderChart() {
    const ctx = document.getElementById("chartGastos");
    if (!ctx) return;
    const f = JSON.parse(localStorage.getItem("fuelings")) || [];
    const map = {};
    f.forEach(i => map[i.placa] = (map[i.placa] || 0) + i.valor);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: { labels: Object.keys(map), datasets: [{ label: "Gastos R$", data: Object.values(map), backgroundColor: "#3498db" }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function carregarAlertas() {
    const v = JSON.parse(localStorage.getItem("vehicles")) || [];
    const ul = document.getElementById("listaAlertas");
    if (ul) ul.innerHTML = v.filter(i => i.km % 10000 >= 9000).map(i => `<li>⚠️ ${i.placa} - Troca de Óleo</li>`).join("") || "<li>✅ Tudo em ordem</li>";
}

// ----------------- Utilitários adicionais -----------------
function showToast(message, type = 'info') {
    const div = document.createElement('div');
    div.className = 'toast ' + type;
    div.innerText = message;
    document.body.appendChild(div);
    setTimeout(() => div.classList.add('visible'), 10);
    setTimeout(() => { div.classList.remove('visible'); setTimeout(() => div.remove(), 300); }, 3000);
}

function validatePlate(plate) {
    if (!plate) return false;
    // Aceita formatos antigos e Mercosul simplificados
    const r = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2,3}$|^[A-Z]{3}[0-9]{4}$/;
    return r.test(plate);
}

function validateCNH(cnh) {
    if (!cnh) return false;
    const digits = cnh.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 11;
}

function populateSelects() {
    const drivers = JSON.parse(localStorage.getItem('drivers')) || [];
    const vehicles = JSON.parse(localStorage.getItem('vehicles')) || [];
    const dsel = document.getElementById('fDriver');
    const vsel = document.getElementById('fPlaca');
    if (dsel) {
        dsel.innerHTML = '<option value="">Selecione um motorista</option>' + drivers.map(d => `<option value="${d.nome}">${d.nome} (${d.cnh})</option>`).join('');
    }
    if (vsel) {
        vsel.innerHTML = '<option value="">Selecione um veículo</option>' + vehicles.map(v => `<option value="${v.placa}">${v.placa} - ${v.modelo}</option>`).join('');
    }
}

function exportData() {
    const data = {
        users: JSON.parse(localStorage.getItem('users')) || [],
        vehicles: JSON.parse(localStorage.getItem('vehicles')) || [],
        drivers: JSON.parse(localStorage.getItem('drivers')) || [],
        fuelings: JSON.parse(localStorage.getItem('fuelings')) || []
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgf-data-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Exportado JSON', 'success');
}

function handleImportFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const obj = JSON.parse(ev.target.result);
            importData(obj);
            showToast('Dados importados', 'success');
        } catch (err) {
            showToast('Arquivo inválido', 'error');
            console.warn('Import error', err);
        }
    };
    reader.readAsText(f);
}

function importData(obj) {
    if (obj.users) localStorage.setItem('users', JSON.stringify(obj.users));
    if (obj.vehicles) localStorage.setItem('vehicles', JSON.stringify(obj.vehicles));
    if (obj.drivers) localStorage.setItem('drivers', JSON.stringify(obj.drivers));
    if (obj.fuelings) localStorage.setItem('fuelings', JSON.stringify(obj.fuelings));
    // Re-render current UI
    renderList('users','u-list');
    renderList('vehicles','v-list');
    renderList('drivers','d-list');
    renderFuelings();
    updateDashboard();
    renderChart();
}

function renderFuelings() {
    const list = JSON.parse(localStorage.getItem('fuelings')) || [];
    const ul = document.getElementById('fuelings-list');
    if (!ul) return;
    ul.innerHTML = list.map((f, i) => `
        <li style="display:flex; justify-content:space-between; align-items:center; padding:8px;">
            <span>${f.data || ''} - ${f.placa} - R$ ${f.valor.toFixed(2)} - ${f.litros}L - ${f.motorista || ''}</span>
            <div class="actions">
                <button class="btn-edit" onclick="editItem('fuelings',${i})">✏️</button>
                <button class="btn-delete" onclick="deleteItem('fuelings',${i})">🗑</button>
            </div>
        </li>
    `).join('') || '<li>Nenhum abastecimento registrado</li>';
} 

function editItem(key, index) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    const item = list[index];
    if (!item) return;
    if (key === 'vehicles') {
        const placaVal = prompt('Placa:', item.placa) || item.placa;
        if (!validatePlate(placaVal.toUpperCase())) { showToast('Placa inválida', 'error'); return; }
        const modeloVal = prompt('Modelo:', item.modelo) || item.modelo;
        const kmValRaw = prompt('KM:', item.km != null ? item.km : '0');
        const kmVal = +kmValRaw;
        if (isNaN(kmVal) || kmVal < 0) { showToast('KM inválido', 'error'); return; }
        item.placa = placaVal.toUpperCase();
        item.modelo = modeloVal;
        item.km = kmVal;
        localStorage.setItem(key, JSON.stringify(list));
        renderList('vehicles','v-list');
        updateDashboard();
        carregarAlertas();
        renderChart();
        showToast('Veículo atualizado', 'success');
    } else if (key === 'users') {
        const nomeVal = prompt('Nome:', item.nome) || item.nome;
        const loginVal = prompt('Login:', item.login) || item.login;
        const users = JSON.parse(localStorage.getItem('users')) || [];
        if (users.some((u,i)=>u.login===loginVal && i!==index)) { showToast('Login já existe', 'error'); return; }
        const senhaVal = prompt('Senha (deixe em branco para manter):', '') || item.senha;
        item.nome = nomeVal;
        item.login = loginVal;
        item.senha = senhaVal;
        localStorage.setItem(key, JSON.stringify(list));
        renderList('users','u-list');
        showToast('Operador atualizado', 'success');
    } else if (key === 'drivers') {
        const nomeVal = prompt('Nome:', item.nome) || item.nome;
        const cnhVal = prompt('CNH:', item.cnh) || item.cnh;
        if (!validateCNH(cnhVal)) { showToast('CNH inválida', 'error'); return; }
        item.nome = nomeVal;
        item.cnh = cnhVal;
        localStorage.setItem(key, JSON.stringify(list));
        renderList('drivers','d-list');
        showToast('Motorista atualizado', 'success');
    } else if (key === 'fuelings') {
        const placaVal = prompt('Placa:', item.placa) || item.placa;
        if (!validatePlate(placaVal.toUpperCase())) { showToast('Placa inválida', 'error'); return; }
        const motoristaVal = prompt('Motorista:', item.motorista) || item.motorista;
        const valorValRaw = prompt('Valor R$:', item.valor != null ? item.valor : '0');
        const valorVal = +valorValRaw;
        const litrosValRaw = prompt('Litros:', item.litros != null ? item.litros : '0');
        const litrosVal = +litrosValRaw;
        const dataVal = prompt('Data (YYYY-MM-DD):', item.data) || item.data;
        if (isNaN(valorVal) || valorVal <= 0) { showToast('Valor inválido', 'error'); return; }
        if (isNaN(litrosVal) || litrosVal <= 0) { showToast('Litros inválidos', 'error'); return; }
        item.placa = placaVal.toUpperCase();
        item.motorista = motoristaVal;
        item.valor = valorVal;
        item.litros = litrosVal;
        item.data = dataVal;
        localStorage.setItem(key, JSON.stringify(list));
        renderFuelings();
        updateDashboard();
        renderChart();
        showToast('Abastecimento atualizado', 'success');
    }
}