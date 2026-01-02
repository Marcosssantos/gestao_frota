/* =====================================================
   SGF PRO — APP.JS COMPLETO
===================================================== */

/* ================= LOGIN ================= */
const ADMIN_PASSWORD = "1234";

function login() {
    const senha = document.getElementById("senha").value;
    if (senha === ADMIN_PASSWORD) {
        localStorage.setItem("logged", "true");
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("app").style.display = "flex";
        loadPage("dashboard");
        document.getElementById("iaInsight").innerText = analiseIA();
    } else {
        alert("Senha incorreta");
    }
}

function logout() {
    localStorage.removeItem("logged");
    location.reload();
}

/* ================= INIT ================= */
window.onload = () => {
    if (localStorage.getItem("logged") === "true") {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("app").style.display = "flex";
        loadPage("dashboard");
    }
};

/* ================= LOAD PAGE ================= */
let chartInstance = null;

function loadPage(page) {
    const content = document.getElementById("contentArea");
    const title = document.getElementById("pageTitle");

    const pages = {
        dashboard: {
            title: "Dashboard",
            html: `
            <div class="card-container">
                <div class="stat-box">
                    <i class="fa fa-car"></i>
                    <p>Veículos</p>
                    <h2 id="countVeiculos">0</h2>
                </div>
                <div class="stat-box" style="background:#27ae60">
                    <i class="fa fa-dollar-sign"></i>
                    <p>Total Combustível</p>
                    <h2 id="totalGastos">R$ 0,00</h2>
                </div>
            </div>

            <div class="card">
                <h3>Gastos por Veículo</h3>
                <canvas id="chartGastos"></canvas>
            </div>

            <div class="card">
                <h3>Alertas</h3>
                <ul id="listaAlertas"></ul>
            </div>`
        },

        frota: {
            title: "Veículos",
            html: `
            <div class="card">
                <form onsubmit="saveVehicle(event)">
                    <input id="placa" placeholder="Placa" required>
                    <input id="modelo" placeholder="Modelo" required>
                    <input id="km" type="number" placeholder="KM Atual" required>
                    <input id="vencDoc" type="date" required>
                    <input type="file" id="fotoVeiculo">
                    <button>Salvar Veículo</button>
                </form>
            </div>
            <ul id="vehicle-list"></ul>`
        },

        motoristas: {
            title: "Motoristas",
            html: `
            <div class="card">
                <form onsubmit="saveDriver(event)">
                    <input id="nomeMotorista" placeholder="Nome" required>
                    <input id="cnh" placeholder="CNH" required>
                    <input id="vencCNH" type="date" required>
                    <button>Salvar Motorista</button>
                </form>
            </div>
            <ul id="lista-motoristas"></ul>`
        },

        abastecimento: {
            title: "Abastecimento",
            html: `
            <div class="card">
                <form onsubmit="saveFuel(event)">
                    <input id="placa" placeholder="Placa" required>
                    <input id="litros" type="number" placeholder="Litros" required>
                    <input id="valor" type="number" placeholder="Valor" required>
                    <input id="dataAbastecimento" type="date" required>
                    <button>Registrar</button>
                </form>
            </div>`
        },

        relatorios: {
            title: "Relatórios",
            html: `
            <div class="card">
                <button onclick="window.print()">Imprimir / PDF</button>
                <h4>Veículos</h4>
                <ul id="relatorioVeiculos"></ul>
                <h4>Motoristas</h4>
                <ul id="relatorioMotoristas"></ul>
            </div>`
        }
    };

    content.innerHTML = pages[page].html;
    title.innerText = pages[page].title;

    if (page === "dashboard") {
        updateDashboard();
        carregarAlertas();
        setTimeout(renderChart, 200);
    }
    if (page === "frota") renderList("vehicles", "vehicle-list");
    if (page === "motoristas") renderList("drivers", "lista-motoristas");
    if (page === "relatorios") {
        renderList("vehicles", "relatorioVeiculos");
        renderList("drivers", "relatorioMotoristas");
    }
}

/* ================= STORAGE ================= */
function saveData(key, data) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    list.push(data);
    localStorage.setItem(key, JSON.stringify(list));
}

/* ================= CRUD ================= */
async function saveVehicle(e) {
    e.preventDefault();
    const foto = document.getElementById("fotoVeiculo").files[0];
    const foto64 = foto ? await toBase64(foto) : null;

    saveData("vehicles", {
        placa: placa.value.toUpperCase(),
        modelo: modelo.value,
        km: +km.value,
        vencDoc: vencDoc.value,
        foto: foto64
    });

    e.target.reset();
    renderList("vehicles", "vehicle-list");
    updateDashboard();
}

function saveDriver(e) {
    e.preventDefault();
    saveData("drivers", {
        nome: nomeMotorista.value,
        cnh: cnh.value,
        vencCNH: vencCNH.value
    });
    e.target.reset();
    renderList("drivers", "lista-motoristas");
}

function saveFuel(e) {
    e.preventDefault();
    saveData("fuelings", {
        placa: placa.value.toUpperCase(),
        litros: +litros.value,
        valor: +valor.value,
        data: dataAbastecimento.value
    });
    e.target.reset();
    updateDashboard();
}

