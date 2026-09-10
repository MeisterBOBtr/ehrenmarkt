// ============================================================
// EHRENMARKT – MITARBEITERBEREICH
// Teil 1/4 – Anmeldung & Zugriffskontrolle
// ============================================================

const supabaseClient = window.supabaseClient;

// Erlaubte Ränge für den Mitarbeiterbereich
const ERLAUBTE_MITARBEITER_RAEGE = [
    "Mitarbeiter",
    "Leitung",
    "Stadtleitung"
];

let aktuellerUser = null;
let aktuellesProfil = null;
let aktuellerMitarbeiter = null;


// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function element(id) {
    return document.getElementById(id);
}


function setText(id, text) {
    const el = element(id);

    if (el) {
        el.textContent = text ?? "";
    }
}


function anzeigen(id) {
    const el = element(id);

    if (el) {
        el.style.display = "";
    }
}


function verstecken(id) {
    const el = element(id);

    if (el) {
        el.style.display = "none";
    }
}


function zeigeFehler(text) {
    const fehler = element("fehler");

    if (!fehler) {
        return;
    }

    fehler.textContent = text;
    fehler.style.display = "block";
}


function versteckeFehler() {
    const fehler = element("fehler");

    if (fehler) {
        fehler.style.display = "none";
        fehler.textContent = "";
    }
}


// ============================================================
// GASTBEREICH / KEIN ZUGRIFF
// ============================================================

function zeigeGastbereich(text = "Du bist aktuell nicht angemeldet.") {

    const gastBereich = element("gastBereich");
    const mitarbeiterBereich = element("mitarbeiterBereich");
    const abmeldenButton = element("abmeldenButton");

    if (mitarbeiterBereich) {
        mitarbeiterBereich.style.display = "none";
    }

    if (gastBereich) {
        gastBereich.style.display = "block";

        const paragraph = gastBereich.querySelector("p");

        if (paragraph) {
            paragraph.textContent = text;
        }
    }

    if (abmeldenButton) {
        abmeldenButton.style.display = "none";
    }
}


// ============================================================
// ZUGRIFF VERWEIGERT
// ============================================================

function zeigeKeinZugriff() {

    const gastBereich = element("gastBereich");
    const mitarbeiterBereich = element("mitarbeiterBereich");
    const abmeldenButton = element("abmeldenButton");

    if (mitarbeiterBereich) {
        mitarbeiterBereich.style.display = "none";
    }

    if (gastBereich) {
        gastBereich.style.display = "block";

        gastBereich.innerHTML = `
            <h2>Kein Zugriff</h2>

            <p>
                Dein Rang besitzt keinen Zugriff auf den Mitarbeiterbereich.
            </p>

            <p>
                Zugriff haben nur Mitarbeiter, Leitung und Stadtleitung.
            </p>

            <a href="kundenbereich.html" class="button">
                Zum Kundenbereich
            </a>
        `;
    }

    if (abmeldenButton) {
        abmeldenButton.style.display = "none";
    }
}


// ============================================================
// MITARBEITERBEREICH ANZEIGEN
// ============================================================

function zeigeMitarbeiterbereich() {

    const gastBereich = element("gastBereich");
    const mitarbeiterBereich = element("mitarbeiterBereich");
    const abmeldenButton = element("abmeldenButton");

    if (gastBereich) {
        gastBereich.style.display = "none";
    }

    if (mitarbeiterBereich) {
        mitarbeiterBereich.style.display = "block";
    }

    if (abmeldenButton) {
        abmeldenButton.style.display = "";
    }
}


// ============================================================
// PROFIL LADEN UND RANG PRÜFEN
// ============================================================

