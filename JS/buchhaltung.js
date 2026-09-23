/* =========================================================
   EHRENMARKT – CLAN-BUCHHALTUNG
   V0.1 BETA – ÜBERARBEITETE VERSION
   TEIL 1 / 12
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const buchhaltungDB =
    window.supabaseClient ||
    window.supabase ||
    null;


/* =========================================================
   TABELLEN
========================================================= */

const TABLE_BOOKINGS =
    "buchhaltung_buchungen";

const TABLE_SAVINGS =
    "buchhaltung_sparkonto";

const TABLE_EMPLOYEES =
    "employees";

const TABLE_ORDERS =
    "buchhaltung_auftragsabrechnungen";

const TABLE_ORDER_WORKERS =
    "buchhaltung_auftragsarbeiter";

const TABLE_LOGS =
    "buchhaltung_protokoll";

const TABLE_ACTIVITY_LOG =
    TABLE_LOGS;

const TABLE_CASH =
    "buchhaltung_kassenabgleich";


/* =========================================================
   DATEN
========================================================= */

let currentUser = null;

let currentEmployee = null;

let bookings = [];

let savingsTransactions = [];

let employees = [];

let orderSettlements = [];

let orderWorkers = [];

let cashChecks = [];

let activityLogs = [];

let savingsGoalValue = 0;


/*
   Persönlicher Buchhaltungsname.

   Der Rang kommt aus employees.
   Der Buchhaltungsname wird vom Benutzer
   beim ersten Öffnen selbst festgelegt.

   Der Name wird danach lokal für genau
   dieses eingeloggte Konto gespeichert.
*/

let bookkeepingName = "";

const BOOKKEEPING_NAME_KEY =
    "ehrenmarkt_buchhaltung_name";


/* =========================================================
   HILFSFUNKTIONEN
========================================================= */

function getElement(id){

    return document.getElementById(id);

}


function getValue(id){

    const element =
        getElement(id);

    if(!element){

        return "";

    }

    return String(
        element.value || ""
    ).trim();

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


/* =========================================================
   ZAHLEN
========================================================= */

function numberValue(value){

    if(
        value === null ||
        value === undefined ||
        value === ""
    ){

        return 0;

    }


    if(
        typeof value === "number"
    ){

        return Number.isFinite(value)
            ? value
            : 0;

    }


    let text =
        String(value)
            .trim();


    if(!text){

        return 0;

    }


    /*
       Deutsche Eingaben:

       150000
       150.000
       150.000,50
       150000,50
    */

    if(
        text.includes(".") &&
        text.includes(",")
    ){

        text =
            text
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    ",",
                    "."
                );

    }
    else if(
        text.includes(",")
    ){

        text =
            text.replace(
                ",",
                "."
            );

    }
    else if(
        /^\d{1,3}(\.\d{3})+$/.test(text)
    ){

        text =
            text.replace(
                /\./g,
                ""
            );

    }


    text =
        text.replace(
            /[^\d.-]/g,
            ""
        );


    const result =
        Number(text);


    return Number.isFinite(result)
        ? result
        : 0;

}


/* =========================================================
   GELDFORMAT
========================================================= */

function money(value){

    const amount =
        numberValue(value);


    return (
        new Intl.NumberFormat(
            "de-DE",
            {
                maximumFractionDigits: 2,
                minimumFractionDigits: 0
            }
        ).format(amount)
        + " $"
    );

}


/* =========================================================
   DATUM
========================================================= */

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
    .slice(
        0,
        16
    );

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
            dateStyle:
                "short",
            timeStyle:
                "short"
        }
    );

}


/* =========================================================
   SUPABASE STATUS
========================================================= */

function hasSupabase(){

    return !!(
        buchhaltungDB &&
        typeof buchhaltungDB.from ===
            "function"
    );

}


function showDatabaseError(error){

    console.error(
        "Buchhaltung:",
        error
    );


    let message =
        "Datenbankfehler.";


    if(
        error &&
        error.message
    ){

        message =
            error.message;

    }


    alert(
        "Buchhaltung:\n\n" +
        message
    );

}


/* =========================================================
   MODALS
========================================================= */

function openModal(id){

    const modal =
        getElement(id);


    if(modal){

        modal.classList.add(
            "active"
        );

    }

}


function closeModal(id){

    const modal =
        getElement(id);


    if(modal){

        modal.classList.remove(
            "active"
        );

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

window.showArea =
function(id,button){

    const selected =
        getElement(id);


    if(!selected){

        console.error(
            "Buchhaltungsbereich nicht gefunden:",
            id
        );

        return;

    }


    const alreadyOpen =
        selected.classList.contains(
            "active"
        );


    document
        .querySelectorAll(
            ".open-area"
        )
        .forEach(
            area => {

                area.classList.remove(
                    "active"
                );

            }
        );


    document
        .querySelectorAll(
            ".nav-button"
        )
        .forEach(
            btn => {

                btn.classList.remove(
                    "active"
                );

            }
        );


    /*
       Derselbe Button erneut:
       Bereich schließen.
    */

    if(alreadyOpen){

        return;

    }


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

            selected.scrollIntoView(
                {
                    behavior:
                        "smooth",
                    block:
                        "start"
                }
            );

        },
        100
    );

};


/* =========================================================
   RECHTE
========================================================= */

function getCurrentRank(){

    if(!currentEmployee){

        return "";

    }


    /*
       Rang ist die primäre Angabe.
       Falls die bestehende Employees-Tabelle
       den Wert stattdessen in role führt,
       wird dieser ebenfalls berücksichtigt.
    */

    return String(
        currentEmployee.rang ||
        currentEmployee.role ||
        ""
    ).trim();

}


function getCurrentRole(){

    if(!currentEmployee){

        return "";

    }


    return String(
        currentEmployee.role ||
        ""
    ).trim();

}


function isStadtleitung(){

    const rank =
        String(
            currentEmployee?.rang ||
            ""
        )
        .trim()
        .toLowerCase();

    const role =
        String(
            currentEmployee?.role ||
            ""
        )
        .trim()
        .toLowerCase();


    return (
        rank === "stadtleitung" ||
        role === "stadtleitung"
    );

}


function isLeitung(){

    const rank =
        String(
            currentEmployee?.rang ||
            ""
        )
        .trim()
        .toLowerCase();

    const role =
        String(
            currentEmployee?.role ||
            ""
        )
        .trim()
        .toLowerCase();


    return (
        rank === "leitung" ||
        rank === "stadtleitung" ||
        role === "leitung" ||
        role === "stadtleitung"
    );

}


