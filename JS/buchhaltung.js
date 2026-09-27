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
                "created_at",
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

        await notifyBookkeeping({
            title: type === "Einzahlung" ? "Neue Einzahlung" : "Neue Auszahlung",
            type, amount,
            channel: type === "Einzahlung" ? "Einzahlungen" : "Auszahlungen",
            from: payload.von, to: payload.an, purpose: payload.zweck,
            bookingNumber, createdBy, date: date, note: payload.notiz
        });
        showToast(type + " wurde erfolgreich gespeichert: " + money(amount), "success");

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

window.addOrderWorker=function(){ v4OpenWorkerModal(); };


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

                        employee_id:
                            worker.employee_id || null,

                        name:
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


        await notifyBookkeeping({
            title: "Neue Auftragsabrechnung",
            type: "Auftragsabrechnung",
            channel: "Einzahlungen",
            amount: total,
            from: "Kunde / Auftrag",
            to: "Clan",
            purpose: "Auftragsabrechnung " + orderNumber,
            orderNumber,
            createdBy,
            date: new Date().toISOString(),
            note: getValue("orderNote") || ""
        });

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
        { art: type, betrag: amount, zweck: purpose }
    );

    await notifyBookkeeping({
        title: normalizedType === "auszahlung" ? "Sparkonto-Auszahlung" : "Sparkonto-Einzahlung",
        type: normalizedType === "auszahlung" ? "Sparkonto-Auszahlung" : "Sparkonto-Einzahlung",
        channel: normalizedType === "auszahlung" ? "Auszahlungen" : "Einzahlungen",
        amount, from: getCurrentUserName(), to: normalizedType === "auszahlung" ? "Clan" : "Sparkonto",
        purpose, createdBy: getCurrentUserName(), date: new Date().toISOString(), bookingNumber
    });

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

