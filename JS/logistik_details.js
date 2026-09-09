// ======================================================
// EHRENMARKT – LOGISTIKAUFTRAG DETAILS
// Teil 1 von 2
// ======================================================

const supabaseClient = window.supabaseClient || window.supabase;

let currentUser = null;
let currentEmployee = null;
let currentOrder = null;


// ======================================================
// HILFSFUNKTIONEN
// ======================================================

function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent =
            value !== null &&
            value !== undefined &&
            value !== ""
                ? value
                : "—";
    }
}


function formatMoney(value) {
    const number = Number(value) || 0;

    return number.toLocaleString("de-DE") + " $";
}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function showError(message) {

    const error = getElement("errorMessage");

    if (!error) {
        return;
    }

    error.textContent = message;
    error.style.display = "block";
}


function hideError() {

    const error = getElement("errorMessage");

    if (!error) {
        return;
    }

    error.textContent = "";
    error.style.display = "none";
}


// ======================================================
// URL – AUFTRAG ERMITTELN
// ======================================================

function getOrderParameter() {

    const params = new URLSearchParams(
        window.location.search
    );

    return {
        id: params.get("id"),
        orderNumber: params.get("order")
    };
}


// ======================================================
// AUFTRAG LADEN
// ======================================================

async function loadOrder() {

    hideError();

    const params = getOrderParameter();

    if (!params.id && !params.orderNumber) {

        showError(
            "Kein Logistikauftrag ausgewählt. " +
            "Bitte wähle zuerst einen Auftrag aus dem Mitarbeiterbereich."
        );

        return false;
    }


    let query = supabaseClient
        .from("logistics_orders")
        .select("*");


    if (params.id) {

        query = query.eq(
            "id",
            params.id
        );

    } else {

        query = query.eq(
            "order_number",
            params.orderNumber
        );
    }


    const {
        data,
        error
    } = await query
        .maybeSingle();


    if (error) {

        console.error(
            "Fehler beim Laden des Logistikauftrags:",
            error
        );

        showError(
            "Der Logistikauftrag konnte nicht geladen werden."
        );

        return false;
    }


    if (!data) {

        showError(
            "Der angegebene Logistikauftrag wurde nicht gefunden."
        );

        return false;
    }


    currentOrder = data;

    renderOrder(data);

    return true;
}


// ======================================================
// AUFTRAG ANZEIGEN
// ======================================================

function renderOrder(order) {

    // Auftragsnummer
    setText(
        "orderNumber",
        order.order_number
    );


    // Minecraft-Name
    setText(
        "minecraftName",
        order.minecraft_name
    );


    // Auftraggeber
    setText(
        "customerName",
        order.minecraft_name
    );


    // Datum
    setText(
        "orderDate",
        formatDate(order.created_at)
    );


    // Status
    const statusElement =
        getElement("orderStatus");

    if (statusElement) {

        statusElement.innerHTML = "";

        const statusBadge =
            document.createElement("span");

        statusBadge.className = "status";

        statusBadge.textContent =
            order.status || "Offen";

        statusElement.appendChild(
            statusBadge
        );
    }


    // Anzahl Kisten
    setText(
        "crateCount",
        order.crate_count
            ? Number(order.crate_count).toLocaleString("de-DE")
            : "—"
    );


    // Auftragsart
    setText(
        "transportType",
        getTransportTypeName(
            order.transport_type
        )
    );


    // Start
    setText(
        "startLocation",
        order.start_location
    );


    // Ziel
    setText(
        "destination",
        order.destination
    );


    // Lieferung
    setText(
        "deliveryType",
        getDeliveryTypeName(
            order.delivery_type
        )
    );


    // Sortierung
    const sorting =
        Boolean(order.sorting);

    setText(
        "sortingBadge",
        "Sortierung: " +
        (sorting ? "Ja" : "Nein")
    );


    // Express
    const express =
        Boolean(order.express);

    setText(
        "expressBadge",
        "Express: " +
        (express ? "Ja" : "Nein")
    );


    // Mitarbeiter
    setText(
        "workerBadge",
        order.worker_count
            ? "Mitarbeiter: " +
              order.worker_count
            : "Mitarbeiter: 1"
    );


    // Notizen
    const notesElement =
        getElement("notes");

    if (notesElement) {

        notesElement.textContent =
            order.notes ||
            "Keine Anmerkungen vorhanden.";
    }


    // Preise
    setText(
        "cratePrice",
        formatMoney(
            order.crate_price
        )
    );


    setText(
        "extraPrice",
        formatMoney(
            order.extra_price
        )
    );


    setText(
        "totalPrice",
        formatMoney(
            order.total_price
        )
    );


    setText(
        "depositPrice",
        formatMoney(
            order.deposit
        )
    );


    setText(
        "remainingPrice",
        formatMoney(
            order.remaining
        )
    );
}


