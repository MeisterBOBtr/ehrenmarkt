/* =====================================================
   EHRENMARKT
   CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 1 VON 10
===================================================== */
alert("BUCHHALTUNG JS GELADEN");

/* =========================================================
   SUPABASE
   ========================================================= */

const supabaseClient = window.supabaseClient;

if (!supabaseClient) {
    console.error("Supabase Client wurde nicht geladen.");
} else {
    console.log("Supabase Client erfolgreich geladen.");
}


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
        supabaseClient &&
        typeof supabaseClient.from ===
            "function"
    );

}


/* =====================================================
   FEHLER
===================================================== */

function showDatabaseError(
    message
){

    console.error(
        "Buchhaltung:",
        message
    );


    alert(
        "Buchhaltung:\n\n" +
        message
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
            await supabaseClient
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
        await supabaseClient
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
        await supabaseClient
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

            supabaseClient
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

            supabaseClient
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

            supabaseClient
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

            supabaseClient
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

            supabaseClient
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

            supabaseClient
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

            supabaseClient
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
        document.querySelectorAll(".open-area");

    const buttons =
        document.querySelectorAll(".nav-button");

    const selected =
        document.getElementById(id);

    if(!selected){
        console.error("Bereich nicht gefunden:", id);
        return;
    }

    if(selected.classList.contains("active")){

        selected.classList.remove("active");

        if(button){
            button.classList.remove("active");
        }

        return;
    }

    areas.forEach(area => {
        area.classList.remove("active");
    });

    buttons.forEach(btn => {
        btn.classList.remove("active");
    });

    selected.classList.add("active");

    if(button){
        button.classList.add("active");
    }

    setTimeout(() => {

        selected.scrollIntoView({
            behavior:"smooth",
            block:"start"
        });

    },100);

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
   BUCHUNG
===================================================== */

function openBookingModal(){

    if(
        !canCreateDeposit()
    ){

        alert(
            "Du hast keine Berechtigung, eine Buchung zu erstellen."
        );

        return;

    }


    const type =
        getElement(
            "bookingType"
        );


    /*
     * Mitarbeiter dürfen ausschließlich
     * Einzahlungen erstellen.
     */

    if(
        isMitarbeiter() &&
        type
    ){

        type.value =
            "Einzahlung";

        type.disabled =
            true;

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
        currentEmployee &&
        !createdBy.value
    ){

        createdBy.value =
            currentEmployee.name ||
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

}


function closeBookingModal(){

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

}


/* =====================================================
   BUCHUNG FORMULAR LEEREN
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

async function saveBooking(){

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
     * Mitarbeiter dürfen keine Auszahlung
     * erstellen.
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


    const {
        data,
        error
    } =
        await supabaseClient
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
     * Lokale Daten aktualisieren.
     */

    bookings.unshift(
        data
    );


    /*
     * Protokoll separat speichern.
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
            getValue(
                "bookingStatus"
            ) ||
            "Offen",

        neue_werte:
            data

    };


    const {
        data: logData,
        error: logError
    } =
        await supabaseClient
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
     *
     * Die Buchung bleibt gespeichert,
     * auch wenn Discord einmal nicht
     * erreichbar sein sollte.
     */

    await sendDiscordNotification({

        type:
            type,

        title:
            type === "Einzahlung"
                ? "💰 Neue Einzahlung"
                : "💸 Neue Auszahlung",

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

        note:
            payload.notiz

    });


    renderBookings();

    updateFinancialOverview();

    renderLogs();

    updateControlCards();

    runFinancialControl();


    closeBookingModal();

    clearBookingForm();

       }

/* =====================================================
   AUFTRAGSABRECHNUNG
===================================================== */

function openOrderModal(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen erstellen."
        );

        return;

    }


    const date =
        getElement(
            "orderDate"
        );


    if(
        date &&
        !date.value
    ){

        date.value =
            nowLocal();

    }


    const createdBy =
        getElement(
            "orderCreatedBy"
        );


    if(
        createdBy &&
        currentEmployee &&
        !createdBy.value
    ){

        createdBy.value =
            currentEmployee.name ||
            "";

    }


    currentWorkers = [];


    renderCurrentWorkers();

    updateWorkerTotals();


    openModal(
        "orderModal"
    );

}


function closeOrderModal(){

    closeModal(
        "orderModal"
    );

}


/* =====================================================
   ARBEITER HINZUFÜGEN
===================================================== */

function addWorker(){

    if(
        !canManageBookkeeping()
    ){

        alert(
            "Nur Leitung und Stadtleitung dürfen Arbeiter hinzufügen."
        );

        return;

    }


    currentWorkers.push({

        name:"",

        salary:0,

        note:""

    });


    renderCurrentWorkers();

    updateWorkerTotals();

}


/* =====================================================
   ARBEITER ANZEIGEN
===================================================== */