async function pruefeMitarbeiterZugriff(user) {

    if (!user) {
        zeigeGastbereich();
        return false;
    }

    aktuellerUser = user;

    const { data: profil, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {

        console.error("Profil konnte nicht geladen werden:", error);

        zeigeFehler(
            "Dein Profil konnte nicht geladen werden."
        );

        zeigeGastbereich(
            "Dein Profil konnte nicht geladen werden."
        );

        return false;
    }

    if (!profil) {

        zeigeFehler(
            "Für dein Konto wurde kein Profil gefunden."
        );

        zeigeGastbereich(
            "Für dein Konto wurde kein Profil gefunden."
        );

        return false;
    }

    aktuellesProfil = profil;

    const rang = String(profil.rang || "").trim();

    console.log("Angemeldeter Rang:", rang);

    // --------------------------------------------------------
    // WICHTIG:
    // Nur diese drei Ränge dürfen hinein.
    // --------------------------------------------------------

    if (!ERLAUBTE_MITARBEITER_RAEGE.includes(rang)) {

        console.log(
            "Zugriff verweigert. Rang:",
            rang
        );

        versteckeFehler();
        zeigeKeinZugriff();

        return false;
    }

    // Rang ist erlaubt
    versteckeFehler();
    zeigeMitarbeiterbereich();

    // Mitarbeiterdaten erst jetzt laden
    await ladeMitarbeiterbereich(user, profil);

    return true;
}


// ============================================================
// INITIALISIERUNG
// ============================================================

async function initialisieren() {

    versteckeFehler();

    const ladebereich = element("ladebereich");

    if (ladebereich) {
        ladebereich.style.display = "block";
    }

    if (!supabaseClient) {

        zeigeFehler(
            "Die Verbindung zu Ehrenmarkt konnte nicht hergestellt werden."
        );

        if (ladebereich) {
            ladebereich.style.display = "none";
        }

        return;
    }

    try {

        const sessionPromise =
            supabaseClient.auth.getSession();

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(
                    new Error(
                        "Zeitüberschreitung beim Laden der Anmeldung."
                    )
                );
            }, 10000);
        });

        const result = await Promise.race([
            sessionPromise,
            timeoutPromise
        ]);

        const session = result?.data?.session;

        if (!session || !session.user) {

            if (ladebereich) {
                ladebereich.style.display = "none";
            }

            zeigeGastbereich();

            return;
        }

        await pruefeMitarbeiterZugriff(session.user);

    } catch (error) {

        console.error(
            "Fehler bei der Initialisierung:",
            error
        );

        zeigeFehler(
            "Der Mitarbeiterbereich konnte nicht geladen werden."
        );

        zeigeGastbereich(
            "Die Anmeldung konnte nicht überprüft werden."
        );

    } finally {

        if (ladebereich) {
            ladebereich.style.display = "none";
        }
    }
}


// ============================================================
// ABMELDEN
// ============================================================

async function abmelden() {

    try {

        const { error } =
            await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        window.location.href = "registrieren.html";

    } catch (error) {

        console.error(
            "Fehler beim Abmelden:",
            error
        );

        zeigeFehler(
            "Du konntest nicht abgemeldet werden."
        );
    }
}


// ============================================================
// AUTH-ÄNDERUNGEN
// ============================================================

function registriereAuthListener() {

    supabaseClient.auth.onAuthStateChange(
        async (event, session) => {

            console.log(
                "Auth-Änderung:",
                event
            );

            if (event === "SIGNED_OUT") {

                aktuellerUser = null;
                aktuellesProfil = null;
                aktuellerMitarbeiter = null;

                zeigeGastbereich();

                return;
            }

            if (
                event === "SIGNED_IN" &&
                session?.user
            ) {

                await pruefeMitarbeiterZugriff(
                    session.user
                );
            }
        }
    );
}


// ============================================================
// BUTTON VERBINDEN
// ============================================================

function verbindeAbmeldenButton() {

    const button = element("abmeldenButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        abmelden
    );
}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        verbindeAbmeldenButton();

        registriereAuthListener();

        await initialisieren();
    }
);

// ============================================================
// MITARBEITERBEREICH LADEN
// Teil 2/4 – Profil & Mitarbeiterdaten
// ============================================================

