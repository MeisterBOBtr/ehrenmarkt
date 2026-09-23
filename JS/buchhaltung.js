/* =========================================================
   EHRENMARKT – CLAN-BUCHHALTUNG
   Neue, eigenständige JS-Datei passend zu buchhaltung.html
   Keine Pop-up-/Toast-Meldungen.
========================================================= */

(() => {
    "use strict";

    const TABLES = {
        bookings: "buchhaltung_buchungen",
        savings: "buchhaltung_sparkonto",
        employees: "employees",
        orders: "buchhaltung_auftragsabrechnungen",
        workers: "buchhaltung_auftragsarbeiter",
        logs: "buchhaltung_protokoll",
        cash: "buchhaltung_kassenabgleich"
    };

    const state = {
        user: null,
        employee: null,
        bookings: [],
        savings: [],
        employees: [],
        orders: [],
        workers: [],
        logs: [],
        cashChecks: [],
        savingsGoal: Number(localStorage.getItem("ehrenmarkt_savings_goal") || 0) || 0,
        currentWorkers: [],
        loaded: false
    };

    const $ = id => document.getElementById(id);
    const value = id => String($(id)?.value ?? "").trim();
    const num = idOrValue => {
        const raw = typeof idOrValue === "string" && $(idOrValue)
            ? $(idOrValue).value
            : idOrValue;
        const n = Number(String(raw ?? "").replace(",", "."));
        return Number.isFinite(n) ? n : 0;
    };
    const text = (id, v) => { if ($(id)) $(id).textContent = v ?? ""; };
    const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
    const money = n => `${Number(n || 0).toLocaleString("de-DE", {maximumFractionDigits: 2})} $`;
    const dateText = v => v ? new Date(v).toLocaleString("de-DE", {dateStyle:"short", timeStyle:"short"}) : "—";
    const nowLocal = () => {
        const d = new Date();
        const pad = n => String(n).padStart(2,"0");
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    function db() {
        return window.supabaseClient || window.supabase || null;
    }

    function inlineStatus(message, kind = "error") {
        let box = $("buchhaltungInlineStatus");
        if (!box) {
            box = document.createElement("div");
            box.id = "buchhaltungInlineStatus";
            box.style.cssText = "margin:12px 0;padding:10px 12px;border:1px solid rgba(212,175,55,.35);border-radius:8px;background:transparent;font-size:13px;";
            const header = document.querySelector("header.header");
            (header || document.querySelector(".page"))?.appendChild(box);
        }
        box.textContent = message;
        box.style.color = kind === "success" ? "#8ee6a8" : "#ffb0b0";
        box.hidden = false;
    }

    function clearStatus() {
        const box = $("buchhaltungInlineStatus");
        if (box) box.hidden = true;
    }

    function hasDB() {
        return !!db();
    }

    // Discord-Benachrichtigung über die vorhandene Supabase Edge Function.
    // Fehler bei Discord blockieren niemals das Speichern der Buchhaltung.
    async function sendDiscordNotification(payload) {
        if (!hasDB() || !db().functions?.invoke) return false;
        try {
            const { data, error } = await db().functions.invoke("buchhaltung-discord", { body: payload });
            if (error || data?.error) {
                console.warn("Buchhaltung: Discord-Benachrichtigung fehlgeschlagen", error || data?.error);
                return false;
            }
            return true;
        } catch (error) {
            console.warn("Buchhaltung: Discord-Benachrichtigung fehlgeschlagen", error);
            return false;
        }
    }

    function employeeName(emp = state.employee) {
        return String(emp?.name || emp?.username || emp?.minecraft_name || state.user?.user_metadata?.minecraft_name || state.user?.user_metadata?.username || state.user?.email || "Unbekannt").trim();
    }

    function rank() {
        return String(state.employee?.rang || state.employee?.role || "").trim().toLowerCase();
    }

    function isManagement() {
        const r = rank();
        return ["leitung", "stadtleitung", "gründer", "gruender", "leiter"].includes(r);
    }

    function isStaff() {
        const r = rank();
        return r === "mitarbeiter" && !isManagement();
    }

    function canBook() { return isManagement() || isStaff(); }
    function canManage() { return isManagement(); }

    async function getUser() {
        if (!hasDB()) return null;
        const { data, error } = await db().auth.getUser();
        if (error) throw error;
        state.user = data?.user || null;
        return state.user;
    }

    async function getEmployee() {
        if (!state.user || !hasDB()) return null;
        const { data, error } = await db().from(TABLES.employees).select("*").eq("user_id", state.user.id).maybeSingle();
        if (error) throw error;
        state.employee = data || null;
        return state.employee;
    }

    async function queryTable(name, order = null) {
        if (!hasDB()) return [];
        let q = db().from(name).select("*");
        if (order) q = q.order(order, {ascending:false});
        const { data, error } = await q;
        if (error) {
            console.warn(`Buchhaltung: ${name} konnte nicht geladen werden`, error);
            return [];
        }
        return data || [];
    }

    async function loadAll() {
        clearStatus();
        try {
            await getUser();
            await getEmployee();
        } catch (e) {
            console.warn("Benutzer/Mitarbeiter konnten nicht geladen werden", e);
        }

        const [bookings, savings, employees, orders, workers, cash, logs] = await Promise.all([
            queryTable(TABLES.bookings, "datum"),
            queryTable(TABLES.savings, "datum"),
            queryTable(TABLES.employees, "created_at"),
            queryTable(TABLES.orders, "datum"),
            queryTable(TABLES.workers, "created_at"),
            queryTable(TABLES.cash, "datum"),
            queryTable(TABLES.logs, "created_at")
        ]);

        state.bookings = bookings;
        state.savings = savings;
        state.employees = employees;
        state.orders = orders;
        state.workers = workers;
        state.cashChecks = cash;
        state.logs = logs;
        const savedGoal = [...logs]
            .filter(l => String(l.aktion || "").toLowerCase() === "sparziel")
            .sort((a,b) => new Date(b.created_at || b.datum || 0) - new Date(a.created_at || a.datum || 0))[0];
        const loggedGoal = Number(savedGoal?.details?.goal);
        if (Number.isFinite(loggedGoal)) {
            state.savingsGoal = loggedGoal;
            localStorage.setItem("ehrenmarkt_savings_goal", String(loggedGoal));
        }
        state.loaded = true;

        populateRecipientSelect();
        renderAll();
    }

    function renderAll() {
        renderOverview();
        renderBookings();
        renderOrders();
        renderEmployees();
        renderSavings();
        updateMonthly();
        renderCashChecks();
        renderLogs();
        renderPermissionState();
        runFinancialControl();
        renderRights();
    }

    /* ---------------- NAVIGATION ---------------- */
    window.showArea = function(id, button) {
        document.querySelectorAll(".open-area").forEach(a => a.classList.remove("active"));
        document.querySelectorAll(".nav-button").forEach(b => b.classList.remove("active"));
        const area = $(id);
        if (area) area.classList.add("active");
        if (button) button.classList.add("active");
        if (id === "area-employees") renderEmployees();
        if (id === "area-savings") renderSavings();
        if (id === "area-bookings") renderBookings();
    };

    function renderPermissionState() {
        text("currentUserName", employeeName());
        text("currentUserRank", state.employee?.rang || state.employee?.role || "—");
    }

    /* ---------------- OVERVIEW ---------------- */
    function activeBookings() { return state.bookings.filter(b => String(b.status || "").toLowerCase() !== "storniert"); }
    function bookingIncome() { return activeBookings().filter(b => String(b.art || "").toLowerCase() === "einzahlung").reduce((s,b)=>s+Number(b.betrag||0),0); }
    function bookingExpense() { return activeBookings().filter(b => String(b.art || "").toLowerCase() === "auszahlung").reduce((s,b)=>s+Number(b.betrag||0),0); }
    function savingsBalance() {
        return state.savings.filter(s=>String(s.status||"").toLowerCase()!=="storniert").reduce((sum,s)=>sum + (String(s.art||s.typ||"").toLowerCase()==="einzahlung" ? Number(s.betrag||0) : -Number(s.betrag||0)),0);
    }
    function workerSalaryTotal() { return state.orders.reduce((s,o)=>s+Number(o.gesamt_gehaelter||0),0); }
    function openOrderTotal() { return state.orders.filter(o=>["offen","teilweise bezahlt"].includes(String(o.status||"").toLowerCase())).reduce((s,o)=>s+Math.max(0,Number(o.gesamtbetrag||0)-Number(o.clanbetrag||0)-Number(o.gesamt_gehaelter||0)),0); }
    function clanBalance() { return bookingIncome() - bookingExpense(); }

    function renderOverview() {
        text("currentClanBalance", money(clanBalance()));
        text("totalRevenue", money(bookingIncome()));
        text("totalDeposits", money(bookingIncome()));
        text("totalWithdrawals", money(bookingExpense()));
        text("totalWorkerSalaries", money(workerSalaryTotal()));
        text("totalClanExpenses", money(state.bookings.filter(b=>String(b.kategorie||"").toLowerCase()==="clan-ausgabe" && String(b.art||"").toLowerCase()==="auszahlung").reduce((s,b)=>s+Number(b.betrag||0),0)));
        text("totalSavings", money(savingsBalance()));
        text("totalOpenAmounts", money(openOrderTotal()));
        text("totalBookings", String(state.bookings.length));
        text("totalAssets", money(clanBalance()+savingsBalance()));
    }

    /* ---------------- BOOKING ---------------- */
    function recipientOptions(selected = "Clan-Kasse") {
        const names = ["Clan-Kasse", "Sparkonto", ...state.employees.map(employeeName)];
        const unique = [...new Set(names.filter(Boolean))];
        return unique.map(n=>`<option value="${esc(n)}" ${n===selected?"selected":""}>${esc(n)}</option>`).join("");
    }

    function populateRecipientSelect() {
        const select = $("bookingTo");
        if (!select || select.tagName !== "SELECT") return;
        const current = select.value || "Clan-Kasse";
        select.innerHTML = recipientOptions(current);
    }

    function applyBookingEndpoints() {
        const type = value("bookingType") || "Einzahlung";
        const from = $("bookingFrom");
        const to = $("bookingTo");
        const me = employeeName();
        if (from) from.value = type === "Auszahlung" ? "Clan-Kasse" : me;
        if (to) {
            if (!to.options.length) populateRecipientSelect();
            const preferred = type === "Auszahlung" ? (to.value && to.value !== "Clan-Kasse" ? to.value : me) : (to.value || "Clan-Kasse");
            const valid = [...to.options].some(o=>o.value===preferred);
            to.value = valid ? preferred : (type === "Auszahlung" ? me : "Clan-Kasse");
        }
    }

    function clearBookingForm() {
        ["bookingNumber","bookingAmount","bookingPurpose","bookingOrderNumber","bookingNote"].forEach(id=>{ if($(id)) $(id).value=""; });
        if ($("bookingType")) $("bookingType").value="Einzahlung";
        if ($("bookingCategory")) $("bookingCategory").value="Auftrag";
        if ($("bookingPaymentMethod")) $("bookingPaymentMethod").value="Ingame-Bargeld";
        if ($("bookingStatus")) $("bookingStatus").value="Offen";
        if ($("bookingDate")) $("bookingDate").value=nowLocal();
        populateRecipientSelect();
        applyBookingEndpoints();
    }

    window.openBookingModal = function() {
        if (!canBook()) return;
        clearBookingForm();
        $("bookingModal")?.classList.add("active");
    };
    window.closeBookingModal = function() { $("bookingModal")?.classList.remove("active"); };

    function nextNumber(prefix, rows, field="buchungsnummer") {
        const max = rows.reduce((m,r)=>{
            const match = String(r[field]||"").match(/(\d+)$/);
            return match ? Math.max(m, Number(match[1])) : m;
        },0);
        return `${prefix}-${String(max+1).padStart(4,"0")}`;
    }

    function formError(msg, modalId) {
        const modal = $(modalId);
        if (!modal) { inlineStatus(msg); return; }
        let box = modal.querySelector(".buchhaltung-inline-error");
        if (!box) {
            box=document.createElement("div");
            box.className="buchhaltung-inline-error";
            box.style.cssText="margin-top:12px;padding:10px;border:1px solid rgba(180,50,50,.45);border-radius:7px;color:#ffb0b0;font-size:13px;";
            modal.querySelector(".modal-footer")?.before(box);
        }
        box.textContent=msg;
    }

    function clearFormError(modalId) { $(modalId)?.querySelector(".buchhaltung-inline-error")?.remove(); }

    window.saveBooking = async function() {
        clearFormError("bookingModal");
        if (!canBook()) return formError("Keine Berechtigung für Buchungen.","bookingModal");
        if (!hasDB()) return formError("Supabase ist nicht verbunden.","bookingModal");
        const amount=num("bookingAmount");
        if (amount<=0) return formError("Bitte einen gültigen Betrag eingeben.","bookingModal");
        const type=value("bookingType") || "Einzahlung";
        if (type === "Auszahlung" && !canManage()) return formError("Auszahlungen sind nur für die Buchhaltungsleitung erlaubt.","bookingModal");
        if (type === "Auszahlung" && amount > clanBalance()) return formError("Die Auszahlung überschreitet den aktuell erfassten Clanstand.","bookingModal");
        const from = type === "Auszahlung" ? "Clan-Kasse" : employeeName();
        const to = value("bookingTo") || "Clan-Kasse";
        const payload = {
            buchungsnummer: value("bookingNumber") || nextNumber("BK",state.bookings),
            art:type,
            betrag:amount,
            von:from,
            an:to,
            zweck:value("bookingPurpose") || null,
            kategorie:value("bookingCategory") || "Sonstiges",
            auftragsnummer:value("bookingOrderNumber") || null,
            zahlungsart:value("bookingPaymentMethod") || "Ingame-Bargeld",
            datum:value("bookingDate") || nowLocal(),
            erstellt_von:state.user?.id || null,
            erstellt_von_name:employeeName(),
            status:value("bookingStatus") || "Offen",
            notiz:value("bookingNote") || null
        };
        const {data,error}=await db().from(TABLES.bookings).insert(payload).select().single();
        if (error) return formError(error.message || "Buchung konnte nicht gespeichert werden.","bookingModal");
        state.bookings.unshift(data);
        await writeLog("Buchung","Erstellt",payload.buchungsnummer,payload);
        await sendDiscordNotification({
            type: payload.art,
            title: payload.art === "Einzahlung" ? "💰 Neue Einzahlung" : "💸 Neue Auszahlung",
            amount: payload.betrag,
            from: payload.von,
            to: payload.an,
            purpose: payload.zweck,
            category: payload.kategorie,
            orderNumber: payload.auftragsnummer,
            status: payload.status,
            createdBy: payload.erstellt_von_name,
            date: payload.datum,
            description: payload.buchungsnummer,
            note: payload.notiz
        });
        clearBookingForm();
        window.closeBookingModal();
        renderAll();
    };

    function filteredBookings() {
        const q=value("bookingSearch").toLowerCase();
        const type=value("bookingTypeFilter");
        const cat=value("bookingCategoryFilter");
        return state.bookings.filter(b=>{
            const hay=[b.buchungsnummer,b.art,b.betrag,b.von,b.an,b.zweck,b.kategorie,b.auftragsnummer,b.erstellt_von_name,b.status].join(" ").toLowerCase();
            return (!q||hay.includes(q))&&(!type||b.art===type)&&(!cat||b.kategorie===cat);
        });
    }

    window.filterBookings = renderBookings;
    function renderBookings() {
        const body=$("bookingTableBody"); if(!body) return;
        const list=filteredBookings();
        body.innerHTML=list.length?list.map(b=>`<tr><td>${esc(b.buchungsnummer)}</td><td>${esc(b.art)}</td><td>${money(b.betrag)}</td><td>${esc(b.von)}</td><td>${esc(b.an)}</td><td>${esc(b.zweck)}</td><td>${esc(b.kategorie)}</td><td>${esc(b.auftragsnummer)}</td><td>${esc(b.zahlungsart)}</td><td>${esc(dateText(b.datum))}</td><td>${esc(b.erstellt_von_name)}</td><td>${esc(b.status)}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="12">Keine passenden Buchungen vorhanden.</td></tr>`;
        const listActive=list.filter(b=>String(b.status||"").toLowerCase()!=="storniert");
        text("bookingIncome",money(listActive.filter(b=>String(b.art||"").toLowerCase()==="einzahlung").reduce((s,b)=>s+Number(b.betrag||0),0)));
        text("bookingExpense",money(listActive.filter(b=>String(b.art||"").toLowerCase()==="auszahlung").reduce((s,b)=>s+Number(b.betrag||0),0)));
        text("bookingNet",money(listActive.reduce((s,b)=>s+(String(b.art||"").toLowerCase()==="einzahlung"?1:-1)*Number(b.betrag||0),0)));
        text("bookingCount",String(list.length));
    }

    /* ---------------- EMPLOYEES ---------------- */
    window.filterEmployees = renderEmployees;
    function renderEmployees() {
        const q=value("employeeSearch").toLowerCase();
        const list=state.employees.filter(e=>employeeName(e).toLowerCase().includes(q));
        const body=$("employeeTableBody");
        if(body) body.innerHTML=list.length?list.map(e=>{
            const name=employeeName(e);
            const deposits=state.bookings.filter(b=>b.von===name && String(b.art||"").toLowerCase()==="einzahlung").reduce((s,b)=>s+Number(b.betrag||0),0);
            const withdrawals=state.bookings.filter(b=>b.an===name && String(b.art||"").toLowerCase()==="auszahlung").reduce((s,b)=>s+Number(b.betrag||0),0);
            const salaries=state.workers.filter(w=>String(w.arbeiter_name||"").toLowerCase()===name.toLowerCase()).reduce((s,w)=>s+Number(w.gehalt||0),0);
            const orders=state.workers.filter(w=>String(w.arbeiter_name||"").toLowerCase()===name.toLowerCase()).length;
            const open=Math.max(0,salaries-withdrawals);
            return `<tr><td>${esc(name)}<br><small>${esc(e.role||"")} · ${esc(e.rang||"")}</small></td><td>${orders}</td><td>${money(salaries)}</td><td>${money(deposits)}</td><td>${money(withdrawals)}</td><td>${money(open)}</td><td>${esc(e.notes)}</td></tr>`;
        }).join(""):`<tr class="empty-row"><td colspan="7">Keine Mitarbeiter gefunden.</td></tr>`;
        text("employeeCount",String(list.length));
        text("employeeSalaryTotal",money(state.workers.reduce((s,w)=>s+Number(w.gehalt||0),0)));
        text("employeeDepositTotal",money(state.bookings.filter(b=>String(b.art||"").toLowerCase()==="einzahlung").reduce((s,b)=>s+Number(b.betrag||0),0)));
        text("employeeWithdrawalTotal",money(state.bookings.filter(b=>String(b.art||"").toLowerCase()==="auszahlung").reduce((s,b)=>s+Number(b.betrag||0),0)));
        text("employeeOpenTotal",money(Math.max(0,workerSalaryTotal()-bookingExpense())));
    }

    /* ---------------- ORDER SETTLEMENTS ---------------- */
    let currentWorkerIndex = null;
    window.openOrderModal = function(){ if(!canManage()) return; state.currentWorkers=[]; renderWorkerList(); ["orderNumber","orderTotal","orderClanAmount","orderNote"].forEach(id=>{if($(id))$(id).value="";}); if($("orderDate"))$("orderDate").value=nowLocal(); if($("orderStatus"))$("orderStatus").value="Offen"; if($("orderCreatedBy")){$("orderCreatedBy").value=employeeName();$("orderCreatedBy").readOnly=true;} $("orderModal")?.classList.add("active"); updateOrderTotals(); };
    window.closeOrderModal = function(){ $("orderModal")?.classList.remove("active"); };
    window.addWorkerRow = function(){ if(!canManage())return; currentWorkerIndex=null; $("workerName").value=""; $("workerSalary").value=""; $("workerNote").value=""; $("workerModal")?.classList.add("active"); };
    window.closeWorkerModal = function(){ $("workerModal")?.classList.remove("active"); };
    window.saveWorker = function(){
        const name=value("workerName"), salary=num("workerSalary");
        if(!name || salary<0)return;
        const emp=state.employees.find(e=>employeeName(e).toLowerCase()===name.toLowerCase());
        const row={name,salary,note:value("workerNote"),employee_id:emp?.id||emp?.user_id||null};
        if(currentWorkerIndex===null)state.currentWorkers.push(row);else state.currentWorkers[currentWorkerIndex]=row;
        closeWorkerModal(); renderWorkerList(); updateOrderTotals();
    };
    window.removeOrderWorker = function(index){ state.currentWorkers.splice(index,1); renderWorkerList(); updateOrderTotals(); };
    function renderWorkerList(){
        const body=$("workerList"); if(!body)return;
        body.innerHTML=state.currentWorkers.length?state.currentWorkers.map((w,i)=>`<div class="worker-row" style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;margin-bottom:8px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:8px"><span>${esc(w.name)}<small style="display:block">${esc(w.note||"")}</small></span><strong>${money(w.salary)}</strong><button type="button" class="small-button danger" onclick="removeOrderWorker(${i})">Entfernen</button></div>`).join(""):`<div class="worker-empty">Noch keine Arbeiter hinzugefügt.</div>`;
        text("orderWorkerCount",String(state.currentWorkers.length));
        text("orderSalaryTotal",money(state.currentWorkers.reduce((s,w)=>s+Number(w.salary||0),0)));
    }
    function updateOrderTotals(){
        const remaining=num("orderTotal")-num("orderClanAmount")-state.currentWorkers.reduce((s,w)=>s+Number(w.salary||0),0);
        text("orderRemainingAmount",money(remaining));
        const warn=$("orderDistributionWarning"); if(warn)warn.textContent=remaining<0?"Die Verteilung überschreitet den Gesamtbetrag.":"Verteilung ist innerhalb des Gesamtbetrags.";
    }
    window.updateOrderTotals=updateOrderTotals;
    window.saveOrderSettlement=async function(){
        if(!canManage())return formError("Keine Berechtigung für Auftragsabrechnungen.","orderModal");
        const total=num("orderTotal"), clan=num("orderClanAmount"), salaries=state.currentWorkers.reduce((s,w)=>s+Number(w.salary||0),0);
        if(!value("orderNumber")||total<=0||clan<0||clan>total||total-clan-salaries<0)return formError("Bitte Auftragsnummer und gültige Verteilung prüfen.","orderModal");
        clearFormError("orderModal");
        const payload={auftragsnummer:value("orderNumber"),gesamtbetrag:total,clanbetrag:clan,gesamt_gehaelter:salaries,status:value("orderStatus")||"Offen",datum:value("orderDate")||nowLocal(),erstellt_von:state.user?.id||null,erstellt_von_name:employeeName(),notiz:value("orderNote")||null};
        const {data,error}=await db().from(TABLES.orders).insert(payload).select().single();
        if(error)return formError(error.message,"orderModal");
        if(state.currentWorkers.length){
            const rows=state.currentWorkers.map(w=>({auftragsabrechnung_id:data.id,arbeiter_name:w.name,gehalt:Number(w.salary||0),notiz:w.note||null}));
            const wr=await db().from(TABLES.workers).insert(rows);
            if(wr.error)return formError("Abrechnung gespeichert, aber Arbeiter konnten nicht gespeichert werden: "+wr.error.message,"orderModal");
        }
        state.orders.unshift(data);
        await writeLog("Auftragsabrechnung","Erstellt",payload.auftragsnummer,payload);
        await sendDiscordNotification({
            type: "Auftragsabrechnung",
            title: "📋 Neue Auftragsabrechnung",
            amount: payload.gesamtbetrag,
            from: payload.erstellt_von_name,
            to: "Clan-Kasse",
            purpose: payload.notiz || "Auftragsabrechnung",
            orderNumber: payload.auftragsnummer,
            status: payload.status,
            createdBy: payload.erstellt_von_name,
            date: payload.datum,
            description: `Clan: ${payload.clanbetrag} $ • Gehälter: ${payload.gesamt_gehaelter} $`
        });
        state.currentWorkers=[]; await loadAll(); window.closeOrderModal();
    };
    window.filterOrders = renderOrders;

    function renderOrders(){
        const body=$("orderTableBody"); if(!body)return;
        const q=value("orderSearch").toLowerCase(), status=value("orderStatusFilter"), date=value("orderDateFilter");
        const list=state.orders.filter(o=>{const hay=JSON.stringify(o).toLowerCase();return(!q||hay.includes(q))&&(!status||o.status===status)&&(!date||String(o.datum||"").startsWith(date));});
        body.innerHTML=list.length?list.map(o=>`<tr><td>${esc(o.auftragsnummer)}</td><td>${money(o.gesamtbetrag)}</td><td>${money(o.clanbetrag)}</td><td>${money(o.gesamt_gehaelter)}</td><td>${money(Number(o.gesamtbetrag||0)-Number(o.clanbetrag||0)-Number(o.gesamt_gehaelter||0))}</td><td>${esc(o.status)}</td><td>${esc(dateText(o.datum))}</td><td>${esc(o.erstellt_von_name)}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="8">Keine Auftragsabrechnungen vorhanden.</td></tr>`;
        text("orderCount",String(state.orders.length)); text("orderTotalSum",money(state.orders.reduce((s,o)=>s+Number(o.gesamtbetrag||0),0))); text("orderClanSum",money(state.orders.reduce((s,o)=>s+Number(o.clanbetrag||0),0))); text("orderSalarySum",money(state.orders.reduce((s,o)=>s+Number(o.gesamt_gehaelter||0),0))); text("orderOpenSum",money(openOrderTotal()));
    }

    /* ---------------- SAVINGS ---------------- */
    window.openSavingsModal=function(type="Einzahlung"){if(!canManage())return; clearFormError("savingsModal"); $("savingsType").value=type; $("savingsNumber").value=nextNumber("SP",state.savings); $("savingsAmount").value=""; $("savingsFrom").value=type==="Auszahlung"?"Sparkonto":"Clan-Kasse"; $("savingsTo").value=type==="Auszahlung"?employeeName():"Sparkonto"; $("savingsDate").value=nowLocal(); $("savingsPurpose").value=""; $("savingsNote").value=""; $("savingsModal")?.classList.add("active");};
    window.closeSavingsModal=function(){$("savingsModal")?.classList.remove("active");};
    window.saveSavingsTransaction=async function(){
        if(!canManage())return formError("Keine Berechtigung für das Sparkonto.","savingsModal");
        const amount=num("savingsAmount"), type=value("savingsType")||"Einzahlung";
        if(amount<=0)return formError("Bitte einen gültigen Betrag eingeben.","savingsModal");
        if(type==="Auszahlung"&&amount>savingsBalance())return formError("Die Auszahlung übersteigt das Sparkonto-Guthaben.","savingsModal");
        const payload={buchungsnummer:value("savingsNumber")||nextNumber("SP",state.savings),art:type,betrag:amount,zweck:value("savingsPurpose")||null,erstellt_von:state.user?.id||null,erstellt_von_name:employeeName(),user_id:state.user?.id||null,created_at:new Date().toISOString()};
        const {data,error}=await db().from(TABLES.savings).insert(payload).select().single();
        if(error)return formError(error.message,"savingsModal");
        state.savings.unshift(data);
        await writeLog("Sparkonto","Erstellt",payload.buchungsnummer,payload);
        await sendDiscordNotification({
            type: payload.art,
            title: payload.art === "Einzahlung" ? "🏦 Neue Sparkonto-Einzahlung" : "🏦 Neue Sparkonto-Auszahlung",
            amount: payload.betrag,
            from: payload.art === "Auszahlung" ? "Sparkonto" : "Clan-Kasse",
            to: payload.art === "Auszahlung" ? payload.erstellt_von_name : "Sparkonto",
            purpose: payload.zweck,
            status: "Gespeichert",
            createdBy: payload.erstellt_von_name,
            date: payload.created_at,
            description: payload.buchungsnummer
        });
        window.closeSavingsModal(); renderAll();
    };
    window.saveSavingsGoal=async function(){
        if(!canManage())return inlineStatus("Keine Berechtigung zum Ändern des Sparziels.");
        const goal=Math.max(0,num("savingsGoal")); state.savingsGoal=goal; localStorage.setItem("ehrenmarkt_savings_goal",String(goal));
        // Das Ziel wird zusätzlich im Protokoll gespeichert, sofern die Tabelle vorhanden ist.
        if(hasDB()) {
            await writeLog("Sparkonto","Sparziel",String(goal),{goal});
            await sendDiscordNotification({
                type: "Sparziel",
                title: "🎯 Sparziel gespeichert",
                amount: goal,
                from: "Sparkonto",
                to: "Sparziel",
                purpose: "Neues Sparziel",
                status: "Gespeichert",
                createdBy: employeeName(),
                date: new Date().toISOString(),
                description: `Neues Sparziel: ${money(goal)}`
            });
        }
        renderSavings();
    };
    function renderSavings(){
        const balance=savingsBalance();
        text("savingsBalance",money(balance)); text("savingsCurrent",money(balance)); text("savingsDeposits",money(state.savings.filter(s=>String(s.art||s.typ||"").toLowerCase()==="einzahlung"&&String(s.status||"").toLowerCase()!=="storniert").reduce((s,x)=>s+Number(x.betrag||0),0)));
        text("savingsWithdrawals",money(state.savings.filter(s=>String(s.art||s.typ||"").toLowerCase()==="auszahlung"&&String(s.status||"").toLowerCase()!=="storniert").reduce((s,x)=>s+Number(x.betrag||0),0)));
        text("savingsTransactionCount",String(state.savings.length)); text("savingsGoalDisplay",money(state.savingsGoal));
        if($("savingsGoal"))$("savingsGoal").value=state.savingsGoal||"";
        const percent=state.savingsGoal>0?Math.min(100,Math.max(0,balance/state.savingsGoal*100)):0;
        if($("savingsProgress"))$("savingsProgress").style.width=`${percent}%`;
        text("savingsProgressText",state.savingsGoal>0?`${percent.toFixed(1)} % erreicht`:"0 % erreicht");
        const body=$("savingsTableBody"); if(!body)return;
        body.innerHTML=state.savings.length?state.savings.map(s=>`<tr><td>${esc(s.buchungsnummer||"—")}</td><td>${esc(s.art||s.typ)}</td><td>${money(s.betrag)}</td><td>${esc(s.von||$("savingsFrom")?.value||"—")}</td><td>${esc(s.an||$("savingsTo")?.value||"—")}</td><td>${esc(s.zweck)}</td><td>${esc(dateText(s.datum||s.created_at))}</td><td>${esc(s.erstellt_von_name||s.erstellt_von)}</td><td>${esc(s.status||"Gespeichert")}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="9">Noch keine Sparkonto-Buchungen vorhanden.</td></tr>`;
    }

    /* ---------------- MONTHLY ---------------- */
    window.updateMonthlyBalance = updateMonthly;

    function updateMonthly(){
        const period=$("monthlyPeriod")?.value || new Date().toISOString().slice(0,7);
        const list=activeBookings().filter(b=>String(b.datum||"").slice(0,7)===period);
        const income=list.filter(b=>String(b.art||"").toLowerCase()==="einzahlung").reduce((s,b)=>s+Number(b.betrag||0),0);
        const expenses=list.filter(b=>String(b.art||"").toLowerCase()==="auszahlung").reduce((s,b)=>s+Number(b.betrag||0),0);
        text("monthlyIncome",money(income)); text("monthlyExpenses",money(expenses)); text("monthlyWages",money(state.orders.filter(o=>String(o.datum||"").slice(0,7)===period).reduce((s,o)=>s+Number(o.gesamt_gehaelter||0),0))); text("monthlyChange",money(income-expenses)); text("monthlyLabel",period); text("monthlyBookingCount",String(list.length));
    }

    /* ---------------- CASH CHECK ---------------- */
    window.openCashCheck=function(){if(!canManage())return; ["cashPortalInput","cashIngameInput","cashCheckNote"].forEach(id=>{if($(id))$(id).value="";}); if($("cashCheckDate"))$("cashCheckDate").value=nowLocal(); if($("cashCheckCreatedBy"))$("cashCheckCreatedBy").value=employeeName(); $("cashCheckModal")?.classList.add("active");};
    window.closeCashCheck=function(){$("cashCheckModal")?.classList.remove("active");};
    function cashDifference(){return num("cashPortalInput")-num("cashIngameInput");}
    function renderCashDifference(){const d=cashDifference();text("cashDifference",(d>=0?"+":"")+money(d));return d;}
    window.updateCashDifference=renderCashDifference;
    window.saveCashCheck=async function(){
        if(!canManage())return formError("Keine Berechtigung für den Kassenabgleich.","cashCheckModal");
        const portal=num("cashPortalInput"), ingame=num("cashIngameInput"), diff=portal-ingame;
        if(portal<0||ingame<0)return formError("Kassenstände dürfen nicht negativ sein.","cashCheckModal");
        const payload={buchungsnummer:nextNumber("KA",state.cashChecks),portalstand:portal,ingame_stand:ingame,abweichung:diff,notiz:value("cashCheckNote")||null,erstellt_von:employeeName(),erstellt_von_name:employeeName(),user_id:state.user?.id||null,created_at:new Date().toISOString()};
        const {data,error}=await db().from(TABLES.cash).insert(payload).select().single();
        if(error)return formError(error.message,"cashCheckModal");
        state.cashChecks.unshift(data);
        await writeLog("Kassenabgleich","Erstellt",payload.buchungsnummer,payload);
        await sendDiscordNotification({
            type: "Kassenabgleich",
            title: "💼 Neuer Kassenabgleich",
            amount: payload.abweichung,
            from: "Portal-Kasse",
            to: "Ingame-Kasse",
            purpose: payload.notiz || "Kassenabgleich",
            status: "Erfasst",
            createdBy: payload.erstellt_von_name,
            date: payload.created_at,
            description: payload.buchungsnummer
        });
        closeCashCheck(); renderAll();
    };
    function renderCashChecks(){
        const latest=state.cashChecks[0];
        text("cashPortalBalance",money(latest?.portalstand||0)); text("cashIngameBalance",money(latest?.ingame_stand||0)); text("cashDifference",(Number(latest?.abweichung||0)>=0?"+":"")+money(latest?.abweichung||0));
        const body=$("cashcheckTableBody"); if(!body)return;
        body.innerHTML=state.cashChecks.length?state.cashChecks.map(c=>`<tr><td>${esc(c.buchungsnummer)}</td><td>${money(c.portalstand)}</td><td>${money(c.ingame_stand)}</td><td>${money(c.abweichung)}</td><td>${esc(dateText(c.datum||c.created_at))}</td><td>${esc(c.erstellt_von_name||c.erstellt_von)}</td><td>${esc(c.notiz)}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="7">Noch keine Kassenabgleiche vorhanden.</td></tr>`;
    }

    /* ---------------- CONTROL ---------------- */
    window.runFinancialControl=function(){
        const warnings=[];
        if(clanBalance()<0)warnings.push("Der erfasste Clanstand ist negativ.");
        if(savingsBalance()<0)warnings.push("Das Sparkonto weist einen negativen Bestand auf.");
        state.orders.forEach(o=>{const rest=Number(o.gesamtbetrag||0)-Number(o.clanbetrag||0)-Number(o.gesamt_gehaelter||0);if(rest<0)warnings.push(`Auftrag ${o.auftragsnummer||"—"} ist überverteilt.`);});
        const list=$("warningList"); if(list)list.innerHTML=warnings.length?warnings.map(w=>`<div class="warning-item"><strong>${esc(w)}</strong></div>`).join(""):`<div class="no-warning"><span class="warning-check">✓</span><div><strong>Keine Warnungen</strong><p>Aktuell wurden keine auffälligen Buchungen gefunden.</p></div></div>`;
        const last=$("lastControlDate"); if(last)last.textContent=new Date().toLocaleString("de-DE");
        setControl("controlCash",warnings.some(w=>w.toLowerCase().includes("clanstand")),"Kassenstand");
        setControl("controlOrders",warnings.some(w=>w.toLowerCase().includes("auftrag")),"Auftragsabrechnungen");
        setControl("controlPayouts",clanBalance()<0,"Auszahlungen");
        setControl("controlSavings",savingsBalance()<0,"Sparkonto");
        setControl("controlData",false,"Datensätze");
        setControl("controlRights",!canManage(),"Berechtigungen");
    };
    function setControl(id,bad,label){const el=$(id);if(!el)return;const strong=el.querySelector("strong:last-child");if(strong)strong.textContent=bad?`${label}: Prüfung nötig`:`${label}: OK`;}

    /* ---------------- LOG ---------------- */
    async function writeLog(area,action,reference,details={}){
        if(!hasDB())return;
        const payload={bereich:area,aktion:action,referenz:reference||null,details:details||{},erstellt_von:employeeName(),erstellt_von_name:employeeName(),user_id:state.user?.id||null,created_at:new Date().toISOString()};
        const {data,error}=await db().from(TABLES.logs).insert(payload).select().single();
        if(!error&&data)state.logs.unshift(data);
    }
    window.filterLogs=renderLogs;
    function renderLogs(){
        const q=value("logSearch").toLowerCase(), type=value("logTypeFilter"), period=value("logPeriodFilter")||"all", now=new Date();
        const list=state.logs.filter(l=>{const d=new Date(l.created_at||l.datum||0);const hay=JSON.stringify(l).toLowerCase();let okPeriod=true;if(period==="day")okPeriod=d.toDateString()===now.toDateString();if(period==="month")okPeriod=d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();if(period==="year")okPeriod=d.getFullYear()===now.getFullYear();return(!q||hay.includes(q))&&(!type||String(l.aktion||"").includes(type))&&okPeriod;});
        const body=$("logTableBody");if(body)body.innerHTML=list.length?list.map(l=>`<tr onclick="openLogDetail('${esc(l.id||"")}')"><td>${esc(dateText(l.created_at||l.datum))}</td><td>${esc(l.aktion)}</td><td>${esc(l.bereich)}</td><td>${esc(l.referenz||"")}</td><td>${esc(l.erstellt_von_name||l.erstellt_von)}</td><td>${esc(l.status||"Erfasst")}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="6">Noch keine Aktivitäten vorhanden.</td></tr>`;
        text("logCount",String(state.logs.length)); text("logToday",String(state.logs.filter(l=>new Date(l.created_at||l.datum||0).toDateString()===now.toDateString()).length)); text("logChanges",String(state.logs.filter(l=>String(l.aktion||"").toLowerCase().includes("geändert")).length)); text("logCancellations",String(state.logs.filter(l=>String(l.aktion||"").toLowerCase().includes("storniert")).length));
    }
    window.openLogDetail=function(id){const row=state.logs.find(l=>String(l.id)===String(id));if(!row)return;const box=$("logDetailContent");if(box)box.innerHTML=`<div class="log-detail-row"><span>Datum</span><strong>${esc(dateText(row.created_at||row.datum))}</strong></div><div class="log-detail-row"><span>Bereich</span><strong>${esc(row.bereich)}</strong></div><div class="log-detail-row"><span>Aktion</span><strong>${esc(row.aktion)}</strong></div><div class="log-detail-row"><span>Referenz</span><strong>${esc(row.referenz)}</strong></div><div class="log-detail-row"><span>Erstellt von</span><strong>${esc(row.erstellt_von_name||row.erstellt_von)}</strong></div><pre style="white-space:pre-wrap">${esc(JSON.stringify(row.details||{},null,2))}</pre>`;$("logDetailModal")?.classList.add("active");};
    window.closeLogDetail=function(){$("logDetailModal")?.classList.remove("active");};

    /* ---------------- RIGHTS ---------------- */
    function renderRights(){
        // Die Rechte-Sektion ist statisch im HTML; hier werden keine fremden Rollen verändert.
    }

    /* ---------------- MODALS / KEYS ---------------- */
    window.addEventListener("keydown", e=>{if(e.key!=="Escape")return;document.querySelectorAll(".finance-modal.active").forEach(m=>m.classList.remove("active"));});
    document.addEventListener("click", e=>{if(e.target.classList.contains("finance-modal"))e.target.classList.remove("active");});
    ["orderTotal","orderClanAmount"].forEach(id=>$(id)?.addEventListener("input",updateOrderTotals));
    $("bookingType")?.addEventListener("change",applyBookingEndpoints);
    $("monthlyPeriod")?.addEventListener("change",updateMonthly);
    ["cashPortalInput","cashIngameInput"].forEach(id=>$(id)?.addEventListener("input",renderCashDifference));

    /* ---------------- INITIALISIERUNG ---------------- */
    document.addEventListener("DOMContentLoaded", async () => {
        if($("monthlyPeriod") && !$("monthlyPeriod").value) $("monthlyPeriod").value=new Date().toISOString().slice(0,7);
        populateRecipientSelect();
        clearBookingForm();
        // Mitarbeiter und Benutzer werden unabhängig von den Buchhaltungstabellen geladen.
        try { await loadAll(); }
        catch(e) { console.error("Buchhaltung konnte nicht initialisiert werden",e); inlineStatus("Die Buchhaltung konnte nicht vollständig geladen werden. Prüfe die Supabase-Verbindung und die Buchhaltungstabellen."); }
        if(!state.employees.length) {
            // Kein Popup; nur Konsole. employees wird nicht verändert.
            console.warn("Keine Mitarbeiter aus employees geladen.");
        }
    });

    // Für Seiten, die das Script erst nach DOMContentLoaded laden.
    if(document.readyState !== "loading") {
        setTimeout(()=>document.dispatchEvent(new Event("DOMContentLoaded")),0);
    }

})();
