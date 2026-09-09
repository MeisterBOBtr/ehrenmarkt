// ======================================================
// EHRENMARKT – BAUAUFTRAG DETAILS
// Teil 1 von 4
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

    const element =
        getElement(id);

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

    const result =
        Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}


function formatMoney(value) {

    return number(value).toLocaleString(
        "de-DE"
    ) + " $";
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

    return date.toLocaleString(
        "de-DE",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function showError(message) {

    const element =
        getElement("errorMessage");

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.style.display =
        "block";
}


function hideError() {

    const element =
        getElement("errorMessage");

    if (!element) {
        return;
    }

    element.textContent =
        "";

    element.style.display =
        "none";
}


// ======================================================
// URL-PARAMETER
// ======================================================

function getOrderParameters() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return {
        id: params.get("id"),
        orderNumber:
            params.get("order")
    };
}


// ======================================================
// BENUTZER LADEN
// ======================================================

async function loadUser() {

    const {
        data,
        error
    } =
        await supabaseClient
            .auth
            .getUser();


    if (
        error ||
        !data ||
        !data.user
    ) {

        window.location.href =
            "login.html";

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


    currentEmployee =
        data;

    return true;
}


// ======================================================
// BAUAUFTRAG LADEN
// ======================================================

async function loadOrder() {

    const params =
        getOrderParameters();


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


    let query =
        supabaseClient
            .from("build_orders")
            .select("*");


    if (params.id) {

        query =
            query.eq(
                "id",
                params.id
            );

    } else {

        query =
            query.eq(
                "order_number",
                params.orderNumber
            );
    }


    const {
        data,
        error
    } =
        await query.maybeSingle();


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


    currentOrder =
        data;


    renderOrder(
        currentOrder
    );


    return true;
}


// ======================================================
// BAUAUFTRAG ANZEIGEN
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
        const { data, error } = await supabase
            .from("items")
            .select("id, name, price, active")
            .eq("active", true)
            .order("name", { ascending: true });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error("Fehler beim Laden der Materialien:", error);
        return [];
    }
}


// ==========================================
// MATERIAL-EINGABE ANZEIGEN
// ==========================================

async function openMaterialEditor() {

    if (!currentOrder) return;

    // Nur der Bearbeiter darf Materialien eintragen
    if (
        currentOrder.employee_id &&
        currentOrder.employee_id !== currentUser.id
    ) {
        showError("Nur der zugewiesene Bearbeiter darf Materialien eintragen.");
        return;
    }

    if (!currentOrder.employee_id) {
        showError("Bitte übernimm den Auftrag zuerst.");
        return;
    }

    const availableMaterials = await loadAvailableMaterials();

    if (!availableMaterials.length) {
        showError("Es wurden keine aktiven Materialien gefunden.");
        return;
    }

    const materialNames = availableMaterials
        .map(material => material.name)
        .join("\n");

    const materialName = prompt(
        "Welches Material wurde verbraucht?\n\n" +
        materialNames
    );

    if (!materialName) return;

    const selectedMaterial = availableMaterials.find(
        material =>
            material.name.toLowerCase() === materialName.toLowerCase()
    );

    if (!selectedMaterial) {
        showError("Material wurde nicht gefunden.");
        return;
    }

    const quantityInput = prompt(
        `Wie viele ${selectedMaterial.name} wurden verbraucht?`
    );

    if (!quantityInput) return;

    const quantity = parseInt(quantityInput, 10);

    if (!Number.isInteger(quantity) || quantity <= 0) {
        showError("Bitte eine gültige Menge eingeben.");
        return;
    }

    const existingMaterial = materials.find(
        material => Number(material.material_id) === Number(selectedMaterial.id)
    );

    if (existingMaterial) {
        existingMaterial.quantity += quantity;
    } else {
        materials.push({
            material_id: selectedMaterial.id,
            name: selectedMaterial.name,
            price: number(selectedMaterial.price),
            quantity: quantity
        });
    }

    renderConsumedMaterials();
    calculateFinalPrice();
}


// ==========================================
// VERBRAUCHTE MATERIALIEN DARSTELLEN
// ==========================================

