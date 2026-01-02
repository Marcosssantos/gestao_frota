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
        location.reload(); 
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
};

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
            <div class="card"><h3>Alertas de Manutenção</h3><ul id="listaAlertas"></ul></div>`
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
        abastecimento: {
            title: "Abastecer",
            html: `<div class="card"><form onsubmit="saveFuel(event)">
                <input id="fPlaca" placeholder="Placa do Veículo" required>
                <input id="fValor" type="number" step="0.01" placeholder="Valor R$" required>
                <input id="fData" type="date" required>
                <button type="submit">Enviar para Nuvem</button>
            </form></div>`
        }
    };

    if (pages[page]) {
        content.innerHTML = pages[page].html;
        title.innerText = pages[page].title;
    }

    if (page === "dashboard") { updateDashboard(); carregarAlertas(); setTimeout(renderChart, 200); }
    if (page === "frota") renderList("vehicles", "v-list");
    if (page === "usuarios") renderList("users", "u-list");
}

/* ================= BACKUP E STORAGE ================= */
function backupNuvem(tipo, payload) {
    fetch(BACKUP_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ tipo, payload })
    }).catch(e => console.log("Backup offline"));
}

function saveData(key, data) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    list.push(data);
    localStorage.setItem(key, JSON.stringify(list));
    backupNuvem(key, data);
}

function saveUser(e) {
    e.preventDefault();
    saveData("users", { nome: uNome.value, login: uLogin.value, senha: uSenha.value });
    e.target.reset();
    renderList("users", "u-list");
}

function saveVehicle(e) {
    e.preventDefault();
    saveData("vehicles", { placa: placa.value.toUpperCase(), modelo: modelo.value, km: +km.value });
    e.target.reset();
    renderList("vehicles", "v-list");
}

function saveFuel(e) {
    e.preventDefault();
    saveData("fuelings", { placa: fPlaca.value.toUpperCase(), valor: +fValor.value, data: fData.value });
    e.target.reset();
    alert("Salvo com sucesso!");
}

function renderList(key, id) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = list.map((item, index) => `
        <li style="background:white; padding:10px; margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between;">
            <span>${item.placa || item.nome} (${item.modelo || item.login})</span>
            <button onclick="deleteItem('${key}',${index})" style="background:red; padding:5px;">🗑</button>
        </li>
    `).join("");
}

function deleteItem(key, index) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    list.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(list));
    location.reload();
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