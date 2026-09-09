/* =========================================================
   EHRENMARKT – REDSTONE DETAILS
   JS/redstone_details.js
   TEIL 1 / 3
   ========================================================= */

"use strict";

/* =========================================================
   GLOBALE VARIABLEN
   ========================================================= */

let currentUser = null;
let currentEmployee = null;
let currentOrder = null;

let redstoneMaterials = [];
let selectedMaterialId = null;


/* =========================================================
   SUPABASE
   ========================================================= */

const supabaseClient = window.supabaseClient;


/* =========================================================
   TABELLEN
   ========================================================= */

const SUPABASE_TABLE_PRICES = "redstone_prices";
const SUPABASE_TABLE_ORDERS = "redstone_orders";
const SUPABASE_TABLE_ORDER_ITEMS = "redstone_order_items";
const SUPABASE_TABLE_EMPLOYEES = "employees";


/* =========================================================
   HILFSFUNKTIONEN
   ========================================================= */

function element(id) {
    return document.getElementById(id);
}


function setText(id, value) {

    const el = element(id);

    if (!el) {
        return;
    }

    el.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);
}


function number(value) {

    const result = Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}


function formatPreis(value) {

    return number(value).toLocaleString("de-DE") + " $";
}


function formatDatum(value) {

    if (!value) {
        return "—";
    }

    const datum = new Date(value);

    if (Number.isNaN(datum.getTime())) {
        return "—";
    }

    return datum.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function showError(message) {

    const el = element("errorMessage");

    if (!el) {
        return;
    }

    el.textContent = message;
    el.style.display = "block";
}


function hideError() {

    const el = element("errorMessage");

    if (!el) {
        return;
    }

    el.textContent = "";
    el.style.display = "none";
}


function showSuccess(message) {

    const el = element("successMessage");

    if (!el) {
        return;
    }

    el.textContent = message;
    el.style.display = "block";
}


function hideSuccess() {

    const el = element("successMessage");

    if (!el) {
        return;
    }

    el.textContent = "";
    el.style.display = "none";
}


/* =========================================================
   URL PARAMETER
   ========================================================= */

function getOrderParameter() {

    const params =
        new URLSearchParams(window.location.search);

    return {
        id: params.get("id"),
        order: params.get("order")
    };
}


/* =========================================================
   AUTHENTIFIZIERUNG
   ========================================================= */

async function loadUser() {

    if (!supabaseClient) {
        throw new Error(
            "Supabase wurde nicht geladen."
        );
    }

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();

    if (error) {
        throw error;
    }

    if (!data || !data.user) {

        window.location.href =
            "login.html";

        return null;
    }

    currentUser = data.user;

    return currentUser;
}


/* =========================================================
   MITARBEITER LADEN
   ========================================================= */

async function loadEmployee() {

    const {
        data,
        error
    } = await supabaseClient
        .from(SUPABASE_TABLE_EMPLOYEES)
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error(
            "Für dein Konto wurde kein Mitarbeitereintrag gefunden."
        );
    }

    currentEmployee = data;

    return data;
}


/* =========================================================
   AUFTRAG LADEN
   ========================================================= */

async function loadOrder() {

    const parameter =
        getOrderParameter();

    let query =
        supabaseClient
            .from(SUPABASE_TABLE_ORDERS)
            .select("*");

    if (parameter.id) {

        query =
            query.eq(
                "id",
                parameter.id
            );

    } else if (parameter.order) {

        query =
            query.eq(
                "order_number",
                parameter.order
            );

    } else {

        throw new Error(
            "Keine Auftragsnummer angegeben."
        );
    }

    const {
        data,
        error
    } = await query.maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error(
            "Der Redstone-Auftrag wurde nicht gefunden."
        );
    }

    currentOrder = data;

    return data;
}


/* =========================================================
   AUFTRAG ANZEIGEN
   ========================================================= */

