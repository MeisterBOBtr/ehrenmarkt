// ======================================================
// BAUAUFTRAG DETAILS – TEIL 1 VON 5
// Grundstruktur, Variablen und Hilfsfunktionen
// ======================================================

(() => {
    "use strict";

    window.BauauftragDetails = window.BauauftragDetails || {};

    const app = window.BauauftragDetails;

    app.supabase =
        window.supabaseClient ||
        window.supabase;

    app.order = null;
    app.materials = [];
    app.items = [];
    app.currentUser = null;
    app.initialized = false;

    app.getElement = function (id) {
        return document.getElementById(id);
    };

    app.getOrderId = function () {
        const params = new URLSearchParams(
            window.location.search
        );

        return (
            params.get("id") ||
            params.get("order_id") ||
            params.get("orderId")
        );
    };

    app.formatMoney = function (value) {
        const number = Number(value || 0);

        return number.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + " $";
    };

    app.toNumber = function (value) {
        const number = Number(value);

        return Number.isFinite(number) ? number : 0;
    };

    app.setText = function (id, value) {
        const element = app.getElement(id);

        if (element) {
            element.textContent =
                value === null ||
                value === undefined ||
                value === ""
                    ? "—"
                    : String(value);
        }
    };

    app.showError = function (message) {
        console.error(message);

        const errorElement =
            app.getElement("errorMessage") ||
            app.getElement("errorContainer");

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.hidden = false;
        } else {
            alert(message);
        }
    };

    app.hideError = function () {
        const errorElement =
            app.getElement("errorMessage") ||
            app.getElement("errorContainer");

        if (errorElement) {
            errorElement.textContent = "";
            errorElement.hidden = true;
        }
    };
})();

// ==================== TEIL ZUENDE ====================

// ======================================================
// BAUAUFTRAG DETAILS – TEIL 2 VON 5
// Auftrag, Benutzer und Materialien laden
// ======================================================

(() => {
    "use strict";

    const app = window.BauauftragDetails;

    app.loadCurrentUser = async function () {
        if (!app.supabase) {
            return;
        }

        const result =
            await app.supabase.auth.getUser();

        if (result.error) {
            throw result.error;
        }

        app.currentUser =
            result.data?.user || null;
    };

    app.loadOrder = async function () {
        const orderId = app.getOrderId();

        if (!orderId) {
            throw new Error(
                "Keine Auftrags-ID in der URL gefunden."
            );
        }

        const result =
            await app.supabase
                .from("build_orders")
                .select("*")
                .eq("id", orderId)
                .single();

        if (result.error) {
            throw result.error;
        }

        app.order = result.data;
    };

    app.loadMaterials = async function () {
        if (!app.order?.id) {
            app.materials = [];
            return;
        }

        const result =
            await app.supabase
                .from("build_order_materials")
                .select(`
                    *,
                    items (
                        id,
                        name,
                        category,
                        price,
                        unit,
                        description,
                        image,
                        active
                    )
                `)
                .eq("build_order_id", app.order.id)
                .order("id", {
                    ascending: true
                });

        if (result.error) {
            throw result.error;
        }

        app.materials = result.data || [];
    };

    app.loadItems = async function () {
        const result =
            await app.supabase
                .from("items")
                .select(`
                    id,
                    name,
                    category,
                    price,
                    unit,
                    description,
                    image,
                    active
                `)
                .eq("active", true)
                .order("name", {
                    ascending: true
                });

        if (result.error) {
            throw result.error;
        }

        app.items = result.data || [];
    };
})();

// ==================== TEIL ZUENDE ====================

// ======================================================
// BAUAUFTRAG DETAILS – TEIL 3 VON 5
// Auftragsdaten und Preisübersicht anzeigen
// ======================================================

