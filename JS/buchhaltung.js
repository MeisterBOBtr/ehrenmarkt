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
        ? String(element.value || "").trim()
        : "";
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
                .replace(",", ".")
                .replace(/[^\d.-]/g, "")
        );

    return Number.isFinite(number)
        ? number
        : 0;

}


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

function formatMoney(value){
    return money(value);
}


function escapeHtml(value){

    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}


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

    if(Number.isNaN(date.getTime())){

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
   FEHLERMELDUNG
===================================================== */

function showDatabaseError(error){

    console.error(
        "Buchhaltung:",
        error
    );

    const message =
        error?.message ||
        String(error || "Unbekannter Fehler.");

    alert(
        "Buchhaltung:\n\n" +
        message
    );

}


/* =====================================================
   MODAL-HILFE
===================================================== */

function openModal(id){

    const modal =
        document.getElementById(id);

    if(modal){

        modal.classList.add("active");

    }

}


function closeModal(id){

    const modal =
        document.getElementById(id);

    if(modal){

        modal.classList.remove("active");

    }

}


/* =====================================================
   BERECHTIGUNGEN – GRUNDLAGE
===================================================== */

function getCurrentRank(){

    if(!currentEmployee){

        return "";

    }

    return String(
        currentEmployee.rang || ""
    ).trim();

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
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 2 VON 10
   BENUTZER + MITARBEITER + DATEN
===================================================== */


/* =====================================================
   AKTUELLEN BENUTZER LADEN
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
   MITARBEITERDATEN LADEN
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
                .from(TABLE_EMPLOYEES)
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

            buchhaltungDB
                .from(TABLE_BOOKINGS)
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),

            buchhaltungDB
                .from(TABLE_ORDERS)
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),

            buchhaltungDB
                .from(TABLE_ORDER_WORKERS)
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:true
                    }
                ),

            buchhaltungDB
                .from(TABLE_EMPLOYEES)
                .select("*")
                .order(
                    "name",
                    {
                        ascending:true
                    }
                ),

            buchhaltungDB
                .from(TABLE_SAVINGS)
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),

            buchhaltungDB
                .from(TABLE_CASH_CHECKS)
                .select("*")
                .order(
                    "datum",
                    {
                        ascending:false
                    }
                ),

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


        /* =============================================
           FEHLER EINZELN PRÜFEN
        ============================================= */

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


        /* =============================================
           DATEN ÜBERNEHMEN
        ============================================= */

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

        showDatabaseError(error);

        return false;

    }

}


/* =====================================================
   BENUTZERINFORMATION AKTUALISIEREN
===================================================== */

function updateUserInformation(){

    if(!currentEmployee){

        setText(
            "currentUserName",
            "Unbekannt"
        );

        setText(
            "currentUserRank",
            "Keine Berechtigung"
        );

        return;

    }

    setText(
        "currentUserName",
        currentEmployee.name ||
        "Unbekannt"
    );

    setText(
        "currentUserRank",
        currentEmployee.rang ||
        "Mitarbeiter"
    );

}


/* =====================================================
   BERECHTIGUNGSOBERFLÄCHE
===================================================== */

function updatePermissionInterface(){

    const managementAllowed =
        canManageBookkeeping();

    const depositAllowed =
        canCreateDeposit();


    document
        .querySelectorAll(
            "[data-management-only]"
        )
        .forEach(element => {

            element.style.display =
                managementAllowed
                    ? ""
                    : "none";

        });


    document
        .querySelectorAll(
            "[data-deposit-only]"
        )
        .forEach(element => {

            element.style.display =
                depositAllowed
                    ? ""
                    : "none";

        });


    document
        .querySelectorAll(
            "[data-employee-only]"
        )
        .forEach(element => {

            element.style.display =
                isMitarbeiter()
                    ? ""
                    : "none";

        });

}


/* =====================================================
   FALKENSTEIN – CLAN-BUCHHALTUNG V0.1 BETA
   TEIL 3 VON 10
   NAVIGATION + FINANZÜBERSICHT
===================================================== */


/* =====================================================
   NAVIGATION
===================================================== */

window.showArea = function(id, button){

    const area =
        document.getElementById(id);

    if(!area){

        console.error(
            "Bereich nicht gefunden:",
            id
        );

        return;

    }


    const alreadyOpen =
        area.classList.contains("active");


    document
        .querySelectorAll(".open-area")
        .forEach(element => {

            element.classList.remove(
                "active"
            );

        });


    document
        .querySelectorAll(".nav-button")
        .forEach(element => {

            element.classList.remove(
                "active"
            );

        });


    /*
     * Klick auf bereits geöffneten
     * Bereich = Bereich schließen.
     */

    if(alreadyOpen){

        return;

    }


    area.classList.add(
        "active"
    );


    if(button){

        button.classList.add(
            "active"
        );

    }


    setTimeout(
        () => {

            area.scrollIntoView({
                behavior:"smooth",
                block:"start"
            });

        },
        100
    );

};


/* =====================================================
   BUCHUNGEN – GRUNDWERTE
===================================================== */

function getBookingType(booking){

    return String(
        booking?.art || ""
    ).trim();

}


function getBookingAmount(booking){

    return numberValue(
        booking?.betrag
    );

}


/* =====================================================
   EINZAHLUNGEN
===================================================== */

function getTotalDeposits(){

    return bookings
        .filter(
            booking =>
                getBookingType(
                    booking
                ) === "Einzahlung"
        )
        .reduce(
            (sum,booking) =>
                sum +
                getBookingAmount(
                    booking
                ),
            0
        );

}


/* =====================================================
   AUSZAHLUNGEN
===================================================== */

function getTotalWithdrawals(){

    return bookings
        .filter(
            booking =>
                getBookingType(
                    booking
                ) === "Auszahlung"
        )
        .reduce(
            (sum,booking) =>
                sum +
                getBookingAmount(
                    booking
                ),
            0
        );

}


/* =====================================================
   AKTUELLER CLANSTAND
===================================================== */