function renderOrder() {

    const order = currentOrder;

    setText(
        "orderNumber",
        order.order_number
    );

    setText(
        "orderStatus",
        order.status
    );

    setText(
        "customerName",
        order.customer_name
    );

    setText(
        "minecraftName",
        order.minecraft_name
    );

    setText(
        "orderTitle",
        order.title
    );

    setText(
        "orderDate",
        formatDatum(order.created_at)
    );

    setText(
        "description",
        order.description
    );

    setText(
        "plotCount",
        order.plot_count
    );

    setText(
        "planningType",
        order.planning_type
    );

    setText(
        "complexity",
        order.complexity
    );

    setText(
        "plantSize",
        order.plant_size
    );

    setText(
        "redstoneBuildType",
        order.redstone_build_type
    );

    setText(
        "extensionType",
        order.extension_type
    );

    setText(
        "urgencyType",
        order.urgency_type
    );

    setText(
        "weekendWork",
        order.weekend_work
            ? "Ja"
            : "Nein"
    );

    setText(
        "guaranteeMonths",
        order.guarantee_months
    );


    renderSpecialWork(
        "specialExistingInstallation",
        order.special_existing_installation
    );

    renderSpecialWork(
        "specialExistingConversion",
        order.special_existing_conversion
    );

    renderSpecialWork(
        "specialForeignRepair",
        order.special_foreign_repair
    );

    renderSpecialWork(
        "specialCompactBuild",
        order.special_compact_build
    );

    renderSpecialWork(
        "specialHiddenRedstone",
        order.special_hidden_redstone
    );

    renderSpecialWork(
        "specialDifficultAccess",
        order.special_difficult_access
    );


    renderEmployeeName();

    renderMaterialProvider();

    renderPrices();

    renderProgress();

    updateEmployeeControls();
}


/* =========================================================
   SONDERARBEIT ANZEIGEN
   ========================================================= */

function renderSpecialWork(
    id,
    value
) {

    const el = element(id);

    if (!el) {
        return;
    }

    const active =
        value === true ||
        value === "true" ||
        value === 1 ||
        value === "1" ||
        value === "Ja";

    if (active) {

        el.classList.add("active");

    } else {

        el.classList.remove("active");
    }
}


/* =========================================================
   MITARBEITERNAME
   ========================================================= */

function renderEmployeeName() {

    if (!currentOrder.employee_id) {

        setText(
            "employeeName",
            "Noch nicht übernommen"
        );

        return;
    }

    if (
        currentEmployee &&
        currentOrder.employee_id ===
        currentEmployee.user_id
    ) {

        setText(
            "employeeName",
            currentEmployee.name
        );

        return;
    }

    setText(
        "employeeName",
        "Bereits von einem Mitarbeiter übernommen"
    );
}


/* =========================================================
   MATERIALBEREITSTELLUNG
   ========================================================= */

function renderMaterialProvider() {

    /*
       Der Redstone-Auftrag besitzt keine eigene
       Materialbereitstellungs-Auswahl wie der Bauauftrag.

       Deshalb wird hier nur angezeigt, wenn das Feld
       vorhanden ist.
    */

    const el =
        element("materialProvider");

    if (!el) {
        return;
    }

    if (
        currentOrder.material_provider !==
        undefined &&
        currentOrder.material_provider !== null
    ) {

        setText(
            "materialProvider",
            currentOrder.material_provider
        );

    } else {

        setText(
            "materialProvider",
            "Materialien werden über den Redstone-Auftrag erfasst"
        );
    }
}

/* =========================================================
   MATERIALIEN LADEN
   ========================================================= */

async function loadRedstoneMaterials() {

    if (!currentOrder) {
        return;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from(SUPABASE_TABLE_ORDER_ITEMS)
        .select(`
            id,
            order_id,
            item_id,
            quantity,
            price_per_piece
        `)
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
        throw error;
    }

    redstoneMaterials = data || [];

    await loadMaterialNames();

    renderMaterials();

    renderPrices();
}


/* =========================================================
   MATERIALNAMEN UND PREISE LADEN
   Quelle: redstone_prices
   ========================================================= */