function renderConsumedMaterials() {

    const container = getElement("materialsList");

    if (!container) return;

    if (!materials.length) {
        container.innerHTML = `
            <div class="empty-state">
                Noch keine Materialien eingetragen.
            </div>
        `;
        return;
    }

    container.innerHTML = materials.map((material, index) => {

        const quantity = number(material.quantity);
        const price = number(material.price);
        const total = quantity * price;

        return `
            <div class="material-row">

                <div class="material-info">
                    <strong>${escapeHtml(material.name)}</strong>

                    <span>
                        ${quantity} × ${formatMoney(price)} $
                    </span>
                </div>

                <div class="material-total">
                    ${formatMoney(total)} $
                </div>

                <button
                    type="button"
                    class="material-remove"
                    onclick="removeConsumedMaterial(${index})"
                >
                    ✕
                </button>

            </div>
        `;
    }).join("");
}


// ==========================================
// MATERIAL ENTFERNEN
// ==========================================

function removeConsumedMaterial(index) {

    if (index < 0 || index >= materials.length) return;

    materials.splice(index, 1);

    renderConsumedMaterials();
    calculateFinalPrice();
}


// ==========================================
// HTML SICHER AUSGEBEN
// ==========================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// MATERIALKOSTEN BERECHNEN
// ==========================================

function calculateMaterialCost() {

    return materials.reduce((sum, material) => {

        const quantity = number(material.quantity);
        const price = number(material.price);

        return sum + (quantity * price);

    }, 0);
}


// ==========================================
// BESCHAFFUNGSZUSCHLAG
// ==========================================

function calculateMaterialSurcharge(materialCost) {

    if (!currentOrder) return 0;

    const provider = String(
        currentOrder.material_provider ??
        currentOrder.materialProvider ??
        ""
    ).toLowerCase();

    // Nur wenn Falkenstein die Materialien beschafft
    const isFalkenstein =
        provider.includes("falkenstein") ||
        provider.includes("stadt");

    if (!isFalkenstein) {
        return 0;
    }

    return materialCost * 0.15;
}


// ==========================================
// GESAMTPREIS NEU BERECHNEN
// ==========================================

function calculateFinalPrice() {

    if (!currentOrder) return;

    const basePrice = number(
        currentOrder.base_price ??
        currentOrder.price ??
        0
    );

    const addonPrice = number(
        currentOrder.addon_price ??
        currentOrder.addons_price ??
        0
    );

    const materialCost = calculateMaterialCost();

    const materialSurcharge =
        calculateMaterialSurcharge(materialCost);

    const finalPrice =
        basePrice +
        addonPrice +
        materialCost +
        materialSurcharge;

    const deposit = finalPrice * 0.25;

    const remaining = finalPrice - deposit;

    setText(
        "materialCost",
        `${formatMoney(materialCost)} $`
    );

    setText(
        "materialSurcharge",
        `${formatMoney(materialSurcharge)} $`
    );

    setText(
        "finalPrice",
        `${formatMoney(finalPrice)} $`
    );

    setText(
        "deposit",
        `${formatMoney(deposit)} $`
    );

    setText(
        "remainingPayment",
        `${formatMoney(remaining)} $`
    );
                              }

// ==========================================
// TEIL 3 VON 4
// Materialien speichern & Auftrag aktualisieren
// ==========================================


// ==========================================
// MATERIALIEN IN SUPABASE SPEICHERN
// ==========================================

async function saveConsumedMaterials() {

    if (!currentOrder) {
        throw new Error("Kein Bauauftrag geladen.");
    }

    if (!currentUser) {
        throw new Error("Nicht angemeldet.");
    }

    // Nur der Bearbeiter darf Materialien speichern
    if (currentOrder.employee_id !== currentUser.id) {
        throw new Error(
            "Nur der zugewiesene Bearbeiter darf Materialien eintragen."
        );
    }

    // Alte Materialeinträge für diesen Auftrag löschen
    const { error: deleteError } = await supabase
        .from("build_order_materials")
        .delete()
        .eq("order_id", currentOrder.id);

    if (deleteError) {
        throw deleteError;
    }

    // Wenn keine Materialien vorhanden sind,
    // bleibt die Tabelle für diesen Auftrag leer.
    if (!materials.length) {
        return;
    }

    const rows = materials.map(material => ({
        order_id: currentOrder.id,
        material_id: material.material_id,
        quantity: material.quantity,
        unit_price: material.price
    }));

    const { error: insertError } = await supabase
        .from("build_order_materials")
        .insert(rows);

    if (insertError) {
        throw insertError;
    }
}


// ==========================================
// AUFTRAGSPREIS IN SUPABASE AKTUALISIEREN
// ==========================================