async function saveSavingsGoal(){
    if(!canManageBookkeeping()){ showToast("Keine Berechtigung zum Ändern des Sparziels.","error"); return; }
    if(!hasSupabase()){ showToast("Supabase ist nicht verfügbar.","error"); return; }
    const input=getElement("savingsGoal");
    if(!input) return;
    const value=Math.max(0, Number(String(input.value||"").replace(",","."))||0);
    const oldGoal=Number(savingsGoalValue)||0;
    const payload={
      typ:"Sparkonto", bereich:"Sparkonto", aktion:"Sparziel",
      beschreibung:"Sparziel aktualisiert", status:"Gespeichert",
      erstellt_von:currentUser?.id||null,
      erstellt_von_name:getCurrentUserName(),
      datum:new Date().toISOString(), created_at:new Date().toISOString(),
      alte_werte:{goal:oldGoal}, neue_werte:{goal:value}
    };
    const {data,error}=await buchhaltungDB.from(TABLE_LOG).insert(payload).select().single();
    if(error){ console.error(error); showToast("Sparziel konnte nicht gespeichert werden: "+error.message,"error"); return; }
    savingsGoalValue=value;
    activityLogs.unshift(data);
    renderSavings(); renderOverview(); renderFinancialChart();
    showToast("Sparziel dauerhaft gespeichert.","success");
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

function getEmployeeStatsById(employee){
  const id=String(employee?.id??'');
  const uid=String(employee?.user_id??'');
  const workerRows=(Array.isArray(orderWorkers)?orderWorkers:[]).filter(w=>String(w.employee_id??'')===id);
  const wages=workerRows.reduce((s,w)=>s+numberValue(w.gehalt),0);
  const orders=new Set(workerRows.map(w=>String(w.auftragsabrechnung_id??'')).filter(Boolean)).size;
  const withdrawals=(Array.isArray(v1Payouts)?v1Payouts:[]).filter(x=>String(x.mitarbeiter_id??'')===uid).reduce((s,x)=>s+numberValue(x.betrag),0);
  const deposits=(Array.isArray(v1Donations)?v1Donations:[]).filter(x=>String(x.mitarbeiter_id??'')===uid).reduce((s,x)=>s+numberValue(x.betrag),0);
  const openAmount=workerRows.reduce((s,w)=>{
    const o=(Array.isArray(orderSettlements)?orderSettlements:[]).find(x=>String(x.id)===String(w.auftragsabrechnung_id));
    const st=String(o?.status||'').toLowerCase();
    return s+(!o||['bezahlt','storniert'].includes(st)?0:numberValue(w.gehalt));
  },0);
  return {orders,wages,deposits,withdrawals,openAmount};
}

function renderEmployeeSummary(){
  const list=Array.isArray(employees)?employees:[];
  let wages=0,deposits=0,withdrawals=0,open=0;
  list.forEach(e=>{const x=getEmployeeStatsById(e);wages+=x.wages;deposits+=x.deposits;withdrawals+=x.withdrawals;open+=x.openAmount;});
  setText('employeeCount',String(list.length));
  setText('employeeSalaryTotal',money(wages));
  setText('employeeDepositTotal',money(deposits));
  setText('employeeWithdrawalTotal',money(withdrawals));
  setText('employeeOpenTotal',money(open));
}

function renderEmployeeRows(list){
  const tbody=getElement('employeeTableBody'); if(!tbody)return;
  const rows=Array.isArray(list)?list:[];
  if(!rows.length){tbody.innerHTML='<tr><td colspan="7" class="empty-state">Keine Mitarbeiter gefunden.</td></tr>';return;}
  tbody.innerHTML=rows.map(employee=>{
    const stats=getEmployeeStatsById(employee);
    const name=employee.name||'Unbekannt';
    const role=employee.role||''; const rank=employee.rang||'';
    const note=employee.notes||employee.status||'—';
    return '<tr><td><strong>'+escapeHtml(name)+'</strong><br><small>'+escapeHtml(role)+(rank?' · '+escapeHtml(rank):'')+'</small></td><td>'+stats.orders+'</td><td>'+money(stats.wages)+'</td><td>'+money(stats.deposits)+'</td><td>'+money(stats.withdrawals)+'</td><td>'+money(stats.openAmount)+'</td><td>'+escapeHtml(note)+'</td></tr>';
  }).join('');
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
  const r=v4MonthlyRange(); let deposits=0,withdrawals=0,wages=0,clanExpenses=0,orderCount=0;
  (v1Income||[]).forEach(x=>{if(v4InRange(x.created_at,r)) deposits+=numberValue(x.betrag);});
  (v1Donations||[]).forEach(x=>{if(v4InRange(x.erstellt_am,r)) deposits+=numberValue(x.betrag);});
  (bookings||[]).forEach(x=>{if(!v4InRange(x.datum,r))return; const t=String(x.art||'').toLowerCase(); if(t==='einzahlung')deposits+=numberValue(x.betrag); if(t==='auszahlung')withdrawals+=numberValue(x.betrag);});
  (v1Payouts||[]).forEach(x=>{if(!v4InRange(x.erstellt_am,r))return; const t=String(x.typ||'').toLowerCase(); const a=numberValue(x.betrag); withdrawals+=a; if(t.includes('gehalt'))wages+=a; else clanExpenses+=a;});
  (v1Rates||[]).forEach(x=>{if(String(x.status||'').toLowerCase()==='bezahlt' && v4InRange(x.bezahlt_am,r)) deposits+=numberValue(x.betrag);});
  (v1Warnings||[]).forEach(x=>{if(v4InRange(x.erstellt_am,r)) deposits+=numberValue(x.mahngebuehr);});
  (orderSettlements||[]).forEach(x=>{if(v4InRange(x.datum,r)) orderCount++;});
  return {deposits,withdrawals,wages,clanExpenses,change:deposits-withdrawals,orderCount};
}
function renderMonthlyOverview(){const d=calculateMonthlyOverview();setText('monthlyIncome',money(d.deposits));setText('monthlyExpenses',money(d.withdrawals));setText('monthlyWages',money(d.wages));setText('monthlyClanExpenses',money(d.clanExpenses));setText('monthlyChange',money(d.change));setText('monthlyOrderCount',String(d.orderCount));}

function renderV1(){ fillV1EmployeeSelects(); renderIncome(); renderPayouts(); renderLoans(); renderOverview(); try{renderBookings();updateBookingSummary(bookings);renderOrderSettlements();renderSavings();renderEmployees();renderCashChecks();renderActivityLogs();renderFinancialControlStatus();initializeMonthlyPeriod();renderMonthlyOverview();}catch(e){console.warn('Render-Bestandsbereiche:',e);} }

async function initializeBookkeeping(){
  try{
    if(!hasSupabase()){renderConnectionIndicators();return;}
    try{await loadCurrentUser();}catch(e){console.warn('Benutzer:',e);}
    try{await loadCurrentEmployee();}catch(e){console.warn('Mitarbeiterprofil:',e);}
    await loadBookkeepingData();
    fillV1EmployeeSelects();
    renderAllBookkeeping();
    renderConnectionIndicators();
    try{renderPermissionState();renderBookkeepingStatus();applyBookkeepingPermissions();}catch(e){console.warn('Status:',e);}
    renderFinancialChart();
  }catch(e){console.error('Buchhaltung Initialisierung:',e);renderConnectionIndicators();showToast('Buchhaltung konnte nicht vollständig geladen werden: '+(e?.message||e),'error');}
}

// Exact permission model for Ehrenmarkt bookkeeping: rang only.
function getCurrentRank(){ return String(currentEmployee?.rang||'').trim(); }
function isStadtleitung(){ return getCurrentRank().toLowerCase()==='stadtleitung'; }
function isLeitung(){ const r=getCurrentRank().toLowerCase(); return r==='leitung'||r==='stadtleitung'; }
function isMitarbeiter(){ return getCurrentRank().toLowerCase()==='mitglied'; }
function canManageBookkeeping(){ return isLeitung(); }
function canCreateDeposit(){ return isLeitung()||isMitarbeiter(); }


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


function v4FillWorkerSelect(){const s=document.getElementById('workerName');if(!s||s.tagName!=='SELECT')return;s.innerHTML='<option value="">Mitarbeiter auswählen</option>'+employees.map(e=>'<option value="'+escapeHtml(e.id)+'">'+escapeHtml(e.name||e.username||e.user_id)+'</option>').join('');}
function v4OpenWorkerModal(){v4FillWorkerSelect();const m=document.getElementById('workerModal');if(m)m.classList.add('active');}
function v4SaveWorker(){if(!v1CanManage())return;const sel=document.getElementById('workerName');const emp=employees.find(e=>String(e.id)===String(sel?.value));const salary=numberValue(document.getElementById('workerSalary')?.value);const note=(document.getElementById('workerNote')?.value||'').trim();if(!emp||salary<0){showToast('Mitarbeiter und gültiges Gehalt auswählen.','error');return;}currentWorkers.push({employee_id:emp.id,name:emp.name||emp.username||emp.user_id,salary,note});if(typeof renderCurrentWorkers==='function')renderCurrentWorkers();if(typeof updateWorkerTotals==='function')updateWorkerTotals();const m=document.getElementById('workerModal');if(m)m.classList.remove('active');}
window.openWorkerModal=v4OpenWorkerModal; window.saveWorker=v4SaveWorker;

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initializeBookkeeping,{once:true});}else{initializeBookkeeping();}

