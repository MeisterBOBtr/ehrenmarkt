/* =========================================================
   EHRENMARKT – REDSTONE DETAILS
   JS/redstone_details.js

   TEIL 1 / 3
   Auftrag laden + Grunddaten + Preislogik
   ========================================================= */

"use strict";


/* =========================================================
   GLOBALE VARIABLEN
   ========================================================= */

let currentUser = null;
let currentEmployee = null;
let currentOrder = null;

let redstoneMaterials = [];
let redstonePrices = [];

let selectedMaterialId = null;


/* =========================================================
   SUPABASE-TABELLEN
   ========================================================= */

const SUPABASE_TABLE_PRICES =
    "redstone_prices";

const SUPABASE_TABLE_ORDERS =
    "redstone_orders";

const SUPABASE_TABLE_ORDER_ITEMS =
    "redstone_order_items";

const SUPABASE_TABLE_EMPLOYEES =
    "employees";


/* =========================================================
   PREISE – ORIGINAL REDSTONEAUFTRAG
   ========================================================= */

const GRUNDSTUECK_PREIS = 300000;


/* Planung */

const PLANUNG_PREISE = {
    einfach: 5000,
    normal: 10000,
    komplex: 20000,
    sehr_komplex: 30000
};


/* Komplexität */

const KOMPLEXITAET_PREISE = {
    einfach: 2500,
    normal: 12500,
    komplex: 25000
};


/* Anlage */

const ANLAGE_PREISE = {
    klein: 75000,
    mittel: 150000,
    gross: 300000
};


/* Redstone-Bau */

const REDSTONE_BAU_PROZENTE = {
    einfach: 0,
    normal: 10,
    komplex: 20,
    sehr_komplex: 25
};


/* Sonderarbeiten */

const SONDERARBEITEN_PREISE = {

    special_existing_installation:
        20000,

    special_existing_conversion:
        30000,

    special_foreign_repair:
        50000,

    special_compact_build:
        30000,

    special_hidden_redstone:
        30000,

    special_difficult_access:
        40000
};


/* Erweiterung */

const ERWEITERUNG_PREISE = {

    keine: 0,

    klein: 250000,

    mittel: 500000,

    gross: 1000000
};


/* Dringlichkeit */

const DRINGLICHKEIT_PROZENTE = {

    normal: 0,

    express: 50,

    notfall: 75,

    sofort: 100
};


/* Wochenende */

const WOCHENENDE_PROZENT = 25;


/* Garantie */

const GARANTIE_PROZENTE = {

    0: 0,

    1: 5,

    2: 10,

    3: 15
};


/* =========================================================
   HILFSFUNKTIONEN
   ========================================================= */

function element(id) {

    return document.getElementById(id);
}


function setText(id, value) {

    const feld = element(id);

    if (!feld) {
        return;
    }

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        feld.textContent = "—";

        return;
    }

    feld.textContent = String(value);
}


function number(value) {

    const zahl = Number(value);

    if (!Number.isFinite(zahl)) {
        return 0;
    }

    return zahl;
}


function formatPreis(value) {

    return number(value)
        .toLocaleString("de-DE") + " $";
}


function formatDatum(value) {

    if (!value) {
        return "—";
    }

    const datum =
        new Date(value);

    if (
        Number.isNaN(
            datum.getTime()
        )
    ) {

        return "—";
    }

    return datum.toLocaleString(
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

    const feld =
        element("errorMessage");

    if (!feld) {
        return;
    }

    feld.textContent = message;

    feld.style.display = "block";
}


function hideError() {

    const feld =
        element("errorMessage");

    if (!feld) {
        return;
    }

    feld.textContent = "";

    feld.style.display = "none";
}


function showSuccess(message) {

    const feld =
        element("successMessage");

    if (!feld) {
        return;
    }

    feld.textContent = message;

    feld.style.display = "block";
}


function hideSuccess() {

    const feld =
        element("successMessage");

    if (!feld) {
        return;
    }

    feld.textContent = "";

    feld.style.display = "none";
}


/* =========================================================
   HTML SICHER AUSGEBEN
   ========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

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
   URL-PARAMETER
   ========================================================= */

function getOrderParameter() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return {

        id:
            params.get("id"),

        order:
            params.get("order")
    };
}