/* ================= LIST / EDIT / DELETE ================= */
function renderList(key, id) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    const ul = document.getElementById(id);
    if (!ul) return;

    ul.innerHTML = list.map((item, index) => `
        <li>
            <div>
                <strong>${item.placa || item.nome}</strong>
                <small>${item.modelo || item.cnh || ""}</small>
            </div>
            <div class="actions">
                <button onclick="editItem('${key}',${index})">✏️</button>
                <button onclick="deleteItem('${key}',${index})">🗑</button>
            </div>
        </li>
    `).join("");
}

function deleteItem(key, index) {
    if (!confirm("Excluir registro?")) return;
    const list = JSON.parse(localStorage.getItem(key)) || [];
    list.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(list));
    loadPage(key === "vehicles" ? "frota" : "motoristas");
}

function editItem(key, index) {
    const list = JSON.parse(localStorage.getItem(key)) || [];
    const item = list[index];
    list.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(list));

    if (key === "vehicles") {
        loadPage("frota");
        setTimeout(() => {
            placa.value = item.placa;
            modelo.value = item.modelo;
            km.value = item.km;
            vencDoc.value = item.vencDoc;
        }, 100);
    }

    if (key === "drivers") {
        loadPage("motoristas");
        setTimeout(() => {
            nomeMotorista.value = item.nome;
            cnh.value = item.cnh;
            vencCNH.value = item.vencCNH;
        }, 100);
    }
}

/* ================= DASHBOARD ================= */
function updateDashboard() {
    const vehicles = JSON.parse(localStorage.getItem("vehicles")) || [];
    const fuelings = JSON.parse(localStorage.getItem("fuelings")) || [];

    if (countVeiculos) countVeiculos.innerText = vehicles.length;

    const total = fuelings.reduce((s, f) => s + f.valor, 0);
    if (totalGastos) totalGastos.innerText = `R$ ${total.toFixed(2)}`;
}

function renderChart() {
    const ctx = document.getElementById("chartGastos");
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    const fuelings = JSON.parse(localStorage.getItem("fuelings")) || [];
    const map = {};
    fuelings.forEach(f => map[f.placa] = (map[f.placa] || 0) + f.valor);

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(map),
            datasets: [{
                label: "R$",
                data: Object.values(map)
            }]
        }
    });
}

/* ================= ALERTAS ================= */
function carregarAlertas() {
    const vehicles = JSON.parse(localStorage.getItem("vehicles")) || [];
    const ul = document.getElementById("listaAlertas");
    if (!ul) return;

    ul.innerHTML = vehicles
        .filter(v => v.km % 10000 >= 9000)
        .map(v => `<li>${v.placa} — revisão próxima</li>`)
        .join("") || "<li>Tudo em dia</li>";
}

/* ================= HELPERS ================= */
function toBase64(file) {
    return new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(file);
    });
}
function analiseIA() {
    const vehicles = JSON.parse(localStorage.getItem("vehicles")) || [];
    const fuelings = JSON.parse(localStorage.getItem("fuelings")) || [];
    let insight = "Análise IA: ";   
    if (vehicles.length === 0) {
        insight += "Nenhum veículo cadastrado. ";
    }
    if (fuelings.length === 0) {
        insight += "Nenhum abastecimento registrado. ";
    }
    if (vehicles.length > 0 && fuelings.length > 0) {
        const avgFueling = fuelings.reduce((s, f) => s + f.valor, 0) / fuelings.length;
        insight += `Média de gasto por abastecimento: R$ ${avgFueling.toFixed(2)}. `;
    }
    return insight;
}
const BACKUP_URL = "https://script.google.com/macros/s/AKfycbz21S1xBvLoYv5sagsFJkNiFs9pgSvFYppuS3ElmHPjb4pT0W5K9WLHHQwZJK_v1TZ5fQ/exec";

function backupNuvem(tipo, payload) {
    fetch(BACKUP_URL, {
        method: "POST",
        body: JSON.stringify({ tipo, payload })
    });
}

saveData("vehicles", data);
backupNuvem("vehicles", data);

function exportExcel() {
    const data = {
        vehicles: JSON.parse(localStorage.getItem("vehicles")),
        drivers: JSON.parse(localStorage.getItem("drivers")),
        fuelings: JSON.parse(localStorage.getItem("fuelings"))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "backup_sgf.json";
    a.click();
}
function importExcel(event) {
    const file = event.target.files[0];
    const reader = new FileReader();    
    reader.onload = function(e) {
        const data = JSON.parse(e.target.result);
        localStorage.setItem("vehicles", JSON.stringify(data.vehicles || []));
        localStorage.setItem("drivers", JSON.stringify(data.drivers || []));
        localStorage.setItem("fuelings", JSON.stringify(data.fuelings || []));
        alert("Importação concluída!");
    };
    reader.readAsText(file);
}   
document.getElementById("importFile").addEventListener("change", importExcel);  
document.getElementById("exportBtn").addEventListener("click", exportExcel);    





