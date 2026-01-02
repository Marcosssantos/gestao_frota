/* ================= CONFIGURAÇÕES ================= */
const BACKUP_URL = "https://script.google.com/macros/s/AKfycbz21S1xBvLoYv5sagsFJkNiFs9pgSvFYppuS3ElmHPjb4pT0W5K9WLHHQwZJK_v1TZ5fQ/exec";

// Inicializa o admin padrão caso o sistema esteja vazio
if (!localStorage.getItem("users")) {
    const adminInicial = [{ nome: "Administrador", login: "marcos", senha: "1234" }];
    localStorage.setItem("users", JSON.stringify(adminInicial));
}

/* ================= LOGIN MULTI-USUÁRIO ================= */
function login() {
    const loginInput = document.getElementById("loginUser").value;
    const senhaInput = document.getElementById("senha").value;
    const usuarios = JSON.parse(localStorage.getItem("users")) || [];

    const usuarioValido = usuarios.find(u => u.login === loginInput && u.senha === senhaInput);

    if (usuarioValido) {
        localStorage.setItem("logged", "true");
        localStorage.setItem("currentUser", usuarioValido.nome);
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("app").style.display = "flex";
        loadPage("dashboard");
    } else {
        alert("Usuário ou senha incorretos!");
    }
}

function logout() {
    localStorage.removeItem("logged");
    localStorage.removeItem("currentUser");
    location.reload();
}

/* ================= DATA E INICIALIZAÇÃO ================= */
function atualizarData() {
    const dataDisplay = document.getElementById("currentDate");
    if (dataDisplay) {
        const agora = new Date();
        const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dataDisplay.innerText = agora.toLocaleDateString('pt-BR', opcoes);
    }
}

window.onload = () => {
    atualizarData();
    if (localStorage.getItem("logged") === "true") {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("app").style.display = "flex";
        document.getElementById("userNameDisplay").innerText = localStorage.getItem("currentUser");
        loadPage("dashboard");
    }
};

/* ================= NAVEGAÇÃO E RESPONSIVIDADE ================= */
function loadPage(page) {
    const content = document.getElementById("contentArea");
    const title = document.getElementById("pageTitle");

    const pages = {
        dashboard: {
            title: "Painel de Controle",
            html: `
            <div class="card-container">
                <div class="stat-box" style="background:#2c3e50"><i class="fa fa-car"></i><p>Veículos</p><h2 id="countVeiculos">0</h2></div>
                <div class="stat-box" style="background:#27ae60"><i class="fa fa-gas-pump"></i><p>Combustível</p><h2 id="totalGastos">R$ 0,00</h2></div>
            </div>
            <div class="card"><h3>Gastos por Veículo</h3><canvas id="chartGastos"></canvas></div>
            <div class="card"><h3>Alertas de Revisão</h3><ul id="listaAlertas"></ul></div>`
        },
        usuarios: {
            title: "Gestão de Operadores",
            html: `
            <div class="card">
                <form onsubmit="saveUser(event)">
                    <input id="newNome" placeholder="Nome Completo" required>
                    <input id="newLogin" placeholder="Login de Acesso" required>
                    <input id="newSenha" type="password" placeholder="Senha" required>
                    <button type="submit">Cadastrar Novo Operador</button>
                </form>
            </div>
            <ul id="lista-operadores"></ul>`
        },
        frota: {
            title: "Veículos",
            html: `<div class="card"><form onsubmit="saveVehicle(event)">
                <input id="placa" placeholder="Placa" required>
                <input id="modelo" placeholder="Modelo" required>
                <input id="km" type="number" placeholder="KM Atual" required>
                <input id="vencDoc" type="date" required>
                <button type="submit">Salvar Veículo</button>
            </form></div><ul id="vehicle-list"></ul>`
        },
        motoristas: {
            title: "Motoristas",
            html: `<div class="card"><form onsubmit="saveDriver(event)">
                <input id="nomeMotorista" placeholder="Nome" required>
                <input id="cnh" placeholder="CNH" required>
                <input id="vencCNH" type="date" required>
                <button type="submit">Salvar Motorista</button>
            </form></div><ul id="lista-motoristas"></ul>`
        },
        abastecimento: {
            title: "Abastecimento",
            html: `<div class="card"><form onsubmit="saveFuel(event)">
                <input id="placaF" placeholder="Placa" required>
                <input id="litros" type="number" step="0.01" placeholder="Litros" required>
                <input id="valor" type="number" step="0.01" placeholder="Valor R$" required>
                <input id="dataFuel" type="date" required>
                <button type="submit">Registrar</button>
            </form></div>`
        }
    };

    content.innerHTML = pages[page].html;
    title.innerText = pages[page].title;

    if (page === "dashboard") { updateDashboard(); carregarAlertas(); setTimeout(renderChart, 200); }
    if (page === "usuarios") renderList("users", "lista-operadores");
    if (page === "frota") renderList("vehicles", "vehicle-list");
    if (page === "motoristas") renderList("drivers", "lista-motoristas");
}