// ======================================================
// AUFTRAGSART
// ======================================================

function getTransportTypeName(type) {

    const types = {

        transport:
            "Transport",

        lagerung:
            "Lagerung",

        sortierung:
            "Sortierung",

        transport_sortierung:
            "Transport + Sortierung"
    };


    return types[type] ||
           type ||
           "—";
}


// ======================================================
// LIEFERART
// ======================================================

function getDeliveryTypeName(type) {

    const types = {

        none:
            "Keine Lieferung",

        plot_plot:
            "Plot → Plot",

        cb_cb:
            "CB → CB"
    };


    return types[type] ||
           type ||
           "—";
}


// ======================================================
// BENUTZER LADEN
// ======================================================

async function loadUser() {

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();


    if (error || !data.user) {

        window.location.href =
            "../index.html";

        return false;
    }


    currentUser =
        data.user;

    return true;
}


// ======================================================
// MITARBEITER LADEN
// ======================================================

async function loadEmployee() {

    if (!currentUser) {
        return false;
    }


    const {
        data,
        error
    } = await supabaseClient
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

        showError(
            "Mitarbeiterdaten konnten nicht geladen werden."
        );

        return false;
    }


    if (!data) {

        showError(
            "Du bist nicht als Mitarbeiter hinterlegt."
        );

        return false;
    }


    currentEmployee =
        data;

    return true;
          }

// ======================================================
// EHRENMARKT – LOGISTIKAUFTRAG DETAILS
// Teil 2 von 2
// ======================================================


// ======================================================
// BEARBEITER ANZEIGEN
// ======================================================

async function loadEmployeeName() {

    if (!currentOrder) {
        return;
    }

    const employeeId =
        currentOrder.employee_id ||
        currentOrder.assigned_to ||
        null;


    if (!employeeId) {

        setText(
            "employeeName",
            "Noch nicht übernommen"
        );

        return;
    }


    const {
        data,
        error
    } = await supabaseClient
        .from("employees")
        .select("name")
        .eq(
            "user_id",
            employeeId
        )
        .maybeSingle();


    if (error) {

        console.error(
            "Fehler beim Laden des Bearbeiters:",
            error
        );

        setText(
            "employeeName",
            "Bereits übernommen"
        );

        return;
    }


    setText(
        "employeeName",
        data?.name ||
        "Bereits übernommen"
    );
}


// ======================================================
// AUFTRAG ÜBERNEHMEN
// ======================================================

