/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   NEUAUFBAU – TEIL 1 VON 10
===================================================== */

"use strict";


/* =====================================================
   SUPABASE
===================================================== */

const buchhaltungDB =
    window.supabaseClient || null;


/* =====================================================
   TABELLEN
===================================================== */

const TABLE_BOOKINGS =
    "buchhaltung_buchungen";

const TABLE_ORDERS =
    "buchhaltung_auftragsabrechnungen";

const TABLE_ORDER_WORKERS =
    "buchhaltung_auftragsarbeiter";

const TABLE_SAVINGS =
    "buchhaltung_sparkonto";

const TABLE_CASH_CHECKS =
    "buchhaltung_kassenabgleich";

const TABLE_LOGS =
    "buchhaltung_protokoll";

const TABLE_EMPLOYEES =
    "employees";


/* =====================================================
   DATEN
===================================================== */

let currentUser = null;

let currentEmployee = null;

let bookings = [];

let orderSettlements = [];

let workers = [];

let employees = [];

let savingsTransactions = [];

let cashChecks = [];

let activityLogs = [];

let currentWorkers = [];

let savingsGoalValue = 0;


/* =====================================================
   SUPABASE PRÜFEN
===================================================== */

function hasSupabase(){

    return !!(
        buchhaltungDB &&
        typeof buchhaltungDB.from === "function"
    );

}


/* =====================================================
   HILFSFUNKTIONEN
===================================================== */

function getValue(id){

    const element =
        document.getElementById(id);

    return element
        ? String(
            element.value || ""
        ).trim()
        : "";

}


function setValue(id,value){

    const element =
        document.getElementById(id);

    if(element){

        element.value =
            value ?? "";

    }

}


function setText(id,value){

    const element =
        document.getElementById(id);

    if(element){

        element.textContent =
            value ?? "";

    }

}


function numberValue(value){

    const number =
        Number(
            String(value ?? "")
                .replace(",",".")
                .replace(/[^\d.-]/g,"")
        );

    return Number.isFinite(number)
        ? number
        : 0;

}


/* =====================================================
   GELD FORMATIEREN
===================================================== */

function money(value){

    return (
        numberValue(value)
            .toLocaleString(
                "de-DE",
                {
                    minimumFractionDigits:0,
                    maximumFractionDigits:2
                }
            )
        + " $"
    );

}


/*
 * Alias, damit kein alter
 * formatMoney-Fehler mehr entsteht.
 */

function formatMoney(value){

    return money(value);

}


/* =====================================================
   HTML SICHER MACHEN
===================================================== */

function escapeHtml(value){

    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}


/* =====================================================
   DATUM / ZEIT
===================================================== */

function nowLocal(){

    const date =
        new Date();

    const offset =
        date.getTimezoneOffset();

    return new Date(
        date.getTime() -
        offset * 60000
    )
    .toISOString()
    .slice(0,16);

}


function formatDate(value){

    if(!value){

        return "—";

    }

    const date =
        new Date(value);

    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return "—";

    }

    return date.toLocaleString(
        "de-DE",
        {
            dateStyle:"short",
            timeStyle:"short"
        }
    );

}


/* =====================================================
   FEHLER
===================================================== */

function showDatabaseError(error){

    console.error(
        "Buchhaltung:",
        error
    );

    const message =
        error?.message ||
        String(
            error ||
            "Unbekannter Fehler."
        );

    alert(
        "Buchhaltung:\n\n" +
        message
    );

}


/* =====================================================
   MODALS
===================================================== */

function openModal(id){

    const modal =
        document.getElementById(id);

    if(modal){

        modal.classList.add(
            "active"
        );

    }

}


function closeModal(id){

    const modal =
        document.getElementById(id);

    if(modal){

        modal.classList.remove(
            "active"
        );

    }

}


/* =====================================================
   BENUTZER LADEN
===================================================== */

async function loadCurrentUser(){

    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return false;

    }

    try{

        const {
            data,
            error
        } =
            await buchhaltungDB
                .auth
                .getUser();

        if(error){

            throw error;

        }

        currentUser =
            data?.user || null;

        if(!currentUser){

            showDatabaseError(
                "Kein angemeldeter Benutzer gefunden."
            );

            return false;

        }

        return true;

    }
    catch(error){

        showDatabaseError(error);

        return false;

    }

}


/* =====================================================
   MITARBEITERPROFIL LADEN
===================================================== */

async function loadCurrentEmployee(){

    if(
        !currentUser ||
        !hasSupabase()
    ){

        return false;

    }

    try{

        const {
            data,
            error
        } =
            await buchhaltungDB
                .from(
                    TABLE_EMPLOYEES
                )
                .select("*")
                .eq(
                    "user_id",
                    currentUser.id
                )
                .maybeSingle();

        if(error){

            throw error;

        }

        currentEmployee =
            data || null;

        if(!currentEmployee){

            showDatabaseError(
                "Dein Mitarbeiterprofil wurde nicht gefunden."
            );

            return false;

        }

        return true;

    }
    catch(error){

        showDatabaseError(error);

        return false;

    }

}


/* =====================================================
   RANG
===================================================== */

function getCurrentRank(){

    if(!currentEmployee){

        return "";

    }

    return String(
        currentEmployee.rang || ""
    ).trim();

}


/* =====================================================
   BERECHTIGUNGEN
===================================================== */

function isLeitung(){

    const rank =
        getCurrentRank();

    return (
        rank === "Leitung" ||
        rank === "Stadtleitung"
    );

}


function isMitarbeiter(){

    return (
        getCurrentRank() ===
        "Mitarbeiter"
    );

}


function canManageBookkeeping(){

    return isLeitung();

}


function canCreateDeposit(){

    return (
        isLeitung() ||
        isMitarbeiter()
    );

}

/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 2 VON 10
   DATEN LADEN
===================================================== */


/* =====================================================
   ALLE BUCHHALTUNGSDATEN LADEN
===================================================== */

async function loadBookkeepingData(){

    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return false;

    }

    try{

        const [
            bookingsResult,
            ordersResult,
            workersResult,
            employeesResult,
            savingsResult,
            cashChecksResult,
            logsResult
        ] = await Promise.all([

            /* -----------------------------
               BUCHUNGEN
            ----------------------------- */

            buchhaltungDB
                .from(TABLE_BOOKINGS)
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),


            /* -----------------------------
               AUFTRAGSABRECHNUNGEN
            ----------------------------- */

            buchhaltungDB
                .from(TABLE_ORDERS)
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),


            /* -----------------------------
               AUFTRAGSARBEITER
            ----------------------------- */

            buchhaltungDB
                .from(TABLE_ORDER_WORKERS)
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:true
                    }
                ),


            /* -----------------------------
               MITARBEITER
            ----------------------------- */

            buchhaltungDB
                .from(TABLE_EMPLOYEES)
                .select("*")
                .order(
                    "name",
                    {
                        ascending:true
                    }
                ),


            /* -----------------------------
               SPARKONTO
            ----------------------------- */

            buchhaltungDB
                .from(TABLE_SAVINGS)
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),


            /* -----------------------------
               KASSENABGLEICH
            ----------------------------- */

            buchhaltungDB
                .from(TABLE_CASH_CHECKS)
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),


            /* -----------------------------
               PROTOKOLL
            ----------------------------- */

            buchhaltungDB
                .from(TABLE_LOGS)
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                )

        ]);


        /* =================================================
           FEHLER EINZELN PRÜFEN
        ================================================= */

        if(bookingsResult.error){

            throw new Error(
                "BUCHUNGEN: " +
                bookingsResult.error.message
            );

        }


        if(ordersResult.error){

            throw new Error(
                "AUFTRAGSABRECHNUNGEN: " +
                ordersResult.error.message
            );

        }


        if(workersResult.error){

            throw new Error(
                "AUFTRAGSARBEITER: " +
                workersResult.error.message
            );

        }


        if(employeesResult.error){

            throw new Error(
                "MITARBEITER: " +
                employeesResult.error.message
            );

        }


        if(savingsResult.error){

            throw new Error(
                "SPARKONTO: " +
                savingsResult.error.message
            );

        }


        if(cashChecksResult.error){

            throw new Error(
                "KASSENABGLEICH: " +
                cashChecksResult.error.message
            );

        }


        if(logsResult.error){

            throw new Error(
                "PROTOKOLL: " +
                logsResult.error.message
            );

        }


        /* =================================================
           DATEN ÜBERNEHMEN
        ================================================= */

        bookings =
            bookingsResult.data || [];


        orderSettlements =
            ordersResult.data || [];


        workers =
            workersResult.data || [];


        employees =
            employeesResult.data || [];


        savingsTransactions =
            savingsResult.data || [];


        cashChecks =
            cashChecksResult.data || [];


        activityLogs =
            logsResult.data || [];


        console.log(
            "Buchhaltung geladen:",
            {
                buchungen:
                    bookings.length,

                aufträge:
                    orderSettlements.length,

                arbeiter:
                    workers.length,

                mitarbeiter:
                    employees.length,

                sparkonto:
                    savingsTransactions.length,

                kassenabgleich:
                    cashChecks.length,

                protokoll:
                    activityLogs.length
            }
        );


        return true;

    }
    catch(error){

        console.error(
            "Fehler beim Laden der Buchhaltung:",
            error
        );

        showDatabaseError(error);

        return false;

    }

}


/* =====================================================
   AKTUELLEN CLANSTAND BERECHNEN
===================================================== */

