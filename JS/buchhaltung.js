/* =====================================================
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 1 VON 10
===================================================== */

alert("BUCHHALTUNG JS GELADEN");


/* =====================================================
   SUPABASE
===================================================== */

const buchhaltungDB = window.supabaseClient || null;


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

let bookings = [];

let orderSettlements = [];

let workers = [];

let employees = [];

let savingsTransactions = [];

let cashChecks = [];

let activityLogs = [];


let savingsGoalValue = 0;

let currentWorkers = [];


/* =====================================================
   BENUTZER
===================================================== */

let currentUser = null;

let currentEmployee = null;


/* =====================================================
   HILFSFUNKTIONEN
===================================================== */

function getElement(id){

    return document.getElementById(id);

}


function getValue(id){

    const element =
        getElement(id);

    return element
        ? element.value.trim()
        : "";

}


function setValue(id,value){

    const element =
        getElement(id);

    if(element){

        element.value =
            value ?? "";

    }

}


function setText(id,value){

    const element =
        getElement(id);

    if(element){

        element.textContent =
            value ?? "";

    }

}


function numberValue(value){

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


function money(value){

    return numberValue(
        value
    ).toLocaleString(
        "de-DE"
    ) + " $";

}


function nowLocal(){

    const date =
        new Date();

    const offset =
        date.getTimezoneOffset() *
        60000;

    return new Date(
        date.getTime() -
        offset
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

            day:"2-digit",

            month:"2-digit",

            year:"numeric",

            hour:"2-digit",

            minute:"2-digit"

        }
    );

}


function escapeHtml(value){

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


/* =====================================================
   SUPABASE PRÜFEN
===================================================== */

function hasSupabase(){

    return !!(
        buchhaltungDB &&
        typeof buchhaltungDB.from ===
            "function"
    );

}


/* =====================================================
   FEHLER
===================================================== */

function showDatabaseError(message){

    console.error(
        "Buchhaltung:",
        message
    );


    alert(
        "Buchhaltung:\n\n" +
        (
            message?.message ||
            message ||
            "Unbekannter Fehler."
        )
    );

}


/* =====================================================
   DISCORD-BENACHRICHTIGUNG
===================================================== */

async function sendDiscordNotification(
    payload
){

    if(!hasSupabase()){

        console.error(
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
                .functions
                .invoke(
                    "buchhaltung",
                    {
                        body:
                            payload
                    }
                );


        if(error){

            console.error(
                "Discord-Benachrichtigung:",
                error
            );

            return false;

        }


        if(
            data &&
            data.error
        ){

            console.error(
                "Discord-Benachrichtigung:",
                data.error
            );

            return false;

        }


        return true;

    }
    catch(error){

        console.error(
            "Discord-Benachrichtigung:",
            error
        );

        return false;

    }

}


/* =====================================================
   AKTUELLEN BENUTZER LADEN
===================================================== */

async function loadCurrentUser(){

    if(!hasSupabase()){

        return false;

    }


    const {
        data,
        error
    } =
        await buchhaltungDB
            .auth
            .getUser();


    if(error){

        console.error(
            "Benutzer:",
            error
        );

        return false;

    }


    currentUser =
        data?.user || null;


    return !!currentUser;

}


/* =====================================================
   AKTUELLEN MITARBEITER LADEN
===================================================== */

async function loadCurrentEmployee(){

    if(
        !currentUser ||
        !hasSupabase()
    ){

        return false;

    }


    const {
        data,
        error
    } =
        await buchhaltungDB
            .from(
                TABLE_EMPLOYEES
            )
            .select(
                "*"
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .maybeSingle();


    if(error){

        console.error(
            "Mitarbeiter:",
            error
        );

        return false;

    }


    currentEmployee =
        data || null;


    return !!currentEmployee;

}


/* =====================================================
   BERECHTIGUNGEN
===================================================== */

function getCurrentRank(){

    if(!currentEmployee){

        return "";

    }


    return (
        currentEmployee.rang ||
        currentEmployee.role ||
        ""
    );

}


function isLeitung(){

    const rang =
        getCurrentRank();


    return (
        rang === "Leitung" ||
        rang === "Stadtleitung"
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
   SUPABASE-DATEN LADEN
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

            buchhaltungDB
                .from(
                    TABLE_BOOKINGS
                )
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),

            buchhaltungDB
                .from(
                    TABLE_ORDERS
                )
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),

            buchhaltungDB
                .from(
                    TABLE_ORDER_WORKERS
                )
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:true
                    }
                ),

            buchhaltungDB
                .from(
                    TABLE_EMPLOYEES
                )
                .select("*")
                .order(
                    "name",
                    {
                        ascending:true
                    }
                ),

            buchhaltungDB
                .from(
                    TABLE_SAVINGS
                )
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),

            buchhaltungDB
                .from(
                    TABLE_CASH_CHECKS
                )
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),

            buchhaltungDB
                .from(
                    TABLE_LOGS
                )
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                )

        ]);


        if(bookingsResult.error)
            throw bookingsResult.error;

        if(ordersResult.error)
            throw ordersResult.error;

        if(workersResult.error)
            throw workersResult.error;

        if(employeesResult.error)
            throw employeesResult.error;

        if(savingsResult.error)
            throw savingsResult.error;

        if(cashChecksResult.error)
            throw cashChecksResult.error;

        if(logsResult.error)
            throw logsResult.error;


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


        return true;

    }
    catch(error){

        showDatabaseError(
            error.message ||
            "Unbekannter Datenbankfehler."
        );

        return false;

    }

}


/* =====================================================
   NAVIGATION
===================================================== */

window.showArea = function(id,button){

    const areas =
        document.querySelectorAll(
            ".open-area"
        );

    const buttons =
        document.querySelectorAll(
            ".nav-button"
        );

    const selected =
        document.getElementById(id);


    if(!selected){

        console.error(
            "Bereich nicht gefunden:",
            id
        );

        return;

    }


    if(
        selected.classList.contains(
            "active"
        )
    ){

        selected.classList.remove(
            "active"
        );

        if(button){

            button.classList.remove(
                "active"
            );

        }

        return;

    }


    areas.forEach(
        area => {

            area.classList.remove(
                "active"
            );

        }
    );


    buttons.forEach(
        btn => {

            btn.classList.remove(
                "active"
            );

        }
    );


    selected.classList.add(
        "active"
    );


    if(button){

        button.classList.add(
            "active"
        );

    }


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
   MODAL
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
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 2 VON 10
===================================================== */


/* =====================================================
   INITIALISIERUNG
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    try {

        await loadCurrentUser();

        await loadBookkeepingData();

        applyPermissions();

        renderOverview();

        renderBookings();

        renderOrderSettlements();

        renderEmployees();

        renderSavings();

        renderCashChecks();

        renderAuditLog();

    } catch(error) {

        console.error(
            "Fehler bei der Buchhaltungs-Initialisierung:",
            error
        );

        showDatabaseError(
            "Die Buchhaltung konnte nicht vollständig geladen werden."
        );

    }

});


/* =====================================================
   ÜBERSICHT – ZAHLEN BERECHNEN
===================================================== */

function calculateFinancialOverview(){

    const bookings =
        Array.isArray(bookingsData)
            ? bookingsData
            : [];


    let totalDeposits = 0;
    let totalWithdrawals = 0;

    let totalWages = 0;
    let totalClanExpenses = 0;

    let historicalRevenue = 0;


    bookings.forEach(booking => {

        const amount =
            numberValue(
                booking.betrag ??
                booking.amount
            );


        const type =
            booking.art ??
            booking.type ??
            "";


        const category =
            booking.kategorie ??
            booking.category ??
            "";


        if(type === "Einzahlung"){

            totalDeposits += amount;

        }


        if(type === "Auszahlung"){

            totalWithdrawals += amount;

        }


        if(
            category === "Gehalt" ||
            category === "Arbeitergehalt"
        ){

            totalWages += amount;

        }


        if(
            category === "Clan-Ausgabe" ||
            category === "Ausgabe"
        ){

            totalClanExpenses += amount;

        }

    });


    orderSettlements.forEach(order => {

        historicalRevenue +=
            numberValue(
                order.gesamtbetrag ??
                order.total_amount ??
                order.betrag ??
                order.amount
            );

    });


    const currentClanBalance =
        totalDeposits -
        totalWithdrawals;


    const savingsBalance =
        getSavingsBalance();


    const totalAssets =
        currentClanBalance +
        savingsBalance;


    return {

        currentClanBalance,

        historicalRevenue,

        totalDeposits,

        totalWithdrawals,

        totalWages,

        totalClanExpenses,

        savingsBalance,

        totalAssets

    };

}


/* =====================================================
   ÜBERSICHT – ANZEIGEN
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
        "overviewSavings",
        money(
            overview.savingsBalance
        )
    );


    setText(
        "totalAssets",
        money(
            overview.totalAssets
        )
    );


    /*
       Offene Beträge werden separat
       aus den Abrechnungen ermittelt.
    */

    const openAmount =
        orderSettlements
            .filter(order =>
                order.status === "Offen" ||
                order.status === "Teilweise bezahlt"
            )
            .reduce(
                (sum, order) =>
                    sum +
                    numberValue(
                        order.offener_betrag ??
                        order.open_amount ??
                        order.gesamtbetrag ??
                        order.total_amount
                    ),
                0
            );


    setText(
        "openAmounts",
        money(openAmount)
    );

}