async function acceptOrder() {

    hideError();


    if (!currentUser) {

        showError(
            "Du bist nicht angemeldet."
        );

        return;
    }


    if (!currentEmployee) {

        showError(
            "Mitarbeiterdaten konnten nicht geladen werden."
        );

        return;
    }


    if (!currentOrder) {

        showError(
            "Kein Logistikauftrag geladen."
        );

        return;
    }


    // Mitarbeiter muss verfügbar sein
    if (currentEmployee.is_available !== true) {

        showError(
            "Du bist momentan nicht verfügbar und kannst " +
            "keine neuen Aufträge übernehmen."
        );

        return;
    }


    // Auftrag muss noch offen sein
    if (currentOrder.status !== "Offen") {

        showError(
            "Dieser Auftrag wurde bereits übernommen " +
            "oder ist nicht mehr verfügbar."
        );

        await loadOrder();
        await loadEmployeeName();

        return;
    }


    const button =
        getElement("acceptOrderButton");


    if (button) {

        button.disabled = true;

        button.textContent =
            "Wird übernommen...";
    }


    try {

        /*
         * Der Auftrag wird nur übernommen,
         * wenn er weiterhin "Offen" ist.
         *
         * Dadurch können nicht zwei Mitarbeiter
         * gleichzeitig denselben Auftrag übernehmen.
         */

        const {
            data,
            error
        } = await supabaseClient
            .from("logistics_orders")
            .update({
                employee_id: currentUser.id,
                status: "In Bearbeitung"
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
                "Fehler beim Übernehmen:",
                error
            );

            showError(
                "Der Auftrag konnte nicht übernommen werden."
            );

            return;
        }


        if (!data) {

            showError(
                "Der Auftrag wurde bereits von einem " +
                "anderen Mitarbeiter übernommen."
            );

            await loadOrder();
            await loadEmployeeName();

            return;
        }


        // Lokale Daten aktualisieren
        currentOrder = data;


        // Anzeige aktualisieren
        renderOrder(
            currentOrder
        );

        await loadEmployeeName();


        // Button deaktivieren
        if (button) {

            button.disabled = true;

            button.textContent =
                "✓ Auftrag übernommen";
        }


        // Erfolgsmeldung
        const errorElement =
            getElement("errorMessage");

        if (errorElement) {

            errorElement.style.display =
                "block";

            errorElement.style.background =
                "rgba(38, 78, 34, 0.65)";

            errorElement.style.borderColor =
                "#679b53";

            errorElement.style.color =
                "#d9f0c9";

            errorElement.textContent =
                "✓ Auftrag erfolgreich übernommen.";
        }


    } catch (err) {

        console.error(
            "Unerwarteter Fehler:",
            err
        );

        showError(
            "Beim Übernehmen des Auftrags ist ein Fehler aufgetreten."
        );

    } finally {

        /*
         * Nur wieder aktivieren, wenn der Auftrag
         * nicht erfolgreich übernommen wurde.
         */

        if (
            button &&
            currentOrder?.status === "Offen"
        ) {

            button.disabled = false;

            button.textContent =
                "✓ Auftrag übernehmen";
        }
    }
}


// ======================================================
// BUTTON VERKNÜPFEN
// ======================================================

function setupButtons() {

    const button =
        getElement("acceptOrderButton");


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        acceptOrder
    );
}


// ======================================================
// SEITE STARTEN
// ======================================================

async function init() {

    try {

        hideError();


        // Benutzer prüfen
        const userLoaded =
            await loadUser();

        if (!userLoaded) {
            return;
        }


        // Mitarbeiter prüfen
        const employeeLoaded =
            await loadEmployee();

        if (!employeeLoaded) {
            return;
        }


        // Auftrag laden
        const orderLoaded =
            await loadOrder();


        if (!orderLoaded) {
            return;
        }


        // Bearbeiter laden
        await loadEmployeeName();


        // Button aktivieren
        setupButtons();


        // Inhalt anzeigen
        const loadingSection =
            getElement("loadingSection");

        const orderContent =
            getElement("orderContent");


        if (loadingSection) {

            loadingSection.style.display =
                "none";
        }


        if (orderContent) {

            orderContent.style.display =
                "block";
        }


        /*
         * Wenn der Auftrag bereits vergeben ist,
         * kann er nicht erneut übernommen werden.
         */

        if (
            currentOrder.status !== "Offen"
        ) {

            const button =
                getElement("acceptOrderButton");

            if (button) {

                button.disabled = true;

                button.textContent =
                    "Auftrag bereits übernommen";
            }
        }


    } catch (error) {

        console.error(
            "Fehler beim Initialisieren:",
            error
        );

        showError(
            "Die Logistik-Detailseite konnte nicht geladen werden."
        );
    }
}


// ======================================================
// START
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    init
);
