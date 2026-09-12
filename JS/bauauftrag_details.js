// ======================================================
// EHRENMARKT – BAUAUFTRAG DETAILS
// Teil 1 von 5
// ======================================================

let currentUser = null;
let currentEmployee = null;
let currentOrder = null;

let materials = [];


// ======================================================
// SUPABASE
// ======================================================

const supabaseClient =
    window.supabaseClient ||
    window.supabase;


// ======================================================
// HILFSFUNKTIONEN
// ======================================================

function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = getElement(id);

    if (!element) {
        return;
    }

    element.textContent =
        value !== null &&
        value !== undefined &&
        value !== ""
            ? value
            : "—";
}


function number(value) {
    const result = Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}


function formatMoney(value) {
    return number(value).toLocaleString("de-DE") + " $";
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
    const element = getElement("errorMessage");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.style.display = "block";
}


function hideError() {
    const element = getElement("errorMessage");

    if (!element) {
        return;
    }

    element.textContent = "";
    element.style.display = "none";
}


// ======================================================
// URL-PARAMETER
// ======================================================

function getOrderParameters() {
    const params =
        new URLSearchParams(window.location.search);

    return {
        id: params.get("id"),
        orderNumber: params.get("order")
    };
}


// ======================================================
// BENUTZER LADEN
// ======================================================

async function loadUser() {
    const {
        data,
        error
    } = await supabaseClient.auth.getUser();

    if (
        error ||
        !data ||
        !data.user
    ) {
        window.location.href = "login.html";
        return false;
    }

    currentUser = data.user;

    return true;
}


// ======================================================
// MITARBEITER LADEN
// ======================================================