async function ladeMitarbeiterbereich(user, profil) {

    // --------------------------------------------------------
    // Profil anzeigen
    // --------------------------------------------------------

    const username =
        profil.username ||
        user.user_metadata?.username ||
        "Unbekannt";

    const minecraftName =
        profil.minecraft_name ||
        profil.minecraft ||
        user.user_metadata?.minecraft_name ||
        "Nicht hinterlegt";

    const email =
        user.email ||
        profil.email ||
        "Keine E-Mail";

    const rang =
        profil.rang ||
        "Mitarbeiter";

    const rolle =
        profil.rolle ||
        "Keine Rolle hinterlegt";


    // --------------------------------------------------------
    // Begrüßung
    // --------------------------------------------------------

    setText(
        "mitarbeiterBegruessung",
        `Willkommen zurück, ${username}!`
    );


    // --------------------------------------------------------
    // Profilfelder
    // --------------------------------------------------------

    setText(
        "mitarbeiterUsername",
        username
    );

    setText(
        "mitarbeiterMinecraft",
        minecraftName
    );

    setText(
        "mitarbeiterEmail",
        email
    );

    setText(
        "mitarbeiterRang",
        rang
    );

    setText(
        "mitarbeiterRolle",
        rolle
    );


    // --------------------------------------------------------
    // Mitarbeiter-Datensatz aus employees laden
    // --------------------------------------------------------

    try {

        const {
            data: mitarbeiter,
            error
        } = await supabaseClient
            .from("employees")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();


        if (error) {

            console.error(
                "Mitarbeiterdaten konnten nicht geladen werden:",
                error
            );

            // Der Rang ist bereits autorisiert.
            // Deshalb wird der komplette Bereich nicht gesperrt.
            aktuellerMitarbeiter = null;

        } else {

            aktuellerMitarbeiter = mitarbeiter;
        }

    } catch (error) {

        console.error(
            "Fehler beim Laden des Mitarbeiter-Datensatzes:",
            error
        );

        aktuellerMitarbeiter = null;
    }


    // --------------------------------------------------------
    // Mitarbeiterdaten verarbeiten
    // --------------------------------------------------------

    if (aktuellerMitarbeiter) {

        aktualisiereMitarbeiterAnzeige(
            aktuellerMitarbeiter
        );

    } else {

        // Falls noch kein employees-Datensatz existiert
        setText(
            "statusText",
            "Mitarbeiterdaten nicht vollständig hinterlegt"
        );

        setText(
            "arbeitszeitAnzeige",
            "0 Std. 0 Min."
        );
    }


    // --------------------------------------------------------
    // Weitere Bereiche laden
    // --------------------------------------------------------

    await Promise.allSettled([
        ladeEigeneAuftraege(user),
        ladeOffeneVerstaerkung(),
        ladeBenachrichtigungen()
    ]);
}


// ============================================================
// MITARBEITER-ANZEIGE AKTUALISIEREN
// ============================================================

function aktualisiereMitarbeiterAnzeige(mitarbeiter) {

    // --------------------------------------------------------
    // Aktiv / Inaktiv
    // --------------------------------------------------------

    const aktiv =
        mitarbeiter.is_active === true;

    const statusPunkt =
        element("statusPunkt");

    const statusText =
        element("statusText");

    if (statusPunkt) {

        statusPunkt.style.display = "inline-block";

        if (aktiv) {
            statusPunkt.textContent = "●";
            statusPunkt.title = "Aktiv";
        } else {
            statusPunkt.textContent = "●";
            statusPunkt.title = "Inaktiv";
        }
    }

    if (statusText) {

        statusText.textContent =
            aktiv
                ? "Aktiv"
                : "Inaktiv";
    }


    // --------------------------------------------------------
    // Status-Button
    // --------------------------------------------------------

    const statusButton =
        element("statusButton");

    if (statusButton) {

        statusButton.textContent =
            aktiv
                ? "Auf Inaktiv setzen"
                : "Auf Aktiv setzen";

        statusButton.disabled = false;
    }


    // --------------------------------------------------------
    // Verfügbarkeit
    // --------------------------------------------------------

    const verfuegbar =
        mitarbeiter.is_available === true;

    const verfuegbarButton =
        element("verfuegbarButton");

    const nichtVerfuegbarButton =
        element("nichtVerfuegbarButton");


    if (verfuegbarButton) {
        verfuegbarButton.disabled =
            verfuegbar;
    }

    if (nichtVerfuegbarButton) {
        nichtVerfuegbarButton.disabled =
            !verfuegbar;
    }


    // --------------------------------------------------------
    // Arbeitszeit
    // --------------------------------------------------------

    const minuten =
        Number(
            mitarbeiter.total_work_minutes || 0
        );

    setText(
        "arbeitszeitAnzeige",
        formatiereArbeitszeit(minuten)
    );
}