function renderCurrentWorkers(){

    const container =
        getElement(
            "workerList"
        );


    if(!container)
        return;


    if(
        currentWorkers.length === 0
    ){

        container.innerHTML = `

            <div class="empty-state">

                Noch keine Arbeiter hinzugefügt.

            </div>

        `;


        updateWorkerTotals();

        return;

    }


    container.innerHTML =

        currentWorkers
            .map(
                (
                    worker,
                    index
                ) => `

                    <div class="worker-row">

                        <div class="worker-row-main">


                            <div class="form-group">

                                <label>
                                    Arbeiter
                                </label>

                                <input
                                    type="text"
                                    value="${escapeHtml(
                                        worker.name
                                    )}"
                                    placeholder="Name"
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

                                <div class="money-input">

                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value="${numberValue(
                                            worker.salary
                                        )}"
                                        oninput="
                                            updateWorker(
                                                ${index},
                                                'salary',
                                                this.value
                                            )
                                        "
                                    >

                                    <span>
                                        $
                                    </span>

                                </div>

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
                                    removeWorker(
                                        ${index}
                                    )
                                "
                            >
                                Entfernen
                            </button>


                        </div>

                    </div>

                `
            )
            .join("");


    updateWorkerTotals();

}


/* =====================================================
   ARBEITER AKTUALISIEREN
===================================================== */

function updateWorker(
    index,
    key,
    value
){

    if(
        !currentWorkers[index]
    ){

        return;

    }


    if(
        key === "salary"
    ){

        currentWorkers[index][key] =
            numberValue(
                value
            );

    }
    else{

        currentWorkers[index][key] =
            value;

    }


    updateWorkerTotals();

}


/* =====================================================
   ARBEITER ENTFERNEN
===================================================== */

function removeWorker(index){

    if(
        !canManageBookkeeping()
    ){

        return;

    }


    currentWorkers.splice(
        index,
        1
    );


    renderCurrentWorkers();

    updateWorkerTotals();

}


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


    if(!warning)
        return;


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

async function saveOrderSettlement(){

    if(
        !canManageBookkeeping()
    ){

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


    if(
        remaining < 0
    ){

        alert(
            "Die Verteilung überschreitet den Gesamtbetrag."
        );

        return;

    }


    const date =
        getValue(
            "orderDate"
        ) ||
        new Date().toISOString();


    const createdBy =
        currentEmployee?.name ||
        getValue(
            "orderCreatedBy"
        ) ||
        "Manuell";


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
            date,

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy,

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
        error: settlementError
    } =
        await supabaseClient
            .from(
                TABLE_ORDERS
            )
            .insert(
                settlementPayload
            )
            .select()
            .single();


    if(settlementError){

        console.error(
            "Auftragsabrechnung:",
            settlementError
        );


        alert(
            "Auftragsabrechnung konnte nicht gespeichert werden.\n\n" +
            settlementError.message
        );

        return;

    }


    /*
     * Arbeiter separat speichern.
     */

    if(
        currentWorkers.length > 0
    ){

        const workerRows =
            currentWorkers.map(
                worker => ({

                    auftragsabrechnung_id:
                        settlement.id,

                    name:
                        worker.name,

                    gehalt:
                        numberValue(
                            worker.salary
                        ),

                    notiz:
                        worker.note || ""

                })
            );


        const {
            data: savedWorkers,
            error: workerError
        } =
            await supabaseClient
                .from(
                    TABLE_ORDER_WORKERS
                )
                .insert(
                    workerRows
                )
                .select();


        if(workerError){

            console.error(
                "Auftragsarbeiter:",
                workerError
            );


            alert(
                "Die Auftragsabrechnung wurde gespeichert, aber die Arbeiter konnten nicht gespeichert werden.\n\n" +
                workerError.message
            );

            return;

        }


        workers.push(
            ...(savedWorkers || [])
        );

    }


    orderSettlements.unshift(
        settlement
    );


    /*
     * Protokoll.
     */

    const {
        data: logData,
        error: logError
    } =
        await supabaseClient
            .from(
                TABLE_LOGS
            )
            .insert({

                typ:
                    "Erstellt",

                bereich:
                    "Auftragsabrechnung",

                aktion:
                    "Auftragsabrechnung erstellt",

                beschreibung:
                    orderNumber +
                    " · " +
                    money(total),

                erstellt_von:
                    currentUser?.id ||
                    null,

                erstellt_von_name:
                    createdBy,

                datum:
                    date,

                status:
                    settlement.status,

                neue_werte:
                    settlement

            })
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
     * Discord.
     */

    await sendDiscordNotification({

        type:
            "Auftragsabrechnung",

        title:
            "📋 Neue Auftragsabrechnung",

        amount:
            total,

        from:
            "Auftrag",

        to:
            "Clan / Arbeiter",

        purpose:
            "Manuelle Auftragsabrechnung",

        category:
            "Auftrag",

        orderNumber:
            orderNumber,

        status:
            settlement.status,

        createdBy:
            createdBy,

        date:
            date,

        description:
            "Clananteil: " +
            money(clan) +
            " · Gehälter: " +
            money(salaries),

        note:
            settlement.notiz

    });


    await loadBookkeepingData();


    renderOrders();

    renderEmployees();

    renderLogs();

    updateFinancialOverview();

    updateControlCards();

    runFinancialControl();


    currentWorkers = [];

    clearOrderForm();

    closeOrderModal();

       }

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
        document.getElementById("orderDate");

    if(date){
        date.value = "";
    }

    const status =
        document.getElementById("orderStatus");

    if(status){
        status.value = "Offen";
    }

    const createdBy =
        document.getElementById("orderCreatedBy");

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
   AUFTRÄGE ANZEIGEN