async function updateBuildOrderPrice() {

    if (!currentOrder) {
        throw new Error("Kein Bauauftrag geladen.");
    }

    if (!currentUser) {
        throw new Error("Nicht angemeldet.");
    }

    if (currentOrder.employee_id !== currentUser.id) {
        throw new Error(
            "Nur der zugewiesene Bearbeiter darf den Preis aktualisieren."
        );
    }

    const basePrice = number(
        currentOrder.base_price ??
        currentOrder.price ??
        0
    );

    const addonPrice = number(
        currentOrder.addon_price ??
        currentOrder.addons_price ??
        0
    );

    const materialCost = calculateMaterialCost();

    const materialSurcharge =
        calculateMaterialSurcharge(materialCost);

    const finalPrice =
        basePrice +
        addonPrice +
        materialCost +
        materialSurcharge;

    const deposit = finalPrice * 0.25;

    const remaining = finalPrice - deposit;

    const { data, error } = await supabase
        .from("build_orders")
        .update({
            material_cost: materialCost,
            material_procurement: materialCost,
            material_surcharge_percent:
                materialSurcharge > 0 ? 15 : 0,
            material_surcharge: materialSurcharge,
            final_price: finalPrice,
            deposit: deposit,
            remaining_payment: remaining,
            updated_at: new Date().toISOString()
        })
        .eq("id", currentOrder.id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    currentOrder = {
        ...currentOrder,
        ...data
    };

    return data;
}


// ==========================================
// KOMPLETT SPEICHERN
// ==========================================

async function saveMaterialsAndPrice() {

    hideError();

    try {

        if (!currentOrder) {
            throw new Error("Kein Bauauftrag geladen.");
        }

        if (!currentUser) {
            throw new Error("Nicht angemeldet.");
        }

        if (currentOrder.employee_id !== currentUser.id) {
            throw new Error(
                "Nur der Bearbeiter darf den Materialverbrauch ändern."
            );
        }

        await saveConsumedMaterials();

        await updateBuildOrderPrice();

        renderConsumedMaterials();

        calculateFinalPrice();

        alert("Materialverbrauch und Auftragspreis wurden gespeichert.");

    } catch (error) {

        console.error(
            "Fehler beim Speichern:",
            error
        );

        showError(
            error.message ||
            "Die Änderungen konnten nicht gespeichert werden."
        );
    }
}


// ==========================================
// MATERIAL-BUTTON EINRICHTEN
// ==========================================

function setupMaterialButtons() {

    const addButton =
        getElement("addMaterialButton");

    const saveButton =
        getElement("saveMaterialsButton");


    if (addButton) {

        addButton.addEventListener(
            "click",
            openMaterialEditor
        );
    }


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveMaterialsAndPrice
        );
    }
}


// ==========================================
// AUFTRAG ÜBERNEHMEN
// ==========================================

async function acceptBuildOrder() {

    hideError();

    if (!currentOrder) {
        showError("Kein Bauauftrag geladen.");
        return;
    }

    if (!currentUser) {
        showError("Nicht angemeldet.");
        return;
    }

    if (!currentEmployee) {
        showError("Kein Mitarbeiterprofil gefunden.");
        return;
    }

    if (!currentEmployee.is_available) {
        showError(
            "Du bist aktuell nicht verfügbar und kannst keinen Auftrag übernehmen."
        );
        return;
    }

    if (
        currentOrder.status &&
        currentOrder.status !== "Offen"
    ) {
        showError(
            "Dieser Auftrag wurde bereits übernommen."
        );
        return;
    }

    try {

        const { data, error } = await supabase
            .from("build_orders")
            .update({
                employee_id: currentUser.id,
                status: "In Bearbeitung",
                updated_at: new Date().toISOString()
            })
            .eq("id", currentOrder.id)
            .eq("status", "Offen")
            .select()
            .single();

        if (error) {
            throw error;
        }

        currentOrder = {
            ...currentOrder,
            ...data
        };

        setText(
            "orderStatus",
            "In Bearbeitung"
        );

        const button =
            getElement("acceptOrderButton");

        if (button) {
            button.disabled = true;
            button.textContent = "✓ Auftrag übernommen";
        }

        enableMaterialEditing();

        alert("Bauauftrag wurde übernommen.");

    } catch (error) {

        console.error(
            "Fehler beim Übernehmen:",
            error
        );

        showError(
            error.message ||
            "Der Auftrag konnte nicht übernommen werden."
        );
    }
}