// ============================================================
// ARBEITSZEIT FORMATIEREN
// ============================================================

function formatiereArbeitszeit(minuten) {

    minuten = Number(minuten);

    if (!Number.isFinite(minuten) || minuten < 0) {
        minuten = 0;
    }

    minuten = Math.floor(minuten);

    const stunden =
        Math.floor(minuten / 60);

    const restMinuten =
        minuten % 60;

    return `${stunden} Std. ${restMinuten} Min.`;
}


// ============================================================
// STATUS-ANZEIGE AKTUALISIEREN
// ============================================================

function aktualisiereStatusAnzeige() {

    if (!aktuellerMitarbeiter) {
        return;
    }

    aktualisiereMitarbeiterAnzeige(
        aktuellerMitarbeiter
    );
}


// ============================================================
// EIGENE AUFTRÄGE
// ============================================================

async function ladeEigeneAuftraege(user) {

    const container =
        element("meineAuftraege");

    if (!container) {
        return;
    }

    container.innerHTML =
        "<p>Aufträge werden geladen...</p>";


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("build_order_workers")
            .select("*")
            .eq("employee_id", user.id);


        if (error) {

            console.error(
                "Eigene Aufträge konnten nicht geladen werden:",
                error
            );

            container.innerHTML =
                "<p>Aktuell konnten keine Aufträge geladen werden.</p>";

            setText(
                "auftraegeGesamt",
                "0"
            );

            setText(
                "auftraegeOffen",
                "0"
            );

            setText(
                "auftraegeBearbeitung",
                "0"
            );

            setText(
                "auftraegeAbgeschlossen",
                "0"
            );

            return;
        }


        const auftraege =
            Array.isArray(data)
                ? data
                : [];


        // ----------------------------------------------------
        // Zähler
        // ----------------------------------------------------

        setText(
            "auftraegeGesamt",
            auftraege.length
        );


        const offen =
            auftraege.filter(
                auftrag =>
                    normalisiereStatus(
                        auftrag.status
                    ) === "offen"
            ).length;


        const bearbeitung =
            auftraege.filter(
                auftrag =>
                    [
                        "in bearbeitung",
                        "bearbeitung",
                        "laufend",
                        "aktiv"
                    ].includes(
                        normalisiereStatus(
                            auftrag.status
                        )
                    )
            ).length;


        const abgeschlossen =
            auftraege.filter(
                auftrag =>
                    [
                        "abgeschlossen",
                        "fertig",
                        "erledigt"
                    ].includes(
                        normalisiereStatus(
                            auftrag.status
                        )
                    )
            ).length;


        setText(
            "auftraegeOffen",
            offen
        );

        setText(
            "auftraegeBearbeitung",
            bearbeitung
        );

        setText(
            "auftraegeAbgeschlossen",
            abgeschlossen
        );


        // ----------------------------------------------------
        // Aufträge anzeigen
        // ----------------------------------------------------

        if (auftraege.length === 0) {

            container.innerHTML =
                "<p>Du hast aktuell keine zugewiesenen Aufträge.</p>";

            return;
        }


        container.innerHTML =
            auftraege
                .slice(0, 10)
                .map(
                    (auftrag, index) =>
                        erstelleAuftragsElement(
                            auftrag,
                            index
                        )
                )
                .join("");


    } catch (error) {

        console.error(
            "Fehler beim Laden der eigenen Aufträge:",
            error
        );

        container.innerHTML =
            "<p>Beim Laden der Aufträge ist ein Fehler aufgetreten.</p>";
    }
}