===================================================== */

function renderOrders(){

    const body =
        document.getElementById(
            "orderTableBody"
        );

    if(!body) return;


    if(orderSettlements.length === 0){

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
        orderSettlements.map(order => {

            const orderId =
                order.auftragsnummer ||
                order.id ||
                "—";

            const total =
                numberValue(
                    order.gesamtbetrag ??
                    order.total
                );

            const clan =
                numberValue(
                    order.clanbetrag ??
                    order.clan
                );

            const salaries =
                numberValue(
                    order.gesamt_gehaelter ??
                    order.salaries
                );

            const orderWorkers =
                workers.filter(
                    worker =>
                        worker.auftragsabrechnung_id ===
                        order.id
                );

            return `
                <tr>

                    <td>
                        ${escapeHtml(orderId)}
                    </td>

                    <td>
                        ${money(total)}
                    </td>

                    <td>
                        ${money(clan)}
                    </td>

                    <td>
                        ${orderWorkers.length}
                    </td>

                    <td>
                        ${money(salaries)}
                    </td>

                    <td>
                        ${escapeHtml(
                            order.status || "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            order.erstellt_von_name ||
                            order.createdBy ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            order.datum ||
                            order.date
                        )}
                    </td>

                    <td>

                        <button
                            class="table-action"
                            onclick="viewOrder('${escapeHtml(order.id)}')"
                        >
                            Details
                        </button>

                    </td>

                </tr>
            `;

        }).join("");

}


/* =====================================================
   AUFTRÄGE FILTERN
===================================================== */

function filterOrders(){

    const search =
        getValue("orderSearch")
            .toLowerCase();

    const status =
        getValue("orderStatusFilter");


    const body =
        document.getElementById(
            "orderTableBody"
        );

    if(!body) return;


    const filtered =
        orderSettlements.filter(order => {

            const text =
                JSON.stringify(order)
                    .toLowerCase();

            return (
                (!search ||
                    text.includes(search)) &&

                (!status ||
                    order.status === status)
            );

        });


    if(filtered.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    Keine passenden Aufträge gefunden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        filtered.map(order => {

            const orderId =
                order.auftragsnummer ||
                order.id ||
                "—";

            const total =
                numberValue(
                    order.gesamtbetrag ??
                    order.total
                );

            const clan =
                numberValue(
                    order.clanbetrag ??
                    order.clan
                );

            const salaries =
                numberValue(
                    order.gesamt_gehaelter ??
                    order.salaries
                );

            const orderWorkers =
                workers.filter(
                    worker =>
                        worker.auftragsabrechnung_id ===
                        order.id
                );

            return `
                <tr>

                    <td>
                        ${escapeHtml(orderId)}
                    </td>

                    <td>
                        ${money(total)}
                    </td>

                    <td>
                        ${money(clan)}
                    </td>

                    <td>
                        ${orderWorkers.length}
                    </td>

                    <td>
                        ${money(salaries)}
                    </td>

                    <td>
                        ${escapeHtml(
                            order.status || "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            order.erstellt_von_name ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            order.datum
                        )}
                    </td>

                    <td>

                        <button
                            class="table-action"
                            onclick="viewOrder('${escapeHtml(order.id)}')"
                        >
                            Details
                        </button>

                    </td>

                </tr>
            `;

        }).join("");

}


/* =====================================================
   AUFTRAG DETAILS
===================================================== */

function viewOrder(id){

    const order =
        orderSettlements.find(
            item =>
                item.id === id
        );

    if(!order) return;


    const orderWorkers =
        workers.filter(
            worker =>
                worker.auftragsabrechnung_id ===
                order.id
        );


    const orderNumber =
        order.auftragsnummer ||
        order.id ||
        "—";

    const total =
        numberValue(
            order.gesamtbetrag ??
            order.total
        );

    const clan =
        numberValue(
            order.clanbetrag ??
            order.clan
        );

    const salaries =
        numberValue(
            order.gesamt_gehaelter ??
            order.salaries
        );


    const workerText =
        orderWorkers.length

            ? orderWorkers.map(worker => {

                return (
                    (worker.name || "Unbekannt") +
                    ": " +
                    money(worker.gehalt)
                );

            }).join("\n")

            : "Keine Arbeiter";


    alert(
        "Auftrag " +
        orderNumber +

        "\n\n" +

        "Gesamt: " +
        money(total) +

        "\n" +

        "An Clan: " +
        money(clan) +

        "\n" +

        "Arbeitergehälter: " +
        money(salaries) +

        "\n\n" +

        "Arbeiter:\n" +
        workerText +

        "\n\n" +

        "Status: " +
        (order.status || "—") +

        "\n" +

        "Erfasst von: " +
        (order.erstellt_von_name || "—") +

        "\n" +

        "Datum: " +
        formatDate(order.datum) +

        (order.notiz
            ? "\n\nNotiz:\n" +
              order.notiz
            : "")
    );

                           }

/* =====================================================
   MITARBEITERÜBERSICHT
===================================================== */

function renderEmployees(){

    const body =
        document.getElementById(
            "employeeTableBody"
        );

    if(!body) return;


    if(employees.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">
                    Noch keine Mitarbeiter vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        employees.map(employee => {

            const employeeId =
                employee.user_id ||
                employee.id;

            const name =
                employee.name ||
                employee.username ||
                employee.minecraft_name ||
                employee.display_name ||
                "Unbekannt";


            const employeeWorkers =
                workers.filter(worker => {

                    if(worker.employee_id){

                        return (
                            worker.employee_id ===
                            employeeId
                        );

                    }

                    return (
                        worker.name === name
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


            const employeeBookings =
                bookings.filter(booking => {

                    const from =
                        String(
                            booking.von ||
                            booking.from ||
                            ""
                        ).toLowerCase();

                    const to =
                        String(
                            booking.an ||
                            booking.to ||
                            ""
                        ).toLowerCase();

                    const employeeName =
                        String(
                            name
                        ).toLowerCase();

                    return (
                        from === employeeName ||
                        to === employeeName
                    );

                });


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

function filterEmployees(){

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

}


/* =====================================================
   MITARBEITER – BUCHUNGEN ZUORDNEN
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
                (sum, transaction) =>
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
                (sum, transaction) =>
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
                (
                    balance /
                    goal
                ) * 100
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
        progress.toFixed(1) + "%"
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

    if(!body) return;


    if(!savingsTransactions.length){

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
            .map(transaction => {

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
                            ${escapeHtml(type)}
                        </td>

                        <td>
                            ${money(amount)}
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

            })
            .join("");

}


/* =====================================================
   SPARKONTO – ZIEL SETZEN
===================================================== */

function setSavingsGoal(){

    const value =
        numberValue(
            getValue("savingsGoal")
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

}


/* =====================================================
   SPARKONTO – FORMULAR SCHLIESSEN
===================================================== */

function closeSavings(){

    closeModal(
        "savingsModal"
    );

}


/* =====================================================
   SPARKONTO – FORMULAR ZURÜCKSETZEN
===================================================== */

function clearSavingsForm(){

    [
        "savingsNumber",
        "savingsAmount",
        "savingsFrom",
        "savingsTo",
        "savingsPurpose",
        "savingsNote"
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if(element){
            element.value = "";
        }

    });

}


/* =====================================================
   MONATSBILANZ
===================================================== */

function updateMonthly(){

    const period =
        getValue("monthlyPeriod") ||
        new Date()
            .toISOString()
            .slice(0,7);


    const parts =
        period.split("-");


    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);


    let income = 0;
    let expenses = 0;
    let wages = 0;
    let count = 0;


    bookings.forEach(booking => {

        const dateValue =
            booking.datum ||
            booking.date;

        if(!dateValue) return;


        const date =
            new Date(dateValue);


        if(
            date.getFullYear() !== year ||
            date.getMonth() + 1 !== month
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


        if(type === "Einzahlung"){

            income += amount;

        }else if(type === "Auszahlung"){

            expenses += amount;

        }


        const category =
            booking.kategorie ||
            booking.category;


        if(category === "Gehalt"){

            wages += amount;

        }

    });


    const change =
        income - expenses;


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
        `${String(month).padStart(2,"0")}/${year}`
    );

}


/* =====================================================
   KASSENABGLEICH – ÖFFNEN
===================================================== */

function openCashCheck(){

    if(!canManageBookkeeping()){

        alert(
            "Du hast keine Berechtigung für den Kassenabgleich."
        );

        return;

    }


    openModal(
        "cashCheckModal"
    );


    setValue(
        "cashCheckDate",
        nowLocal()
    );


    setValue(
        "cashPortalInput",
        getCurrentClanBalance()
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

}


/* =====================================================
   KASSENABGLEICH – SPEICHERN
===================================================== */

async function saveCashCheck(){

    if(!canManageBookkeeping()){

        alert(
            "Du hast keine Berechtigung für den Kassenabgleich."
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
        ) || nowLocal();


    const createdBy =
        currentEmployee?.name ||
        currentEmployee?.username ||
        "Manuell";


    const note =
        getValue(
            "cashCheckNote"
        );


    const payload = {

        portalstand: portal,

        ingame_stand: ingame,

        abweichung: difference,

        datum: date,

        erstellt_von:
            currentUser?.id || null,

        erstellt_von_name:
            createdBy,

        notiz:
            note || null

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
        await supabaseClient
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


    await supabaseClient
        .from(TABLE_LOGS)
        .insert({

            typ: "Erstellt",

            bereich:
                "Kassenabgleich",

            aktion:
                "Kassenabgleich gespeichert",

            beschreibung:
                `Portal: ${money(portal)} · Ingame: ${money(ingame)} · Abweichung: ${money(difference)}`,

            erstellt_von:
                currentUser?.id || null,

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
            note || "",

        description:
            `Portalstand: ${money(portal)} | Ingame-Stand: ${money(ingame)} | Abweichung: ${money(difference)}`

    });


    renderCashChecks();

    renderLogs();

    runFinancialControl();

    closeCashCheck();

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


    if(clanBalance < 0){

        warnings.push(
            "Die Clankasse weist einen negativen Stand auf."
        );

    }


    if(savingsBalance < 0){

        warnings.push(
            "Das Sparkonto weist einen negativen Bestand auf."
        );

    }


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


    if(warningList){

        if(warnings.length === 0){

            warningList.innerHTML = `
                <div class="no-warning">

                    <span class="warning-check">
                        ✓
                    </span>

                    <div>

                        <strong>
                            Keine Warnungen
                        </strong>

                        <p>
                            Aktuell wurden keine auffälligen
                            Buchungen gefunden.
                        </p>

                    </div>

                </div>
            `;

        }else{

            warningList.innerHTML =
                warnings.map(warning => `
                    <div class="warning-item">

                        <span class="warning-icon">
                            !
                        </span>

                        <div>

                            <strong>
                                Prüfung erforderlich
                            </strong>

                            <p>
                                ${escapeHtml(
                                    warning
                                )}
                            </p>

                        </div>

                    </div>
                `).join("");

        }

    }


    setText(
        "lastControlDate",
        formatDate(
            new Date().toISOString()
        )
    );


    updateControlCards(
        warnings.length
    );

}


/* =====================================================
   KONTROLLKARTEN
===================================================== */

function updateControlCards(
    warningCount = 0
){

    const clanBalance =
        getCurrentClanBalance();


    const savingsBalance =
        getSavingsBalance();


    const latestCheck =
        cashChecks.length
            ? cashChecks[
                cashChecks.length - 1
            ]
            : null;


    const latestDifference =
        latestCheck
            ? numberValue(
                latestCheck.abweichung ??
                latestCheck.difference
            )
            : 0;


    const balanceCard =
        document.getElementById(
            "controlBalance"
        );


    if(balanceCard){

        balanceCard.innerHTML = `
            <div class="control-card-icon">
                ◆
            </div>

            <div>

                <h3>
                    Clankasse
                </h3>

                <p>
                    Aktueller berechneter
                    Buchungsstand.
                </p>

                <strong>
                    ${money(clanBalance)}
                </strong>

            </div>
        `;

    }


    const savingsCard =
        document.getElementById(
            "controlSavings"
        );


    if(savingsCard){

        savingsCard.innerHTML = `
            <div class="control-card-icon">
                ◈
            </div>

            <div>

                <h3>
                    Sparkonto
                </h3>

                <p>
                    Aktueller Sparkontostand.
                </p>

                <strong>
                    ${money(savingsBalance)}
                </strong>

            </div>
        `;

    }


    const cashCard =
        document.getElementById(
            "controlCash"
        );


    if(cashCard){

        cashCard.innerHTML = `
            <div class="control-card-icon">
                ◇
            </div>

            <div>

                <h3>
                    Kassenabgleich
                </h3>

                <p>
                    Letzte festgestellte Abweichung.
                </p>

                <strong>
                    ${money(latestDifference)}
                </strong>

            </div>
        `;

    }


    const warningCard =
        document.getElementById(
            "controlWarnings"
        );


    if(warningCard){

        warningCard.innerHTML = `
            <div class="control-card-icon">
                !
            </div>

            <div>

                <h3>
                    Warnungen
                </h3>

                <p>
                    Aktuell erkannte Auffälligkeiten.
                </p>

                <strong>
                    ${
                        warningCount === 0
                            ? "Keine Fehler"
                            : warningCount +
                              " Warnung" +
                              (
                                warningCount === 1
                                    ? ""
                                    : "en"
                              )
                    }
                </strong>

            </div>
        `;

    }


    const rightsCard =
        document.getElementById(
            "controlRights"
        );


    if(rightsCard){

        rightsCard.innerHTML = `
            <div class="control-card-icon">
                ◆
            </div>

            <div>

                <h3>
                    Berechtigungen
                </h3>

                <p>
                    Zugriff auf die
                    Buchhaltung.
                </p>

                <strong>
                    ${
                        canManageBookkeeping()
                            ? "Zugriff geschützt"
                            : "Eingeschränkt"
                    }
                </strong>

            </div>
        `;

    }

}


/* =====================================================
   FINANZÜBERSICHT
===================================================== */

function getCurrentClanBalance(){

    const income =
        bookings
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


    const expenses =
        bookings
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


    return (
        income -
        expenses
    );

}


/* =====================================================
   FINANZÜBERSICHT AKTUALISIEREN
===================================================== */

function updateFinancialOverview(){

    const currentClanBalance =
        getCurrentClanBalance();


    const totalRevenue =
        bookings
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


    const totalDeposits =
        bookings
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


    const totalWithdrawals =
        bookings
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


    const totalWorkerSalaries =
        orderSettlements.reduce(
            (sum, order) =>
                sum +
                numberValue(
                    order.gesamt_gehaelter ??
                    order.salaries
                ),
            0
        );


    const totalClanExpenses =
        bookings
            .filter(
                booking =>
                    (
                        booking.kategorie ||
                        booking.category
                    ) ===
                    "Clan-Ausgabe"
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


    const totalSavings =
        getSavingsBalance();


    const totalOpenAmounts =
        bookings
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


    const totalAssets =
        currentClanBalance +
        totalSavings;


    setText(
        "currentClanBalance",
        money(currentClanBalance)
    );


    setText(
        "totalRevenue",
        money(totalRevenue)
    );


    setText(
        "totalDeposits",
        money(totalDeposits)
    );


    setText(
        "totalWithdrawals",
        money(totalWithdrawals)
    );


    setText(
        "totalWorkerSalaries",
        money(totalWorkerSalaries)
    );


    setText(
        "totalClanExpenses",
        money(totalClanExpenses)
    );


    setText(
        "totalSavings",
        money(totalSavings)
    );


    setText(
        "totalOpenAmounts",
        money(totalOpenAmounts)
    );


    setText(
        "totalBookings",
        bookings.length
    );


    setText(
        "totalAssets",
        money(totalAssets)
    );


    updateControlCards(
        warningCountFromControl()
    );

}


/* =====================================================
   WARNUNGSANZAHL
===================================================== */

function warningCountFromControl(){

    let count = 0;


    if(
        getCurrentClanBalance() < 0
    ){
        count++;
    }


    if(
        getSavingsBalance() < 0
    ){
        count++;
    }


    orderSettlements.forEach(order => {

        const total =
            numberValue(
                order.gesamtbetrag ??
                order.total
            );

        const clan =
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


        const salaries =
            orderWorkers.reduce(
                (sum, worker) =>
                    sum +
                    numberValue(
                        worker.gehalt
                    ),
                0
            );


        if(
            total -
            clan -
            salaries >
            0
        ){
            count++;
        }

    });


    cashChecks.forEach(check => {

        const difference =
            numberValue(
                check.abweichung ??
                check.difference
            );


        if(difference !== 0){
            count++;
        }

    });


    return count;

           }

/* =====================================================
   PROTOKOLL – EINTRAG ERSTELLEN
===================================================== */

async function createLogEntry(
    type,
    action,
    description,
    status = "Erstellt",
    oldValues = null,
    newValues = null
){

    const createdBy =
        currentEmployee?.name ||
        currentEmployee?.username ||
        "Manuell";


    const log = {

        typ:
            type,

        bereich:
            "Buchhaltung",

        aktion:
            action,

        beschreibung:
            description,

        erstellt_von:
            currentUser?.id || null,

        erstellt_von_name:
            createdBy,

        datum:
            nowLocal(),

        status:
            status,

        alte_werte:
            oldValues,

        neue_werte:
            newValues

    };


    if(!hasSupabase()){

        return null;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from(TABLE_LOGS)
            .insert(log)
            .select()
            .single();


    if(error){

        console.error(
            "Protokoll:",
            error
        );

        return null;

    }


    activityLogs.unshift(
        data
    );


    renderLogs();


    return data;

}


/* =====================================================
   PROTOKOLL ANZEIGEN
===================================================== */

function renderLogs(){

    const tbody =
        document.getElementById(
            "logTableBody"
        );

    if(!tbody) return;


    setText(
        "logCount",
        activityLogs.length
    );


    const today =
        new Date()
            .toISOString()
            .slice(0,10);


    const todayCount =
        activityLogs.filter(log => {

            const date =
                log.datum ||
                log.date;

            return String(date)
                .slice(0,10) ===
                today;

        }).length;


    setText(
        "logToday",
        todayCount
    );


    setText(
        "logChanges",
        activityLogs.filter(
            log =>
                (
                    log.aktion ||
                    log.action
                ) !==
                "Storno"
        ).length
    );


    setText(
        "logCancellations",
        activityLogs.filter(
            log =>
                (
                    log.aktion ||
                    log.action
                ) ===
                "Storno"
        ).length
    );


    if(!activityLogs.length){

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-row"
                >
                    Noch keine Protokolleinträge vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        activityLogs
            .slice()
            .sort(
                (a,b) =>
                    new Date(
                        b.datum ||
                        b.date
                    ) -
                    new Date(
                        a.datum ||
                        a.date
                    )
            )
            .map(log => {

                const date =
                    log.datum ||
                    log.date;

                const type =
                    log.typ ||
                    log.type ||
                    "—";

                const action =
                    log.aktion ||
                    log.action ||
                    "—";

                const description =
                    log.beschreibung ||
                    log.description ||
                    "—";

                const createdBy =
                    log.erstellt_von_name ||
                    log.createdBy ||
                    "—";


                return `
                    <tr>

                        <td>
                            ${formatDate(date)}
                        </td>

                        <td>
                            ${escapeHtml(type)}
                        </td>

                        <td>
                            ${escapeHtml(action)}
                        </td>

                        <td>
                            ${escapeHtml(
                                description
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                createdBy
                            )}
                        </td>

                        <td>

                            <button
                                class="table-action"
                                onclick="showLogDetail('${escapeHtml(String(log.id))}')"
                            >
                                Details
                            </button>

                        </td>

                    </tr>
                `;

            })
            .join("");

}


/* =====================================================
   PROTOKOLL FILTER
===================================================== */

function filterLogs(){

    const search =
        getValue("logSearch")
            .toLowerCase()
            .trim();


    const type =
        getValue(
            "logTypeFilter"
        );


    const period =
        getValue(
            "logPeriodFilter"
        );


    const rows =
        document.querySelectorAll(
            "#logTableBody tr"
        );


    rows.forEach(row => {

        const text =
            row.innerText
                .toLowerCase();


        const typeMatch =
            !type ||
            text.includes(
                type.toLowerCase()
            );


        let periodMatch =
            true;


        const dateCell =
            row.children[0];


        if(
            period &&
            dateCell
        ){

            const rowDate =
                dateCell.innerText
                    .trim();


            const now =
                new Date();


            if(
                period === "Heute"
            ){

                periodMatch =
                    rowDate ===
                    formatDate(
                        now
                    );

            }

            else if(
                period === "Dieser Monat"
            ){

                const month =
                    String(
                        now.getMonth() + 1
                    ).padStart(2,"0");

                const year =
                    now.getFullYear();


                periodMatch =
                    rowDate.endsWith(
                        `${month}.${year}`
                    );

            }

            else if(
                period === "Dieses Jahr"
            ){

                periodMatch =
                    rowDate.endsWith(
                        String(
                            now.getFullYear()
                        )
                    );

            }

        }


        row.style.display =
            (
                (!search ||
                    text.includes(search)) &&
                typeMatch &&
                periodMatch
            )
                ? ""
                : "none";

    });

}


/* =====================================================
   PROTOKOLL DETAILS
===================================================== */

function showLogDetail(id){

    const log =
        activityLogs.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if(!log) return;


    const content =
        document.getElementById(
            "logDetailContent"
        );


    if(content){

        const type =
            log.typ ||
            log.type ||
            "—";

        const action =
            log.aktion ||
            log.action ||
            "—";

        const date =
            log.datum ||
            log.date;

        const createdBy =
            log.erstellt_von_name ||
            log.createdBy ||
            "—";

        const description =
            log.beschreibung ||
            log.description ||
            "—";


        content.innerHTML = `

            <div class="detail-grid">

                <div>

                    <span>
                        Typ
                    </span>

                    <strong>
                        ${escapeHtml(type)}
                    </strong>

                </div>


                <div>

                    <span>
                        Aktion
                    </span>

                    <strong>
                        ${escapeHtml(action)}
                    </strong>

                </div>


                <div>

                    <span>
                        Datum
                    </span>

                    <strong>
                        ${formatDate(date)}
                    </strong>

                </div>


                <div>

                    <span>
                        Erstellt von
                    </span>

                    <strong>
                        ${escapeHtml(createdBy)}
                    </strong>

                </div>

            </div>


            <div class="detail-description">

                <span>
                    Beschreibung
                </span>

                <p>
                    ${escapeHtml(description)}
                </p>

            </div>

        `;

    }


    openModal(
        "logDetailModal"
    );

}

/* =====================================================
   BUCHUNGEN FILTERN
===================================================== */

function filterBookings(){

    const search =
        getValue(
            "bookingSearch"
        )
        .toLowerCase()
        .trim();


    const type =
        getValue(
            "bookingTypeFilter"
        );


    const category =
        getValue(
            "bookingCategoryFilter"
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
                    booking.status
                ]
                .join(" ")
                .toLowerCase();


                const matchesSearch =
                    !search ||
                    text.includes(search);


                const matchesType =
                    !type ||
                    booking.art === type;


                const matchesCategory =
                    !category ||
                    booking.kategorie === category;


                return (
                    matchesSearch &&
                    matchesType &&
                    matchesCategory
                );

            }
        );


    const body =
        document.getElementById(
            "bookingTableBody"
        );


    if(!body) return;


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
                booking => `

                    <tr>

                        <td>
                            ${escapeHtml(
                                booking.buchungsnummer ||
                                "—"
                            )}
                        </td>

                        <td>
                            <span class="status-badge ${
                                booking.art === "Einzahlung"
                                    ? "paid"
                                    : "open"
                            }">
                                ${escapeHtml(
                                    booking.art || "—"
                                )}
                            </span>
                        </td>

                        <td>
                            ${money(
                                booking.betrag
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                booking.von || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                booking.an || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                booking.zweck || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                booking.kategorie || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                booking.auftragsnummer || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                booking.zahlungsart || "—"
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                booking.datum
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                booking.erstellt_von_name || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                booking.status || "—"
                            )}
                        </td>

                    </tr>

                `
            )
            .join("");


    updateBookingSummary(
        filtered
    );

}


/* =====================================================
   BUCHUNGSÜBERSICHT
===================================================== */

function updateBookingSummary(
    list = bookings
){

    let income = 0;

    let expenses = 0;


    list.forEach(
        booking => {

            const amount =
                numberValue(
                    booking.betrag
                );


            if(
                booking.art ===
                "Einzahlung"
            ){

                income +=
                    amount;

            }else if(
                booking.art ===
                "Auszahlung"
            ){

                expenses +=
                    amount;

            }

        }
    );


    const net =
        income -
        expenses;


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
        money(net)
    );


    setText(
        "bookingCount",
        list.length
    );

}


/* =====================================================
   SPARKONTO SPEICHERN
===================================================== */

async function saveSavings(){

    if(
        !canManageBookkeeping()
    ){

        alert(
            "Du hast keine Berechtigung für das Sparkonto."
        );

        return;

    }


    const type =
        getValue(
            "savingsType"
        );


    const amount =
        numberValue(
            getValue(
                "savingsAmount"
            )
        );


    if(
        !type ||
        amount <= 0
    ){

        alert(
            "Bitte Art und einen gültigen Betrag eingeben."
        );

        return;

    }


    const currentBalance =
        getSavingsBalance();


    if(
        type === "Auszahlung" &&
        amount > currentBalance
    ){

        alert(
            "Die Auszahlung übersteigt das vorhandene Sparkonto."
        );

        return;

    }


    const number =
        getValue(
            "savingsNumber"
        ) ||
        "SP-" + Date.now();


    const date =
        getValue(
            "savingsDate"
        ) ||
        nowLocal();


    const payload = {

        buchungsnummer:
            number,

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
            currentUser
                ? currentUser.id
                : null,

        erstellt_von_name:
            getCurrentRank() ||
            "Manuell",

        notiz:
            getValue(
                "savingsNote"
            )

    };


    if(!hasSupabase()){

        alert(
            "Die Verbindung zur Buchhaltung ist nicht verfügbar."
        );

        return;

    }


    try{

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    TABLE_SAVINGS
                )
                .insert(
                    payload
                )
                .select()
                .single();


        if(error)
            throw error;


        savingsTransactions.push(
            data
        );


        await createLogEntry(
            "Sparkonto",
            "Erstellt",
            number +
            " · " +
            type +
            " · " +
            money(amount),
            "Erstellt",
            null,
            data
        );


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

            orderNumber:
                "",

            status:
                "Erstellt",

            createdBy:
                payload.erstellt_von_name,

            date:
                date,

            note:
                payload.notiz

        });


        renderSavings();

        updateFinancialOverview();

        runFinancialControl();


        clearSavingsForm();

        closeSavings();


    }catch(error){

        console.error(
            "Fehler beim Speichern der Sparkonto-Buchung:",
            error
        );


        showDatabaseError(
            error
        );

    }

}


/* =====================================================
   SPARKONTO FORMULAR LEEREN
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

           }

/* =====================================================
   EVENT LISTENER
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const monthly =
            document.getElementById(
                "monthlyPeriod"
            );


        if(
            monthly &&
            !monthly.value
        ){

            monthly.value =
                new Date()
                    .toISOString()
                    .slice(0,7);

        }


        try{

            await loadCurrentUser();

            await loadCurrentEmployee();

            await loadBookkeepingData();


        }catch(error){

            console.error(
                "Fehler beim Laden der Buchhaltung:",
                error
            );

        }


        renderBookings();

        updateBookingSummary();

        renderOrders();

        renderEmployees();

        renderSavings();

        updateMonthly();

        renderCashChecks();

        renderLogs();

        updateFinancialOverview();

        runFinancialControl();


        updatePermissionInterface();

    }
);


/* =====================================================
   BERECHTIGUNGEN IN DER OBERFLÄCHE
===================================================== */

function updatePermissionInterface(){

    const managementAllowed =
        canManageBookkeeping();

    const depositAllowed =
        canCreateDeposit();


    document
        .querySelectorAll(
            "[data-bookkeeping-management]"
        )
        .forEach(
            element => {

                element.style.display =
                    managementAllowed
                        ? ""
                        : "none";

            }
        );


    document
        .querySelectorAll(
            "[data-bookkeeping-deposit]"
        )
        .forEach(
            element => {

                element.style.display =
                    depositAllowed
                        ? ""
                        : "none";

            }
        );

}


/* =====================================================
   MODAL – AUSSENKLICK
===================================================== */

document.addEventListener(
    "click",
    event => {

        const target =
            event.target;


        if(
            target.classList &&
            (
                target.classList.contains(
                    "finance-modal"
                ) ||
                target.classList.contains(
                    "modal-overlay"
                )
            )
        ){

            target.classList.remove(
                "active"
            );

        }

    }
);


/* =====================================================
   ESC – MODALE SCHLIESSEN
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        if(
            event.key !==
            "Escape"
        ){

            return;

        }


        document
            .querySelectorAll(
                ".finance-modal.active, .modal-overlay.active"
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
   MONATSBILANZ AKTUALISIEREN
===================================================== */

const monthlyPeriod =
    document.getElementById(
        "monthlyPeriod"
    );


if(monthlyPeriod){

    monthlyPeriod.addEventListener(
        "change",
        () => {

            updateMonthly();

        }
    );

}


/* =====================================================
   BUCHUNGEN – SUMMARY BEIM LADEN
===================================================== */

function refreshBookkeeping(){

    renderBookings();

    updateBookingSummary();

    renderOrders();

    renderEmployees();

    renderSavings();

    updateMonthly();

    renderCashChecks();

    renderLogs();

    updateFinancialOverview();

    runFinancialControl();

}


/* =====================================================
   STARTWERTE
===================================================== */

setText(
    "currentClanBalance",
    money(0)
);

setText(
    "totalRevenue",
    money(0)
);

setText(
    "totalDeposits",
    money(0)
);

setText(
    "totalWithdrawals",
    money(0)
);

setText(
    "totalWorkerSalaries",
    money(0)
);

setText(
    "totalClanExpenses",
    money(0)
);

setText(
    "totalSavings",
    money(0)
);

setText(
    "totalOpenAmounts",
    money(0)
);

setText(
    "totalBookings",
    0
);

setText(
    "totalAssets",
    money(0)
);

setText(
    "bookingIncome",
    money(0)
);

setText(
    "bookingExpense",
    money(0)
);

setText(
    "bookingNet",
    money(0)
);

setText(
    "bookingCount",
    0
);

