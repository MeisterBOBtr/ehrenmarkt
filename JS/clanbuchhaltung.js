/* =========================================================
   EHRENMARKT – CLAN-BUCHHALTUNG
   V0.1 BETA – NEUES JS
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

const TABLE_LOGS = "buchhaltung_protokoll";
const TABLE_LOG = TABLE_LOGS;

const TABLE_ACTIVITY_LOG = TABLE_LOGS;

const TABLE_CASH =
    "buchhaltung_kassenabgleich";
const TABLE_CASH_CHECK = TABLE_CASH;


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
       Deutsche Eingaben unterstützen:

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
        typeof buchhaltungDB
            .from ===
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
       Gleichen Button erneut drücken:
       Bereich wieder schließen.
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


    return String(
        currentEmployee.rang ||
        currentEmployee.role ||
        ""
    ).trim();

}


function isStadtleitung(){

    return (
        getCurrentRank()
            .toLowerCase() ===
        "stadtleitung"
    );

}


function isLeitung(){

    const rank =
        getCurrentRank()
            .toLowerCase();


    return (
        rank === "leitung" ||
        rank === "stadtleitung"
    );

}


function isMitarbeiter(){

    return (
        !isLeitung() &&
        getCurrentRank()
            .toLowerCase() ===
        "mitarbeiter"
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
   INITIALER STATUS
========================================================= */

function renderPermissionState(){

    setText(
        "currentUserName",
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


    /*
       Alle Elemente, die explizit
       data-manager-only besitzen.
    */

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


    /*
       Elemente für Mitarbeiter-Einzahlung.
    */

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
   SPARKONTO – SPARZIEL AUS PROTOKOLL LADEN
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
                TABLE_LOG
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


    /*
       Das Sparziel wird in
       neue_werte gespeichert.
    */

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
   ENDE TEIL 1
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
       Alle Daten werden ausschließlich
       aus den Buchhaltungs-Tabellen geladen.

       Normale Portal-Aufträge werden hier
       NICHT automatisch übernommen.
    */


    const [
        bookingsResult,
        savingsResult,
        employeesResult,
        ordersResult,
        workersResult,
        cashResult,
        logsResult
    ] =
        await Promise.all([

            buchhaltungDB
                .from(
                    TABLE_BOOKINGS
                )
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:
                            false
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
                        ascending:
                            false
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
                        ascending:
                            true
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
                        ascending:
                            false
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
                        ascending:
                            false
                    }
                ),

            buchhaltungDB
                .from(
                    TABLE_CASH
                )
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:
                            false
                    }
                ),

            buchhaltungDB
                .from(
                    TABLE_LOG
                )
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:
                            false
                    }
                )

        ]);


    /*
       Fehler prüfen
    */

    if(
        bookingsResult.error
    ){

        throw bookingsResult.error;

    }


    if(
        savingsResult.error
    ){

        throw savingsResult.error;

    }


    if(
        employeesResult.error
    ){

        throw employeesResult.error;

    }


    if(
        ordersResult.error
    ){

        throw ordersResult.error;

    }


    if(
        workersResult.error
    ){

        throw workersResult.error;

    }


    if(
        cashResult.error
    ){

        throw cashResult.error;

    }


    if(
        logsResult.error
    ){

        throw logsResult.error;

    }


    /*
       Daten übernehmen
    */

    bookings =
        bookingsResult.data ||
        [];


    savingsTransactions =
        savingsResult.data ||
        [];


    employees =
        employeesResult.data ||
        [];


    orderSettlements =
        ordersResult.data ||
        [];


    orderWorkers =
        workersResult.data ||
        [];


    cashChecks =
        cashResult.data ||
        [];


    activityLogs =
        logsResult.data ||
        [];


    /*
       Sparziel separat aus dem
       Protokoll bestimmen.
    */

    await loadSavingsGoal();


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
                    ""
                )
                .trim()
                .toLowerCase();


            if(
                type ===
                "einzahlung"
            ){

                return total +
                    amount;

            }


            if(
                type ===
                "auszahlung"
            ){

                return total -
                    amount;

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
                    ""
                )
                .trim()
                .toLowerCase();


            if(
                type ===
                "einzahlung"
            ){

                return total +
                    amount;

            }


            if(
                type ===
                "auszahlung"
            ){

                return total -
                    amount;

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
                    order.gesamtbetrag
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

                        return sum +
                            numberValue(
                                worker.salary ??
                                worker.gehalt
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


            return total +
                Math.max(
                    0,
                    remaining
                );

        },
        0
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
                String(workerOrderId) ===
                String(orderId)
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


                return total +
                    numberValue(
                        booking.amount ??
                        booking.betrag
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


                return total +
                    numberValue(
                        booking.amount ??
                        booking.betrag
                    );

            },
            0
        );


    /*
       Gehälter
    */

    const totalWages =
        orderWorkers.reduce(
            (
                total,
                worker
            ) => {

                return total +
                    numberValue(
                        worker.salary ??
                        worker.gehalt
                    );

            },
            0
        );


    /*
       Clanausgaben aus manuellen
       Buchungen mit Kategorie
       "Clan-Ausgabe".
    */

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
                    "clanausgabe"
                ){

                    return total +
                        numberValue(
                            booking.amount ??
                            booking.betrag
                        );

                }


                return total;

            },
            0
        );


    /*
       Historischer Umsatz:

       Dieser Wert kommt ausschließlich
       aus manuell erfassten
       Auftragsabrechnungen.

       Eine normale Portal-Bestellung
       verändert diesen Wert NICHT.
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


                return total +
                    numberValue(
                        order.total ??
                        order.gesamtbetrag
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


    /*
       Sparziel
    */

    setText(
        "savingsGoalDisplay",
        money(
            savingsGoalValue
        )
    );


    updateSavingsGoalProgress();

}


/* =========================================================
   ÜBERSICHT AKTUALISIEREN
========================================================= */

function refreshFinancialOverview(){

    renderOverview();

    runFinancialControl();

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
   ENDE TEIL 2
========================================================= */

/* =========================================================
   BUCHUNGEN – MODAL ÖFFNEN
========================================================= */

window.openBookingModal =
function(){

    if(!canCreateDeposit()){

        alert(
            "Du hast keine Berechtigung für Buchungen."
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


    const createdBy =
        getElement(
            "bookingCreatedBy"
        );


    if(createdBy){

        createdBy.value =
            currentEmployee?.name ||
            currentUser?.email ||
            "";

    }


    const type =
        getElement(
            "bookingType"
        );


    /*
       Mitarbeiter können ausschließlich
       Einzahlung erfassen.
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

        /*
           Wichtig:
           Die Tabelle hat "Offen" als
           vorhandenen Default.
        */

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


    const createdBy =
        getElement(
            "bookingCreatedBy"
        );


    if(createdBy){

        createdBy.value =
            currentEmployee?.name ||
            currentUser?.email ||
            "";

    }

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
       Mitarbeiter dürfen ausschließlich
       Einzahlungen erstellen.
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
       und Stadtleitung.
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
       Auszahlung darf den aktuellen
       Clanstand nicht überschreiten.
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


    const createdBy =
        currentEmployee?.name ||
        currentUser?.email ||
        "Unbekannt";


    /*
       Exakt die Spalten der vorhandenen
       buchhaltung_buchungen-Tabelle.
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

        /*
           Nicht "Gebucht" erzwingen.
           Die vorhandene Tabelle verwendet
           "Offen" als Default.
        */

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


        /*
           Neue Buchung lokal übernehmen.
        */

        if(data){

            bookings.unshift(
                data
            );

        }


        /*
           Protokoll schreiben.
           Ein Fehler im Protokoll darf die
           bereits erfolgreiche Buchung
           nicht rückgängig machen.
        */

        await writeActivityLog(
            "Buchung",
            type +
            " · " +
            bookingNumber +
            " · " +
            money(amount),
            data
        );


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


    updateBookingSummary(
        bookings
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
        money(income)
    );


    setText(
        "bookingExpense",
        money(expenses)
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
   GEFILTERTE BUCHUNGSLISTE
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
                booking => `

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

                `
            )
            .join("");


    updateBookingSummary(
        list
    );

}


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
   ENDE TEIL 3
========================================================= */

/* =========================================================
   AUFTRAGSABRECHNUNG
========================================================= */

window.openOrderModal =
function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen erstellen."
        );

        return;

    }


    clearOrderForm();


    const date =
        getElement(
            "orderDate"
        );


    if(date){

        date.value =
            nowLocal();

    }


    const createdBy =
        getElement(
            "orderCreatedBy"
        );


    if(createdBy){

        createdBy.value =
            currentEmployee?.name ||
            currentUser?.email ||
            "";

    }


    currentWorkers = [];

    renderCurrentWorkers();

    updateWorkerTotals();


    openModal(
        "orderSettlementModal"
    );

};


/* =========================================================
   AUFTRAGSMODAL SCHLIESSEN
========================================================= */

window.closeOrderModal =
function(){

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


    const date =
        getElement(
            "orderDate"
        );


    if(date){

        date.value =
            nowLocal();

    }


    const status =
        getElement(
            "orderStatus"
        );


    if(status){

        status.value =
            "Offen";

    }


    const createdBy =
        getElement(
            "orderCreatedBy"
        );


    if(createdBy){

        createdBy.value =
            currentEmployee?.name ||
            currentUser?.email ||
            "";

    }


    currentWorkers = [];

    renderCurrentWorkers();

    updateWorkerTotals();

}


/* =========================================================
   ARBEITER HINZUFÜGEN
========================================================= */

window.addOrderWorker =
function(){

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


    if(!name){

        return;

    }


    const salaryInput =
        prompt(
            "Gehalt des Arbeiters in $:"
        );


    if(
        salaryInput ===
        null
    ){

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
            name.trim(),

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

window.removeOrderWorker =
function(index){

    if(!canManageBookkeeping()){

        return;

    }


    if(
        index < 0 ||
        index >=
        currentWorkers.length
    ){

        return;

    }


    currentWorkers.splice(
        index,
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


    updateWorkerTotals();

}


/* =========================================================
   ARBEITERTOTALS
========================================================= */

function calculateWorkerSalaryTotal(){

    return currentWorkers.reduce(
        (
            total,
            worker
        ) => {

            return total +
                numberValue(
                    worker.salary
                );

        },
        0
    );

}


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
   GESAMTBETRAG / CLANBETRAG LIVE BERECHNEN
========================================================= */

window.updateOrderTotals =
function(){

    updateWorkerTotals();

};


/* =========================================================
   AUFTRAGSABRECHNUNG SPEICHERN
========================================================= */

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
            "Die Verteilung überschreitet den Gesamtbetrag."
        );

        return;

    }


    const date =
        getValue(
            "orderDate"
        ) ||
        nowLocal();


    const createdBy =
        currentEmployee?.name ||
        currentUser?.email ||
        "Unbekannt";


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
            getValue(
                "orderStatus"
            ) ||
            "Offen",

        datum:
            date,

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy,

        notiz:
            getValue(
                "orderNote"
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

                alert(
                    "Die Auftragsabrechnung wurde gespeichert, aber die Arbeiter konnten nicht vollständig gespeichert werden.\n\n" +
                    workerError.message
                );

            }

        }


        /*
           Datenbankdaten neu laden.
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


        currentWorkers = [];

        clearOrderForm();

        closeOrderModal();


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

                    const workerList =
                        workers.filter(
                            worker =>
                                worker.auftragsabrechnung_id ===
                                order.id
                        );


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
   ENDE TEIL 4
========================================================= */

/* ================================
   TEIL 5 VON 12
   BUCHHALTUNG – SPARKONTO
================================ */

function getSavingsTransactions(){
    return Array.isArray(savingsTransactions)
        ? savingsTransactions
        : [];
}

function getSavingsBalance(){
    let balance = 0;

    getSavingsTransactions().forEach(entry => {
        const type = String(
            entry.art || entry.typ || entry.type || ""
        ).trim().toLowerCase();

        const amount = Number(
            entry.betrag || entry.amount || 0
        ) || 0;

        if(type === "einzahlung" || type === "deposit"){
            balance += amount;
        }

        if(type === "auszahlung" || type === "withdrawal"){
            balance -= amount;
        }
    });

    return balance;
}

function getSavingsDeposits(){
    return getSavingsTransactions()
        .filter(entry => {
            const type = String(
                entry.art || entry.typ || entry.type || ""
            ).trim().toLowerCase();

            return type === "einzahlung" || type === "deposit";
        })
        .reduce((sum, entry) => {
            return sum + (
                Number(entry.betrag || entry.amount || 0) || 0
            );
        }, 0);
}

function getSavingsWithdrawals(){
    return getSavingsTransactions()
        .filter(entry => {
            const type = String(
                entry.art || entry.typ || entry.type || ""
            ).trim().toLowerCase();

            return type === "auszahlung" || type === "withdrawal";
        })
        .reduce((sum, entry) => {
            return sum + (
                Number(entry.betrag || entry.amount || 0) || 0
            );
        }, 0);
}