// ============================================================
// STATUS NORMALISIEREN
// ============================================================

function normalisiereStatus(status) {

    return String(
        status || ""
    )
        .trim()
        .toLowerCase();
}


// ============================================================
// EINEN AUFTRAG DARSTELLEN
// ============================================================

function erstelleAuftragsElement(auftrag, index) {

    const status =
        auftrag.status ||
        "Offen";

    const orderId =
        auftrag.order_id ||
        auftrag.build_order_id ||
        auftrag.id ||
        (index + 1);


    return `
        <div class="karte"
             style="margin-bottom:10px; padding:14px;">

            <strong>
                Auftrag #${escapeHtml(orderId)}
            </strong>

            <p style="margin:8px 0 0;">
                Status:
                <strong>
                    ${escapeHtml(status)}
                </strong>
            </p>

        </div>
    `;
}


// ============================================================
// HTML SICHER AUSGEBEN
// ============================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// EHRENMARKT – MITARBEITERBEREICH
// Teil 3/4 – Status & Verfügbarkeit
// ============================================================


// ============================================================
// STATUS AKTIV / INAKTIV UMSCHALTEN
// ============================================================

async function statusUmschalten() {

    if (!aktuellerUser) {
        return;
    }

    if (!aktuellerMitarbeiter) {

        zeigeFehler(
            "Für dein Konto wurden keine Mitarbeiterdaten gefunden."
        );

        return;
    }


    const button =
        element("statusButton");


    if (button) {
        button.disabled = true;
        button.textContent = "Wird gespeichert...";
    }


    try {

        const neuerStatus =
            !(
                aktuellerMitarbeiter.is_active === true
            );


        const updateDaten = {
            is_active: neuerStatus
        };


        // ----------------------------------------------------
        // Wenn Mitarbeiter auf INAKTIV gesetzt wird,
        // wird er gleichzeitig als nicht verfügbar gesetzt.
        // ----------------------------------------------------

        if (!neuerStatus) {
            updateDaten.is_available = false;
        }


        const {
            data,
            error
        } = await supabaseClient
            .from("employees")
            .update(updateDaten)
            .eq("user_id", aktuellerUser.id)
            .select("*")
            .maybeSingle();


        if (error) {
            throw error;
        }


        if (data) {
            aktuellerMitarbeiter = data;
        } else {

            // Falls Supabase wegen RLS keine Zeile zurückgibt,
            // Anzeige trotzdem nicht einfach falsch ändern.
            throw new Error(
                "Die Mitarbeiterdaten konnten nicht aktualisiert werden."
            );
        }


        aktualisiereMitarbeiterAnzeige(
            aktuellerMitarbeiter
        );


    } catch (error) {

        console.error(
            "Fehler beim Ändern des Mitarbeiterstatus:",
            error
        );

        zeigeFehler(
            "Der Mitarbeiterstatus konnte nicht geändert werden."
        );


        if (button) {
            button.disabled = false;

            button.textContent =
                aktuellerMitarbeiter.is_active === true
                    ? "Auf Inaktiv setzen"
                    : "Auf Aktiv setzen";
        }
    }
}


// ============================================================
// VERFÜGBAR SETZEN
// ============================================================

