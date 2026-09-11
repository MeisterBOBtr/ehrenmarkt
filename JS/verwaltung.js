// ============================================================
// EHRENMARKT – VERWALTUNG
// verwaltung.js – Teil 1/13
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    // ------------------------------------------------------------
    // SUPABASE
    // ------------------------------------------------------------

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase-Client wurde nicht gefunden.");
        return;
    }

    // ------------------------------------------------------------
    // GLOBALE VARIABLEN DER VERWALTUNG
    // ------------------------------------------------------------

    let user = null;
    let aktuellerMitarbeiter = null;

    let aktuelleAuftragsart = "bau";

    let aktuellerBewerbungsDatensatz = null;
    let aktuellerAuftragsDatensatz = null;
    let aktuellerMitarbeiterDatensatz = null;
    let aktuellerBuendnisDatensatz = null;
    let aktuellesItem = null;

    let alleBewerbungen = [];
    let alleAuftraege = [];
    let alleMitarbeiter = [];
    let alleBuendnisse = [];
    let alleItems = [];

    // ------------------------------------------------------------
    // PREISVERWALTUNG
    // ------------------------------------------------------------

    let aktuellerPreisTab = "alle";
    let aktuelleItemSeite = 1;

    const ITEMS_PRO_SEITE = 10;

    // ------------------------------------------------------------
    // HILFSFUNKTION: ELEMENT
    // ------------------------------------------------------------

    function element(id) {
        return document.getElementById(id);
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: WERT SETZEN
    // ------------------------------------------------------------

    function setzeWert(id, wert) {

        const el = element(id);

        if (!el) {
            return;
        }

        if (
            el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.tagName === "SELECT"
        ) {
            el.value = wert ?? "";
        } else {
            el.textContent = wert ?? "";
        }
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: HTML SICHER MACHEN
    // ------------------------------------------------------------

    function verwaltungEscape(wert) {

        if (
            wert === null ||
            wert === undefined
        ) {
            return "";
        }

        return String(wert)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: DATUM
    // ------------------------------------------------------------

    function verwaltungDatum(wert) {

        if (!wert) {
            return "—";
        }

        const datum = new Date(wert);

        if (Number.isNaN(datum.getTime())) {
            return String(wert);
        }

        return datum.toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: NUR DATUM
    // ------------------------------------------------------------

    function verwaltungNurDatum(wert) {

        if (!wert) {
            return "—";
        }

        const datum = new Date(wert);

        if (Number.isNaN(datum.getTime())) {
            return String(wert);
        }

        return datum.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: PREIS
    // ------------------------------------------------------------

    function verwaltungPreis(wert) {

        const preis = Number(wert);

        if (!Number.isFinite(preis)) {
            return "0,00 $";
        }

        return preis.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + " $";
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: ZAHL
    // ------------------------------------------------------------

    function verwaltungZahl(wert) {

        const zahl = Number(wert);

        if (!Number.isFinite(zahl)) {
            return "0";
        }

        return zahl.toLocaleString("de-DE");
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: FEHLERTEXT
    // ------------------------------------------------------------

    function verwaltungFehlerText(error) {

        if (!error) {
            return "Unbekannter Fehler";
        }

        if (error.message) {
            return error.message;
        }

        return String(error);
    }

    // ------------------------------------------------------------
    // FEHLERMELDUNG
    // ------------------------------------------------------------

    function verwaltungZeigeFehler(text, ziel = null) {

        const message =
            ziel ||
            element("bewerbungenMessage") ||
            element("auftraegeMessage") ||
            element("mitarbeiterMessage") ||
            element("preiseMessage") ||
            element("buendnisseMessage");

        if (!message) {
            console.error(text);
            return;
        }

        message.textContent = text;
        message.className = "message error";
        message.style.display = "block";
    }

    // ------------------------------------------------------------
    // ERFOLGSMELDUNG
    // ------------------------------------------------------------

    function verwaltungZeigeErfolg(text, ziel = null) {

        const message =
            ziel ||
            element("bewerbungenMessage") ||
            element("auftraegeMessage") ||
            element("mitarbeiterMessage") ||
            element("preiseMessage") ||
            element("buendnisseMessage");

        if (!message) {
            console.log(text);
            return;
        }

        message.textContent = text;
        message.className = "message success";
        message.style.display = "block";
    }

    // ------------------------------------------------------------
    // MELDUNG AUSBLENDEN
    // ------------------------------------------------------------

    function verwaltungMeldungAusblenden(id) {

        const message = element(id);

        if (message) {
            message.style.display = "none";
        }
    }

    // ------------------------------------------------------------
    // VERWALTUNGSBEREICHE
    // ------------------------------------------------------------

    const verwaltungsBereiche = [
        "section-bewerbungen",
        "section-auftraege",
        "section-mitarbeiter",
        "section-preise",
        "section-buendnisse"
    ];

    // ------------------------------------------------------------
    // ALLE BEREICHE AUSBLENDEN
    // ------------------------------------------------------------

    function versteckeAlleVerwaltungsbereiche() {

        verwaltungsBereiche.forEach(id => {

            const bereich = element(id);

            if (bereich) {
                bereich.style.display = "none";
            }

        });
    }

    // ------------------------------------------------------------
    // EINEN BEREICH ANZEIGEN
    // ------------------------------------------------------------

    function zeigeVerwaltungsbereich(name) {

        versteckeAlleVerwaltungsbereiche();

        const bereich = element(
            "section-" + name
        );

        if (bereich) {
            bereich.style.display = "block";
        }

        document
            .querySelectorAll(".nav-button")
            .forEach(button => {

                button.classList.remove("active");

                if (
                    button.dataset.section === name
                ) {
                    button.classList.add("active");
                }

            });
    }

    // ------------------------------------------------------------
    // ZUGRIFFSPRÜFUNG
    // ------------------------------------------------------------

    async function pruefeVerwaltungsZugriff() {

        const accessMessage =
            element("accessMessage");

        if (accessMessage) {
            accessMessage.style.display = "none";
        }

        try {

            const {
                data: userData,
                error: userError
            } = await supabase.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (
                !userData ||
                !userData.user
            ) {

                if (accessMessage) {

                    accessMessage.textContent =
                        "Du musst angemeldet sein, um die Verwaltung zu öffnen.";

                    accessMessage.style.display =
                        "block";
                }

                return false;
            }

            user = userData.user;

            // ----------------------------------------------------
            // AKTIVEN MITARBEITER LADEN
            // ----------------------------------------------------

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
                    is_available
                `)
                .eq("user_id", user.id)
                .eq("is_active", true)
                .maybeSingle();

            if (mitarbeiterError) {
                throw mitarbeiterError;
            }

            if (!mitarbeiter) {

                if (accessMessage) {

                    accessMessage.textContent =
                        "Du besitzt keinen aktiven Mitarbeiterzugang.";

                    accessMessage.style.display =
                        "block";
                }

                return false;
            }

            aktuellerMitarbeiter =
                mitarbeiter;

            // ----------------------------------------------------
            // NUR LEITUNG UND STADTLEITUNG
            // ----------------------------------------------------

            const erlaubteRaenge = [
                "Leitung",
                "Stadtleitung"
            ];

            if (
                !erlaubteRaenge.includes(
                    mitarbeiter.rang
                )
            ) {

                if (accessMessage) {

                    accessMessage.textContent =
                        "Du hast keine Berechtigung für die Verwaltung.";

                    accessMessage.style.display =
                        "block";
                }

                return false;
            }

            console.log(
                "Verwaltungszugriff erlaubt:",
                mitarbeiter.name,
                "| Rang:",
                mitarbeiter.rang
            );

            return true;

        } catch (error) {

            console.error(
                "Fehler bei der Zugriffsprüfung:",
                error
            );

            if (accessMessage) {

                accessMessage.textContent =
                    "Der Verwaltungszugriff konnte nicht geprüft werden.";

                accessMessage.style.display =
                    "block";
            }

            return false;
        }
    }

    // ------------------------------------------------------------
    // NAVIGATION VORBEREITEN
    // ------------------------------------------------------------

    function initialisiereNavigation() {

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

                        zeigeVerwaltungsbereich(
                            bereich
                        );

                        try {

                            if (
                                bereich ===
                                "bewerbungen"
                            ) {

                                if (
                                    typeof ladeBewerbungen ===
                                    "function"
                                ) {
                                    await ladeBewerbungen();
                                }

                            } else if (
                                bereich ===
                                "auftraege"
                            ) {

                                if (
                                    typeof ladeAuftraege ===
                                    "function"
                                ) {
                                    await ladeAuftraege(
                                        aktuelleAuftragsart
                                    );
                                }

                            } else if (
                                bereich ===
                                "mitarbeiter"
                            ) {

                                if (
                                    typeof ladeMitarbeiter ===
                                    "function"
                                ) {
                                    await ladeMitarbeiter();
                                }

                            } else if (
                                bereich ===
                                "preise"
                            ) {

                                if (
                                    typeof ladeItems ===
                                    "function"
                                ) {
                                    await ladeItems();
                                }

                            } else if (
                                bereich ===
                                "buendnisse"
                            ) {

                                if (
                                    typeof ladeBuendnisse ===
                                    "function"
                                ) {
                                    await ladeBuendnisse();
                                }
                            }

                        } catch (error) {

                            console.error(
                                "Fehler beim Wechseln des Verwaltungsbereichs:",
                                error
                            );

                        }
                    }
                );

            });
    }

    // ------------------------------------------------------------
    // DETAIL-PANELS SCHLIESSEN
    // ------------------------------------------------------------

    window.schliesseBewerbungDetails =
        function () {

            const panel =
                element("bewerbungDetails");

            if (panel) {
                panel.style.display =
                    "none";
            }

            aktuellerBewerbungsDatensatz =
                null;
        };

    window.schliesseAuftragDetails =
        function () {

            const panel =
                element("auftragDetails");

            if (panel) {
                panel.style.display =
                    "none";
            }

            aktuellerAuftragsDatensatz =
                null;
        };

    window.schliesseMitarbeiterDetails =
        function () {

            const panel =
                element("mitarbeiterDetails");

            if (panel) {
                panel.style.display =
                    "none";
            }

            aktuellerMitarbeiterDatensatz =
                null;
        };

    window.schliesseBuendnisDetails =
        function () {

            const panel =
                element("buendnisDetails");

            if (panel) {
                panel.style.display =
                    "none";
            }

            aktuellerBuendnisDatensatz =
                null;
        };

    // ------------------------------------------------------------
    // VERWALTUNGSZUGRIFF STARTEN
    // ------------------------------------------------------------

    const zugriffErlaubt =
        await pruefeVerwaltungsZugriff();

    if (!zugriffErlaubt) {
        return;
    }

    // ------------------------------------------------------------
    // NAVIGATION STARTEN
    // ------------------------------------------------------------

    initialisiereNavigation();

    // ------------------------------------------------------------
    // STANDARD: BEWERBUNGEN
    // ------------------------------------------------------------

    versteckeAlleVerwaltungsbereiche();

    zeigeVerwaltungsbereich(
        "bewerbungen"
    );

    console.log(
        "EHRENMARKT Verwaltung gestartet."
    );

    // ============================================================
    // ENDE TEIL 1/13
    // TEIL 2 KOMMT HIER DIREKT DARUNTER
    // ============================================================

        // ============================================================
    // BEWERBUNGSVERWALTUNG
    // Teil 2/13
    // ============================================================

    async function ladeBewerbungen() {

        const liste = element("bewerbungenListe");
        const message = element("bewerbungenMessage");

        if (!liste) {
            return;
        }

        liste.innerHTML = `
            <div class="loading">
                Bewerbungen werden geladen...
            </div>
        `;

        try {

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
                throw error;
            }

            alleBewerbungen = data || [];

            // ----------------------------------------------------
            // STATISTIK
            // ----------------------------------------------------

            const offen =
                alleBewerbungen.filter(
                    bewerbung =>
                        String(
                            bewerbung.status || ""
                        ).toLowerCase() === "offen"
                ).length;

            const angenommen =
                alleBewerbungen.filter(
                    bewerbung =>
                        String(
                            bewerbung.status || ""
                        ).toLowerCase() === "angenommen"
                ).length;

            const abgelehnt =
                alleBewerbungen.filter(
                    bewerbung =>
                        String(
                            bewerbung.status || ""
                        ).toLowerCase() === "abgelehnt"
                ).length;

            setzeWert(
                "bewerbungenOffen",
                verwaltungZahl(offen)
            );

            setzeWert(
                "bewerbungenAngenommen",
                verwaltungZahl(angenommen)
            );

            setzeWert(
                "bewerbungenAbgelehnt",
                verwaltungZahl(abgelehnt)
            );

            setzeWert(
                "bewerbungenGesamt",
                verwaltungZahl(
                    alleBewerbungen.length
                )
            );

            // ----------------------------------------------------
            // KEINE BEWERBUNGEN
            // ----------------------------------------------------

            if (alleBewerbungen.length === 0) {

                liste.innerHTML = `
                    <div class="empty-message">
                        Aktuell liegen keine Bewerbungen vor.
                    </div>
                `;

                return;
            }

            // ----------------------------------------------------
            // BEWERBUNGEN ANZEIGEN
            // ----------------------------------------------------

            liste.innerHTML =
                alleBewerbungen
                    .map(
                        erstelleBewerbungKarte
                    )
                    .join("");

        } catch (error) {

            console.error(
                "Fehler beim Laden der Bewerbungen:",
                error
            );

            liste.innerHTML = `
                <div class="empty-message">
                    Bewerbungen konnten nicht geladen werden.
                </div>
            `;

            if (message) {

                message.textContent =
                    "Fehler beim Laden der Bewerbungen: " +
                    verwaltungFehlerText(error);

                message.className =
                    "message error";

                message.style.display =
                    "block";
            }
        }
    }

    // ------------------------------------------------------------
    // BEWERBUNGSKARTE
    // ------------------------------------------------------------

    function erstelleBewerbungKarte(
        bewerbung
    ) {

        const status =
            String(
                bewerbung.status || "offen"
            ).toLowerCase();

        let statusKlasse =
            "normal";

        let statusText =
            "Offen";

        if (
            status === "angenommen"
        ) {

            statusKlasse =
                "angebot";

            statusText =
                "Angenommen";

        } else if (
            status === "abgelehnt"
        ) {

            statusKlasse =
                "abgelaufen";

            statusText =
                "Abgelehnt";
        }

        const name =
            bewerbung.name ||
            "Unbekannter Bewerber";

        const minecraftName =
            bewerbung.minecraft_name ||
            "—";

        const gewuenschteRolle =
            bewerbung.desired_role ||
            "Keine Angabe";

        const datum =
            verwaltungDatum(
                bewerbung.created_at
            );

        return `
            <div class="list-item">

                <div>

                    <strong>
                        ${verwaltungEscape(
                            name
                        )}
                    </strong>

                    <div style="margin-top:6px;">
                        Minecraft:
                        ${verwaltungEscape(
                            minecraftName
                        )}
                    </div>

                    <div style="margin-top:4px;">
                        Wunschrolle:
                        ${verwaltungEscape(
                            gewuenschteRolle
                        )}
                    </div>

                    <div style="margin-top:4px;">
                        Eingegangen:
                        ${verwaltungEscape(
                            datum
                        )}
                    </div>

                </div>

                <div class="button-row">

                    <span class="item-status ${statusKlasse}">
                        ${statusText}
                    </span>

                    <button
                        type="button"
                        class="table-action primary"
                        onclick="zeigeBewerbungDetails(${Number(
                            bewerbung.id
                        )})">
                        Ansehen
                    </button>

                </div>

            </div>
        `;
    }

    // ------------------------------------------------------------
    // BEWERBUNGSDETAILS ÖFFNEN
    // ------------------------------------------------------------

    window.zeigeBewerbungDetails =
        function(id) {

            const bewerbung =
                alleBewerbungen.find(
                    item =>
                        Number(item.id) ===
                        Number(id)
                );

            if (!bewerbung) {

                verwaltungZeigeFehler(
                    "Die Bewerbung wurde nicht gefunden.",
                    element(
                        "bewerbungenMessage"
                    )
                );

                return;
            }

            aktuellerBewerbungsDatensatz =
                bewerbung;

            const panel =
                element(
                    "bewerbungDetails"
                );

            const content =
                element(
                    "bewerbungDetailsContent"
                );

            if (!panel || !content) {
                return;
            }

            const status =
                String(
                    bewerbung.status ||
                    "offen"
                );

            content.innerHTML = `

                <div class="section-title">
                    Bewerbung von
                    ${verwaltungEscape(
                        bewerbung.name ||
                        "—"
                    )}
                </div>

                <div class="order-grid">

                    <div class="order-card">
                        <strong>Name</strong>
                        <span>
                            ${verwaltungEscape(
                                bewerbung.name ||
                                "—"
                            )}
                        </span>
                    </div>

                    <div class="order-card">
                        <strong>Minecraft-Name</strong>
                        <span>
                            ${verwaltungEscape(
                                bewerbung.minecraft_name ||
                                "—"
                            )}
                        </span>
                    </div>

                    <div class="order-card">
                        <strong>Discord-ID</strong>
                        <span>
                            ${verwaltungEscape(
                                bewerbung.discord_id ||
                                "—"
                            )}
                        </span>
                    </div>

                    <div class="order-card">
                        <strong>Alter</strong>
                        <span>
                            ${verwaltungEscape(
                                bewerbung.age ??
                                "—"
                            )}
                        </span>
                    </div>

                    <div class="order-card">
                        <strong>Gewünschte Rolle</strong>
                        <span>
                            ${verwaltungEscape(
                                bewerbung.desired_role ||
                                "—"
                            )}
                        </span>
                    </div>

                    <div class="order-card">
                        <strong>Status</strong>
                        <span>
                            ${verwaltungEscape(
                                status
                            )}
                        </span>
                    </div>

                </div>

                <div style="margin-top:18px;">

                    <strong>Erfahrung</strong>

                    <div style="margin-top:6px; white-space:pre-wrap;">
                        ${verwaltungEscape(
                            bewerbung.experience ||
                            "—"
                        )}
                    </div>

                </div>

                <div style="margin-top:18px;">

                    <strong>Bisherige Tätigkeiten</strong>

                    <div style="margin-top:6px; white-space:pre-wrap;">
                        ${verwaltungEscape(
                            bewerbung.previous_work ||
                            "—"
                        )}
                    </div>

                </div>

                <div style="margin-top:18px;">

                    <strong>Zusätzliche Fähigkeiten</strong>

                    <div style="margin-top:6px; white-space:pre-wrap;">
                        ${verwaltungEscape(
                            bewerbung.additional_skills ||
                            "—"
                        )}
                    </div>

                </div>

                <div style="margin-top:18px;">

                    <strong>Bewerbungstext</strong>

                    <div style="margin-top:6px; white-space:pre-wrap;">
                        ${verwaltungEscape(
                            bewerbung.application_text ||
                            "—"
                        )}
                    </div>

                </div>

                <div style="margin-top:18px;">

                    <strong>Verfügbarkeit</strong>

                    <div style="margin-top:6px; white-space:pre-wrap;">
                        ${verwaltungEscape(
                            bewerbung.availability ||
                            "—"
                        )}
                    </div>

                </div>

                <div style="margin-top:18px;">

                    <strong>Nicht verfügbare Zeiten</strong>

                    <div style="margin-top:6px; white-space:pre-wrap;">
                        ${verwaltungEscape(
                            bewerbung.unavailable_times ||
                            "—"
                        )}
                    </div>

                </div>

                ${
                    bewerbung.decision_note
                    ? `
                        <div style="margin-top:18px;">

                            <strong>
                                Entscheidungsnotiz
                            </strong>

                            <div style="margin-top:6px; white-space:pre-wrap;">
                                ${verwaltungEscape(
                                    bewerbung.decision_note
                                )}
                            </div>

                        </div>
                    `
                    : ""
                }

                <div
                    class="button-row"
                    style="margin-top:24px;"
                >

                    ${
                        status.toLowerCase() ===
                        "offen"
                        ? `
                            <button
                                type="button"
                                class="action-button success"
                                onclick="bewerbungAnnehmen()">
                                Bewerbung annehmen
                            </button>

                            <button
                                type="button"
                                class="action-button danger"
                                onclick="bewerbungAblehnen()">
                                Bewerbung ablehnen
                            </button>
                        `
                        : ""
                    }

                    <button
                        type="button"
                        class="action-button danger"
                        onclick="bewerbungLoeschen()">
                        Bewerbung löschen
                    </button>

                    <button
                        type="button"
                        class="action-button"
                        onclick="schliesseBewerbungDetails()">
                        Schließen
                    </button>

                </div>
            `;

            panel.style.display =
                "block";

            panel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        };

    // ------------------------------------------------------------
    // BEWERBUNG SCHLIESSEN
    // ------------------------------------------------------------

    window.schliesseBewerbungDetails =
        function() {

            const panel =
                element(
                    "bewerbungDetails"
                );

            if (panel) {
                panel.style.display =
                    "none";
            }

            aktuellerBewerbungsDatensatz =
                null;
        };

    // ------------------------------------------------------------
    // BEWERBUNG ANNEHMEN
    // ------------------------------------------------------------

    window.bewerbungAnnehmen =
        async function() {

            if (
                !aktuellerBewerbungsDatensatz
            ) {
                return;
            }

            const bewerbung =
                aktuellerBewerbungsDatensatz;

            const rolle =
                prompt(
                    "Welche Rolle soll der neue Mitarbeiter erhalten?",
                    bewerbung.assigned_role ||
                    bewerbung.desired_role ||
                    "Mitarbeiter"
                );

            if (rolle === null) {
                return;
            }

            const rang =
                prompt(
                    "Welchen Rang soll der neue Mitarbeiter erhalten?",
                    bewerbung.assigned_rank ||
                    "Mitarbeiter"
                );

            if (rang === null) {
                return;
            }

            if (!rolle.trim()) {

                verwaltungZeigeFehler(
                    "Die Rolle darf nicht leer sein.",
                    element(
                        "bewerbungenMessage"
                    )
                );

                return;
            }

            if (!rang.trim()) {

                verwaltungZeigeFehler(
                    "Der Rang darf nicht leer sein.",
                    element(
                        "bewerbungenMessage"
                    )
                );

                return;
            }

            try {

                // ------------------------------------------------
                // MITARBEITER ERSTELLEN
                // ------------------------------------------------

                const {
                    data: neuerMitarbeiter,
                    error: mitarbeiterError
                } = await supabase
                    .from("employees")
                    .insert({
                        user_id:
                            bewerbung.user_id,

                        name:
                            bewerbung.name,

                        role:
                            rolle.trim(),

                        rang:
                            rang.trim(),

                        is_active:
                            true,

                        is_available:
                            false
                    })
                    .select()
                    .single();

                if (mitarbeiterError) {
                    throw mitarbeiterError;
                }

                // ------------------------------------------------
                // BEWERBUNG AKTUALISIEREN
                // ------------------------------------------------

                const {
                    error: updateError
                } = await supabase
                    .from("applications")
                    .update({
                        status:
                            "angenommen",

                        assigned_role:
                            rolle.trim(),

                        assigned_rank:
                            rang.trim(),

                        processed_by:
                            user.id,

                        processed_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        bewerbung.id
                    );

                if (updateError) {
                    throw updateError;
                }

                console.log(
                    "Neuer Mitarbeiter:",
                    neuerMitarbeiter
                );

                verwaltungZeigeErfolg(
                    "Bewerbung wurde angenommen und der Mitarbeiter wurde erstellt.",
                    element(
                        "bewerbungenMessage"
                    )
                );

                window.schliesseBewerbungDetails();

                await ladeBewerbungen();

                if (
                    typeof ladeMitarbeiter ===
                    "function"
                ) {
                    await ladeMitarbeiter();
                }

            } catch (error) {

                console.error(
                    "Fehler beim Annehmen der Bewerbung:",
                    error
                );

                verwaltungZeigeFehler(
                    "Die Bewerbung konnte nicht angenommen werden.\n\n" +
                    verwaltungFehlerText(error),
                    element(
                        "bewerbungenMessage"
                    )
                );
            }
        };

    // ============================================================
    // ENDE TEIL 2/13
    // TEIL 3 KOMMT DIREKT DARUNTER
    // ============================================================
            // ============================================================
    // BEWERBUNGSVERWALTUNG – ABLEHNEN / LÖSCHEN
    // Teil 3/13
    // ============================================================

    window.bewerbungAblehnen =
        async function() {

            if (
                !aktuellerBewerbungsDatensatz
            ) {
                return;
            }

            const bewerbung =
                aktuellerBewerbungsDatensatz;

            const grund =
                prompt(
                    "Grund für die Ablehnung (optional):",
                    bewerbung.decision_note || ""
                );

            if (grund === null) {
                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from("applications")
                    .update({
                        status: "abgelehnt",
                        processed_by: user.id,
                        processed_at:
                            new Date().toISOString(),
                        decision_note:
                            grund.trim()
                    })
                    .eq(
                        "id",
                        bewerbung.id
                    );

                if (error) {
                    throw error;
                }

                verwaltungZeigeErfolg(
                    "Die Bewerbung wurde abgelehnt.",
                    element(
                        "bewerbungenMessage"
                    )
                );

                window.schliesseBewerbungDetails();

                await ladeBewerbungen();

            } catch (error) {

                console.error(
                    "Fehler beim Ablehnen der Bewerbung:",
                    error
                );

                verwaltungZeigeFehler(
                    "Die Bewerbung konnte nicht abgelehnt werden.\n\n" +
                    verwaltungFehlerText(error),
                    element(
                        "bewerbungenMessage"
                    )
                );
            }
        };

    // ------------------------------------------------------------
    // BEWERBUNG LÖSCHEN
    // ------------------------------------------------------------

    window.bewerbungLoeschen =
        async function() {

            if (
                !aktuellerBewerbungsDatensatz
            ) {
                return;
            }

            const bewerbung =
                aktuellerBewerbungsDatensatz;

            const bestaetigt =
                confirm(
                    "Diese Bewerbung wirklich endgültig löschen?"
                );

            if (!bestaetigt) {
                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from("applications")
                    .delete()
                    .eq(
                        "id",
                        bewerbung.id
                    );

                if (error) {
                    throw error;
                }

                verwaltungZeigeErfolg(
                    "Die Bewerbung wurde gelöscht.",
                    element(
                        "bewerbungenMessage"
                    )
                );

                window.schliesseBewerbungDetails();

                await ladeBewerbungen();

            } catch (error) {

                console.error(
                    "Fehler beim Löschen der Bewerbung:",
                    error
                );

                verwaltungZeigeFehler(
                    "Die Bewerbung konnte nicht gelöscht werden.\n\n" +
                    verwaltungFehlerText(error),
                    element(
                        "bewerbungenMessage"
                    )
                );
            }
        };

    // ------------------------------------------------------------
    // BEWERBUNGEN BEIM START LADEN
    // ------------------------------------------------------------

    await ladeBewerbungen();

    // ============================================================
    // AUFTRAGSVERWALTUNG
    // ============================================================

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

    // ------------------------------------------------------------
    // AUFTRÄGE LADEN
    // ------------------------------------------------------------

    async function ladeAuftraege(
        auftragsart = aktuelleAuftragsart
    ) {

        aktuelleAuftragsart =
            auftragsart || "bau";

        const liste =
            element("auftraegeListe");

        const message =
            element("auftraegeMessage");

        if (!liste) {
            return;
        }

        const konfiguration =
            auftragTabellen[
                aktuelleAuftragsart
            ];

        if (!konfiguration) {

            liste.innerHTML = `
                <div class="empty-message">
                    Unbekannte Auftragsart.
                </div>
            `;

            return;
        }

        liste.innerHTML = `
            <div class="loading">
                ${verwaltungEscape(
                    konfiguration.name
                )} werden geladen...
            </div>
        `;

        try {

            const {
                data,
                error
            } = await supabase
                .from(
                    konfiguration.tabelle
                )
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

            if (error) {
                throw error;
            }

            alleAuftraege =
                data || [];

            aktualisiereAuftragsStatistik(
                alleAuftraege
            );

            if (
                alleAuftraege.length === 0
            ) {

                liste.innerHTML = `
                    <div class="empty-message">
                        Keine ${verwaltungEscape(
                            konfiguration.name
                        )} vorhanden.
                    </div>
                `;

                return;
            }

            liste.innerHTML =
                alleAuftraege
                    .map(
                        erstelleAuftragsKarte
                    )
                    .join("");

        } catch (error) {

            console.error(
                "Fehler beim Laden der Aufträge:",
                error
            );

            liste.innerHTML = `
                <div class="empty-message">
                    Aufträge konnten nicht geladen werden.
                </div>
            `;

            if (message) {

                message.textContent =
                    "Fehler beim Laden der Aufträge: " +
                    verwaltungFehlerText(
                        error
                    );

                message.className =
                    "message error";

                message.style.display =
                    "block";
            }
        }
    }

    // ------------------------------------------------------------
    // AUFTRAGSSTATISTIK
    // ------------------------------------------------------------

    function aktualisiereAuftragsStatistik(
        auftraege
    ) {

        const daten =
            auftraege || [];

        const offen =
            daten.filter(
                auftrag =>
                    String(
                        auftrag.status || ""
                    ).toLowerCase() ===
                    "offen"
            ).length;

        const bearbeitung =
            daten.filter(
                auftrag =>
                    String(
                        auftrag.status || ""
                    ).toLowerCase() ===
                    "in bearbeitung"
            ).length;

        const abgeschlossen =
            daten.filter(
                auftrag =>
                    String(
                        auftrag.status || ""
                    ).toLowerCase() ===
                    "abgeschlossen"
            ).length;

        setzeWert(
            "auftraegeOffen",
            verwaltungZahl(
                offen
            )
        );

        setzeWert(
            "auftraegeBearbeitung",
            verwaltungZahl(
                bearbeitung
            )
        );

        setzeWert(
            "auftraegeAbgeschlossen",
            verwaltungZahl(
                abgeschlossen
            )
        );

        setzeWert(
            "auftraegeGesamt",
            verwaltungZahl(
                daten.length
            )
        );
    }

    // ------------------------------------------------------------
    // AUFTRAGSKARTE
    // ------------------------------------------------------------

    function erstelleAuftragsKarte(
        auftrag
    ) {

        const id =
            auftrag.id;

        const status =
            auftrag.status ||
            "Unbekannt";

        const kunde =
            auftrag.name ||
            auftrag.customer_name ||
            auftrag.username ||
            auftrag.user_name ||
            "Unbekannt";

        const erstellt =
            verwaltungDatum(
                auftrag.created_at
            );

        let statusKlasse =
            "normal";

        const statusLower =
            String(
                status
            ).toLowerCase();

        if (
            statusLower ===
            "abgeschlossen"
        ) {

            statusKlasse =
                "angebot";

        } else if (
            statusLower ===
            "storniert" ||
            statusLower ===
            "abgelehnt"
        ) {

            statusKlasse =
                "abgelaufen";
        }

        return `
            <div class="list-item">

                <div>

                    <strong>
                        Auftrag #${verwaltungEscape(
                            id
                        )}
                    </strong>

                    <div style="margin-top:6px;">
                        Kunde:
                        ${verwaltungEscape(
                            kunde
                        )}
                    </div>

                    <div style="margin-top:4px;">
                        Erstellt:
                        ${verwaltungEscape(
                            erstellt
                        )}
                    </div>

                </div>

                <div class="button-row">

                    <span class="item-status ${statusKlasse}">
                        ${verwaltungEscape(
                            status
                        )}
                    </span>

                    <button
                        type="button"
                        class="table-action primary"
                        onclick="zeigeAuftragDetails('${verwaltungEscape(
                            id
                        )}')">
                        Ansehen
                    </button>

                </div>

            </div>
        `;
    }

    // ------------------------------------------------------------
    // AUFTRAG DETAILS
    // ------------------------------------------------------------

    window.zeigeAuftragDetails =
        function(id) {

            const auftrag =
                alleAuftraege.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!auftrag) {

                verwaltungZeigeFehler(
                    "Der Auftrag wurde nicht gefunden.",
                    element(
                        "auftraegeMessage"
                    )
                );

                return;
            }

            aktuellerAuftragsDatensatz =
                auftrag;

            const panel =
                element(
                    "auftragDetails"
                );

            const content =
                element(
                    "auftragDetailsContent"
                );

            if (!panel || !content) {
                return;
            }

            const felder =
                Object.entries(
                    auftrag
                );

            content.innerHTML = `

                <div class="section-title">
                    Auftrag #${verwaltungEscape(
                        auftrag.id
                    )}
                </div>

                <div class="order-grid">

                    ${felder.map(
                        ([schluessel, wert]) => `
                            <div class="order-card">

                                <strong>
                                    ${verwaltungEscape(
                                        schluessel
                                    )}
                                </strong>

                                <span style="white-space:pre-wrap;">
                                    ${verwaltungEscape(
                                        wert === null ||
                                        wert === undefined ||
                                        wert === ""
                                            ? "—"
                                            : wert
                                    )}
                                </span>

                            </div>
                        `
                    ).join("")}

                </div>

                <div
                    class="button-row"
                    style="margin-top:24px;"
                >

                    <button
                        type="button"
                        class="action-button"
                        onclick="auftragStatusAendern()">
                        Status ändern
                    </button>

                    <button
                        type="button"
                        class="action-button danger"
                        onclick="auftragLoeschen()">
                        Auftrag löschen
                    </button>

                    <button
                        type="button"
                        class="action-button"
                        onclick="schliesseAuftragDetails()">
                        Schließen
                    </button>

                </div>
            `;

            panel.style.display =
                "block";

            panel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        };

    // ------------------------------------------------------------
    // AUFTRAG DETAILS SCHLIESSEN
    // ------------------------------------------------------------

    window.schliesseAuftragDetails =
        function() {

            const panel =
                element(
                    "auftragDetails"
                );

            if (panel) {
                panel.style.display =
                    "none";
            }

            aktuellerAuftragsDatensatz =
                null;
        };

    // ============================================================
    // ENDE TEIL 3/13
    // TEIL 4 KOMMT DIREKT DARUNTER
    // ============================================================

            // ============================================================
    // AUFTRAGSVERWALTUNG – STATUS / LÖSCHEN
    // Teil 4/13
    // ============================================================

    window.auftragStatusAendern =
        async function() {

            if (!aktuellerAuftragsDatensatz) {
                return;
            }

            const auftrag =
                aktuellerAuftragsDatensatz;

            const konfiguration =
                auftragTabellen[
                    aktuelleAuftragsart
                ];

            if (!konfiguration) {
                return;
            }

            const bisherigerStatus =
                auftrag.status || "Offen";

            const neuerStatus =
                prompt(
                    "Neuen Status eingeben:\n\n" +
                    "Offen\n" +
                    "In Bearbeitung\n" +
                    "Abgeschlossen\n" +
                    "Storniert",
                    bisherigerStatus
                );

            if (neuerStatus === null) {
                return;
            }

            const status =
                neuerStatus.trim();

            if (!status) {

                verwaltungZeigeFehler(
                    "Der Status darf nicht leer sein.",
                    element(
                        "auftraegeMessage"
                    )
                );

                return;
            }

            try {

                const {
                    data,
                    error
                } = await supabase
                    .from(
                        konfiguration.tabelle
                    )
                    .update({
                        status: status,
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        auftrag.id
                    )
                    .select("*")
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                if (!data) {

                    verwaltungZeigeFehler(
                        "Der Auftrag wurde nicht gefunden oder konnte nicht geändert werden.",
                        element(
                            "auftraegeMessage"
                        )
                    );

                    return;
                }

                aktuellerAuftragsDatensatz =
                    data;

                verwaltungZeigeErfolg(
                    "Der Auftragsstatus wurde geändert.",
                    element(
                        "auftraegeMessage"
                    )
                );

                await ladeAuftraege(
                    aktuelleAuftragsart
                );

                // Detailansicht aktualisieren
                const neuerAuftrag =
                    alleAuftraege.find(
                        item =>
                            String(item.id) ===
                            String(data.id)
                    );

                if (neuerAuftrag) {

                    aktuellerAuftragsDatensatz =
                        neuerAuftrag;

                    window.zeigeAuftragDetails(
                        neuerAuftrag.id
                    );
                }

            } catch (error) {

                console.error(
                    "Fehler beim Ändern des Auftragsstatus:",
                    error
                );

                verwaltungZeigeFehler(
                    "Der Auftragsstatus konnte nicht geändert werden.\n\n" +
                    verwaltungFehlerText(error),
                    element(
                        "auftraegeMessage"
                    )
                );
            }
        };

    // ------------------------------------------------------------
    // AUFTRAG LÖSCHEN
    // ------------------------------------------------------------

    window.auftragLoeschen =
        async function() {

            if (!aktuellerAuftragsDatensatz) {
                return;
            }

            const auftrag =
                aktuellerAuftragsDatensatz;

            const konfiguration =
                auftragTabellen[
                    aktuelleAuftragsart
                ];

            if (!konfiguration) {
                return;
            }

            const bestaetigt =
                confirm(
                    "Auftrag #" +
                    auftrag.id +
                    " wirklich endgültig löschen?"
                );

            if (!bestaetigt) {
                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from(
                        konfiguration.tabelle
                    )
                    .delete()
                    .eq(
                        "id",
                        auftrag.id
                    );

                if (error) {
                    throw error;
                }

                verwaltungZeigeErfolg(
                    "Der Auftrag wurde gelöscht.",
                    element(
                        "auftraegeMessage"
                    )
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

                verwaltungZeigeFehler(
                    "Der Auftrag konnte nicht gelöscht werden.\n\n" +
                    verwaltungFehlerText(error),
                    element(
                        "auftraegeMessage"
                    )
                );
            }
        };

    // ------------------------------------------------------------
    // AUFTRAGSARTEN
    // ------------------------------------------------------------

    function initialisiereAuftragsNavigation() {

        const buttons = [
            {
                id: "bauauftraegeAnzeigen",
                art: "bau"
            },
            {
                id: "materialauftraegeAnzeigen",
                art: "material"
            },
            {
                id: "redstoneAuftraegeAnzeigen",
                art: "redstone"
            },
            {
                id: "logistikAuftraegeAnzeigen",
                art: "logistik"
            }
        ];

        buttons.forEach(
            eintrag => {

                const button =
                    element(
                        eintrag.id
                    );

                if (!button) {
                    return;
                }

                button.addEventListener(
                    "click",
                    async () => {

                        aktuelleAuftragsart =
                            eintrag.art;

                        document
                            .querySelectorAll(
                                "#section-auftraege .table-action"
                            )
                            .forEach(
                                btn => {
                                    btn.classList.remove(
                                        "active"
                                    );
                                }
                            );

                        button.classList.add(
                            "active"
                        );

                        await ladeAuftraege(
                            eintrag.art
                        );
                    }
                );
            }
        );
    }

    // ------------------------------------------------------------
    // AUFTRÄGE BEIM START LADEN
    // ------------------------------------------------------------

    initialisiereAuftragsNavigation();

    await ladeAuftraege(
        aktuelleAuftragsart
    );

    // ============================================================
    // ENDE TEIL 4/13
    // TEIL 5 KOMMT DIREKT DARUNTER
    // ============================================================

        // ============================================================
    // MITARBEITERVERWALTUNG
    // Teil 5/13
    // ============================================================

    async function ladeMitarbeiter() {

        const liste =
            element("mitarbeiterListe");

        const message =
            element("mitarbeiterMessage");

        if (!liste) {
            return;
        }

        liste.innerHTML = `
            <div class="loading">
                Mitarbeiter werden geladen...
            </div>
        `;

        try {

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
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

            if (error) {
                throw error;
            }

            alleMitarbeiter =
                data || [];

            // ----------------------------------------------------
            // STATISTIK
            // ----------------------------------------------------

            const aktiv =
                alleMitarbeiter.filter(
                    mitarbeiter =>
                        mitarbeiter.is_active === true
                ).length;

            const inaktiv =
                alleMitarbeiter.filter(
                    mitarbeiter =>
                        mitarbeiter.is_active !== true
                ).length;

            const verfuegbar =
                alleMitarbeiter.filter(
                    mitarbeiter =>
                        mitarbeiter.is_active === true &&
                        mitarbeiter.is_available === true
                ).length;

            setzeWert(
                "mitarbeiterAktiv",
                verwaltungZahl(
                    aktiv
                )
            );

            setzeWert(
                "mitarbeiterInaktiv",
                verwaltungZahl(
                    inaktiv
                )
            );

            setzeWert(
                "mitarbeiterGesamt",
                verwaltungZahl(
                    alleMitarbeiter.length
                )
            );

            setzeWert(
                "mitarbeiterVerfuegbar",
                verwaltungZahl(
                    verfuegbar
                )
            );

            // ----------------------------------------------------
            // KEINE MITARBEITER
            // ----------------------------------------------------

            if (
                alleMitarbeiter.length === 0
            ) {

                liste.innerHTML = `
                    <div class="empty-message">
                        Aktuell sind keine Mitarbeiter vorhanden.
                    </div>
                `;

                return;
            }

            // ----------------------------------------------------
            // MITARBEITER ANZEIGEN
            // ----------------------------------------------------

            liste.innerHTML =
                alleMitarbeiter
                    .map(
                        erstelleMitarbeiterKarte
                    )
                    .join("");

        } catch (error) {

            console.error(
                "Fehler beim Laden der Mitarbeiter:",
                error
            );

            liste.innerHTML = `
                <div class="empty-message">
                    Mitarbeiter konnten nicht geladen werden.
                </div>
            `;

            if (message) {

                message.textContent =
                    "Fehler beim Laden der Mitarbeiter: " +
                    verwaltungFehlerText(
                        error
                    );

                message.className =
                    "message error";

                message.style.display =
                    "block";
            }
        }
    }

    // ------------------------------------------------------------
    // MITARBEITERKARTE
    // ------------------------------------------------------------

    function erstelleMitarbeiterKarte(
        mitarbeiter
    ) {

        const aktiv =
            mitarbeiter.is_active === true;

        const verfuegbar =
            mitarbeiter.is_available === true;

        const statusText =
            aktiv
                ? "Aktiv"
                : "Inaktiv";

        const statusKlasse =
            aktiv
                ? "angebot"
                : "abgelaufen";

        const verfuegbarkeit =
            verfuegbar
                ? "Verfügbar"
                : "Nicht verfügbar";

        return `
            <div class="employee-card">

                <div>

                    <strong>
                        ${verwaltungEscape(
                            mitarbeiter.name ||
                            "Unbekannt"
                        )}
                    </strong>

                    <div style="margin-top:6px;">
                        Rolle:
                        ${verwaltungEscape(
                            mitarbeiter.role ||
                            "—"
                        )}
                    </div>

                    <div style="margin-top:4px;">
                        Rang:
                        ${verwaltungEscape(
                            mitarbeiter.rang ||
                            "—"
                        )}
                    </div>

                    <div style="margin-top:4px;">
                        ${verwaltungEscape(
                            verfuegbarkeit
                        )}
                    </div>

                </div>

                <div class="button-row">

                    <span class="item-status ${statusKlasse}">
                        ${statusText}
                    </span>

                    <button
                        type="button"
                        class="table-action primary"
                        onclick="mitarbeiterBearbeiten('${verwaltungEscape(
                            mitarbeiter.id
                        )}')">
                        Bearbeiten
                    </button>

                </div>

            </div>
        `;
    }

    // ------------------------------------------------------------
    // MITARBEITER BEARBEITEN
    // ------------------------------------------------------------

    window.mitarbeiterBearbeiten =
        function(id) {

            const mitarbeiter =
                alleMitarbeiter.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!mitarbeiter) {

                verwaltungZeigeFehler(
                    "Der Mitarbeiter wurde nicht gefunden.",
                    element(
                        "mitarbeiterMessage"
                    )
                );

                return;
            }

            aktuellerMitarbeiterDatensatz =
                mitarbeiter;

            const panel =
                element(
                    "mitarbeiterDetails"
                );

            const content =
                element(
                    "mitarbeiterDetailsContent"
                );

            if (!panel || !content) {
                return;
            }

            content.innerHTML = `

                <div class="section-title">
                    Mitarbeiter bearbeiten
                </div>

                <div class="editor-grid">

                    <div class="editor-field">

                        <label>
                            Name
                        </label>

                        <input
                            type="text"
                            id="verwaltungMitarbeiterName"
                            value="${verwaltungEscape(
                                mitarbeiter.name || ""
                            )}">
                    </div>

                    <div class="editor-field">

                        <label>
                            Rolle
                        </label>

                        <input
                            type="text"
                            id="verwaltungMitarbeiterRolle"
                            value="${verwaltungEscape(
                                mitarbeiter.role || ""
                            )}">
                    </div>

                    <div class="editor-field">

                        <label>
                            Rang
                        </label>

                        <select
                            id="verwaltungMitarbeiterRang">

                            <option value="Mitarbeiter"
                                ${
                                    mitarbeiter.rang ===
                                    "Mitarbeiter"
                                        ? "selected"
                                        : ""
                                }>
                                Mitarbeiter
                            </option>

                            <option value="Leitung"
                                ${
                                    mitarbeiter.rang ===
                                    "Leitung"
                                        ? "selected"
                                        : ""
                                }>
                                Leitung
                            </option>

                            <option value="Stadtleitung"
                                ${
                                    mitarbeiter.rang ===
                                    "Stadtleitung"
                                        ? "selected"
                                        : ""
                                }>
                                Stadtleitung
                            </option>

                        </select>

                    </div>

                    <div class="editor-field">

                        <label>
                            Aktiv
                        </label>

                        <select
                            id="verwaltungMitarbeiterAktiv">

                            <option value="true"
                                ${
                                    mitarbeiter.is_active === true
                                        ? "selected"
                                        : ""
                                }>
                                Aktiv
                            </option>

                            <option value="false"
                                ${
                                    mitarbeiter.is_active !== true
                                        ? "selected"
                                        : ""
                                }>
                                Inaktiv
                            </option>

                        </select>

                    </div>

                    <div class="editor-field">

                        <label>
                            Verfügbarkeit
                        </label>

                        <select
                            id="verwaltungMitarbeiterVerfuegbar">

                            <option value="true"
                                ${
                                    mitarbeiter.is_available === true
                                        ? "selected"
                                        : ""
                                }>
                                Verfügbar
                            </option>

                            <option value="false"
                                ${
                                    mitarbeiter.is_available !== true
                                        ? "selected"
                                        : ""
                                }>
                                Nicht verfügbar
                            </option>

                        </select>

                    </div>

                </div>

                <div
                    class="button-row"
                    style="margin-top:24px;"
                >

                    <button
                        type="button"
                        class="action-button success"
                        onclick="mitarbeiterDatenSpeichern()">
                        Änderungen speichern
                    </button>

                    <button
                        type="button"
                        class="action-button"
                        onclick="schliesseMitarbeiterDetails()">
                        Abbrechen
                    </button>

                </div>
            `;

            panel.style.display =
                "block";

            panel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        };

    // ------------------------------------------------------------
    // MITARBEITERDATEN SPEICHERN
    // ------------------------------------------------------------

    window.mitarbeiterDatenSpeichern =
        async function() {

            if (
                !aktuellerMitarbeiterDatensatz
            ) {
                return;
            }

            const mitarbeiter =
                aktuellerMitarbeiterDatensatz;

            const name =
                element(
                    "verwaltungMitarbeiterName"
                )?.value.trim();

            const rolle =
                element(
                    "verwaltungMitarbeiterRolle"
                )?.value.trim();

            const rang =
                element(
                    "verwaltungMitarbeiterRang"
                )?.value;

            const aktiv =
                element(
                    "verwaltungMitarbeiterAktiv"
                )?.value === "true";

            const verfuegbar =
                element(
                    "verwaltungMitarbeiterVerfuegbar"
                )?.value === "true";

            if (!name) {

                verwaltungZeigeFehler(
                    "Der Name darf nicht leer sein.",
                    element(
                        "mitarbeiterMessage"
                    )
                );

                return;
            }

            if (!rolle) {

                verwaltungZeigeFehler(
                    "Die Rolle darf nicht leer sein.",
                    element(
                        "mitarbeiterMessage"
                    )
                );

                return;
            }

            try {

                const {
                    data,
                    error
                } = await supabase
                    .from("employees")
                    .update({
                        name: name,
                        role: rolle,
                        rang: rang,
                        is_active: aktiv,
                        is_available: verfuegbar,
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        mitarbeiter.id
                    )
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
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                if (!data) {

                    verwaltungZeigeFehler(
                        "Die Mitarbeiterdaten konnten nicht aktualisiert werden.",
                        element(
                            "mitarbeiterMessage"
                        )
                    );

                    return;
                }

                aktuellerMitarbeiterDatensatz =
                    data;

                verwaltungZeigeErfolg(
                    "Die Mitarbeiterdaten wurden gespeichert.",
                    element(
                        "mitarbeiterMessage"
                    )
                );

                window.schliesseMitarbeiterDetails();

                await ladeMitarbeiter();

            } catch (error) {

                console.error(
                    "Fehler beim Speichern der Mitarbeiterdaten:",
                    error
                );

                verwaltungZeigeFehler(
                    "Die Mitarbeiterdaten konnten nicht gespeichert werden.\n\n" +
                    verwaltungFehlerText(
                        error
                    ),
                    element(
                        "mitarbeiterMessage"
                    )
                );
            }
        };

    // ============================================================
    // ENDE TEIL 5/13
    // TEIL 6 KOMMT DIREKT DARUNTER
    // ============================================================

        // ============================================================
    // MITARBEITERVERWALTUNG – ARBEITSZEIT
    // Teil 6/13
    // ============================================================

    window.verwaltungArbeitszeit =
        function(id) {

            const mitarbeiter =
                alleMitarbeiter.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!mitarbeiter) {

                verwaltungZeigeFehler(
                    "Der Mitarbeiter wurde nicht gefunden.",
                    element(
                        "mitarbeiterMessage"
                    )
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

            const restMinuten =
                minuten % 60;

            const arbeitszeit =
                stunden +
                " Std. " +
                restMinuten +
                " Min.";

            alert(
                "Arbeitszeit von " +
                (
                    mitarbeiter.name ||
                    "Mitarbeiter"
                ) +
                ":\n\n" +
                arbeitszeit
            );
        };

    // ------------------------------------------------------------
    // MITARBEITER AKTIV / INAKTIV
    // ------------------------------------------------------------

    window.mitarbeiterAktivStatus =
        async function(id, status) {

            const mitarbeiter =
                alleMitarbeiter.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!mitarbeiter) {

                verwaltungZeigeFehler(
                    "Der Mitarbeiter wurde nicht gefunden.",
                    element(
                        "mitarbeiterMessage"
                    )
                );

                return;
            }

            const neuerStatus =
                status === true ||
                status === "true";

            const bestaetigt =
                confirm(
                    neuerStatus
                        ? "Mitarbeiter wirklich aktiv setzen?"
                        : "Mitarbeiter wirklich deaktivieren?"
                );

            if (!bestaetigt) {
                return;
            }

            try {

                const {
                    data,
                    error
                } = await supabase
                    .from("employees")
                    .update({
                        is_active:
                            neuerStatus,

                        updated_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        mitarbeiter.id
                    )
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
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                if (!data) {

                    verwaltungZeigeFehler(
                        "Der Mitarbeiterstatus konnte nicht geändert werden.",
                        element(
                            "mitarbeiterMessage"
                        )
                    );

                    return;
                }

                verwaltungZeigeErfolg(
                    neuerStatus
                        ? "Mitarbeiter wurde aktiviert."
                        : "Mitarbeiter wurde deaktiviert.",
                    element(
                        "mitarbeiterMessage"
                    )
                );

                await ladeMitarbeiter();

            } catch (error) {

                console.error(
                    "Fehler beim Ändern des Mitarbeiterstatus:",
                    error
                );

                verwaltungZeigeFehler(
                    "Der Mitarbeiterstatus konnte nicht geändert werden.\n\n" +
                    verwaltungFehlerText(
                        error
                    ),
                    element(
                        "mitarbeiterMessage"
                    )
                );
            }
        };

    // ------------------------------------------------------------
    // MITARBEITER DETAILS SCHLIESSEN
    // ------------------------------------------------------------

    window.schliesseMitarbeiterDetails =
        function() {

            const panel =
                element(
                    "mitarbeiterDetails"
                );

            if (panel) {
                panel.style.display =
                    "none";
            }

            aktuellerMitarbeiterDatensatz =
                null;
        };

    // ------------------------------------------------------------
    // MITARBEITER BEIM START LADEN
    // ------------------------------------------------------------

    await ladeMitarbeiter();

    // ============================================================
    // PREISVERWALTUNG
    // ============================================================

    /*
     * Die Preisverwaltung verwendet die bereits vorhandene
     * Tabelle "items".
     *
     * Angebote werden ebenfalls in "items" gespeichert.
     *
     * Erwartete Angebotsfelder:
     *
     * is_offer
     * offer_price
     * offer_duration_days
     * offer_start_at
     * offer_end_at
     *
     * Erlaubte Laufzeiten:
     * 1 / 3 / 7 / 14 / 30 Tage
     */

    const erlaubteAngebotsLaufzeiten = [
        1,
        3,
        7,
        14,
        30
    ];

    // ------------------------------------------------------------
    // HILFSFUNKTION: ITEM-NAMEN ERMITTELN
    // ------------------------------------------------------------

    function itemName(item) {

        if (!item) {
            return "Unbekannt";
        }

        return (
            item.name ??
            item.item_name ??
            item.minecraft_name ??
            item.itemName ??
            "Unbekannt"
        );
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: ITEM-KATEGORIE
    // ------------------------------------------------------------

    function itemKategorie(item) {

        if (!item) {
            return "Keine Kategorie";
        }

        return (
            item.category ??
            item.kategorie ??
            item.type ??
            "Keine Kategorie"
        );
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: NORMALER ITEM-PREIS
    // ------------------------------------------------------------

    function itemNormalPreis(item) {

        if (!item) {
            return 0;
        }

        const moeglichePreise = [
            item.price,
            item.preis,
            item.sell_price,
            item.unit_price
        ];

        for (
            const wert of moeglichePreise
        ) {

            if (
                wert !== null &&
                wert !== undefined &&
                wert !== ""
            ) {

                const zahl =
                    Number(wert);

                if (
                    Number.isFinite(zahl)
                ) {
                    return zahl;
                }
            }
        }

        return 0;
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: ANGEBOTSPREIS
    // ------------------------------------------------------------

    function itemAngebotspreis(item) {

        if (!item) {
            return null;
        }

        const preis =
            Number(
                item.offer_price
            );

        if (
            Number.isFinite(preis)
        ) {
            return preis;
        }

        return null;
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: IST ANGEBOT
    // ------------------------------------------------------------

    function itemIstAngebot(item) {

        return (
            item &&
            item.is_offer === true
        );
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: ANGEBOT AKTIV?
    // ------------------------------------------------------------

    function itemAngebotIstAktiv(item) {

        if (
            !itemIstAngebot(item)
        ) {
            return false;
        }

        if (
            !item.offer_start_at ||
            !item.offer_end_at
        ) {
            return false;
        }

        const jetzt =
            new Date();

        const start =
            new Date(
                item.offer_start_at
            );

        const ende =
            new Date(
                item.offer_end_at
            );

        return (
            jetzt >= start &&
            jetzt < ende
        );
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: ANGEBOT ABGELAUFEN?
    // ------------------------------------------------------------

    function itemAngebotIstAbgelaufen(
        item
    ) {

        if (
            !itemIstAngebot(item)
        ) {
            return false;
        }

        if (
            !item.offer_end_at
        ) {
            return false;
        }

        return (
            new Date() >=
            new Date(
                item.offer_end_at
            )
        );
    }

    // ------------------------------------------------------------
    // HILFSFUNKTION: ANGEBOTSSTATUS
    // ------------------------------------------------------------

    function itemAngebotsStatus(
        item
    ) {

        if (
            !itemIstAngebot(item)
        ) {
            return "normal";
        }

        if (
            itemAngebotIstAbgelaufen(
                item
            )
        ) {
            return "abgelaufen";
        }

        if (
            itemAngebotIstAktiv(
                item
            )
        ) {
            return "angebot";
        }

        return "angebot";
    }

    // ============================================================
    // ENDE TEIL 6/13
    // TEIL 7 KOMMT DIREKT DARUNTER
    // ============================================================

        // ============================================================
    // PREISVERWALTUNG – ITEMS LADEN
    // Teil 7/13
    // ============================================================

    async function ladeItems() {

        const liste =
            element("itemsListe");

        const message =
            element("preiseMessage");

        if (!liste) {
            return;
        }

        liste.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="loading"
                >
                    Items werden geladen...
                </td>
            </tr>
        `;

        try {

            const {
                data,
                error
            } = await supabase
                .from("items")
                .select("*")
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );

            if (error) {
                throw error;
            }

            alleItems =
                data || [];

            console.log(
                "Items geladen:",
                alleItems.length
            );

            // ----------------------------------------------------
            // STATISTIK AKTUALISIEREN
            // ----------------------------------------------------

            aktualisiereItemStatistik();

            // ----------------------------------------------------
            // KATEGORIEN AKTUALISIEREN
            // ----------------------------------------------------

            aktualisiereItemKategorien();

            // ----------------------------------------------------
            // TABELLE ZEIGEN
            // ----------------------------------------------------

            zeigeItems();

        } catch (error) {

            console.error(
                "Fehler beim Laden der Items:",
                error
            );

            liste.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="empty-message"
                    >
                        Items konnten nicht geladen werden.
                    </td>
                </tr>
            `;

            if (message) {

                message.textContent =
                    "Fehler beim Laden der Items: " +
                    verwaltungFehlerText(
                        error
                    );

                message.className =
                    "message error";

                message.style.display =
                    "block";
            }
        }
    }

    // ------------------------------------------------------------
    // ITEM-STATISTIK
    // ------------------------------------------------------------

    function aktualisiereItemStatistik() {

        const gesamt =
            alleItems.length;

        const aktiveAngebote =
            alleItems.filter(
                item =>
                    itemAngebotIstAktiv(
                        item
                    )
            ).length;

        const abgelaufeneAngebote =
            alleItems.filter(
                item =>
                    itemAngebotIstAbgelaufen(
                        item
                    )
            ).length;

        // Angebote, die innerhalb der nächsten
        // 24 Stunden ablaufen
        const jetzt =
            new Date();

        const morgen =
            new Date(
                jetzt.getTime() +
                24 * 60 * 60 * 1000
            );

        const laufenBaldAb =
            alleItems.filter(
                item => {

                    if (
                        !itemIstAngebot(
                            item
                        )
                    ) {
                        return false;
                    }

                    if (
                        !item.offer_end_at
                    ) {
                        return false;
                    }

                    const ende =
                        new Date(
                            item.offer_end_at
                        );

                    return (
                        ende > jetzt &&
                        ende <= morgen
                    );
                }
            ).length;

        setzeWert(
            "itemsGesamt",
            verwaltungZahl(
                gesamt
            )
        );

        setzeWert(
            "itemsAktiveAngebote",
            verwaltungZahl(
                aktiveAngebote
            )
        );

        setzeWert(
            "itemsLaufenBaldAb",
            verwaltungZahl(
                laufenBaldAb
            )
        );

        setzeWert(
            "itemsAbgelaufen",
            verwaltungZahl(
                abgelaufeneAngebote
            )
        );
    }

    // ------------------------------------------------------------
    // KATEGORIEN IN FILTER EINTRAGEN
    // ------------------------------------------------------------

    function aktualisiereItemKategorien() {

        const select =
            element(
                "itemKategorieFilter"
            );

        if (!select) {
            return;
        }

        const bisherigerWert =
            select.value;

        const kategorien =
            [
                ...new Set(
                    alleItems
                        .map(
                            item =>
                                itemKategorie(
                                    item
                                )
                        )
                        .filter(
                            wert =>
                                wert &&
                                wert !==
                                    "Keine Kategorie"
                        )
                )
            ]
            .sort(
                (a, b) =>
                    String(a).localeCompare(
                        String(b),
                        "de"
                    )
            );

        select.innerHTML = `
            <option value="">
                Alle Kategorien
            </option>

            ${kategorien
                .map(
                    kategorie => `
                        <option
                            value="${verwaltungEscape(
                                kategorie
                            )}">
                            ${verwaltungEscape(
                                kategorie
                            )}
                        </option>
                    `
                )
                .join("")}
        `;

        if (
            kategorien.includes(
                bisherigerWert
            )
        ) {
            select.value =
                bisherigerWert;
        }
    }

    // ------------------------------------------------------------
    // FILTERWERTE LESEN
    // ------------------------------------------------------------

    function holeItemFilter() {

        return {

            suche:
                (
                    element(
                        "itemSuche"
                    )?.value ||
                    ""
                )
                .trim()
                .toLowerCase(),

            kategorie:
                element(
                    "itemKategorieFilter"
                )?.value ||
                "",

            angebot:
                element(
                    "itemAngebotFilter"
                )?.value ||
                "",

            sortierung:
                element(
                    "itemSortierung"
                )?.value ||
                "name_asc"
        };
    }

    // ------------------------------------------------------------
    // ITEMS FILTERN
    // ------------------------------------------------------------

    function filtereItems() {

        const filter =
            holeItemFilter();

        let ergebnis =
            [...alleItems];

        // --------------------------------------------------------
        // SUCHFELD
        // --------------------------------------------------------

        if (filter.suche) {

            ergebnis =
                ergebnis.filter(
                    item => {

                        const name =
                            String(
                                itemName(
                                    item
                                )
                            )
                            .toLowerCase();

                        const kategorie =
                            String(
                                itemKategorie(
                                    item
                                )
                            )
                            .toLowerCase();

                        return (
                            name.includes(
                                filter.suche
                            ) ||
                            kategorie.includes(
                                filter.suche
                            )
                        );
                    }
                );
        }

        // --------------------------------------------------------
        // KATEGORIE
        // --------------------------------------------------------

        if (filter.kategorie) {

            ergebnis =
                ergebnis.filter(
                    item =>
                        String(
                            itemKategorie(
                                item
                            )
                        ) ===
                        String(
                            filter.kategorie
                        )
                );
        }

        // --------------------------------------------------------
        // ANGEBOTSSTATUS
        // --------------------------------------------------------

        if (
            filter.angebot ===
            "angebote"
        ) {

            ergebnis =
                ergebnis.filter(
                    item =>
                        itemIstAngebot(
                            item
                        )
                );

        } else if (
            filter.angebot ===
            "aktiv"
        ) {

            ergebnis =
                ergebnis.filter(
                    item =>
                        itemAngebotIstAktiv(
                            item
                        )
                );

        } else if (
            filter.angebot ===
            "abgelaufen"
        ) {

            ergebnis =
                ergebnis.filter(
                    item =>
                        itemAngebotIstAbgelaufen(
                            item
                        )
                );

        } else if (
            filter.angebot ===
            "normal"
        ) {

            ergebnis =
                ergebnis.filter(
                    item =>
                        !itemIstAngebot(
                            item
                        )
                );
        }

        // --------------------------------------------------------
        // SORTIERUNG
        // --------------------------------------------------------

        ergebnis.sort(
            (a, b) => {

                const nameA =
                    String(
                        itemName(a)
                    ).toLowerCase();

                const nameB =
                    String(
                        itemName(b)
                    ).toLowerCase();

                const preisA =
                    itemNormalPreis(a);

                const preisB =
                    itemNormalPreis(b);

                switch (
                    filter.sortierung
                ) {

                    case "name_desc":

                        return nameB.localeCompare(
                            nameA,
                            "de"
                        );

                    case "preis_asc":

                        return preisA -
                            preisB;

                    case "preis_desc":

                        return preisB -
                            preisA;

                    case "angebot_zuerst":

                        if (
                            itemIstAngebot(a) &&
                            !itemIstAngebot(b)
                        ) {
                            return -1;
                        }

                        if (
                            !itemIstAngebot(a) &&
                            itemIstAngebot(b)
                        ) {
                            return 1;
                        }

                        return nameA.localeCompare(
                            nameB,
                            "de"
                        );

                    default:

                        return nameA.localeCompare(
                            nameB,
                            "de"
                        );
                }
            }
        );

        return ergebnis;
    }

    // ------------------------------------------------------------
    // PREIS-TAB AUF FILTER ÜBERTRAGEN
    // ------------------------------------------------------------

    function setzePreisTabFilter(
        tab
    ) {

        const angebotFilter =
            element(
                "itemAngebotFilter"
            );

        if (!angebotFilter) {
            return;
        }

        if (
            tab === "angebote"
        ) {

            angebotFilter.value =
                "angebote";

        } else if (
            tab === "normal"
        ) {

            angebotFilter.value =
                "normal";

        } else if (
            tab === "abgelaufen"
        ) {

            angebotFilter.value =
                "abgelaufen";

        } else {

            angebotFilter.value =
                "";
        }
    }

    // ------------------------------------------------------------
    // ITEMS ANZEIGEN
    // ------------------------------------------------------------

    function zeigeItems() {

        const liste =
            element("itemsListe");

        const anzeige =
            element("itemsAnzeige");

        const pagination =
            element(
                "itemsPagination"
            );

        if (!liste) {
            return;
        }

        const gefilterteItems =
            filtereItems();

        const gesamt =
            gefilterteItems.length;

        const maxSeiten =
            Math.max(
                1,
                Math.ceil(
                    gesamt /
                    ITEMS_PRO_SEITE
                )
            );

        if (
            aktuelleItemSeite >
            maxSeiten
        ) {
            aktuelleItemSeite =
                maxSeiten;
        }

        if (
            aktuelleItemSeite < 1
        ) {
            aktuelleItemSeite = 1;
        }

        const start =
            (
                aktuelleItemSeite -
                1
            ) *
            ITEMS_PRO_SEITE;

        const ende =
            start +
            ITEMS_PRO_SEITE;

        const sichtbareItems =
            gefilterteItems.slice(
                start,
                ende
            );

        // --------------------------------------------------------
        // KEINE TREFFER
        // --------------------------------------------------------

        if (
            sichtbareItems.length === 0
        ) {

            liste.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="empty-message"
                    >
                        Keine passenden Items gefunden.
                    </td>
                </tr>
            `;

        } else {

            liste.innerHTML =
                sichtbareItems
                    .map(
                        erstelleItemZeile
                    )
                    .join("");
        }

        // --------------------------------------------------------
        // ANZEIGETEXT
        // --------------------------------------------------------

        if (anzeige) {

            if (gesamt === 0) {

                anzeige.textContent =
                    "0 Items";

            } else {

                const von =
                    start + 1;

                const bis =
                    Math.min(
                        ende,
                        gesamt
                    );

                anzeige.textContent =
                    von +
                    "–" +
                    bis +
                    " von " +
                    gesamt +
                    " Items";
            }
        }

        // --------------------------------------------------------
        // PAGINATION
        // --------------------------------------------------------

        if (pagination) {

            pagination.innerHTML =
                erstelleItemPagination(
                    maxSeiten
                );
        }
    }

    // ============================================================
    // ENDE TEIL 7/13
    // TEIL 8 KOMMT DIREKT DARUNTER
    // ============================================================

        // ============================================================
    // PREISVERWALTUNG – TABELLE / PAGINATION / FILTER
    // Teil 8/13
    // ============================================================

    // ------------------------------------------------------------
    // ITEM-ZEILE ERSTELLEN
    // ------------------------------------------------------------

    function erstelleItemZeile(item) {

        const name =
            itemName(item);

        const kategorie =
            itemKategorie(item);

        const normalerPreis =
            itemNormalPreis(item);

        const angebotspreis =
            itemAngebotspreis(item);

        const istAngebot =
            itemIstAngebot(item);

        const aktiv =
            itemAngebotIstAktiv(item);

        const abgelaufen =
            itemAngebotIstAbgelaufen(item);

        let statusText =
            "Normal";

        let statusKlasse =
            "normal";

        if (abgelaufen) {

            statusText =
                "Abgelaufen";

            statusKlasse =
                "abgelaufen";

        } else if (aktiv) {

            statusText =
                "Aktives Angebot";

            statusKlasse =
                "angebot";

        } else if (istAngebot) {

            statusText =
                "Angebot";

            statusKlasse =
                "angebot";
        }

        let angebotText =
            "—";

        if (
            angebotspreis !== null
        ) {

            angebotText =
                verwaltungPreis(
                    angebotspreis
                );
        }

        let laufzeitText =
            "—";

        if (
            item.offer_duration_days
        ) {

            laufzeitText =
                item.offer_duration_days +
                " Tage";
        }

        let endeText =
            "—";

        if (
            item.offer_end_at
        ) {

            endeText =
                verwaltungNurDatum(
                    item.offer_end_at
                );
        }

        return `
            <tr>

                <td>

                    <div class="item-name">
                        ${verwaltungEscape(
                            name
                        )}
                    </div>

                </td>

                <td>

                    <div class="item-category">
                        ${verwaltungEscape(
                            kategorie
                        )}
                    </div>

                </td>

                <td>

                    <div class="item-price normal-price">
                        ${verwaltungPreis(
                            normalerPreis
                        )}
                    </div>

                </td>

                <td>

                    <div class="item-price offer-price">
                        ${angebotText}
                    </div>

                </td>

                <td>

                    <span
                        class="item-status ${statusKlasse}">
                        ${statusText}
                    </span>

                </td>

                <td>

                    <div class="item-category">
                        ${verwaltungEscape(
                            laufzeitText
                        )}
                    </div>

                </td>

                <td>

                    <div class="item-category">
                        ${verwaltungEscape(
                            endeText
                        )}
                    </div>

                </td>

                <td>

                    <div class="table-actions">

                        <button
                            type="button"
                            class="table-action primary"
                            onclick="itemBearbeiten('${verwaltungEscape(
                                item.id
                            )}')">
                            Bearbeiten
                        </button>

                        <button
                            type="button"
                            class="table-action danger"
                            onclick="itemLoeschen('${verwaltungEscape(
                                item.id
                            )}')">
                            Löschen
                        </button>

                    </div>

                </td>

            </tr>
        `;
    }

    // ------------------------------------------------------------
    // PAGINATION ERSTELLEN
    // ------------------------------------------------------------

    function erstelleItemPagination(
        maxSeiten
    ) {

        if (
            maxSeiten <= 1
        ) {
            return "";
        }

        let html = "";

        // --------------------------------------------------------
        // ZURÜCK
        // --------------------------------------------------------

        html += `
            <button
                type="button"
                class="page-button"
                ${
                    aktuelleItemSeite <= 1
                        ? "disabled"
                        : ""
                }
                onclick="itemSeiteAendern(${
                    aktuelleItemSeite - 1
                })">
                ‹
            </button>
        `;

        // --------------------------------------------------------
        // SEITENNUMMERN
        // --------------------------------------------------------

        const start =
            Math.max(
                1,
                aktuelleItemSeite - 2
            );

        const ende =
            Math.min(
                maxSeiten,
                aktuelleItemSeite + 2
            );

        for (
            let seite = start;
            seite <= ende;
            seite++
        ) {

            html += `
                <button
                    type="button"
                    class="page-button ${
                        seite ===
                        aktuelleItemSeite
                            ? "active"
                            : ""
                    }"
                    onclick="itemSeiteAendern(
                        ${seite}
                    )">
                    ${seite}
                </button>
            `;
        }

        // --------------------------------------------------------
        // WEITER
        // --------------------------------------------------------

        html += `
            <button
                type="button"
                class="page-button"
                ${
                    aktuelleItemSeite >= maxSeiten
                        ? "disabled"
                        : ""
                }
                onclick="itemSeiteAendern(${
                    aktuelleItemSeite + 1
                })">
                ›
            </button>
        `;

        return html;
    }

    // ------------------------------------------------------------
    // SEITE WECHSELN
    // ------------------------------------------------------------

    window.itemSeiteAendern =
        function(seite) {

            const gefilterteItems =
                filtereItems();

            const maxSeiten =
                Math.max(
                    1,
                    Math.ceil(
                        gefilterteItems.length /
                        ITEMS_PRO_SEITE
                    )
                );

            if (
                seite < 1
            ) {
                seite = 1;
            }

            if (
                seite > maxSeiten
            ) {
                seite = maxSeiten;
            }

            aktuelleItemSeite =
                seite;

            zeigeItems();

            const bereich =
                element(
                    "section-preise"
                );

            if (bereich) {

                bereich.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        };

    // ------------------------------------------------------------
    // PREIS-TABS
    // ------------------------------------------------------------

    function initialisierePreisTabs() {

        document
            .querySelectorAll(
                "[data-price-tab]"
            )
            .forEach(tab => {

                tab.addEventListener(
                    "click",
                    () => {

                        const wert =
                            tab.dataset.priceTab;

                        if (!wert) {
                            return;
                        }

                        aktuellerPreisTab =
                            wert;

                        // ------------------------------------------------
                        // AKTIVEN TAB MARKIEREN
                        // ------------------------------------------------

                        document
                            .querySelectorAll(
                                "[data-price-tab]"
                            )
                            .forEach(
                                andererTab => {

                                    andererTab.classList.remove(
                                        "active"
                                    );
                                }
                            );

                        tab.classList.add(
                            "active"
                        );

                        // ------------------------------------------------
                        // TAB AUF FILTER ÜBERTRAGEN
                        // ------------------------------------------------

                        setzePreisTabFilter(
                            wert
                        );

                        aktuelleItemSeite =
                            1;

                        zeigeItems();
                    }
                );
            });
    }

    // ------------------------------------------------------------
    // SUCHE / FILTER
    // ------------------------------------------------------------

    function initialisiereItemFilter() {

        const suche =
            element(
                "itemSuche"
            );

        const kategorie =
            element(
                "itemKategorieFilter"
            );

        const angebot =
            element(
                "itemAngebotFilter"
            );

        const sortierung =
            element(
                "itemSortierung"
            );

        const reset =
            element(
                "itemFilterReset"
            );

        if (suche) {

            suche.addEventListener(
                "input",
                () => {

                    aktuelleItemSeite =
                        1;

                    zeigeItems();
                }
            );
        }

        if (kategorie) {

            kategorie.addEventListener(
                "change",
                () => {

                    aktuelleItemSeite =
                        1;

                    zeigeItems();
                }
            );
        }

        if (angebot) {

            angebot.addEventListener(
                "change",
                () => {

                    aktuelleItemSeite =
                        1;

                    zeigeItems();
                }
            );
        }

        if (sortierung) {

            sortierung.addEventListener(
                "change",
                () => {

                    aktuelleItemSeite =
                        1;

                    zeigeItems();
                }
            );
        }

        if (reset) {

            reset.addEventListener(
                "click",
                () => {

                    if (suche) {
                        suche.value = "";
                    }

                    if (kategorie) {
                        kategorie.value = "";
                    }

                    if (angebot) {
                        angebot.value = "";
                    }

                    if (sortierung) {
                        sortierung.value =
                            "name_asc";
                    }

                    aktuellerPreisTab =
                        "alle";

                    aktuelleItemSeite =
                        1;

                    document
                        .querySelectorAll(
                            "[data-price-tab]"
                        )
                        .forEach(
                            tab => {

                                tab.classList.remove(
                                    "active"
                                );

                                if (
                                    tab.dataset.priceTab ===
                                    "alle"
                                ) {
                                    tab.classList.add(
                                        "active"
                                    );
                                }
                            }
                        );

                    zeigeItems();
                }
            );
        }
    }

    // ------------------------------------------------------------
    // PREISVERWALTUNG INITIALISIEREN
    // ------------------------------------------------------------

    initialisierePreisTabs();

    initialisiereItemFilter();

    // ------------------------------------------------------------
    // ITEMS BEIM START LADEN
    // ------------------------------------------------------------

    await ladeItems();

    // ============================================================
    // ENDE TEIL 8/13
    // TEIL 9 KOMMT DIREKT DARUNTER
    // ============================================================

        // ============================================================
    // PREISVERWALTUNG – ITEM BEARBEITEN / LÖSCHEN
    // Teil 9/13
    // ============================================================

    // ------------------------------------------------------------
    // ITEM BEARBEITEN
    // ------------------------------------------------------------

    window.itemBearbeiten =
        function(id) {

            const item =
                alleItems.find(
                    eintrag =>
                        String(eintrag.id) ===
                        String(id)
                );

            if (!item) {

                verwaltungZeigeFehler(
                    "Das Item wurde nicht gefunden.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            aktuellesItem =
                item;

            const panel =
                element("itemDetails");

            const content =
                element(
                    "itemDetailsContent"
                );

            if (!panel || !content) {
                return;
            }

            const name =
                itemName(item);

            const kategorie =
                itemKategorie(item);

            const preis =
                itemNormalPreis(item);

            const istAngebot =
                itemIstAngebot(item);

            const angebotspreis =
                itemAngebotspreis(item);

            const laufzeit =
                item.offer_duration_days || "";

            content.innerHTML = `

                <div class="item-editor active">

                    <div class="editor-title">
                        Item bearbeiten
                    </div>

                    <div class="editor-grid">

                        <div class="editor-field">

                            <label>
                                Itemname
                            </label>

                            <input
                                type="text"
                                id="verwaltungItemName"
                                value="${verwaltungEscape(
                                    name === "Unbekannt"
                                        ? ""
                                        : name
                                )}"
                            >

                        </div>

                        <div class="editor-field">

                            <label>
                                Kategorie
                            </label>

                            <input
                                type="text"
                                id="verwaltungItemKategorie"
                                value="${verwaltungEscape(
                                    kategorie ===
                                    "Keine Kategorie"
                                        ? ""
                                        : kategorie
                                )}"
                            >

                        </div>

                        <div class="editor-field">

                            <label>
                                Normaler Preis
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                id="verwaltungItemPreis"
                                value="${preis}"
                            >

                        </div>

                        <div class="editor-field">

                            <label>
                                Angebotspreis
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                id="verwaltungItemAngebotspreis"
                                value="${
                                    angebotspreis !== null
                                        ? angebotspreis
                                        : ""
                                }"
                            >

                        </div>

                        <div class="editor-field">

                            <label>
                                Angebot
                            </label>

                            <select
                                id="verwaltungItemIstAngebot">

                                <option
                                    value="false"
                                    ${
                                        !istAngebot
                                            ? "selected"
                                            : ""
                                    }>
                                    Kein Angebot
                                </option>

                                <option
                                    value="true"
                                    ${
                                        istAngebot
                                            ? "selected"
                                            : ""
                                    }>
                                    Angebot
                                </option>

                            </select>

                        </div>

                        <div class="editor-field">

                            <label>
                                Angebotslaufzeit
                            </label>

                            <select
                                id="verwaltungItemLaufzeit">

                                <option value="">
                                    Keine Laufzeit
                                </option>

                                ${
                                    erlaubteAngebotsLaufzeiten
                                        .map(
                                            tage => `
                                                <option
                                                    value="${tage}"
                                                    ${
                                                        Number(
                                                            laufzeit
                                                        ) === tage
                                                            ? "selected"
                                                            : ""
                                                    }>
                                                    ${tage} Tage
                                                </option>
                                            `
                                        )
                                        .join("")
                                }

                            </select>

                        </div>

                    </div>

                    <div
                        class="button-row"
                        style="margin-top:24px;"
                    >

                        <button
                            type="button"
                            class="action-button success"
                            onclick="speichereItemAenderung()">
                            Änderungen speichern
                        </button>

                        <button
                            type="button"
                            class="action-button"
                            onclick="schliesseItemDetails()">
                            Abbrechen
                        </button>

                    </div>

                </div>
            `;

            panel.style.display =
                "block";

            panel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        };

    // ------------------------------------------------------------
    // ITEM-ÄNDERUNGEN SPEICHERN
    // ------------------------------------------------------------

    window.speichereItemAenderung =
        async function() {

            if (!aktuellesItem) {
                return;
            }

            const item =
                aktuellesItem;

            const nameInput =
                element(
                    "verwaltungItemName"
                );

            const kategorieInput =
                element(
                    "verwaltungItemKategorie"
                );

            const preisInput =
                element(
                    "verwaltungItemPreis"
                );

            const angebotspreisInput =
                element(
                    "verwaltungItemAngebotspreis"
                );

            const angebotInput =
                element(
                    "verwaltungItemIstAngebot"
                );

            const laufzeitInput =
                element(
                    "verwaltungItemLaufzeit"
                );

            const neuerName =
                nameInput?.value.trim() || "";

            const neueKategorie =
                kategorieInput?.value.trim() || "";

            const neuerPreis =
                Number(
                    preisInput?.value
                );

            const neuerAngebotspreis =
                angebotspreisInput?.value === ""
                    ? null
                    : Number(
                        angebotspreisInput?.value
                    );

            const istAngebot =
                angebotInput?.value ===
                "true";

            const laufzeit =
                laufzeitInput?.value === ""
                    ? null
                    : Number(
                        laufzeitInput?.value
                    );

            if (!neuerName) {

                verwaltungZeigeFehler(
                    "Der Itemname darf nicht leer sein.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            if (
                !Number.isFinite(
                    neuerPreis
                ) ||
                neuerPreis < 0
            ) {

                verwaltungZeigeFehler(
                    "Der normale Preis ist ungültig.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            if (
                neuerAngebotspreis !== null &&
                (
                    !Number.isFinite(
                        neuerAngebotspreis
                    ) ||
                    neuerAngebotspreis < 0
                )
            ) {

                verwaltungZeigeFehler(
                    "Der Angebotspreis ist ungültig.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            if (
                istAngebot &&
                neuerAngebotspreis === null
            ) {

                verwaltungZeigeFehler(
                    "Für ein Angebot muss ein Angebotspreis angegeben werden.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            if (
                istAngebot &&
                !erlaubteAngebotsLaufzeiten.includes(
                    laufzeit
                )
            ) {

                verwaltungZeigeFehler(
                    "Die Angebotslaufzeit muss 1, 3, 7, 14 oder 30 Tage betragen.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            try {

                // ------------------------------------------------
                // SPALTEN ERMITTELN
                // ------------------------------------------------

                const updateDaten = {};

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "name"
                    )
                ) {
                    updateDaten.name =
                        neuerName;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "item_name"
                    )
                ) {
                    updateDaten.item_name =
                        neuerName;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "minecraft_name"
                    )
                ) {
                    updateDaten.minecraft_name =
                        neuerName;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "category"
                    )
                ) {
                    updateDaten.category =
                        neueKategorie;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "kategorie"
                    )
                ) {
                    updateDaten.kategorie =
                        neueKategorie;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "price"
                    )
                ) {
                    updateDaten.price =
                        neuerPreis;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "preis"
                    )
                ) {
                    updateDaten.preis =
                        neuerPreis;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "sell_price"
                    )
                ) {
                    updateDaten.sell_price =
                        neuerPreis;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "unit_price"
                    )
                ) {
                    updateDaten.unit_price =
                        neuerPreis;
                }

                // ------------------------------------------------
                // ANGEBOTSFELDER
                // ------------------------------------------------

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "is_offer"
                    )
                ) {

                    updateDaten.is_offer =
                        istAngebot;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "offer_price"
                    )
                ) {

                    updateDaten.offer_price =
                        istAngebot
                            ? neuerAngebotspreis
                            : null;
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "offer_duration_days"
                    )
                ) {

                    updateDaten.offer_duration_days =
                        istAngebot
                            ? laufzeit
                            : null;
                }

                // ------------------------------------------------
                // ANGEBOTSZEITRAUM
                // ------------------------------------------------

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "offer_start_at"
                    )
                ) {

                    if (istAngebot) {

                        updateDaten.offer_start_at =
                            item.offer_start_at ||
                            new Date().toISOString();

                    } else {

                        updateDaten.offer_start_at =
                            null;
                    }
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "offer_end_at"
                    )
                ) {

                    if (
                        istAngebot &&
                        laufzeit
                    ) {

                        const start =
                            item.offer_start_at
                                ? new Date(
                                    item.offer_start_at
                                )
                                : new Date();

                        const ende =
                            new Date(
                                start.getTime() +
                                laufzeit *
                                24 *
                                60 *
                                60 *
                                1000
                            );

                        updateDaten.offer_end_at =
                            ende.toISOString();

                    } else {

                        updateDaten.offer_end_at =
                            null;
                    }
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        item,
                        "updated_at"
                    )
                ) {

                    updateDaten.updated_at =
                        new Date().toISOString();
                }

                const {
                    data,
                    error
                } = await supabase
                    .from("items")
                    .update(
                        updateDaten
                    )
                    .eq(
                        "id",
                        item.id
                    )
                    .select("*")
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                if (!data) {

                    verwaltungZeigeFehler(
                        "Das Item konnte nicht aktualisiert werden.",
                        element(
                            "preiseMessage"
                        )
                    );

                    return;
                }

                aktuellesItem =
                    data;

                verwaltungZeigeErfolg(
                    "Das Item wurde erfolgreich aktualisiert.",
                    element(
                        "preiseMessage"
                    )
                );

                window.schliesseItemDetails();

                await ladeItems();

            } catch (error) {

                console.error(
                    "Fehler beim Speichern des Items:",
                    error
                );

                verwaltungZeigeFehler(
                    "Das Item konnte nicht gespeichert werden.\n\n" +
                    verwaltungFehlerText(
                        error
                    ),
                    element(
                        "preiseMessage"
                    )
                );
            }
        };

    // ============================================================
    // ENDE TEIL 9/13
    // TEIL 10 KOMMT DIREKT DARUNTER
    // ============================================================

        // ============================================================
    // PREISVERWALTUNG – ITEM LÖSCHEN / NEUES ITEM
    // Teil 10/13
    // ============================================================

    // ------------------------------------------------------------
    // ITEM DETAILS SCHLIESSEN
    // ------------------------------------------------------------

    window.schliesseItemDetails =
        function() {

            const panel =
                element("itemDetails");

            if (panel) {
                panel.style.display =
                    "none";
            }

            aktuellesItem = null;
        };

    // ------------------------------------------------------------
    // ITEM LÖSCHEN
    // ------------------------------------------------------------

    window.itemLoeschen =
        async function(id) {

            const item =
                alleItems.find(
                    eintrag =>
                        String(eintrag.id) ===
                        String(id)
                );

            if (!item) {

                verwaltungZeigeFehler(
                    "Das Item wurde nicht gefunden.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            const name =
                itemName(item);

            const bestaetigt =
                confirm(
                    "Das Item \"" +
                    name +
                    "\" wirklich endgültig löschen?"
                );

            if (!bestaetigt) {
                return;
            }

            try {

                const {
                    error
                } = await supabase
                    .from("items")
                    .delete()
                    .eq(
                        "id",
                        item.id
                    );

                if (error) {
                    throw error;
                }

                verwaltungZeigeErfolg(
                    "Das Item wurde erfolgreich gelöscht.",
                    element(
                        "preiseMessage"
                    )
                );

                if (
                    aktuellesItem &&
                    String(
                        aktuellesItem.id
                    ) ===
                    String(item.id)
                ) {
                    window.schliesseItemDetails();
                }

                await ladeItems();

            } catch (error) {

                console.error(
                    "Fehler beim Löschen des Items:",
                    error
                );

                verwaltungZeigeFehler(
                    "Das Item konnte nicht gelöscht werden.\n\n" +
                    verwaltungFehlerText(
                        error
                    ),
                    element(
                        "preiseMessage"
                    )
                );
            }
        };

    // ------------------------------------------------------------
    // NEUES ITEM FORMULAR
    // ------------------------------------------------------------

    function zeigeNeuesItemFormular() {

        const panel =
            element("itemDetails");

        const content =
            element(
                "itemDetailsContent"
            );

        if (!panel || !content) {
            return;
        }

        aktuellesItem = null;

        content.innerHTML = `

            <div class="item-editor active">

                <div class="editor-title">
                    Neues Item hinzufügen
                </div>

                <div class="editor-grid">

                    <div class="editor-field">

                        <label>
                            Itemname
                        </label>

                        <input
                            type="text"
                            id="verwaltungNeuesItemName"
                            placeholder="z. B. Stein"
                        >

                    </div>

                    <div class="editor-field">

                        <label>
                            Kategorie
                        </label>

                        <input
                            type="text"
                            id="verwaltungNeuesItemKategorie"
                            placeholder="z. B. Blöcke"
                        >

                    </div>

                    <div class="editor-field">

                        <label>
                            Normaler Preis
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            id="verwaltungNeuesItemPreis"
                            placeholder="0.00"
                        >

                    </div>

                </div>

                <div
                    class="button-row"
                    style="margin-top:24px;"
                >

                    <button
                        type="button"
                        class="action-button success"
                        onclick="neuesItemSpeichern()">
                        Item speichern
                    </button>

                    <button
                        type="button"
                        class="action-button"
                        onclick="schliesseItemDetails()">
                        Abbrechen
                    </button>

                </div>

            </div>
        `;

        panel.style.display =
            "block";

        panel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // ------------------------------------------------------------
    // NEUES ITEM SPEICHERN
    // ------------------------------------------------------------

    window.neuesItemSpeichern =
        async function() {

            const nameInput =
                element(
                    "verwaltungNeuesItemName"
                );

            const kategorieInput =
                element(
                    "verwaltungNeuesItemKategorie"
                );

            const preisInput =
                element(
                    "verwaltungNeuesItemPreis"
                );

            const name =
                nameInput?.value.trim() ||
                "";

            const kategorie =
                kategorieInput?.value.trim() ||
                "";

            const preis =
                Number(
                    preisInput?.value
                );

            if (!name) {

                verwaltungZeigeFehler(
                    "Der Itemname darf nicht leer sein.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            if (
                !Number.isFinite(preis) ||
                preis < 0
            ) {

                verwaltungZeigeFehler(
                    "Der Preis ist ungültig.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            try {

                // ------------------------------------------------
                // BESTEHENDES ITEM ALS VORLAGE
                // ------------------------------------------------
                //
                // Dadurch werden zusätzliche Pflichtspalten,
                // sofern vorhanden, möglichst berücksichtigt.
                // ------------------------------------------------

                const vorlage =
                    alleItems.length > 0
                        ? alleItems[0]
                        : null;

                const insertDaten = {};

                // ------------------------------------------------
                // NAME
                // ------------------------------------------------

                if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "name"
                    )
                ) {

                    insertDaten.name =
                        name;

                } else if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "item_name"
                    )
                ) {

                    insertDaten.item_name =
                        name;

                } else if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "minecraft_name"
                    )
                ) {

                    insertDaten.minecraft_name =
                        name;

                } else {

                    insertDaten.name =
                        name;
                }

                // ------------------------------------------------
                // KATEGORIE
                // ------------------------------------------------

                if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "category"
                    )
                ) {

                    insertDaten.category =
                        kategorie;

                } else if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "kategorie"
                    )
                ) {

                    insertDaten.kategorie =
                        kategorie;

                } else {

                    insertDaten.category =
                        kategorie;
                }

                // ------------------------------------------------
                // PREIS
                // ------------------------------------------------

                if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "price"
                    )
                ) {

                    insertDaten.price =
                        preis;

                } else if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "preis"
                    )
                ) {

                    insertDaten.preis =
                        preis;

                } else if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "sell_price"
                    )
                ) {

                    insertDaten.sell_price =
                        preis;

                } else if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "unit_price"
                    )
                ) {

                    insertDaten.unit_price =
                        preis;

                } else {

                    insertDaten.price =
                        preis;
                }

                // ------------------------------------------------
                // ANGEBOT STANDARDMÄSSIG AUS
                // ------------------------------------------------

                if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "is_offer"
                    )
                ) {

                    insertDaten.is_offer =
                        false;
                }

                if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "offer_price"
                    )
                ) {

                    insertDaten.offer_price =
                        null;
                }

                if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "offer_duration_days"
                    )
                ) {

                    insertDaten.offer_duration_days =
                        null;
                }

                if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "offer_start_at"
                    )
                ) {

                    insertDaten.offer_start_at =
                        null;
                }

                if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "offer_end_at"
                    )
                ) {

                    insertDaten.offer_end_at =
                        null;
                }

                // ------------------------------------------------
                // TIMESTAMP
                // ------------------------------------------------

                if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "created_at"
                    )
                ) {

                    insertDaten.created_at =
                        new Date().toISOString();
                }

                if (
                    vorlage &&
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "updated_at"
                    )
                ) {

                    insertDaten.updated_at =
                        new Date().toISOString();
                }

                // ------------------------------------------------
                // ITEM ERSTELLEN
                // ------------------------------------------------

                const {
                    data,
                    error
                } = await supabase
                    .from("items")
                    .insert(
                        insertDaten
                    )
                    .select("*")
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                if (!data) {

                    verwaltungZeigeFehler(
                        "Das neue Item konnte nicht erstellt werden.",
                        element(
                            "preiseMessage"
                        )
                    );

                    return;
                }

                verwaltungZeigeErfolg(
                    "Das neue Item wurde erfolgreich erstellt.",
                    element(
                        "preiseMessage"
                    )
                );

                window.schliesseItemDetails();

                await ladeItems();

            } catch (error) {

                console.error(
                    "Fehler beim Erstellen des Items:",
                    error
                );

                verwaltungZeigeFehler(
                    "Das neue Item konnte nicht erstellt werden.\n\n" +
                    verwaltungFehlerText(
                        error
                    ),
                    element(
                        "preiseMessage"
                    )
                );
            }
        };

    // ------------------------------------------------------------
    // BUTTON „NEUES ITEM“
    // ------------------------------------------------------------

    const neuesItemButton =
        element(
            "neuesItemButton"
        );

    if (neuesItemButton) {

        neuesItemButton.addEventListener(
            "click",
            () => {

                zeigeNeuesItemFormular();

            }
        );
    }

    // ============================================================
    // ENDE TEIL 10/13
    // TEIL 11 KOMMT DIREKT DARUNTER
    // ============================================================

        // ============================================================
    // ANGEBOTSVERWALTUNG
    // Teil 11/13
    // ============================================================

    // ------------------------------------------------------------
    // ANGEBOTSDATEN ZURÜCKSETZEN
    // ------------------------------------------------------------

    function angebotFormularZuruecksetzen() {

        setzeWert(
            "angebotItem",
            ""
        );

        setzeWert(
            "angebotPreis",
            ""
        );

        const laufzeitButtons =
            document.querySelectorAll(
                "[data-duration]"
            );

        laufzeitButtons.forEach(
            button => {
                button.classList.remove(
                    "active"
                );
            }
        );

        const angebotBereich =
            element(
                "angebotBereich"
            );

        if (angebotBereich) {

            angebotBereich.style.display =
                "none";
        }
    }

    // ------------------------------------------------------------
    // ANGEBOT AUS ITEM ÖFFNEN
    // ------------------------------------------------------------

    function oeffneAngebotFormular(
        item
    ) {

        if (!item) {
            return;
        }

        aktuellesItem =
            item;

        const bereich =
            element(
                "angebotBereich"
            );

        const itemAuswahl =
            element(
                "angebotItem"
            );

        const preis =
            element(
                "angebotPreis"
            );

        if (!bereich) {
            return;
        }

        // --------------------------------------------------------
        // ITEM NAME ANZEIGEN
        // --------------------------------------------------------

        if (itemAuswahl) {

            itemAuswahl.innerHTML = `
                <option value="${verwaltungEscape(
                    item.id
                )}">
                    ${verwaltungEscape(
                        itemName(item)
                    )}
                </option>
            `;

            itemAuswahl.value =
                String(item.id);
        }

        // --------------------------------------------------------
        // VORHANDENEN ANGEBOTSPREIS ÜBERNEHMEN
        // --------------------------------------------------------

        if (preis) {

            const vorhandenerPreis =
                itemAngebotspreis(
                    item
                );

            preis.value =
                vorhandenerPreis !== null
                    ? vorhandenerPreis
                    : "";
        }

        // --------------------------------------------------------
        // LAUFZEIT AUSWÄHLEN
        // --------------------------------------------------------

        document
            .querySelectorAll(
                "[data-duration]"
            )
            .forEach(
                button => {

                    button.classList.remove(
                        "active"
                    );

                    if (
                        Number(
                            button.dataset.duration
                        ) ===
                        Number(
                            item.offer_duration_days
                        )
                    ) {

                        button.classList.add(
                            "active"
                        );
                    }
                }
            );

        bereich.style.display =
            "block";

        bereich.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // ------------------------------------------------------------
    // LAUFZEIT-BUTTONS
    // ------------------------------------------------------------

    function initialisiereAngebotsLaufzeiten() {

        document
            .querySelectorAll(
                "[data-duration]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const tage =
                                Number(
                                    button.dataset.duration
                                );

                            if (
                                !erlaubteAngebotsLaufzeiten.includes(
                                    tage
                                )
                            ) {
                                return;
                            }

                            document
                                .querySelectorAll(
                                    "[data-duration]"
                                )
                                .forEach(
                                    andererButton => {

                                        andererButton.classList.remove(
                                            "active"
                                        );
                                    }
                                );

                            button.classList.add(
                                "active"
                            );
                        }
                    );
                }
            );
    }

    // ------------------------------------------------------------
    // AUSGEWÄHLTE LAUFZEIT
    // ------------------------------------------------------------

    function holeAusgewaehlteLaufzeit() {

        const aktiverButton =
            document.querySelector(
                "[data-duration].active"
            );

        if (!aktiverButton) {
            return null;
        }

        const tage =
            Number(
                aktiverButton.dataset.duration
            );

        if (
            !erlaubteAngebotsLaufzeiten.includes(
                tage
            )
        ) {
            return null;
        }

        return tage;
    }

    // ------------------------------------------------------------
    // ANGEBOT ERSTELLEN / AKTUALISIEREN
    // ------------------------------------------------------------

    async function speichereAngebot() {

        const itemAuswahl =
            element(
                "angebotItem"
            );

        const preisInput =
            element(
                "angebotPreis"
            );

        const laufzeit =
            holeAusgewaehlteLaufzeit();

        if (!itemAuswahl) {

            verwaltungZeigeFehler(
                "Das Angebotsformular konnte nicht gefunden werden.",
                element(
                    "preiseMessage"
                )
            );

            return;
        }

        const itemId =
            itemAuswahl.value;

        const angebotspreis =
            Number(
                preisInput?.value
            );

        if (!itemId) {

            verwaltungZeigeFehler(
                "Bitte wähle ein Item aus.",
                element(
                    "preiseMessage"
                )
            );

            return;
        }

        if (
            !Number.isFinite(
                angebotspreis
            ) ||
            angebotspreis < 0
        ) {

            verwaltungZeigeFehler(
                "Bitte gib einen gültigen Angebotspreis ein.",
                element(
                    "preiseMessage"
                )
            );

            return;
        }

        if (!laufzeit) {

            verwaltungZeigeFehler(
                "Bitte wähle eine Angebotslaufzeit.",
                element(
                    "preiseMessage"
                )
            );

            return;
        }

        const item =
            alleItems.find(
                eintrag =>
                    String(
                        eintrag.id
                    ) ===
                    String(
                        itemId
                    )
            );

        if (!item) {

            verwaltungZeigeFehler(
                "Das ausgewählte Item wurde nicht gefunden.",
                element(
                    "preiseMessage"
                )
            );

            return;
        }

        try {

            const start =
                new Date();

            const ende =
                new Date(
                    start.getTime() +
                    laufzeit *
                    24 *
                    60 *
                    60 *
                    1000
                );

            const updateDaten = {
                is_offer: true,
                offer_price:
                    angebotspreis,
                offer_duration_days:
                    laufzeit,
                offer_start_at:
                    start.toISOString(),
                offer_end_at:
                    ende.toISOString()
            };

            if (
                Object.prototype.hasOwnProperty.call(
                    item,
                    "updated_at"
                )
            ) {

                updateDaten.updated_at =
                    new Date().toISOString();
            }

            const {
                data,
                error
            } = await supabase
                .from("items")
                .update(
                    updateDaten
                )
                .eq(
                    "id",
                    item.id
                )
                .select("*")
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (!data) {

                verwaltungZeigeFehler(
                    "Das Angebot konnte nicht gespeichert werden.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            aktuellesItem =
                data;

            verwaltungZeigeErfolg(
                "Das Angebot wurde erfolgreich erstellt.",
                element(
                    "preiseMessage"
                )
            );

            angebotFormularZuruecksetzen();

            await ladeItems();

        } catch (error) {

            console.error(
                "Fehler beim Speichern des Angebots:",
                error
            );

            verwaltungZeigeFehler(
                "Das Angebot konnte nicht gespeichert werden.\n\n" +
                verwaltungFehlerText(
                    error
                ),
                element(
                    "preiseMessage"
                )
            );
        }
    }

    // ------------------------------------------------------------
    // ANGEBOT BEENDEN
    // ------------------------------------------------------------

    async function beendeAngebot(
        item
    ) {

        if (!item) {
            return;
        }

        const bestaetigt =
            confirm(
                "Das Angebot für \"" +
                itemName(item) +
                "\" wirklich beenden?"
            );

        if (!bestaetigt) {
            return;
        }

        try {

            const updateDaten = {
                is_offer: false,
                offer_price: null,
                offer_duration_days: null,
                offer_start_at: null,
                offer_end_at: null
            };

            if (
                Object.prototype.hasOwnProperty.call(
                    item,
                    "updated_at"
                )
            ) {

                updateDaten.updated_at =
                    new Date().toISOString();
            }

            const {
                error
            } = await supabase
                .from("items")
                .update(
                    updateDaten
                )
                .eq(
                    "id",
                    item.id
                );

            if (error) {
                throw error;
            }

            verwaltungZeigeErfolg(
                "Das Angebot wurde beendet.",
                element(
                    "preiseMessage"
                )
            );

            angebotFormularZuruecksetzen();

            await ladeItems();

        } catch (error) {

            console.error(
                "Fehler beim Beenden des Angebots:",
                error
            );

            verwaltungZeigeFehler(
                "Das Angebot konnte nicht beendet werden.\n\n" +
                verwaltungFehlerText(
                    error
                ),
                element(
                    "preiseMessage"
                )
            );
        }
    }

    // ------------------------------------------------------------
    // ANGEBOT BUTTON
    // ------------------------------------------------------------

    const angebotErstellenButton =
        element(
            "angebotErstellenButton"
        );

    if (angebotErstellenButton) {

        angebotErstellenButton.addEventListener(
            "click",
            async () => {

                await speichereAngebot();

            }
        );
    }

    // ------------------------------------------------------------
    // ANGEBOT ZURÜCKSETZEN BUTTON
    // ------------------------------------------------------------

    const angebotZuruecksetzenButton =
        element(
            "angebotZuruecksetzenButton"
        );

    if (angebotZuruecksetzenButton) {

        angebotZuruecksetzenButton.addEventListener(
            "click",
            () => {

                angebotFormularZuruecksetzen();

            }
        );
    }

    // ------------------------------------------------------------
    // LAUFZEITEN INITIALISIEREN
    // ------------------------------------------------------------

    initialisiereAngebotsLaufzeiten();

    // ------------------------------------------------------------
    // ANGEBOTSFORMULAR STANDARDMÄSSIG VERSTECKEN
    // ------------------------------------------------------------

    angebotFormularZuruecksetzen();

    // ------------------------------------------------------------
    // ANGEBOT AUS DER ITEM-BEARBEITUNG ÖFFNEN
    // ------------------------------------------------------------

    window.itemAngebotBearbeiten =
        function(id) {

            const item =
                alleItems.find(
                    eintrag =>
                        String(
                            eintrag.id
                        ) ===
                        String(id)
                );

            if (!item) {

                verwaltungZeigeFehler(
                    "Das Item wurde nicht gefunden.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            oeffneAngebotFormular(
                item
            );
        };

    // ------------------------------------------------------------
    // ANGEBOT BEENDEN – GLOBAL
    // ------------------------------------------------------------

    window.angebotBeenden =
        async function(id) {

            const item =
                alleItems.find(
                    eintrag =>
                        String(
                            eintrag.id
                        ) ===
                        String(id)
                );

            if (!item) {

                verwaltungZeigeFehler(
                    "Das Item wurde nicht gefunden.",
                    element(
                        "preiseMessage"
                    )
                );

                return;
            }

            await beendeAngebot(
                item
            );
        };

    // ============================================================
    // ENDE TEIL 11/13
    // TEIL 12 KOMMT DIREKT DARUNTER
    // ============================================================

    // ============================================================
// EHRENMARKT – VERWALTUNG
// verwaltung.js – Teil 12/13
// BÜNDNISVERWALTUNG
// ============================================================


// ------------------------------------------------------------
// BÜNDNISSE LADEN
// ------------------------------------------------------------

async function ladeBuendnisse() {

    const liste = element("buendnisseListe");

    if (liste) {
        liste.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    Bündnisse werden geladen...
                </td>
            </tr>
        `;
    }

    const { data, error } = await supabase
        .from("buendnisse")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Fehler beim Laden der Bündnisse:", error);
        verwaltungZeigeFehler(
            "buendnisseMessage",
            "Die Bündnisse konnten nicht geladen werden: " +
            verwaltungFehlerText(error)
        );
        return;
    }

    alleBuendnisse = data || [];

    aktualisiereBuendnisStatistik();
    zeigeBuendnisse();
}


// ------------------------------------------------------------
// BÜNDNIS-STATISTIK
// ------------------------------------------------------------

function aktualisiereBuendnisStatistik() {

    const offen = alleBuendnisse.filter(
        b => String(b.status || "").toLowerCase() === "offen"
    ).length;

    const aktiv = alleBuendnisse.filter(
        b => String(b.status || "").toLowerCase() === "angenommen"
    ).length;

    const abgelehnt = alleBuendnisse.filter(
        b => String(b.status || "").toLowerCase() === "abgelehnt"
    ).length;

    setzeWert("buendnisseOffen", offen);
    setzeWert("buendnisseAktiv", aktiv);
    setzeWert("buendnisseAbgelehnt", abgelehnt);
    setzeWert("buendnisseGesamt", alleBuendnisse.length);
}


// ------------------------------------------------------------
// BÜNDNIS-LISTE
// ------------------------------------------------------------

function zeigeBuendnisse() {

    const liste = element("buendnisseListe");

    if (!liste) {
        console.warn("Element #buendnisseListe nicht gefunden.");
        return;
    }

    if (!alleBuendnisse.length) {

        liste.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    Noch keine Bündnisanträge vorhanden.
                </td>
            </tr>
        `;

        return;
    }

    liste.innerHTML = alleBuendnisse.map(
        buendnis => erstelleBuendnisZeile(buendnis)
    ).join("");
}


// ------------------------------------------------------------
// BÜNDNIS-ZEILE
// ------------------------------------------------------------

function erstelleBuendnisZeile(buendnis) {

    const status = String(buendnis.status || "Offen");

    let statusKlasse = "status-offen";

    if (status.toLowerCase() === "angenommen") {
        statusKlasse = "status-angenommen";
    }

    if (status.toLowerCase() === "abgelehnt") {
        statusKlasse = "status-abgelehnt";
    }

    const buendnisId = buendnis.buendnis_id
        ? verwaltungEscape(buendnis.buendnis_id)
        : "—";

    const clanName = verwaltungEscape(
        buendnis.clan_name || "Unbekannter Clan"
    );

    const clanTag = buendnis.clan_tag
        ? `[${verwaltungEscape(buendnis.clan_tag)}]`
        : "";

    const kontakt = verwaltungEscape(
        buendnis.contact_name || "—"
    );

    const minecraftName = verwaltungEscape(
        buendnis.minecraft_name || "—"
    );

    const datum = verwaltungDatum(
        buendnis.created_at
    );

    return `
        <tr>

            <td>
                <strong>${buendnisId}</strong>
            </td>

            <td>
                <strong>${clanName}</strong>
                ${clanTag
                    ? `<br><small>${clanTag}</small>`
                    : ""
                }
            </td>

            <td>
                ${kontakt}
            </td>

            <td>
                ${minecraftName}
            </td>

            <td>
                <span class="${statusKlasse}">
                    ${verwaltungEscape(status)}
                </span>
            </td>

            <td>
                ${datum}
            </td>

            <td class="verwaltung-aktionen">

                <button
                    type="button"
                    onclick="zeigeBuendnisDetails(${Number(buendnis.id)})">
                    Ansehen
                </button>

            </td>

        </tr>
    `;
}


// ------------------------------------------------------------
// BÜNDNIS DETAILS
// ------------------------------------------------------------

window.zeigeBuendnisDetails = function(id) {

    const buendnis = alleBuendnisse.find(
        b => Number(b.id) === Number(id)
    );

    if (!buendnis) {
        verwaltungZeigeFehler(
            "buendnisseMessage",
            "Das Bündnis wurde nicht gefunden."
        );
        return;
    }

    aktuellerBuendnisDatensatz = buendnis;

    const details = element("buendnisDetails");
    const content = element("buendnisDetailsContent");

    if (!details || !content) {
        return;
    }

    const status = String(
        buendnis.status || "Offen"
    );

    const rabatt = Number(
        buendnis.discount_percent || 0
    );

    content.innerHTML = `

        <div class="detail-header">

            <div>
                <h3>
                    ${verwaltungEscape(
                        buendnis.clan_name || "Bündnis"
                    )}
                </h3>

                <p>
                    Bündnis-ID:
                    <strong>
                        ${verwaltungEscape(
                            buendnis.buendnis_id || "Noch keine ID"
                        )}
                    </strong>
                </p>
            </div>

            <div>
                <strong>
                    ${verwaltungEscape(status)}
                </strong>
            </div>

        </div>


        <div class="detail-grid">

            <div>
                <strong>Clanname</strong>
                <span>
                    ${verwaltungEscape(
                        buendnis.clan_name || "—"
                    )}
                </span>
            </div>

            <div>
                <strong>Clan-Tag</strong>
                <span>
                    ${verwaltungEscape(
                        buendnis.clan_tag || "—"
                    )}
                </span>
            </div>

            <div>
                <strong>Ansprechpartner</strong>
                <span>
                    ${verwaltungEscape(
                        buendnis.contact_name || "—"
                    )}
                </span>
            </div>

            <div>
                <strong>Minecraft-Name</strong>
                <span>
                    ${verwaltungEscape(
                        buendnis.minecraft_name || "—"
                    )}
                </span>
            </div>

            <div>
                <strong>Discord</strong>
                <span>
                    ${verwaltungEscape(
                        buendnis.discord_name || "—"
                    )}
                </span>
            </div>

            <div>
                <strong>Clan-Rolle</strong>
                <span>
                    ${verwaltungEscape(
                        buendnis.clan_role || "—"
                    )}
                </span>
            </div>

            <div>
                <strong>Mitglieder</strong>
                <span>
                    ${verwaltungZahl(
                        buendnis.clan_member_count
                    )}
                </span>
            </div>

            <div>
                <strong>Clan seit</strong>
                <span>
                    ${verwaltungNurDatum(
                        buendnis.clan_since
                    )}
                </span>
            </div>

            <div>
                <strong>Antrag erstellt</strong>
                <span>
                    ${verwaltungDatum(
                        buendnis.created_at
                    )}
                </span>
            </div>

            <div>
                <strong>Aktiv seit</strong>
                <span>
                    ${verwaltungNurDatum(
                        buendnis.active_since
                    )}
                </span>
            </div>

        </div>


        <div class="detail-block">

            <h4>Clan-Beschreibung</h4>

            <p>
                ${verwaltungEscape(
                    buendnis.clan_description || "Keine Angabe."
                )}
            </p>

        </div>


        <div class="detail-block">

            <h4>Grund für die Bewerbung</h4>

            <p>
                ${verwaltungEscape(
                    buendnis.reason || "Keine Angabe."
                )}
            </p>

        </div>


        <div class="detail-block">

            <h4>Gewünschte Zusammenarbeit</h4>

            <p>
                ${verwaltungEscape(
                    buendnis.cooperation || "Keine Angabe."
                )}
            </p>

        </div>


        <div class="detail-block">

            <h4>Gewünschte Vereinbarung</h4>

            <p>
                ${verwaltungEscape(
                    buendnis.desired_agreement || "Keine Angabe."
                )}
            </p>

        </div>


        <div class="detail-block">

            <h4>Antragstext</h4>

            <p>
                ${verwaltungEscape(
                    buendnis.application_text || "Keine Angabe."
                )}
            </p>

        </div>


        <div class="detail-block">

            <h4>Aktuelle Vereinbarung</h4>

            <p>
                ${verwaltungEscape(
                    buendnis.agreement || "Noch keine Vereinbarung."
                )}
            </p>

            <p>
                <strong>Rabatt:</strong>
                ${rabatt.toFixed(2)} %
            </p>

        </div>


        ${
            buendnis.decision_note
                ? `
                    <div class="detail-block">

                        <h4>Entscheidungsnotiz</h4>

                        <p>
                            ${verwaltungEscape(
                                buendnis.decision_note
                            )}
                        </p>

                    </div>
                `
                : ""
        }


        <div class="detail-actions">

            ${
                status.toLowerCase() === "offen"
                    ? `
                        <button
                            type="button"
                            onclick="buendnisAnnehmen(${Number(buendnis.id)})">
                            Bündnis annehmen
                        </button>

                        <button
                            type="button"
                            onclick="buendnisAblehnen(${Number(buendnis.id)})">
                            Antrag ablehnen
                        </button>
                    `
                    : ""
            }


            ${
                status.toLowerCase() === "angenommen"
                    ? `
                        <button
                            type="button"
                            onclick="buendnisBearbeiten(${Number(buendnis.id)})">
                            Vereinbarung bearbeiten
                        </button>
                    `
                    : ""
            }


            <button
                type="button"
                onclick="buendnisLoeschen(${Number(buendnis.id)})">
                Löschen
            </button>

        </div>

    `;

    details.style.display = "block";

    details.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
};


// ------------------------------------------------------------
// BÜNDNIS DETAILS SCHLIESSEN
// ------------------------------------------------------------

window.schliesseBuendnisDetails = function() {

    const details = element("buendnisDetails");

    if (details) {
        details.style.display = "none";
    }

    aktuellerBuendnisDatensatz = null;
};


// ------------------------------------------------------------
// NÄCHSTE BÜNDNIS-ID ERMITTELN
// ------------------------------------------------------------

function ermittleNaechsteBuendnisId() {

    let hoechsteNummer = 0;

    alleBuendnisse.forEach(buendnis => {

        if (!buendnis.buendnis_id) {
            return;
        }

        const match = String(
            buendnis.buendnis_id
        ).match(/^BND-(\d+)$/i);

        if (!match) {
            return;
        }

        const nummer = Number(match[1]);

        if (nummer > hoechsteNummer) {
            hoechsteNummer = nummer;
        }
    });

    return `BND-${String(
        hoechsteNummer + 1
    ).padStart(4, "0")}`;
}


// ------------------------------------------------------------
// BÜNDNIS ANNEHMEN
// ------------------------------------------------------------

window.buendnisAnnehmen = async function(id) {

    const buendnis = alleBuendnisse.find(
        b => Number(b.id) === Number(id)
    );

    if (!buendnis) {
        return;
    }

    const bestaetigung = confirm(
        `Möchtest du den Bündnisantrag von "${buendnis.clan_name}" wirklich annehmen?`
    );

    if (!bestaetigung) {
        return;
    }

    const buendnisId = buendnis.buendnis_id ||
        ermittleNaechsteBuendnisId();

    const heute = new Date()
        .toISOString()
        .split("T")[0];

    const { error } = await supabase
        .from("buendnisse")
        .update({
            status: "Angenommen",
            buendnis_id: buendnisId,
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            active_since: heute,
            decision_note: "Bündnis wurde angenommen.",
            updated_at: new Date().toISOString()
        })
        .eq("id", buendnis.id);

    if (error) {

        console.error(
            "Fehler beim Annehmen des Bündnisses:",
            error
        );

        verwaltungZeigeFehler(
            "buendnisseMessage",
            "Das Bündnis konnte nicht angenommen werden: " +
            verwaltungFehlerText(error)
        );

        return;
    }

    verwaltungZeigeErfolg(
        "buendnisseMessage",
        `Bündnis ${buendnisId} wurde erfolgreich angenommen.`
    );

    const details = element("buendnisDetails");

    if (details) {
        details.style.display = "none";
    }

    await ladeBuendnisse();
};


// ------------------------------------------------------------
// BÜNDNIS ABLEHNEN
// ------------------------------------------------------------

window.buendnisAblehnen = async function(id) {

    const buendnis = alleBuendnisse.find(
        b => Number(b.id) === Number(id)
    );

    if (!buendnis) {
        return;
    }

    const begruendung = prompt(
        "Warum wird der Bündnisantrag abgelehnt?"
    );

    if (begruendung === null) {
        return;
    }

    const { error } = await supabase
        .from("buendnisse")
        .update({
            status: "Abgelehnt",
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            decision_note: begruendung.trim() ||
                "Bündnisantrag wurde abgelehnt.",
            updated_at: new Date().toISOString()
        })
        .eq("id", buendnis.id);

    if (error) {

        console.error(
            "Fehler beim Ablehnen des Bündnisses:",
            error
        );

        verwaltungZeigeFehler(
            "buendnisseMessage",
            "Der Bündnisantrag konnte nicht abgelehnt werden: " +
            verwaltungFehlerText(error)
        );

        return;
    }

    verwaltungZeigeErfolg(
        "buendnisseMessage",
        "Der Bündnisantrag wurde abgelehnt."
    );

    const details = element("buendnisDetails");

    if (details) {
        details.style.display = "none";
    }

    await ladeBuendnisse();
};


// ------------------------------------------------------------
// AKTIVES BÜNDNIS BEARBEITEN
// ------------------------------------------------------------

window.buendnisBearbeiten = async function(id) {

    const buendnis = alleBuendnisse.find(
        b => Number(b.id) === Number(id)
    );

    if (!buendnis) {
        return;
    }

    if (
        String(buendnis.status || "").toLowerCase() !==
        "angenommen"
    ) {
        alert(
            "Nur angenommene Bündnisse können bearbeitet werden."
        );
        return;
    }

    const aktuelleVereinbarung =
        buendnis.agreement || "";

    const neueVereinbarung = prompt(
        "Vereinbarung des Bündnisses:",
        aktuelleVereinbarung
    );

    if (neueVereinbarung === null) {
        return;
    }

    const aktuellerRabatt = Number(
        buendnis.discount_percent || 0
    );

    const rabattEingabe = prompt(
        "Rabatt in Prozent (0 bis 100):",
        String(aktuellerRabatt)
    );

    if (rabattEingabe === null) {
        return;
    }

    const rabatt = Number(
        String(rabattEingabe).replace(",", ".")
    );

    if (
        !Number.isFinite(rabatt) ||
        rabatt < 0 ||
        rabatt > 100
    ) {
        alert(
            "Der Rabatt muss zwischen 0 und 100 Prozent liegen."
        );
        return;
    }

    const { error } = await supabase
        .from("buendnisse")
        .update({
            agreement: neueVereinbarung.trim() || null,
            discount_percent: rabatt,
            updated_at: new Date().toISOString()
        })
        .eq("id", buendnis.id);

    if (error) {

        console.error(
            "Fehler beim Bearbeiten des Bündnisses:",
            error
        );

        verwaltungZeigeFehler(
            "buendnisseMessage",
            "Das Bündnis konnte nicht bearbeitet werden: " +
            verwaltungFehlerText(error)
        );

        return;
    }

    verwaltungZeigeErfolg(
        "buendnisseMessage",
        "Die Bündnisvereinbarung wurde gespeichert."
    );

    const details = element("buendnisDetails");

    if (details) {
        details.style.display = "none";
    }

    await ladeBuendnisse();
};


// ------------------------------------------------------------
// BÜNDNIS LÖSCHEN
// ------------------------------------------------------------

window.buendnisLoeschen = async function(id) {

    const buendnis = alleBuendnisse.find(
        b => Number(b.id) === Number(id)
    );

    if (!buendnis) {
        return;
    }

    const bestaetigung = confirm(
        `Möchtest du den Bündnisantrag "${buendnis.clan_name}" wirklich dauerhaft löschen?`
    );

    if (!bestaetigung) {
        return;
    }

    const { error } = await supabase
        .from("buendnisse")
        .delete()
        .eq("id", buendnis.id);

    if (error) {

        console.error(
            "Fehler beim Löschen des Bündnisses:",
            error
        );

        verwaltungZeigeFehler(
            "buendnisseMessage",
            "Das Bündnis konnte nicht gelöscht werden: " +
            verwaltungFehlerText(error)
        );

        return;
    }

    verwaltungZeigeErfolg(
        "buendnisseMessage",
        "Das Bündnis wurde gelöscht."
    );

    const details = element("buendnisDetails");

    if (details) {
        details.style.display = "none";
    }

    await ladeBuendnisse();
};


// ------------------------------------------------------------
// BÜNDNIS-NAVIGATION
// ------------------------------------------------------------

function initialisiereBuendnisNavigation() {

    const button = element("buendnisseAnzeigen");

    if (button) {

        button.addEventListener("click", async () => {

            zeigeVerwaltungsbereich(
                "section-buendnisse"
            );

            await ladeBuendnisse();

        });
    }
}


// ------------------------------------------------------------
// BÜNDNIS DETAILS – SCHLIESSEN BUTTON
// ------------------------------------------------------------

const buendnisDetailsSchliessen =
    document.querySelector(
        "#buendnisDetails .detail-close"
    );

if (buendnisDetailsSchliessen) {

    buendnisDetailsSchliessen.addEventListener(
        "click",
        window.schliesseBuendnisDetails
    );
}


// ------------------------------------------------------------
// BÜNDNISSE INITIAL LADEN
// ------------------------------------------------------------

await ladeBuendnisse();

// ============================================================
// EHRENMARKT – VERWALTUNG
// verwaltung.js – Teil 13/13
// ABSCHLUSS / INITIALISIERUNG
// ============================================================


// ------------------------------------------------------------
// NAVIGATION FÜR ALLE VERWALTUNGSBEREICHE INITIALISIEREN
// ------------------------------------------------------------

initialisiereAuftragsNavigation();


// ------------------------------------------------------------
// PREISVERWALTUNG / ITEM-NAVIGATION INITIALISIEREN
// ------------------------------------------------------------

initialisierePreisTabs();

initialisiereItemFilter();


// ------------------------------------------------------------
// BÜNDNIS-NAVIGATION INITIALISIEREN
// ------------------------------------------------------------

initialisiereBuendnisNavigation();


// ------------------------------------------------------------
// DETAILBEREICHE STANDARDMÄSSIG SCHLIESSEN
// ------------------------------------------------------------

const standardDetails = [
    "bewerbungDetails",
    "auftragDetails",
    "mitarbeiterDetails",
    "itemDetails",
    "buendnisDetails"
];

standardDetails.forEach(id => {

    const bereich = element(id);

    if (bereich) {
        bereich.style.display = "none";
    }

});


// ------------------------------------------------------------
// MELDUNGEN ZU BEGINN AUSBLENDEN
// ------------------------------------------------------------

[
    "bewerbungenMessage",
    "auftraegeMessage",
    "mitarbeiterMessage",
    "preiseMessage",
    "buendnisseMessage"
].forEach(id => {

    verwaltungMeldungAusblenden(id);

});


// ------------------------------------------------------------
// STANDARD-BEREICH ANZEIGEN
// ------------------------------------------------------------

zeigeVerwaltungsbereich(
    "section-bewerbungen"
);


// ------------------------------------------------------------
// ABSCHLUSSMELDUNG
// ------------------------------------------------------------

console.log(
    "EHRENMARKT Verwaltung vollständig geladen."
);

console.log(
    "Bewerbungen, Aufträge, Mitarbeiter, Preisverwaltung und Bündnisse sind aktiviert."
);


// ============================================================
// ENDE VON verwaltung.js
// ============================================================

});
