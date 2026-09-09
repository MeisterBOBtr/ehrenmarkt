/* ============================================================
   EHRENMARKT
   MATERIALBESTELLUNG – DETAILSEITE
   ============================================================

   Diese Datei:
   - lädt einen einzelnen Materialauftrag
   - zeigt Auftragsinformationen
   - lädt die bestellten Materialien
   - lädt die zugehörigen Item-Daten
   - zeigt Preise und Hinweise
   - ermöglicht die Übernahme des Auftrags

   URL-Beispiel:

   material_details.html?id=AUFTRAGS-ID

   oder:

   material_details.html?order=MB-0001

   ============================================================ */


/* ============================================================
   GLOBALE VARIABLEN
   ============================================================ */

let supabaseClient = null;

let currentUser = null;

let currentEmployee = null;

let currentOrder = null;

let currentOrderItems = [];

let currentMaterials = [];


/* ============================================================
   HILFSFUNKTIONEN
   ============================================================ */


/**
 * Supabase-Client ermitteln
 */
function getSupabaseClient() {

    if (window.supabaseClient) {
        return window.supabaseClient;
    }

    if (
        window.supabase &&
        typeof window.supabase.from === "function"
    ) {
        return window.supabase;
    }

    return null;
}


/**
 * Element sicher holen
 */
function getElement(id) {

    return document.getElementById(id);

}


/**
 * Text sicher setzen
 */
function setText(id, value) {

    const element = getElement(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);

}


/**
 * Geldformatierung
 */
function formatMoney(value) {

    const number =
        Number(value) || 0;

    return number.toLocaleString(
        "de-DE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ) + " $";

}


/**
 * Datum formatieren
 */
function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
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
    ) + " Uhr";

}


/**
 * HTML sicher escapen
 *
 * Wichtig, weil Daten aus Supabase
 * direkt in die Seite geschrieben werden.
 */
function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/**
 * Fehler anzeigen
 */
function showError(message) {

    const box =
        getElement("errorMessage");

    if (!box) {
        alert(message);
        return;
    }

    box.textContent =
        message;

    box.style.display =
        "block";

}


/**
 * Fehlermeldung ausblenden
 */
function hideError() {

    const box =
        getElement("errorMessage");

    if (!box) {
        return;
    }

    box.textContent =
        "";

    box.style.display =
        "none";

}


/* ============================================================
   STATUS
   ============================================================ */

function createStatusHTML(status) {

    const value =
        String(status || "Offen");

    let className =
        "status-open";

    if (
        value.toLowerCase()
            .includes("bearbeitung")
    ) {
        className =
            "status-progress";
    }

    if (
        value.toLowerCase()
            .includes("abgeschlossen")
    ) {
        className =
            "status-done";
    }

    return `
        <span class="status ${className}">
            ${escapeHTML(value)}
        </span>
    `;

}


/* ============================================================
   URL PARAMETER
   ============================================================ */

function getOrderParameter() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const id =
        params.get("id");

    const orderNumber =
        params.get("order");

    return {
        id,
        orderNumber
    };

}


/* ============================================================
   LOGIN PRÜFEN
   ============================================================ */

async function loadCurrentUser() {

    const {
        data,
        error
    } =
        await supabaseClient
            .auth
            .getUser();


    if (error) {

        console.error(
            "Fehler beim Laden des Benutzers:",
            error
        );

        return null;
    }


    if (!data || !data.user) {

        window.location.href =
            "login.html";

        return null;
    }


    return data.user;

}


/* ============================================================
   MITARBEITER LADEN
   ============================================================ */

async function loadCurrentEmployee() {

    if (!currentUser) {
        return null;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("employees")
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Fehler beim Laden des Mitarbeiters:",
            error
        );

        return null;
    }


    return data;

}


/* ============================================================
   AUFTRAG LADEN
   ============================================================ */