(() => {
    "use strict";

    const app = window.BauauftragDetails;

    app.renderOrder = function () {
        const order = app.order;

        if (!order) {
            return;
        }

        app.setText("orderNumber", order.order_number);

        // Auftragsdatum
app.setText(
    "orderDate",
    order.created_at
        ? new Date(order.created_at).toLocaleDateString("de-DE")
        : "—"
);

// Auftraggeber – aktuell wird der Minecraft-Name verwendet,
// da build_orders keinen separaten Kundennamen enthält
app.setText("customerName", order.minecraft_name);

// Materialbereitstellung
app.setText(
    "materialProvider",
    order.material_procurement === true
        ? "Falkenstein"
        : order.material_procurement === false
            ? "Kunde"
            : "—"
);
        
        app.setText("minecraftName", order.minecraft_name);
app.setText("contactType", order.contact_type);
app.setText("contactValue", order.contact_value);
app.setText("buildingType", order.building_type);

app.setText("mergeWidth", order.merge_width);
app.setText("mergeHeight", order.merge_height);
app.setText("plotCount", order.plot_count);

app.setText("buildingLength", order.building_length);
app.setText("buildingWidth", order.building_width);
app.setText("buildingHeight", order.building_height);
app.setText("buildingFloors", order.building_floors);

app.setText("buildingStyle", order.building_style);
app.setText("blockPalette", order.block_palette);
app.setText("specialBlocks", order.special_blocks);

app.setText("interiorLevel", order.interior_level);
app.setText("interiorPercent", `${order.interior_percent ?? 0} %`);

app.setText("exteriorLevel", order.exterior_level);
app.setText("exteriorPercent", `${order.exterior_percent ?? 0} %`);

app.setText("lightingLevel", order.lighting_level);
app.setText("lightingPercent", `${order.lighting_percent ?? 0} %`);

app.setText("terraformingLevel", order.terraforming_level);
app.setText(
    "terraformingPercent",
    `${order.terraforming_percent ?? 0} %`
);

app.setText(
    "planningDescription",
    order.planning_description
);

app.setText("description", order.description);
app.setText("specialRequests", order.special_requests);
app.setText("location", order.location);
app.setText("priority", order.priority);
app.setText("status", order.status);
app.setText("progress", `${order.progress ?? 0} %`);

        app.setText(
            "basePrice",
            app.formatMoney(order.base_price)
        );

        app.setText(
            "addonPrice",
            app.formatMoney(order.addon_price)
        );

        app.setText(
            "provisionalPrice",
            app.formatMoney(order.provisional_price)
        );

        app.setText(
            "depositPercent",
            order.deposit_percent + " %"
        );

        app.setText(
            "depositAmount",
            app.formatMoney(order.deposit_amount)
        );

        app.setText(
            "remainingPayment",
            app.formatMoney(order.remaining_payment)
        );

        app.setText(
            "materialCost",
            app.formatMoney(order.material_cost)
        );

        app.setText(
            "finalPrice",
            app.formatMoney(order.final_price)
        );

        const referenceContainer =
            app.getElement("referenceContainer");

        if (
            referenceContainer &&
            order.reference_image
        ) {
            referenceContainer.innerHTML = "";

            const image =
                document.createElement("img");

            image.src = order.reference_image;
            image.alt = "Referenzbild";
            image.loading = "lazy";
            image.style.maxWidth = "100%";

            referenceContainer.appendChild(image);
        }
    };

    app.calculatePrices = function () {
        if (!app.order) {
            return;
        }

        const basePrice =
            app.toNumber(app.order.base_price);

        const addonPrice =
            app.toNumber(app.order.addon_price);

        const materialCost =
            app.materials.reduce(
                (total, material) => {
                    return total +
                        app.toNumber(
                            material.material_total
                        );
                },
                0
            );

        const materialSurcharge =
            app.order.material_procurement
                ? materialCost *
                    (
                        app.toNumber(
                            app.order.material_surcharge
                        ) / 100
                    )
                : 0;

        const finalPrice =
            basePrice +
            addonPrice +
            materialCost +
            materialSurcharge;

        const depositPercent =
            app.toNumber(
                app.order.deposit_percent
            );

        const depositAmount =
            finalPrice * depositPercent / 100;

        const remainingPayment =
            finalPrice - depositAmount;

        app.order.material_cost = materialCost;
        app.order.final_price = finalPrice;
        app.order.deposit_amount = depositAmount;
        app.order.remaining_payment = remainingPayment;

        app.setText(
            "materialCost",
            app.formatMoney(materialCost)
        );

        app.setText(
            "finalPrice",
            app.formatMoney(finalPrice)
        );

        app.setText(
            "depositAmount",
            app.formatMoney(depositAmount)
        );

        app.setText(
            "remainingPayment",
            app.formatMoney(remainingPayment)
        );
    };
})();

