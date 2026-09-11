document.addEventListener("DOMContentLoaded", async () => {

    // =========================================================
    // EHRENMARKT – VERLEIH
    // Teil 1/8
    // =========================================================

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase Client wurde nicht gefunden.");
        return;
    }


    // =========================================================
    // GLOBALE VARIABLEN
    // =========================================================

    let currentUser = null;
    let currentEmployee = null;
    let leihitems = [];
    let aktuelleAusleihen = [];


    // =========================================================
    // HTML-ELEMENTE
    // =========================================================

    const leihitemsContainer =
        document.getElementById("leihitemsContainer");

    const ausleihenContainer =
        document.getElementById("ausleihenContainer");

    const verwaltungBereich =
        document.getElementById("verwaltungBereich");

    const addItemButton =
        document.getElementById("addItemButton");

    const editItemButton =
        document.getElementById("editItemButton");

    const deleteItemButton =
        document.getElementById("deleteItemButton");

    const addItemForm =
        document.getElementById("addItemForm");

    const editItemForm =
        document.getElementById("editItemForm");

    const cancelAddItem =
        document.getElementById("cancelAddItem");

    const cancelEditItem =
        document.getElementById("cancelEditItem");

    const saveNewItemButton =
        document.getElementById("saveNewItemButton");

    const saveEditItemButton =
        document.getElementById("saveEditItemButton");

    const successMessage =
        document.getElementById("successMessage");

    const errorMessage =
        document.getElementById("errorMessage");

    const addItemMessage =
        document.getElementById("addItemMessage");


    // =========================================================
    // HILFSFUNKTIONEN
    // =========================================================

    function zeigeErfolg(message) {

        if (!successMessage) return;

        successMessage.textContent = message;
        successMessage.style.display = "block";

        if (errorMessage) {
            errorMessage.style.display = "none";
        }

    }


    function zeigeFehler(message) {

        if (!errorMessage) return;

        errorMessage.textContent = message;
        errorMessage.style.display = "block";

        if (successMessage) {
            successMessage.style.display = "none";
        }

    }


    function versteckeMeldungen() {

        if (successMessage) {
            successMessage.style.display = "none";
        }

        if (errorMessage) {
            errorMessage.style.display = "none";
        }

    }


    function istLeitung() {

        if (!currentEmployee) {
            return false;
        }

        return (
            currentEmployee.is_active === true &&
            (
                currentEmployee.rang === "Leitung" ||
                currentEmployee.rang === "Stadtleitung"
            )
        );

    }


    // =========================================================
    // START
    // =========================================================

    await ladeVerleihSystem();


    // =========================================================
    // VERLEIHSYSTEM LADEN
    // =========================================================

    async function ladeVerleihSystem() {

        versteckeMeldungen();

        try {

            const {
                data: {
                    user
                },
                error: userError
            } = await supabase.auth.getUser();


            if (userError) {
                throw userError;
            }


            if (!user) {

                currentUser = null;
                currentEmployee = null;

                if (verwaltungBereich) {
                    verwaltungBereich.style.display = "none";
                }

                await ladeLeihitems();
                await ladeAusleihen();

                return;
            }


            currentUser = user;


            // Mitarbeiter des angemeldeten Users suchen
            const {
                data: employee,
                error: employeeError
            } = await supabase
                .from("employees")
                .select("*")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .maybeSingle();


            if (employeeError) {
                throw employeeError;
            }


            currentEmployee = employee || null;


            // Verwaltungsbereich nur für Leitung/Stadtleitung
            if (verwaltungBereich) {

                if (istLeitung()) {
                    verwaltungBereich.style.display = "block";
                } else {
                    verwaltungBereich.style.display = "none";
                }

            }


            await ladeLeihitems();
            await ladeAusleihen();


        } catch (error) {

            console.error(
                "Fehler beim Laden des Verleihsystems:",
                error
            );

            zeigeFehler(
                "Das Verleihsystem konnte nicht vollständig geladen werden."
            );

        }

    }

              // =========================================================
    // VERLEIH-ITEMS LADEN
    // =========================================================

    async function ladeLeihitems() {

        if (!leihitemsContainer) return;

        leihitemsContainer.innerHTML = `
            <div class="loading">
                Verleih-Items werden geladen …
            </div>
        `;


        try {

            const {
                data,
                error
            } = await supabase
                .from("leihitems")
                .select(`
                    id,
                    name,
                    enchants,
                    leihpreis,
                    info,
                    created_at,
                    updated_at
                `)
                .order("name", {
                    ascending: true
                });


            if (error) {
                throw error;
            }


            leihitems = data || [];


            if (leihitems.length === 0) {

                leihitemsContainer.innerHTML = `
                    <div class="empty-state">
                        Aktuell sind keine Items zum Verleih verfügbar.
                    </div>
                `;

                return;
            }


            // Prüfen, welche Items aktuell ausgeliehen sind
            const {
                data: aktiveAusleihen,
                error: ausleihenError
            } = await supabase
                .from("ausleihen")
                .select("leihitem_id");


            if (ausleihenError) {
                throw ausleihenError;
            }


            const ausgelieheneIds =
                new Set(
                    (aktiveAusleihen || [])
                        .map(ausleihe => ausleihe.leihitem_id)
                );


            leihitemsContainer.innerHTML = "";


            leihitems.forEach(item => {

                const istAusgeliehen =
                    ausgelieheneIds.has(item.id);

                const card =
                    document.createElement("article");

                card.className = "item-card";


                const enchants =
                    item.enchants &&
                    item.enchants.trim()
                        ? item.enchants
                        : "Keine besonderen Verzauberungen";


                const info =
                    item.info &&
                    item.info.trim()
                        ? item.info
                        : "Keine weiteren Informationen.";


                card.innerHTML = `

                    <h3>
                        ${escapeHtml(item.name)}
                    </h3>

                    <div class="item-enchants">
                        ${escapeHtml(enchants)}
                    </div>

                    <div class="item-price">
                        ${formatPreis(item.leihpreis)}
                    </div>

                    <div class="item-info">
                        ${escapeHtml(info)}
                    </div>

                    <div class="item-actions">

                        ${
                            istAusgeliehen
                            ? `
                                <button
                                    type="button"
                                    class="secondary-button"
                                    disabled
                                    style="opacity:0.55; cursor:not-allowed;"
                                >
                                    Aktuell verliehen
                                </button>
                            `
                            : `
                                <button
                                    type="button"
                                    class="primary-button"
                                    data-leihitem-id="${item.id}"
                                    data-action="ausleihen"
                                >
                                    Ausleihen
                                </button>
                            `
                        }

                    </div>

                    <div
                        class="loan-panel"
                        id="loan-panel-${item.id}"
                    >

                        <div class="form-group">

                            <label>
                                Anzahl
                            </label>

                            <input
                                type="number"
                                class="quantity-input"
                                id="quantity-${item.id}"
                                min="1"
                                value="1"
                            >

                        </div>

                        <div class="form-group">

                            <label>
                                Leihdauer
                            </label>

                            <select
                                id="duration-${item.id}"
                            >

                                <option value="1">
                                    1 Tag
                                </option>

                                <option value="2">
                                    2 Tage
                                </option>

                                <option value="3">
                                    3 Tage
                                </option>

                            </select>

                        </div>

                        <div class="editor-actions">

                            <button
                                type="button"
                                class="primary-button"
                                data-action="confirm-loan"
                                data-leihitem-id="${item.id}"
                            >
                                Ausleihe bestätigen
                            </button>

                            <button
                                type="button"
                                class="secondary-button"
                                data-action="cancel-loan"
                                data-leihitem-id="${item.id}"
                            >
                                Abbrechen
                            </button>

                        </div>

                    </div>
                `;


                leihitemsContainer.appendChild(card);

            });


            // Buttons für Ausleihe verbinden
            verbindeItemButtons();


        } catch (error) {

            console.error(
                "Fehler beim Laden der Verleih-Items:",
                error
            );

            leihitemsContainer.innerHTML = `
                <div class="empty-state">
                    Die Verleih-Items konnten nicht geladen werden.
                </div>
            `;

        }

    }


    // =========================================================
    // ITEM-BUTTONS
    // =========================================================

    function verbindeItemButtons() {

        const buttons =
            leihitemsContainer.querySelectorAll(
                "[data-action]"
            );


        buttons.forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const action =
                        button.dataset.action;

                    const itemId =
                        Number(
                            button.dataset.leihitemId
                        );


                    if (!itemId) {
                        return;
                    }


                    if (action === "ausleihen") {

                        oeffneLoanPanel(itemId);

                    }


                    if (action === "cancel-loan") {

                        schliesseLoanPanel(itemId);

                    }


                    if (action === "confirm-loan") {

                        await bestaetigeAusleihe(itemId);

                    }

                }
            );

        });

    }


    // =========================================================
    // AUSLEIHPANEL ÖFFNEN
    // =========================================================

    function oeffneLoanPanel(itemId) {

        const panel =
            document.getElementById(
                `loan-panel-${itemId}`
            );


        if (!panel) return;


        // Andere geöffnete Panels schließen
        document
            .querySelectorAll(".loan-panel.active")
            .forEach(element => {

                if (element !== panel) {
                    element.classList.remove("active");
                }

            });


        panel.classList.add("active");


        panel.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    }


    // =========================================================
    // AUSLEIHPANEL SCHLIESSEN
    // =========================================================

    function schliesseLoanPanel(itemId) {

        const panel =
            document.getElementById(
                `loan-panel-${itemId}`
            );


        if (!panel) return;

        panel.classList.remove("active");

    }


    // =========================================================
    // PREIS FORMATIEREN
    // =========================================================

    function formatPreis(preis) {

        const zahl =
            Number(preis) || 0;


        return (
            zahl.toLocaleString(
                "de-DE",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            )
            + " $"
        );

    }


    // =========================================================
    // HTML SICHER DARSTELLEN
    // =========================================================

    function escapeHtml(value) {

        if (value === null || value === undefined) {
            return "";
        }


        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

              }

        // =========================================================
    // AUSLEIHE BESTÄTIGEN
    // =========================================================

    async function bestaetigeAusleihe(itemId) {

        versteckeMeldungen();


        if (!currentUser) {

            zeigeFehler(
                "Du musst angemeldet sein, um ein Item auszuleihen."
            );

            return;
        }


        const item =
            leihitems.find(
                leihitem =>
                    Number(leihitem.id) === Number(itemId)
            );


        if (!item) {

            zeigeFehler(
                "Das ausgewählte Item wurde nicht gefunden."
            );

            return;
        }


        const quantityInput =
            document.getElementById(
                `quantity-${itemId}`
            );


        const durationInput =
            document.getElementById(
                `duration-${itemId}`
            );


        const anzahl =
            Number(
                quantityInput?.value
            );


        const leihdauer =
            Number(
                durationInput?.value
            );


        // -----------------------------------------------------
        // Eingaben prüfen
        // -----------------------------------------------------

        if (
            !Number.isInteger(anzahl) ||
            anzahl < 1
        ) {

            zeigeFehler(
                "Bitte gib eine gültige Anzahl ein."
            );

            return;
        }


        if (
            ![1, 2, 3].includes(leihdauer)
        ) {

            zeigeFehler(
                "Die Leihdauer muss zwischen 1 und 3 Tagen liegen."
            );

            return;
        }


        // -----------------------------------------------------
        // Prüfen, ob das Item bereits ausgeliehen ist
        // -----------------------------------------------------

        const {
            data: bestehendeAusleihe,
            error: pruefError
        } = await supabase
            .from("ausleihen")
            .select("id")
            .eq("leihitem_id", item.id)
            .limit(1);


        if (pruefError) {

            console.error(
                "Fehler bei der Verfügbarkeitsprüfung:",
                pruefError
            );

            zeigeFehler(
                "Die Verfügbarkeit des Items konnte nicht geprüft werden."
            );

            return;
        }


        if (
            bestehendeAusleihe &&
            bestehendeAusleihe.length > 0
        ) {

            zeigeFehler(
                "Dieses Item ist inzwischen bereits ausgeliehen."
            );

            await ladeLeihitems();

            return;
        }


        // -----------------------------------------------------
        // Gesamtpreis berechnen
        // -----------------------------------------------------

        const einzelpreis =
            Number(item.leihpreis) || 0;


        const gesamtpreis =
            einzelpreis * anzahl;


        // -----------------------------------------------------
        // Rückgabedatum berechnen
        // -----------------------------------------------------

        const ausgeliehenAm =
            new Date();


        const rueckgabeBis =
            new Date(
                ausgeliehenAm.getTime()
                +
                (
                    leihdauer
                    *
                    24
                    *
                    60
                    *
                    60
                    *
                    1000
                )
            );


        // -----------------------------------------------------
        // Ausleihe speichern
        // -----------------------------------------------------

        const {
            data: neueAusleihe,
            error: insertError
        } = await supabase
            .from("ausleihen")
            .insert({

                leihitem_id: item.id,

                user_id: currentUser.id,

                anzahl: anzahl,

                leihpreis: gesamtpreis,

                leihdauer: leihdauer,

                ausgeliehen_am:
                    ausgeliehenAm.toISOString(),

                rueckgabe_bis:
                    rueckgabeBis.toISOString()

            })
            .select()
            .single();


        if (insertError) {

            console.error(
                "Fehler beim Erstellen der Ausleihe:",
                insertError
            );


            if (
                insertError.code === "23505"
            ) {

                zeigeFehler(
                    "Dieses Item wurde gerade von jemand anderem ausgeliehen."
                );

            } else {

                zeigeFehler(
                    "Die Ausleihe konnte nicht gespeichert werden."
                );

            }

            return;
        }


        // -----------------------------------------------------
        // Erfolgreich
        // -----------------------------------------------------

        console.log(
            "Ausleihe erstellt:",
            neueAusleihe
        );


        zeigeErfolg(
            `${item.name} wurde erfolgreich ausgeliehen. Rückgabe bis ${formatDatum(rueckgabeBis)}.`
        );


        // Panel schließen
        schliesseLoanPanel(itemId);


        // Daten neu laden
        await ladeLeihitems();
        await ladeAusleihen();

    }


    // =========================================================
    // DATUM FORMATIEREN
    // =========================================================

    function formatDatum(datum) {

        const date =
            datum instanceof Date
                ? datum
                : new Date(datum);


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


    // =========================================================
    // AKTUELLE AUSLEIHEN LADEN
    // =========================================================

    async function ladeAusleihen() {

        if (!ausleihenContainer) return;


        ausleihenContainer.innerHTML = `
            <div class="loading">
                Ausleihen werden geladen …
            </div>
        `;


        try {

            let query =
                supabase
                    .from("ausleihen")
                    .select(`
                        id,
                        leihitem_id,
                        user_id,
                        anzahl,
                        leihpreis,
                        leihdauer,
                        ausgeliehen_am,
                        rueckgabe_bis,
                        created_at,
                        leihitems (
                            name,
                            enchants
                        )
                    `)
                    .order(
                        "rueckgabe_bis",
                        {
                            ascending: true
                        }
                    );


            // -------------------------------------------------
            // Kunden sehen ihre eigenen Ausleihen.
            // Leitung/Stadtleitung kann alle sehen.
            // -------------------------------------------------

            if (!istLeitung()) {

                if (!currentUser) {

                    ausleihenContainer.innerHTML = `
                        <div class="empty-state">
                            Melde dich an, um deine aktuellen Ausleihen zu sehen.
                        </div>
                    `;

                    return;
                }


                query =
                    query.eq(
                        "user_id",
                        currentUser.id
                    );

            }


            const {
                data,
                error
            } = await query;


            if (error) {
                throw error;
            }


            aktuelleAusleihen =
                data || [];


            if (
                aktuelleAusleihen.length === 0
            ) {

                ausleihenContainer.innerHTML = `
                    <div class="empty-state">
                        Aktuell gibt es keine Ausleihen.
                    </div>
                `;

                return;
            }


            renderAusleihen();

        } catch (error) {

            console.error(
                "Fehler beim Laden der Ausleihen:",
                error
            );


            ausleihenContainer.innerHTML = `
                <div class="empty-state">
                    Die aktuellen Ausleihen konnten nicht geladen werden.
                </div>
            `;

        }

    }


    // =========================================================
    // AUSLEIHEN DARSTELLEN
    // =========================================================

    function renderAusleihen() {

        ausleihenContainer.innerHTML = "";


        aktuelleAusleihen.forEach(
            ausleihe => {

                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "ausleihe-card";


                const item =
                    Array.isArray(
                        ausleihe.leihitems
                    )
                    ? ausleihe.leihitems[0]
                    : ausleihe.leihitems;


                const itemName =
                    item?.name ||
                    "Unbekanntes Item";


                const enchants =
                    item?.enchants ||
                    "Keine besonderen Verzauberungen";


                const rueckgabe =
                    new Date(
                        ausleihe.rueckgabe_bis
                    );


                const jetzt =
                    new Date();


                const ueberfaellig =
                    rueckgabe < jetzt;


                card.innerHTML = `

                    <div class="ausleihe-info">

                        <h3>
                            ${escapeHtml(itemName)}
                        </h3>

                        <p>
                            Verzauberungen:
                            <strong>
                                ${escapeHtml(enchants)}
                            </strong>
                        </p>

                        <p>
                            Anzahl:
                            <strong>
                                ${Number(ausleihe.anzahl)}
                            </strong>
                        </p>

                        <p>
                            Leihdauer:
                            <strong>
                                ${Number(ausleihe.leihdauer)} Tag${Number(ausleihe.leihdauer) === 1 ? "" : "e"}
                            </strong>
                        </p>

                        <p>
                            Leihpreis:
                            <strong>
                                ${formatPreis(ausleihe.leihpreis)}
                            </strong>
                        </p>

                        <div
                            class="rueckgabe-info ${ueberfaellig ? "ueberfaellig" : ""}"
                        >
                            ${
                                ueberfaellig
                                ? "Rückgabe überfällig seit: "
                                : "Rückgabe bis: "
                            }

                            ${formatDatum(rueckgabe)}
                        </div>

                    </div>

                    <div class="item-actions">

                        ${
                            (
                                currentUser &&
                                ausleihe.user_id === currentUser.id
                            )
                            ?
                            `
                                <button
                                    type="button"
                                    class="danger-button"
                                    data-rueckgabe-id="${ausleihe.id}"
                                >
                                    Item zurückgeben
                                </button>
                            `
                            :
                            ""
                        }

                    </div>

                `;


                ausleihenContainer.appendChild(
                    card
                );

            }
        );


        verbindeRueckgabeButtons();
        
    }

          // =========================================================
    // RÜCKGABE-BUTTONS VERBINDEN
    // =========================================================

    function verbindeRueckgabeButtons() {

        const buttons =
            ausleihenContainer.querySelectorAll(
                "[data-rueckgabe-id]"
            );


        buttons.forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const ausleiheId =
                        Number(
                            button.dataset.rueckgabeId
                        );


                    if (!ausleiheId) {
                        return;
                    }


                    await rueckgabeAusloesen(
                        ausleiheId
                    );

                }
            );

        });

    }


    // =========================================================
    // ITEM ZURÜCKGEBEN
    // =========================================================

    async function rueckgabeAusloesen(ausleiheId) {

        versteckeMeldungen();


        if (!currentUser) {

            zeigeFehler(
                "Du musst angemeldet sein."
            );

            return;
        }


        const ausleihe =
            aktuelleAusleihen.find(
                eintrag =>
                    Number(eintrag.id) ===
                    Number(ausleiheId)
            );


        if (!ausleihe) {

            zeigeFehler(
                "Die Ausleihe wurde nicht gefunden."
            );

            return;
        }


        // Nur der eigene Nutzer darf seine Ausleihe
        // über diesen Button zurückgeben.
        if (
            ausleihe.user_id !==
            currentUser.id
        ) {

            zeigeFehler(
                "Du kannst nur deine eigenen Ausleihen zurückgeben."
            );

            return;
        }


        const item =
            Array.isArray(ausleihe.leihitems)
                ? ausleihe.leihitems[0]
                : ausleihe.leihitems;


        const itemName =
            item?.name ||
            "dieses Item";


        const bestaetigt =
            window.confirm(
                `Möchtest du ${itemName} wirklich zurückgeben?`
            );


        if (!bestaetigt) {
            return;
        }


        // Button während der Verarbeitung sperren
        const buttons =
            ausleihenContainer.querySelectorAll(
                `[data-rueckgabe-id="${ausleiheId}"]`
            );


        buttons.forEach(button => {

            button.disabled = true;

            button.textContent =
                "Rückgabe wird verarbeitet …";

        });


        try {

            const {
                error
            } = await supabase
                .from("ausleihen")
                .delete()
                .eq("id", ausleiheId)
                .eq(
                    "user_id",
                    currentUser.id
                );


            if (error) {
                throw error;
            }


            zeigeErfolg(
                `${itemName} wurde erfolgreich zurückgegeben.`
            );


            // Verfügbare Items und Ausleihen
            // direkt aktualisieren.
            await ladeLeihitems();

            await ladeAusleihen();


        } catch (error) {

            console.error(
                "Fehler bei der Rückgabe:",
                error
            );


            zeigeFehler(
                "Das Item konnte nicht zurückgegeben werden."
            );


            // Button wieder aktivieren
            buttons.forEach(button => {

                button.disabled = false;

                button.textContent =
                    "Item zurückgeben";

            });

        }

    }


    // =========================================================
    // ITEM HINZUFÜGEN – FORMULAR ÖFFNEN
    // =========================================================

    if (addItemButton) {

        addItemButton.addEventListener(
            "click",
            () => {

                if (!istLeitung()) {

                    zeigeFehler(
                        "Du hast keine Berechtigung, Verleih-Items zu verwalten."
                    );

                    return;
                }


                versteckeMeldungen();


                if (editItemForm) {
                    editItemForm.classList.remove(
                        "active"
                    );
                }


                if (addItemForm) {

                    addItemForm.classList.toggle(
                        "active"
                    );


                    if (
                        addItemForm.classList.contains(
                            "active"
                        )
                    ) {

                        addItemForm.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest"
                        });

                    }

                }

            }
        );

    }


    // =========================================================
    // ITEM-HINZUFÜGEN ABBRECHEN
    // =========================================================

    if (cancelAddItem) {

        cancelAddItem.addEventListener(
            "click",
            () => {

                if (addItemForm) {

                    addItemForm.classList.remove(
                        "active"
                    );

                }


                leereNeuesItemFormular();

            }
        );

    }


    // =========================================================
    // NEUES ITEM FORMULAR LEEREN
    // =========================================================

    function leereNeuesItemFormular() {

        const itemName =
            document.getElementById(
                "itemName"
            );

        const itemEnchants =
            document.getElementById(
                "itemEnchants"
            );

        const itemPrice =
            document.getElementById(
                "itemPrice"
            );

        const itemInfo =
            document.getElementById(
                "itemInfo"
            );


        if (itemName) {
            itemName.value = "";
        }


        if (itemEnchants) {
            itemEnchants.value = "";
        }


        if (itemPrice) {
            itemPrice.value = "";
        }


        if (itemInfo) {
            itemInfo.value = "";
        }


        if (addItemMessage) {

            addItemMessage.textContent = "";

            addItemMessage.style.display =
                "none";

        }

    }


    // =========================================================
    // NEUES ITEM SPEICHERN
    // =========================================================

    if (saveNewItemButton) {

        saveNewItemButton.addEventListener(
            "click",
            async () => {

                await speichereNeuesItem();

            }
        );

              }

          // =========================================================
    // NEUES ITEM SPEICHERN
    // =========================================================

    async function speichereNeuesItem() {

        versteckeMeldungen();


        if (!istLeitung()) {

            zeigeFehler(
                "Du hast keine Berechtigung, Items hinzuzufügen."
            );

            return;
        }


        const itemNameInput =
            document.getElementById(
                "itemName"
            );

        const itemEnchantsInput =
            document.getElementById(
                "itemEnchants"
            );

        const itemPriceInput =
            document.getElementById(
                "itemPrice"
            );

        const itemInfoInput =
            document.getElementById(
                "itemInfo"
            );


        const name =
            itemNameInput?.value.trim() || "";


        const enchants =
            itemEnchantsInput?.value.trim() || "";


        const info =
            itemInfoInput?.value.trim() || "";


        const leihpreis =
            Number(
                itemPriceInput?.value
            );


        // -----------------------------------------------------
        // Eingaben prüfen
        // -----------------------------------------------------

        if (!name) {

            zeigeFehler(
                "Bitte gib einen Item-Namen ein."
            );

            return;
        }


        if (
            !Number.isFinite(leihpreis) ||
            leihpreis < 0
        ) {

            zeigeFehler(
                "Bitte gib einen gültigen Leihpreis ein."
            );

            return;
        }


        saveNewItemButton.disabled = true;

        saveNewItemButton.textContent =
            "Item wird gespeichert …";


        try {

            // -------------------------------------------------
            // Prüfen, ob der Name bereits existiert
            // -------------------------------------------------

            const {
                data: vorhandeneItems,
                error: pruefError
            } = await supabase
                .from("leihitems")
                .select("id, name")
                .ilike("name", name);


            if (pruefError) {
                throw pruefError;
            }


            if (
                vorhandeneItems &&
                vorhandeneItems.length > 0
            ) {

                throw new Error(
                    "Ein Item mit diesem Namen existiert bereits."
                );

            }


            // -------------------------------------------------
            // Item erstellen
            // -------------------------------------------------

            const {
                data: neuesItem,
                error
            } = await supabase
                .from("leihitems")
                .insert({

                    name: name,

                    enchants:
                        enchants || null,

                    leihpreis:
                        leihpreis,

                    info:
                        info || null

                })
                .select()
                .single();


            if (error) {
                throw error;
            }


            console.log(
                "Neues Verleih-Item erstellt:",
                neuesItem
            );


            zeigeErfolg(
                `${name} wurde erfolgreich zum Verleih hinzugefügt.`
            );


            // Formular zurücksetzen
            leereNeuesItemFormular();


            if (addItemForm) {

                addItemForm.classList.remove(
                    "active"
                );

            }


            // Items aktualisieren
            await ladeLeihitems();


            // Editor-Auswahl aktualisieren
            await aktualisiereItemAuswahl();


        } catch (error) {

            console.error(
                "Fehler beim Hinzufügen des Items:",
                error
            );


            zeigeFehler(
                error.message ||
                "Das Item konnte nicht hinzugefügt werden."
            );

        } finally {

            saveNewItemButton.disabled = false;

            saveNewItemButton.textContent =
                "Item speichern";

        }

    }


    // =========================================================
    // ITEM-BEARBEITUNG ÖFFNEN
    // =========================================================

    if (editItemButton) {

        editItemButton.addEventListener(
            "click",
            async () => {

                if (!istLeitung()) {

                    zeigeFehler(
                        "Du hast keine Berechtigung, Items zu bearbeiten."
                    );

                    return;
                }


                versteckeMeldungen();


                if (addItemForm) {

                    addItemForm.classList.remove(
                        "active"
                    );

                }


                if (editItemForm) {

                    editItemForm.classList.toggle(
                        "active"
                    );


                    if (
                        editItemForm.classList.contains(
                            "active"
                        )
                    ) {

                        await aktualisiereItemAuswahl();


                        editItemForm.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest"
                        });

                    }

                }

            }
        );

    }


    // =========================================================
    // ITEM-AUSWAHL AKTUALISIEREN
    // =========================================================

    async function aktualisiereItemAuswahl() {

        const select =
            document.getElementById(
                "editItemSelect"
            );


        if (!select) return;


        select.innerHTML = `
            <option value="">
                Bitte Item auswählen
            </option>
        `;


        leihitems.forEach(item => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                item.id;


            option.textContent =
                item.name;


            select.appendChild(
                option
            );

        });

    }


    // =========================================================
    // AUSGEWÄHLTES ITEM IN EDITOR LADEN
    // =========================================================

    const editItemSelect =
        document.getElementById(
            "editItemSelect"
        );


    if (editItemSelect) {

        editItemSelect.addEventListener(
            "change",
            () => {

                const itemId =
                    Number(
                        editItemSelect.value
                    );


                if (!itemId) {

                    leereEditFormular();

                    return;
                }


                const item =
                    leihitems.find(
                        leihitem =>
                            Number(leihitem.id) ===
                            itemId
                    );


                if (!item) {

                    leereEditFormular();

                    return;
                }


                const nameInput =
                    document.getElementById(
                        "editItemName"
                    );

                const enchantsInput =
                    document.getElementById(
                        "editItemEnchants"
                    );

                const priceInput =
                    document.getElementById(
                        "editItemPrice"
                    );

                const infoInput =
                    document.getElementById(
                        "editItemInfo"
                    );


                if (nameInput) {
                    nameInput.value =
                        item.name || "";
                }


                if (enchantsInput) {
                    enchantsInput.value =
                        item.enchants || "";
                }


                if (priceInput) {
                    priceInput.value =
                        item.leihpreis ?? "";
                }


                if (infoInput) {
                    infoInput.value =
                        item.info || "";
                }

            }
        );

    }


    // =========================================================
    // EDIT-FORMULAR LEEREN
    // =========================================================

    function leereEditFormular() {

        const fields = [
            "editItemName",
            "editItemEnchants",
            "editItemPrice",
            "editItemInfo"
        ];


        fields.forEach(id => {

            const element =
                document.getElementById(id);


            if (element) {
                element.value = "";
            }

        });

    }


    // =========================================================
    // EDITIERUNG ABBRECHEN
    // =========================================================

    if (cancelEditItem) {

        cancelEditItem.addEventListener(
            "click",
            () => {

                if (editItemForm) {

                    editItemForm.classList.remove(
                        "active"
                    );

                }


                leereEditFormular();


                const select =
                    document.getElementById(
                        "editItemSelect"
                    );


                if (select) {

                    select.value = "";

                }

            }
        );

    }


    // =========================================================
    // ÄNDERUNGEN SPEICHERN
    // =========================================================

    if (saveEditItemButton) {

        saveEditItemButton.addEventListener(
            "click",
            async () => {

                await speichereItemAenderung();

            }
        );

      }

        // =========================================================
    // ITEM-ÄNDERUNGEN SPEICHERN
    // =========================================================

    async function speichereItemAenderung() {

        versteckeMeldungen();


        if (!istLeitung()) {

            zeigeFehler(
                "Du hast keine Berechtigung, Items zu bearbeiten."
            );

            return;
        }


        const select =
            document.getElementById(
                "editItemSelect"
            );


        const itemId =
            Number(
                select?.value
            );


        if (!itemId) {

            zeigeFehler(
                "Bitte wähle zuerst ein Item aus."
            );

            return;
        }


        const nameInput =
            document.getElementById(
                "editItemName"
            );

        const enchantsInput =
            document.getElementById(
                "editItemEnchants"
            );

        const priceInput =
            document.getElementById(
                "editItemPrice"
            );

        const infoInput =
            document.getElementById(
                "editItemInfo"
            );


        const name =
            nameInput?.value.trim() || "";


        const enchants =
            enchantsInput?.value.trim() || "";


        const info =
            infoInput?.value.trim() || "";


        const leihpreis =
            Number(
                priceInput?.value
            );


        // -----------------------------------------------------
        // Eingaben prüfen
        // -----------------------------------------------------

        if (!name) {

            zeigeFehler(
                "Bitte gib einen Item-Namen ein."
            );

            return;
        }


        if (
            !Number.isFinite(leihpreis) ||
            leihpreis < 0
        ) {

            zeigeFehler(
                "Bitte gib einen gültigen Leihpreis ein."
            );

            return;
        }


        saveEditItemButton.disabled = true;

        saveEditItemButton.textContent =
            "Änderungen werden gespeichert …";


        try {

            // -------------------------------------------------
            // Prüfen, ob ein anderes Item denselben Namen hat
            // -------------------------------------------------

            const {
                data: namensTreffer,
                error: namensError
            } = await supabase
                .from("leihitems")
                .select("id, name")
                .ilike("name", name);


            if (namensError) {
                throw namensError;
            }


            const andererTreffer =
                (namensTreffer || [])
                    .find(
                        item =>
                            Number(item.id) !==
                            Number(itemId)
                    );


            if (andererTreffer) {

                throw new Error(
                    "Ein anderes Verleih-Item besitzt bereits diesen Namen."
                );

            }


            // -------------------------------------------------
            // Item aktualisieren
            // -------------------------------------------------

            const {
                data: aktualisiertesItem,
                error
            } = await supabase
                .from("leihitems")
                .update({

                    name: name,

                    enchants:
                        enchants || null,

                    leihpreis:
                        leihpreis,

                    info:
                        info || null

                })
                .eq(
                    "id",
                    itemId
                )
                .select()
                .single();


            if (error) {
                throw error;
            }


            console.log(
                "Verleih-Item aktualisiert:",
                aktualisiertesItem
            );


            zeigeErfolg(
                `${name} wurde erfolgreich aktualisiert.`
            );


            // -------------------------------------------------
            // Editor schließen
            // -------------------------------------------------

            if (editItemForm) {

                editItemForm.classList.remove(
                    "active"
                );

            }


            leereEditFormular();


            if (select) {
                select.value = "";
            }


            // -------------------------------------------------
            // Daten neu laden
            // -------------------------------------------------

            await ladeLeihitems();

            await aktualisiereItemAuswahl();


        } catch (error) {

            console.error(
                "Fehler beim Bearbeiten des Items:",
                error
            );


            zeigeFehler(
                error.message ||
                "Das Item konnte nicht geändert werden."
            );


        } finally {

            saveEditItemButton.disabled = false;

            saveEditItemButton.textContent =
                "Änderungen speichern";

        }

    }


    // =========================================================
    // ITEM LÖSCHEN
    // =========================================================

    if (deleteItemButton) {

        deleteItemButton.addEventListener(
            "click",
            async () => {

                await loescheItem();

            }
        );

    }


    // =========================================================
    // ITEM LÖSCHEN
    // =========================================================

    async function loescheItem() {

        versteckeMeldungen();


        if (!istLeitung()) {

            zeigeFehler(
                "Du hast keine Berechtigung, Items zu löschen."
            );

            return;
        }


        const select =
            document.getElementById(
                "editItemSelect"
            );


        const itemId =
            Number(
                select?.value
            );


        if (!itemId) {

            zeigeFehler(
                "Bitte wähle zuerst das Item aus, das gelöscht werden soll."
            );

            return;
        }


        const item =
            leihitems.find(
                leihitem =>
                    Number(leihitem.id) ===
                    itemId
            );


        if (!item) {

            zeigeFehler(
                "Das ausgewählte Item wurde nicht gefunden."
            );

            return;
        }


        // -----------------------------------------------------
        // Prüfen, ob das Item aktuell ausgeliehen ist
        // -----------------------------------------------------

        const {
            data: aktiveAusleihe,
            error: pruefError
        } = await supabase
            .from("ausleihen")
            .select("id")
            .eq(
                "leihitem_id",
                itemId
            )
            .limit(1);


        if (pruefError) {

            console.error(
                "Fehler bei der Löschprüfung:",
                pruefError
            );

            zeigeFehler(
                "Es konnte nicht geprüft werden, ob das Item noch ausgeliehen ist."
            );

            return;
        }


        if (
            aktiveAusleihe &&
            aktiveAusleihe.length > 0
        ) {

            zeigeFehler(
                "Dieses Item kann nicht gelöscht werden, solange es noch ausgeliehen ist."
            );

            return;
        }


        // -----------------------------------------------------
        // Sicherheitsabfrage
        // -----------------------------------------------------

        const bestaetigt =
            window.confirm(
                `Möchtest du "${item.name}" wirklich aus dem Verleih löschen?`
            );


        if (!bestaetigt) {
            return;
        }


        deleteItemButton.disabled = true;

        deleteItemButton.textContent =
            "Item wird gelöscht …";


        try {

            const {
                error
            } = await supabase
                .from("leihitems")
                .delete()
                .eq(
                    "id",
                    itemId
                );


            if (error) {
                throw error;
            }


            zeigeErfolg(
                `${item.name} wurde erfolgreich gelöscht.`
            );


            // Editor zurücksetzen
            if (editItemForm) {

                editItemForm.classList.remove(
                    "active"
                );

            }


            leereEditFormular();


            if (select) {
                select.value = "";
            }


            // Daten aktualisieren
            await ladeLeihitems();

            await aktualisiereItemAuswahl();


        } catch (error) {

            console.error(
                "Fehler beim Löschen des Items:",
                error
            );


            // Fremdschlüssel-Schutz
            if (
                error.code === "23503"
            ) {

                zeigeFehler(
                    "Das Item kann nicht gelöscht werden, weil noch eine Ausleihe darauf verweist."
                );

            } else {

                zeigeFehler(
                    error.message ||
                    "Das Item konnte nicht gelöscht werden."
                );

            }


        } finally {

            deleteItemButton.disabled = false;

            deleteItemButton.textContent =
                "Item löschen";

        }

              }

          // =========================================================
    // AUSLEIHEN AUTOMATISCH AKTUALISIEREN
    // =========================================================

    async function aktualisiereVerleihDaten() {

        try {

            await ladeLeihitems();

            await ladeAusleihen();

        } catch (error) {

            console.error(
                "Fehler bei der Aktualisierung des Verleihsystems:",
                error
            );

        }

    }


    // =========================================================
    // SUPABASE AUTH-ÄNDERUNGEN
    // =========================================================

    supabase.auth.onAuthStateChange(
        async (event, session) => {

            console.log(
                "Auth-Änderung:",
                event
            );


            if (session?.user) {

                currentUser =
                    session.user;

            } else {

                currentUser =
                    null;

                currentEmployee =
                    null;

            }


            // Nach Login/Logout den kompletten
            // Verleihbereich neu laden.
            await ladeVerleihSystem();

        }
    );


    // =========================================================
    // VERLEIH-DATEN BEIM TAB-WECHSEL AKTUALISIEREN
    // =========================================================

    document.addEventListener(
        "visibilitychange",
        async () => {

            if (
                document.visibilityState ===
                "visible"
            ) {

                await aktualisiereVerleihDaten();

            }

        }
    );


    // =========================================================
    // KLICK AUF ITEM-BEARBEITEN
    // =========================================================

    if (editItemButton) {

        editItemButton.addEventListener(
            "click",
            async () => {

                if (!istLeitung()) {
                    return;
                }


                await aktualisiereItemAuswahl();

            }
        );

    }


    // =========================================================
    // PREIS-EINGABE BEREINIGEN
    // =========================================================

    function normalisierePreis(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return 0;

        }


        const text =
            String(value)
                .replace(",", ".")
                .trim();


        const zahl =
            Number(text);


        if (!Number.isFinite(zahl)) {
            return 0;
        }


        return Math.max(
            0,
            zahl
        );

    }


    // =========================================================
    // DATUM FÜR RÜCKGABE
    // =========================================================

    function berechneRueckgabeDatum(
        leihdauer
    ) {

        const datum =
            new Date();


        datum.setDate(
            datum.getDate() +
            Number(leihdauer)
        );


        return datum;

    }


    // =========================================================
    // SICHERHEITSCHECK VOR EINER AUSLEIHE
    // =========================================================

    async function pruefeItemVerfuegbar(
        itemId
    ) {

        const {
            data,
            error
        } = await supabase
            .from("ausleihen")
            .select("id")
            .eq(
                "leihitem_id",
                itemId
            )
            .limit(1);


        if (error) {

            console.error(
                "Verfügbarkeitsprüfung fehlgeschlagen:",
                error
            );

            return false;

        }


        return !(
            data &&
            data.length > 0
        );

    }


    // =========================================================
    // AKTUELLE MITGLIEDSSESSION PRÜFEN
    // =========================================================

    async function aktualisiereAktuellenBenutzer() {

        const {
            data,
            error
        } = await supabase.auth.getUser();


        if (error) {

            console.error(
                "Benutzer konnte nicht ermittelt werden:",
                error
            );

            currentUser = null;

            currentEmployee = null;

            return;

        }


        currentUser =
            data?.user || null;


        currentEmployee =
            null;


        if (!currentUser) {
            return;
        }


        const {
            data: employee,
            error: employeeError
        } = await supabase
            .from("employees")
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .eq(
                "is_active",
                true
            )
            .maybeSingle();


        if (employeeError) {

            console.error(
                "Mitarbeiterdaten konnten nicht geladen werden:",
                employeeError
            );

            return;

        }


        currentEmployee =
            employee || null;

    }


    // =========================================================
    // ABSCHLIESSENDE INITIALISIERUNG
    // =========================================================

    await aktualisiereAktuellenBenutzer();

    // =========================================================
    // ABSCHLIESSENDE SICHERHEITSPRÜFUNG
    // =========================================================

    // Der Verwaltungsbereich wird ausschließlich für aktive
    // Leitung / Stadtleitung freigegeben.
    //
    // Kunden können weiterhin:
    // - verfügbare Items sehen
    // - Items ausleihen
    // - eigene Ausleihen sehen
    // - eigene Ausleihen zurückgeben
    //
    // Leitung / Stadtleitung können zusätzlich:
    // - Items hinzufügen
    // - Items bearbeiten
    // - Items löschen


    function aktualisiereVerwaltungsrechte() {

        if (!verwaltungBereich) {
            return;
        }


        if (istLeitung()) {

            verwaltungBereich.style.display =
                "block";

        } else {

            verwaltungBereich.style.display =
                "none";

        }

    }


    // =========================================================
    // INITIALER RECHTE-CHECK
    // =========================================================

    aktualisiereVerwaltungsrechte();


    // =========================================================
    // PREISFELDER NORMALISIEREN
    // =========================================================

    const itemPrice =
        document.getElementById(
            "itemPrice"
        );

    const editItemPrice =
        document.getElementById(
            "editItemPrice"
        );


    if (itemPrice) {

        itemPrice.addEventListener(
            "blur",
            () => {

                if (
                    itemPrice.value !== ""
                ) {

                    itemPrice.value =
                        normalisierePreis(
                            itemPrice.value
                        );

                }

            }
        );

    }


    if (editItemPrice) {

        editItemPrice.addEventListener(
            "blur",
            () => {

                if (
                    editItemPrice.value !== ""
                ) {

                    editItemPrice.value =
                        normalisierePreis(
                            editItemPrice.value
                        );

                }

            }
        );

    }


    // =========================================================
    // ENTER IM NEUEN ITEM-FORMULAR
    // =========================================================

    [
        "itemName",
        "itemEnchants",
        "itemPrice"
    ].forEach(id => {

        const input =
            document.getElementById(id);


        if (!input) {
            return;
        }


        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    id !== "itemName"
                ) {

                    event.preventDefault();

                    speichereNeuesItem();

                }

            }
        );

    });


    // =========================================================
    // ENTER IM BEARBEITUNGSFORMULAR
    // =========================================================

    [
        "editItemName",
        "editItemEnchants",
        "editItemPrice"
    ].forEach(id => {

        const input =
            document.getElementById(id);


        if (!input) {
            return;
        }


        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    speichereItemAenderung();

                }

            }
        );

    });


    // =========================================================
    // ENDE DES VERLEIHSYSTEMS
    // =========================================================

    console.log(
        "Ehrenmarkt Verleihsystem erfolgreich geladen."
    );

});