/* =========================================================
   SUPABASE PRÜFEN
   ========================================================= */

function pruefeSupabase() {

    if (
        typeof supabaseClient ===
        "undefined"
    ) {

        console.error(
            "Supabase wurde nicht geladen."
        );

        showError(
            "Supabase wurde nicht geladen."
        );

        return false;
    }

    return true;
}


/* =========================================================
   BENUTZER LADEN
   ========================================================= */

async function loadUser() {

    if (!pruefeSupabase()) {
        return null;
    }

    const {
        data,
        error
    } =
        await supabaseClient.auth.getUser();


    if (error) {
        throw error;
    }


    if (
        !data ||
        !data.user
    ) {

        window.location.href =
            "login.html";

        return null;
    }


    currentUser =
        data.user;

    return currentUser;
}


/* =========================================================
   MITARBEITER LADEN
   ========================================================= */

async function loadEmployee() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                SUPABASE_TABLE_EMPLOYEES
            )
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .maybeSingle();


    if (error) {
        throw error;
    }


    if (!data) {

        throw new Error(
            "Für dein Konto wurde kein Mitarbeitereintrag gefunden."
        );
    }


    currentEmployee =
        data;

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
            .from(
                SUPABASE_TABLE_ORDERS
            )
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
            "Keine Redstone-Auftragsnummer angegeben."
        );
    }


    const {
        data,
        error
    } =
        await query.maybeSingle();


    if (error) {
        throw error;
    }


    if (!data) {

        throw new Error(
            "Der Redstone-Auftrag wurde nicht gefunden."
        );
    }


    currentOrder =
        data;


    return data;
}


/* =========================================================
   AUFTRAGSDATEN ANZEIGEN
   ========================================================= */

function renderOrder() {

    const order =
        currentOrder;


    /* Auftrag */

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
        formatDatum(
            order.created_at
        )
    );


    /* Beschreibung */

    setText(
        "description",
        order.description
    );


    /* Planung */

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


    /* Sonderarbeiten */

    renderSpecial(
        "specialExistingInstallation",
        order.special_existing_installation
    );

    renderSpecial(
        "specialExistingConversion",
        order.special_existing_conversion
    );

    renderSpecial(
        "specialForeignRepair",
        order.special_foreign_repair
    );

    renderSpecial(
        "specialCompactBuild",
        order.special_compact_build
    );

    renderSpecial(
        "specialHiddenRedstone",
        order.special_hidden_redstone
    );

    renderSpecial(
        "specialDifficultAccess",
        order.special_difficult_access
    );


    /* Weitere Optionen */

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


    renderEmployee();

    renderMaterialProvider();

    renderProgress();

    updateEmployeeControls();
}


/* =========================================================
   SONDERARBEITEN
   ========================================================= */

function renderSpecial(
    id,
    value
) {

    const feld =
        element(id);

    if (!feld) {
        return;
    }


    const aktiv =
        value === true ||
        value === "true" ||
        value === 1 ||
        value === "1";


    if (aktiv) {

        feld.classList.add(
            "active"
        );

    } else {

        feld.classList.remove(
            "active"
        );
    }
}


/* =========================================================
   BEARBEITER ANZEIGEN
   ========================================================= */

function renderEmployee() {

    const employeeId =
        currentOrder.assigned_employee_id;


    if (!employeeId) {

        setText(
            "employeeName",
            "Noch nicht übernommen"
        );

        return;
    }


    if (
        currentUser &&
        employeeId ===
        currentUser.id
    ) {

        setText(
            "employeeName",
            currentEmployee?.name ||
            "Du"
        );

        return;
    }


    setText(
        "employeeName",
        "Bereits einem Mitarbeiter zugewiesen"
    );
}


/* =========================================================
   MATERIALBEREITSTELLUNG
   ========================================================= */

function renderMaterialProvider() {

    const feld =
        element("materialProvider");

    if (!feld) {
        return;
    }


    /*
     * Der aktuelle Redstoneauftrag besitzt
     * kein eigenes Material-Provider-Feld.
     *
     * Materialien werden direkt über
     * redstone_order_items verwaltet.
     */

    feld.textContent =
        "Redstone-Materialien";
}


