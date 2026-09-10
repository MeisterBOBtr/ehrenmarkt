/*
 * EHRENMARKT
 * Mitarbeiterbereich
 *
 * Datei:
 * JS/mitarbeiterbereich.js
 */

(function () {
    "use strict";

    let supabase = null;
    let aktuellerUser = null;
    let mitarbeiter = null;
    let profil = null;

    const ids = {
        fehler: "fehler",

        abmeldenButton: "abmeldenButton",

        mitarbeiterBegruessung: "mitarbeiterBegruessung",
        mitarbeiterUsername: "mitarbeiterUsername",
        mitarbeiterMinecraft: "mitarbeiterMinecraft",
        mitarbeiterRang: "mitarbeiterRang",
        mitarbeiterRolle: "mitarbeiterRolle",

        statusAnzeige: "statusAnzeige",
        statusPunkt: "statusPunkt",
        statusText: "statusText",
        statusButton: "statusButton",

        verfuegbarButton: "verfuegbarButton",
        nichtVerfuegbarButton: "nichtVerfuegbarButton",

        arbeitszeitAnzeige: "arbeitszeitAnzeige",

        auftraegeGesamt: "auftraegeGesamt",
        auftraegeOffen: "auftraegeOffen",
        auftraegeBearbeitung: "auftraegeBearbeitung",

        meineAuftraege: "meineAuftraege",

        offeneVerstaerkung: "offeneVerstaerkung",

        benachrichtigungen: "benachrichtigungen"
    };


    /*
     * DOM-HILFSFUNKTIONEN
     */

    function element(id) {
        return document.getElementById(id);
    }


    function text(id, wert) {
        const el = element(id);

        if (el) {
            el.textContent = wert ?? "—";
        }
    }


    function zeigenFehler(nachricht) {
        const el = element(ids.fehler);

        if (!el) {
            console.error(nachricht);
            return;
        }

        el.textContent = nachricht;
        el.style.display = "block";
    }


    function versteckenFehler() {
        const el = element(ids.fehler);

        if (el) {
            el.textContent = "";
            el.style.display = "none";
        }
    }


    function htmlEscapen(wert) {
        if (wert === null || wert === undefined) {
            return "";
        }

        return String(wert)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /*
     * LADEZUSTAND
     */

    function ladeText(id, nachricht = "Wird geladen...") {
        const el = element(id);

        if (el) {
            el.innerHTML = `
                <div class="laden">
                    ${htmlEscapen(nachricht)}
                </div>
            `;
        }
    }


    /*
     * SUPABASE ERMITTELN
     */

    function holeSupabaseClient() {
        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.supabase && typeof window.supabase.createClient === "function") {
            console.warn(
                "supabaseClient wurde nicht gefunden. " +
                "Es wird kein neuer Client erzeugt."
            );
        }

        return null;
    }


    /*
     * INITIALISIERUNG
     */

    async function initialisieren() {

        try {
            versteckenFehler();

            supabase = holeSupabaseClient();

            if (!supabase) {
                zeigenFehler(
                    "Die Supabase-Verbindung konnte nicht geladen werden."
                );
                return;
            }

            const {
                data,
                error
            } = await supabase.auth.getSession();

            if (error) {
                console.error("Session-Fehler:", error);

                zeigenFehler(
                    "Die Anmeldung konnte nicht geprüft werden."
                );

                return;
            }

            if (!data || !data.session || !data.session.user) {
                zeigenFehler(
                    "Du bist nicht angemeldet. Bitte melde dich zuerst an."
                );

                setTimeout(function () {
                    window.location.href = "registrieren.html";
                }, 1200);

                return;
            }

            aktuellerUser = data.session.user;

            await ladeMitarbeiterbereich();

        } catch (fehler) {

            console.error(
                "Fehler beim Initialisieren des Mitarbeiterbereichs:",
                fehler
            );

            zeigenFehler(
                "Der Mitarbeiterbereich konnte nicht geladen werden."
            );
        }
    }


    /*
     * MITARBEITERBEREICH LADEN
     */

    async function ladeMitarbeiterbereich() {

        if (!aktuellerUser) {
            return;
        }

        await Promise.allSettled([
            ladeProfil(),
            ladeMitarbeiter(),
            ladeVerstaerkung(),
            ladeAuftraege(),
            ladeBenachrichtigungen()
        ]);

        aktualisiereAnsicht();
    }


    /*
     * PROFIL LADEN
     */

    async function ladeProfil() {

        try {

            const {
                data,
                error
            } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", aktuellerUser.id)
                .maybeSingle();

            if (error) {
                console.error(
                    "Profil konnte nicht geladen werden:",
                    error
                );
                return;
            }

            profil = data;

        } catch (fehler) {

            console.error(
                "Profil-Ladefehler:",
                fehler
            );
        }
                     }

     /*
     * MITARBEITERDATEN LADEN
     */

    async function ladeMitarbeiter() {

        try {

            const {
                data,
                error
            } = await supabase
                .from("employees")
                .select("*")
                .eq("user_id", aktuellerUser.id)
                .maybeSingle();

            if (error) {
                console.error(
                    "Mitarbeiterdaten konnten nicht geladen werden:",
                    error
                );

                return;
            }

            mitarbeiter = data;

            if (!mitarbeiter) {
                console.warn(
                    "Für den angemeldeten Benutzer wurde kein Mitarbeiterdatensatz gefunden."
                );

                zeigenFehler(
                    "Für dein Konto wurde noch kein Mitarbeiterdatensatz gefunden."
                );

                return;
            }

        } catch (fehler) {

            console.error(
                "Mitarbeiter-Ladefehler:",
                fehler
            );
        }
    }


    /*
     * ANSICHT AKTUALISIEREN
     */

    function aktualisiereAnsicht() {

        if (profil) {
            aktualisiereProfil();
        }

        if (mitarbeiter) {
            aktualisiereMitarbeiterstatus();
            aktualisiereVerfuegbarkeit();
            aktualisiereArbeitszeit();
        }
    }


    /*
     * PROFIL ANZEIGEN
     */

    function aktualisiereProfil() {

        const username =
            profil.username ||
            profil.benutzername ||
            aktuellerUser.user_metadata?.username ||
            aktuellerUser.email?.split("@")[0] ||
            "Mitarbeiter";

        const minecraft =
            profil.minecraft_username ||
            profil.minecraft_name ||
            profil.minecraft ||
            profil.mc_name ||
            "Nicht hinterlegt";

        const rang =
            profil.rang ||
            profil.role ||
            profil.user_type ||
            "Mitarbeiter";

        const rolle =
            profil.rolle ||
            profil.role ||
            "Mitarbeiter";


        text(
            ids.mitarbeiterBegruessung,
            username
        );

        text(
            ids.mitarbeiterUsername,
            username
        );

        text(
            ids.mitarbeiterMinecraft,
            minecraft
        );

        text(
            ids.mitarbeiterRang,
            rang
        );

        text(
            ids.mitarbeiterRolle,
            rolle
        );
    }


    /*
     * MITARBEITERSTATUS ANZEIGEN
     */

    function aktualisiereMitarbeiterstatus() {

        const aktiv =
            mitarbeiter.is_active === true;

        const punkt =
            element(ids.statusPunkt);

        const statusText =
            element(ids.statusText);

        const button =
            element(ids.statusButton);


        if (statusText) {

            statusText.textContent =
                aktiv
                    ? "Aktiv"
                    : "Inaktiv";
        }


        if (punkt) {

            if (aktiv) {

                punkt.style.background = "#4caf50";
                punkt.style.boxShadow =
                    "0 0 10px rgba(76, 175, 80, 0.55)";

            } else {

                punkt.style.background = "#777";
                punkt.style.boxShadow =
                    "0 0 10px rgba(255, 255, 255, 0.15)";
            }
        }


        if (button) {

            button.textContent =
                aktiv
                    ? "Auf Inaktiv setzen"
                    : "Auf Aktiv setzen";
        }
    }


    /*
     * VERFÜGBARKEIT ANZEIGEN
     */

    function aktualisiereVerfuegbarkeit() {

        const verfuegbar =
            mitarbeiter.is_available === true;

        const verfuegbarButton =
            element(ids.verfuegbarButton);

        const nichtVerfuegbarButton =
            element(ids.nichtVerfuegbarButton);


        if (verfuegbarButton) {

            if (verfuegbar) {

                verfuegbarButton.classList.add("gold");

            } else {

                verfuegbarButton.classList.remove("gold");
            }
        }


        if (nichtVerfuegbarButton) {

            if (!verfuegbar) {

                nichtVerfuegbarButton.classList.add("gold");

            } else {

                nichtVerfuegbarButton.classList.remove("gold");
            }
        }
    }


    /*
     * ARBEITSZEIT ANZEIGEN
     */

    function aktualisiereArbeitszeit() {

        const minuten =
            Number(mitarbeiter.total_work_minutes) || 0;

        const stunden =
            Math.floor(minuten / 60);

        const restMinuten =
            minuten % 60;


        const stundenText =
            String(stunden);

        const minutenText =
            String(restMinuten).padStart(2, "0");


        text(
            ids.arbeitszeitAnzeige,
            `${stundenText}:${minutenText}`
        );
    }


    /*
     * STATUS ÄNDERN
     */

    async function statusAendern() {

        if (!mitarbeiter || !mitarbeiter.id) {
            zeigenFehler(
                "Dein Mitarbeiterdatensatz wurde nicht gefunden."
            );
            return;
        }


        const neuerStatus =
            mitarbeiter.is_active !== true;


        const button =
            element(ids.statusButton);


        if (button) {
            button.disabled = true;
            button.textContent = "Speichert...";
        }


        try {

            const {
                data,
                error
            } = await supabase
                .from("employees")
                .update({
                    is_active: neuerStatus
                })
                .eq("id", mitarbeiter.id)
                .select()
                .maybeSingle();


            if (error) {

                console.error(
                    "Status konnte nicht geändert werden:",
                    error
                );

                zeigenFehler(
                    "Der Mitarbeiterstatus konnte nicht geändert werden."
                );

                return;
            }


            if (data) {
                mitarbeiter = data;
            } else {
                mitarbeiter.is_active = neuerStatus;
            }


            versteckenFehler();

            aktualisiereMitarbeiterstatus();

        } catch (fehler) {

            console.error(
                "Fehler beim Ändern des Mitarbeiterstatus:",
                fehler
            );

            zeigenFehler(
                "Beim Ändern des Mitarbeiterstatus ist ein Fehler aufgetreten."
            );

        } finally {

            if (button) {
                button.disabled = false;
            }
        }
    }


    /*
     * VERFÜGBARKEIT ÄNDERN
     */

    async function setzeVerfuegbarkeit(verfuegbar) {

        if (!mitarbeiter || !mitarbeiter.id) {
            zeigenFehler(
                "Dein Mitarbeiterdatensatz wurde nicht gefunden."
            );
            return;
        }


        const verfuegbarButton =
            element(ids.verfuegbarButton);

        const nichtVerfuegbarButton =
            element(ids.nichtVerfuegbarButton);


        if (verfuegbarButton) {
            verfuegbarButton.disabled = true;
        }

        if (nichtVerfuegbarButton) {
            nichtVerfuegbarButton.disabled = true;
        }


        try {

            const {
                data,
                error
            } = await supabase
                .from("employees")
                .update({
                    is_available: verfuegbar
                })
                .eq("id", mitarbeiter.id)
                .select()
                .maybeSingle();


            if (error) {

                console.error(
                    "Verfügbarkeit konnte nicht geändert werden:",
                    error
                );

                zeigenFehler(
                    "Die Verfügbarkeit konnte nicht geändert werden."
                );

                return;
            }


            if (data) {
                mitarbeiter = data;
            } else {
                mitarbeiter.is_available = verfuegbar;
            }


            versteckenFehler();

            aktualisiereVerfuegbarkeit();

        } catch (fehler) {

            console.error(
                "Fehler bei der Verfügbarkeit:",
                fehler
            );

            zeigenFehler(
                "Beim Ändern der Verfügbarkeit ist ein Fehler aufgetreten."
            );

        } finally {

            if (verfuegbarButton) {
                verfuegbarButton.disabled = false;
            }

            if (nichtVerfuegbarButton) {
                nichtVerfuegbarButton.disabled = false;
            }
        }
          }

     /*
     * AUFTRÄGE LADEN
     *
     * Hinweis:
     * Die verschiedenen Auftragstabellen werden getrennt geladen.
     * Ein Fehler bei einer Tabelle blockiert die anderen Bereiche nicht.
     */

    async function ladeAuftraege() {

        const container = element(ids.meineAuftraege);

        if (!container) {
            return;
        }

        ladeText(
            ids.meineAuftraege,
            "Aufträge werden geladen..."
        );

        try {

            /*
             * Zuerst die dem Mitarbeiter zugewiesenen
             * Bauaufträge über build_order_workers laden.
             */

            let bauauftraege = [];

            try {

                const {
                    data,
                    error
                } = await supabase
                    .from("build_order_workers")
                    .select("*")
                    .eq("employee_id", aktuellerUser.id);

                if (error) {

                    console.warn(
                        "Bauaufträge konnten nicht geladen werden:",
                        error
                    );

                } else {

                    bauauftraege = data || [];
                }

            } catch (fehler) {

                console.warn(
                    "Fehler bei den Bauaufträgen:",
                    fehler
                );
            }


            /*
             * Falls keine Bauaufträge vorhanden sind,
             * zeigen wir zunächst einen leeren Zustand.
             *
             * Weitere Auftragstypen können später ergänzt werden,
             * sobald deren genaue Mitarbeiter-Zuweisung feststeht.
             */

            if (bauauftraege.length === 0) {

                container.innerHTML = `
                    <div class="leer">
                        Dir sind aktuell keine Aufträge zugewiesen.
                    </div>
                `;

                text(ids.auftraegeGesamt, "0");
                text(ids.auftraegeOffen, "0");
                text(ids.auftraegeBearbeitung, "0");

                return;
            }


            /*
             * STATISTIK
             */

            let gesamt = bauauftraege.length;
            let offen = 0;
            let bearbeitung = 0;


            bauauftraege.forEach(function (auftrag) {

                const status =
                    String(
                        auftrag.status ||
                        ""
                    ).toLowerCase();


                if (
                    status.includes("offen") ||
                    status.includes("neu")
                ) {

                    offen++;

                } else if (
                    status.includes("bearbeitung") ||
                    status.includes("laufend") ||
                    status.includes("aktiv")
                ) {

                    bearbeitung++;
                }

            });


            text(
                ids.auftraegeGesamt,
                gesamt
            );

            text(
                ids.auftraegeOffen,
                offen
            );

            text(
                ids.auftraegeBearbeitung,
                bearbeitung
            );


            /*
             * AUFTRÄGE DARSTELLEN
             */

            container.innerHTML = "";


            bauauftraege.forEach(function (auftrag) {

                const titel =
                    auftrag.title ||
                    auftrag.titel ||
                    auftrag.name ||
                    "Bauauftrag";


                const status =
                    auftrag.status ||
                    "Offen";


                const auftragId =
                    auftrag.order_id ||
                    auftrag.build_order_id ||
                    auftrag.id ||
                    "—";


                const eintrag =
                    document.createElement("div");

                eintrag.className = "auftrag";


                eintrag.innerHTML = `
                    <div class="auftrag-kopf">

                        <div>
                            <div class="auftrag-titel">
                                ${htmlEscapen(titel)}
                            </div>

                            <div class="auftrag-typ">
                                Bauauftrag · Auftrag #${htmlEscapen(auftragId)}
                            </div>
                        </div>

                        <div class="auftrag-status">
                            ${htmlEscapen(status)}
                        </div>

                    </div>

                    <div class="auftrag-info">
                        <span>
                            Zugewiesen
                        </span>
                    </div>
                `;


                container.appendChild(eintrag);
            });


        } catch (fehler) {

            console.error(
                "Fehler beim Laden der Aufträge:",
                fehler
            );

            container.innerHTML = `
                <div class="leer">
                    Die Aufträge konnten momentan nicht geladen werden.
                </div>
            `;
        }
    }


    /*
     * OFFENE VERSTÄRKUNG LADEN
     */

    async function ladeVerstaerkung() {

        const container =
            element(ids.offeneVerstaerkung);

        if (!container) {
            return;
        }


        ladeText(
            ids.offeneVerstaerkung,
            "Verstärkungsanfragen werden geladen..."
        );


        try {

            const {
                data,
                error
            } = await supabase
                .from("employee_help_requests")
                .select("*")
                .eq("status", "Offen")
                .is("helper_id", null)
                .order("created_at", {
                    ascending: false
                });


            if (error) {

                console.error(
                    "Verstärkungsanfragen konnten nicht geladen werden:",
                    error
                );

                container.innerHTML = `
                    <div class="leer">
                        Verstärkungsanfragen konnten nicht geladen werden.
                    </div>
                `;

                return;
            }


            const anfragen = data || [];


            if (anfragen.length === 0) {

                container.innerHTML = `
                    <div class="leer">
                        Aktuell wird keine Verstärkung gesucht.
                    </div>
                `;

                return;
            }


            container.innerHTML = "";


            anfragen.forEach(function (anfrage) {

                const typ =
                    anfrage.order_type ||
                    "Auftrag";


                const auftragId =
                    anfrage.order_id ||
                    "—";


                const kommentar =
                    anfrage.comment ||
                    "Keine weiteren Informationen.";


                const eintrag =
                    document.createElement("div");

                eintrag.className = "verstaerkung";


                eintrag.innerHTML = `
                    <div class="verstaerkung-info">

                        <div class="verstaerkung-titel">
                            Verstärkung gesucht
                        </div>

                        <div class="verstaerkung-details">
                            Auftragstyp:
                            ${htmlEscapen(typ)}
                            <br>
                            Auftrag:
                            #${htmlEscapen(auftragId)}
                            <br>
                            ${htmlEscapen(kommentar)}
                        </div>

                    </div>

                    <button
                        type="button"
                        class="button gold"
                        data-verstaerkung-id="${htmlEscapen(anfrage.id)}">
                        Helfen
                    </button>
                `;


                const helfenButton =
                    eintrag.querySelector("button");


                if (helfenButton) {

                    helfenButton.addEventListener(
                        "click",
                        function () {

                            uebernehmeVerstaerkung(
                                anfrage.id
                            );

                        }
                    );
                }


                container.appendChild(eintrag);
            });


        } catch (fehler) {

            console.error(
                "Fehler beim Laden der Verstärkung:",
                fehler
            );

            container.innerHTML = `
                <div class="leer">
                    Verstärkungsanfragen konnten nicht geladen werden.
                </div>
            `;
        }
    }


    /*
     * VERSTÄRKUNG ÜBERNEHMEN
     */

    async function uebernehmeVerstaerkung(anfrageId) {

        if (!anfrageId || !aktuellerUser) {
            return;
        }


        try {

            const {
                error
            } = await supabase
                .from("employee_help_requests")
                .update({
                    helper_id: aktuellerUser.id
                })
                .eq("id", anfrageId)
                .eq("status", "Offen")
                .is("helper_id", null);


            if (error) {

                console.error(
                    "Verstärkung konnte nicht übernommen werden:",
                    error
                );

                zeigenFehler(
                    "Die Verstärkungsanfrage konnte nicht übernommen werden."
                );

                return;
            }


            versteckenFehler();

            await ladeVerstaerkung();

        } catch (fehler) {

            console.error(
                "Fehler beim Übernehmen der Verstärkung:",
                fehler
            );

            zeigenFehler(
                "Beim Übernehmen der Verstärkung ist ein Fehler aufgetreten."
            );
        }
    }


    /*
     * BENACHRICHTIGUNGEN
     *
     * Für den aktuellen Stand gibt es noch keine eigene
     * Benachrichtigungstabelle im bekannten Datenbankschema.
     * Deshalb wird hier ein sauberer leerer Zustand angezeigt.
     */

    async function ladeBenachrichtigungen() {

        const container =
            element(ids.benachrichtigungen);

        if (!container) {
            return;
        }


        container.innerHTML = `
            <div class="leer">
                Keine neuen Benachrichtigungen.
            </div>
        `;
                     }

     /*
     * LOGOUT
     */

    async function abmelden() {

        if (!supabase) {
            window.location.href = "registrieren.html";
            return;
        }

        const button =
            element(ids.abmeldenButton);

        if (button) {
            button.disabled = true;
            button.textContent = "Abmelden...";
        }

        try {

            const {
                error
            } = await supabase.auth.signOut({
                scope: "local"
            });

            if (error) {

                console.error(
                    "Abmelden fehlgeschlagen:",
                    error
                );

                zeigenFehler(
                    "Das Abmelden ist fehlgeschlagen."
                );

                if (button) {
                    button.disabled = false;
                    button.textContent = "Abmelden";
                }

                return;
            }

            /*
             * Nur die aktuelle Sitzung wird beendet.
             * Danach zurück zur gemeinsamen Login-/Registrierungsseite.
             */

            window.location.href = "registrieren.html";

        } catch (fehler) {

            console.error(
                "Logout-Fehler:",
                fehler
            );

            zeigenFehler(
                "Beim Abmelden ist ein Fehler aufgetreten."
            );

            if (button) {
                button.disabled = false;
                button.textContent = "Abmelden";
            }
        }
    }


    /*
     * AUTH-ÄNDERUNGEN ÜBERWACHEN
     */

    function registriereAuthListener() {

        if (!supabase) {
            return;
        }

        const {
            data
        } = supabase.auth.onAuthStateChange(
            function (event, session) {

                if (event === "SIGNED_OUT") {

                    window.location.href =
                        "registrieren.html";

                    return;
                }

                if (
                    event === "SIGNED_IN" &&
                    session &&
                    session.user
                ) {

                    aktuellerUser =
                        session.user;

                    ladeMitarbeiterbereich();
                }
            }
        );

        /*
         * Die Subscription bleibt aktiv,
         * solange die Seite geöffnet ist.
         */

        window.ehrenmarktAuthSubscription =
            data?.subscription || null;
    }


    /*
     * BUTTONS VERBINDEN
     */

    function registriereEvents() {

        const abmeldenButton =
            element(ids.abmeldenButton);

        const statusButton =
            element(ids.statusButton);

        const verfuegbarButton =
            element(ids.verfuegbarButton);

        const nichtVerfuegbarButton =
            element(ids.nichtVerfuegbarButton);


        /*
         * ABMELDEN
         */

        if (abmeldenButton) {

            abmeldenButton.addEventListener(
                "click",
                abmelden
            );
        }


        /*
         * AKTIV / INAKTIV
         */

        if (statusButton) {

            statusButton.addEventListener(
                "click",
                statusAendern
            );
        }


        /*
         * VERFÜGBAR
         */

        if (verfuegbarButton) {

            verfuegbarButton.addEventListener(
                "click",
                function () {

                    setzeVerfuegbarkeit(true);

                }
            );
        }


        /*
         * NICHT VERFÜGBAR
         */

        if (nichtVerfuegbarButton) {

            nichtVerfuegbarButton.addEventListener(
                "click",
                function () {

                    setzeVerfuegbarkeit(false);

                }
            );
        }
    }


    /*
     * AUTOMATISCHE AKTUALISIERUNG
     */

    let aktualisierungsTimer = null;


    function starteAutomatischeAktualisierung() {

        if (aktualisierungsTimer) {
            clearInterval(
                aktualisierungsTimer
            );
        }


        /*
         * Alle 60 Sekunden aktualisieren.
         */

        aktualisierungsTimer =
            setInterval(
                async function () {

                    if (!aktuellerUser) {
                        return;
                    }

                    try {

                        await Promise.allSettled([
                            ladeMitarbeiter(),
                            ladeAuftraege(),
                            ladeVerstaerkung(),
                            ladeBenachrichtigungen()
                        ]);

                        aktualisiereAnsicht();

                    } catch (fehler) {

                        console.warn(
                            "Automatische Aktualisierung fehlgeschlagen:",
                            fehler
                        );
                    }

                },
                60000
            );
    }


    /*
     * SEITE VERLASSEN
     */

    window.addEventListener(
        "beforeunload",
        function () {

            if (aktualisierungsTimer) {

                clearInterval(
                    aktualisierungsTimer
                );

                aktualisierungsTimer = null;
            }


            if (
                window.ehrenmarktAuthSubscription &&
                typeof window.ehrenmarktAuthSubscription.unsubscribe ===
                    "function"
            ) {

                window.ehrenmarktAuthSubscription.unsubscribe();

                window.ehrenmarktAuthSubscription = null;
            }
        }
    );


    /*
     * START
     */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            registriereEvents();

            supabase =
                holeSupabaseClient();

            if (!supabase) {

                zeigenFehler(
                    "Die Supabase-Verbindung konnte nicht geladen werden."
                );

                return;
            }


            registriereAuthListener();

            initialisieren();

            starteAutomatischeAktualisierung();
        }
    );


    /*
     * OPTIONALE GLOBALE FUNKTIONEN
     *
     * Können später von anderen Ehrenmarkt-Seiten
     * verwendet werden.
     */

    window.ehrenmarktMitarbeiterbereich = {
        aktualisieren: ladeMitarbeiterbereich,
        abmelden: abmelden
    };

})();