async function loadOrder() {

    const parameter =
        getOrderParameter();


    if (
        !parameter.id &&
        !parameter.orderNumber
    ) {

        showError(
            "Es wurde kein Auftrag angegeben."
        );

        disableAcceptButton();

        return null;
    }


    let query =
        supabaseClient
            .from("orders")
            .select("*");


    if (parameter.id) {

        query =
            query.eq(
                "id",
                parameter.id
            );

    } else {

        query =
            query.eq(
                "order_number",
                parameter.orderNumber
            );

    }


    const {
        data,
        error
    } =
        await query.maybeSingle();


    if (error) {

        console.error(
            "Fehler beim Laden des Auftrags:",
            error
        );

        showError(
            "Der Auftrag konnte nicht geladen werden."
        );

        disableAcceptButton();

        return null;
    }


    if (!data) {

        showError(
            "Der angeforderte Auftrag wurde nicht gefunden."
        );

        disableAcceptButton();

        return null;
    }


    currentOrder =
        data;


    return data;

}


/* ============================================================
   ENDE TEIL 1
   ============================================================ */

/* ============================================================
   AUFTRAGSDATEN ANZEIGEN
   ============================================================ */

function renderOrderInformation() {

    if (!currentOrder) {
        return;
    }


    const order =
        currentOrder;


    /* --------------------------------------------------------
       AUFTRAGSNUMMER
    -------------------------------------------------------- */

    setText(
        "orderNumber",
        order.order_number
    );


    setText(
        "orderNumberInfo",
        order.order_number
    );


    /* --------------------------------------------------------
       STATUS
    -------------------------------------------------------- */

    const statusElement =
        getElement("orderStatus");


    if (statusElement) {

        statusElement.innerHTML =
            createStatusHTML(
                order.status
            );

    }


    /* --------------------------------------------------------
       MINECRAFT-NAME
    -------------------------------------------------------- */

    setText(
        "minecraftName",
        order.minecraft_name
    );


    setText(
        "customerMinecraft",
        order.minecraft_name
    );


    /* --------------------------------------------------------
       AUFTRAGGEBER
    --------------------------------------------------------

       Die Materialbestellung speichert den Minecraft-Namen
       direkt in orders.

       Der Benutzer selbst wird zusätzlich über user_id
       identifiziert.

    -------------------------------------------------------- */

    setText(
        "customerName",
        order.minecraft_name ||
        "Unbekannt"
    );


    setText(
        "customerUser",
        order.user_id
            ? order.user_id
            : "Unbekannt"
    );


    /* --------------------------------------------------------
       DATUM
    -------------------------------------------------------- */

    setText(
        "orderDate",
        formatDate(
            order.created_at
        )
    );


    /* --------------------------------------------------------
       BEARBEITER
    -------------------------------------------------------- */

    if (order.employee_id) {

        setText(
            "employeeName",
            "Bereits übernommen"
        );

    } else {

        setText(
            "employeeName",
            "Noch nicht übernommen"
        );

    }


    /* --------------------------------------------------------
       STATUS KUNDENBEREICH
    -------------------------------------------------------- */

    setText(
        "customerStatus",
        order.status ||
        "Offen"
    );


    /* --------------------------------------------------------
       HINWEIS
    -------------------------------------------------------- */

    const note =
        order.notes;


    const noteBox =
        getElement("customerNote");


    if (!noteBox) {
        return;
    }


    if (
        note === null ||
        note === undefined ||
        String(note).trim() === ""
    ) {

        noteBox.innerHTML = `
            <span class="note-empty">
                Keine zusätzlichen Hinweise vorhanden.
            </span>
        `;

    } else {

        noteBox.textContent =
            String(note);

    }


    /* --------------------------------------------------------
       KUNDENHINWEIS KURZ
    -------------------------------------------------------- */

    const customerHint =
        getElement("customerHint");


    if (customerHint) {

        customerHint.textContent =
            note && String(note).trim()
                ? "Zusätzliche Hinweise vorhanden"
                : "Keine zusätzlichen Hinweise";

    }

}


/* ============================================================
   BESTELLPOSITIONEN LADEN
   ============================================================ */