function isMitarbeiter(){

    const rank =
        String(
            currentEmployee?.rang ||
            ""
        )
        .trim()
        .toLowerCase();

    const role =
        String(
            currentEmployee?.role ||
            ""
        )
        .trim()
        .toLowerCase();


    if(isLeitung()){

        return false;

    }


    return (
        rank === "mitarbeiter" ||
        role === "mitarbeiter"
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


/* =========================================================
   BENUTZER LADEN
========================================================= */

async function loadCurrentUser(){

    if(!hasSupabase()){

        throw new Error(
            "Supabase ist nicht verfügbar."
        );

    }


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
        data?.user ||
        null;


    if(!currentUser){

        throw new Error(
            "Kein eingeloggter Benutzer gefunden."
        );

    }


    return currentUser;

}


/* =========================================================
   MITARBEITER / RANG LADEN
========================================================= */

async function loadCurrentEmployee(){

    if(!currentUser){

        return null;

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

        throw error;

    }


    currentEmployee =
        data ||
        null;


    return currentEmployee;

}


/* =========================================================
   BUCHHALTUNGSNAME LADEN
========================================================= */

function getBookkeepingStorageKey(){

    if(!currentUser?.id){

        return BOOKKEEPING_NAME_KEY;

    }


    return (
        BOOKKEEPING_NAME_KEY +
        "_" +
        currentUser.id
    );

}


function loadBookkeepingName(){

    bookkeepingName = "";


    try{

        bookkeepingName =
            String(
                localStorage.getItem(
                    getBookkeepingStorageKey()
                ) || ""
            ).trim();

    }
    catch(error){

        console.warn(
            "Buchhaltungsname konnte nicht aus localStorage geladen werden:",
            error
        );

    }


    return bookkeepingName;

}


function saveBookkeepingName(name){

    const cleanName =
        String(
            name || ""
        ).trim();


    if(!cleanName){

        return false;

    }


    bookkeepingName =
        cleanName;


    try{

        localStorage.setItem(
            getBookkeepingStorageKey(),
            bookkeepingName
        );

    }
    catch(error){

        console.warn(
            "Buchhaltungsname konnte nicht gespeichert werden:",
            error
        );

    }


    return true;

}


function getBookkeepingName(){

    return String(
        bookkeepingName || ""
    ).trim();

}


/* =========================================================
   BUCHHALTUNGSNAME ERSTMALIG ABFRAGEN
========================================================= */

function ensureBookkeepingName(){

    const existingName =
        getBookkeepingName();


    if(existingName){

        return existingName;

    }


    let name = "";


    while(!name){

        name =
            window.prompt(
                "Buchhaltung\n\nWie lautet dein Name?\n\nDieser Name wird anschließend bei deinen Buchungen verwendet."
            );


        if(name === null){

            throw new Error(
                "Die Eingabe des Buchhaltungsnamens wurde abgebrochen."
            );

        }


        name =
            String(
                name
            )
            .trim();


        if(!name){

            alert(
                "Bitte gib deinen Namen ein."
            );

        }

    }


    saveBookkeepingName(
        name
    );


    return bookkeepingName;

}


/* =========================================================
   INITIALER STATUS
========================================================= */

function renderPermissionState(){

    setText(
        "currentUserName",
        getBookkeepingName() ||
        currentEmployee?.name ||
        currentUser?.email ||
        "—"
    );


    setText(
        "currentUserRank",
        getCurrentRank() ||
        "Unbekannt"
    );

}


/* =========================================================
   BERECHTIGUNGS-CSS
========================================================= */

function applyBookkeepingPermissions(){

    const manager =
        canManageBookkeeping();

    const deposit =
        canCreateDeposit();


    document
        .querySelectorAll(
            "[data-manager-only]"
        )
        .forEach(
            element => {

                element.style.display =
                    manager
                        ? ""
                        : "none";

            }
        );


    document
        .querySelectorAll(
            "[data-deposit-only]"
        )
        .forEach(
            element => {

                element.style.display =
                    deposit
                        ? ""
                        : "none";

            }
        );

}


/* =========================================================
   SPARKONTO – SPARZIEL LADEN
========================================================= */

async function loadSavingsGoal(){

    savingsGoalValue =
        0;


    if(!hasSupabase()){

        return;

    }


    const {
        data,
        error
    } =
        await buchhaltungDB
            .from(
                TABLE_LOGS
            )
            .select(
                "*"
            )
            .eq(
                "typ",
                "Sparkonto"
            )
            .eq(
                "aktion",
                "Sparziel"
            )
            .order(
                "datum",
                {
                    ascending:
                        false
                }
            )
            .limit(
                1
            );


    if(error){

        console.warn(
            "Sparziel konnte nicht geladen werden:",
            error
        );

        return;

    }


    if(
        !data ||
        data.length === 0
    ){

        return;

    }


    const latest =
        data[0];


    if(
        latest.neue_werte &&
        typeof latest.neue_werte ===
            "object"
    ){

        savingsGoalValue =
            numberValue(
                latest.neue_werte.goal
            );

    }

}


/* =========================================================
   TEIL 2 / 12
   DATENLADUNG + FINANZÜBERSICHT
========================================================= */


/* =========================================================
   DATEN AUS SUPABASE LADEN
========================================================= */

async function loadBookkeepingData(){

    if(!hasSupabase()){

        throw new Error(
            "Supabase ist nicht verfügbar."
        );

    }


    /*
       Die Buchhaltung arbeitet ausschließlich
       mit ihren eigenen Buchhaltungstabellen.

       Normale Portal-Aufträge werden NICHT
       automatisch in die Buchhaltung übernommen.
    */

    const results = await Promise.allSettled([

        buchhaltungDB
            .from(TABLE_BOOKINGS)
            .select("*")
            .order(
                "datum",
                {
                    ascending: false
                }
            ),

        buchhaltungDB
            .from(TABLE_SAVINGS)
            .select("*")
            .order(
                "datum",
                {
                    ascending: false
                }
            ),

        buchhaltungDB
            .from(TABLE_EMPLOYEES)
            .select("*")
            .order(
                "name",
                {
                    ascending: true
                }
            ),

        buchhaltungDB
            .from(TABLE_ORDERS)
            .select("*")
            .order(
                "datum",
                {
                    ascending: false
                }
            ),

        buchhaltungDB
            .from(TABLE_ORDER_WORKERS)
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            ),

        buchhaltungDB
            .from(TABLE_CASH)
            .select("*")
            .order(
                "datum",
                {
                    ascending: false
                }
            ),

        buchhaltungDB
            .from(TABLE_LOGS)
            .select("*")
            .order(
                "datum",
                {
                    ascending: false
                }
            )

    ]);


    /*
       Jede Tabelle wird einzeln ausgewertet.

       Dadurch kann z. B. ein Fehler beim
       Kassenabgleich nicht mehr dafür sorgen,
       dass die Buchungen, Mitarbeiter oder
       das Sparkonto komplett verschwinden.
    */

    const [
        bookingsResult,
        savingsResult,
        employeesResult,
        ordersResult,
        workersResult,
        cashResult,
        logsResult
    ] = results;


    /* =====================================================
       BUCHUNGEN
    ===================================================== */

    if(
        bookingsResult.status ===
        "fulfilled" &&
        !bookingsResult.value.error
    ){

        bookings =
            bookingsResult.value.data ||
            [];

    }
    else{

        bookings = [];

        console.warn(
            "Buchungen konnten nicht geladen werden:",
            bookingsResult
        );

    }


    /* =====================================================
       SPARKONTO
    ===================================================== */

    if(
        savingsResult.status ===
        "fulfilled" &&
        !savingsResult.value.error
    ){

        savingsTransactions =
            savingsResult.value.data ||
            [];

    }
    else{

        savingsTransactions = [];

        console.warn(
            "Sparkonto konnte nicht geladen werden:",
            savingsResult
        );

    }


    /* =====================================================
       MITARBEITER
    ===================================================== */

    if(
        employeesResult.status ===
        "fulfilled" &&
        !employeesResult.value.error
    ){

        employees =
            employeesResult.value.data ||
            [];

    }
    else{

        employees = [];

        console.warn(
            "Mitarbeiter konnten nicht geladen werden:",
            employeesResult
        );

    }


    /* =====================================================
       AUFTRAGSABRECHNUNGEN
    ===================================================== */

    if(
        ordersResult.status ===
        "fulfilled" &&
        !ordersResult.value.error
    ){

        orderSettlements =
            ordersResult.value.data ||
            [];

    }
    else{

        orderSettlements = [];

        console.warn(
            "Auftragsabrechnungen konnten nicht geladen werden:",
            ordersResult
        );

    }


    /* =====================================================
       AUFTRAGSARBEITER
    ===================================================== */

    if(
        workersResult.status ===
        "fulfilled" &&
        !workersResult.value.error
    ){

        orderWorkers =
            workersResult.value.data ||
            [];

    }
    else{

        orderWorkers = [];

        console.warn(
            "Auftragsarbeiter konnten nicht geladen werden:",
            workersResult
        );

    }


    /* =====================================================
       KASSENABGLEICH
    ===================================================== */

    if(
        cashResult.status ===
        "fulfilled" &&
        !cashResult.value.error
    ){

        cashChecks =
            cashResult.value.data ||
            [];

    }
    else{

        cashChecks = [];

        console.warn(
            "Kassenabgleiche konnten nicht geladen werden:",
            cashResult
        );

    }


    /* =====================================================
       PROTOKOLL
    ===================================================== */

    if(
        logsResult.status ===
        "fulfilled" &&
        !logsResult.value.error
    ){

        activityLogs =
            logsResult.value.data ||
            [];

    }
    else{

        activityLogs = [];

        console.warn(
            "Protokoll konnte nicht geladen werden:",
            logsResult
        );

    }


    /*
       Sparziel separat laden.
       Fehler beim Sparziel blockiert
       ebenfalls nicht die restliche Buchhaltung.
    */

    try{

        await loadSavingsGoal();

    }
    catch(error){

        console.warn(
            "Sparziel konnte nicht geladen werden:",
            error
        );

        savingsGoalValue = 0;

    }


    console.log(
        "Buchhaltungsdaten geladen:",
        {
            buchungen:
                bookings.length,

            sparkonto:
                savingsTransactions.length,

            mitarbeiter:
                employees.length,

            auftragsabrechnungen:
                orderSettlements.length,

            auftragsarbeiter:
                orderWorkers.length,

            kassenabgleiche:
                cashChecks.length,

            protokoll:
                activityLogs.length,

            sparziel:
                savingsGoalValue
        }
    );


    return true;

}


/* =========================================================
   CLANSTAND
========================================================= */

function getCurrentClanBalance(){

    return bookings.reduce(
        (
            total,
            booking
        ) => {

            const amount =
                numberValue(
                    booking.amount ??
                    booking.betrag
                );


            const type =
                String(
                    booking.type ??
                    booking.typ ??
                    booking.art ??
                    ""
                )
                .trim()
                .toLowerCase();


            if(
                type ===
                "einzahlung"
            ){

                return (
                    total +
                    amount
                );

            }


            if(
                type ===
                "auszahlung"
            ){

                return (
                    total -
                    amount
                );

            }


            return total;

        },
        0
    );

}


/* =========================================================
   SPARKONTO-BESTAND
========================================================= */

function getSavingsBalance(){

    return savingsTransactions.reduce(
        (
            total,
            transaction
        ) => {

            const amount =
                numberValue(
                    transaction.amount ??
                    transaction.betrag
                );


            const type =
                String(
                    transaction.type ??
                    transaction.typ ??
                    transaction.art ??
                    ""
                )
                .trim()
                .toLowerCase();


            if(
                type ===
                "einzahlung"
            ){

                return (
                    total +
                    amount
                );

            }


            if(
                type ===
                "auszahlung"
            ){

                return (
                    total -
                    amount
                );

            }


            return total;

        },
        0
    );

}


/* =========================================================
   GESAMTVERMÖGEN
========================================================= */

function getTotalAssets(){

    return (
        getCurrentClanBalance() +
        getSavingsBalance()
    );

}


/* =========================================================
   ARBEITER EINES AUFTRAGS
========================================================= */

function getWorkersForOrder(order){

    if(!order){

        return [];

    }


    const orderId =
        order.id;


    const orderNumber =
        String(
            order.orderNumber ??
            order.order_number ??
            order.auftragsnummer ??
            ""
        )
        .trim();


    return orderWorkers.filter(
        worker => {

            const workerOrderId =
                worker.order_id ??
                worker.orderId ??
                null;


            const workerOrderNumber =
                String(
                    worker.order_number ??
                    worker.orderNumber ??
                    worker.auftragsnummer ??
                    ""
                )
                .trim();


            if(
                orderId &&
                workerOrderId &&
                String(
                    workerOrderId
                ) ===
                String(
                    orderId
                )
            ){

                return true;

            }


            if(
                orderNumber &&
                workerOrderNumber &&
                workerOrderNumber ===
                orderNumber
            ){

                return true;

            }


            return false;

        }
    );

}


/* =========================================================
   OFFENE AUFTRAGSBETRÄGE
========================================================= */

function getOpenOrderAmount(){

    return orderSettlements.reduce(
        (
            total,
            order
        ) => {

            const status =
                String(
                    order.status ||
                    ""
                )
                .trim()
                .toLowerCase();


            if(
                status ===
                "storniert"
            ){

                return total;

            }


            if(
                status ===
                "bezahlt"
            ){

                return total;

            }


            const totalAmount =
                numberValue(
                    order.total ??
                    order.gesamtbetrag ??
                    order.betrag ??
                    order.amount
                );


            const clanAmount =
                numberValue(
                    order.clanAmount ??
                    order.clan_amount ??
                    order.betrag_an_clan
                );


            const workersForOrder =
                getWorkersForOrder(
                    order
                );


            const workerTotal =
                workersForOrder.reduce(
                    (
                        sum,
                        worker
                    ) => {

                        return (
                            sum +
                            numberValue(
                                worker.salary ??
                                worker.gehalt
                            )
                        );

                    },
                    0
                );


            const distributed =
                clanAmount +
                workerTotal;


            const remaining =
                totalAmount -
                distributed;


            return (
                total +
                Math.max(
                    0,
                    remaining
                )
            );

        },
        0
    );

}


/* =========================================================
   FINANZÜBERSICHT BERECHNEN
========================================================= */

function calculateFinancialOverview(){

    const totalDeposits =
        bookings.reduce(
            (
                total,
                booking
            ) => {

                const type =
                    String(
                        booking.type ??
                        booking.typ ??
                        booking.art ??
                        ""
                    )
                    .trim()
                    .toLowerCase();


                if(
                    type !==
                    "einzahlung"
                ){

                    return total;

                }


                return (
                    total +
                    numberValue(
                        booking.amount ??
                        booking.betrag
                    )
                );

            },
            0
        );


    const totalWithdrawals =
        bookings.reduce(
            (
                total,
                booking
            ) => {

                const type =
                    String(
                        booking.type ??
                        booking.typ ??
                        booking.art ??
                        ""
                    )
                    .trim()
                    .toLowerCase();


                if(
                    type !==
                    "auszahlung"
                ){

                    return total;

                }


                return (
                    total +
                    numberValue(
                        booking.amount ??
                        booking.betrag
                    )
                );

            },
            0
        );


    const totalWages =
        orderWorkers.reduce(
            (
                total,
                worker
            ) => {

                return (
                    total +
                    numberValue(
                        worker.salary ??
                        worker.gehalt
                    )
                );

            },
            0
        );


    const totalClanExpenses =
        bookings.reduce(
            (
                total,
                booking
            ) => {

                const category =
                    String(
                        booking.category ??
                        booking.kategorie ??
                        ""
                    )
                    .trim()
                    .toLowerCase();


                const type =
                    String(
                        booking.type ??
                        booking.typ ??
                        booking.art ??
                        ""
                    )
                    .trim()
                    .toLowerCase();


                if(
                    type !==
                    "auszahlung"
                ){

                    return total;

                }


                if(
                    category ===
                    "clan-ausgabe" ||
                    category ===
                    "clanausgabe" ||
                    category ===
                    "ausgabe"
                ){

                    return (
                        total +
                        numberValue(
                            booking.amount ??
                            booking.betrag
                        )
                    );

                }


                return total;

            },
            0
        );


    /*
       Historischer Umsatz kommt ausschließlich
       aus den manuellen Auftragsabrechnungen.
    */

    const historicalRevenue =
        orderSettlements.reduce(
            (
                total,
                order
            ) => {

                const status =
                    String(
                        order.status ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                if(
                    status ===
                    "storniert"
                ){

                    return total;

                }


                return (
                    total +
                    numberValue(
                        order.total ??
                        order.gesamtbetrag ??
                        order.betrag ??
                        order.amount
                    )
                );

            },
            0
        );


    const currentClanBalance =
        totalDeposits -
        totalWithdrawals;


    const savingsBalance =
        getSavingsBalance();


    const totalAssets =
        currentClanBalance +
        savingsBalance;


    const openAmount =
        getOpenOrderAmount();


    return {

        currentClanBalance,

        historicalRevenue,

        totalDeposits,

        totalWithdrawals,

        totalWages,

        totalClanExpenses,

        savingsBalance,

        totalAssets,

        openAmount,

        bookingCount:
            bookings.length,

        orderCount:
            orderSettlements.length

    };

}


/* =========================================================
   ÜBERSICHT ANZEIGEN
========================================================= */

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
        "totalAssets",
        money(
            overview.totalAssets
        )
    );


    setText(
        "openAmount",
        money(
            overview.openAmount
        )
    );


    setText(
        "totalBookings",
        overview.bookingCount
    );


    setText(
        "orderCount",
        overview.orderCount
    );


    setText(
        "savingsGoalDisplay",
        money(
            savingsGoalValue
        )
    );


    updateSavingsGoalProgress();

}


/* =========================================================
   SPARZIEL-FORTSCHRITT
========================================================= */

function updateSavingsGoalProgress(){

    const balance =
        getSavingsBalance();


    const goal =
        numberValue(
            savingsGoalValue
        );


    const progressElement =
        getElement(
            "savingsGoalProgress"
        );


    const percentElement =
        getElement(
            "savingsGoalPercent"
        );


    const remainingElement =
        getElement(
            "savingsGoalRemaining"
        );


    if(goal <= 0){

        if(progressElement){

            progressElement.style.width =
                "0%";

        }


        setText(
            "savingsGoalPercent",
            "0 %"
        );


        setText(
            "savingsGoalRemaining",
            "Kein Sparziel gesetzt."
        );


        return;

    }


    const percent =
        Math.min(
            100,
            Math.max(
                0,
                (
                    balance /
                    goal
                ) * 100
            )
        );


    if(progressElement){

        progressElement.style.width =
            percent + "%";

    }


    if(percentElement){

        percentElement.textContent =
            percent.toFixed(1) +
            " %";

    }


    const remaining =
        Math.max(
            0,
            goal -
            balance
        );


    if(remainingElement){

        remainingElement.textContent =
            remaining > 0
                ? "Noch " +
                  money(
                      remaining
                  )
                : "Sparziel erreicht";

    }

}

/* =========================================================
   TEIL 3 / 12
   BUCHUNGEN
========================================================= */


/* =========================================================
   BUCHUNGS-MODAL ÖFFNEN
========================================================= */

window.openBookingModal =
function(){

    if(!canCreateDeposit()){

        alert(
            "Du hast keine Berechtigung für Buchungen."
        );

        return;

    }


    /*
       Sicherstellen, dass der persönliche
       Buchhaltungsname vorhanden ist.
    */

    try{

        ensureBookkeepingName();

    }
    catch(error){

        console.warn(
            "Buchungsname nicht vorhanden:",
            error
        );

        return;

    }


    clearBookingForm();


    const number =
        getElement(
            "bookingNumber"
        );


    if(number){

        number.value =
            "BK-" +
            String(
                bookings.length + 1
            ).padStart(
                4,
                "0"
            );

    }


    const date =
        getElement(
            "bookingDate"
        );


    if(date){

        date.value =
            nowLocal();

    }


    /*
       Der Name wird automatisch gesetzt.
       Das Feld wird anschließend gesperrt.
    */

    setBookingCreatedByField();


    const type =
        getElement(
            "bookingType"
        );


    /*
       Mitarbeiter dürfen ausschließlich
       Einzahlung auswählen.
    */

    if(type){

        if(isMitarbeiter()){

            type.value =
                "Einzahlung";

            type.disabled =
                true;

        }
        else{

            type.disabled =
                false;

        }

    }


    openModal(
        "bookingModal"
    );

};


/* =========================================================
   NAME IN BUCHUNGSFORMULAR EINSETZEN
========================================================= */

function setBookingCreatedByField(){

    const createdBy =
        getElement(
            "bookingCreatedBy"
        );


    const name =
        getBookkeepingName();


    if(!createdBy){

        return;

    }


    createdBy.value =
        name;


    /*
       Beide Eigenschaften setzen.

       readonly:
       Benutzer kann den Text nicht ändern.

       disabled:
       Benutzer kann das Feld nicht
       manipulieren oder überschreiben.

       Beim Speichern wird der Name
       trotzdem NICHT aus dem Feld gelesen.
    */

    createdBy.readOnly =
        true;

    createdBy.disabled =
        true;

    createdBy.setAttribute(
        "readonly",
        "readonly"
    );

    createdBy.setAttribute(
        "aria-readonly",
        "true"
    );

}


/* =========================================================
   BUCHUNGS-MODAL SCHLIESSEN
========================================================= */

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


    const createdBy =
        getElement(
            "bookingCreatedBy"
        );


    if(createdBy){

        /*
           Feld bleibt für die nächste
           Buchung gesperrt.
        */

        createdBy.readOnly =
            true;

        createdBy.disabled =
            true;

    }


    closeModal(
        "bookingModal"
    );

};


/* =========================================================
   BUCHUNGSFORMULAR ZURÜCKSETZEN
========================================================= */

function clearBookingForm(){

    [

        "bookingNumber",
        "bookingAmount",
        "bookingFrom",
        "bookingTo",
        "bookingPurpose",
        "bookingOrderNumber",
        "bookingNote"

    ]
    .forEach(
        id => {

            const element =
                getElement(id);


            if(element){

                element.value =
                    "";

            }

        }
    );


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


    const category =
        getElement(
            "bookingCategory"
        );


    if(category){

        category.value =
            "Auftrag";

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


    const date =
        getElement(
            "bookingDate"
        );


    if(date){

        date.value =
            nowLocal();

    }


    /*
       Persönlichen Buchhaltungsnamen
       wieder einsetzen.
    */

    setBookingCreatedByField();

}


/* =========================================================
   BUCHUNG SPEICHERN
========================================================= */

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


    /*
       Der Buchhaltungsname MUSS vorhanden sein.

       Niemand kann beim Speichern einfach
       einen anderen Namen angeben.
    */

    let createdBy =
        getBookkeepingName();


    if(!createdBy){

        try{

            createdBy =
                ensureBookkeepingName();

        }
        catch(error){

            console.warn(
                "Kein Buchhaltungsname:",
                error
            );

            return;

        }

    }


    if(!createdBy){

        alert(
            "Bitte zuerst deinen Namen festlegen."
        );

        return;

    }


    /*
       Mitarbeiter dürfen ausschließlich
       Einzahlung erstellen.
    */

    let type =
        getValue(
            "bookingType"
        ) ||
        "Einzahlung";


    if(isMitarbeiter()){

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


    /*
       Auszahlung nur für Leitung
       oder Stadtleitung.
    */

    if(
        type === "Auszahlung" &&
        !canManageBookkeeping()
    ){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auszahlungen erstellen."
        );

        return;

    }


    /*
       Keine Auszahlung über dem
       aktuellen Clanstand.
    */

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
        nowLocal();


    /*
       WICHTIG:

       Der Name kommt NICHT aus
       bookingCreatedBy.

       Selbst wenn jemand das HTML
       manipulieren würde, wird hier
       ausschließlich der gespeicherte
       bookkeepingName verwendet.
    */

    createdBy =
        getBookkeepingName();


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

        /*
           Supabase Benutzer-ID.
        */

        erstellt_von:
            currentUser?.id ||
            null,

        /*
           Der selbst gewählte und
           lokal gespeicherte Buchhaltungsname.
        */

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


        if(!data){

            throw new Error(
                "Die Buchung wurde nicht gespeichert."
            );

        }


        /*
           Neue Buchung sofort lokal übernehmen.
        */

        bookings.unshift(
            data
        );


        /*
           Protokoll schreiben.

           Wenn das Protokoll fehlschlägt,
           bleibt die Buchung trotzdem bestehen.
        */

        try{

            await writeActivityLog(
                "Buchung",
                type +
                " · " +
                bookingNumber +
                " · " +
                money(amount),
                data
            );

        }
        catch(logError){

            console.warn(
                "Buchung gespeichert, aber Protokoll konnte nicht geschrieben werden:",
                logError
            );

        }


        /*
           Anzeige sofort aktualisieren.
        */

        renderBookings();

        updateBookingSummary(
            bookings
        );

        renderOverview();


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


        showDatabaseError(
            error
        );

    }

};