async function loadEmployee() {
    const {
        data,
        error
    } = await supabaseClient
        .from("employees")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error(
            "Mitarbeiter konnte nicht geladen werden:",
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

    currentEmployee = data;

    return true;
}


// ======================================================
// BAUAUFTRAG LADEN
// ======================================================

async function loadOrder() {
    const params = getOrderParameters();

    if (
        !params.id &&
        !params.orderNumber
    ) {
        showError(
            "Kein Bauauftrag ausgewählt. " +
            "Bitte öffne zuerst einen Auftrag aus dem Mitarbeiterbereich."
        );

        return false;
    }

    let query = supabaseClient
        .from("build_orders")
        .select("*");

    if (params.id) {
        query = query.eq("id", params.id);
    } else {
        query = query.eq(
            "order_number",
            params.orderNumber
        );
    }

    const {
        data,
        error
    } = await query.maybeSingle();

    if (error) {
        console.error(
            "Bauauftrag konnte nicht geladen werden:",
            error
        );

        showError(
            "Der Bauauftrag konnte nicht geladen werden."
        );

        return false;
    }

    if (!data) {
        showError(
            "Der Bauauftrag wurde nicht gefunden."
        );

        return false;
    }

    currentOrder = data;

    renderOrder(currentOrder);

    return true;
}


// ======================================================
// BAUAUFTRAG ANZEIGEN
// ======================================================

function renderOrder(order) {
    setText(
        "orderNumber",
        order.order_number
    );

    const status = getElement("orderStatus");

    if (status) {
        status.textContent =
            order.status || "Offen";
    }

    setText(
        "orderDate",
        formatDate(order.created_at)
    );

    setText(
        "minecraftName",
        order.minecraft_name
    );

    setText(
        "customerName",
        order.minecraft_name
    );

    setText(
        "contact",
        order.contact_value ||
        order.contact ||
        "—"
    );

    setText(
        "location",
        order.location
    );

    setText(
        "priority",
        getPriorityName(order.priority)
    );

    setText(
        "plotSize",
        getPlotSize(order)
    );

    const plotCount =
        number(order.plot_count);

    setText(
        "plotCount",
        plotCount > 0
            ? plotCount
            : "—"
    );

    setText(
        "pricePlotCount",
        plotCount > 0
            ? plotCount
            : "0"
    );

    setText(
        "buildingType",
        order.building_type
    );

    setText(
        "buildingDimensions",
        getBuildingDimensions(order)
    );

    setText(
        "buildingFloors",
        order.building_floors
    );

    setText(
        "buildingStyle",
        order.building_style
    );

    setText(
        "blockPalette",
        order.block_palette
    );

    setText(
        "specialBlocks",
        order.special_blocks
    );

    setText(
        "interiorLevel",
        order.interior_level
    );

    setText(
        "exteriorLevel",
        order.exterior_level
    );

    setText(
        "lightingLevel",
        order.lighting_level
    );

    setText(
        "terraformingLevel",
        order.terraforming_level
    );

    setText(
        "description",
        order.description
    );

    setText(
        "specialRequests",
        order.special_requests
    );

    setText(
        "materialProvider",
        getMaterialProviderName(
            order.material_provider
        )
    );

// ======================================================

function renderOrder(order) {

    // Auftragsnummer
    setText(
        "orderNumber",
        order.order_number
    );


    // Status
    const status =
        getElement("orderStatus");

    if (status) {

        status.textContent =
            order.status ||
            "Offen";
    }


    // Datum
    setText(
        "orderDate",
        formatDate(
            order.created_at
        )
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


    // Kontakt
    setText(
        "contact",
        order.contact_value ||
        order.contact ||
        "—"
    );


    // Standort
    setText(
        "location",
        order.location
    );


    // Priorität
    setText(
        "priority",
        getPriorityName(
            order.priority
        )
    );


    // Plotgröße
    setText(
        "plotSize",
        getPlotSize(order)
    );


    // Plot-Anzahl
    const plotCount =
        number(
            order.plot_count
        );

    setText(
        "plotCount",
        plotCount > 0
            ? plotCount
            : "—"
    );


    setText(
        "pricePlotCount",
        plotCount > 0
            ? plotCount
            : "0"
    );


    // Gebäudeart
    setText(
        "buildingType",
        order.building_type
    );


    // Gebäudemaße
    setText(
        "buildingDimensions",
        getBuildingDimensions(
            order
        )
    );


    // Etagen
    setText(
        "buildingFloors",
        order.building_floors
    );


    // Baustil
    setText(
        "buildingStyle",
        order.building_style
    );


    // Blockpalette
    setText(
        "blockPalette",
        order.block_palette
    );


    // Sonderblöcke
    setText(
        "specialBlocks",
        order.special_blocks
    );


    // Leistungsumfang
    setText(
        "interiorLevel",
        order.interior_level
    );


    setText(
        "exteriorLevel",
        order.exterior_level
    );


    setText(
        "lightingLevel",
        order.lighting_level
    );


    setText(
        "terraformingLevel",
        order.terraforming_level
    );


    // Beschreibung
    setText(
        "description",
        order.description
    );


    // Besondere Wünsche
    setText(
        "specialRequests",
        order.special_requests
    );


    // Materialbereitstellung
    setText(
        "materialProvider",
        getMaterialProviderName(
            order.material_provider
        )
    );


    // Preise
    setText(
        "basePrice",
        formatMoney(
            order.base_price
        )
    );


    setText(
        "addonPrice",
        formatMoney(
            order.addon_price
        )
    );


    setText(
        "materialCost",
        formatMoney(
            order.material_cost
        )
    );


    setText(
        "materialSurcharge",
        formatMoney(
            order.material_surcharge
        )
    );


    setText(
        "finalPrice",
        formatMoney(
            order.final_price
        )
    );


    setText(
        "deposit",
        formatMoney(
            order.deposit
        )
    );


    setText(
        "remainingPayment",
        formatMoney(
            order.remaining_payment
        )
    );


    // Notizen
    setText(
        "notes",
        order.notes ||
        order.description ||
        "Keine Anmerkungen vorhanden."
    );


    // Referenzbild
    renderReferenceImage(
        order.reference_image_url
    );


    // Status
    updateStatusProgress(
        order.status
    );
}


// ======================================================
// PLOTGRÖSSE
// ======================================================

function getPlotSize(order) {

    const width =
        number(
            order.merge_width
        );

    const height =
        number(
            order.merge_height
        );


    if (
        width > 0 &&
        height > 0
    ) {

        return (
            width +
            " × " +
            height
        );
    }


    return (
        order.plot_size ||
        "—"
    );
}


// ======================================================
// GEBÄUDEMASSE
// ======================================================

function getBuildingDimensions(order) {

    const length =
        number(
            order.building_length
        );

    const width =
        number(
            order.building_width
        );

    const height =
        number(
            order.building_height
        );


    if (
        length > 0 ||
        width > 0 ||
        height > 0
    ) {

        return (
            length +
            " × " +
            width +
            " × " +
            height
        );
    }


    return "—";
}


// ======================================================
// PRIORITÄT
// ======================================================

function getPriorityName(priority) {

    const priorities = {

        niedrig: "Niedrig",

        normal: "Normal",

        hoch: "Hoch",

        dringend: "Dringend"
    };


    return (
        priorities[priority] ||
        priority ||
        "Normal"
    );
}


// ======================================================
// MATERIALBEREITSTELLUNG
// ======================================================

function getMaterialProviderName(provider) {

    if (
        provider === "customer" ||
        provider === "kunde" ||
        provider === "client"
    ) {

        return "Kunde stellt Materialien bereit";
    }


    if (
        provider === "falkenstein" ||
        provider === "company" ||
        provider === "server"
    ) {

        return "Falkenstein stellt Materialien bereit";
    }


    return provider || "Nicht angegeben";
}


// ======================================================
// STATUSFORTSCHRITT
// ======================================================

function updateStatusProgress(status) {

    const normalizedStatus =
        String(
            status || ""
        ).toLowerCase();


    const steps = [

        {
            id: "statusOpen",
            values: [
                "offen",
                "open",
                "neu"
            ]
        },

        {
            id: "statusAccepted",
            values: [
                "angenommen",
                "accepted",
                "in_bearbeitung",
                "in bearbeitung"
            ]
        },

        {
            id: "statusProgress",
            values: [
                "in arbeit",
                "in_progress",
                "fortschritt",
                "bearbeitung"
            ]
        },

        {
            id: "statusCompleted",
            values: [
                "abgeschlossen",
                "completed",
                "fertig",
                "erledigt"
            ]
        }
    ];


    let activeIndex = 0;


    steps.forEach(
        (step, index) => {

            if (
                step.values.includes(
                    normalizedStatus
                )
            ) {

                activeIndex = index;
            }
        }
    );


    steps.forEach(
        (step, index) => {

            const element =
                getElement(
                    step.id
                );

            if (!element) {
                return;
            }


            element.classList.toggle(
                "active",
                index <= activeIndex
            );

            element.classList.toggle(
                "completed",
                index < activeIndex
            );
        }
    );
}


// ======================================================
// REFERENZBILD
// ======================================================

function renderReferenceImage(url) {

    const image =
        getElement(
            "referenceImage"
        );

    if (!image) {
        return;
    }


    if (!url) {

        image.style.display =
            "none";

        return;
    }


    image.src = url;

    image.style.display =
        "block";
}


// ======================================================
// HILFSFUNKTIONEN
// ======================================================

function getElement(id) {

    return document.getElementById(id);
}


function setText(id, value) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        element.textContent =
            "—";

        return;
    }


    element.textContent =
        value;
}


function number(value) {

    const parsed =
        Number(value);

    if (
        Number.isNaN(parsed)
    ) {

        return 0;
    }


    return parsed;
}


function formatMoney(value) {

    const amount =
        number(value);


    return (
        amount.toLocaleString(
            "de-DE"
        ) +
        " $"
    );
}


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


    return date.toLocaleDateString(
        "de-DE"
    );
}