function getCurrentClanBalance(){

    return (
        getTotalDeposits() -
        getTotalWithdrawals()
    );

}


/* =====================================================
   GESAMTER UMSATZ
===================================================== */

function getTotalRevenue(){

    /*
     * Historischer Gesamtwert der
     * erfassten Einnahmen.
     *
     * Er wird NICHT vom aktuellen
     * Clanstand abgezogen.
     */

    return getTotalDeposits();

}


/* =====================================================
   ARBEITERGEHÄLTER
===================================================== */

function getTotalWorkerSalaries(){

    return workers.reduce(
        (sum,worker) =>
            sum +
            numberValue(
                worker.gehalt
            ),
        0
    );

}


/* =====================================================
   CLANAUSGABEN
===================================================== */

function getTotalClanExpenses(){

    return bookings
        .filter(
            booking => {

                if(
                    getBookingType(
                        booking
                    ) !== "Auszahlung"
                ){

                    return false;

                }

                const category =
                    String(
                        booking.kategorie ||
                        ""
                    )
                    .trim()
                    .toLowerCase();

                return (
                    category ===
                    "clan-ausgabe" ||
                    category ===
                    "clanausgabe" ||
                    category ===
                    "ausgabe"
                );

            }
        )
        .reduce(
            (sum,booking) =>
                sum +
                getBookingAmount(
                    booking
                ),
            0
        );

}


/* =====================================================
   SPARKONTO
===================================================== */

function getSavingsBalance(){

    let balance = 0;


    savingsTransactions.forEach(
        transaction => {

            const type =
                String(
                    transaction.art ||
                    ""
                ).trim();

            const amount =
                numberValue(
                    transaction.betrag
                );


            if(
                type ===
                "Einzahlung"
            ){

                balance += amount;

            }
            else if(
                type ===
                "Auszahlung"
            ){

                balance -= amount;

            }

        }
    );


    return balance;

}


/* =====================================================
   OFFENE AUFTRÄGE
===================================================== */

function getTotalOpenAmounts(){

    return orderSettlements
        .filter(
            order => {

                const status =
                    String(
                        order.status ||
                        "Offen"
                    ).trim();

                return (
                    status === "Offen" ||
                    status ===
                    "Teilweise bezahlt"
                );

            }
        )
        .reduce(
            (sum,order) =>
                sum +
                numberValue(
                    order.gesamtbetrag
                ),
            0
        );

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
   FINANZÜBERSICHT DARSTELLEN
===================================================== */

function renderOverview(){

    const clanBalance =
        getCurrentClanBalance();

    const revenue =
        getTotalRevenue();

    const deposits =
        getTotalDeposits();

    const withdrawals =
        getTotalWithdrawals();

    const salaries =
        getTotalWorkerSalaries();

    const clanExpenses =
        getTotalClanExpenses();

    const savings =
        getSavingsBalance();

    const openAmounts =
        getTotalOpenAmounts();

    const assets =
        getTotalAssets();


    setText(
        "currentClanBalance",
        money(clanBalance)
    );


    setText(
        "totalRevenue",
        money(revenue)
    );


    setText(
        "totalDeposits",
        money(deposits)
    );


    setText(
        "totalWithdrawals",
        money(withdrawals)
    );


    setText(
        "totalWorkerSalaries",
        money(salaries)
    );


    setText(
        "totalClanExpenses",
        money(clanExpenses)
    );


    setText(
        "totalSavings",
        money(savings)
    );


    setText(
        "totalOpenAmounts",
        money(openAmounts)
    );


    setText(
        "totalBookings",
        bookings.length
    );


    setText(
        "totalAssets",
        money(assets)
    );

}


/* =====================================================
   BUCHUNGEN
   TEIL 4 VON 10
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


    const type =
        document.getElementById(
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
        document.getElementById(
            "bookingCreatedBy"
        );


    if(
        createdBy &&
        currentEmployee
    ){

        createdBy.value =
            currentEmployee.name || "";

    }


    const date =
        document.getElementById(
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

window.closeBookingModal = function(){

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
   FORMULAR ZURÜCKSETZEN
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
            document.getElementById(id);

        if(element){

            element.value =
                "";

        }

    });


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


    const payment =
        document.getElementById(
            "bookingPaymentMethod"
        );

    if(payment){

        payment.value =
            "Ingame-Bargeld";

    }


    const status =
        document.getElementById(
            "bookingStatus"
        );

    if(status){

        status.value =
            "Offen";

    }


    const category =
        document.getElementById(
            "bookingCategory"
        );

    if(category){

        category.value =
            "Auftrag";

    }


    const createdBy =
        document.getElementById(
            "bookingCreatedBy"
        );

    if(
        createdBy &&
        currentEmployee
    ){

        createdBy.value =
            currentEmployee.name || "";

    }


    const date =
        document.getElementById(
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

window.saveBooking = async function(){

    if(!canCreateDeposit()){

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


    if(amount <= 0){

        alert(
            "Bitte einen gültigen Betrag eingeben."
        );

        return;

    }


    /*
     * Mitarbeiter dürfen niemals
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


    /*
     * Buchungsnummer.
     */

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
     * Exakt passend zur
     * Supabase-Tabelle.
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


    /*
     * In Supabase speichern.
     */

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
     * Protokoll erstellen.
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
        error:
            logError
    } =
        await buchhaltungDB
            .from(
                TABLE_LOGS
            )
            .insert(
                logPayload
            );


    if(logError){

        console.warn(
            "Protokoll konnte nicht gespeichert werden:",
            logError
        );

    }


    /*
     * Alles neu berechnen.
     */

    renderBookings();

    renderOverview();

    renderLogs();


    clearBookingForm();

    closeBookingModal();


    alert(
        "Buchung erfolgreich gespeichert."
    );

};


/* =====================================================
   BUCHUNGEN ANZEIGEN
===================================================== */