/* =========================================================
   BUCHUNGEN RENDERN
========================================================= */

function renderBookings(){

    const body =
        getElement(
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

        updateBookingSummary(
            []
        );

        return;

    }


    renderBookingList(
        bookings
    );

}


/* =========================================================
   BUCHUNGSLISTE RENDERN
========================================================= */

function renderBookingList(
    list
){

    const body =
        getElement(
            "bookingTableBody"
        );


    if(!body){

        return;

    }


    if(
        !Array.isArray(list) ||
        list.length === 0
    ){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="12">
                    Keine passenden Buchungen gefunden.
                </td>
            </tr>
        `;

        updateBookingSummary(
            []
        );

        return;

    }


    body.innerHTML =
        list
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
                                    booking.created_by_name ||
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


    updateBookingSummary(
        list
    );

}


/* =========================================================
   BUCHUNGSÜBERSICHT
========================================================= */

function updateBookingSummary(
    list = bookings
){

    let income =
        0;

    let expenses =
        0;


    list.forEach(
        booking => {

            const status =
                String(
                    booking.status ||
                    ""
                )
                .trim()
                .toLowerCase();


            if(
                status ===
                "storniert"
            ){

                return;

            }


            const amount =
                numberValue(
                    booking.betrag
                );


            const type =
                String(
                    booking.art ||
                    ""
                )
                .trim()
                .toLowerCase();


            if(
                type ===
                "einzahlung"
            ){

                income +=
                    amount;

            }
            else if(
                type ===
                "auszahlung"
            ){

                expenses +=
                    amount;

            }

        }
    );


    setText(
        "bookingIncome",
        money(
            income
        )
    );


    setText(
        "bookingExpense",
        money(
            expenses
        )
    );


    setText(
        "bookingNet",
        money(
            income -
            expenses
        )
    );


    setText(
        "bookingCount",
        list.length
    );

}


/* =========================================================
   BUCHUNGEN FILTERN
========================================================= */

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

                const searchableText = [

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


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const matchesType =
                    !type ||
                    booking.art ===
                    type;


                const matchesCategory =
                    !category ||
                    booking.kategorie ===
                    category;


                return (
                    matchesSearch &&
                    matchesType &&
                    matchesCategory
                );

            }
        );


    renderBookingList(
        filtered
    );

};


/* =========================================================
   BUCHUNGSFILTER ZURÜCKSETZEN
========================================================= */

window.resetBookingFilters =
function(){

    const search =
        getElement(
            "bookingSearch"
        );


    const type =
        getElement(
            "bookingFilterType"
        );


    const category =
        getElement(
            "bookingFilterCategory"
        );


    if(search){

        search.value =
            "";

    }


    if(type){

        type.value =
            "";

    }


    if(category){

        category.value =
            "";

    }


    renderBookings();

};


/* =========================================================
   TEIL 4 VON 12
   BUCHHALTUNG – AUFTRAGSABRECHNUNGEN
========================================================= */


/* =========================================================
   AUFTRAGSABRECHNUNG ÖFFNEN
========================================================= */

window.openOrderModal = function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen erstellen."
        );

        return;

    }


    if(!ensureBookkeepingName()){

        return;

    }


    clearOrderForm();


    const date =
        getElement("orderDate");

    if(date){

        date.value =
            nowLocal();

    }


    setOrderCreatedByField();


    currentWorkers = [];

    renderCurrentWorkers();

    updateWorkerTotals();


    openModal(
        "orderSettlementModal"
    );

};


/* =========================================================
   NAME DES ERSTELLERS SETZEN
   Nutzt NICHT employees.name.
========================================================= */

function setOrderCreatedByField(){

    const field =
        getElement("orderCreatedBy");

    if(!field){

        return;

    }


    const name =
        getBookkeepingName();


    field.value =
        name || "";


    field.readOnly = true;

    field.setAttribute(
        "readonly",
        "readonly"
    );

    field.disabled = true;

}


/* =========================================================
   AUFTRAGSMODAL SCHLIESSEN
========================================================= */

window.closeOrderModal = function(){

    closeModal(
        "orderSettlementModal"
    );

};


/* =========================================================
   AUFTRAGSFORMULAR LEEREN
========================================================= */

function clearOrderForm(){

    [
        "orderNumber",
        "orderTotal",
        "orderClanAmount",
        "orderNote"
    ].forEach(id => {

        const element =
            getElement(id);

        if(element){

            element.value =
                "";

        }

    });


    const date =
        getElement("orderDate");

    if(date){

        date.value =
            nowLocal();

    }


    const status =
        getElement("orderStatus");

    if(status){

        status.value =
            "Offen";

    }


    setOrderCreatedByField();


    currentWorkers = [];

    renderCurrentWorkers();

    updateWorkerTotals();

}


/* =========================================================
   ARBEITER HINZUFÜGEN
========================================================= */

window.addOrderWorker = function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Arbeiter hinzufügen."
        );

        return;

    }


    const name =
        prompt(
            "Name des Arbeiters:"
        );


    if(name === null){

        return;

    }


    const cleanName =
        name.trim();


    if(!cleanName){

        alert(
            "Bitte einen Namen eingeben."
        );

        return;

    }


    const salaryInput =
        prompt(
            "Gehalt des Arbeiters in $:"
        );


    if(salaryInput === null){

        return;

    }


    const salary =
        numberValue(
            salaryInput
        );


    if(salary < 0){

        alert(
            "Das Gehalt darf nicht negativ sein."
        );

        return;

    }


    currentWorkers.push({

        name:
            cleanName,

        salary:
            salary,

        note:
            ""

    });


    renderCurrentWorkers();

    updateWorkerTotals();

};


/* =========================================================
   ARBEITER ENTFERNEN
========================================================= */

window.removeOrderWorker = function(index){

    if(!canManageBookkeeping()){

        return;

    }


    const workerIndex =
        Number(index);


    if(
        !Number.isInteger(workerIndex) ||
        workerIndex < 0 ||
        workerIndex >= currentWorkers.length
    ){

        return;

    }


    currentWorkers.splice(
        workerIndex,
        1
    );


    renderCurrentWorkers();

    updateWorkerTotals();

};


/* =========================================================
   ARBEITERLISTE RENDERN
========================================================= */

function renderCurrentWorkers(){

    const body =
        getElement(
            "currentWorkersBody"
        );


    if(!body){

        return;

    }


    if(
        !Array.isArray(
            currentWorkers
        ) ||
        currentWorkers.length === 0
    ){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">
                    Noch keine Arbeiter hinzugefügt.
                </td>
            </tr>
        `;

        updateWorkerTotals();

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
                                "—"
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
                                class="small-button danger"
                                onclick="removeOrderWorker(${index})"
                            >
                                Entfernen
                            </button>

                        </td>

                    </tr>

                `
            )
            .join("");

}


/* =========================================================
   ARBEITERGEHÄLTER BERECHNEN
========================================================= */

function calculateWorkerSalaryTotal(){

    if(
        !Array.isArray(
            currentWorkers
        )
    ){

        return 0;

    }


    return currentWorkers.reduce(
        (
            total,
            worker
        ) => {

            return total +
                numberValue(
                    worker?.salary
                );

        },
        0
    );

}


/* =========================================================
   AUFTRAGSSUMMEN AKTUALISIEREN
========================================================= */

function updateWorkerTotals(){

    const salaryTotal =
        calculateWorkerSalaryTotal();


    setText(
        "orderWorkerTotal",
        money(
            salaryTotal
        )
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


    const remaining =
        total -
        clan -
        salaryTotal;


    setText(
        "orderRemaining",
        money(
            remaining
        )
    );

}


/* =========================================================
   GESAMTBETRAG / CLANBETRAG LIVE AKTUALISIEREN
========================================================= */

window.updateOrderTotals = function(){

    updateWorkerTotals();

};


/* =========================================================
   AUFTRAGSABRECHNUNG SPEICHERN
========================================================= */

window.saveOrderSettlement =
async function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen speichern."
        );

        return;

    }


    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    const createdBy =
        getBookkeepingName();


    if(!createdBy){

        alert(
            "Bitte zuerst deinen Namen für die Buchhaltung festlegen."
        );

        if(
            typeof ensureBookkeepingName ===
            "function"
        ){

            ensureBookkeepingName();

        }

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


    const clan =
        numberValue(
            getValue(
                "orderClanAmount"
            )
        );


    const salaries =
        calculateWorkerSalaryTotal();


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


    const remaining =
        total -
        clan -
        salaries;


    if(remaining < 0){

        alert(
            "Die Verteilung von Clanbetrag und Gehältern überschreitet den Gesamtbetrag."
        );

        return;

    }


    const date =
        getValue(
            "orderDate"
        ) ||
        nowLocal();


    const status =
        getValue(
            "orderStatus"
        ) ||
        "Offen";


    const note =
        getValue(
            "orderNote"
        ) ||
        null;


    const payload = {

        auftragsnummer:
            orderNumber,

        gesamtbetrag:
            total,

        clanbetrag:
            clan,

        gesamt_gehaelter:
            salaries,

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
            note

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
                "Die Auftragsabrechnung wurde nicht gespeichert."
            );

        }


        /*
           Arbeiter werden erst gespeichert,
           wenn die Hauptabrechnung erfolgreich
           erstellt wurde.
        */

        if(
            Array.isArray(currentWorkers) &&
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

                console.error(
                    "Arbeiter konnten nicht gespeichert werden:",
                    workerError
                );


                alert(
                    "Die Auftragsabrechnung wurde gespeichert, aber die Arbeiter konnten nicht vollständig gespeichert werden.\n\n" +
                    workerError.message
                );

            }

        }


        /*
           Danach komplette Buchhaltungsdaten
           neu aus Supabase laden.
        */

        await loadBookkeepingData();


        renderOrderSettlements();

        renderEmployees();

        renderOverview();


        if(
            typeof updateMonthly ===
            "function"
        ){

            updateMonthly();

        }


        if(
            typeof runFinancialControl ===
            "function"
        ){

            runFinancialControl();

        }


        if(
            typeof writeActivityLog ===
            "function"
        ){

            try{

                await writeActivityLog(
                    "Auftragsabrechnung",
                    "Auftrag " +
                    orderNumber +
                    " · " +
                    money(total)
                );

            }
            catch(logError){

                console.warn(
                    "Aktivitätsprotokoll konnte nicht geschrieben werden:",
                    logError
                );

            }

        }


        currentWorkers = [];

        clearOrderForm();

        closeOrderModal();


        alert(
            "Auftragsabrechnung wurde erfolgreich gespeichert."
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


/* =========================================================
   AUFTRAGSABRECHNUNGEN RENDERN
========================================================= */

function renderOrderSettlements(){

    const body =
        getElement(
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

                    /*
                       WICHTIG:
                       Nicht "workers" verwenden.
                       Die globale Liste heißt
                       "orderWorkers".
                    */

                    const workerList =
                        Array.isArray(
                            orderWorkers
                        )
                            ? orderWorkers.filter(
                                worker =>
                                    String(
                                        worker.auftragsabrechnung_id
                                    ) ===
                                    String(
                                        order.id
                                    )
                            )
                            : [];


                    const workerTotal =
                        workerList.reduce(
                            (
                                sum,
                                worker
                            ) => {

                                return sum +
                                    numberValue(
                                        worker.gehalt
                                    );

                            },
                            0
                        );


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
                                    workerTotal
                                )}
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

                            <td>
                                ${escapeHtml(
                                    order.id ||
                                    "—"
                                )}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   TEIL 5 VON 12
   BUCHHALTUNG – SPARKONTO
========================================================= */


/* =========================================================
   SPARKONTO – TRANSAKTIONEN
========================================================= */

function getSavingsTransactions(){

    return Array.isArray(
        savingsTransactions
    )
        ? savingsTransactions
        : [];

}


/* =========================================================
   SPARKONTO – AKTUELLER STAND
========================================================= */

function getSavingsBalance(){

    let balance = 0;


    getSavingsTransactions()
        .forEach(
            entry => {

                const type =
                    String(
                        entry.art ||
                        entry.typ ||
                        entry.type ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                const amount =
                    Number(
                        entry.betrag ||
                        entry.amount ||
                        0
                    ) || 0;


                if(
                    type === "einzahlung" ||
                    type === "deposit"
                ){

                    balance += amount;

                }


                if(
                    type === "auszahlung" ||
                    type === "withdrawal"
                ){

                    balance -= amount;

                }

            }
        );


    return balance;

}


/* =========================================================
   SPARKONTO – GESAMTE EINZAHLUNGEN
========================================================= */

function getSavingsDeposits(){

    return getSavingsTransactions()
        .filter(
            entry => {

                const type =
                    String(
                        entry.art ||
                        entry.typ ||
                        entry.type ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    type === "einzahlung" ||
                    type === "deposit"
                );

            }
        )
        .reduce(
            (
                sum,
                entry
            ) => {

                return sum +
                    (
                        Number(
                            entry.betrag ||
                            entry.amount ||
                            0
                        ) || 0
                    );

            },
            0
        );

}


/* =========================================================
   SPARKONTO – GESAMTE AUSZAHLUNGEN
========================================================= */

function getSavingsWithdrawals(){

    return getSavingsTransactions()
        .filter(
            entry => {

                const type =
                    String(
                        entry.art ||
                        entry.typ ||
                        entry.type ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    type === "auszahlung" ||
                    type === "withdrawal"
                );

            }
        )
        .reduce(
            (
                sum,
                entry
            ) => {

                return sum +
                    (
                        Number(
                            entry.betrag ||
                            entry.amount ||
                            0
                        ) || 0
                    );

            },
            0
        );

}


/* =========================================================
   SPARKONTO – RENDERN
========================================================= */

function renderSavings(){

    const transactions =
        getSavingsTransactions();


    const balance =
        getSavingsBalance();


    const deposits =
        getSavingsDeposits();


    const withdrawals =
        getSavingsWithdrawals();


    setText(
        "savingsBalance",
        money(balance)
    );


    setText(
        "savingsDeposits",
        money(deposits)
    );


    setText(
        "savingsWithdrawals",
        money(withdrawals)
    );


    const goalElement =
        getElement(
            "savingsGoal"
        );


    const progressElement =
        getElement(
            "savingsProgress"
        );


    const progressTextElement =
        getElement(
            "savingsProgressText"
        );


    const goal =
        goalElement
            ? Number(
                String(
                    goalElement.value || ""
                )
                .replace(",", ".")
            ) || 0
            : 0;


    const percent =
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


    if(progressElement){

        progressElement.style.width =
            `${percent}%`;

    }


    if(progressTextElement){

        progressTextElement.textContent =
            goal > 0
                ? `${percent.toFixed(1)} %`
                : "0 %";

    }


    const tbody =
        getElement(
            "savingsHistory"
        );


    if(!tbody){

        return;

    }


    if(!transactions.length){

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-state"
                >
                    Noch keine Sparkonto-Buchungen vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    const sorted =
        [...transactions]
            .sort(
                (a,b) => {

                    const dateA =
                        new Date(
                            a.created_at ||
                            a.datum ||
                            a.createdAt ||
                            0
                        ).getTime();


                    const dateB =
                        new Date(
                            b.created_at ||
                            b.datum ||
                            b.createdAt ||
                            0
                        ).getTime();


                    return dateB - dateA;

                }
            );


    tbody.innerHTML =
        sorted
            .map(
                entry => {

                    const type =
                        String(
                            entry.art ||
                            entry.typ ||
                            entry.type ||
                            ""
                        )
                        .trim();


                    const amount =
                        Number(
                            entry.betrag ||
                            entry.amount ||
                            0
                        ) || 0;


                    const purpose =
                        entry.zweck ||
                        entry.verwendungszweck ||
                        entry.notiz ||
                        "—";


                    const createdBy =
                        entry.erstellt_von_name ||
                        entry.created_by_name ||
                        entry.created_by ||
                        entry.erstellt_von ||
                        "—";


                    const date =
                        entry.created_at ||
                        entry.datum ||
                        entry.createdAt;


                    const normalizedType =
                        type.toLowerCase();


                    const isDeposit =
                        normalizedType ===
                            "einzahlung" ||
                        normalizedType ===
                            "deposit";


                    const isCancelled =
                        String(
                            entry.status ||
                            ""
                        )
                        .toLowerCase() ===
                        "storniert";


                    return `

                        <tr
                            ${
                                isCancelled
                                    ? 'class="cancelled-row"'
                                    : ""
                            }
                        >

                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        date
                                    )
                                )}
                            </td>


                            <td>

                                <span
                                    class="status-badge ${
                                        isDeposit
                                            ? "status-paid"
                                            : "status-open"
                                    }"
                                >
                                    ${escapeHtml(
                                        type ||
                                        "—"
                                    )}
                                </span>

                            </td>


                            <td
                                class="${
                                    isDeposit
                                        ? "amount-positive"
                                        : "amount-negative"
                                }"
                            >
                                ${
                                    isDeposit
                                        ? "+"
                                        : "-"
                                }${money(amount)}
                            </td>


                            <td>
                                ${escapeHtml(
                                    purpose
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    entry.buchungsnummer ||
                                    entry.booking_number ||
                                    "—"
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    createdBy
                                )}
                            </td>


                            <td>

                                ${
                                    isLeitung() &&
                                    !isCancelled
                                        ? `

                                            <button
                                                type="button"
                                                class="small-button danger"
                                                onclick="deleteSavingsEntry('${escapeHtml(
                                                    entry.id ||
                                                    ""
                                                )}')"
                                            >
                                                Storno
                                            </button>

                                          `
                                        : (
                                            isCancelled
                                                ? "Storniert"
                                                : "—"
                                        )
                                }

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   SPARKONTO – MODAL ÖFFNEN
========================================================= */