length +
            " × " +
            width +
            " × " +
            height
        );
    }


    return "—";
}


// ======================================================
// PRIORITÄT
// ======================================================

function getPriorityName(priority) {

    const names = {

        normal:
            "Normal",

        schnell:
            "Schnell (+10 %)",

        express:
            "Express (+25 %)"
    };


    return names[priority] ||
           priority ||
           "Normal";
}


// ======================================================
// MATERIALBEREITSTELLUNG
// ======================================================

function getMaterialProviderName(provider) {

    const names = {

        kunde:
            "Kunde",

        customer:
            "Kunde",

        selbst:
            "Kunde",

        falkenstein:
            "Falkenstein",

        clan:
            "Falkenstein"
    };


    return names[provider] ||
           provider ||
           "—";
}


// ======================================================
// REFERENZBILD
// ======================================================

function renderReferenceImage(url) {

    const container =
        getElement(
            "referenceContainer"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!url) {

        const placeholder =
            document.createElement(
                "div"
            );

        placeholder.className =
            "reference-placeholder";

        placeholder.textContent =
            "Kein Referenzbild vorhanden.";

        container.appendChild(
            placeholder
        );

        return;
    }


    const image =
        document.createElement(
            "img"
        );

    image.className =
        "reference-image";

    image.src =
        url;

    image.alt =
        "Referenzbild des Bauauftrags";

    image.loading =
        "lazy";


    container.appendChild(
        image
    );
}


