/* =========================================================
   EHRENMARKT – BAUAUFTRAG DETAILS
   TEIL 1 VON 5
   Grundaufbau, Konfiguration und Hilfsfunktionen
   ========================================================= */

"use strict";

/* =========================================================
   1. GRUNDLEGENDE KONFIGURATION
   ========================================================= */

const EHRENMARKT_CONFIG = {
    // Falls deine Supabase-Tabelle anders heißt, nur diesen Wert ändern.
    orderTable: "bauauftraege",

    // Beschaffungszuschlag bei Materialbereitstellung durch Falkenstein.
    materialSurchargePercent: 15,

    // Standardwährung im Portal.
    currency: "$",

    // URL-Parameter des Auftrags.
    orderIdParameter: "id"
};


/* =========================================================
   2. GLOBALE VARIABLEN
   ========================================================= */

let currentOrder = null;
let currentOrderId = null;
let currentUser = null;

let orderMaterials = [];
let originalMaterials = [];

let isSaving = false;
let isLoading = false;


/* =========================================================
   3. SUPABASE VERBINDUNG
   ========================================================= */

function getSupabaseClient() {
    /*
     * Die Datei ../supabase.js muss vorher geladen werden.
     * Je nach Aufbau wird der Client dort entweder als
     * "supabaseClient" oder als "supabase" bereitgestellt.
     */

    if (window.supabaseClient) {
        return window.supabaseClient;
    }

    if (window.supabase) {
        return window.supabase;
    }

    console.error("Supabase-Client wurde nicht gefunden.");
    return null;
}

const supabaseClient = getSupabaseClient();


/* =========================================================
   4. ALLGEMEINE HILFSFUNKTIONEN
   ========================================================= */

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (!element) {
        return;
    }

    element.textContent = value ?? "";
}

function setValue(id, value) {
    const element = getElement(id);

    if (!element) {
        return;
    }

    element.value = value ?? "";
}

function getValue(id) {
    const element = getElement(id);

    if (!element) {
        return "";
    }

    return element.value ?? "";
}

function setDisabled(id, disabled) {
    const element = getElement(id);

    if (!element) {
        return;
    }

    element.disabled = disabled;
}

function showElement(id) {
    const element = getElement(id);

    if (!element) {
        return;
    }

    element.style.display = "";
}

function hideElement(id) {
    const element = getElement(id);

    if (!element) {
        return;
    }

    element.style.display = "none";
}