window.renderFinancialChart=renderFinancialChart; window.addEventListener('resize',()=>{try{renderFinancialChart();}catch(e){}});




function renderFinancialControlStatus(){
  const el=document.getElementById('controlStatus');
  if(!el)return;
  const d=calculateFinancialOverview();
  const warnings=[];
  if(d.currentClanBalance<0)warnings.push('Clan-Kasse negativ');
  if(d.savingsBalance<0)warnings.push('Sparkonto negativ');
  el.textContent=warnings.length?warnings.join(' · '):'Finanzdaten geprüft – keine Auffälligkeiten.';
  el.className='info-banner '+(warnings.length?'danger-text':'success-text');
  el.style.display='block';
}

function renderBookkeepingStatus(){
  renderConnectionIndicators();
  const rank=document.getElementById('currentUserRank');
  const perm=document.getElementById('currentUserPermission');
  if(rank)rank.textContent=getCurrentRank()||'—';
  if(perm)perm.textContent=v1CanManage()?'Vollzugriff auf die Buchhaltung':v1IsMember()?'Mitarbeiterzugriff':'Leseberechtigung';
}

function initializeMonthlyPeriod(){
  const input=document.getElementById('monthlyPeriod');
  if(input && !input.value){const n=new Date();input.value=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
}

/* =========================================================
   EHRENMARKT FINAL V1 – FUNKTIONSLAYER
   Gegen fehlende/alte Button-Handler und echte Supabase-Struktur.
========================================================= */

async function saveIncomeEntry(){
  if(!v1CanManage() && !v1IsMember()){ v1Status('incomeStatus','Keine Berechtigung für Einnahmen.',false); return; }
  const amount=numberValue(document.getElementById('donationAmount')?.value);
  const type=(document.getElementById('incomeType')?.value||'Sonstige Einnahme').trim();
  const purpose=(document.getElementById('incomePurpose')?.value||'').trim();
  const note=(document.getElementById('incomeNote')?.value||'').trim();
  if(amount<=0){v1Status('incomeStatus','Bitte einen gültigen Betrag eingeben.',false);return;}
  if(type==='Spende'){
    if(!currentUser?.id){v1Status('incomeStatus','Kein angemeldeter Benutzer.',false);return;}
    const payload={betrag:amount,mitarbeiter_id:currentUser.id,zweck:purpose||'Spende für Clan',erstellt_am:new Date().toISOString()};
    const {data,error}=await buchhaltungDB.from('buchhaltung_spenden').insert(payload).select().single();
    if(error){v1Status('incomeStatus',error.message,false);return;}
    v1Donations.unshift(data);
    await writeActivityLog('Einnahmen','Spende',data.id,{betrag:amount,zweck:purpose});
    await notifyBookkeeping({title:'Neue Clan-Spende',type:'Spende',channel:'Einzahlungen',amount,from:currentEmployee?.name||currentUser.email,to:'Clan',purpose:purpose||'Spende für Clan',createdBy:currentEmployee?.name||currentUser.email,date:data.erstellt_am});
  }else{
    const payload={typ:type,betrag:amount,zweck:purpose||type,notiz:note,erstellt_von:currentUser?.id||null,erstellt_von_name:currentEmployee?.name||currentUser?.email||null,created_at:new Date().toISOString()};
    const {data,error}=await buchhaltungDB.from('buchhaltung_einnahmen').insert(payload).select().single();
    if(error){v1Status('incomeStatus',error.message,false);return;}
    v1Income.unshift(data);
    await writeActivityLog('Einnahmen',type,data.id,payload);
    await notifyBookkeeping({title:'Neue Einnahme',type,channel:'Einzahlungen',amount,from:currentEmployee?.name||currentUser?.email,to:'Clan',purpose:payload.zweck,createdBy:payload.erstellt_von_name,date:payload.created_at,note});
  }
  document.getElementById('donationAmount').value='';document.getElementById('incomePurpose').value='';document.getElementById('incomeNote').value='';
  renderIncome();renderOverview();renderMonthlyOverview();v1Status('incomeStatus','Einnahme gespeichert.','success');
}

async function savePayoutEntry(){
  if(!v1CanManage()){v1Status('payoutStatus','Nur Leitung oder Stadtleitung darf Auszahlungen speichern.',false);return;}
  const amount=numberValue(document.getElementById('payoutAmount')?.value); const type=(document.getElementById('payoutType')?.value||'Sonstige Ausgabe').trim();
  const employeeId=document.getElementById('payoutEmployee')?.value||''; const emp=employees.find(e=>String(e.user_id)===String(employeeId));
  const month=document.getElementById('payoutMonth')?.value||null; const purpose=(document.getElementById('payoutPurpose')?.value||'').trim();
  if(amount<=0||!emp){v1Status('payoutStatus','Bitte Mitarbeiter und gültigen Betrag auswählen.',false);return;}
  const payload={mitarbeiter_id:emp.user_id,typ,betrag:amount,beschreibung:purpose||type,monat:month,erstellt_am:new Date().toISOString()};
  const {data,error}=await buchhaltungDB.from('buchhaltung_auszahlungen').insert(payload).select().single();
  if(error){v1Status('payoutStatus',error.message,false);return;}
  v1Payouts.unshift({...data,mitarbeiter_name:emp.name});
  await writeActivityLog('Auszahlungen',type,data.id,payload);
  await notifyBookkeeping({title:'Neue Auszahlung',type,channel:'Auszahlungen',amount,to:emp.name,purpose:purpose||type,createdBy:currentEmployee?.name||currentUser?.email,date:data.erstellt_am,note:month?('Monat: '+month):''});
  document.getElementById('payoutAmount').value='';document.getElementById('payoutEmployee').value='';document.getElementById('payoutPurpose').value='';
  renderPayouts();renderOverview();renderEmployees();renderMonthlyOverview();v1Status('payoutStatus','Auszahlung gespeichert.','success');
}

async function saveLoan(){
  if(!v1IsStadt()){v1Status('loanStatus','Nur die Stadtleitung darf ein Darlehen genehmigen.',false);return;}
  const memberId=document.getElementById('loanMember')?.value||''; const member=employees.find(e=>String(e.user_id)===String(memberId));
  const original=numberValue(document.getElementById('loanAmount')?.value); const interest=Math.max(0,numberValue(document.getElementById('loanInterest')?.value));
  const mode=document.getElementById('loanMode')?.value||'einmalig'; let installment=numberValue(document.getElementById('loanInstallment')?.value); const dueRaw=document.getElementById('loanFirstDue')?.value;
  if(!member||original<=0){v1Status('loanStatus','Bitte Mitarbeiter und gültigen Darlehensbetrag auswählen.',false);return;}
  const interestAmount=original*interest/100; const total=original+interestAmount;
  if(mode==='woechentlich' && installment<=0) installment=total;
  const due=dueRaw?new Date(dueRaw+'T12:00:00'):new Date();
  const count=mode==='woechentlich'?Math.max(1,Math.ceil(total/installment)):1;
  const payload={mitglied_id:member.user_id,originalbetrag:original,zinssatz:interest,zinsbetrag:interestAmount,gesamtrueckzahlung:total,rueckzahlungsart:mode,ratenbetrag:mode==='woechentlich'?installment:total,anzahl_raten:count,bereits_gezahlt:0,offen:total,naechste_rate_am:due.toISOString(),mahnungen:0,status:'Offen',genehmigt_von:currentUser.id,genehmigt_am:new Date().toISOString(),erstellt_am:new Date().toISOString()};
  const {data,error}=await buchhaltungDB.from('buchhaltung_darlehen').insert(payload).select().single();
  if(error){v1Status('loanStatus',error.message,false);return;}
  v1Loans.unshift({...data,mitglied_name:member.name});
  const rows=[]; let rest=total; for(let i=1;rest>0.005&&i<=500;i++){const a=mode==='woechentlich'?Math.min(installment,rest):rest; const d=new Date(due.getTime()+(i-1)*7*86400000);rows.push({darlehen_id:data.id,raten_nummer:i,betrag:a,faellig_am:d.toISOString(),status:'Offen'});rest-=a;if(mode!=='woechentlich')break;}
  if(rows.length){const rr=await buchhaltungDB.from('buchhaltung_darlehen_raten').insert(rows).select();if(rr.error){v1Status('loanStatus','Darlehen gespeichert, Raten konnten aber nicht angelegt werden: '+rr.error.message,false);return;}v1Rates.push(...(rr.data||[]));}
  await writeActivityLog('Geldverleih','Darlehen genehmigt',data.id,payload);
  await notifyBookkeeping({title:'Darlehen genehmigt',type:'Darlehen',channel:'Geldverleih',amount:original,from:'Clan',to:member.name,purpose:'Darlehen genehmigt',createdBy:currentEmployee?.name||currentUser.email,date:payload.genehmigt_am});
  renderLoans();renderOverview();v1Status('loanStatus','Darlehen gespeichert.','success');
}

function runFinancialControl(){
  const d=calculateFinancialOverview(); const warnings=[];
  if(d.currentClanBalance<0)warnings.push('Die verfügbare Clan-Kasse ist negativ.');
  if(d.openAmount<0)warnings.push('Offene Darlehenssumme ist ungültig.');
  const el=document.getElementById('controlStatus');
  if(el){el.textContent=warnings.length?warnings.join(' '):'Keine Auffälligkeiten in den geladenen Finanzdaten.';el.className='info-banner '+(warnings.length?'danger-text':'success-text');el.style.display='block';}
  if(typeof renderFinancialControlStatus==='function'){try{renderFinancialControlStatus()}catch(e){}}
  return warnings;
}

async function reloadBookkeepingPage(){
  try{await loadCurrentUser();await loadCurrentEmployee();await loadBookkeepingData();fillV1EmployeeSelects();renderAllBookkeeping();renderConnectionIndicators();renderFinancialChart();showToast('Buchhaltung aktualisiert.','success');}
  catch(e){console.error(e);showToast('Aktualisierung fehlgeschlagen: '+(e?.message||e),'error');}
}

// Alle globalen Button-Handler explizit verfügbar machen.
window.saveIncomeEntry=saveIncomeEntry;
window.savePayoutEntry=savePayoutEntry;
window.saveLoan=saveLoan;
window.runFinancialControl=runFinancialControl;
window.reloadBookkeepingPage=reloadBookkeepingPage;
window.payLoanRate=payLoanRate;
window.fillV1EmployeeSelects=fillV1EmployeeSelects;
window.renderEmployees=renderEmployees;
window.saveSavingsGoal=saveSavingsGoal;

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initializeBookkeeping,{once:true});
else initializeBookkeeping();