function getCurrentClanBalance(){

    let balance = 0;


    bookings.forEach(
        booking => {

            const amount =
                numberValue(
                    booking.betrag
                );


            const type =
                String(
                    booking.art || ""
                ).trim();


            if(
                type === "Einzahlung"
            ){

                balance += amount;

            }


            else if(
                type === "Auszahlung"
            ){

                balance -= amount;

            }

        }
    );


    return balance;

}


/* =====================================================
   SPARKONTO-STAND BERECHNEN
===================================================== */

function getSavingsBalance(){

    let balance = 0;


    savingsTransactions.forEach(
        transaction => {

            const amount =
                numberValue(
                    transaction.betrag
                );


            const type =
                String(
                    transaction.art || ""
                ).trim();


            if(
                type === "Einzahlung"
            ){

                balance += amount;

            }


            else if(
                type === "Auszahlung"
            ){

                balance -= amount;

            }

        }
    );


    return balance;

}


/* =====================================================
   GESAMTVERMÖGEN
===================================================== */

function getTotalAssets(){

    return (
        getCurrentClanBalance() +
        getSavingsBalance()
    );

}


/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 3 VON 10
   FINANZÜBERSICHT
===================================================== */


/* =====================================================
   FINANZWERTE BERECHNEN
===================================================== */

function calculateFinancialOverview(){

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalWages = 0;
    let totalClanExpenses = 0;
    let historicalRevenue = 0;
    let openAmount = 0;


    /* =================================================
       NORMALE BUCHUNGEN
    ================================================= */

    bookings.forEach(
        booking => {

            const amount =
                numberValue(
                    booking.betrag
                );

            const type =
                String(
                    booking.art || ""
                ).trim();

            const category =
                String(
                    booking.kategorie || ""
                ).trim();


            /* EINZAHLUNGEN */

            if(
                type === "Einzahlung"
            ){

                totalDeposits += amount;

            }


            /* AUSZAHLUNGEN */

            else if(
                type === "Auszahlung"
            ){

                totalWithdrawals += amount;

            }


            /* ARBEITERGEHÄLTER */

            if(
                category === "Gehalt" ||
                category === "Arbeitergehalt"
            ){

                totalWages += amount;

            }


            /* CLANAUSGABEN */

            if(
                category === "Clan-Ausgabe" ||
                category === "Ausgabe"
            ){

                totalClanExpenses += amount;

            }

        }
    );


    /* =================================================
       HISTORISCHER GESAMTUMSATZ

       Nur Auftragsabrechnungen.
       Normale Einzahlungen werden NICHT
       automatisch als Umsatz gezählt.
    ================================================= */

    orderSettlements.forEach(
        order => {

            historicalRevenue +=
                numberValue(
                    order.gesamtbetrag
                );

        }
    );


    /* =================================================
       AKTUELLER CLANSTAND
    ================================================= */

    const currentClanBalance =
        totalDeposits -
        totalWithdrawals;


    /* =================================================
       SPARKONTO
    ================================================= */

    const savingsBalance =
        getSavingsBalance();


    /* =================================================
       GESAMTVERMÖGEN
    ================================================= */

    const totalAssets =
        currentClanBalance +
        savingsBalance;


    /* =================================================
       OFFENE BETRÄGE
    ================================================= */

    orderSettlements.forEach(
        order => {

            const status =
                String(
                    order.status || ""
                ).trim();


            if(
                status === "Offen" ||
                status === "Teilweise bezahlt"
            ){

                const total =
                    numberValue(
                        order.gesamtbetrag
                    );

                const clanAmount =
                    numberValue(
                        order.clanbetrag
                    );

                const wages =
                    numberValue(
                        order.gesamt_gehaelter
                    );

                const alreadyDistributed =
                    clanAmount +
                    wages;

                const remaining =
                    total -
                    alreadyDistributed;


                if(
                    remaining > 0
                ){

                    openAmount +=
                        remaining;

                }

            }

        }
    );


    return {

        currentClanBalance,
        historicalRevenue,
        totalDeposits,
        totalWithdrawals,
        totalWages,
        totalClanExpenses,
        savingsBalance,
        totalAssets,
        openAmount

    };

}


/* =====================================================
   FINANZÜBERSICHT ANZEIGEN
===================================================== */

function renderOverview(){

    const overview =
        calculateFinancialOverview();


    setText(
        "currentClanBalance",
        money(
            overview.currentClanBalance
        )
    );


    setText(
        "historicalRevenue",
        money(
            overview.historicalRevenue
        )
    );


    setText(
        "totalRevenue",
        money(
            overview.historicalRevenue
        )
    );


    setText(
        "totalDeposits",
        money(
            overview.totalDeposits
        )
    );


    setText(
        "totalWithdrawals",
        money(
            overview.totalWithdrawals
        )
    );


    setText(
        "totalWages",
        money(
            overview.totalWages
        )
    );


    setText(
        "totalClanExpenses",
        money(
            overview.totalClanExpenses
        )
    );


    setText(
        "savingsBalance",
        money(
            overview.savingsBalance
        )
    );


    setText(
        "openAmount",
        money(
            overview.openAmount
        )
    );


    setText(
        "totalAssets",
        money(
            overview.totalAssets
        )
    );


    setText(
    "totalBookings",
    bookings.length
);


    setText(
        "orderCount",
        orderSettlements.length
    );

}


/* =====================================================
   FINANZÜBERSICHT AKTUALISIEREN
===================================================== */

function refreshFinancialOverview(){

    renderOverview();

}


/* =====================================================
   TEIL 3 ENDE
===================================================== */


        
/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 4 VON 10
   BUCHUNGEN
===================================================== */


/* =====================================================
   BUCHUNGSFORMULAR ÖFFNEN
===================================================== */

window.openBookingModal =
function(){

    if(!canCreateDeposit()){

        alert(
            "Du hast keine Berechtigung, eine Buchung zu erstellen."
        );

        return;

    }

    const date =
        document.getElementById(
            "bookingDate"
        );

    if(date){

        date.value =
            nowLocal();

    }


    const createdBy =
        document.getElementById(
            "bookingCreatedBy"
        );

    if(createdBy){

        createdBy.value =
            currentEmployee?.name ||
            currentEmployee?.username ||
            "";

    }


    /* Mitarbeiter dürfen ausschließlich
       Einzahlungen erstellen. */

    const type =
        document.getElementById(
            "bookingType"
        );

    if(
        type &&
        isMitarbeiter()
    ){

        type.value =
            "Einzahlung";

        type.disabled =
            true;

    }


    openModal(
        "bookingModal"
    );

};


/* =====================================================
   BUCHUNGSMODAL SCHLIESSEN
===================================================== */

window.closeBookingModal =
function(){

    const type =
        document.getElementById(
            "bookingType"
        );

    if(type){

        type.disabled =
            false;

    }

    closeModal(
        "bookingModal"
    );

};


/* =====================================================
   BUCHUNGSFORMULAR LEEREN
===================================================== */

function clearBookingForm(){

    [
        "bookingNumber",
        "bookingAmount",
        "bookingFrom",
        "bookingTo",
        "bookingPurpose",
        "bookingCategory",
        "bookingOrderNumber",
        "bookingPaymentMethod",
        "bookingNote"
    ]
    .forEach(
        id => {

            const element =
                document.getElementById(id);

            if(element){

                element.value =
                    "";

            }

        }
    );


    const date =
        document.getElementById(
            "bookingDate"
        );

    if(date){

        date.value =
            "";

    }


    const type =
        document.getElementById(
            "bookingType"
        );

    if(type){

        type.value =
            "Einzahlung";

        type.disabled =
            false;

    }

}


/* =====================================================
   BUCHUNG SPEICHERN
===================================================== */

window.saveBooking =
async function(){

    if(!canCreateDeposit()){

        alert(
            "Du hast keine Berechtigung für Buchungen."
        );

        return;

    }


    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    let type =
        getValue(
            "bookingType"
        ) ||
        "Einzahlung";


    /* Mitarbeiter dürfen keine
       Auszahlungen erstellen. */

    if(
        isMitarbeiter()
    ){

        type =
            "Einzahlung";

    }


    if(
        type !== "Einzahlung" &&
        type !== "Auszahlung"
    ){

        alert(
            "Ungültige Buchungsart."
        );

        return;

    }


    const amount =
        numberValue(
            getValue(
                "bookingAmount"
            )
        );


    if(amount <= 0){

        alert(
            "Bitte einen gültigen Betrag eingeben."
        );

        return;

    }


    /* Auszahlung nur für Leitung /
       Stadtleitung */

    if(
        type === "Auszahlung" &&
        !canManageBookkeeping()
    ){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auszahlungen erstellen."
        );

        return;

    }


    /* Auszahlung darf den Clanstand
       nicht überschreiten. */

    if(
        type === "Auszahlung" &&
        amount >
        getCurrentClanBalance()
    ){

        alert(
            "Die Auszahlung überschreitet den aktuellen Clanstand."
        );

        return;

    }


    const number =
        getValue(
            "bookingNumber"
        ) ||
        "BK-" +
        String(
            bookings.length + 1
        ).padStart(
            4,
            "0"
        );


    const date =
        getValue(
            "bookingDate"
        ) ||
        nowLocal();


    const createdBy =
        currentEmployee?.name ||
        currentEmployee?.username ||
        currentUser?.email ||
        "Unbekannt";


    const payload = {

        buchungsnummer:
            number,

        art:
            type,

        betrag:
            amount,

        von:
            getValue(
                "bookingFrom"
            ),

        an:
            getValue(
                "bookingTo"
            ),

        zweck:
            getValue(
                "bookingPurpose"
            ),

        kategorie:
            getValue(
                "bookingCategory"
            ),

        auftragsnummer:
            getValue(
                "bookingOrderNumber"
            ),

        zahlungsart:
            getValue(
                "bookingPaymentMethod"
            ),

        datum:
            date,

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy,

        status:
            "Gebucht",

        notiz:
            getValue(
                "bookingNote"
            ) ||
            null

    };


    try{

        const {
            data,
            error
        } =
            await buchhaltungDB
                .from(
                    TABLE_BOOKINGS
                )
                .insert(
                    payload
                )
                .select()
                .single();


        if(error){

            throw error;

        }


        if(data){

            bookings.unshift(
                data
            );

        }


        /* Protokoll */

        await writeActivityLog(
            "Buchung",
            type +
            " über " +
            money(amount) +
            " · " +
            number
        );


        /* Übersicht aktualisieren */

        renderBookings();

        renderOverview();


        /* Monatsbilanz */

        if(
            typeof updateMonthly ===
            "function"
        ){

            updateMonthly();

        }


        clearBookingForm();

        closeBookingModal();


        alert(
            type +
            " wurde erfolgreich gespeichert.\n\n" +
            money(amount)
        );


    }
    catch(error){

        console.error(
            "Fehler beim Speichern der Buchung:",
            error
        );

        showDatabaseError(error);

    }

};