/* =========================================================
   GRUNDPREIS BERECHNEN
   ========================================================= */

function berechneGrundpreisAusAuftrag() {

    const order =
        currentOrder;


    if (!order) {
        return 0;
    }


    /* Grundstück / Merge */

    const plotCount =
        Math.max(
            1,
            number(
                order.plot_count
            )
        );


    const grundstueck =
        plotCount *
        GRUNDSTUECK_PREIS;


    /* Planung */

    const planungPreis =
        PLANUNG_PREISE[
            order.planning_type
        ] || 0;


    /* Komplexität */

    const komplexitaetPreis =
        KOMPLEXITAET_PREISE[
            order.complexity
        ] || 0;


    /* Anlage */

    const anlagePreis =
        ANLAGE_PREISE[
            order.plant_size
        ] || 0;


    /* Redstone-Bau */

    const redstoneBauProzent =
        REDSTONE_BAU_PROZENTE[
            order.redstone_build_type
        ] || 0;


    /* Sonderarbeiten */

    let sonderarbeitenPreis =
        0;


    Object.entries(
        SONDERARBEITEN_PREISE
    ).forEach(
        ([name, preis]) => {

            if (
                order[name] === true
            ) {

                sonderarbeitenPreis +=
                    number(preis);
            }
        }
    );


    /* Erweiterung */

    const erweiterungPreis =
        ERWEITERUNG_PREISE[
            order.extension_type
        ] || 0;


    /* Grundbestandteile */

    let grundpreis =
        grundstueck +
        planungPreis +
        komplexitaetPreis +
        anlagePreis +
        sonderarbeitenPreis +
        erweiterungPreis;


    /* Redstone-Bau-Aufschlag */

    const redstoneBauAufschlag =
        grundpreis *
        (
            redstoneBauProzent /
            100
        );


    grundpreis +=
        redstoneBauAufschlag;


    return Math.round(
        grundpreis
    );
}


/* =========================================================
   DRINGLICHKEIT BERECHNEN
   ========================================================= */

function berechneDringlichkeitAusAuftrag(
    grundpreis
) {

    const prozent =
        DRINGLICHKEIT_PROZENTE[
            currentOrder?.urgency_type
        ] || 0;


    return Math.round(
        number(grundpreis) *
        (
            prozent /
            100
        )
    );
   }

/* =========================================================
   EHRENMARKT – REDSTONE DETAILS
   JS/redstone_details.js

   TEIL 2 / 3
   Materialien laden + Hinzufügen + Bearbeiten + Löschen
   ========================================================= */


/* =========================================================
   REDSTONE-PREISE LADEN
   Quelle: redstone_prices
   ========================================================= */

async function loadRedstonePrices() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                SUPABASE_TABLE_PRICES
            )
            .select(
                "id, name, price"
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


    redstonePrices =
        data || [];


    return redstonePrices;
}


/* =========================================================
   MATERIALIEN DES AUFTRAGS LADEN
   Quelle: redstone_order_items
   ========================================================= */

async function loadRedstoneMaterials() {

    if (!currentOrder) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                SUPABASE_TABLE_ORDER_ITEMS
            )
            .select(
                "id, order_id, item_id, quantity, price_per_piece"
            )
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


    const materialRows =
        data || [];


    /*
     * Zu jeder Position den Namen
     * aus redstone_prices suchen.
     */

    redstoneMaterials =
        materialRows.map(
            position => {

                const preisEintrag =
                    redstonePrices.find(
                        item =>
                            String(item.id) ===
                            String(position.item_id)
                    );


                return {

                    id:
                        position.id,

                    order_id:
                        position.order_id,

                    item_id:
                        position.item_id,

                    quantity:
                        number(
                            position.quantity
                        ),

                    price_per_piece:
                        number(
                            position.price_per_piece
                        ),

                    item_name:
                        preisEintrag
                            ? preisEintrag.name
                            : "Unbekanntes Material"
                };
            }
        );


    renderMaterials();

    renderMaterialPrice();
}


/* =========================================================
   MATERIALAUSWAHL AUFBAUEN
   ========================================================= */