async function aufVerfuegbarSetzen() {

    if (!aktuellerUser) {
        return;
    }

    if (!aktuellerMitarbeiter) {

        zeigeFehler(
            "Für dein Konto wurden keine Mitarbeiterdaten gefunden."
        );

        return;
    }


    // Inaktiv kann nicht verfügbar sein
    if (
        aktuellerMitarbeiter.is_active !== true
    ) {

        zeigeFehler(
            "Du musst zuerst deinen Mitarbeiterstatus auf Aktiv setzen."
        );

        return;
    }


    const button =
        element("verfuegbarButton");


    if (button) {
        button.disabled = true;
        button.textContent = "Wird gespeichert...";
    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("employees")
            .update({
                is_available: true
            })
            .eq("user_id", aktuellerUser.id)
            .select("*")
            .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {
            throw new Error(
                "Die Verfügbarkeit konnte nicht gespeichert werden."
            );
        }


        aktuellerMitarbeiter = data;

        aktualisiereVerfuegbarkeitsAnzeige();


    } catch (error) {

        console.error(
            "Fehler beim Setzen der Verfügbarkeit:",
            error
        );

        zeigeFehler(
            "Die Verfügbarkeit konnte nicht geändert werden."
        );

        aktualisiereVerfuegbarkeitsAnzeige();
    }
}


// ============================================================
// NICHT VERFÜGBAR SETZEN
// ============================================================

async function aufNichtVerfuegbarSetzen() {

    if (!aktuellerUser) {
        return;
    }

    if (!aktuellerMitarbeiter) {

        zeigeFehler(
            "Für dein Konto wurden keine Mitarbeiterdaten gefunden."
        );

        return;
    }


    const button =
        element("nichtVerfuegbarButton");


    if (button) {
        button.disabled = true;
        button.textContent = "Wird gespeichert...";
    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("employees")
            .update({
                is_available: false
            })
            .eq("user_id", aktuellerUser.id)
            .select("*")
            .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {
            throw new Error(
                "Die Verfügbarkeit konnte nicht gespeichert werden."
            );
        }


        aktuellerMitarbeiter = data;

        aktualisiereVerfuegbarkeitsAnzeige();


    } catch (error) {

        console.error(
            "Fehler beim Entfernen der Verfügbarkeit:",
            error
        );

        zeigeFehler(
            "Die Verfügbarkeit konnte nicht geändert werden."
        );

        aktualisiereVerfuegbarkeitsAnzeige();
    }
}


// ============================================================
// VERFÜGBARKEIT ANZEIGEN
// ============================================================

function aktualisiereVerfuegbarkeitsAnzeige() {

    if (!aktuellerMitarbeiter) {
        return;
    }


    const verfuegbar =
        aktuellerMitarbeiter.is_available === true;

    const aktiv =
        aktuellerMitarbeiter.is_active === true;


    const verfuegbarButton =
        element("verfuegbarButton");

    const nichtVerfuegbarButton =
        element("nichtVerfuegbarButton");


    if (verfuegbarButton) {

        verfuegbarButton.disabled =
            verfuegbar || !aktiv;

        verfuegbarButton.textContent =
            verfuegbar
                ? "✓ Verfügbar"
                : "Verfügbar";
    }


    if (nichtVerfuegbarButton) {

        nichtVerfuegbarButton.disabled =
            !verfuegbar;

        nichtVerfuegbarButton.textContent =
            "Nicht verfügbar";
    }
}


// ============================================================
// BUTTONS VERBINDEN
// ============================================================

function verbindeMitarbeiterButtons() {

    const statusButton =
        element("statusButton");

    const verfuegbarButton =
        element("verfuegbarButton");

    const nichtVerfuegbarButton =
        element("nichtVerfuegbarButton");


    // --------------------------------------------------------
    // Aktiv / Inaktiv
    // --------------------------------------------------------

    if (statusButton) {

        statusButton.addEventListener(
            "click",
            statusUmschalten
        );
    }


    // --------------------------------------------------------
    // Verfügbar
    // --------------------------------------------------------

    if (verfuegbarButton) {

        verfuegbarButton.addEventListener(
            "click",
            aufVerfuegbarSetzen
        );
    }


    // --------------------------------------------------------
    // Nicht verfügbar
    // --------------------------------------------------------

    if (nichtVerfuegbarButton) {

        nichtVerfuegbarButton.addEventListener(
            "click",
            aufNichtVerfuegbarSetzen
        );
    }
}