/* ================= STORAGE E GOOGLE SHEETS ================= */
function backupNuvem(tipo, payload) {
    fetch(BACKUP_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ tipo: tipo, payload: payload })
    }).catch(e => console.error("Erro no backup:", e));
}

function saveData(key, data) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    list.push(data);
    localStorage.setItem(key, JSON.stringify(list));
    backupNuvem(key, data);
    updateDashboard();
}

/* ================= CRUD OPERAÇÕES ================= */
function saveUser(e) {
    e.preventDefault();
    const newUser = { nome: newNome.value, login: newLogin.value, senha: newSenha.value };
    saveData("users", newUser);
    e.target.reset();
    renderList("users", "lista-operadores");
}

function saveVehicle(e) {
    e.preventDefault();
    saveData("vehicles", { placa: placa.value.toUpperCase(), modelo: modelo.value, km: +km.value, vencDoc: vencDoc.value });
    e.target.reset();
    renderList("vehicles", "vehicle-list");
}

function saveFuel(e) {
    e.preventDefault();
    saveData("fuelings", { placa: placaF.value.toUpperCase(), litros: +litros.value, valor: +valor.value, data: dataFuel.value });
    e.target.reset();
    alert("Abastecimento registrado e enviado para nuvem!");
}

function renderList(key, id) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = list.map((item, index) => `
        <li>
            <div><strong>${item.placa || item.nome}</strong> <small>${item.modelo || item.login || ""}</small></div>
            <button onclick="deleteItem('${key}',${index})">🗑</button>
        </li>
    `).join("");
}

function deleteItem(key, index) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    list.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(list));
    renderList(key, key === "users" ? "lista-operadores" : (key === "vehicles" ? "vehicle-list" : "lista-motoristas"));
}

/* ================= DASHBOARD & CHART ================= */
let chartInstance = null;
function updateDashboard() {
    const vehicles = JSON.parse(localStorage.getItem("vehicles")) || [];
    const fuelings = JSON.parse(localStorage.getItem("fuelings")) || [];
    if (document.getElementById("countVeiculos")) document.getElementById("countVeiculos").innerText = vehicles.length;
    const total = fuelings.reduce((s, f) => s + f.valor, 0);
    if (document.getElementById("totalGastos")) document.getElementById("totalGastos").innerText = `R$ ${total.toFixed(2)}`;
}

function renderChart() {
    const ctx = document.getElementById("chartGastos");
    if (!ctx) return;
    const fuelings = JSON.parse(localStorage.getItem("fuelings")) || [];
    const map = {};
    fuelings.forEach(f => map[f.placa] = (map[f.placa] || 0) + f.valor);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: { labels: Object.keys(map), datasets: [{ label: "Total Gasto (R$)", data: Object.values(map), backgroundColor: "#3498db" }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function carregarAlertas() {
    const vehicles = JSON.parse(localStorage.getItem("vehicles")) || [];
    const ul = document.getElementById("listaAlertas");
    if (!ul) return;
    ul.innerHTML = vehicles.filter(v => v.km % 10000 >= 9000).map(v => `<li>⚠️ ${v.placa}: Revisão iminente!</li>`).join("") || "<li>✅ Nenhuma revisão pendente</li>";
}