window.openSavingsModal =
function(
    type = "Einzahlung"
){

    if(!canManageBookkeeping()){

        showToast(
            "Keine Berechtigung für das Sparkonto.",
            "error"
        );

        return;

    }


    const modal =
        getElement(
            "savingsModal"
        );


    if(!modal){

        return;

    }


    const typeElement =
        getElement(
            "savingsType"
        );


    const amountElement =
        getElement(
            "savingsAmount"
        );


    const purposeElement =
        getElement(
            "savingsPurpose"
        );


    if(typeElement){

        typeElement.value =
            type;

    }


    if(amountElement){

        amountElement.value =
            "";

    }


    if(purposeElement){

        purposeElement.value =
            "";

    }


    modal.classList.add(
        "active"
    );

};


/* =========================================================
   SPARKONTO – MODAL SCHLIESSEN
========================================================= */

window.closeSavingsModal =
function(){

    const modal =
        getElement(
            "savingsModal"
        );


    if(modal){

        modal.classList.remove(
            "active"
        );

    }

};


/* =========================================================
   SPARKONTO – BUCHUNG SPEICHERN
========================================================= */

window.saveSavingsEntry =
async function(){

    if(!canManageBookkeeping()){

        showToast(
            "Keine Berechtigung für Sparkonto-Buchungen.",
            "error"
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


    const purpose =
        getValue(
            "savingsPurpose"
        )
        .trim();


    if(amount <= 0){

        showToast(
            "Bitte einen gültigen Betrag eingeben.",
            "error"
        );

        return;

    }


    if(!purpose){

        showToast(
            "Bitte einen Zweck angeben.",
            "error"
        );

        return;

    }


    const currentBalance =
        getSavingsBalance();


    const normalizedType =
        String(
            type
        )
        .trim()
        .toLowerCase();


    const isWithdrawal =
        normalizedType ===
        "auszahlung" ||
        normalizedType ===
        "withdrawal";


    if(
        isWithdrawal &&
        amount > currentBalance
    ){

        showToast(
            "Die Auszahlung übersteigt das vorhandene Sparkonto-Guthaben.",
            "error"
        );

        return;

    }


    const bookingNumber =
        typeof generateBookingNumber ===
        "function"
            ? generateBookingNumber("SP")
            : (
                "SP-" +
                Date.now()
            );


    const bookkeepingName =
        getBookkeepingName();


    if(!bookkeepingName){

        alert(
            "Bitte zuerst deinen Namen für die Buchhaltung festlegen."
        );

        return;

    }


    const payload = {

        buchungsnummer:
            bookingNumber,

        art:
            type,

        betrag:
            amount,

        zweck:
            purpose,

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            bookkeepingName,

        user_id:
            currentUser?.id ||
            null,

        created_at:
            new Date().toISOString()

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

            savingsTransactions.push(
                data
            );

        }


        if(
            typeof writeActivityLog ===
            "function"
        ){

            try{

                await writeActivityLog(
                    "Sparkonto",
                    "Erstellt",
                    bookingNumber,
                    {
                        art:
                            type,

                        betrag:
                            amount,

                        zweck:
                            purpose
                    }
                );

            }
            catch(logError){

                console.warn(
                    "Sparkonto-Buchung gespeichert, aber Protokoll konnte nicht geschrieben werden:",
                    logError
                );

            }

        }


        closeSavingsModal();


        renderSavings();

        renderOverview();


        if(
            typeof runFinancialControl ===
            "function"
        ){

            runFinancialControl();

        }


        showToast(
            "Sparkonto-Buchung gespeichert.",
            "success"
        );

    }
    catch(error){

        console.error(
            "Sparkonto-Buchung konnte nicht gespeichert werden:",
            error
        );


        showDatabaseError(
            error
        );

    }

};


/* =========================================================
   SPARKONTO – STORNO
========================================================= */

window.deleteSavingsEntry =
async function(id){

    if(!canManageBookkeeping()){

        showToast(
            "Keine Berechtigung für diese Aktion.",
            "error"
        );

        return;

    }


    if(!id){

        return;

    }


    const entry =
        getSavingsTransactions()
            .find(
                item =>
                    String(item.id) ===
                    String(id)
            );


    if(!entry){

        showToast(
            "Sparkonto-Buchung nicht gefunden.",
            "error"
        );

        return;

    }


    if(
        String(
            entry.status ||
            ""
        )
        .toLowerCase() ===
        "storniert"
    ){

        showToast(
            "Diese Buchung ist bereits storniert.",
            "error"
        );

        return;

    }


    const confirmed =
        confirm(
            "Diese Sparkonto-Buchung wirklich stornieren?"
        );


    if(!confirmed){

        return;

    }


    /*
       Keine stille Löschung.

       Nur Spalten verwenden, die in der
       vorhandenen Datenstruktur bereits
       vorhanden sind.
    */

    const updatePayload = {};


    if(
        "status" in entry
    ){

        updatePayload.status =
            "Storniert";

    }


    if(
        "storniert" in entry
    ){

        updatePayload.storniert =
            true;

    }


    if(
        "storniert_von" in entry
    ){

        updatePayload.storniert_von =
            currentUser?.id ||
            null;

    }


    if(
        "storniert_am" in entry
    ){

        updatePayload.storniert_am =
            new Date().toISOString();

    }


    if(
        "notiz" in entry
    ){

        updatePayload.notiz =
            `${
                entry.notiz ||
                ""
            } | Storniert durch ${
                getBookkeepingName() ||
                "Unbekannt"
            }`;

    }


    if(
        !Object.keys(
            updatePayload
        ).length
    ){

        showToast(
            "Die Sparkonto-Tabelle besitzt keine passende Storno-Spalte.",
            "error"
        );

        return;

    }


    try{

        const {
            error
        } =
            await buchhaltungDB
                .from(
                    TABLE_SAVINGS
                )
                .update(
                    updatePayload
                )
                .eq(
                    "id",
                    id
                );


        if(error){

            throw error;

        }


        if(
            typeof writeActivityLog ===
            "function"
        ){

            try{

                await writeActivityLog(
                    "Sparkonto",
                    "Storniert",
                    entry.buchungsnummer ||
                    id,
                    {
                        betrag:
                            entry.betrag ||
                            entry.amount ||
                            0,

                        art:
                            entry.art ||
                            entry.typ ||
                            entry.type ||
                            "",

                        zweck:
                            entry.zweck ||
                            entry.notiz ||
                            ""
                    }
                );

            }
            catch(logError){

                console.warn(
                    "Sparkonto-Storno gespeichert, aber Protokoll konnte nicht geschrieben werden:",
                    logError
                );

            }

        }


        await loadBookkeepingData();


        renderSavings();

        renderOverview();


        if(
            typeof runFinancialControl ===
            "function"
        ){

            runFinancialControl();

        }


        showToast(
            "Sparkonto-Buchung wurde storniert.",
            "success"
        );

    }
    catch(error){

        console.error(
            "Sparkonto-Storno fehlgeschlagen:",
            error
        );


        showDatabaseError(
            error
        );

    }

};


/* =========================================================
   SPARKONTO – SPARZIEL
========================================================= */

window.saveSavingsGoal =
function(){

    if(!canManageBookkeeping()){

        showToast(
            "Keine Berechtigung zum Ändern des Sparziels.",
            "error"
        );

        return;

    }


    const input =
        getElement(
            "savingsGoal"
        );


    if(!input){

        return;

    }


    let value =
        Number(
            String(
                input.value ||
                ""
            )
            .replace(",", ".")
        );


    if(!Number.isFinite(value)){

        value = 0;

    }


    if(value < 0){

        value = 0;

    }


    input.value =
        value;


    renderSavings();


    showToast(
        "Sparziel aktualisiert.",
        "success"
    );

};


/* =========================================================
   SPARKONTO – AKTUALISIEREN
========================================================= */

window.refreshSavings =
async function(){

    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    try{

        await loadBookkeepingData();


        renderSavings();

        renderOverview();


        if(
            typeof runFinancialControl ===
            "function"
        ){

            runFinancialControl();

        }

    }
    catch(error){

        console.error(
            "Sparkonto konnte nicht aktualisiert werden:",
            error
        );


        showDatabaseError(
            error
        );

    }

};


/* =========================================================
   GESAMTVERMÖGEN
========================================================= */

function calculateTotalAssets(){

    const clanBalance =
        getCurrentClanBalance();


    const savingsBalance =
        getSavingsBalance();


    return (
        clanBalance +
        savingsBalance
    );

}


/* =========================================================
   SPARKONTO – BERECHTIGUNGEN
========================================================= */

function applySavingsPermissions(){

    const managementElements =
        document.querySelectorAll(
            "[data-savings-management]"
        );


    managementElements.forEach(
        element => {

            if(
                canManageBookkeeping()
            ){

                element.removeAttribute(
                    "disabled"
                );

                element.classList.remove(
                    "disabled"
                );

                element.removeAttribute(
                    "aria-disabled"
                );

            }
            else{

                element.setAttribute(
                    "disabled",
                    "disabled"
                );

                element.classList.add(
                    "disabled"
                );

                element.setAttribute(
                    "aria-disabled",
                    "true"
                );

            }

        }
    );

}


/* =========================================================
   SPARKONTO – BERECHTIGUNGEN NACH LADEN ANWENDEN
========================================================= */

function refreshSavingsPermissions(){

    applySavingsPermissions();

}

/* =========================================================
   TEIL 6 VON 12
   BUCHHALTUNG – MITARBEITER
========================================================= */


/* =========================================================
   AKTUELLER BUCHHALTUNGSNAME
========================================================= */

function getCurrentUserName(){

    return (
        getBookkeepingName() ||
        currentUser?.email ||
        "Unbekannt"
    );

}


/* =========================================================
   PERSONENNAMEN NORMALISIEREN
========================================================= */

function normalizePersonName(value){

    return String(
        value || ""
    )
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

}


/* =========================================================
   MITARBEITER-STATISTIKEN
========================================================= */

function getEmployeeStatistics(
    employeeName
){

    const target =
        normalizePersonName(
            employeeName
        );


    let orders = 0;
    let wages = 0;
    let deposits = 0;
    let withdrawals = 0;
    let openAmount = 0;


    /*
       Aufträge des Mitarbeiters ermitteln.
       WICHTIG:
       Die globale Arbeiterliste heißt
       "orderWorkers".
    */

    const employeeOrders =
        orderSettlements.filter(
            order => {

                const workersForOrder =
                    Array.isArray(
                        orderWorkers
                    )
                        ? orderWorkers.filter(
                            worker => {

                                return (
                                    normalizePersonName(
                                        worker.arbeiter ||
                                        worker.employee_name ||
                                        worker.arbeiter_name ||
                                        worker.name ||
                                        ""
                                    ) ===
                                    target
                                );

                            }
                        )
                        : [];


                return (
                    workersForOrder.length > 0
                );

            }
        );


    orders =
        employeeOrders.length;


    /*
       Gehälter und offene Gehälter.
    */

    if(
        Array.isArray(
            orderWorkers
        )
    ){

        orderWorkers.forEach(
            worker => {

                const workerName =
                    normalizePersonName(
                        worker.arbeiter ||
                        worker.employee_name ||
                        worker.arbeiter_name ||
                        worker.name ||
                        ""
                    );


                if(
                    workerName !==
                    target
                ){

                    return;

                }


                const salary =
                    Number(
                        worker.gehalt ||
                        worker.salary ||
                        worker.betrag ||
                        0
                    ) || 0;


                wages +=
                    salary;


                const order =
                    orderSettlements.find(
                        item => {

                            return (
                                String(
                                    item.id
                                ) ===
                                String(
                                    worker.auftragsabrechnung_id ||
                                    worker.order_settlement_id ||
                                    worker.auftrag_id ||
                                    ""
                                )
                            );

                        }
                    );


                if(!order){

                    return;

                }


                const status =
                    String(
                        order.status ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                if(
                    status === "offen" ||
                    status === "teilweise bezahlt"
                ){

                    openAmount +=
                        salary;

                }

            }
        );

    }


    /*
       Einzahlungen / Auszahlungen
       des Mitarbeiters aus den normalen
       manuellen Buchungen.
    */

    if(
        Array.isArray(
            bookings
        )
    ){

        bookings.forEach(
            booking => {

                const type =
                    String(
                        booking.art ||
                        booking.typ ||
                        booking.type ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                const amount =
                    Number(
                        booking.betrag ||
                        booking.amount ||
                        0
                    ) || 0;


                const from =
                    normalizePersonName(
                        booking.von ||
                        booking.from ||
                        ""
                    );


                const to =
                    normalizePersonName(
                        booking.an ||
                        booking.to ||
                        ""
                    );


                if(
                    from === target &&
                    (
                        type ===
                            "einzahlung" ||
                        type ===
                            "deposit"
                    )
                ){

                    deposits +=
                        amount;

                }


                if(
                    to === target &&
                    (
                        type ===
                            "auszahlung" ||
                        type ===
                            "withdrawal"
                    )
                ){

                    withdrawals +=
                        amount;

                }

            }
        );

    }


    return {

        orders:
            orders,

        wages:
            wages,

        deposits:
            deposits,

        withdrawals:
            withdrawals,

        openAmount:
            openAmount

    };

}


/* =========================================================
   MITARBEITER-ZUSAMMENFASSUNG
========================================================= */

function renderEmployeeSummary(){

    const list =
        Array.isArray(
            employees
        )
            ? employees
            : [];


    let salaryTotal = 0;
    let depositTotal = 0;
    let withdrawalTotal = 0;
    let openTotal = 0;


    list.forEach(
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


            salaryTotal +=
                stats.wages;


            depositTotal +=
                stats.deposits;


            withdrawalTotal +=
                stats.withdrawals;


            openTotal +=
                stats.openAmount;

        }
    );


    setText(
        "employeeCount",
        String(
            list.length
        )
    );


    setText(
        "employeeSalaryTotal",
        money(
            salaryTotal
        )
    );


    setText(
        "employeeDepositTotal",
        money(
            depositTotal
        )
    );


    setText(
        "employeeWithdrawalTotal",
        money(
            withdrawalTotal
        )
    );


    setText(
        "employeeOpenTotal",
        money(
            openTotal
        )
    );

}


/* =========================================================
   MITARBEITER-ZEILEN RENDERN
========================================================= */

function renderEmployeeRows(
    list
){

    const tbody =
        getElement(
            "employeeTableBody"
        );


    if(!tbody){

        return;

    }


    if(
        !Array.isArray(list) ||
        !list.length
    ){

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-state"
                >
                    Keine Mitarbeiter gefunden.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        list
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


                    const note =
                        employee.notiz ||
                        employee.note ||
                        employee.bemerkung ||
                        "—";


                    return `

                        <tr>

                            <td>

                                <strong>
                                    ${escapeHtml(
                                        name
                                    )}
                                </strong>

                            </td>


                            <td>
                                ${stats.orders}
                            </td>


                            <td>
                                ${money(
                                    stats.wages
                                )}
                            </td>


                            <td class="amount-positive">
                                ${money(
                                    stats.deposits
                                )}
                            </td>


                            <td class="amount-negative">
                                ${money(
                                    stats.withdrawals
                                )}
                            </td>


                            <td class="${
                                stats.openAmount > 0
                                    ? "amount-negative"
                                    : ""
                            }">
                                ${money(
                                    stats.openAmount
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    note
                                )}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   MITARBEITER RENDERN
========================================================= */

function renderEmployees(){

    const list =
        Array.isArray(
            employees
        )
            ? employees
            : [];


    renderEmployeeSummary();

    renderEmployeeRows(
        list
    );

}


/* =========================================================
   MITARBEITER FILTER
========================================================= */

window.filterEmployees =
function(){

    const searchInput =
        getElement(
            "employeeSearch"
        );


    const search =
        normalizePersonName(
            searchInput?.value ||
            ""
        );


    const list =
        Array.isArray(
            employees
        )
            ? employees
            : [];


    if(!search){

        renderEmployeeRows(
            list
        );

        return;

    }


    const filtered =
        list.filter(
            employee => {

                const name =
                    employee.name ||
                    employee.username ||
                    employee.minecraft_name ||
                    "";


                const rank =
                    employee.rang ||
                    employee.rank ||
                    "";


                const role =
                    employee.rolle ||
                    employee.role ||
                    "";


                return (

                    normalizePersonName(
                        name
                    )
                    .includes(
                        search
                    )

                    ||

                    normalizePersonName(
                        rank
                    )
                    .includes(
                        search
                    )

                    ||

                    normalizePersonName(
                        role
                    )
                    .includes(
                        search
                    )

                );

            }
        );


    renderEmployeeRows(
        filtered
    );

};


/* =========================================================
   MITARBEITER-DETAILS ÖFFNEN
========================================================= */

window.openEmployeeDetails =
function(
    employeeName
){

    const employee =
        employees.find(
            item => {

                const name =
                    item.name ||
                    item.username ||
                    item.minecraft_name ||
                    "";


                return (
                    normalizePersonName(
                        name
                    ) ===
                    normalizePersonName(
                        employeeName
                    )
                );

            }
        );


    if(!employee){

        showToast(
            "Mitarbeiter nicht gefunden.",
            "error"
        );

        return;

    }


    const stats =
        getEmployeeStatistics(
            employeeName
        );


    setText(
        "employeeDetailName",
        employeeName
    );


    setText(
        "employeeDetailRank",
        employee.rang ||
        employee.rank ||
        "—"
    );


    setText(
        "employeeDetailRole",
        employee.rolle ||
        employee.role ||
        "—"
    );


    setText(
        "employeeDetailOrders",
        String(
            stats.orders
        )
    );


    setText(
        "employeeDetailSalary",
        money(
            stats.wages
        )
    );


    setText(
        "employeeDetailDeposits",
        money(
            stats.deposits
        )
    );


    setText(
        "employeeDetailWithdrawals",
        money(
            stats.withdrawals
        )
    );


    setText(
        "employeeDetailOpen",
        money(
            stats.openAmount
        )
    );


    const modal =
        getElement(
            "employeeDetailModal"
        );


    if(modal){

        modal.classList.add(
            "active"
        );

    }

};


/* =========================================================
   MITARBEITER-DETAILS SCHLIESSEN
========================================================= */

window.closeEmployeeDetails =
function(){

    const modal =
        getElement(
            "employeeDetailModal"
        );


    if(modal){

        modal.classList.remove(
            "active"
        );

    }

};


/* =========================================================
   MITARBEITER AKTUALISIEREN
========================================================= */

window.refreshEmployees =
async function(){

    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    try{

        await loadBookkeepingData();


        renderEmployees();

        renderEmployeeSummary();


    }
    catch(error){

        console.error(
            "Mitarbeiter konnten nicht aktualisiert werden:",
            error
        );


        showDatabaseError(
            error
        );

    }

};


/* =========================================================
   MITARBEITER-BERECHTIGUNGEN
========================================================= */

function applyEmployeePermissions(){

    const employeeActions =
        document.querySelectorAll(
            "[data-employee-management]"
        );


    employeeActions.forEach(
        element => {

            if(
                canManageBookkeeping()
            ){

                element.removeAttribute(
                    "disabled"
                );

                element.classList.remove(
                    "disabled"
                );

                element.removeAttribute(
                    "aria-disabled"
                );

            }
            else{

                element.setAttribute(
                    "disabled",
                    "disabled"
                );

                element.classList.add(
                    "disabled"
                );

                element.setAttribute(
                    "aria-disabled",
                    "true"
                );

            }

        }
    );

}


/* =========================================================
   MITARBEITER-AUSZAHLUNG PRÜFEN
========================================================= */

function canPayEmployee(
    amount
){

    const value =
        Number(
            amount
        ) || 0;


    if(value <= 0){

        return false;

    }


    return (
        value <=
        getCurrentClanBalance()
    );

}


/* =========================================================
   MITARBEITER-DATEN AKTUALISIEREN
========================================================= */

function updateEmployeeStatistics(){

    renderEmployeeSummary();


    renderEmployeeRows(
        Array.isArray(
            employees
        )
            ? employees
            : []
    );

}


/* =========================================================
   TEIL 7 VON 12
   BUCHHALTUNG – KASSENABGLEICH
========================================================= */


/* =========================================================
   KASSENABGLEICHE
========================================================= */

function getCashChecks(){

    return Array.isArray(
        cashChecks
    )
        ? cashChecks
        : [];

}


/* =========================================================
   ABWEICHUNG BERECHNEN
========================================================= */

function calculateCashDifference(
    portalBalance,
    ingameBalance
){

    const portal =
        Number(
            portalBalance
        ) || 0;


    const ingame =
        Number(
            ingameBalance
        ) || 0;


    /*
       Positiv:
       Ingame ist mehr Geld vorhanden.

       Negativ:
       Ingame ist weniger Geld vorhanden.
    */

    return (
        ingame -
        portal
    );

}


/* =========================================================
   KASSENABGLEICH RENDERN
========================================================= */

function renderCashChecks(){

    const list =
        getCashChecks();


    const tbody =
        getElement(
            "cashCheckTableBody"
        );


    if(!tbody){

        return;

    }


    if(!list.length){

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-state"
                >
                    Noch kein Kassenabgleich vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    const sorted =
        [...list]
            .sort(
                (a,b) => {

                    const dateA =
                        new Date(
                            a.created_at ||
                            a.datum ||
                            a.createdAt ||
                            0
                        ).getTime();


                    const dateB =
                        new Date(
                            b.created_at ||
                            b.datum ||
                            b.createdAt ||
                            0
                        ).getTime();


                    return dateB -
                        dateA;

                }
            );


    tbody.innerHTML =
        sorted
            .map(
                entry => {

                    const portalBalance =
                        Number(
                            entry.portalstand ||
                            entry.portal_balance ||
                            0
                        ) || 0;


                    const ingameBalance =
                        Number(
                            entry.ingame_stand ||
                            entry.ingame_balance ||
                            0
                        ) || 0;


                    const storedDifference =
                        Number(
                            entry.abweichung
                        );


                    const calculatedDifference =
                        Number.isFinite(
                            storedDifference
                        )
                            ? storedDifference
                            : calculateCashDifference(
                                portalBalance,
                                ingameBalance
                            );


                    const isCorrect =
                        Math.abs(
                            calculatedDifference
                        ) < 0.01;


                    const note =
                        entry.notiz ||
                        entry.note ||
                        "—";


                    const createdBy =
                        entry.erstellt_von_name ||
                        entry.created_by_name ||
                        entry.created_by ||
                        entry.erstellt_von ||
                        "—";


                    const date =
                        entry.created_at ||
                        entry.datum ||
                        entry.createdAt;


                    return `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        date
                                    )
                                )}
                            </td>


                            <td>
                                ${money(
                                    portalBalance
                                )}
                            </td>


                            <td>
                                ${money(
                                    ingameBalance
                                )}
                            </td>


                            <td
                                class="${
                                    isCorrect
                                        ? "amount-positive"
                                        : "amount-negative"
                                }"
                            >
                                ${
                                    calculatedDifference > 0
                                        ? "+"
                                        : ""
                                }${money(
                                    calculatedDifference
                                )}
                            </td>


                            <td>

                                <span
                                    class="status-badge ${
                                        isCorrect
                                            ? "status-paid"
                                            : "status-open"
                                    }"
                                >
                                    ${
                                        isCorrect
                                            ? "Stimmt"
                                            : "Abweichung"
                                    }
                                </span>

                            </td>


                            <td>
                                ${escapeHtml(
                                    note
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    createdBy
                                )}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   KASSENABGLEICH MODAL ÖFFNEN