// ============================================================
// BUTTONS NACH DOM-LADEN VERBINDEN
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        verbindeMitarbeiterButtons();

    }
);

// ============================================================
// EHRENMARKT – MITARBEITERBEREICH
// Teil 4/4 – Verstärkung, Benachrichtigungen & Aktualisierung
// ============================================================


// ============================================================
// OFFENE VERSTÄRKUNG LADEN
// ============================================================

async function ladeOffeneVerstaerkung() {

    const container =
        element("offeneVerstaerkung");

    if (!container) {
        return;
    }

    container.innerHTML =
        "<p>Verstärkungsanfragen werden geladen...</p>";


    if (!aktuellerUser) {

        container.innerHTML =
            "<p>Keine Anmeldung vorhanden.</p>";

        return;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("employee_help_requests")
            .select("*")
            .eq("status", "Offen")
            .is("helper_id", null)
            .neq("employee_id", aktuellerUser.id)
            .order("created_at", {
                ascending: false
            });


        if (error) {

            console.error(
                "Verstärkungsanfragen konnten nicht geladen werden:",
                error
            );

            container.innerHTML =
                "<p>Aktuell konnten keine Verstärkungsanfragen geladen werden.</p>";

            return;
        }


        const anfragen =
            Array.isArray(data)
                ? data
                : [];


        if (anfragen.length === 0) {

            container.innerHTML = `
                <p>
                    Aktuell wird keine Verstärkung gesucht.
                </p>
            `;

            return;
        }


        container.innerHTML =
            anfragen
                .slice(0, 10)
                .map(
                    anfrage =>
                        erstelleVerstaerkungsElement(
                            anfrage
                        )
                )
                .join("");


        // Buttons nach dem Erstellen verbinden
        container
            .querySelectorAll(
                "[data-verstaerkung-id]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.verstaerkungId;

                        uebernehmeVerstaerkung(
                            id,
                            button
                        );
                    }
                );
            });


    } catch (error) {

        console.error(
            "Fehler bei den Verstärkungsanfragen:",
            error
        );

        container.innerHTML =
            "<p>Beim Laden der Verstärkungsanfragen ist ein Fehler aufgetreten.</p>";
    }
}


// ============================================================
// VERSTÄRKUNGS-ELEMENT ERSTELLEN
// ============================================================

function erstelleVerstaerkungsElement(anfrage) {

    const id =
        anfrage.id;

    const auftragstyp =
        anfrage.order_type ||
        "Auftrag";

    const auftragsId =
        anfrage.order_id ||
        "Nicht angegeben";

    const kommentar =
        anfrage.comment ||
        "Keine zusätzlichen Informationen.";

    const belohnung =
        Number(
            anfrage.reward_share || 0
        );


    let belohnungsText =
        "Keine Vergütung angegeben.";

    if (
        Number.isFinite(belohnung) &&
        belohnung > 0
    ) {

        belohnungsText =
            `Vergütungsanteil: ${belohnung}%`;
    }


    return `
        <div class="karte"
             style="margin-bottom:10px; padding:14px;">

            <h3 style="margin-top:0;">
                Verstärkung gesucht
            </h3>

            <p>
                <strong>Auftrag:</strong>
                ${escapeHtml(auftragstyp)}
            </p>

            <p>
                <strong>Auftrags-ID:</strong>
                ${escapeHtml(auftragsId)}
            </p>

            <p>
                <strong>Information:</strong>
                ${escapeHtml(kommentar)}
            </p>

            <p>
                <strong>${escapeHtml(belohnungsText)}</strong>
            </p>

            <button
                type="button"
                class="button"
                data-verstaerkung-id="${escapeHtml(id)}">
                Ich helfe
            </button>

        </div>
    `;
}