/* =====================================================
   BUCHUNGEN ANZEIGEN
===================================================== */

function renderBookings(){

    const body =
        document.getElementById(
            "bookingTableBody"
        );

    if(!body){

        return;

    }


    if(
        !Array.isArray(bookings) ||
        bookings.length === 0
    ){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="12">
                    Noch keine Buchungen vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        bookings
            .map(
                booking => {

                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    booking.buchungsnummer ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.art ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${money(
                                    booking.betrag
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.von ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.an ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.zweck ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.kategorie ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.auftragsnummer ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.zahlungsart ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    booking.datum
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.erstellt_von_name ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.status ||
                                    "—"
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}

updateBookingSummary(bookings);


/* =====================================================
   BUCHUNGEN FILTERN
===================================================== */

window.filterBookings =
function(){

    const search =
        getValue(
            "bookingSearch"
        )
        .toLowerCase();


    const type =
        getValue(
            "bookingFilterType"
        );


    const category =
        getValue(
            "bookingFilterCategory"
        );


    const filtered =
        bookings.filter(
            booking => {

                const text = [

                    booking.buchungsnummer,

                    booking.art,

                    booking.betrag,

                    booking.von,

                    booking.an,

                    booking.zweck,

                    booking.kategorie,

                    booking.auftragsnummer,

                    booking.zahlungsart,

                    booking.erstellt_von_name,

                    booking.status,

                    booking.notiz

                ]
                .join(" ")
                .toLowerCase();


                return (

                    (
                        !search ||
                        text.includes(
                            search
                        )
                    )

                    &&

                    (
                        !type ||
                        booking.art ===
                        type
                    )

                    &&

                    (
                        !category ||
                        booking.kategorie ===
                        category
                    )

                );

            }
        );


    const body =
        document.getElementById(
            "bookingTableBody"
        );


    if(!body){

        return;

    }


    if(!filtered.length){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="12">
                    Keine passenden Buchungen gefunden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        filtered
            .map(
                booking => {

                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    booking.buchungsnummer ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.art ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${money(
                                    booking.betrag
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.von ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.an ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.zweck ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.kategorie ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.auftragsnummer ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.zahlungsart ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    booking.datum
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.erstellt_von_name ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    booking.status ||
                                    "—"
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

   updateBookingSummary(bookings);

};


/* =====================================================
   BUCHUNGEN AKTUALISIEREN
===================================================== */

function refreshBookings(){

    renderBookings();

    renderOverview();

}


/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 5 VON 10
   AUFTRAGSABRECHNUNG + ARBEITER + GEHÄLTER
===================================================== */


/* =====================================================
   ARBEITER AUS DEM AKTUELLEN AUFTRAG
===================================================== */

function renderCurrentWorkers(){

    const body =
        document.getElementById(
            "orderWorkersTableBody"
        );

    if(!body){

        return;

    }


    if(
        !Array.isArray(currentWorkers) ||
        currentWorkers.length === 0
    ){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">
                    Noch keine Arbeiter hinzugefügt.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        currentWorkers
            .map(
                (worker,index) => `

                    <tr>

                        <td>
                            ${escapeHtml(
                                worker.name ||
                                "Unbekannt"
                            )}
                        </td>

                        <td>
                            ${money(
                                worker.salary
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                worker.note ||
                                "—"
                            )}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="small-button"
                                onclick="removeCurrentWorker(${index})"
                            >
                                Entfernen
                            </button>

                        </td>

                    </tr>

                `
            )
            .join("");

}


/* =====================================================
   ARBEITER HINZUFÜGEN
===================================================== */

window.addOrderWorker =
function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Arbeiter verwalten."
        );

        return;

    }


    const name =
        getValue(
            "workerName"
        ).trim();


    const salary =
        numberValue(
            getValue(
                "workerSalary"
            )
        );


    const note =
        getValue(
            "workerNote"
        ).trim();


    if(!name){

        alert(
            "Bitte einen Arbeiter eintragen."
        );

        return;

    }


    if(salary <= 0){

        alert(
            "Bitte ein gültiges Gehalt eintragen."
        );

        return;

    }


    currentWorkers.push({

        name:
            name,

        salary:
            salary,

        note:
            note ||
            null

    });


    renderCurrentWorkers();


    const nameInput =
        document.getElementById(
            "workerName"
        );

    const salaryInput =
        document.getElementById(
            "workerSalary"
        );

    const noteInput =
        document.getElementById(
            "workerNote"
        );


    if(nameInput)
        nameInput.value = "";

    if(salaryInput)
        salaryInput.value = "";

    if(noteInput)
        noteInput.value = "";


    updateOrderWorkerTotal();

};


/* =====================================================
   ARBEITER ENTFERNEN
===================================================== */

window.removeCurrentWorker =
function(index){

    if(!canManageBookkeeping()){

        return;

    }


    if(
        index < 0 ||
        index >= currentWorkers.length
    ){

        return;

    }


    currentWorkers.splice(
        index,
        1
    );


    renderCurrentWorkers();

    updateOrderWorkerTotal();

};


/* =====================================================
   GESAMTE ARBEITERGEHÄLTER
===================================================== */

function getCurrentWorkerTotal(){

    return currentWorkers.reduce(
        (
            total,
            worker
        ) =>
            total +
            numberValue(
                worker.salary
            ),
        0
    );

}


function updateOrderWorkerTotal(){

    const total =
        getCurrentWorkerTotal();


    setText(
        "orderWorkerTotal",
        money(total)
    );


    /* Alternative ID, falls im HTML
       bereits vorhanden */

    setText(
        "orderTotalWages",
        money(total)
    );

}


/* =====================================================
   AUFTRAGSABRECHNUNG ÖFFNEN
===================================================== */

window.openOrderSettlementModal =
function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen erstellen."
        );

        return;

    }


    currentWorkers = [];


    clearOrderForm();


    setValue(
        "orderDate",
        nowLocal()
    );


    const createdBy =
        document.getElementById(
            "orderCreatedBy"
        );


    if(createdBy){

        createdBy.value =
            currentEmployee?.name ||
            currentEmployee?.username ||
            "";

    }


    renderCurrentWorkers();

    updateOrderWorkerTotal();


    openModal(
        "orderSettlementModal"
    );

};


/* =====================================================
   AUFTRAGSABRECHNUNG SCHLIESSEN
===================================================== */

window.closeOrderSettlementModal =
function(){

    currentWorkers = [];


    closeModal(
        "orderSettlementModal"
    );

};


/* =====================================================
   AUFTRAGSFORMULAR LEEREN
===================================================== */

function clearOrderForm(){

    [
        "orderNumber",
        "orderTotal",
        "orderClanAmount",
        "orderNote"
    ]
    .forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );

            if(element){

                element.value =
                    "";

            }

        }
    );


    const date =
        document.getElementById(
            "orderDate"
        );


    if(date){

        date.value =
            nowLocal();

    }


    const status =
        document.getElementById(
            "orderStatus"
        );


    if(status){

        status.value =
            "Offen";

    }


    const createdBy =
        document.getElementById(
            "orderCreatedBy"
        );


    if(createdBy){

        createdBy.value =
            currentEmployee?.name ||
            currentEmployee?.username ||
            "";

    }


    currentWorkers = [];


    renderCurrentWorkers();

    updateOrderWorkerTotal();

}


/* =====================================================
   AUFTRAGSABRECHNUNG SPEICHERN
===================================================== */

window.saveOrderSettlement =
async function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen erstellen."
        );

        return;

    }


    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    const orderNumber =
        getValue(
            "orderNumber"
        ).trim();


    const total =
        numberValue(
            getValue(
                "orderTotal"
            )
        );


    const clanAmount =
        numberValue(
            getValue(
                "orderClanAmount"
            )
        );


    const wages =
        getCurrentWorkerTotal();


    const status =
        getValue(
            "orderStatus"
        ) ||
        "Offen";


    const date =
        getValue(
            "orderDate"
        ) ||
        nowLocal();


    const note =
        getValue(
            "orderNote"
        ).trim();


    const createdBy =
        currentEmployee?.name ||
        currentEmployee?.username ||
        currentUser?.email ||
        "Unbekannt";


    if(!orderNumber){

        alert(
            "Bitte eine Auftragsnummer eingeben."
        );

        return;

    }


    if(total <= 0){

        alert(
            "Bitte einen gültigen Gesamtbetrag eingeben."
        );

        return;

    }


    if(clanAmount < 0){

        alert(
            "Der Clanbetrag darf nicht negativ sein."
        );

        return;

    }


    if(wages < 0){

        alert(
            "Die Gehälter dürfen nicht negativ sein."
        );

        return;

    }


    /*
       Kontrolle:
       Clanbetrag + Arbeitergehälter
       darf den Gesamtbetrag nicht überschreiten.
    */

    if(
        clanAmount + wages >
        total
    ){

        alert(
            "Clanbetrag und Arbeitergehälter überschreiten den Gesamtbetrag."
        );

        return;

    }


    const payload = {

        auftragsnummer:
            orderNumber,

        gesamtbetrag:
            total,

        clanbetrag:
            clanAmount,

        gesamt_gehaelter:
            wages,

        status:
            status,

        datum:
            date,

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy,

        notiz:
            note ||
            null

    };


    try{

        const {
            data,
            error
        } =
            await buchhaltungDB
                .from(
                    TABLE_ORDERS
                )
                .insert(
                    payload
                )
                .select()
                .single();


        if(error){

            throw error;

        }


        if(!data){

            throw new Error(
                "Die Auftragsabrechnung wurde nicht zurückgegeben."
            );

        }


        /*
           Arbeiter erst nach erfolgreicher
           Auftragsabrechnung speichern.
        */

        if(
            currentWorkers.length > 0
        ){

            const workerRows =
                currentWorkers.map(
                    worker => ({

                        auftragsabrechnung_id:
                            data.id,

                        arbeiter_name:
                            worker.name,

                        gehalt:
                            numberValue(
                                worker.salary
                            ),

                        notiz:
                            worker.note ||
                            null

                    })
                );


            const {
                error:
                    workerError
            } =
                await buchhaltungDB
                    .from(
                        TABLE_ORDER_WORKERS
                    )
                    .insert(
                        workerRows
                    );


            if(workerError){

                /*
                   Die Abrechnung existiert bereits.
                   Deshalb nicht stillschweigend löschen.
                */

                console.error(
                    "Fehler beim Speichern der Arbeiter:",
                    workerError
                );

                alert(
                    "Die Auftragsabrechnung wurde gespeichert, aber die Arbeiter konnten nicht vollständig gespeichert werden."
                );

            }

        }


        /*
           Lokale Daten aktualisieren
        */

        orderSettlements.unshift(
            {
                ...data
            }
        );


        /*
           Arbeiter erneut aus der Datenbank laden,
           damit die IDs korrekt vorhanden sind.
        */

        const {
            data:
                freshWorkers,
            error:
                freshWorkerError
        } =
            await buchhaltungDB
                .from(
                    TABLE_ORDER_WORKERS
                )
                .select("*")
                .eq(
                    "auftragsabrechnung_id",
                    data.id
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            true
                    }
                );


        if(!freshWorkerError){

            workers.push(
                ...(freshWorkers || [])
            );

        }


        if(
            typeof writeActivityLog ===
            "function"
        ){

            await writeActivityLog(
                "Auftragsabrechnung",
                "Auftrag " +
                orderNumber +
                " · " +
                money(total)
            );

        }


        renderOrderSettlements();


        renderOverview();


        if(
            typeof updateMonthly ===
            "function"
        ){

            updateMonthly();

        }


        clearOrderForm();


        currentWorkers = [];


        closeModal(
            "orderSettlementModal"
        );


        alert(
            "Auftragsabrechnung wurde gespeichert."
        );


    }
    catch(error){

        console.error(
            "Fehler bei der Auftragsabrechnung:",
            error
        );


        showDatabaseError(
            error
        );

    }

};