========================================================= */

window.openCashCheckModal =
function(){

    if(!canManageBookkeeping()){

        showToast(
            "Keine Berechtigung für den Kassenabgleich.",
            "error"
        );

        return;

    }


    const modal =
        getElement(
            "cashCheckModal"
        );


    if(!modal){

        return;

    }


    const portalInput =
        getElement(
            "cashPortalBalance"
        );


    const ingameInput =
        getElement(
            "cashIngameBalance"
        );


    const noteInput =
        getElement(
            "cashCheckNote"
        );


    /*
       Portalstand wird automatisch aus
       der aktuellen Buchhaltung übernommen.
    */

    if(portalInput){

        portalInput.value =
            getCurrentClanBalance()
                .toFixed(2);

    }


    if(ingameInput){

        ingameInput.value =
            "";

    }


    if(noteInput){

        noteInput.value =
            "";

    }


    updateCashCheckDifference();


    modal.classList.add(
        "active"
    );

};


/* =========================================================
   KASSENABGLEICH MODAL SCHLIESSEN
========================================================= */

window.closeCashCheckModal =
function(){

    const modal =
        getElement(
            "cashCheckModal"
        );


    if(modal){

        modal.classList.remove(
            "active"
        );

    }

};


/* =========================================================
   ABWEICHUNG LIVE BERECHNEN
========================================================= */

window.updateCashCheckDifference =
function(){

    const portalInput =
        getElement(
            "cashPortalBalance"
        );


    const ingameInput =
        getElement(
            "cashIngameBalance"
        );


    const differenceElement =
        getElement(
            "cashDifference"
        );


    if(
        !portalInput ||
        !ingameInput
    ){

        return 0;

    }


    const portal =
        Number(
            String(
                portalInput.value ||
                ""
            )
            .replace(",", ".")
        ) || 0;


    const ingame =
        Number(
            String(
                ingameInput.value ||
                ""
            )
            .replace(",", ".")
        ) || 0;


    const difference =
        calculateCashDifference(
            portal,
            ingame
        );


    if(differenceElement){

        differenceElement.textContent =
            (
                difference > 0
                    ? "+"
                    : ""
            ) +
            money(
                difference
            );


        differenceElement.classList.remove(
            "amount-positive",
            "amount-negative"
        );


        if(
            Math.abs(
                difference
            ) < 0.01
        ){

            differenceElement.classList.add(
                "amount-positive"
            );

        }
        else{

            differenceElement.classList.add(
                "amount-negative"
            );

        }

    }


    return difference;

};


/* =========================================================
   KASSENABGLEICH SPEICHERN
========================================================= */

