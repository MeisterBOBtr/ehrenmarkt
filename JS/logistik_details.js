// ======================================================
// EHRENMARKT – LOGISTIKAUFTRAG DETAILS
// Teil 1 von 2
// ======================================================

const client = window.supabaseClient || window.supabase;
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


    let query = client
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
        order.customer_name
    );


    // Auftraggeber
    setText(
        "customerName",
        order.customer_name
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
            order.order_type
        )
    );


    // Start
    setText(
        "startLocation",
        order.start_point
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
        (Number(order.extra_workers || 0) + 1)
            ? "Mitarbeiter: " +
              (Number(order.extra_workers || 0) + 1)
            : "Mitarbeiter: 1"
    );


    // Notizen
    const notesElement =
        getElement("notes");

    if (notesElement) {

        notesElement.textContent =
            order.description ||
            "Keine Anmerkungen vorhanden.";
    }


    // Preise
    setText(
        "cratePrice",
        formatMoney(
            order.base_price
        )
    );


    setText(
        "extraPrice",
        formatMoney(
            (
                Number(order.sorting_price || 0) +
                Number(order.delivery_price || 0) +
                Number(order.express_price || 0) +
                Number(order.workers_price || 0)
            )
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
            order.remaining_payment
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
    } = await client.auth.getUser();


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
    } = await client
        .from("employees")
        .select("*")
        .eq(
            "user_id",
            currentUser.id
        )
        .maybeSingle();

    if (error) {

        return false;
    }


    currentEmployee =
        data;

    return true;
}


// ======================================================
// MITARBEITERNAME ANZEIGEN
// ======================================================

async function loadEmployeeName() {

    const employeeNameElement =
        getElement("employeeName");

    if (!employeeNameElement) {
        return;
    }


    if (!currentEmployee) {

        employeeNameElement.textContent =
            "Noch nicht zugewiesen";

        return;
    }


    employeeNameElement.textContent =
        currentEmployee.minecraft_name ||
        currentEmployee.display_name ||
        currentEmployee.name ||
        "Mitarbeiter";
}


// ======================================================
// BUTTONS EINRICHTEN
// ======================================================

function setupButtons() {

    const acceptButton =
        getElement("acceptOrderButton");

    if (!acceptButton) {
        return;
    }

        const finishButton = getElement("finishOrderButton");

    if (finishButton) {
        finishButton.addEventListener("click", finishOrder);
    }


    // Bereits angenommener Auftrag
    if (
        currentOrder &&
        currentOrder.employee_id
    ) {

        acceptButton.disabled =
            true;

        acceptButton.textContent =
            "Auftrag bereits angenommen";

        return;
    }


    acceptButton.addEventListener(
        "click",
        acceptOrder
    );
}

// ======================================================
// AUFTRAG ABSCHLIESSEN
// ======================================================

async function finishOrder() {
    if (!currentOrder || !currentEmployee) {
        showError("Der Auftrag oder Mitarbeiter wurde nicht gefunden.");
        return;
    }

    if (!confirm("Logistikauftrag wirklich abschließen?")) {
        return;
    }

    const finishButton = getElement("finishOrderButton");

    if (finishButton) {
        finishButton.disabled = true;
        finishButton.textContent = "Wird abgeschlossen...";
    }

    const { error } = await client
        .from("logistics_orders")
        .update({
            status: "Abgeschlossen"
        })
        .eq("id", currentOrder.id)
        .eq("employee_id", currentEmployee.id);

    if (error) {
        console.error("Fehler beim Abschließen:", error);
        showError("Der Logistikauftrag konnte nicht abgeschlossen werden.");

        if (finishButton) {
            finishButton.disabled = false;
            finishButton.textContent = "✓ Auftrag abschließen";
        }

        return;
    }

    currentOrder.status = "Abgeschlossen";
    renderOrder(currentOrder);

    if (finishButton) {
        finishButton.disabled = true;
        finishButton.textContent = "Auftrag abgeschlossen";
    }

    alert("Logistikauftrag erfolgreich abgeschlossen.");
}

// ======================================================
// AUFTRAG ANNEHMEN
// ======================================================

async function acceptOrder() {

    const acceptButton =
        getElement("acceptOrderButton");

    if (!currentOrder || !currentEmployee) {
        return;
    }


    if (acceptButton) {

        acceptButton.disabled =
            true;

        acceptButton.textContent =
            "Wird angenommen...";
    }


    const {
        error
    } = await client
        .from("logistics_orders")
        .update({

            employee_id:
                currentEmployee.id,

            employee_name:
                currentEmployee.minecraft_name ||
                currentEmployee.display_name ||
                currentEmployee.name ||
                "Mitarbeiter",

            status:
                "angenommen"
        })
        .eq(
            "id",
            currentOrder.id
        );


    if (error) {

        if (acceptButton) {

            acceptButton.disabled =
                false;

            acceptButton.textContent =
                "Auftrag annehmen";
        }

        return;
    }


    currentOrder.employee_id =
        currentEmployee.id;

    currentOrder.employee_name =
        currentEmployee.minecraft_name ||
        currentEmployee.display_name ||
        currentEmployee.name ||
        "Mitarbeiter";

    currentOrder.status =
        "angenommen";


    renderOrder(
        currentOrder
    );

    await loadEmployeeName();


    if (acceptButton) {

        acceptButton.disabled =
            true;

        acceptButton.textContent =
            "Auftrag angenommen";
    }
}


// ======================================================
// START
// ======================================================

async function init() {

    const userLoaded =
        await loadUser();

    if (!userLoaded) {
        return;
    }


    const employeeLoaded =
        await loadEmployee();

    if (!employeeLoaded) {
        return;
    }


    const orderLoaded =
        await loadOrder();

    if (!orderLoaded) {
        return;
    }


    await loadEmployeeName();

    setupButtons();


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
}


// ======================================================
// INIT AUSFÜHREN
// ======================================================

init();