function renderBookings(){

    const body =
        document.getElementById(
            "bookingTableBody"
        );


    if(!body) return;


    if(!bookings.length){

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

                    const type =
                        booking.art ||
                        "—";

                    const amount =
                        numberValue(
                            booking.betrag
                        );


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


/* =====================================================
   BUCHUNGEN FILTERN
===================================================== */

window.filterBookings = function(){

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
                    booking.status,
                    booking.notiz

                ]
                .join(" ")
                .toLowerCase();


                return (

                    (!search ||
                        text.includes(
                            search
                        ))

                    &&

                    (!type ||
                        booking.art ===
                        type)

                    &&

                    (!category ||
                        booking.kategorie ===
                        category)

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

};


/* =====================================================
   AUFTRAGSABRECHNUNGEN + ARBEITER
   TEIL 5 VON 10
===================================================== */


/* =====================================================
   AUFTRAGSMODAL ÖFFNEN
===================================================== */

window.openOrderModal = function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Auftragsabrechnungen erstellen."
        );

        return;

    }

    clearOrderForm();

    const date =
        document.getElementById("orderDate");

    if(date){
        date.value = nowLocal();
    }

    openModal("orderModal");

};


/* =====================================================
   AUFTRAGSMODAL SCHLIESSEN
===================================================== */

window.closeOrderModal = function(){

    closeModal("orderModal");

};


/* =====================================================
   ARBEITER HINZUFÜGEN
===================================================== */

window.addOrderWorker = function(){

    if(!canManageBookkeeping()){

        alert(
            "Nur Leitung und Stadtleitung dürfen Arbeiter hinzufügen."
        );

        return;

    }


    const name =
        getValue("workerName");

    const salary =
        numberValue(
            getValue("workerSalary")
        );

    const note =
        getValue("workerNote");


    if(!name){

        alert(
            "Bitte einen Arbeiter eingeben."
        );

        return;

    }


    if(salary <= 0){

        alert(
            "Bitte ein gültiges Gehalt eingeben."
        );

        return;

    }


    currentWorkers.push({

        name:name,

        salary:salary,

        note:note

    });


    [
        "workerName",
        "workerSalary",
        "workerNote"
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if(element){
            element.value = "";
        }

    });


    renderCurrentWorkers();

    updateWorkerTotals();

};


/* =====================================================
   ARBEITER AUS AKTUELLEM AUFTRAG ENTFERNEN
===================================================== */

window.removeOrderWorker = function(index){

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

    updateWorkerTotals();

};


/* =====================================================
   AKTUELLE ARBEITER ANZEIGEN
===================================================== */

function renderCurrentWorkers(){

    const container =
        document.getElementById(
            "currentWorkers"
        );


    if(!container){
        return;
    }


    if(!currentWorkers.length){

        container.innerHTML = `
            <div class="empty-row">
                Noch keine Arbeiter hinzugefügt.
            </div>
        `;

        return;

    }


    container.innerHTML =
        currentWorkers
            .map(
                (worker,index) => `

                    <div class="worker-row">

                        <div>
                            <strong>
                                ${escapeHtml(
                                    worker.name
                                )}
                            </strong>

                            <span>
                                ${money(
                                    worker.salary
                                )}
                            </span>

                            ${
                                worker.note
                                    ? `
                                        <small>
                                            ${escapeHtml(
                                                worker.note
                                            )}
                                        </small>
                                      `
                                    : ""
                            }

                        </div>

                        ${
                            canManageBookkeeping()
                                ? `
                                    <button
                                        type="button"
                                        class="table-action"
                                        onclick="removeOrderWorker(${index})"
                                    >
                                        Entfernen
                                    </button>
                                  `
                                : ""
                        }

                    </div>

                `
            )
            .join("");

}


/* =====================================================
   ARBEITER-SUMMEN
===================================================== */