/* =====================================================
   AUFTRAGSABRECHNUNGEN ANZEIGEN
===================================================== */

function renderOrderSettlements(){

    const body =
        document.getElementById(
            "orderTableBody"
        );


    if(!body){

        return;

    }


    if(
        !Array.isArray(
            orderSettlements
        ) ||
        orderSettlements.length === 0
    ){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    Noch keine Auftragsabrechnungen vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        orderSettlements
            .map(
                order => {

                    const orderWorkers =
                        workers.filter(
                            worker =>
                                String(
                                    worker.auftragsabrechnung_id
                                ) ===
                                String(
                                    order.id
                                )
                        );


                    const workerNames =
                        orderWorkers.length
                        ? orderWorkers
                            .map(
                                worker =>
                                    escapeHtml(
                                        worker.arbeiter_name ||
                                        "Unbekannt"
                                    )
                            )
                            .join(
                                ", "
                            )
                        : "—";


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    order.auftragsnummer ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${money(
                                    order.gesamtbetrag
                                )}
                            </td>

                            <td>
                                ${money(
                                    order.clanbetrag
                                )}
                            </td>

                            <td>
                                ${money(
                                    order.gesamt_gehaelter
                                )}
                            </td>

                            <td>
                                ${workerNames}
                            </td>

                            <td>
                                ${escapeHtml(
                                    order.status ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    order.datum
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    order.erstellt_von_name ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    order.notiz ||
                                    "—"
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}

/* =====================================================
   AUFTRAGSABRECHNUNGEN FILTERN
===================================================== */

window.filterOrderSettlements =
function(){

    const search =
        getValue(
            "orderSearch"
        ).toLowerCase();


    const status =
        getValue(
            "orderStatusFilter"
        );


    const filtered =
        orderSettlements.filter(
            order => {

                const text = [

                    order.auftragsnummer,

                    order.gesamtbetrag,

                    order.clanbetrag,

                    order.gesamt_gehaelter,

                    order.status,

                    order.erstellt_von_name,

                    order.notiz

                ]
                .join(" ")
                .toLowerCase();


                return (

                    (
                        !search ||
                        text.includes(
                            search
                        )
                    )

                    &&

                    (
                        !status ||
                        order.status ===
                        status
                    )

                );

            }
        );


    const body =
        document.getElementById(
            "orderTableBody"
        );


    if(!body){

        return;

    }


    if(!filtered.length){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    Keine passenden Auftragsabrechnungen gefunden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        filtered
            .map(
                order => {

                    const orderWorkers =
                        workers.filter(
                            worker =>
                                String(
                                    worker.auftragsabrechnung_id
                                ) ===
                                String(
                                    order.id
                                )
                        );


                    const workerNames =
                        orderWorkers.length
                        ? orderWorkers
                            .map(
                                worker =>
                                    escapeHtml(
                                        worker.arbeiter_name ||
                                        "Unbekannt"
                                    )
                            )
                            .join(
                                ", "
                            )
                        : "—";


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    order.auftragsnummer ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${money(
                                    order.gesamtbetrag
                                )}
                            </td>

                            <td>
                                ${money(
                                    order.clanbetrag
                                )}
                            </td>

                            <td>
                                ${money(
                                    order.gesamt_gehaelter
                                )}
                            </td>

                            <td>
                                ${workerNames}
                            </td>

                            <td>
                                ${escapeHtml(
                                    order.status ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    order.datum
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    order.erstellt_von_name ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    order.notiz ||
                                    "—"
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

};


/* =====================================================
   AUFTRAGSABRECHNUNGEN AKTUALISIEREN
===================================================== */

function refreshOrderSettlements(){

    renderOrderSettlements();

    renderOverview();

}


/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 6 VON 10
   SPARKONTO
===================================================== */


/* =====================================================
   SPARKONTO – AKTUELLEN STAND BERECHNEN
===================================================== */

function calculateSavingsBalance(){

    let balance = 0;


    savingsTransactions.forEach(
        transaction => {

            const amount =
                numberValue(
                    transaction.betrag
                );


            const type =
                String(
                    transaction.art ||
                    ""
                ).trim();


            if(
                type === "Einzahlung"
            ){

                balance += amount;

            }
            else if(
                type === "Auszahlung"
            ){

                balance -= amount;

            }

        }
    );


    return balance;

}


/* =====================================================
   SPARKONTO – ÜBERSICHT
===================================================== */

function renderSavings(){

    const balance =
        calculateSavingsBalance();


    setText(
        "savingsBalance",
        money(balance)
    );


    setText(
        "savingsGoal",
        money(savingsGoalValue)
    );


    let progress = 0;


    if(
        savingsGoalValue > 0
    ){

        progress =
            (
                balance /
                savingsGoalValue
            ) *
            100;

    }


    progress =
        Math.max(
            0,
            Math.min(
                100,
                progress
            )
        );


    setText(
        "savingsProgress",
        Math.round(progress) + "%"
    );


    const progressBar =
        document.getElementById(
            "savingsProgressBar"
        );


    if(progressBar){

        progressBar.style.width =
            progress + "%";

    }


    renderSavingsHistory();

}


/* =====================================================
   SPARKZIEL SETZEN
===================================================== */

window.setSavingsGoal =
function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen das Sparziel ändern."
        );

        return;

    }


    const input =
        prompt(
            "Neues Sparziel in $ eingeben:"
        );


    if(
        input === null
    ){

        return;

    }


    const goal =
        numberValue(
            input
        );


    if(goal < 0){

        alert(
            "Das Sparziel darf nicht negativ sein."
        );

        return;

    }


    savingsGoalValue =
        goal;


    renderSavings();


    if(
        typeof writeActivityLog ===
        "function"
    ){

        writeActivityLog(
            "Sparkonto",
            "Sparziel geändert auf " +
            money(goal)
        );

    }

};


/* =====================================================
   SPARKONTO-MODAL ÖFFNEN
===================================================== */

window.openSavingsModal =
function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen das Sparkonto verwalten."
        );

        return;

    }


    clearSavingsForm();


    setValue(
        "savingsDate",
        nowLocal()
    );


    const createdBy =
        document.getElementById(
            "savingsCreatedBy"
        );


    if(createdBy){

        createdBy.value =
            currentEmployee?.name ||
            currentEmployee?.username ||
            "";

    }


    openModal(
        "savingsModal"
    );

};


/* =====================================================
   SPARKONTO-MODAL SCHLIESSEN
===================================================== */

window.closeSavingsModal =
function(){

    closeModal(
        "savingsModal"
    );

};


/* Falls HTML diese Funktion verwendet */

window.closeSavings =
function(){

    closeSavingsModal();

};


/* =====================================================
   SPARKONTO-FORMULAR LEEREN
===================================================== */

function clearSavingsForm(){

    [
        "savingsNumber",
        "savingsAmount",
        "savingsFrom",
        "savingsTo",
        "savingsPurpose",
        "savingsNote"
    ]
    .forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );

            if(element){

                element.value =
                    "";

            }

        }
    );


    const type =
        document.getElementById(
            "savingsType"
        );


    if(type){

        type.value =
            "Einzahlung";

    }


    const date =
        document.getElementById(
            "savingsDate"
        );


    if(date){

        date.value =
            nowLocal();

    }

}


/* =====================================================
   SPARKONTO – BUCHUNG SPEICHERN
===================================================== */

window.saveSavings =
async function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen das Sparkonto verwalten."
        );

        return;

    }


    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    const type =
        getValue(
            "savingsType"
        ) ||
        "Einzahlung";


    const amount =
        numberValue(
            getValue(
                "savingsAmount"
            )
        );


    const date =
        getValue(
            "savingsDate"
        ) ||
        nowLocal();


    const currentBalance =
        calculateSavingsBalance();


    if(
        type !== "Einzahlung" &&
        type !== "Auszahlung"
    ){

        alert(
            "Ungültige Sparkonto-Buchungsart."
        );

        return;

    }


    if(amount <= 0){

        alert(
            "Bitte einen gültigen Betrag eingeben."
        );

        return;

    }


    /* Auszahlung darf das Sparkonto
       nicht ins Minus bringen. */

    if(
        type === "Auszahlung" &&
        amount > currentBalance
    ){

        alert(
            "Die Auszahlung überschreitet das vorhandene Sparkonto-Guthaben."
        );

        return;

    }


    const bookingNumber =
        getValue(
            "savingsNumber"
        ) ||
        "SK-" +
        String(
            savingsTransactions.length + 1
        ).padStart(
            4,
            "0"
        );


    const createdBy =
        currentEmployee?.name ||
        currentEmployee?.username ||
        currentUser?.email ||
        "Unbekannt";


    const payload = {

        buchungsnummer:
            bookingNumber,

        art:
            type,

        betrag:
            amount,

        von:
            getValue(
                "savingsFrom"
            ),

        an:
            getValue(
                "savingsTo"
            ),

        zweck:
            getValue(
                "savingsPurpose"
            ),

        datum:
            date,

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy,

        notiz:
            getValue(
                "savingsNote"
            ) ||
            null

    };


    try{

        const {
            data,
            error
        } =
            await buchhaltungDB
                .from(
                    TABLE_SAVINGS
                )
                .insert(
                    payload
                )
                .select()
                .single();


        if(error){

            throw error;

        }


        if(data){

            savingsTransactions.unshift(
                data
            );

        }


        if(
            typeof writeActivityLog ===
            "function"
        ){

            await writeActivityLog(
                "Sparkonto",
                type +
                " über " +
                money(amount) +
                " · " +
                bookingNumber
            );

        }


        renderSavings();


        /* Finanzübersicht aktualisieren */

        renderOverview();


        if(
            typeof runFinancialControl ===
            "function"
        ){

            runFinancialControl();

        }


        clearSavingsForm();


        closeSavingsModal();


        alert(
            "Sparkonto-Buchung wurde gespeichert."
        );


    }
    catch(error){

        console.error(
            "Fehler beim Sparkonto:",
            error
        );


        showDatabaseError(
            error
        );

    }

};


