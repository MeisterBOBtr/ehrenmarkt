/* ============================================================
   EHRENMARKT – CLAN-BUCHHALTUNG
   JS passend zu clanbuchhaltung (3).html
   V2 – Supabase + Mitarbeiter + Finanzwerte + Discord
   ============================================================ */

(() => {
    "use strict";

    const SUPABASE_URL = "https://pdbvqsuyjblijvubwiph.supabase.co";
    const SUPABASE_KEY = "sb_publishable_8DCc8cg3WHp0uR2KncHCQw_CdhxrkpQ";
    const DISCORD_FUNCTION = "buchhaltung";

    const T = {
        bookings: "buchhaltung_buchungen",
        savings: "buchhaltung_sparkonto",
        employees: "employees",
        orders: "buchhaltung_auftragsabrechnungen",
        workers: "buchhaltung_auftragsarbeiter",
        payouts: "buchhaltung_auszahlungen",
        donations: "buchhaltung_spenden",
        loans: "buchhaltung_darlehen",
        rates: "buchhaltung_darlehen_raten",
        warnings: "buchhaltung_darlehen_mahnungen",
        cash: "buchhaltung_kassenabgleich",
        logs: "buchhaltung_protokoll"
    };

    let db = null;
    let currentUser = null;
    let currentEmployee = null;

    let bookings = [];
    let savings = [];
    let employees = [];
    let orders = [];
    let workers = [];
    let payouts = [];
    let donations = [];
    let loans = [];
    let rates = [];
    let warnings = [];
    let cashChecks = [];
    let logs = [];
    let savingsGoal = 0;
    let currentWorkers = [];

    const $ = id => document.getElementById(id);
    const text = (id, value) => { const e = $(id); if (e) e.textContent = value ?? ""; };
    const val = id => String($(id)?.value ?? "").trim();
    const num = id => Number(String($(id)?.value ?? "").replace(/\./g, "").replace(",", ".")) || 0;
    const n = value => Number(value || 0) || 0;
    const money = value => `${n(value).toLocaleString("de-DE")} $`;
    const dateText = value => {
        if (!value) return "—";
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
    };
    const dateOnly = value => {
        if (!value) return "—";
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("de-DE");
    };
    const esc = value => String(value ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    function toast(message, type = "info") {
        let box = $("buchhaltungToast");
        if (!box) {
            box = document.createElement("div");
            box.id = "buchhaltungToast";
            box.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;max-width:92%;padding:13px 18px;border:1px solid rgba(212,175,55,.45);border-radius:10px;background:rgba(8,8,8,.95);box-shadow:0 12px 35px rgba(0,0,0,.5);color:#f4f4f4;font-weight:600;text-align:center;opacity:0;transition:.2s";
            document.body.appendChild(box);
        }
        box.textContent = message;
        box.style.borderColor = type === "error" ? "rgba(217,92,92,.7)" : type === "success" ? "rgba(86,200,120,.7)" : "rgba(212,175,55,.45)";
        box.style.opacity = "1";
        clearTimeout(box._timer);
        box._timer = setTimeout(() => box.style.opacity = "0", 3500);
    }
    window.showToast = toast;

    function setStatus(id, message, ok = true) {
        const e = $(id);
        if (!e) return;
        e.textContent = message;
        e.style.display = "block";
        e.classList.toggle("danger-text", !ok);
        e.classList.toggle("success-text", ok);
    }

    async function getClient() {
        if (db?.from) return db;
        if (window.supabaseClient?.from) {
            const existingUrl = String(window.supabaseClient.supabaseUrl || "");
            if (!existingUrl || existingUrl === SUPABASE_URL) {
                db = window.supabaseClient;
                return db;
            }
            console.warn("Vorhandener Supabase-Client zeigt auf ein anderes Projekt. Für die Buchhaltung wird der korrekte Client verwendet.");
        }
        if (!window.supabase?.createClient) {
            await loadSupabaseScript();
        }
        if (!window.supabase?.createClient) throw new Error("Supabase JavaScript Client konnte nicht geladen werden.");
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        window.supabaseClient = db;
        return db;
    }

    function loadSupabaseScript() {
        return new Promise(resolve => {
            const urls = [
                "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
                "https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js"
            ];
            let i = 0;
            const next = () => {
                if (window.supabase?.createClient || i >= urls.length) return resolve();
                const s = document.createElement("script");
                s.src = urls[i++];
                s.onload = resolve;
                s.onerror = next;
                document.head.appendChild(s);
            };
            next();
        });
    }

    async function loadSession() {
        const client = await getClient();
        const sessionResult = await Promise.race([
            client.auth.getSession(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Supabase-Session Timeout")), 7000))
        ]);
        if (sessionResult.error) throw sessionResult.error;
        const session = sessionResult.data?.session || null;
        currentUser = session?.user || null;

        // Die lokale, gültige Session reicht für die RLS-Abfragen.
        // getUser() wird zusätzlich im Hintergrund versucht, darf aber die Seite
        // niemals blockieren oder den Benutzer wegen eines Netzwerkfehlers ausloggen.
        if (currentUser) {
            client.auth.getUser().then(result => {
                if (!result.error && result.data?.user) {
                    currentUser = result.data.user;
                    renderTop();
                }
            }).catch(() => {});
        }
        return currentUser;
    }

    async function loadEmployee() {
        currentEmployee = null;
        if (!currentUser) return null;

        // Für die Clan-Buchhaltung kommt ALLES Mitarbeiterbezogene ausschließlich
        // aus public.employees. profiles enthält normale Kunden und wird hier
        // bewusst nicht verwendet.
        const employeeResult = await db.from(T.employees).select("*").eq("user_id", currentUser.id).maybeSingle();
        if (!employeeResult.error) {
            currentEmployee = employeeResult.data || null;
        } else {
            console.warn("Mitarbeiter konnte nicht geladen werden:", employeeResult.error.message);
            window.bookkeepingErrors = window.bookkeepingErrors || {};
            window.bookkeepingErrors[T.employees] = employeeResult.error.message;
        }
        return currentEmployee;
    }

    async function table(name, order = null) {
        let q = db.from(name).select("*");
        if (order) q = q.order(order, { ascending: false, nullsFirst: false });
        const { data, error } = await q;
        if (error) {
            console.warn(`Buchhaltung ${name}:`, error.message);
            window.bookkeepingErrors = window.bookkeepingErrors || {};
            window.bookkeepingErrors[name] = error.message;
            return [];
        }
        return data || [];
    }

    async function loadAll() {
        [bookings, savings, employees, orders, workers, payouts, donations, loans, rates, warnings, cashChecks, logs] = await Promise.all([
            table(T.bookings, "datum"),
            table(T.savings, "datum"),
            table(T.employees, "name"),
            table(T.orders, "datum"),
            table(T.workers, "created_at"),
            table(T.payouts, "erstellt_am"),
            table(T.donations, "erstellt_am"),
            table(T.loans, "erstellt_am"),
            table(T.rates, "erstellt_am"),
            table(T.warnings, "erstellt_am"),
            table(T.cash, "datum"),
            table(T.logs, "datum")
        ]);

        const goalLog = logs.find(x => x.typ === "Sparkonto" && x.aktion === "Sparziel");
        savingsGoal = n(goalLog?.neue_werte?.goal);
    }

    function rank() { return String(currentEmployee?.rang || "").trim().toLowerCase(); }
    function isStadt() { return rank() === "stadtleitung"; }
    function isLeitung() { return rank() === "leitung" || isStadt(); }
    function isMitarbeiter() { return rank() === "mitarbeiter" || rank() === "mitglied"; }
    function canManage() { return isLeitung(); }

    function employeeById(id) {
        return employees.find(e => String(e.id) === String(id) || String(e.user_id) === String(id)) || null;
    }
    function employeeName(id) {
        const e = employeeById(id);
        return e?.name || e?.username || e?.minecraft_name || "—";
    }

    function paidOrder(o) {
        return ["bezahlt", "abgeschlossen", "geschlossen", "erledigt", "completed", "paid"].includes(String(o?.status || "").toLowerCase());
    }
    function grossOrder(o) { return n(o?.gesamtbetrag); }
    function clanOrder(o) { return n(o?.clanbetrag); }
    function bookingIn() { return bookings.filter(x => String(x.art || "").toLowerCase() === "einzahlung").reduce((s,x)=>s+n(x.betrag),0); }
    function bookingOut() { return bookings.filter(x => String(x.art || "").toLowerCase() === "auszahlung").reduce((s,x)=>s+n(x.betrag),0); }
    function savingsBalance() { return savings.reduce((s,x)=>String(x.art || "").toLowerCase()==="einzahlung" ? s+n(x.betrag) : s-n(x.betrag),0); }
    function savingsIn() { return savings.filter(x=>String(x.art||"").toLowerCase()==="einzahlung").reduce((s,x)=>s+n(x.betrag),0); }
    function savingsOut() { return savings.filter(x=>String(x.art||"").toLowerCase()==="auszahlung").reduce((s,x)=>s+n(x.betrag),0); }
    function orderWages() { return workers.reduce((s,x)=>s+n(x.gehalt),0); }
    function monthlyWages() { return payouts.filter(x=>String(x.typ||"").toLowerCase()==="monatsgehalt").reduce((s,x)=>s+n(x.betrag),0); }
    function otherPayouts() { return payouts.filter(x=>String(x.typ||"").toLowerCase()!=="monatsgehalt").reduce((s,x)=>s+n(x.betrag),0); }
    function paidLoanRates() { return rates.filter(x=>String(x.status||"").toLowerCase()==="bezahlt").reduce((s,x)=>s+n(x.betrag),0); }
    function openLoansAmount() { return loans.filter(x=>!paidOrder(x)).reduce((s,x)=>s+n(x.offen),0); }

    function overview() {
        const gross = orders.filter(o=>String(o.status||"").toLowerCase()!=="storniert").reduce((s,o)=>s+grossOrder(o),0);
        const paidClan = orders.filter(paidOrder).reduce((s,o)=>s+clanOrder(o),0);
        const donationsTotal = donations.reduce((s,x)=>s+n(x.betrag),0);
        const actualExpenses = bookingOut() + monthlyWages() + otherPayouts();
        const cash = paidClan + bookingIn() + donationsTotal + paidLoanRates() - actualExpenses;
        const savingsTotal = savingsBalance();
        return {
            grossRevenue: gross + bookingIn() + donationsTotal + paidLoanRates(),
            deposits: bookingIn() + donationsTotal,
            withdrawals: actualExpenses,
            wages: orderWages() + monthlyWages(),
            clanExpenses: orderWages() + actualExpenses,
            savings: savingsTotal,
            cash,
            assets: cash + savingsTotal,
            openOrders: orders.filter(o=>["offen","teilweise bezahlt","teilweise_bezahlt"].includes(String(o.status||"").toLowerCase())).reduce((s,o)=>s+grossOrder(o),0),
            openLoans: openLoansAmount(),
            bookings: bookings.length,
            orders: orders.length,
            dueInterest: loans.filter(x=>!paidOrder(x)).reduce((s,x)=>s+Math.max(0,n(x.zinsbetrag)-Math.max(0,n(x.bereits_gezahlt))),0),
            lateFees: warnings.reduce((s,x)=>s+n(x.mahngebuehr),0)
        };
    }

    function renderTop() {
        text("currentUserName", currentEmployee?.name || (currentUser ? "Kein Mitarbeiterdatensatz" : "Nicht angemeldet"));
        text("currentUserRank", currentEmployee?.rang || "—");
        const status = $("bookkeepingStatus");
        if (status) status.textContent = !currentUser ? "Nicht angemeldet" : isStadt() ? "Stadtleitung" : isLeitung() ? "Leitung" : isMitarbeiter() ? "Mitarbeiter" : "Kein Buchhaltungsrang";
        text("connectionStatus", db ? "Verbunden" : "Fehler");
        text("discordStatus", db && currentUser ? "Bereit" : "Nicht verfügbar");
        const errors=window.bookkeepingErrors||{};
        const errorNames=Object.keys(errors);
        if(errorNames.length) {
            const first=errors[errorNames[0]];
            const roleText = !currentUser ? "Nicht angemeldet" : (isStadt() ? "Stadtleitung" : isLeitung() ? "Leitung" : isMitarbeiter() ? "Mitarbeiter" : "Kein Buchhaltungsrang");
            setStatus("bookkeepingStatus", `${roleText} · ${errorNames.length} Bereich(e) nicht lesbar`, false);
            console.warn("Buchhaltung-Lesefehler:", errors);
        }
    }

    function renderOverview() {
        const d = overview();
        text("currentClanBalance", money(d.cash));
        text("totalRevenue", money(d.grossRevenue));
        text("totalDeposits", money(d.deposits));
        text("totalWithdrawals", money(d.withdrawals));
        text("totalWages", money(d.wages));
        text("totalClanExpenses", money(d.clanExpenses));
        text("totalSavings", money(d.savings));
        text("openAmount", money(d.openOrders));
        text("totalBookings", String(d.bookings));
        text("totalAssets", money(d.assets));
        text("overviewDeposits", money(d.deposits));
        text("overviewWithdrawals", money(d.withdrawals));
        text("overviewBookings", String(d.bookings));
        text("overviewOrders", String(d.orders));
        text("totalIncome", money(d.grossRevenue));
        text("totalExpenses", money(d.withdrawals));
        text("historicalRevenue", money(d.grossRevenue));
        text("historicalRevenueInfo", money(d.grossRevenue));
        text("v1Overdue", money(d.lateFees));
        window.bookkeepingChartData = {
            labels: ["Aktuell"],
            income: [d.grossRevenue], payouts: [d.withdrawals], wages: [d.wages],
            donations: [d.deposits], savings: [d.savings], otherIncome: [0], otherExpense: [0]
        };
        if (typeof window.drawFinanceChart === "function") requestAnimationFrame(window.drawFinanceChart);
    }

    function renderBookings(list = bookings) {
        const body = $("bookingTableBody"); if (!body) return;
        const income = list.filter(x=>String(x.art||"").toLowerCase()==="einzahlung").reduce((s,x)=>s+n(x.betrag),0);
        const expense = list.filter(x=>String(x.art||"").toLowerCase()==="auszahlung").reduce((s,x)=>s+n(x.betrag),0);
        text("bookingIncome",money(income)); text("bookingExpense",money(expense)); text("bookingNet",money(income-expense)); text("bookingCount",String(list.length));
        body.innerHTML = list.length ? list.map(x=>`<tr>
            <td>${esc(x.buchungsnummer||"—")}</td><td>${esc(x.art||"—")}</td><td>${money(x.betrag)}</td>
            <td>${esc(x.von||"—")}</td><td>${esc(x.an||"—")}</td><td>${esc(x.zweck||"—")}</td>
            <td>${esc(x.kategorie||"—")}</td><td>${esc(x.auftragsnummer||"—")}</td><td>${esc(x.zahlungsart||"—")}</td>
            <td>${dateText(x.datum)}</td><td>${esc(x.erstellt_von_name||"—")}</td><td>${esc(x.status||"Offen")}</td>
        </tr>`).join("") : '<tr class="empty-row"><td colspan="12">Noch keine Buchungen vorhanden.</td></tr>';
    }

    function filterBookings() {
        const search = val("bookingSearch").toLowerCase();
        const type = val("bookingTypeFilter"); const category = val("bookingCategoryFilter");
        renderBookings(bookings.filter(x => {
            const hay = JSON.stringify(x).toLowerCase();
            return (!search || hay.includes(search)) && (!type || x.art === type) && (!category || x.kategorie === category);
        }));
    }
    window.filterBookings = filterBookings;

    function renderIncome() {
        const body=$("incomeTableBody"); if(!body)return;
        const rows=[
            ...bookings.filter(x=>x.art==="Einzahlung").map(x=>({_date:x.datum,_type:x.kategorie||"Einzahlung",_amount:x.betrag,_from:x.von,_purpose:x.zweck})),
            ...donations.map(x=>({_date:x.erstellt_am,_type:"Spende",_amount:x.betrag,_from:employeeName(x.mitarbeiter_id),_purpose:x.zweck}))
        ].sort((a,b)=>new Date(b._date)-new Date(a._date));
        body.innerHTML=rows.length?rows.map(x=>`<tr><td>${dateText(x._date)}</td><td>${esc(x._type)}</td><td>${money(x._amount)}</td><td>${esc(x._from||"—")}</td><td>${esc(x._purpose||"—")}</td></tr>`).join(""):'<tr><td colspan="5">Noch keine Einnahmen.</td></tr>';
    }

    function renderPayouts() {
        const body=$("payoutTableBody"); if(!body)return;
        body.innerHTML=payouts.length?payouts.map(x=>`<tr><td>${dateText(x.erstellt_am)}</td><td>${esc(x.typ||"—")}</td><td>${esc(employeeName(x.mitarbeiter_id))}</td><td>${money(x.betrag)}</td><td>${esc(x.beschreibung||x.typ||"—")}</td></tr>`).join(""):'<tr><td colspan="5">Noch keine Auszahlungen.</td></tr>';
    }

    function renderOrders(list=orders) {
        const body=$("orderTableBody"); if(!body)return;
        text("orderCount",String(list.length)); text("orderTotalSum",money(list.reduce((s,x)=>s+grossOrder(x),0))); text("orderClanSum",money(list.reduce((s,x)=>s+clanOrder(x),0))); text("orderSalarySum",money(workers.reduce((s,x)=>s+n(x.gehalt),0))); text("orderOpenSum",money(list.filter(x=>!paidOrder(x)&&String(x.status||"").toLowerCase()!=="storniert").reduce((s,x)=>s+grossOrder(x),0)));
        body.innerHTML=list.length?list.map(o=>{
            const ws=workers.filter(w=>String(w.auftragsabrechnung_id)===String(o.id));
            const salary=ws.reduce((s,w)=>s+n(w.gehalt),0);
            return `<tr><td>${esc(o.auftragsnummer||"—")}</td><td>${money(o.gesamtbetrag)}</td><td>${money(o.clanbetrag)}</td><td>${ws.length?ws.map(w=>esc(w.name||employeeName(w.employee_id))).join(", "):"—"}</td><td>${money(salary||o.gesamt_gehaelter)}</td><td>${esc(o.status||"Offen")}</td><td>${esc(o.erstellt_von_name||"—")}</td><td>${dateText(o.datum)}</td><td>—</td></tr>`;
        }).join(""):'<tr><td colspan="9">Noch keine Auftragsabrechnungen vorhanden.</td></tr>';
    }

    function filterOrders(){
        const search=val("orderSearch").toLowerCase(); const status=val("orderStatusFilter"); const date=val("orderDateFilter");
        renderOrders(orders.filter(o=>{
            const hay=JSON.stringify(o).toLowerCase();
            const matchSearch=!search||hay.includes(search); const matchStatus=!status||String(o.status||"")===status;
            const matchDate=!date||String(o.datum||"").slice(0,10)===date;
            return matchSearch&&matchStatus&&matchDate;
        }));
    }
    window.filterOrders=filterOrders;

    function renderSavings() {
        const bal=savingsBalance(); text("savingsBalance",money(bal)); text("savingsCurrent",money(bal)); text("savingsDeposits",money(savingsIn())); text("savingsWithdrawals",money(savingsOut())); text("savingsTransactionCount",String(savings.length)); text("savingsGoalDisplay",money(savingsGoal));
        const pct=savingsGoal>0?Math.min(100,Math.max(0,bal/savingsGoal*100)):0; const bar=$("savingsProgress"); if(bar)bar.style.width=`${pct}%`; text("savingsProgressText",`${pct.toFixed(1)} % erreicht`);
        const body=$("savingsTableBody"); if(!body)return;
        body.innerHTML=savings.length?savings.map(x=>`<tr><td>${esc(x.buchungsnummer||"—")}</td><td>${esc(x.art||"—")}</td><td>${money(x.betrag)}</td><td>${esc(x.von||"—")}</td><td>${esc(x.an||"—")}</td><td>${esc(x.zweck||"—")}</td><td>${dateText(x.datum)}</td><td>${esc(x.erstellt_von_name||"—")}</td><td>${esc(x.art||"—")}</td></tr>`).join(""):'<tr><td colspan="9">Noch keine Sparkonto-Buchungen vorhanden.</td></tr>';
    }

    function renderEmployees(list=employees) {
        text("employeeCount",String(list.length)); text("employeeSalaryTotal",money(orderWages()+monthlyWages()));
        text("employeeDepositTotal",money(bookings.filter(x=>x.art==="Einzahlung").reduce((s,x)=>s+n(x.betrag),0)));
        text("employeeWithdrawalTotal",money(payouts.reduce((s,x)=>s+n(x.betrag),0)));
        text("employeeOpenTotal",money(orders.filter(o=>!paidOrder(o)).reduce((s,o)=>s+clanOrder(o),0)));
        const body=$("employeeTableBody"); if(!body)return;
        body.innerHTML=list.length?list.map(e=>{
            const ws=workers.filter(w=>String(w.employee_id)===String(e.id));
            const wages=ws.reduce((s,w)=>s+n(w.gehalt),0)+payouts.filter(p=>String(p.mitarbeiter_id)===String(e.user_id)).reduce((s,p)=>s+n(p.betrag),0);
            const dep=donations.filter(d=>String(d.mitarbeiter_id)===String(e.user_id)).reduce((s,d)=>s+n(d.betrag),0);
            const out=payouts.filter(p=>String(p.mitarbeiter_id)===String(e.user_id)).reduce((s,p)=>s+n(p.betrag),0);
            return `<tr><td>${esc(e.name||"—")}</td><td>${ws.length}</td><td>${money(wages)}</td><td>${money(dep)}</td><td>${money(out)}</td><td>0 $</td><td>${esc(e.role||e.rang||"—")}</td></tr>`;
        }).join(""):'<tr><td colspan="7">Keine Mitarbeiterdaten vorhanden.</td></tr>';
    }
    function filterEmployees(){const q=val("employeeSearch").toLowerCase();renderEmployees(employees.filter(e=>JSON.stringify(e).toLowerCase().includes(q)));}
    window.filterEmployees=filterEmployees;

    function renderLoans() {
        const body=$("loanTableBody"); if(!body)return;
        const open=loans.filter(l=>!paidOrder(l.status)); text("loanOpenCount",String(open.length)); text("loanOpenSum",money(openLoansAmount())); text("loanDueInterest",money(overview().dueInterest)); text("loanLateFees",money(overview().lateFees));
        body.innerHTML=loans.length?loans.map(l=>{
            const rate=rates.filter(r=>String(r.darlehen_id)===String(l.id)&&String(r.status||"").toLowerCase()!=="bezahlt").sort((a,b)=>new Date(a.faellig_am)-new Date(b.faellig_am))[0];
            const can=(isLeitung()||(isMitarbeiter()&&String(l.mitglied_id)===String(currentUser?.id)));
            const action=paidOrder(l.status)?"—":can?`<button class="small-button" onclick="payLoanRate('${esc(l.id)}')">Rate einzahlen</button>`:"Nur eigenes Darlehen";
            return `<tr><td>${esc(employeeName(l.mitglied_id))}</td><td>${money(l.originalbetrag)}</td><td>${money(l.gesamtrueckzahlung)}</td><td>${money(l.offen)}</td><td>${rate?money(rate.betrag)+" · "+dateOnly(rate.faellig_am):"—"}</td><td>${esc(l.status||"Offen")}</td><td>${action}</td></tr>`;
        }).join(""):'<tr><td colspan="7">Keine Darlehen.</td></tr>';
    }

    function renderCashChecks() {
        const last=cashChecks[0];
        if(last){text("cashPortalBalance",money(last.portalstand));text("cashIngameBalance",money(last.ingame_stand));text("cashDifference",money(last.abweichung));text("cashcheckStatus",Math.abs(n(last.abweichung))<0.01?"Kassenabgleich stimmt überein.":"Abweichung festgestellt.");}
        const body=$("cashcheckTableBody");if(!body)return;
        body.innerHTML=cashChecks.length?cashChecks.map(x=>`<tr><td>${dateText(x.datum)}</td><td>${money(x.portalstand)}</td><td>${money(x.ingame_stand)}</td><td>${money(x.abweichung)}</td><td>${esc(x.erstellt_von_name||"—")}</td><td>${esc(x.notiz||"—")}</td></tr>`).join(""):'<tr><td colspan="6">Noch keine Kassenabgleiche vorhanden.</td></tr>';
    }

    function renderLogs(list=logs) {
        text("logCount",String(list.length));
        const today=new Date().toISOString().slice(0,10); text("logToday",String(list.filter(x=>String(x.datum||x.created_at||"").slice(0,10)===today).length));
        text("logChanges",String(list.filter(x=>["Geändert","Änderung","Kontrolle"].includes(x.aktion)).length));
        text("logCancellations",String(list.filter(x=>String(x.aktion||"").toLowerCase().includes("storn")).length));
        const body=$("logTableBody");if(!body)return;
        body.innerHTML=list.length?list.map(x=>`<tr><td>${dateText(x.datum||x.created_at)}</td><td>${esc(x.typ||"—")}</td><td>${esc(x.bereich||"—")}</td><td>${esc(x.beschreibung||JSON.stringify(x.neue_werte||{}))}</td><td>${esc(x.erstellt_von_name||"—")}</td><td>${esc(x.status||"OK")}</td></tr>`).join(""):'<tr><td colspan="6">Noch keine Aktivitäten vorhanden.</td></tr>';
    }
    function filterLogs(){
        const q=val("logSearch").toLowerCase(), type=val("logTypeFilter"), period=val("logPeriodFilter"); const now=new Date();
        renderLogs(logs.filter(x=>{
            const d=new Date(x.datum||x.created_at||0); const hay=JSON.stringify(x).toLowerCase();
            let periodOk=true;if(period==="day")periodOk=d.toISOString().slice(0,10)===now.toISOString().slice(0,10);if(period==="month")periodOk=d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();if(period==="year")periodOk=d.getFullYear()===now.getFullYear();
            return (!q||hay.includes(q))&&(!type||String(x.aktion||"")===type)&&periodOk;
        }));
    }
    window.filterLogs=filterLogs;

    async function log(area, action, reference, details={}, status="OK") {
        if(!db||!currentUser)return null;
        const payload={
            typ: area || "Buchhaltung",
            bereich: area || "Buchhaltung",
            aktion: action || "Unbekannt",
            beschreibung: reference ? `${reference} · ${JSON.stringify(details)}` : JSON.stringify(details),
            erstellt_von: currentUser.id,
            erstellt_von_name: currentEmployee?.name || currentUser.email || "—",
            datum: new Date().toISOString(),
            status,
            alte_werte: null,
            neue_werte: details || {}
        };
        const {data,error}=await db.from(T.logs).insert(payload).select().single();
        if(!error&&data)logs.unshift(data); else if(error)console.warn("Protokoll:",error.message);
        return data;
    }
    window.writeActivityLog=log;

    async function discord(payload) {
        if(!db||!currentUser)return {ok:false};
        try {
            const {data,error}=await db.functions.invoke(DISCORD_FUNCTION,{body:payload});
            if(error){text("discordStatus","Fehler");console.warn("Discord:",error);toast("Buchung gespeichert, Discord-Benachrichtigung konnte nicht gesendet werden.","error");return {ok:false,error};}
            text("discordStatus","Bereit");return {ok:true,data};
        } catch(error){text("discordStatus","Fehler");return {ok:false,error};}
    }

    function generateNumber(prefix){
        return `${prefix}-${String(Date.now()).slice(-8)}`;
    }

    function fillEmployeeSelects(){
        const list=employees.filter(e=>e.user_id||e.id);
        const payoutOptions=list.map(e=>`<option value="${esc(e.id)}">${esc(e.name||e.username||e.minecraft_name||"Mitarbeiter")}</option>`).join("");
        const payout=$("payoutEmployee");if(payout)payout.innerHTML='<option value="">Mitarbeiter auswählen</option>'+payoutOptions;
        const loan=$("loanMember");if(loan)loan.innerHTML='<option value="">Mitglied auswählen</option>'+list.filter(e=>["mitarbeiter","mitglied"].includes(String(e.rang||"").toLowerCase())).map(e=>`<option value="${esc(e.user_id||e.id)}">${esc(e.name||e.username||e.minecraft_name||"Mitglied")}</option>`).join("");
    }

    function fillWorkerSelect(){
        const old=$("workerName");if(!old)return;
        if(old.tagName.toLowerCase()==="select")return;
        const select=document.createElement("select");select.id="workerName";select.className=old.className;select.innerHTML='<option value="">Mitarbeiter auswählen</option>'+employees.map(e=>`<option value="${esc(e.id)}">${esc(e.name||e.username||e.minecraft_name||"Mitarbeiter")}</option>`).join("");
        old.replaceWith(select);
    }

    function renderWorkerList(){
        const box=$("workerList");if(!box)return;
        box.innerHTML=currentWorkers.length?currentWorkers.map((w,i)=>`<div class="worker-row"><span>${esc(w.name)}</span><span>${money(w.salary)}</span><button type="button" class="small-button" onclick="removeWorker(${i})">×</button></div>`).join(""):"<div class=\"empty-state\">Noch keine Arbeiter hinzugefügt.</div>";
        text("orderWorkerCount",String(currentWorkers.length));text("orderSalaryTotal",money(currentWorkers.reduce((s,w)=>s+n(w.salary),0)));
        const total=num("orderTotal"),clan=num("orderClanAmount"),salary=currentWorkers.reduce((s,w)=>s+n(w.salary),0);text("orderRemainingAmount",money(total-clan-salary));
        const warn=$("orderDistributionWarning");if(warn){warn.textContent=total-clan-salary<0?"Verteilung überschreitet den Gesamtbetrag.":"";}
    }
    window.removeWorker=i=>{currentWorkers.splice(i,1);renderWorkerList();};

    window.openOrderModal=()=>{if(!canManage()){toast("Keine Berechtigung.","error");return;}$("orderModal")?.classList.add("active");fillEmployeeSelects();fillWorkerSelect();};
    window.closeOrderModal=()=>$("orderModal")?.classList.remove("active");
    window.addWorkerRow=()=>{if(!canManage()){toast("Keine Berechtigung.","error");return;}$("workerModal")?.classList.add("active");fillWorkerSelect();};
    window.closeWorkerModal=()=>$("workerModal")?.classList.remove("active");
    window.saveWorker=()=>{
        const id=val("workerName");const e=employees.find(x=>String(x.id)===String(id));const salary=num("workerSalary");
        if(!e||salary<0){toast("Bitte Mitarbeiter und Gehalt auswählen.","error");return;}
        currentWorkers.push({employee_id:e.id,name:e.name||e.username||e.minecraft_name||"Mitarbeiter",salary,note:val("workerNote")||null});
        renderWorkerList();window.closeWorkerModal();
    };

    window.saveOrderSettlement=async()=>{
        if(!canManage()){toast("Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen erstellen.","error");return;}
        const number=val("orderNumber"), total=num("orderTotal"), clan=num("orderClanAmount"), salary=currentWorkers.reduce((s,w)=>s+n(w.salary),0);
        if(!number||total<=0||clan<0||clan>total||total-clan-salary<0){toast("Bitte die Auftragsverteilung prüfen.","error");return;}
        const payload={auftragsnummer:number,gesamtbetrag:total,clanbetrag:clan,gesamt_gehaelter:salary,status:val("orderStatus")||"Offen",datum:val("orderDate")||new Date().toISOString(),erstellt_von:currentUser?.id||null,erstellt_von_name:currentEmployee?.name||currentUser?.email||null,notiz:val("orderNote")||null};
        const {data,error}=await db.from(T.orders).insert(payload).select().single();if(error){toast(error.message,"error");return;}
        if(currentWorkers.length){const rows=currentWorkers.map(w=>({auftragsabrechnung_id:data.id,name:w.name,employee_id:w.employee_id,gehalt:n(w.salary),notiz:w.note||null}));const r=await db.from(T.workers).insert(rows).select();if(r.error){toast("Auftrag gespeichert, Arbeiter aber nicht: "+r.error.message,"error");return;}workers.push(...(r.data||[]));}
        orders.unshift(data);await log("Auftragsabrechnung","Erstellt",data.auftragsnummer,payload);currentWorkers=[];renderWorkerList();window.closeOrderModal();renderOrders();renderOverview();toast("Auftragsabrechnung gespeichert.","success");
    };

    window.openBookingModal=()=>{if(!currentUser){toast("Bitte zuerst anmelden.","error");return;}$("bookingModal")?.classList.add("active");fillEmployeeSelects();const b=$("bookingNumber");if(b)b.value=generateNumber("BK");const d=$("bookingDate");if(d)d.value=new Date().toISOString().slice(0,16);const from=$("bookingFrom"),to=$("bookingTo");if(from)from.value=currentEmployee?.name||currentUser?.email||"—";if(to)to.value="Clan-Kasse";};
    window.closeBookingModal=()=>$("bookingModal")?.classList.remove("active");

    window.saveBooking=async()=>{
        if(!currentUser){toast("Bitte zuerst anmelden.","error");return;}
        const type=val("bookingType")||"Einzahlung", amount=num("bookingAmount");if(amount<=0){toast("Bitte einen gültigen Betrag eingeben.","error");return;}
        const isIn=type==="Einzahlung";const from=isIn?(currentEmployee?.name||currentUser.email):"Clan-Kasse";const to=isIn?"Clan-Kasse":(val("bookingTo")||"Clan-Kasse");
        const payload={buchungsnummer:val("bookingNumber")||generateNumber("BK"),art:type,betrag:amount,von:from,an:to,zweck:val("bookingPurpose"),kategorie:val("bookingCategory"),auftragsnummer:val("bookingOrderNumber")||null};
        payload.zahlungsart=val("bookingPaymentMethod");
        payload.datum=val("bookingDate")||new Date().toISOString();payload.erstellt_von=currentUser.id;payload.erstellt_von_name=currentEmployee?.name||currentUser.email;payload.status=val("bookingStatus")||"Offen";payload.notiz=val("bookingNote")||null;
        const {data,error}=await db.from(T.bookings).insert(payload).select().single();if(error){toast(error.message,"error");return;}
        bookings.unshift(data);await log(isIn?"Einzahlungen":"Auszahlungen","Erstellt",data.buchungsnummer,payload);await discord({channel:isIn?"Einzahlungen":"Auszahlungen",title:isIn?"Neue Einzahlung":"Neue Auszahlung",type,purpose:payload.zweck,amount,from,to,createdBy:payload.erstellt_von_name,date:payload.datum,status:payload.status,note:payload.notiz});
        window.closeBookingModal();renderBookings();renderOverview();toast("Buchung gespeichert.","success");
    };

    window.saveIncomeEntry=async()=>{
        if(!isMitarbeiter()&&!isLeitung()){setStatus("incomeStatus","Keine Berechtigung.",false);return;}
        const amount=num("donationAmount"), purpose=val("incomePurpose"), type=val("incomeType")||"Sonstige Einnahme";if(amount<=0||!purpose){setStatus("incomeStatus","Betrag und Zweck sind erforderlich.",false);return;}
        if(type==="Spende" && currentEmployee?.id){
            const {data,error}=await db.from(T.donations).insert({mitarbeiter_id:currentUser.id,betrag:amount,zweck:purpose,erstellt_am:new Date().toISOString()}).select().single();if(error){setStatus("incomeStatus",error.message,false);return;}donations.unshift(data);
            await discord({channel:"Einzahlungen",title:"Neue Clan-Spende",type:"Spende",amount,purpose,from:currentEmployee?.name||currentUser.email,to:"Clan-Kasse",createdBy:currentEmployee?.name||currentUser.email,date:data.erstellt_am});
        }else{
            // Fallback ohne Employee-Datensatz: als normale Einzahlung verbuchen.
            // So bleibt die Schaltfläche nutzbar; die Authentifizierung/RLS bleibt aktiv.

            const payload={buchungsnummer:generateNumber("BK"),art:"Einzahlung",betrag:amount,von:currentEmployee?.name||currentUser.email,an:"Clan-Kasse",zweck:purpose,kategorie:type,auftragsnummer:null,zahlungsart:"Portal",datum:new Date().toISOString(),erstellt_von:currentUser.id,erstellt_von_name:currentEmployee?.name||currentUser.email,status:"Bezahlt",notiz:val("incomeNote")||null};
            const {data,error}=await db.from(T.bookings).insert(payload).select().single();if(error){setStatus("incomeStatus",error.message,false);return;}bookings.unshift(data);await log("Einzahlungen","Erstellt",data.buchungsnummer,payload);await discord({channel:"Einzahlungen",title:"Neue Einzahlung",type,amount,purpose,from:payload.von,to:payload.an,createdBy:payload.erstellt_von_name,date:payload.datum,note:payload.notiz});
        }
        setStatus("incomeStatus","Einnahme gespeichert.");renderIncome();renderOverview();
    };

    window.savePayoutEntry=async()=>{
        if(!isLeitung()){setStatus("payoutStatus","Nur Leitung und Stadtleitung dürfen Auszahlungen erfassen.",false);return;}
        const type=val("payoutType")||"Sonstige Ausgabe", amount=num("payoutAmount"), emp=val("payoutEmployee");if(amount<=0){setStatus("payoutStatus","Bitte einen gültigen Betrag eingeben.",false);return;}if(type==="Monatsgehalt"&&!emp){setStatus("payoutStatus","Bitte einen Mitarbeiter wählen.",false);return;}if(amount>overview().cash){setStatus("payoutStatus","Auszahlung überschreitet den Clanstand.",false);return;}
        const payload={mitarbeiter_id:emp||null,typ:type,betrag:amount,beschreibung:val("payoutPurpose")||type,monat:val("payoutMonth")||null,erstellt_am:new Date().toISOString()};const {data,error}=await db.from(T.payouts).insert(payload).select().single();if(error){setStatus("payoutStatus",error.message,false);return;}payouts.unshift(data);await log("Auszahlungen","Erstellt",data.id,payload);await discord({channel:"Auszahlungen",title:"Neue Auszahlung",type,amount,to:employeeName(emp),purpose:payload.beschreibung,createdBy:currentEmployee?.name||currentUser.email,date:payload.erstellt_am});setStatus("payoutStatus","Auszahlung gespeichert.");renderPayouts();renderOverview();
    };

    window.openSavingsModal=type=>{if(!canManage()){toast("Nur Leitung und Stadtleitung dürfen Sparkonto-Buchungen erstellen.","error");return;}$("savingsModal")?.classList.add("active");const t=$("savingsType");if(t)t.value=type||"Einzahlung";const d=$("savingsDate");if(d)d.value=new Date().toISOString().slice(0,16);const numEl=$("savingsNumber");if(numEl)numEl.value=generateNumber("SP");};
    window.closeSavingsModal=()=>$("savingsModal")?.classList.remove("active");
    window.saveSavingsTransaction=async()=>{
        if(!canManage()){toast("Keine Berechtigung.","error");return;}
        const type=val("savingsType")||"Einzahlung", amount=num("savingsAmount"), purpose=val("savingsPurpose");if(amount<=0||!purpose){toast("Betrag und Zweck sind erforderlich.","error");return;}if(type==="Auszahlung"&&amount>savingsBalance()){toast("Das Sparkonto reicht für diese Auszahlung nicht aus.","error");return;}
        const payload={buchungsnummer:val("savingsNumber")||generateNumber("SP"),art:type,betrag:amount,von:val("savingsFrom")||currentEmployee?.name||currentUser?.email||"—",an:val("savingsTo")||"Sparkonto",zweck:purpose,datum:val("savingsDate")||new Date().toISOString(),erstellt_von:currentUser.id,erstellt_von_name:currentEmployee?.name||currentUser.email,notiz:val("savingsNote")||null};
        const {data,error}=await db.from(T.savings).insert(payload).select().single();if(error){toast(error.message,"error");return;}savings.push(data);await log("Sparkonto","Erstellt",data.buchungsnummer,payload);await discord({channel:type==="Einzahlung"?"Einzahlungen":"Auszahlungen",title:`Sparkonto ${type}`,type:`Sparkonto ${type}`,amount,from:payload.von,to:payload.an,purpose,createdBy:payload.erstellt_von_name,date:payload.datum,note:payload.notiz});window.closeSavingsModal();renderSavings();renderOverview();toast("Sparkonto-Buchung gespeichert.","success");
    };

    window.saveSavingsGoal=async()=>{
        if(!canManage()){toast("Keine Berechtigung.","error");return;}const value=Math.max(0,Number(String(val("savingsGoal")).replace(",","."))||0);savingsGoal=value;
        if(currentUser) await log("Sparkonto","Sparziel","",{goal:value});renderSavings();toast("Sparziel gespeichert.","success");
    };

    window.saveCashCheck=async()=>{
        if(!canManage()){toast("Keine Berechtigung.","error");return;}
        const portal=num("cashPortalInput"), ingame=num("cashIngameInput"), diff=portal-ingame;const payload={portalstand:portal,ingame_stand:ingame,abweichung:diff,datum:val("cashCheckDate")||new Date().toISOString(),erstellt_von:currentUser.id,erstellt_von_name:currentEmployee?.name||currentUser.email,notiz:val("cashCheckNote")||null};const {data,error}=await db.from(T.cash).insert(payload).select().single();if(error){toast(error.message,"error");return;}cashChecks.unshift(data);await log("Kontrolle","Kassenabgleich",data.id,payload);$("cashCheckModal")?.classList.remove("active");renderCashChecks();toast("Kassenabgleich gespeichert.","success");
    };
    window.openCashCheck=()=>{if(!canManage()){toast("Keine Berechtigung.","error");return;}$("cashCheckModal")?.classList.add("active");};
    window.closeCashCheck=()=>$("cashCheckModal")?.classList.remove("active");
    window.closeLogDetail=()=>$("logDetailModal")?.classList.remove("active");

    window.saveLoan=async()=>{
        if(!isStadt()){setStatus("loanStatus","Nur Stadtleitung kann Darlehen genehmigen.",false);return;}
        const member=val("loanMember"), amount=num("loanAmount"), interest=num("loanInterest"), mode=val("loanMode")||"einmalig", installment=num("loanInstallment"), first=val("loanFirstDue");if(!member||amount<=0||interest<0||interest>30){setStatus("loanStatus","Mitglied, Betrag und Zinssatz prüfen.",false);return;}if(mode==="woechentlich"&&installment<=0){setStatus("loanStatus","Bitte einen Ratenbetrag angeben.",false);return;}if(amount>overview().cash){setStatus("loanStatus","Das Darlehen überschreitet den Clanstand.",false);return;}
        const total=amount+amount*interest/100;let due=first?new Date(first+"T12:00:00"):new Date(Date.now()+7*86400000);const count=mode==="woechentlich"?Math.ceil(total/installment):1;const payload={mitglied_id:member,originalbetrag:amount,zinssatz:interest,zinsbetrag:amount*interest/100,gesamtrueckzahlung:total,rueckzahlungsart:mode,ratenbetrag:mode==="woechentlich"?installment:total,anzahl_raten:count,bereits_gezahlt:0,offen:total,naechste_rate_am:due.toISOString(),mahnungen:0,status:"Offen",genehmigt_von:currentUser.id,genehmigt_am:new Date().toISOString(),erstellt_am:new Date().toISOString()};
        const {data,error}=await db.from(T.loans).insert(payload).select().single();if(error){setStatus("loanStatus",error.message,false);return;}loans.unshift(data);const rows=[];let rem=total;for(let i=1;i<=count;i++){const amountRate=mode==="woechentlich"?Math.min(installment,rem):rem;rows.push({darlehen_id:data.id,raten_nummer:i,betrag:amountRate,faellig_am:due.toISOString(),status:"Offen"});rem-=amountRate;if(mode==="woechentlich")due=new Date(due.getTime()+7*86400000);}if(rows.length){const r=await db.from(T.rates).insert(rows).select();if(r.error){setStatus("loanStatus","Darlehen gespeichert, Raten aber nicht: "+r.error.message,false);return;}rates.push(...(r.data||[]));}await log("Geldverleih","Darlehen genehmigt",data.id,payload);await discord({channel:"Geldverleih",title:"Darlehen genehmigt",type:"Darlehen",amount,from:"Clan",to:employeeName(member),purpose:"Genehmigt und ausgezahlt",createdBy:currentEmployee?.name||currentUser.email,date:payload.genehmigt_am});setStatus("loanStatus","Darlehen gespeichert.");renderLoans();renderOverview();
    };

    window.payLoanRate=async id=>{
        const loan=loans.find(x=>String(x.id)===String(id));if(!loan)return;const rate=rates.filter(r=>String(r.darlehen_id)===String(id)&&String(r.status||"").toLowerCase()!=="bezahlt").sort((a,b)=>new Date(a.faellig_am)-new Date(b.faellig_am))[0];if(!rate){toast("Keine offene Rate gefunden.","error");return;}if(!(isLeitung()||(isMitarbeiter()&&String(loan.mitglied_id)===String(currentUser?.id)))){toast("Keine Berechtigung für diese Rate.","error");return;}
        const now=new Date().toISOString();const amount=n(rate.betrag);const r=await db.from(T.rates).update({status:"Bezahlt",bezahlt_am:now,eingezahlt_von:currentUser.id}).eq("id",rate.id);if(r.error){toast(r.error.message,"error");return;}rate.status="Bezahlt";const paid=n(loan.bereits_gezahlt)+amount;const open=Math.max(0,n(loan.gesamtrueckzahlung)-paid);const next=rates.filter(x=>String(x.darlehen_id)===String(id)&&String(x.status||"").toLowerCase()!=="bezahlt").sort((a,b)=>new Date(a.faellig_am)-new Date(b.faellig_am))[0];const status=open<=0.005?"Abgeschlossen":"Offen";const u=await db.from(T.loans).update({bereits_gezahlt:paid,offen:open,naechste_rate_am:next?.faellig_am||null,status,abgeschlossen_am:status==="Abgeschlossen"?now:null}).eq("id",id);if(u.error){toast(u.error.message,"error");return;}Object.assign(loan,{bereits_gezahlt:paid,offen:open,naechste_rate_am:next?.faellig_am||null,status});await log("Geldverleih","Rate eingezahlt",id,{betrag:amount,rate:rate.raten_nummer});await discord({channel:"Geldverleih",title:"Darlehensrate eingezahlt",type:"Darlehensrate",amount,from:employeeName(loan.mitglied_id),to:"Clan",purpose:"Rate eingezahlt",createdBy:currentEmployee?.name||currentUser.email,date:now});renderLoans();renderOverview();toast("Rate gespeichert.","success");
    };

    window.runFinancialControl=()=>{
        const d=overview();const warnings=[];
        if(d.cash<0)warnings.push("Der aktuelle Clanstand ist negativ.");if(d.savings<0)warnings.push("Das Sparkonto ist negativ.");if(d.openOrders>0)warnings.push("Es gibt offene Auftragsabrechnungen.");
        const box=$("warningList");if(box)box.innerHTML=warnings.length?warnings.map(x=>`<div class="no-warning"><strong>⚠ ${esc(x)}</strong></div>`).join(""):"<div class=\"no-warning\"><strong>✓ Keine Warnungen</strong><p>Aktuell wurden keine auffälligen Buchungen gefunden.</p></div>";
        const setCard=(id,title)=>{const e=$(id);if(e){const s=e.querySelector("strong:last-child");if(s)s.textContent=title;}};setCard("controlCash",d.cash>=0?"Bestand gültig":"Negativer Bestand");setCard("controlOrders",d.openOrders>0?"Offene Aufträge":"Keine offenen Beträge");setCard("controlPayouts",d.withdrawals<=d.grossRevenue?"Keine Überschreitung":"Prüfen");setCard("controlSavings",d.savings>=0?"Bestand gültig":"Negativer Bestand");setCard("controlData","Keine Fehler");setCard("controlRights",currentUser?"Zugriff geschützt":"Nicht angemeldet");text("lastControlDate",dateText(new Date()));text("controlStatus",warnings.length?"Kontrolle abgeschlossen – Warnungen vorhanden":"Kontrolle abgeschlossen – keine Warnungen");if(currentUser)log("Kontrolle","Kontrolle",null,{warnings});
    };

    window.updateMonthlyBalance=()=>{
        const period=val("monthlyPeriod");if(!period){text("monthlyLabel","Kein Monat ausgewählt");return;}const start=period+"-01", d=new Date(start+"T00:00:00"), next=new Date(d.getFullYear(),d.getMonth()+1,1);const inRows=bookings.filter(x=>x.art==="Einzahlung"&&new Date(x.datum)>=d&&new Date(x.datum)<next);const outRows=bookings.filter(x=>x.art==="Auszahlung"&&new Date(x.datum)>=d&&new Date(x.datum)<next);const wageRows=payouts.filter(x=>x.typ==="Monatsgehalt"&&new Date(x.erstellt_am)>=d&&new Date(x.erstellt_am)<next);const inc=inRows.reduce((s,x)=>s+n(x.betrag),0)+donations.filter(x=>new Date(x.erstellt_am)>=d&&new Date(x.erstellt_am)<next).reduce((s,x)=>s+n(x.betrag),0);const exp=outRows.reduce((s,x)=>s+n(x.betrag),0)+payouts.filter(x=>x.typ!=="Monatsgehalt"&&new Date(x.erstellt_am)>=d&&new Date(x.erstellt_am)<next).reduce((s,x)=>s+n(x.betrag),0)+wageRows.reduce((s,x)=>s+n(x.betrag),0);text("monthlyIncome",money(inc));text("monthlyExpenses",money(exp));text("monthlyWages",money(wageRows.reduce((s,x)=>s+n(x.betrag),0)));text("monthlyChange",money(inc-exp));text("monthlyLabel",d.toLocaleDateString("de-DE",{month:"long",year:"numeric"}));text("monthlyBookingCount",String(inRows.length+outRows.length));
    };

    window.reloadBookkeepingPage=async()=>{await loadAll();renderAll();toast("Buchhaltung aktualisiert.","success");};

    function renderAll(){
        renderTop();renderOverview();renderBookings();renderIncome();renderPayouts();renderOrders();renderSavings();renderEmployees();renderLoans();renderCashChecks();renderLogs();fillEmployeeSelects();fillWorkerSelect();renderWorkerList();
        const month=$("monthlyPeriod");
        if(month && !month.value) month.value = new Date().toISOString().slice(0,7);
        if(month) window.updateMonthlyBalance();
        if(typeof window.drawFinanceChart === "function") requestAnimationFrame(window.drawFinanceChart);
    }

    async function init(){
        // Sofort sichtbaren Zustand setzen – die Seite darf nie dauerhaft auf
        // „Wird geladen…“ stehen, nur weil eine optionale Abfrage langsam ist.
        text("bookkeepingStatus", "Wird geladen…");
        text("connectionStatus", "Verbinde…");
        text("discordStatus", "Bereit");

        try{
            db = await getClient();
            text("connectionStatus", "Verbunden");
            await loadSession();
            renderTop();

            // Mitarbeiter und Profil separat laden. Ein Fehler hier darf die
            // restliche Buchhaltung nicht blockieren.
            try { await loadEmployee(); }
            catch(e) { console.warn("Mitarbeiter/Profil:", e); }
            renderTop();

            await loadAll();
            renderAll();
            renderTop();
            drawFinanceChart();

            if(!currentUser){
                setStatus("bookkeepingStatus", "Nicht angemeldet", false);
                text("discordStatus", "Anmeldung erforderlich");
            } else if(!currentEmployee){
                setStatus("bookkeepingStatus", "Kein Mitarbeiterdatensatz", false);
                text("discordStatus", "Mitarbeiter erforderlich");
            } else {
                setStatus("bookkeepingStatus", "Bereit");
                text("discordStatus", "Bereit");
            }
        }catch(error){
            console.error("Clan-Buchhaltung:", error);
            text("connectionStatus", db ? "Verbunden" : "Fehler");
            text("discordStatus", currentUser ? "Bereit" : "Anmeldung erforderlich");
            setStatus("bookkeepingStatus", currentUser ? "Daten konnten teilweise nicht geladen werden" : "Anmeldung erforderlich", false);
            toast(error.message || "Buchhaltung konnte nicht geladen werden.", "error");
        }
    }

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", init, {once:true});
    }else{
        init();
    }

})();