function renderMaterialOptions() {

    const select =
        element("materialSelect");


    if (!select) {
        return;
    }


    select.innerHTML =
        "";


    const firstOption =
        document.createElement(
            "option"
        );


    firstOption.value =
        "";

    firstOption.textContent =
        "Material auswählen";


    select.appendChild(
        firstOption
    );


    redstonePrices.forEach(
        material => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                material.id;


            option.textContent =
                `${material.name} – ${formatPreis(material.price)}`;


            option.dataset.price =
                material.price;


            option.dataset.name =
                material.name;


            select.appendChild(
                option
            );
        }
    );
}


/* =========================================================
   MATERIALIEN ANZEIGEN
   ========================================================= */

function renderMaterials() {

    const container =
        element("materialsList");


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        redstoneMaterials.length === 0
    ) {

        const row =
            document.createElement(
                "tr"
            );


        row.innerHTML = `
            <td
                colspan="5"
                class="material-empty"
            >
                Noch keine Materialien eingetragen.
            </td>
        `;


        container.appendChild(
            row
        );


        return;
    }


    redstoneMaterials.forEach(
        material => {

            const row =
                document.createElement(
                    "tr"
                );


            const menge =
                number(
                    material.quantity
                );


            const einzelpreis =
                number(
                    material.price_per_piece
                );


            const gesamtpreis =
                menge *
                einzelpreis;


            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        material.item_name
                    )}
                </td>

                <td>
                    ${menge.toLocaleString(
                        "de-DE"
                    )}
                </td>

                <td>
                    ${formatPreis(
                        einzelpreis
                    )}
                </td>

                <td>
                    ${formatPreis(
                        gesamtpreis
                    )}
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


            container.appendChild(
                row
            );
        }
    );


    attachMaterialActions();
}


/* =========================================================
   MATERIAL-AKTIONEN VERBINDEN
   ========================================================= */

function attachMaterialActions() {


    document
        .querySelectorAll(
            "[data-edit-material]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        editMaterial(
                            button.dataset.editMaterial
                        );
                    }
                );
            }
        );


    document
        .querySelectorAll(
            "[data-delete-material]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteMaterial(
                            button.dataset.deleteMaterial
                        );
                    }
                );
            }
        );
}


/* =========================================================
   PRÜFEN, OB AKTUELLER BEARBEITER
   ========================================================= */

function isCurrentBearbeiter() {

    if (
        !currentUser ||
        !currentOrder
    ) {

        return false;
    }


    return String(
        currentOrder.assigned_employee_id
    ) === String(
        currentUser.id
    );
}


/* =========================================================
   MATERIAL-EDITOR ÖFFNEN
   ========================================================= */

function openMaterialEditor() {

    const editor =
        element("materialEditor");


    if (!editor) {
        return;
    }


    editor.style.display =
        "block";


    const hint =
        element("materialEditorHint");


    if (hint) {

        hint.textContent =
            "Material auswählen und Menge eingeben.";
    }
}


/* =========================================================
   MATERIAL-EDITOR SCHLIESSEN
   ========================================================= */

function closeMaterialEditor() {

    const editor =
        element("materialEditor");


    if (editor) {

        editor.style.display =
            "none";
    }


    selectedMaterialId =
        null;


    const select =
        element("materialSelect");


    if (select) {

        select.value =
            "";
    }


    const quantity =
        element("materialQuantity");


    if (quantity) {

        quantity.value =
            "1";
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

    if (
        !isCurrentBearbeiter()
    ) {

        showError(
            "Nur der Bearbeiter kann Materialien bearbeiten."
        );

        return;
    }


    const material =
        redstoneMaterials.find(
            item =>
                String(item.id) ===
                String(id)
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
            String(
                material.item_id
            );
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

    if (
        !isCurrentBearbeiter()
    ) {

        showError(
            "Nur der Bearbeiter kann Materialien löschen."
        );

        return;
    }


    const material =
        redstoneMaterials.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!material) {

        showError(
            "Das Material wurde nicht gefunden."
        );

        return;
    }


    const bestaetigt =
        window.confirm(
            `"${material.item_name}" wirklich löschen?`
        );


    if (!bestaetigt) {
        return;
    }


    hideError();

    hideSuccess();


    const {
        error
    } =
        await supabaseClient
            .from(
                SUPABASE_TABLE_ORDER_ITEMS
            )
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
            "Fehler beim Löschen:",
            error
        );


        showError(
            "Das Material konnte nicht gelöscht werden."
        );

        return;
    }


    await loadRedstoneMaterials();

    await recalculateRedstonePrice();


    showSuccess(
        "Material wurde gelöscht."
    );
}


