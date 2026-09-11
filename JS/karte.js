document.addEventListener("DOMContentLoaded", async () => {

    const supabase = window.supabaseClient;

    let currentUser = null;
    let currentEmployee = null;
    let standorte = [];

    // =========================================================
    // ELEMENTE
    // =========================================================

    const standorteContainer =
        document.getElementById("standorteContainer");

    const verwaltungBereich =
        document.getElementById("verwaltungBereich");

    const addStandortButton =
        document.getElementById("addStandortButton");

    const editStandortButton =
        document.getElementById("editStandortButton");

    const deleteStandortButton =
        document.getElementById("deleteStandortButton");

    const addStandortForm =
        document.getElementById("addStandortForm");

    const editStandortForm =
        document.getElementById("editStandortForm");

    const editStandortSelect =
        document.getElementById("editStandortSelect");

    const standortName =
        document.getElementById("standortName");

    const standortKategorie =
        document.getElementById("standortKategorie");

    const standortBetreiber =
        document.getElementById("standortBetreiber");

    const standortBeschreibung =
        document.getElementById("standortBeschreibung");

    const standortCB =
        document.getElementById("standortCB");

    const standortSW =
        document.getElementById("standortSW");

    const standortKoordinaten =
        document.getElementById("standortKoordinaten");

    const saveStandortButton =
        document.getElementById("saveStandortButton");

    const cancelAddStandort =
        document.getElementById("cancelAddStandort");

    const editStandortName =
        document.getElementById("editStandortName");

    const editStandortKategorie =
        document.getElementById("editStandortKategorie");

    const editStandortBetreiber =
        document.getElementById("editStandortBetreiber");

    const editStandortBeschreibung =
        document.getElementById("editStandortBeschreibung");

    const editStandortCB =
        document.getElementById("editStandortCB");

    const editStandortSW =
        document.getElementById("editStandortSW");

    const editStandortKoordinaten =
        document.getElementById("editStandortKoordinaten");

    const saveEditStandortButton =
        document.getElementById("saveEditStandortButton");

    const cancelEditStandort =
        document.getElementById("cancelEditStandort");


    // =========================================================
    // HILFSFUNKTIONEN
    // =========================================================

    function escapeHTML(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function istLeitung() {
        return (
            currentEmployee &&
            currentEmployee.is_active === true &&
            (
                currentEmployee.rang === "Leitung" ||
                currentEmployee.rang === "Stadtleitung"
            )
        );
    }


    function zeigeVerwaltung() {

        if (!verwaltungBereich) {
            return;
        }

        if (istLeitung()) {
            verwaltungBereich.style.display = "block";
        } else {
            verwaltungBereich.style.display = "none";
        }
    }


    function zeigeFormular(formular) {

        if (!formular) {
            return;
        }

        formular.classList.add("active");
    }


    function versteckeFormular(formular) {

        if (!formular) {
            return;
        }

        formular.classList.remove("active");
    }


    function leereHinzufuegenFormular() {

        if (standortName) {
            standortName.value = "";
        }

        if (standortKategorie) {
            standortKategorie.value = "Ehrenmarkt";
        }

        if (standortBetreiber) {
            standortBetreiber.value = "";
        }

        if (standortBeschreibung) {
            standortBeschreibung.value = "";
        }

        if (standortCB) {
            standortCB.value = "";
        }

        if (standortSW) {
            standortSW.value = "";
        }

        if (standortKoordinaten) {
            standortKoordinaten.value = "";
        }
    }


    function leereBearbeitenFormular() {

        if (editStandortName) {
            editStandortName.value = "";
        }

        if (editStandortKategorie) {
            editStandortKategorie.value = "Ehrenmarkt";
        }

        if (editStandortBetreiber) {
            editStandortBetreiber.value = "";
        }

        if (editStandortBeschreibung) {
            editStandortBeschreibung.value = "";
        }

        if (editStandortCB) {
            editStandortCB.value = "";
        }

        if (editStandortSW) {
            editStandortSW.value = "";
        }

        if (editStandortKoordinaten) {
            editStandortKoordinaten.value = "";
        }
    }


    // =========================================================
    // BENUTZER UND MITARBEITER LADEN
    // =========================================================

    async function ladeBenutzer() {

        const {
            data: {
                user
            },
            error
        } = await supabase.auth.getUser();


        if (error) {

            console.error(
                "Fehler beim Laden des Benutzers:",
                error
            );

            currentUser = null;
            currentEmployee = null;

            zeigeVerwaltung();

            return;
        }


        currentUser = user || null;


        if (!currentUser) {

            currentEmployee = null;

            zeigeVerwaltung();

            return;
        }


        const {
            data: employee,
            error: employeeError
        } = await supabase
            .from("employees")
            .select("*")
            .eq("user_id", currentUser.id)
            .eq("is_active", true)
            .maybeSingle();


        if (employeeError) {

            console.error(
                "Fehler beim Laden des Mitarbeiters:",
                employeeError
            );

            currentEmployee = null;

        } else {

            currentEmployee = employee || null;
        }


        zeigeVerwaltung();
    }


    // =========================================================
    // STANDORTE AUS SUPABASE LADEN
    // =========================================================

    async function ladeStandorte() {

        if (!standorteContainer) {
            return;
        }


        standorteContainer.innerHTML = `
            <div class="loading">
                Ingame-Standorte werden geladen...
            </div>
        `;


        const {
            data,
            error
        } = await supabase
            .from("ingame_standorte")
            .select("*")
            .eq("aktiv", true)
            .order("kategorie", {
                ascending: true
            })
            .order("name", {
                ascending: true
            });


        if (error) {

            console.error(
                "Fehler beim Laden der Standorte:",
                error
            );


            standorteContainer.innerHTML = `
                <div class="error-message">
                    Die Ingame-Standorte konnten nicht geladen werden.
                </div>
            `;

            return;
        }


        standorte = data || [];

        renderStandorte();

        aktualisiereBearbeitungsAuswahl();
    }


    // =========================================================
    // STANDORTE ANZEIGEN
    // =========================================================

    function renderStandorte() {

        if (!standorteContainer) {
            return;
        }


        if (standorte.length === 0) {

            standorteContainer.innerHTML = `
                <div class="empty-message">

                    <h3>
                        Noch keine Ingame-Standorte vorhanden
                    </h3>

                    <p>
                        Hier werden wichtige Orte,
                        Shops, Partner, Bündnisse und
                        weitere Standorte angezeigt.
                    </p>

                </div>
            `;

            return;
        }


        standorteContainer.innerHTML =
            standorte.map(standort => {

                const name =
                    escapeHTML(standort.name);

                const kategorie =
                    escapeHTML(standort.kategorie);

                const betreiber =
                    escapeHTML(standort.betreiber);

                const beschreibung =
                    escapeHTML(standort.beschreibung);

                const cb =
                    escapeHTML(standort.cb);

                const sw =
                    escapeHTML(standort.sw_befehl);

                const koordinaten =
                    escapeHTML(standort.koordinaten);


                return `
                    <div class="standort-card">

                        <div class="standort-header">

                            <h3>
                                ${name}
                            </h3>

                            <span class="standort-kategorie">
                                ${kategorie}
                            </span>

                        </div>


                        <div class="standort-content">

                            ${
                                betreiber
                                ? `
                                    <div class="standort-info">
                                        <strong>
                                            Betreiber:
                                        </strong>
                                        ${betreiber}
                                    </div>
                                `
                                : ""
                            }


                            <div class="standort-info">

                                <strong>
                                    CityBuild:
                                </strong>

                                ${cb}

                            </div>


                            ${
                                sw
                                ? `
                                    <div class="standort-info">

                                        <strong>
                                            /sw:
                                        </strong>

                                        <code>
                                            ${sw}
                                        </code>

                                    </div>
                                `
                                : ""
                            }


                            ${
                                koordinaten
                                ? `
                                    <div class="standort-info">

                                        <strong>
                                            Koordinaten:
                                        </strong>

                                        ${koordinaten}

                                    </div>
                                `
                                : ""
                            }


                            ${
                                beschreibung
                                ? `
                                    <div class="standort-description">
                                        ${beschreibung}
                                    </div>
                                `
                                : ""
                            }

                        </div>

                    </div>
                `;

            }).join("");
    }

        // =========================================================
    // BEARBEITUNGS-AUSWAHL AKTUALISIEREN
    // =========================================================

    function aktualisiereBearbeitungsAuswahl() {

        if (!editStandortSelect) {
            return;
        }


        editStandortSelect.innerHTML = `
            <option value="">
                -- Standort auswählen --
            </option>
        `;


        standorte.forEach(standort => {

            const option =
                document.createElement("option");

            option.value =
                standort.id;

            option.textContent =
                `${standort.name} – ${standort.cb}`;

            editStandortSelect.appendChild(option);

        });
    }


    // =========================================================
    // STANDORT FÜR BEARBEITUNG LADEN
    // =========================================================

    function ladeStandortInFormular() {

        if (!editStandortSelect) {
            return;
        }


        const id =
            Number(editStandortSelect.value);


        if (!id) {

            leereBearbeitenFormular();

            return;
        }


        const standort =
            standorte.find(item =>
                Number(item.id) === id
            );


        if (!standort) {

            leereBearbeitenFormular();

            return;
        }


        editStandortName.value =
            standort.name || "";


        editStandortKategorie.value =
            standort.kategorie || "Sonstiges";


        editStandortBetreiber.value =
            standort.betreiber || "";


        editStandortBeschreibung.value =
            standort.beschreibung || "";


        editStandortCB.value =
            standort.cb || "";


        editStandortSW.value =
            standort.sw_befehl || "";


        editStandortKoordinaten.value =
            standort.koordinaten || "";
    }


    // =========================================================
    // STANDORT HINZUFÜGEN
    // =========================================================

    async function speichereNeuenStandort() {

        if (!istLeitung()) {

            alert(
                "Du hast keine Berechtigung, einen Standort hinzuzufügen."
            );

            return;
        }


        const name =
            standortName.value.trim();

        const kategorie =
            standortKategorie.value;

        const betreiber =
            standortBetreiber.value.trim();

        const beschreibung =
            standortBeschreibung.value.trim();

        const cb =
            standortCB.value.trim();

        const sw =
            standortSW.value.trim();

        const koordinaten =
            standortKoordinaten.value.trim();


        if (!name) {

            alert(
                "Bitte gib einen Namen für den Standort ein."
            );

            return;
        }


        if (!cb) {

            alert(
                "Bitte gib den CityBuild an."
            );

            return;
        }


        saveStandortButton.disabled = true;

        saveStandortButton.textContent =
            "Wird gespeichert...";


        const {
            error
        } = await supabase
            .from("ingame_standorte")
            .insert({

                name: name,

                kategorie: kategorie,

                betreiber:
                    betreiber || null,

                beschreibung:
                    beschreibung || null,

                cb: cb,

                sw_befehl:
                    sw || null,

                koordinaten:
                    koordinaten || null,

                aktiv: true,

                erstellt_von:
                    currentUser.id

            });


        saveStandortButton.disabled = false;

        saveStandortButton.textContent =
            "Standort speichern";


        if (error) {

            console.error(
                "Fehler beim Erstellen des Standortes:",
                error
            );


            alert(
                "Der Standort konnte nicht gespeichert werden."
            );

            return;
        }


        alert(
            "Der Standort wurde erfolgreich hinzugefügt."
        );


        leereHinzufuegenFormular();

        versteckeFormular(
            addStandortForm
        );


        await ladeStandorte();
    }


    // =========================================================
    // STANDORT BEARBEITEN
    // =========================================================

    async function speichereStandortAenderungen() {

        if (!istLeitung()) {

            alert(
                "Du hast keine Berechtigung, Standorte zu bearbeiten."
            );

            return;
        }


        const id =
            Number(editStandortSelect.value);


        if (!id) {

            alert(
                "Bitte wähle zuerst einen Standort aus."
            );

            return;
        }


        const name =
            editStandortName.value.trim();

        const kategorie =
            editStandortKategorie.value;

        const betreiber =
            editStandortBetreiber.value.trim();

        const beschreibung =
            editStandortBeschreibung.value.trim();

        const cb =
            editStandortCB.value.trim();

        const sw =
            editStandortSW.value.trim();

        const koordinaten =
            editStandortKoordinaten.value.trim();


        if (!name) {

            alert(
                "Bitte gib einen Namen für den Standort ein."
            );

            return;
        }


        if (!cb) {

            alert(
                "Bitte gib den CityBuild an."
            );

            return;
        }


        saveEditStandortButton.disabled = true;

        saveEditStandortButton.textContent =
            "Wird gespeichert...";


        const {
            error
        } = await supabase
            .from("ingame_standorte")
            .update({

                name: name,

                kategorie: kategorie,

                betreiber:
                    betreiber || null,

                beschreibung:
                    beschreibung || null,

                cb: cb,

                sw_befehl:
                    sw || null,

                koordinaten:
                    koordinaten || null

            })
            .eq("id", id);


        saveEditStandortButton.disabled = false;

        saveEditStandortButton.textContent =
            "Änderungen speichern";


        if (error) {

            console.error(
                "Fehler beim Bearbeiten des Standortes:",
                error
            );


            alert(
                "Die Änderungen konnten nicht gespeichert werden."
            );

            return;
        }


        alert(
            "Der Standort wurde erfolgreich geändert."
        );


        leereBearbeitenFormular();

        if (editStandortSelect) {
            editStandortSelect.value = "";
        }


        versteckeFormular(
            editStandortForm
        );


        await ladeStandorte();
    }


    // =========================================================
    // STANDORT LÖSCHEN
    // =========================================================

    async function loescheStandort() {

        if (!istLeitung()) {

            alert(
                "Du hast keine Berechtigung, Standorte zu löschen."
            );

            return;
        }


        const id =
            Number(editStandortSelect.value);


        if (!id) {

            alert(
                "Bitte wähle zuerst einen Standort aus."
            );

            return;
        }


        const standort =
            standorte.find(item =>
                Number(item.id) === id
            );


        if (!standort) {

            alert(
                "Der ausgewählte Standort wurde nicht gefunden."
            );

            return;
        }


        const bestaetigt =
            confirm(
                `Möchtest du den Standort "${standort.name}" wirklich löschen?`
            );


        if (!bestaetigt) {
            return;
        }


        deleteStandortButton.disabled = true;

        deleteStandortButton.textContent =
            "Wird gelöscht...";


        const {
            error
        } = await supabase
            .from("ingame_standorte")
            .delete()
            .eq("id", id);


        deleteStandortButton.disabled = false;

        deleteStandortButton.textContent =
            "Standort löschen";


        if (error) {

            console.error(
                "Fehler beim Löschen des Standortes:",
                error
            );


            alert(
                "Der Standort konnte nicht gelöscht werden."
            );

            return;
        }


        alert(
            "Der Standort wurde erfolgreich gelöscht."
        );


        if (editStandortSelect) {
            editStandortSelect.value = "";
        }


        leereBearbeitenFormular();

        versteckeFormular(
            editStandortForm
        );


        await ladeStandorte();
    }


    // =========================================================
    // BUTTONS
    // =========================================================

    if (addStandortButton) {

        addStandortButton.addEventListener(
            "click",
            () => {

                versteckeFormular(
                    editStandortForm
                );

                leereHinzufuegenFormular();

                zeigeFormular(
                    addStandortForm
                );
            }
        );
    }


    if (editStandortButton) {

        editStandortButton.addEventListener(
            "click",
            () => {

                versteckeFormular(
                    addStandortForm
                );

                aktualisiereBearbeitungsAuswahl();

                zeigeFormular(
                    editStandortForm
                );
            }
        );
    }


    if (deleteStandortButton) {

        deleteStandortButton.addEventListener(
            "click",
            async () => {

                await loescheStandort();

            }
        );
    }


    if (editStandortSelect) {

        editStandortSelect.addEventListener(
            "change",
            () => {

                ladeStandortInFormular();

            }
        );
    }


    if (saveStandortButton) {

        saveStandortButton.addEventListener(
            "click",
            async () => {

                await speichereNeuenStandort();

            }
        );
    }


    if (cancelAddStandort) {

        cancelAddStandort.addEventListener(
            "click",
            () => {

                leereHinzufuegenFormular();

                versteckeFormular(
                    addStandortForm
                );

            }
        );
    }

        // =========================================================
    // BEARBEITUNG SPEICHERN
    // =========================================================

    if (saveEditStandortButton) {

        saveEditStandortButton.addEventListener(
            "click",
            async () => {

                await speichereStandortAenderungen();

            }
        );
    }


    // =========================================================
    // BEARBEITUNG ABBRECHEN
    // =========================================================

    if (cancelEditStandort) {

        cancelEditStandort.addEventListener(
            "click",
            () => {

                leereBearbeitenFormular();

                if (editStandortSelect) {
                    editStandortSelect.value = "";
                }

                versteckeFormular(
                    editStandortForm
                );

            }
        );
    }


    // =========================================================
    // AUTH-ÄNDERUNGEN
    // =========================================================

    supabase.auth.onAuthStateChange(
        async () => {

            await ladeBenutzer();

            await ladeStandorte();

        }
    );


    // =========================================================
    // INITIALISIERUNG
    // =========================================================

    await ladeBenutzer();

    await ladeStandorte();

});