async function loadMaterialNames() {

    if (!redstoneMaterials.length) {
        return;
    }

    const ids =
        redstoneMaterials
            .map(item => item.item_id)
            .filter(id => id !== null);

    if (!ids.length) {
        return;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from(SUPABASE_TABLE_PRICES)
        .select("id, name, price")
        .in("id", ids);

    if (error) {
        throw error;
    }

    const priceMap = {};

    (data || []).forEach(item => {

        priceMap[String(item.id)] = item;

    });


    redstoneMaterials =
        redstoneMaterials.map(item => {

            const artikel =
                priceMap[String(item.item_id)];

            return {
                ...item,

                item_name:
                    artikel
                        ? artikel.name
                        : "Unbekanntes Material",

                current_price:
                    artikel
                        ? number(artikel.price)
                        : number(item.price_per_piece)
            };

        });
}


/* =========================================================
   MATERIALAUSWAHL LADEN
   ========================================================= */

async function loadMaterialOptions() {

    const select =
        element("materialSelect");

    if (!select) {
        return;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from(SUPABASE_TABLE_PRICES)
        .select("id, name, price")
        .order(
            "name",
            {
                ascending: true
            }
        );

    if (error) {
        throw error;
    }

    select.innerHTML =
        '<option value="">Material auswählen</option>';

    (data || []).forEach(item => {

        const option =
            document.createElement("option");

        option.value =
            item.id;

        option.textContent =
            `${item.name} – ${formatPreis(item.price)}`;

        option.dataset.price =
            item.price;

        option.dataset.name =
            item.name;

        select.appendChild(option);
    });
}


/* =========================================================
   MATERIALIEN DARSTELLEN
   ========================================================= */

function renderMaterials() {

    const container =
        element("materialsList");

    if (!container) {
        return;
    }

    container.innerHTML = "";


    if (!redstoneMaterials.length) {

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td
                colspan="5"
                class="material-empty"
            >
                Noch keine Materialien eingetragen.
            </td>
        `;

        container.appendChild(row);

        return;
    }


    redstoneMaterials.forEach(material => {

        const row =
            document.createElement("tr");

        const menge =
            number(material.quantity);

        const preis =
            number(material.price_per_piece);

        const gesamt =
            menge * preis;


        row.innerHTML = `
            <td>
                ${escapeHtml(material.item_name)}
            </td>

            <td>
                ${menge.toLocaleString("de-DE")}
            </td>

            <td>
                ${formatPreis(preis)}
            </td>

            <td>
                ${formatPreis(gesamt)}
            </td>

            <td>

                <button
                    type="button"
                    class="btn-save"
                    data-edit-material="${material.id}"
                >
                    Bearbeiten
                </button>

                <button
                    type="button"
                    class="btn-delete"
                    data-delete-material="${material.id}"
                >
                    Löschen
                </button>

            </td>
        `;

        container.appendChild(row);
    });


    attachMaterialActions();
}


/* =========================================================
   HTML SICHER AUSGEBEN
   ========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   MATERIAL-AKTIONEN
   ========================================================= */

function attachMaterialActions() {

    document
        .querySelectorAll(
            "[data-edit-material]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        button.dataset.editMaterial;

                    editMaterial(id);
                }
            );

        });


    document
        .querySelectorAll(
            "[data-delete-material]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        button.dataset.deleteMaterial;

                    deleteMaterial(id);
                }
            );

        });
}


/* =========================================================
   MATERIAL EDITOR ÖFFNEN
   ========================================================= */

function openMaterialEditor() {

    const editor =
        element("materialEditor");

    if (!editor) {
        return;
    }

    editor.classList.add("visible");

    const addButton =
        element("addMaterialButton");

    if (addButton) {
        addButton.style.display = "none";
    }
}


/* =========================================================
   MATERIAL EDITOR SCHLIESSEN
   ========================================================= */

function closeMaterialEditor() {

    const editor =
        element("materialEditor");

    if (editor) {
        editor.classList.remove("visible");
    }


    const addButton =
        element("addMaterialButton");

    if (addButton) {
        addButton.style.display = "";
    }


    selectedMaterialId = null;


    const select =
        element("materialSelect");

    if (select) {
        select.value = "";
    }


    const quantity =
        element("materialQuantity");

    if (quantity) {
        quantity.value = "1";
    }


    const saveButton =
        element("saveMaterialButton");

    if (saveButton) {
        saveButton.textContent =
            "Material speichern";
    }
}


/* =========================================================
   MATERIAL BEARBEITEN
   ========================================================= */

function editMaterial(id) {

    if (!isCurrentEmployee()) {

        showError(
            "Nur der Bearbeiter dieses Auftrags kann Materialien bearbeiten."
        );

        return;
    }


    const material =
        redstoneMaterials.find(
            item =>
                String(item.id) === String(id)
        );

    if (!material) {

        showError(
            "Das Material wurde nicht gefunden."
        );

        return;
    }


    selectedMaterialId =
        material.id;


    const select =
        element("materialSelect");

    if (select) {
        select.value =
            material.item_id;
    }


    const quantity =
        element("materialQuantity");

    if (quantity) {
        quantity.value =
            material.quantity;
    }


    const saveButton =
        element("saveMaterialButton");

    if (saveButton) {

        saveButton.textContent =
            "Änderung speichern";
    }


    openMaterialEditor();

    hideError();
    hideSuccess();
}


/* =========================================================
   MATERIAL LÖSCHEN
   ========================================================= */

async function deleteMaterial(id) {

    if (!isCurrentEmployee()) {

        showError(
            "Nur der Bearbeiter dieses Auftrags kann Materialien löschen."
        );

        return;
    }


    const material =
        redstoneMaterials.find(
            item =>
                String(item.id) === String(id)
        );

    if (!material) {
        return;
    }


    const bestaetigt =
        window.confirm(
            `Soll "${material.item_name}" wirklich gelöscht werden?`
        );

    if (!bestaetigt) {
        return;
    }


    hideError();
    hideSuccess();


    const {
        error
    } = await supabaseClient
        .from(SUPABASE_TABLE_ORDER_ITEMS)
        .delete()
        .eq(
            "id",
            material.id
        )
        .eq(
            "order_id",
            currentOrder.id
        );


    if (error) {

        console.error(
            "Material konnte nicht gelöscht werden:",
            error
        );

        showError(
            "Das Material konnte nicht gelöscht werden."
        );

        return;
    }


    await loadRedstoneMaterials();

    await recalculateOrderPrice();

    showSuccess(
        "Material wurde gelöscht."
    );
}


/* =========================================================
   MATERIAL SPEICHERN
   ========================================================= */

async function saveMaterial() {

    if (!isCurrentEmployee()) {

        showError(
            "Nur der Bearbeiter dieses Auftrags kann Materialien ändern."
        );

        return;
    }


    const select =
        element("materialSelect");

    const quantityInput =
        element("materialQuantity");


    if (!select || !quantityInput) {
        return;
    }


    const itemId =
        Number(select.value);

    const quantity =
        Number(quantityInput.value);


    if (!itemId) {

        showError(
            "Bitte zuerst ein Material auswählen."
        );

        return;
    }


    if (
        !Number.isFinite(quantity) ||
        quantity <= 0
    ) {

        showError(
            "Bitte eine gültige Menge eingeben."
        );

        return;
    }


    const selectedOption =
        select.options[
            select.selectedIndex
        ];


    const price =
        Number(
            selectedOption.dataset.price
        ) || 0;


    if (price <= 0) {

        showError(
            "Für dieses Material wurde kein gültiger Preis gefunden."
        );

        return;
    }


    hideError();
    hideSuccess();


    let error;


    /* ==========================================
       BESTEHENDES MATERIAL BEARBEITEN
       ========================================== */

    if (selectedMaterialId) {

        const result =
            await supabaseClient
                .from(SUPABASE_TABLE_ORDER_ITEMS)
                .update({
                    item_id: itemId,
                    quantity: quantity,
                    price_per_piece: price
                })
                .eq(
                    "id",
                    selectedMaterialId
                )
                .eq(
                    "order_id",
                    currentOrder.id
                );

        error =
            result.error;

    }

    /* ==========================================
       NEUES MATERIAL HINZUFÜGEN
       ========================================== */

    else {

        const result =
            await supabaseClient
                .from(SUPABASE_TABLE_ORDER_ITEMS)
                .insert({
                    order_id:
                        currentOrder.id,

                    item_id:
                        itemId,

                    quantity:
                        quantity,

                    price_per_piece:
                        price
                });

        error =
            result.error;
    }


    if (error) {

        console.error(
            "Material konnte nicht gespeichert werden:",
            error
        );

        showError(
            "Das Material konnte nicht gespeichert werden."
        );

        return;
    }


    closeMaterialEditor();

    await loadRedstoneMaterials();

    await recalculateOrderPrice();

    showSuccess(
        selectedMaterialId
            ? "Material wurde geändert."
            : "Material wurde hinzugefügt."
    );
      }

/* =========================================================
   PREISBERECHNUNG
   ========================================================= */

async function recalculateOrderPrice() {

    if (!currentOrder) {
        return;
    }


    /* ==========================================
       MATERIALKOSTEN
       ========================================== */

    let materialPrice = 0;

    redstoneMaterials.forEach(material => {

        const menge =
            number(material.quantity);

        const preis =
            number(material.price_per_piece);

        materialPrice +=
            menge * preis;
    });


    /* ==========================================
       BESTEHENDE PREISWERTE
       ========================================== */

    const basePrice =
        number(
            currentOrder.base_price ??
            currentOrder.total_base_price ??
            currentOrder.total_price
        );


    const urgencyPrice =
        number(
            currentOrder.urgency_price
        );


    const weekendPrice =
        number(
            currentOrder.weekend_price
        );


    const guaranteePrice =
        number(
            currentOrder.guarantee_price
        );


    /* ==========================================
       GESAMTPREIS
       ========================================== */

    const totalPrice =
        basePrice +
        materialPrice +
        urgencyPrice +
        weekendPrice +
        guaranteePrice;


    const deposit =
        Math.round(
            totalPrice * 0.25
        );


    const remaining =
        totalPrice - deposit;


    /* ==========================================
       ANZEIGE
       ========================================== */

    setText(
        "basePrice",
        formatPreis(basePrice)
    );

    setText(
        "materialPrice",
        formatPreis(materialPrice)
    );

    setText(
        "urgencyPrice",
        formatPreis(urgencyPrice)
    );

    setText(
        "weekendPrice",
        formatPreis(weekendPrice)
    );

    setText(
        "guaranteePrice",
        formatPreis(guaranteePrice)
    );

    setText(
        "totalPrice",
        formatPreis(totalPrice)
    );

    setText(
        "depositAmount",
        formatPreis(deposit)
    );

    setText(
        "remainingAmount",
        formatPreis(remaining)
    );


    /* ==========================================
       PREIS IN DER DATENBANK AKTUALISIEREN
       ========================================== */

    const {
        error
    } = await supabaseClient
        .from(SUPABASE_TABLE_ORDERS)
        .update({
            total_price: totalPrice,
            deposit_amount: deposit,
            remaining_amount: remaining
        })
        .eq(
            "id",
            currentOrder.id
        );


    if (error) {

        console.error(
            "Preis konnte nicht aktualisiert werden:",
            error
        );

        showError(
            "Der neue Gesamtpreis konnte nicht gespeichert werden."
        );

        return;
    }


    currentOrder.total_price =
        totalPrice;

    currentOrder.deposit_amount =
        deposit;

    currentOrder.remaining_amount =
        remaining;
}


/* =========================================================
   PREISE ANZEIGEN
   ========================================================= */

function renderPrices() {

    if (!currentOrder) {
        return;
    }


    const materialPrice =
        redstoneMaterials.reduce(
            (sum, material) => {

                return sum +
                    (
                        number(material.quantity) *
                        number(material.price_per_piece)
                    );

            },
            0
        );


    const basePrice =
        number(
            currentOrder.base_price ??
            currentOrder.total_base_price ??
            0
        );


    const urgencyPrice =
        number(
            currentOrder.urgency_price
        );


    const weekendPrice =
        number(
            currentOrder.weekend_price
        );


    const guaranteePrice =
        number(
            currentOrder.guarantee_price
        );


    let totalPrice =
        number(
            currentOrder.total_price
        );


    if (!totalPrice) {

        totalPrice =
            basePrice +
            materialPrice +
            urgencyPrice +
            weekendPrice +
            guaranteePrice;
    }


    const deposit =
        currentOrder.deposit_amount !==
        undefined
            ? number(
                currentOrder.deposit_amount
            )
            : Math.round(
                totalPrice * 0.25
            );


    const remaining =
        currentOrder.remaining_amount !==
        undefined
            ? number(
                currentOrder.remaining_amount
            )
            : totalPrice - deposit;


    setText(
        "basePrice",
        formatPreis(basePrice)
    );

    setText(
        "materialPrice",
        formatPreis(materialPrice)
    );

    setText(
        "urgencyPrice",
        formatPreis(urgencyPrice)
    );

    setText(
        "weekendPrice",
        formatPreis(weekendPrice)
    );

    setText(
        "guaranteePrice",
        formatPreis(guaranteePrice)
    );

    setText(
        "totalPrice",
        formatPreis(totalPrice)
    );

    setText(
        "depositAmount",
        formatPreis(deposit)
    );

    setText(
        "remainingAmount",
        formatPreis(remaining)
    );
}


/* =========================================================
   PRÜFEN, OB DIESER MITARBEITER BEARBEITER IST
   ========================================================= */

function isCurrentEmployee() {

    if (
        !currentUser ||
        !currentOrder
    ) {
        return false;
    }


    return (
        currentOrder.employee_id ===
        currentUser.id
    );
}


/* =========================================================
   MATERIALBEREICH AKTIVIEREN / DEAKTIVIEREN
   ========================================================= */

function updateMaterialEditorState() {

    const addButton =
        element("addMaterialButton");

    const editor =
        element("materialEditor");


    const isBearbeiter =
        isCurrentEmployee();


    if (addButton) {

        addButton.style.display =
            isBearbeiter
                ? ""
                : "none";
    }


    if (
        !isBearbeiter &&
        editor
    ) {

        editor.classList.remove(
            "visible"
        );
    }
}


/* =========================================================
   BEARBEITER-STEUERUNG
   ========================================================= */

function updateEmployeeControls() {

    const button =
        element("acceptOrderButton");

    const statusText =
        element("employeeStatusText");


    if (!button) {
        return;
    }


    const status =
        String(
            currentOrder?.status || ""
        );


    /* ==========================================
       AUFTRAG BEREITS VON DIESEM MITARBEITER
       ========================================== */

    if (
        isCurrentEmployee()
    ) {

        button.disabled = true;

        button.textContent =
            "✓ Auftrag übernommen";


        if (statusText) {

            statusText.textContent =
                "Du bearbeitest diesen Auftrag.";
        }


        updateMaterialEditorState();

        return;
    }


    /* ==========================================
       AUFTRAG BEREITS VON ANDEREM MITARBEITER
       ========================================== */

    if (
        currentOrder.employee_id &&
        currentOrder.employee_id !==
        currentUser.id
    ) {

        button.disabled = true;

        button.textContent =
            "Auftrag bereits übernommen";


        if (statusText) {

            statusText.textContent =
                "Dieser Auftrag wird bereits von einem anderen Mitarbeiter bearbeitet.";
        }


        updateMaterialEditorState();

        return;
    }


    /* ==========================================
       AUFTRAG NICHT OFFEN
       ========================================== */

    if (
        status.toLowerCase() !==
        "offen"
    ) {

        button.disabled = true;

        button.textContent =
            "Auftrag nicht verfügbar";


        if (statusText) {

            statusText.textContent =
                "Dieser Auftrag kann aktuell nicht übernommen werden.";
        }


        updateMaterialEditorState();

        return;
    }


    /* ==========================================
       MITARBEITER NICHT VERFÜGBAR
       ========================================== */

    if (
        !currentEmployee ||
        currentEmployee.is_available !== true
    ) {

        button.disabled = true;

        button.textContent =
            "Nicht verfügbar";


        if (statusText) {

            statusText.textContent =
                "Du musst als verfügbar eingetragen sein, um einen Auftrag zu übernehmen.";
        }


        updateMaterialEditorState();

        return;
    }


    /* ==========================================
       AUFTRAG KANN ÜBERNOMMEN WERDEN
       ========================================== */

    button.disabled = false;

    button.textContent =
        "✓ Auftrag übernehmen";


    if (statusText) {

        statusText.textContent =
            "Dieser Auftrag kann übernommen werden.";
    }


    updateMaterialEditorState();
}


/* =========================================================
   AUFTRAG ÜBERNEHMEN
   ========================================================= */

async function acceptOrder() {

    hideError();
    hideSuccess();


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


    if (
        currentEmployee.is_available !== true
    ) {

        showError(
            "Du bist aktuell nicht verfügbar."
        );

        return;
    }


    if (
        currentOrder.employee_id
    ) {

        showError(
            "Dieser Auftrag wurde bereits übernommen."
        );

        await loadOrder();

        renderOrder();

        await loadRedstoneMaterials();

        return;
    }


    if (
        String(
            currentOrder.status || ""
        ).toLowerCase() !==
        "offen"
    ) {

        showError(
            "Dieser Auftrag ist nicht mehr offen."
        );

        return;
    }


    const button =
        element("acceptOrderButton");


    if (button) {

        button.disabled = true;

        button.textContent =
            "Wird übernommen...";
    }


    const {
        data,
        error
    } = await supabaseClient
        .from(SUPABASE_TABLE_ORDERS)
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
        .is(
            "employee_id",
            null
        )
        .eq(
            "status",
            "Offen"
        )
        .select()
        .maybeSingle();


    if (error) {

        console.error(
            "Auftrag konnte nicht übernommen werden:",
            error
        );

        showError(
            "Der Auftrag konnte nicht übernommen werden."
        );

        updateEmployeeControls();

        return;
    }


    if (!data) {

        showError(
            "Der Auftrag wurde möglicherweise bereits von einem anderen Mitarbeiter übernommen."
        );

        await loadOrder();

        renderOrder();

        await loadRedstoneMaterials();

        return;
    }


    currentOrder =
        data;


    showSuccess(
        "Der Auftrag wurde erfolgreich übernommen."
    );


    renderOrder();

    await loadRedstoneMaterials();

    updateEmployeeControls();
}


/* =========================================================
   FORTSCHRITT
   ========================================================= */

function renderProgress() {

    const steps = [
        element("progressOpen"),
        element("progressWorking"),
        element("progressCompleted"),
        element("progressPaid")
    ];


    steps.forEach(step => {

        if (step) {
            step.classList.remove("active");
        }

    });


    const status =
        String(
            currentOrder?.status || ""
        ).toLowerCase();


    let activeCount = 1;


    if (
        status.includes("bearbeitung") ||
        status.includes("bearbeitet")
    ) {

        activeCount = 2;

    } else if (
        status.includes("abgeschlossen")
    ) {

        activeCount = 3;

    } else if (
        status.includes("bezahlt")
    ) {

        activeCount = 4;
    }


    for (
        let i = 0;
        i < activeCount;
        i++
    ) {

        if (steps[i]) {
            steps[i].classList.add("active");
        }
    }
}


/* =========================================================
   BUTTON-EVENTS
   ========================================================= */

function setupEvents() {

    const addButton =
        element("addMaterialButton");

    if (addButton) {

        addButton.addEventListener(
            "click",
            async () => {

                if (!isCurrentEmployee()) {

                    showError(
                        "Du musst den Auftrag zuerst übernehmen."
                    );

                    return;
                }


                selectedMaterialId =
                    null;


                const saveButton =
                    element(
                        "saveMaterialButton"
                    );

                if (saveButton) {

                    saveButton.textContent =
                        "Material speichern";
                }


                const quantity =
                    element(
                        "materialQuantity"
                    );

                if (quantity) {
                    quantity.value = "1";
                }


                const select =
                    element(
                        "materialSelect"
                    );

                if (select) {
                    select.value = "";
                }


                await loadMaterialOptions();

                openMaterialEditor();

                hideError();
                hideSuccess();
            }
        );
    }


    const saveButton =
        element("saveMaterialButton");

    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveMaterial
        );
    }


    const cancelButton =
        element("cancelMaterialButton");

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeMaterialEditor
        );
    }


    const acceptButton =
        element("acceptOrderButton");

    if (acceptButton) {

        acceptButton.addEventListener(
            "click",
            acceptOrder
        );
    }
}


/* =========================================================
   START
   ========================================================= */

async function init() {

    try {

        hideError();
        hideSuccess();


        await loadUser();

        if (!currentUser) {
            return;
        }


        await loadEmployee();

        await loadOrder();

        renderOrder();


        await loadMaterialOptions();

        await loadRedstoneMaterials();


        setupEvents();

        updateEmployeeControls();

        renderProgress();


    } catch (error) {

        console.error(
            "Fehler beim Laden des Redstone-Auftrags:",
            error
        );


        showError(
            error.message ||
            "Der Redstone-Auftrag konnte nicht geladen werden."
        );
    }
}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);