function renderSavings(){
    const transactions = getSavingsTransactions();

    const balance = getSavingsBalance();
    const deposits = getSavingsDeposits();
    const withdrawals = getSavingsWithdrawals();

    setText("savingsBalance", money(balance));
    setText("savingsDeposits", money(deposits));
    setText("savingsWithdrawals", money(withdrawals));

    const goalElement = getElement("savingsGoal");
    const progressElement = getElement("savingsProgress");
    const progressTextElement = getElement("savingsProgressText");

    const goal = goalElement
        ? Number(
            String(goalElement.value || "")
                .replace(",", ".")
          ) || 0
        : 0;

    if(progressElement){
        const percent = goal > 0
            ? Math.min(100, Math.max(0, (balance / goal) * 100))
            : 0;

        progressElement.style.width = `${percent}%`;
    }

    if(progressTextElement){
        const percent = goal > 0
            ? Math.min(100, Math.max(0, (balance / goal) * 100))
            : 0;

        progressTextElement.textContent =
            goal > 0
                ? `${percent.toFixed(1)} %`
                : "0 %";
    }

    const tbody = getElement("savingsHistory");

    if(!tbody){
        return;
    }

    if(!transactions.length){
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Noch keine Sparkonto-Buchungen vorhanden.
                </td>
            </tr>
        `;
        return;
    }

    const sorted = [...transactions].sort((a,b) => {
        const dateA = new Date(
            a.created_at ||
            a.datum ||
            a.createdAt ||
            0
        ).getTime();

        const dateB = new Date(
            b.created_at ||
            b.datum ||
            b.createdAt ||
            0
        ).getTime();

        return dateB - dateA;
    });

    tbody.innerHTML = sorted.map(entry => {

        const type = String(
            entry.art ||
            entry.typ ||
            entry.type ||
            ""
        ).trim();

        const amount = Number(
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
            entry.erstellt_von ||
            entry.created_by_name ||
            entry.created_by ||
            "—";

        const date =
            entry.created_at ||
            entry.datum ||
            entry.createdAt;

        const isDeposit =
            type.toLowerCase() === "einzahlung" ||
            type.toLowerCase() === "deposit";

        return `
            <tr>
                <td>
                    ${escapeHtml(formatDate(date))}
                </td>

                <td>
                    <span class="status-badge ${
                        isDeposit
                            ? "status-paid"
                            : "status-open"
                    }">
                        ${escapeHtml(type || "—")}
                    </span>
                </td>

                <td class="${
                    isDeposit
                        ? "amount-positive"
                        : "amount-negative"
                }">
                    ${isDeposit ? "+" : "-"}${money(amount)}
                </td>

                <td>
                    ${escapeHtml(purpose)}
                </td>

                <td>
                    ${escapeHtml(
                        entry.buchungsnummer ||
                        entry.booking_number ||
                        "—"
                    )}
                </td>

                <td>
                    ${escapeHtml(createdBy)}
                </td>

                <td>
                    ${
                        isLeitung()
                            ? `
                                <button
                                    class="small-button danger"
                                    onclick="deleteSavingsEntry('${escapeHtml(
                                        entry.id || ""
                                    )}')"
                                >
                                    Storno
                                </button>
                              `
                            : "—"
                    }
                </td>
            </tr>
        `;
    }).join("");
}


/* ================================
   SPARKONTO MODAL
================================ */

function openSavingsModal(type = "Einzahlung"){
    if(!canManageBookkeeping()){
        showToast(
            "Keine Berechtigung für das Sparkonto.",
            "error"
        );
        return;
    }

    const modal = getElement("savingsModal");

    if(!modal){
        return;
    }

    const typeElement = getElement("savingsType");
    const amountElement = getElement("savingsAmount");
    const purposeElement = getElement("savingsPurpose");

    if(typeElement){
        typeElement.value = type;
    }

    if(amountElement){
        amountElement.value = "";
    }

    if(purposeElement){
        purposeElement.value = "";
    }

    modal.classList.add("active");
}

function closeSavingsModal(){
    const modal = getElement("savingsModal");

    if(modal){
        modal.classList.remove("active");
    }
}

async function saveSavingsEntry(){
    if(!canManageBookkeeping()){
        showToast(
            "Keine Berechtigung für Sparkonto-Buchungen.",
            "error"
        );
        return;
    }

    if(!hasSupabase()){
        showDatabaseError();
        return;
    }

    const type = getValue("savingsType") || "Einzahlung";

    const amount = numberValue(
        "savingsAmount"
    );

    const purpose =
        getValue("savingsPurpose").trim();

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

    const currentBalance = getSavingsBalance();

    const normalizedType =
        String(type).trim().toLowerCase();

    const isWithdrawal =
        normalizedType === "auszahlung";

    if(isWithdrawal && amount > currentBalance){
        showToast(
            "Die Auszahlung übersteigt das vorhandene Sparkonto-Guthaben.",
            "error"
        );
        return;
    }

    const bookingNumber =
        generateBookingNumber("SP");

    const payload = {
        buchungsnummer: bookingNumber,
        art: type,
        betrag: amount,
        zweck: purpose,
        erstellt_von: getCurrentUserName(),
        user_id: currentUser?.id || null,
        created_at: new Date().toISOString()
    };

    const { data, error } = await buchhaltungDB
        .from(TABLE_SAVINGS)
        .insert(payload)
        .select()
        .single();

    if(error){
        console.error(
            "Sparkonto-Buchung konnte nicht gespeichert werden:",
            error
        );

        showDatabaseError(error);
        return;
    }

    if(data){
        savingsTransactions.push(data);
    }

    await writeActivityLog(
        "Sparkonto",
        "Erstellt",
        bookingNumber,
        {
            art: type,
            betrag: amount,
            zweck: purpose
        }
    );

    closeSavingsModal();

    renderSavings();
    renderOverview();
    runFinancialControl();

    showToast(
        "Sparkonto-Buchung gespeichert.",
        "success"
    );
}


/* ================================
   SPARKONTO STORNO
================================ */

async function deleteSavingsEntry(id){
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

    const entry = getSavingsTransactions()
        .find(item => String(item.id) === String(id));

    if(!entry){
        showToast(
            "Sparkonto-Buchung nicht gefunden.",
            "error"
        );
        return;
    }

    const confirmed = confirm(
        "Diese Sparkonto-Buchung wirklich stornieren?"
    );

    if(!confirmed){
        return;
    }

    /*
       Keine stille Löschung:
       Die Buchung wird als Storno dokumentiert,
       sofern die Tabelle ein entsprechendes Feld besitzt.
    */

    const updatePayload = {};

    if("status" in entry){
        updatePayload.status = "Storniert";
    }

    if("storniert" in entry){
        updatePayload.storniert = true;
    }

    if("storniert_von" in entry){
        updatePayload.storniert_von =
            currentUser?.id || null;
    }

    if("storniert_am" in entry){
        updatePayload.storniert_am =
            new Date().toISOString();
    }

    if("notiz" in entry){
        updatePayload.notiz =
            `${entry.notiz || ""} | Storniert durch ${getCurrentUserName()}`;
    }

    let result;

    if(Object.keys(updatePayload).length){
        result = await buchhaltungDB
            .from(TABLE_SAVINGS)
            .update(updatePayload)
            .eq("id", id);
    }else{
        result = {
            error: new Error(
                "Keine Storno-Spalten in der Sparkonto-Tabelle vorhanden."
            )
        };
    }

    if(result.error){
        console.error(
            "Sparkonto-Storno fehlgeschlagen:",
            result.error
        );

        showDatabaseError(result.error);
        return;
    }

    await writeActivityLog(
        "Sparkonto",
        "Storniert",
        entry.buchungsnummer || id,
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

    await loadBookkeepingData();

    renderSavings();
    renderOverview();
    runFinancialControl();

    showToast(
        "Sparkonto-Buchung wurde storniert.",
        "success"
    );
}


/* ================================
   SPARKONTO ZIEL
================================ */

function saveSavingsGoal(){
    if(!canManageBookkeeping()){
        showToast(
            "Keine Berechtigung zum Ändern des Sparziels.",
            "error"
        );
        return;
    }

    const input = getElement("savingsGoal");

    if(!input){
        return;
    }

    const value = Number(
        String(input.value || "")
            .replace(",", ".")
    );

    if(value < 0){
        input.value = 0;
    }

    renderSavings();

    showToast(
        "Sparziel aktualisiert.",
        "success"
    );
}


/* ================================
   SPARKONTO AKTUALISIEREN
================================ */

async function refreshSavings(){
    if(!hasSupabase()){
        showDatabaseError();
        return;
    }

    await loadBookkeepingData();

    renderSavings();
    renderOverview();
    runFinancialControl();
}


/* ================================
   GESAMTVERMÖGEN
================================ */

function calculateTotalAssets(){
    const clanBalance =
        getCurrentClanBalance();

    const savingsBalance =
        getSavingsBalance();

    return clanBalance + savingsBalance;
}


/* ================================
   SPARKONTO BERECHTIGUNGEN
================================ */

function applySavingsPermissions(){
    const managementElements =
        document.querySelectorAll(
            "[data-savings-management]"
        );

    managementElements.forEach(element => {
        if(canManageBookkeeping()){
            element.removeAttribute("disabled");
            element.classList.remove("disabled");
        }else{
            element.setAttribute(
                "disabled",
                "disabled"
            );
            element.classList.add("disabled");
        }
    });
}


/* ================================
   SPARKONTO ÜBERSICHT
================================ */

function renderSavingsOverview(){
    const balance =
        getSavingsBalance();

    const deposits =
        getSavingsDeposits();

    const withdrawals =
        getSavingsWithdrawals();

    setText(
        "savingsOverviewBalance",
        money(balance)
    );

    setText(
        "savingsOverviewDeposits",
        money(deposits)
    );

    setText(
        "savingsOverviewWithdrawals",
        money(withdrawals)
    );

    setText(
        "savingsOverviewAssets",
        money(calculateTotalAssets())
    );
           }

/* ================================
   TEIL 6 VON 12
   BUCHHALTUNG – MITARBEITER
================================ */
function getCurrentUserName(){
    return (
        currentEmployee?.name ||
        currentEmployee?.username ||
        currentEmployee?.minecraft_name ||
        currentUser?.email ||
        "Unbekannt"
    );
}

function normalizePersonName(value){
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function getEmployeeStatistics(employeeName){
    const target = normalizePersonName(employeeName);

    let orders = 0;
    let wages = 0;
    let deposits = 0;
    let withdrawals = 0;
    let openAmount = 0;

    const employeeOrders = orderSettlements.filter(order => {
        const workersForOrder = workers.filter(worker => {
            return normalizePersonName(
                worker.arbeiter ||
                worker.employee_name ||
                worker.name ||
                ""
            ) === target;
        });

        return workersForOrder.length > 0;
    });

    orders = employeeOrders.length;

    workers.forEach(worker => {
        const workerName = normalizePersonName(
            worker.arbeiter ||
            worker.employee_name ||
            worker.name ||
            ""
        );

        if(workerName !== target){
            return;
        }

        wages += Number(
            worker.gehalt ||
            worker.salary ||
            worker.betrag ||
            0
        ) || 0;

        const order = orderSettlements.find(item => {
            return String(item.id) === String(
                worker.auftragsabrechnung_id ||
                worker.order_settlement_id ||
                worker.auftrag_id ||
                ""
            );
        });

        if(order){
            const status = String(
                order.status || ""
            ).trim().toLowerCase();

            if(
                status === "offen" ||
                status === "teilweise bezahlt"
            ){
                openAmount += Number(
                    worker.gehalt ||
                    worker.salary ||
                    worker.betrag ||
                    0
                ) || 0;
            }
        }
    });

    bookings.forEach(booking => {
        const type = String(
            booking.art ||
            booking.typ ||
            booking.type ||
            ""
        ).trim();

        const amount = Number(
            booking.betrag ||
            booking.amount ||
            0
        ) || 0;

        const from = normalizePersonName(
            booking.von ||
            booking.from ||
            ""
        );

        const to = normalizePersonName(
            booking.an ||
            booking.to ||
            ""
        );

        if(
            from === target &&
            type.toLowerCase() === "einzahlung"
        ){
            deposits += amount;
        }

        if(
            to === target &&
            type.toLowerCase() === "auszahlung"
        ){
            withdrawals += amount;
        }
    });

    return {
        orders,
        wages,
        deposits,
        withdrawals,
        openAmount
    };
}


/* ================================
   MITARBEITER-ZUSAMMENFASSUNG
================================ */

function renderEmployeeSummary(){
    const list = Array.isArray(employees)
        ? employees
        : [];

    let salaryTotal = 0;
    let depositTotal = 0;
    let withdrawalTotal = 0;
    let openTotal = 0;

    list.forEach(employee => {
        const name =
            employee.name ||
            employee.username ||
            employee.minecraft_name ||
            "Unbekannt";

        const stats =
            getEmployeeStatistics(name);

        salaryTotal += stats.wages;
        depositTotal += stats.deposits;
        withdrawalTotal += stats.withdrawals;
        openTotal += stats.openAmount;
    });

    setText(
        "employeeCount",
        String(list.length)
    );

    setText(
        "employeeSalaryTotal",
        money(salaryTotal)
    );

    setText(
        "employeeDepositTotal",
        money(depositTotal)
    );

    setText(
        "employeeWithdrawalTotal",
        money(withdrawalTotal)
    );

    setText(
        "employeeOpenTotal",
        money(openTotal)
    );
}


/* ================================
   MITARBEITER-ZEILEN
================================ */

function renderEmployeeRows(list){
    const tbody =
        getElement("employeeTableBody");

    if(!tbody){
        return;
    }

    if(!Array.isArray(list) || !list.length){
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Keine Mitarbeiter gefunden.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(employee => {

        const name =
            employee.name ||
            employee.username ||
            employee.minecraft_name ||
            "Unbekannt";

        const stats =
            getEmployeeStatistics(name);

        const note =
            employee.notiz ||
            employee.note ||
            employee.bemerkung ||
            "—";

        return `
            <tr>
                <td>
                    <strong>
                        ${escapeHtml(name)}
                    </strong>
                </td>

                <td>
                    ${stats.orders}
                </td>

                <td>
                    ${money(stats.wages)}
                </td>

                <td class="amount-positive">
                    ${money(stats.deposits)}
                </td>

                <td class="amount-negative">
                    ${money(stats.withdrawals)}
                </td>

                <td class="${
                    stats.openAmount > 0
                        ? "amount-negative"
                        : ""
                }">
                    ${money(stats.openAmount)}
                </td>

                <td>
                    ${escapeHtml(note)}
                </td>
            </tr>
        `;
    }).join("");
}


/* ================================
   MITARBEITER RENDER
================================ */

function renderEmployees(){
    const list = Array.isArray(employees)
        ? employees
        : [];

    renderEmployeeSummary();
    renderEmployeeRows(list);
}


/* ================================
   MITARBEITER FILTER
================================ */

function filterEmployees(){
    const searchInput =
        getElement("employeeSearch");

    const search = normalizePersonName(
        searchInput?.value || ""
    );

    const list = Array.isArray(employees)
        ? employees
        : [];

    if(!search){
        renderEmployeeRows(list);
        return;
    }

    const filtered = list.filter(employee => {

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
            normalizePersonName(name).includes(search) ||
            normalizePersonName(rank).includes(search) ||
            normalizePersonName(role).includes(search)
        );
    });

    renderEmployeeRows(filtered);
}


/* ================================
   MITARBEITER DETAIL
================================ */

function openEmployeeDetails(employeeName){
    const employee =
        employees.find(item => {

            const name =
                item.name ||
                item.username ||
                item.minecraft_name ||
                "";

            return normalizePersonName(name) ===
                normalizePersonName(employeeName);
        });

    if(!employee){
        showToast(
            "Mitarbeiter nicht gefunden.",
            "error"
        );
        return;
    }

    const stats =
        getEmployeeStatistics(employeeName);

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
        String(stats.orders)
    );

    setText(
        "employeeDetailSalary",
        money(stats.wages)
    );

    setText(
        "employeeDetailDeposits",
        money(stats.deposits)
    );

    setText(
        "employeeDetailWithdrawals",
        money(stats.withdrawals)
    );

    setText(
        "employeeDetailOpen",
        money(stats.openAmount)
    );

    const modal =
        getElement("employeeDetailModal");

    if(modal){
        modal.classList.add("active");
    }
}

function closeEmployeeDetails(){
    const modal =
        getElement("employeeDetailModal");

    if(modal){
        modal.classList.remove("active");
    }
}


/* ================================
   MITARBEITER AKTUALISIEREN
================================ */

async function refreshEmployees(){
    if(!hasSupabase()){
        showDatabaseError();
        return;
    }

    await loadBookkeepingData();

    renderEmployees();
    renderEmployeeSummary();
}


/* ================================
   MITARBEITER-BERECHTIGUNGEN
================================ */

function applyEmployeePermissions(){
    const employeeActions =
        document.querySelectorAll(
            "[data-employee-management]"
        );

    employeeActions.forEach(element => {

        if(canManageBookkeeping()){
            element.removeAttribute("disabled");
            element.classList.remove("disabled");
        }else{
            element.setAttribute(
                "disabled",
                "disabled"
            );
            element.classList.add("disabled");
        }
    });
}


/* ================================
   MITARBEITER AUSZAHLUNGS-CHECK
================================ */

function canPayEmployee(amount){
    const value =
        Number(amount) || 0;

    if(value <= 0){
        return false;
    }

    return value <= getCurrentClanBalance();
}


/* ================================
   MITARBEITER DATEN AKTUALISIEREN
================================ */

function updateEmployeeStatistics(){
    renderEmployeeSummary();
    renderEmployeeRows(
        Array.isArray(employees)
            ? employees
            : []
    );
                 }

/* ================================
   TEIL 7 VON 12
   BUCHHALTUNG – KASSENABGLEICH
================================ */

function getCashChecks(){
    return Array.isArray(cashChecks)
        ? cashChecks
        : [];
}


/* ================================
   KASSENABGLEICH BERECHNEN
================================ */

function calculateCashDifference(portalBalance, ingameBalance){
    const portal = Number(portalBalance) || 0;
    const ingame = Number(ingameBalance) || 0;

    return ingame - portal;
}


/* ================================
   KASSENABGLEICH RENDERN
================================ */

function renderCashChecks(){

    const list = getCashChecks();

    const tbody =
        getElement("cashCheckTableBody");

    if(!tbody){
        return;
    }

    if(!list.length){
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Noch kein Kassenabgleich vorhanden.
                </td>
            </tr>
        `;
        return;
    }

    const sorted = [...list].sort((a,b) => {

        const dateA = new Date(
            a.created_at ||
            a.datum ||
            a.createdAt ||
            0
        ).getTime();

        const dateB = new Date(
            b.created_at ||
            b.datum ||
            b.createdAt ||
            0
        ).getTime();

        return dateB - dateA;
    });

    tbody.innerHTML = sorted.map(entry => {

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

        const difference =
            Number(
                entry.abweichung
            );

        const calculatedDifference =
            Number.isFinite(difference)
                ? difference
                : calculateCashDifference(
                    portalBalance,
                    ingameBalance
                );

        const isCorrect =
            Math.abs(calculatedDifference) < 0.01;

        const note =
            entry.notiz ||
            entry.note ||
            "—";

        const createdBy =
            entry.erstellt_von ||
            entry.created_by_name ||
            entry.created_by ||
            "—";

        const date =
            entry.created_at ||
            entry.datum ||
            entry.createdAt;

        return `
            <tr>

                <td>
                    ${escapeHtml(
                        formatDate(date)
                    )}
                </td>

                <td>
                    ${money(portalBalance)}
                </td>

                <td>
                    ${money(ingameBalance)}
                </td>

                <td class="${
                    isCorrect
                        ? "amount-positive"
                        : "amount-negative"
                }">
                    ${
                        calculatedDifference > 0
                            ? "+"
                            : ""
                    }${money(calculatedDifference)}
                </td>

                <td>
                    <span class="status-badge ${
                        isCorrect
                            ? "status-paid"
                            : "status-open"
                    }">
                        ${
                            isCorrect
                                ? "Stimmt"
                                : "Abweichung"
                        }
                    </span>
                </td>

                <td>
                    ${escapeHtml(note)}
                </td>

                <td>
                    ${escapeHtml(createdBy)}
                </td>

            </tr>
        `;
    }).join("");
}


