document.addEventListener("DOMContentLoaded", async () => {

    // =========================================================
    // EHRENMARKT – VERWALTUNG
    // Teil 1/7 – Initialisierung & Zugriff
    // =========================================================

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase Client wurde nicht gefunden.");
        alert("Supabase konnte nicht geladen werden.");
        return;
    }

    let user = null;
    let aktuellerMitarbeiter = null;

    // ---------------------------------------------------------
    // Hilfsfunktionen
    // ---------------------------------------------------------

    function element(id) {
        return document.getElementById(id);
    }

    function setzeWert(id, wert) {
        const el = element(id);
        if (el) {
            el.textContent = wert ?? "";
        }
    }

    function zeigeFehler(text) {
        console.error(text);

        const message = element("accessMessage");

        if (message) {
            message.textContent = text;
            message.style.display = "block";
        } else {
            alert(text);
        }
    }

    function zeigeErfolg(text) {
        console.log(text);

        const message = element("accessMessage");

        if (message) {
            message.textContent = text;
            message.style.display = "block";
        }
    }

    function datum(wert) {
        if (!wert) return "–";

        try {
            return new Date(wert).toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return wert;
        }
    }

    function preis(wert) {
        if (wert === null || wert === undefined || wert === "") {
            return "–";
        }

        const zahl = Number(wert);

        if (Number.isNaN(zahl)) {
            return String(wert);
        }

        return zahl.toLocaleString("de-DE", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }) + " $";
    }

    function escapeHTML(wert) {
        if (wert === null || wert === undefined) {
            return "";
        }

        const div = document.createElement("div");
        div.textContent = String(wert);
        return div.innerHTML;
    }

    function meldungAusblenden() {
        const message = element("accessMessage");

        if (message) {
            message.style.display = "none";
        }
    }

    // ---------------------------------------------------------
    // Angemeldeten Benutzer prüfen
    // ---------------------------------------------------------

    const {
        data: userData,
        error: userError
    } = await supabase.auth.getUser();

    if (userError) {
        console.error("Fehler beim Abrufen des Benutzers:", userError);
        zeigeFehler("Die Anmeldung konnte nicht geprüft werden.");
        return;
    }

    user = userData?.user;

    if (!user) {
        zeigeFehler("Du bist nicht angemeldet.");

        setTimeout(() => {
            window.location.href = "../HTML/registrieren.html";
        }, 1200);

        return;
    }

    // ---------------------------------------------------------
    // Mitarbeiter des angemeldeten Benutzers laden
    // ---------------------------------------------------------

    const {
        data: mitarbeiter,
        error: mitarbeiterError
    } = await supabase
        .from("employees")
        .select(`
            id,
            user_id,
            name,
            role,
            rang,
            is_active,
            is_available,
            total_work_minutes,
            clock_in,
            created_at,
            updated_at
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (mitarbeiterError) {
        console.error(
            "Fehler beim Laden des Mitarbeiters:",
            mitarbeiterError
        );

        zeigeFehler(
            "Deine Mitarbeiterdaten konnten nicht geladen werden."
        );

        return;
    }

    aktuellerMitarbeiter = mitarbeiter;

    // ---------------------------------------------------------
    // Verwaltungsberechtigung
    // ---------------------------------------------------------

    if (!aktuellerMitarbeiter) {
        zeigeFehler(
            "Du hast keinen aktiven Mitarbeiterzugang."
        );

        return;
    }

    const erlaubteRaenge = [
        "Leitung",
        "Stadtleitung"
    ];

    if (!erlaubteRaenge.includes(aktuellerMitarbeiter.rang)) {
        zeigeFehler(
            "Du hast keine Berechtigung für die Verwaltung."
        );

        return;
    }

    // ---------------------------------------------------------
    // Zugriff erfolgreich
    // ---------------------------------------------------------

    meldungAusblenden();

    const headerText = element("accessMessage");

    if (headerText) {
        headerText.textContent =
            `Angemeldet als ${aktuellerMitarbeiter.name} – ${aktuellerMitarbeiter.rang}`;
        headerText.style.display = "block";
    }

    console.log(
        "Verwaltung erfolgreich geladen:",
        aktuellerMitarbeiter
    );

    // ---------------------------------------------------------
    // Navigation
    // ---------------------------------------------------------

    const navButtons = document.querySelectorAll(".nav-button");

    navButtons.forEach(button => {

        button.addEventListener("click", () => {

            const sectionName =
                button.dataset.section;

            if (!sectionName) {
                return;
            }

            document
                .querySelectorAll(".verwaltung-section")
                .forEach(section => {
                    section.style.display = "none";
                });

            const zielSection =
                element("section-" + sectionName);

            if (zielSection) {
                zielSection.style.display = "block";
            }

            navButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

        });

    });

    // ---------------------------------------------------------
    // Ersten Bereich anzeigen
    // ---------------------------------------------------------

    const ersteSection =
        element("section-bewerbungen");

    if (ersteSection) {
        ersteSection.style.display = "block";
    }

    // ---------------------------------------------------------
    // Globale Hilfsfunktionen für spätere Teile
    // ---------------------------------------------------------

    window.verwaltungZeigeFehler = zeigeFehler;
    window.verwaltungZeigeErfolg = zeigeErfolg;
    window.verwaltungMeldungAusblenden = meldungAusblenden;
    window.verwaltungDatum = datum;
    window.verwaltungPreis = preis;
    window.verwaltungEscape = escapeHTML;

        // =========================================================
    // TEIL 2/7 – BEWERBUNGEN
    // =========================================================

    let alleBewerbungen = [];
    let aktuelleBewerbung = null;

    // ---------------------------------------------------------
    // Bewerbungen laden
    // ---------------------------------------------------------

    async function ladeBewerbungen() {

        const liste = element("bewerbungenListe");

        if (liste) {
            liste.innerHTML = "Bewerbungen werden geladen...";
        }

        const {
            data,
            error
        } = await supabase
            .from("applications")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (error) {
            console.error(
                "Fehler beim Laden der Bewerbungen:",
                error
            );

            setzeWert(
                "bewerbungenMessage",
                "Bewerbungen konnten nicht geladen werden."
            );

            if (liste) {
                liste.innerHTML = "";
            }

            return;
        }

        alleBewerbungen = data || [];

        // -----------------------------------------------------
        // Statistik
        // -----------------------------------------------------

        const offen =
            alleBewerbungen.filter(
                bewerbung =>
                    bewerbung.status === "offen"
            ).length;

        const angenommen =
            alleBewerbungen.filter(
                bewerbung =>
                    bewerbung.status === "angenommen"
            ).length;

        const abgelehnt =
            alleBewerbungen.filter(
                bewerbung =>
                    bewerbung.status === "abgelehnt"
            ).length;

        setzeWert(
            "bewerbungenOffen",
            offen
        );

        setzeWert(
            "bewerbungenAngenommen",
            angenommen
        );

        setzeWert(
            "bewerbungenAbgelehnt",
            abgelehnt
        );

        setzeWert(
            "bewerbungenGesamt",
            alleBewerbungen.length
        );

        // -----------------------------------------------------
        // Liste anzeigen
        // -----------------------------------------------------

        if (!liste) {
            return;
        }

        if (alleBewerbungen.length === 0) {

            liste.innerHTML = `
                <div class="verwaltung-empty">
                    Keine Bewerbungen vorhanden.
                </div>
            `;

            return;
        }

        liste.innerHTML = "";

        alleBewerbungen.forEach(bewerbung => {

            liste.appendChild(
                erstelleBewerbungKarte(bewerbung)
            );

        });
    }

    // ---------------------------------------------------------
    // Bewerbungskarte
    // ---------------------------------------------------------

    function erstelleBewerbungKarte(bewerbung) {

        const karte =
            document.createElement("div");

        karte.className =
            "verwaltung-item";

        let statusText =
            bewerbung.status || "offen";

        let statusKlasse =
            "status-offen";

        if (statusText === "angenommen") {
            statusKlasse = "status-angenommen";
        }

        if (statusText === "abgelehnt") {
            statusKlasse = "status-abgelehnt";
        }

        karte.innerHTML = `
            <div>
                <strong>
                    ${escapeHTML(
                        bewerbung.name || "Unbekannt"
                    )}
                </strong>

                <div>
                    Minecraft:
                    ${escapeHTML(
                        bewerbung.minecraft_name || "–"
                    )}
                </div>

                <div>
                    Rolle:
                    ${escapeHTML(
                        bewerbung.desired_role || "–"
                    )}
                </div>

                <div>
                    Eingang:
                    ${datum(
                        bewerbung.created_at
                    )}
                </div>
            </div>

            <div class="${statusKlasse}">
                ${escapeHTML(statusText)}
            </div>
        `;

        karte.addEventListener(
            "click",
            () => {
                window.zeigeBewerbungDetails(
                    bewerbung.id
                );
            }
        );

        return karte;
    }

    // ---------------------------------------------------------
    // Bewerbung Details
    // ---------------------------------------------------------

    window.zeigeBewerbungDetails = function(id) {

        const bewerbung =
            alleBewerbungen.find(
                item => item.id === id
            );

        if (!bewerbung) {
            zeigeFehler(
                "Die Bewerbung wurde nicht gefunden."
            );
            return;
        }

        aktuelleBewerbung = bewerbung;

        const details =
            element("bewerbungDetails");

        const content =
            element("bewerbungDetailsContent");

        if (!details || !content) {
            return;
        }

        content.innerHTML = `
            <h3>
                Bewerbung von
                ${escapeHTML(
                    bewerbung.name || "Unbekannt"
                )}
            </h3>

            <div class="detail-grid">

                <div>
                    <strong>Name</strong>
                    <span>
                        ${escapeHTML(
                            bewerbung.name || "–"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Minecraft-Name</strong>
                    <span>
                        ${escapeHTML(
                            bewerbung.minecraft_name || "–"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Discord-ID</strong>
                    <span>
                        ${escapeHTML(
                            bewerbung.discord_id || "–"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Alter</strong>
                    <span>
                        ${escapeHTML(
                            bewerbung.age ?? "–"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Gewünschte Rolle</strong>
                    <span>
                        ${escapeHTML(
                            bewerbung.desired_role || "–"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Erfahrung</strong>
                    <span>
                        ${escapeHTML(
                            bewerbung.experience || "–"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Bisherige Arbeit</strong>
                    <span>
                        ${escapeHTML(
                            bewerbung.previous_work || "–"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Zusätzliche Fähigkeiten</strong>
                    <span>
                        ${escapeHTML(
                            bewerbung.additional_skills || "–"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Verfügbarkeit</strong>
                    <span>
                        ${escapeHTML(
                            bewerbung.availability || "–"
                        )}
                    </span>
                </div>

                <div>
                    <strong>Ungeeignete Zeiten</strong>
                    <span>
                        ${escapeHTML(
                            bewerbung.unavailable_times || "–"
                        )}
                    </span>
                </div>

            </div>

            <div class="detail-text">
                <strong>Bewerbungstext</strong>
                <p>
                    ${escapeHTML(
                        bewerbung.application_text || "–"
                    )}
                </p>
            </div>

            ${
                bewerbung.decision_note
                    ? `
                        <div class="detail-text">
                            <strong>Entscheidungsnotiz</strong>
                            <p>
                                ${escapeHTML(
                                    bewerbung.decision_note
                                )}
                            </p>
                        </div>
                    `
                    : ""
            }

            <div class="details-actions">

                ${
                    bewerbung.status === "offen"
                        ? `
                            <button
                                class="verwaltung-button success"
                                onclick="bewerbungAnnehmen(${bewerbung.id})"
                            >
                                Bewerbung annehmen
                            </button>

                            <button
                                class="verwaltung-button danger"
                                onclick="bewerbungAblehnen(${bewerbung.id})"
                            >
                                Bewerbung ablehnen
                            </button>
                        `
                        : ""
                }

                <button
                    class="verwaltung-button danger"
                    onclick="bewerbungLoeschen(${bewerbung.id})"
                >
                    Bewerbung löschen
                </button>

                <button
                    class="verwaltung-button"
                    onclick="schliesseBewerbungDetails()"
                >
                    Schließen
                </button>

            </div>
        `;

        details.style.display = "block";
    };

    // ---------------------------------------------------------
    // Details schließen
    // ---------------------------------------------------------

    window.schliesseBewerbungDetails = function() {

        const details =
            element("bewerbungDetails");

        if (details) {
            details.style.display = "none";
        }

        aktuelleBewerbung = null;
    };

    // ---------------------------------------------------------
    // Bewerbung annehmen
    // ---------------------------------------------------------

    window.bewerbungAnnehmen = async function(id) {

        const bewerbung =
            alleBewerbungen.find(
                item => item.id === id
            );

        if (!bewerbung) {
            zeigeFehler(
                "Die Bewerbung wurde nicht gefunden."
            );
            return;
        }

        const rolle =
            prompt(
                "Welche Rolle soll der Mitarbeiter erhalten?",
                bewerbung.assigned_role ||
                bewerbung.desired_role ||
                "Mitarbeiter"
            );

        if (rolle === null) {
            return;
        }

        const rang =
            prompt(
                "Welchen Rang soll der Mitarbeiter erhalten?",
                bewerbung.assigned_rank ||
                "Mitarbeiter"
            );

        if (rang === null) {
            return;
        }

        try {

            // -------------------------------------------------
            // Mitarbeiter erstellen
            // -------------------------------------------------

            const {
                data: neuerMitarbeiter,
                error: mitarbeiterError
            } = await supabase
                .from("employees")
                .insert({
                    user_id: bewerbung.user_id,
                    name: bewerbung.name,
                    role: rolle,
                    rang: rang,
                    is_active: true,
                    is_available: false
                })
                .select()
                .single();

            if (mitarbeiterError) {
                console.error(
                    "Fehler beim Erstellen des Mitarbeiters:",
                    mitarbeiterError
                );

                throw mitarbeiterError;
            }

            // -------------------------------------------------
            // Bewerbung aktualisieren
            // -------------------------------------------------

            const {
                error: updateError
            } = await supabase
                .from("applications")
                .update({
                    status: "angenommen",
                    assigned_role: rolle,
                    assigned_rank: rang,
                    processed_by: user.id,
                    processed_at: new Date().toISOString()
                })
                .eq("id", id);

            if (updateError) {
                console.error(
                    "Fehler beim Aktualisieren der Bewerbung:",
                    updateError
                );

                throw updateError;
            }

            zeigeErfolg(
                "Bewerbung angenommen und Mitarbeiter angelegt."
            );

            window.schliesseBewerbungDetails();

            await ladeBewerbungen();

        } catch (error) {

            console.error(
                "Fehler beim Annehmen der Bewerbung:",
                error
            );

            zeigeFehler(
                "Die Bewerbung konnte nicht angenommen werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    };

    // ---------------------------------------------------------
    // Bewerbung ablehnen
    // ---------------------------------------------------------

    window.bewerbungAblehnen = async function(id) {

        const bewerbung =
            alleBewerbungen.find(
                item => item.id === id
            );

        if (!bewerbung) {
            zeigeFehler(
                "Die Bewerbung wurde nicht gefunden."
            );
            return;
        }

        const notiz =
            prompt(
                "Warum wird die Bewerbung abgelehnt?",
                ""
            );

        if (notiz === null) {
            return;
        }

        try {

            const {
                error
            } = await supabase
                .from("applications")
                .update({
                    status: "abgelehnt",
                    decision_note: notiz,
                    processed_by: user.id,
                    processed_at:
                        new Date().toISOString()
                })
                .eq("id", id);

            if (error) {
                console.error(
                    "Fehler beim Ablehnen:",
                    error
                );

                throw error;
            }

            zeigeErfolg(
                "Bewerbung wurde abgelehnt."
            );

            window.schliesseBewerbungDetails();

            await ladeBewerbungen();

        } catch (error) {

            console.error(
                "Fehler beim Ablehnen der Bewerbung:",
                error
            );

            zeigeFehler(
                "Die Bewerbung konnte nicht abgelehnt werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    };

    // ---------------------------------------------------------
    // Bewerbung löschen
    // ---------------------------------------------------------

    window.bewerbungLoeschen = async function(id) {

        if (
            !confirm(
                "Diese Bewerbung wirklich löschen?"
            )
        ) {
            return;
        }

        try {

            const {
                error
            } = await supabase
                .from("applications")
                .delete()
                .eq("id", id);

            if (error) {
                console.error(
                    "Fehler beim Löschen der Bewerbung:",
                    error
                );

                throw error;
            }

            zeigeErfolg(
                "Bewerbung erfolgreich gelöscht."
            );

            window.schliesseBewerbungDetails();

            await ladeBewerbungen();

        } catch (error) {

            console.error(
                "Fehler beim Löschen der Bewerbung:",
                error
            );

            zeigeFehler(
                "Die Bewerbung konnte nicht gelöscht werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    };

    // ---------------------------------------------------------
    // Bewerbungen initial laden
    // ---------------------------------------------------------

    await ladeBewerbungen();

        // =========================================================
    // TEIL 3/7 – AUFTRÄGE
    // =========================================================

    const auftragTabellen = {
        bau: {
            tabelle: "build_orders",
            name: "Bauaufträge"
        },

        material: {
            tabelle: "orders",
            name: "Materialbestellungen"
        },

        redstone: {
            tabelle: "redstone_orders",
            name: "Redstone-Aufträge"
        },

        logistik: {
            tabelle: "logistics_orders",
            name: "Logistikaufträge"
        }
    };

    let aktuelleAuftragsart = "bau";
    let alleAuftraege = [];
    let aktuellerAuftrag = null;

    // ---------------------------------------------------------
    // Aufträge laden
    // ---------------------------------------------------------

    async function ladeAuftraege(typ = aktuelleAuftragsart) {

        aktuelleAuftragsart = typ;

        const config =
            auftragTabellen[typ];

        if (!config) {
            console.error(
                "Unbekannter Auftragstyp:",
                typ
            );
            return;
        }

        const liste =
            element("auftraegeListe");

        if (liste) {
            liste.innerHTML =
                "Aufträge werden geladen...";
        }

        const {
            data,
            error
        } = await supabase
            .from(config.tabelle)
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (error) {

            console.error(
                `Fehler beim Laden der ${config.name}:`,
                error
            );

            setzeWert(
                "auftraegeMessage",
                `${config.name} konnten nicht geladen werden.`
            );

            if (liste) {
                liste.innerHTML = "";
            }

            return;
        }

        alleAuftraege = data || [];

        // -----------------------------------------------------
        // Statistik
        // -----------------------------------------------------

        aktualisiereAuftragsStatistik();

        // -----------------------------------------------------
        // Liste anzeigen
        // -----------------------------------------------------

        if (!liste) {
            return;
        }

        if (alleAuftraege.length === 0) {

            liste.innerHTML = `
                <div class="verwaltung-empty">
                    Keine ${escapeHTML(
                        config.name
                    )} vorhanden.
                </div>
            `;

            return;
        }

        liste.innerHTML = "";

        alleAuftraege.forEach(auftrag => {

            liste.appendChild(
                erstelleAuftragsKarte(auftrag)
            );

        });
    }

    // ---------------------------------------------------------
    // Auftragkarte
    // ---------------------------------------------------------

    function erstelleAuftragsKarte(auftrag) {

        const karte =
            document.createElement("div");

        karte.className =
            "verwaltung-item";

        const id =
            auftrag.id ?? "–";

        const status =
            auftrag.status || "–";

        const statusLower =
            String(status).toLowerCase();

        let statusKlasse =
            "status-offen";

        if (
            statusLower.includes("bearbeitung") ||
            statusLower.includes("bearbeitet") ||
            statusLower.includes("in arbeit")
        ) {
            statusKlasse =
                "status-bearbeitung";
        }

        if (
            statusLower.includes("abgeschlossen") ||
            statusLower.includes("fertig")
        ) {
            statusKlasse =
                "status-abgeschlossen";
        }

        let kunde =
            auftrag.name ||
            auftrag.customer_name ||
            auftrag.username ||
            auftrag.user_name ||
            "–";

        karte.innerHTML = `
            <div>

                <strong>
                    Auftrag #${escapeHTML(id)}
                </strong>

                <div>
                    Kunde:
                    ${escapeHTML(kunde)}
                </div>

                <div>
                    Erstellt:
                    ${datum(auftrag.created_at)}
                </div>

            </div>

            <div class="${statusKlasse}">
                ${escapeHTML(status)}
            </div>
        `;

        karte.addEventListener(
            "click",
            () => {
                window.zeigeAuftragDetails(
                    id
                );
            }
        );

        return karte;
    }

    // ---------------------------------------------------------
    // Auftragsdetails anzeigen
    // ---------------------------------------------------------

    window.zeigeAuftragDetails = function(id) {

        const auftrag =
            alleAuftraege.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!auftrag) {

            zeigeFehler(
                "Der Auftrag wurde nicht gefunden."
            );

            return;
        }

        aktuellerAuftrag =
            auftrag;

        const details =
            element("auftragDetails");

        const content =
            element("auftragDetailsContent");

        if (!details || !content) {
            return;
        }

        const config =
            auftragTabellen[
                aktuelleAuftragsart
            ];

        let felderHTML = "";

        Object.keys(auftrag).forEach(
            feld => {

                let wert =
                    auftrag[feld];

                if (
                    wert === null ||
                    wert === undefined ||
                    wert === ""
                ) {
                    wert = "–";
                }

                if (
                    feld.includes("price") ||
                    feld.includes("preis") ||
                    feld.includes("cost") ||
                    feld.includes("kosten")
                ) {
                    wert = preis(wert);
                }

                if (
                    feld.includes("created_at") ||
                    feld.includes("updated_at") ||
                    feld.includes("processed_at")
                ) {
                    wert = datum(wert);
                }

                felderHTML += `
                    <div>
                        <strong>
                            ${escapeHTML(feld)}
                        </strong>

                        <span>
                            ${escapeHTML(wert)}
                        </span>
                    </div>
                `;
            }
        );

        content.innerHTML = `

            <h3>
                ${escapeHTML(
                    config?.name ||
                    "Auftrag"
                )}
                #${escapeHTML(id)}
            </h3>

            <div class="detail-grid">
                ${felderHTML}
            </div>

            <div class="details-actions">

                <button
                    class="verwaltung-button"
                    onclick="auftragStatusAendern('${escapeHTML(id)}')"
                >
                    Status ändern
                </button>

                <button
                    class="verwaltung-button danger"
                    onclick="auftragLoeschen('${escapeHTML(id)}')"
                >
                    Auftrag löschen
                </button>

                <button
                    class="verwaltung-button"
                    onclick="schliesseAuftragDetails()"
                >
                    Schließen
                </button>

            </div>
        `;

        details.style.display =
            "block";
    };

    // ---------------------------------------------------------
    // Auftragsdetails schließen
    // ---------------------------------------------------------

    window.schliesseAuftragDetails =
        function() {

            const details =
                element("auftragDetails");

            if (details) {
                details.style.display =
                    "none";
            }

            aktuellerAuftrag =
                null;
        };

    // ---------------------------------------------------------
    // Auftragstatus ändern
    // ---------------------------------------------------------

    window.auftragStatusAendern =
        async function(id) {

            const auftrag =
                alleAuftraege.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!auftrag) {

                zeigeFehler(
                    "Der Auftrag wurde nicht gefunden."
                );

                return;
            }

            const neuerStatus =
                prompt(
                    "Neuen Status eingeben:",
                    auftrag.status || "Offen"
                );

            if (neuerStatus === null) {
                return;
            }

            const status =
                neuerStatus.trim();

            if (!status) {

                zeigeFehler(
                    "Der Status darf nicht leer sein."
                );

                return;
            }

            const config =
                auftragTabellen[
                    aktuelleAuftragsart
                ];

            if (!config) {
                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from(config.tabelle)
                    .update({
                        status: status,
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq("id", id);

                if (error) {
                    throw error;
                }

                zeigeErfolg(
                    "Auftragsstatus wurde geändert."
                );

                window.schliesseAuftragDetails();

                await ladeAuftraege(
                    aktuelleAuftragsart
                );

            } catch (error) {

                console.error(
                    "Fehler beim Ändern des Status:",
                    error
                );

                zeigeFehler(
                    "Der Status konnte nicht geändert werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );
            }
        };

    // ---------------------------------------------------------
    // Auftrag löschen
    // ---------------------------------------------------------

    window.auftragLoeschen =
        async function(id) {

            if (
                !confirm(
                    "Diesen Auftrag wirklich löschen?"
                )
            ) {
                return;
            }

            const config =
                auftragTabellen[
                    aktuelleAuftragsart
                ];

            if (!config) {
                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from(config.tabelle)
                    .delete()
                    .eq("id", id);

                if (error) {
                    throw error;
                }

                zeigeErfolg(
                    "Auftrag erfolgreich gelöscht."
                );

                window.schliesseAuftragDetails();

                await ladeAuftraege(
                    aktuelleAuftragsart
                );

            } catch (error) {

                console.error(
                    "Fehler beim Löschen des Auftrags:",
                    error
                );

                zeigeFehler(
                    "Der Auftrag konnte nicht gelöscht werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );
            }
        };

    // ---------------------------------------------------------
    // Auftragsstatistik
    // ---------------------------------------------------------

    function aktualisiereAuftragsStatistik() {

        const offen =
            alleAuftraege.filter(
                auftrag =>
                    String(
                        auftrag.status || ""
                    ).toLowerCase() ===
                    "offen"
            ).length;

        const bearbeitung =
            alleAuftraege.filter(
                auftrag => {

                    const status =
                        String(
                            auftrag.status || ""
                        ).toLowerCase();

                    return (
                        status.includes(
                            "bearbeitung"
                        ) ||
                        status.includes(
                            "in arbeit"
                        )
                    );
                }
            ).length;

        const abgeschlossen =
            alleAuftraege.filter(
                auftrag => {

                    const status =
                        String(
                            auftrag.status || ""
                        ).toLowerCase();

                    return (
                        status.includes(
                            "abgeschlossen"
                        ) ||
                        status.includes(
                            "fertig"
                        )
                    );
                }
            ).length;

        setzeWert(
            "auftraegeOffen",
            offen
        );

        setzeWert(
            "auftraegeBearbeitung",
            bearbeitung
        );

        setzeWert(
            "auftraegeAbgeschlossen",
            abgeschlossen
        );

        setzeWert(
            "auftraegeGesamt",
            alleAuftraege.length
        );
    }

    // ---------------------------------------------------------
    // Auftragstyp-Buttons
    // ---------------------------------------------------------

    const bauButton =
        element("bauauftraegeAnzeigen");

    if (bauButton) {
        bauButton.addEventListener(
            "click",
            () => ladeAuftraege("bau")
        );
    }

    const materialButton =
        element("materialauftraegeAnzeigen");

    if (materialButton) {
        materialButton.addEventListener(
            "click",
            () => ladeAuftraege("material")
        );
    }

    const redstoneButton =
        element("redstoneAuftraegeAnzeigen");

    if (redstoneButton) {
        redstoneButton.addEventListener(
            "click",
            () => ladeAuftraege("redstone")
        );
    }

    const logistikButton =
        element("logistikAuftraegeAnzeigen");

    if (logistikButton) {
        logistikButton.addEventListener(
            "click",
            () => ladeAuftraege("logistik")
        );
    }

    // ---------------------------------------------------------
    // Standardmäßig Bauaufträge laden
    // ---------------------------------------------------------

    await ladeAuftraege("bau");

        // =========================================================
    // TEIL 4/7 – MITARBEITER
    // =========================================================

    let alleMitarbeiter = [];
    let aktuellerMitarbeiterDetails = null;

    // ---------------------------------------------------------
    // Mitarbeiter laden
    // ---------------------------------------------------------

    async function ladeMitarbeiter() {

        const liste =
            element("mitarbeiterListe");

        if (liste) {
            liste.innerHTML =
                "Mitarbeiter werden geladen...";
        }

        const {
            data,
            error
        } = await supabase
            .from("employees")
            .select(`
                id,
                user_id,
                name,
                role,
                rang,
                is_active,
                is_available,
                total_work_minutes,
                clock_in,
                created_at,
                updated_at
            `)
            .order("created_at", {
                ascending: false
            });

        if (error) {

            console.error(
                "Fehler beim Laden der Mitarbeiter:",
                error
            );

            setzeWert(
                "mitarbeiterMessage",
                "Mitarbeiter konnten nicht geladen werden."
            );

            if (liste) {
                liste.innerHTML = "";
            }

            return;
        }

        alleMitarbeiter =
            data || [];

        // -----------------------------------------------------
        // Statistik
        // -----------------------------------------------------

        const aktiv =
            alleMitarbeiter.filter(
                mitarbeiter =>
                    mitarbeiter.is_active === true
            ).length;

        const inaktiv =
            alleMitarbeiter.filter(
                mitarbeiter =>
                    mitarbeiter.is_active === false
            ).length;

        const verfuegbar =
            alleMitarbeiter.filter(
                mitarbeiter =>
                    mitarbeiter.is_active === true &&
                    mitarbeiter.is_available === true
            ).length;

        setzeWert(
            "mitarbeiterAktiv",
            aktiv
        );

        setzeWert(
            "mitarbeiterInaktiv",
            inaktiv
        );

        setzeWert(
            "mitarbeiterGesamt",
            alleMitarbeiter.length
        );

        setzeWert(
            "mitarbeiterVerfuegbar",
            verfuegbar
        );

        // -----------------------------------------------------
        // Liste
        // -----------------------------------------------------

        if (!liste) {
            return;
        }

        if (alleMitarbeiter.length === 0) {

            liste.innerHTML = `
                <div class="verwaltung-empty">
                    Keine Mitarbeiter vorhanden.
                </div>
            `;

            return;
        }

        liste.innerHTML = "";

        alleMitarbeiter.forEach(
            mitarbeiter => {

                liste.appendChild(
                    erstelleMitarbeiterKarte(
                        mitarbeiter
                    )
                );

            }
        );
    }

    // ---------------------------------------------------------
    // Mitarbeiterkarte
    // ---------------------------------------------------------

    function erstelleMitarbeiterKarte(
        mitarbeiter
    ) {

        const karte =
            document.createElement("div");

        karte.className =
            "verwaltung-item";

        const status =
            mitarbeiter.is_active
                ? "Aktiv"
                : "Inaktiv";

        const verfuegbarkeit =
            mitarbeiter.is_available
                ? "Verfügbar"
                : "Nicht verfügbar";

        karte.innerHTML = `
            <div>

                <strong>
                    ${escapeHTML(
                        mitarbeiter.name || "Unbekannt"
                    )}
                </strong>

                <div>
                    Rolle:
                    ${escapeHTML(
                        mitarbeiter.role || "–"
                    )}
                </div>

                <div>
                    Rang:
                    ${escapeHTML(
                        mitarbeiter.rang || "–"
                    )}
                </div>

                <div>
                    ${escapeHTML(status)}
                    ·
                    ${escapeHTML(verfuegbarkeit)}
                </div>

            </div>

            <div>
                ${escapeHTML(status)}
            </div>
        `;

        karte.addEventListener(
            "click",
            () => {

                window.mitarbeiterBearbeiten(
                    mitarbeiter.id
                );

            }
        );

        return karte;
    }

    // ---------------------------------------------------------
    // Mitarbeiterdetails öffnen
    // ---------------------------------------------------------

    window.mitarbeiterBearbeiten =
        function(id) {

            const mitarbeiter =
                alleMitarbeiter.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!mitarbeiter) {

                zeigeFehler(
                    "Der Mitarbeiter wurde nicht gefunden."
                );

                return;
            }

            aktuellerMitarbeiterDetails =
                mitarbeiter;

            const details =
                element("mitarbeiterDetails");

            const content =
                element("mitarbeiterDetailsContent");

            if (!details || !content) {
                return;
            }

            const minuten =
                Number(
                    mitarbeiter.total_work_minutes || 0
                );

            const stunden =
                Math.floor(
                    minuten / 60
                );

            const restMinuten =
                minuten % 60;

            content.innerHTML = `

                <h3>
                    Mitarbeiter bearbeiten
                </h3>

                <div class="detail-grid">

                    <div>
                        <strong>Name</strong>
                        <span>
                            ${escapeHTML(
                                mitarbeiter.name || "–"
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Benutzer-ID</strong>
                        <span>
                            ${escapeHTML(
                                mitarbeiter.user_id || "–"
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Rolle</strong>
                        <span>
                            ${escapeHTML(
                                mitarbeiter.role || "–"
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Rang</strong>
                        <span>
                            ${escapeHTML(
                                mitarbeiter.rang || "–"
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Status</strong>
                        <span>
                            ${
                                mitarbeiter.is_active
                                    ? "Aktiv"
                                    : "Inaktiv"
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Verfügbarkeit</strong>
                        <span>
                            ${
                                mitarbeiter.is_available
                                    ? "Verfügbar"
                                    : "Nicht verfügbar"
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Arbeitszeit</strong>
                        <span>
                            ${stunden} Std.
                            ${restMinuten} Min.
                        </span>
                    </div>

                    <div>
                        <strong>Zeiterfassung</strong>
                        <span>
                            ${
                                mitarbeiter.clock_in
                                    ? datum(
                                        mitarbeiter.clock_in
                                    )
                                    : "Nicht eingestempelt"
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Erstellt</strong>
                        <span>
                            ${datum(
                                mitarbeiter.created_at
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Zuletzt geändert</strong>
                        <span>
                            ${datum(
                                mitarbeiter.updated_at
                            )}
                        </span>
                    </div>

                </div>

                <div class="details-actions">

                    <button
                        class="verwaltung-button"
                        onclick="verwaltungArbeitszeit('${escapeHTML(
                            mitarbeiter.id
                        )}')"
                    >
                        Arbeitszeit anzeigen
                    </button>

                    <button
                        class="verwaltung-button"
                        onclick="mitarbeiterDatenSpeichern('${escapeHTML(
                            mitarbeiter.id
                        )}')"
                    >
                        Rolle / Rang bearbeiten
                    </button>

                    <button
                        class="verwaltung-button"
                        onclick="mitarbeiterAktivStatus('${escapeHTML(
                            mitarbeiter.id
                        )}')"
                    >
                        ${
                            mitarbeiter.is_active
                                ? "Mitarbeiter deaktivieren"
                                : "Mitarbeiter aktivieren"
                        }
                    </button>

                    <button
                        class="verwaltung-button"
                        onclick="schliesseMitarbeiterDetails()"
                    >
                        Schließen
                    </button>

                </div>
            `;

            details.style.display =
                "block";
        };

    // ---------------------------------------------------------
    // Arbeitszeit
    // ---------------------------------------------------------

    window.verwaltungArbeitszeit =
        function(id) {

            const mitarbeiter =
                alleMitarbeiter.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!mitarbeiter) {
                zeigeFehler(
                    "Der Mitarbeiter wurde nicht gefunden."
                );
                return;
            }

            const minuten =
                Number(
                    mitarbeiter.total_work_minutes || 0
                );

            const stunden =
                Math.floor(
                    minuten / 60
                );

            const rest =
                minuten % 60;

            alert(
                `${mitarbeiter.name}\n\n` +
                `Gesamte Arbeitszeit:\n` +
                `${stunden} Stunden und ${rest} Minuten`
            );
        };

    // ---------------------------------------------------------
    // Rolle / Rang speichern
    // ---------------------------------------------------------

    window.mitarbeiterDatenSpeichern =
        async function(id) {

            const mitarbeiter =
                alleMitarbeiter.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!mitarbeiter) {
                zeigeFehler(
                    "Der Mitarbeiter wurde nicht gefunden."
                );
                return;
            }

            const rolle =
                prompt(
                    "Neue Rolle:",
                    mitarbeiter.role || ""
                );

            if (rolle === null) {
                return;
            }

            const rang =
                prompt(
                    "Neuer Rang:",
                    mitarbeiter.rang || ""
                );

            if (rang === null) {
                return;
            }

            if (!rolle.trim() || !rang.trim()) {

                zeigeFehler(
                    "Rolle und Rang dürfen nicht leer sein."
                );

                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from("employees")
                    .update({
                        role: rolle.trim(),
                        rang: rang.trim(),
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq("id", id);

                if (error) {
                    throw error;
                }

                zeigeErfolg(
                    "Mitarbeiterdaten wurden gespeichert."
                );

                await ladeMitarbeiter();

                const aktualisiert =
                    alleMitarbeiter.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );

                if (aktualisiert) {
                    aktuellerMitarbeiterDetails =
                        aktualisiert;

                    window.mitarbeiterBearbeiten(
                        id
                    );
                }

            } catch (error) {

                console.error(
                    "Fehler beim Speichern:",
                    error
                );

                zeigeFehler(
                    "Die Mitarbeiterdaten konnten nicht gespeichert werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );
            }
        };

    // ---------------------------------------------------------
    // Aktiv / Inaktiv
    // ---------------------------------------------------------

    window.mitarbeiterAktivStatus =
        async function(id) {

            const mitarbeiter =
                alleMitarbeiter.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!mitarbeiter) {
                zeigeFehler(
                    "Der Mitarbeiter wurde nicht gefunden."
                );
                return;
            }

            const neuerStatus =
                !mitarbeiter.is_active;

            const frage =
                neuerStatus
                    ? "Mitarbeiter wirklich aktivieren?"
                    : "Mitarbeiter wirklich deaktivieren?";

            if (!confirm(frage)) {
                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from("employees")
                    .update({
                        is_active: neuerStatus,
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq("id", id);

                if (error) {
                    throw error;
                }

                zeigeErfolg(
                    neuerStatus
                        ? "Mitarbeiter wurde aktiviert."
                        : "Mitarbeiter wurde deaktiviert."
                );

                window.schliesseMitarbeiterDetails();

                await ladeMitarbeiter();

            } catch (error) {

                console.error(
                    "Fehler beim Ändern des Mitarbeiterstatus:",
                    error
                );

                zeigeFehler(
                    "Der Mitarbeiterstatus konnte nicht geändert werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );
            }
        };

    // ---------------------------------------------------------
    // Mitarbeiterdetails schließen
    // ---------------------------------------------------------

    window.schliesseMitarbeiterDetails =
        function() {

            const details =
                element("mitarbeiterDetails");

            if (details) {
                details.style.display =
                    "none";
            }

            aktuellerMitarbeiterDetails =
                null;
        };

    // ---------------------------------------------------------
    // Mitarbeiter laden
    // ---------------------------------------------------------

    await ladeMitarbeiter();

        // =========================================================
    // TEIL 5/7 – PREISVERWALTUNG / ITEMS
    // =========================================================

    let alleItems = [];
    let aktuellesItem = null;

    // ---------------------------------------------------------
    // Items laden
    // ---------------------------------------------------------

    async function ladeItems() {

        const liste =
            element("itemsListe");

        if (liste) {
            liste.innerHTML =
                "Items werden geladen...";
        }

        const {
            data,
            error
        } = await supabase
            .from("items")
            .select("*")
            .order("name", {
                ascending: true
            });

        if (error) {

            console.error(
                "Fehler beim Laden der Items:",
                error
            );

            setzeWert(
                "preiseMessage",
                "Items konnten nicht geladen werden."
            );

            if (liste) {
                liste.innerHTML = "";
            }

            return;
        }

        alleItems =
            data || [];

        zeigeItems();
    }

    // ---------------------------------------------------------
    // Items anzeigen
    // ---------------------------------------------------------

    function zeigeItems(
        suchbegriff = ""
    ) {

        const liste =
            element("itemsListe");

        if (!liste) {
            return;
        }

        const suche =
            String(suchbegriff)
                .trim()
                .toLowerCase();

        const gefilterteItems =
            alleItems.filter(item => {

                if (!suche) {
                    return true;
                }

                return Object.values(item)
                    .some(wert =>
                        String(
                            wert ?? ""
                        )
                        .toLowerCase()
                        .includes(suche)
                    );
            });

        if (gefilterteItems.length === 0) {

            liste.innerHTML = `
                <div class="verwaltung-empty">
                    Keine passenden Items gefunden.
                </div>
            `;

            return;
        }

        liste.innerHTML = "";

        gefilterteItems.forEach(
            item => {

                liste.appendChild(
                    erstelleItemZeile(item)
                );

            }
        );
    }

    // ---------------------------------------------------------
    // Item-Zeile
    // ---------------------------------------------------------

    function erstelleItemZeile(item) {

        const zeile =
            document.createElement("div");

        zeile.className =
            "verwaltung-item";

        const itemName =
            item.name ??
            item.item_name ??
            item.minecraft_name ??
            item.minecraft_item ??
            "Unbekannt";

        const kategorie =
            item.category ??
            item.kategorie ??
            item.type ??
            "–";

        const itemPreis =
            item.price ??
            item.preis ??
            item.value ??
            item.wert ??
            null;

        zeile.innerHTML = `
            <div>

                <strong>
                    ${escapeHTML(itemName)}
                </strong>

                <div>
                    Kategorie:
                    ${escapeHTML(kategorie)}
                </div>

                <div>
                    Preis:
                    ${preis(itemPreis)}
                </div>

            </div>

            <div class="details-actions">

                <button
                    class="verwaltung-button"
                    type="button"
                    onclick="itemBearbeiten('${escapeHTML(
                        item.id
                    )}'); event.stopPropagation();"
                >
                    Bearbeiten
                </button>

                <button
                    class="verwaltung-button danger"
                    type="button"
                    onclick="itemLoeschen('${escapeHTML(
                        item.id
                    )}'); event.stopPropagation();"
                >
                    Löschen
                </button>

            </div>
        `;

        return zeile;
    }

    // ---------------------------------------------------------
    // Suche
    // ---------------------------------------------------------

    const itemSuche =
        element("itemSuche");

    if (itemSuche) {

        itemSuche.addEventListener(
            "input",
            () => {

                zeigeItems(
                    itemSuche.value
                );

            }
        );
    }

    // ---------------------------------------------------------
    // Item bearbeiten
    // ---------------------------------------------------------

    window.itemBearbeiten =
        async function(id) {

            const item =
                alleItems.find(
                    eintrag =>
                        String(eintrag.id) ===
                        String(id)
                );

            if (!item) {

                zeigeFehler(
                    "Das Item wurde nicht gefunden."
                );

                return;
            }

            aktuellesItem =
                item;

            const itemName =
                item.name ??
                item.item_name ??
                item.minecraft_name ??
                item.minecraft_item ??
                "";

            const kategorie =
                item.category ??
                item.kategorie ??
                item.type ??
                "";

            const aktuellerPreis =
                item.price ??
                item.preis ??
                item.value ??
                item.wert ??
                0;

            const neuerName =
                prompt(
                    "Item-Name:",
                    itemName
                );

            if (neuerName === null) {
                return;
            }

            const neueKategorie =
                prompt(
                    "Kategorie:",
                    kategorie
                );

            if (neueKategorie === null) {
                return;
            }

            const neuerPreis =
                prompt(
                    "Preis:",
                    aktuellerPreis
                );

            if (neuerPreis === null) {
                return;
            }

            const preisZahl =
                Number(
                    neuerPreis
                        .replace(",", ".")
                );

            if (
                !Number.isFinite(
                    preisZahl
                ) ||
                preisZahl < 0
            ) {

                zeigeFehler(
                    "Bitte einen gültigen Preis eingeben."
                );

                return;
            }

            try {

                // -------------------------------------------------
                // Nur tatsächlich vorhandene Spalten aktualisieren
                // -------------------------------------------------

                const updateData = {};

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "name"
                    )
                ) {
                    updateData.name =
                        neuerName.trim();
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "item_name"
                    )
                ) {
                    updateData.item_name =
                        neuerName.trim();
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "minecraft_name"
                    )
                ) {
                    updateData.minecraft_name =
                        neuerName.trim();
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "minecraft_item"
                    )
                ) {
                    updateData.minecraft_item =
                        neuerName.trim();
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "category"
                    )
                ) {
                    updateData.category =
                        neueKategorie.trim();
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "kategorie"
                    )
                ) {
                    updateData.kategorie =
                        neueKategorie.trim();
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "type"
                    )
                ) {
                    updateData.type =
                        neueKategorie.trim();
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "price"
                    )
                ) {
                    updateData.price =
                        preisZahl;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "preis"
                    )
                ) {
                    updateData.preis =
                        preisZahl;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "value"
                    )
                ) {
                    updateData.value =
                        preisZahl;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "wert"
                    )
                ) {
                    updateData.wert =
                        preisZahl;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "updated_at"
                    )
                ) {
                    updateData.updated_at =
                        new Date().toISOString();
                }

                const {
                    error
                } = await supabase
                    .from("items")
                    .update(updateData)
                    .eq("id", id);

                if (error) {
                    throw error;
                }

                zeigeErfolg(
                    "Item wurde erfolgreich geändert."
                );

                aktuellesItem =
                    null;

                await ladeItems();

            } catch (error) {

                console.error(
                    "Fehler beim Bearbeiten des Items:",
                    error
                );

                zeigeFehler(
                    "Das Item konnte nicht geändert werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );
            }
        };

    // ---------------------------------------------------------
    // Item löschen
    // ---------------------------------------------------------

    window.itemLoeschen =
        async function(id) {

            const item =
                alleItems.find(
                    eintrag =>
                        String(eintrag.id) ===
                        String(id)
                );

            if (!item) {

                zeigeFehler(
                    "Das Item wurde nicht gefunden."
                );

                return;
            }

            const itemName =
                item.name ??
                item.item_name ??
                item.minecraft_name ??
                item.minecraft_item ??
                "dieses Item";

            if (
                !confirm(
                    `„${itemName}“ wirklich löschen?`
                )
            ) {
                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from("items")
                    .delete()
                    .eq("id", id);

                if (error) {
                    throw error;
                }

                zeigeErfolg(
                    "Item wurde erfolgreich gelöscht."
                );

                await ladeItems();

            } catch (error) {

                console.error(
                    "Fehler beim Löschen des Items:",
                    error
                );

                zeigeFehler(
                    "Das Item konnte nicht gelöscht werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );
            }
        };

    // ---------------------------------------------------------
    // Neues Item
    // ---------------------------------------------------------

    const neuesItemButton =
        element("neuesItemButton");

    if (neuesItemButton) {

        neuesItemButton.addEventListener(
            "click",
            async () => {

                const name =
                    prompt(
                        "Name des neuen Items:"
                    );

                if (
                    name === null ||
                    !name.trim()
                ) {
                    return;
                }

                const kategorie =
                    prompt(
                        "Kategorie:"
                    );

                if (kategorie === null) {
                    return;
                }

                const preisEingabe =
                    prompt(
                        "Preis:"
                    );

                if (preisEingabe === null) {
                    return;
                }

                const neuerPreis =
                    Number(
                        preisEingabe
                            .replace(",", ".")
                    );

                if (
                    !Number.isFinite(
                        neuerPreis
                    ) ||
                    neuerPreis < 0
                ) {

                    zeigeFehler(
                        "Bitte einen gültigen Preis eingeben."
                    );

                    return;
                }

                try {

                    // -------------------------------------------------
                    // Vorhandenes Item als Vorlage verwenden
                    // -------------------------------------------------

                    if (
                        alleItems.length === 0
                    ) {

                        zeigeFehler(
                            "Es ist noch kein Item vorhanden, anhand dessen die Spaltenstruktur erkannt werden kann."
                        );

                        return;
                    }

                    const vorlage =
                        alleItems[0];

                    const insertData = {};

                    // Name
                    if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "name"
                        )
                    ) {
                        insertData.name =
                            name.trim();
                    } else if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "item_name"
                        )
                    ) {
                        insertData.item_name =
                            name.trim();
                    } else if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "minecraft_name"
                        )
                    ) {
                        insertData.minecraft_name =
                            name.trim();
                    } else if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "minecraft_item"
                        )
                    ) {
                        insertData.minecraft_item =
                            name.trim();
                    }

                    // Kategorie
                    if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "category"
                        )
                    ) {
                        insertData.category =
                            kategorie.trim();
                    } else if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "kategorie"
                        )
                    ) {
                        insertData.kategorie =
                            kategorie.trim();
                    } else if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "type"
                        )
                    ) {
                        insertData.type =
                            kategorie.trim();
                    }

                    // Preis
                    if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "price"
                        )
                    ) {
                        insertData.price =
                            neuerPreis;
                    } else if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "preis"
                        )
                    ) {
                        insertData.preis =
                            neuerPreis;
                    } else if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "value"
                        )
                    ) {
                        insertData.value =
                            neuerPreis;
                    } else if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "wert"
                        )
                    ) {
                        insertData.wert =
                            neuerPreis;
                    }

                    // updated_at nur wenn vorhanden
                    if (
                        Object.prototype.hasOwnProperty.call(
                            vorlage,
                            "updated_at"
                        )
                    ) {
                        insertData.updated_at =
                            new Date().toISOString();
                    }

                    const {
                        error
                    } = await supabase
                        .from("items")
                        .insert(insertData);

                    if (error) {
                        throw error;
                    }

                    zeigeErfolg(
                        "Neues Item wurde erfolgreich angelegt."
                    );

                    await ladeItems();

                } catch (error) {

                    console.error(
                        "Fehler beim Erstellen des Items:",
                        error
                    );

                    zeigeFehler(
                        "Das neue Item konnte nicht erstellt werden.\n\n" +
                        (
                            error.message ||
                            "Unbekannter Fehler"
                        )
                    );
                }
            }
        );
    }

    // ---------------------------------------------------------
    // Items initial laden
    // ---------------------------------------------------------

    await ladeItems();

        // =========================================================
    // TEIL 6/7 – BÜNDNISSE
    // =========================================================

    let alleBuendnisse = [];
    let aktuellesBuendnis = null;

    // ---------------------------------------------------------
    // Bündnisse laden
    // ---------------------------------------------------------

    async function ladeBuendnisse() {

        const liste =
            element("buendnisseListe");

        if (liste) {
            liste.innerHTML =
                "Bündnisse werden geladen...";
        }

        const {
            data,
            error
        } = await supabase
            .from("buendnisse")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (error) {

            console.error(
                "Fehler beim Laden der Bündnisse:",
                error
            );

            setzeWert(
                "buendnisseMessage",
                "Bündnisse konnten nicht geladen werden."
            );

            if (liste) {
                liste.innerHTML = "";
            }

            return;
        }

        alleBuendnisse =
            data || [];

        // -----------------------------------------------------
        // Statistik
        // -----------------------------------------------------

        const offen =
            alleBuendnisse.filter(
                buendnis =>
                    buendnis.status === "Offen"
            ).length;

        const aktiv =
            alleBuendnisse.filter(
                buendnis =>
                    buendnis.status === "Angenommen"
            ).length;

        const abgelehnt =
            alleBuendnisse.filter(
                buendnis =>
                    buendnis.status === "Abgelehnt"
            ).length;

        setzeWert(
            "buendnisseOffen",
            offen
        );

        setzeWert(
            "buendnisseAktiv",
            aktiv
        );

        setzeWert(
            "buendnisseAbgelehnt",
            abgelehnt
        );

        setzeWert(
            "buendnisseGesamt",
            alleBuendnisse.length
        );

        // -----------------------------------------------------
        // Liste
        // -----------------------------------------------------

        if (!liste) {
            return;
        }

        if (alleBuendnisse.length === 0) {

            liste.innerHTML = `
                <div class="verwaltung-empty">
                    Keine Bündnisse vorhanden.
                </div>
            `;

            return;
        }

        liste.innerHTML = "";

        alleBuendnisse.forEach(
            buendnis => {

                liste.appendChild(
                    erstelleBuendnisKarte(
                        buendnis
                    )
                );

            }
        );
    }

    // ---------------------------------------------------------
    // Bündniskarte
    // ---------------------------------------------------------

    function erstelleBuendnisKarte(
        buendnis
    ) {

        const karte =
            document.createElement("div");

        karte.className =
            "verwaltung-item";

        let statusKlasse =
            "status-offen";

        if (
            buendnis.status === "Angenommen"
        ) {
            statusKlasse =
                "status-angenommen";
        }

        if (
            buendnis.status === "Abgelehnt"
        ) {
            statusKlasse =
                "status-abgelehnt";
        }

        karte.innerHTML = `
            <div>

                <strong>
                    ${escapeHTML(
                        buendnis.clan_name ||
                        "Unbekannter Clan"
                    )}
                </strong>

                <div>
                    ${
                        buendnis.buendnis_id
                            ? escapeHTML(
                                buendnis.buendnis_id
                            )
                            : "Noch keine Bündnis-ID"
                    }
                </div>

                <div>
                    Ansprechpartner:
                    ${escapeHTML(
                        buendnis.contact_name ||
                        "–"
                    )}
                </div>

                <div>
                    Antrag:
                    ${datum(
                        buendnis.created_at
                    )}
                </div>

            </div>

            <div class="${statusKlasse}">
                ${escapeHTML(
                    buendnis.status ||
                    "Offen"
                )}
            </div>
        `;

        karte.addEventListener(
            "click",
            () => {

                window.zeigeBuendnisDetails(
                    buendnis.id
                );

            }
        );

        return karte;
    }

    // ---------------------------------------------------------
    // Bündnisdetails anzeigen
    // ---------------------------------------------------------

    window.zeigeBuendnisDetails =
        function(id) {

            const buendnis =
                alleBuendnisse.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!buendnis) {

                zeigeFehler(
                    "Das Bündnis wurde nicht gefunden."
                );

                return;
            }

            aktuellesBuendnis =
                buendnis;

            const details =
                element("buendnisDetails");

            const content =
                element(
                    "buendnisDetailsContent"
                );

            if (!details || !content) {
                return;
            }

            content.innerHTML = `

                <h3>
                    ${
                        escapeHTML(
                            buendnis.clan_name ||
                            "Bündnis"
                        )
                    }
                </h3>

                <div class="detail-grid">

                    <div>
                        <strong>Bündnis-ID</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.buendnis_id ||
                                    "Noch nicht vergeben"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Status</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.status ||
                                    "–"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Clan-Name</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.clan_name ||
                                    "–"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Clan-Tag</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.clan_tag ||
                                    "–"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Mitglieder</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.clan_member_count ??
                                    "–"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Clan seit</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.clan_since ||
                                    "–"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Discord</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.clan_discord ||
                                    "–"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Ansprechpartner</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.contact_name ||
                                    "–"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Minecraft-Name</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.minecraft_name ||
                                    "–"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Discord-Name</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.discord_name ||
                                    "–"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Clan-Rolle</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.clan_role ||
                                    "–"
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Erstellt</strong>
                        <span>
                            ${
                                datum(
                                    buendnis.created_at
                                )
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Rabatt</strong>
                        <span>
                            ${
                                Number(
                                    buendnis.discount_percent ||
                                    0
                                ).toLocaleString(
                                    "de-DE"
                                )
                            } %
                        </span>
                    </div>

                    <div>
                        <strong>Aktiv seit</strong>
                        <span>
                            ${
                                escapeHTML(
                                    buendnis.active_since ||
                                    "–"
                                )
                            }
                        </span>
                    </div>

                </div>

                <div class="detail-text">

                    <strong>Clan-Beschreibung</strong>

                    <p>
                        ${
                            escapeHTML(
                                buendnis.clan_description ||
                                "–"
                            )
                        }
                    </p>

                </div>

                <div class="detail-text">

                    <strong>Grund für die Bewerbung</strong>

                    <p>
                        ${
                            escapeHTML(
                                buendnis.reason ||
                                "–"
                            )
                        }
                    </p>

                </div>

                <div class="detail-text">

                    <strong>Gewünschte Zusammenarbeit</strong>

                    <p>
                        ${
                            escapeHTML(
                                buendnis.cooperation ||
                                "–"
                            )
                        }
                    </p>

                </div>

                <div class="detail-text">

                    <strong>Gewünschte Vereinbarung</strong>

                    <p>
                        ${
                            escapeHTML(
                                buendnis.desired_agreement ||
                                "–"
                            )
                        }
                    </p>

                </div>

                <div class="detail-text">

                    <strong>Antragstext</strong>

                    <p>
                        ${
                            escapeHTML(
                                buendnis.application_text ||
                                "–"
                            )
                        }
                    </p>

                </div>

                ${
                    buendnis.agreement
                        ? `
                            <div class="detail-text">

                                <strong>
                                    Vereinbarung
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        buendnis.agreement
                                    )}
                                </p>

                            </div>
                        `
                        : ""
                }

                ${
                    buendnis.decision_note
                        ? `
                            <div class="detail-text">

                                <strong>
                                    Entscheidungsnotiz
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        buendnis.decision_note
                                    )}
                                </p>

                            </div>
                        `
                        : ""
                }

                <div class="details-actions">

                    ${
                        buendnis.status === "Offen"
                            ? `
                                <button
                                    class="verwaltung-button success"
                                    onclick="buendnisAnnehmen('${escapeHTML(
                                        buendnis.id
                                    )}')"
                                >
                                    Bündnis annehmen
                                </button>

                                <button
                                    class="verwaltung-button danger"
                                    onclick="buendnisAblehnen('${escapeHTML(
                                        buendnis.id
                                    )}')"
                                >
                                    Bündnis ablehnen
                                </button>
                            `
                            : ""
                    }

                    ${
                        buendnis.status === "Angenommen"
                            ? `
                                <button
                                    class="verwaltung-button"
                                    onclick="buendnisBearbeiten('${escapeHTML(
                                        buendnis.id
                                    )}')"
                                >
                                    Vereinbarung bearbeiten
                                </button>
                            `
                            : ""
                    }

                    <button
                        class="verwaltung-button danger"
                        onclick="buendnisLoeschen('${escapeHTML(
                            buendnis.id
                        )}')"
                    >
                        Bündnis löschen
                    </button>

                    <button
                        class="verwaltung-button"
                        onclick="schliesseBuendnisDetails()"
                    >
                        Schließen
                    </button>

                </div>
            `;

            details.style.display =
                "block";
        };

    // ---------------------------------------------------------
    // Details schließen
    // ---------------------------------------------------------

    window.schliesseBuendnisDetails =
        function() {

            const details =
                element("buendnisDetails");

            if (details) {
                details.style.display =
                    "none";
            }

            aktuellesBuendnis =
                null;
        };

    // ---------------------------------------------------------
    // Nächste Bündnis-ID ermitteln
    // ---------------------------------------------------------

    async function ermittleNaechsteBuendnisID() {

        const {
            data,
            error
        } = await supabase
            .from("buendnisse")
            .select("buendnis_id");

        if (error) {
            throw error;
        }

        let hoechsteNummer = 0;

        (data || []).forEach(
            eintrag => {

                const wert =
                    eintrag.buendnis_id;

                if (
                    typeof wert !== "string"
                ) {
                    return;
                }

                const match =
                    wert.match(
                        /^BND-(\d+)$/
                    );

                if (!match) {
                    return;
                }

                const nummer =
                    Number(match[1]);

                if (
                    Number.isFinite(nummer) &&
                    nummer > hoechsteNummer
                ) {
                    hoechsteNummer =
                        nummer;
                }
            }
        );

        const naechsteNummer =
            hoechsteNummer + 1;

        return (
            "BND-" +
            String(naechsteNummer)
                .padStart(4, "0")
        );
    }

    // ---------------------------------------------------------
    // Bündnis annehmen
    // ---------------------------------------------------------

    window.buendnisAnnehmen =
        async function(id) {

            const buendnis =
                alleBuendnisse.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!buendnis) {

                zeigeFehler(
                    "Das Bündnis wurde nicht gefunden."
                );

                return;
            }

            const bestaetigung =
                confirm(
                    `Bündnis mit „${
                        buendnis.clan_name ||
                        "unbekanntem Clan"
                    }“ annehmen?`
                );

            if (!bestaetigung) {
                return;
            }

            try {

                const buendnisID =
                    await ermittleNaechsteBuendnisID();

                const {
                    error
                } = await supabase
                    .from("buendnisse")
                    .update({
                        status: "Angenommen",
                        buendnis_id: buendnisID,
                        processed_by: user.id,
                        processed_at:
                            new Date().toISOString(),
                        active_since:
                            new Date()
                                .toISOString()
                                .split("T")[0],
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq("id", id);

                if (error) {
                    throw error;
                }

                zeigeErfolg(
                    `Bündnis wurde angenommen. ID: ${buendnisID}`
                );

                window.schliesseBuendnisDetails();

                await ladeBuendnisse();

            } catch (error) {

                console.error(
                    "Fehler beim Annehmen des Bündnisses:",
                    error
                );

                zeigeFehler(
                    "Das Bündnis konnte nicht angenommen werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );
            }
        };

    // ---------------------------------------------------------
    // Bündnis ablehnen
    // ---------------------------------------------------------

    window.buendnisAblehnen =
        async function(id) {

            const buendnis =
                alleBuendnisse.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!buendnis) {

                zeigeFehler(
                    "Das Bündnis wurde nicht gefunden."
                );

                return;
            }

            const notiz =
                prompt(
                    "Warum wird das Bündnis abgelehnt?",
                    ""
                );

            if (notiz === null) {
                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from("buendnisse")
                    .update({
                        status: "Abgelehnt",
                        decision_note:
                            notiz.trim(),
                        processed_by: user.id,
                        processed_at:
                            new Date().toISOString(),
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq("id", id);

                if (error) {
                    throw error;
                }

                zeigeErfolg(
                    "Bündnis wurde abgelehnt."
                );

                window.schliesseBuendnisDetails();

                await ladeBuendnisse();

            } catch (error) {

                console.error(
                    "Fehler beim Ablehnen des Bündnisses:",
                    error
                );

                zeigeFehler(
                    "Das Bündnis konnte nicht abgelehnt werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );
            }
        };

    // ---------------------------------------------------------
    // Bündnis bearbeiten
    // ---------------------------------------------------------

    window.buendnisBearbeiten =
        async function(id) {

            const buendnis =
                alleBuendnisse.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!buendnis) {

                zeigeFehler(
                    "Das Bündnis wurde nicht gefunden."
                );

                return;
            }

            const vereinbarung =
                prompt(
                    "Vereinbarung / Abmachung:",
                    buendnis.agreement || ""
                );

            if (vereinbarung === null) {
                return;
            }

            const rabatt =
                prompt(
                    "Rabatt in Prozent (0–100):",
                    buendnis.discount_percent ?? 0
                );

            if (rabatt === null) {
                return;
            }

            const rabattZahl =
                Number(
                    rabatt
                        .replace(",", ".")
                );

            if (
                !Number.isFinite(
                    rabattZahl
                ) ||
                rabattZahl < 0 ||
                rabattZahl > 100
            ) {

                zeigeFehler(
                    "Der Rabatt muss zwischen 0 und 100 % liegen."
                );

                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from("buendnisse")
                    .update({
                        agreement:
                            vereinbarung.trim(),
                        discount_percent:
                            rabattZahl,
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq("id", id);

                if (error) {
                    throw error;
                }

                zeigeErfolg(
                    "Bündnis wurde erfolgreich bearbeitet."
                );

                window.schliesseBuendnisDetails();

                await ladeBuendnisse();

            } catch (error) {

                console.error(
                    "Fehler beim Bearbeiten des Bündnisses:",
                    error
                );

                zeigeFehler(
                    "Das Bündnis konnte nicht bearbeitet werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );
            }
        };

    // ---------------------------------------------------------
    // Bündnis löschen
    // ---------------------------------------------------------

    window.buendnisLoeschen =
        async function(id) {

            const buendnis =
                alleBuendnisse.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!buendnis) {

                zeigeFehler(
                    "Das Bündnis wurde nicht gefunden."
                );

                return;
            }

            if (
                !confirm(
                    `Bündnis „${
                        buendnis.clan_name ||
                        "unbekannt"
                    }“ wirklich löschen?`
                )
            ) {
                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from("buendnisse")
                    .delete()
                    .eq("id", id);

                if (error) {
                    throw error;
                }

                zeigeErfolg(
                    "Bündnis wurde erfolgreich gelöscht."
                );

                window.schliesseBuendnisDetails();

                await ladeBuendnisse();

            } catch (error) {

                console.error(
                    "Fehler beim Löschen des Bündnisses:",
                    error
                );

                zeigeFehler(
                    "Das Bündnis konnte nicht gelöscht werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );
            }
        };

    // ---------------------------------------------------------
    // Bündnisse initial laden
    // ---------------------------------------------------------

    await ladeBuendnisse();

        // =========================================================
// TEIL 7/7 – NAVIGATION & ABSCHLUSS
// =========================================================

// ---------------------------------------------------------
// Verwaltungsbereiche
// ---------------------------------------------------------

const verwaltungsBereiche = [
    "section-bewerbungen",
    "section-auftraege",
    "section-mitarbeiter",
    "section-preise",
    "section-buendnisse"
];

// ---------------------------------------------------------
// Alle Verwaltungsbereiche ausblenden
// ---------------------------------------------------------

function versteckeAlleVerwaltungsbereiche() {

    verwaltungsBereiche.forEach(id => {

        const bereich =
            document.getElementById(id);

        if (bereich) {
            bereich.style.display = "none";
        }

    });
}

// ---------------------------------------------------------
// Einen Verwaltungsbereich anzeigen
// ---------------------------------------------------------

function zeigeVerwaltungsbereich(name) {

    versteckeAlleVerwaltungsbereiche();

    const bereich =
        document.getElementById(
            "section-" + name
        );

    if (bereich) {
        bereich.style.display = "block";
    }
}

// ---------------------------------------------------------
// Navigation
// ---------------------------------------------------------

document
    .querySelectorAll(".nav-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const bereich =
                    button.dataset.section;

                if (!bereich) {
                    return;
                }

                // Nur den ausgewählten Bereich anzeigen
                zeigeVerwaltungsbereich(
                    bereich
                );

                // Aktiven Button markieren
                document
                    .querySelectorAll(".nav-button")
                    .forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );

                    });

                button.classList.add(
                    "active"
                );

                // -------------------------------------------------
                // Daten des ausgewählten Bereichs neu laden
                // -------------------------------------------------

                try {

                    if (
                        bereich ===
                        "bewerbungen"
                    ) {

                        await ladeBewerbungen();

                    } else if (
                        bereich ===
                        "auftraege"
                    ) {

                        await ladeAuftraege(
                            aktuelleAuftragsart
                        );

                    } else if (
                        bereich ===
                        "mitarbeiter"
                    ) {

                        await ladeMitarbeiter();

                    } else if (
                        bereich ===
                        "preise"
                    ) {

                        await ladeItems();

                    } else if (
                        bereich ===
                        "buendnisse"
                    ) {

                        await ladeBuendnisse();

                    }

                } catch (error) {

                    console.error(
                        "Fehler beim Laden des Verwaltungsbereichs:",
                        error
                    );

                }

            }
        );

    });

// ---------------------------------------------------------
// Startbereich: Bewerbungen
// ---------------------------------------------------------

versteckeAlleVerwaltungsbereiche();

zeigeVerwaltungsbereich(
    "bewerbungen"
);

// ---------------------------------------------------------
// Ersten Button aktiv markieren
// ---------------------------------------------------------

const ersterButton =
    document.querySelector(
        '.nav-button[data-section="bewerbungen"]'
    );

if (ersterButton) {

    ersterButton.classList.add(
        "active"
    );

}

// ---------------------------------------------------------
// Sicherheitsprüfung
// ---------------------------------------------------------

console.log(
    "EHRENMARKT Verwaltung vollständig geladen."
);

console.log(
    "Angemeldeter Benutzer:",
    user.id
);

console.log(
    "Verwaltungsmitarbeiter:",
    aktuellerMitarbeiter
);

// =========================================================
// ENDE VERWALTUNG.JS
// =========================================================

});