function toNumber(value) {
    if (value === null || value === undefined || value === "") {
        return 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    const normalized = String(value)
        .replace(/\$/g, "")
        .replace(/\s/g, "")
        .replace(",", ".");

    const number = Number(normalized);

    return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
    const number = toNumber(value);

    return `${number.toLocaleString("de-DE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })} ${EHRENMARKT_CONFIG.currency}`;
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatDateTime(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   5. FEHLER- UND STATUSMELDUNGEN
   ========================================================= */

function showError(message) {
    const errorElement = getElement("errorMessage");

    if (!errorElement) {
        console.error(message);
        return;
    }

    errorElement.textContent = message;
    errorElement.style.display = "block";
}

function hideError() {
    const errorElement = getElement("errorMessage");

    if (!errorElement) {
        return;
    }

    errorElement.textContent = "";
    errorElement.style.display = "none";
}

function showTemporaryMessage(message, type = "info") {
    let messageElement = getElement("temporaryMessage");

    if (!messageElement) {
        messageElement = document.createElement("div");
        messageElement.id = "temporaryMessage";
        messageElement.style.marginTop = "12px";
        messageElement.style.padding = "10px";
        messageElement.style.borderRadius = "8px";

        const errorElement = getElement("errorMessage");

        if (errorElement && errorElement.parentElement) {
            errorElement.parentElement.appendChild(messageElement);
        } else {
            document.body.prepend(messageElement);
        }
    }

    messageElement.textContent = message;

    if (type === "success") {
        messageElement.style.backgroundColor = "#dcfce7";
        messageElement.style.color = "#166534";
    } else if (type === "error") {
        messageElement.style.backgroundColor = "#fee2e2";
        messageElement.style.color = "#991b1b";
    } else {
        messageElement.style.backgroundColor = "#dbeafe";
        messageElement.style.color = "#1e40af";
    }

    messageElement.style.display = "block";
}


/* =========================================================
   6. URL-PARAMETER AUSLESEN
   ========================================================= */

function getOrderIdFromUrl() {
    const parameters = new URLSearchParams(window.location.search);

    const orderId =
        parameters.get(EHRENMARKT_CONFIG.orderIdParameter) ||
        parameters.get("order_id") ||
        parameters.get("auftrag") ||
        parameters.get("bauauftrag");

    return orderId ? orderId.trim() : null;
}


/* =========================================================
   7. DATEN NORMALISIEREN
   ========================================================= */

function normalizeOrder(order) {
    if (!order || typeof order !== "object") {
        return null;
    }

    return {
        ...order,

        id: order.id ?? order.order_id ?? order.auftrag_id ?? null,

        order_number:
            order.order_number ??
            order.orderNumber ??
            order.nummer ??
            order.auftragsnummer ??
            "",

        status: order.status ?? "offen",

        created_at:
            order.created_at ??
            order.createdAt ??
            order.datum ??
            null,

        customer_name:
            order.customer_name ??
            order.customerName ??
            order.kundenname ??
            "",

        minecraft_name:
            order.minecraft_name ??
            order.minecraftName ??
            order.minecraft_nickname ??
            "",

        contact: order.contact ?? order.kontakt ?? "",

        location: order.location ?? order.ort ?? "",

        priority: order.priority ?? "normal",

        plot_size:
            order.plot_size ??
            order.plotSize ??
            "",

        plot_count:
            order.plot_count ??
            order.plotCount ??
            "",

        building_type:
            order.building_type ??
            order.buildingType ??
            "",

        building_dimensions:
            order.building_dimensions ??
            order.buildingDimensions ??
            "",

        building_floors:
            order.building_floors ??
            order.buildingFloors ??
            "",

        building_style:
            order.building_style ??
            order.buildingStyle ??
            "",

        block_palette:
            order.block_palette ??
            order.blockPalette ??
            "",

        special_blocks:
            order.special_blocks ??
            order.specialBlocks ??
            "",

        interior_level:
            order.interior_level ??
            order.interiorLevel ??
            "",

        exterior_level:
            order.exterior_level ??
            order.exteriorLevel ??
            "",

        lighting_level:
            order.lighting_level ??
            order.lightingLevel ??
            "",

        terraforming_level:
            order.terraforming_level ??
            order.terraformingLevel ??
            "",

        description: order.description ?? "",

        special_requests:
            order.special_requests ??
            order.specialRequests ??
            "",

        reference_images:
            order.reference_images ??
            order.referenceImages ??
            order.references ??
            [],

        base_price:
            toNumber(
                order.base_price ??
                order.basePrice ??
                order.grundpreis
            ),

        addon_price:
            toNumber(
                order.addon_price ??
                order.addonPrice ??
                order.zusatzpreis
            ),

        material_cost:
            toNumber(
                order.material_cost ??
                order.materialCost ??
                order.materialkosten
            ),

        material_surcharge:
            toNumber(
                order.material_surcharge ??
                order.materialSurcharge ??
                order.beschaffungszuschlag
            ),

        final_price:
            toNumber(
                order.final_price ??
                order.finalPrice ??
                order.gesamtpreis
            ),

        deposit:
            toNumber(
                order.deposit ??
                order.anzahlung
            ),

        remaining_payment:
            toNumber(
                order.remaining_payment ??
                order.remainingPayment ??
                order.restzahlung
            ),

        material_provider:
            order.material_provider ??
            order.materialProvider ??
            order.materialbereitstellung ??
            "",

        materials:
            order.materials ??
            order.material_list ??
            order.materialList ??
            [],

        notes: order.notes ?? ""
    };
}


/* =========================================================
   8. MATERIALDATEN NORMALISIEREN
   ========================================================= */

function normalizeMaterial(material) {
    if (!material || typeof material !== "object") {
        return {
            name: "",
            amount: 0,
            unit: "Stück",
            price: 0,
            total: 0
        };
    }

    const amount = toNumber(
        material.amount ??
        material.quantity ??
        material.menge ??
        material.anzahl
    );

    const price = toNumber(
        material.price ??
        material.unit_price ??
        material.unitPrice ??
        material.preis
    );

    const total = toNumber(
        material.total ??
        material.total_price ??
        material.gesamtpreis
    );

    return {
        id: material.id ?? null,

        name:
            material.name ??
            material.material ??
            material.item ??
            "",

        amount,

        unit:
            material.unit ??
            material.einheit ??
            "Stück",

        price,

        total: total || amount * price
    };
}

function normalizeMaterials(materials) {
    if (!Array.isArray(materials)) {
        return [];
    }

    return materials.map(normalizeMaterial);
}


/* =========================================================
   9. MATERIALKOSTEN BERECHNEN
   ========================================================= */

function calculateMaterialCost(materials = orderMaterials) {
    if (!Array.isArray(materials)) {
        return 0;
    }

    return materials.reduce((sum, material) => {
        const normalizedMaterial = normalizeMaterial(material);

        return sum + (
            normalizedMaterial.total ||
            normalizedMaterial.amount * normalizedMaterial.price
        );
    }, 0);
}

function calculateMaterialSurcharge(materialCost, materialProvider) {
    const cost = toNumber(materialCost);

    const provider = String(materialProvider ?? "")
        .trim()
        .toLowerCase();

    const isFalkensteinProvider =
        provider === "falkenstein" ||
        provider === "ehrenmarkt" ||
        provider === "stadt" ||
        provider === "portal";

    if (!isFalkensteinProvider) {
        return 0;
    }

    return cost * (
        EHRENMARKT_CONFIG.materialSurchargePercent / 100
    );
}

function calculateFinalPrice(order) {
    if (!order) {
        return 0;
    }

    const basePrice = toNumber(order.base_price);
    const addonPrice = toNumber(order.addon_price);
    const materialCost = toNumber(order.material_cost);
    const materialSurcharge = toNumber(order.material_surcharge);

    return (
        basePrice +
        addonPrice +
        materialCost +
        materialSurcharge
    );
}


/* =========================================================
   10. DOM BEREITSCHAFT
   ========================================================= */

function onDomReady(callback) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback, {
            once: true
        });
    } else {
        callback();
    }
            }