/* =========================================================
   MATERIAL SPEICHERN
   ========================================================= */

async function saveMaterial() {

    if (
        !isCurrentBearbeiter()
    ) {

        showError(
            "Nur der Bearbeiter kann Materialien ändern."
        );

        return;
    }


    const select =
        element("materialSelect");


    const quantityInput =
        element("materialQuantity");


    if (
        !select ||
        !quantityInput
    ) {

        showError(
            "Materialfelder wurden nicht gefunden."
        );

        return;
    }


    const itemId =
        Number(
            select.value
        );


    const quantity =
        Number(
            quantityInput.value
        );


    if (!itemId) {

        showError(
            "Bitte ein Material auswählen."
        );

        return;
    }


    if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(quantity)
    ) {

        showError(
            "Bitte eine gültige ganze Menge eingeben."
        );

        return;
    }


    const material =
        redstonePrices.find(
            item =>
                Number(item.id) ===
                itemId
        );


    if (!material) {

        showError(
            "Das ausgewählte Material wurde nicht gefunden."
        );

        return;
    }


    const price =
        number(
            material.price
        );


    if (price < 0) {

        showError(
            "Der Materialpreis ist ungültig."
        );

        return;
    }


    hideError();

    hideSuccess();


    let error = null;


    /* =====================================================
       BESTEHENDE POSITION ÄNDERN
       ===================================================== */

    if (
        selectedMaterialId !== null
    ) {

        const result =
            await supabaseClient
                .from(
                    SUPABASE_TABLE_ORDER_ITEMS
                )
                .update({

                    item_id:
                        itemId,

                    quantity:
                        quantity,

                    price_per_piece:
                        price
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


    } else {


        /* =================================================
           NEUE POSITION ANLEGEN
           ================================================= */

        const result =
            await supabaseClient
                .from(
                    SUPABASE_TABLE_ORDER_ITEMS
                )
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
            "Fehler beim Speichern des Materials:",
            error
        );


        showError(
            "Das Material konnte nicht gespeichert werden."
        );

        return;
    }


    closeMaterialEditor();


    await loadRedstoneMaterials();

    await recalculateRedstonePrice();


    showSuccess(
        selectedMaterialId !== null
            ? "Material wurde geändert."
            : "Material wurde hinzugefügt."
    );
}


/* =========================================================
   MATERIALKOSTEN BERECHNEN
   ========================================================= */

function berechneMaterialkosten() {

    return redstoneMaterials.reduce(
        (
            summe,
            material
        ) => {

            return summe +
                (
                    number(
                        material.quantity
                    ) *
                    number(
                        material.price_per_piece
                    )
                );

        },
        0
    );
}


/* =========================================================
   MATERIALPREIS ANZEIGEN
   ========================================================= */

function renderMaterialPrice() {

    const materialPrice =
        berechneMaterialkosten();


    setText(
        "materialPrice",
        formatPreis(
            materialPrice
        )
    );


    return materialPrice;
               }

/* =========================================================
   EHRENMARKT – REDSTONE DETAILS
   JS/redstone_details.js

   TEIL 3 / 3
   Gesamtpreis + Übernahme + Status + Start
   ========================================================= */


/* =========================================================
   GARANTIEPREIS BERECHNEN
   ========================================================= */

function berechneGarantiePreis(grundpreis) {

    const monate =
        number(
            currentOrder?.guarantee_months
        );

    const prozent =
        GARANTIE_PROZENTE[monate] || 0;

    return Math.round(
        number(grundpreis) *
        (prozent / 100)
    );
}


/* =========================================================
   WOCHENENDPREIS BERECHNEN
   ========================================================= */