/* =====================================================
   BUCHUNGEN – SORTIERUNG
===================================================== */

function sortBookings(){

    bookingsData.sort((a,b) => {

        const dateA =
            new Date(
                a.created_at ??
                a.datum ??
                a.createdAt ??
                0
            ).getTime();


        const dateB =
            new Date(
                b.created_at ??
                b.datum ??
                b.createdAt ??
                0
            ).getTime();


        return dateB - dateA;

    });

}


/* =====================================================
   BUCHUNGEN – ANZEIGE
===================================================== */

function renderBookings(){

    const body =
        document.getElementById(
            "bookingTableBody"
        );


    if(!body) return;


    sortBookings();


    if(!bookingsData.length){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    Noch keine Buchungen vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        bookingsData.map(booking => {

            const type =
                booking.art ??
                booking.type ??
                "—";


            const amount =
                numberValue(
                    booking.betrag ??
                    booking.amount
                );


            const category =
                booking.kategorie ??
                booking.category ??
                "—";


            const from =
                booking.von_wem ??
                booking.from_person ??
                booking.von ??
                "—";


            const to =
                booking.an_wen ??
                booking.to_person ??
                booking.an ??
                "—";


            const purpose =
                booking.zweck ??
                booking.reason ??
                booking.grund ??
                "—";


            const status =
                booking.status ??
                "—";


            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            booking.buchungsnummer ??
                            booking.booking_number ??
                            booking.id ??
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(type)}
                    </td>

                    <td>
                        ${money(amount)}
                    </td>

                    <td>
                        ${escapeHtml(from)}
                    </td>

                    <td>
                        ${escapeHtml(to)}
                    </td>

                    <td>
                        ${escapeHtml(purpose)}
                    </td>

                    <td>
                        ${escapeHtml(category)}
                    </td>

                    <td>
                        ${escapeHtml(status)}
                    </td>

                </tr>
            `;

        }).join("");

}


/* =====================================================
   BUCHUNGEN – FILTER
===================================================== */

window.filterBookings = function(){

    const search =
        getValue(
            "bookingSearch"
        ).toLowerCase();


    const type =
        getValue(
            "bookingTypeFilter"
        );


    const category =
        getValue(
            "bookingCategoryFilter"
        );


    const body =
        document.getElementById(
            "bookingTableBody"
        );


    if(!body) return;


    const filtered =
        bookingsData.filter(booking => {

            const text =
                JSON.stringify(
                    booking
                ).toLowerCase();


            const bookingType =
                booking.art ??
                booking.type ??
                "";


            const bookingCategory =
                booking.kategorie ??
                booking.category ??
                "";


            return (

                (!search ||
                    text.includes(search))

                &&

                (!type ||
                    bookingType === type)

                &&

                (!category ||
                    bookingCategory === category)

            );

        });


    if(!filtered.length){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    Keine passenden Buchungen gefunden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        filtered.map(booking => {

            const amount =
                numberValue(
                    booking.betrag ??
                    booking.amount
                );


            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            booking.buchungsnummer ??
                            booking.booking_number ??
                            booking.id ??
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            booking.art ??
                            booking.type ??
                            "—"
                        )}
                    </td>

                    <td>
                        ${money(amount)}
                    </td>

                    <td>
                        ${escapeHtml(
                            booking.von_wem ??
                            booking.from_person ??
                            booking.von ??
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            booking.an_wen ??
                            booking.to_person ??
                            booking.an ??
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            booking.zweck ??
                            booking.reason ??
                            booking.grund ??
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            booking.kategorie ??
                            booking.category ??
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            booking.status ??
                            "—"
                        )}
                    </td>

                </tr>
            `;

        }).join("");

};


/* =====================================================
   STATUS-KLASSE
===================================================== */

function getStatusClass(status){

    switch(status){

        case "Bezahlt":
            return "status-paid";

        case "Teilweise bezahlt":
            return "status-partial";

        case "Offen":
            return "status-open";

        case "Storniert":
            return "status-cancelled";

        default:
            return "";

    }

}


/* =====================================================
   STATUS-TEXT
===================================================== */

function statusBadge(status){

    return `
        <span class="status-badge ${getStatusClass(status)}">
            ${escapeHtml(status || "—")}
        </span>
    `;

}


/* =====================================================
   BEREICH ÖFFNEN
===================================================== */

window.openBookkeepingArea = function(id){

    const area =
        document.getElementById(id);


    if(!area) return;


    area.classList.toggle(
        "active"
    );

};


/* =====================================================
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 3 VON 10
===================================================== */


/* =====================================================
   AUFTRAGSABRECHNUNG – AKTUELLE ARBEITER
===================================================== */

let currentWorkers = [];


/* =====================================================
   AUFTRAGSABRECHNUNG ÖFFNEN
===================================================== */

window.openOrderModal = function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen erstellen."
        );

        return;

    }


    currentWorkers = [];

    renderCurrentWorkers();

    updateWorkerTotals();


    const modal =
        document.getElementById(
            "orderModal"
        );


    if(modal){

        modal.classList.add(
            "active"
        );

    }

};


/* =====================================================
   AUFTRAGSABRECHNUNG SCHLIESSEN
===================================================== */

window.closeOrderModal = function(){

    const modal =
        document.getElementById(
            "orderModal"
        );


    if(modal){

        modal.classList.remove(
            "active"
        );

    }

};


/* =====================================================
   ARBEITER HINZUFÜGEN
===================================================== */

window.addWorkerRow = function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Arbeiter hinzufügen."
        );

        return;

    }


    currentWorkers.push({

        name: "",

        salary: 0,

        note: ""

    });


    renderCurrentWorkers();

    updateWorkerTotals();

};


/* =====================================================
   ARBEITER ANZEIGEN
===================================================== */

function renderCurrentWorkers(){

    const container =
        document.getElementById(
            "workerList"
        );


    if(!container) return;


    if(!currentWorkers.length){

        container.innerHTML = `
            <div class="worker-empty">
                Noch keine Arbeiter hinzugefügt.
            </div>
        `;

        return;

    }


    container.innerHTML =
        currentWorkers.map(
            (worker,index) => {

                return `

                    <div
                        class="worker-row"
                        data-worker-index="${index}"
                    >

                        <div class="form-group">

                            <label>
                                Arbeiter
                            </label>

                            <input
                                type="text"
                                value="${escapeHtml(
                                    worker.name || ""
                                )}"
                                placeholder="Name / Minecraft-Name"
                                oninput="
                                    updateWorker(
                                        ${index},
                                        'name',
                                        this.value
                                    )
                                "
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Gehalt
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="1"
                                value="${numberValue(
                                    worker.salary
                                )}"
                                placeholder="0"
                                oninput="
                                    updateWorker(
                                        ${index},
                                        'salary',
                                        this.value
                                    )
                                "
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Notiz
                            </label>

                            <input
                                type="text"
                                value="${escapeHtml(
                                    worker.note || ""
                                )}"
                                placeholder="Optional"
                                oninput="
                                    updateWorker(
                                        ${index},
                                        'note',
                                        this.value
                                    )
                                "
                            >

                        </div>


                        <button
                            type="button"
                            class="danger-button"
                            onclick="
                                removeWorker(${index})
                            "
                        >
                            Entfernen
                        </button>

                    </div>

                `;

            }
        ).join("");

}


