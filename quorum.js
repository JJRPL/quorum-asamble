/* ══════════════════════════════════════════════════════
   CONTROL DE QUÓRUM — MULTIFAMILIARES LA POSADA
   quorum.js  |  100% local, localStorage
   ══════════════════════════════════════════════════════ */

/* ── Persistencia ── */
const LS_KEY = "quorum_asamblea_posada";

function loadAttendance() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch { return {}; }
}

function saveAttendance(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

/* ── Estado ── */
let attendance = loadAttendance();
// { "01-101": { registeredAt: ISO, representative: "" } }

let state = {
  searchQuery:    "",
  suggestions:    [],
  selectedApt:    null,       // apartamento a confirmar
  representative: "",         // nombre representante (opcional)
  listFilter:     "todos",    // todos | presentes | ausentes
  listSearch:     "",
  activeTab:      "registro", // registro | lista | resumen
};

/* ── Toasts ── */
const toastWrap = document.createElement("div");
toastWrap.className = "toast-wrap";
document.body.appendChild(toastWrap);

function toast(msg, type = "success", duration = 3000) {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${{success:"✅",danger:"❌",warning:"⚠️"}[type]||"ℹ️"}</span> ${msg}`;
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.classList.add("hiding");
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ── Helpers ── */
function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  } catch { return iso; }
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-CO",{day:"2-digit",month:"2-digit",year:"numeric"})
      + " " + d.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  } catch { return iso; }
}

function getStats() {
  const total        = APARTMENTS.length;
  const presentCodes = Object.keys(attendance);
  const present      = presentCodes.length;
  const absent       = total - present;
  const pctApt       = total ? ((present / total) * 100).toFixed(1) : 0;

  const presentCoeff = APARTMENTS
    .filter(a => attendance[a.code])
    .reduce((s, a) => s + a.coefficient, 0);
  const pctCoeff = TOTAL_COEFF ? ((presentCoeff / TOTAL_COEFF) * 100).toFixed(2) : 0;

  const quorum = parseFloat(pctCoeff) >= QUORUM_MIN_PCT;

  return { total, present, absent, pctApt, presentCoeff, pctCoeff, quorum };
}

/* ══════════════════════════════════════════════════════
   RENDER PRINCIPAL
   ══════════════════════════════════════════════════════ */
function render() {
  document.getElementById("app").innerHTML = `
    ${renderHeader()}
    <div class="container">
      ${renderQuorumBanner()}
      ${renderStats()}
      <div class="tabs">
        ${["registro","lista","resumen"].map(t => `
          <div class="tab ${state.activeTab===t?"active":""}"
            onclick="setTab('${t}')">
            ${{registro:"📋 Registro",lista:"🏠 Lista Completa",resumen:"📊 Resumen"}[t]}
          </div>`).join("")}
      </div>
      ${ state.activeTab === "registro" ? renderRegistro()
       : state.activeTab === "lista"    ? renderLista()
       : renderResumen() }
    </div>`;
  bindEvents();
}

/* ── Header ── */
function renderHeader() {
  return `
  <div class="header">
    <div>
      <h1>🏢 Control de Quórum — Multifamiliares La Posada</h1>
      <p>Registro de asistencia a asamblea</p>
    </div>
    <div class="header-right">
      <span class="live-clock" id="liveClock">--:--:--</span>
      <button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:white"
        onclick="exportCSV()">📥 Exportar</button>
      <button class="btn btn-sm" style="background:rgba(220,38,38,0.25);color:white"
        onclick="confirmReset()">🗑️ Reset</button>
    </div>
  </div>`;
}

/* ── Quórum Banner ── */
function renderQuorumBanner() {
  const s = getStats();
  return `
  <div class="quorum-banner ${s.quorum?"si":"no"}">
    <div>
      <div class="qtext">
        ${s.quorum ? "✅ QUÓRUM ALCANZADO" : "⏳ SIN QUÓRUM AÚN"}
      </div>
      <div class="qsub">
        Se requiere ≥ ${QUORUM_MIN_PCT}% del coeficiente total
        — actualmente: <strong>${s.pctCoeff}%</strong>
        (${s.presentCoeff.toFixed(2)} de ${TOTAL_COEFF.toFixed(2)})
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:2rem;font-weight:800;line-height:1">
        ${s.pctCoeff}%
      </div>
      <div style="font-size:0.8rem;opacity:0.75">del coeficiente</div>
    </div>
  </div>`;
}

/* ── Stats ── */
function renderStats() {
  const s = getStats();
  return `
  <div class="stats-grid">
    <div class="stat-card">
      <div>
        <div class="val">${s.total}</div>
        <div class="lbl">Total Apts.</div>
      </div>
      <div class="ico">🏠</div>
    </div>
    <div class="stat-card green">
      <div>
        <div class="val">${s.present}</div>
        <div class="lbl">Presentes</div>
      </div>
      <div class="ico">✅</div>
    </div>
    <div class="stat-card orange">
      <div>
        <div class="val">${s.absent}</div>
        <div class="lbl">Ausentes</div>
      </div>
      <div class="ico">⏳</div>
    </div>
    <div class="stat-card purple">
      <div>
        <div class="val">${s.pctApt}%</div>
        <div class="lbl">% Aptos.</div>
      </div>
      <div class="ico">📊</div>
    </div>
    <div class="stat-card ${s.quorum?"green":"red"}">
      <div>
        <div class="val">${s.pctCoeff}%</div>
        <div class="lbl">% Coeficiente</div>
      </div>
      <div class="ico">${s.quorum?"🎉":"📈"}</div>
    </div>
  </div>

  <div class="card mb-4" style="margin-bottom:20px">
    <div class="card-body" style="padding:16px 20px">
      <div class="flex justify-between" style="margin-bottom:6px">
        <span class="font-bold text-sm">Progreso de quórum</span>
        <span class="text-sm text-gray">${s.present} / ${s.total} apartamentos</span>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar ${s.quorum?"green":""}"
          style="width:${Math.min(s.pctCoeff, 100)}%"></div>
      </div>
      <div class="progress-lbl">
        Falta: ${Math.max(0, (QUORUM_MIN_PCT - parseFloat(s.pctCoeff)).toFixed(2))}%
        del coeficiente para alcanzar quórum
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   TAB: REGISTRO
   ══════════════════════════════════════════════════════ */
function renderRegistro() {
  const apt = state.selectedApt;
  return `
  <div class="main-grid">

    <!-- Panel izquierdo: búsqueda y registro -->
    <div>
      <div class="card">
        <div class="card-header"><h2>📋 Registrar Asistencia</h2></div>
        <div class="card-body">

          <div class="search-box">
            <span class="ico">🔍</span>
            <input
              type="text"
              id="searchInput"
              placeholder="Buscar apartamento o propietario..."
              value="${esc(state.searchQuery)}"
              autocomplete="off"
              oninput="onSearch(this.value)"
            />
          </div>

          ${state.suggestions.length > 0 ? `
            <div class="suggestions" id="suggestionsBox">
              ${state.suggestions.map(a => {
                const ya = !!attendance[a.code];
                return `
                <div class="suggestion-item ${ya?"ya-registrado":""}"
                  onclick="${ya ? "toast('Este apartamento ya está registrado.','warning')" : `selectApt('${a.code}')`}">
                  <div class="apt-code">${a.code} ${ya?"<span class='badge badge-success' style='margin-left:6px'>✅ Presente</span>":""}</div>
                  <div class="apt-name">${esc(a.owner)}</div>
                  <div class="apt-coeff">Coeficiente: ${a.coefficient}%</div>
                </div>`;
              }).join("")}
            </div>` : ""}

          ${apt ? `
            <div class="confirm-card">
              <div class="apt">🏠 ${apt.code}</div>
              <div class="name">${esc(apt.owner)}</div>
              <div class="coeff">Coeficiente: ${apt.coefficient}%</div>
            </div>

            <div style="margin-bottom:12px">
              <label style="display:block;font-weight:600;font-size:0.875rem;
                            margin-bottom:6px;color:var(--gray-700)">
                Representante / Delegado <span style="font-weight:400;color:var(--gray-500)">(opcional)</span>
              </label>
              <input type="text" id="repInput"
                class="form-control"
                style="width:100%;padding:9px 12px;border:2px solid var(--gray-200);
                       border-radius:8px;font-size:0.95rem"
                placeholder="Nombre de quien asiste..."
                value="${esc(state.representative)}"
                oninput="state.representative=this.value"
                onkeydown="if(event.key==='Enter')registerAttendance()"
              />
            </div>

            <div class="flex gap-2">
              <button class="btn btn-success btn-lg" style="flex:1"
                onclick="registerAttendance()">
                ✅ Confirmar Asistencia
              </button>
              <button class="btn btn-gray" onclick="clearSelection()">✕</button>
            </div>` : `
            <div style="text-align:center;padding:24px 0;color:var(--gray-400)">
              <div style="font-size:2.5rem;margin-bottom:8px">🔍</div>
              <div class="text-sm">Busque un apartamento para registrar su asistencia</div>
            </div>`}

          <hr class="divider"/>

          <!-- Últimos registros -->
          <div>
            <div class="font-bold text-sm mb-3" style="margin-bottom:10px">
              🕐 Últimos registros
            </div>
            ${(() => {
              const recent = APARTMENTS
                .filter(a => attendance[a.code])
                .sort((a,b) => new Date(attendance[b.code].registeredAt) - new Date(attendance[a.code].registeredAt))
                .slice(0, 6);
              if (recent.length === 0)
                return `<div class="text-center text-gray text-sm" style="padding:12px">Sin registros aún.</div>`;
              return recent.map(a => `
                <div style="display:flex;align-items:center;justify-content:space-between;
                            padding:8px 0;border-bottom:1px solid var(--gray-100)">
                  <div>
                    <span class="font-bold text-sm">${a.code}</span>
                    <span class="text-xs text-gray" style="margin-left:6px">
                      ${esc(a.owner.split(" ").slice(0,2).join(" "))}
                    </span>
                    ${attendance[a.code].representative
                      ? `<span class="text-xs text-gray"> · ${esc(attendance[a.code].representative)}</span>`
                      : ""}
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray">${formatTime(attendance[a.code].registeredAt)}</span>
                    <button class="btn btn-sm btn-danger"
                      style="padding:3px 8px;font-size:0.72rem"
                      onclick="removeAttendance('${a.code}')">✕</button>
                  </div>
                </div>`).join("");
            })()}
          </div>
        </div>
      </div>
    </div>

    <!-- Panel derecho: lista de presentes en tiempo real -->
    <div>
      <div class="card">
        <div class="card-header">
          <h2>✅ Presentes (${Object.keys(attendance).length})</h2>
          <span class="tag">${getStats().pctCoeff}% coeficiente</span>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Apartamento</th>
                  <th>Propietario</th>
                  <th>Representante</th>
                  <th>Coef.</th>
                  <th>Hora</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  const rows = APARTMENTS
                    .filter(a => attendance[a.code])
                    .sort((a,b) => new Date(attendance[b.code].registeredAt) - new Date(attendance[a.code].registeredAt));
                  if (rows.length === 0)
                    return `<tr><td colspan="6" class="text-center text-gray"
                      style="padding:30px">Ningún apartamento registrado aún.</td></tr>`;
                  return rows.map(a => `
                    <tr>
                      <td><span class="font-mono font-bold">${a.code}</span></td>
                      <td class="text-sm">${esc(a.owner)}</td>
                      <td class="text-sm text-gray">
                        ${attendance[a.code].representative
                          ? esc(attendance[a.code].representative)
                          : "<span style='color:var(--gray-300)'>—</span>"}
                      </td>
                      <td><span class="tag">${a.coefficient}</span></td>
                      <td class="text-xs text-gray">${formatTime(attendance[a.code].registeredAt)}</td>
                      <td>
                        <button class="btn btn-sm btn-danger"
                          style="padding:3px 8px"
                          onclick="removeAttendance('${a.code}')">✕</button>
                      </td>
                    </tr>`).join("");
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

  </div>`;
}

/* ══════════════════════════════════════════════════════
   TAB: LISTA COMPLETA
   ══════════════════════════════════════════════════════ */
function renderLista() {
  const f = state.listSearch.toLowerCase().trim();
  let filtered = APARTMENTS.filter(a => {
    if (state.listFilter === "presentes" && !attendance[a.code]) return false;
    if (state.listFilter === "ausentes"  &&  attendance[a.code]) return false;
    if (f) return a.code.toLowerCase().includes(f) || a.owner.toLowerCase().includes(f);
    return true;
  });

  return `
  <div class="card">
    <div class="card-header">
      <h2>🏠 Lista Completa (${filtered.length})</h2>
      <div class="flex gap-2">
        <button class="btn btn-success btn-sm" onclick="exportCSV()">📥 CSV</button>
      </div>
    </div>
    <div class="card-body">
      <div class="filter-wrap mb-3">
        ${["todos","presentes","ausentes"].map(f => `
          <button class="filter-btn ${state.listFilter===f?"active":""}"
            onclick="setListFilter('${f}')">
            ${{todos:"Todos",presentes:"✅ Presentes",ausentes:"⏳ Ausentes"}[f]}
          </button>`).join("")}
      </div>
      <div class="search-box mb-4" style="margin-bottom:12px">
        <span class="ico">🔍</span>
        <input type="text" id="listSearchInput"
          placeholder="Buscar en la lista..."
          value="${esc(state.listSearch)}"
          oninput="onListSearch(this.value)"/>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Apartamento</th>
              <th>Propietario</th>
              <th>Coeficiente</th>
              <th>Estado</th>
              <th>Hora Registro</th>
              <th>Representante</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((a, i) => {
              const rec = attendance[a.code];
              return `
              <tr>
                <td class="text-gray text-xs">${i+1}</td>
                <td><span class="font-mono font-bold">${a.code}</span></td>
                <td class="text-sm">${esc(a.owner)}</td>
                <td><span class="tag">${a.coefficient}%</span></td>
                <td>
                  ${rec
                    ? `<span class="badge badge-success">✅ Presente</span>`
                    : `<span class="badge badge-gray">⏳ Ausente</span>`}
                </td>
                <td class="text-xs text-gray">
                  ${rec ? formatTime(rec.registeredAt) : "—"}
                </td>
                <td class="text-xs text-gray">
                  ${rec?.representative ? esc(rec.representative) : "—"}
                </td>
                <td>
                  ${rec
                    ? `<button class="btn btn-sm btn-danger"
                         onclick="removeAttendance('${a.code}')">✕ Quitar</button>`
                    : `<button class="btn btn-sm btn-success"
                         onclick="quickRegister('${a.code}')">+ Registrar</button>`}
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      <div class="text-sm text-gray" style="margin-top:12px">
        Mostrando ${filtered.length} de ${APARTMENTS.length} apartamentos
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   TAB: RESUMEN
   ══════════════════════════════════════════════════════ */
function renderResumen() {
  const s = getStats();

  // Agrupar por bloque (primer número del código)
  const bloques = {};
  APARTMENTS.forEach(a => {
    const bloque = a.code.split("-")[0];
    if (!bloques[bloque]) bloques[bloque] = { total:0, present:0, coeff:0, coeffTotal:0 };
    bloques[bloque].total++;
    bloques[bloque].coeffTotal += a.coefficient;
    if (attendance[a.code]) {
      bloques[bloque].present++;
      bloques[bloque].coeff += a.coefficient;
    }
  });

  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">

    <div class="card">
      <div class="card-header"><h2>📊 Resumen General</h2></div>
      <div class="card-body">
        <table>
          <tbody>
            <tr><td class="font-bold">Total apartamentos</td>
                <td class="text-right font-bold">${s.total}</td></tr>
            <tr><td style="color:var(--success)">✅ Presentes</td>
                <td class="text-right font-bold">${s.present}</td></tr>
            <tr><td style="color:var(--warning)">⏳ Ausentes</td>
                <td class="text-right font-bold">${s.absent}</td></tr>
            <tr><td>% por apartamentos</td>
                <td class="text-right font-bold">${s.pctApt}%</td></tr>
            <tr style="border-top:2px solid var(--gray-200)">
              <td class="font-bold">Coeficiente total</td>
              <td class="text-right font-bold">${TOTAL_COEFF.toFixed(2)}</td></tr>
            <tr><td style="color:var(--success)">Coeficiente presente</td>
                <td class="text-right font-bold">${s.presentCoeff.toFixed(2)}</td></tr>
            <tr><td class="font-bold">% Coeficiente</td>
                <td class="text-right font-bold" style="font-size:1.1rem;color:${s.quorum?"var(--success)":"var(--danger)"}">
                  ${s.pctCoeff}%</td></tr>
            <tr style="border-top:2px solid var(--gray-200)">
              <td class="font-bold">¿Quórum?</td>
              <td class="text-right">
                ${s.quorum
                  ? `<span class="badge badge-success">✅ SÍ</span>`
                  : `<span class="badge badge-danger">❌ NO</span>`}
              </td>
            </tr>
            <tr>
              <td>Falta para quórum</td>
              <td class="text-right font-bold">
                ${s.quorum ? "—" : (QUORUM_MIN_PCT - parseFloat(s.pctCoeff)).toFixed(2) + "%"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2>🏗️ Por Bloque</h2></div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bloque</th>
                <th>Aptos.</th>
                <th>Presentes</th>
                <th>% Bloque</th>
                <th>Coef. pres.</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(bloques)
                .sort((a,b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([bloque, d]) => `
                <tr>
                  <td><span class="font-mono font-bold">Bloque ${bloque}</span></td>
                  <td>${d.total}</td>
                  <td>
                    <span style="color:${d.present===d.total?"var(--success)":"var(--gray-800)"}">
                      ${d.present}/${d.total}
                    </span>
                  </td>
                  <td>
                    <span class="tag">${d.total?((d.present/d.total)*100).toFixed(0):0}%</span>
                  </td>
                  <td>${d.coeff.toFixed(2)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Historial completo de registros con hora -->
  <div class="card">
    <div class="card-header">
      <h2>🕐 Historial de Registros (orden de llegada)</h2>
      <button class="btn btn-success btn-sm" onclick="exportCSV()">📥 Exportar CSV</button>
    </div>
    <div class="card-body" style="padding:0">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Apartamento</th><th>Propietario</th>
              <th>Representante</th><th>Coeficiente</th><th>Fecha y Hora</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              const rows = APARTMENTS
                .filter(a => attendance[a.code])
                .sort((a,b) => new Date(attendance[a.code].registeredAt) - new Date(attendance[b.code].registeredAt));
              if (rows.length === 0)
                return `<tr><td colspan="6" class="text-center text-gray"
                  style="padding:24px">Sin registros aún.</td></tr>`;
              return rows.map((a,i) => `
                <tr>
                  <td class="text-gray text-xs">${i+1}</td>
                  <td><span class="font-mono font-bold">${a.code}</span></td>
                  <td class="text-sm">${esc(a.owner)}</td>
                  <td class="text-sm text-gray">
                    ${attendance[a.code].representative
                      ? esc(attendance[a.code].representative) : "—"}
                  </td>
                  <td><span class="tag">${a.coefficient}</span></td>
                  <td class="text-sm">${formatDateTime(attendance[a.code].registeredAt)}</td>
                </tr>`).join("");
            })()}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   ACCIONES
   ══════════════════════════════════════════════════════ */
function onSearch(value) {
  state.searchQuery = value;
  const q = value.toLowerCase().trim();
  if (q.length < 1) {
    state.suggestions = [];
    state.selectedApt = null;
    renderPartial();
    return;
  }
  state.suggestions = APARTMENTS.filter(a =>
    a.code.toLowerCase().includes(q) ||
    a.owner.toLowerCase().includes(q)
  ).slice(0, 8);
  renderPartial();
}

function selectApt(code) {
  const apt = APARTMENTS.find(a => a.code === code);
  if (!apt) return;
  if (attendance[code]) { toast("Este apartamento ya está registrado.", "warning"); return; }
  state.selectedApt    = apt;
  state.suggestions    = [];
  state.searchQuery    = `${apt.code} — ${apt.owner}`;
  state.representative = "";
  renderPartial();
  setTimeout(() => document.getElementById("repInput")?.focus(), 50);
}

function clearSelection() {
  state.selectedApt    = null;
  state.searchQuery    = "";
  state.suggestions    = [];
  state.representative = "";
  renderPartial();
  setTimeout(() => document.getElementById("searchInput")?.focus(), 50);
}

function registerAttendance() {
  const apt = state.selectedApt;
  if (!apt) return;
  if (attendance[apt.code]) { toast("Ya está registrado.", "warning"); return; }

  attendance[apt.code] = {
    registeredAt:   new Date().toISOString(),
    representative: state.representative.trim(),
  };
  saveAttendance(attendance);

  toast(`✅ ${apt.code} — ${apt.owner.split(" ").slice(0,2).join(" ")} registrado`, "success");
  state.selectedApt    = null;
  state.searchQuery    = "";
  state.suggestions    = [];
  state.representative = "";
  render();
  setTimeout(() => document.getElementById("searchInput")?.focus(), 80);
}

function quickRegister(code) {
  const apt = APARTMENTS.find(a => a.code === code);
  if (!apt || attendance[code]) return;
  attendance[code] = { registeredAt: new Date().toISOString(), representative: "" };
  saveAttendance(attendance);
  toast(`✅ ${apt.code} registrado`, "success");
  render();
}

function removeAttendance(code) {
  const apt = APARTMENTS.find(a => a.code === code);
  if (!apt) return;
  if (!confirm(`¿Quitar la asistencia de:\n${apt.code} — ${apt.owner}?`)) return;
  delete attendance[code];
  saveAttendance(attendance);
  toast(`↩ ${apt.code} removido`, "warning");
  render();
}

function confirmReset() {
  if (!confirm(
    "⚠️ ¿Resetear TODOS los registros de asistencia?\nEsta acción no se puede deshacer."
  )) return;
  attendance = {};
  saveAttendance(attendance);
  toast("Registros limpiados", "warning");
  render();
}

function setTab(tab) {
  state.activeTab = tab;
  render();
}

function setListFilter(f) {
  state.listFilter = f;
  render();
}

function onListSearch(value) {
  state.listSearch = value;
  // Actualización parcial de la tabla sin perder foco
  const tbody = document.querySelector("#listaBody");
  if (!tbody) { render(); return; }
  render();
  setTimeout(() => {
    const el = document.getElementById("listSearchInput");
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }, 20);
}

/* ── Exportar CSV ── */
function exportCSV() {
  const s   = getStats();
  let csv   = `REGISTRO DE ASISTENCIA — MULTIFAMILIARES LA POSADA\n`;
  csv      += `Fecha:,${new Date().toLocaleDateString("es-CO")}\n`;
  csv      += `Presentes:,${s.present},de,${s.total}\n`;
  csv      += `Coeficiente presente:,${s.presentCoeff.toFixed(2)},de,${TOTAL_COEFF.toFixed(2)}\n`;
  csv      += `% Coeficiente:,${s.pctCoeff}%\n`;
  csv      += `Quórum:,${s.quorum?"SÍ":"NO"}\n\n`;
  csv      += `#,Apartamento,Propietario,Representante,Coeficiente,Estado,Hora Registro\n`;

  APARTMENTS
    .sort((a,b) => a.code.localeCompare(b.code))
    .forEach((a, i) => {
      const rec = attendance[a.code];
      csv += `${i+1},"${a.code}","${a.owner}","${rec?.representative||""}",` +
             `"${a.coefficient}","${rec?"Presente":"Ausente"}","${rec?formatDateTime(rec.registeredAt):""}"\n`;
    });

  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `quorum_posada_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast("CSV exportado correctamente", "success");
}

/* ══════════════════════════════════════════════════════
   BIND EVENTS & RELOJ EN VIVO
   ══════════════════════════════════════════════════════ */
function bindEvents() {
  // Cerrar sugerencias al hacer clic fuera
  document.addEventListener("click", e => {
    const box = document.getElementById("suggestionsBox");
    if (box && !box.contains(e.target) &&
        e.target.id !== "searchInput") {
      state.suggestions = [];
      renderPartial();
    }
  }, { once: true });
}

// Render parcial solo del área de registro (sin rehacer header/stats)
function renderPartial() {
  render(); // Para este caso re-render completo es suficientemente rápido
}

/* ── Reloj en vivo ── */
function updateClock() {
  const el = document.getElementById("liveClock");
  if (el) el.textContent = new Date().toLocaleTimeString("es-CO", {
    hour:"2-digit", minute:"2-digit", second:"2-digit"
  });
}
setInterval(updateClock, 1000);

/* ══════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════ */
render();
updateClock();