// ============================================================
// VERSTÄRKUNGSANFRAGE ÜBERNEHMEN
// ============================================================

async function uebernehmeVerstaerkung(
    anfrageId,
    button
) {

    if (!aktuellerUser) {
        return;
    }


    if (button) {

        button.disabled = true;
        button.textContent =
            "Wird übernommen...";
    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("employee_help_requests")
            .update({
                helper_id: aktuellerUser.id,
                status: "Angenommen"
            })
            .eq("id", anfrageId)
            .eq("status", "Offen")
            .is("helper_id", null)
            .select("*")
            .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {

            throw new Error(
                "Die Verstärkungsanfrage wurde bereits übernommen oder ist nicht mehr verfügbar."
            );
        }


        await ladeOffeneVerstaerkung();


        // Eigene Aufträge ebenfalls aktualisieren
        await ladeEigeneAuftraege(
            aktuellerUser
        );


    } catch (error) {

        console.error(
            "Fehler beim Übernehmen der Verstärkung:",
            error
        );

        zeigeFehler(
            "Die Verstärkungsanfrage konnte nicht übernommen werden."
        );


        if (button) {

            button.disabled = false;
            button.textContent =
                "Ich helfe";
        }
    }
}


// ============================================================
// BENACHRICHTIGUNGEN
// ============================================================

async function ladeBenachrichtigungen() {

    const container =
        element("benachrichtigungen");

    if (!container) {
        return;
    }


    // --------------------------------------------------------
    // Im aktuellen Datenmodell ist noch keine eigene
    // Benachrichtigungstabelle vorhanden.
    // Deshalb keine erfundenen Nachrichten anzeigen.
    // --------------------------------------------------------

    container.innerHTML = `
        <p>
            Aktuell liegen keine neuen Benachrichtigungen vor.
        </p>
    `;
}


// ============================================================
// GESAMTEN MITARBEITERBEREICH AKTUALISIEREN
// ============================================================

async function aktualisiereMitarbeiterbereich() {

    if (!aktuellerUser) {
        return;
    }


    try {

        await Promise.allSettled([
            ladeEigeneAuftraege(
                aktuellerUser
            ),

            ladeOffeneVerstaerkung(),

            ladeBenachrichtigungen()
        ]);


        // Mitarbeiterdaten erneut laden
        const {
            data,
            error
        } = await supabaseClient
            .from("employees")
            .select("*")
            .eq("user_id", aktuellerUser.id)
            .maybeSingle();


        if (!error && data) {

            aktuellerMitarbeiter = data;

            aktualisiereMitarbeiterAnzeige(
                data
            );

            aktualisiereVerfuegbarkeitsAnzeige();
        }


    } catch (error) {

        console.error(
            "Fehler beim Aktualisieren:",
            error
        );
    }
}


// ============================================================
// ÖFFENTLICHE AKTUALISIERUNGSFUNKTION
// ============================================================

window.ehrenmarktMitarbeiterAktualisieren =
    aktualisiereMitarbeiterbereich;


// ============================================================
// ÖFFENTLICHE ABMELDEFUNKTION
// ============================================================

window.ehrenmarktMitarbeiterAbmelden =
    abmelden;


// ============================================================
// AUTOMATISCHE AKTUALISIERUNG
// ============================================================

// Alle 60 Sekunden neue Auftrags- und
// Verstärkungsinformationen laden.

let mitarbeiterAktualisierungsTimer = null;


function starteAutomatischeAktualisierung() {

    if (mitarbeiterAktualisierungsTimer) {

        clearInterval(
            mitarbeiterAktualisierungsTimer
        );
    }


    mitarbeiterAktualisierungsTimer =
        setInterval(
            () => {

                if (aktuellerUser) {

                    aktualisiereMitarbeiterbereich();
                }

            },
            60000
        );
}


// ============================================================
// AUTOMATISCHE AKTUALISIERUNG STARTEN
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        starteAutomatischeAktualisierung();

    }
);