/* =========================================================
   11. AUFTRAG AUS SUPABASE LADEN
   ========================================================= */

async function loadOrder() {
    if (isLoading) {
        return;
    }

    isLoading = true;
    hideError();

    currentOrderId = getOrderIdFromUrl();

    if (!currentOrderId) {
        showError("Keine Auftrags-ID in der URL gefunden.");
        isLoading = false;
        return;
    }

    if (!supabaseClient) {
        showError("Die Verbindung zur Datenbank konnte nicht hergestellt werden.");
        isLoading = false;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from(EHRENMARKT_CONFIG.orderTable)
            .select("*")
            .eq("id", currentOrderId)
            .maybeSingle();

        if (error) {
            console.error("Fehler beim Laden des Auftrags:", error);
            throw new Error("Der Auftrag konnte nicht geladen werden.");
        }

        if (!data) {
            showError("Der angeforderte Auftrag wurde nicht gefunden.");
            isLoading = false;
            return;
        }

        currentOrder = normalizeOrder(data);

        orderMaterials = normalizeMaterials(
            currentOrder.materials
        );

        originalMaterials = JSON.parse(
            JSON.stringify(orderMaterials)
        );

        fillOrderForm(currentOrder);
        renderMaterialsTable(orderMaterials);
        updatePriceFields(currentOrder);
        updateOrderStatus(currentOrder.status);
        updateProgress(currentOrder.status);

    } catch (error) {
        console.error(error);
        showError(
            error.message ||
            "Beim Laden des Auftrags ist ein unbekannter Fehler aufgetreten."
        );
    } finally {
        isLoading = false;
    }
}


/* =========================================================
   12. AUFTRAGSDATEN IN DAS HTML EINTRAGEN
   ========================================================= */

function fillOrderForm(order) {
    if (!order) {
        return;
    }

    setText("orderNumber", order.order_number || "—");
    setText("orderStatus", order.status || "—");
    setText("orderDate", formatDateTime(order.created_at));

    setText("customerName", order.customer_name || "—");
    setText("minecraftName", order.minecraft_name || "—");
    setText("contact", order.contact || "—");
    setText("location", order.location || "—");
    setText("priority", order.priority || "—");

    setText("plotSize", order.plot_size || "—");
    setText("plotCount", order.plot_count || "—");

    setText("buildingType", order.building_type || "—");
    setText("buildingDimensions", order.building_dimensions || "—");
    setText("buildingFloors", order.building_floors || "—");
    setText("buildingStyle", order.building_style || "—");

    setText("blockPalette", order.block_palette || "—");
    setText("specialBlocks", order.special_blocks || "—");

    setText("interiorLevel", order.interior_level || "—");
    setText("exteriorLevel", order.exterior_level || "—");
    setText("lightingLevel", order.lighting_level || "—");
    setText("terraformingLevel", order.terraforming_level || "—");

    setText("description", order.description || "—");
    setText("specialRequests", order.special_requests || "—");

    setText(
        "materialProvider",
        order.material_provider || "Nicht angegeben"
    );

    setText("notes", order.notes || "—");

    renderReferences(order.reference_images);
}


/* =========================================================
   13. REFERENZBILDER DARSTELLEN
   ========================================================= */

