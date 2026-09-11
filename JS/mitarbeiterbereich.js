// ============================================================
// EHRENMARKT – MITARBEITERBEREICH
// TEIL 1–4 KOMPLETT
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

let authSubscription = null;
let aktualisierungsTimer = null;


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
        el.textContent =
            text === null || text === undefined
                ? ""
                : String(text);
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

    fehler.textContent = text || "";
    fehler.style.display = text ? "block" : "none";
}


function versteckeFehler() {
    const fehler = element("fehler");

    if (fehler) {
        fehler.textContent = "";
        fehler.style.display = "none";
    }
}


function escapeHtml(wert) {
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


// ============================================================
// ANZEIGE – NICHT ANGEMELDET
// ============================================================

function zeigeGastbereich(
    nachricht = "Du bist aktuell nicht angemeldet."
) {

    const gastBereich =
        element("gastBereich");

    const mitarbeiterBereich =
        element("mitarbeiterBereich");

    const ladebereich =
        element("ladebereich");

    const abmeldenButton =
        element("abmeldenButton");


    if (ladebereich) {
        ladebereich.style.display = "none";
    }


    if (mitarbeiterBereich) {
        mitarbeiterBereich.style.display = "none";
    }


    if (gastBereich) {

        gastBereich.style.display = "block";

        const texte =
            gastBereich.querySelectorAll("p");

        if (texte.length > 0) {

            texte[0].textContent =
                nachricht;
        }
    }


    if (abmeldenButton) {
        abmeldenButton.style.display = "none";
    }
}


// ============================================================
// ANZEIGE – KEIN ZUGRIFF
// ============================================================

function zeigeKeinZugriff() {

    const gastBereich =
        element("gastBereich");

    const mitarbeiterBereich =
        element("mitarbeiterBereich");

    const ladebereich =
        element("ladebereich");

    const abmeldenButton =
        element("abmeldenButton");


    if (ladebereich) {
        ladebereich.style.display = "none";
    }


    if (mitarbeiterBereich) {
        mitarbeiterBereich.style.display = "none";
    }


    if (abmeldenButton) {
        abmeldenButton.style.display = "none";
    }


    if (gastBereich) {

        gastBereich.style.display = "block";

        gastBereich.innerHTML = `
            <h2>Kein Zugriff</h2>

            <p>
                Dein Rang besitzt keinen Zugriff
                auf den Mitarbeiterbereich.
            </p>

            <p style="color:#aaa;">
                Zugriff haben nur Mitarbeiter,
                Leitung und Stadtleitung.
            </p>

            <a
                href="kundenbereich.html"
                class="button"
            >
                Zum Kundenbereich
            </a>
        `;
    }
}


// ============================================================
// ANZEIGE – MITARBEITERBEREICH
// ============================================================

function zeigeMitarbeiterbereich() {

    const gastBereich =
        element("gastBereich");

    const mitarbeiterBereich =
        element("mitarbeiterBereich");

    const ladebereich =
        element("ladebereich");

    const abmeldenButton =
        element("abmeldenButton");


    if (ladebereich) {
        ladebereich.style.display = "none";
    }


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
// TEIL 1
// ANMELDUNG UND ZUGRIFFSKONTROLLE
// ============================================================

async function pruefeMitarbeiterZugriff(user) {

    if (!user) {

        aktuellerUser = null;
        aktuellesProfil = null;
        aktuellerMitarbeiter = null;

        zeigeGastbereich();

        return false;
    }


    aktuellerUser = user;


    try {

        const {
            data: profil,
            error
        } =
            await mitarbeiterSupabase
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

            console.error(
                "Kein Profil für Benutzer gefunden."
            );

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
            "Ehrenmarkt Mitarbeiterbereich – Rang:",
            rang
        );


        if (
            !ERLAUBTE_MITARBEITER_RAEGE
                .includes(rang)
        ) {

            console.log(
                "Zugriff verweigert:",
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

    } catch (error) {

        console.error(
            "Fehler bei der Zugriffskontrolle:",
            error
        );

        zeigeFehler(
            "Der Mitarbeiterbereich konnte nicht geladen werden."
        );

        return false;
    }
}


// ============================================================
// SESSION PRÜFEN
// ============================================================

async function pruefeAnmeldung() {

    if (!mitarbeiterSupabase) {

        console.error(
            "Supabase Client nicht vorhanden."
        );

        zeigeFehler(
            "Die Verbindung zu Ehrenmarkt konnte nicht hergestellt werden."
        );

        return;
    }


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


        if (!session?.user) {

            console.log(
                "Ehrenmarkt: Kein Benutzer angemeldet."
            );

            aktuellerUser = null;
            aktuellesProfil = null;
            aktuellerMitarbeiter = null;

            zeigeGastbereich();

            return;
        }


        console.log(
            "Ehrenmarkt: Benutzer angemeldet:",
            session.user.email
        );


        await pruefeMitarbeiterZugriff(
            session.user
        );

    } catch (error) {

        console.error(
            "Fehler beim Prüfen der Session:",
            error
        );

        zeigeFehler(
            "Die Anmeldung konnte nicht überprüft werden."
        );
    }
}


// ============================================================
// ABMELDEN
// ============================================================

async function abmelden() {

    if (!mitarbeiterSupabase) {
        return;
    }


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


        aktuellerUser = null;
        aktuellesProfil = null;
        aktuellerMitarbeiter = null;


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
// AUTH LISTENER
// ============================================================

function registriereAuthListener() {

    if (!mitarbeiterSupabase) {
        return;
    }


    if (authSubscription) {
        return;
    }


    const result =
        mitarbeiterSupabase
            .auth
            .onAuthStateChange(
                (event, session) => {

                    console.log(
                        "Ehrenmarkt Auth:",
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
                        (
                            event === "SIGNED_IN" ||
                            event === "TOKEN_REFRESHED"
                        ) &&
                        session?.user
                    ) {

                        aktuellerUser =
                            session.user;


                        void pruefeMitarbeiterZugriff(
                            session.user
                        );
                    }
                }
            );


    authSubscription =
        result?.data?.subscription || null;
}


// ============================================================
// BUTTON – ABMELDEN
// ============================================================

function verbindeAbmeldenButton() {

    const button =
        element("abmeldenButton");


    if (!button) {
        return;
    }


    button.onclick =
        abmelden;
}


// ============================================================
// TEIL 2
// PROFIL UND MITARBEITERDATEN
// ============================================================

async function ladeMitarbeiterbereich(
    user,
    profil
) {

    // --------------------------------------------------------
    // PROFIL
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


    setText(
        "mitarbeiterBegruessung",
        `Willkommen zurück, ${username}!`
    );


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
    // EMPLOYEES DATENSATZ
    // --------------------------------------------------------

    aktuellerMitarbeiter = null;


    try {

        const {
            data,
            error
        } =
            await mitarbeiterSupabase
                .from("employees")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();


        if (error) {

            console.error(
                "Mitarbeiterdaten konnten nicht geladen werden:",
                error
            );

        } else {

            aktuellerMitarbeiter =
                data || null;
        }

    } catch (error) {

        console.error(
            "Fehler beim Laden der Mitarbeiterdaten:",
            error
        );
    }


    if (aktuellerMitarbeiter) {

        aktualisiereMitarbeiterAnzeige(
            aktuellerMitarbeiter
        );

    } else {

        setText(
            "statusText",
            "Mitarbeiterdaten nicht vollständig hinterlegt"
        );


        setText(
            "arbeitszeitAnzeige",
            "0 Std. 0 Min."
        );


        aktualisiereVerfuegbarkeitsAnzeige();
    }


    // --------------------------------------------------------
    // WEITERE BEREICHE
    // --------------------------------------------------------

    await Promise.allSettled([
        ladeEigeneAuftraege(user),
        ladeOffeneVerstaerkung(),
        ladeBenachrichtigungen()
    ]);
}


// ============================================================
// MITARBEITERSTATUS
// ============================================================

function aktualisiereMitarbeiterAnzeige(
    mitarbeiter
) {

    if (!mitarbeiter) {
        return;
    }


    const aktiv =
        mitarbeiter.is_active === true;


    const statusPunkt =
        element("statusPunkt");


    const statusText =
        element("statusText");


    if (statusPunkt) {

        statusPunkt.style.display =
            "inline-block";


        statusPunkt.textContent =
            "●";


        statusPunkt.title =
            aktiv
                ? "Aktiv"
                : "Inaktiv";
    }


    if (statusText) {

        statusText.textContent =
            aktiv
                ? "Aktiv"
                : "Inaktiv";
    }


    const statusButton =
        element("statusButton");


    if (statusButton) {

        statusButton.textContent =
            aktiv
                ? "Auf Inaktiv setzen"
                : "Auf Aktiv setzen";


        statusButton.disabled =
            !aktuellerUser ||
            !aktuellerMitarbeiter;
    }


    const arbeitszeit =
        Number(
            mitarbeiter.total_work_minutes || 0
        );


    setText(
        "arbeitszeitAnzeige",
        formatiereArbeitszeit(
            arbeitszeit
        )
    );


    aktualisiereVerfuegbarkeitsAnzeige();
}


// ============================================================
// STATUS ÄNDERN
// ============================================================

async function aendereMitarbeiterStatus() {

    if (
        !aktuellerUser ||
        !mitarbeiterSupabase
    ) {
        return;
    }


    if (!aktuellerMitarbeiter) {

        zeigeFehler(
            "Für dein Konto wurden noch keine Mitarbeiterdaten hinterlegt."
        );

        return;
    }


    const button =
        element("statusButton");


    const neuerStatus =
        aktuellerMitarbeiter.is_active !== true;


    if (button) {
        button.disabled = true;
    }


    try {

        const {
            data,
            error
        } =
            await mitarbeiterSupabase
                .from("employees")
                .update({
                    is_active: neuerStatus,
                    updated_at: new Date().toISOString()
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

            aktuellerMitarbeiter =
                data;


            aktualisiereMitarbeiterAnzeige(
                data
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

        if (button) {
            button.disabled = false;
        }
    }
}


// ============================================================
// ARBEITSZEIT
// ============================================================

function formatiereArbeitszeit(
    minuten
) {

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
// STEMPELUHR
// ============================================================

async function einstempeln() {

    if (!aktuellerMitarbeiter || !mitarbeiterSupabase) {
        zeigeFehler("Mitarbeiterdaten konnten nicht geladen werden.");
        return;
    }

    if (aktuellerMitarbeiter.clock_in) {
        zeigeFehler("Du bist bereits eingestempelt.");
        return;
    }

    const jetzt = new Date().toISOString();

    const { error } = await mitarbeiterSupabase
        .from("employees")
        .update({
            clock_in: jetzt
        })
        .eq("user_id", aktuellerUser.id);

    if (error) {
        console.error("Fehler beim Einstempeln:", error);
        zeigeFehler("Einstempeln fehlgeschlagen.");
        return;
    }

    aktuellerMitarbeiter.clock_in = jetzt;

    aktualisiereStempeluhrAnzeige();
}


async function ausstempeln() {

    if (
        !aktuellerMitarbeiter ||
        !aktuellerMitarbeiter.clock_in ||
        !mitarbeiterSupabase
    ) {
        zeigeFehler("Du bist aktuell nicht eingestempelt.");
        return;
    }

    const start = new Date(aktuellerMitarbeiter.clock_in);
    const ende = new Date();

    const minuten = Math.max(
        1,
        Math.floor((ende - start) / 60000)
    );

    const bisher =
        Number(aktuellerMitarbeiter.total_work_minutes) || 0;

    const gesamt = bisher + minuten;

    const { error } = await mitarbeiterSupabase
        .from("employees")
        .update({
            clock_in: null,
            total_work_minutes: gesamt
        })
        .eq("user_id", aktuellerUser.id);

    if (error) {
        console.error("Fehler beim Ausstempeln:", error);
        zeigeFehler("Ausstempeln fehlgeschlagen.");
        return;
    }

    aktuellerMitarbeiter.clock_in = null;
    aktuellerMitarbeiter.total_work_minutes = gesamt;

    aktualisiereStempeluhrAnzeige();
}


function aktualisiereStempeluhrAnzeige() {

    const anzeige = element("arbeitszeitAnzeige");
    const einButton = element("einstempelnButton");
    const ausButton = element("ausstempelnButton");

    if (!aktuellerMitarbeiter) {
        return;
    }

    if (anzeige) {
        anzeige.textContent =
            formatierenArbeitszeit(
                aktuellerMitarbeiter.total_work_minutes
            );
    }

    const eingestempelt =
        Boolean(aktuellerMitarbeiter.clock_in);

    if (einButton) {
        einButton.disabled = eingestempelt;
    }

    if (ausButton) {
        ausButton.disabled = !eingestempelt;
    }
}

// ============================================================
// TEIL 3
// VERFÜGBARKEIT
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


async function setzeVerfuegbarkeit(
    wert
) {

    if (
        !aktuellerUser ||
        !aktuellerMitarbeiter ||
        !mitarbeiterSupabase
    ) {
        return;
    }


    const button =
        element("verfuegbarkeitButton");


    if (button) {
        button.disabled = true;
    }


    try {

        const {
            data,
            error
        } =
            await mitarbeiterSupabase
                .from("employees")
                .update({
                    is_available: wert,
                    updated_at: new Date().toISOString()
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

            aktuellerMitarbeiter =
                data;
        }


        aktualisiereVerfuegbarkeitsAnzeige();

    } catch (error) {

        console.error(
            "Fehler bei der Verfügbarkeit:",
            error
        );

        zeigeFehler(
            "Die Verfügbarkeit konnte nicht geändert werden."
        );

    } finally {

        if (button) {
            button.disabled = false;
        }
    }
}


function verbindeMitarbeiterButtons() {

    const statusButton =
        element("statusButton");


    if (statusButton) {

        statusButton.onclick =
            aendereMitarbeiterStatus;
    }


    const verfuegbarkeitButton =
        element("verfuegbarkeitButton");


    if (verfuegbarkeitButton) {

        verfuegbarkeitButton.onclick =
            async () => {

                if (
                    aktuellerMitarbeiter?.is_available === true
                ) {

                    await setzeVerfuegbarkeit(
                        false
                    );

                } else {

                    await setzeVerfuegbarkeit(
                        true
                    );
                }
            };
    }
}


// ============================================================
// EIGENE AUFTRÄGE
// ============================================================

async function ladeEigeneAuftraege(
    user
) {

    const container =
        element("eigeneAuftraege");


    if (!container) {
        return;
    }


    if (!user) {

        container.innerHTML =
            "<p>Keine Anmeldung vorhanden.</p>";

        return;
    }


    try {

        const [
            bauResult,
            materialResult,
            redstoneResult,
            logistikResult
        ] =
            await Promise.all([
                mitarbeiterSupabase
                    .from("build_order_workers")
                    .select("*")
                    .eq(
                        "employee_id",
                        user.id
                    ),

                mitarbeiterSupabase
                    .from("material_order_workers")
                    .select("*")
                    .eq(
                        "employee_id",
                        user.id
                    ),

                mitarbeiterSupabase
                    .from("redstone_order_workers")
                    .select("*")
                    .eq(
                        "employee_id",
                        user.id
                    ),

                mitarbeiterSupabase
                    .from("logistics_order_workers")
                    .select("*")
                    .eq(
                        "employee_id",
                        user.id
                    )
            ]);


        const auftraege = [];


        if (
            !bauResult.error &&
            Array.isArray(bauResult.data)
        ) {

            bauResult.data.forEach(
                auftrag => {

                    auftraege.push({
                        typ: "Bau",
                        daten: auftrag
                    });
                }
            );
        }


        if (
            !materialResult.error &&
            Array.isArray(materialResult.data)
        ) {

            materialResult.data.forEach(
                auftrag => {

                    auftraege.push({
                        typ: "Material",
                        daten: auftrag
                    });
                }
            );
        }


        if (
            !redstoneResult.error &&
            Array.isArray(redstoneResult.data)
        ) {

            redstoneResult.data.forEach(
                auftrag => {

                    auftraege.push({
                        typ: "Redstone",
                        daten: auftrag
                    });
                }
            );
        }


        if (
            !logistikResult.error &&
            Array.isArray(logistikResult.data)
        ) {

            logistikResult.data.forEach(
                auftrag => {

                    auftraege.push({
                        typ: "Logistik",
                        daten: auftrag
                    });
                }
            );
        }


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
            auftrag => {

                const daten =
                    auftrag.daten || {};


                const titel =
                    daten.title ||
                    daten.order_title ||
                    daten.name ||
                    `${auftrag.typ}-Auftrag`;


                const status =
                    daten.status ||
                    "Offen";


                const karte =
                    document.createElement(
                        "div"
                    );


                karte.className =
                    "auftrag";


                karte.innerHTML = `
                    <div
                        style="
                            font-weight:bold;
                            color:#d7ad52;
                            margin-bottom:6px;
                        "
                    >
                        ${escapeHtml(auftrag.typ)}
                    </div>

                    <div>
                        ${escapeHtml(titel)}
                    </div>

                    <div
                        style="
                            color:#aaa;
                            margin-top:5px;
                        "
                    >
                        Status:
                        ${escapeHtml(status)}
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
// TEIL 4
// OFFENE VERSTÄRKUNG
// ============================================================

async function ladeOffeneVerstaerkung() {

    const container =
        element("offeneVerstaerkung");


    if (!container) {
        return;
    }


    if (!aktuellerUser) {

        container.innerHTML =
            "<p>Keine Anmeldung vorhanden.</p>";

        return;
    }


    container.innerHTML =
        "<p>Verstärkungsanfragen werden geladen...</p>";


    try {

        const {
            data,
            error
        } =
            await mitarbeiterSupabase
                .from("employee_help_requests")
                .select("*")
                .eq(
                    "status",
                    "Offen"
                )
                .is(
                    "helper_id",
                    null
                )
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
            throw error;
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


        container.innerHTML = "";


        anfragen
            .slice(0, 10)
            .forEach(
                anfrage => {

                    const karte =
                        erstelleVerstaerkungsElement(
                            anfrage
                        );


                    container.insertAdjacentHTML(
                        "beforeend",
                        karte
                    );
                }
            );


        container
            .querySelectorAll(
                "[data-verstaerkung-id]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            void uebernehmeVerstaerkung(
                                button.dataset.verstaerkungId,
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

        container.innerHTML = `
            <p>
                Aktuell konnten keine Verstärkungsanfragen geladen werden.
            </p>
        `;
    }
}


// ============================================================
// VERSTÄRKUNGS-ELEMENT
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
// VERSTÄRKUNG ÜBERNEHMEN
// ============================================================

async function uebernehmeVerstaerkung(
    anfrageId,
    button
) {

    if (
        !aktuellerUser ||
        !mitarbeiterSupabase
    ) {
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
        } =
            await mitarbeiterSupabase
                .from("employee_help_requests")
                .update({
                    helper_id:
                        aktuellerUser.id,

                    status:
                        "Angenommen",

                    updated_at:
                        new Date().toISOString()
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
                "Die Verstärkungsanfrage wurde bereits übernommen."
            );
        }


        await ladeOffeneVerstaerkung();


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


    container.innerHTML = `
        <p>
            Aktuell liegen keine neuen
            Benachrichtigungen vor.
        </p>
    `;
}


// ============================================================
// KOMPLETTE AKTUALISIERUNG
// ============================================================

async function aktualisiereMitarbeiterbereich() {

    if (
        !aktuellerUser ||
        !mitarbeiterSupabase
    ) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await mitarbeiterSupabase
                .from("employees")
                .select("*")
                .eq(
                    "user_id",
                    aktuellerUser.id
                )
                .maybeSingle();


        if (!error && data) {

            aktuellerMitarbeiter =
                data;


            aktualisiereMitarbeiterAnzeige(
                data
            );
        }


        await Promise.allSettled([
            ladeEigeneAuftraege(
                aktuellerUser
            ),

            ladeOffeneVerstaerkung(),

            ladeBenachrichtigungen()
        ]);

    } catch (error) {

        console.error(
            "Fehler beim Aktualisieren:",
            error
        );
    }
}


// ============================================================
// AUTOMATISCHE AKTUALISIERUNG
// ============================================================

function starteAutomatischeAktualisierung() {

    if (aktualisierungsTimer) {

        clearInterval(
            aktualisierungsTimer
        );
    }


    aktualisierungsTimer =
        setInterval(
            () => {

                if (aktuellerUser) {

                    void aktualisiereMitarbeiterbereich();
                }

            },
            60000
        );
}


// ============================================================
// START
// NUR EIN EINZIGER DOMCONTENTLOADED
// ============================================================

async function starteMitarbeiterbereich() {

    console.log(
        "Ehrenmarkt Mitarbeiterbereich startet..."
    );


    versteckeFehler();


    // --------------------------------------------------------
    // SUPABASE CLIENT
    // --------------------------------------------------------

    mitarbeiterSupabase =
        window.supabaseClient;


    if (!mitarbeiterSupabase) {

        console.error(
            "window.supabaseClient fehlt."
        );

        zeigeFehler(
            "Die Verbindung zu Ehrenmarkt konnte nicht hergestellt werden."
        );

        return;
    }


    // --------------------------------------------------------
    // BUTTONS
    // --------------------------------------------------------

    verbindeAbmeldenButton();

    verbindeMitarbeiterButtons();


    // --------------------------------------------------------
    // AUTH
    // --------------------------------------------------------

    registriereAuthListener();


    // --------------------------------------------------------
    // SESSION
    // --------------------------------------------------------

    await pruefeAnmeldung();


    // --------------------------------------------------------
    // AUTOMATISCHE AKTUALISIERUNG
    // --------------------------------------------------------

    starteAutomatischeAktualisierung();


    console.log(
        "Ehrenmarkt Mitarbeiterbereich fertig."
    );
}


document.addEventListener(
    "DOMContentLoaded",
    () => {

        void starteMitarbeiterbereich();

    },
    {
        once: true
    }
);


// ============================================================
// ÖFFENTLICHE FUNKTIONEN
// ============================================================

window.ehrenmarktMitarbeiterAktualisieren =
    aktualisiereMitarbeiterbereich;


window.ehrenmarktMitarbeiterAbmelden =
    abmelden;
