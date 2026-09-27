/*
 * EHRENMARKT – CLAN-BUCHHALTUNG
 * Komplett neu aufgebautes Frontend-JavaScript.
 * Wichtig: Es wird ausschließlich der zentrale Supabase-Client aus ../supabase.js verwendet.
 * Es wird KEIN eigener Supabase-Client und KEIN eigener storageKey erzeugt.
 */
(() => {
  "use strict";

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
  let lastLoadErrors = [];
  let currentWorkers = [];
  let savingsGoal = 0;

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

  const $ = id => document.getElementById(id);
  const val = id => String($(id)?.value ?? "").trim();
  const num = id => {
    const raw = String($(id)?.value ?? "").trim().replace(/\./g, "").replace(",", ".");
    const x = Number(raw);
    return Number.isFinite(x) ? x : 0;
  };
  const n = x => {
    const v = Number(x);
    return Number.isFinite(v) ? v : 0;
  };
  const money = x => `${n(x).toLocaleString("de-DE")} $`;
  const esc = x => String(x ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const dateText = x => {
    if (!x) return "—";
    const d = new Date(x);
    return Number.isNaN(d.getTime()) ? String(x) : d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  };
  const dateOnly = x => {
    if (!x) return "—";
    const d = new Date(x);
    return Number.isNaN(d.getTime()) ? String(x) : d.toLocaleDateString("de-DE");
  };
  const lower = x => String(x ?? "").trim().toLowerCase();

  function toast(message, type = "info") {
    let box = $("buchhaltungToast");
    if (!box) {
      box = document.createElement("div");
      box.id = "buchhaltungToast";
      box.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:999999;max-width:92%;padding:13px 18px;border:1px solid rgba(212,175,55,.45);border-radius:10px;background:rgba(8,8,8,.96);box-shadow:0 12px 35px rgba(0,0,0,.5);color:#fff;font-weight:600;text-align:center;opacity:0;transition:opacity .2s";
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.style.borderColor = type === "error" ? "rgba(217,92,92,.8)" : type === "success" ? "rgba(86,200,120,.8)" : "rgba(212,175,55,.55)";
    box.style.opacity = "1";
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.style.opacity = "0", 4000);
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

  function setText(id, value) {
    const e = $(id);
    if (e) e.textContent = value ?? "";
  }

  function resetState() {
    bookings = []; savings = []; employees = []; orders = []; workers = [];
    payouts = []; donations = []; loans = []; rates = []; warnings = [];
    cashChecks = []; logs = [];
    savingsGoal = 0;
    lastLoadErrors = [];
  }

  // ---------------------------------------------------------------------------
  // Supabase: NUR der bereits von Ehrenmarkt erzeugte Client.
  // ---------------------------------------------------------------------------
  async function getClient() {
    if (db?.from && db?.auth) return db;

    if (window.supabaseClient?.from && window.supabaseClient?.auth) {
      db = window.supabaseClient;
      return db;
    }

    // supabase.js wird im HTML vor diesem Skript geladen. Falls der Browser
    // einen Moment braucht, warten wir kurz statt einen zweiten Client zu bauen.
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (window.supabaseClient?.from && window.supabaseClient?.auth) {
        db = window.supabaseClient;
        return db;
      }
    }

    throw new Error("Der zentrale Ehrenmarkt-Supabase-Client wurde nicht gefunden. Bitte ../supabase.js prüfen.");
  }

  async function loadSession() {
    const client = await getClient();
    const result = await client.auth.getSession();
    if (result.error) throw new Error(`Login-Session konnte nicht gelesen werden: ${result.error.message}`);
    currentUser = result.data?.session?.user || null;
    return currentUser;
  }

  // ---------------------------------------------------------------------------
  // Daten laden: kein .order() im SQL-Request. Sortierung passiert lokal.
  // Dadurch kann eine fehlende/abweichende Order-Spalte nicht mehr die Tabelle
  // komplett aus dem Laden werfen.
  // ---------------------------------------------------------------------------
  async function readTable(name) {
    try {
      const { data, error } = await db.from(name).select("*");
      if (error) {
        lastLoadErrors.push(`${name}: ${error.message}`);
        console.error("Buchhaltung Tabelle", name, error);
        return { data: [], error };
      }
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (error) {
      lastLoadErrors.push(`${name}: ${error?.message || error}`);
      console.error("Buchhaltung Tabelle", name, error);
      return { data: [], error };
    }
  }

  function sortNewest(rows, fields) {
    return [...rows].sort((a, b) => {
      const av = fields.map(k => a?.[k]).find(v => v != null) ?? "";
      const bv = fields.map(k => b?.[k]).find(v => v != null) ?? "";
      return new Date(bv || 0).getTime() - new Date(av || 0).getTime();
    });
  }

  async function loadAll() {
    lastLoadErrors = [];
    const names = [
      T.bookings, T.savings, T.employees, T.orders, T.workers,
      T.payouts, T.donations, T.loans, T.rates, T.warnings, T.cash, T.logs
    ];
    const results = await Promise.all(names.map(readTable));

    bookings = sortNewest(results[0].data, ["datum", "created_at"]);
    savings = sortNewest(results[1].data, ["datum", "created_at"]);
    employees = [...results[2].data].sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), "de"));
    orders = sortNewest(results[3].data, ["datum", "created_at"]);
    workers = sortNewest(results[4].data, ["created_at", "erstellt_am", "datum"]);
    payouts = sortNewest(results[5].data, ["erstellt_am", "datum", "created_at"]);
    donations = sortNewest(results[6].data, ["erstellt_am", "datum", "created_at"]);
    loans = sortNewest(results[7].data, ["erstellt_am", "datum", "created_at"]);
    rates = sortNewest(results[8].data, ["erstellt_am", "faellig_am", "created_at"]);
    warnings = sortNewest(results[9].data, ["erstellt_am", "datum", "created_at"]);
    cashChecks = sortNewest(results[10].data, ["datum", "created_at"]);
    logs = sortNewest(results[11].data, ["datum", "created_at"]);

    if (currentUser?.id) {
      currentEmployee = employees.find(e => String(e?.user_id || "").toLowerCase() === String(currentUser.id).toLowerCase()) || null;
    } else {
      currentEmployee = null;
    }

    const goalLog = logs.find(x => lower(x?.typ) === "sparkonto" && lower(x?.aktion) === "sparziel");
    savingsGoal = n(goalLog?.neue_werte?.goal);

    console.log("Ehrenmarkt Buchhaltung geladen", {
      user: currentUser?.email || null,
      employee: currentEmployee?.name || null,
      rows: {
        bookings: bookings.length, savings: savings.length, employees: employees.length,
        orders: orders.length, workers: workers.length, payouts: payouts.length,
        donations: donations.length, loans: loans.length, rates: rates.length,
        warnings: warnings.length, cash: cashChecks.length, logs: logs.length
      },
      errors: lastLoadErrors
    });

    return lastLoadErrors;
  }

  // ---------------------------------------------------------------------------
  // Rechte / Hilfsfunktionen
  // ---------------------------------------------------------------------------
  function rank() { return lower(currentEmployee?.rang); }
  function isStadt() { return rank() === "stadtleitung"; }
  function isLeitung() { return isStadt() || rank() === "leitung"; }
  function isMitarbeiter() { return rank() === "mitarbeiter" || rank() === "mitglied"; }
  function canManage() { return isLeitung(); }

  function employeeById(id) {
    return employees.find(e => String(e?.id) === String(id) || String(e?.user_id) === String(id)) || null;
  }
  function employeeName(id) {
    const e = employeeById(id);
    return e?.name || e?.username || e?.minecraft_name || "—";
  }

  function isPaidStatus(value) {
    return ["bezahlt", "abgeschlossen", "geschlossen", "erledigt", "completed", "paid"].includes(lower(value));
  }
  function orderPaid(o) { return isPaidStatus(o?.status); }
  function loanPaid(o) { return isPaidStatus(o?.status); }
  function grossOrder(o) { return n(o?.gesamtbetrag); }
  function clanOrder(o) { return n(o?.clanbetrag); }
  function bookingIn() { return bookings.filter(x => lower(x?.art) === "einzahlung").reduce((s, x) => s + n(x?.betrag), 0); }
  function bookingOut() { return bookings.filter(x => lower(x?.art) === "auszahlung").reduce((s, x) => s + n(x?.betrag), 0); }
  function savingsIn() { return savings.filter(x => lower(x?.art) === "einzahlung").reduce((s, x) => s + n(x?.betrag), 0); }
  function savingsOut() { return savings.filter(x => lower(x?.art) === "auszahlung").reduce((s, x) => s + n(x?.betrag), 0); }
  function savingsBalance() { return savingsIn() - savingsOut(); }
  function orderWages() { return workers.reduce((s, x) => s + n(x?.gehalt), 0); }
  function monthlyWages() { return payouts.filter(x => lower(x?.typ) === "monatsgehalt").reduce((s, x) => s + n(x?.betrag), 0); }
  function otherPayouts() { return payouts.filter(x => lower(x?.typ) !== "monatsgehalt").reduce((s, x) => s + n(x?.betrag), 0); }
  function paidLoanRates() { return rates.filter(x => isPaidStatus(x?.status)).reduce((s, x) => s + n(x?.betrag), 0); }
  function openLoansAmount() { return loans.filter(x => !loanPaid(x)).reduce((s, x) => s + n(x?.offen), 0); }

  function overview() {
    const orderRevenue = orders.filter(o => lower(o?.status) !== "storniert").reduce((s, o) => s + grossOrder(o), 0);
    const paidClan = orders.filter(orderPaid).reduce((s, o) => s + clanOrder(o), 0);
    const donationTotal = donations.reduce((s, x) => s + n(x?.betrag), 0);
    const income = bookingIn() + donationTotal + paidLoanRates();
    const expenses = bookingOut() + monthlyWages() + otherPayouts();
    const savings = savingsBalance();

    // Der aktuelle Clanstand ist das tatsächlich vorhandene Clanvermögen
    // inklusive Sparkonto. Auszahlungen verringern ihn.
    const cashWithoutSavings = paidClan + income - expenses;
    const currentBalance = cashWithoutSavings + savings;

    const openOrders = orders.filter(o => !orderPaid(o) && lower(o?.status) !== "storniert").reduce((s, o) => s + grossOrder(o), 0);
    const openRateCount = rates.filter(r => !isPaidStatus(r?.status)).length;

    // Gesamtvermögen = aktueller Bestand + bereits aus dem Clan abgeflossene
    // Gelder, die historisch zum Clanvermögen gehört haben. Dadurch fällt
    // dieser Wert bei einer Auszahlung nicht wieder ab.
    const historicalOutflows = orderWages() + expenses + savingsOut();
    const totalAssets = currentBalance + historicalOutflows;

    return {
      grossRevenue: orderRevenue + income,
      deposits: bookingIn() + donationTotal,
      withdrawals: expenses,
      wages: orderWages() + monthlyWages(),
      clanExpenses: orderWages() + expenses,
      savings,
      cash: currentBalance,
      assets: totalAssets,
      openOrders,
      openLoans: openLoansAmount(),
      openRateCount,
      openRateSum: openLoansAmount(),
      bookings: bookings.length,
      orders: orders.length,
      dueInterest: loans.filter(x => !loanPaid(x)).reduce((s, x) => s + Math.max(0, n(x?.zinsbetrag) - n(x?.bereits_gezahlt)), 0),
      lateFees: warnings.reduce((s, x) => s + n(x?.mahngebuehr), 0)
    };
  }

  // ---------------------------------------------------------------------------
  // Anzeige
  // ---------------------------------------------------------------------------
  function renderTop() {
    setText("currentUserName", currentUser ? (currentEmployee?.name || currentUser.email || "—") : "Nicht angemeldet");
    setText("currentUserRank", currentEmployee?.rang || "Nicht verknüpft");
    if (!currentUser) setStatus("bookkeepingStatus", "Anmeldung erforderlich", false);
    else if (!currentEmployee) setStatus("bookkeepingStatus", "Mitarbeiterdatensatz nicht verknüpft", false);
    else setStatus("bookkeepingStatus", isStadt() ? "Stadtleitung" : isLeitung() ? "Leitung" : isMitarbeiter() ? "Mitarbeiter" : "Keine Mitarbeiterberechtigung", true);
    setText("connectionStatus", db ? "Verbunden" : "Fehler");
    setText("discordStatus", currentUser ? "Bereit" : "Anmeldung erforderlich");
  }

  function renderOverview() {
    const d = overview();
    setText("currentClanBalance", money(d.cash));
    setText("totalRevenue", money(d.grossRevenue));
    setText("totalDeposits", money(d.deposits));
    setText("totalWithdrawals", money(d.withdrawals));
    setText("totalWages", money(d.wages));
    setText("totalClanExpenses", money(d.clanExpenses));
    setText("totalSavings", money(d.savings));
    setText("openRateCount", String(d.openRateCount));
    setText("openRateSum", money(d.openRateSum));
    // Rückwärtskompatibel für eventuell vorhandene Elemente.
    setText("openAmount", money(d.openRateSum));
    setText("totalBookings", String(d.bookings));
    setText("totalAssets", money(d.assets));
    setText("overviewDeposits", money(d.deposits));
    setText("overviewWithdrawals", money(d.withdrawals));
    setText("overviewBookings", String(d.bookings));
    setText("overviewOrders", String(d.orders));
    setText("totalIncome", money(d.grossRevenue));
    setText("totalExpenses", money(d.withdrawals));
    setText("historicalRevenue", money(d.grossRevenue));
    setText("historicalRevenueInfo", money(d.grossRevenue));
    setText("v1Overdue", money(d.lateFees));
    window.bookkeepingChartData = {
      labels: ["Aktuell"], income: [d.grossRevenue], payouts: [d.withdrawals], wages: [d.wages],
      donations: [d.deposits], savings: [d.savings], otherIncome: [0], otherExpense: [0]
    };
    if (typeof window.drawFinanceChart === "function") requestAnimationFrame(window.drawFinanceChart);
  }

  function renderBookings(list = bookings) {
    const body = $("bookingTableBody");
    if (!body) return;
    const inc = list.filter(x => lower(x?.art) === "einzahlung").reduce((s, x) => s + n(x?.betrag), 0);
    const out = list.filter(x => lower(x?.art) === "auszahlung").reduce((s, x) => s + n(x?.betrag), 0);
    setText("bookingIncome", money(inc)); setText("bookingExpense", money(out)); setText("bookingNet", money(inc - out)); setText("bookingCount", String(list.length));
    body.innerHTML = list.length ? list.map(x => `<tr>
      <td>${esc(x?.buchungsnummer || "—")}</td><td>${esc(x?.art || "—")}</td><td>${money(x?.betrag)}</td>
      <td>${esc(x?.von || "—")}</td><td>${esc(x?.an || "—")}</td><td>${esc(x?.zweck || "—")}</td>
      <td>${esc(x?.kategorie || "—")}</td><td>${esc(x?.auftragsnummer || "—")}</td><td>${esc(x?.zahlungsart || "—")}</td>
      <td>${dateText(x?.datum)}</td><td>${esc(x?.erstellt_von_name || "—")}</td><td>${esc(x?.status || "Offen")}</td>
    </tr>`).join("") : '<tr class="empty-row"><td colspan="12">Noch keine Buchungen vorhanden.</td></tr>';
  }
  function filterBookings() {
    const q = lower(val("bookingSearch")), type = val("bookingTypeFilter"), cat = val("bookingCategoryFilter");
    renderBookings(bookings.filter(x => (!q || JSON.stringify(x).toLowerCase().includes(q)) && (!type || x?.art === type) && (!cat || x?.kategorie === cat)));
  }
  window.filterBookings = filterBookings;

  function renderIncome() {
    const body = $("incomeTableBody"); if (!body) return;
    const rows = [
      ...bookings.filter(x => x?.art === "Einzahlung").map(x => ({ date: x.datum, type: x.kategorie || "Einzahlung", amount: x.betrag, from: x.von, purpose: x.zweck })),
      ...donations.map(x => ({ date: x.erstellt_am, type: "Spende", amount: x.betrag, from: employeeName(x.mitarbeiter_id), purpose: x.zweck }))
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    body.innerHTML = rows.length ? rows.map(x => `<tr><td>${dateText(x.date)}</td><td>${esc(x.type)}</td><td>${money(x.amount)}</td><td>${esc(x.from || "—")}</td><td>${esc(x.purpose || "—")}</td></tr>`).join("") : '<tr><td colspan="5">Noch keine Einnahmen.</td></tr>';
  }

  function renderPayouts() {
    const body = $("payoutTableBody"); if (!body) return;
    body.innerHTML = payouts.length ? payouts.map(x => `<tr><td>${dateText(x.erstellt_am)}</td><td>${esc(x.typ || "—")}</td><td>${esc(employeeName(x.mitarbeiter_id))}</td><td>${money(x.betrag)}</td><td>${esc(x.beschreibung || x.typ || "—")}</td></tr>`).join("") : '<tr><td colspan="5">Noch keine Auszahlungen.</td></tr>';
  }

  function renderOrders(list = orders) {
    const body = $("orderTableBody"); if (!body) return;
    setText("orderCount", String(list.length));
    setText("orderTotalSum", money(list.reduce((s, x) => s + grossOrder(x), 0)));
    setText("orderClanSum", money(list.reduce((s, x) => s + clanOrder(x), 0)));
    setText("orderSalarySum", money(list.reduce((sum, o) => sum + workers.filter(w => String(w?.auftragsabrechnung_id) === String(o?.id)).reduce((s, w) => s + n(w?.gehalt), 0), 0)));
    setText("orderOpenSum", money(list.filter(x => !orderPaid(x) && lower(x?.status) !== "storniert").reduce((s, x) => s + grossOrder(x), 0)));
    body.innerHTML = list.length ? list.map(o => {
      const ws = workers.filter(w => String(w?.auftragsabrechnung_id) === String(o?.id));
      const salary = ws.reduce((s, w) => s + n(w?.gehalt), 0);
      return `<tr><td>${esc(o?.auftragsnummer || "—")}</td><td>${money(o?.gesamtbetrag)}</td><td>${money(o?.clanbetrag)}</td><td>${ws.length ? ws.map(w => esc(w?.name || employeeName(w?.employee_id))).join(", ") : "—"}</td><td>${money(salary || o?.gesamt_gehaelter)}</td><td>${esc(o?.status || "Offen")}</td><td>${esc(o?.erstellt_von_name || "—")}</td><td>${dateText(o?.datum)}</td><td>—</td></tr>`;
    }).join("") : '<tr><td colspan="9">Noch keine Auftragsabrechnungen vorhanden.</td></tr>';
  }
  function filterOrders() {
    const q = lower(val("orderSearch")), status = val("orderStatusFilter"), period = val("orderDateFilter"), now = new Date();
    renderOrders(orders.filter(o => {
      const d = new Date(o?.datum || 0);
      const qok = !q || JSON.stringify(o).toLowerCase().includes(q);
      const sok = !status || o?.status === status;
      let dok = true;
      if (period === "Heute") dok = d.toDateString() === now.toDateString();
      if (period === "Dieser Monat") dok = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (period === "Dieses Jahr") dok = d.getFullYear() === now.getFullYear();
      return qok && sok && dok;
    }));
  }
  window.filterOrders = filterOrders;

  function renderSavings() {
    const bal = savingsBalance();
    setText("savingsBalance", money(bal)); setText("savingsCurrent", money(bal)); setText("savingsDeposits", money(savingsIn())); setText("savingsWithdrawals", money(savingsOut())); setText("savingsTransactionCount", String(savings.length)); setText("savingsGoalDisplay", money(savingsGoal));
    const pct = savingsGoal > 0 ? Math.min(100, Math.max(0, bal / savingsGoal * 100)) : 0;
    const bar = $("savingsProgress"); if (bar) bar.style.width = `${pct}%`;
    setText("savingsProgressText", `${pct.toFixed(1)} % erreicht`);
    const body = $("savingsTableBody"); if (!body) return;
    body.innerHTML = savings.length ? savings.map(x => `<tr><td>${esc(x?.buchungsnummer || "—")}</td><td>${esc(x?.art || "—")}</td><td>${money(x?.betrag)}</td><td>${esc(x?.von || "—")}</td><td>${esc(x?.an || "—")}</td><td>${esc(x?.zweck || "—")}</td><td>${dateText(x?.datum)}</td><td>${esc(x?.erstellt_von_name || "—")}</td><td>${esc(x?.art || "—")}</td></tr>`).join("") : '<tr><td colspan="9">Noch keine Sparkonto-Buchungen vorhanden.</td></tr>';
  }

  function renderEmployees(list = employees) {
    setText("employeeCount", String(list.length));
    setText("employeeSalaryTotal", money(orderWages() + monthlyWages()));
    setText("employeeDepositTotal", money(bookings.filter(x => x?.art === "Einzahlung").reduce((s, x) => s + n(x?.betrag), 0)));
    setText("employeeWithdrawalTotal", money(payouts.reduce((s, x) => s + n(x?.betrag), 0)));
    setText("employeeOpenTotal", money(orders.filter(o => !orderPaid(o)).reduce((s, o) => s + clanOrder(o), 0)));
    const body = $("employeeTableBody"); if (!body) return;
    body.innerHTML = list.length ? list.map(e => {
      const ws = workers.filter(w => String(w?.employee_id) === String(e?.id));
      const wages = ws.reduce((s, w) => s + n(w?.gehalt), 0) + payouts.filter(p => String(p?.mitarbeiter_id) === String(e?.user_id)).reduce((s, p) => s + n(p?.betrag), 0);
      const dep = donations.filter(d => String(d?.mitarbeiter_id) === String(e?.user_id)).reduce((s, d) => s + n(d?.betrag), 0);
      const out = payouts.filter(p => String(p?.mitarbeiter_id) === String(e?.user_id)).reduce((s, p) => s + n(p?.betrag), 0);
      return `<tr><td>${esc(e?.name || "—")}</td><td>${ws.length}</td><td>${money(wages)}</td><td>${money(dep)}</td><td>${money(out)}</td><td>0 $</td><td>${esc(e?.role || e?.rang || "—")}</td></tr>`;
    }).join("") : '<tr><td colspan="7">Keine Mitarbeiterdaten vorhanden.</td></tr>';
  }
  function filterEmployees() { const q = lower(val("employeeSearch")); renderEmployees(employees.filter(e => JSON.stringify(e).toLowerCase().includes(q))); }
  window.filterEmployees = filterEmployees;

  function renderLoans() {
    const body = $("loanTableBody"); if (!body) return;
    const open = loans.filter(x => !loanPaid(x));
    setText("loanOpenCount", String(open.length)); setText("loanOpenSum", money(openLoansAmount())); setText("loanDueInterest", money(overview().dueInterest)); setText("loanLateFees", money(overview().lateFees));
    body.innerHTML = loans.length ? loans.map(l => {
      const rate = rates.filter(r => String(r?.darlehen_id) === String(l?.id) && !isPaidStatus(r?.status)).sort((a, b) => new Date(a?.faellig_am || 0) - new Date(b?.faellig_am || 0))[0];
      const can = isLeitung() || (isMitarbeiter() && String(l?.mitglied_id) === String(currentUser?.id));
      const action = loanPaid(l) ? "—" : can ? `<button class="small-button" onclick="payLoanRate('${esc(l?.id)}')">Rate einzahlen</button>` : "Nur eigenes Darlehen";
      return `<tr><td>${esc(employeeName(l?.mitglied_id))}</td><td>${money(l?.originalbetrag)}</td><td>${money(l?.gesamtrueckzahlung)}</td><td>${money(l?.offen)}</td><td>${rate ? money(rate?.betrag) + " · " + dateOnly(rate?.faellig_am) : "—"}</td><td>${esc(l?.status || "Offen")}</td><td>${action}</td></tr>`;
    }).join("") : '<tr><td colspan="7">Keine Darlehen.</td></tr>';
  }

  function renderCashChecks() {
    const last = cashChecks[0];
    if (last) {
      setText("cashPortalBalance", money(last?.portalstand)); setText("cashIngameBalance", money(last?.ingame_stand)); setText("cashDifference", money(last?.abweichung));
      setText("cashcheckStatus", Math.abs(n(last?.abweichung)) < 0.01 ? "Kassenabgleich stimmt überein." : "Abweichung festgestellt.");
    }
    const body = $("cashcheckTableBody"); if (!body) return;
    body.innerHTML = cashChecks.length ? cashChecks.map(x => `<tr><td>${dateText(x?.datum)}</td><td>${money(x?.portalstand)}</td><td>${money(x?.ingame_stand)}</td><td>${money(x?.abweichung)}</td><td>${esc(x?.erstellt_von_name || "—")}</td><td>${esc(x?.notiz || "—")}</td></tr>`).join("") : '<tr><td colspan="6">Noch keine Kassenabgleiche vorhanden.</td></tr>';
  }

  function renderLogs(list = logs) {
    setText("logCount", String(list.length));
    const today = new Date().toISOString().slice(0, 10);
    setText("logToday", String(list.filter(x => String(x?.datum || x?.created_at || "").slice(0, 10) === today).length));
    setText("logChanges", String(list.filter(x => ["Geändert", "Änderung", "Kontrolle"].includes(x?.aktion)).length));
    setText("logCancellations", String(list.filter(x => lower(x?.aktion).includes("storn")).length));
    const body = $("logTableBody"); if (!body) return;
    body.innerHTML = list.length ? list.map(x => `<tr><td>${dateText(x?.datum || x?.created_at)}</td><td>${esc(x?.typ || "—")}</td><td>${esc(x?.bereich || "—")}</td><td>${esc(x?.beschreibung || JSON.stringify(x?.neue_werte || {}))}</td><td>${esc(x?.erstellt_von_name || "—")}</td><td>${esc(x?.status || "OK")}</td></tr>`).join("") : '<tr><td colspan="6">Noch keine Aktivitäten vorhanden.</td></tr>';
  }
  function filterLogs() {
    const q = lower(val("logSearch")), type = val("logTypeFilter"), period = val("logPeriodFilter"), now = new Date();
    renderLogs(logs.filter(x => {
      const d = new Date(x?.datum || x?.created_at || 0);
      let periodOk = true;
      if (period === "Heute") periodOk = d.toDateString() === now.toDateString();
      if (period === "Dieser Monat") periodOk = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (period === "Dieses Jahr") periodOk = d.getFullYear() === now.getFullYear();
      return (!q || JSON.stringify(x).toLowerCase().includes(q)) && (!type || x?.aktion === type) && periodOk;
    }));
  }
  window.filterLogs = filterLogs;

  // ---------------------------------------------------------------------------
  // Protokoll + Discord-Benachrichtigungen
  // ---------------------------------------------------------------------------
  async function writeLog(area, action, reference, details = {}, status = "OK") {
    if (!db || !currentUser) return null;
    const payload = {
      typ: area || "Buchhaltung", bereich: area || "Buchhaltung", aktion: action || "Unbekannt",
      beschreibung: reference ? `${reference} · ${JSON.stringify(details)}` : JSON.stringify(details),
      erstellt_von: currentUser.id, erstellt_von_name: currentEmployee?.name || currentUser.email || "—",
      datum: new Date().toISOString(), status, alte_werte: null, neue_werte: details || {}
    };
    try {
      const { data, error } = await db.from(T.logs).insert(payload).select().single();
      if (!error && data) logs.unshift(data);
      else if (error) console.warn("Buchhaltung Protokoll:", error.message);
      return data || null;
    } catch (e) {
      console.warn("Buchhaltung Protokoll:", e);
      return null;
    }
  }
  window.writeActivityLog = writeLog;

  async function sendDiscord(payload) {
    if (!db || !currentUser) return { ok: false, skipped: true };
    try {
      const { data, error } = await db.functions.invoke(DISCORD_FUNCTION, { body: payload });
      if (error) {
        console.warn("Discord-Benachrichtigung:", error);
        setText("discordStatus", "Fehler");
        return { ok: false, error };
      }
      setText("discordStatus", "Bereit");
      return { ok: true, data };
    } catch (error) {
      console.warn("Discord-Benachrichtigung:", error);
      setText("discordStatus", "Fehler");
      return { ok: false, error };
    }
  }

  async function notify(area, title, payload) {
    await writeLog(area, "Benachrichtigung", title, payload);
    return sendDiscord({
      channel: payload.channel || area,
      title,
      type: payload.type || area,
      amount: payload.amount ?? null,
      from: payload.from || null,
      to: payload.to || null,
      purpose: payload.purpose || null,
      createdBy: currentEmployee?.name || currentUser?.email || "—",
      date: payload.date || new Date().toISOString(),
      status: payload.status || null,
      note: payload.note || null,
      reference: payload.reference || null
    });
  }

  function generateNumber(prefix) { return `${prefix}-${String(Date.now()).slice(-8)}`; }

  // ---------------------------------------------------------------------------
  // Formulare / Modals
  // ---------------------------------------------------------------------------
  function fillEmployeeSelects() {
    const list = employees.filter(e => e?.user_id || e?.id);
    const options = list.map(e => `<option value="${esc(e?.id)}">${esc(e?.name || e?.username || e?.minecraft_name || "Mitarbeiter")}</option>`).join("");
    const payout = $("payoutEmployee"); if (payout) payout.innerHTML = '<option value="">Mitarbeiter auswählen</option>' + options;
    const loan = $("loanMember");
    if (loan) loan.innerHTML = '<option value="">Mitglied auswählen</option>' + list.filter(e => ["mitarbeiter", "mitglied"].includes(lower(e?.rang))).map(e => `<option value="${esc(e?.user_id || e?.id)}">${esc(e?.name || e?.username || e?.minecraft_name || "Mitglied")}</option>`).join("");
  }

  function fillWorkerSelect() {
    const old = $("workerName"); if (!old) return;
    if (old.tagName.toLowerCase() === "select") {
      old.innerHTML = '<option value="">Mitarbeiter auswählen</option>' + employees.map(e => `<option value="${esc(e?.id)}">${esc(e?.name || e?.username || e?.minecraft_name || "Mitarbeiter")}</option>`).join("");
      return;
    }
    const select = document.createElement("select");
    select.id = "workerName"; select.className = old.className;
    select.innerHTML = '<option value="">Mitarbeiter auswählen</option>' + employees.map(e => `<option value="${esc(e?.id)}">${esc(e?.name || e?.username || e?.minecraft_name || "Mitarbeiter")}</option>`).join("");
    old.replaceWith(select);
  }

  function renderWorkerList() {
    const box = $("workerList"); if (!box) return;
    box.innerHTML = currentWorkers.length ? currentWorkers.map((w, i) => `<div class="worker-row"><span>${esc(w?.name)}</span><span>${money(w?.salary)}</span><button type="button" class="small-button" onclick="removeWorker(${i})">×</button></div>`).join("") : '<div class="empty-state">Noch keine Arbeiter hinzugefügt.</div>';
    setText("orderWorkerCount", String(currentWorkers.length));
    setText("orderSalaryTotal", money(currentWorkers.reduce((s, w) => s + n(w?.salary), 0)));
    const total = num("orderTotal"), clan = num("orderClanAmount"), salary = currentWorkers.reduce((s, w) => s + n(w?.salary), 0);
    setText("orderRemainingAmount", money(total - clan - salary));
    const warn = $("orderDistributionWarning");
    if (warn) warn.textContent = total - clan - salary < 0 ? "Verteilung überschreitet den Gesamtbetrag." : "";
  }
  window.removeWorker = i => { currentWorkers.splice(i, 1); renderWorkerList(); };

  window.openOrderModal = () => {
    if (!canManage()) return toast("Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen erstellen.", "error");
    $("orderModal")?.classList.add("active"); fillEmployeeSelects(); fillWorkerSelect();
    const d = $("orderDate"); if (d) d.value = new Date().toISOString().slice(0, 16);
    const c = $("orderCreatedBy"); if (c) c.value = currentEmployee?.name || currentUser?.email || "—";
  };
  window.closeOrderModal = () => $("orderModal")?.classList.remove("active");
  window.addWorkerRow = () => { if (!canManage()) return toast("Keine Berechtigung.", "error"); $("workerModal")?.classList.add("active"); fillWorkerSelect(); };
  window.closeWorkerModal = () => $("workerModal")?.classList.remove("active");
  window.saveWorker = () => {
    const id = val("workerName"), e = employees.find(x => String(x?.id) === String(id)), salary = num("workerSalary");
    if (!e || salary < 0) return toast("Bitte Mitarbeiter und Gehalt auswählen.", "error");
    currentWorkers.push({ employee_id: e.id, name: e.name || e.username || e.minecraft_name || "Mitarbeiter", salary, note: val("workerNote") || null });
    renderWorkerList(); window.closeWorkerModal();
  };

  window.saveOrderSettlement = async () => {
    if (!canManage()) return toast("Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen erstellen.", "error");
    const number = val("orderNumber"), total = num("orderTotal"), clan = num("orderClanAmount"), salary = currentWorkers.reduce((s, w) => s + n(w?.salary), 0);
    if (!number || total <= 0 || clan < 0 || clan > total || total - clan - salary < 0) return toast("Bitte die Auftragsverteilung prüfen.", "error");
    const payload = {
      auftragsnummer: number, gesamtbetrag: total, clanbetrag: clan, gesamt_gehaelter: salary,
      status: val("orderStatus") || "Offen", datum: val("orderDate") || new Date().toISOString(),
      erstellt_von: currentUser?.id || null, erstellt_von_name: currentEmployee?.name || currentUser?.email || null, notiz: val("orderNote") || null
    };
    const { data, error } = await db.from(T.orders).insert(payload).select().single();
    if (error) return toast(error.message, "error");
    if (currentWorkers.length) {
      const rows = currentWorkers.map(w => ({ auftragsabrechnung_id: data.id, name: w.name, employee_id: w.employee_id, gehalt: n(w.salary), notiz: w.note || null }));
      const r = await db.from(T.workers).insert(rows).select();
      if (r.error) return toast("Auftrag gespeichert, Arbeiter aber nicht: " + r.error.message, "error");
      workers.unshift(...(r.data || []));
    }
    orders.unshift(data); currentWorkers = []; renderWorkerList(); window.closeOrderModal();
    await writeLog("Auftragsabrechnung", "Erstellt", data.auftragsnummer, payload);
    await sendDiscord({ channel: "Aufträge", title: "Neue Auftragsabrechnung", type: "Auftragsabrechnung", amount: total, from: "Auftrag", to: "Clan-Kasse", purpose: "Auftragsabrechnung", createdBy: currentEmployee?.name || currentUser.email, date: payload.datum, status: payload.status, note: payload.notiz, reference: data.auftragsnummer });
    renderOrders(); renderOverview(); toast("Auftragsabrechnung gespeichert.", "success");
  };

  window.openBookingModal = () => {
    if (!currentUser) return toast("Bitte zuerst anmelden.", "error");
    $("bookingModal")?.classList.add("active");
    const b = $("bookingNumber"); if (b) b.value = generateNumber("BK");
    const d = $("bookingDate"); if (d) d.value = new Date().toISOString().slice(0, 16);
    const from = $("bookingFrom"); if (from) from.value = currentEmployee?.name || currentUser?.email || "—";
    const to = $("bookingTo"); if (to) to.value = "Clan-Kasse";
  };
  window.closeBookingModal = () => $("bookingModal")?.classList.remove("active");

  window.saveBooking = async () => {
    if (!currentUser) return toast("Bitte zuerst anmelden.", "error");
    const type = val("bookingType") || "Einzahlung", amount = num("bookingAmount");
    if (amount <= 0) return toast("Bitte einen gültigen Betrag eingeben.", "error");
    const isIn = type === "Einzahlung";
    const payload = {
      buchungsnummer: val("bookingNumber") || generateNumber("BK"), art: type, betrag: amount,
      von: isIn ? (currentEmployee?.name || currentUser.email) : "Clan-Kasse",
      an: isIn ? "Clan-Kasse" : (val("bookingTo") || "Clan-Kasse"), zweck: val("bookingPurpose"),
      kategorie: val("bookingCategory"), auftragsnummer: val("bookingOrderNumber") || null,
      zahlungsart: val("bookingPaymentMethod"), datum: val("bookingDate") || new Date().toISOString(),
      erstellt_von: currentUser.id, erstellt_von_name: currentEmployee?.name || currentUser.email,
      status: val("bookingStatus") || "Offen", notiz: val("bookingNote") || null
    };
    const { data, error } = await db.from(T.bookings).insert(payload).select().single();
    if (error) return toast(error.message, "error");
    bookings.unshift(data);
    await writeLog(isIn ? "Einzahlungen" : "Auszahlungen", "Erstellt", data.buchungsnummer, payload);
    await sendDiscord({ channel: isIn ? "Einzahlungen" : "Auszahlungen", title: isIn ? "Neue Einzahlung" : "Neue Auszahlung", type, amount, from: payload.von, to: payload.an, purpose: payload.zweck, createdBy: payload.erstellt_von_name, date: payload.datum, status: payload.status, note: payload.notiz, reference: payload.buchungsnummer });
    window.closeBookingModal(); renderBookings(); renderOverview(); toast("Buchung gespeichert.", "success");
  };

  window.saveIncomeEntry = async () => {
    if (!isMitarbeiter() && !isLeitung()) return setStatus("incomeStatus", "Keine Berechtigung.", false);
    const amount = num("donationAmount"), purpose = val("incomePurpose"), type = val("incomeType") || "Sonstige Einnahme";
    if (amount <= 0 || !purpose) return setStatus("incomeStatus", "Betrag und Zweck sind erforderlich.", false);
    if (type === "Spende") {
      const { data, error } = await db.from(T.donations).insert({ mitarbeiter_id: currentUser.id, betrag: amount, zweck: purpose, erstellt_am: new Date().toISOString() }).select().single();
      if (error) return setStatus("incomeStatus", error.message, false);
      donations.unshift(data);
      await writeLog("Einzahlungen", "Spende", data.id, data);
      await sendDiscord({ channel: "Einzahlungen", title: "Neue Clan-Spende", type: "Spende", amount, from: currentEmployee?.name || currentUser.email, to: "Clan-Kasse", purpose, date: data.erstellt_am, reference: String(data.id) });
    } else {
      const payload = { buchungsnummer: generateNumber("BK"), art: "Einzahlung", betrag: amount, von: currentEmployee?.name || currentUser.email, an: "Clan-Kasse", zweck: purpose, kategorie: type, auftragsnummer: null, zahlungsart: "Portal", datum: new Date().toISOString(), erstellt_von: currentUser.id, erstellt_von_name: currentEmployee?.name || currentUser.email, status: "Bezahlt", notiz: val("incomeNote") || null };
      const { data, error } = await db.from(T.bookings).insert(payload).select().single();
      if (error) return setStatus("incomeStatus", error.message, false);
      bookings.unshift(data);
      await writeLog("Einzahlungen", "Erstellt", data.buchungsnummer, payload);
      await sendDiscord({ channel: "Einzahlungen", title: "Neue Einzahlung", type, amount, from: payload.von, to: payload.an, purpose, date: payload.datum, status: payload.status, note: payload.notiz, reference: data.buchungsnummer });
    }
    setStatus("incomeStatus", "Einnahme gespeichert."); renderIncome(); renderOverview();
  };

  window.savePayoutEntry = async () => {
    if (!isLeitung()) return setStatus("payoutStatus", "Nur Leitung und Stadtleitung dürfen Auszahlungen erfassen.", false);
    const type = val("payoutType") || "Sonstige Ausgabe", amount = num("payoutAmount"), emp = val("payoutEmployee");
    if (amount <= 0) return setStatus("payoutStatus", "Bitte einen gültigen Betrag eingeben.", false);
    if (type === "Monatsgehalt" && !emp) return setStatus("payoutStatus", "Bitte einen Mitarbeiter wählen.", false);
    if (amount > overview().cash) return setStatus("payoutStatus", "Auszahlung überschreitet den Clanstand.", false);
    const payload = { mitarbeiter_id: emp || null, typ: type, betrag: amount, beschreibung: val("payoutPurpose") || type, monat: val("payoutMonth") || null, erstellt_am: new Date().toISOString() };
    const { data, error } = await db.from(T.payouts).insert(payload).select().single();
    if (error) return setStatus("payoutStatus", error.message, false);
    payouts.unshift(data);
    await writeLog("Auszahlungen", "Erstellt", data.id, payload);
    await sendDiscord({ channel: "Auszahlungen", title: "Neue Auszahlung", type, amount, to: employeeName(emp), purpose: payload.beschreibung, date: payload.erstellt_am, reference: String(data.id) });
    setStatus("payoutStatus", "Auszahlung gespeichert."); renderPayouts(); renderOverview();
  };

  window.openSavingsModal = type => {
    if (!canManage()) return toast("Nur Leitung und Stadtleitung dürfen Sparkonto-Buchungen erstellen.", "error");
    $("savingsModal")?.classList.add("active");
    const t = $("savingsType"); if (t) t.value = type || "Einzahlung";
    const d = $("savingsDate"); if (d) d.value = new Date().toISOString().slice(0, 16);
    const no = $("savingsNumber"); if (no) no.value = generateNumber("SP");
  };
  window.closeSavingsModal = () => $("savingsModal")?.classList.remove("active");
  window.saveSavingsTransaction = async () => {
    if (!canManage()) return toast("Keine Berechtigung.", "error");
    const type = val("savingsType") || "Einzahlung", amount = num("savingsAmount"), purpose = val("savingsPurpose");
    if (amount <= 0 || !purpose) return toast("Betrag und Zweck sind erforderlich.", "error");
    if (type === "Auszahlung" && amount > savingsBalance()) return toast("Das Sparkonto reicht für diese Auszahlung nicht aus.", "error");
    const payload = { buchungsnummer: val("savingsNumber") || generateNumber("SP"), art: type, betrag: amount, von: val("savingsFrom") || currentEmployee?.name || currentUser?.email || "—", an: val("savingsTo") || "Sparkonto", zweck: purpose, datum: val("savingsDate") || new Date().toISOString(), erstellt_von: currentUser.id, erstellt_von_name: currentEmployee?.name || currentUser.email, notiz: val("savingsNote") || null };
    const { data, error } = await db.from(T.savings).insert(payload).select().single();
    if (error) return toast(error.message, "error");
    savings.unshift(data); await writeLog("Sparkonto", "Erstellt", data.buchungsnummer, payload);
    await sendDiscord({ channel: type === "Einzahlung" ? "Einzahlungen" : "Auszahlungen", title: `Sparkonto ${type}`, type: `Sparkonto ${type}`, amount, from: payload.von, to: payload.an, purpose, date: payload.datum, note: payload.notiz, reference: data.buchungsnummer });
    window.closeSavingsModal(); renderSavings(); renderOverview(); toast("Sparkonto-Buchung gespeichert.", "success");
  };

  window.saveSavingsGoal = async () => {
    if (!canManage()) return toast("Keine Berechtigung.", "error");
    savingsGoal = Math.max(0, Number(val("savingsGoal").replace(",", ".")) || 0);
    await writeLog("Sparkonto", "Sparziel", "", { goal: savingsGoal });
    renderSavings(); toast("Sparziel gespeichert.", "success");
  };

  window.saveCashCheck = async () => {
    if (!canManage()) return toast("Keine Berechtigung.", "error");
    const portal = num("cashPortalInput"), ingame = num("cashIngameInput"), diff = portal - ingame;
    const payload = { portalstand: portal, ingame_stand: ingame, abweichung: diff, datum: val("cashCheckDate") || new Date().toISOString(), erstellt_von: currentUser.id, erstellt_von_name: currentEmployee?.name || currentUser.email, notiz: val("cashCheckNote") || null };
    const { data, error } = await db.from(T.cash).insert(payload).select().single();
    if (error) return toast(error.message, "error");
    cashChecks.unshift(data); await writeLog("Kontrolle", "Kassenabgleich", data.id, payload);
    await sendDiscord({ channel: "Kontrolle", title: "Kassenabgleich erfasst", type: "Kassenabgleich", amount: diff, from: "Portal", to: "Ingame", purpose: "Kassenabgleich", date: payload.datum, note: payload.notiz, reference: String(data.id) });
    window.closeCashCheck(); renderCashChecks(); toast("Kassenabgleich gespeichert.", "success");
  };
  window.openCashCheck = () => { if (!canManage()) return toast("Keine Berechtigung.", "error"); $("cashCheckModal")?.classList.add("active"); const d = $("cashCheckDate"); if (d) d.value = new Date().toISOString().slice(0, 16); const c = $("cashCheckCreatedBy"); if (c) c.value = currentEmployee?.name || currentUser?.email || "—"; };
  window.closeCashCheck = () => $("cashCheckModal")?.classList.remove("active");
  window.closeLogDetail = () => $("logDetailModal")?.classList.remove("active");

  window.saveLoan = async () => {
    if (!isStadt()) return setStatus("loanStatus", "Nur Stadtleitung kann Darlehen genehmigen.", false);
    const member = val("loanMember"), amount = num("loanAmount"), interest = num("loanInterest"), mode = val("loanMode") || "einmalig", installment = num("loanInstallment"), first = val("loanFirstDue");
    if (!member || amount <= 0 || interest < 0 || interest > 30) return setStatus("loanStatus", "Mitglied, Betrag und Zinssatz prüfen.", false);
    if (mode === "woechentlich" && installment <= 0) return setStatus("loanStatus", "Bitte einen Ratenbetrag angeben.", false);
    if (amount > overview().cash) return setStatus("loanStatus", "Das Darlehen überschreitet den Clanstand.", false);
    const total = amount + amount * interest / 100;
    let due = first ? new Date(first + "T12:00:00") : new Date(Date.now() + 7 * 86400000);
    const count = mode === "woechentlich" ? Math.ceil(total / installment) : 1;
    const payload = { mitglied_id: member, originalbetrag: amount, zinssatz: interest, zinsbetrag: amount * interest / 100, gesamtrueckzahlung: total, rueckzahlungsart: mode, ratenbetrag: mode === "woechentlich" ? installment : total, anzahl_raten: count, bereits_gezahlt: 0, offen: total, naechste_rate_am: due.toISOString(), mahnungen: 0, status: "Offen", genehmigt_von: currentUser.id, genehmigt_am: new Date().toISOString(), erstellt_am: new Date().toISOString(), notiz: val("loanNote") || null };
    const { data, error } = await db.from(T.loans).insert(payload).select().single();
    if (error) return setStatus("loanStatus", error.message, false);
    loans.unshift(data);
    const rows = []; let rem = total;
    for (let i = 1; i <= count; i++) {
      const rateAmount = mode === "woechentlich" ? Math.min(installment, rem) : rem;
      rows.push({ darlehen_id: data.id, raten_nummer: i, betrag: rateAmount, faellig_am: due.toISOString(), status: "Offen" });
      rem -= rateAmount; if (mode === "woechentlich") due = new Date(due.getTime() + 7 * 86400000);
    }
    const rr = await db.from(T.rates).insert(rows).select();
    if (rr.error) return setStatus("loanStatus", "Darlehen gespeichert, Raten aber nicht: " + rr.error.message, false);
    rates.push(...(rr.data || []));
    await writeLog("Geldverleih", "Darlehen genehmigt", data.id, payload);
    await sendDiscord({ channel: "Geldverleih", title: "Darlehen genehmigt", type: "Darlehen", amount, from: "Clan", to: employeeName(member), purpose: "Genehmigt und ausgezahlt", date: payload.genehmigt_am, reference: String(data.id), note: payload.notiz });
    setStatus("loanStatus", "Darlehen gespeichert."); renderLoans(); renderOverview();
  };

  window.payLoanRate = async id => {
    const loan = loans.find(x => String(x?.id) === String(id)); if (!loan) return;
    const rate = rates.filter(r => String(r?.darlehen_id) === String(id) && !isPaidStatus(r?.status)).sort((a, b) => new Date(a?.faellig_am || 0) - new Date(b?.faellig_am || 0))[0];
    if (!rate) return toast("Keine offene Rate gefunden.", "error");
    if (!(isLeitung() || (isMitarbeiter() && String(loan?.mitglied_id) === String(currentUser?.id)))) return toast("Keine Berechtigung für diese Rate.", "error");
    const now = new Date().toISOString(), amount = n(rate?.betrag);
    const r = await db.from(T.rates).update({ status: "Bezahlt", bezahlt_am: now, eingezahlt_von: currentUser.id }).eq("id", rate.id);
    if (r.error) return toast(r.error.message, "error");
    rate.status = "Bezahlt";
    const paid = n(loan?.bereits_gezahlt) + amount, open = Math.max(0, n(loan?.gesamtrueckzahlung) - paid);
    const next = rates.filter(x => String(x?.darlehen_id) === String(id) && !isPaidStatus(x?.status)).sort((a, b) => new Date(a?.faellig_am || 0) - new Date(b?.faellig_am || 0))[0];
    const status = open <= 0.005 ? "Abgeschlossen" : "Offen";
    const u = await db.from(T.loans).update({ bereits_gezahlt: paid, offen: open, naechste_rate_am: next?.faellig_am || null, status, abgeschlossen_am: status === "Abgeschlossen" ? now : null }).eq("id", id);
    if (u.error) return toast(u.error.message, "error");
    Object.assign(loan, { bereits_gezahlt: paid, offen: open, naechste_rate_am: next?.faellig_am || null, status });
    await writeLog("Geldverleih", "Rate eingezahlt", id, { betrag: amount, rate: rate.raten_nummer });
    await sendDiscord({ channel: "Geldverleih", title: "Darlehensrate eingezahlt", type: "Darlehensrate", amount, from: employeeName(loan?.mitglied_id), to: "Clan", purpose: "Rate eingezahlt", date: now, reference: String(id) });
    renderLoans(); renderOverview(); toast("Rate gespeichert.", "success");
  };

  window.runFinancialControl = () => {
    const d = overview(), found = [];
    if (d.cash < 0) found.push("Der aktuelle Clanstand ist negativ.");
    if (d.savings < 0) found.push("Das Sparkonto ist negativ.");
    if (d.openOrders > 0) found.push("Es gibt offene Auftragsabrechnungen.");
    if (lastLoadErrors.length) found.push(`Datenfehler: ${lastLoadErrors.length} Tabelle(n) konnten nicht geladen werden.`);
    const box = $("warningList");
    if (box) box.innerHTML = found.length ? found.map(x => `<div class="no-warning"><strong>⚠ ${esc(x)}</strong></div>`).join("") : '<div class="no-warning"><strong>✓ Keine Warnungen</strong><p>Aktuell wurden keine auffälligen Buchungen gefunden.</p></div>';
    setText("controlStatus", found.length ? "Kontrolle abgeschlossen – Warnungen vorhanden" : "Kontrolle abgeschlossen – keine Warnungen");
    setText("controlCash", d.cash >= 0 ? "✓ Kassenstand gültig" : "⚠ Negativer Bestand");
    setText("controlOrders", d.openOrders > 0 ? "⚠ Offene Aufträge" : "✓ Keine offenen Beträge");
    setText("controlPayouts", d.withdrawals <= d.grossRevenue ? "✓ Keine Überschreitung" : "⚠ Prüfen");
    setText("controlSavings", d.savings >= 0 ? "✓ Bestand gültig" : "⚠ Negativer Bestand");
    setText("controlData", lastLoadErrors.length ? "⚠ Datenfehler vorhanden" : "✓ Keine Datenfehler");
    setText("controlRights", currentUser ? "◆ Zugriff geschützt" : "⚠ Nicht angemeldet");
    setText("lastControlDate", dateText(new Date()));
    if (currentUser) writeLog("Kontrolle", "Kontrolle", null, { warnings: found });
  };

  window.updateMonthlyBalance = () => {
    const period = val("monthlyPeriod");
    if (!period) return setText("monthlyLabel", "Kein Monat ausgewählt");
    const d = new Date(period + "-01T00:00:00"), next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const inRows = bookings.filter(x => x?.art === "Einzahlung" && new Date(x?.datum) >= d && new Date(x?.datum) < next);
    const outRows = bookings.filter(x => x?.art === "Auszahlung" && new Date(x?.datum) >= d && new Date(x?.datum) < next);
    const wageRows = payouts.filter(x => x?.typ === "Monatsgehalt" && new Date(x?.erstellt_am) >= d && new Date(x?.erstellt_am) < next);
    const inc = inRows.reduce((s, x) => s + n(x?.betrag), 0) + donations.filter(x => new Date(x?.erstellt_am) >= d && new Date(x?.erstellt_am) < next).reduce((s, x) => s + n(x?.betrag), 0);
    const exp = outRows.reduce((s, x) => s + n(x?.betrag), 0) + payouts.filter(x => x?.typ !== "Monatsgehalt" && new Date(x?.erstellt_am) >= d && new Date(x?.erstellt_am) < next).reduce((s, x) => s + n(x?.betrag), 0) + wageRows.reduce((s, x) => s + n(x?.betrag), 0);
    setText("monthlyIncome", money(inc)); setText("monthlyExpenses", money(exp)); setText("monthlyWages", money(wageRows.reduce((s, x) => s + n(x?.betrag), 0))); setText("monthlyChange", money(inc - exp)); setText("monthlyLabel", d.toLocaleDateString("de-DE", { month: "long", year: "numeric" })); setText("monthlyBookingCount", String(inRows.length + outRows.length));
  };

  window.reloadBookkeepingPage = async () => {
    try {
      await loadSession();
      await loadAll();
      renderAll();
      if (lastLoadErrors.length) toast(`${lastLoadErrors.length} Tabelle(n) konnten nicht geladen werden. Kontrolle öffnen.`, "error");
      else toast("Buchhaltung aktualisiert.", "success");
    } catch (e) {
      console.error(e); toast(e?.message || "Aktualisierung fehlgeschlagen.", "error");
    }
  };

  function renderAll() {
    renderTop(); renderOverview(); renderBookings(); renderIncome(); renderPayouts(); renderOrders(); renderSavings(); renderEmployees(); renderLoans(); renderCashChecks(); renderLogs();
    fillEmployeeSelects(); fillWorkerSelect(); renderWorkerList();
    const month = $("monthlyPeriod"); if (month && !month.value) month.value = new Date().toISOString().slice(0, 7); if (month) window.updateMonthlyBalance();
    if (typeof window.drawFinanceChart === "function") requestAnimationFrame(window.drawFinanceChart);
  }

  async function init() {
    setText("bookkeepingStatus", "Wird geladen…"); setText("connectionStatus", "Verbinde…"); setText("discordStatus", "Bereit");
    try {
      resetState();
      db = await getClient();
      setText("connectionStatus", "Verbunden");
      await loadSession();
      await loadAll();
      renderAll();

      if (!currentUser) {
        setStatus("bookkeepingStatus", "Anmeldung erforderlich", false);
        setText("discordStatus", "Anmeldung erforderlich");
      } else if (!currentEmployee) {
        setStatus("bookkeepingStatus", "Mitarbeiterdatensatz nicht verknüpft", false);
        setText("discordStatus", "Mitarbeiter erforderlich");
      } else {
        setStatus("bookkeepingStatus", isStadt() ? "Stadtleitung" : isLeitung() ? "Leitung" : isMitarbeiter() ? "Mitarbeiter" : "Keine Mitarbeiterberechtigung", true);
        setText("discordStatus", "Bereit");
      }

      if (lastLoadErrors.length) {
        console.error("Buchhaltung – Ladefehler:", lastLoadErrors);
        toast(`${lastLoadErrors.length} Datenabfrage(n) fehlgeschlagen. Die Werte wurden NICHT künstlich auf 0 gesetzt.`, "error");
      }
    } catch (e) {
      console.error("Clan-Buchhaltung:", e);
      setText("connectionStatus", db ? "Verbunden" : "Fehler");
      setStatus("bookkeepingStatus", e?.message || "Buchhaltung konnte nicht geladen werden.", false);
      toast(e?.message || "Buchhaltung konnte nicht geladen werden.", "error");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