function renderReferences(references) {
    const container = getElement("referenceContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!references || references.length === 0) {
        container.innerHTML = `
            <p class="empty-reference">
                Keine Referenzbilder vorhanden.
            </p>
        `;
        return;
    }

    let referenceList = references;

    if (!Array.isArray(referenceList)) {
        referenceList = [referenceList];
    }

    referenceList.forEach((reference, index) => {
        let url = "";
        let label = `Referenz ${index + 1}`;

        if (typeof reference === "string") {
            url = reference;
        } else if (reference && typeof reference === "object") {
            url =
                reference.url ||
                reference.image_url ||
                reference.imageUrl ||
                reference.src ||
                "";

            label =
                reference.name ||
                reference.title ||
                label;
        }

        if (!url) {
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "reference-item";

        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = label;

        const image = document.createElement("img");
        image.src = url;
        image.alt = label;
        image.loading = "lazy";

        image.addEventListener("error", () => {
            image.style.display = "none";
        });

        wrapper.appendChild(link);
        wrapper.appendChild(image);
        container.appendChild(wrapper);
    });

    if (!container.children.length) {
        container.innerHTML = `
            <p class="empty-reference">
                Die Referenzbilder konnten nicht angezeigt werden.
            </p>
        `;
    }
}


/* =========================================================
   14. PREISFELDER AKTUALISIEREN
   ========================================================= */

function updatePriceFields(order = currentOrder) {
    if (!order) {
        return;
    }

    const materialCost = calculateMaterialCost(orderMaterials);

    const materialSurcharge = calculateMaterialSurcharge(
        materialCost,
        order.material_provider
    );

    const basePrice = toNumber(order.base_price);
    const addonPrice = toNumber(order.addon_price);

    const finalPrice =
        basePrice +
        addonPrice +
        materialCost +
        materialSurcharge;

    const deposit = toNumber(order.deposit);
    const remainingPayment = Math.max(
        finalPrice - deposit,
        0
    );

    setText("basePrice", formatMoney(basePrice));
    setText("addonPrice", formatMoney(addonPrice));
    setText("materialCost", formatMoney(materialCost));
    setText("materialSurcharge", formatMoney(materialSurcharge));
    setText("finalPrice", formatMoney(finalPrice));
    setText("deposit", formatMoney(deposit));
    setText("remainingPayment", formatMoney(remainingPayment));
}


/* =========================================================
   15. AUFTRAGSSTATUS AKTUALISIEREN
   ========================================================= */

function updateOrderStatus(status) {
    const normalizedStatus = String(status || "")
        .trim()
        .toLowerCase();

    const statusElement = getElement("orderStatus");

    if (!statusElement) {
        return;
    }

    statusElement.textContent = getReadableStatus(
        normalizedStatus
    );

    statusElement.dataset.status = normalizedStatus;
}

function getReadableStatus(status) {
    const statusMap = {
        offen: "Offen",
        open: "Offen",

        angenommen: "Angenommen",
        accepted: "Angenommen",

        in_bearbeitung: "In Bearbeitung",
        "in bearbeitung": "In Bearbeitung",
        in_progress: "In Bearbeitung",

        pausiert: "Pausiert",
        paused: "Pausiert",

        abgeschlossen: "Abgeschlossen",
        completed: "Abgeschlossen",

        storniert: "Storniert",
        cancelled: "Storniert",
        canceled: "Storniert"
    };

    return statusMap[status] || status || "Unbekannt";
}


/* =========================================================
   16. FORTSCHRITTSANZEIGE
   ========================================================= */

function updateProgress(status) {
    const normalizedStatus = String(status || "")
        .trim()
        .toLowerCase();

    const steps = document.querySelectorAll(".progress-step");

    if (!steps.length) {
        return;
    }

    let activeStep = 0;

    if (
        normalizedStatus === "angenommen" ||
        normalizedStatus === "accepted"
    ) {
        activeStep = 1;
    }

    if (
        normalizedStatus === "in_bearbeitung" ||
        normalizedStatus === "in bearbeitung" ||
        normalizedStatus === "in_progress"
    ) {
        activeStep = 2;
    }

    if (
        normalizedStatus === "abgeschlossen" ||
        normalizedStatus === "completed"
    ) {
        activeStep = 3;
    }

    steps.forEach((step, index) => {
        step.classList.remove(
            "active",
            "completed",
            "current"
        );

        if (index < activeStep) {
            step.classList.add("completed");
        }

        if (index === activeStep) {
            step.classList.add("active", "current");
        }
    });
}


/* =========================================================
   17. MATERIALTABELLE DARSTELLEN
   ========================================================= */

function renderMaterialsTable(materials = orderMaterials) {
    const tableBody =
        getElement("materialsTableBody") ||
        document.querySelector("#materialsTable tbody") ||
        document.querySelector(".materials-table tbody");

    if (!tableBody) {
        console.warn(
            "Kein Tabellenkörper für die Materialliste gefunden."
        );
        return;
    }

    tableBody.innerHTML = "";

    if (!Array.isArray(materials) || materials.length === 0) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td colspan="6">
                Keine Materialien eingetragen.
            </td>
        `;

        tableBody.appendChild(row);
        return;
    }

    materials.forEach((material, index) => {
        const normalizedMaterial = normalizeMaterial(material);

        const row = document.createElement("tr");

        row.dataset.index = String(index);

        row.innerHTML = `
            <td>
                ${escapeHtml(normalizedMaterial.name)}
            </td>

            <td>
                ${escapeHtml(normalizedMaterial.amount)}
            </td>

            <td>
                ${escapeHtml(normalizedMaterial.unit)}
            </td>

            <td>
                ${formatMoney(normalizedMaterial.price)}
            </td>

            <td>
                ${formatMoney(normalizedMaterial.total)}
            </td>

            <td>
                <button
                    type="button"
                    class="remove-material-button"
                    data-index="${index}">
                    Entfernen
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    tableBody
        .querySelectorAll(".remove-material-button")
        .forEach(button => {
            button.addEventListener("click", () => {
                const index = Number(button.dataset.index);

                if (!Number.isInteger(index)) {
                    return;
                }

                removeMaterial(index);
            });
        });
}


/* =========================================================
   18. MATERIAL ENTFERNEN
   ========================================================= */

function removeMaterial(index) {
    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= orderMaterials.length
    ) {
        return;
    }

    orderMaterials.splice(index, 1);

    renderMaterialsTable(orderMaterials);
    updatePriceFields(currentOrder);
}

/* =========================================================
   19. MATERIAL HINZUFÜGEN
   ========================================================= */

function addMaterial() {
    const material = {
        name: "",
        amount: 1,
        unit: "Stück",
        price: 0,
        total: 0
    };

    orderMaterials.push(material);

    renderMaterialsTable(orderMaterials);
    updatePriceFields(currentOrder);
}


