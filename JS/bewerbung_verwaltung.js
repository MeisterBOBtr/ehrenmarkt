// ============================================================
// EHRENMARKT
// BEWERBUNGSVERWALTUNG
// ============================================================

let client = null;
let aktuellerBenutzer = null;
let aktuelleBewerbung = null;
let bewerbungen = [];


// ============================================================
// FEHLERANZEIGE
// ============================================================

function zeigeFehler(text) {

    console.error("EHRENMARKT:", text);

    alert(text);
}


// ============================================================
// SUPABASE CLIENT
// ============================================================

function holeSupabaseClient() {

    if (!client) {
        client = window.supabaseClient;
    }

    return client;
}


// ============================================================
// AKTUELLEN BENUTZER LADEN
// ============================================================

async function ladeAktuellenBenutzer() {

    const supabase = holeSupabaseClient();

    if (!supabase) {
        zeigeFehler(
            "Die Verbindung zum Ehrenmarkt-System konnte nicht hergestellt werden."
        );

        return null;
    }

    try {

        const {
            data,
            error
        } = await supabase.auth.getUser();

        if (error) {
            throw error;
        }

        if (!data || !data.user) {

            zeigeFehler(
                "Du musst angemeldet sein, um die Bewerbungsverwaltung zu öffnen."
            );

            return null;
        }

        aktuellerBenutzer = data.user;

        return data.user;

    } catch (error) {

        console.error(
            "Fehler beim Laden des Benutzers:",
            error
        );

        zeigeFehler(
            "Deine Anmeldung konnte nicht überprüft werden."
        );

        return null;
    }
}


// ============================================================
// STADTLEITUNG PRÜFEN
// ============================================================