window.saveCashCheck =
async function(){

    if(!canManageBookkeeping()){

        showToast(
            "Keine Berechtigung für den Kassenabgleich.",
            "error"
        );

        return;

    }


    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    const portalBalance =
        numberValue(
            "cashPortalBalance"
        );


    const ingameBalance =
        numberValue(
            "cashIngameBalance"
        );


    const note =
        getValue(
            "cashCheckNote"
        )
        .trim();


    if(
        portalBalance < 0
    ){

        showToast(
            "Der Portalstand darf nicht negativ sein.",
            "error"
        );

        return;

    }


    if(
        ingameBalance < 0
    ){

        showToast(
            "Der Ingame-Stand darf nicht negativ sein.",
            "error"
        );

        return;

    }


    const difference =
        calculateCashDifference(
            portalBalance,
            ingameBalance
        );


    const bookingNumber =
        typeof generateBookingNumber ===
        "function"
            ? generateBookingNumber("KA")
            : (
                "KA-" +
                Date.now()
            );


    const bookkeepingName =
        getBookkeepingName();


    if(!bookkeepingName){

        alert(
            "Bitte zuerst deinen Namen für die Buchhaltung festlegen."
        );

        return;

    }


    const payload = {

        buchungsnummer:
            bookingNumber,

        portalstand:
            portalBalance,

        ingame_stand:
            ingameBalance,

        abweichung:
            difference,

        notiz:
            note ||
            null,

        erstellt_von:
            bookkeepingName,

        erstellt_von_name:
            bookkeepingName,

        user_id:
            currentUser?.id ||
            null,

        created_at:
            new Date().toISOString()

    };


    try{

        const {
            data,
            error
        } =
            await buchhaltungDB
                .from(
                    TABLE_CASH
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

            cashChecks.push(
                data
            );

        }


        if(
            typeof writeActivityLog ===
            "function"
        ){

            try{

                await writeActivityLog(
                    "Kassenabgleich",
                    "Erstellt",
                    bookingNumber,
                    {
                        portalstand:
                            portalBalance,

                        ingame_stand:
                            ingameBalance,

                        abweichung:
                            difference,

                        notiz:
                            note
                    }
                );

            }
            catch(logError){

                console.warn(
                    "Kassenabgleich gespeichert, aber Protokoll konnte nicht geschrieben werden:",
                    logError
                );

            }

        }


        closeCashCheckModal();


        renderCashChecks();

        renderCashCheckStatus();


        if(
            typeof runFinancialControl ===
            "function"
        ){

            runFinancialControl();

        }


        if(
            Math.abs(
                difference
            ) >= 0.01
        ){

            showToast(
                `Kassenabgleich gespeichert. Abweichung: ${money(difference)}`,
                "warning"
            );

        }
        else{

            showToast(
                "Kassenabgleich gespeichert. Keine Abweichung.",
                "success"
            );

        }

    }
    catch(error){

        console.error(
            "Kassenabgleich konnte nicht gespeichert werden:",
            error
        );


        showDatabaseError(
            error
        );

    }

};


/* =========================================================
   LETZTEN KASSENABGLEICH ERMITTELN
========================================================= */

function getLatestCashCheck(){

    const list =
        getCashChecks();


    if(!list.length){

        return null;

    }


    return [...list]
        .sort(
            (a,b) => {

                const dateA =
                    new Date(
                        a.created_at ||
                        a.datum ||
                        a.createdAt ||
                        0
                    ).getTime();


                const dateB =
                    new Date(
                        b.created_at ||
                        b.datum ||
                        b.createdAt ||
                        0
                    ).getTime();


                return dateB -
                    dateA;

            }
        )[0];

}


/* =========================================================
   KASSENSTATUS ERMITTELN
========================================================= */

function getCashCheckStatus(){

    const latest =
        getLatestCashCheck();


    if(!latest){

        return {

            status:
                "unknown",

            difference:
                0

        };

    }


    const difference =
        Number(
            latest.abweichung
        ) || 0;


    if(
        Math.abs(
            difference
        ) < 0.01
    ){

        return {

            status:
                "ok",

            difference:
                0

        };

    }


    return {

        status:
            "warning",

        difference:
            difference

    };

}


/* =========================================================
   KASSENSTATUS ANZEIGEN
========================================================= */

function renderCashCheckStatus(){

    const status =
        getCashCheckStatus();


    const element =
        getElement(
            "cashCheckStatus"
        );


    if(!element){

        return;

    }


    element.classList.remove(
        "status-paid",
        "status-open",
        "status-warning"
    );


    if(
        status.status ===
        "ok"
    ){

        element.textContent =
            "Kassenstand stimmt";


        element.classList.add(
            "status-paid"
        );


        return;

    }


    if(
        status.status ===
        "warning"
    ){

        element.textContent =
            `Abweichung ${money(
                status.difference
            )}`;


        element.classList.add(
            "status-warning"
        );


        return;

    }


    element.textContent =
        "Noch kein Abgleich";

}


/* =========================================================
   KASSENABGLEICH AKTUALISIEREN
========================================================= */

window.refreshCashChecks =
async function(){

    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    try{

        await loadBookkeepingData();


        renderCashChecks();

        renderCashCheckStatus();


        if(
            typeof runFinancialControl ===
            "function"
        ){

            runFinancialControl();

        }

    }
    catch(error){

        console.error(
            "Kassenabgleich konnte nicht aktualisiert werden:",
            error
        );


        showDatabaseError(
            error
        );

    }

};


/* =========================================================
   KASSENABGLEICH – KURZSTATUS
========================================================= */

function updateCashCheckOverview(){

    const status =
        getCashCheckStatus();


    setText(
        "cashCheckDifference",
        money(
            status.difference
        )
    );


    const latest =
        getLatestCashCheck();


    if(latest){

        setText(
            "cashCheckLastDate",
            formatDate(
                latest.created_at ||
                latest.datum ||
                latest.createdAt
            )
        );

    }
    else{

        setText(
            "cashCheckLastDate",
            "Noch kein Abgleich"
        );

    }

}


/* =========================================================
   TEIL 8 VON 12
   BUCHHALTUNG – PROTOKOLL / AUDIT
========================================================= */


/* =========================================================
   AKTIVITÄTSPROTOKOLL
========================================================= */

function getActivityLogs(){

    return Array.isArray(
        activityLogs
    )
        ? activityLogs
        : [];

}


/* =========================================================
   PROTOKOLL RENDERN
========================================================= */