/* =========================================================
   20. MATERIALDATEN AUS DER TABELLE AUSLESEN
   ========================================================= */

function readMaterialsFromTable() {
    const tableBody =
        getElement("materialsTableBody") ||
        document.querySelector("#materialsTable tbody") ||
        document.querySelector(".materials-table tbody");

    if (!tableBody) {
        return orderMaterials;
    }

    const rows = tableBody.querySelectorAll("tr");
    const materials = [];

    rows.forEach(row => {
        const nameInput = row.querySelector(
            'input[data-field="name"], .material-name'
        );

        const amountInput = row.querySelector(
            'input[data-field="amount"], .material-amount'
        );

        const unitInput = row.querySelector(
            'input[data-field="unit"], .material-unit'
        );

        const priceInput = row.querySelector(
            'input[data-field="price"], .material-price'
        );

        /*
         * Wenn die Tabelle nur aus normalem Text besteht,
         * werden die bereits gespeicherten Daten beibehalten.
         */
        if (
            !nameInput &&
            !amountInput &&
            !unitInput &&
            !priceInput
        ) {
            return;
        }

        const name = nameInput
            ? nameInput.value.trim()
            : "";

        const amount = amountInput
            ? toNumber(amountInput.value)
            : 0;

        const unit = unitInput
            ? unitInput.value.trim() || "Stück"
            : "Stück";

        const price = priceInput
            ? toNumber(priceInput.value)
            : 0;

        materials.push({
            name,
            amount,
            unit,
            price,
            total: amount * price
        });
    });

    return materials;
}


/* =========================================================
   21. MATERIALTABELLE IN BEARBEITBARE FORM UMWANDELN
   ========================================================= */

function renderEditableMaterialsTable(materials = orderMaterials) {
    const tableBody =
        getElement("materialsTableBody") ||
        document.querySelector("#materialsTable tbody") ||
        document.querySelector(".materials-table tbody");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!Array.isArray(materials) || materials.length === 0) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td colspan="6">
                Noch keine Materialien vorhanden.
            </td>
        `;

        tableBody.appendChild(row);
        return;
    }

    materials.forEach((material, index) => {
        const normalizedMaterial = normalizeMaterial(material);

        const row = document.createElement("tr");

        row.dataset.index = String(index);

        row.innerHTML = `
            <td>
                <input
                    type="text"
                    class="material-name"
                    data-field="name"
                    value="${escapeHtml(normalizedMaterial.name)}"
                    placeholder="Material">
            </td>

            <td>
                <input
                    type="number"
                    class="material-amount"
                    data-field="amount"
                    min="0"
                    step="1"
                    value="${normalizedMaterial.amount}">
            </td>

            <td>
                <input
                    type="text"
                    class="material-unit"
                    data-field="unit"
                    value="${escapeHtml(normalizedMaterial.unit)}"
                    placeholder="Stück">
            </td>

            <td>
                <input
                    type="number"
                    class="material-price"
                    data-field="price"
                    min="0"
                    step="0.01"
                    value="${normalizedMaterial.price}">
            </td>

            <td class="material-total">
                ${formatMoney(normalizedMaterial.total)}
            </td>

            <td>
                <button
                    type="button"
                    class="remove-material-button"
                    data-index="${index}">
                    Entfernen
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    tableBody
        .querySelectorAll("input")
        .forEach(input => {
            input.addEventListener("input", () => {
                updateEditableMaterialRow(input.closest("tr"));
                updatePriceFields(currentOrder);
            });
        });

    tableBody
        .querySelectorAll(".remove-material-button")
        .forEach(button => {
            button.addEventListener("click", () => {
                const index = Number(button.dataset.index);

                if (!Number.isInteger(index)) {
                    return;
                }

                removeMaterial(index);
                renderEditableMaterialsTable(orderMaterials);
            });
        });
}


/* =========================================================
   22. EINE MATERIALZEILE AKTUALISIEREN
   ========================================================= */

function updateEditableMaterialRow(row) {
    if (!row) {
        return;
    }

    const amountInput = row.querySelector(
        'input[data-field="amount"]'
    );

    const priceInput = row.querySelector(
        'input[data-field="price"]'
    );

    const totalElement = row.querySelector(".material-total");

    const amount = amountInput
        ? toNumber(amountInput.value)
        : 0;

    const price = priceInput
        ? toNumber(priceInput.value)
        : 0;

    const total = amount * price;

    if (totalElement) {
        totalElement.textContent = formatMoney(total);
    }

    const index = Number(row.dataset.index);

    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= orderMaterials.length
    ) {
        return;
    }

    const nameInput = row.querySelector(
        'input[data-field="name"]'
    );

    const unitInput = row.querySelector(
        'input[data-field="unit"]'
    );

    orderMaterials[index] = {
        ...orderMaterials[index],

        name: nameInput
            ? nameInput.value.trim()
            : "",

        amount,

        unit: unitInput
            ? unitInput.value.trim() || "Stück"
            : "Stück",

        price,

        total
    };
}


/* =========================================================
   23. MATERIALBEREITSTELLUNG ERMITTELN
   ========================================================= */