/* =====================================================
   SPARKONTO – HISTORIE
===================================================== */

function renderSavingsHistory(){

    const body =
        document.getElementById(
            "savingsTableBody"
        );


    if(!body){

        return;

    }


    if(
        !Array.isArray(
            savingsTransactions
        ) ||
        savingsTransactions.length === 0
    ){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    Noch keine Sparkonto-Buchungen vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        savingsTransactions
            .map(
                transaction => `

                    <tr>

                        <td>
                            ${escapeHtml(
                                transaction.buchungsnummer ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.art ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${money(
                                transaction.betrag
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.von ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.an ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.zweck ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                transaction.datum
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.erstellt_von_name ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.notiz ||
                                "—"
                            )}
                        </td>

                    </tr>

                `
            )
            .join("");

}


/* =====================================================
   SPARKONTO – FILTER
===================================================== */

window.filterSavings =
function(){

    const search =
        getValue(
            "savingsSearch"
        ).toLowerCase();


    const type =
        getValue(
            "savingsFilterType"
        );


    const filtered =
        savingsTransactions.filter(
            transaction => {

                const text = [

                    transaction.buchungsnummer,

                    transaction.art,

                    transaction.betrag,

                    transaction.von,

                    transaction.an,

                    transaction.zweck,

                    transaction.erstellt_von_name,

                    transaction.notiz

                ]
                .join(" ")
                .toLowerCase();


                return (

                    (
                        !search ||
                        text.includes(
                            search
                        )
                    )

                    &&

                    (
                        !type ||
                        transaction.art ===
                        type
                    )

                );

            }
        );


    const body =
        document.getElementById(
            "savingsTableBody"
        );


    if(!body){

        return;

    }


    if(!filtered.length){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    Keine passenden Sparkonto-Buchungen gefunden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        filtered
            .map(
                transaction => `

                    <tr>

                        <td>
                            ${escapeHtml(
                                transaction.buchungsnummer ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.art ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${money(
                                transaction.betrag
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.von ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.an ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.zweck ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                transaction.datum
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.erstellt_von_name ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.notiz ||
                                "—"
                            )}
                        </td>

                    </tr>

                `
            )
            .join("");

};


/* =====================================================
   SPARKONTO AKTUALISIEREN
===================================================== */

function refreshSavings(){

    renderSavings();

    renderOverview();

}

/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 7 VON 10
   MITARBEITER + MONATSAUSWERTUNG
===================================================== */


/* =====================================================
   MITARBEITER – DATEN BERECHNEN
===================================================== */

function getEmployeeStatistics(employeeName){

    let orders = 0;
    let wages = 0;
    let deposits = 0;
    let withdrawals = 0;
    let openAmount = 0;


    /* Aufträge */

    orderSettlements.forEach(
        order => {

            const orderWorkers =
                workers.filter(
                    worker =>
                        String(
                            worker.auftragsabrechnung_id
                        ) ===
                        String(
                            order.id
                        )
                );


            orderWorkers.forEach(
                worker => {

                    if(
                        String(
                            worker.arbeiter_name ||
                            ""
                        ).trim() !==
                        String(
                            employeeName ||
                            ""
                        ).trim()
                    ){

                        return;

                    }


                    orders++;

                    wages +=
                        numberValue(
                            worker.gehalt
                        );


                    /*
                       Offene Beträge werden anhand
                       des Auftragsstatus berücksichtigt.
                    */

                    const status =
                        String(
                            order.status ||
                            ""
                        ).trim();


                    if(
                        status === "Offen"
                    ){

                        openAmount +=
                            numberValue(
                                worker.gehalt
                            );

                    }
                    else if(
                        status === "Teilweise bezahlt"
                    ){

                        openAmount +=
                            numberValue(
                                worker.gehalt
                            );

                    }

                }
            );

        }
    );


    /* Ein- und Auszahlungen */

    bookings.forEach(
        booking => {

            const from =
                String(
                    booking.von ||
                    ""
                ).trim();


            const to =
                String(
                    booking.an ||
                    ""
                ).trim();


            const amount =
                numberValue(
                    booking.betrag
                );


            const type =
                String(
                    booking.art ||
                    ""
                ).trim();


            if(
                from === employeeName &&
                type === "Einzahlung"
            ){

                deposits +=
                    amount;

            }


            if(
                to === employeeName &&
                type === "Auszahlung"
            ){

                withdrawals +=
                    amount;

            }

        }
    );


    return {

        orders,
        wages,
        deposits,
        withdrawals,
        openAmount

    };

}


/* =====================================================
   MITARBEITERÜBERSICHT RENDERN
===================================================== */

function renderEmployees(){

    const body =
        document.getElementById(
            "employeeTableBody"
        );


    if(!body){

        return;

    }


    if(
        !Array.isArray(
            employees
        ) ||
        employees.length === 0
    ){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    Keine Mitarbeiter gefunden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        employees
            .map(
                employee => {

                    const name =
                        employee.name ||
                        employee.username ||
                        employee.minecraft_name ||
                        "Unbekannt";


                    const stats =
                        getEmployeeStatistics(
                            name
                        );


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    name
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    employee.rang ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${stats.orders}
                            </td>

                            <td>
                                ${money(
                                    stats.wages
                                )}
                            </td>

                            <td>
                                ${money(
                                    stats.deposits
                                )}
                            </td>

                            <td>
                                ${money(
                                    stats.withdrawals
                                )}
                            </td>

                            <td>
                                ${money(
                                    stats.openAmount
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* =====================================================
   MITARBEITER SUCHEN
===================================================== */

window.filterEmployees =
function(){

    const search =
        getValue(
            "employeeSearch"
        ).toLowerCase();


    const filtered =
        employees.filter(
            employee => {

                const text = [

                    employee.name,

                    employee.username,

                    employee.minecraft_name,

                    employee.rang,

                    employee.rolle

                ]
                .join(" ")
                .toLowerCase();


                return (
                    !search ||
                    text.includes(
                        search
                    )
                );

            }
        );


    const body =
        document.getElementById(
            "employeeTableBody"
        );


    if(!body){

        return;

    }


    if(!filtered.length){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    Keine passenden Mitarbeiter gefunden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        filtered
            .map(
                employee => {

                    const name =
                        employee.name ||
                        employee.username ||
                        employee.minecraft_name ||
                        "Unbekannt";


                    const stats =
                        getEmployeeStatistics(
                            name
                        );


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    name
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    employee.rang ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${stats.orders}
                            </td>

                            <td>
                                ${money(
                                    stats.wages
                                )}
                            </td>

                            <td>
                                ${money(
                                    stats.deposits
                                )}
                            </td>

                            <td>
                                ${money(
                                    stats.withdrawals
                                )}
                            </td>

                            <td>
                                ${money(
                                    stats.openAmount
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

};


/* =====================================================
   MONATSAUSWERTUNG
===================================================== */

function updateMonthly(){

    const period =
        getValue(
            "monthlyPeriod"
        ) ||
        new Date()
            .toISOString()
            .slice(
                0,
                7
            );


    const parts =
        period.split(
            "-"
        );


    const year =
        Number(
            parts[0]
        );


    const month =
        Number(
            parts[1]
        );


    let income = 0;
    let expenses = 0;
    let wages = 0;
    let count = 0;


    bookings.forEach(
        booking => {

            const dateValue =
                booking.datum ||
                booking.date;


            if(!dateValue){

                return;

            }


            const date =
                new Date(
                    dateValue
                );


            if(
                date.getFullYear() !==
                year ||
                date.getMonth() + 1 !==
                month
            ){

                return;

            }


            count++;


            const type =
                booking.art ||
                booking.type;


            const amount =
                numberValue(
                    booking.betrag ??
                    booking.amount
                );


            if(
                type === "Einzahlung"
            ){

                income +=
                    amount;

            }
            else if(
                type === "Auszahlung"
            ){

                expenses +=
                    amount;

            }


            const category =
                booking.kategorie ||
                booking.category;


            if(
                category === "Gehalt" ||
                category === "Arbeitergehalt"
            ){

                wages +=
                    amount;

            }

        }
    );


    const change =
        income -
        expenses;


    setText(
        "monthlyIncome",
        money(income)
    );


    setText(
        "monthlyExpenses",
        money(expenses)
    );


    setText(
        "monthlyWages",
        money(wages)
    );


    setText(
        "monthlyChange",
        money(change)
    );


    setText(
        "monthlyBookingCount",
        count
    );


    setText(
        "monthlyLabel",
        String(month)
            .padStart(
                2,
                "0"
            ) +
        "/" +
        year
    );

}


/* =====================================================
   MONATSAUSWERTUNG ÖFFENTLICH
===================================================== */

window.updateMonthlyBalance =
function(){

    updateMonthly();

};


/* =====================================================
   MONATSZEITRAUM VOREINSTELLEN
===================================================== */

function initializeMonthlyPeriod(){

    const input =
        document.getElementById(
            "monthlyPeriod"
        );


    if(
        input &&
        !input.value
    ){

        input.value =
            new Date()
                .toISOString()
                .slice(
                    0,
                    7
                );

    }


    updateMonthly();

}


/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 8 VON 10
   KASSENABGLEICH + FINANZKONTROLLE
===================================================== */


/* =====================================================
   KASSENABGLEICH ÖFFNEN
===================================================== */

window.openCashCheck =
function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen einen Kassenabgleich durchführen."
        );

        return;

    }


    setValue(
        "cashCheckDate",
        nowLocal()
    );


    setValue(
        "cashPortalInput",
        getCurrentClanBalance()
    );


    setValue(
        "cashIngameInput",
        ""
    );


    setValue(
        "cashCheckNote",
        ""
    );


    const createdBy =
        document.getElementById(
            "cashCheckCreatedBy"
        );


    if(createdBy){

        createdBy.value =
            currentEmployee?.name ||
            currentEmployee?.username ||
            "";

    }


    updateCashDifference();


    openModal(
        "cashCheckModal"
    );

};


/* =====================================================
   KASSENABGLEICH SCHLIESSEN
===================================================== */

window.closeCashCheck =
function(){

    closeModal(
        "cashCheckModal"
    );

};


/* =====================================================
   ABWEICHUNG BERECHNEN
===================================================== */

window.updateCashDifference =
function(){

    const portal =
        numberValue(
            getValue(
                "cashPortalInput"
            )
        );


    const ingame =
        numberValue(
            getValue(
                "cashIngameInput"
            )
        );


    const difference =
        ingame -
        portal;


    setText(
        "cashDifference",
        money(difference)
    );


    const warning =
        document.getElementById(
            "cashCheckWarning"
        );


    if(!warning){

        return;

    }


    if(
        difference === 0
    ){

        warning.textContent =
            "Kassenstand stimmt überein.";

        warning.classList.remove(
            "warning"
        );

        warning.classList.add(
            "success"
        );

    }
    else{

        warning.textContent =
            "Achtung: Portalstand und Ingame-Stand weichen voneinander ab.";

        warning.classList.remove(
            "success"
        );

        warning.classList.add(
            "warning"
        );

    }

};


/* =====================================================
   KASSENABGLEICH SPEICHERN
===================================================== */

window.saveCashCheck =
async function(){

    if(!canManageBookkeeping()){

        alert(
            "Keine Berechtigung für den Kassenabgleich."
        );

        return;

    }


    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    const portal =
        numberValue(
            getValue(
                "cashPortalInput"
            )
        );


    const ingame =
        numberValue(
            getValue(
                "cashIngameInput"
            )
        );


    const difference =
        ingame -
        portal;


    const date =
        getValue(
            "cashCheckDate"
        ) ||
        nowLocal();


    const createdBy =
        currentEmployee?.name ||
        currentEmployee?.username ||
        currentUser?.email ||
        "Unbekannt";


    const note =
        getValue(
            "cashCheckNote"
        ).trim();


    const payload = {

        portalstand:
            portal,

        ingame_stand:
            ingame,

        abweichung:
            difference,

        datum:
            date,

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy,

        notiz:
            note ||
            null

    };


    try{

        const {
            data,
            error
        } =
            await buchhaltungDB
                .from(
                    TABLE_CASH_CHECKS
                )
                .insert(
                    payload
                )
                .select()
                .single();


        if(error){

            throw error;

        }


        if(data){

            cashChecks.unshift(
                data
            );

        }


        if(
            typeof writeActivityLog ===
            "function"
        ){

            await writeActivityLog(
                "Kassenabgleich",
                "Portal: " +
                money(portal) +
                " · Ingame: " +
                money(ingame) +
                " · Abweichung: " +
                money(difference)
            );

        }


        renderCashChecks();


        closeCashCheck();


        if(
            difference !== 0
        ){

            alert(
                "Kassenabgleich gespeichert.\n\n" +
                "Abweichung: " +
                money(difference)
            );

        }
        else{

            alert(
                "Kassenabgleich gespeichert.\n\n" +
                "Keine Abweichung."
            );

        }


    }
    catch(error){

        console.error(
            "Fehler beim Kassenabgleich:",
            error
        );


        showDatabaseError(
            error
        );

    }

};


/* =====================================================
   KASSENABGLEICHE ANZEIGEN
===================================================== */

function renderCashChecks(){

    const body =
        document.getElementById(
            "cashCheckTableBody"
        );


    if(!body){

        return;

    }


    if(
        !Array.isArray(
            cashChecks
        ) ||
        cashChecks.length === 0
    ){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    Noch keine Kassenabgleiche vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        cashChecks
            .map(
                check => {

                    const difference =
                        numberValue(
                            check.abweichung
                        );


                    return `
                        <tr>

                            <td>
                                ${formatDate(
                                    check.datum
                                )}
                            </td>

                            <td>
                                ${money(
                                    check.portalstand
                                )}
                            </td>

                            <td>
                                ${money(
                                    check.ingame_stand
                                )}
                            </td>

                            <td>
                                ${money(
                                    difference
                                )}
                            </td>

                            <td>
                                ${
                                    difference === 0
                                    ? "Stimmt überein"
                                    : "Abweichung"
                                }
                            </td>

                            <td>
                                ${escapeHtml(
                                    check.erstellt_von_name ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    check.notiz ||
                                    "—"
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* =====================================================
   FINANZKONTROLLE
===================================================== */

function runFinancialControl(){

    const warnings = [];


    /* -------------------------------------------------
       1. CLANKASSE
    ------------------------------------------------- */

    const clanBalance =
        getCurrentClanBalance();


    if(
        clanBalance < 0
    ){

        warnings.push({
            type:
                "error",

            text:
                "Die Clankasse befindet sich unter 0 $."
        });

    }


    /* -------------------------------------------------
       2. SPARKONTO
    ------------------------------------------------- */

    const savingsBalance =
        getSavingsBalance();


    if(
        savingsBalance < 0
    ){

        warnings.push({
            type:
                "error",

            text:
                "Das Sparkonto befindet sich unter 0 $."
        });

    }


    /* -------------------------------------------------
       3. OFFENE AUFTRÄGE
    ------------------------------------------------- */

    orderSettlements.forEach(
        order => {

            const status =
                String(
                    order.status ||
                    ""
                ).trim();


            if(
                status === "Offen" ||
                status === "Teilweise bezahlt"
            ){

                warnings.push({

                    type:
                        "warning",

                    text:
                        "Auftrag " +
                        (
                            order.auftragsnummer ||
                            "Unbekannt"
                        ) +
                        " ist noch nicht vollständig abgeschlossen."

                });

            }

        }
    );


    /* -------------------------------------------------
       4. AUFTRÄGE MIT NICHT VERTEILTEM BETRAG
    ------------------------------------------------- */

    orderSettlements.forEach(
        order => {

            const total =
                numberValue(
                    order.gesamtbetrag
                );


            const clan =
                numberValue(
                    order.clanbetrag
                );


            const wages =
                numberValue(
                    order.gesamt_gehaelter
                );


            const distributed =
                clan +
                wages;


            if(
                distributed >
                total
            ){

                warnings.push({

                    type:
                        "error",

                    text:
                        "Auftrag " +
                        (
                            order.auftragsnummer ||
                            "Unbekannt"
                        ) +
                        " überschreitet den Gesamtbetrag."

                });

            }

        }
    );


    /* -------------------------------------------------
       5. AUSZAHLUNGEN ÜBER CLANKASSE
    ------------------------------------------------- */

    let runningBalance = 0;


    /*
       Älteste Buchung zuerst,
       damit der Verlauf geprüft werden kann.
    */

    const sortedBookings =
        [...bookings]
            .sort(
                (a,b) =>
                    new Date(
                        a.datum || 0
                    ) -
                    new Date(
                        b.datum || 0
                    )
            );


    sortedBookings.forEach(
        booking => {

            const amount =
                numberValue(
                    booking.betrag
                );


            const type =
                String(
                    booking.art ||
                    ""
                ).trim();


            if(
                type === "Einzahlung"
            ){

                runningBalance +=
                    amount;

            }
            else if(
                type === "Auszahlung"
            ){

                runningBalance -=
                    amount;


                if(
                    runningBalance < 0
                ){

                    warnings.push({

                        type:
                            "error",

                        text:
                            "Eine Auszahlung führt im Buchungsverlauf zu einem negativen Clanstand."

                    });

                }

            }

        }
    );


    /* -------------------------------------------------
       WARNUNGEN AUSGEBEN
    ------------------------------------------------- */

    renderFinancialWarnings(
        warnings
    );


    return warnings;

}


/* =====================================================
   WARNUNGEN RENDERN
===================================================== */

function renderFinancialWarnings(
    warnings
){

    const container =
        document.getElementById(
            "financialWarnings"
        );


    if(!container){

        return;

    }


    if(
        !warnings ||
        warnings.length === 0
    ){

        container.innerHTML = `
            <div class="financial-ok">
                Keine finanziellen Warnungen vorhanden.
            </div>
        `;

        return;

    }


    container.innerHTML =
        warnings
            .map(
                warning => `

                    <div class="
                        financial-warning
                        ${escapeHtml(
                            warning.type
                        )}
                    ">

                        ${escapeHtml(
                            warning.text
                        )}

                    </div>

                `
            )
            .join("");

}


/* =====================================================
   KONTROLLE MANUELL STARTEN
===================================================== */

window.checkFinances =
function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen die Finanzkontrolle durchführen."
        );

        return;

    }


    const warnings =
        runFinancialControl();


    if(
        warnings.length === 0
    ){

        alert(
            "Finanzkontrolle abgeschlossen.\n\nKeine Auffälligkeiten gefunden."
        );

    }
    else{

        alert(
            "Finanzkontrolle abgeschlossen.\n\n" +
            warnings.length +
            " Hinweis(e) gefunden."
        );

    }

};


/* =====================================================
   ALLE KONTROLLEN AKTUALISIEREN
===================================================== */

function refreshFinancialControl(){

    runFinancialControl();

    renderCashChecks();

}


/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 9 VON 10
   PROTOKOLL + AUDIT + ÄNDERUNGSVERLAUF
===================================================== */


/* =====================================================
   PROTOKOLLEINTRAG ERSTELLEN
===================================================== */

async function writeActivityLog(
    action,
    description,
    details = null
){

    if(!hasSupabase()){

        console.warn(
            "Kein Supabase – Protokolleintrag nicht gespeichert."
        );

        return null;

    }


    const createdBy =
        currentEmployee?.name ||
        currentEmployee?.username ||
        currentUser?.email ||
        "Unbekannt";


    const payload = {

        aktion:
            action,

        beschreibung:
            description,

        details:
            details
            ? (
                typeof details === "string"
                ? details
                : JSON.stringify(
                    details
                )
            )
            : null,

        datum:
            nowLocal(),

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy

    };


    try{

        const {
            data,
            error
        } =
            await buchhaltungDB
                .from(
                    TABLE_LOGS
                )
                .insert(
                    payload
                )
                .select()
                .single();


        if(error){

            console.error(
                "Protokolleintrag konnte nicht gespeichert werden:",
                error
            );

            return null;

        }


        if(data){

            activityLogs.unshift(
                data
            );

        }


        renderActivityLogs();


        return data;

    }
    catch(error){

        console.error(
            "Fehler beim Protokoll:",
            error
        );

        return null;

    }

}


/* =====================================================
   PROTOKOLL ANZEIGEN
===================================================== */

function renderActivityLogs(){

    const body =
        document.getElementById(
            "activityLogTableBody"
        );


    if(!body){

        return;

    }


    if(
        !Array.isArray(
            activityLogs
        ) ||
        activityLogs.length === 0
    ){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    Noch keine Protokolleinträge vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        activityLogs
            .map(
                log => {

                    return `
                        <tr>

                            <td>
                                ${formatDate(
                                    log.datum
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    log.aktion ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    log.beschreibung ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    log.erstellt_von_name ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    log.details ||
                                    "—"
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* =====================================================
   PROTOKOLL SUCHEN
===================================================== */

window.filterActivityLogs =
function(){

    const search =
        getValue(
            "activityLogSearch"
        ).toLowerCase();


    const filtered =
        activityLogs.filter(
            log => {

                const text = [

                    log.aktion,

                    log.beschreibung,

                    log.erstellt_von_name,

                    log.details,

                    log.datum

                ]
                .join(" ")
                .toLowerCase();


                return (
                    !search ||
                    text.includes(
                        search
                    )
                );

            }
        );


    const body =
        document.getElementById(
            "activityLogTableBody"
        );


    if(!body){

        return;

    }


    if(!filtered.length){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    Keine passenden Protokolle gefunden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        filtered
            .map(
                log => `

                    <tr>

                        <td>
                            ${formatDate(
                                log.datum
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                log.aktion ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                log.beschreibung ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                log.erstellt_von_name ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                log.details ||
                                "—"
                            )}
                        </td>

                    </tr>

                `
            )
            .join("");

};


/* =====================================================
   AUDIT-INFORMATION
===================================================== */

function getAuditUser(){

    return {

        id:
            currentUser?.id ||
            null,

        name:
            currentEmployee?.name ||
            currentEmployee?.username ||
            currentUser?.email ||
            "Unbekannt",

        rang:
            currentEmployee?.rang ||
            "Unbekannt"

    };

}


/* =====================================================
   AUDIT-EINTRAG FÜR ÄNDERUNGEN
===================================================== */

async function createAuditEntry(
    action,
    recordType,
    recordId,
    oldValues = null,
    newValues = null
){

    const user =
        getAuditUser();


    const details = {

        aktion:
            action,

        bereich:
            recordType,

        datensatz:
            recordId,

        benutzer:
            user,

        vorher:
            oldValues,

        nachher:
            newValues

    };


    return await writeActivityLog(
        "Audit",
        action +
        " · " +
        recordType +
        (
            recordId
            ? " · " + recordId
            : ""
        ),
        details
    );

}


/* =====================================================
   STORNO PROTOKOLLIEREN
===================================================== */

async function logCancellation(
    recordType,
    recordId,
    reason = ""
){

    if(
        !canManageBookkeeping()
    ){

        return null;

    }


    return await writeActivityLog(
        "Storno",
        recordType +
        " wurde storniert" +
        (
            recordId
            ? " · " + recordId
            : ""
        ),
        {
            grund:
                reason ||
                null
        }
    );

}


/* =====================================================
   BUCHUNG AUDIT
===================================================== */

async function auditBooking(
    booking,
    action = "Erstellt"
){

    if(!booking){

        return null;

    }


    return await createAuditEntry(
        action,
        "Buchung",
        booking.id ||
        booking.buchungsnummer ||
        null,
        null,
        booking
    );

}


/* =====================================================
   AUFTRAGSABRECHNUNG AUDIT
===================================================== */

async function auditOrderSettlement(
    order,
    action = "Erstellt"
){

    if(!order){

        return null;

    }


    return await createAuditEntry(
        action,
        "Auftragsabrechnung",
        order.id ||
        order.auftragsnummer ||
        null,
        null,
        order
    );

}


/* =====================================================
   SPARKONTO AUDIT
===================================================== */

async function auditSavings(
    transaction,
    action = "Erstellt"
){

    if(!transaction){

        return null;

    }


    return await createAuditEntry(
        action,
        "Sparkonto",
        transaction.id ||
        transaction.buchungsnummer ||
        null,
        null,
        transaction
    );

}


/* =====================================================
   KASSENABGLEICH AUDIT
===================================================== */

async function auditCashCheck(
    check
){

    if(!check){

        return null;

    }


    return await createAuditEntry(
        "Kassenabgleich",
        "Kassenabgleich",
        check.id ||
        null,
        null,
        check
    );

}


/* =====================================================
   PROTOKOLL AKTUALISIEREN
===================================================== */

function refreshActivityLogs(){

    renderActivityLogs();

}


/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 10 VON 10
   INITIALISIERUNG + RECHTE + GESAMT-RENDERING
===================================================== */


/* =====================================================
   RECHTE AUF DER SEITE ANWENDEN
===================================================== */

function applyBookkeepingPermissions(){

    const managementElements =
        document.querySelectorAll(
            ".management-only"
        );


    const depositElements =
        document.querySelectorAll(
            ".deposit-only"
        );


    const management =
        canManageBookkeeping();


    const deposit =
        canCreateDeposit();


    managementElements.forEach(
        element => {

            element.style.display =
                management
                ? ""
                : "none";

        }
    );


    depositElements.forEach(
        element => {

            element.style.display =
                deposit
                ? ""
                : "none";

        }
    );


    /*
       Mitarbeiter dürfen nur Einzahlungen
       erstellen.
    */

    const bookingType =
        document.getElementById(
            "bookingType"
        );


    if(
        bookingType &&
        isMitarbeiter()
    ){

        bookingType.value =
            "Einzahlung";

        bookingType.disabled =
            true;

    }


    /*
       Falls keine Berechtigung vorhanden ist,
       werden die Buchungsaktionen ausgeblendet.
    */

    if(
        !deposit
    ){

        const bookingButtons =
            document.querySelectorAll(
                ".booking-action"
            );


        bookingButtons.forEach(
            button => {

                button.style.display =
                    "none";

            }
        );

    }

}


/* =====================================================
   GESAMTE SEITE RENDERN
===================================================== */

function renderAllBookkeeping(){

    renderOverview();

    renderBookings();

    renderOrderSettlements();

    renderCurrentWorkers();

    renderSavings();

    renderEmployees();

    renderCashChecks();

    renderActivityLogs();

    initializeMonthlyPeriod();

    applyBookkeepingPermissions();

    runFinancialControl();

}


/* =====================================================
   DATEN NEU LADEN
===================================================== */

window.reloadBookkeeping =
async function(){

    try{

        await loadBookkeepingData();

        renderAllBookkeeping();

    }
    catch(error){

        console.error(
            "Fehler beim Neuladen der Buchhaltung:",
            error
        );

        showDatabaseError(
            error
        );

    }

};


/* =====================================================
   INITIALISIERUNG
===================================================== */

async function initializeBookkeeping(){

    console.log(
        "Clan-Buchhaltung wird initialisiert..."
    );


    if(!hasSupabase()){

        console.error(
            "Supabase ist nicht verfügbar."
        );

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    /*
       1. Eingeloggten Benutzer laden
    */

    const userLoaded =
        await loadCurrentUser();


    if(!userLoaded){

        console.warn(
            "Kein eingeloggter Benutzer gefunden."
        );

        return;

    }


    /*
       2. Mitarbeiter / Rang laden
    */

    await loadCurrentEmployee();


    console.log(
        "Buchhaltung angemeldet als:",
        currentEmployee
    );


    /*
       3. Alle Buchhaltungsdaten laden
    */

    try{

        await loadBookkeepingData();

    }
    catch(error){

        console.error(
            "Buchhaltungsdaten konnten nicht geladen werden:",
            error
        );

        showDatabaseError(
            error
        );

        return;

    }


    /*
       4. Oberfläche aufbauen
    */

    renderAllBookkeeping();


    /*
       5. Ereignisse für Filter
    */

    setupBookkeepingEvents();


    console.log(
        "Clan-Buchhaltung erfolgreich geladen."
    );

}


/* =====================================================
   EVENTS
===================================================== */

function setupBookkeepingEvents(){

    /* Buchungen */

    const bookingSearch =
        document.getElementById(
            "bookingSearch"
        );


    if(bookingSearch){

        bookingSearch.addEventListener(
            "input",
            filterBookings
        );

    }


    const bookingTypeFilter =
        document.getElementById(
            "bookingFilterType"
        );


    if(bookingTypeFilter){

        bookingTypeFilter.addEventListener(
            "change",
            filterBookings
        );

    }


    const bookingCategoryFilter =
        document.getElementById(
            "bookingFilterCategory"
        );


    if(bookingCategoryFilter){

        bookingCategoryFilter.addEventListener(
            "change",
            filterBookings
        );

    }


    /* Aufträge */

    const orderSearch =
        document.getElementById(
            "orderSearch"
        );


    if(orderSearch){

        orderSearch.addEventListener(
            "input",
            filterOrderSettlements
        );

    }


    const orderStatusFilter =
        document.getElementById(
            "orderStatusFilter"
        );


    if(orderStatusFilter){

        orderStatusFilter.addEventListener(
            "change",
            filterOrderSettlements
        );

    }


    /* Mitarbeiter */

    const employeeSearch =
        document.getElementById(
            "employeeSearch"
        );


    if(employeeSearch){

        employeeSearch.addEventListener(
            "input",
            filterEmployees
        );

    }


    /* Sparkonto */

    const savingsSearch =
        document.getElementById(
            "savingsSearch"
        );


    if(savingsSearch){

        savingsSearch.addEventListener(
            "input",
            filterSavings
        );

    }


    const savingsFilterType =
        document.getElementById(
            "savingsFilterType"
        );


    if(savingsFilterType){

        savingsFilterType.addEventListener(
            "change",
            filterSavings
        );

    }


    /* Monatsauswertung */

    const monthlyPeriod =
        document.getElementById(
            "monthlyPeriod"
        );


    if(monthlyPeriod){

        monthlyPeriod.addEventListener(
            "change",
            updateMonthly
        );

    }


    /* Kassenabgleich */

    const cashPortal =
        document.getElementById(
            "cashPortalInput"
        );


    const cashIngame =
        document.getElementById(
            "cashIngameInput"
        );


    if(cashPortal){

        cashPortal.addEventListener(
            "input",
            updateCashDifference
        );

    }


    if(cashIngame){

        cashIngame.addEventListener(
            "input",
            updateCashDifference
        );

    }


    /* Protokoll */

    const activitySearch =
        document.getElementById(
            "activityLogSearch"
        );


    if(activitySearch){

        activitySearch.addEventListener(
            "input",
            filterActivityLogs
        );

    }

}


/* =====================================================
   MODAL – ESC
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        if(
            event.key !== "Escape"
        ){

            return;

        }


        document
            .querySelectorAll(
                ".modal.active"
            )
            .forEach(
                modal => {

                    modal.classList.remove(
                        "active"
                    );

                }
            );

    }
);


/* =====================================================
   MODAL – AUSSERHALB KLICKEN
===================================================== */

document.addEventListener(
    "click",
    event => {

        if(
            !event.target.classList.contains(
                "modal"
            )
        ){

            return;

        }


        event.target.classList.remove(
            "active"
        );

    }
);


/* =====================================================
   SEITENSTART
===================================================== */

if(
    document.readyState ===
    "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        initializeBookkeeping
    );

}
else{

    initializeBookkeeping();

}

/* =====================================================
   BUCHHALTUNGS-NAVIGATOR
===================================================== */

window.showArea = function(id, button){

    const selected =
        document.getElementById(id);

    if(!selected){

        console.error(
            "Bereich nicht gefunden:",
            id
        );

        return;

    }


    /* Alle Bereiche schließen */

    document
        .querySelectorAll(".open-area")
        .forEach(
            area => {

                area.classList.remove(
                    "active"
                );

            }
        );


    /* Alle Buttons deaktivieren */

    document
        .querySelectorAll(".nav-button")
        .forEach(
            btn => {

                btn.classList.remove(
                    "active"
                );

            }
        );


    /* Gewählten Bereich öffnen */

    selected.classList.add(
        "active"
    );


    /* Gewählten Button markieren */

    if(button){

        button.classList.add(
            "active"
        );

    }


    /* Zum Bereich scrollen */

    setTimeout(
        () => {

            selected.scrollIntoView({
                behavior:"smooth",
                block:"start"
            });

        },
        100
    );

};


/* =====================================================
   SICHERHEITS-CHECK
===================================================== */

window.bookkeepingStatus =
function(){

    return {

        user:
            currentUser?.id ||
            null,

        employee:
            currentEmployee?.name ||
            null,

        rank:
            getCurrentRank(),

        management:
            canManageBookkeeping(),

        deposits:
            canCreateDeposit(),

        bookings:
            bookings.length,

        orders:
            orderSettlements.length,

        savings:
            savingsTransactions.length,

        clanBalance:
            getCurrentClanBalance(),

        savingsBalance:
            getSavingsBalance(),

        totalAssets:
            getTotalAssets()

    };

};


/* =====================================================
   TEIL 10 ENDE
   CLAN-BUCHHALTUNG V0.1 BETA KOMPLETT
===================================================== */