/* =====================================================
   ARBEITER AKTUALISIEREN
===================================================== */

window.updateWorker = function(
    index,
    key,
    value
){

    if(!canManageBookkeeping()){

        return;

    }


    if(
        !currentWorkers[index]
    ){

        return;

    }


    if(key === "salary"){

        currentWorkers[index][key] =
            numberValue(value);

    }
    else{

        currentWorkers[index][key] =
            value;

    }


    updateWorkerTotals();

};


/* =====================================================
   ARBEITER ENTFERNEN
===================================================== */

window.removeWorker = function(index){

    if(!canManageBookkeeping()){

        return;

    }


    currentWorkers.splice(
        index,
        1
    );


    renderCurrentWorkers();

    updateWorkerTotals();

};


/* =====================================================
   ARBEITERSUMMEN
===================================================== */

function updateWorkerTotals(){

    const total =
        currentWorkers.reduce(
            (
                sum,
                worker
            ) =>
                sum +
                numberValue(
                    worker.salary
                ),
            0
        );


    const orderTotal =
        numberValue(
            getValue(
                "orderTotal"
            )
        );


    const clan =
        numberValue(
            getValue(
                "orderClanAmount"
            )
        );


    const remaining =
        orderTotal -
        clan -
        total;


    setText(
        "orderWorkerCount",
        currentWorkers.length
    );


    setText(
        "orderSalaryTotal",
        money(total)
    );


    setText(
        "orderRemainingAmount",
        money(remaining)
    );


    const warning =
        getElement(
            "orderDistributionWarning"
        );


    if(!warning){

        return;

    }


    if(
        remaining === 0 &&
        orderTotal > 0
    ){

        warning.textContent =
            "Die Verteilung ist vollständig.";

        warning.className =
            "distribution-warning success-text";

    }
    else if(
        remaining < 0
    ){

        warning.textContent =
            "Die Verteilung überschreitet den Gesamtbetrag.";

        warning.className =
            "distribution-warning danger-text";

    }
    else{

        warning.textContent =
            "Es ist noch ein Betrag nicht verteilt.";

        warning.className =
            "distribution-warning";

    }

}


/* =====================================================
   AUFTRAGSWERTE ÜBERWACHEN
===================================================== */

document.addEventListener(
    "input",
    event => {

        if(
            event.target.id ===
                "orderTotal" ||

            event.target.id ===
                "orderClanAmount"
        ){

            updateWorkerTotals();

        }

    }
);


/* =====================================================
   AUFTRAGSABRECHNUNG SPEICHERN
===================================================== */