function berechneWochenendPreis(grundpreis) {

    const aktiv =
        currentOrder?.weekend_work === true ||
        currentOrder?.weekend_work === "true" ||
        currentOrder?.weekend_work === 1 ||
        currentOrder?.weekend_work === "1";

    if (!aktiv) {
        return 0;
    }

    return Math.round(
        number(grundpreis) *
        (WOCHENENDE_PROZENT / 100)
    );
}


/* =========================================================
   GESAMTPREIS BERECHNEN
   ========================================================= */

function berechneGesamtpreis() {

    if (!currentOrder) {
        return 0;
    }


    const grundpreis =
        berechneGrundpreisAusAuftrag();


    const materialpreis =
        berechneMaterialkosten();


    /*
     * Dringlichkeit wird auf den
     * Grundpreis ohne Materialien angewendet.
     */

    const dringlichkeitspreis =
        berechneDringlichkeitAusAuftrag(
            grundpreis
        );


    /*
     * Wochenende wird ebenfalls auf
     * den Grundpreis angewendet.
     */

    const wochenendpreis =
        berechneWochenendPreis(
            grundpreis
        );


    /*
     * Garantie.
     */

    const garantiepreis =
        berechneGarantiePreis(
            grundpreis
        );


    const gesamtpreis =
        Math.round(
            grundpreis +
            materialpreis +
            dringlichkeitspreis +
            wochenendpreis +
            garantiepreis
        );


    const anzahlung =
        Math.round(
            gesamtpreis * 0.25
        );


    const restbetrag =
        gesamtpreis -
        anzahlung;


    /*
     * Anzeige.
     */

    setText(
        "basePrice",
        formatPreis(
            grundpreis
        )
    );


    setText(
        "materialPrice",
        formatPreis(
            materialpreis
        )
    );


    setText(
        "urgencyPrice",
        formatPreis(
            dringlichkeitspreis
        )
    );


    setText(
        "weekendPrice",
        formatPreis(
            wochenendpreis
        )
    );


    setText(
        "guaranteePrice",
        formatPreis(
            garantiepreis
        )
    );


    setText(
        "totalPrice",
        formatPreis(
            gesamtpreis
        )
    );


    setText(
        "depositAmount",
        formatPreis(
            anzahlung
        )
    );


    setText(
        "remainingAmount",
        formatPreis(
            restbetrag
        )
    );


    return {
        grundpreis,
        materialpreis,
        dringlichkeitspreis,
        wochenendpreis,
        garantiepreis,
        gesamtpreis,
        anzahlung,
        restbetrag
    };
}


/* =========================================================
   PREIS NEU BERECHNEN UND SPEICHERN
   ========================================================= */

async function recalculateRedstonePrice() {

    if (!currentOrder) {
        return;
    }


    const preise =
        berechneGesamtpreis();


    const {
        error
    } =
        await supabaseClient
            .from(
                SUPABASE_TABLE_ORDERS
            )
            .update({

                total_price:
                    preise.gesamtpreis,

                deposit_amount:
                    preise.anzahlung,

                remaining_amount:
                    preise.restbetrag

            })
            .eq(
                "id",
                currentOrder.id
            );


    if (error) {

        console.error(
            "Preis konnte nicht gespeichert werden:",
            error
        );

        throw error;
    }


    /*
     * Lokales Objekt ebenfalls aktualisieren.
     */

    currentOrder.total_price =
        preise.gesamtpreis;

    currentOrder.deposit_amount =
        preise.anzahlung;

    currentOrder.remaining_amount =
        preise.restbetrag;
}


/* =========================================================
   PREISANZEIGE BEIM ERSTEN LADEN
   ========================================================= */

