/*
  EHRENMARKT – CLAN-BUCHHALTUNG V0.5
  Daten-Bridge für die vorhandene buchhaltung.html.

  WICHTIG:
  Die eigentliche Oberfläche, Navigation und Berechnungslogik liegt bereits
  in buchhaltung.html. Diese Datei lädt ausschließlich die Supabase-Daten
  und übergibt sie an die vorhandenen Arrays.
*/

(() => {
    "use strict";

    const TABLE = {
        bookings: "buchhaltung_buchungen",
        orders: "buchhaltung_auftragsabrechnungen",
        workers: "buchhaltung_auftragsarbeiter",
        employees: "employees",
        savings: "buchhaltung_sparkonto",
        cash: "buchhaltung_kassenabgleich",
        logs: "buchhaltung_protokoll"
    };

    function db() {
        return window.supabaseClient || window.supabase || null;
    }

    async function readTable(name) {
        const client = db();
        if (!client) throw new Error("Supabase Client ist nicht verfügbar.");
        const { data, error } = await client.from(name).select("*");
        if (error) throw new Error(`${name}: ${error.message}`);
        return Array.isArray(data) ? data : [];
    }

    function sortNewest(rows) {
        return [...rows].sort((a, b) => {
            const da = new Date(a?.datum || a?.created_at || a?.createdAt || 0).getTime();
            const dbv = new Date(b?.datum || b?.created_at || b?.createdAt || 0).getTime();
            return dbv - da;
        });
    }

    function replaceArray(globalName, rows) {
        const target = window[globalName];
        if (!Array.isArray(target)) return;
        target.splice(0, target.length, ...rows);
    }

    function mapBooking(row) {
        return {
            id: row.id ?? row.buchungsnummer ?? ("BK-" + Math.random()),
            type: row.art ?? row.type ?? "",
            amount: Number(row.betrag ?? row.amount ?? 0) || 0,
            from: row.von ?? row.from ?? "",
            to: row.an ?? row.to ?? "",
            purpose: row.zweck ?? row.purpose ?? "",
            category: row.kategorie ?? row.category ?? "",
            orderNumber: row.auftragsnummer ?? row.orderNumber ?? "",
            paymentMethod: row.zahlungsart ?? row.paymentMethod ?? "",
            date: row.datum ?? row.date ?? row.created_at ?? "",
            createdBy: row.erstellt_von_name ?? row.erstellt_von ?? row.createdBy ?? "",
            status: row.status ?? "",
            note: row.notiz ?? row.note ?? "",
            _raw: row
        };
    }

    function mapWorker(row) {
        return {
            name: row.arbeiter_name ?? row.name ?? row.worker_name ?? "Unbekannt",
            salary: Number(row.gehalt ?? row.salary ?? 0) || 0,
            note: row.notiz ?? row.note ?? "",
            id: row.id,
            _raw: row
        };
    }

    function mapOrder(row, workerRows) {
        const id = row.id ?? row.auftragsnummer ?? ("#" + Date.now());
        const linked = workerRows.filter(w =>
            String(w.auftragsabrechnung_id ?? w.order_id ?? w.auftrags_id ?? "") === String(row.id ?? "")
        ).map(mapWorker);

        const salaries = Number(
            row.gesamt_gehaelter ?? row.gesamt_gehalt ?? row.salaries ??
            linked.reduce((sum, w) => sum + Number(w.salary || 0), 0)
        ) || 0;

        return {
            id,
            date: row.datum ?? row.date ?? row.created_at ?? "",
            total: Number(row.gesamtbetrag ?? row.total ?? 0) || 0,
            clan: Number(row.clanbetrag ?? row.clan ?? 0) || 0,
            workers: linked,
            salaries,
            status: row.status ?? "Offen",
            createdBy: row.erstellt_von_name ?? row.erstellt_von ?? row.createdBy ?? "",
            note: row.notiz ?? row.note ?? "",
            _raw: row
        };
    }

    function mapSavings(row) {
        return {
            id: row.id,
            number: row.buchungsnummer ?? row.number ?? row.id,
            type: row.art ?? row.typ ?? row.type ?? "",
            amount: Number(row.betrag ?? row.amount ?? 0) || 0,
            from: row.von ?? row.from ?? "",
            to: row.an ?? row.to ?? "",
            date: row.datum ?? row.date ?? row.created_at ?? "",
            purpose: row.zweck ?? row.purpose ?? "",
            note: row.notiz ?? row.note ?? "",
            createdBy: row.erstellt_von_name ?? row.erstellt_von ?? row.createdBy ?? "",
            status: row.status ?? "",
            _raw: row
        };
    }

    function mapCash(row) {
        return {
            id: row.id,
            number: row.buchungsnummer ?? row.number ?? row.id,
            portal: Number(row.portalstand ?? row.portal ?? 0) || 0,
            ingame: Number(row.ingame_stand ?? row.ingame ?? 0) || 0,
            difference: Number(row.abweichung ?? row.difference ?? 0) || 0,
            date: row.datum ?? row.date ?? row.created_at ?? "",
            createdBy: row.erstellt_von_name ?? row.erstellt_von ?? row.createdBy ?? "",
            note: row.notiz ?? row.note ?? "",
            _raw: row
        };
    }

    function mapLog(row) {
        return {
            id: row.id,
            date: row.datum ?? row.created_at ?? row.date ?? "",
            type: row.aktion ?? row.type ?? "",
            area: row.bereich ?? row.area ?? "",
            description: row.referenz ?? row.description ?? "",
            createdBy: row.erstellt_von_name ?? row.erstellt_von ?? row.createdBy ?? "",
            status: row.status ?? "Erfasst",
            details: row.details ?? {},
            _raw: row
        };
    }

    async function loadBookkeepingData() {
        const client = db();
        if (!client) {
            console.error("Buchhaltung: Supabase Client fehlt.");
            return false;
        }

        // Jede Tabelle wird einzeln geladen. Ein Problem mit z.B. dem Protokoll
        // darf nicht dazu führen, dass Buchungen und Beträge wieder auf 0 fallen.
        const results = await Promise.allSettled([
            readTable(TABLE.bookings),
            readTable(TABLE.orders),
            readTable(TABLE.workers),
            readTable(TABLE.employees),
            readTable(TABLE.savings),
            readTable(TABLE.cash),
            readTable(TABLE.logs)
        ]);

        const value = (index, label) => {
            const result = results[index];
            if (result.status === "fulfilled") return result.value;
            console.error(`Buchhaltung: ${label} konnte nicht geladen werden:`, result.reason);
            return [];
        };

        const rawBookings = value(0, TABLE.bookings);
        const rawOrders = value(1, TABLE.orders);
        const rawWorkers = value(2, TABLE.workers);
        const rawEmployees = value(3, TABLE.employees);
        const rawSavings = value(4, TABLE.savings);
        const rawCash = value(5, TABLE.cash);
        const rawLogs = value(6, TABLE.logs);

        replaceArray("bookings", sortNewest(rawBookings).map(mapBooking));
        replaceArray("workers", rawWorkers.map(mapWorker));
        replaceArray("orderSettlements", sortNewest(rawOrders).map(row => mapOrder(row, rawWorkers)));
        replaceArray("savingsTransactions", sortNewest(rawSavings).map(mapSavings));
        replaceArray("cashChecks", sortNewest(rawCash).map(mapCash));
        replaceArray("activityLogs", sortNewest(rawLogs).map(mapLog));

        // Die eingebettete Mitarbeiteranzeige arbeitet mit den Arbeiterdaten.
        // Mitarbeiter ohne Auftrag werden dort absichtlich nicht erfunden.
        window.buchhaltungEmployees = rawEmployees;

        // Vorhandene Anzeige-Funktionen aus buchhaltung.html erneut ausführen.
        try { window.renderBookings?.(); } catch (e) { console.error("renderBookings:", e); }
        try { window.renderOrders?.(); } catch (e) { console.error("renderOrders:", e); }
        try { window.renderEmployees?.(); } catch (e) { console.error("renderEmployees:", e); }
        try { window.renderSavings?.(); } catch (e) { console.error("renderSavings:", e); }
        try { window.updateMonthly?.(); } catch (e) { console.error("updateMonthly:", e); }
        try { window.renderCashChecks?.(); } catch (e) { console.error("renderCashChecks:", e); }
        try { window.renderLogs?.(); } catch (e) { console.error("renderLogs:", e); }
        try { window.updateFinancialOverview?.(); } catch (e) { console.error("updateFinancialOverview:", e); }
        try { window.runFinancialControl?.(); } catch (e) { console.error("runFinancialControl:", e); }

        window.buchhaltungDataLoaded = true;
        return true;
    }

    window.loadBookkeepingData = loadBookkeepingData;
    window.refreshBookkeeping = loadBookkeepingData;

    document.addEventListener("DOMContentLoaded", () => {
        // Das HTML hat bereits seine eigene Initialisierung. Wir warten einen
        // Tick, damit die vorhandenen Arrays/Funktionen sicher existieren.
        setTimeout(() => loadBookkeepingData().catch(error => {
            console.error("Buchhaltung konnte nicht geladen werden:", error);
        }), 0);
    });
})();