function renderActivityLogs(){

    const list =
        getActivityLogs();


    const tbody =
        getElement(
            "activityLogTableBody"
        );


    if(!tbody){

        return;

    }


    if(!list.length){

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-state"
                >
                    Noch keine Protokolleinträge vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    const sorted =
        [...list]
            .sort(
                (a,b) => {

                    const dateA =
                        new Date(
                            a.created_at ||
                            a.datum ||
                            a.createdAt ||
                            0
                        ).getTime();


                    const dateB =
                        new Date(
                            b.created_at ||
                            b.datum ||
                            b.createdAt ||
                            0
                        ).getTime();


                    return dateB -
                        dateA;

                }
            );


    tbody.innerHTML =
        sorted
            .map(
                entry => {

                    const date =
                        entry.created_at ||
                        entry.datum ||
                        entry.createdAt;


                    const action =
                        entry.aktion ||
                        entry.action ||
                        entry.vorgang ||
                        "—";


                    const area =
                        entry.bereich ||
                        entry.area ||
                        "—";


                    const reference =
                        entry.referenz ||
                        entry.reference ||
                        entry.buchungsnummer ||
                        entry.auftragsnummer ||
                        "—";


                    const createdBy =
                        entry.erstellt_von_name ||
                        entry.created_by_name ||
                        entry.created_by ||
                        entry.erstellt_von ||
                        "—";


                    let details =
                        entry.details ||
                        entry.notiz ||
                        entry.note ||
                        "";


                    if(
                        typeof details ===
                        "object"
                    ){

                        try{

                            details =
                                JSON.stringify(
                                    details
                                );

                        }
                        catch(error){

                            details =
                                "—";

                        }

                    }


                    return `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        date
                                    )
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
                                    reference
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    createdBy
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    details ||
                                    "—"
                                )}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   PROTOKOLL SCHREIBEN
========================================================= */

async function writeActivityLog(
    area,
    action,
    reference = "",
    details = {}
){

    if(!hasSupabase()){

        return null;

    }


    const bookkeepingName =
        getBookkeepingName();


    const payload = {

        bereich:
            area ||
            "Buchhaltung",

        aktion:
            action ||
            "Unbekannt",

        referenz:
            reference ||
            null,

        details:
            details ||
            {},

        erstellt_von:
            bookkeepingName ||
            "Unbekannt",

        erstellt_von_name:
            bookkeepingName ||
            "Unbekannt",

        user_id:
            currentUser?.id ||
            null,

        created_at:
            new Date().toISOString()

    };


    try{

        const {
            data,
            error
        } =
            await buchhaltungDB
                .from(
                    TABLE_ACTIVITY_LOG
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


        return data;

    }
    catch(error){

        console.error(
            "Fehler beim Schreiben des Protokolls:",
            error
        );

        return null;

    }

}


/* =========================================================
   PROTOKOLL FILTER
========================================================= */

window.filterActivityLogs =
function(){

    const searchInput =
        getElement(
            "activityLogSearch"
        );


    const search =
        normalizePersonName(
            searchInput?.value ||
            ""
        );


    const typeInput =
        getElement(
            "activityLogType"
        );


    const selectedType =
        String(
            typeInput?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const list =
        getActivityLogs();


    const filtered =
        list.filter(
            entry => {

                const action =
                    String(
                        entry.aktion ||
                        entry.action ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                const area =
                    String(
                        entry.bereich ||
                        entry.area ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                const reference =
                    String(
                        entry.referenz ||
                        entry.reference ||
                        entry.buchungsnummer ||
                        entry.auftragsnummer ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                const createdBy =
                    normalizePersonName(
                        entry.erstellt_von_name ||
                        entry.erstellt_von ||
                        entry.created_by_name ||
                        entry.created_by ||
                        ""
                    );


                const details =
                    String(
                        entry.details ||
                        entry.notiz ||
                        entry.note ||
                        ""
                    )
                    .toLowerCase();


                const searchMatch =
                    !search ||
                    action.includes(
                        search
                    ) ||
                    area.includes(
                        search
                    ) ||
                    reference.includes(
                        search
                    ) ||
                    createdBy.includes(
                        search
                    ) ||
                    details.includes(
                        search
                    );


                const typeMatch =
                    !selectedType ||
                    action ===
                    selectedType;


                return (
                    searchMatch &&
                    typeMatch
                );

            }
        );


    renderActivityLogRows(
        filtered
    );

};


/* =========================================================
   PROTOKOLLZEILEN RENDERN
========================================================= */

function renderActivityLogRows(
    list
){

    const tbody =
        getElement(
            "activityLogTableBody"
        );


    if(!tbody){

        return;

    }


    if(
        !Array.isArray(list) ||
        !list.length
    ){

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-state"
                >
                    Keine passenden Protokolle gefunden.
                </td>
            </tr>
        `;

        return;

    }


    const sorted =
        [...list]
            .sort(
                (a,b) => {

                    const dateA =
                        new Date(
                            a.created_at ||
                            a.datum ||
                            a.createdAt ||
                            0
                        ).getTime();


                    const dateB =
                        new Date(
                            b.created_at ||
                            b.datum ||
                            b.createdAt ||
                            0
                        ).getTime();


                    return dateB -
                        dateA;

                }
            );


    tbody.innerHTML =
        sorted
            .map(
                entry => {

                    const date =
                        entry.created_at ||
                        entry.datum ||
                        entry.createdAt;


                    const area =
                        entry.bereich ||
                        entry.area ||
                        "—";


                    const action =
                        entry.aktion ||
                        entry.action ||
                        "—";


                    const reference =
                        entry.referenz ||
                        entry.reference ||
                        entry.buchungsnummer ||
                        entry.auftragsnummer ||
                        "—";


                    const createdBy =
                        entry.erstellt_von_name ||
                        entry.erstellt_von ||
                        entry.created_by_name ||
                        entry.created_by ||
                        "—";


                    let details =
                        entry.details ||
                        entry.notiz ||
                        entry.note ||
                        "";


                    if(
                        typeof details ===
                        "object"
                    ){

                        try{

                            details =
                                JSON.stringify(
                                    details
                                );

                        }
                        catch(error){

                            details =
                                "—";

                        }

                    }


                    return `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        date
                                    )
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
                                    reference
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    createdBy
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    details ||
                                    "—"
                                )}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   PROTOKOLL AKTUALISIEREN
========================================================= */

window.refreshActivityLogs =
async function(){

    if(!hasSupabase()){

        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );

        return;

    }


    try{

        await loadBookkeepingData();


        renderActivityLogs();

        renderAuditSummary();


    }
    catch(error){

        console.error(
            "Protokoll konnte nicht aktualisiert werden:",
            error
        );


        showDatabaseError(
            error
        );

    }

};


/* =========================================================
   PROTOKOLL-FILTER ZURÜCKSETZEN
========================================================= */

window.clearActivityLogFilter =
function(){

    const search =
        getElement(
            "activityLogSearch"
        );


    const type =
        getElement(
            "activityLogType"
        );


    if(search){

        search.value =
            "";

    }


    if(type){

        type.value =
            "";

    }


    renderActivityLogs();

};


/* =========================================================
   AUDIT-ZUSAMMENFASSUNG
========================================================= */

function getAuditSummary(){

    const list =
        getActivityLogs();


    let created = 0;
    let cancelled = 0;
    let changed = 0;


    list.forEach(
        entry => {

            const action =
                String(
                    entry.aktion ||
                    entry.action ||
                    ""
                )
                .trim()
                .toLowerCase();


            if(
                action.includes(
                    "erstellt"
                ) ||
                action.includes(
                    "created"
                )
            ){

                created++;

            }


            if(
                action.includes(
                    "storniert"
                ) ||
                action.includes(
                    "storno"
                ) ||
                action.includes(
                    "cancel"
                )
            ){

                cancelled++;

            }


            if(
                action.includes(
                    "geändert"
                ) ||
                action.includes(
                    "bearbeitet"
                ) ||
                action.includes(
                    "updated"
                ) ||
                action.includes(
                    "update"
                )
            ){

                changed++;

            }

        }
    );


    return {

        total:
            list.length,

        created:
            created,

        cancelled:
            cancelled,

        changed:
            changed

    };

}


/* =========================================================
   AUDIT-ÜBERSICHT RENDERN
========================================================= */

function renderAuditSummary(){

    const summary =
        getAuditSummary();


    setText(
        "auditTotal",
        String(
            summary.total
        )
    );


    setText(
        "auditCreated",
        String(
            summary.created
        )
    );


    setText(
        "auditChanged",
        String(
            summary.changed
        )
    );


    setText(
        "auditCancelled",
        String(
            summary.cancelled
        )
    );

}


/* =========================================================
   STORNO-BERECHTIGUNG
========================================================= */

function canCancelBookkeepingEntry(){

    return canManageBookkeeping();

}


/* =========================================================
   AUDIT-ANSICHT AKTUALISIEREN
========================================================= */

function refreshAuditView(){

    renderActivityLogs();

    renderAuditSummary();

}


/* =========================================================
   AUDIT-KONTROLLE
========================================================= */

function hasAuditEntry(
    action,
    reference
){

    const normalizedAction =
        String(
            action ||
            ""
        )
        .trim()
        .toLowerCase();


    const normalizedReference =
        String(
            reference ||
            ""
        )
        .trim()
        .toLowerCase();


    return getActivityLogs()
        .some(
            entry => {

                const entryAction =
                    String(
                        entry.aktion ||
                        entry.action ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                const entryReference =
                    String(
                        entry.referenz ||
                        entry.reference ||
                        entry.buchungsnummer ||
                        entry.auftragsnummer ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    entryAction ===
                    normalizedAction &&
                    entryReference ===
                    normalizedReference
                );

            }
        );

}


/* =========================================================
   TEIL 9 / 12
   BUCHHALTUNG – MONATSAUSWERTUNG
========================================================= */

function getMonthlyDateRange(){

    const monthInput =
        getElement("monthlyPeriod");

    if(!monthInput){
        return null;
    }

    const value =
        String(monthInput.value || "").trim();

    if(!value){
        return null;
    }

    const parts =
        value.split("-");

    if(parts.length !== 2){
        return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);

    if(
        !Number.isFinite(year) ||
        !Number.isFinite(month)
    ){
        return null;
    }

    const start =
        new Date(
            year,
            month - 1,
            1,
            0,
            0,
            0,
            0
        );

    const end =
        new Date(
            year,
            month,
            1,
            0,
            0,
            0,
            0
        );

    return {
        start,
        end,
        year,
        month
    };
}


/* ================================
   DATUM PRÜFEN
================================ */

function isDateInMonthlyRange(value, range){

    if(!range || !value){
        return false;
    }

    const date =
        new Date(value);

    if(Number.isNaN(date.getTime())){
        return false;
    }

    return (
        date >= range.start &&
        date < range.end
    );
}


/* ================================
   MONATLICHE EINZAHLUNGEN
================================ */

function getMonthlyDeposits(range){

    return bookings
        .filter(entry => {

            const type =
                String(
                    entry.art ||
                    entry.typ ||
                    entry.type ||
                    ""
                ).trim().toLowerCase();

            const date =
                entry.created_at ||
                entry.datum ||
                entry.createdAt;

            return (
                type === "einzahlung" &&
                isDateInMonthlyRange(
                    date,
                    range
                )
            );
        })
        .reduce((sum, entry) => {

            return sum + (
                Number(
                    entry.betrag ||
                    entry.amount ||
                    0
                ) || 0
            );

        }, 0);
}


/* ================================
   MONATLICHE AUSZAHLUNGEN
================================ */

function getMonthlyWithdrawals(range){

    return bookings
        .filter(entry => {

            const type =
                String(
                    entry.art ||
                    entry.typ ||
                    entry.type ||
                    ""
                ).trim().toLowerCase();

            const date =
                entry.created_at ||
                entry.datum ||
                entry.createdAt;

            return (
                type === "auszahlung" &&
                isDateInMonthlyRange(
                    date,
                    range
                )
            );
        })
        .reduce((sum, entry) => {

            return sum + (
                Number(
                    entry.betrag ||
                    entry.amount ||
                    0
                ) || 0
            );

        }, 0);
}


/* ================================
   MONATLICHE GEHÄLTER
================================ */

function getMonthlyWages(range){

    let total = 0;

    /*
       Arbeiterdaten stammen aus den
       Auftragsarbeiter-Daten.
    */
    orderWorkers.forEach(worker => {

        const date =
            worker.created_at ||
            worker.datum ||
            worker.createdAt;

        if(
            !isDateInMonthlyRange(
                date,
                range
            )
        ){
            return;
        }

        total += Number(
            worker.gehalt ||
            worker.salary ||
            worker.betrag ||
            0
        ) || 0;
    });

    return total;
}


/* ================================
   MONATLICHE CLANAUSGABEN
================================ */

function getMonthlyClanExpenses(range){

    return bookings
        .filter(entry => {

            const category =
                String(
                    entry.kategorie ||
                    entry.category ||
                    ""
                ).trim().toLowerCase();

            const type =
                String(
                    entry.art ||
                    entry.typ ||
                    entry.type ||
                    ""
                ).trim().toLowerCase();

            const date =
                entry.created_at ||
                entry.datum ||
                entry.createdAt;

            const isExpense =
                type === "auszahlung";

            const isClanExpense =
                category === "clan-ausgabe" ||
                category === "clanausgabe" ||
                category === "clan ausgabe" ||
                category === "material" ||
                category === "sonstiges";

            return (
                isExpense &&
                isClanExpense &&
                isDateInMonthlyRange(
                    date,
                    range
                )
            );
        })
        .reduce((sum, entry) => {

            return sum + (
                Number(
                    entry.betrag ||
                    entry.amount ||
                    0
                ) || 0
            );

        }, 0);
}


/* ================================
   MONATSVERÄNDERUNG
================================ */

function calculateMonthlyChange(
    deposits,
    withdrawals
){

    return (
        Number(deposits) || 0
    ) - (
        Number(withdrawals) || 0
    );
}


/* ================================
   MONATSAUSWERTUNG
================================ */

function calculateMonthlyOverview(){

    const range =
        getMonthlyDateRange();

    if(!range){

        return {
            deposits: 0,
            withdrawals: 0,
            wages: 0,
            clanExpenses: 0,
            change: 0,
            orderCount: 0
        };
    }

    const deposits =
        getMonthlyDeposits(range);

    const withdrawals =
        getMonthlyWithdrawals(range);

    const wages =
        getMonthlyWages(range);

    const clanExpenses =
        getMonthlyClanExpenses(range);

    const orderCount =
        orderSettlements.filter(order => {

            const date =
                order.created_at ||
                order.datum ||
                order.createdAt;

            return isDateInMonthlyRange(
                date,
                range
            );

        }).length;

    return {
        deposits,
        withdrawals,
        wages,
        clanExpenses,
        change:
            calculateMonthlyChange(
                deposits,
                withdrawals
            ),
        orderCount
    };
}


/* ================================
   MONATSÜBERSICHT RENDERN
================================ */

function renderMonthlyOverview(){

    const data =
        calculateMonthlyOverview();

    setText(
        "monthlyIncome",
        money(data.deposits)
    );

    setText(
        "monthlyExpenses",
        money(data.withdrawals)
    );

    setText(
        "monthlyWages",
        money(data.wages)
    );

    setText(
        "monthlyClanExpenses",
        money(data.clanExpenses)
    );

    setText(
        "monthlyChange",
        money(data.change)
    );

    setText(
        "monthlyOrderCount",
        String(data.orderCount)
    );

    const changeElement =
        getElement("monthlyChange");

    if(changeElement){

        changeElement.classList.remove(
            "amount-positive",
            "amount-negative"
        );

        if(data.change > 0){

            changeElement.classList.add(
                "amount-positive"
            );

        }else if(data.change < 0){

            changeElement.classList.add(
                "amount-negative"
            );
        }
    }
}


/* ================================
   MONAT AUSWÄHLEN
================================ */

function initializeMonthlyPeriod(){

    const input =
        getElement("monthlyPeriod");

    if(!input){
        return;
    }

    if(!input.value){

        const now =
            new Date();

        const year =
            now.getFullYear();

        const month =
            String(
                now.getMonth() + 1
            ).padStart(2, "0");

        input.value =
            `${year}-${month}`;
    }

    renderMonthlyOverview();
}


/* ================================
   MONAT ÄNDERN
================================ */

function changeMonthlyPeriod(){

    renderMonthlyOverview();
}


/* ================================
   VORHERIGER MONAT
================================ */

function previousMonth(){

    const input =
        getElement("monthlyPeriod");

    if(!input){
        return;
    }

    const range =
        getMonthlyDateRange();

    if(!range){
        return;
    }

    const date =
        new Date(
            range.year,
            range.month - 2,
            1
        );

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    input.value =
        `${year}-${month}`;

    renderMonthlyOverview();
}


/* ================================
   NÄCHSTER MONAT
================================ */

function nextMonth(){

    const input =
        getElement("monthlyPeriod");

    if(!input){
        return;
    }

    const range =
        getMonthlyDateRange();

    if(!range){
        return;
    }

    const date =
        new Date(
            range.year,
            range.month,
            1
        );

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    input.value =
        `${year}-${month}`;

    renderMonthlyOverview();
}


/* ================================
   MONATSFILTER ZURÜCKSETZEN
================================ */

function resetMonthlyPeriod(){

    const input =
        getElement("monthlyPeriod");

    if(!input){
        return;
    }

    const now =
        new Date();

    input.value =
        `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, "0")}`;

    renderMonthlyOverview();
}


/* =========================================================
   TEIL 10 / 12
   BUCHHALTUNG – KONTROLLE & WARNUNGEN
========================================================= */

function getFinancialWarnings(){

    const warnings = [];


    /* -------------------------------
       1. KASSENABGLEICH
    -------------------------------- */

    const cashStatus =
        getCashCheckStatus();

    if(
        cashStatus &&
        cashStatus.status === "warning"
    ){

        warnings.push({
            type: "warning",
            title: "Kassenabweichung",
            message:
                `Portalstand und Ingame-Stand weichen um ${money(
                    cashStatus.difference
                )} voneinander ab.`
        });
    }


    /* -------------------------------
       2. OFFENE AUFTRAGSABRECHNUNGEN
    -------------------------------- */

    orderSettlements.forEach(order => {

        const status =
            String(
                order.status || ""
            ).trim().toLowerCase();

        if(
            status === "offen" ||
            status === "teilweise bezahlt"
        ){

            const workersForOrder =
                orderWorkers.filter(worker => {

                    return String(
                        worker.auftragsabrechnung_id ||
                        worker.order_settlement_id ||
                        worker.auftrag_id ||
                        ""
                    ) === String(
                        order.id || ""
                    );
                });

            const totalSalary =
                workersForOrder.reduce(
                    (sum, worker) => {

                        return sum + (
                            Number(
                                worker.gehalt ||
                                worker.salary ||
                                worker.betrag ||
                                0
                            ) || 0
                        );

                    },
                    0
                );

            const totalAmount =
                Number(
                    order.gesamtbetrag ||
                    order.total_amount ||
                    order.betrag ||
                    0
                ) || 0;

            const clanAmount =
                Number(
                    order.betrag_an_clan ||
                    order.clan_betrag ||
                    order.clan_amount ||
                    0
                ) || 0;


            if(
                totalSalary + clanAmount >
                totalAmount
            ){

                warnings.push({
                    type: "danger",
                    title:
                        "Auftragsabrechnung fehlerhaft",
                    message:
                        `Bei Auftrag ${
                            order.auftragsnummer ||
                            order.order_number ||
                            order.id ||
                            "—"
                        } übersteigen Arbeitergehälter und Clanbetrag den Gesamtbetrag.`
                });
            }


            if(
                workersForOrder.length === 0 &&
                totalAmount > 0
            ){

                warnings.push({
                    type: "warning",
                    title: "Arbeiter fehlen",
                    message:
                        `Für Auftrag ${
                            order.auftragsnummer ||
                            order.order_number ||
                            order.id ||
                            "—"
                        } wurden noch keine Arbeiter hinterlegt.`
                });
            }
        }
    });


    /* -------------------------------
       3. CLANSTAND NEGATIV
    -------------------------------- */

    const clanBalance =
        getCurrentClanBalance();

    if(clanBalance < 0){

        warnings.push({
            type: "danger",
            title: "Clanstand negativ",
            message:
                `Der aktuelle Clanstand beträgt ${money(
                    clanBalance
                )}.`
        });
    }


    /* -------------------------------
       4. SPARKONTO NEGATIV
    -------------------------------- */

    const savingsBalance =
        getSavingsBalance();

    if(savingsBalance < 0){

        warnings.push({
            type: "danger",
            title: "Sparkonto negativ",
            message:
                `Das Sparkonto weist einen negativen Stand von ${money(
                    savingsBalance
                )} auf.`
        });
    }


    /* -------------------------------
       5. AUSZAHLUNGEN PRÜFEN
    -------------------------------- */

    let runningBalance = 0;

    const sortedBookings =
        [...bookings].sort((a, b) => {

            const dateA =
                new Date(
                    a.created_at ||
                    a.datum ||
                    a.createdAt ||
                    0
                ).getTime();

            const dateB =
                new Date(
                    b.created_at ||
                    b.datum ||
                    b.createdAt ||
                    0
                ).getTime();

            return dateA - dateB;
        });


    sortedBookings.forEach(booking => {

        const type =
            String(
                booking.art ||
                booking.typ ||
                booking.type ||
                ""
            ).trim().toLowerCase();

        const amount =
            Number(
                booking.betrag ||
                booking.amount ||
                0
            ) || 0;


        if(type === "einzahlung"){

            runningBalance += amount;

        }else if(type === "auszahlung"){

            if(amount > runningBalance){

                warnings.push({
                    type: "danger",
                    title:
                        "Auszahlung über Clanstand",
                    message:
                        `Die Buchung ${
                            booking.buchungsnummer ||
                            booking.booking_number ||
                            booking.id ||
                            "—"
                        } übersteigt den zu diesem Zeitpunkt verfügbaren Clanstand.`
                });
            }

            runningBalance -= amount;
        }
    });


    return warnings;
}


/* ================================
   WARNUNGEN RENDERN
================================ */

function renderFinancialWarnings(){

    const warnings =
        getFinancialWarnings();

    const container =
        getElement("financialWarnings");

    if(!container){
        return;
    }


    if(!warnings.length){

        container.innerHTML = `
            <div class="control-success">
                <strong>Alles in Ordnung</strong>
                <span>
                    Aktuell wurden keine finanziellen Warnungen festgestellt.
                </span>
            </div>
        `;

        return;
    }


    container.innerHTML =
        warnings.map(warning => {

            const cssClass =
                warning.type === "danger"
                    ? "control-danger"
                    : "control-warning";

            return `
                <div class="${cssClass}">

                    <strong>
                        ${escapeHtml(
                            warning.title
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            warning.message
                        )}
                    </span>

                </div>
            `;

        }).join("");
}


/* ================================
   FINANZIELLE KONTROLLE
================================ */

function runFinancialControl(){

    renderFinancialWarnings();
    renderCashCheckStatus();

    const warnings =
        getFinancialWarnings();

    const countElement =
        getElement(
            "financialWarningCount"
        );

    if(countElement){

        countElement.textContent =
            String(warnings.length);

        countElement.classList.remove(
            "amount-positive",
            "amount-negative"
        );


        if(warnings.length > 0){

            countElement.classList.add(
                "amount-negative"
            );

        }else{

            countElement.classList.add(
                "amount-positive"
            );
        }
    }

    return warnings;
}


/* ================================
   AUSZAHLUNG PRÜFEN
================================ */

function validateClanPayout(amount){

    const value =
        Number(amount) || 0;

    if(value <= 0){

        return {
            valid: false,
            message:
                "Der Betrag muss größer als 0 $ sein."
        };
    }


    const balance =
        getCurrentClanBalance();

    if(value > balance){

        return {
            valid: false,
            message:
                `Die Auszahlung von ${money(
                    value
                )} übersteigt den aktuellen Clanstand von ${money(
                    balance
                )}.`
        };
    }


    return {
        valid: true,
        message: ""
    };
}


/* ================================
   SPARKONTO-AUSZAHLUNG PRÜFEN
================================ */

function validateSavingsPayout(amount){

    const value =
        Number(amount) || 0;

    if(value <= 0){

        return {
            valid: false,
            message:
                "Der Betrag muss größer als 0 $ sein."
        };
    }


    const balance =
        getSavingsBalance();

    if(value > balance){

        return {
            valid: false,
            message:
                `Die Auszahlung von ${money(
                    value
                )} übersteigt das Sparkonto-Guthaben von ${money(
                    balance
                )}.`
        };
    }


    return {
        valid: true,
        message: ""
    };
}


/* ================================
   AUFTRAGSABRECHNUNG PRÜFEN
================================ */

function validateOrderSettlement(order){

    const errors = [];

    if(!order){

        errors.push(
            "Keine Auftragsabrechnung vorhanden."
        );

        return errors;
    }


    const total =
        Number(
            order.gesamtbetrag ||
            order.total_amount ||
            order.betrag ||
            0
        ) || 0;

    const clanAmount =
        Number(
            order.betrag_an_clan ||
            order.clan_betrag ||
            order.clan_amount ||
            0
        ) || 0;


    if(total < 0){

        errors.push(
            "Der Gesamtbetrag darf nicht negativ sein."
        );
    }


    if(clanAmount < 0){

        errors.push(
            "Der Clanbetrag darf nicht negativ sein."
        );
    }


    if(clanAmount > total){

        errors.push(
            "Der Clanbetrag darf den Gesamtbetrag nicht überschreiten."
        );
    }


    const workersForOrder =
        orderWorkers.filter(worker => {

            return String(
                worker.auftragsabrechnung_id ||
                worker.order_settlement_id ||
                worker.auftrag_id ||
                ""
            ) === String(
                order.id || ""
            );
        });


    const salaries =
        workersForOrder.reduce(
            (sum, worker) => {

                return sum + (
                    Number(
                        worker.gehalt ||
                        worker.salary ||
                        worker.betrag ||
                        0
                    ) || 0
                );

            },
            0
        );


    if(
        clanAmount + salaries >
        total
    ){

        errors.push(
            "Clanbetrag und Arbeitergehälter überschreiten den Gesamtbetrag."
        );
    }


    return errors;
}


/* ================================
   KONTROLLSTATUS
================================ */

function getFinancialControlStatus(){

    const warnings =
        getFinancialWarnings();

    if(!warnings.length){

        return {
            status: "ok",
            text: "Keine Auffälligkeiten"
        };
    }


    const hasDanger =
        warnings.some(
            warning =>
                warning.type === "danger"
        );


    if(hasDanger){

        return {
            status: "danger",
            text:
                `${warnings.length} Kontrollhinweis${
                    warnings.length === 1
                        ? ""
                        : "e"
                }`
        };
    }


    return {
        status: "warning",
        text:
            `${warnings.length} Warnung${
                warnings.length === 1
                    ? ""
                    : "en"
            }`
    };
}


/* ================================
   KONTROLLSTATUS ANZEIGEN
================================ */

function renderFinancialControlStatus(){

    const status =
        getFinancialControlStatus();

    const element =
        getElement(
            "financialControlStatus"
        );

    if(!element){
        return;
    }


    element.classList.remove(
        "status-paid",
        "status-open",
        "status-warning"
    );


    if(status.status === "ok"){

        element.textContent =
            status.text;

        element.classList.add(
            "status-paid"
        );

    }else if(status.status === "danger"){

        element.textContent =
            status.text;

        element.classList.add(
            "status-open"
        );

    }else{

        element.textContent =
            status.text;

        element.classList.add(
            "status-warning"
        );
    }
}


/* ================================
   KOMPLETTE KONTROLLE
================================ */

function refreshFinancialControl(){

    renderFinancialWarnings();
    renderFinancialControlStatus();
    renderCashCheckStatus();
}


/* =========================================================
   TEIL 11 / 12
   BUCHHALTUNG – BERECHTIGUNGEN,
   NAVIGATION & GESAMT-AKTUALISIERUNG
========================================================= */


/* ================================
   BEREICH SCHLIESSEN
================================ */

window.closeArea = function(id){

    const area =
        document.getElementById(id);

    if(!area){
        return;
    }

    area.classList.remove(
        "active"
    );

    document
        .querySelectorAll(
            ".nav-button"
        )
        .forEach(button => {

            button.classList.remove(
                "active"
            );
        });
};


/* ================================
   BERECHTIGUNGEN ANWENDEN
================================ */

function applyBookkeepingPermissions(){

    const management =
        document.querySelectorAll(
            "[data-bookkeeping-management]"
        );

    const deposits =
        document.querySelectorAll(
            "[data-bookkeeping-deposit]"
        );


    /* -------------------------------
       VERWALTUNG
    -------------------------------- */

    management.forEach(element => {

        if(canManageBookkeeping()){

            element.removeAttribute(
                "disabled"
            );

            element.classList.remove(
                "disabled"
            );

            element.style.display = "";

        }else{

            element.setAttribute(
                "disabled",
                "disabled"
            );

            element.classList.add(
                "disabled"
            );
        }
    });


    /* -------------------------------
       EINZAHLUNGEN
    -------------------------------- */

    deposits.forEach(element => {

        if(canCreateDeposit()){

            element.removeAttribute(
                "disabled"
            );

            element.classList.remove(
                "disabled"
            );

            element.style.display = "";

        }else{

            element.setAttribute(
                "disabled",
                "disabled"
            );

            element.classList.add(
                "disabled"
            );
        }
    });


    /* -------------------------------
       AUSZAHLUNGEN
       Nur Leitung / Stadtleitung
    -------------------------------- */

    document
        .querySelectorAll(
            "[data-bookkeeping-payout]"
        )
        .forEach(element => {

            if(canManageBookkeeping()){

                element.removeAttribute(
                    "disabled"
                );

                element.classList.remove(
                    "disabled"
                );

            }else{

                element.setAttribute(
                    "disabled",
                    "disabled"
                );

                element.classList.add(
                    "disabled"
                );
            }
        });


    /* -------------------------------
       ADMIN-FUNKTIONEN
    -------------------------------- */

    document
        .querySelectorAll(
            "[data-bookkeeping-admin]"
        )
        .forEach(element => {

            if(canManageBookkeeping()){

                element.removeAttribute(
                    "disabled"
                );

                element.classList.remove(
                    "disabled"
                );

            }else{

                element.setAttribute(
                    "disabled",
                    "disabled"
                );

                element.classList.add(
                    "disabled"
                );
            }
        });
}


/* ================================
   BENUTZER-STATUS ANZEIGEN
================================ */

function renderCurrentUserPermissions(){

    const rank =
        getCurrentRank();

    const name =
        getCurrentUserName();


    setText(
        "currentUserName",
        name || "Unbekannt"
    );

    setText(
        "currentUserRank",
        rank || "Keine Zuordnung"
    );


    const permissionText =
        getElement(
            "currentUserPermission"
        );

    if(permissionText){

        if(canManageBookkeeping()){

            permissionText.textContent =
                "Vollzugriff auf die Buchhaltung";

        }else if(isMitarbeiter()){

            permissionText.textContent =
                "Einzahlungen erstellen";

        }else{

            permissionText.textContent =
                "Nur Leseberechtigung";
        }
    }
}


/* ================================
   DATEN NEU LADEN
================================ */

async function refreshBookkeeping(){

    if(!hasSupabase()){

        showDatabaseError();

        return;
    }


    try{

        await loadCurrentUser();

        if(currentUser){

            await loadCurrentEmployee();
        }


        await loadBookkeepingData();

        renderAllBookkeeping();

        renderCurrentUserPermissions();

        applyBookkeepingPermissions();

        refreshFinancialControl();


    }catch(error){

        console.error(
            "Buchhaltung konnte nicht aktualisiert werden:",
            error
        );

        showDatabaseError(error);
    }
}


/* ================================
   GESAMTE BUCHHALTUNG RENDERN
================================ */

function renderAllBookkeeping(){

    renderOverview();

    renderBookings();

    updateBookingSummary(
        bookings
    );

    renderOrderSettlements();

    renderCurrentWorkers();

    renderSavings();

    renderSavingsOverview();

    renderEmployees();

    renderCashChecks();

    renderCashCheckStatus();

    renderActivityLogs();

    renderAuditSummary();

    initializeMonthlyPeriod();

    renderMonthlyOverview();

    renderCurrentUserPermissions();

    applyBookkeepingPermissions();

    applySavingsPermissions();

    applyEmployeePermissions();

    runFinancialControl();

    renderFinancialControlStatus();
}


/* ================================
   BEREICH ÖFFNEN UND AKTUALISIEREN
================================ */

function openBookkeepingArea(
    areaId,
    button
){

    if(!areaId){
        return;
    }


    /*
       showArea ist bereits in Teil 1
       definiert.
    */

    window.showArea(
        areaId,
        button
    );


    /* -------------------------------
       BEREICHSSPEZIFISCHE AKTUALISIERUNG
    -------------------------------- */

    if(areaId === "area-employees"){

        renderEmployees();

    }else if(
        areaId === "area-savings"
    ){

        renderSavings();

    }else if(
        areaId === "area-monthly"
    ){

        renderMonthlyOverview();

    }else if(
        areaId === "area-cashcheck"
    ){

        renderCashChecks();

    }else if(
        areaId === "area-control"
    ){

        runFinancialControl();

    }else if(
        areaId === "area-log"
    ){

        renderActivityLogs();
    }
}


/* ================================
   BERECHTIGUNGS-CHECK VOR AKTION
================================ */

function requireManagementAccess(){

    if(canManageBookkeeping()){

        return true;
    }


    showToast(
        "Diese Funktion ist nur für Leitung oder Stadtleitung verfügbar.",
        "error"
    );

    return false;
}


/* ================================
   EINZAHLUNGS-CHECK
================================ */

function requireDepositAccess(){

    if(canCreateDeposit()){

        return true;
    }


    showToast(
        "Du darfst keine Einzahlung erstellen.",
        "error"
    );

    return false;
}


/* ================================
   AUSZAHLUNGS-CHECK
================================ */

function requirePayoutAccess(){

    if(canManageBookkeeping()){

        return true;
    }


    showToast(
        "Auszahlungen dürfen nur von Leitung oder Stadtleitung erstellt werden.",
        "error"
    );

    return false;
}


/* ================================
   BUCHHALTUNGS-SEITENSTATUS
================================ */

function renderBookkeepingStatus(){

    const element =
        getElement(
            "bookkeepingStatus"
        );

    if(!element){
        return;
    }


    element.classList.remove(
        "status-paid",
        "status-open",
        "status-warning"
    );


    if(!currentUser){

        element.textContent =
            "Nicht angemeldet";

        element.classList.add(
            "status-open"
        );

        return;
    }


    if(isLeitung()){

        element.textContent =
            "Verwaltungszugriff";

        element.classList.add(
            "status-paid"
        );

        return;
    }


    if(isMitarbeiter()){

        element.textContent =
            "Mitarbeiterzugriff";

        element.classList.add(
            "status-warning"
        );

        return;
    }


    element.textContent =
        "Leseberechtigung";

    element.classList.add(
        "status-open"
    );
}


/* ================================
   BUCHHALTUNG STARTSTATUS
================================ */

async function initializeBookkeeping(){

    try{

        await loadCurrentUser();


        if(!currentUser){

            console.warn(
                "Kein angemeldeter Benutzer gefunden."
            );

            renderBookkeepingStatus();

            return;
        }


        /*
           Mitarbeiterdaten werden nur für
           Rang und Berechtigungen geladen.

           Der Buchhaltungsname stammt
           weiterhin aus dem eigenen
           Buchhaltungsnamen-System.
        */

        await loadCurrentEmployee();

        await loadBookkeepingData();

        renderAllBookkeeping();

        renderBookkeepingStatus();


        console.log(
            "Buchhaltung erfolgreich initialisiert."
        );


    }catch(error){

        console.error(
            "Fehler bei der Initialisierung der Buchhaltung:",
            error
        );
    }
}


/* ================================
   GLOBALE FUNKTIONEN
================================ */

window.refreshBookkeeping =
    refreshBookkeeping;

window.openBookkeepingArea =
    openBookkeepingArea;

window.renderAllBookkeeping =
    renderAllBookkeeping;

window.openSavingsModal =
    openSavingsModal;

window.closeSavingsModal =
    closeSavingsModal;

window.saveSavingsEntry =
    saveSavingsEntry;

window.openCashCheckModal =
    openCashCheckModal;

window.closeCashCheckModal =
    closeCashCheckModal;

window.saveCashCheck =
    saveCashCheck;

window.filterEmployees =
    filterEmployees;

window.openEmployeeDetails =
    openEmployeeDetails;

window.closeEmployeeDetails =
    closeEmployeeDetails;

window.filterActivityLogs =
    filterActivityLogs;

window.clearActivityLogFilter =
    clearActivityLogFilter;

window.changeMonthlyPeriod =
    changeMonthlyPeriod;

window.previousMonth =
    previousMonth;

window.nextMonth =
    nextMonth;

window.resetMonthlyPeriod =
    resetMonthlyPeriod;


/* ================================
   DOM START
================================ */

if(
    document.readyState ===
    "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            initializeBookkeeping();

        },
        {
            once: true
        }
    );

}else{

    initializeBookkeeping();
}


/* =========================================================
   TEIL 12 / 12
   BUCHHALTUNG – ABSCHLUSS,
   HILFSFUNKTIONEN & FEHLERBEHANDLUNG
========================================================= */


/* ================================
   SEITE NEU LADEN
================================ */

async function reloadBookkeepingPage(){

    const reloadButton =
        getElement(
            "reloadBookkeeping"
        );

    if(reloadButton){

        reloadButton.disabled = true;

        reloadButton.classList.add(
            "loading"
        );
    }


    try{

        await refreshBookkeeping();

        showToast(
            "Buchhaltung wurde aktualisiert.",
            "success"
        );

    }catch(error){

        console.error(
            "Aktualisierung fehlgeschlagen:",
            error
        );

        showToast(
            "Buchhaltung konnte nicht aktualisiert werden.",
            "error"
        );

    }finally{

        if(reloadButton){

            reloadButton.disabled = false;

            reloadButton.classList.remove(
                "loading"
            );
        }
    }
}


/* ================================
   MODAL SCHLIESSEN
================================ */

function closeAllBookkeepingModals(){

    document
        .querySelectorAll(
            ".modal.active"
        )
        .forEach(modal => {

            modal.classList.remove(
                "active"
            );
        });
}


/* ================================
   ESC-TASTE
================================ */

document.addEventListener(
    "keydown",
    event => {

        if(event.key === "Escape"){

            closeAllBookkeepingModals();
        }
    }
);


/* ================================
   MODAL-KLICK AUF HINTERGRUND
================================ */

document.addEventListener(
    "click",
    event => {

        if(
            event.target &&
            event.target.classList &&
            event.target.classList.contains(
                "modal"
            )
        ){

            event.target.classList.remove(
                "active"
            );
        }
    }
);


/* ================================
   GLOBALE FUNKTIONEN
================================ */

window.reloadBookkeepingPage =
    reloadBookkeepingPage;

window.closeAllBookkeepingModals =
    closeAllBookkeepingModals;


/* ================================
   ABSCHLUSS-CHECK
================================ */

function bookkeepingFinalCheck(){

    const checks = {

        supabase:
            hasSupabase(),

        user:
            !!currentUser,

        employee:
            !!currentEmployee,

        bookings:
            Array.isArray(bookings),

        orders:
            Array.isArray(orderSettlements),

        /*
           Wichtig:
           Die Buchhaltung verwendet
           orderWorkers.
           Eine nicht vorhandene
           workers-Variable darf hier
           nicht geprüft werden.
        */

        orderWorkers:
            Array.isArray(orderWorkers),

        employees:
            Array.isArray(employees),

        savings:
            Array.isArray(savingsTransactions),

        cashChecks:
            Array.isArray(cashChecks),

        activityLogs:
            Array.isArray(activityLogs)
    };


    console.log(
        "Buchhaltung Systemcheck:",
        checks
    );


    return Object
        .values(checks)
        .every(Boolean);
}


/* ================================
   OPTIONALER START-CHECK
================================ */

window.bookkeepingFinalCheck =
    bookkeepingFinalCheck;


/* ================================
   ABSCHLUSS
================================ */

console.log(
    "Clan-Buchhaltung V0.1 Beta – JavaScript geladen."
);


/* =========================================================
   ENDE TEIL 12 / 12
   BUCHHALTUNG V0.1 BETA – KOMPLETT
========================================================= */