// ==========================================
// TEIL 2 VON 4
// Materialien laden & Verbrauch verwalten
// ==========================================

async function loadAvailableMaterials() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("items")
            .select(
                "id, name, price, active"
            )
            .eq(
                "active",
                true
            )
            .order(
                "name",
                {
                    ascending: true
                }
            );


        if (error) {
            throw error;
        }


        return data || [];

    } catch (error) {

        console.error(
            "Fehler beim Laden der Materialien:",
            error
        );

        return [];
    }
}


// ==========================================
// MATERIAL-EINGABE ANZEIGEN
// ==========================================

async function openMaterialEditor() {

    if (!currentOrder) {
        return;
    }


    // Nur der Bearbeiter darf Materialien eintragen
    if (
        currentOrder.employee_id &&
        currentOrder.employee_id !== currentUser.id
    ) {

        showError(
            "Nur der zugewiesene Bearbeiter darf Materialien eintragen."
        );

        return;
    }


    if (!currentOrder.employee_id) {

        showError(
            "Bitte übernimm den Auftrag zuerst."
        );

        return;
    }


    const availableMaterials =
        await loadAvailableMaterials();


    if (!availableMaterials.length) {

        showError(
            "Es wurden keine aktiven Materialien gefunden."
        );

        return;
    }


    const materialNames =
        availableMaterials
            .map(
                material => material.name
            )
            .join("\n");


    const materialName =
        prompt(
            "Welches Material wurde verbraucht?\n\n" +
            materialNames
        );


    if (!materialName) {
        return;
    }


    const selectedMaterial =
        availableMaterials.find(
            material =>
                material.name.toLowerCase() ===
                materialName.toLowerCase()
        );


    if (!selectedMaterial) {

        showError(
            "Material wurde nicht gefunden."
        );

        return;
    }


    const quantityInput =
        prompt(
            `Wie viele ${selectedMaterial.name} wurden verbraucht?`
        );


    if (!quantityInput) {
        return;
    }


    const quantity =
        parseInt(
            quantityInput,
            10
        );


    if (
        !Number.isInteger(quantity) ||
        quantity <= 0
    ) {

        showError(
            "Bitte eine gültige Menge eingeben."
        );

        return;
    }


    const existingMaterial =
        materials.find(
            material =>
                Number(material.material_id) ===
                Number(selectedMaterial.id)
        );


    if (existingMaterial) {

        existingMaterial.quantity +=
            quantity;

    } else {

        materials.push({

            material_id:
                selectedMaterial.id,

            name:
                selectedMaterial.name,

            price:
                number(
                    selectedMaterial.price
                ),

            quantity:
                quantity
        });
    }


    renderConsumedMaterials();

    calculateFinalPrice();
}


// ==========================================
// VERBRAUCHTE MATERIALIEN DARSTELLEN
// ==========================================