function getMaterialProviderValue() {
    const element = getElement("materialProvider");

    if (!element) {
        return currentOrder?.material_provider || "";
    }

    /*
     * Das Feld kann entweder ein Select/Input sein
     * oder ein normales Text-Element.
     */
    if ("value" in element && element.value !== "") {
        return element.value.trim();
    }

    return element.textContent.trim();
}

function isMaterialProvidedByFalkenstein() {
    const provider = getMaterialProviderValue()
        .toLowerCase()
        .trim();

    return (
        provider === "falkenstein" ||
        provider === "ehrenmarkt" ||
        provider === "stadt" ||
        provider === "portal"
    );
}


/* =========================================================
   24. MATERIALDATEN FÜR SUPABASE VORBEREITEN
   ========================================================= */

function prepareMaterialsForDatabase() {
    return orderMaterials.map(material => {
        const normalizedMaterial = normalizeMaterial(material);

        return {
            name: normalizedMaterial.name,
            amount: normalizedMaterial.amount,
            unit: normalizedMaterial.unit,
            price: normalizedMaterial.price,
            total: normalizedMaterial.total
        };
    });
}


/* =========================================================
   25. MATERIALIEN IN SUPABASE SPEICHERN
   ========================================================= */

async function saveMaterials() {
    if (isSaving) {
        return;
    }

    if (!currentOrderId) {
        showError("Keine Auftrags-ID vorhanden.");
        return;
    }

    if (!supabaseClient) {
        showError("Keine Datenbankverbindung vorhanden.");
        return;
    }

    isSaving = true;
    hideError();

    const saveButton = getElement("saveMaterialsButton");

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Speichere...";
    }

    try {
        /*
         * Falls die Tabelle bearbeitbare Eingabefelder enthält,
         * werden die aktuellen Werte zuerst übernommen.
         */
        const tableBody =
            getElement("materialsTableBody") ||
            document.querySelector("#materialsTable tbody") ||
            document.querySelector(".materials-table tbody");

        if (
            tableBody &&
            tableBody.querySelector(
                'input[data-field="name"]'
            )
        ) {
            orderMaterials = readMaterialsFromTable();
        }

        const preparedMaterials =
            prepareMaterialsForDatabase();

        const materialCost =
            calculateMaterialCost(preparedMaterials);

        const materialProvider =
            getMaterialProviderValue();

        const materialSurcharge =
            calculateMaterialSurcharge(
                materialCost,
                materialProvider
            );

        const basePrice =
            toNumber(currentOrder?.base_price);

        const addonPrice =
            toNumber(currentOrder?.addon_price);

        const finalPrice =
            basePrice +
            addonPrice +
            materialCost +
            materialSurcharge;

        const deposit =
            toNumber(currentOrder?.deposit);

        const remainingPayment =
            Math.max(finalPrice - deposit, 0);

        const updateData = {
            materials: preparedMaterials,
            material_cost: materialCost,
            material_surcharge: materialSurcharge,
            final_price: finalPrice,
            remaining_payment: remainingPayment
        };

        const { error } = await supabaseClient
            .from(EHRENMARKT_CONFIG.orderTable)
            .update(updateData)
            .eq("id", currentOrderId);

        if (error) {
            console.error(
                "Fehler beim Speichern der Materialien:",
                error
            );

            throw new Error(
                "Die Materialien konnten nicht gespeichert werden."
            );
        }

        currentOrder.materials = preparedMaterials;
        currentOrder.material_cost = materialCost;
        currentOrder.material_surcharge = materialSurcharge;
        currentOrder.final_price = finalPrice;
        currentOrder.remaining_payment = remainingPayment;

        originalMaterials = JSON.parse(
            JSON.stringify(preparedMaterials)
        );

        orderMaterials = normalizeMaterials(
            preparedMaterials
        );

        renderMaterialsTable(orderMaterials);
        updatePriceFields(currentOrder);

        showTemporaryMessage(
            "Materialien und Preise wurden erfolgreich gespeichert.",
            "success"
        );

    } catch (error) {
        console.error(error);

        showError(
            error.message ||
            "Beim Speichern ist ein Fehler aufgetreten."
        );
    } finally {
        isSaving = false;

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Materialien speichern";
        }
    }
}


/* =========================================================
   26. MATERIALÄNDERUNGEN ZURÜCKSETZEN
   ========================================================= */

function resetMaterials() {
    orderMaterials = JSON.parse(
        JSON.stringify(originalMaterials)
    );

    renderMaterialsTable(orderMaterials);
    updatePriceFields(currentOrder);

    showTemporaryMessage(
        "Die Materialänderungen wurden zurückgesetzt.",
        "info"
    );
            }

/* =========================================================
   27. AUFTRAGSSTATUS IN SUPABASE SPEICHERN
   ========================================================= */