function renderPrices() {

    if (!currentOrder) {
        return;
    }


    const preise =
        berechneGesamtpreis();


    setText(
        "basePrice",
        formatPreis(
            preise.grundpreis
        )
    );


    setText(
        "materialPrice",
        formatPreis(
            preise.materialpreis
        )
    );


    setText(
        "urgencyPrice",
        formatPreis(
            preise.dringlichkeitspreis
        )
    );


    setText(
        "weekendPrice",
        formatPreis(
            preise.wochenendpreis
        )
    );


    setText(
        "guaranteePrice",
        formatPreis(
            preise.garantiepreis
        )
    );


    setText(
        "totalPrice",
        formatPreis(
            preise.gesamtpreis
        )
    );


    setText(
        "depositAmount",
        formatPreis(
            preise.anzahlung
        )
    );


    setText(
        "remainingAmount",
        formatPreis(
            preise.restbetrag
        )
    );
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


    /*
     * Mitarbeiter muss verfügbar sein.
     */

    if (
        currentEmployee.is_available !== true
    ) {

        showError(
            "Du bist aktuell nicht verfügbar."
        );

        return;
    }


    /*
     * Bereits zugewiesen?
     */

    if (
        currentOrder.assigned_employee_id
    ) {

        showError(
            "Dieser Auftrag wurde bereits übernommen."
        );

        await loadOrder();

        renderOrder();

        await loadRedstoneMaterials();

        renderPrices();

        return;
    }


    /*
     * Nur offene Aufträge dürfen
     * übernommen werden.
     */

    if (
        String(
            currentOrder.status || ""
        ).toLowerCase() !== "offen"
    ) {

        showError(
            "Dieser Auftrag ist nicht mehr offen."
        );

        return;
    }


    const button =
        element(
            "acceptOrderButton"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Wird übernommen...";
    }


    /*
     * assigned_employee_id verwenden.
     *
     * Gleichzeitig wird geprüft,
     * dass der Auftrag noch offen und
     * noch keinem Mitarbeiter zugewiesen ist.
     */

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                SUPABASE_TABLE_ORDERS
            )
            .update({

                assigned_employee_id:
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
            .is(
                "assigned_employee_id",
                null
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

        updateEmployeeControls();

        return;
    }


    /*
     * Keine Zeile geändert:
     * Auftrag wurde wahrscheinlich
     * gleichzeitig von jemand anderem übernommen.
     */

    if (!data) {

        showError(
            "Der Auftrag wurde bereits von einem anderen Mitarbeiter übernommen."
        );


        await loadOrder();

        renderOrder();

        await loadRedstoneMaterials();

        renderPrices();

        return;
    }


    currentOrder =
        data;


    renderOrder();

    await loadRedstoneMaterials();

    renderPrices();

    updateEmployeeControls();


    showSuccess(
        "Der Redstone-Auftrag wurde erfolgreich übernommen."
    );
}


/* =========================================================
   MITARBEITER-STEUERUNG
   ========================================================= */

function updateEmployeeControls() {

    const button =
        element(
            "acceptOrderButton"
        );


    const statusText =
        element(
            "employeeStatusText"
        );


    if (!button) {
        return;
    }


    const assignedId =
        currentOrder
            ?.assigned_employee_id;


    /*
     * Dieser Mitarbeiter ist Bearbeiter.
     */

    if (
        assignedId &&
        currentUser &&
        String(assignedId) ===
        String(currentUser.id)
    ) {

        button.disabled =
            true;

        button.textContent =
            "✓ Auftrag übernommen";


        if (statusText) {

            statusText.textContent =
                "Du bist der Bearbeiter dieses Auftrags.";
        }


        updateMaterialControls();

        return;
    }


    /*
     * Ein anderer Mitarbeiter ist Bearbeiter.
     */

    if (
        assignedId &&
        (
            !currentUser ||
            String(assignedId) !==
            String(currentUser.id)
        )
    ) {

        button.disabled =
            true;

        button.textContent =
            "Auftrag bereits übernommen";


        if (statusText) {

            statusText.textContent =
                "Dieser Auftrag wird bereits von einem anderen Mitarbeiter bearbeitet.";
        }


        updateMaterialControls();

        return;
    }


    /*
     * Auftrag ist nicht offen.
     */

    if (
        String(
            currentOrder?.status || ""
        ).toLowerCase() !== "offen"
    ) {

        button.disabled =
            true;

        button.textContent =
            "Auftrag nicht verfügbar";


        if (statusText) {

            statusText.textContent =
                "Dieser Auftrag kann aktuell nicht übernommen werden.";
        }


        updateMaterialControls();

        return;
    }


    /*
     * Mitarbeiter nicht verfügbar.
     */

    if (
        !currentEmployee ||
        currentEmployee.is_available !== true
    ) {

        button.disabled =
            true;

        button.textContent =
            "Nicht verfügbar";


        if (statusText) {

            statusText.textContent =
                "Setze deinen Mitarbeiterstatus auf verfügbar, um Aufträge zu übernehmen.";
        }


        updateMaterialControls();

        return;
    }


    /*
     * Auftrag kann übernommen werden.
     */

    button.disabled =
        false;

    button.textContent =
        "✓ Auftrag übernehmen";


    if (statusText) {

        statusText.textContent =
            "Dieser Auftrag kann übernommen werden.";
    }


    updateMaterialControls();
}


/* =========================================================
   MATERIAL-STEUERUNG
   ========================================================= */

function updateMaterialControls() {

    const addButton =
        element(
            "addMaterialButton"
        );


    const editor =
        element(
            "materialEditor"
        );


    const bearbeiter =
        isCurrentBearbeiter();


    if (addButton) {

        addButton.style.display =
            bearbeiter
                ? ""
                : "none";
    }


    if (!bearbeiter && editor) {

        editor.style.display =
            "none";
    }
}


/* =========================================================
   STATUS-FORTSCHRITT
   ========================================================= */

function renderProgress() {

    const steps = [

        element(
            "progressOpen"
        ),

        element(
            "progressWorking"
        ),

        element(
            "progressCompleted"
        ),

        element(
            "progressPaid"
        )
    ];


    steps.forEach(
        step => {

            if (step) {

                step.classList.remove(
                    "active"
                );
            }
        }
    );


    const status =
        String(
            currentOrder?.status || ""
        ).toLowerCase();


    let count = 1;


    if (
        status.includes(
            "bearbeitung"
        )
    ) {

        count = 2;

    } else if (
        status.includes(
            "abgeschlossen"
        )
    ) {

        count = 3;

    } else if (
        status.includes(
            "bezahlt"
        )
    ) {

        count = 4;
    }


    for (
        let i = 0;
        i < count;
        i++
    ) {

        if (steps[i]) {

            steps[i].classList.add(
                "active"
            );
        }
    }
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    const addButton =
        element(
            "addMaterialButton"
        );


    if (addButton) {

        addButton.addEventListener(
            "click",
            async () => {

                if (
                    !isCurrentBearbeiter()
                ) {

                    showError(
                        "Du musst den Auftrag zuerst übernehmen."
                    );

                    return;
                }


                selectedMaterialId =
                    null;


                const select =
                    element(
                        "materialSelect"
                    );


                if (select) {

                    select.value =
                        "";
                }


                const quantity =
                    element(
                        "materialQuantity"
                    );


                if (quantity) {

                    quantity.value =
                        "1";
                }


                const saveButton =
                    element(
                        "saveMaterialButton"
                    );


                if (saveButton) {

                    saveButton.textContent =
                        "Material speichern";
                }


                openMaterialEditor();

                hideError();

                hideSuccess();
            }
        );
    }


    const saveButton =
        element(
            "saveMaterialButton"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveMaterial
        );
    }


    const cancelButton =
        element(
            "cancelMaterialButton"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeMaterialEditor
        );
    }


    const acceptButton =
        element(
            "acceptOrderButton"
        );


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

async function initRedstoneDetails() {

    try {

        hideError();

        hideSuccess();


        await loadUser();

        if (!currentUser) {
            return;
        }


        await loadEmployee();

        await loadOrder();


        /*
         * Preise aus redstone_prices laden.
         */

        await loadRedstonePrices();


        /*
         * Materialien des Auftrags laden.
         */

        await loadRedstoneMaterials();


        /*
         * Auftrag darstellen.
         */

        renderOrder();


        /*
         * Preise darstellen.
         */

        renderPrices();


        /*
         * Buttons aktivieren.
         */

        setupEvents();

        updateEmployeeControls();

        renderProgress();


    } catch (error) {

        console.error(
            "Redstone Details Fehler:",
            error
        );


        showError(
            error?.message ||
            "Der Redstone-Auftrag konnte nicht geladen werden."
        );
    }
}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initRedstoneDetails
);