/* ================================
   KASSENABGLEICH MODAL
================================ */

function openCashCheckModal(){

    if(!canManageBookkeeping()){
        showToast(
            "Keine Berechtigung für den Kassenabgleich.",
            "error"
        );
        return;
    }

    const modal =
        getElement("cashCheckModal");

    if(!modal){
        return;
    }

    const portalInput =
        getElement("cashPortalBalance");

    const ingameInput =
        getElement("cashIngameBalance");

    const noteInput =
        getElement("cashCheckNote");

    if(portalInput){
        portalInput.value =
            getCurrentClanBalance().toFixed(2);
    }

    if(ingameInput){
        ingameInput.value = "";
    }

    if(noteInput){
        noteInput.value = "";
    }

    updateCashCheckDifference();

    modal.classList.add("active");
}


function closeCashCheckModal(){

    const modal =
        getElement("cashCheckModal");

    if(modal){
        modal.classList.remove("active");
    }
}


/* ================================
   ABWEICHUNG LIVE BERECHNEN
================================ */

function updateCashCheckDifference(){

    const portalInput =
        getElement("cashPortalBalance");

    const ingameInput =
        getElement("cashIngameBalance");

    const differenceElement =
        getElement("cashDifference");

    if(!portalInput || !ingameInput){
        return;
    }

    const portal =
        Number(
            String(
                portalInput.value || ""
            ).replace(",", ".")
        ) || 0;

    const ingame =
        Number(
            String(
                ingameInput.value || ""
            ).replace(",", ".")
        ) || 0;

    const difference =
        calculateCashDifference(
            portal,
            ingame
        );

    if(differenceElement){

        differenceElement.textContent =
            money(difference);

        differenceElement.classList.remove(
            "amount-positive",
            "amount-negative"
        );

        if(Math.abs(difference) < 0.01){
            differenceElement.classList.add(
                "amount-positive"
            );
        }else{
            differenceElement.classList.add(
                "amount-negative"
            );
        }
    }

    return difference;
}


/* ================================
   KASSENABGLEICH SPEICHERN
================================ */

async function saveCashCheck(){

    if(!canManageBookkeeping()){
        showToast(
            "Keine Berechtigung für den Kassenabgleich.",
            "error"
        );
        return;
    }

    if(!hasSupabase()){
        showDatabaseError();
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
        ).trim();

    if(ingameBalance < 0){
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
        generateBookingNumber("KA");

    const payload = {
        buchungsnummer: bookingNumber,
        portalstand: portalBalance,
        ingame_stand: ingameBalance,
        abweichung: difference,
        notiz: note || null,
        erstellt_von: getCurrentUserName(),
        user_id: currentUser?.id || null,
        created_at: new Date().toISOString()
    };

    const {
        data,
        error
    } = await buchhaltungDB
        .from(TABLE_CASH_CHECK)
        .insert(payload)
        .select()
        .single();

    if(error){

        console.error(
            "Kassenabgleich konnte nicht gespeichert werden:",
            error
        );

        showDatabaseError(error);
        return;
    }

    if(data){
        cashChecks.push(data);
    }

    await writeActivityLog(
        "Kassenabgleich",
        "Erstellt",
        bookingNumber,
        {
            portalstand: portalBalance,
            ingame_stand: ingameBalance,
            abweichung: difference,
            notiz: note
        }
    );

    closeCashCheckModal();

    renderCashChecks();
    runFinancialControl();

    if(Math.abs(difference) >= 0.01){

        showToast(
            `Kassenabgleich gespeichert. Abweichung: ${money(difference)}`,
            "warning"
        );

    }else{

        showToast(
            "Kassenabgleich gespeichert. Keine Abweichung.",
            "success"
        );
    }
}


/* ================================
   LETZTEN KASSENABGLEICH
================================ */

function getLatestCashCheck(){

    const list =
        getCashChecks();

    if(!list.length){
        return null;
    }

    return [...list].sort((a,b) => {

        const dateA = new Date(
            a.created_at ||
            a.datum ||
            a.createdAt ||
            0
        ).getTime();

        const dateB = new Date(
            b.created_at ||
            b.datum ||
            b.createdAt ||
            0
        ).getTime();

        return dateB - dateA;

    })[0];
}


/* ================================
   KASSENSTATUS
================================ */

function getCashCheckStatus(){

    const latest =
        getLatestCashCheck();

    if(!latest){
        return {
            status: "unknown",
            difference: 0
        };
    }

    const difference =
        Number(
            latest.abweichung
        ) || 0;

    if(Math.abs(difference) < 0.01){

        return {
            status: "ok",
            difference: 0
        };

    }

    return {
        status: "warning",
        difference
    };
}


/* ================================
   KASSENSTATUS ANZEIGEN
================================ */

function renderCashCheckStatus(){

    const status =
        getCashCheckStatus();

    const element =
        getElement("cashCheckStatus");

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
            "Kassenstand stimmt";

        element.classList.add(
            "status-paid"
        );

        return;
    }

    if(status.status === "warning"){

        element.textContent =
            `Abweichung ${money(status.difference)}`;

        element.classList.add(
            "status-warning"
        );

        return;
    }

    element.textContent =
        "Noch kein Abgleich";
}


/* ================================
   KASSENABGLEICH AKTUALISIEREN
================================ */

async function refreshCashChecks(){

    if(!hasSupabase()){
        showDatabaseError();
        return;
    }

    await loadBookkeepingData();

    renderCashChecks();
    renderCashCheckStatus();
    runFinancialControl();
                           }

/* ================================
   TEIL 8 VON 12
   BUCHHALTUNG – PROTOKOLL / AUDIT
================================ */

function getActivityLogs(){
    return Array.isArray(activityLogs)
        ? activityLogs
        : [];
}


/* ================================
   PROTOKOLL RENDERN
================================ */

