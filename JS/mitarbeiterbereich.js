
// ============================================================
// EHRENMARKT – MITARBEITERBEREICH
// Teil 1/4 – Anmeldung & Zugriffskontrolle
// ============================================================

"use strict";


// ============================================================
// SUPABASE
// ============================================================

let mitarbeiterSupabase = null;


// ============================================================
// GLOBALE VARIABLEN
// ============================================================

let aktuellerUser = null;
let aktuellesProfil = null;
let aktuellerMitarbeiter = null;


// ============================================================
// ERLAUBTE RÄNGE
// ============================================================

const ERLAUBTE_MITARBEITER_RAEGE = [
    "Mitarbeiter",
    "Leitung",
    "Stadtleitung"
];


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
// GASTBEREICH
// ============================================================

function zeigeGastbereich(
    text = "Du bist aktuell nicht angemeldet."
) {

    const gastBereich =
        element("gastBereich");

    const mitarbeiterBereich =
        element("mitarbeiterBereich");

    const abmeldenButton =
        element("abmeldenButton");


    if (mitarbeiterBereich) {
        mitarbeiterBereich.style.display = "none";
    }


    if (gastBereich) {

        gastBereich.style.display = "block";

        const paragraph =
            gastBereich.querySelector("p");

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

    const gastBereich =
        element("gastBereich");

    const mitarbeiterBereich =
        element("mitarbeiterBereich");

    const abmeldenButton =
        element("abmeldenButton");


    if (mitarbeiterBereich) {
        mitarbeiterBereich.style.display = "none";
    }


    if (gastBereich) {

        gastBereich.style.display = "block";

        gastBereich.innerHTML = `
            <h2>Kein Zugriff</h2>

            <p>
                Dein Rang besitzt keinen Zugriff
                auf den Mitarbeiterbereich.
            </p>

            <p>
                Zugriff haben nur Mitarbeiter,
                Leitung und Stadtleitung.
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

    const gastBereich =
        element("gastBereich");

    const mitarbeiterBereich =
        element("mitarbeiterBereich");

    const abmeldenButton =
        element("abmeldenButton");


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
// MITARBEITERZUGRIFF PRÜFEN
// ============================================================

async function pruefeMitarbeiterZugriff(user) {

    if (!user) {

        zeigeGastbereich();

        return false;
    }


    aktuellerUser = user;


    const {
        data: profil,
        error
    } = await mitarbeiterSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();


    if (error) {

        console.error(
            "Profil konnte nicht geladen werden:",
            error
        );

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


    const rang =
        String(
            profil.rang || ""
        ).trim();


    console.log(
        "Angemeldeter Rang:",
        rang
    );


    if (
        !ERLAUBTE_MITARBEITER_RAEGE
            .includes(rang)
    ) {

        console.log(
            "Zugriff verweigert. Rang:",
            rang
        );

        versteckeFehler();

        zeigeKeinZugriff();

        return false;
    }


    versteckeFehler();

    zeigeMitarbeiterbereich();


    await ladeMitarbeiterbereich(
        user,
        profil
    );


    return true;
}


// ============================================================
// ANMELDUNG / SESSION PRÜFEN
// ============================================================

async function pruefeAnmeldung() {

    try {

        const {
            data,
            error
        } =
            await mitarbeiterSupabase
                .auth
                .getSession();


        if (error) {
            throw error;
        }


        const session =
            data?.session;


        // --------------------------------------------------------
        // NICHT ANGEMELDET
        // --------------------------------------------------------

        if (!session?.user) {

            aktuellerUser = null;
            aktuellesProfil = null;

            zeigeGastbereich();

            return;
        }


        // --------------------------------------------------------
        // ANGEMELDET
        // --------------------------------------------------------

        aktuellerUser =
            session.user;


        await pruefeMitarbeiterZugriff(
            session.user
        );

    } catch (fehler) {

        console.error(
            "Fehler beim Prüfen der Anmeldung:",
            fehler
        );

        zeigeFehler(
            "Der Mitarbeiterbereich konnte nicht geladen werden."
        );
    }
}


// ============================================================
// SEITE STARTEN
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        mitarbeiterSupabase =
            window.supabaseClient;


        if (!mitarbeiterSupabase) {

            zeigeFehler(
                "Die Verbindung zu Ehrenmarkt konnte nicht hergestellt werden."
            );

            return;
        }


        await pruefeAnmeldung();

    }
);


// ============================================================
// ABMELDEN
// ============================================================

async function abmelden() {

    try {

        const {
            error
        } =
            await mitarbeiterSupabase
                .auth
                .signOut();


        if (error) {
            throw error;
        }


        window.location.href =
            "registrieren.html";


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

    if (!mitarbeiterSupabase) {

        console.error(
            "Ehrenmarkt: Supabase-Client nicht verfügbar."
        );

        return;
    }


    mitarbeiterSupabase
        .auth
        .onAuthStateChange(
            async (
                event,
                session
            ) => {

                console.log(
                    "Auth-Änderung:",
                    event
                );


                if (
                    event === "SIGNED_OUT"
                ) {

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
// ABMELDE-BUTTON VERBINDEN
// ============================================================

function verbindeAbmeldenButton() {

    const button =
        element("abmeldenButton");


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

        await pruefeAnmeldung();

    }
);

// ============================================================
// MITARBEITERBEREICH LADEN
// Teil 2/4 – Profil & Mitarbeiterdaten
// ============================================================

async function ladeMitarbeiterbereich(
    user,
    profil
) {

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
        } = await mitarbeiterSupabase
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

            aktuellerMitarbeiter =
                mitarbeiter;
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

function aktualisiereMitarbeiterAnzeige(
    mitarbeiter
) {

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

        statusPunkt.style.display =
            "inline-block";

        if (aktiv) {

            statusPunkt.textContent =
                "●";

            statusPunkt.title =
                "Aktiv";

        } else {

            statusPunkt.textContent =
                "●";

            statusPunkt.title =
                "Inaktiv";
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
}

// ============================================================
// STATUS-BUTTON VERBINDEN
// ============================================================

    if (statusButton) {

        statusButton.addEventListener(
            "click",
            async () => {

                if (!aktuellerUser) {
                    return;
                }

                try {

                    statusButton.disabled = true;

                    const neuerStatus =
                        !(aktuellerMitarbeiter?.is_active === true);

                    const {
                        data,
                        error
                    } = await mitarbeiterSupabase
                        .from("employees")
                        .update({
                            is_active: neuerStatus
                        })
                        .eq(
                            "user_id",
                            aktuellerUser.id
                        )
                        .select("*")
                        .maybeSingle();

                    if (error) {
                        throw error;
                    }

                    if (data) {
                        aktuellerMitarbeiter = data;

                        aktualisiereMitarbeiterAnzeige(
                            aktuellerMitarbeiter
                        );
                    }

                } catch (error) {

                    console.error(
                        "Fehler beim Ändern des Mitarbeiterstatus:",
                        error
                    );

                    zeigeFehler(
                        "Der Mitarbeiterstatus konnte nicht geändert werden."
                    );

                } finally {

                    statusButton.disabled = false;
                }
            }
        );
    }


    // --------------------------------------------------------
    // Verfügbarkeit anzeigen
    // --------------------------------------------------------

    aktualisiereVerfuegbarkeitsAnzeige();
}


// ============================================================
// ARBEITSZEIT FORMATIEREN
// ============================================================

function formatiereArbeitszeit(minuten) {

    const gesamtMinuten =
        Math.max(
            0,
            Number(minuten) || 0
        );

    const stunden =
        Math.floor(
            gesamtMinuten / 60
        );

    const restMinuten =
        gesamtMinuten % 60;

    return `${stunden} Std. ${restMinuten} Min.`;
}


// ============================================================
// EIGENE AUFTRÄGE LADEN
// ============================================================

async function ladeEigeneAuftraege(user) {

    if (!user) {
        return;
    }

    const container =
        element("eigeneAuftraege");

    if (!container) {
        return;
    }

    try {

        const [
            bauResult,
            materialResult,
            redstoneResult,
            logistikResult
        ] = await Promise.allSettled([

            mitarbeiterSupabase
                .from("build_order_workers")
                .select("*")
                .eq("employee_id", user.id),

            mitarbeiterSupabase
                .from("material_order_workers")
                .select("*")
                .eq("employee_id", user.id),

            mitarbeiterSupabase
                .from("redstone_order_workers")
                .select("*")
                .eq("employee_id", user.id),

            mitarbeiterSupabase
                .from("logistics_order_workers")
                .select("*")
                .eq("employee_id", user.id)
        ]);


        let auftraege = [];


        // ----------------------------------------------------
        // BAUAUFTRÄGE
        // ----------------------------------------------------

        if (
            bauResult.status === "fulfilled" &&
            !bauResult.value.error
        ) {

            const daten =
                bauResult.value.data || [];

            daten.forEach(
                (auftrag) => {

                    auftraege.push({
                        typ: "Bau",
                        daten: auftrag
                    });

                }
            );
        }


        // ----------------------------------------------------
        // MATERIALAUFTRÄGE
        // ----------------------------------------------------

        if (
            materialResult.status === "fulfilled" &&
            !materialResult.value.error
        ) {

            const daten =
                materialResult.value.data || [];

            daten.forEach(
                (auftrag) => {

                    auftraege.push({
                        typ: "Material",
                        daten: auftrag
                    });

                }
            );
        }


        // ----------------------------------------------------
        // REDSTONE-AUFTRÄGE
        // ----------------------------------------------------

        if (
            redstoneResult.status === "fulfilled" &&
            !redstoneResult.value.error
        ) {

            const daten =
                redstoneResult.value.data || [];

            daten.forEach(
                (auftrag) => {

                    auftraege.push({
                        typ: "Redstone",
                        daten: auftrag
                    });

                }
            );
        }


        // ----------------------------------------------------
        // LOGISTIKAUFTRÄGE
        // ----------------------------------------------------

        if (
            logistikResult.status === "fulfilled" &&
            !logistikResult.value.error
        ) {

            const daten =
                logistikResult.value.data || [];

            daten.forEach(
                (auftrag) => {

                    auftraege.push({
                        typ: "Logistik",
                        daten: auftrag
                    });

                }
            );
        }


        // ----------------------------------------------------
        // ANZEIGE
        // ----------------------------------------------------

        if (auftraege.length === 0) {

            container.innerHTML = `
                <div
                    style="
                        text-align:center;
                        color:#888;
                        padding:20px;
                    "
                >
                    Dir sind aktuell keine Aufträge zugewiesen.
                </div>
            `;

            return;
        }


        container.innerHTML = "";


        auftraege.forEach(
            (auftrag) => {

                const daten =
                    auftrag.daten || {};

                const karte =
                    document.createElement("div");

                karte.className =
                    "auftrag";

                const titel =
                    daten.title ||
                    daten.order_title ||
                    `${auftrag.typ}-Auftrag`;

                const status =
                    daten.status ||
                    "Offen";

                karte.innerHTML = `
                    <div
                        style="
                            font-weight:bold;
                            color:#d7ad52;
                            margin-bottom:6px;
                        "
                    >
                        ${auftrag.typ}
                    </div>

                    <div>
                        ${titel}
                    </div>

                    <div
                        style="
                            color:#aaa;
                            margin-top:5px;
                        "
                    >
                        Status: ${status}
                    </div>
                `;

                container.appendChild(
                    karte
                );
            }
        );

    } catch (error) {

        console.error(
            "Eigene Aufträge konnten nicht geladen werden:",
            error
        );

        container.innerHTML = `
            <div
                style="
                    text-align:center;
                    color:#888;
                    padding:20px;
                "
            >
                Aufträge konnten momentan nicht geladen werden.
            </div>
        `;
    }
}


// ============================================================
// VERFÜGBARKEITSANZEIGE
// ============================================================

function aktualisiereVerfuegbarkeitsAnzeige() {

    const verfuegbar =
        aktuellerMitarbeiter?.is_available === true;

    const text =
        element("verfuegbarkeitText");

    const button =
        element("verfuegbarkeitButton");


    if (text) {

        text.textContent =
            verfuegbar
                ? "Verfügbar"
                : "Nicht verfügbar";
    }


    if (button) {

        button.textContent =
            verfuegbar
                ? "Nicht verfügbar"
                : "Verfügbar";

        button.disabled =
            !aktuellerUser ||
            !aktuellerMitarbeiter;
    }
}


// ============================================================
// VERFÜGBARKEIT AUF VERFÜGBAR SETZEN
// ============================================================

async function setzeVerfuegbar() {

    if (
        !aktuellerUser ||
        !aktuellerMitarbeiter
    ) {
        return;
    }

    try {

        const {
            data,
            error
        } = await mitarbeiterSupabase
            .from("employees")
            .update({
                is_available: true
            })
            .eq(
                "user_id",
                aktuellerUser.id
            )
            .select("*")
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (data) {
            aktuellerMitarbeiter = data;
        }

        aktualisiereVerfuegbarkeitsAnzeige();

    } catch (error) {

        console.error(
            "Fehler beim Setzen der Verfügbarkeit:",
            error
        );

        zeigeFehler(
            "Die Verfügbarkeit konnte nicht geändert werden."
        );
    }
}


// ============================================================
// VERFÜGBARKEIT AUF NICHT VERFÜGBAR SETZEN
// ============================================================

async function setzeNichtVerfuegbar() {

    if (
        !aktuellerUser ||
        !aktuellerMitarbeiter
    ) {
        return;
    }

    try {

        const {
            data,
            error
        } = await mitarbeiterSupabase
            .from("employees")
            .update({
                is_available: false
            })
            .eq(
                "user_id",
                aktuellerUser.id
            )
            .select("*")
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (data) {
            aktuellerMitarbeiter = data;
        }

        aktualisiereVerfuegbarkeitsAnzeige();

    } catch (error) {

        console.error(
            "Fehler beim Entfernen der Verfügbarkeit:",
            error
        );

        zeigeFehler(
            "Die Verfügbarkeit konnte nicht geändert werden."
        );
    }
}


// ============================================================
// VERFÜGBARKEITS-BUTTON
// ============================================================

function verbindeVerfuegbarkeitsButton() {

    const button =
        element("verfuegbarkeitButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async () => {

            if (
                aktuellerMitarbeiter?.is_available === true
            ) {

                await setzeNichtVerfuegbar();

            } else {

                await setzeVerfuegbar();
            }
        }
    );
            }

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
        } = await mitarbeiterSupabase
            .from("employee_help_requests")
            .select("*")
            .eq("status", "Offen")
            .is("helper_id", null)
            .neq(
                "employee_id",
                aktuellerUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


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
            .forEach(
                button => {

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
                }
            );


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

function erstelleVerstaerkungsElement(
    anfrage
) {

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
        <div
            class="karte"
            style="
                margin-bottom:10px;
                padding:14px;
            "
        >

            <h3
                style="
                    margin-top:0;
                "
            >
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
                <strong>
                    ${escapeHtml(belohnungsText)}
                </strong>
            </p>


            <button
                type="button"
                class="button"
                data-verstaerkung-id="${escapeHtml(id)}"
            >
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
        } = await mitarbeiterSupabase
            .from("employee_help_requests")
            .update({
                helper_id:
                    aktuellerUser.id,

                status:
                    "Angenommen"
            })
            .eq(
                "id",
                anfrageId
            )
            .eq(
                "status",
                "Offen"
            )
            .is(
                "helper_id",
                null
            )
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
// HTML-SICHERHEIT
// ============================================================

function escapeHtml(wert) {

    if (
        wert === null ||
        wert === undefined
    ) {
        return "";
    }


    return String(wert)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
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


    container.innerHTML = `
        <p>
            Aktuell liegen keine neuen
            Benachrichtigungen vor.
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
        } = await mitarbeiterSupabase
            .from("employees")
            .select("*")
            .eq(
                "user_id",
                aktuellerUser.id
            )
            .maybeSingle();


        if (
            !error &&
            data
        ) {

            aktuellerMitarbeiter =
                data;


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
// START DER MITARBEITER-BUTTONS
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        verbindeVerfuegbarkeitsButton();

        starteAutomatischeAktualisierung();
    }
);