// ==========================================
// MATERIAL-BEARBEITUNG AKTIVIEREN
// ==========================================

function enableMaterialEditing() {

    const addButton =
        getElement("addMaterialButton");

    const saveButton =
        getElement("saveMaterialsButton");

    if (addButton) {
        addButton.disabled = false;
        addButton.style.display = "block";
    }

    if (saveButton) {
        saveButton.disabled = false;
        saveButton.style.display = "block";
    }
}


// ==========================================
// MATERIAL-BEARBEITUNG DEAKTIVIEREN
// ==========================================

function disableMaterialEditing() {

    const addButton =
        getElement("addMaterialButton");

    const saveButton =
        getElement("saveMaterialsButton");

    if (addButton) {
        addButton.disabled = true;
    }

    if (saveButton) {
        saveButton.disabled = true;
    }
}

// ==========================================
// TEIL 4 VON 4
// Gespeicherte Materialien laden & Start
// ==========================================


// ==========================================
// GESPEICHERTE MATERIALIEN LADEN
// ==========================================

async function loadConsumedMaterials() {

    if (!currentOrder) return;

    try {

        const { data, error } = await supabase
            .from("build_order_materials")
            .select(`
                material_id,
                quantity,
                unit_price,
                items (
                    id,
                    name,
                    price
                )
            `)
            .eq("order_id", currentOrder.id);

        if (error) {
            console.error(
                "Fehler beim Laden der Materialien:",
                error
            );
            return;
        }

        materials = (data || []).map(row => {

            const item = row.items || {};

            return {
                material_id: row.material_id,
                name: item.name || "Unbekanntes Material",
                price: number(
                    row.unit_price ??
                    item.price ??
                    0
                ),
                quantity: number(row.quantity)
            };
        });

        renderConsumedMaterials();
        calculateFinalPrice();

    } catch (error) {

        console.error(
            "Fehler beim Laden des Materialverbrauchs:",
            error
        );
    }
}


// ==========================================
// BUTTON-STATUS PRÜFEN
// ==========================================

function updateEditingState() {

    if (!currentOrder || !currentUser) {
        disableMaterialEditing();
        return;
    }

    const isAssignedEmployee =
        currentOrder.employee_id === currentUser.id;

    const isOpen =
        !currentOrder.status ||
        currentOrder.status === "Offen";

    if (isAssignedEmployee) {
        enableMaterialEditing();
        return;
    }

    disableMaterialEditing();

    // Auftrag ist noch offen:
    // Materialien dürfen erst nach Übernahme
    // eingetragen werden.
    if (isOpen) {

        const addButton =
            getElement("addMaterialButton");

        const saveButton =
            getElement("saveMaterialsButton");

        if (addButton) {
            addButton.style.display = "none";
        }

        if (saveButton) {
            saveButton.style.display = "none";
        }
    }
}


// ==========================================
// ÜBERNAHME-BUTTON EINRICHTEN
// ==========================================

function setupAcceptButton() {

    const button =
        getElement("acceptOrderButton");

    if (!button) return;

    button.addEventListener(
        "click",
        acceptBuildOrder
    );
}


// ==========================================
// BUTTONS FÜR MATERIALIEN EINRICHTEN
// ==========================================

function setupButtons() {

    setupAcceptButton();
    setupMaterialButtons();
}


// ==========================================
// START
// ==========================================

async function init() {

    hideError();

    try {

        // Benutzer prüfen
        const authenticated =
            await loadUser();

        if (!authenticated) {
            return;
        }


        // Mitarbeiter laden
        await loadEmployee();


        // Bauauftrag laden
        await loadOrder();


        if (!currentOrder) {
            showError(
                "Der Bauauftrag konnte nicht geladen werden."
            );
            return;
        }


        // Gespeicherte Materialien laden
        await loadConsumedMaterials();


        // Buttons einrichten
        setupButtons();


        // Bearbeitungsrechte prüfen
        updateEditingState();


        // Preis nochmals berechnen
        calculateFinalPrice();

    } catch (error) {

        console.error(
            "Fehler beim Starten der Bauauftrag-Details:",
            error
        );

        showError(
            error.message ||
            "Die Auftragsdetails konnten nicht geladen werden."
        );
    }
}


// ==========================================
// SEITE STARTEN
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    init
);