function renderActivityLogs(){

    const list = getActivityLogs();

    const tbody =
        getElement("activityLogTableBody");

    if(!tbody){
        return;
    }

    if(!list.length){
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Noch keine Protokolleinträge vorhanden.
                </td>
            </tr>
        `;
        return;
    }

    const sorted = [...list].sort((a,b) => {

        const dateA = new Date(
            a.created_at ||
            a.datum ||
            a.createdAt ||
            0
        ).getTime();

        const dateB = new Date(
            b.created_at ||
            b.datum ||
            b.createdAt ||
            0
        ).getTime();

        return dateB - dateA;
    });

    tbody.innerHTML = sorted.map(entry => {

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
            entry.erstellt_von ||
            entry.created_by_name ||
            entry.created_by ||
            "—";

        const details =
            entry.details ||
            entry.notiz ||
            entry.note ||
            "";

        let detailsText = details;

        if(typeof details === "object"){
            try{
                detailsText =
                    JSON.stringify(details);
            }catch(error){
                detailsText = "—";
            }
        }

        return `
            <tr>

                <td>
                    ${escapeHtml(
                        formatDate(date)
                    )}
                </td>

                <td>
                    ${escapeHtml(area)}
                </td>

                <td>
                    ${escapeHtml(action)}
                </td>

                <td>
                    ${escapeHtml(reference)}
                </td>

                <td>
                    ${escapeHtml(createdBy)}
                </td>

                <td>
                    ${escapeHtml(detailsText || "—")}
                </td>

            </tr>
        `;
    }).join("");
}


/* ================================
   PROTOKOLL SCHREIBEN
================================ */

async function writeActivityLog(
    area,
    action,
    reference = "",
    details = {}
){

    if(!hasSupabase()){
        return;
    }

    const payload = {
        bereich: area || "Buchhaltung",
        aktion: action || "Unbekannt",
        referenz: reference || null,
        details: details || {},
        erstellt_von:
            getCurrentUserName(),
        user_id:
            currentUser?.id || null,
        created_at:
            new Date().toISOString()
    };

    const {
        data,
        error
    } = await buchhaltungDB
        .from(TABLE_ACTIVITY_LOG)
        .insert(payload)
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
        activityLogs.unshift(data);
    }

    return data;
}


/* ================================
   PROTOKOLL FILTER
================================ */

function filterActivityLogs(){

    const searchInput =
        getElement("activityLogSearch");

    const search =
        normalizePersonName(
            searchInput?.value || ""
        );

    const typeInput =
        getElement("activityLogType");

    const selectedType =
        String(
            typeInput?.value || ""
        ).trim().toLowerCase();

    const list =
        getActivityLogs();

    const filtered =
        list.filter(entry => {

            const action =
                String(
                    entry.aktion ||
                    entry.action ||
                    ""
                ).toLowerCase();

            const area =
                String(
                    entry.bereich ||
                    entry.area ||
                    ""
                ).toLowerCase();

            const reference =
                String(
                    entry.referenz ||
                    entry.reference ||
                    entry.buchungsnummer ||
                    entry.auftragsnummer ||
                    ""
                ).toLowerCase();

            const createdBy =
                normalizePersonName(
                    entry.erstellt_von ||
                    entry.created_by_name ||
                    entry.created_by ||
                    ""
                );

            const searchMatch =
                !search ||
                action.includes(search) ||
                area.includes(search) ||
                reference.includes(search) ||
                createdBy.includes(search);

            const typeMatch =
                !selectedType ||
                action === selectedType;

            return searchMatch && typeMatch;
        });

    renderActivityLogRows(filtered);
}


/* ================================
   FILTER-RENDERER
================================ */

function renderActivityLogRows(list){

    const tbody =
        getElement("activityLogTableBody");

    if(!tbody){
        return;
    }

    if(!Array.isArray(list) || !list.length){

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Keine passenden Protokolle gefunden.
                </td>
            </tr>
        `;

        return;
    }

    const sorted =
        [...list].sort((a,b) => {

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
        });

    tbody.innerHTML =
        sorted.map(entry => {

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
                entry.erstellt_von ||
                entry.created_by_name ||
                entry.created_by ||
                "—";

            let details =
                entry.details ||
                entry.notiz ||
                entry.note ||
                "";

            if(typeof details === "object"){
                try{
                    details =
                        JSON.stringify(details);
                }catch(error){
                    details = "—";
                }
            }

            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            formatDate(date)
                        )}
                    </td>

                    <td>
                        ${escapeHtml(area)}
                    </td>

                    <td>
                        ${escapeHtml(action)}
                    </td>

                    <td>
                        ${escapeHtml(reference)}
                    </td>

                    <td>
                        ${escapeHtml(createdBy)}
                    </td>

                    <td>
                        ${escapeHtml(
                            details || "—"
                        )}
                    </td>

                </tr>
            `;

        }).join("");
}


/* ================================
   PROTOKOLL AKTUALISIEREN
================================ */

async function refreshActivityLogs(){

    if(!hasSupabase()){
        showDatabaseError();
        return;
    }

    await loadBookkeepingData();

    renderActivityLogs();
}


/* ================================
   PROTOKOLL SUCHFELD ZURÜCKSETZEN
================================ */

function clearActivityLogFilter(){

    const search =
        getElement("activityLogSearch");

    const type =
        getElement("activityLogType");

    if(search){
        search.value = "";
    }

    if(type){
        type.value = "";
    }

    renderActivityLogs();
}


/* ================================
   AUDIT-INFORMATIONEN
================================ */

function getAuditSummary(){

    const list =
        getActivityLogs();

    let created = 0;
    let cancelled = 0;
    let changed = 0;

    list.forEach(entry => {

        const action =
            String(
                entry.aktion ||
                entry.action ||
                ""
            ).trim().toLowerCase();

        if(
            action.includes("erstellt") ||
            action.includes("erstellt")
        ){
            created++;
        }

        if(
            action.includes("storniert") ||
            action.includes("storno")
        ){
            cancelled++;
        }

        if(
            action.includes("geändert") ||
            action.includes("bearbeitet") ||
            action.includes("updated")
        ){
            changed++;
        }
    });

    return {
        total: list.length,
        created,
        cancelled,
        changed
    };
}


/* ================================
   AUDIT-ÜBERSICHT
================================ */

function renderAuditSummary(){

    const summary =
        getAuditSummary();

    setText(
        "auditTotal",
        String(summary.total)
    );

    setText(
        "auditCreated",
        String(summary.created)
    );

    setText(
        "auditChanged",
        String(summary.changed)
    );

    setText(
        "auditCancelled",
        String(summary.cancelled)
    );
}


/* ================================
   STORNO NICHT STILL LÖSCHEN
================================ */

function canCancelBookkeepingEntry(){

    return canManageBookkeeping();
}


/* ================================
   AUDIT AKTUALISIEREN
================================ */

function refreshAuditView(){

    renderActivityLogs();
    renderAuditSummary();
       }

/* ================================
   TEIL 9 VON 12
   BUCHHALTUNG – MONATSAUSWERTUNG
================================ */

function getMonthlyDateRange(){

    const monthInput =
        getElement("monthlyPeriod");

    if(!monthInput){
        return null;
    }

    const value =
        String(
            monthInput.value || ""
        ).trim();

    if(!value){
        return null;
    }

    const parts =
        value.split("-");

    if(parts.length !== 2){
        return null;
    }

    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);

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

function isDateInMonthlyRange(
    value,
    range
){

    if(!range){
        return false;
    }

    if(!value){
        return false;
    }

    const date =
        new Date(value);

    if(
        Number.isNaN(
            date.getTime()
        )
    ){
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

    workers.forEach(worker => {

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

/* ================================
   TEIL 10 VON 12
   BUCHHALTUNG – KONTROLLE & WARNUNGEN
================================ */

function getFinancialWarnings(){

    const warnings = [];

    /* -------------------------------
       1. KASSENABGLEICH
    -------------------------------- */

    const cashStatus =
        getCashCheckStatus();

    if(
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
                workers.filter(worker => {

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
                    title: "Auftragsabrechnung fehlerhaft",
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
        [...bookings].sort((a,b) => {

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
                    title: "Auszahlung über Clanstand",
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
        getElement("financialWarningCount");

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

    const orderWorkers =
        workers.filter(worker => {

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
        orderWorkers.reduce(
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
        getElement("financialControlStatus");

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

/* ================================
   TEIL 11 VON 12
   BUCHHALTUNG – BERECHTIGUNGEN,
   NAVIGATION & GESAMT-AKTUALISIERUNG
================================ */


/* ================================
   RANG ERMITTELN
================================ */

function getCurrentRank(){

    if(!currentEmployee){
        return "";
    }

    return String(
        currentEmployee.rang || ""
    ).trim();
}


/* ================================
   LEITUNG PRÜFEN
================================ */

function isLeitung(){

    const rank =
        getCurrentRank();

    return (
        rank === "Leitung" ||
        rank === "Stadtleitung"
    );
}


/* ================================
   MITARBEITER PRÜFEN
================================ */

function isMitarbeiter(){

    const rank =
        getCurrentRank();

    return rank === "Mitarbeiter";
}


/* ================================
   BUCHHALTUNG VERWALTEN
================================ */

function canManageBookkeeping(){

    return isLeitung();
}


/* ================================
   EINZAHLUNG ERSTELLEN
================================ */

function canCreateDeposit(){

    return (
        isLeitung() ||
        isMitarbeiter()
    );
}


/* ================================
   BEREICH EINBLENDEN
================================ */

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

    document
        .querySelectorAll(".open-area")
        .forEach(area => {

            area.classList.remove(
                "active"
            );
        });

    document
        .querySelectorAll(".nav-button")
        .forEach(btn => {

            btn.classList.remove(
                "active"
            );
        });

    selected.classList.add(
        "active"
    );

    if(button){

        button.classList.add(
            "active"
        );
    }

    setTimeout(() => {

        selected.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);
};


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


    /*
       Mitarbeiter dürfen ausschließlich
       Einzahlungen erstellen.

       Verwaltungsfunktionen bleiben
       für Mitarbeiter gesperrt.
    */

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

    /*
       Wichtig:
       Die Buchungs-Zusammenfassung wird
       separat aktualisiert.
    */

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

    window.showArea(
        areaId,
        button
    );

    /*
       Bei Öffnen eines Bereichs
       werden die sichtbaren Daten
       erneut geprüft.
    */

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

/* ================================
   TEIL 12 VON 12
   BUCHHALTUNG – ABSCHLUSS,
   HILFSFUNKTIONEN & FEHLERBEHANDLUNG
================================ */


/* ================================
   BUCHUNGS-ZUSAMMENFASSUNG
================================ */

function updateBookingSummary(list){

    const entries =
        Array.isArray(list)
            ? list
            : [];

    let income = 0;
    let expense = 0;

    entries.forEach(entry => {

        const type =
            String(
                entry.art ||
                entry.typ ||
                entry.type ||
                ""
            ).trim().toLowerCase();

        const amount =
            Number(
                entry.betrag ||
                entry.amount ||
                0
            ) || 0;

        if(type === "einzahlung"){
            income += amount;
        }

        if(type === "auszahlung"){
            expense += amount;
        }
    });

    const net =
        income - expense;

    setText(
        "bookingIncome",
        money(income)
    );

    setText(
        "bookingExpense",
        money(expense)
    );

    setText(
        "bookingNet",
        money(net)
    );

    setText(
        "bookingCount",
        String(entries.length)
    );

    const netElement =
        getElement("bookingNet");

    if(netElement){

        netElement.classList.remove(
            "amount-positive",
            "amount-negative"
        );

        if(net > 0){

            netElement.classList.add(
                "amount-positive"
            );

        }else if(net < 0){

            netElement.classList.add(
                "amount-negative"
            );
        }
    }
}


/* ================================
   AKTUELLEN CLANSTAND
================================ */

function getCurrentClanBalance(){

    let balance = 0;

    bookings.forEach(entry => {

        const type =
            String(
                entry.art ||
                entry.typ ||
                entry.type ||
                ""
            ).trim().toLowerCase();

        const amount =
            Number(
                entry.betrag ||
                entry.amount ||
                0
            ) || 0;

        if(type === "einzahlung"){

            balance += amount;

        }else if(type === "auszahlung"){

            balance -= amount;
        }
    });

    return balance;
}


/* ================================
   FINANZÜBERSICHT
================================ */

function calculateFinancialOverview(){

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalWages = 0;
    let totalClanExpenses = 0;

    bookings.forEach(entry => {

        const type =
            String(
                entry.art ||
                entry.typ ||
                entry.type ||
                ""
            ).trim().toLowerCase();

        const category =
            String(
                entry.kategorie ||
                entry.category ||
                ""
            ).trim().toLowerCase();

        const amount =
            Number(
                entry.betrag ||
                entry.amount ||
                0
            ) || 0;

        if(type === "einzahlung"){
            totalDeposits += amount;
        }

        if(type === "auszahlung"){

            totalWithdrawals += amount;

            if(
                category === "gehalt" ||
                category === "arbeitergehalt"
            ){

                totalWages += amount;

            }else if(
                category === "clan-ausgabe" ||
                category === "clanausgabe" ||
                category === "material" ||
                category === "sonstiges"
            ){

                totalClanExpenses += amount;
            }
        }
    });


    /*
       Historischer Gesamtumsatz:
       Dieser Wert kommt aus den manuellen
       Auftragsabrechnungen und NICHT aus
       normalen Portal-Aufträgen.
    */

    const historicalRevenue =
        orderSettlements.reduce(
            (sum, order) => {

                return sum + (
                    Number(
                        order.gesamtbetrag ||
                        order.total_amount ||
                        order.betrag ||
                        0
                    ) || 0
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
        orderSettlements.reduce(
            (sum, order) => {

                const status =
                    String(
                        order.status || ""
                    ).trim().toLowerCase();

                if(
                    status !== "offen" &&
                    status !== "teilweise bezahlt"
                ){
                    return sum;
                }

                return sum + (
                    Number(
                        order.offener_betrag ||
                        order.open_amount ||
                        order.gesamtbetrag ||
                        order.total_amount ||
                        0
                    ) || 0
                );

            },
            0
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
        openAmount,
        totalBookings:
            bookings.length,
        orderCount:
            orderSettlements.length
    };
}


/* ================================
   ÜBERSICHT RENDERN
================================ */

function renderOverview(){

    const data =
        calculateFinancialOverview();


    setText(
        "currentClanBalance",
        money(
            data.currentClanBalance
        )
    );

    setText(
        "historicalRevenue",
        money(
            data.historicalRevenue
        )
    );

    setText(
        "totalRevenue",
        money(
            data.historicalRevenue
        )
    );

    setText(
        "totalDeposits",
        money(
            data.totalDeposits
        )
    );

    setText(
        "totalWithdrawals",
        money(
            data.totalWithdrawals
        )
    );

    setText(
        "totalWages",
        money(
            data.totalWages
        )
    );

    setText(
        "totalClanExpenses",
        money(
            data.totalClanExpenses
        )
    );

    setText(
        "savingsBalance",
        money(
            data.savingsBalance
        )
    );

    setText(
        "openAmount",
        money(
            data.openAmount
        )
    );

    setText(
        "totalAssets",
        money(
            data.totalAssets
        )
    );

    setText(
        "totalBookings",
        String(
            data.totalBookings
        )
    );

    setText(
        "orderCount",
        String(
            data.orderCount
        )
    );


    const balanceElement =
        getElement(
            "currentClanBalance"
        );

    if(balanceElement){

        balanceElement.classList.remove(
            "amount-positive",
            "amount-negative"
        );

        if(
            data.currentClanBalance > 0
        ){

            balanceElement.classList.add(
                "amount-positive"
            );

        }else if(
            data.currentClanBalance < 0
        ){

            balanceElement.classList.add(
                "amount-negative"
            );
        }
    }
}


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
   GLOBALE AKTUALISIERUNG
================================ */

window.reloadBookkeepingPage =
    reloadBookkeepingPage;

window.closeAllBookkeepingModals =
    closeAllBookkeepingModals;

window.updateBookingSummary =
    updateBookingSummary;

window.renderOverview =
    renderOverview;

window.getCurrentClanBalance =
    getCurrentClanBalance;

window.calculateFinancialOverview =
    calculateFinancialOverview;

window.runFinancialControl =
    runFinancialControl;


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

        workers:
            Array.isArray(workers),

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
   ENDE DER BUCHHALTUNG
================================ */

console.log(
    "Clan-Buchhaltung V0.1 Beta – JavaScript geladen."
);


/* Inline status instead of popup/toast overlays. */
function showToast(message,type="info"){
  const target=document.getElementById("connection") || document.getElementById("incomeStatus") || document.getElementById("loanStatus");
  if(target){ target.style.display="block"; target.textContent=String(message||""); target.className="info-banner "+(type==="error"?"danger-text":type==="success"?"success-text":""); }
}

/* =========================================================
   EHRENMARKT V1 – STABILISIERUNG + NEUE FUNKTIONEN
   Dieses Ende überschreibt nur die problematischen Alt-Funktionen.
========================================================= */

let v1Donations = [];
let v1Payouts = [];
let v1Loans = [];
let v1Rates = [];
let v1Warnings = [];
let v1Income = [];

function v1Status(id, message, ok=true){
  const el=document.getElementById(id); if(!el) return;
  el.style.display='block';
  el.innerHTML='<strong class="'+(ok?'success-text':'danger-text')+'">'+escapeHtml(message)+'</strong>';
}

function v1Confirm(text){
  return window.confirm(text+'\n\nDiese Buchung kann nicht normal storniert werden.');
}

async function notifyBookkeeping(payload){
  try{
    if(!buchhaltungDB || !currentUser) return {ok:false, skipped:true};
    const {data,error}=await buchhaltungDB.functions.invoke('buchhaltung',{body:payload});
    if(error){ console.warn('Discord-Benachrichtigung:',error); return {ok:false,error}; }
    return {ok:true,data};
  }catch(error){ console.warn('Discord-Benachrichtigung:',error); return {ok:false,error}; }
}

function v1Rank(){ return String(currentEmployee?.rang || '').trim().toLowerCase(); }
function v1IsStadt(){ return v1Rank()==='stadtleitung'; }
function v1IsLeitung(){ return v1Rank()==='leitung' || v1IsStadt(); }
function v1IsMember(){ return v1Rank()==='mitglied'; }
function v1CanManage(){ return v1IsLeitung(); }

function v1EmployeeName(id){
  const e=employees.find(x=>String(x.user_id)===String(id));
  return e?.name || '—';
}

async function v1Safe(table, orderColumn='created_at'){
  try{
    const q=buchhaltungDB.from(table).select('*');
    const {data,error}=await q.order(orderColumn,{ascending:false});
    if(error){ console.warn(table,error); return []; }
    return data||[];
  }catch(e){ console.warn(table,e); return []; }
}

async function loadBookkeepingData(){
  if(!hasSupabase()) return false;
  const results=await Promise.all([
    v1Safe(TABLE_BOOKINGS,'datum'),
    v1Safe(TABLE_SAVINGS,'datum'),
    v1Safe(TABLE_EMPLOYEES,'name'),
    v1Safe(TABLE_ORDERS,'datum'),
    v1Safe(TABLE_ORDER_WORKERS,'created_at'),
    v1Safe(TABLE_CASH,'datum'),
    v1Safe(TABLE_ACTIVITY_LOG,'created_at'),
    v1Safe('buchhaltung_spenden','created_at'),
    v1Safe('buchhaltung_auszahlungen','created_at'),
    v1Safe('buchhaltung_darlehen','created_at'),
    v1Safe('buchhaltung_darlehen_raten','created_at'),
    v1Safe('buchhaltung_darlehen_mahnungen','created_at'),
    v1Safe('buchhaltung_einnahmen','created_at')
  ]);
  [bookings,savingsTransactions,employees,orderSettlements,orderWorkers,cashChecks,activityLogs,v1Donations,v1Payouts,v1Loans,v1Rates,v1Warnings,v1Income]=results;
  try{ await loadSavingsGoal(); }catch(e){}
  return true;
}

function v1OrderIncome(){
  return orderSettlements.reduce((s,o)=>{
    const status=String(o.status||'').toLowerCase();
    if(status==='storniert') return s;
    return s+numberValue(o.gesamtbetrag ?? o.total_amount ?? o.total ?? o.betrag);
  },0);
}
function v1DonationIncome(){ return v1Donations.reduce((s,x)=>s+numberValue(x.betrag??x.amount),0); }
function v1GenericIncome(){ return v1Income.reduce((s,x)=>s+numberValue(x.betrag??x.amount),0); }
function v1BookingIncome(){ return bookings.reduce((s,x)=>String(x.art??x.type??x.typ??'').toLowerCase()==='einzahlung'?s+numberValue(x.betrag??x.amount):s,0); }
function v1LoanIncome(){
  return v1Rates.filter(r=>String(r.status||'').toLowerCase()==='bezahlt').reduce((s,r)=>s+numberValue(r.betrag??r.amount),0)
    + v1Warnings.filter(w=>numberValue(w.mahngebuehr??w.fee)>0).reduce((s,w)=>s+numberValue(w.mahngebuehr??w.fee),0);
}
function v1AllIncome(){ return v1OrderIncome()+v1DonationIncome()+v1GenericIncome()+v1BookingIncome()+v1LoanIncome(); }
function v1Wages(){ return v1Payouts.filter(x=>String(x.typ||x.type||'').toLowerCase()==='monatsgehalt').reduce((s,x)=>s+numberValue(x.betrag??x.amount),0)+orderWorkers.reduce((s,x)=>s+numberValue(x.gehalt??x.salary),0); }
function v1OtherExpenses(){ return v1Payouts.filter(x=>String(x.typ||x.type||'').toLowerCase()!=='monatsgehalt').reduce((s,x)=>s+numberValue(x.betrag??x.amount),0)+bookings.reduce((s,x)=>String(x.art??x.type??x.typ??'').toLowerCase()==='auszahlung'?s+numberValue(x.betrag??x.amount):s,0); }
function v1SavingsBalance(){ return savingsTransactions.reduce((s,x)=>String(x.art??x.type??'').toLowerCase()==='einzahlung'?s+numberValue(x.betrag??x.amount):s-numberValue(x.betrag??x.amount),0); }
function v1CurrentCash(){
  // Cash is actual available clan cash. Savings are deliberately separate.
  return v1AllIncome() - v1Wages() - v1OtherExpenses() - Math.max(0,v1SavingsBalance());
}
function v1TotalWealth(){
  // Historical wealth never decreases because of expenses. Savings are included, but internal savings transfers do not create wealth.
  return v1AllIncome();
}
function v1OpenLoans(){ return v1Loans.filter(x=>!['abgeschlossen','geschlossen'].includes(String(x.status||'').toLowerCase())); }
function v1OpenLoanSum(){ return v1OpenLoans().reduce((s,x)=>s+numberValue(x.offenbetrag??x.remaining_amount??x.restbetrag),0); }
function v1DueInterest(){
  return v1Loans.filter(x=>String(x.status||'').toLowerCase()!=='abgeschlossen').reduce((s,x)=>{
    const total=numberValue(x.gesamtrueckzahlung??x.total_repayment);
    const principal=numberValue(x.originalbetrag??x.original_amount);
    const paid=numberValue(x.getilgt??x.repaid_amount);
    return s+Math.max(0,total-principal-paid);
  },0);
}
function v1LateFees(){ return v1Warnings.reduce((s,x)=>s+numberValue(x.mahngebuehr??x.fee),0); }

function calculateFinancialOverview(){
  return {
    currentClanBalance:v1CurrentCash(),
    historicalRevenue:v1TotalWealth(),
    totalIncome:v1AllIncome(),
    totalDeposits:v1BookingIncome()+v1DonationIncome()+v1GenericIncome(),
    totalExpenses:v1Wages()+v1OtherExpenses(),
    totalWages:v1Wages(),
    totalClanExpenses:v1OtherExpenses(),
    savingsBalance:v1SavingsBalance(),
    totalAssets:v1TotalWealth(),
    openAmount:v1OpenLoanSum(),
    openLoans:v1OpenLoanSum(),
    dueInterest:v1DueInterest(),
    lateFees:v1LateFees(),
    totalBookings:bookings.length,
    orderCount:orderSettlements.length
  };
}

function renderOverview(){
  const d=calculateFinancialOverview();
  setText('currentClanBalance',money(d.currentClanBalance));
  setText('totalIncome',money(d.totalIncome));
  setText('totalDeposits',money(d.totalDeposits));
  setText('totalExpenses',money(d.totalExpenses));
  setText('totalWages',money(d.totalWages));
  setText('totalClanExpenses',money(d.totalClanExpenses));
  setText('totalSavings',money(d.savingsBalance));
  setText('openLoans',money(d.openLoans));
  setText('dueInterest',money(d.dueInterest));
  setText('lateFees',money(d.lateFees));
  setText('totalAssets',money(d.totalAssets));
}
function getCurrentClanBalance(){ return v1CurrentCash(); }

function fillV1EmployeeSelects(){
  const opts=employees.filter(e=>e.user_id).map(e=>'<option value="'+escapeHtml(e.user_id)+'">'+escapeHtml(e.name||e.username||e.user_id)+'</option>').join('');
  const payout=document.getElementById('payoutEmployee'); if(payout) payout.innerHTML='<option value="">Mitarbeiter auswählen</option>'+opts;
  const loan=document.getElementById('loanMember'); if(loan) loan.innerHTML='<option value="">Mitglied auswählen</option>'+employees.filter(e=>String(e.rang||'').toLowerCase()==='mitglied').map(e=>'<option value="'+escapeHtml(e.user_id)+'">'+escapeHtml(e.name||e.username)+'</option>').join('');
}

function renderIncome(){
  const body=document.getElementById('incomeTableBody'); if(!body)return;
  const rows=[...v1Donations.map(x=>({...x,_type:'Spende',_amount:x.betrag,_from:x.mitarbeiter_name||v1EmployeeName(x.mitarbeiter_id),_purpose:x.zweck})),...v1Income.map(x=>({...x,_type:x.typ||'Sonstige Einnahme',_amount:x.betrag,_from:x.erstellt_von_name||v1EmployeeName(x.erstellt_von),_purpose:x.zweck}))].sort((a,b)=>new Date(b.created_at||b.datum)-new Date(a.created_at||a.datum));
  body.innerHTML=rows.length?rows.map(x=>'<tr><td>'+escapeHtml(formatDate(x.created_at||x.datum))+'</td><td>'+escapeHtml(x._type)+'</td><td>'+money(x._amount)+'</td><td>'+escapeHtml(x._from||'—')+'</td><td>'+escapeHtml(x._purpose||'—')+'</td></tr>').join(''):'<tr class="empty-row"><td colspan="5">Noch keine Einnahmen.</td></tr>';
}
function renderPayouts(){
  const body=document.getElementById('payoutTableBody'); if(!body)return;
  body.innerHTML=v1Payouts.length?v1Payouts.map(x=>'<tr><td>'+escapeHtml(formatDate(x.created_at||x.datum))+'</td><td>'+escapeHtml(x.typ||x.type||'—')+'</td><td>'+escapeHtml(x.mitarbeiter_name||v1EmployeeName(x.mitarbeiter_id)||'—')+'</td><td>'+money(x.betrag||x.amount)+'</td><td>'+escapeHtml(x.zweck||x.notiz||'—')+'</td></tr>').join(''):'<tr class="empty-row"><td colspan="5">Noch keine Auszahlungen.</td></tr>';
}
function renderLoans(){
  const body=document.getElementById('loanTableBody'); if(!body)return;
  const open=v1OpenLoans();
  setText('loanOpenCount',String(open.length)); setText('loanOpenSum',money(v1OpenLoanSum())); setText('loanDueInterest',money(v1DueInterest())); setText('loanLateFees',money(v1LateFees()));
  body.innerHTML=v1Loans.length?v1Loans.map(l=>{
    const rates=v1Rates.filter(r=>String(r.darlehen_id)===String(l.id)); const next=rates.filter(r=>String(r.status).toLowerCase()!=='bezahlt').sort((a,b)=>new Date(a.faellig_am||a.due_date)-new Date(b.faellig_am||b.due_date))[0];
    const canRepay=(v1IsMember() && String(l.mitglied_id)===String(currentUser?.id)) || v1IsLeitung();
    const action=String(l.status||'').toLowerCase()==='abgeschlossen'?'—':(canRepay?'<button class="small-button" onclick="payLoanRate(\''+escapeHtml(l.id)+'\')">Rate einzahlen</button>':'Nur eigenes Darlehen');
    return '<tr><td>'+escapeHtml(l.mitglied_name||v1EmployeeName(l.mitglied_id))+'</td><td>'+money(l.originalbetrag||l.original_amount)+'</td><td>'+money(l.gesamtrueckzahlung||l.total_repayment)+'</td><td>'+money(l.offenbetrag??l.remaining_amount)+'</td><td>'+escapeHtml(next?money(next.betrag||next.amount)+' · '+formatDate(next.faellig_am||next.due_date):'—')+'</td><td>'+escapeHtml(l.status||'Offen')+'</td><td>'+action+'</td></tr>';
  }).join(''):'<tr class="empty-row"><td colspan="7">Keine Darlehen.</td></tr>';
}

async function saveDonationEntry(){
  if(!v1IsMember()){ v1Status('incomeStatus','Nur ein Mitglied kann seine eigene Spende eintragen.',false); return; }
  const amount=numberValue(document.getElementById('donationAmount')?.value); if(amount<=0){v1Status('incomeStatus','Bitte einen gültigen Spendenbetrag eingeben.',false);return;}
  if(!v1Confirm('Spende über '+money(amount)+' speichern?'))return;
  const payload={betrag:amount,mitarbeiter_id:currentUser.id,mitarbeiter_name:currentEmployee?.name||currentUser.email,zweck:'Spende für Clan',erstellt_von:currentUser.id,created_at:new Date().toISOString()};
  const {data,error}=await buchhaltungDB.from('buchhaltung_spenden').insert(payload).select().single();
  if(error){v1Status('incomeStatus',error.message,false);return;}
  v1Donations.unshift(data); await writeActivityLog('Einnahmen','Spende',data.id,{betrag:amount}); await notifyBookkeeping({title:'Neue Clan-Spende',type:'Spende',amount,from:payload.mitarbeiter_name,purpose:payload.zweck,createdBy:payload.mitarbeiter_name,date:payload.created_at});
  v1Status('incomeStatus','Spende gespeichert und Einnahme aktualisiert.'); document.getElementById('donationAmount').value=''; renderIncome(); renderOverview();
}
async function saveIncomeEntry(){
  if(!v1CanManage()){v1Status('incomeStatus','Nur Leitung und Stadtleitung dürfen sonstige Einnahmen erfassen.',false);return;}
  const amount=numberValue(document.getElementById('donationAmount')?.value); const purpose=(document.getElementById('incomePurpose')?.value||'').trim(); if(amount<=0||!purpose){v1Status('incomeStatus','Betrag und Zweck sind erforderlich.',false);return;} if(!v1Confirm('Einnahme über '+money(amount)+' speichern?'))return;
  const payload={typ:document.getElementById('incomeType')?.value||'Sonstige Einnahme',betrag:amount,zweck:purpose,notiz:(document.getElementById('incomeNote')?.value||'').trim()||null,erstellt_von:currentUser?.id||null,erstellt_von_name:currentEmployee?.name||currentUser?.email,created_at:new Date().toISOString()};
  const {data,error}=await buchhaltungDB.from('buchhaltung_einnahmen').insert(payload).select().single(); if(error){v1Status('incomeStatus',error.message,false);return;}
  v1Income.unshift(data); await writeActivityLog('Einnahmen',payload.typ,data.id,payload); await notifyBookkeeping({title:'Neue Einnahme',type:payload.typ,amount,purpose,createdBy:payload.erstellt_von_name,note:payload.notiz,date:payload.created_at}); v1Status('incomeStatus','Einnahme gespeichert.'); renderIncome(); renderOverview();
}
async function savePayoutEntry(){
  if(!v1IsStadt()){v1Status('payoutStatus','Nur Stadtleitung darf Auszahlungen erfassen.',false);return;}
  const type=document.getElementById('payoutType')?.value||'Sonstige Ausgabe'; const amount=numberValue(document.getElementById('payoutAmount')?.value); const emp=document.getElementById('payoutEmployee')?.value||null; const purpose=(document.getElementById('payoutPurpose')?.value||'').trim();
  if(amount<=0){v1Status('payoutStatus','Bitte einen gültigen Betrag eingeben.',false);return;} if(type==='Monatsgehalt'&&!emp){v1Status('payoutStatus','Für ein Monatsgehalt bitte einen Mitarbeiter wählen.',false);return;} if(amount>v1CurrentCash()){v1Status('payoutStatus','Die Auszahlung überschreitet den aktuell verfügbaren Clanstand.',false);return;} if(!v1Confirm('Auszahlung über '+money(amount)+' speichern?'))return;
  const payload={typ:type,betrag:amount,mitarbeiter_id:emp,mitarbeiter_name:emp?v1EmployeeName(emp):null,monat:document.getElementById('payoutMonth')?.value||null,zweck:purpose||type,erstellt_von:currentUser?.id||null,erstellt_von_name:currentEmployee?.name||currentUser?.email,created_at:new Date().toISOString()};
  const {data,error}=await buchhaltungDB.from('buchhaltung_auszahlungen').insert(payload).select().single(); if(error){v1Status('payoutStatus',error.message,false);return;} v1Payouts.unshift(data); await writeActivityLog('Auszahlungen',type,data.id,payload); await notifyBookkeeping({title:'Neue Auszahlung',type,amount,to:payload.mitarbeiter_name,purpose:payload.zweck,createdBy:payload.erstellt_von_name,date:payload.created_at}); v1Status('payoutStatus','Auszahlung gespeichert.'); renderPayouts(); renderOverview();
}

async function saveLoan(){
  if(!v1IsStadt()){v1Status('loanStatus','Nur Stadtleitung kann ein Darlehen genehmigen.',false);return;}
  const member=document.getElementById('loanMember')?.value; const amount=numberValue(document.getElementById('loanAmount')?.value); const interest=numberValue(document.getElementById('loanInterest')?.value); const mode=document.getElementById('loanMode')?.value||'sofort'; const installment=numberValue(document.getElementById('loanInstallment')?.value); const firstDue=document.getElementById('loanFirstDue')?.value;
  if(!member||amount<=0||interest<0||interest>30){v1Status('loanStatus','Mitglied, Betrag und Zinssatz (0–30 %) prüfen.',false);return;} if(mode==='woechentlich'&&installment<=0){v1Status('loanStatus','Bei wöchentlicher Rückzahlung muss eine feste Rate angegeben werden.',false);return;} if(v1OpenLoans().some(x=>String(x.mitglied_id)===String(member))){v1Status('loanStatus','Dieses Mitglied hat bereits ein offenes Darlehen.',false);return;} if(amount>v1CurrentCash()){v1Status('loanStatus','Das Darlehen überschreitet den aktuell verfügbaren Clanstand.',false);return;} if(!v1Confirm('Darlehen über '+money(amount)+' genehmigen und auszahlen?'))return;
  const total=amount+(amount*interest/100); const now=new Date(); let due=firstDue?new Date(firstDue+'T12:00:00'):new Date(now.getTime()+7*86400000);
  const payload={mitglied_id:member,mitglied_name:v1EmployeeName(member),originalbetrag:amount,zinssatz:interest,zinsbetrag:amount*interest/100,gesamtrueckzahlung:total,rueckzahlungsart:mode,wöchentliche_rate:mode==='woechentlich'?installment:null,woechentliche_rate:mode==='woechentlich'?installment:null,getilgt:0,offenbetrag:total,remaining_amount:total,next_due_date:mode==='woechentlich'?due.toISOString():null,status:'Offen',genehmigt_von:currentUser.id,genehmigt_am:now.toISOString(),created_at:now.toISOString(),mahnungen_anzahl:0,mahngebuehr:0};
  const {data,error}=await buchhaltungDB.from('buchhaltung_darlehen').insert(payload).select().single(); if(error){v1Status('loanStatus',error.message,false);return;}
  v1Loans.unshift(data);
  if(mode==='woechentlich'){
    const rows=[]; let remaining=total; let n=1; while(remaining>0.005&&n<=500){const a=Math.min(installment,remaining); rows.push({darlehen_id:data.id,raten_nummer:n,betrag:a,faellig_am:due.toISOString().slice(0,10),status:'Offen'}); remaining-=a; due=new Date(due.getTime()+7*86400000); n++;}
    if(rows.length){const {data:rdata,error:re}=await buchhaltungDB.from('buchhaltung_darlehen_raten').insert(rows).select(); if(re){v1Status('loanStatus','Darlehen gespeichert, aber Raten konnten nicht angelegt werden: '+re.message,false);return;} v1Rates.push(...(rdata||[]));}
  } else { const {data:rdata}=await buchhaltungDB.from('buchhaltung_darlehen_raten').insert({darlehen_id:data.id,raten_nummer:1,betrag:total,faellig_am:new Date().toISOString().slice(0,10),status:'Offen'}).select().single(); if(rdata)v1Rates.unshift(rdata); }
  await writeActivityLog('Geldverleih','Darlehen genehmigt',data.id,payload); await notifyBookkeeping({title:'Darlehen genehmigt',type:'Darlehen',amount,total,from:'Clan',to:payload.mitglied_name,purpose:'Genehmigt und ausgezahlt',createdBy:currentEmployee?.name,date:payload.genehmigt_am}); v1Status('loanStatus','Darlehen genehmigt, ausgezahlt und gespeichert.'); renderLoans(); renderOverview();
}

async function payLoanRate(loanId){
  const loan=v1Loans.find(x=>String(x.id)===String(loanId)); if(!loan)return;
  if(!(v1IsLeitung() || (v1IsMember()&&String(loan.mitglied_id)===String(currentUser?.id)))){v1Status('loanStatus','Du darfst nur deine eigene Rate einzahlen.',false);return;}
  const rate=v1Rates.filter(r=>String(r.darlehen_id)===String(loanId)&&String(r.status||'').toLowerCase()!=='bezahlt').sort((a,b)=>new Date(a.faellig_am||a.due_date)-new Date(b.faellig_am||b.due_date))[0]; if(!rate){v1Status('loanStatus','Keine offene Rate gefunden.',false);return;}
  if(!v1Confirm('Bitte bestätige, dass die Rate über '+money(rate.betrag||rate.amount)+' bereits ingame über /Clan bezahlt wurde.'))return;
  const now=new Date().toISOString(); const amount=numberValue(rate.betrag||rate.amount);
  const {error:re}=await buchhaltungDB.from('buchhaltung_darlehen_raten').update({status:'Bezahlt',bezahlt_am:now,eingezahlt_von:currentUser.id}).eq('id',rate.id); if(re){v1Status('loanStatus',re.message,false);return;}
  rate.status='Bezahlt'; rate.bezahlt_am=now; rate.eingezahlt_von=currentUser.id;
  const newPaid=numberValue(loan.getilgt??loan.repaid_amount)+amount; const remaining=Math.max(0,numberValue(loan.gesamtrueckzahlung??loan.total_repayment)-newPaid); const next=v1Rates.filter(r=>String(r.darlehen_id)===String(loanId)&&String(r.status||'').toLowerCase()!=='bezahlt').sort((a,b)=>new Date(a.faellig_am||a.due_date)-new Date(b.faellig_am||b.due_date))[0];
  const status=remaining<=0.005?'Abgeschlossen':'Offen'; const {error:le}=await buchhaltungDB.from('buchhaltung_darlehen').update({getilgt:newPaid,repaid_amount:newPaid,offenbetrag:remaining,remaining_amount:remaining,next_due_date:next?.faellig_am||null,status}).eq('id',loan.id); if(le){v1Status('loanStatus',le.message,false);return;}
  Object.assign(loan,{getilgt:newPaid,repaid_amount:newPaid,offenbetrag:remaining,remaining_amount:remaining,next_due_date:next?.faellig_am||null,status}); await writeActivityLog('Geldverleih','Rate eingezahlt',loan.id,{betrag:amount,rate:rate.raten_nummer}); await notifyBookkeeping({title:'Darlehensrate eingezahlt',type:'Darlehensrate',amount,from:loan.mitglied_name||v1EmployeeName(loan.mitglied_id),to:'Clan',purpose:'Rate über /Clan bestätigt',createdBy:currentEmployee?.name||currentUser.email,date:now,status}); v1Status('loanStatus',status==='Abgeschlossen'?'Darlehen vollständig zurückgezahlt.':'Rate gespeichert. Nächste Rate wird angezeigt.'); renderLoans(); renderOverview();
}

function renderV1(){ fillV1EmployeeSelects(); renderIncome(); renderPayouts(); renderLoans(); renderOverview(); try{renderBookings();updateBookingSummary(bookings);renderOrderSettlements();renderSavings();renderEmployees();renderCashChecks();renderActivityLogs();renderFinancialControlStatus();initializeMonthlyPeriod();renderMonthlyOverview();}catch(e){console.warn('Render-Bestandsbereiche:',e);} }

async function initializeBookkeeping(){
  try{
    if(!hasSupabase()){ v1Status('loanStatus','Supabase ist nicht geladen.',false); return; }
    try{await loadCurrentUser();}catch(e){console.warn('Kein eingeloggter Benutzer:',e); renderOverview(); return;}
    try{await loadCurrentEmployee();}catch(e){console.warn('Mitarbeiterprofil:',e);}
    await loadBookkeepingData();
    renderV1();
    try{renderPermissionState();renderBookkeepingStatus();applyBookkeepingPermissions();}catch(e){}
    console.log('Ehrenmarkt Buchhaltung V1 geladen.');
  }catch(e){console.error('Buchhaltung V1:',e); renderOverview();}
}

// Exact permission model for Ehrenmarkt bookkeeping: rang only.
function getCurrentRank(){ return String(currentEmployee?.rang||'').trim(); }
function isStadtleitung(){ return getCurrentRank().toLowerCase()==='stadtleitung'; }
function isLeitung(){ const r=getCurrentRank().toLowerCase(); return r==='leitung'||r==='stadtleitung'; }
function isMitarbeiter(){ return getCurrentRank().toLowerCase()==='mitglied'; }
function canManageBookkeeping(){ return isLeitung(); }
function canCreateDeposit(){ return isLeitung()||isMitarbeiter(); }

window.saveIncomeEntry=saveIncomeEntry; window.saveDonationEntry=saveDonationEntry; window.savePayoutEntry=savePayoutEntry; window.saveLoan=saveLoan; window.payLoanRate=payLoanRate;

function openWorkerModal(){ const m=document.getElementById("workerModal"); if(m)m.classList.add("active"); }
function closeWorkerModal(){ const m=document.getElementById("workerModal"); if(m)m.classList.remove("active"); }
function addWorkerRow(){ if(!v1CanManage())return; openWorkerModal(); }
function saveWorker(){
  if(!v1CanManage())return;
  const name=(document.getElementById("workerName")?.value||"").trim();
  const salary=numberValue(document.getElementById("workerSalary")?.value);
  const note=(document.getElementById("workerNote")?.value||"").trim();
  if(!name||salary<0)return;
  currentWorkers.push({name,salary,note});
  if(typeof renderCurrentWorkers==='function')renderCurrentWorkers();
  if(typeof updateWorkerTotals==='function')updateWorkerTotals();
  closeWorkerModal();
}
function openCashCheck(){ if(typeof openCashCheckModal==='function')openCashCheckModal(); }
function closeCashCheck(){ if(typeof closeCashCheckModal==='function')closeCashCheckModal(); }
function closeLogDetail(){ const m=document.getElementById("logDetailModal"); if(m)m.classList.remove("active"); }
function saveSavingsTransaction(){ return saveSavingsEntry(); }
window.openWorkerModal=openWorkerModal; window.closeWorkerModal=closeWorkerModal; window.addWorkerRow=addWorkerRow; window.saveWorker=saveWorker; window.openCashCheck=openCashCheck; window.closeCashCheck=closeCashCheck; window.closeLogDetail=closeLogDetail; window.saveSavingsTransaction=saveSavingsTransaction;
window.renderV1=renderV1;

/* =========================================================
   EHRENMARKT – FINAL DYNAMIC BOOKKEEPING OVERRIDE
   This block adapts the existing engine to the current HTML
   and the correct Supabase schema.
========================================================= */
(() => {
"use strict";

const DB2 = window.supabaseClient || (window.supabase && typeof window.supabase.from === "function" ? window.supabase : null);
const T = {
  bookings:"buchhaltung_buchungen", savings:"buchhaltung_sparkonto", employees:"employees",
  orders:"buchhaltung_auftragsabrechnungen", workers:"buchhaltung_auftragsarbeiter",
  payouts:"buchhaltung_auszahlungen", donations:"buchhaltung_spenden", loans:"buchhaltung_darlehen",
  rates:"buchhaltung_darlehen_raten", cash:"buchhaltung_kassenabgleich", logs:"buchhaltung_protokoll"
};
const S = {user:null,employee:null,employees:[],bookings:[],savings:[],orders:[],workers:[],payouts:[],donations:[],loans:[],rates:[],cash:[],logs:[],currentWorkers:[],goal:0};
const $=id=>document.getElementById(id);
const n=v=>{let s=String(v??"").trim();if(!s)return 0;if(s.includes(".")&&s.includes(","))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");const x=Number(s.replace(/[^\d.-]/g,""));return Number.isFinite(x)?x:0};
const money=v=>`${n(v).toLocaleString("de-DE",{maximumFractionDigits:2})} $`;
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const val=id=>$(id)?String($(id).value??"").trim():"";
const txt=(id,v)=>{if($(id))$(id).textContent=v??""};
const setv=(id,v)=>{if($(id))$(id).value=v??""};
const dt=v=>{if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"})};
const paid=s=>["bezahlt","abgeschlossen","geschlossen","erledigt","completed","paid"].includes(String(s||"").toLowerCase());
const cancelled=s=>["storniert","cancelled","cancel"].includes(String(s||"").toLowerCase());
const rank=()=>String(S.employee?.rang||"").toLowerCase();
const manage=()=>["leitung","stadtleitung"].includes(rank());
const city=()=>rank()==="stadtleitung";
const me=()=>S.employee?.name||S.user?.user_metadata?.minecraft_name||S.user?.user_metadata?.username||S.user?.email||"Unbekannt";
const emp=id=>S.employees.find(e=>String(e.id)===String(id))||S.employees.find(e=>String(e.user_id)===String(id));
const empName=id=>emp(id)?.name||"—";

function toast(msg,ok=true){let e=$("buchhaltungToast");if(!e){e=document.createElement("div");e.id="buchhaltungToast";e.style.cssText="position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;max-width:92vw;padding:12px 16px;border-radius:10px;background:rgba(9,8,5,.97);border:1px solid rgba(212,175,55,.5);color:#eee;box-shadow:0 12px 35px #000;display:none;font-size:13px";document.body.appendChild(e)}e.textContent=msg;e.style.display="block";e.style.borderColor=ok?"rgba(86,200,120,.55)":"rgba(217,92,92,.65)";clearTimeout(e._t);e._t=setTimeout(()=>e.style.display="none",3200)}
function status(id,msg,ok=true){const e=$(id);if(!e)return;e.textContent=msg;e.style.display="block";e.style.color=ok?"#8de6a5":"#e98b8b"}
function err(e,id){console.error("Buchhaltung",e);status(id,e?.message||String(e),false);toast(e?.message||String(e),false)}

async function query(p){const r=await p;if(r.error)throw r.error;return r.data||[]}
async function auth(){if(!DB2)throw Error("Supabase Client wurde nicht geladen.");const r=await DB2.auth.getUser();if(r.error)throw r.error;S.user=r.data?.user;if(!S.user)throw Error("Kein eingeloggter Benutzer.")}
async function employees(){S.employees=await query(DB2.from(T.employees).select("id,user_id,name,role,rang,is_active,is_available,total_work_minutes,clock_in,created_at,updated_at").order("name"));S.employee=S.employees.find(e=>String(e.user_id)===String(S.user.id))||null}
async function all(){
 [S.bookings,S.savings,S.orders,S.workers,S.payouts,S.donations,S.loans,S.rates,S.cash,S.logs]=await Promise.all([
  query(DB2.from(T.bookings).select("*").order("datum",{ascending:false})),query(DB2.from(T.savings).select("*").order("datum",{ascending:false})),
  query(DB2.from(T.orders).select("*").order("datum",{ascending:false})),query(DB2.from(T.workers).select("*").order("created_at",{ascending:false})),
  query(DB2.from(T.payouts).select("*").order("erstellt_am",{ascending:false})),query(DB2.from(T.donations).select("*").order("erstellt_am",{ascending:false})),
  query(DB2.from(T.loans).select("*").order("erstellt_am",{ascending:false})),query(DB2.from(T.rates).select("*").order("faellig_am",{ascending:true})),
  query(DB2.from(T.cash).select("*").order("datum",{ascending:false})),query(DB2.from(T.logs).select("*").order("datum",{ascending:false}))
 ]);
 const goal=S.logs.find(x=>String(x.bereich).toLowerCase()==="sparkonto"&&String(x.aktion).toLowerCase()==="sparziel");S.goal=n(goal?.neue_werte?.ziel??0);
}
function bookingIn(){return S.bookings.filter(x=>String(x.art).toLowerCase()==="einzahlung"&&!cancelled(x.status)).reduce((a,x)=>a+n(x.betrag),0)}
function bookingOut(){return S.bookings.filter(x=>String(x.art).toLowerCase()==="auszahlung"&&!cancelled(x.status)).reduce((a,x)=>a+n(x.betrag),0)}
function savings(){return S.savings.filter(x=>!cancelled(x.status)).reduce((a,x)=>a+(String(x.art).toLowerCase()==="einzahlung"?n(x.betrag):-n(x.betrag)),0)}
function donations(){return S.donations.reduce((a,x)=>a+n(x.betrag),0)}
function orderGross(){return S.orders.filter(x=>!cancelled(x.status)).reduce((a,x)=>a+n(x.gesamtbetrag),0)}
function orderClan(){return S.orders.filter(x=>paid(x.status)&&!cancelled(x.status)).reduce((a,x)=>a+n(x.clanbetrag),0)}
function orderWages(){return S.orders.filter(x=>!cancelled(x.status)).reduce((a,x)=>a+n(x.gesamt_gehaelter),0)}
function payouts(){return S.payouts.reduce((a,x)=>a+n(x.betrag),0)}
function loanGiven(){return S.loans.reduce((a,x)=>a+n(x.originalbetrag),0)}
function loanPaid(){return S.loans.reduce((a,x)=>a+n(x.bereits_gezahlt),0)}
function currentCash(){return orderClan()+bookingIn()+donations()+savings()+loanPaid()-bookingOut()-payouts()-loanGiven()}
function totalAssets(){return orderGross()+bookingIn()+donations()+savings()}
function openOrders(){return S.orders.filter(x=>!paid(x.status)&&!cancelled(x.status)).reduce((a,x)=>a+Math.max(0,n(x.gesamtbetrag)-n(x.clanbetrag)-n(x.gesamt_gehaelter)),0)}

function renderUser(){txt("currentUserName",me());txt("currentUserRank",S.employee?.rang||"Kein Profil");txt("bookkeepingStatus",S.employee?(manage()?"Verwalten":"Lesen / Erfassen"):"Kein Zugriff");txt("connectionStatus",DB2?"Verbunden":"Nicht verbunden");txt("discordStatus","Bereit")}
function fillSelect(id){const e=$(id);if(!e)return;const old=e.value;e.innerHTML='<option value="">Mitarbeiter auswählen</option>';S.employees.filter(x=>x.is_active!==false).forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=`${x.name} · ${x.rang||x.role||"Mitarbeiter"}`;e.appendChild(o)});if([...e.options].some(x=>x.value===old))e.value=old;}
function fillSelects(){["payoutEmployee","loanMember","workerName"].forEach(fillSelect)}

function overview(){
 txt("currentClanBalance",money(currentCash()));txt("totalRevenue",money(orderGross()+bookingIn()+donations()));txt("totalDeposits",money(bookingIn()+donations()));txt("totalWithdrawals",money(bookingOut()+payouts()+loanGiven()));txt("totalWages",money(orderWages()+S.payouts.filter(x=>String(x.typ).toLowerCase().includes("gehalt")).reduce((a,x)=>a+n(x.betrag),0)));txt("totalClanExpenses",money(orderWages()+payouts()));txt("totalSavings",money(savings()));txt("openAmount",money(openOrders()));txt("totalBookings",String(S.bookings.length));txt("totalAssets",money(totalAssets()));
 txt("overviewDeposits",money(bookingIn()+donations()));txt("overviewWithdrawals",money(bookingOut()+payouts()+loanGiven()));txt("overviewBookings",String(S.bookings.length));txt("overviewOrders",String(S.orders.length));drawChart();renderSavings();
}

function months(){const now=new Date(),a=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);a.push({k:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,l:d.toLocaleDateString("de-DE",{month:"short"}).replace(".","") ,income:0,out:0,wages:0,don:0,sav:0})}return a}
function mk(v){const d=new Date(v);return Number.isNaN(d.getTime())?null:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function chartData(){const a=months(),add=(date,k,v)=>{const r=a.find(x=>x.k===mk(date));if(r)r[k]+=n(v)};S.bookings.forEach(x=>add(x.datum,String(x.art).toLowerCase()==="einzahlung"?"income":"out",x.betrag));S.donations.forEach(x=>add(x.erstellt_am,"don",x.betrag));S.payouts.forEach(x=>{add(x.erstellt_am,"out",x.betrag);if(String(x.typ).toLowerCase().includes("gehalt"))add(x.erstellt_am,"wages",x.betrag)});S.orders.forEach(x=>{if(paid(x.status)&&!cancelled(x.status)){add(x.datum,"income",x.clanbetrag);add(x.datum,"wages",x.gesamt_gehaelter)}});S.savings.forEach(x=>add(x.datum,"sav",String(x.art).toLowerCase()==="einzahlung"?x.betrag:-n(x.betrag)));return a}
function drawChart(){const c=$("financeChart");if(!c)return;const r=c.parentElement.getBoundingClientRect(),w=Math.max(280,Math.floor(r.width||520)),h=Math.max(145,Math.floor(r.height||180)),d=window.devicePixelRatio||1;c.width=w*d;c.height=h*d;c.style.width=w+"px";c.style.height=h+"px";const x=c.getContext("2d");x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);x.fillStyle="#061936";x.fillRect(0,0,w,h);const a=chartData(),ser=[{k:"income",l:"Einnahmen",c:"#56c878"},{k:"out",l:"Auszahlungen",c:"#d95c5c"},{k:"wages",l:"Gehälter",c:"#f0c95c"},{k:"don",l:"Spenden",c:"#b989ff"},{k:"sav",l:"Sparkonto",c:"#6b8cff"}],max=Math.max(1,...a.flatMap(r=>ser.map(s=>Math.abs(r[s.k])))),L=42,R=10,Tp=27,B=27,CW=w-L-R,CH=h-Tp-B,xx=i=>L+(a.length<2?CW/2:i*CW/(a.length-1)),yy=v=>Tp+CH-(Math.max(0,v)/max)*CH;x.strokeStyle="rgba(255,255,255,.11)";x.lineWidth=1;x.font="9px Arial";for(let i=0;i<4;i++){let gy=Tp+CH*i/3;x.beginPath();x.moveTo(L,gy);x.lineTo(w-R,gy);x.stroke();x.fillStyle="#8f98a8";x.fillText(Math.round(max*(1-i/3)).toLocaleString("de-DE"),3,gy+3)};a.forEach((r,i)=>{x.fillStyle="#aeb4c0";x.textAlign="center";x.fillText(r.l,xx(i),h-8)});x.textAlign="left";let lx=L,ly=10;x.font="9px Arial";ser.forEach(s=>{const mw=x.measureText(s.l).width+20;if(lx+mw>w-R){lx=L;ly+=13}x.fillStyle=s.c;x.beginPath();x.arc(lx+3,ly,3,0,Math.PI*2);x.fill();x.fillStyle="#b7bdc8";x.fillText(s.l,lx+10,ly+3);lx+=mw});ser.forEach(s=>{x.strokeStyle=s.c;x.lineWidth=2;x.beginPath();a.forEach((r,i)=>{const px=xx(i),py=yy(r[s.k]);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();a.forEach((r,i)=>{x.fillStyle=s.c;x.beginPath();x.arc(xx(i),yy(r[s.k]),3,0,Math.PI*2);x.fill()})})}

function renderBookings(){const b=$("bookingTableBody");if(!b)return;let a=[...S.bookings],q=val("bookingSearch").toLowerCase(),t=val("bookingTypeFilter"),c=val("bookingCategoryFilter");if(q)a=a.filter(x=>JSON.stringify(x).toLowerCase().includes(q));if(t)a=a.filter(x=>x.art===t);if(c)a=a.filter(x=>x.kategorie===c);b.innerHTML=a.length?a.map(x=>`<tr><td>${esc(x.buchungsnummer)}</td><td>${esc(x.art)}</td><td>${money(x.betrag)}</td><td>${esc(x.von)}</td><td>${esc(x.an)}</td><td>${esc(x.zweck)}</td><td>${esc(x.kategorie)}</td><td>${esc(x.auftragsnummer||"—")}</td><td>${esc(x.zahlungsart)}</td><td>${dt(x.datum)}</td><td>${esc(x.erstellt_von_name)}</td><td>${esc(x.status)}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="12">Keine passenden Buchungen vorhanden.</td></tr>`;txt("bookingIncome",money(bookingIn()));txt("bookingExpense",money(bookingOut()));txt("bookingNet",money(bookingIn()-bookingOut()));txt("bookingCount",String(S.bookings.length))}
function renderIncome(){const b=$("incomeTableBody");if(!b)return;const a=[...S.donations.map(x=>({d:x.erstellt_am,t:"Spende",v:x.betrag,f:empName(x.mitarbeiter_id),p:x.zweck})),...S.bookings.filter(x=>x.art==="Einzahlung").map(x=>({d:x.datum,t:x.kategorie==="Auftrag"?"Auftrag":"Sonstige Einnahme",v:x.betrag,f:x.von,p:x.zweck}))].sort((a,b)=>new Date(b.d)-new Date(a.d));b.innerHTML=a.length?a.map(x=>`<tr><td>${dt(x.d)}</td><td>${esc(x.t)}</td><td>${money(x.v)}</td><td>${esc(x.f)}</td><td>${esc(x.p)}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="5">Noch keine Einnahmen vorhanden.</td></tr>`}
function renderPayouts(){const b=$("payoutTableBody");if(!b)return;b.innerHTML=S.payouts.length?S.payouts.map(x=>`<tr><td>${dt(x.erstellt_am)}</td><td>${esc(x.typ)}</td><td>${esc(empName(x.mitarbeiter_id))}</td><td>${money(x.betrag)}</td><td>${esc(x.beschreibung||"—")}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="5">Noch keine Auszahlungen vorhanden.</td></tr>`}
function renderOrders(){const b=$("orderTableBody");if(!b)return;let a=[...S.orders],q=val("orderSearch").toLowerCase(),sf=val("orderStatusFilter"),df=val("orderDateFilter"),now=new Date();if(q)a=a.filter(x=>String(x.auftragsnummer).toLowerCase().includes(q));if(sf)a=a.filter(x=>x.status===sf);if(df&&df!=="all")a=a.filter(x=>{const d=new Date(x.datum);return df==="day"?d.toDateString()===now.toDateString():df==="month"?d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear():d.getFullYear()===now.getFullYear()});b.innerHTML=a.length?a.map(o=>{const w=S.workers.filter(z=>String(z.auftragsabrechnung_id)===String(o.id));return `<tr><td>${esc(o.auftragsnummer)}</td><td>${money(o.gesamtbetrag)}</td><td>${money(o.clanbetrag)}</td><td>${esc(w.map(z=>z.name).join(", ")||"—")}</td><td>${money(o.gesamt_gehaelter)}</td><td>${esc(o.status)}</td><td>${esc(o.erstellt_von_name)}</td><td>${dt(o.datum)}</td><td>—</td></tr>`}).join(""):`<tr class="empty-row"><td colspan="9">Keine passenden Auftragsabrechnungen vorhanden.</td></tr>`;txt("orderCount",String(S.orders.length));txt("orderTotalSum",money(orderGross()));txt("orderClanSum",money(S.orders.reduce((a,x)=>a+n(x.clanbetrag),0)));txt("orderSalarySum",money(orderWages()));txt("orderOpenSum",money(openOrders()))}
function renderSavings(){txt("savingsBalance",money(savings()));txt("savingsCurrent",money(savings()));txt("savingsDeposits",money(S.savings.filter(x=>x.art==="Einzahlung").reduce((a,x)=>a+n(x.betrag),0)));txt("savingsWithdrawals",money(S.savings.filter(x=>x.art==="Auszahlung").reduce((a,x)=>a+n(x.betrag),0)));txt("savingsTransactionCount",String(S.savings.length));txt("savingsGoalDisplay",money(S.goal));const p=S.goal?Math.min(100,savings()/S.goal*100):0;if($("savingsProgress"))$("savingsProgress").style.width=p+"%";txt("savingsProgressText",`${p.toLocaleString("de-DE",{maximumFractionDigits:1})} % erreicht`);const b=$("savingsTableBody");if(!b)return;b.innerHTML=S.savings.length?S.savings.map(x=>`<tr><td>${esc(x.buchungsnummer)}</td><td>${esc(x.art)}</td><td>${money(x.betrag)}</td><td>${esc(x.von)}</td><td>${esc(x.an)}</td><td>${esc(x.zweck)}</td><td>${dt(x.datum)}</td><td>${esc(x.erstellt_von_name)}</td><td>${esc(x.status||"Offen")}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="9">Noch keine Sparkonto-Buchungen vorhanden.</td></tr>`}
function renderEmployees(){const all=S.employees.filter(x=>x.is_active!==false),q=val("employeeSearch").toLowerCase(),a=q?all.filter(x=>`${x.name} ${x.role} ${x.rang}`.toLowerCase().includes(q)):all;let sal=0,dep=0,wdr=0,open=0;const stat=e=>{const s=S.workers.filter(x=>String(x.employee_id)===String(e.id)).reduce((a,x)=>a+n(x.gehalt),0),p=S.payouts.filter(x=>String(x.mitarbeiter_id)===String(e.id)).reduce((a,x)=>a+n(x.betrag),0),d=S.donations.filter(x=>String(x.mitarbeiter_id)===String(e.user_id)).reduce((a,x)=>a+n(x.betrag),0),o=S.workers.filter(x=>String(x.employee_id)===String(e.id)).length,l=S.loans.filter(x=>String(x.mitglied_id)===String(e.user_id)).reduce((a,x)=>a+n(x.offen),0);return{salary:s+p,deposit:d,withdraw:p,orders:o,open:l}};all.forEach(e=>{const s=stat(e);sal+=s.salary;dep+=s.deposit;wdr+=s.withdraw;open+=s.open});txt("employeeCount",String(all.length));txt("employeeSalaryTotal",money(sal));txt("employeeDepositTotal",money(dep));txt("employeeWithdrawalTotal",money(wdr));txt("employeeOpenTotal",money(open));const b=$("employeeTableBody");if(!b)return;b.innerHTML=a.length?a.map(e=>{const s=stat(e);return `<tr><td>${esc(e.name)}<br><small>${esc(e.rang||e.role||"")}</small></td><td>${s.orders}</td><td>${money(s.salary)}</td><td>${money(s.deposit)}</td><td>${money(s.withdraw)}</td><td>${money(s.open)}</td><td>${esc(e.role||"—")}</td></tr>`}).join(""):`<tr class="empty-row"><td colspan="7">Keine Mitarbeiter gefunden.</td></tr>`}
function renderLoans(){const b=$("loanTableBody");if(!b)return;b.innerHTML=S.loans.length?S.loans.map(x=>`<tr><td>${esc(empName(x.mitglied_id))}</td><td>${money(x.originalbetrag)}</td><td>${money(x.gesamtrueckzahlung)}</td><td>${money(x.offen)}</td><td>${dt(x.naechste_rate_am)}</td><td>${esc(x.status||"Offen")}</td><td>${n(x.offen)>0?`<button class="secondary-button" onclick="payLoanRate('${x.id}')">Rate bestätigen</button>`:"—"}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="7">Noch keine Darlehen vorhanden.</td></tr>`}
function renderCash(){const x=S.cash[0];txt("cashPortalBalance",x?money(x.portalstand):money(currentCash()));txt("cashIngameBalance",x?money(x.ingame_stand):"0 $");txt("cashDifference",x?money(x.abweichung):"0 $");txt("cashcheckStatus",x?`Letzter Abgleich: ${dt(x.datum)} · Abweichung ${money(x.abweichung)}`:"Noch kein Kassenabgleich durchgeführt.");const b=$("cashcheckTableBody");if(!b)return;b.innerHTML=S.cash.length?S.cash.map(x=>`<tr><td>${dt(x.datum)}</td><td>${money(x.portalstand)}</td><td>${money(x.ingame_stand)}</td><td>${money(x.abweichung)}</td><td>${esc(x.erstellt_von_name)}</td><td>${esc(x.notiz||"—")}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="6">Noch keine Kassenabgleiche vorhanden.</td></tr>`}
function renderLogs(){txt("logCount",String(S.logs.length));const today=new Date().toDateString();txt("logToday",String(S.logs.filter(x=>new Date(x.datum).toDateString()===today).length));txt("logChanges",String(S.logs.filter(x=>["Geändert","Kontrolle"].includes(x.typ)).length));txt("logCancellations",String(S.logs.filter(x=>String(x.typ).toLowerCase().includes("storno")).length));filterLogs()}
function filterLogs(){let a=[...S.logs],q=val("logSearch").toLowerCase(),t=val("logTypeFilter"),p=val("logPeriodFilter");if(q)a=a.filter(x=>JSON.stringify(x).toLowerCase().includes(q));if(t)a=a.filter(x=>x.typ===t);const now=new Date();if(p==="day")a=a.filter(x=>new Date(x.datum).toDateString()===now.toDateString());if(p==="month")a=a.filter(x=>{const d=new Date(x.datum);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});if(p==="year")a=a.filter(x=>new Date(x.datum).getFullYear()===now.getFullYear());const b=$("logTableBody");if(!b)return;b.innerHTML=a.length?a.map(x=>`<tr><td>${dt(x.datum)}</td><td>${esc(x.typ)}</td><td>${esc(x.bereich)}</td><td>${esc(x.beschreibung)}</td><td>${esc(x.erstellt_von_name)}</td><td>${esc(x.status)}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="6">Noch keine Aktivitäten vorhanden.</td></tr>`}
function monthly(){const el=$("monthlyPeriod");if(el&&!el.value){const d=new Date();el.value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}const [y,m]=String(val("monthlyPeriod")).split("-").map(Number);if(!y||!m)return;const a=new Date(y,m-1,1),z=new Date(y,m,1),inr=d=>{const x=new Date(d);return x>=a&&x<z};const inc=S.bookings.filter(x=>x.art==="Einzahlung"&&inr(x.datum)).reduce((a,x)=>a+n(x.betrag),0)+S.donations.filter(x=>inr(x.erstellt_am)).reduce((a,x)=>a+n(x.betrag),0)+S.orders.filter(x=>paid(x.status)&&inr(x.datum)).reduce((a,x)=>a+n(x.clanbetrag),0);const exp=S.bookings.filter(x=>x.art==="Auszahlung"&&inr(x.datum)).reduce((a,x)=>a+n(x.betrag),0)+S.payouts.filter(x=>inr(x.erstellt_am)).reduce((a,x)=>a+n(x.betrag),0);const wages=S.payouts.filter(x=>String(x.typ).toLowerCase().includes("gehalt")&&inr(x.erstellt_am)).reduce((a,x)=>a+n(x.betrag),0)+S.orders.filter(x=>paid(x.status)&&inr(x.datum)).reduce((a,x)=>a+n(x.gesamt_gehaelter),0);txt("monthlyIncome",money(inc));txt("monthlyExpenses",money(exp));txt("monthlyWages",money(wages));txt("monthlyChange",money(inc-exp-wages));txt("monthlyLabel",a.toLocaleDateString("de-DE",{month:"long",year:"numeric"}));txt("monthlyBookingCount",String(S.bookings.filter(x=>inr(x.datum)).length))}

async function log(area,action,desc,newValues={},type="Erstellt"){try{const p={typ:type,bereich:area,aktion:action,beschreibung:desc,erstellt_von:S.user?.id||null,erstellt_von_name:me(),datum:new Date().toISOString(),status:type,alte_werte:null,neue_werte:newValues,created_at:new Date().toISOString()};const r=await DB2.from(T.logs).insert(p).select().single();if(!r.error&&r.data)S.logs.unshift(r.data)}catch(e){console.warn("Log",e)}}
async function notify(p){try{if(!DB2?.functions?.invoke)return;const r=await DB2.functions.invoke("buchhaltung",{body:p});if(r.error)console.warn("Discord",r.error)}catch(e){console.warn("Discord",e)}}
async function nextNo(table,col,prefix){try{const a=await query(DB2.from(table).select(col).like(col,`${prefix}-%`).order(col,{ascending:false}).limit(100));let m=0;a.forEach(x=>{const z=String(x[col]||"").match(/(\d+)$/);if(z)m=Math.max(m,+z[1])});return`${prefix}-${String(m+1).padStart(4,"0")}`}catch{return`${prefix}-${Date.now()}`}}

window.showArea=function(id,btn){document.querySelectorAll(".workspace-content>.open-area").forEach(x=>{x.style.display="none";x.classList.remove("active")});const e=$(id);if(e){e.style.display="block";e.classList.add("active")}document.querySelectorAll(".nav-button").forEach(x=>x.classList.remove("active"));if(btn)btn.classList.add("active");if(id==="area-overview")requestAnimationFrame(drawChart)};
window.reloadBookkeepingPage=async()=>{await refresh()};
function modal(id,on){const e=$(id);if(!e)return;e.classList.toggle("active",on);e.style.display=on?"flex":"none"}
window.openOrderModal=()=>{if(!manage())return toast("Keine Berechtigung.",false);S.currentWorkers=[];setv("orderDate",new Date().toISOString().slice(0,16));setv("orderCreatedBy",me());renderWorkers();workerTotals();modal("orderModal",true)};window.closeOrderModal=()=>modal("orderModal",false);
window.openWorkerModal=()=>{if(!manage())return toast("Keine Berechtigung.",false);fillSelect("workerName");setv("workerSalary","");setv("workerNote","");modal("workerModal",true)};window.closeWorkerModal=()=>modal("workerModal",false);
window.addWorkerRow=window.openWorkerModal;
window.saveWorker=()=>{const id=val("workerName"),e=emp(id),salary=n(val("workerSalary"));if(!e||salary<0)return toast("Mitarbeiter und Gehalt prüfen.",false);S.currentWorkers.push({employee_id:e.id,name:e.name,gehalt:salary,notiz:val("workerNote")||null});renderWorkers();workerTotals();modal("workerModal",false)};
window.removeWorker=i=>{S.currentWorkers.splice(i,1);renderWorkers();workerTotals()};
function renderWorkers(){const b=$("workerList");if(!b)return;b.innerHTML=S.currentWorkers.length?S.currentWorkers.map((w,i)=>`<div class="worker-row"><span>${esc(w.name)}</span><strong>${money(w.gehalt)}</strong><button type="button" class="secondary-button" onclick="removeWorker(${i})">×</button></div>`).join(""):`<div class="worker-empty">Noch keine Arbeiter hinzugefügt.</div>`}
function workerTotals(){const w=S.currentWorkers.reduce((a,x)=>a+n(x.gehalt),0),r=n(val("orderTotal"))-n(val("orderClanAmount"))-w;txt("orderWorkerCount",String(S.currentWorkers.length));txt("orderSalaryTotal",money(w));txt("orderRemainingAmount",money(r));if($("orderDistributionWarning")){$("orderDistributionWarning").textContent=r<0?"Die Verteilung überschreitet den Gesamtbetrag.":"Verteilung ist rechnerisch möglich.";$("orderDistributionWarning").style.color=r<0?"#e98b8b":"#8de6a5"}}
window.saveOrderSettlement=async()=>{if(!manage())return toast("Keine Berechtigung.",false);const no=val("orderNumber"),total=n(val("orderTotal")),clan=n(val("orderClanAmount")),w=S.currentWorkers.reduce((a,x)=>a+n(x.gehalt),0),st=val("orderStatus")||"Offen";if(!no||total<=0||clan+w>total)return toast("Auftragsnummer und Verteilung prüfen.",false);const now=val("orderDate")?new Date(val("orderDate")).toISOString():new Date().toISOString();const p={auftragsnummer:no,gesamtbetrag:total,clanbetrag:clan,gesamt_gehaelter:w,status:st,datum:now,erstellt_von:S.user.id,erstellt_von_name:me(),notiz:val("orderNote")||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};const r=await DB2.from(T.orders).insert(p).select().single();if(r.error)return err(r.error);S.orders.unshift(r.data);if(S.currentWorkers.length){const rows=S.currentWorkers.map(x=>({auftragsabrechnung_id:r.data.id,employee_id:x.employee_id,name:x.name,gehalt:x.gehalt,notiz:x.notiz,created_at:new Date().toISOString()}));const wr=await DB2.from(T.workers).insert(rows).select();if(wr.error)toast("Auftrag gespeichert, Arbeiter konnten nicht gespeichert werden.",false);else S.workers.unshift(...(wr.data||[]))}await log("Auftragsabrechnungen","Auftrag erstellt",`${no} · ${money(total)}`,p);if(paid(st)&&clan>0)await notify({title:"Auftrag bezahlt – Clananteil",channel:"Einzahlungen",type:"Auftragsabrechnung",amount:clan,from:"Auftrag",to:"Clan-Kasse",purpose:`${no} – Clananteil`,orderNumber:no,createdBy:me(),status:st});S.currentWorkers=[];modal("orderModal",false);renderAll();toast("Auftragsabrechnung gespeichert.")};
window.openBookingModal=()=>{setv("bookingFrom",me());setv("bookingDate",new Date().toISOString().slice(0,16));modal("bookingModal",true)};window.closeBookingModal=()=>modal("bookingModal",false);
window.saveBooking=async()=>{const amount=n(val("bookingAmount")),type=val("bookingType")||"Einzahlung",purpose=val("bookingPurpose");if(!S.employee||amount<=0||!purpose)return toast("Betrag und Zweck prüfen.",false);const no=val("bookingNumber")||await nextNo(T.bookings,"buchungsnummer","BK"),date=val("bookingDate")?new Date(val("bookingDate")).toISOString():new Date().toISOString();const p={buchungsnummer:no,art:type,betrag:amount,von:me(),an:val("bookingTo")||"Clan-Kasse",zweck:purpose,kategorie:val("bookingCategory")||"Sonstiges",auftragsnummer:val("bookingOrderNumber")||null,zahlungsart:val("bookingPaymentMethod")||"Sonstiges",datum:date,erstellt_von:S.user.id,erstellt_von_name:me(),status:val("bookingStatus")||"Offen",notiz:val("bookingNote")||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};const r=await DB2.from(T.bookings).insert(p).select().single();if(r.error)return err(r.error);S.bookings.unshift(r.data);await log("Buchungen","Buchung erstellt",`${type} ${money(amount)}`,p);await notify({title:type==="Einzahlung"?"Neue Einzahlung":"Neue Auszahlung",channel:type==="Einzahlung"?"Einzahlungen":"Auszahlungen",type,amount,from:p.von,to:p.an,purpose,bookingNumber:no,createdBy:me(),status:p.status,note:p.notiz});modal("bookingModal",false);renderAll();toast("Buchung gespeichert.")};
window.openSavingsModal=()=>{if(!manage())return toast("Keine Berechtigung.",false);setv("savingsDate",new Date().toISOString().slice(0,16));setv("savingsFrom",me());setv("savingsTo","Sparkonto");modal("savingsModal",true)};window.closeSavingsModal=()=>modal("savingsModal",false);
window.saveSavingsTransaction=async()=>{if(!manage())return toast("Keine Berechtigung.",false);const type=val("savingsType")||"Einzahlung",amount=n(val("savingsAmount")),purpose=val("savingsPurpose");if(amount<=0||!purpose)return toast("Betrag und Zweck prüfen.",false);if(type==="Auszahlung"&&amount>savings())return toast("Sparkonto reicht nicht aus.",false);const no=val("savingsNumber")||await nextNo(T.savings,"buchungsnummer","SP"),date=val("savingsDate")?new Date(val("savingsDate")).toISOString():new Date().toISOString(),p={buchungsnummer:no,art:type,betrag:amount,von:type==="Einzahlung"?me():"Sparkonto",an:type==="Einzahlung"?"Sparkonto":me(),zweck:purpose,datum:date,erstellt_von:S.user.id,erstellt_von_name:me(),notiz:val("savingsNote")||null,created_at:new Date().toISOString()};const r=await DB2.from(T.savings).insert(p).select().single();if(r.error)return err(r.error);S.savings.unshift(r.data);await log("Sparkonto","Buchung erstellt",`${type} ${money(amount)}`,p);await notify({title:type==="Einzahlung"?"Sparkonto-Einzahlung":"Sparkonto-Auszahlung",channel:type==="Einzahlung"?"Einzahlungen":"Auszahlungen",type:`Sparkonto ${type}`,amount,from:p.von,to:p.an,purpose,createdBy:me(),note:p.notiz});modal("savingsModal",false);renderAll();toast("Sparkonto-Buchung gespeichert.")};
window.saveSavingsGoal=async()=>{if(!manage())return toast("Keine Berechtigung.",false);S.goal=n(val("savingsGoal"));await log("Sparkonto","Sparziel","Sparziel geändert",{ziel:S.goal});renderSavings();toast("Sparziel gespeichert.")};
window.saveIncomeEntry=async()=>{const type=val("incomeType")||"Sonstige Einnahme",amount=n(val("donationAmount")),purpose=val("incomePurpose"),note=val("incomeNote");if(!S.employee||amount<=0||!purpose)return status("incomeStatus","Betrag und Zweck prüfen.",false);if(type==="Spende"){const r=await DB2.from(T.donations).insert({mitarbeiter_id:S.user.id,betrag:amount,zweck:purpose,erstellt_am:new Date().toISOString()}).select().single();if(r.error)return err(r.error,"incomeStatus");S.donations.unshift(r.data)}else{const no=await nextNo(T.bookings,"buchungsnummer","BK"),p={buchungsnummer:no,art:"Einzahlung",betrag:amount,von:me(),an:"Clan-Kasse",zweck:purpose,kategorie:type==="Auftrag"?"Auftrag":"Sonstiges",auftragsnummer:null,zahlungsart:"Sonstiges",datum:new Date().toISOString(),erstellt_von:S.user.id,erstellt_von_name:me(),status:"Offen",notiz:note||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};const r=await DB2.from(T.bookings).insert(p).select().single();if(r.error)return err(r.error,"incomeStatus");S.bookings.unshift(r.data)}await log("Einnahmen","Einnahme erstellt",`${type} ${money(amount)}`,{type,amount,purpose,note});await notify({title:type==="Spende"?"Neue Spende":"Neue Einnahme",channel:"Einzahlungen",type,amount,from:me(),to:"Clan-Kasse",purpose,createdBy:me(),note});setv("donationAmount","");setv("incomePurpose","");setv("incomeNote","");status("incomeStatus","Einnahme gespeichert.");renderAll()};
window.savePayoutEntry=async()=>{if(!manage())return status("payoutStatus","Nur Leitung oder Stadtleitung darf Auszahlungen erfassen.",false);const amount=n(val("payoutAmount")),type=val("payoutType")||"Sonstige Ausgabe",id=val("payoutEmployee")||null,purpose=val("payoutPurpose")||type;if(amount<=0)return status("payoutStatus","Betrag prüfen.",false);if(type==="Monatsgehalt"&&!id)return status("payoutStatus","Mitarbeiter auswählen.",false);if(amount>currentCash())return status("payoutStatus","Die Auszahlung überschreitet den aktuellen Clanstand.",false);const p={mitarbeiter_id:id,typ:type,betrag:amount,beschreibung:purpose,monat:val("payoutMonth")||null,erstellt_am:new Date().toISOString()};const r=await DB2.from(T.payouts).insert(p).select().single();if(r.error)return err(r.error,"payoutStatus");S.payouts.unshift(r.data);await log("Auszahlungen","Auszahlung erstellt",`${type} ${money(amount)}`,p);await notify({title:"Neue Auszahlung",channel:"Auszahlungen",type,amount,from:"Clan-Kasse",to:empName(id),purpose,createdBy:me()});setv("payoutAmount","");setv("payoutPurpose","");status("payoutStatus","Auszahlung gespeichert.");renderAll()};
window.openCashCheck=()=>{setv("cashPortalInput",currentCash());setv("cashCheckDate",new Date().toISOString().slice(0,16));setv("cashCheckCreatedBy",me());modal("cashCheckModal",true)};window.closeCashCheck=()=>modal("cashCheckModal",false);
window.saveCashCheck=async()=>{const portal=n(val("cashPortalInput")),ingame=n(val("cashIngameInput")),diff=ingame-portal,p={portalstand:portal,ingame_stand:ingame,abweichung:diff,datum:val("cashCheckDate")?new Date(val("cashCheckDate")).toISOString():new Date().toISOString(),erstellt_von:S.user.id,erstellt_von_name:me(),notiz:val("cashCheckNote")||null,created_at:new Date().toISOString()};const r=await DB2.from(T.cash).insert(p).select().single();if(r.error)return err(r.error);S.cash.unshift(r.data);await log("Kassenabgleich","Kontrolle gespeichert",`Abweichung ${money(diff)}`,p,"Kontrolle");modal("cashCheckModal",false);renderAll();toast("Kassenabgleich gespeichert.")};
window.updateMonthlyBalance=monthly;window.filterBookings=renderBookings;window.filterOrders=renderOrders;window.filterEmployees=renderEmployees;window.filterLogs=filterLogs;window.openLogDetail=i=>{const x=S.logs[i];if(!x)return;$("logDetailContent").innerHTML=`<div><strong>${esc(x.bereich)}</strong> · ${esc(x.aktion)}</div><p>${esc(x.beschreibung)}</p><p>${esc(x.erstellt_von_name)} · ${dt(x.datum)}</p><pre style="white-space:pre-wrap;color:#aaa">${esc(JSON.stringify(x.neue_werte||{},null,2))}</pre>`;modal("logDetailModal",true)};window.closeLogDetail=()=>modal("logDetailModal",false);
window.saveLoan=async()=>{if(!city())return status("loanStatus","Nur Stadtleitung kann ein Darlehen genehmigen.",false);const id=val("loanMember"),amount=n(val("loanAmount")),interest=n(val("loanInterest")),mode=val("loanMode")||"einmalig",install=n(val("loanInstallment"));if(!id||amount<=0||interest<0)return status("loanStatus","Mitglied, Betrag und Zinssatz prüfen.",false);if(mode==="woechentlich"&&install<=0)return status("loanStatus","Rate prüfen.",false);if(amount>currentCash())return status("loanStatus","Darlehen überschreitet den Clanstand.",false);const total=amount+amount*interest/100,due=val("loanFirstDue")?new Date(val("loanFirstDue")+"T12:00:00"):new Date(Date.now()+7*86400000),count=mode==="woechentlich"?Math.ceil(total/install):1,p={mitglied_id:emp(id)?.user_id||id,originalbetrag:amount,zinssatz:interest,zinsbetrag:amount*interest/100,gesamtrueckzahlung:total,rueckzahlungsart:mode,ratenbetrag:mode==="woechentlich"?install:total,anzahl_raten:count,bereits_gezahlt:0,offen:total,naechste_rate_am:due.toISOString(),mahnungen:0,status:"Offen",genehmigt_von:S.user.id,genehmigt_am:new Date().toISOString(),erstellt_am:new Date().toISOString()};const r=await DB2.from(T.loans).insert(p).select().single();if(r.error)return err(r.error,"loanStatus");S.loans.unshift(r.data);let left=total,next=new Date(due),rows=[],i=1;while(left>0.005&&i<=500){const a=mode==="woechentlich"?Math.min(install,left):left;rows.push({darlehen_id:r.data.id,raten_nummer:i,betrag:a,faellig_am:next.toISOString(),status:"Offen",erstellt_am:new Date().toISOString()});left-=a;i++;if(mode!=="woechentlich")break;next=new Date(next.getTime()+604800000)}const rr=await DB2.from(T.rates).insert(rows).select();if(rr.error)return err(rr.error,"loanStatus");S.rates.unshift(...(rr.data||[]));await log("Geldverleih","Darlehen genehmigt",`Darlehen ${money(amount)} an ${empName(id)}`,p);await notify({title:"Darlehen genehmigt",channel:"Geldverleih",type:"Darlehen",amount,from:"Clan-Kasse",to:empName(id),purpose:"Darlehen genehmigt und ausgezahlt",createdBy:me()});setv("loanAmount","");setv("loanInterest","");setv("loanInstallment","");setv("loanFirstDue","");setv("loanNote","");status("loanStatus","Darlehen gespeichert und Raten angelegt.");renderAll()};
window.payLoanRate=async id=>{const l=S.loans.find(x=>String(x.id)===String(id));if(!l)return;const r=S.rates.find(x=>String(x.darlehen_id)===String(id)&&String(x.status).toLowerCase()!=="bezahlt");if(!r)return toast("Keine offene Rate gefunden.",false);if(!manage()&&String(l.mitglied_id)!==String(S.user.id))return toast("Keine Berechtigung.",false);const now=new Date().toISOString(),u=await DB2.from(T.rates).update({status:"Bezahlt",bezahlt_am:now,eingezahlt_von:S.user.id}).eq("id",r.id);if(u.error)return err(u.error);const paidAmt=n(l.bereits_gezahlt)+n(r.betrag),open=Math.max(0,n(l.gesamtrueckzahlung)-paidAmt),next=S.rates.find(x=>String(x.darlehen_id)===String(id)&&String(x.status).toLowerCase()!=="bezahlt"&&String(x.id)!==String(r.id));const lu=await DB2.from(T.loans).update({bereits_gezahlt:paidAmt,offen:open,naechste_rate_am:next?.faellig_am||null,status:open<=.005?"Abgeschlossen":"Offen",abgeschlossen_am:open<=.005?now:null}).eq("id",id);if(lu.error)return err(lu.error);await log("Geldverleih","Rate bezahlt",`Rate ${money(r.betrag)}`,{darlehen_id:id,betrag:r.betrag});await notify({title:"Darlehensrate eingezahlt",channel:"Geldverleih",type:"Darlehensrate",amount:r.betrag,from:empName(l.mitglied_id),to:"Clan-Kasse",purpose:"Darlehensrate bezahlt",createdBy:me()});await refresh()};

function control(){const w=[];if(currentCash()<0)w.push("Der aktuelle Clanstand ist negativ.");if(savings()<0)w.push("Das Sparkonto ist negativ.");S.orders.forEach(x=>{if(!cancelled(x.status)&&n(x.clanbetrag)+n(x.gesamt_gehaelter)>n(x.gesamtbetrag))w.push(`Auftrag ${x.auftragsnummer}: Verteilung überschreitet den Gesamtbetrag.`)});const c=$("controlStatus");if(c)c.innerHTML=w.length?`<div class="control-status-icon">!</div><div><strong>${w.length} Warnung(en)</strong><span>Bitte die markierten Daten prüfen.</span></div>`:`<div class="control-status-icon">✓</div><div><strong>Kontrolle erfolgreich</strong><span>Keine kritischen Abweichungen gefunden.</span></div>`;const l=$("warningList");if(l)l.innerHTML=w.length?w.map(x=>`<div class="warning-item"><span>!</span><div>${esc(x)}</div></div>`).join(""):`<div class="no-warning"><span class="warning-check">✓</span><div><strong>Keine Warnungen</strong></div></div>`;txt("lastControlDate",dt(new Date()));}
function renderAll(){renderUser();fillSelects();overview();renderBookings();renderIncome();renderPayouts();renderOrders();renderSavings();renderEmployees();renderLoans();renderCash();monthly();renderLogs();control()}
async function refresh(){try{await employees();await all();renderAll();}catch(e){err(e)}}
async function init2(){try{await auth();await employees();if(!S.employee){renderUser();toast("Kein aktives Mitarbeiterprofil gefunden.",false);return}await all();renderAll();}catch(e){err(e)}}
window.refreshBookkeeping=refresh;window.renderAllBookkeeping=renderAll;window.renderV1=renderAll;
window.addEventListener("resize",()=>requestAnimationFrame(drawChart));
setTimeout(init2,80);
})();