function updateWorkerTotals(){

    const total =
        currentWorkers.reduce(
            (sum,worker) =>
                sum +
                numberValue(
                    worker.salary
                ),
            0
        );


    const orderTotal =
        numberValue(
            getValue("orderTotal")
        );


    const clanAmount =
        numberValue(
            getValue(
                "orderClanAmount"
            )
        );


    const remaining =
        orderTotal -
        clanAmount -
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
        document.getElementById(
            "orderDistributionWarning"
        );


    if(!warning){
        return;
    }


    if(
        orderTotal > 0 &&
        remaining === 0
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
   WERTE AUTOMATISCH AKTUALISIEREN
===================================================== */

document.addEventListener(
    "input",
    event => {

        if(
            event.target.id ===
                "orderTotal" ||

            event.target.id ===
                "orderClanAmount" ||

            event.target.id ===
                "workerSalary"
        ){

            updateWorkerTotals();

        }

    }
);


/* =====================================================
   AUFTRAGSABRECHNUNG SPEICHERN
===================================================== */

window.saveOrderSettlement = async function(){

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


    const salaries =
        currentWorkers.reduce(
            (sum,worker) =>
                sum +
                numberValue(
                    worker.salary
                ),
            0
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

        showDatabaseError(
            "Auftragsabrechnung: " +
            error.message
        );

        return;

    }


    /*
     * Arbeiter zum gespeicherten
     * Auftrag hinzufügen.
     */

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
             * Die Auftragsabrechnung bleibt
             * bestehen. Der Fehler wird aber
             * deutlich angezeigt.
             */

            alert(
                "Auftragsabrechnung wurde gespeichert, " +
                "aber die Arbeiter konnten nicht gespeichert werden.\n\n" +
                workerError.message
            );

        }

    }


    /*
     * Daten vollständig neu aus
     * Supabase laden.
     */

    await loadBookkeepingData();


    renderOrderSettlements();

    renderEmployees();

    renderOverview();


    currentWorkers = [];

    clearOrderForm();

    closeOrderModal();


    alert(
        "Auftragsabrechnung wurde gespeichert."
    );

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
        !orderSettlements.length
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

                    const total =
                        numberValue(
                            order.gesamtbetrag
                        );

                    const clan =
                        numberValue(
                            order.clanbetrag
                        );

                    const salaries =
                        numberValue(
                            order.gesamt_gehaelter
                        );


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    order.auftragsnummer ||
                                    order.id ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${money(total)}
                            </td>

                            <td>
                                ${money(clan)}
                            </td>

                            <td>
                                ${money(salaries)}
                            </td>

                            <td>
                                ${escapeHtml(
                                    order.status ||
                                    "Offen"
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
                                ${escapeHtml(
                                    order.notiz ||
                                    "—"
                                )}
                            </td>

                            <td>
                                <button
                                    type="button"
                                    class="table-action"
                                    onclick="viewOrder('${String(
                                        order.id
                                    ).replace(
                                        /'/g,
                                        "\\'"
                                    )}')"
                                >
                                    Details
                                </button>
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* =====================================================
   AUFTRAGSDETAILS
===================================================== */

window.viewOrder = function(id){

    const order =
        orderSettlements.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if(!order){
        return;
    }


    const orderWorkers =
        workers.filter(
            worker =>
                String(
                    worker.auftragsabrechnung_id
                ) ===
                String(order.id)
        );


    let workerText =
        "Keine Arbeiter";


    if(orderWorkers.length){

        workerText =
            orderWorkers
                .map(
                    worker =>
                        (
                            worker.arbeiter_name ||
                            "Unbekannt"
                        ) +
                        ": " +
                        money(
                            worker.gehalt
                        )
                )
                .join("\n");

    }


    alert(

        "Auftrag " +
        (
            order.auftragsnummer ||
            order.id
        ) +

        "\n\nGesamt: " +
        money(
            order.gesamtbetrag
        ) +

        "\nAn Clan: " +
        money(
            order.clanbetrag
        ) +

        "\nArbeitergehälter: " +
        money(
            order.gesamt_gehaelter
        ) +

        "\n\nArbeiter:\n" +
        workerText +

        "\n\nStatus: " +
        (
            order.status ||
            "—"
        ) +

        "\nErstellt von: " +
        (
            order.erstellt_von_name ||
            "—"
        ) +

        "\nDatum: " +
        formatDate(
            order.datum
        ) +

        (
            order.notiz
                ? "\n\nNotiz:\n" +
                  order.notiz
                : ""
        )

    );

};


/* =========================================================
   TEIL 6 – MITARBEITER
   ========================================================= */

function renderEmployees(){
    const tbody = document.getElementById("employeeTableBody");

    if(!tbody){
        return;
    }

    if(!Array.isArray(employees) || employees.length === 0){
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Keine Mitarbeiter vorhanden.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map(employee => {

        const employeeName =
            employee.name ||
            employee.username ||
            "Unbekannt";

        const rank =
            employee.rang ||
            employee.role ||
            "—";

        const employeeId = employee.user_id || employee.id || "";

        const employeeBookings =
            bookings.filter(booking =>
                booking.erstellt_von === employeeId ||
                booking.erstellt_von_name === employeeName
            );

        const deposits =
            employeeBookings
                .filter(booking => booking.art === "Einzahlung")
                .reduce(
                    (sum, booking) =>
                        sum + numberValue(booking.betrag),
                    0
                );

        const withdrawals =
            employeeBookings
                .filter(booking => booking.art === "Auszahlung")
                .reduce(
                    (sum, booking) =>
                        sum + numberValue(booking.betrag),
                    0
                );

        const salary =
            orderSettlements.reduce((sum, order) => {

                const orderWorkers =
                    workers.filter(worker =>
                        worker.auftragsabrechnung_id === order.id &&
                        worker.arbeiter_name === employeeName
                    );

                return sum +
                    orderWorkers.reduce(
                        (workerSum, worker) =>
                            workerSum + numberValue(worker.gehalt),
                        0
                    );

            }, 0);

        return `
            <tr>
                <td>${escapeHtml(employeeName)}</td>
                <td>${escapeHtml(rank)}</td>
                <td>${formatMoney(salary)}</td>
                <td>${formatMoney(deposits)}</td>
                <td>${formatMoney(withdrawals)}</td>
                <td>
                    <button
                        class="small-button"
                        onclick="viewEmployee('${escapeHtml(employeeId)}')"
                    >
                        Anzeigen
                    </button>
                </td>
            </tr>
        `;

    }).join("");
}


/* ---------------------------------------------------------
   MITARBEITER ANZEIGEN
   --------------------------------------------------------- */

window.viewEmployee = function(employeeId){

    const employee =
        employees.find(item =>
            (item.user_id || item.id) === employeeId
        );

    if(!employee){
        alert("Mitarbeiter wurde nicht gefunden.");
        return;
    }

    const employeeName =
        employee.name ||
        employee.username ||
        "Unbekannt";

    const employeeBookings =
        bookings.filter(booking =>
            booking.erstellt_von === employeeId ||
            booking.erstellt_von_name === employeeName
        );

    const deposits =
        employeeBookings
            .filter(booking => booking.art === "Einzahlung")
            .reduce(
                (sum, booking) =>
                    sum + numberValue(booking.betrag),
                0
            );

    const withdrawals =
        employeeBookings
            .filter(booking => booking.art === "Auszahlung")
            .reduce(
                (sum, booking) =>
                    sum + numberValue(booking.betrag),
                0
            );

    const employeeWorkers =
        workers.filter(worker =>
            worker.arbeiter_name === employeeName
        );

    const salary =
        employeeWorkers.reduce(
            (sum, worker) =>
                sum + numberValue(worker.gehalt),
            0
        );

    alert(
        "Mitarbeiter\n\n" +
        "Name: " + employeeName + "\n" +
        "Rang: " +
        (employee.rang || employee.role || "—") +
        "\n\n" +
        "Gehälter: " +
        formatMoney(salary) +
        "\n" +
        "Einzahlungen: " +
        formatMoney(deposits) +
        "\n" +
        "Auszahlungen: " +
        formatMoney(withdrawals)
    );
};


/* ---------------------------------------------------------
   MITARBEITER SUCHEN
   --------------------------------------------------------- */

window.filterEmployees = function(){

    const input =
        document.getElementById("employeeSearch");

    if(!input){
        return;
    }

    const search =
        input.value
            .trim()
            .toLowerCase();

    const tbody =
        document.getElementById("employeeTableBody");

    if(!tbody){
        return;
    }

    const filtered =
        employees.filter(employee => {

            const name =
                String(
                    employee.name ||
                    employee.username ||
                    ""
                ).toLowerCase();

            const rank =
                String(
                    employee.rang ||
                    employee.role ||
                    ""
                ).toLowerCase();

            return (
                name.includes(search) ||
                rank.includes(search)
            );
        });

    if(filtered.length === 0){
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Keine Mitarbeiter gefunden.
                </td>
            </tr>
        `;
        return;
    }

    const originalEmployees = employees;

    employees = filtered;
    renderEmployees();
    employees = originalEmployees;
};


/* ---------------------------------------------------------
   MITARBEITER-BEREICH AKTUALISIEREN
   --------------------------------------------------------- */

function updateEmployeeOverview(){
    renderEmployees();
}

/* =========================================================
   TEIL 7 – SPARKONTO
   ========================================================= */

function renderSavings(){
    const tbody =
        document.getElementById("savingsTableBody");

    if(!tbody){
        return;
    }

    if(
        !Array.isArray(savingsTransactions) ||
        savingsTransactions.length === 0
    ){
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Noch keine Sparkonto-Buchungen vorhanden.
                </td>
            </tr>
        `;
    }else{

        tbody.innerHTML =
            savingsTransactions.map(transaction => {

                const type =
                    transaction.art ||
                    transaction.typ ||
                    "—";

                const amount =
                    numberValue(transaction.betrag);

                return `
                    <tr>
                        <td>
                            ${escapeHtml(
                                transaction.buchungsnummer ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(type)}
                        </td>

                        <td>
                            ${formatMoney(amount)}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.zweck ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.erstellt_von_name ||
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
                                transaction.notiz ||
                                "—"
                            )}
                        </td>
                    </tr>
                `;

            }).join("");
    }

    updateSavingsOverview();
}


/* ---------------------------------------------------------
   SPARKONTO AKTUELLER STAND
   --------------------------------------------------------- */

function getSavingsBalance(){

    if(
        !Array.isArray(savingsTransactions)
    ){
        return 0;
    }

    return savingsTransactions.reduce(
        (balance, transaction) => {

            const amount =
                numberValue(transaction.betrag);

            const type =
                String(
                    transaction.art ||
                    transaction.typ ||
                    ""
                ).toLowerCase();

            if(
                type === "einzahlung" ||
                type === "einlage" ||
                type === "deposit"
            ){
                return balance + amount;
            }

            if(
                type === "auszahlung" ||
                type === "entnahme" ||
                type === "withdrawal"
            ){
                return balance - amount;
            }

            return balance;
        },
        0
    );
}


/* ---------------------------------------------------------
   SPARKONTO-ÜBERSICHT
   --------------------------------------------------------- */

function updateSavingsOverview(){

    const balance =
        getSavingsBalance();

    const balanceElements = [
        "savingsBalance",
        "sparkontoStand",
        "savingsCurrentBalance"
    ];

    balanceElements.forEach(id => {

        const element =
            document.getElementById(id);

        if(element){
            element.textContent =
                formatMoney(balance);
        }
    });

    const goal =
        numberValue(savingsGoalValue);

    const progress =
        goal > 0
            ? Math.min(
                100,
                (balance / goal) * 100
            )
            : 0;

    const progressElements = [
        "savingsProgress",
        "sparkontoProgress"
    ];

    progressElements.forEach(id => {

        const element =
            document.getElementById(id);

        if(element){
            element.textContent =
                progress.toFixed(1) + "%";
        }
    });

    const progressBars = [
        "savingsProgressBar",
        "sparkontoProgressBar"
    ];

    progressBars.forEach(id => {

        const element =
            document.getElementById(id);

        if(element){
            element.style.width =
                progress + "%";
        }
    });
}


/* ---------------------------------------------------------
   SPARZIEL SETZEN
   --------------------------------------------------------- */

window.setSavingsGoal =
function(){

    if(!canManageBookkeeping()){
        alert(
            "Nur Leitung und Stadtleitung dürfen " +
            "das Sparziel verwalten."
        );
        return;
    }

    const input =
        document.getElementById("savingsGoal");

    if(!input){
        return;
    }

    const value =
        numberValue(input.value);

    if(value < 0){
        alert(
            "Das Sparziel darf nicht negativ sein."
        );
        return;
    }

    savingsGoalValue =
        value;

    updateSavingsOverview();

    alert(
        "Sparziel wurde gesetzt:\n\n" +
        formatMoney(value)
    );
};


/* ---------------------------------------------------------
   SPARKONTO-BUCHUNG MODAL
   --------------------------------------------------------- */

window.openSavingsModal =
function(){

    if(!canManageBookkeeping()){
        alert(
            "Nur Leitung und Stadtleitung dürfen " +
            "das Sparkonto verwalten."
        );
        return;
    }

    const modal =
        document.getElementById("savingsModal");

    if(modal){
        modal.classList.add("active");
    }
};


window.closeSavingsModal =
function(){

    const modal =
        document.getElementById("savingsModal");

    if(modal){
        modal.classList.remove("active");
    }
};


/* ---------------------------------------------------------
   SPARKONTO-FORMULAR LEEREN
   --------------------------------------------------------- */

function clearSavingsForm(){

    [
        "savingsBookingNumber",
        "savingsAmount",
        "savingsPurpose",
        "savingsNote"
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if(element){
            element.value = "";
        }
    });

    const date =
        document.getElementById("savingsDate");

    if(date){
        date.value = "";
    }

    const type =
        document.getElementById("savingsType");

    if(type){
        type.value = "Einzahlung";
    }
}


/* ---------------------------------------------------------
   SPARKONTO-BUCHUNG SPEICHERN
   --------------------------------------------------------- */

window.saveSavingsTransaction =
async function(){

    if(!canManageBookkeeping()){
        alert(
            "Nur Leitung und Stadtleitung dürfen " +
            "Sparkonto-Buchungen erstellen."
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
        getValue("savingsType") ||
        "Einzahlung";

    const amount =
        numberValue(
            getValue("savingsAmount")
        );

    if(amount <= 0){
        alert(
            "Bitte einen gültigen Betrag eingeben."
        );
        return;
    }

    if(
        type === "Auszahlung" &&
        amount > getSavingsBalance()
    ){
        alert(
            "Die Auszahlung darf den " +
            "aktuellen Sparkontostand nicht überschreiten."
        );
        return;
    }

    const bookingNumber =
        getValue("savingsBookingNumber") ||
        "SP-" +
        String(
            savingsTransactions.length + 1
        ).padStart(4,"0");

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

        zweck:
            getValue("savingsPurpose"),

        datum:
            getValue("savingsDate") ||
            new Date().toISOString(),

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy,

        notiz:
            getValue("savingsNote")
    };

    try{

        const { data, error } =
            await buchhaltungDB
                .from(TABLE_SAVINGS)
                .insert(payload)
                .select()
                .single();

        if(error){
            throw error;
        }

        if(data){
            savingsTransactions.unshift(data);
        }

        await writeActivityLog(
            "Sparkonto",
            type +
            " über " +
            formatMoney(amount) +
            " gespeichert."
        );

        renderSavings();

        clearSavingsForm();

        closeSavingsModal();

        alert(
            "Sparkonto-Buchung wurde gespeichert."
        );

    }catch(error){

        alert(
            "Sparkonto-Buchung konnte nicht " +
            "gespeichert werden.\n\n" +
            (
                error?.message ||
                "Unbekannter Fehler."
            )
        );
    }
};


/* ---------------------------------------------------------
   SPARKONTO AKTUALISIEREN
   --------------------------------------------------------- */

function updateSavings(){

    renderSavings();
        }

/* =========================================================
   TEIL 8 – KASSENABGLEICH
   ========================================================= */

function calculateCurrentClanBalance(){

    if(!Array.isArray(bookings)){
        return 0;
    }

    return bookings.reduce(
        (balance, booking) => {

            const amount =
                numberValue(booking.betrag);

            const type =
                String(
                    booking.art || ""
                ).toLowerCase();

            if(type === "einzahlung"){
                return balance + amount;
            }

            if(type === "auszahlung"){
                return balance - amount;
            }

            return balance;
        },
        0
    );
}


/* ---------------------------------------------------------
   KASSENABGLEICH RENDERN
   --------------------------------------------------------- */

function renderCashChecks(){

    const tbody =
        document.getElementById("cashCheckTableBody");

    if(!tbody){
        return;
    }

    if(
        !Array.isArray(cashChecks) ||
        cashChecks.length === 0
    ){
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Noch keine Kassenabgleiche vorhanden.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML =
        cashChecks.map(check => {

            const portalStand =
                numberValue(
                    check.portalstand
                );

            const ingameStand =
                numberValue(
                    check.ingame_stand
                );

            const difference =
                ingameStand - portalStand;

            return `
                <tr>
                    <td>
                        ${escapeHtml(
                            check.buchungsnummer ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${formatMoney(portalStand)}
                    </td>

                    <td>
                        ${formatMoney(ingameStand)}
                    </td>

                    <td>
                        ${formatMoney(difference)}
                    </td>

                    <td>
                        ${escapeHtml(
                            check.notiz ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            check.erstellt_von_name ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            check.datum
                        )}
                    </td>
                </tr>
            `;

        }).join("");
}


/* ---------------------------------------------------------
   KASSENABGLEICH MODAL
   --------------------------------------------------------- */

window.openCashCheckModal =
function(){

    if(!canManageBookkeeping()){
        alert(
            "Nur Leitung und Stadtleitung dürfen " +
            "einen Kassenabgleich durchführen."
        );
        return;
    }

    const portalInput =
        document.getElementById("cashPortalStand");

    if(portalInput){
        portalInput.value =
            calculateCurrentClanBalance();
    }

    const modal =
        document.getElementById("cashCheckModal");

    if(modal){
        modal.classList.add("active");
    }
};


window.closeCashCheckModal =
function(){

    const modal =
        document.getElementById("cashCheckModal");

    if(modal){
        modal.classList.remove("active");
    }
};


/* ---------------------------------------------------------
   ABGLEICH BERECHNEN
   --------------------------------------------------------- */

window.calculateCashDifference =
function(){

    const portalStand =
        numberValue(
            getValue("cashPortalStand")
        );

    const ingameStand =
        numberValue(
            getValue("cashIngameStand")
        );

    const difference =
        ingameStand - portalStand;

    const output =
        document.getElementById(
            "cashDifference"
        );

    if(output){
        output.textContent =
            formatMoney(difference);
    }

    const warning =
        document.getElementById(
            "cashDifferenceWarning"
        );

    if(warning){

        if(difference !== 0){

            warning.textContent =
                "⚠️ Kassenabweichung: " +
                formatMoney(difference);

            warning.style.display =
                "block";

        }else{

            warning.textContent =
                "✓ Kasse stimmt überein.";

            warning.style.display =
                "block";
        }
    }

    return difference;
};


/* ---------------------------------------------------------
   KASSENABGLEICH SPEICHERN
   --------------------------------------------------------- */

window.saveCashCheck =
async function(){

    if(!canManageBookkeeping()){
        alert(
            "Nur Leitung und Stadtleitung dürfen " +
            "Kassenabgleiche speichern."
        );
        return;
    }

    if(!hasSupabase()){
        showDatabaseError(
            "Supabase ist nicht verfügbar."
        );
        return;
    }

    const portalStand =
        numberValue(
            getValue("cashPortalStand")
        );

    const ingameStand =
        numberValue(
            getValue("cashIngameStand")
        );

    const difference =
        ingameStand - portalStand;

    const createdBy =
        currentEmployee?.name ||
        currentEmployee?.username ||
        currentUser?.email ||
        "Unbekannt";

    const bookingNumber =
        getValue("cashCheckNumber") ||
        "KA-" +
        String(
            cashChecks.length + 1
        ).padStart(4,"0");

    const payload = {

        buchungsnummer:
            bookingNumber,

        portalstand:
            portalStand,

        ingame_stand:
            ingameStand,

        abweichung:
            difference,

        datum:
            getValue("cashCheckDate") ||
            new Date().toISOString(),

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy,

        notiz:
            getValue("cashCheckNote")
    };

    try{

        const { data, error } =
            await buchhaltungDB
                .from(TABLE_CASH_CHECKS)
                .insert(payload)
                .select()
                .single();

        if(error){
            throw error;
        }

        if(data){
            cashChecks.unshift(data);
        }

        await writeActivityLog(
            "Kassenabgleich",
            "Portalstand: " +
            formatMoney(portalStand) +
            " | Ingame-Stand: " +
            formatMoney(ingameStand) +
            " | Abweichung: " +
            formatMoney(difference)
        );

        renderCashChecks();

        closeCashCheckModal();

        alert(
            difference === 0
                ? "Kassenabgleich gespeichert. Die Kasse stimmt überein."
                : "Kassenabgleich gespeichert.\n\n" +
                  "Abweichung: " +
                  formatMoney(difference)
        );

    }catch(error){

        alert(
            "Kassenabgleich konnte nicht " +
            "gespeichert werden.\n\n" +
            (
                error?.message ||
                "Unbekannter Fehler."
            )
        );
    }
};


/* ---------------------------------------------------------
   KASSENABGLEICH AKTUALISIEREN
   --------------------------------------------------------- */

function updateCashCheckOverview(){
    renderCashChecks();
           }

/* =========================================================
   TEIL 9 – PROTOKOLL / AUDIT
   ========================================================= */


/* ---------------------------------------------------------
   PROTOKOLL RENDERN
   --------------------------------------------------------- */

function renderActivityLogs(){

    const tbody =
        document.getElementById("activityLogTableBody");

    if(!tbody){
        return;
    }

    if(
        !Array.isArray(activityLogs) ||
        activityLogs.length === 0
    ){
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Noch keine Protokolleinträge vorhanden.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML =
        activityLogs.map(log => {

            return `
                <tr>
                    <td>
                        ${escapeHtml(
                            log.aktion ||
                            log.art ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.beschreibung ||
                            log.details ||
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
                        ${formatDate(
                            log.datum
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.status ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.notiz ||
                            "—"
                        )}
                    </td>
                </tr>
            `;

        }).join("");
}


/* ---------------------------------------------------------
   PROTOKOLL SUCHEN
   --------------------------------------------------------- */

window.filterActivityLogs =
function(){

    const input =
        document.getElementById(
            "activityLogSearch"
        );

    const tbody =
        document.getElementById(
            "activityLogTableBody"
        );

    if(!input || !tbody){
        return;
    }

    const search =
        input.value
            .trim()
            .toLowerCase();

    const filtered =
        activityLogs.filter(log => {

            const values = [

                log.aktion,

                log.art,

                log.beschreibung,

                log.details,

                log.erstellt_von_name,

                log.status,

                log.notiz
            ];

            return values.some(value =>
                String(value || "")
                    .toLowerCase()
                    .includes(search)
            );
        });

    if(filtered.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Keine Protokolleinträge gefunden.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        filtered.map(log => {

            return `
                <tr>
                    <td>
                        ${escapeHtml(
                            log.aktion ||
                            log.art ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.beschreibung ||
                            log.details ||
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
                        ${formatDate(
                            log.datum
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.status ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.notiz ||
                            "—"
                        )}
                    </td>
                </tr>
            `;

        }).join("");
};


/* ---------------------------------------------------------
   PROTOKOLL NACH ZEITRAUM FILTERN
   --------------------------------------------------------- */

window.filterActivityLogsByPeriod =
function(period){

    if(!Array.isArray(activityLogs)){
        return;
    }

    const now =
        new Date();

    let startDate = null;

    if(period === "tag"){

        startDate =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            );

    }else if(period === "monat"){

        startDate =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );

    }else if(period === "jahr"){

        startDate =
            new Date(
                now.getFullYear(),
                0,
                1
            );
    }

    const tbody =
        document.getElementById(
            "activityLogTableBody"
        );

    if(!tbody){
        return;
    }

    const filtered =
        startDate
            ? activityLogs.filter(log => {

                if(!log.datum){
                    return false;
                }

                return (
                    new Date(log.datum) >=
                    startDate
                );
            })
            : activityLogs;

    if(filtered.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Keine Einträge für diesen Zeitraum.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        filtered.map(log => {

            return `
                <tr>
                    <td>
                        ${escapeHtml(
                            log.aktion ||
                            log.art ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.beschreibung ||
                            log.details ||
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
                        ${formatDate(
                            log.datum
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.status ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.notiz ||
                            "—"
                        )}
                    </td>
                </tr>
            `;

        }).join("");
};


/* ---------------------------------------------------------
   AUDIT-EINTRAG SCHREIBEN
   --------------------------------------------------------- */

async function writeActivityLog(
    action,
    description,
    status = "Erfolgreich",
    note = ""
){

    if(!hasSupabase()){
        return false;
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

        erstellt_von:
            currentUser?.id ||
            null,

        erstellt_von_name:
            createdBy,

        datum:
            new Date().toISOString(),

        status:
            status,

        notiz:
            note || null
    };

    try{

        const { data, error } =
            await buchhaltungDB
                .from(TABLE_LOGS)
                .insert(payload)
                .select()
                .single();

        if(error){
            console.error(
                "Protokoll konnte nicht gespeichert werden:",
                error
            );

            return false;
        }

        if(data){
            activityLogs.unshift(data);
        }

        return true;

    }catch(error){

        console.error(
            "Audit-Fehler:",
            error
        );

        return false;
    }
}


/* ---------------------------------------------------------
   PROTOKOLL AKTUALISIEREN
   --------------------------------------------------------- */

function updateActivityLog(){

    renderActivityLogs();
}


/* ---------------------------------------------------------
   PROTOKOLL-BEREICH INITIALISIEREN
   --------------------------------------------------------- */

function initActivityLog(){

    renderActivityLogs();

    const search =
        document.getElementById(
            "activityLogSearch"
        );

    if(search){
        search.addEventListener(
            "input",
            filterActivityLogs
        );
    }
                           }

/* =========================================================
   TEIL 10 – ABSCHLUSS / BERECHTIGUNGEN / INITIALISIERUNG
   ========================================================= */


/* ---------------------------------------------------------
   BERECHTIGUNGEN
   --------------------------------------------------------- */

function updatePermissionInterface(){

    const isManagement =
        canManageBookkeeping();

    const isEmployee =
        isMitarbeiter();

    document
        .querySelectorAll("[data-management-only]")
        .forEach(element => {

            element.style.display =
                isManagement
                    ? ""
                    : "none";
        });

    document
        .querySelectorAll("[data-deposit-only]")
        .forEach(element => {

            element.style.display =
                isEmployee || isManagement
                    ? ""
                    : "none";
        });

    document
        .querySelectorAll("[data-bookkeeping-admin]")
        .forEach(element => {

            element.disabled =
                !isManagement;
        });
}


/* ---------------------------------------------------------
   MONATSÜBERSICHT
   --------------------------------------------------------- */

function calculateMonthlyOverview(){

    const selectedMonthElement =
        document.getElementById(
            "monthlyMonth"
        );

    const selectedMonth =
        selectedMonthElement?.value ||
        new Date()
            .toISOString()
            .slice(0,7);

    const monthBookings =
        bookings.filter(booking => {

            if(!booking.datum){
                return false;
            }

            return String(
                booking.datum
            ).slice(0,7) === selectedMonth;
        });

    const income =
        monthBookings
            .filter(booking =>
                String(
                    booking.art || ""
                ).toLowerCase() === "einzahlung"
            )
            .reduce(
                (sum, booking) =>
                    sum + numberValue(booking.betrag),
                0
            );

    const expenses =
        monthBookings
            .filter(booking =>
                String(
                    booking.art || ""
                ).toLowerCase() === "auszahlung"
            )
            .reduce(
                (sum, booking) =>
                    sum + numberValue(booking.betrag),
                0
            );

    const wages =
        orderSettlements
            .filter(order => {

                if(!order.datum){
                    return false;
                }

                return String(
                    order.datum
                ).slice(0,7) === selectedMonth;
            })
            .reduce(
                (sum, order) =>
                    sum +
                    numberValue(
                        order.gesamt_gehaelter
                    ),
                0
            );

    const change =
        income - expenses;

    const elements = {

        monthlyIncome:
            income,

        monthlyExpenses:
            expenses,

        monthlyWages:
            wages,

        monthlyChange:
            change
    };

    Object.entries(elements)
        .forEach(([id,value]) => {

            const element =
                document.getElementById(id);

            if(element){
                element.textContent =
                    formatMoney(value);
            }
        });
}


window.updateMonthlyOverview =
function(){

    calculateMonthlyOverview();
};


/* ---------------------------------------------------------
   HAUPTÜBERSICHT AKTUALISIEREN
   --------------------------------------------------------- */

function updateFinancialOverview(){

    if(
        typeof calculateFinancialOverview ===
        "function"
    ){
        calculateFinancialOverview();
    }

    updateSavingsOverview();

    calculateMonthlyOverview();

    renderBookings();

    renderOrderSettlements();

    renderEmployees();

    renderSavings();

    renderCashChecks();

    renderActivityLogs();
}


/* ---------------------------------------------------------
   GESAMTE BUCHHALTUNG AKTUALISIEREN
   --------------------------------------------------------- */

async function refreshBookkeeping(){

    const loaded =
        await loadBookkeepingData();

    if(!loaded){
        return false;
    }

    updateFinancialOverview();

    updatePermissionInterface();

    return true;
}


/* ---------------------------------------------------------
   INITIALISIERUNG
   --------------------------------------------------------- */

async function initializeBookkeeping(){

    try{

        await loadCurrentUser();

        await loadCurrentEmployee();

        if(!currentUser){
            updatePermissionInterface();

            return;
        }

        const loaded =
            await loadBookkeepingData();

        if(!loaded){
            return;
        }

        updateFinancialOverview();

        updatePermissionInterface();

        initActivityLog();

        /* Monatsauswahl */

        const monthlyMonth =
            document.getElementById(
                "monthlyMonth"
            );

        if(monthlyMonth){

            monthlyMonth.value =
                new Date()
                    .toISOString()
                    .slice(0,7);

            monthlyMonth.addEventListener(
                "change",
                calculateMonthlyOverview
            );
        }

        /* Sparkonto */

        updateSavingsOverview();

        /* Kassenabgleich */

        renderCashChecks();

        /* Protokoll */

        renderActivityLogs();

        console.log(
            "Buchhaltung erfolgreich initialisiert."
        );

    }catch(error){

        console.error(
            "Initialisierungsfehler:",
            error
        );

        showDatabaseError(
            error?.message ||
            "Die Buchhaltung konnte nicht vollständig geladen werden."
        );
    }
}


/* ---------------------------------------------------------
   SEITENSTART
   --------------------------------------------------------- */

if(
    document.readyState ===
    "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        initializeBookkeeping
    );

}else{

    initializeBookkeeping();
}


/* =========================================================
   ENDE – BUCHHALTUNG V0.1 BETA
   ========================================================= */