function renderConsumedMaterials() {

    const container =
        getElement(
            "materialsList"
        );


    if (!container) {
        return;
    }


    if (!materials.length) {

        container.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="material-empty">
                        Noch keine Materialien eingetragen.
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    container.innerHTML =
        materials
            .map(
                (
                    material,
                    index
                ) => {

                    const quantity =
                        number(
                            material.quantity
                        );

                    const price =
                        number(
                            material.price
                        );

                    const total =
                        quantity * price;


                    return `
                        <tr>
                            <td>
                                ${escapeHtml(material.name)}
                            </td>

                            <td>
                                ${quantity}
                            </td>

                            <td>
                                ${formatMoney(price)} $
                            </td>

                            <td>
                                <strong>
                                    ${formatMoney(total)} $
                                </strong>

                                <button
                                    type="button"
                                    class="material-remove"
                                    onclick="removeConsumedMaterial(${index})"
                                >
                                    ✕
                                </button>
                            </td>
                        </tr>
                    `;
                }
            )
            .join("");
}


// ==========================================
// MATERIAL ENTFERNEN
// ==========================================

function removeConsumedMaterial(index) {

    if (
        index < 0 ||
        index >= materials.length
    ) {

        return;
    }


    materials.splice(
        index,
        1
    );


    renderConsumedMaterials();

    calculateFinalPrice();
}


// ==========================================
// HTML SICHER AUSGEBEN
// ==========================================

function escapeHtml(value) {

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


// ==========================================
// MATERIALKOSTEN BERECHNEN
// ==========================================

function calculateMaterialCost() {

function calculateMaterialCost() {

    if (!materials.length) {
        return 0;
    }


    return materials.reduce(
        (sum, material) => {

            const quantity =
                number(
                    material.quantity
                );

            const price =
                number(
                    material.price
                );

            return sum +
                quantity * price;
        },
        0
    );
}


// ==========================================
// ENDPREIS BERECHNEN
// ==========================================

function calculateFinalPrice() {

    if (!currentOrder) {
        return;
    }


    const basePrice =
        number(
            currentOrder.base_price
        );

    const addonPrice =
        number(
            currentOrder.addon_price
        );

    const materialCost =
        calculateMaterialCost();


    const materialSurcharge =
        materialCost *
        0.30;


    const finalPrice =
        basePrice +
        addonPrice +
        materialCost +
        materialSurcharge;


    setText(
        "materialCost",
        formatMoney(
            materialCost
        )
    );


    setText(
        "materialSurcharge",
        formatMoney(
            materialSurcharge
        )
    );


    setText(
        "finalPrice",
        formatMoney(
            finalPrice
        )
    );


    setText(
        "remainingPayment",
        formatMoney(
            finalPrice -
            number(
                currentOrder.deposit
            )
        )
    );
}


// ==========================================
// AUFTRAG ÜBERNEHMEN
// ==========================================

async function acceptOrder() {

    if (!currentOrder) {
        return;
    }


    if (!currentUser) {

        showError(
            "Du musst angemeldet sein."
        );

        return;
    }


    if (
        currentOrder.employee_id &&
        currentOrder.employee_id !== currentUser.id
    ) {

        showError(
            "Dieser Auftrag wurde bereits von einem anderen Mitarbeiter übernommen."
        );

        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("bauauftraege")
            .update({

                employee_id:
                    currentUser.id,

                status:
                    "angenommen",

                accepted_at:
                    new Date().toISOString()
            })
            .eq(
                "id",
                currentOrder.id
            )
            .select()
            .single();


        if (error) {
            throw error;
        }


        currentOrder =
            data;


        showSuccess(
            "Der Auftrag wurde erfolgreich übernommen."
        );


        renderOrder(
            currentOrder
        );


        updateButtons();

    } catch (error) {

        console.error(
            "Fehler beim Übernehmen des Auftrags:",
            error
        );

        showError(
            "Der Auftrag konnte nicht übernommen werden."
        );
    }
}


// ==========================================
// AUFTRAG ABSCHLIESSEN
// ==========================================

async function completeOrder() {

    if (!currentOrder) {
        return;
    }


    if (
        !currentUser ||
        currentOrder.employee_id !== currentUser.id
    ) {

        showError(
            "Nur der zugewiesene Mitarbeiter darf den Auftrag abschließen."
        );

        return;
    }


    const confirmed =
        confirm(
            "Möchtest du diesen Auftrag wirklich abschließen?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("bauauftraege")
            .update({

                status:
                    "abgeschlossen",

                completed_at:
                    new Date().toISOString(),

                material_usage:
                    materials
            })
            .eq(
                "id",
                currentOrder.id
            )
            .select()
            .single();


        if (error) {
            throw error;
        }


        currentOrder =
            data;


        showSuccess(
            "Der Auftrag wurde abgeschlossen."
        );


        renderOrder(
            currentOrder
        );


        updateButtons();

    } catch (error) {

        console.error(
            "Fehler beim Abschließen des Auftrags:",
            error
        );

        showError(
            "Der Auftrag konnte nicht abgeschlossen werden."
        );
    }
}


// ==========================================
// BUTTONS AKTUALISIEREN
// ==========================================

function updateButtons() {

    const acceptButton =
        getElement(
            "acceptOrderButton"
        );

    const completeButton =
        getElement(
            "completeOrderButton"
        );

    const materialButton =
        getElement(
            "addMaterialButton"
        );


    if (!currentOrder) {
        return;
    }


    const isAssignedToMe =
        currentUser &&
        currentOrder.employee_id ===
            currentUser.id;


    const isAssigned =
        Boolean(
            currentOrder.employee_id
        );


    const isCompleted =
        currentOrder.status ===
        "abgeschlossen";


    if (acceptButton) {

        acceptButton.style.display =
            !isAssigned &&
            !isCompleted
                ? "inline-flex"
                : "none";
    }


    if (completeButton) {

        completeButton.style.display =
            isAssignedToMe &&
            !isCompleted
                ? "inline-flex"
                : "none";
    }


    if (materialButton) {

        materialButton.style.display =
            isAssignedToMe &&
            !isCompleted
                ? "inline-flex"
                : "none";
    }
}


// ==========================================
// FEHLER- UND ERFOLGSMELDUNGEN
// ==========================================

function showError(message) {

    const element =
        getElement(
            "errorMessage"
        );


    if (element) {

        element.textContent =
            message;

        element.style.display =
            "block";
    }


    console.error(
        message
    );
}


function showSuccess(message) {

    const element =
        getElement(
            "successMessage"
        );


    if (element) {

        element.textContent =
            message;

        element.style.display =
            "block";
    }


    console.log(
        message
    );
        }

// ==========================================
// AUFTRAG LADEN
// ==========================================

async function loadOrder() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const orderId =
        params.get("id") ||
        params.get("order_id");


    if (!orderId) {

        showError(
            "Keine Auftrags-ID gefunden."
        );

        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("bauauftraege")
            .select("*")
            .eq(
                "id",
                orderId
            )
            .single();


        if (error) {
            throw error;
        }


        if (!data) {

            showError(
                "Auftrag wurde nicht gefunden."
            );

            return;
        }


        currentOrder =
            data;


        if (
            data.material_usage &&
            Array.isArray(
                data.material_usage
            )
        ) {

            materials =
                data.material_usage;
        }


        renderOrder(
            currentOrder
        );

        renderConsumedMaterials();

        calculateFinalPrice();

        updateButtons();


    } catch (error) {

        console.error(
            "Fehler beim Laden des Auftrags:",
            error
        );

        showError(
            "Der Auftrag konnte nicht geladen werden."
        );
    }
}


// ==========================================
// AKTUELLE BENUTZERDATEN LADEN
// ==========================================

async function loadCurrentUser() {

    try {

        const {
            data,
            error
        } = await supabaseClient.auth
            .getUser();


        if (error) {
            throw error;
        }


        currentUser =
            data?.user ||
            null;


    } catch (error) {

        console.error(
            "Fehler beim Laden des Benutzers:",
            error
        );

        currentUser =
            null;
    }
}


// ==========================================
// EVENTLISTENER
// ==========================================

function setupEventListeners() {

    const acceptButton =
        getElement(
            "acceptOrderButton"
        );


    if (acceptButton) {

        acceptButton.addEventListener(
            "click",
            acceptOrder
        );
    }


    const completeButton =
        getElement(
            "completeOrderButton"
        );


    if (completeButton) {

        completeButton.addEventListener(
            "click",
            completeOrder
        );
    }


    const materialButton =
        getElement(
            "addMaterialButton"
        );


    if (materialButton) {

        materialButton.addEventListener(
            "click",
            openMaterialEditor
        );
    }
}


// ==========================================
// INITIALISIERUNG
// ==========================================

async function init() {

    if (
        typeof supabaseClient ===
        "undefined" ||
        !supabaseClient
    ) {

        showError(
            "Supabase ist nicht verfügbar."
        );

        return;
    }


    await loadCurrentUser();

    await loadOrder();

    setupEventListeners();
}


// ==========================================
// START
// ==========================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();
        }