async function loadOrderItems() {

    if (!currentOrder) {
        return [];
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("order_items")
            .select("*")
            .eq(
                "order_id",
                currentOrder.id
            )
            .order(
                "id",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Fehler beim Laden der Bestellpositionen:",
            error
        );

        showError(
            "Die bestellten Materialien konnten nicht geladen werden."
        );

        return [];

    }


    currentOrderItems =
        data || [];


    return currentOrderItems;

}


/* ============================================================
   MATERIALDATEN LADEN
   ============================================================ */

async function loadMaterials() {

    if (
        !currentOrderItems ||
        currentOrderItems.length === 0
    ) {

        currentMaterials =
            [];

        return [];

    }


    const ids =
        [
            ...new Set(
                currentOrderItems
                    .map(
                        item =>
                            item.material_id
                    )
                    .filter(
                        id =>
                            id !== null &&
                            id !== undefined
                    )
            )
        ];


    if (ids.length === 0) {

        currentMaterials =
            [];

        return [];

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("items")
            .select("*")
            .in(
                "id",
                ids
            );


    if (error) {

        console.error(
            "Fehler beim Laden der Materialien:",
            error
        );

        currentMaterials =
            [];

        return [];

    }


    currentMaterials =
        data || [];


    return currentMaterials;

}


/* ============================================================
   MATERIAL ZU EINER POSITION FINDEN
   ============================================================ */

function findMaterial(materialId) {

    return currentMaterials.find(
        material =>
            String(material.id) ===
            String(materialId)
    );

}


/* ============================================================
   MATERIALPOSITIONEN DARSTELLEN
   ============================================================ */

function renderMaterials() {

    const container =
        getElement("materialsList");


    if (!container) {
        return;
    }


    if (
        !currentOrderItems ||
        currentOrderItems.length === 0
    ) {

        container.innerHTML = `
            <div class="message">
                Diese Bestellung enthält keine
                gespeicherten Materialpositionen.
            </div>
        `;

        updateSummary(
            0,
            0,
            Number(currentOrder?.total_price) || 0
        );

        return;

    }


    let totalQuantity =
        0;

    let calculatedTotal =
        0;


    const html =
        currentOrderItems
            .map(
                (item, index) => {

                    const material =
                        findMaterial(
                            item.material_id
                        );


                    const quantity =
                        Number(
                            item.quantity
                        ) || 0;


                    totalQuantity +=
                        quantity;


                    const unitPrice =
                        Number(
                            material?.price
                        ) || 0;


                    const lineTotal =
                        unitPrice *
                        quantity;


                    calculatedTotal +=
                        lineTotal;


                    const name =
                        material?.name ||
                        material?.item_name ||
                        `Material #${item.material_id}`;


                    const category =
                        material?.category ||
                        material?.kategorie ||
                        "Material";


                    return `
                        <div class="material-row">

                            <div>

                                <div class="material-name">
                                    ${escapeHTML(name)}
                                </div>

                                <div class="material-category">
                                    ${escapeHTML(category)}
                                </div>

                            </div>

                            <div class="material-right">

                                <div class="material-amount">
                                    ${quantity.toLocaleString("de-DE")} Stück
                                </div>

                                <div class="material-price">
                                    ${formatMoney(unitPrice)}
                                    / Stück
                                </div>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");


    container.innerHTML =
        html;


    updateSummary(
        currentOrderItems.length,
        totalQuantity,
        Number(currentOrder?.total_price) ||
            calculatedTotal
    );

}


/* ============================================================
   ZUSAMMENFASSUNG
   ============================================================ */

function updateSummary(
    itemCount,
    totalQuantity,
    total
) {

    setText(
        "itemCount",
        itemCount.toLocaleString(
            "de-DE"
        )
    );


    setText(
        "totalQuantity",
        totalQuantity.toLocaleString(
            "de-DE"
        )
    );


    setText(
        "summaryTotal",
        formatMoney(total)
    );

}


/* ============================================================
   ENDE TEIL 2
   ============================================================ */


/* ============================================================
   PREISÜBERSICHT
   ============================================================ */

function renderPrice() {

    if (!currentOrder) {
        return;
    }


    const total =
        Number(
            currentOrder.total_price
        ) || 0;


    /*
       Die Materialbestellung speichert aktuell
       den finalen Gesamtpreis direkt in orders.total_price.

       Es gibt bei dieser Bestellung keine separat
       gespeicherten Felder für Zusatzkosten oder Rabatt.
    */


    setText(
        "subtotal",
        formatMoney(total)
    );


    setText(
        "extraCosts",
        formatMoney(0)
    );


    setText(
        "discount",
        formatMoney(0)
    );


    setText(
        "totalPrice",
        formatMoney(total)
    );


    setText(
        "summaryTotal",
        formatMoney(total)
    );

}


/* ============================================================
   BUTTON DEAKTIVIEREN
   ============================================================ */

function disableAcceptButton() {

    const button =
        getElement(
            "acceptOrderButton"
        );


    if (!button) {
        return;
    }


    button.disabled =
        true;

}


/* ============================================================
   BUTTON AKTIVIEREN
   ============================================================ */

function enableAcceptButton() {

    const button =
        getElement(
            "acceptOrderButton"
        );


    if (!button) {
        return;
    }


    button.disabled =
        false;


    button.innerHTML =
        "✓ Auftrag übernehmen";

}


/* ============================================================
   ÜBERNAHME-BUTTON STATUS PRÜFEN
   ============================================================ */

function updateAcceptButton() {

    const button =
        getElement(
            "acceptOrderButton"
        );


    if (!button) {
        return;
    }


    if (!currentOrder) {

        disableAcceptButton();

        return;
    }


    /* --------------------------------------------------------
       Bereits abgeschlossen
    -------------------------------------------------------- */

    if (
        currentOrder.status ===
        "Abgeschlossen"
    ) {

        button.disabled =
            true;

        button.innerHTML =
            "Auftrag bereits abgeschlossen";

        return;
    }


    /* --------------------------------------------------------
       Bereits einem Mitarbeiter zugewiesen
    -------------------------------------------------------- */

    if (
        currentOrder.employee_id &&
        currentOrder.employee_id !==
            currentUser?.id
    ) {

        button.disabled =
            true;

        button.innerHTML =
            "Auftrag bereits übernommen";

        return;
    }


    /* --------------------------------------------------------
       Eigener Auftrag
    -------------------------------------------------------- */

    if (
        currentOrder.employee_id ===
        currentUser?.id
    ) {

        button.disabled =
            true;

        button.innerHTML =
            "Auftrag bereits übernommen";

        return;
    }


    /* --------------------------------------------------------
       Nur offene Aufträge übernehmen
    -------------------------------------------------------- */

    if (
        currentOrder.status !==
        "Offen"
    ) {

        button.disabled =
            true;

        button.innerHTML =
            "Auftrag nicht verfügbar";

        return;
    }


    /* --------------------------------------------------------
       Mitarbeiter muss verfügbar sein
    -------------------------------------------------------- */

    if (
        currentEmployee &&
        currentEmployee.is_available !== true
    ) {

        button.disabled =
            true;

        button.innerHTML =
            "Nicht verfügbar";

        return;
    }


    enableAcceptButton();

}


/* ============================================================
   AUFTRAG ÜBERNEHMEN
   ============================================================ */

async function acceptOrder() {

    if (!currentOrder) {

        alert(
            "Kein Auftrag geladen."
        );

        return;

    }


    if (!currentUser) {

        alert(
            "Du bist nicht angemeldet."
        );

        return;

    }


    if (
        currentOrder.status !==
        "Offen"
    ) {

        alert(
            "Dieser Auftrag ist nicht mehr offen."
        );

        return;

    }


    if (
        currentOrder.employee_id &&
        currentOrder.employee_id !==
            currentUser.id
    ) {

        alert(
            "Dieser Auftrag wurde bereits von einem anderen Mitarbeiter übernommen."
        );

        return;

    }


    if (
        currentEmployee &&
        currentEmployee.is_available !== true
    ) {

        alert(
            "Du bist aktuell als nicht verfügbar eingetragen und kannst keine neuen Aufträge übernehmen."
        );

        return;

    }


    const button =
        getElement(
            "acceptOrderButton"
        );


    if (button) {

        button.disabled =
            true;

        button.innerHTML =
            "⏳ Auftrag wird übernommen...";

    }


    /*
       Wir ändern bewusst nur Felder,
       die in orders sicher vorhanden sind.

       employee_id:
       aktueller Mitarbeiter

       status:
       Offen → In Bearbeitung
    */

    const {
        data,
        error
    } =
        await supabaseClient
            .from("orders")
            .update({
                employee_id:
                    currentUser.id,

                status:
                    "In Bearbeitung"
            })
            .eq(
                "id",
                currentOrder.id
            )
            .eq(
                "status",
                "Offen"
            )
            .select()
            .maybeSingle();


    if (error) {

        console.error(
            "Fehler bei der Übernahme:",
            error
        );


        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                "✓ Auftrag übernehmen";

        }


        alert(
            "Der Auftrag konnte nicht übernommen werden.\n\n" +
            error.message
        );

        return;

    }


    if (!data) {

        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                "✓ Auftrag übernehmen";

        }


        alert(
            "Der Auftrag konnte nicht übernommen werden. Möglicherweise wurde er gerade von einem anderen Mitarbeiter übernommen."
        );

        return;

    }


    currentOrder =
        data;


    alert(
        "✓ Auftrag erfolgreich übernommen!"
    );


    /*
       Nach erfolgreicher Übernahme
       zurück zum Mitarbeiterbereich.
    */

    window.location.href =
        "mitarbeiter.html";

}


/* ============================================================
   BUTTON EVENT
   ============================================================ */

function setupEvents() {

    const button =
        getElement(
            "acceptOrderButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        acceptOrder
    );

}


/* ============================================================
   ENDE TEIL 3
   ============================================================ */

/* ============================================================
   SEITENINITIALISIERUNG
   ============================================================ */

async function initializePage() {

    try {

        hideError();


        /* ----------------------------------------------------
           SUPABASE
        ---------------------------------------------------- */

        supabaseClient =
            getSupabaseClient();


        if (!supabaseClient) {

            showError(
                "Supabase konnte nicht initialisiert werden."
            );

            disableAcceptButton();

            return;

        }


        /* ----------------------------------------------------
           BENUTZER
        ---------------------------------------------------- */

        currentUser =
            await loadCurrentUser();


        if (!currentUser) {
            return;
        }


        /* ----------------------------------------------------
           MITARBEITER
        ---------------------------------------------------- */

        currentEmployee =
            await loadCurrentEmployee();


        /* ----------------------------------------------------
           AUFTRAG
        ---------------------------------------------------- */

        const order =
            await loadOrder();


        if (!order) {
            return;
        }


        /* ----------------------------------------------------
           AUFTRAGSDATEN
        ---------------------------------------------------- */

        renderOrderInformation();


        /* ----------------------------------------------------
           POSITIONEN
        ---------------------------------------------------- */

        await loadOrderItems();


        /* ----------------------------------------------------
           MATERIALDATEN
        ---------------------------------------------------- */

        await loadMaterials();


        /* ----------------------------------------------------
           MATERIALIEN ANZEIGEN
        ---------------------------------------------------- */

        renderMaterials();


        /* ----------------------------------------------------
           PREISE
        ---------------------------------------------------- */

        renderPrice();


        /* ----------------------------------------------------
           ÜBERNAHME-BUTTON
        ---------------------------------------------------- */

        updateAcceptButton();


        console.log(
            "Material-Detailseite erfolgreich geladen.",
            {
                order:
                    currentOrder,

                orderItems:
                    currentOrderItems,

                materials:
                    currentMaterials,

                employee:
                    currentEmployee
            }
        );

    }

    catch (error) {

        console.error(
            "Unerwarteter Fehler:",
            error
        );


        showError(
            "Beim Laden der Auftragsdetails ist ein unerwarteter Fehler aufgetreten."
        );


        disableAcceptButton();

    }

}


/* ============================================================
   START
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupEvents();

        initializePage();

    }
);


/* ============================================================
   ENDE
   ============================================================ */