window.saveOrderSettlement =
async function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen speichern."
        );

        return;

    }


    const orderNumber =
        getValue(
            "orderNumber"
        );


    const total =
        numberValue(
            getValue(
                "orderTotal"
            )
        );


    const clan =
        numberValue(
            getValue(
                "orderClanAmount"
            )
        );


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


    if(clan < 0){

        alert(
            "Der Clanbetrag darf nicht negativ sein."
        );

        return;

    }


    if(clan > total){

        alert(
            "Der Clanbetrag darf den Gesamtbetrag nicht überschreiten."
        );

        return;

    }


    const salaries =
        currentWorkers.reduce(
            (
                sum,
                worker
            ) =>
                sum +
                numberValue(
                    worker.salary
                ),
            0
        );


    const remaining =
        total -
        clan -
        salaries;


    if(remaining < 0){

        alert(
            "Die Verteilung überschreitet den Gesamtbetrag."
        );

        return;

    }


    const settlementPayload = {

        auftragsnummer:
            orderNumber,

        gesamtbetrag:
            total,

        clanbetrag:
            clan,

        gesamt_gehaelter:
            salaries,

        status:
            getValue(
                "orderStatus"
            ) ||
            "Offen",

        datum:
            getValue(
                "orderDate"
            ) ||
            new Date().toISOString(),

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            currentEmployee?.name ||
            getValue(
                "orderCreatedBy"
            ) ||
            "Manuell",

        notiz:
            getValue(
                "orderNote"
            )

    };


    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    const {
        data: settlement,
        error
    } =
        await buchhaltungDB
            .from(
                TABLE_ORDERS
            )
            .insert(
                settlementPayload
            )
            .select()
            .single();


    if(error){

        console.error(
            "Auftragsabrechnung:",
            error
        );

        alert(
            "Die Auftragsabrechnung konnte nicht gespeichert werden."
        );

        return;

    }


    /* =============================================
       ARBEITER SPEICHERN
    ============================================= */

    if(
        settlement &&
        currentWorkers.length
    ){

        const workerRows =
            currentWorkers.map(
                worker => ({

                    auftragsabrechnung_id:
                        settlement.id,

                    arbeiter_name:
                        worker.name,

                    gehalt:
                        numberValue(
                            worker.salary
                        ),

                    notiz:
                        worker.note || null

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

            console.error(
                "Arbeiter-Abrechnung:",
                workerError
            );

        }

    }


    /* =============================================
       NEU LADEN
    ============================================= */

    await loadBookkeepingData();

    renderOverview();

    renderOrderSettlements();

    renderEmployees();


    currentWorkers = [];

    renderCurrentWorkers();

    updateWorkerTotals();

    closeOrderModal();


    await sendDiscordNotification(
        "Auftragsabrechnung",
        {
            auftragsnummer:
                orderNumber,

            gesamtbetrag:
                total,

            clanbetrag:
                clan,

            gesamt_gehaelter:
                salaries,

            erstellt_von:
                settlementPayload.erstellt_von_name

        }
    );


    alert(
        "Auftragsabrechnung wurde gespeichert."
    );

};


/* =====================================================
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 4 VON 10
===================================================== */


/* =====================================================
   AUFTRAGSFORMULAR LEEREN
===================================================== */

function clearOrderForm(){

    [
        "orderNumber",
        "orderTotal",
        "orderClanAmount",
        "orderNote"
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if(element){

            element.value = "";

        }

    });


    const date =
        document.getElementById(
            "orderDate"
        );

    if(date){

        date.value = "";

    }


    const status =
        document.getElementById(
            "orderStatus"
        );

    if(status){

        status.value = "Offen";

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

    updateWorkerTotals();

}


/* =====================================================
   AUFTRAGSABRECHNUNGEN ANZEIGEN
===================================================== */

function renderOrderSettlements(){

    const body =
        document.getElementById(
            "orderTableBody"
        );


    if(!body) return;


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
            .map(order => {

                const orderId =
                    order.auftragsnummer ||
                    order.id ||
                    "—";


                const total =
                    numberValue(
                        order.gesamtbetrag ??
                        order.total ??
                        order.total_amount
                    );


                const clan =
                    numberValue(
                        order.clanbetrag ??
                        order.clan ??
                        order.clan_amount
                    );


                const salaries =
                    numberValue(
                        order.gesamt_gehaelter ??
                        order.salaries ??
                        order.total_wages
                    );


                const status =
                    order.status ||
                    "Offen";


                const date =
                    order.datum ||
                    order.created_at ||
                    "";


                const orderWorkers =
                    Array.isArray(workers)
                        ? workers.filter(
                            worker =>
                                String(
                                    worker.auftragsabrechnung_id
                                ) ===
                                String(order.id)
                        )
                        : [];


                return `

                    <tr>

                        <td>
                            ${escapeHtml(
                                orderId
                            )}
                        </td>


                        <td>
                            ${money(
                                total
                            )}
                        </td>


                        <td>
                            ${money(
                                clan
                            )}
                        </td>


                        <td>
                            ${money(
                                salaries
                            )}
                        </td>


                        <td>
                            ${orderWorkers.length}
                        </td>


                        <td>
                            ${statusBadge(
                                status
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                formatDate(
                                    date
                                )
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                order.erstellt_von_name ||
                                order.created_by_name ||
                                "—"
                            )}
                        </td>


                        <td>

                            <button
                                type="button"
                                class="secondary-button"
                                onclick="
                                    viewOrderSettlement(
                                        '${escapeHtml(
                                            String(order.id || "")
                                        )}'
                                    )
                                "
                            >
                                Anzeigen
                            </button>

                        </td>

                    </tr>

                `;

            })
            .join("");

}


/* =====================================================
   DATUM FORMATIEREN
===================================================== */

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

        return String(value);

    }


    return date.toLocaleString(
        "de-DE",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =====================================================
   AUFTRAGSABRECHNUNG ANZEIGEN
===================================================== */

window.viewOrderSettlement =
function(id){

    const order =
        orderSettlements.find(
            item =>
                String(
                    item.id
                ) ===
                String(id)
        );


    if(!order){

        alert(
            "Auftragsabrechnung wurde nicht gefunden."
        );

        return;

    }


    const orderWorkers =
        Array.isArray(workers)
            ? workers.filter(
                worker =>
                    String(
                        worker.auftragsabrechnung_id
                    ) ===
                    String(order.id)
            )
            : [];


    const total =
        numberValue(
            order.gesamtbetrag ??
            order.total ??
            order.total_amount
        );


    const clan =
        numberValue(
            order.clanbetrag ??
            order.clan ??
            order.clan_amount
        );


    const salaries =
        numberValue(
            order.gesamt_gehaelter ??
            order.salaries ??
            order.total_wages
        );


    const workerText =
        orderWorkers.length
            ? orderWorkers
                .map(worker => `
                    <div class="worker-detail">

                        <strong>
                            ${escapeHtml(
                                worker.name ||
                                "Unbekannt"
                            )}
                        </strong>

                        <span>
                            ${money(
                                numberValue(
                                    worker.gehalt ??
                                    worker.salary
                                )
                            )}
                        </span>

                    </div>
                `)
                .join("")
            : `
                <div class="worker-empty">
                    Keine Arbeiter hinterlegt.
                </div>
            `;


    const content = `

        <div class="detail-box">

            <h3>
                Auftragsabrechnung
            </h3>


            <div class="detail-grid">

                <div>
                    <span>
                        Auftragsnummer
                    </span>

                    <strong>
                        ${escapeHtml(
                            order.auftragsnummer ||
                            order.id ||
                            "—"
                        )}
                    </strong>
                </div>


                <div>
                    <span>
                        Status
                    </span>

                    <strong>
                        ${statusBadge(
                            order.status ||
                            "Offen"
                        )}
                    </strong>
                </div>


                <div>
                    <span>
                        Gesamtbetrag
                    </span>

                    <strong>
                        ${money(total)}
                    </strong>
                </div>


                <div>
                    <span>
                        Clananteil
                    </span>

                    <strong>
                        ${money(clan)}
                    </strong>
                </div>


                <div>
                    <span>
                        Gehälter gesamt
                    </span>

                    <strong>
                        ${money(salaries)}
                    </strong>
                </div>


                <div>
                    <span>
                        Restbetrag
                    </span>

                    <strong>
                        ${money(
                            total -
                            clan -
                            salaries
                        )}
                    </strong>
                </div>

            </div>


            <h4>
                Arbeiter
            </h4>


            <div class="worker-detail-list">

                ${workerText}

            </div>


            <div class="detail-note">

                <strong>
                    Notiz
                </strong>

                <p>
                    ${escapeHtml(
                        order.notiz ||
                        "Keine Notiz vorhanden."
                    )}
                </p>

            </div>


            <div class="detail-meta">

                Erstellt von:
                ${escapeHtml(
                    order.erstellt_von_name ||
                    "—"
                )}

                ·

                ${escapeHtml(
                    formatDate(
                        order.datum ||
                        order.created_at
                    )
                )}

            </div>

        </div>

    `;


    openDetailModal(
        "Auftragsabrechnung",
        content
    );

};


/* =====================================================
   DETAIL-MODAL
===================================================== */

function openDetailModal(
    title,
    content
){

    let modal =
        document.getElementById(
            "bookkeepingDetailModal"
        );


    if(!modal){

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "bookkeepingDetailModal";

        modal.className =
            "bookkeeping-detail-modal";


        modal.innerHTML = `

            <div class="detail-modal-content">

                <div class="detail-modal-header">

                    <h2 id="detailModalTitle">
                        ${escapeHtml(title)}
                    </h2>

                    <button
                        type="button"
                        class="secondary-button"
                        onclick="
                            closeDetailModal()
                        "
                    >
                        Schließen
                    </button>

                </div>


                <div id="detailModalBody"></div>

            </div>

        `;


        document.body.appendChild(
            modal
        );

    }


    setText(
        "detailModalTitle",
        title
    );


    const body =
        document.getElementById(
            "detailModalBody"
        );


    if(body){

        body.innerHTML =
            content;

    }


    modal.classList.add(
        "active"
    );

}


/* =====================================================
   DETAIL-MODAL SCHLIESSEN
===================================================== */

window.closeDetailModal =
function(){

    const modal =
        document.getElementById(
            "bookkeepingDetailModal"
        );


    if(modal){

        modal.classList.remove(
            "active"
        );

    }

};


/* =====================================================
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 5 VON 10
===================================================== */


/* =====================================================
   BUCHUNGSMODAL ÖFFNEN
===================================================== */

window.openBookingModal = function(){

    if(!canCreateDeposit()){

        alert(
            "Du hast keine Berechtigung, eine Buchung zu erstellen."
        );

        return;

    }


    clearBookingForm();


    const type =
        getElement(
            "bookingType"
        );


    /*
     * Mitarbeiter dürfen ausschließlich
     * eine Einzahlung erstellen.
     */

    if(isMitarbeiter()){

        if(type){

            type.value =
                "Einzahlung";

            type.disabled =
                true;

        }

    }
    else if(type){

        type.disabled =
            false;

    }


    const createdBy =
        getElement(
            "bookingCreatedBy"
        );


    if(
        createdBy &&
        currentEmployee
    ){

        createdBy.value =
            currentEmployee.name ||
            currentEmployee.username ||
            "";

    }


    const date =
        getElement(
            "bookingDate"
        );


    if(
        date &&
        !date.value
    ){

        date.value =
            nowLocal();

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
        getElement(
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

        "bookingOrderNumber",

        "bookingNote"

    ].forEach(id => {

        const element =
            getElement(id);


        if(element){

            element.value =
                "";

        }

    });


    const type =
        getElement(
            "bookingType"
        );


    if(type){

        type.value =
            "Einzahlung";

        type.disabled =
            false;

    }


    const payment =
        getElement(
            "bookingPaymentMethod"
        );


    if(payment){

        payment.value =
            "Ingame-Bargeld";

    }


    const status =
        getElement(
            "bookingStatus"
        );


    if(status){

        status.value =
            "Offen";

    }


    const category =
        getElement(
            "bookingCategory"
        );


    if(category){

        category.value =
            "Auftrag";

    }


    const createdBy =
        getElement(
            "bookingCreatedBy"
        );


    if(
        createdBy &&
        currentEmployee
    ){

        createdBy.value =
            currentEmployee.name ||
            currentEmployee.username ||
            "";

    }


    const date =
        getElement(
            "bookingDate"
        );


    if(date){

        date.value =
            nowLocal();

    }

}


/* =====================================================
   BUCHUNG SPEICHERN
===================================================== */

window.saveBooking =
async function(){

    if(
        !canCreateDeposit()
    ){

        alert(
            "Du hast keine Berechtigung, eine Buchung zu erstellen."
        );

        return;

    }


    let type =
        getValue(
            "bookingType"
        );


    /*
     * Mitarbeiter dürfen nur Einzahlung.
     */

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


    if(
        amount <= 0
    ){

        alert(
            "Bitte einen gültigen Betrag eingeben."
        );

        return;

    }


    /*
     * Sicherheitsprüfung:
     * Mitarbeiter können niemals
     * eine Auszahlung erstellen.
     */

    if(
        isMitarbeiter() &&
        type === "Auszahlung"
    ){

        alert(
            "Mitarbeiter dürfen nur Einzahlungen erstellen."
        );

        return;

    }


    const bookingNumber =
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
        new Date().toISOString();


    const createdBy =
        currentEmployee?.name ||
        getValue(
            "bookingCreatedBy"
        ) ||
        "Manuell";


    /*
     * Vollständige Buchungsdaten.
     */

    const payload = {

        buchungsnummer:
            bookingNumber,

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
            getValue(
                "bookingStatus"
            ) ||
            "Offen",

        notiz:
            getValue(
                "bookingNote"
            )

    };


    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    /*
     * Buchung in der Datenbank speichern.
     *
     * WICHTIG:
     * Diese Funktion wird nur durch die
     * manuelle Buchhaltung ausgelöst.
     *
     * Ein normaler Portal-Auftrag wird
     * hier NICHT automatisch eingetragen.
     */

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

        console.error(
            "Buchung speichern:",
            error
        );


        alert(
            "Buchung konnte nicht gespeichert werden.\n\n" +
            error.message
        );

        return;

    }


    /*
     * Lokale Liste aktualisieren.
     */

    bookings.unshift(
        data
    );


    /*
     * Protokoll-Eintrag.
     */

    const logPayload = {

        typ:
            "Erstellt",

        bereich:
            "Buchung",

        aktion:
            type,

        beschreibung:
            bookingNumber +
            " · " +
            type +
            " · " +
            money(amount),

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy,

        datum:
            date,

        status:
            payload.status,

        neue_werte:
            data

    };


    const {
        data:
            logData,

        error:
            logError

    } =
        await buchhaltungDB
            .from(
                TABLE_LOGS
            )
            .insert(
                logPayload
            )
            .select()
            .single();


    if(
        !logError &&
        logData
    ){

        activityLogs.unshift(
            logData
        );

    }


    /*
     * Discord-Benachrichtigung.
     */

    await sendDiscordNotification({

        type:
            "Buchung",

        title:
            type === "Einzahlung"
                ? "Neue Einzahlung"
                : "Neue Auszahlung",

        amount:
            amount,

        from:
            payload.von,

        to:
            payload.an,

        purpose:
            payload.zweck,

        category:
            payload.kategorie,

        orderNumber:
            payload.auftragsnummer,

        status:
            payload.status,

        createdBy:
            createdBy,

        date:
            date,

        description:
            bookingNumber,

        note:
            payload.notiz

    });


    /*
     * Anzeige aktualisieren.
     */

    renderBookings();

    renderOverview();

    renderAuditLog();


    clearBookingForm();

    closeBookingModal();


    alert(
        "Buchung wurde gespeichert."
    );

};


/* =====================================================
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 6 VON 10
===================================================== */


/* =====================================================
   SPARKONTO – BILANZ
===================================================== */

function getSavingsBalance(){

    const deposits =
        savingsTransactions
            .filter(
                transaction =>
                    (
                        transaction.art ||
                        transaction.type
                    ) ===
                    "Einzahlung"
            )
            .reduce(
                (
                    sum,
                    transaction
                ) =>
                    sum +
                    numberValue(
                        transaction.betrag ??
                        transaction.amount
                    ),
                0
            );


    const withdrawals =
        savingsTransactions
            .filter(
                transaction =>
                    (
                        transaction.art ||
                        transaction.type
                    ) ===
                    "Auszahlung"
            )
            .reduce(
                (
                    sum,
                    transaction
                ) =>
                    sum +
                    numberValue(
                        transaction.betrag ??
                        transaction.amount
                    ),
                0
            );


    return (
        deposits -
        withdrawals
    );

}


/* =====================================================
   SPARKONTO – ÜBERSICHT
===================================================== */

function updateSavingsOverview(){

    const balance =
        getSavingsBalance();


    const goal =
        numberValue(
            savingsGoalValue
        );


    const progress =
        goal > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    (
                        balance /
                        goal
                    ) * 100
                )
            )
            : 0;


    setText(
        "savingsBalance",
        money(balance)
    );


    setText(
        "savingsGoal",
        money(goal)
    );


    setText(
        "savingsProgress",
        progress.toFixed(1) +
        "%"
    );


    const progressBar =
        document.getElementById(
            "savingsProgressBar"
        );


    if(progressBar){

        progressBar.style.width =
            progress + "%";

    }

}