async function updateOrderStatusInDatabase(
    newStatus,
    additionalData = {}
) {
    if (!currentOrderId) {
        throw new Error("Keine Auftrags-ID vorhanden.");
    }

    if (!supabaseClient) {
        throw new Error("Keine Datenbankverbindung vorhanden.");
    }

    const updateData = {
        status: newStatus,
        ...additionalData
    };

    const { data, error } = await supabaseClient
        .from(EHRENMARKT_CONFIG.orderTable)
        .update(updateData)
        .eq("id", currentOrderId)
        .select()
        .maybeSingle();

    if (error) {
        console.error(
            "Fehler beim Aktualisieren des Auftragsstatus:",
            error
        );

        throw new Error(
            "Der Auftragsstatus konnte nicht gespeichert werden."
        );
    }

    if (data) {
        currentOrder = normalizeOrder(data);
    } else if (currentOrder) {
        currentOrder.status = newStatus;
    }

    updateOrderStatus(newStatus);
    updateProgress(newStatus);
}


/* =========================================================
   28. AUFTRAG ANNEHMEN
   ========================================================= */

async function acceptOrder() {
    if (isSaving) {
        return;
    }

    if (!currentOrderId) {
        showError("Keine Auftrags-ID vorhanden.");
        return;
    }

    const confirmed = window.confirm(
        "Möchtest du diesen Bauauftrag wirklich annehmen?"
    );

    if (!confirmed) {
        return;
    }

    isSaving = true;
    hideError();

    const button = getElement("acceptOrderButton");

    if (button) {
        button.disabled = true;
        button.textContent = "Wird angenommen...";
    }

    try {
        const additionalData = {
            accepted_at: new Date().toISOString()
        };

        await updateOrderStatusInDatabase(
            "angenommen",
            additionalData
        );

        showTemporaryMessage(
            "Der Bauauftrag wurde erfolgreich angenommen.",
            "success"
        );

        if (button) {
            button.textContent = "Auftrag angenommen";
        }

    } catch (error) {
        console.error(error);

        showError(
            error.message ||
            "Der Auftrag konnte nicht angenommen werden."
        );

        if (button) {
            button.disabled = false;
            button.textContent = "Auftrag annehmen";
        }
    } finally {
        isSaving = false;
    }
}


/* =========================================================
   29. AUFTRAG IN BEARBEITUNG SETZEN
   ========================================================= */

async function startOrderProcessing() {
    if (isSaving) {
        return;
    }

    if (!currentOrderId) {
        showError("Keine Auftrags-ID vorhanden.");
        return;
    }

    isSaving = true;
    hideError();

    try {
        await updateOrderStatusInDatabase(
            "in_bearbeitung",
            {
                started_at: new Date().toISOString()
            }
        );

        showTemporaryMessage(
            "Der Auftrag befindet sich jetzt in Bearbeitung.",
            "success"
        );

    } catch (error) {
        console.error(error);

        showError(
            error.message ||
            "Der Auftrag konnte nicht gestartet werden."
        );
    } finally {
        isSaving = false;
    }
}


/* =========================================================
   30. AUFTRAG ABSCHLIESSEN
   ========================================================= */

async function completeOrder() {
    if (isSaving) {
        return;
    }

    if (!currentOrderId) {
        showError("Keine Auftrags-ID vorhanden.");
        return;
    }

    const confirmed = window.confirm(
        "Möchtest du diesen Bauauftrag wirklich abschließen?"
    );

    if (!confirmed) {
        return;
    }

    isSaving = true;
    hideError();

    try {
        await updateOrderStatusInDatabase(
            "abgeschlossen",
            {
                completed_at: new Date().toISOString()
            }
        );

        showTemporaryMessage(
            "Der Bauauftrag wurde erfolgreich abgeschlossen.",
            "success"
        );

    } catch (error) {
        console.error(error);

        showError(
            error.message ||
            "Der Auftrag konnte nicht abgeschlossen werden."
        );
    } finally {
        isSaving = false;
    }
}


/* =========================================================
   31. AUFTRAG STORNIEREN
   ========================================================= */

async function cancelOrder() {
    if (isSaving) {
        return;
    }

    if (!currentOrderId) {
        showError("Keine Auftrags-ID vorhanden.");
        return;
    }

    const confirmed = window.confirm(
        "Möchtest du diesen Bauauftrag wirklich stornieren?"
    );

    if (!confirmed) {
        return;
    }

    isSaving = true;
    hideError();

    try {
        await updateOrderStatusInDatabase(
            "storniert",
            {
                cancelled_at: new Date().toISOString()
            }
        );

        showTemporaryMessage(
            "Der Bauauftrag wurde storniert.",
            "success"
        );

    } catch (error) {
        console.error(error);

        showError(
            error.message ||
            "Der Auftrag konnte nicht storniert werden."
        );
    } finally {
        isSaving = false;
    }
}


/* =========================================================
   32. BUTTONS UND AKTIONEN VERKNÜPFEN
   ========================================================= */

