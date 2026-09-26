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

    function employeeName(emp = state.employee) {
        return String(emp?.name || emp?.username || emp?.minecraft_name || state.user?.user_metadata?.minecraft_name || state.user?.user_metadata?.username || state.user?.email || "Unbekannt").trim();
    }

    function normalizePersonName(value) { return String(value || "").trim().toLowerCase(); }

    function rank() {
        return String(state.employee?.rang || "").trim().toLowerCase();
    }

    function isManagement() {
        const r = rank();
        return ["leitung", "stadtleitung"].includes(r);
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
        populateWorkerSelect();
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
    function isOrderPaid(order) {
        return String(order?.status || "").trim().toLowerCase() === "bezahlt";
    }
    function openOrderTotal() {
        return state.orders
            .filter(o => !isOrderPaid(o) && String(o.status||"").trim().toLowerCase() !== "storniert")
            .reduce((s,o) => s + Math.max(0, Number(o.gesamtbetrag||0) - Number(o.clanbetrag||0) - Number(o.gesamt_gehaelter||0)), 0);
    }
    function clanBalance() { return bookingIncome() - bookingExpense(); }

    function orderClanRevenue() {
        const bookedOrderNumbers = new Set(
            state.bookings
                .filter(b => String(b.kategorie || "").toLowerCase() === "auftragsabrechnung")
                .map(b => String(b.auftragsnummer || "").trim())
                .filter(Boolean)
        );
        return state.orders.reduce((sum, o) => {
            const status = String(o.status || "").toLowerCase();
            const orderNumber = String(o.auftragsnummer || "").trim();
            if (status === "bezahlt" && orderNumber && !bookedOrderNumbers.has(orderNumber)) {
                return sum + Number(o.clanbetrag || 0);
            }
            return sum;
        }, 0);
    }

    function totalRevenueAmount() {
        return bookingIncome() + orderClanRevenue();
    }

    function renderOverview() {
        const revenue = totalRevenueAmount();
        text("currentClanBalance", money(clanBalance() + savingsBalance() + orderClanRevenue()));
        text("totalRevenue", money(revenue));
        text("totalDeposits", money(bookingIncome()));
        text("totalWithdrawals", money(bookingExpense()));
        text("totalWorkerSalaries", money(workerSalaryTotal()));
        text("totalClanExpenses", money(state.bookings.filter(b=>String(b.kategorie||"").toLowerCase()==="clan-ausgabe" && String(b.art||"").toLowerCase()==="auszahlung").reduce((s,b)=>s+Number(b.betrag||0),0)));
        text("totalSavings", money(savingsBalance()));
        text("totalOpenAmounts", money(openOrderTotal()));
        text("totalBookings", String(state.bookings.length));
        text("totalAssets", money(totalRevenueAmount() + state.savings.filter(s=>String(s.art||s.typ||"").toLowerCase()==="einzahlung").reduce((sum,s)=>sum+Number(s.betrag||0),0) + workerSalaryTotal()));
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

    /* ---------------- DISCORD-BENACHRICHTIGUNG ---------------- */
    async function sendDiscordNotification(payload) {
        if (!hasDB()) return false;

        try {
            const { data, error } = await db().functions.invoke(
                "buchhaltung-discord",
                { body: payload }
            );

            if (error) {
                console.error("Discord-Benachrichtigung:", error);
                return false;
            }

            if (data?.error) {
                console.error("Discord-Benachrichtigung:", data.error);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Discord-Benachrichtigung:", error);
            return false;
        }
    }

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
            orderNumber: payload.auftragsnummer,
            category: payload.kategorie,
            status: payload.status,
            createdBy: payload.erstellt_von_name,
            note: payload.notiz,
            date: payload.datum
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
        const orderById=new Map(state.orders.map(o=>[String(o.id),o]));
        if(body) body.innerHTML=list.length?list.map(e=>{
            const name=employeeName(e);
            const deposits=state.bookings.filter(b=>b.von===name && String(b.art||"").toLowerCase()==="einzahlung").reduce((s,b)=>s+Number(b.betrag||0),0);
            const withdrawals=state.bookings.filter(b=>b.an===name && String(b.art||"").toLowerCase()==="auszahlung").reduce((s,b)=>s+Number(b.betrag||0),0);
            const employeeId=String(e.id||e.user_id||"");
            const employeeWorkers=state.workers.filter(w=>{
                const wid=String(w.employee_id||"");
                const wname=normalizePersonName(w.name||w.arbeiter_name||"");
                return (employeeId && wid===employeeId) || (!wid && wname===normalizePersonName(name)) || (wname===normalizePersonName(name));
            });
            const salaries=employeeWorkers.reduce((s,w)=>s+Number(w.gehalt||0),0);
            const paidSalaries=employeeWorkers.filter(w=>isOrderPaid(orderById.get(String(w.auftragsabrechnung_id)))).reduce((s,w)=>s+Number(w.gehalt||0),0);
            const openSalaries=Math.max(0,salaries-paidSalaries);
            const orders=new Set(employeeWorkers.map(w=>String(w.auftragsabrechnung_id||w.auftragsnummer||w.order_id||""))).size;
            return `<tr><td>${esc(name)}<br><small>${esc(e.role||"")} · ${esc(e.rang||"")}</small></td><td>${orders}</td><td>${money(salaries)}</td><td>${money(deposits)}</td><td>${money(paidSalaries)}</td><td>${money(openSalaries)}</td><td>${esc(e.notes)}</td></tr>`;
        }).join(""):`<tr class="empty-row"><td colspan="7">Keine Mitarbeiter gefunden.</td></tr>`;
        text("employeeCount",String(list.length));
        text("employeeSalaryTotal",money(state.workers.reduce((s,w)=>s+Number(w.gehalt||0),0)));
        text("employeeDepositTotal",money(state.bookings.filter(b=>String(b.art||"").toLowerCase()==="einzahlung").reduce((s,b)=>s+Number(b.betrag||0),0)));
        text("employeeWithdrawalTotal",money(state.workers.filter(w=>isOrderPaid(orderById.get(String(w.auftragsabrechnung_id)))).reduce((s,w)=>s+Number(w.gehalt||0),0)));
        text("employeeOpenTotal",money(state.workers.filter(w=>!isOrderPaid(orderById.get(String(w.auftragsabrechnung_id)))).reduce((s,w)=>s+Number(w.gehalt||0),0)));
    }

    /* ---------------- ORDER SETTLEMENTS ---------------- */
    let currentWorkerIndex = null;
    window.openOrderModal = function(){ if(!canManage()) return; state.currentWorkers=[]; renderWorkerList(); ["orderNumber","orderTitle","orderTotal","orderClanAmount","orderNote"].forEach(id=>{if($(id))$(id).value="";}); if($("orderDate"))$("orderDate").value=nowLocal(); if($("orderStatus"))$("orderStatus").value="Bezahlt"; if($("orderCreatedBy")){$("orderCreatedBy").value=employeeName();$("orderCreatedBy").readOnly=true;} $("orderModal")?.classList.add("active"); updateOrderTotals(); };
    window.closeOrderModal = function(){ $("orderModal")?.classList.remove("active"); };
    function populateWorkerSelect(){
        const old=$("workerName");
        if(!old)return;
        let select=old;
        if(old.tagName!=="SELECT"){
            select=document.createElement("select");
            select.id="workerName";
            select.className=old.className;
            select.required=old.required;
            old.replaceWith(select);
        }
        const current=select.value;
        select.innerHTML=`<option value="">Mitarbeiter auswählen</option>`+state.employees
            .map(e=>({name:employeeName(e),id:e.id||e.user_id||""}))
            .filter((e,i,a)=>e.name && a.findIndex(x=>x.name.toLowerCase()===e.name.toLowerCase())===i)
            .sort((a,b)=>a.name.localeCompare(b.name,"de"))
            .map(e=>`<option value="${esc(e.name)}">${esc(e.name)}</option>`)
            .join("");
        if(current && [...select.options].some(o=>o.value===current)) select.value=current;
    }
    window.addWorkerRow = function(){ if(!canManage())return; populateWorkerSelect(); currentWorkerIndex=null; $("workerName").value=""; $("workerSalary").value=""; $("workerNote").value=""; $("workerModal")?.classList.add("active"); };
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
        const payload={auftragsnummer:value("orderNumber"),auftragstitel:value("orderTitle")||null,gesamtbetrag:total,clanbetrag:clan,gesamt_gehaelter:salaries,status:"Bezahlt",datum:new Date().toISOString(),erstellt_von:state.user?.id||null,erstellt_von_name:employeeName(),notiz:null};
        const {data,error}=await db().from(TABLES.orders).insert(payload).select().single();
        if(error)return formError(error.message,"orderModal");
        if(state.currentWorkers.length){
            const rows=state.currentWorkers.map(w=>({auftragsabrechnung_id:data.id,name:w.name,gehalt:Number(w.salary||0),notiz:w.note||null,employee_id:w.employee_id||null}));
            const wr=await db().from(TABLES.workers).insert(rows);
            if(wr.error)return formError("Abrechnung gespeichert, aber Arbeiter konnten nicht gespeichert werden: "+wr.error.message,"orderModal");
        }

        /* Clan-Anteil als echte Einzahlung in die Clan-Kasse erfassen. */
        if(clan > 0 && String(payload.status).toLowerCase() === "bezahlt"){
            const existing = await db().from(TABLES.bookings)
                .select("id")
                .eq("auftragsnummer", payload.auftragsnummer)
                .eq("kategorie", "Auftragsabrechnung")
                .limit(1);

            if(!existing.error && !(existing.data || []).length){
                const clanBooking={
                    buchungsnummer:nextNumber("BK",state.bookings),
                    art:"Einzahlung",
                    betrag:clan,
                    von:employeeName(),
                    an:"Clan-Kasse",
                    zweck:`Clan-Anteil aus Auftragsabrechnung ${payload.auftragsnummer}`,
                    kategorie:"Auftragsabrechnung",
                    auftragsnummer:payload.auftragsnummer,
                    zahlungsart:"Ingame-Bargeld",
                    datum:payload.datum,
                    erstellt_von:state.user?.id||null,
                    erstellt_von_name:employeeName(),
                    status:"Bezahlt",
                    notiz:payload.notiz||null
                };
                const clanResult=await db().from(TABLES.bookings).insert(clanBooking).select().single();
                if(!clanResult.error && clanResult.data){
                    state.bookings.unshift(clanResult.data);
                    await writeLog("Buchung","Auftragsabrechnung Clan-Anteil",clanBooking.buchungsnummer,clanBooking);
                    await sendDiscordNotification({
                        type:"Einzahlung",
                        title:"💰 Clan-Anteil aus Auftragsabrechnung",
                        amount:clanBooking.betrag,
                        from:clanBooking.von,
                        to:clanBooking.an,
                        purpose:clanBooking.zweck,
                        orderNumber:clanBooking.auftragsnummer,
                        category:clanBooking.kategorie,
                        status:clanBooking.status,
                        createdBy:clanBooking.erstellt_von_name,
                        note:clanBooking.notiz,
                        date:clanBooking.datum
                    });
                }else if(clanResult.error){
                    console.error("Clan-Anteil konnte nicht als Buchung gespeichert werden:",clanResult.error);
                }
            }
        }

        state.orders.unshift(data); state.currentWorkers=[]; await loadAll(); window.closeOrderModal();
    };
    window.filterOrders = renderOrders;

    function renderOrders(){
        const body=$("orderTableBody"); if(!body)return;
        const q=value("orderSearch").toLowerCase(), status=value("orderStatusFilter"), date=value("orderDateFilter");
        const list=state.orders.filter(o=>{const hay=JSON.stringify(o).toLowerCase();return(!q||hay.includes(q))&&(!status||o.status===status)&&(!date||String(o.datum||"").startsWith(date));});
        body.innerHTML=list.length?list.map(o=>`<tr><td>${esc(o.auftragsnummer)}</td><td>${esc(o.auftragstitel||"—")}</td><td>${money(o.gesamtbetrag)}</td><td>${money(o.clanbetrag)}</td><td>${money(o.gesamt_gehaelter)}</td><td>${money(Number(o.gesamtbetrag||0)-Number(o.clanbetrag||0)-Number(o.gesamt_gehaelter||0))}</td><td>${esc(o.status)}</td><td>${esc(dateText(o.datum))}</td><td>${esc(o.erstellt_von_name)}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="8">Keine Auftragsabrechnungen vorhanden.</td></tr>`;
        text("orderCount",String(state.orders.length)); text("orderTotalSum",money(state.orders.reduce((s,o)=>s+Number(o.gesamtbetrag||0),0))); text("orderClanSum",money(state.orders.reduce((s,o)=>s+Number(o.clanbetrag||0),0))); text("orderSalarySum",money(state.orders.reduce((s,o)=>s+Number(o.gesamt_gehaelter||0),0))); text("orderOpenSum",money(openOrderTotal()));
    }

    /* ---------------- SAVINGS ---------------- */
    window.openSavingsModal=function(type="Einzahlung"){if(!canManage())return; clearFormError("savingsModal"); $("savingsType").value=type; $("savingsNumber").value=nextNumber("SP",state.savings); $("savingsAmount").value=""; $("savingsFrom").value=employeeName(); $("savingsTo").value="Sparkonto"; $("savingsDate").value=nowLocal(); $("savingsPurpose").value=""; $("savingsNote").value=""; $("savingsModal")?.classList.add("active");};
    window.closeSavingsModal=function(){$("savingsModal")?.classList.remove("active");};
    window.saveSavingsTransaction=async function(){
        if(!canManage())return formError("Keine Berechtigung für das Sparkonto.","savingsModal");
        const amount=num("savingsAmount"), type=value("savingsType")||"Einzahlung";
        if(amount<=0)return formError("Bitte einen gültigen Betrag eingeben.","savingsModal");
        if(type==="Auszahlung"&&amount>savingsBalance())return formError("Die Auszahlung übersteigt das Sparkonto-Guthaben.","savingsModal");
        const savingsFrom = employeeName();
        const savingsTo = "Sparkonto";
        const payload={buchungsnummer:value("savingsNumber")||nextNumber("SP",state.savings),art:type,betrag:amount,zweck:value("savingsPurpose")||null,erstellt_von:state.user?.id||null,erstellt_von_name:employeeName(),created_at:new Date().toISOString()};
        const {data,error}=await db().from(TABLES.savings).insert(payload).select().single();
        if(error)return formError(error.message,"savingsModal");
        state.savings.unshift(data);
        await writeLog("Sparkonto","Erstellt",payload.buchungsnummer,{...payload,von:savingsFrom,an:savingsTo});

        await sendDiscordNotification({
            type: "Sparkonto",
            title: type === "Einzahlung" ? "🏦 Neue Sparkonto-Einzahlung" : "🏦 Neue Sparkonto-Auszahlung",
            amount: payload.betrag,
            from: savingsFrom,
            to: savingsTo,
            purpose: payload.zweck,
            orderNumber: "",
            category: "Sparkonto",
            status: "Erstellt",
            createdBy: payload.erstellt_von_name,
            note: null,
            date: payload.created_at
        });

        window.closeSavingsModal();
        renderAll();
    };
    window.saveSavingsGoal=async function(){
        if(!canManage())return inlineStatus("Keine Berechtigung zum Ändern des Sparziels.");
        const goal=Math.max(0,num("savingsGoal")); state.savingsGoal=goal; localStorage.setItem("ehrenmarkt_savings_goal",String(goal));
        // Das Ziel wird zusätzlich im Protokoll gespeichert, sofern die Tabelle vorhanden ist.
        if(hasDB()) await writeLog("Sparkonto","Sparziel",String(goal),{goal});
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
        body.innerHTML=state.savings.length?state.savings.map(s=>`<tr><td>${esc(s.buchungsnummer||"—")}</td><td>${esc(s.art||s.typ)}</td><td>${money(s.betrag)}</td><td>${esc(s.erstellt_von_name || s.von || "—")}</td><td>${esc(s.an || "Sparkonto")}</td><td>${esc(s.zweck)}</td><td>${esc(dateText(s.datum||s.created_at))}</td><td>${esc(s.erstellt_von_name||s.erstellt_von)}</td><td>${esc(s.status||"Gespeichert")}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="9">Noch keine Sparkonto-Buchungen vorhanden.</td></tr>`;
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
        state.cashChecks.unshift(data); await writeLog("Kassenabgleich","Erstellt",payload.buchungsnummer,payload); closeCashCheck(); renderAll();
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


/* =========================================================
   EHRENMARKT – CLANBUCHHALTUNG V1.0 ERWEITERUNG
   Auf Basis der bestehenden vollständigen Buchhaltung.
========================================================= */
(() => {
  "use strict";
  const db=()=>window.supabaseClient||window.supabase||null;
  const T={donations:"buchhaltung_spenden",payouts:"buchhaltung_auszahlungen",loans:"buchhaltung_darlehen",rates:"buchhaltung_darlehen_raten",warnings:"buchhaltung_darlehen_mahnungen"};
  const V1={donations:[],payouts:[],loans:[],rates:[],warnings:[]};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const money=n=>`${Number(n||0).toLocaleString("de-DE",{maximumFractionDigits:2})} $`;
  const now=()=>new Date().toISOString();
  const userName=()=>String(window.__clanbuchhaltungV1Employee?.name||window.__clanbuchhaltungV1Employee?.username||window.__clanbuchhaltungV1Employee?.minecraft_name||window.__clanbuchhaltungV1User?.user_metadata?.minecraft_name||window.__clanbuchhaltungV1User?.email||"Unbekannt").trim();
  const rank=()=>String(window.__clanbuchhaltungV1Employee?.rang||"").toLowerCase().trim();
  const isLeitung=()=>["leitung","stadtleitung"].includes(rank());
  const isStadtleitung=()=>rank()==="stadtleitung";
  const employees=()=>Array.isArray(window.__clanbuchhaltungV1Employees)?window.__clanbuchhaltungV1Employees:[];
  const status=(msg,ok=false)=>{let b=$("v1Status");if(!b){b=document.createElement("div");b.id="v1Status";b.className="v1-inline-status";document.querySelector("main")?.prepend(b)}b.textContent=msg;b.style.color=ok?"#8ee6a8":"#d8d1bd";b.hidden=false;setTimeout(()=>{b.hidden=true},5000)};
  const confirmBox=message=>new Promise(resolve=>{
    let m=$("v1ConfirmModal");
    if(!m){m=document.createElement("div");m.id="v1ConfirmModal";m.className="finance-modal";m.innerHTML=`<div class="modal-box"><div class="modal-header"><div><span class="modal-kicker">ENDGÜLTIGE BUCHUNG</span><h2>Wirklich speichern?</h2></div><button class="modal-close" id="v1ConfirmNo">×</button></div><div class="modal-warning" id="v1ConfirmText"></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button class="secondary-button" id="v1ConfirmNo2">Abbrechen</button><button class="gold-button" id="v1ConfirmYes">Endgültig buchen</button></div></div>`;document.body.appendChild(m)}
    $("v1ConfirmText").textContent=message; m.classList.add("active");
    const close=v=>{m.classList.remove("active");$("v1ConfirmYes").onclick=null;$("v1ConfirmNo").onclick=null;$("v1ConfirmNo2").onclick=null;resolve(v)};
    $("v1ConfirmYes").onclick=()=>close(true);$("v1ConfirmNo").onclick=()=>close(false);$("v1ConfirmNo2").onclick=()=>close(false);
  });
  async function q(table,order="created_at"){if(!db())return[];let x=db().from(table).select("*");if(order)x=x.order(order,{ascending:false});const r=await x;if(r.error){console.warn("V1 Tabelle nicht geladen",table,r.error.message);return[]}return r.data||[]}
  async function insert(table,payload){if(!db())throw Error("Supabase ist nicht verbunden.");const r=await db().from(table).insert(payload).select().single();if(r.error)throw r.error;return r.data}
  async function insertBooking(p){return insert("buchhaltung_buchungen",p)}
  async function log(area,action,ref,details={}){if(!db())return;try{await db().from("buchhaltung_protokoll").insert({bereich:area,aktion:action,referenz:ref||null,details,erstellt_von:userName(),erstellt_von_name:userName(),user_id:window.__clanbuchhaltungV1User?.id||null,created_at:now()})}catch(e){console.warn("Protokoll",e)}}
  async function discord(fn,payload){if(!db())return;try{await db().functions.invoke(fn,{body:payload})}catch(e){console.warn("Discord",fn,e)}}
  function bookingRows(){return Array.isArray(window.__clanbuchhaltungV1Bookings)?window.__clanbuchhaltungV1Bookings:[]}
  function employeesForUI(){const arr=employees();return arr.map(e=>({id:e.id||e.user_id,name:e.name||e.username||e.minecraft_name||e.user_id})).filter(x=>x.name)}
  function fillSelect(id,arr,placeholder="Auswählen") {const s=$(id);if(!s)return;const cur=s.value;s.innerHTML=`<option value="">${esc(placeholder)}</option>`+arr.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");if([...s.options].some(o=>o.value===cur))s.value=cur}
  function selectedEmployee(id){return employees().find(e=>String(e.id||e.user_id)===String(id))}
  function activeLoanFor(memberId){return V1.loans.find(l=>String(l.mitglied_id)===String(memberId)&&String(l.status).toLowerCase()==="aktiv")}
  function loanTotal(l){return Number(l.gesamtbetrag||0)}
  function loanPaid(l){return V1.rates.filter(r=>String(r.darlehen_id)===String(l.id)&&String(r.status).toLowerCase()==="bezahlt").reduce((s,r)=>s+Number(r.betrag||0),0)}
  function loanOpen(l){return Math.max(0,loanTotal(l)-loanPaid(l))}
  function loanWarnings(l){return V1.warnings.filter(w=>String(w.darlehen_id)===String(l.id)).length}
  function nextRate(l){return V1.rates.filter(r=>String(r.darlehen_id)===String(l.id)&&String(r.status).toLowerCase()!=="bezahlt").sort((a,b)=>new Date(a.faellig_am||0)-new Date(b.faellig_am||0))[0]}
  function v1IncomeRows(){
    const b=bookingRows().filter(x=>String(x.status||"").toLowerCase()!=="storniert");
    return b.filter(x=>String(x.art||"").toLowerCase()==="einzahlung").map(x=>({date:x.datum||x.created_at,type:x.kategorie||"Einnahme",amount:Number(x.betrag||0),from:x.von||"—",to:x.an||"Clan-Kasse",purpose:x.zweck||"—",by:x.erstellt_von_name||x.erstellt_von||"—",order:x.auftragsnummer||""}));
  }
  function v1PayoutRows(){
    const b=bookingRows().filter(x=>String(x.status||"").toLowerCase()!=="storniert");
    return b.filter(x=>String(x.art||"").toLowerCase()==="auszahlung").map(x=>({date:x.datum||x.created_at,type:x.kategorie||"Auszahlung",amount:Number(x.betrag||0),from:x.von||"Clan-Kasse",to:x.an||"—",purpose:x.zweck||"—",by:x.erstellt_von_name||x.erstellt_von||"—",order:x.auftragsnummer||""}));
  }
  function wealth(){
    // Bereits gebuchte Darlehensraten enthalten die Zahlung inklusive Zinsanteil.
    // Deshalb wird der Zins hier nicht ein zweites Mal addiert. Mahngebühren sind
    // eigene Einnahmen und werden separat berücksichtigt.
    const b=v1IncomeRows();
    return b.reduce((s,x)=>s+x.amount,0)+V1.warnings.filter(w=>String(w.status||"").toLowerCase()==="bezahlt").reduce((s,w)=>s+Number(w.gebuehr||0),0);
  }
  function available(){return v1IncomeRows().reduce((s,x)=>s+x.amount,0)-v1PayoutRows().reduce((s,x)=>s+x.amount,0)-V1.loans.filter(l=>String(l.status).toLowerCase()==="aktiv").reduce((s,l)=>s+Number(l.auszahlungsbetrag||0),0)}
  function formatDate(v){return v?new Date(v).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"}):"—"}

  async function loadV1(){
    if(!db())return;
    try{
      const [d,p,l,r,w]=await Promise.all([q(T.donations),q(T.payouts),q(T.loans,"created_at"),q(T.rates,"created_at"),q(T.warnings,"created_at")]);
      V1.donations=d;V1.payouts=p;V1.loans=l;V1.rates=r;V1.warnings=w;
      const u=await db().auth.getUser();window.__clanbuchhaltungV1User=u.data?.user||null;
      if(window.__clanbuchhaltungV1User){const e=await db().from("employees").select("*").eq("user_id",window.__clanbuchhaltungV1User.id).maybeSingle();window.__clanbuchhaltungV1Employee=e.data||null}
      window.__clanbuchhaltungV1Employees=await q("employees","created_at");
      // expose existing arrays from the baseline JS when possible
      if(typeof state !== "undefined"){}
    }catch(e){console.warn("V1 konnte nicht vollständig geladen werden",e)}
  }

  function renderEmployees(){
    const arr=employeesForUI();fillSelect("v1SalaryEmployee",arr,"Mitarbeiter auswählen");fillSelect("v1LoanMember",arr,"Mitglied auswählen");
    const loanSel=$("v1RepaymentLoan");if(loanSel){const cur=loanSel.value;loanSel.innerHTML='<option value="">Darlehen auswählen</option>'+V1.loans.filter(l=>String(l.status).toLowerCase()==="aktiv").map(l=>`<option value="${esc(l.id)}">${esc(selectedEmployee(l.mitglied_id)?.name||l.mitglied_name||"Mitglied")} · ${money(loanOpen(l))} offen</option>`).join("");if([...loanSel.options].some(o=>o.value===cur))loanSel.value=cur;}
  }
  function renderLoanInfo(){const l=V1.loans.find(x=>String(x.id)===$("v1RepaymentLoan")?.value);const r=l&&nextRate(l);const el=$("v1RepaymentInfo");if(el)el.textContent=l?(r?`Fällige Rate: ${money(r.betrag)} · Fällig: ${formatDate(r.faellig_am)} · Rest: ${money(loanOpen(l))}`:`Restbetrag: ${money(loanOpen(l))}`):"Wähle ein Darlehen. Der fällige Betrag wird automatisch vorgegeben."}
  async function processOverdueLoans(){
    if(!db())return;
    const nowTs=Date.now();
    for(const loan of V1.loans.filter(l=>String(l.status).toLowerCase()==="aktiv")){
      const openRates=V1.rates.filter(r=>String(r.darlehen_id)===String(loan.id)&&String(r.status||"").toLowerCase()!=="bezahlt").sort((a,b)=>new Date(a.faellig_am||0)-new Date(b.faellig_am||0));
      for(const rate of openRates){
        if(!rate.faellig_am||new Date(rate.faellig_am).getTime()>nowTs)continue;
        if(String(rate.status).toLowerCase()!=="überfällig"){
          const ur=await db().from(T.rates).update({status:"Überfällig"}).eq("id",rate.id);
          if(ur.error)continue;
          rate.status="Überfällig";
        }
        const warningCount=V1.warnings.filter(w=>String(w.darlehen_id)===String(loan.id)).length;
        if(warningCount>=4)continue;
        const already=V1.warnings.some(w=>String(w.darlehen_id)===String(loan.id)&&String(w.rate_id||"")===String(rate.id));
        if(already)continue;
        const nummer=warningCount+1;
        const fee=nummer===1?Number(loan.gesamtbetrag||loan.ursprungsbetrag||0)*0.03:0;
        const w=await insert(T.warnings,{darlehen_id:loan.id,rate_id:rate.id,nummer,grund:`Rate ${rate.rate_nummer||nummer} überfällig`,gebuehr:fee,status:fee>0?"Bezahlt":"Offen",erstellt_am:now(),erstellt_von:window.__clanbuchhaltungV1User?.id||null,erstellt_von_name:userName()});
        V1.warnings.push(w);
        if(fee>0){
          try{await insertBooking({buchungsnummer:`MA-${Date.now()}`,art:"Einzahlung",betrag:fee,von:loan.mitglied_name||"Mitglied",an:"Clan-Kasse",zweck:"Mahngebühr 3 % des ursprünglichen Darlehens",kategorie:"Geldverleih",zahlungsart:"Ingame-Bargeld",datum:now(),erstellt_von:window.__clanbuchhaltungV1User?.id||null,erstellt_von_name:userName(),status:"Bezahlt"})}catch(e){console.warn("Mahngebühr konnte nicht als Buchung erfasst werden",e)}
        }
        await discord("geldverleih",{type:"Mahnung",title:`⚠️ Mahnung ${nummer}/4 – Darlehensrate überfällig`,amount:fee,member:loan.mitglied_name,rate:rate.rate_nummer,warningNumber:nummer,createdBy:userName(),date:now()});
      }
    }
  }

  function renderOverviewV1(){
    const inc=v1IncomeRows().reduce((s,x)=>s+x.amount,0), exp=v1PayoutRows().reduce((s,x)=>s+x.amount,0), active=V1.loans.filter(l=>String(l.status).toLowerCase()==="aktiv");
    const interest=V1.rates.filter(r=>String(r.status||"").toLowerCase()!=="bezahlt").reduce((s,r)=>s+Number(r.zinsen||0),0);
    const fees=V1.warnings.filter(w=>String(w.status||"").toLowerCase()==="bezahlt").reduce((s,w)=>s+Number(w.gebuehr||0),0);
    const set=(id,val)=>{if($(id))$(id).textContent=money(val)};
    set("currentClanBalance",available());set("totalRevenue",wealth());set("totalDeposits",inc);set("totalWithdrawals",exp);set("totalClanExpenses",exp);set("totalSavings",Number($("totalSavings")?.textContent?.replace(/[^0-9,-]/g,"")?.replace(".","")||0));set("totalOpenAmounts",active.reduce((s,l)=>s+loanOpen(l),0));set("totalAssets",wealth());
    // extra overview cards, if present
    ["v1LoanOpen","v1LoanInterestDue","v1LoanFees"].forEach(()=>{});
  }

  function renderIncome(){
    const rows=v1IncomeRows().sort((a,b)=>new Date(b.date)-new Date(a.date));
    const orders=rows.filter(r=>String(r.type).toLowerCase().includes("auftrag")).reduce((s,r)=>s+r.amount,0);
    const dons=V1.donations.reduce((s,r)=>s+Number(r.betrag||0),0);const other=rows.filter(r=>String(r.type).toLowerCase().includes("sonst")).reduce((s,r)=>s+r.amount,0);const loan=V1.rates.filter(r=>String(r.status||"").toLowerCase()==="bezahlt").reduce((s,r)=>s+Number(r.betrag||0)+Number(r.zinsen||0),0)+V1.warnings.filter(r=>String(r.status||"").toLowerCase()==="bezahlt").reduce((s,r)=>s+Number(r.gebuehr||0),0);
    $("v1IncomeOrders")&&($("v1IncomeOrders").textContent=money(orders));$("v1IncomeDonations")&&($("v1IncomeDonations").textContent=money(dons));$("v1IncomeOther")&&($("v1IncomeOther").textContent=money(other));$("v1IncomeLoans")&&($("v1IncomeLoans").textContent=money(loan));
    const body=$("v1IncomeTable");if(body)body.innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(formatDate(r.date))}</td><td>${esc(r.type)}</td><td>${money(r.amount)}</td><td>${esc(r.from)}</td><td>${esc(r.purpose)}</td><td>${esc(r.by)}</td></tr>`).join(""): '<tr><td colspan="6" class="v1-empty">Noch keine Einnahmen vorhanden.</td></tr>';
  }
  function renderPayouts(){
    const rows=v1PayoutRows().sort((a,b)=>new Date(b.date)-new Date(a.date));const total=rows.reduce((s,r)=>s+r.amount,0),wages=rows.filter(r=>/gehalt|lohn/i.test(r.type)).reduce((s,r)=>s+r.amount,0),order=rows.filter(r=>/auftragslohn/i.test(r.type)).reduce((s,r)=>s+r.amount,0);
    [ ["v1PayoutTotal",total],["v1PayoutWages",wages],["v1PayoutOrderWages",order],["v1PayoutOther",Math.max(0,total-wages)] ].forEach(([id,v])=>$(id)&&($(id).textContent=money(v)));
    const body=$("v1PayoutTable");if(body)body.innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(formatDate(r.date))}</td><td>${esc(r.type)}</td><td>${money(r.amount)}</td><td>${esc(r.to)}</td><td>${esc(r.purpose)}</td><td>${esc(r.by)}</td></tr>`).join(""): '<tr><td colspan="6" class="v1-empty">Noch keine Auszahlungen vorhanden.</td></tr>';
  }
  function renderLoans(){
    const active=V1.loans.filter(l=>String(l.status).toLowerCase()==="aktiv");const open=active.reduce((s,l)=>s+loanOpen(l),0);const interest=V1.rates.filter(r=>String(r.status||"").toLowerCase()!=="bezahlt").reduce((s,r)=>s+Number(r.zinsen||0),0);const fees=V1.warnings.filter(r=>String(r.status||"").toLowerCase()==="bezahlt").reduce((s,r)=>s+Number(r.gebuehr||0),0);
    [["v1LoanOpen",open],["v1LoanInterestDue",interest],["v1LoanFees",fees]].forEach(([id,v])=>$(id)&&($(id).textContent=money(v)));$("v1LoanCount")&&($("v1LoanCount").textContent=String(active.length));
    const body=$("v1LoanTable");if(body)body.innerHTML=V1.loans.length?V1.loans.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).map(l=>{const r=nextRate(l);return `<tr><td>${esc(selectedEmployee(l.mitglied_id)?.name||l.mitglied_name||"—")}</td><td>${money(l.ursprungsbetrag)}</td><td>${Number(l.zinssatz||0)} %</td><td>${money(l.gesamtbetrag)}</td><td>${money(loanPaid(l))}</td><td>${money(loanOpen(l))}</td><td>${esc(r?formatDate(r.faellig_am):"—")}</td><td>${loanWarnings(l)}</td><td>${esc(l.status||"—")}</td></tr>`}).join(""):'<tr><td colspan="9" class="v1-empty">Noch keine Darlehen vorhanden.</td></tr>';
  }
  function renderHistory(){
    const q=String($("v1HistorySearch")?.value||"").toLowerCase(),type=$("v1HistoryType")?.value||"",from=$("v1HistoryFrom")?.value||"",to=$("v1HistoryTo")?.value||"";
    const rows=[...v1IncomeRows().map(r=>({...r,kind:"Einnahme"})),...v1PayoutRows().map(r=>({...r,kind:"Auszahlung"})),...V1.rates.filter(r=>String(r.status||"").toLowerCase()==="bezahlt").map(r=>({date:r.eingezahlt_am||r.created_at,kind:"Rate",amount:Number(r.betrag||0),from:r.mitglied_name||"Mitglied",to:"Clan-Kasse",purpose:"Darlehensrate",by:r.eingezahlt_von_name||"—",order:""}))].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const f=rows.filter(r=>{const hay=JSON.stringify(r).toLowerCase();const d=String(r.date||"").slice(0,10);return(!q||hay.includes(q))&&(!type||r.kind===type)&&(!from||d>=from)&&(!to||d<=to)});
    const body=$("v1HistoryTable");if(body)body.innerHTML=f.length?f.map(r=>`<tr><td>${esc(formatDate(r.date))}</td><td>${esc(r.kind)}</td><td>${money(r.amount)}</td><td>${esc(r.from)} → ${esc(r.to)}</td><td>${esc(r.purpose)}</td><td>${esc(r.order)}</td><td>${esc(r.by)}</td></tr>`).join(""):'<tr><td colspan="7" class="v1-empty">Keine passenden Buchungen.</td></tr>';
  }
  function renderStats(){
    const y=Number($("v1StatsYear")?.value||new Date().getFullYear());const inc=v1IncomeRows().filter(r=>new Date(r.date).getFullYear()===y);const exp=v1PayoutRows().filter(r=>new Date(r.date).getFullYear()===y);const income=inc.reduce((s,r)=>s+r.amount,0),expense=exp.reduce((s,r)=>s+r.amount,0),wages=exp.filter(r=>/gehalt|lohn/i.test(r.type)).reduce((s,r)=>s+r.amount,0);$("v1YearIncome")&&($("v1YearIncome").textContent=money(income));$("v1YearExpense")&&($("v1YearExpense").textContent=money(expense));$("v1YearWages")&&($("v1YearWages").textContent=money(wages));$("v1YearWealth")&&($("v1YearWealth").textContent=money(income));const chart=$("v1StatsChart");if(!chart)return;const months=Array.from({length:12},(_,m)=>{const a=inc.filter(r=>new Date(r.date).getMonth()===m).reduce((s,r)=>s+r.amount,0);const e=exp.filter(r=>new Date(r.date).getMonth()===m).reduce((s,r)=>s+r.amount,0);return{m,a,e}});const max=Math.max(1,...months.flatMap(x=>[x.a,x.e]));chart.innerHTML=months.map(x=>`<div class="v1-bar-row"><span>${String(x.m+1).padStart(2,"0")}</span><div><div class="v1-bar" style="width:${x.a/max*100}%"></div><div class="v1-bar" style="width:${x.e/max*100}%;opacity:.45;margin-top:3px"></div></div><span>${money(x.a-x.e)}</span></div>`).join("");}
  function renderProtocols(){const ing=bookingRows().filter(b=>String(b.status||"").toLowerCase()!=="storniert").slice().sort((a,b)=>new Date(b.datum||b.created_at)-new Date(a.datum||a.created_at));const ib=$("v1IngameProtocol");if(ib)ib.innerHTML=ing.length?ing.map(b=>`<tr><td>${esc(formatDate(b.datum||b.created_at))}</td><td>${esc(b.art||"—")}</td><td>${money(b.betrag)}</td><td>${esc(b.zweck||"—")}</td><td>${esc(b.erstellt_von_name||b.erstellt_von||"—")}</td></tr>`).join(""):'<tr><td colspan="5" class="v1-empty">Keine Ingame-Buchungen.</td></tr>';const logs=Array.isArray(window.__clanbuchhaltungV1Logs)?window.__clanbuchhaltungV1Logs:[];const bb=$("v1BookProtocol");if(bb)bb.innerHTML=logs.length?logs.slice(0,100).map(l=>`<tr><td>${esc(formatDate(l.created_at||l.datum))}</td><td>${esc(l.bereich)}</td><td>${esc(l.aktion)}</td><td>${esc(l.referenz||"—")}</td><td>${esc(l.erstellt_von_name||l.erstellt_von||"—")}</td></tr>`).join(""):'<tr><td colspan="5" class="v1-empty">Noch keine Buchhaltungs-Protokolle.</td></tr>'}
  function populateYears(){const s=$("v1StatsYear");if(!s)return;const years=new Set([new Date().getFullYear(),...v1IncomeRows().map(r=>new Date(r.date).getFullYear()),...v1PayoutRows().map(r=>new Date(r.date).getFullYear())]);s.innerHTML=[...years].filter(Number.isFinite).sort((a,b)=>b-a).map(y=>`<option value="${y}">${y}</option>`).join("")}

  window.v1RenderHistory=renderHistory;window.v1RenderStats=renderStats;
  window.v1SaveDonation=async()=>{
    if(!window.__clanbuchhaltungV1User)return status("Kein angemeldetes Konto gefunden.");const amount=Number($("v1DonationAmount")?.value||0);if(amount<=0)return status("Bitte einen gültigen Spendenbetrag eingeben.");if(!(await confirmBox(`Du buchst eine Spende über ${money(amount)}. Die Buchung ist danach unveränderbar und nicht stornierbar.`)) )return;
    try{const payload={mitarbeiter_id:window.__clanbuchhaltungV1Employee?.user_id||window.__clanbuchhaltungV1User.id,betrag:amount,zweck:"Spende für Clan",erstellt_von:window.__clanbuchhaltungV1User.id,erstellt_von_name:userName(),created_at:now()};const d=await insert(T.donations,payload);await insertBooking({buchungsnummer:`SP-${Date.now()}`,art:"Einzahlung",betrag:amount,von:userName(),an:"Clan-Kasse",zweck:"Spende für Clan",kategorie:"Spende",zahlungsart:"Ingame-Bargeld",datum:payload.created_at,erstellt_von:window.__clanbuchhaltungV1User.id,erstellt_von_name:userName(),status:"Bezahlt"});await log("Einnahmen","Spende",d.id,payload);await discord("einnahmen",{type:"Spende",title:"🎁 Neue Clan-Spende",amount,from:userName(),purpose:"Spende für Clan",createdBy:userName(),date:payload.created_at});$("v1DonationAmount").value="";status("Spende wurde endgültig gebucht.",true);await boot();}catch(e){status("Spende konnte nicht gespeichert werden: "+e.message)}};
  window.v1SaveOtherIncome=async()=>{const amount=Number($("v1OtherIncomeAmount")?.value||0),purpose=String($("v1OtherIncomePurpose")?.value||"").trim();if(amount<=0||!purpose)return status("Betrag und Zweck ausfüllen.");if(!(await confirmBox(`Du buchst ${money(amount)} als sonstige Einnahme: „${purpose}“. Unveränderbar.`)))return;try{await insertBooking({buchungsnummer:`EI-${Date.now()}`,art:"Einzahlung",betrag:amount,von:userName(),an:"Clan-Kasse",zweck:purpose,kategorie:"Sonstige Einnahme",zahlungsart:"Ingame-Bargeld",datum:now(),erstellt_von:window.__clanbuchhaltungV1User?.id||null,erstellt_von_name:userName(),status:"Bezahlt"});await discord("einnahmen",{type:"Sonstige Einnahme",title:"💰 Sonstige Einnahme",amount,purpose,createdBy:userName(),date:now()});status("Einnahme wurde endgültig gebucht.",true);$("v1OtherIncomeAmount").value="";$("v1OtherIncomePurpose").value="";await boot()}catch(e){status("Einnahme konnte nicht gespeichert werden: "+e.message)}};
  window.v1SaveOtherPayout=async()=>{if(!isLeitung())return status("Nur Leitung oder Stadtleitung darf Auszahlungen buchen.");const amount=Number($("v1OtherPayoutAmount")?.value||0),purpose=String($("v1OtherPayoutPurpose")?.value||"").trim();if(amount<=0||!purpose)return status("Betrag und Zweck ausfüllen.");if(!(await confirmBox(`Du buchst eine Auszahlung über ${money(amount)}: „${purpose}“. Unveränderbar.`)))return;try{const b=await insertBooking({buchungsnummer:`AU-${Date.now()}`,art:"Auszahlung",betrag:amount,von:"Clan-Kasse",an:purpose, zweck:purpose,kategorie:"Sonstige Auszahlung",zahlungsart:"Ingame-Bargeld",datum:now(),erstellt_von:window.__clanbuchhaltungV1User?.id||null,erstellt_von_name:userName(),status:"Bezahlt"});await insert(T.payouts,{mitarbeiter_id:window.__clanbuchhaltungV1Employee?.user_id||null,betrag:amount,art:"Sonstige Auszahlung",zweck:purpose,buchung_id:b.id,erstellt_von:window.__clanbuchhaltungV1User?.id||null,erstellt_von_name:userName(),created_at:now()});await discord("auszahlungen",{type:"Sonstige Auszahlung",title:"💸 Sonstige Auszahlung",amount,purpose,createdBy:userName(),date:b.datum});status("Auszahlung wurde endgültig gebucht.",true);$("v1OtherPayoutAmount").value="";$("v1OtherPayoutPurpose").value="";await boot()}catch(e){status("Auszahlung konnte nicht gespeichert werden: "+e.message)}};
  window.v1SaveMonthlySalary=async()=>{if(!isStadtleitung())return status("Nur Stadtleitung kann Monatsgehälter buchen.");const emp=selectedEmployee($("v1SalaryEmployee")?.value),month=$("v1SalaryMonth")?.value,amount=Number($("v1SalaryAmount")?.value||0);if(!emp||!month||amount<=0)return status("Mitarbeiter, Monat und Betrag ausfüllen.");if(!(await confirmBox(`Monatsgehalt ${money(amount)} für ${emp.name} (${month}). Unveränderbar.`)))return;try{const b=await insertBooking({buchungsnummer:`GE-${Date.now()}`,art:"Auszahlung",betrag:amount,von:"Clan-Kasse",an:emp.name,zweck:`Monatsgehalt ${month}`,kategorie:"Gehalt",zahlungsart:"Ingame-Bargeld",datum:now(),erstellt_von:window.__clanbuchhaltungV1User?.id||null,erstellt_von_name:userName(),status:"Bezahlt"});await insert(T.payouts,{mitarbeiter_id:emp.user_id||emp.id,betrag:amount,art:"Monatsgehalt",zweck:`Monatsgehalt ${month}`,buchung_id:b.id,erstellt_von:window.__clanbuchhaltungV1User?.id||null,erstellt_von_name:userName(),created_at:now(),monat:month});await discord("auszahlungen",{type:"Monatsgehalt",title:"💸 Monatsgehalt",amount,recipient:emp.name,purpose:`Monatsgehalt ${month}`,createdBy:userName(),date:b.datum});status("Monatsgehalt wurde endgültig gebucht.",true);$("v1SalaryAmount").value="";await boot()}catch(e){status("Gehalt konnte nicht gespeichert werden: "+e.message)}};
  window.v1CreateLoan=async()=>{if(!isStadtleitung())return status("Nur Stadtleitung kann Darlehen genehmigen.");const emp=selectedEmployee($("v1LoanMember")?.value),amount=Number($("v1LoanAmount")?.value||0),rate=Number($("v1LoanInterest")?.value||0),mode=$("v1LoanMode")?.value,install=Number($("v1LoanInstallment")?.value||0);if(!emp||amount<=0||rate<0||rate>30)return status("Mitglied, Betrag und Zinssatz prüfen.");if(activeLoanFor(emp.user_id||emp.id))return status("Dieses Mitglied hat bereits ein aktives Darlehen.");if(mode==="woechentlich"&&install<=0)return status("Bitte die wöchentliche Rate festlegen.");const interest=amount*rate/100,total=amount+interest;const count=mode==="woechentlich"?Math.ceil(total/install):1;if(!(await confirmBox(`Darlehen ${money(amount)} an ${emp.name}. Zinssatz ${rate} %. Rückzahlung gesamt ${money(total)}. Nach Bestätigung unveränderbar.`)))return;try{const l=await insert(T.loans,{mitglied_id:emp.user_id||emp.id,mitglied_name:emp.name,ursprungsbetrag:amount,zinssatz:rate,zinsbetrag:interest,gesamtbetrag:total,auszahlungsbetrag:amount,rueckzahlungsart:mode,woechentliche_rate:mode==="woechentlich"?install:null,anzahl_raten:count,bereits_bezahlt:0,offener_betrag:total,status:"Aktiv",genehmigt_von:window.__clanbuchhaltungV1User?.id,genehmigt_von_name:userName(),genehmigt_am:now(),created_at:now()});if(mode==="woechentlich"){const due=new Date();for(let i=1;i<=count;i++){due.setDate(due.getDate()+7);const amt=i===count?total-install*(count-1):install;await insert(T.rates,{darlehen_id:l.id,mitglied_id:emp.user_id||emp.id,rate_nummer:i,betrag:amt,zinsen:i===1?interest:0,faellig_am:due.toISOString(),status:"Offen",created_at:now()})}}await log("Geldverleih","Darlehen genehmigt",l.id,l);await discord("geldverleih",{type:"Darlehen",title:"🤝 Darlehen genehmigt",amount,total,member:emp.name,interestRate:rate,approvedBy:userName(),date:l.genehmigt_am});status("Darlehen wurde genehmigt und als ausgezahlt erfasst.",true);await boot()}catch(e){status("Darlehen konnte nicht gespeichert werden: "+e.message)}};
  window.v1PayInstallment=async()=>{const l=V1.loans.find(x=>String(x.id)===$("v1RepaymentLoan")?.value);if(!l)return status("Bitte ein Darlehen auswählen.");const r=nextRate(l);if(!r)return status("Für dieses Darlehen ist keine offene Rate vorhanden.");if(!(await confirmBox(`Rate ${money(r.betrag)} für ${l.mitglied_name||"Mitglied"}. Bitte bestätigen, dass die Zahlung ingame erfolgt ist. Unveränderbar.`)))return;try{await db().from(T.rates).update({status:"Bezahlt",eingezahlt_am:now(),eingezahlt_von:window.__clanbuchhaltungV1User?.id||null,eingezahlt_von_name:userName()}).eq("id",r.id);const newPaid=loanPaid(l)+Number(r.betrag||0);const open=Math.max(0,Number(l.gesamtbetrag||0)-newPaid);await db().from(T.loans).update({bereits_bezahlt:newPaid,offener_betrag:open,status:open<=0?"Abgeschlossen":"Aktiv",abgeschlossen_am:open<=0?now():null}).eq("id",l.id);await insertBooking({buchungsnummer:`DR-${Date.now()}`,art:"Einzahlung",betrag:Number(r.betrag||0),von:l.mitglied_name||"Mitglied",an:"Clan-Kasse",zweck:`Darlehensrate ${r.rate_nummer||""}`,kategorie:"Geldverleih",zahlungsart:"Ingame-Bargeld",datum:now(),erstellt_von:window.__clanbuchhaltungV1User?.id||null,erstellt_von_name:userName(),status:"Bezahlt"});await log("Geldverleih","Rate eingezahlt",r.id,{darlehen_id:l.id,betrag:r.betrag});await discord("geldverleih",{type:"Rate",title:"💳 Darlehensrate eingezahlt",amount:r.betrag,member:l.mitglied_name,createdBy:userName(),date:now()});status(open<=0?"Darlehen vollständig abgeschlossen.":"Rate wurde eingetragen.",true);await boot()}catch(e){status("Rate konnte nicht gespeichert werden: "+e.message)}};

  async function boot(){
    await loadV1();
    await processOverdueLoans();
    // Get baseline arrays by reading the page's existing DB-facing DOM is not enough; load the old tables here too.
    if(db()){
      try{window.__clanbuchhaltungV1Bookings=await q("buchhaltung_buchungen","datum");window.__clanbuchhaltungV1Logs=await q("buchhaltung_protokoll","created_at")}catch(e){}
    }
    renderEmployees();renderLoanInfo();renderIncome();renderPayouts();renderLoans();renderHistory();populateYears();renderStats();renderProtocols();
    // KORRIGIERTE FINANZLOGIK:
    // - Einnahmen/Gesamtvermögen = historische Einnahmen. Ausgaben reduzieren diesen Wert NICHT.
    // - Auftragsgehälter werden als echte Ausgaben berücksichtigt.
    // - Sparkonto bleibt separat sichtbar, ist aber Teil des bereits erwirtschafteten Gesamtvermögens
    //   und wird deshalb nicht noch einmal zum Gesamtvermögen addiert.
    // - Aktuell verfügbar = Einnahmen - sonstige Auszahlungen - Auftragsgehälter - Netto-Sparkonto.
    const income = v1IncomeRows().reduce((s,r)=>s+r.amount,0);
    const payout = v1PayoutRows().reduce((s,r)=>s+r.amount,0);
    const orderWages = typeof workerSalaryTotal === "function" ? workerSalaryTotal() : 0;
    const savingsBal = typeof savingsBalance === "function" ? savingsBalance() : 0;
    const totalExpenses = payout + orderWages;
    const availableNow = income - totalExpenses - savingsBal;
    const open = V1.loans.filter(l=>String(l.status).toLowerCase()==="aktiv")
        .reduce((s,l)=>s+loanOpen(l),0);
    const interest = V1.rates.filter(r=>String(r.status||"").toLowerCase()!=="bezahlt")
        .reduce((s,r)=>s+Number(r.zinsen||0),0);
    const fees = V1.warnings.filter(w=>String(w.status||"").toLowerCase()==="bezahlt")
        .reduce((s,r)=>s+Number(r.gebuehr||0),0);

    if($("currentClanBalance")) $("currentClanBalance").textContent = money(availableNow);
    if($("totalRevenue")) $("totalRevenue").textContent = money(income);
    if($("totalDeposits")) $("totalDeposits").textContent = money(income);
    if($("totalWithdrawals")) $("totalWithdrawals").textContent = money(totalExpenses);
    if($("totalWorkerSalaries")) $("totalWorkerSalaries").textContent = money(orderWages);
    if($("totalClanExpenses")) $("totalClanExpenses").textContent = money(totalExpenses);
    if($("totalSavings")) $("totalSavings").textContent = money(savingsBal);
    if($("totalOpenAmounts")) $("totalOpenAmounts").textContent = money(open);
    if($("totalAssets")) $("totalAssets").textContent = money(income);
    const headline=document.querySelector(".balance-description");if(headline)headline.textContent="Aktueller tatsächlich erfasster Clanbestand. Gesamtvermögen bleibt historisch und sinkt nicht durch Ausgaben.";
    if($("v1RepaymentLoan"))$("v1RepaymentLoan").addEventListener("change",renderLoanInfo);
  }
  document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,150));
  if(document.readyState!=="loading")setTimeout(boot,150);
})();
