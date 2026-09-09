document.addEventListener("DOMContentLoaded", async () => {

    const supabase = window.supabaseClient;

    // ============================================================
    // FORMULARELEMENTE
    // ============================================================

    const form =
        document.getElementById("materialForm");

    const categorySelect =
        document.getElementById("category");

    const materialSearch =
        document.getElementById("materialSearch");

    const materialSelect =
        document.getElementById("material");

    const amountInput =
        document.getElementById("amount");

    const amountUnit =
        document.getElementById("amountUnit");

    const priceInput =
        document.getElementById("price");

    const totalInput =
        document.getElementById("total");

    const displayPrice =
        document.getElementById("displayPrice");

    const displayTotal =
        document.getElementById("displayTotal");

    const noteInput =
        document.getElementById("note");

    const addButton =
        document.getElementById("addButton");

    const cartTable =
        document.querySelector("#cartTable tbody");

    const cartTotal =
        document.getElementById("cartTotal");

    const submitTotal =
        document.getElementById("submitTotal");

    const submitDeposit =
        document.getElementById("submitDeposit");

    const submitRemaining =
        document.getElementById("submitRemaining");


    // ============================================================
    // VERZAUBERUNG
    // ============================================================

    const enchantmentSection =
        document.getElementById("enchantmentSection");

    const enchantmentApplyArea =
        document.getElementById("enchantmentApplyArea");

    const enchantmentEquipment =
        document.getElementById("enchantmentEquipment");

    const enchantmentList =
        document.getElementById("enchantmentList");

    const enchantmentModeInputs =
        document.querySelectorAll(
            'input[name="enchantmentMode"]'
        );

    const ENCHANTMENT_FEE = 30000;


    // ============================================================
    // WARENKORB
    // ============================================================

    let cart = [];

    let items = [];


    // ============================================================
    // HILFSFUNKTION: GELD
    // ============================================================

    function formatMoney(value) {

        return Number(value || 0).toLocaleString(
            "de-DE",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ) + " $";

    }


    // ============================================================
    // ITEMS AUS EHRENMARKT LADEN
    // ============================================================

    const {
        data,
        error
    } = await supabase
        .from("items")
        .select("*")
        .eq("active", true)
        .order("category")
        .order("name");


    if (error) {

        console.error(
            "Fehler beim Laden der Items:",
            error
        );

        alert(
            "Die Items konnten nicht geladen werden."
        );

        return;
    }


    items = data || [];


    // ============================================================
    // KATEGORIEN ERSTELLEN
    // ============================================================

    const categories = [
        ...new Set(
            items
                .map(item => item.category)
                .filter(Boolean)
        )
    ];


    categories.forEach(category => {

        const option =
            document.createElement("option");

        option.value = category;

        option.textContent = category;

        categorySelect.appendChild(option);

    });


    // ============================================================
    // ITEMS FILTERN
    // ============================================================

    function updateMaterialList() {

        materialSelect.innerHTML =
            '<option value="">Material auswählen...</option>';


        const search =
            materialSearch.value
                .trim()
                .toLowerCase();


        const category =
            categorySelect.value;


        const filtered =
            items.filter(item => {

                const matchesSearch =
                    !search ||
                    String(item.name || "")
                        .toLowerCase()
                        .includes(search);


                const matchesCategory =
                    !category ||
                    item.category === category;


                return matchesSearch &&
                    matchesCategory;

            });


        filtered.forEach(item => {

            const option =
                document.createElement("option");

            option.value = item.id;

            option.textContent =
                item.name;

            materialSelect.appendChild(
                option
            );

        });

    }


    // ============================================================
    // KATEGORIE GEÄNDERT
    // ============================================================

    categorySelect.addEventListener(
        "change",
        () => {

            materialSelect.value = "";

            materialSearch.value = "";

            resetPrice();

            updateMaterialList();

            updateEnchantmentVisibility();

        }
    );


    // ============================================================
    // SUCHE
    // ============================================================

    materialSearch.addEventListener(
        "input",
        () => {

            updateMaterialList();

            resetPrice();

            materialSelect.value = "";

            updateEnchantmentVisibility();

        }
    );


    // ============================================================
    // PREIS ZURÜCKSETZEN
    // ============================================================

    function resetPrice() {

        if (displayPrice) {
            displayPrice.textContent = "0,00 $";
        }

        if (displayTotal) {
            displayTotal.textContent = "0,00 $";
        }

        if (priceInput) {
            priceInput.value = "";
        }

        if (totalInput) {
            totalInput.value = "";
        }

    }


    // ============================================================
    // VERZAUBERUNG EIN-/AUSBLENDEN
    // ============================================================

    function updateEnchantmentVisibility() {

        if (!enchantmentSection) {
            return;
        }


        if (materialSelect.value) {

            enchantmentSection.style.display =
                "block";

        } else {

            enchantmentSection.style.display =
                "none";

            resetEnchantmentArea();

        }

    }


    // ============================================================
    // VERZAUBERUNGSBEREICH ZURÜCKSETZEN
    // ============================================================

    function resetEnchantmentArea() {

        const noneRadio =
            document.querySelector(
                'input[name="enchantmentMode"][value="none"]'
            );


        if (noneRadio) {
            noneRadio.checked = true;
        }


        if (enchantmentApplyArea) {

            enchantmentApplyArea.style.display =
                "none";

        }


        if (enchantmentEquipment) {

            enchantmentEquipment.value = "";

        }


        if (enchantmentList) {

            enchantmentList.value = "";

        }

    }


    // ============================================================
    // VERZAUBERUNGSMODUS
    // ============================================================

    enchantmentModeInputs.forEach(
        input => {

            input.addEventListener(
                "change",
                () => {

                    if (
                        input.value === "apply"
                    ) {

                        if (enchantmentApplyArea) {

                            enchantmentApplyArea.style.display =
                                "block";

                        }

                    } else {

                        if (enchantmentApplyArea) {

                            enchantmentApplyArea.style.display =
                                "none";

                        }

                        if (enchantmentEquipment) {

                            enchantmentEquipment.value =
                                "";

                        }

                        if (enchantmentList) {

                            enchantmentList.value =
                                "";

                        }

                    }

                }
            );

        }
    );


    // ============================================================
    // ITEM AUSGEWÄHLT
    // ============================================================

    materialSelect.addEventListener(
        "change",
        () => {

            updatePrice();

            updateEnchantmentVisibility();

        }
    );


    // ============================================================
    // PREIS BERECHNEN
    // ============================================================

    function updatePrice() {

        const item =
            items.find(
                entry =>
                    String(entry.id) ===
                    String(materialSelect.value)
            );


        if (!item) {

            resetPrice();

            return;

        }


        const amount =
            Number(amountInput.value) || 0;


        const unit =
            amountUnit?.value || "stack";


        // Preis aus der items-Tabelle
        const piecePrice =
            Number(item.price) || 0;


        let quantity = amount;


        // 1 Stack = 64 Items
        if (unit === "stack") {

            quantity =
                amount * 64;

        }


        const total =
            piecePrice * quantity;


        if (displayPrice) {

            displayPrice.textContent =
                formatMoney(piecePrice);

        }


        if (displayTotal) {

            displayTotal.textContent =
                formatMoney(total);

        }


        if (priceInput) {

            priceInput.value =
                piecePrice;

        }


        if (totalInput) {

            totalInput.value =
                total;

        }

    }


    // ============================================================
    // MENGE GEÄNDERT
    // ============================================================

    amountInput.addEventListener(
        "input",
        updatePrice
    );


    // ============================================================
    // EINHEIT GEÄNDERT
    // ============================================================

    if (amountUnit) {

        amountUnit.addEventListener(
            "change",
            updatePrice
        );

    }


    // ============================================================
    // WARENKORB GESAMTSUMME
    // ============================================================

    function getCartTotal() {

        return cart.reduce(
            (sum, item) =>
                sum +
                Number(item.total || 0),
            0
        );

    }


    // ============================================================
    // ZAHLUNGEN AKTUALISIEREN
    // ============================================================

    function updatePaymentSummary() {

        const grandTotal =
            getCartTotal();


        const deposit =
            grandTotal * 0.25;


        const remaining =
            grandTotal * 0.75;


        if (cartTotal) {

            cartTotal.textContent =
                formatMoney(grandTotal);

        }


        if (submitTotal) {

            submitTotal.textContent =
                formatMoney(grandTotal);

        }


        if (submitDeposit) {

            submitDeposit.textContent =
                formatMoney(deposit);

        }


        if (submitRemaining) {

            submitRemaining.textContent =
                formatMoney(remaining);

        }

              }

            // ============================================================
    // WARENKORB ZEICHNEN
    // ============================================================

    function renderCart() {

        cartTable.innerHTML = "";


        cart.forEach((item, index) => {

            const row =
                document.createElement("tr");


            // ----------------------------------------------------
            // VERZAUBERUNG ANZEIGEN
            // ----------------------------------------------------

            let enchantmentText =
                "Keine";


            if (
                item.enchantment &&
                item.enchantment.mode === "apply"
            ) {

                enchantmentText =
                    `✨ ${item.enchantment.equipment}
                     <br>
                     📖 ${item.enchantment.list}
                     <br>
                     <small>
                     +${formatMoney(ENCHANTMENT_FEE)}
                     </small>`;

            }


            // ----------------------------------------------------
            // MENGENANZEIGE
            // ----------------------------------------------------

            let quantityText =
                `${item.amount} ${item.unitLabel}`;


            if (item.unit === "stack") {

                quantityText +=
                    `<br><small>(${item.quantity} Stück)</small>`;

            }


            // ----------------------------------------------------
            // ZEILE
            // ----------------------------------------------------

            row.innerHTML = `

                <td>
                    ${item.name}
                </td>

                <td>
                    ${quantityText}
                </td>

                <td>
                    ${formatMoney(item.price)}
                </td>

                <td>
                    ${enchantmentText}
                </td>

                <td>
                    ${formatMoney(item.total)}
                </td>

                <td>

                    <button
                        type="button"
                        class="removeItem"
                        data-index="${index}"
                    >
                        Entfernen
                    </button>

                </td>

            `;


            cartTable.appendChild(row);

        });


        // --------------------------------------------------------
        // ENTFERNEN-BUTTONS
        // --------------------------------------------------------

        document
            .querySelectorAll(".removeItem")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                button.dataset.index
                            );


                        cart.splice(index, 1);


                        renderCart();

                    }
                );

            });


        updatePaymentSummary();

    }


    // ============================================================
    // ITEM ZUM AUFTRAG HINZUFÜGEN
    // ============================================================

    addButton.addEventListener(
        "click",
        () => {

            const item =
                items.find(
                    entry =>
                        String(entry.id) ===
                        String(materialSelect.value)
                );


            // ----------------------------------------------------
            // ITEM PRÜFEN
            // ----------------------------------------------------

            if (!item) {

                alert(
                    "Bitte zuerst ein Material auswählen."
                );

                return;

            }


            // ----------------------------------------------------
            // MENGE PRÜFEN
            // ----------------------------------------------------

            const amount =
                Number(amountInput.value);


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                alert(
                    "Bitte eine gültige Menge eingeben."
                );

                return;

            }


            // Nur ganze Mengen
            if (!Number.isInteger(amount)) {

                alert(
                    "Bitte eine ganze Menge eingeben."
                );

                return;

            }


            // ----------------------------------------------------
            // EINHEIT
            // ----------------------------------------------------

            const unit =
                amountUnit?.value || "stack";


            const unitLabel =
                unit === "stack"
                    ? "Stack"
                    : "Stück";


            // ----------------------------------------------------
            // STÜCKZAHL BERECHNEN
            // ----------------------------------------------------

            const quantity =
                unit === "stack"
                    ? amount * 64
                    : amount;


            // ----------------------------------------------------
            // PREIS PRO STÜCK
            // ----------------------------------------------------

            const price =
                Number(item.price) || 0;


            // ----------------------------------------------------
            // GRUNDPREIS
            // ----------------------------------------------------

            const materialTotal =
                quantity * price;


            // ----------------------------------------------------
            // VERZAUBERUNG
            // ----------------------------------------------------

            const selectedMode =
                document.querySelector(
                    'input[name="enchantmentMode"]:checked'
                )?.value || "none";


            let enchantment = null;

            let enchantmentFee = 0;


            // ----------------------------------------------------
            // VERZAUBERUNG ANWENDEN
            // ----------------------------------------------------

            if (
                selectedMode === "apply"
            ) {

                const equipment =
                    enchantmentEquipment
                        ?.value
                        ?.trim();


                const enchantments =
                    enchantmentList
                        ?.value
                        ?.trim();


                if (!equipment) {

                    alert(
                        "Bitte wähle das Item aus, das verzaubert werden soll."
                    );

                    return;

                }


                if (!enchantments) {

                    alert(
                        "Bitte gib die gewünschten Verzauberungen ein."
                    );

                    return;

                }


                // 30.000 $ pro verzaubertem Item
                enchantmentFee =
                    ENCHANTMENT_FEE;


                enchantment = {

                    mode: "apply",

                    equipment:
                        equipment,

                    list:
                        enchantments,

                    fee:
                        enchantmentFee

                };

            }


            // ----------------------------------------------------
            // GESAMTPREIS
            // ----------------------------------------------------

            const itemTotal =
                materialTotal +
                enchantmentFee;


            // ----------------------------------------------------
            // NORMALE ITEMS ZUSAMMENFASSEN
            // ----------------------------------------------------

            if (!enchantment) {

                const existing =
                    cart.find(
                        cartItem =>
                            cartItem.material_id ===
                                item.id &&
                            cartItem.unit ===
                                unit &&
                            !cartItem.enchantment
                    );


                if (existing) {

                    existing.amount +=
                        amount;


                    existing.quantity +=
                        quantity;


                    existing.total =
                        existing.quantity *
                        existing.price;


                } else {

                    cart.push({

                        material_id:
                            item.id,

                        name:
                            item.name,

                        amount:
                            amount,

                        quantity:
                            quantity,

                        unit:
                            unit,

                        unitLabel:
                            unitLabel,

                        price:
                            price,

                        total:
                            itemTotal,

                        enchantment:
                            null

                    });

                }


            } else {

                // ------------------------------------------------
                // VERZAUBERTES ITEM IMMER EIGENE POSITION
                // ------------------------------------------------

                cart.push({

                    material_id:
                        item.id,

                    name:
                        item.name,

                    amount:
                        amount,

                    quantity:
                        quantity,

                    unit:
                        unit,

                    unitLabel:
                        unitLabel,

                    price:
                        price,

                    total:
                        itemTotal,

                    enchantment:
                        enchantment

                });

            }


            // ----------------------------------------------------
            // WARENKORB AKTUALISIEREN
            // ----------------------------------------------------

            renderCart();


            // ----------------------------------------------------
            // FORMULAR ZURÜCKSETZEN
            // ----------------------------------------------------

            amountInput.value = 1;


            resetPrice();


            materialSelect.value =
                "";


            resetEnchantmentArea();


            updateEnchantmentVisibility();

        }
    );


    // ============================================================
    // STARTZUSTAND
    // ============================================================

    updateMaterialList();


    if (enchantmentSection) {

        enchantmentSection.style.display =
            "none";

    }


    resetEnchantmentArea();


    updatePaymentSummary();

        // ============================================================
    // AUFTRAG ABSENDEN
    // ============================================================

    form.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            // ----------------------------------------------------
            // WARENKORB PRÜFEN
            // ----------------------------------------------------

            if (cart.length === 0) {

                alert(
                    "Bitte füge zuerst mindestens ein Material zum Auftrag hinzu."
                );

                return;

            }


            // ----------------------------------------------------
            // BENUTZER ABFRAGEN
            // ----------------------------------------------------

            const {
                data: {
                    user
                },
                error: userError
            } =
                await supabase.auth.getUser();


            if (userError || !user) {

                alert(
                    "Bitte zuerst anmelden."
                );

                return;

            }


            // ----------------------------------------------------
            // MINECRAFT-NAMEN AUS PROFILES LADEN
            // ----------------------------------------------------

            const {
                data: profile,
                error: profileError
            } =
                await supabase
                    .from("profiles")
                    .select("minecraft_name")
                    .eq("user_id", user.id)
                    .maybeSingle();


            if (profileError) {

                console.error(
                    "Fehler beim Laden des Profils:",
                    profileError
                );

            }


            const minecraftName =
                profile?.minecraft_name ||
                "Unbekannt";


            // ----------------------------------------------------
            // GESAMTSUMME
            // ----------------------------------------------------

            const grandTotal =
                getCartTotal();


            if (grandTotal <= 0) {

                alert(
                    "Der Gesamtpreis muss größer als 0 $ sein."
                );

                return;

            }


            // ----------------------------------------------------
            // ANZAHLUNG / RESTBETRAG
            // ----------------------------------------------------

            const deposit =
                grandTotal * 0.25;


            const remaining =
                grandTotal * 0.75;


            // ----------------------------------------------------
            // AUFTRAGSNUMMER ERSTELLEN
            // ----------------------------------------------------

            const randomNumber =
                Math.floor(
                    Math.random() * 9000
                ) + 1000;


            const orderNumber =
                `EM-MAT-${randomNumber}`;


            // ----------------------------------------------------
            // NOTIZEN
            // ----------------------------------------------------

            let orderNotes =
                noteInput?.value?.trim() || "";


            // ----------------------------------------------------
            // VERZAUBERUNGEN IN DIE NOTIZ ÜBERNEHMEN
            // ----------------------------------------------------

            const enchantmentItems =
                cart.filter(
                    item =>
                        item.enchantment &&
                        item.enchantment.mode ===
                            "apply"
                );


            if (
                enchantmentItems.length > 0
            ) {

                if (orderNotes) {

                    orderNotes +=
                        "\n\n";

                }


                orderNotes +=
                    "✨ VERZAUBERUNGEN\n";


                enchantmentItems.forEach(
                    (item, index) => {

                        orderNotes +=
                            `\nItem ${index + 1}: ` +
                            `${item.enchantment.equipment}\n`;


                        orderNotes +=
                            `Verzauberungen: ` +
                            `${item.enchantment.list}\n`;


                        orderNotes +=
                            `Verzauberungsgebühr: ` +
                            `${formatMoney(ENCHANTMENT_FEE)}\n`;


                        orderNotes +=
                            "Verzauberungsbücher: " +
                            "vom Kunden bereitgestellt\n";

                    }
                );

            }


            // ----------------------------------------------------
            // BESTELLUNG IN ORDERS SPEICHERN
            // ----------------------------------------------------

            const {
                data: order,
                error: orderError
            } =
                await supabase
                    .from("orders")
                    .insert({

                        user_id:
                            user.id,

                        minecraft_name:
                            minecraftName,

                        order_number:
                            orderNumber,

                        status:
                            "Offen",

                        total_price:
                            grandTotal,

                        notes:
                            orderNotes

                    })
                    .select()
                    .single();


            if (orderError) {

                console.error(
                    "Fehler beim Erstellen des Auftrags:",
                    orderError
                );


                alert(
                    "Der Auftrag konnte nicht erstellt werden:\n\n" +
                    orderError.message
                );

                return;

            }


            // ----------------------------------------------------
            // BESTELLPOSITIONEN SPEICHERN
            // ----------------------------------------------------

            const orderItems =
                cart.map(item => ({

                    order_id:
                        order.id,

                    material_id:
                        item.material_id,

                    quantity:
                        item.quantity

                }));


            const {
                error: itemError
            } =
                await supabase
                    .from("order_items")
                    .insert(
                        orderItems
                    );


            if (itemError) {

                console.error(
                    "Fehler beim Speichern der Positionen:",
                    itemError
                );


                alert(
                    "Der Auftrag wurde erstellt, " +
                    "aber die Positionen konnten nicht gespeichert werden:\n\n" +
                    itemError.message
                );

                return;

            }


            // ----------------------------------------------------
            // PORTAL-BENACHRICHTIGUNG
            // ----------------------------------------------------

            try {

                const materialListe =
                    cart
                        .map(
                            item =>
                                `${item.name} x${item.quantity}`
                        )
                        .join(", ");


                await fetch(
                    "https://wvytteiqpwistcdcifcj.supabase.co/functions/v1/smooth-responder",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                typ:
                                    "Bestellung",

                                titel:
                                    `Neue Materialbestellung ${orderNumber}`,

                                kunde:
                                    minecraftName,

                                bearbeiter:
                                    "Noch nicht zugewiesen",

                                preis:
                                    formatMoney(
                                        grandTotal
                                    ),

                                status:
                                    "Offen",

                                auftrag:
                                    orderNumber,

                                nachricht:
                                    `Bestellte Materialien: ${materialListe}` +
                                    (
                                        orderNotes
                                            ? `\n\nNotiz: ${orderNotes}`
                                            : ""
                                    ),

                                portal_url:
                                    "https://ehrenmarkt.vercel.app",

                                bild_url:
                                    ""

                            })
                    }
                );

            } catch (
                notificationError
            ) {

                console.error(
                    "Fehler bei der Portal-Benachrichtigung:",
                    notificationError
                );

            }


            // ----------------------------------------------------
            // DATEN FÜR ERFOLGSSEITE SPEICHERN
            // ----------------------------------------------------

            sessionStorage.setItem(
                "material_order_number",
                orderNumber
            );


            sessionStorage.setItem(
                "material_order_price",
                grandTotal.toFixed(2)
            );


            sessionStorage.setItem(
                "material_order_deposit",
                deposit.toFixed(2)
            );


            sessionStorage.setItem(
                "material_order_remaining",
                remaining.toFixed(2)
            );


            sessionStorage.setItem(
                "material_order_minecraft_name",
                minecraftName
            );


            // ----------------------------------------------------
            // ERFOLGSSEITE
            // ----------------------------------------------------

            window.location.href =
                "material_erfolgreich.html";

        }
    );

});