function setupEventListeners() {
    const acceptButton = getElement("acceptOrderButton");

    if (acceptButton) {
        acceptButton.addEventListener("click", acceptOrder);
    }

    const addMaterialButton = getElement("addMaterialButton");

    if (addMaterialButton) {
        addMaterialButton.addEventListener("click", () => {
            addMaterial();
            renderEditableMaterialsTable(orderMaterials);
        });
    }

    const saveMaterialsButton =
        getElement("saveMaterialsButton");

    if (saveMaterialsButton) {
        saveMaterialsButton.addEventListener(
            "click",
            saveMaterials
        );
    }

    /*
     * Diese Buttons sind im aktuellen HTML möglicherweise
     * nicht vorhanden. Die Verknüpfung wird deshalb nur
     * hergestellt, wenn sie tatsächlich existieren.
     */

    const startButton = getElement("startOrderButton");

    if (startButton) {
        startButton.addEventListener(
            "click",
            startOrderProcessing
        );
    }

    const completeButton = getElement("completeOrderButton");

    if (completeButton) {
        completeButton.addEventListener(
            "click",
            completeOrder
        );
    }

    const cancelButton = getElement("cancelOrderButton");

    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            cancelOrder
        );
    }

    const resetButton = getElement("resetMaterialsButton");

    if (resetButton) {
        resetButton.addEventListener(
            "click",
            resetMaterials
        );
    }
}


/* =========================================================
   33. BUTTONS JE NACH STATUS AKTUALISIEREN
   ========================================================= */

function updateActionButtons(status) {
    const normalizedStatus = String(status || "")
        .trim()
        .toLowerCase();

    const acceptButton = getElement("acceptOrderButton");
    const startButton = getElement("startOrderButton");
    const completeButton = getElement("completeOrderButton");
    const cancelButton = getElement("cancelOrderButton");

    if (acceptButton) {
        acceptButton.disabled = !(
            normalizedStatus === "offen" ||
            normalizedStatus === "open"
        );
    }

    if (startButton) {
        startButton.disabled = !(
            normalizedStatus === "angenommen" ||
            normalizedStatus === "accepted"
        );
    }

    if (completeButton) {
        completeButton.disabled = !(
            normalizedStatus === "in_bearbeitung" ||
            normalizedStatus === "in bearbeitung" ||
            normalizedStatus === "in_progress"
        );
    }

    if (cancelButton) {
        cancelButton.disabled = (
            normalizedStatus === "abgeschlossen" ||
            normalizedStatus === "completed" ||
            normalizedStatus === "storniert" ||
            normalizedStatus === "cancelled" ||
            normalizedStatus === "canceled"
        );
    }
}


/* =========================================================
   34. STATUSFUNKTION ERWEITERN
   ========================================================= */

const originalUpdateOrderStatus = updateOrderStatus;

updateOrderStatus = function(status) {
    originalUpdateOrderStatus(status);
    updateActionButtons(status);
};

/* =========================================================
   35. MATERIALTABELLE INITIAL DARSTELLEN
   ========================================================= */

function initializeMaterialsView() {
    if (!currentOrder) {
        return;
    }

    orderMaterials = normalizeMaterials(
        currentOrder.materials
    );

    /*
     * Die normale Ansicht wird zuerst angezeigt.
     * Bearbeitbare Felder werden nur durch die
     * Schaltfläche "Material hinzufügen" aktiviert.
     */
    renderMaterialsTable(orderMaterials);
}


/* =========================================================
   36. BENUTZER AKTUELL AUSLESEN
   ========================================================= */

async function loadCurrentUser() {
    if (!supabaseClient) {
        return null;
    }

    try {
        const {
            data,
            error
        } = await supabaseClient.auth.getUser();

        if (error) {
            console.warn(
                "Der angemeldete Benutzer konnte nicht ermittelt werden:",
                error
            );

            return null;
        }

        currentUser = data?.user || null;

        return currentUser;

    } catch (error) {
        console.warn(
            "Fehler beim Auslesen des Benutzers:",
            error
        );

        return null;
    }
}


/* =========================================================
   37. BERECHTIGUNG PRÜFEN
   ========================================================= */

function hasUserAccess() {
    /*
     * Wenn kein Benutzer geladen werden konnte,
     * wird der Zugriff hier nicht automatisch blockiert.
     * Die eigentliche Zugriffskontrolle muss zusätzlich
     * über die Supabase-RLS-Regeln abgesichert sein.
     */
    return true;
}


/* =========================================================
   38. GESAMTEN AUFTRAG INITIALISIEREN
   ========================================================= */

async function initializeOrderPage() {
    hideError();

    if (!hasUserAccess()) {
        showError(
            "Du hast keine Berechtigung, diesen Auftrag aufzurufen."
        );

        return;
    }

    await loadCurrentUser();
    await loadOrder();

    if (currentOrder) {
        initializeMaterialsView();
        updateActionButtons(currentOrder.status);
    }
}


/* =========================================================
   39. FEHLER BEI UNBEKANNTEN AUSNAHMEN ABFANGEN
   ========================================================= */

function setupGlobalErrorHandling() {
    window.addEventListener("error", event => {
        console.error(
            "Unbehandelter JavaScript-Fehler:",
            event.error || event.message
        );
    });

    window.addEventListener(
        "unhandledrejection",
        event => {
            console.error(
                "Unbehandelter Promise-Fehler:",
                event.reason
            );
        }
    );
}


/* =========================================================
   40. SCRIPT STARTEN
   ========================================================= */

onDomReady(() => {
    setupGlobalErrorHandling();
    setupEventListeners();
    initializeOrderPage();
});