// ==================== TEIL ZUENDE ====================

// ======================================================
// BAUAUFTRAG DETAILS – TEIL 4 VON 5
// Verbrauchte Materialien anzeigen und speichern
// ======================================================

(() => {
    "use strict";

    const app = window.BauauftragDetails;

    app.renderMaterials = function () {
        const list =
            app.getElement("materialsList");

        if (!list) {
            return;
        }

        list.innerHTML = "";

        if (!app.materials.length) {
            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td colspan="6">
                    Noch keine Materialien eingetragen.
                </td>
            `;

            list.appendChild(row);
            return;
        }

        app.materials.forEach((material) => {
            const row =
                document.createElement("tr");

            const item =
                material.items || {};

            const quantity =
                app.toNumber(
                    material.used_quantity
                );

            const price =
                app.toNumber(
                    material.price_per_piece ||
                    item.price
                );

            const total =
                quantity * price;

            material.material_total = total;

            row.innerHTML = `
                <td>${item.name || "Unbekannt"}</td>
                <td>${item.unit || "Stück"}</td>
                <td>${quantity}</td>
                <td>${app.formatMoney(price)}</td>
                <td>${app.formatMoney(total)}</td>
                <td>
                    <button
                        type="button"
                        data-material-id="${material.id}"
                        class="remove-material-button">
                        Entfernen
                    </button>
                </td>
            `;

            list.appendChild(row);
        });

        list
            .querySelectorAll(
                ".remove-material-button"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        app.removeMaterial(
                            button.dataset.materialId
                        );
                    }
                );
            });
    };

    app.addMaterial = async function () {
        if (!app.order?.id) {
            return;
        }

        const itemId =
            prompt("Bitte die Item-ID eingeben:");

        if (!itemId) {
            return;
        }

        const quantityText =
            prompt(
                "Bitte die verbrauchte Menge eingeben:"
            );

        const quantity =
            Number(quantityText);

        if (
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            alert(
                "Bitte eine gültige ganze Menge eingeben."
            );

            return;
        }

        const item =
            app.items.find(
                (entry) =>
                    String(entry.id) ===
                    String(itemId)
            );

        if (!item) {
            alert(
                "Dieses Item wurde nicht gefunden."
            );

            return;
        }

        const price =
            app.toNumber(item.price);

        const total =
            quantity * price;

        const result =
            await app.supabase
                .from("build_order_materials")
                .insert({
                    build_order_id: app.order.id,
                    material_id: item.id,
                    provided_quantity: quantity,
                    used_quantity: quantity,
                    remaining_quantity: 0,
                    keep_remaining: false,
                    price_per_piece: price,
                    material_total: total,
                    quantity_value: quantity,
                    quantity_unit: item.unit || "Stück"
                });

        if (result.error) {
            throw result.error;
        }

        await app.refresh();
    };

    app.removeMaterial = async function (materialId) {
        if (!materialId) {
            return;
        }

        const confirmed =
            confirm(
                "Dieses Material wirklich entfernen?"
            );

        if (!confirmed) {
            return;
        }

        const result =
            await app.supabase
                .from("build_order_materials")
                .delete()
                .eq("id", materialId);

        if (result.error) {
            throw result.error;
        }

        await app.refresh();
    };
})();

// ==================== TEIL ZUENDE ====================

// ======================================================
// BAUAUFTRAG DETAILS – TEIL 5 VON 5
// Speichern, Buttons und Initialisierung
// ======================================================

(() => {
    "use strict";

    const app = window.BauauftragDetails;

    app.savePrices = async function () {
        if (!app.order?.id) {
            return;
        }

        const result =
            await app.supabase
                .from("build_orders")
                .update({
                    material_cost:
                        app.order.material_cost,

                    provisional_price:
                        app.order.provisional_price,

                    deposit_amount:
                        app.order.deposit_amount,

                    remaining_payment:
                        app.order.remaining_payment,

                    final_price:
                        app.order.final_price
                })
                .eq("id", app.order.id);

        if (result.error) {
            throw result.error;
        }
    };

    app.acceptOrder = async function () {
        if (!app.order?.id) {
            return;
        }

        const result =
            await app.supabase
                .from("build_orders")
                .update({
                    status: "accepted",
                    assigned_employee_id:
                        app.currentUser?.id || null
                })
                .eq("id", app.order.id);

        if (result.error) {
            throw result.error;
        }

        await app.refresh();
    };

    app.completeOrder = async function () {
        if (!app.order?.id) {
            return;
        }

        const result =
            await app.supabase
                .from("build_orders")
                .update({
                    status: "completed",
                    progress: 100
                })
                .eq("id", app.order.id);

        if (result.error) {
            throw result.error;
        }

        await app.refresh();
    };

    app.refresh = async function () {
        await app.loadOrder();
        await app.loadMaterials();

        app.renderOrder();
        app.renderMaterials();
        app.calculatePrices();
        await app.savePrices();
    };

    app.setupEventListeners = function () {
        const addButton =
            app.getElement("addMaterialButton");

        if (addButton) {
            addButton.addEventListener(
                "click",
                async () => {
                    try {
                        await app.addMaterial();
                    } catch (error) {
                        app.showError(
                            "Material konnte nicht hinzugefügt werden."
                        );

                        console.error(error);
                    }
                }
            );
        }

        const saveButton =
            app.getElement("saveMaterialsButton");

        if (saveButton) {
            saveButton.addEventListener(
                "click",
                async () => {
                    try {
                        await app.refresh();
                        alert(
                            "Materialien wurden gespeichert."
                        );
                    } catch (error) {
                        app.showError(
                            "Materialien konnten nicht gespeichert werden."
                        );

                        console.error(error);
                    }
                }
            );
        }

        const acceptButton =
            app.getElement("acceptOrderButton");

        if (acceptButton) {
            acceptButton.addEventListener(
                "click",
                async () => {
                    try {
                        await app.acceptOrder();
                    } catch (error) {
                        app.showError(
                            "Auftrag konnte nicht übernommen werden."
                        );

                        console.error(error);
                    }
                }
            );
        }

        const completeButton =
            app.getElement("completeOrderButton");

        if (completeButton) {
            completeButton.addEventListener(
                "click",
                async () => {
                    try {
                        await app.completeOrder();
                    } catch (error) {
                        app.showError(
                            "Auftrag konnte nicht abgeschlossen werden."
                        );

                        console.error(error);
                    }
                }
            );
        }
    };

    app.init = async function () {
        if (app.initialized) {
            return;
        }

        app.initialized = true;

        try {
            app.hideError();

            if (!app.supabase) {
                throw new Error(
                    "Supabase ist nicht verfügbar."
                );
            }

            await app.loadCurrentUser();

// Auftrag zuerst laden und sofort anzeigen
await app.loadOrder();
app.renderOrder();

// Materialien separat laden
try {
    await app.loadMaterials();
} catch (error) {
    console.error("Materialien konnten nicht geladen werden:", error);
    app.materials = [];
}

// Items separat laden
try {
    await app.loadItems();
} catch (error) {
    console.error("Items konnten nicht geladen werden:", error);
    app.items = [];
}

// Restliche Anzeige
app.renderMaterials();
app.calculatePrices();
app.setupEventListeners();
            
        } catch (error) {
            app.showError(
                "Der Bauauftrag konnte nicht geladen werden."
            );

            console.error(
                "Initialisierungsfehler:",
                error
            );
        }
    };

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            app.init,
            {
                once: true
            }
        );
    } else {
        app.init();
    }
})();

// ==================== TEIL ZUENDE ====================