/* =====================================================
   SPARKONTO – ANZEIGE
===================================================== */

function renderSavings(){

    const body =
        document.getElementById(
            "savingsTableBody"
        );


    updateSavingsOverview();


    if(!body){

        return;

    }


    if(
        !Array.isArray(
            savingsTransactions
        ) ||
        !savingsTransactions.length
    ){

        body.innerHTML = `
            <tr class="empty-row">

                <td colspan="6">
                    Noch keine Sparkonto-Buchungen vorhanden.
                </td>

            </tr>
        `;

        return;

    }


    body.innerHTML =
        savingsTransactions
            .slice()
            .reverse()
            .map(
                transaction => {

                    const type =
                        transaction.art ||
                        transaction.type ||
                        "—";


                    const amount =
                        numberValue(
                            transaction.betrag ??
                            transaction.amount
                        );


                    return `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    transaction.buchungsnummer ||
                                    transaction.id ||
                                    "—"
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    type
                                )}
                            </td>


                            <td>
                                ${money(
                                    amount
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    transaction.von ||
                                    transaction.from ||
                                    "—"
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    transaction.an ||
                                    transaction.to ||
                                    "—"
                                )}
                            </td>


                            <td>
                                ${formatDate(
                                    transaction.datum ||
                                    transaction.date
                                )}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =====================================================
   SPARKONTO – SPARZIEL SETZEN
===================================================== */

window.setSavingsGoal =
function(){

    if(
        !canManageBookkeeping()
    ){

        alert(
            "Nur Leitung und Stadtleitung dürfen das Sparziel verwalten."
        );

        return;

    }


    const value =
        numberValue(
            getValue(
                "savingsGoal"
            )
        );


    if(value < 0){

        alert(
            "Das Sparziel darf nicht negativ sein."
        );

        return;

    }


    savingsGoalValue =
        value;


    updateSavingsOverview();

};


/* =====================================================
   SPARKONTO – MODAL ÖFFNEN
===================================================== */

window.openSavingsModal =
function(){

    if(
        !canManageBookkeeping()
    ){

        alert(
            "Nur Leitung und Stadtleitung dürfen das Sparkonto verwalten."
        );

        return;

    }


    const date =
        getElement(
            "savingsDate"
        );


    if(date){

        date.value =
            nowLocal();

    }


    openModal(
        "savingsModal"
    );

};


/* =====================================================
   SPARKONTO – MODAL SCHLIESSEN
===================================================== */

window.closeSavingsModal =
function(){

    closeSavings();

};


/* =====================================================
   SPARKONTO – SCHLIESSEN
===================================================== */

function closeSavings(){

    closeModal(
        "savingsModal"
    );

}


/* =====================================================
   SPARKONTO – FORMULAR LEEREN
===================================================== */

function clearSavingsForm(){

    [

        "savingsNumber",

        "savingsAmount",

        "savingsFrom",

        "savingsTo",

        "savingsPurpose",

        "savingsNote"

    ].forEach(
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

}


/* =====================================================
   SPARKONTO – BUCHUNG SPEICHERN
===================================================== */

window.saveSavings =
async function(){

    if(
        !canManageBookkeeping()
    ){

        alert(
            "Nur Leitung und Stadtleitung dürfen das Sparkonto verwalten."
        );

        return;

    }


    const type =
        getValue(
            "savingsType"
        ) ||
        "Einzahlung";


    if(
        type !== "Einzahlung" &&
        type !== "Auszahlung"
    ){

        alert(
            "Ungültige Sparkonto-Buchungsart."
        );

        return;

    }


    const amount =
        numberValue(
            getValue(
                "savingsAmount"
            )
        );


    if(amount <= 0){

        alert(
            "Bitte einen gültigen Betrag eingeben."
        );

        return;

    }


    /*
     * Keine negative Sparkonto-Bilanz.
     */

    if(
        type === "Auszahlung" &&
        amount > getSavingsBalance()
    ){

        alert(
            "Die Auszahlung überschreitet das aktuelle Sparkonto-Guthaben."
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
            getValue(
                "savingsDate"
            ) ||
            new Date().toISOString(),

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            currentEmployee?.name ||
            "Manuell",

        notiz:
            getValue(
                "savingsNote"
            )

    };


    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


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

        console.error(
            "Sparkonto:",
            error
        );


        alert(
            "Sparkonto-Buchung konnte nicht gespeichert werden.\n\n" +
            error.message
        );

        return;

    }


    savingsTransactions.unshift(
        data
    );


    renderSavings();

    renderOverview();


    await sendDiscordNotification({

        type:
            "Sparkonto",

        title:
            "Neue Sparkonto-Buchung",

        amount:
            amount,

        from:
            payload.von,

        to:
            payload.an,

        purpose:
            payload.zweck,

        category:
            "Sparkonto",

        createdBy:
            payload.erstellt_von_name,

        date:
            payload.datum,

        description:
            bookingNumber,

        note:
            payload.notiz

    });


    clearSavingsForm();

    closeSavings();


    alert(
        "Sparkonto-Buchung wurde gespeichert."
    );

};


/* =====================================================
   HTML-KOMPATIBLE FUNKTIONEN
===================================================== */

window.saveSavingsTransaction =
function(){

    return saveSavings();

};


window.saveSavingsGoal =
function(){

    return setSavingsGoal();

};


/* =====================================================
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 7 VON 10
   MITARBEITERÜBERSICHT
===================================================== */


/* =====================================================
   MITARBEITERÜBERSICHT
===================================================== */

function renderEmployees(){

    const body =
        document.getElementById(
            "employeeTableBody"
        );

    if(!body) return;


    if(!employees || employees.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">
                    Keine Mitarbeiter vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        employees.map(employee => {

            const name =
                getEmployeeName(employee);


            /* -----------------------------------------
               AUFTRAGSARBEITER
            ----------------------------------------- */

            const employeeWorkers =
                (workers || []).filter(worker => {

                    const workerName =
                        String(
                            worker.name ||
                            worker.arbeiter_name ||
                            worker.username ||
                            ""
                        )
                        .trim()
                        .toLowerCase();

                    return (
                        workerName ===
                        String(name)
                            .trim()
                            .toLowerCase()
                    );

                });


            const salary =
                employeeWorkers.reduce(
                    (sum, worker) =>
                        sum +
                        numberValue(
                            worker.gehalt
                        ),
                    0
                );


            /* -----------------------------------------
               BUCHUNGEN DES MITARBEITERS
            ----------------------------------------- */

            const employeeBookings =
                (bookings || []).filter(booking => {

                    const from =
                        String(
                            booking.von ||
                            booking.from ||
                            ""
                        )
                        .trim()
                        .toLowerCase();


                    const to =
                        String(
                            booking.an ||
                            booking.to ||
                            ""
                        )
                        .trim()
                        .toLowerCase();


                    const employeeName =
                        String(name)
                            .trim()
                            .toLowerCase();


                    return (
                        from === employeeName ||
                        to === employeeName
                    );

                });


            /* -----------------------------------------
               EINZAHLUNGEN
            ----------------------------------------- */

            const deposits =
                employeeBookings
                    .filter(
                        booking =>
                            (
                                booking.art ||
                                booking.type
                            ) ===
                            "Einzahlung"
                    )
                    .reduce(
                        (sum, booking) =>
                            sum +
                            numberValue(
                                booking.betrag ??
                                booking.amount
                            ),
                        0
                    );


            /* -----------------------------------------
               AUSZAHLUNGEN
            ----------------------------------------- */

            const withdrawals =
                employeeBookings
                    .filter(
                        booking =>
                            (
                                booking.art ||
                                booking.type
                            ) ===
                            "Auszahlung"
                    )
                    .reduce(
                        (sum, booking) =>
                            sum +
                            numberValue(
                                booking.betrag ??
                                booking.amount
                            ),
                        0
                    );


            /* -----------------------------------------
               OFFENE BETRÄGE
            ----------------------------------------- */

            const openAmounts =
                employeeBookings
                    .filter(
                        booking =>
                            booking.status ===
                            "Offen" ||
                            booking.status ===
                            "Teilweise bezahlt"
                    )
                    .reduce(
                        (sum, booking) =>
                            sum +
                            numberValue(
                                booking.betrag ??
                                booking.amount
                            ),
                        0
                    );


            return `
                <tr>

                    <td>
                        ${escapeHtml(name)}
                    </td>

                    <td>
                        ${employeeWorkers.length}
                    </td>

                    <td>
                        ${money(salary)}
                    </td>

                    <td>
                        ${money(deposits)}
                    </td>

                    <td>
                        ${money(withdrawals)}
                    </td>

                    <td>
                        ${money(openAmounts)}
                    </td>

                </tr>
            `;

        }).join("");

}


/* =====================================================
   MITARBEITER SUCHEN
===================================================== */

window.filterEmployees = function(){

    const search =
        getValue("employeeSearch")
            .toLowerCase();


    const body =
        document.getElementById(
            "employeeTableBody"
        );

    if(!body) return;


    const filtered =
        employees.filter(employee => {

            const text =
                JSON.stringify(employee)
                    .toLowerCase();

            return (
                !search ||
                text.includes(search)
            );

        });


    if(filtered.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">
                    Keine passenden Mitarbeiter gefunden.
                </td>
            </tr>
        `;

        return;

    }


    const previousEmployees =
        employees;


    employees =
        filtered;


    renderEmployees();


    employees =
        previousEmployees;

};


/* =====================================================
   MITARBEITERNAME ERMITTELN
===================================================== */

function getEmployeeName(employee){

    return (
        employee?.name ||
        employee?.username ||
        employee?.minecraft_name ||
        employee?.display_name ||
        "Unbekannt"
    );

}


/* =====================================================
   MITARBEITERÜBERSICHT AKTUALISIEREN
===================================================== */

function updateEmployeeOverview(){

    renderEmployees();

}


/* =====================================================
   MITARBEITER-DATEN NACH LADEN AKTUALISIEREN
===================================================== */

function refreshEmployeeSection(){

    if(
        typeof renderEmployees ===
        "function"
    ){

        renderEmployees();

    }

}


/* =====================================================
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 8 VON 10
   KASSENABGLEICH & FINANZKONTROLLE
===================================================== */


/* =====================================================
   KASSENABGLEICH ÖFFNEN
===================================================== */

window.openCashCheck = function(){

    const modal =
        document.getElementById(
            "cashCheckModal"
        );

    if(!modal) return;

    modal.classList.add("active");


    const portalBalance =
        getCurrentClanBalance();

    setValue(
        "cashPortalInput",
        portalBalance
    );


    setValue(
        "cashIngameInput",
        ""
    );

    setValue(
        "cashCheckNote",
        ""
    );

};


/* =====================================================
   KASSENABGLEICH SCHLIESSEN
===================================================== */

window.closeCashCheck = function(){

    const modal =
        document.getElementById(
            "cashCheckModal"
        );

    if(!modal) return;

    modal.classList.remove("active");

};


/* =====================================================
   KASSENABGLEICH SPEICHERN
===================================================== */

window.saveCashCheck = async function(){

    if(!isManagement()){

        alert(
            "Nur Leitung und Stadtleitung dürfen einen Kassenabgleich erfassen."
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
        ingame - portal;


    const date =
        getValue(
            "cashCheckDate"
        ) ||
        nowLocal();


    const createdBy =
        currentEmployee?.name ||
        currentEmployee?.username ||
        "Manuell";


    const note =
        getValue(
            "cashCheckNote"
        );


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


    if(!hasSupabase()){

        alert(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


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

        console.error(
            "Kassenabgleich:",
            error
        );

        showDatabaseError(
            error,
            "Kassenabgleich konnte nicht gespeichert werden."
        );

        return;

    }


    cashChecks.unshift(
        data
    );


    /* -----------------------------------------
       PROTOKOLL
    ----------------------------------------- */

    await buchhaltungDB
        .from(
            TABLE_LOGS
        )
        .insert({

            typ:
                "Erstellt",

            bereich:
                "Kassenabgleich",

            aktion:
                "Kassenabgleich gespeichert",

            beschreibung:
                `Portal: ${money(portal)} · Ingame: ${money(ingame)} · Abweichung: ${money(difference)}`,

            erstellt_von:
                currentUser?.id ||
                null,

            erstellt_von_name:
                createdBy,

            datum:
                date,

            status:
                difference === 0
                    ? "OK"
                    : "Abweichung",

            neue_werte:
                payload

        });


    /* -----------------------------------------
       DISCORD
    ----------------------------------------- */

    await sendDiscordNotification({

        type:
            "Kassenabgleich",

        title:
            "Neuer Kassenabgleich",

        amount:
            difference,

        from:
            "Portal",

        to:
            "Ingame",

        purpose:
            "Kassenabgleich",

        category:
            "Kontrolle",

        orderNumber:
            "",

        status:
            difference === 0
                ? "OK"
                : "Abweichung",

        createdBy:
            createdBy,

        date:
            date,

        note:
            note ||
            "",

        description:
            `Portalstand: ${money(portal)} | Ingame-Stand: ${money(ingame)} | Abweichung: ${money(difference)}`

    });


    renderCashChecks();

    renderLogs();

    runFinancialControl();

    closeCashCheck();

};


/* =====================================================
   KASSENABGLEICHE ANZEIGEN
===================================================== */

function renderCashChecks(){

    const body =
        document.getElementById(
            "cashcheckTableBody"
        );

    if(!body) return;


    const portalBalance =
        getCurrentClanBalance();


    setText(
        "cashPortalBalance",
        money(portalBalance)
    );


    if(!cashChecks || cashChecks.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">
                    Noch keine Kassenabgleiche vorhanden.
                </td>
            </tr>
        `;

        setText(
            "cashIngameBalance",
            "0 $"
        );

        setText(
            "cashDifference",
            "0 $"
        );

        setText(
            "cashcheckStatus",
            "Noch kein Kassenabgleich durchgeführt."
        );

        return;

    }


    const latest =
        cashChecks[0];


    const latestIngame =
        numberValue(
            latest.ingame_stand ??
            latest.ingame
        );


    const latestDifference =
        numberValue(
            latest.abweichung ??
            latest.difference
        );


    setText(
        "cashIngameBalance",
        money(latestIngame)
    );


    setText(
        "cashDifference",
        money(latestDifference)
    );


    setText(
        "cashcheckStatus",
        latestDifference === 0
            ? "Kassenstand stimmt mit dem Ingame-Bestand überein."
            : "Es besteht eine Abweichung zwischen Portal und Ingame."
    );


    body.innerHTML =
        cashChecks.map(check => {

            const difference =
                numberValue(
                    check.abweichung ??
                    check.difference
                );


            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            formatDate(
                                check.datum ||
                                check.date
                            )
                        )}
                    </td>

                    <td>
                        ${money(
                            check.portalstand ??
                            check.portal
                        )}
                    </td>

                    <td>
                        ${money(
                            check.ingame_stand ??
                            check.ingame
                        )}
                    </td>

                    <td>
                        ${money(
                            difference
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            check.erstellt_von_name ||
                            "Unbekannt"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            check.notiz ||
                            ""
                        )}
                    </td>

                </tr>
            `;

        }).join("");

}


/* =====================================================
   FINANZKONTROLLE
===================================================== */

function runFinancialControl(){

    const warnings = [];


    const clanBalance =
        getCurrentClanBalance();


    const savingsBalance =
        getSavingsBalance();


    /* -----------------------------------------
       CLANKASSE
    ----------------------------------------- */

    if(clanBalance < 0){

        warnings.push(
            "Die Clankasse weist einen negativen Stand auf."
        );

    }


    /* -----------------------------------------
       SPARKONTO
    ----------------------------------------- */

    if(savingsBalance < 0){

        warnings.push(
            "Das Sparkonto weist einen negativen Bestand auf."
        );

    }


    /* -----------------------------------------
       AUFTRAGSVERTEILUNG
    ----------------------------------------- */

    orderSettlements.forEach(order => {

        const total =
            numberValue(
                order.gesamtbetrag ??
                order.total
            );


        const clanAmount =
            numberValue(
                order.clanbetrag ??
                order.clan
            );


        const orderWorkers =
            workers.filter(
                worker =>
                    worker.auftragsabrechnung_id ===
                    order.id
            );


        const workerTotal =
            orderWorkers.reduce(
                (sum, worker) =>
                    sum +
                    numberValue(
                        worker.gehalt
                    ),
                0
            );


        const distributed =
            clanAmount +
            workerTotal;


        const remaining =
            total -
            distributed;


        if(remaining > 0){

            warnings.push(
                `Auftrag ${
                    order.auftragsnummer ||
                    order.id
                } ist noch nicht vollständig verteilt. Restbetrag: ${money(remaining)}`
            );

        }


        if(distributed > total){

            warnings.push(
                `Auftrag ${
                    order.auftragsnummer ||
                    order.id
                } überschreitet den Gesamtbetrag.`
            );

        }

    });


    /* -----------------------------------------
       KASSENABGLEICH
    ----------------------------------------- */

    cashChecks.forEach(check => {

        const difference =
            numberValue(
                check.abweichung ??
                check.difference
            );


        if(difference !== 0){

            warnings.push(
                `Kassenabgleich vom ${
                    formatDate(
                        check.datum ||
                        check.date
                    )
                }: Abweichung ${money(difference)}`
            );

        }

    });


    const warningList =
        document.getElementById(
            "warningList"
        );


    if(!warningList) return;


    if(warnings.length === 0){

        warningList.innerHTML = `
            <div class="control-ok">
                Keine finanziellen Auffälligkeiten gefunden.
            </div>
        `;

        return;

    }


    warningList.innerHTML =
        warnings.map(warning => `
            <div class="control-warning">
                ${escapeHtml(warning)}
            </div>
        `).join("");

}


/* =====================================================
   FINANZKONTROLLE ÖFFNEN
===================================================== */

window.openFinancialControl = function(){

    runFinancialControl();

};
/* =====================================================
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 9 VON 10
   MONATSBILANZ
===================================================== */


/* =====================================================
   MONATSBILANZ AKTUALISIEREN
===================================================== */

function updateMonthly(){

    const period =
        getValue(
            "monthlyPeriod"
        ) ||
        new Date()
            .toISOString()
            .slice(0,7);


    const parts =
        period.split("-");


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


    /* -----------------------------------------
       BUCHUNGEN DES MONATS
    ----------------------------------------- */

    (bookings || []).forEach(
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


            /* ---------------------------------
               EINNAHMEN
            --------------------------------- */

            if(
                type ===
                "Einzahlung"
            ){

                income +=
                    amount;

            }


            /* ---------------------------------
               AUSGABEN
            --------------------------------- */

            else if(
                type ===
                "Auszahlung"
            ){

                expenses +=
                    amount;

            }


            /* ---------------------------------
               GEHÄLTER
            --------------------------------- */

            const category =
                booking.kategorie ||
                booking.category;


            if(
                category ===
                "Gehalt"
            ){

                wages +=
                    amount;

            }

        }
    );


    /* -----------------------------------------
       VERÄNDERUNG
    ----------------------------------------- */

    const change =
        income -
        expenses;


    /* -----------------------------------------
       AUSGABE
    ----------------------------------------- */

    setText(
        "monthlyIncome",
        money(
            income
        )
    );


    setText(
        "monthlyExpenses",
        money(
            expenses
        )
    );


    setText(
        "monthlyWages",
        money(
            wages
        )
    );


    setText(
        "monthlyChange",
        money(
            change
        )
    );


    setText(
        "monthlyBookingCount",
        count
    );


    setText(
        "monthlyLabel",
        `${String(
            month
        ).padStart(
            2,
            "0"
        )}/${year}`
    );

}


/* =====================================================
   HTML-ALIAS
   Das HTML verwendet updateMonthlyBalance()
===================================================== */

window.updateMonthlyBalance =
    function(){

        updateMonthly();

    };


/* =====================================================
   MONATSBILANZ INITIALISIEREN
===================================================== */

function initializeMonthly(){

    const input =
        document.getElementById(
            "monthlyPeriod"
        );


    if(!input){
        return;
    }


    /* Aktuellen Monat nur setzen,
       wenn noch keiner ausgewählt wurde. */

    if(!input.value){

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
   MONATSBILANZ BEI BUCHUNGSÄNDERUNG
===================================================== */

function refreshMonthlyBalance(){

    const area =
        document.getElementById(
            "area-monthly"
        );


    if(
        area &&
        area.classList.contains(
            "active"
        )
    ){

        updateMonthly();

    }

}


/* =====================================================
   FINANZÜBERSICHT AKTUALISIEREN
===================================================== */

function refreshFinancialOverview(){

    if(
        typeof calculateFinancialOverview ===
        "function"
    ){

        calculateFinancialOverview();

    }


    if(
        typeof renderOverview ===
        "function"
    ){

        renderOverview();

    }


    if(
        typeof updateSavingsOverview ===
        "function"
    ){

        updateSavingsOverview();

    }


    if(
        typeof runFinancialControl ===
        "function"
    ){

        runFinancialControl();

    }

}


/* =====================================================
   ALLE AUSWERTUNGEN AKTUALISIEREN
===================================================== */

function refreshAllFinancialViews(){

    if(
        typeof renderBookings ===
        "function"
    ){

        renderBookings();

    }


    if(
        typeof renderOrderSettlements ===
        "function"
    ){

        renderOrderSettlements();

    }


    if(
        typeof renderEmployees ===
        "function"
    ){

        renderEmployees();

    }


    if(
        typeof renderSavings ===
        "function"
    ){

        renderSavings();

    }


    if(
        typeof renderCashChecks ===
        "function"
    ){

        renderCashChecks();

    }


    refreshFinancialOverview();

    refreshMonthlyBalance();

}


/* =====================================================
   MONATSBILANZ BEI ÄNDERUNG AUTOMATISCH AKTUALISIEREN
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function(){

        initializeMonthly();

    }
);


/* =====================================================
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 10 VON 10
   PROTOKOLL · RECHTE · ABSCHLUSS
===================================================== */


/* =====================================================
   PROTOKOLL ANZEIGEN
===================================================== */

function renderLogs(){

    const body =
        document.getElementById(
            "logTableBody"
        );

    if(!body) return;


    if(!logs || logs.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    Noch keine Protokolleinträge vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        logs.map(log => {

            const date =
                log.datum ||
                log.date;


            const creator =
                log.erstellt_von_name ||
                log.created_by_name ||
                "Unbekannt";


            const action =
                log.aktion ||
                log.action ||
                "—";


            const area =
                log.bereich ||
                log.area ||
                "—";


            const status =
                log.status ||
                "—";


            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            formatDate(date)
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            creator
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            area
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            action
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            status
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.beschreibung ||
                            log.description ||
                            "—"
                        )}
                    </td>

                    <td>

                        <button
                            class="small-button"
                            onclick="openLogDetail('${log.id}')"
                        >
                            Details
                        </button>

                    </td>

                </tr>
            `;

        }).join("");

}


/* =====================================================
   PROTOKOLL-DETAILS
===================================================== */

window.openLogDetail = function(id){

    const log =
        logs.find(
            entry =>
                String(entry.id) ===
                String(id)
        );


    if(!log){

        alert(
            "Protokolleintrag wurde nicht gefunden."
        );

        return;

    }


    const modal =
        document.getElementById(
            "logDetailModal"
        );


    const content =
        document.getElementById(
            "logDetailContent"
        );


    if(!modal || !content){

        return;

    }


    content.innerHTML = `

        <div class="detail-row">
            <span>Buchungs-ID</span>
            <strong>
                ${escapeHtml(
                    String(
                        log.id ||
                        "—"
                    )
                )}
            </strong>
        </div>


        <div class="detail-row">
            <span>Datum</span>
            <strong>
                ${escapeHtml(
                    formatDate(
                        log.datum ||
                        log.date
                    )
                )}
            </strong>
        </div>


        <div class="detail-row">
            <span>Erstellt von</span>
            <strong>
                ${escapeHtml(
                    log.erstellt_von_name ||
                    log.created_by_name ||
                    "Unbekannt"
                )}
            </strong>
        </div>


        <div class="detail-row">
            <span>Bereich</span>
            <strong>
                ${escapeHtml(
                    log.bereich ||
                    log.area ||
                    "—"
                )}
            </strong>
        </div>


        <div class="detail-row">
            <span>Aktion</span>
            <strong>
                ${escapeHtml(
                    log.aktion ||
                    log.action ||
                    "—"
                )}
            </strong>
        </div>


        <div class="detail-row">
            <span>Status</span>
            <strong>
                ${escapeHtml(
                    log.status ||
                    "—"
                )}
            </strong>
        </div>


        <div class="detail-row">
            <span>Beschreibung</span>
            <strong>
                ${escapeHtml(
                    log.beschreibung ||
                    log.description ||
                    "—"
                )}
            </strong>
        </div>

    `;


    modal.classList.add(
        "active"
    );

};


/* =====================================================
   PROTOKOLL-DETAILS SCHLIESSEN
===================================================== */

window.closeLogDetail = function(){

    const modal =
        document.getElementById(
            "logDetailModal"
        );


    if(modal){

        modal.classList.remove(
            "active"
        );

    }

};


/* =====================================================
   RECHTE ANZEIGEN
===================================================== */

function renderBookkeepingPermissions(){

    const employee =
        document.getElementById(
            "permissionEmployee"
        );


    const management =
        document.getElementById(
            "permissionManagement"
        );


    const cityManagement =
        document.getElementById(
            "permissionCityManagement"
        );


    if(employee){

        employee.textContent =
            "Einzahlungen erfassen";

    }


    if(management){

        management.textContent =
            "Vollzugriff";

    }


    if(cityManagement){

        cityManagement.textContent =
            "Vollzugriff";

    }

}


/* =====================================================
   BEREICHSBERECHTIGUNGEN
===================================================== */

function applyBookkeepingPermissions(){

    const employee =
        isEmployee();


    const management =
        isManagement();


    document
        .querySelectorAll(
            ".management-only"
        )
        .forEach(
            element => {

                element.style.display =
                    management
                        ? ""
                        : "none";

            }
        );


    document
        .querySelectorAll(
            ".employee-booking"
        )
        .forEach(
            element => {

                element.style.display =
                    employee ||
                    management
                        ? ""
                        : "none";

            }
        );

}


/* =====================================================
   BUCHHALTUNG ABSCHLIESSEN
===================================================== */

function finalizeBookkeeping(){

    renderOverview();

    renderBookings();

    renderOrderSettlements();

    renderEmployees();

    renderSavings();

    renderCashChecks();

    renderLogs();

    runFinancialControl();

    updateMonthly();

}


/* =====================================================
   GESAMTE SEITE NACH DATENÄNDERUNG AKTUALISIEREN
===================================================== */

window.refreshBookkeeping =
    function(){

        finalizeBookkeeping();

    };


/* =====================================================
   BERECHTIGUNGEN NACH LOGIN AKTUALISIEREN
===================================================== */

function refreshBookkeepingPermissions(){

    if(
        typeof applyBookkeepingPermissions ===
        "function"
    ){

        applyBookkeepingPermissions();

    }


    if(
        typeof renderBookkeepingPermissions ===
        "function"
    ){

        renderBookkeepingPermissions();

    }

}


/* =====================================================
   ABSCHLUSS BEIM LADEN
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function(){

        refreshBookkeepingPermissions();

        setTimeout(
            function(){

                if(
                    typeof finalizeBookkeeping ===
                    "function"
                ){

                    finalizeBookkeeping();

                }

            },
            250
        );

    }
);


/* =====================================================
   FEHLERBEHANDLUNG
===================================================== */

window.addEventListener(
    "error",
    function(event){

        console.error(
            "Buchhaltung JavaScript Fehler:",
            event.error ||
            event.message
        );

    }
);


/* =====================================================
   ABSCHLUSS
===================================================== */

console.log(
    "Ehrenmarkt Clan-Buchhaltung V0.1 Beta geladen."
);