async function pruefeStadtleitung() {

    const supabase = holeSupabaseClient();

    if (!supabase || !aktuellerBenutzer) {
        return false;
    }

    try {

        const {
            data,
            error
        } = await supabase
            .from("employees")
            .select("id, role, is_active")
            .eq("user_id", aktuellerBenutzer.id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {

            zeigeFehler(
                "Du bist nicht als Mitarbeiter eingetragen."
            );

            return false;
        }

        if (data.role !== "Stadtleitung") {

            zeigeFehler(
                "Du hast keine Berechtigung für die Bewerbungsverwaltung."
            );

            return false;
        }

        if (data.is_active !== true) {

            zeigeFehler(
                "Dein Mitarbeiterkonto ist derzeit nicht aktiv."
            );

            return false;
        }

        return true;

    } catch (error) {

        console.error(
            "Fehler bei der Berechtigungsprüfung:",
            error
        );

        zeigeFehler(
            "Die Berechtigung für die Bewerbungsverwaltung konnte nicht geprüft werden."
        );

        return false;
    }
}


// ============================================================
// BEWERBUNGEN LADEN
// ============================================================

async function ladeBewerbungen() {

    const supabase = holeSupabaseClient();

    if (!supabase) {
        return;
    }

    const liste =
        document.getElementById("applicationList");

    if (liste) {

        liste.innerHTML = `
            <div class="application-list-empty">
                <strong>Bewerbungen werden geladen...</strong>
                Bitte einen Moment warten.
            </div>
        `;
    }


    try {

        const {
            data,
            error
        } = await supabase
            .from("applications")
            .select(`
                id,
                user_id,
                name,
                minecraft_name,
                discord_id,
                age,
                experience,
                previous_work,
                desired_role,
                additional_skills,
                application_text,
                availability,
                unavailable_times,
                status,
                assigned_role,
                assigned_rank,
                processed_by,
                processed_at,
                decision_note,
                created_at,
                updated_at
            `)
            .order("created_at", {
                ascending: false
            });


        if (error) {
            throw error;
        }


        bewerbungen =
            Array.isArray(data)
                ? data
                : [];


        aktualisiereStatistik();

        zeigeBewerbungsliste();


    } catch (error) {

        console.error(
            "Fehler beim Laden der Bewerbungen:",
            error
        );

        if (liste) {

            liste.innerHTML = `
                <div class="application-list-empty">
                    <strong>Fehler beim Laden</strong>
                    Die Bewerbungen konnten nicht geladen werden.
                </div>
            `;
        }

        zeigeFehler(
            "Die Bewerbungen konnten nicht geladen werden."
        );
    }
}


// ============================================================
// STATISTIK AKTUALISIEREN
// ============================================================

function aktualisiereStatistik() {

    const offen =
        bewerbungen.filter(
            function (bewerbung) {
                return bewerbung.status === "offen";
            }
        ).length;


    const angenommen =
        bewerbungen.filter(
            function (bewerbung) {
                return bewerbung.status === "angenommen";
            }
        ).length;


    const abgelehnt =
        bewerbungen.filter(
            function (bewerbung) {
                return bewerbung.status === "abgelehnt";
            }
        ).length;


    const statOffen =
        document.getElementById("statOffen");

    const statAngenommen =
        document.getElementById("statAngenommen");

    const statAbgelehnt =
        document.getElementById("statAbgelehnt");


    if (statOffen) {
        statOffen.textContent = offen;
    }

    if (statAngenommen) {
        statAngenommen.textContent = angenommen;
    }

    if (statAbgelehnt) {
        statAbgelehnt.textContent = abgelehnt;
    }
}


// ============================================================
// STATUS-KLASSE
// ============================================================

function statusKlasse(status) {

    if (status === "angenommen") {
        return "status-angenommen";
    }

    if (status === "abgelehnt") {
        return "status-abgelehnt";
    }

    return "status-offen";
}


// ============================================================
// STATUS-TEXT
// ============================================================

function statusText(status) {

    if (status === "angenommen") {
        return "ANGENOMMEN";
    }

    if (status === "abgelehnt") {
        return "ABGELEHNT";
    }

    return "OFFEN";
}


// ============================================================
// DATUM FORMATIEREN
// ============================================================

function formatiereDatum(datum) {

    if (!datum) {
        return "–";
    }

    const wert =
        new Date(datum);

    if (Number.isNaN(wert.getTime())) {
        return "–";
    }

    return wert.toLocaleDateString(
        "de-DE",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
      }

// ============================================================
// BEWERBUNGSLISTE ANZEIGEN
// ============================================================

function zeigeBewerbungsliste() {

    const liste =
        document.getElementById("applicationList");

    if (!liste) {
        return;
    }


    if (bewerbungen.length === 0) {

        liste.innerHTML = `
            <div class="application-list-empty">
                <strong>Keine Bewerbungen vorhanden</strong>
                Aktuell befinden sich keine Bewerbungen
                in der Bewerbungsverwaltung.
            </div>
        `;

        return;
    }


    liste.innerHTML = "";


    bewerbungen.forEach(
        function (bewerbung) {

            const item =
                document.createElement("button");

            item.type = "button";

            item.className =
                "application-item";


            if (
                aktuelleBewerbung &&
                aktuelleBewerbung.id === bewerbung.id
            ) {

                item.classList.add("active");
            }


            item.innerHTML = `

                <div class="application-name">
                    ${esc(bewerbung.name || "Unbekannter Bewerber")}
                </div>

                <div class="application-minecraft">
                    Minecraft:
                    ${esc(bewerbung.minecraft_name || "–")}
                </div>

                <div class="application-meta">

                    <span class="status ${statusKlasse(bewerbung.status)}">
                        ${statusText(bewerbung.status)}
                    </span>

                    <span class="application-date">
                        ${formatiereDatum(bewerbung.created_at)}
                    </span>

                </div>
            `;


            item.addEventListener(
                "click",
                function () {

                    oeffneBewerbung(
                        bewerbung.id
                    );
                }
            );


            liste.appendChild(item);
        }
    );
}


// ============================================================
// BEWERBUNG ÖFFNEN
// ============================================================

function oeffneBewerbung(id) {

    const bewerbung =
        bewerbungen.find(
            function (eintrag) {
                return eintrag.id === id;
            }
        );


    if (!bewerbung) {
        return;
    }


    aktuelleBewerbung =
        bewerbung;


    zeigeBewerbungsliste();

    zeigeBewerbungsdetails(
        bewerbung
    );


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// DETAILANSICHT
// ============================================================

function zeigeBewerbungsdetails(bewerbung) {

    const container =
        document.getElementById("detailsContent");

    if (!container) {
        return;
    }


    const fachbereiche =
        formatiereFachbereiche(
            bewerbung.additional_skills
        );


    const bearbeitung =
        bewerbung.status === "offen";


    container.innerHTML = `

        <div class="candidate-header">

            <div>

                <div class="candidate-name">
                    ${esc(bewerbung.name || "–")}
                </div>

                <div class="candidate-minecraft">
                    Minecraft:
                    ${esc(bewerbung.minecraft_name || "–")}
                </div>

            </div>

            <span class="status ${statusKlasse(bewerbung.status)}">
                ${statusText(bewerbung.status)}
            </span>

        </div>


        <div class="detail-section">

            <div class="detail-section-title">
                Identität
            </div>

            <div class="info-grid">

                ${infoBox(
                    "Name",
                    bewerbung.name
                )}

                ${infoBox(
                    "Minecraft-Name",
                    bewerbung.minecraft_name
                )}

                ${infoBox(
                    "Discord",
                    bewerbung.discord_id
                )}

                ${infoBox(
                    "Alter",
                    bewerbung.age
                        ? bewerbung.age + " Jahre"
                        : "–"
                )}

            </div>

        </div>


        <div class="detail-section">

            <div class="detail-section-title">
                Fachbereiche & Stärken
            </div>

            <div class="skills-container">

                ${fachbereiche}

            </div>

        </div>


        <div class="detail-section">

            <div class="detail-section-title">
                Erfahrung
            </div>

            ${infoBox(
                "Erfahrungsstufe",
                bewerbung.experience
            )}

            <br>

            ${textBox(
                bewerbung.previous_work,
                "Keine bisherigen Projekte oder Erfahrungen angegeben."
            )}

        </div>


        <div class="detail-section">

            <div class="detail-section-title">
                Gewünschte Position
            </div>

            ${infoBox(
                "Gewünschte Rolle",
                bewerbung.desired_role
            )}

        </div>


        <div class="detail-section">

            <div class="detail-section-title">
                Verfügbarkeit
            </div>

            <div class="info-grid">

                ${infoBox(
                    "Verfügbarkeit",
                    bewerbung.availability
                )}

                ${infoBox(
                    "Nicht verfügbar",
                    bewerbung.unavailable_times
                )}

            </div>

        </div>


        <div class="detail-section">

            <div class="detail-section-title">
                Motivation
            </div>

            ${textBox(
                bewerbung.application_text,
                "Keine Motivation angegeben."
            )}

        </div>


        ${
            bearbeitung
                ? erstelleEntscheidungsbereich(bewerbung)
                : erstelleBearbeitungsInfo(bewerbung)
        }

    `;
              }

// ============================================================
// ENTSCHEIDUNGSBEREICH
// ============================================================

function erstelleEntscheidungsbereich(bewerbung) {

    return `

        <div class="decision-panel">

            <div class="decision-title">
                Entscheidung
            </div>


            <div class="form-group">

                <label for="verwaltungRolle">
                    Rolle bei Ehrenmarkt
                </label>

                <select id="verwaltungRolle">

                    <option value="">
                        Rolle auswählen
                    </option>

                    <option value="Baumeister">
                        Baumeister
                    </option>

                    <option value="Landschaftsbauer">
                        Landschaftsbauer
                    </option>

                    <option value="Farmer">
                        Farmer
                    </option>

                    <option value="Lagerist">
                        Lagerist
                    </option>

                    <option value="Händler">
                        Händler
                    </option>

                    <option value="Redstone">
                        Redstone
                    </option>

                </select>

            </div>


            <div class="form-group">

                <label for="verwaltungRang">
                    Rang
                </label>

                <select id="verwaltungRang">

                    <option value="">
                        Rang auswählen
                    </option>

                    <option value="Mitarbeiter">
                        Mitarbeiter
                    </option>

                    <option value="Erfahrener Mitarbeiter">
                        Erfahrener Mitarbeiter
                    </option>

                    <option value="Teamleitung">
                        Teamleitung
                    </option>

                </select>

            </div>


            <div class="form-group">

                <label for="verwaltungNotiz">
                    Entscheidungsnotiz
                </label>

                <textarea
                    id="verwaltungNotiz"
                    placeholder="Optionaler Kommentar zur Entscheidung..."
                ></textarea>

            </div>


            <div class="decision-buttons">

                <button
                    type="button"
                    class="decision-button accept-button"
                    id="bewerbungAnnehmenButton"
                >
                    ✓ Bewerbung annehmen
                </button>


                <button
                    type="button"
                    class="decision-button reject-button"
                    id="bewerbungAblehnenButton"
                >
                    ✕ Bewerbung ablehnen
                </button>

            </div>


            <div class="preview-note">

                <strong>Hinweis:</strong>

                Bei einer Annahme wird in diesem Schritt zunächst
                nur die Bewerbung bearbeitet.
                Die automatische Anlage des Mitarbeiters in
                <b>employees</b> bauen wir anschließend sicher ein.

            </div>

        </div>

    `;
}


// ============================================================
// BEREITS BEARBEITETE BEWERBUNG
// ============================================================

function erstelleBearbeitungsInfo(bewerbung) {

    return `

        <div class="decision-panel">

            <div class="decision-title">
                Bearbeitungsinformationen
            </div>


            <div class="info-grid">

                ${infoBox(
                    "Zugewiesene Rolle",
                    bewerbung.assigned_role
                )}

                ${infoBox(
                    "Zugewiesener Rang",
                    bewerbung.assigned_rank
                )}

                ${infoBox(
                    "Bearbeitet am",
                    formatiereDatum(
                        bewerbung.processed_at
                    )
                )}

            </div>


            <br>


            ${textBox(
                bewerbung.decision_note,
                "Keine Entscheidungsnotiz vorhanden."
            )}

        </div>

    `;
}


// ============================================================
// ENTSCHEIDUNG AKTIVIEREN
// ============================================================

function registriereEntscheidungsButtons() {

    const annehmen =
        document.getElementById(
            "bewerbungAnnehmenButton"
        );

    const ablehnen =
        document.getElementById(
            "bewerbungAblehnenButton"
        );


    if (annehmen) {

        annehmen.addEventListener(
            "click",
            function () {

                bearbeiteBewerbung(
                    "angenommen"
                );
            }
        );
    }


    if (ablehnen) {

        ablehnen.addEventListener(
            "click",
            function () {

                bearbeiteBewerbung(
                    "abgelehnt"
                );
            }
        );
    }
}


// ============================================================
// ENTSCHEIDUNG DURCHFÜHREN
// ============================================================

async function bearbeiteBewerbung(status) {

    if (!aktuelleBewerbung) {

        zeigeFehler(
            "Bitte wähle zuerst eine Bewerbung aus."
        );

        return;
    }


    if (
        aktuelleBewerbung.status !== "offen"
    ) {

        zeigeFehler(
            "Diese Bewerbung wurde bereits bearbeitet."
        );

        return;
    }


    const supabase =
        holeSupabaseClient();


    if (!supabase) {

        zeigeFehler(
            "Die Verbindung zum Ehrenmarkt-System konnte nicht hergestellt werden."
        );

        return;
    }


    const rolleElement =
        document.getElementById(
            "verwaltungRolle"
        );

    const rangElement =
        document.getElementById(
            "verwaltungRang"
        );

    const notizElement =
        document.getElementById(
            "verwaltungNotiz"
        );


    const rolle =
        rolleElement
            ? rolleElement.value.trim()
            : "";

    const rang =
        rangElement
            ? rangElement.value.trim()
            : "";

    const notiz =
        notizElement
            ? notizElement.value.trim()
            : "";


    if (
        status === "angenommen"
    ) {

        if (!rolle) {

            zeigeFehler(
                "Bitte wähle zuerst eine Rolle aus."
            );

            return;
        }


        if (!rang) {

            zeigeFehler(
                "Bitte wähle zuerst einen Rang aus."
            );

            return;
        }
    }


    const bestaetigung =
        status === "angenommen"
            ? "Möchtest du diese Bewerbung wirklich annehmen?"
            : "Möchtest du diese Bewerbung wirklich ablehnen?";


    if (!confirm(bestaetigung)) {
        return;
    }


    try {

        const updateDaten = {

            status: status,

            processed_by:
                aktuellerBenutzer.id,

            processed_at:
                new Date().toISOString(),

            decision_note:
                notiz || null
        };


        if (status === "angenommen") {

            updateDaten.assigned_role =
                rolle;

            updateDaten.assigned_rank =
                rang;

        } else {

            updateDaten.assigned_role =
                null;

            updateDaten.assigned_rank =
                null;
        }


        const {
            data,
            error
        } = await supabase
            .from("applications")
            .update(updateDaten)
            .eq(
                "id",
                aktuelleBewerbung.id
            )
            .select()
            .single();


        if (error) {
            throw error;
        }


        aktuelleBewerbung =
            data;


        const index =
            bewerbungen.findIndex(
                function (eintrag) {
                    return eintrag.id === data.id;
                }
            );


        if (index !== -1) {
            bewerbungen[index] =
                data;
        }


        aktualisiereStatistik();

        zeigeBewerbungsliste();

        zeigeBewerbungsdetails(
            data
        );


        registriereEntscheidungsButtons();


        alert(
            status === "angenommen"
                ? "Die Bewerbung wurde angenommen."
                : "Die Bewerbung wurde abgelehnt."
        );


    } catch (error) {

        console.error(
            "Fehler beim Bearbeiten der Bewerbung:",
            error
        );


        zeigeFehler(
            "Die Bewerbung konnte nicht bearbeitet werden."
        );
    }
          }

// ============================================================
// INFO-BOX
// ============================================================

function infoBox(label, value) {

    const angezeigterWert =
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
            ? String(value)
            : "–";


    return `

        <div class="info-box">

            <div class="info-label">
                ${esc(label)}
            </div>

            <div class="info-value">
                ${esc(angezeigterWert)}
            </div>

        </div>

    `;
}


// ============================================================
// TEXTBOX
// ============================================================

function textBox(text, leerText) {

    const inhalt =
        text !== null &&
        text !== undefined &&
        String(text).trim() !== ""
            ? String(text)
            : leerText;


    return `

        <div class="text-box">
            ${esc(inhalt)}
        </div>

    `;
}


// ============================================================
// FACHBEREICHE
// ============================================================

function formatiereFachbereiche(wert) {

    if (
        wert === null ||
        wert === undefined ||
        String(wert).trim() === ""
    ) {

        return `
            <span class="skill-tag">
                Keine Angaben
            </span>
        `;
    }


    let werte = [];


    if (Array.isArray(wert)) {

        werte = wert;

    } else {

        const text =
            String(wert).trim();


        try {

            const parsed =
                JSON.parse(text);

            if (Array.isArray(parsed)) {
                werte = parsed;
            } else {
                werte = text.split(",");
            }

        } catch {

            werte =
                text.includes(",")
                    ? text.split(",")
                    : [text];
        }
    }


    werte =
        werte
            .map(
                function (eintrag) {
                    return String(eintrag).trim();
                }
            )
            .filter(Boolean);


    if (werte.length === 0) {

        return `
            <span class="skill-tag">
                Keine Angaben
            </span>
        `;
    }


    return werte
        .map(
            function (eintrag) {

                return `
                    <span class="skill-tag">
                        ${esc(eintrag)}
                    </span>
                `;
            }
        )
        .join("");
}


// ============================================================
// HTML SICHER AUSGEBEN
// ============================================================

function esc(wert) {

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
// NACH DETAIL-RENDERING BUTTONS REGISTRIEREN
// ============================================================

const originalZeigeBewerbungsdetails =
    zeigeBewerbungsdetails;


// ============================================================
// INITIALISIERUNG
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "EHRENMARKT: Bewerbungsverwaltung wird gestartet."
        );


        client =
            window.supabaseClient;


        if (!client) {

            zeigeFehler(
                "Das Ehrenmarkt-System konnte nicht geladen werden."
            );

            return;
        }


        const user =
            await ladeAktuellenBenutzer();


        if (!user) {
            return;
        }


        const darfVerwalten =
            await pruefeStadtleitung();


        if (!darfVerwalten) {
            return;
        }


        await ladeBewerbungen();
    }
);


// ============================================================
// BUTTONS NACH DETAILANSICHT VERBINDEN
// ============================================================

const beobachter =
    new MutationObserver(
        function () {

            if (
                aktuelleBewerbung &&
                aktuelleBewerbung.status === "offen"
            ) {

                registriereEntscheidungsButtons();
            }
        }
    );


document.addEventListener(
    "DOMContentLoaded",
    function () {

        const details =
            document.getElementById(
                "detailsContent"
            );

        if (details) {

            beobachter.observe(
                details,
                {
                    childList: true,
                    subtree: true
                }
            );
        }
    }
);
