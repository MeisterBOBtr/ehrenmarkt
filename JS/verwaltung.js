// ============================================================
// EHRENMARKT – VERWALTUNG
// verwaltung.js
// TEIL 1 VON 5
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Ehrenmarkt Verwaltung – JavaScript gestartet.");


    // ========================================================
    // SUPABASE
    // ========================================================

    const supabase =
        window.supabaseClient;


    if (!supabase) {

        console.error(
            "Supabase Client wurde nicht gefunden."
        );

        zeigeZugriffsfehler(
            "Die Verbindung zu Ehrenmarkt konnte nicht hergestellt werden."
        );

        return;
    }


    // ========================================================
    // ELEMENTE
    // ========================================================

    const accessMessage =
        document.getElementById("accessMessage");


    const navButtons =
        document.querySelectorAll(".nav-button");


    const sections =
        document.querySelectorAll(".admin-section");


    // ========================================================
    // BENUTZER / SESSION
    // ========================================================

    let user = null;
    let mitarbeiter = null;


    try {

        const {
            data,
            error
        } =
            await supabase.auth.getUser();


        if (error) {
            throw error;
        }


        user =
            data?.user || null;


    } catch (error) {

        console.error(
            "Fehler beim Prüfen der Anmeldung:",
            error
        );

        zeigeZugriffsfehler(
            "Deine Anmeldung konnte nicht überprüft werden."
        );

        return;
    }


    // ========================================================
    // NICHT ANGEMELDET
    // ========================================================

    if (!user) {

        zeigeZugriffsfehler(
            "Du musst angemeldet sein, um die Verwaltung zu öffnen."
        );

        return;
    }


    console.log(
        "Angemeldeter Benutzer:",
        user.id
    );


    // ========================================================
    // MITARBEITERDATEN LADEN
    // ========================================================

    try {

        const {
            data,
            error
        } =
            await supabase
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


        if (error) {
            throw error;
        }


        mitarbeiter =
            data || null;


    } catch (error) {

        console.error(
            "Fehler beim Laden der Mitarbeiterdaten:",
            error
        );

        zeigeZugriffsfehler(
            "Deine Mitarbeiterdaten konnten nicht geladen werden."
        );

        return;
    }


    // ========================================================
    // KEIN AKTIVER MITARBEITER
    // ========================================================

    if (!mitarbeiter) {

        zeigeZugriffsfehler(
            "Für deinen Account wurde kein aktiver Mitarbeiter gefunden."
        );

        return;
    }


    console.log(
        "Mitarbeiter:",
        mitarbeiter
    );


    // ========================================================
    // BERECHTIGUNG PRÜFEN
    // ========================================================

    const erlaubteRaenge = [
        "Leitung",
        "Stadtleitung"
    ];


    const darfVerwalten =
        erlaubteRaenge.includes(
            mitarbeiter.rang
        );


    if (!darfVerwalten) {

        zeigeZugriffsfehler(
            "Du hast keine Berechtigung für die Verwaltung."
        );

        return;
    }


    // ========================================================
    // ZUGRIFF ERLAUBT
    // ========================================================

    if (accessMessage) {

        accessMessage.textContent =
            `Angemeldet als ${mitarbeiter.name} · ${mitarbeiter.rang}`;

        accessMessage.style.background =
            "rgba(45, 75, 30, 0.45)";

        accessMessage.style.borderColor =
            "#607844";

        accessMessage.style.color =
            "#c6d8a9";
    }


    console.log(
        "Verwaltungszugriff erlaubt."
    );


    // ========================================================
    // NAVIGATION
    // ========================================================

    navButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const ziel =
                        button.dataset.section;


                    if (!ziel) {
                        return;
                    }


                    // Alle Buttons deaktivieren

                    navButtons.forEach(
                        (item) => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    // Alle Bereiche verstecken

                    sections.forEach(
                        (section) => {

                            section.classList.remove(
                                "active"
                            );

                        }
                    );


                    // Aktiven Button markieren

                    button.classList.add(
                        "active"
                    );


                    // Zielbereich anzeigen

                    const zielBereich =
                        document.getElementById(
                            "section-" + ziel
                        );


                    if (zielBereich) {

                        zielBereich.classList.add(
                            "active"
                        );

                    }


                    console.log(
                        "Verwaltungsbereich geöffnet:",
                        ziel
                    );

                }
            );

        }
    );


    // ========================================================
    // FEHLER BEI ZUGRIFF
    // ========================================================

    function zeigeZugriffsfehler(nachricht) {

        if (!accessMessage) {
            return;
        }


        accessMessage.textContent =
            nachricht;


        accessMessage.style.background =
            "rgba(100, 30, 30, 0.45)";


        accessMessage.style.borderColor =
            "#7d3030";


        accessMessage.style.color =
            "#e4aaa0";


        navButtons.forEach(
            (button) => {

                button.disabled = true;

                button.style.opacity =
                    "0.45";

            }
        );


        sections.forEach(
            (section) => {

                section.classList.remove(
                    "active"
                );

            }
        );

    }


    // ========================================================
    // HILFSFUNKTIONEN
    // ========================================================

    window.verwaltungZeigeFehler =
        function(nachricht, elementId) {

            const element =
                document.getElementById(
                    elementId
                );


            if (!element) {
                return;
            }


            element.textContent =
                nachricht;


            element.className =
                "message error";


            element.style.display =
                "block";

        };


    window.verwaltungZeigeErfolg =
        function(nachricht, elementId) {

            const element =
                document.getElementById(
                    elementId
                );


            if (!element) {
                return;
            }


            element.textContent =
                nachricht;


            element.className =
                "message success";


            element.style.display =
                "block";

        };


    window.verwaltungMeldungAusblenden =
        function(elementId) {

            const element =
                document.getElementById(
                    elementId
                );


            if (!element) {
                return;
            }


            element.style.display =
                "none";

        };


    // ========================================================
    // DATUM FORMATIEREN
    // ========================================================

    window.verwaltungDatum =
        function(wert) {

            if (!wert) {
                return "—";
            }


            const datum =
                new Date(wert);


            if (Number.isNaN(
                datum.getTime()
            )) {

                return wert;

            }


            return datum.toLocaleString(
                "de-DE",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            );

        };


    // ========================================================
    // GELD FORMATIEREN
    // ========================================================

    window.verwaltungPreis =
        function(wert) {

            if (
                wert === null ||
                wert === undefined ||
                wert === ""
            ) {

                return "—";

            }


            const nummer =
                Number(wert);


            if (Number.isNaN(nummer)) {
                return wert;
            }


            return nummer.toLocaleString(
                "de-DE",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            ) + " $";

        };


    // ========================================================
    // TEXT SICHER FÜR HTML MACHEN
    // ========================================================

    window.verwaltungEscape =
        function(text) {

            if (
                text === null ||
                text === undefined
            ) {

                return "";

            }


            const div =
                document.createElement("div");


            div.textContent =
                String(text);


            return div.innerHTML;

        };


    // ========================================================
    // STARTWERTE
    // ========================================================

    console.log(
        "Verwaltung Grundsystem erfolgreich geladen."
    );

});


// ============================================================
// EHRENMARKT – VERWALTUNG
// TEIL 2 VON 5
// BEWERBUNGSVERWALTUNG
// ============================================================


// ============================================================
// BEWERBUNGEN LADEN
// ============================================================

async function ladeBewerbungen() {

    const liste =
        document.getElementById("bewerbungenListe");

    if (!liste) {
        return;
    }


    liste.innerHTML =
        '<div class="loading">Bewerbungen werden geladen...</div>';


    try {

        const {
            data,
            error
        } =
            await supabase
                .from("applications")
                .select("*")
                .order("created_at", {
                    ascending: false
                });


        if (error) {
            throw error;
        }


        const bewerbungen =
            data || [];


        // Statistiken

        const offen =
            bewerbungen.filter(
                b => b.status === "offen"
            ).length;


        const angenommen =
            bewerbungen.filter(
                b => b.status === "angenommen"
            ).length;


        const abgelehnt =
            bewerbungen.filter(
                b => b.status === "abgelehnt"
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
            bewerbungen.length
        );


        // Keine Bewerbungen

        if (bewerbungen.length === 0) {

            liste.innerHTML = `
                <div class="empty-message">
                    Es liegen derzeit keine Bewerbungen vor.
                </div>
            `;

            return;
        }


        // Liste erstellen

        liste.innerHTML =
            bewerbungen
                .map(
                    bewerbung =>
                        erstelleBewerbungKarte(
                            bewerbung
                        )
                )
                .join("");


    } catch (error) {

        console.error(
            "Fehler beim Laden der Bewerbungen:",
            error
        );


        liste.innerHTML = `
            <div class="empty-message">
                Bewerbungen konnten nicht geladen werden.<br><br>
                ${verwaltungEscape(
                    error.message ||
                    "Unbekannter Fehler"
                )}
            </div>
        `;

    }

}


// ============================================================
// BEWERBUNGSKARTE
// ============================================================

function erstelleBewerbungKarte(
    bewerbung
) {

    const status =
        String(
            bewerbung.status || "offen"
        ).toLowerCase();


    let statusText =
        "Offen";


    if (status === "angenommen") {
        statusText = "Angenommen";
    }


    if (status === "abgelehnt") {
        statusText = "Abgelehnt";
    }


    return `

        <div
            class="list-item"
            data-bewerbung-id="${bewerbung.id}"
        >

            <h3>
                ${verwaltungEscape(
                    bewerbung.name ||
                    "Unbekannter Bewerber"
                )}
            </h3>


            <p>
                <strong>Minecraft:</strong>
                ${verwaltungEscape(
                    bewerbung.minecraft_name ||
                    "—"
                )}
            </p>


            <p>
                <strong>Alter:</strong>
                ${verwaltungEscape(
                    bewerbung.age ??
                    "—"
                )}
            </p>


            <p>
                <strong>Gewünschte Rolle:</strong>
                ${verwaltungEscape(
                    bewerbung.desired_role ||
                    "—"
                )}
            </p>


            <p>
                <strong>Status:</strong>
                ${verwaltungEscape(
                    statusText
                )}
            </p>


            <p>
                <strong>Eingegangen:</strong>
                ${verwaltungDatum(
                    bewerbung.created_at
                )}
            </p>


            <div class="button-row">

                <button
                    type="button"
                    class="action-button"
                    onclick="zeigeBewerbungDetails(${bewerbung.id})"
                >
                    Details
                </button>


                ${
                    status === "offen"
                    ?
                    `
                    <button
                        type="button"
                        class="action-button success"
                        onclick="bewerbungAnnehmen(${bewerbung.id})"
                    >
                        Annehmen
                    </button>


                    <button
                        type="button"
                        class="action-button danger"
                        onclick="bewerbungAblehnen(${bewerbung.id})"
                    >
                        Ablehnen
                    </button>
                    `
                    :
                    ""
                }


                <button
                    type="button"
                    class="action-button danger"
                    onclick="bewerbungLoeschen(${bewerbung.id})"
                >
                    Löschen
                </button>

            </div>

        </div>

    `;

}


// ============================================================
// BEWERBUNGSDETAILS
// ============================================================

window.zeigeBewerbungDetails =
    async function(id) {

        const panel =
            document.getElementById(
                "bewerbungDetails"
            );


        const content =
            document.getElementById(
                "bewerbungDetailsContent"
            );


        if (!panel || !content) {
            return;
        }


        content.innerHTML =
            '<div class="loading">Details werden geladen...</div>';


        panel.classList.add("active");


        try {

            const {
                data,
                error
            } =
                await supabase
                    .from("applications")
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();


            if (error) {
                throw error;
            }


            if (!data) {

                content.innerHTML = `
                    <div class="empty-message">
                        Bewerbung wurde nicht gefunden.
                    </div>
                `;

                return;
            }


            content.innerHTML = `

                <div class="list-item">

                    <h3>
                        ${verwaltungEscape(
                            data.name || "—"
                        )}
                    </h3>


                    <p>
                        <strong>Minecraft-Name:</strong><br>
                        ${verwaltungEscape(
                            data.minecraft_name || "—"
                        )}
                    </p>


                    <p>
                        <strong>Discord-ID:</strong><br>
                        ${verwaltungEscape(
                            data.discord_id || "—"
                        )}
                    </p>


                    <p>
                        <strong>Alter:</strong><br>
                        ${verwaltungEscape(
                            data.age ?? "—"
                        )}
                    </p>


                    <p>
                        <strong>Erfahrung:</strong><br>
                        ${verwaltungEscape(
                            data.experience || "—"
                        )}
                    </p>


                    <p>
                        <strong>Bisherige Arbeiten:</strong><br>
                        ${verwaltungEscape(
                            data.previous_work || "—"
                        )}
                    </p>


                    <p>
                        <strong>Gewünschte Rolle:</strong><br>
                        ${verwaltungEscape(
                            data.desired_role || "—"
                        )}
                    </p>


                    <p>
                        <strong>Weitere Fähigkeiten:</strong><br>
                        ${verwaltungEscape(
                            data.additional_skills || "—"
                        )}
                    </p>


                    <p>
                        <strong>Bewerbungstext:</strong><br>
                        ${verwaltungEscape(
                            data.application_text || "—"
                        )}
                    </p>


                    <p>
                        <strong>Verfügbarkeit:</strong><br>
                        ${verwaltungEscape(
                            data.availability || "—"
                        )}
                    </p>


                    <p>
                        <strong>Nicht verfügbar:</strong><br>
                        ${verwaltungEscape(
                            data.unavailable_times || "—"
                        )}
                    </p>


                    <p>
                        <strong>Status:</strong><br>
                        ${verwaltungEscape(
                            data.status || "—"
                        )}
                    </p>


                    <p>
                        <strong>Entscheidungsnotiz:</strong><br>
                        ${verwaltungEscape(
                            data.decision_note || "—"
                        )}
                    </p>


                    <p>
                        <strong>Eingereicht:</strong><br>
                        ${verwaltungDatum(
                            data.created_at
                        )}
                    </p>


                    <p>
                        <strong>Bearbeitet:</strong><br>
                        ${verwaltungDatum(
                            data.processed_at
                        )}
                    </p>


                    <div class="button-row">

                        <button
                            type="button"
                            class="action-button"
                            onclick="schliesseBewerbungDetails()"
                        >
                            Schließen
                        </button>

                    </div>

                </div>

            `;


        } catch (error) {

            console.error(
                "Fehler bei den Bewerbungsdetails:",
                error
            );


            content.innerHTML = `

                <div class="empty-message">

                    Die Bewerbungsdetails konnten
                    nicht geladen werden.

                    <br><br>

                    ${verwaltungEscape(
                        error.message ||
                        "Unbekannter Fehler"
                    )}

                </div>

            `;

        }

    };


// ============================================================
// DETAILS SCHLIESSEN
// ============================================================

window.schliesseBewerbungDetails =
    function() {

        const panel =
            document.getElementById(
                "bewerbungDetails"
            );


        if (panel) {

            panel.classList.remove(
                "active"
            );

        }

    };


// ============================================================
// BEWERBUNG ANNEHMEN
// ============================================================

window.bewerbungAnnehmen =
    async function(id) {

        if (
            !confirm(
                "Diese Bewerbung wirklich annehmen?"
            )
        ) {
            return;
        }


        try {

            const {
                data: bewerbung,
                error: ladenFehler
            } =
                await supabase
                    .from("applications")
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();


            if (ladenFehler) {
                throw ladenFehler;
            }


            if (!bewerbung) {

                throw new Error(
                    "Die Bewerbung wurde nicht gefunden."
                );

            }


            // Bereits angenommen?

            if (
                String(
                    bewerbung.status
                ).toLowerCase() === "angenommen"
            ) {

                throw new Error(
                    "Diese Bewerbung wurde bereits angenommen."
                );

            }


            // Rolle bestimmen

            const rolle =
                bewerbung.assigned_role ||
                bewerbung.desired_role ||
                "Mitarbeiter";


            const rang =
                bewerbung.assigned_rank ||
                "Mitarbeiter";


            // Mitarbeiter erstellen

            const {
                data: neuerMitarbeiter,
                error: mitarbeiterFehler
            } =
                await supabase
                    .from("employees")
                    .insert({

                        user_id:
                            bewerbung.user_id,

                        name:
                            bewerbung.name,

                        role:
                            rolle,

                        rang:
                            rang,

                        is_active:
                            true,

                        is_available:
                            false

                    })
                    .select()
                    .single();


            if (mitarbeiterFehler) {

                // Falls bereits ein Mitarbeiter existiert,
                // Bewerbung trotzdem nicht einfach doppelt
                // anlegen.

                if (
                    mitarbeiterFehler.code ===
                    "23505"
                ) {

                    throw new Error(
                        "Für diesen Benutzer existiert bereits ein Mitarbeiter."
                    );

                }


                throw mitarbeiterFehler;
            }


            // Bewerbung aktualisieren

            const {
                error: updateFehler
            } =
                await supabase
                    .from("applications")
                    .update({

                        status:
                            "angenommen",

                        assigned_role:
                            rolle,

                        assigned_rank:
                            rang,

                        processed_by:
                            user.id,

                        processed_at:
                            new Date().toISOString(),

                        updated_at:
                            new Date().toISOString()

                    })
                    .eq("id", id);


            if (updateFehler) {
                throw updateFehler;
            }


            alert(
                "Bewerbung wurde angenommen und der Mitarbeiter wurde angelegt."
            );


            await ladeBewerbungen();


            schliesseBewerbungDetails();


        } catch (error) {

            console.error(
                "Fehler beim Annehmen der Bewerbung:",
                error
            );


            alert(
                "Die Bewerbung konnte nicht angenommen werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// BEWERBUNG ABLEHNEN
// ============================================================

window.bewerbungAblehnen =
    async function(id) {

        const notiz =
            prompt(
                "Optionale Begründung für die Ablehnung:"
            );


        if (notiz === null) {
            return;
        }


        if (
            !confirm(
                "Diese Bewerbung wirklich ablehnen?"
            )
        ) {
            return;
        }


        try {

            const {
                error
            } =
                await supabase
                    .from("applications")
                    .update({

                        status:
                            "abgelehnt",

                        processed_by:
                            user.id,

                        processed_at:
                            new Date().toISOString(),

                        decision_note:
                            notiz.trim() || null,

                        updated_at:
                            new Date().toISOString()

                    })
                    .eq("id", id)
                    .eq("status", "offen");


            if (error) {
                throw error;
            }


            alert(
                "Bewerbung wurde abgelehnt."
            );


            await ladeBewerbungen();


            schliesseBewerbungDetails();


        } catch (error) {

            console.error(
                "Fehler beim Ablehnen der Bewerbung:",
                error
            );


            alert(
                "Die Bewerbung konnte nicht abgelehnt werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// BEWERBUNG LÖSCHEN
// ============================================================

window.bewerbungLoeschen =
    async function(id) {

        if (
            !confirm(
                "Diese Bewerbung wirklich dauerhaft löschen?"
            )
        ) {
            return;
        }


        try {

            const {
                error
            } =
                await supabase
                    .from("applications")
                    .delete()
                    .eq("id", id);


            if (error) {
                throw error;
            }


            alert(
                "Bewerbung wurde gelöscht."
            );


            await ladeBewerbungen();


            schliesseBewerbungDetails();


        } catch (error) {

            console.error(
                "Fehler beim Löschen der Bewerbung:",
                error
            );


            alert(
                "Die Bewerbung konnte nicht gelöscht werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// HILFSFUNKTION FÜR STATISTIKEN
// ============================================================

function setzeWert(
    elementId,
    wert
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            String(wert);

    }

}


// ============================================================
// BEWERBUNGEN BEIM START LADEN
// ============================================================

ladeBewerbungen();

// ============================================================
// EHRENMARKT – VERWALTUNG
// TEIL 3 VON 5
// AUFTRAGSVERWALTUNG
// ============================================================


// ============================================================
// AUFTRÄGE – AKTUELLE LISTE
// ============================================================

let aktuellerAuftragstyp = null;
let aktuelleAuftraege = [];


// ============================================================
// AUFTRAGSTYPEN
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


// ============================================================
// AUFTRAGSART ÖFFNEN
// ============================================================

async function ladeAuftraege(
    typ
) {

    const konfiguration =
        auftragTabellen[typ];


    if (!konfiguration) {

        console.error(
            "Unbekannter Auftragstyp:",
            typ
        );

        return;
    }


    aktuellerAuftragstyp =
        typ;


    const liste =
        document.getElementById(
            "auftraegeListe"
        );


    if (!liste) {
        return;
    }


    liste.innerHTML =
        `
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
        } =
            await supabase
                .from(konfiguration.tabelle)
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


        aktuelleAuftraege =
            data || [];


        aktualisiereAuftragsStatistik();


        if (
            aktuelleAuftraege.length === 0
        ) {

            liste.innerHTML =
                `
                <div class="empty-message">
                    Keine ${verwaltungEscape(
                        konfiguration.name
                    )} vorhanden.
                </div>
                `;

            return;
        }


        liste.innerHTML =
            aktuelleAuftraege
                .map(
                    auftrag =>
                        erstelleAuftragsKarte(
                            auftrag,
                            typ
                        )
                )
                .join("");


    } catch (error) {

        console.error(
            "Fehler beim Laden der Aufträge:",
            error
        );


        liste.innerHTML =
            `
            <div class="empty-message">

                ${verwaltungEscape(
                    konfiguration.name
                )}
                konnten nicht geladen werden.

                <br><br>

                ${verwaltungEscape(
                    error.message ||
                    "Unbekannter Fehler"
                )}

            </div>
            `;

    }

}


// ============================================================
// AUFTRAGSKARTE
// ============================================================

function erstelleAuftragsKarte(
    auftrag,
    typ
) {

    const status =
        auftrag.status ||
        "Unbekannt";


    const id =
        auftrag.id;


    const name =
        auftrag.name ||
        auftrag.title ||
        auftrag.order_name ||
        auftrag.project_name ||
        `${auftragTabellen[typ].name} #${id}`;


    const kunde =
        auftrag.customer_name ||
        auftrag.user_name ||
        auftrag.name ||
        "—";


    const mitarbeiter =
        auftrag.employee_name ||
        "Noch nicht übernommen";


    return `

        <div
            class="list-item"
            data-auftrag-id="${verwaltungEscape(id)}"
        >

            <h3>
                ${verwaltungEscape(name)}
            </h3>


            <p>
                <strong>Auftrags-ID:</strong>
                ${verwaltungEscape(id)}
            </p>


            <p>
                <strong>Kunde:</strong>
                ${verwaltungEscape(kunde)}
            </p>


            <p>
                <strong>Status:</strong>
                ${verwaltungEscape(status)}
            </p>


            <p>
                <strong>Mitarbeiter:</strong>
                ${verwaltungEscape(mitarbeiter)}
            </p>


            <p>
                <strong>Erstellt:</strong>
                ${verwaltungDatum(
                    auftrag.created_at
                )}
            </p>


            <div class="button-row">

                <button
                    type="button"
                    class="action-button"
                    onclick="zeigeAuftragDetails('${verwaltungEscape(
                        id
                    )}')"
                >
                    Details
                </button>


                <button
                    type="button"
                    class="action-button"
                    onclick="auftragStatusAendern('${verwaltungEscape(
                        id
                    )}')"
                >
                    Status ändern
                </button>


                <button
                    type="button"
                    class="action-button danger"
                    onclick="auftragLoeschen('${verwaltungEscape(
                        id
                    )}')"
                >
                    Löschen
                </button>

            </div>

        </div>

    `;

}


// ============================================================
// AUFTRAG DETAILS
// ============================================================

window.zeigeAuftragDetails =
    async function(id) {

        if (!aktuellerAuftragstyp) {

            alert(
                "Bitte zuerst eine Auftragsart auswählen."
            );

            return;
        }


        const konfiguration =
            auftragTabellen[
                aktuellerAuftragstyp
            ];


        const panel =
            document.getElementById(
                "auftragDetails"
            );


        const content =
            document.getElementById(
                "auftragDetailsContent"
            );


        if (!panel || !content) {
            return;
        }


        panel.classList.add(
            "active"
        );


        content.innerHTML =
            `
            <div class="loading">
                Auftragsdetails werden geladen...
            </div>
            `;


        try {

            const {
                data,
                error
            } =
                await supabase
                    .from(
                        konfiguration.tabelle
                    )
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();


            if (error) {
                throw error;
            }


            if (!data) {

                content.innerHTML =
                    `
                    <div class="empty-message">
                        Auftrag wurde nicht gefunden.
                    </div>
                    `;

                return;
            }


            const felder =
                Object.entries(data);


            let html = "";


            felder.forEach(
                ([schluessel, wert]) => {

                    if (
                        wert === null ||
                        wert === undefined ||
                        wert === ""
                    ) {

                        wert = "—";

                    }


                    html += `

                        <p>
                            <strong>
                                ${verwaltungEscape(
                                    schluessel
                                )}:
                            </strong><br>

                            ${verwaltungEscape(
                                wert
                            )}
                        </p>

                    `;

                }
            );


            content.innerHTML =
                `

                <div class="list-item">

                    ${html}

                    <div class="button-row">

                        <button
                            type="button"
                            class="action-button"
                            onclick="schliesseAuftragDetails()"
                        >
                            Schließen
                        </button>

                    </div>

                </div>

                `;


        } catch (error) {

            console.error(
                "Fehler beim Laden der Auftragsdetails:",
                error
            );


            content.innerHTML =
                `
                <div class="empty-message">

                    Auftragsdetails konnten
                    nicht geladen werden.

                    <br><br>

                    ${verwaltungEscape(
                        error.message ||
                        "Unbekannter Fehler"
                    )}

                </div>
                `;

        }

    };


// ============================================================
// AUFTRAGSDETAILS SCHLIESSEN
// ============================================================

window.schliesseAuftragDetails =
    function() {

        const panel =
            document.getElementById(
                "auftragDetails"
            );


        if (panel) {

            panel.classList.remove(
                "active"
            );

        }

    };


// ============================================================
// STATUS ÄNDERN
// ============================================================

window.auftragStatusAendern =
    async function(id) {

        if (!aktuellerAuftragstyp) {
            return;
        }


        const konfiguration =
            auftragTabellen[
                aktuellerAuftragstyp
            ];


        const neuerStatus =
            prompt(
                "Neuen Status eingeben:",
                "In Bearbeitung"
            );


        if (
            neuerStatus === null
        ) {
            return;
        }


        const status =
            neuerStatus.trim();


        if (!status) {

            alert(
                "Bitte einen Status eingeben."
            );

            return;
        }


        try {

            const {
                error
            } =
                await supabase
                    .from(
                        konfiguration.tabelle
                    )
                    .update({
                        status: status
                    })
                    .eq(
                        "id",
                        id
                    );


            if (error) {
                throw error;
            }


            alert(
                "Status wurde erfolgreich geändert."
            );


            await ladeAuftraege(
                aktuellerAuftragstyp
            );


        } catch (error) {

            console.error(
                "Fehler beim Ändern des Status:",
                error
            );


            alert(
                "Der Status konnte nicht geändert werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// AUFTRAG LÖSCHEN
// ============================================================

window.auftragLoeschen =
    async function(id) {

        if (!aktuellerAuftragstyp) {
            return;
        }


        const konfiguration =
            auftragTabellen[
                aktuellerAuftragstyp
            ];


        if (
            !confirm(
                `${konfiguration.name.slice(
                    0,
                    -1
                )} wirklich dauerhaft löschen?`
            )
        ) {

            return;

        }


        try {

            const {
                error
            } =
                await supabase
                    .from(
                        konfiguration.tabelle
                    )
                    .delete()
                    .eq(
                        "id",
                        id
                    );


            if (error) {
                throw error;
            }


            alert(
                "Auftrag wurde gelöscht."
            );


            await ladeAuftraege(
                aktuellerAuftragstyp
            );


            schliesseAuftragDetails();


        } catch (error) {

            console.error(
                "Fehler beim Löschen des Auftrags:",
                error
            );


            alert(
                "Der Auftrag konnte nicht gelöscht werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// AUFTRAGSSTATISTIK
// ============================================================

function aktualisiereAuftragsStatistik() {

    const alle =
        aktuelleAuftraege;


    const offen =
        alle.filter(
            auftrag =>
                String(
                    auftrag.status || ""
                ).toLowerCase() === "offen"
        ).length;


    const bearbeitung =
        alle.filter(
            auftrag =>
                String(
                    auftrag.status || ""
                ).toLowerCase()
                === "in bearbeitung"
        ).length;


    const abgeschlossen =
        alle.filter(
            auftrag =>
                String(
                    auftrag.status || ""
                ).toLowerCase()
                === "abgeschlossen"
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
        alle.length
    );

}


// ============================================================
// BUTTONS FÜR AUFTRÄGE
// ============================================================

const bauButton =
    document.getElementById(
        "bauauftraegeAnzeigen"
    );


if (bauButton) {

    bauButton.addEventListener(
        "click",
        () => {

            ladeAuftraege("bau");

        }
    );

}


const materialButton =
    document.getElementById(
        "materialauftraegeAnzeigen"
    );


if (materialButton) {

    materialButton.addEventListener(
        "click",
        () => {

            ladeAuftraege("material");

        }
    );

}


const redstoneButton =
    document.getElementById(
        "redstoneAuftraegeAnzeigen"
    );


if (redstoneButton) {

    redstoneButton.addEventListener(
        "click",
        () => {

            ladeAuftraege("redstone");

        }
    );

}


const logistikButton =
    document.getElementById(
        "logistikAuftraegeAnzeigen"
    );


if (logistikButton) {

    logistikButton.addEventListener(
        "click",
        () => {

            ladeAuftraege("logistik");

        }
    );

}

// ============================================================
// EHRENMARKT – VERWALTUNG
// TEIL 4 VON 5
// MITARBEITER + PREISVERWALTUNG
// ============================================================


// ============================================================
// MITARBEITER LADEN
// ============================================================

async function ladeMitarbeiter() {

    const liste =
        document.getElementById(
            "mitarbeiterListe"
        );


    if (!liste) {
        return;
    }


    liste.innerHTML =
        `
        <div class="loading">
            Mitarbeiter werden geladen...
        </div>
        `;


    try {

        const {
            data,
            error
        } =
            await supabase
                .from("employees")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        const mitarbeiterListe =
            data || [];


        // ====================================================
        // STATISTIKEN
        // ====================================================

        const aktiv =
            mitarbeiterListe.filter(
                person =>
                    person.is_active === true
            ).length;


        const inaktiv =
            mitarbeiterListe.filter(
                person =>
                    person.is_active !== true
            ).length;


        const verfuegbar =
            mitarbeiterListe.filter(
                person =>
                    person.is_active === true &&
                    person.is_available === true
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
            mitarbeiterListe.length
        );


        setzeWert(
            "mitarbeiterVerfuegbar",
            verfuegbar
        );


        // ====================================================
        // KEINE MITARBEITER
        // ====================================================

        if (
            mitarbeiterListe.length === 0
        ) {

            liste.innerHTML =
                `
                <div class="empty-message">
                    Es wurden noch keine Mitarbeiter angelegt.
                </div>
                `;

            return;
        }


        // ====================================================
        // KARTEN
        // ====================================================

        liste.innerHTML =
            mitarbeiterListe
                .map(
                    person =>
                        erstelleMitarbeiterKarte(
                            person
                        )
                )
                .join("");


    } catch (error) {

        console.error(
            "Fehler beim Laden der Mitarbeiter:",
            error
        );


        liste.innerHTML =
            `
            <div class="empty-message">

                Mitarbeiter konnten nicht geladen werden.

                <br><br>

                ${verwaltungEscape(
                    error.message ||
                    "Unbekannter Fehler"
                )}

            </div>
            `;

    }

}


// ============================================================
// MITARBEITER-KARTE
// ============================================================

function erstelleMitarbeiterKarte(
    person
) {

    const aktiv =
        person.is_active === true;


    const verfuegbar =
        person.is_available === true;


    return `

        <div
            class="employee-card"
            data-mitarbeiter-id="${verwaltungEscape(
                person.id
            )}"
        >

            <h3>
                ${verwaltungEscape(
                    person.name ||
                    "Unbekannter Mitarbeiter"
                )}
            </h3>


            <p>
                <strong>Rolle:</strong>
                ${verwaltungEscape(
                    person.role ||
                    "—"
                )}
            </p>


            <p>
                <strong>Rang:</strong>
                ${verwaltungEscape(
                    person.rang ||
                    "—"
                )}
            </p>


            <p>
                <strong>Status:</strong>
                ${
                    aktiv
                    ? "Aktiv"
                    : "Inaktiv"
                }
            </p>


            <p>
                <strong>Verfügbarkeit:</strong>
                ${
                    verfuegbar
                    ? "Verfügbar"
                    : "Nicht verfügbar"
                }
            </p>


            <p>
                <strong>Arbeitszeit:</strong>
                ${verwaltungArbeitszeit(
                    person.total_work_minutes
                )}
            </p>


            <div class="button-row">

                <button
                    type="button"
                    class="action-button"
                    onclick="mitarbeiterBearbeiten('${verwaltungEscape(
                        person.id
                    )}')"
                >
                    Bearbeiten
                </button>


                <button
                    type="button"
                    class="action-button"
                    onclick="mitarbeiterAktivStatus('${verwaltungEscape(
                        person.id
                    )}', ${aktiv})"
                >
                    ${
                        aktiv
                        ? "Deaktivieren"
                        : "Aktivieren"
                    }
                </button>

            </div>

        </div>

    `;

}


// ============================================================
// ARBEITSZEIT FORMATIEREN
// ============================================================

window.verwaltungArbeitszeit =
    function(minuten) {

        const wert =
            Number(minuten || 0);


        if (!Number.isFinite(wert)) {
            return "0 Std. 0 Min.";
        }


        const stunden =
            Math.floor(
                wert / 60
            );


        const rest =
            wert % 60;


        return `${stunden} Std. ${rest} Min.`;

    };


// ============================================================
// MITARBEITER BEARBEITEN
// ============================================================

window.mitarbeiterBearbeiten =
    async function(id) {

        const panel =
            document.getElementById(
                "mitarbeiterDetails"
            );


        const content =
            document.getElementById(
                "mitarbeiterDetailsContent"
            );


        if (!panel || !content) {
            return;
        }


        panel.classList.add(
            "active"
        );


        content.innerHTML =
            `
            <div class="loading">
                Mitarbeiterdaten werden geladen...
            </div>
            `;


        try {

            const {
                data,
                error
            } =
                await supabase
                    .from("employees")
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();


            if (error) {
                throw error;
            }


            if (!data) {

                throw new Error(
                    "Mitarbeiter wurde nicht gefunden."
                );

            }


            content.innerHTML =
                `

                <div class="list-item">

                    <h3>
                        ${verwaltungEscape(
                            data.name || "—"
                        )}
                    </h3>


                    <p>
                        <strong>Benutzer-ID:</strong><br>
                        ${verwaltungEscape(
                            data.user_id || "—"
                        )}
                    </p>


                    <p>
                        <strong>Rolle:</strong><br>
                        ${verwaltungEscape(
                            data.role || "—"
                        )}
                    </p>


                    <p>
                        <strong>Rang:</strong><br>
                        ${verwaltungEscape(
                            data.rang || "—"
                        )}
                    </p>


                    <p>
                        <strong>Aktiv:</strong>
                        ${
                            data.is_active
                            ? "Ja"
                            : "Nein"
                        }
                    </p>


                    <p>
                        <strong>Verfügbar:</strong>
                        ${
                            data.is_available
                            ? "Ja"
                            : "Nein"
                        }
                    </p>


                    <div class="button-row">

                        <button
                            type="button"
                            class="action-button success"
                            onclick="mitarbeiterDatenSpeichern('${verwaltungEscape(
                                data.id
                            )}')"
                        >
                            Änderungen speichern
                        </button>


                        <button
                            type="button"
                            class="action-button"
                            onclick="schliesseMitarbeiterDetails()"
                        >
                            Schließen
                        </button>

                    </div>


                    <div
                        id="mitarbeiterBearbeitenForm"
                        style="margin-top: 18px;"
                    >

                        <p>
                            <strong>Rolle</strong>
                        </p>

                        <input
                            id="bearbeitenRolle"
                            class="search-input"
                            type="text"
                            value="${verwaltungEscape(
                                data.role || ""
                            )}"
                            style="width: 100%; margin-top: 7px;"
                        >


                        <p style="margin-top: 14px;">
                            <strong>Rang</strong>
                        </p>

                        <input
                            id="bearbeitenRang"
                            class="search-input"
                            type="text"
                            value="${verwaltungEscape(
                                data.rang || ""
                            )}"
                            style="width: 100%; margin-top: 7px;"
                        >


                        <p style="margin-top: 14px;">
                            <strong>Aktiv</strong>
                        </p>

                        <select
                            id="bearbeitenAktiv"
                            class="search-input"
                            style="width: 100%; margin-top: 7px;"
                        >

                            <option
                                value="true"
                                ${
                                    data.is_active
                                    ? "selected"
                                    : ""
                                }
                            >
                                Aktiv
                            </option>

                            <option
                                value="false"
                                ${
                                    !data.is_active
                                    ? "selected"
                                    : ""
                                }
                            >
                                Inaktiv
                            </option>

                        </select>


                        <p style="margin-top: 14px;">
                            <strong>Verfügbarkeit</strong>
                        </p>

                        <select
                            id="bearbeitenVerfuegbar"
                            class="search-input"
                            style="width: 100%; margin-top: 7px;"
                        >

                            <option
                                value="true"
                                ${
                                    data.is_available
                                    ? "selected"
                                    : ""
                                }
                            >
                                Verfügbar
                            </option>

                            <option
                                value="false"
                                ${
                                    !data.is_available
                                    ? "selected"
                                    : ""
                                }
                            >
                                Nicht verfügbar
                            </option>

                        </select>

                    </div>

                </div>

                `;


        } catch (error) {

            console.error(
                "Fehler beim Öffnen des Mitarbeiters:",
                error
            );


            content.innerHTML =
                `
                <div class="empty-message">

                    Mitarbeiter konnte nicht geladen werden.

                    <br><br>

                    ${verwaltungEscape(
                        error.message ||
                        "Unbekannter Fehler"
                    )}

                </div>
                `;

        }

    };


// ============================================================
// MITARBEITER SPEICHERN
// ============================================================

window.mitarbeiterDatenSpeichern =
    async function(id) {

        const rolle =
            document.getElementById(
                "bearbeitenRolle"
            )?.value.trim();


        const rang =
            document.getElementById(
                "bearbeitenRang"
            )?.value.trim();


        const aktiv =
            document.getElementById(
                "bearbeitenAktiv"
            )?.value === "true";


        const verfuegbar =
            document.getElementById(
                "bearbeitenVerfuegbar"
            )?.value === "true";


        if (!rolle) {

            alert(
                "Bitte eine Rolle eingeben."
            );

            return;
        }


        if (!rang) {

            alert(
                "Bitte einen Rang eingeben."
            );

            return;
        }


        try {

            const {
                error
            } =
                await supabase
                    .from("employees")
                    .update({

                        role:
                            rolle,

                        rang:
                            rang,

                        is_active:
                            aktiv,

                        is_available:
                            verfuegbar,

                        updated_at:
                            new Date().toISOString()

                    })
                    .eq(
                        "id",
                        id
                    );


            if (error) {
                throw error;
            }


            alert(
                "Mitarbeiterdaten wurden gespeichert."
            );


            schliesseMitarbeiterDetails();


            await ladeMitarbeiter();


        } catch (error) {

            console.error(
                "Fehler beim Speichern:",
                error
            );


            alert(
                "Die Mitarbeiterdaten konnten nicht gespeichert werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// AKTIV / INAKTIV
// ============================================================

window.mitarbeiterAktivStatus =
    async function(
        id,
        aktuellAktiv
    ) {

        const neuerStatus =
            !aktuellAktiv;


        if (
            !confirm(
                neuerStatus
                ? "Mitarbeiter wirklich aktivieren?"
                : "Mitarbeiter wirklich deaktivieren?"
            )
        ) {

            return;

        }


        try {

            const {
                error
            } =
                await supabase
                    .from("employees")
                    .update({

                        is_active:
                            neuerStatus,

                        updated_at:
                            new Date().toISOString()

                    })
                    .eq(
                        "id",
                        id
                    );


            if (error) {
                throw error;
            }


            alert(
                neuerStatus
                ? "Mitarbeiter wurde aktiviert."
                : "Mitarbeiter wurde deaktiviert."
            );


            await ladeMitarbeiter();


        } catch (error) {

            console.error(
                "Fehler beim Ändern des Aktivstatus:",
                error
            );


            alert(
                "Der Aktivstatus konnte nicht geändert werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// MITARBEITER DETAILS SCHLIESSEN
// ============================================================

window.schliesseMitarbeiterDetails =
    function() {

        const panel =
            document.getElementById(
                "mitarbeiterDetails"
            );


        if (panel) {

            panel.classList.remove(
                "active"
            );

        }

    };


// ============================================================
// PREISVERWALTUNG – DATEN
// ============================================================

let alleItems =
    [];


// ============================================================
// ITEMS LADEN
// ============================================================

async function ladeItems() {

    const liste =
        document.getElementById(
            "itemsListe"
        );


    if (!liste) {
        return;
    }


    liste.innerHTML =
        `
        <tr>
            <td
                colspan="5"
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
        } =
            await supabase
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


        zeigeItems(
            alleItems
        );


    } catch (error) {

            console.error(
                "Fehler beim Löschen des Items:",
                error
            );


            alert(
                "Das Item konnte nicht gelöscht werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// ITEM HINZUFÜGEN
// ============================================================

const neuesItemButton =
    document.getElementById(
        "neuesItemButton"
    );


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


            if (
                kategorie === null
            ) {

                return;

            }


            const preis =
                prompt(
                    "Preis:"
                );


            if (
                preis === null
            ) {

                return;

            }


            const preisNummer =
                Number(
                    String(
                        preis
                    ).replace(
                        ",",
                        "."
                    )
                );


            if (
                !Number.isFinite(
                    preisNummer
                ) ||
                preisNummer < 0
            ) {

                alert(
                    "Bitte einen gültigen Preis eingeben."
                );

                return;

            }


            try {

                // Die konkrete Spaltenstruktur der
                // items-Tabelle wird beim Einfügen
                // zunächst anhand vorhandener Items
                // übernommen.

                const vorlage =
                    alleItems[0];


                if (!vorlage) {

                    throw new Error(
                        "Die items-Tabelle enthält noch kein Item. Für das erste Item müssen wir zuerst die genaue Tabellenstruktur prüfen."
                    );

                }


                const neuerEintrag = {};


                if (
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "name"
                    )
                ) {

                    neuerEintrag.name =
                        name.trim();

                }


                if (
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "item_name"
                    )
                ) {

                    neuerEintrag.item_name =
                        name.trim();

                }


                if (
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "minecraft_name"
                    )
                ) {

                    neuerEintrag.minecraft_name =
                        name.trim();

                }


                if (
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "category"
                    )
                ) {

                    neuerEintrag.category =
                        kategorie.trim();

                }


                if (
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "kategorie"
                    )
                ) {

                    neuerEintrag.kategorie =
                        kategorie.trim();

                }


                if (
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "price"
                    )
                ) {

                    neuerEintrag.price =
                        preisNummer;

                }


                if (
                    Object.prototype.hasOwnProperty.call(
                        vorlage,
                        "preis"
                    )
                ) {

                    neuerEintrag.preis =
                        preisNummer;

                }


                const {
                    error
                } =
                    await supabase
                        .from("items")
                        .insert(
                            neuerEintrag
                        );


                if (error) {
                    throw error;
                }


                alert(
                    "Neues Item wurde erfolgreich hinzugefügt."
                );


                await ladeItems();


            } catch (error) {

                console.error(
                    "Fehler beim Hinzufügen des Items:",
                    error
                );


                alert(
                    "Das Item konnte nicht hinzugefügt werden.\n\n" +
                    (
                        error.message ||
                        "Unbekannter Fehler"
                    )
                );

            }

        }
    );

}


// ============================================================
// MITARBEITER UND ITEMS BEIM START LADEN
// ============================================================

ladeMitarbeiter();

ladeItems();

// ============================================================
// EHRENMARKT – VERWALTUNG
// TEIL 5 VON 5
// BÜNDNISVERWALTUNG + ABSCHLUSS
// ============================================================


// ============================================================
// BÜNDNISSE LADEN
// ============================================================

async function ladeBuendnisse() {

    const liste =
        document.getElementById(
            "buendnisseListe"
        );


    if (!liste) {
        return;
    }


    liste.innerHTML =
        `
        <div class="loading">
            Bündnisse werden geladen...
        </div>
        `;


    try {

        const {
            data,
            error
        } =
            await supabase
                .from("buendnisse")
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


        const buendnisse =
            data || [];


        // ====================================================
        // STATISTIKEN
        // ====================================================

        const offen =
            buendnisse.filter(
                b =>
                    b.status === "Offen"
            ).length;


        const aktiv =
            buendnisse.filter(
                b =>
                    b.status === "Angenommen"
            ).length;


        const abgelehnt =
            buendnisse.filter(
                b =>
                    b.status === "Abgelehnt"
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
            buendnisse.length
        );


        // ====================================================
        // KEINE BÜNDNISSE
        // ====================================================

        if (
            buendnisse.length === 0
        ) {

            liste.innerHTML =
                `
                <div class="empty-message">
                    Es liegen derzeit keine Bündnisanträge vor.
                </div>
                `;

            return;
        }


        // ====================================================
        // LISTE
        // ====================================================

        liste.innerHTML =
            buendnisse
                .map(
                    buendnis =>
                        erstelleBuendnisKarte(
                            buendnis
                        )
                )
                .join("");


    } catch (error) {

        console.error(
            "Fehler beim Laden der Bündnisse:",
            error
        );


        liste.innerHTML =
            `
            <div class="empty-message">

                Bündnisse konnten nicht geladen werden.

                <br><br>

                ${verwaltungEscape(
                    error.message ||
                    "Unbekannter Fehler"
                )}

            </div>
            `;

    }

}


// ============================================================
// BÜNDNIS-KARTE
// ============================================================

function erstelleBuendnisKarte(
    buendnis
) {

    const status =
        buendnis.status ||
        "Offen";


    let statusKlasse =
        "open";


    if (
        status === "Angenommen"
    ) {

        statusKlasse =
            "accepted";

    }


    if (
        status === "Abgelehnt"
    ) {

        statusKlasse =
            "rejected";

    }


    const buendnisId =
        buendnis.buendnis_id ||
        "Noch nicht vergeben";


    return `

        <div
            class="list-item"
        >

            <h3>

                ${verwaltungEscape(
                    buendnis.clan_name ||
                    "Unbekannter Clan"
                )}

            </h3>


            <p>

                <strong>Bündnis-ID:</strong>

                ${verwaltungEscape(
                    buendnisId
                )}

            </p>


            <p>

                <strong>Clan-Tag:</strong>

                ${verwaltungEscape(
                    buendnis.clan_tag ||
                    "—"
                )}

            </p>


            <p>

                <strong>Ansprechpartner:</strong>

                ${verwaltungEscape(
                    buendnis.contact_name ||
                    "—"
                )}

            </p>


            <p>

                <strong>Minecraft:</strong>

                ${verwaltungEscape(
                    buendnis.minecraft_name ||
                    "—"
                )}

            </p>


            <p>

                <strong>Status:</strong>

                <span
                    class="alliance-status ${statusKlasse}"
                >
                    ${verwaltungEscape(
                        status
                    )}
                </span>

            </p>


            <p>

                <strong>Rabatt:</strong>

                ${verwaltungEscape(
                    buendnis.discount_percent ??
                    0
                )} %

            </p>


            <p>

                <strong>Antrag eingegangen:</strong>

                ${verwaltungDatum(
                    buendnis.created_at
                )}

            </p>


            <div class="button-row">

                <button
                    type="button"
                    class="action-button"
                    onclick="zeigeBuendnisDetails('${verwaltungEscape(
                        buendnis.id
                    )}')"
                >
                    Details
                </button>


                ${
                    status === "Offen"
                    ?
                    `
                    <button
                        type="button"
                        class="action-button success"
                        onclick="buendnisAnnehmen('${verwaltungEscape(
                            buendnis.id
                        )}')"
                    >
                        Annehmen
                    </button>


                    <button
                        type="button"
                        class="action-button danger"
                        onclick="buendnisAblehnen('${verwaltungEscape(
                            buendnis.id
                        )}')"
                    >
                        Ablehnen
                    </button>
                    `
                    :
                    ""
                }


                ${
                    status === "Angenommen"
                    ?
                    `
                    <button
                        type="button"
                        class="action-button"
                        onclick="buendnisBearbeiten('${verwaltungEscape(
                            buendnis.id
                        )}')"
                    >
                        Vereinbarung bearbeiten
                    </button>
                    `
                    :
                    ""
                }


                <button
                    type="button"
                    class="action-button danger"
                    onclick="buendnisLoeschen('${verwaltungEscape(
                        buendnis.id
                    )}')"
                >
                    Löschen
                </button>

            </div>

        </div>

    `;

}


// ============================================================
// BÜNDNISDETAILS
// ============================================================

window.zeigeBuendnisDetails =
    async function(id) {

        const panel =
            document.getElementById(
                "buendnisDetails"
            );


        const content =
            document.getElementById(
                "buendnisDetailsContent"
            );


        if (!panel || !content) {
            return;
        }


        panel.classList.add(
            "active"
        );


        content.innerHTML =
            `
            <div class="loading">
                Bündnisdetails werden geladen...
            </div>
            `;


        try {

            const {
                data,
                error
            } =
                await supabase
                    .from("buendnisse")
                    .select("*")
                    .eq(
                        "id",
                        id
                    )
                    .maybeSingle();


            if (error) {
                throw error;
            }


            if (!data) {

                throw new Error(
                    "Bündnis wurde nicht gefunden."
                );

            }


            content.innerHTML =
                `

                <div class="list-item">

                    <h3>
                        ${verwaltungEscape(
                            data.clan_name ||
                            "—"
                        )}
                    </h3>


                    <p>
                        <strong>Bündnis-ID:</strong><br>
                        ${verwaltungEscape(
                            data.buendnis_id ||
                            "Noch nicht vergeben"
                        )}
                    </p>


                    <p>
                        <strong>Clan-Tag:</strong><br>
                        ${verwaltungEscape(
                            data.clan_tag ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Clan-Beschreibung:</strong><br>
                        ${verwaltungEscape(
                            data.clan_description ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Mitglieder:</strong><br>
                        ${verwaltungEscape(
                            data.clan_member_count ??
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Clan seit:</strong><br>
                        ${verwaltungEscape(
                            data.clan_since ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Clan-Discord:</strong><br>
                        ${verwaltungEscape(
                            data.clan_discord ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Ansprechpartner:</strong><br>
                        ${verwaltungEscape(
                            data.contact_name ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Minecraft:</strong><br>
                        ${verwaltungEscape(
                            data.minecraft_name ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Discord:</strong><br>
                        ${verwaltungEscape(
                            data.discord_name ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Clan-Rolle:</strong><br>
                        ${verwaltungEscape(
                            data.clan_role ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Grund für den Antrag:</strong><br>
                        ${verwaltungEscape(
                            data.reason ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Gewünschte Zusammenarbeit:</strong><br>
                        ${verwaltungEscape(
                            data.cooperation ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Gewünschte Vereinbarung:</strong><br>
                        ${verwaltungEscape(
                            data.desired_agreement ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Antragstext:</strong><br>
                        ${verwaltungEscape(
                            data.application_text ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Status:</strong><br>
                        ${verwaltungEscape(
                            data.status ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Vereinbarung:</strong><br>
                        ${verwaltungEscape(
                            data.agreement ||
                            "Noch keine Vereinbarung"
                        )}
                    </p>


                    <p>
                        <strong>Rabatt:</strong><br>
                        ${verwaltungEscape(
                            data.discount_percent ??
                            0
                        )} %
                    </p>


                    <p>
                        <strong>Aktiv seit:</strong><br>
                        ${verwaltungEscape(
                            data.active_since ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Entscheidungsnotiz:</strong><br>
                        ${verwaltungEscape(
                            data.decision_note ||
                            "—"
                        )}
                    </p>


                    <div class="button-row">

                        <button
                            type="button"
                            class="action-button"
                            onclick="schliesseBuendnisDetails()"
                        >
                            Schließen
                        </button>

                    </div>

                </div>

                `;


        } catch (error) {

            console.error(
                "Fehler bei den Bündnisdetails:",
                error
            );


            content.innerHTML =
                `
                <div class="empty-message">

                    Bündnisdetails konnten
                    nicht geladen werden.

                    <br><br>

                    ${verwaltungEscape(
                        error.message ||
                        "Unbekannter Fehler"
                    )}

                </div>
                `;

        }

    };


// ============================================================
// BÜNDNISDETAILS SCHLIESSEN
// ============================================================

window.schliesseBuendnisDetails =
    function() {

        const panel =
            document.getElementById(
                "buendnisDetails"
            );


        if (panel) {

            panel.classList.remove(
                "active"
            );

        }

    };


// ============================================================
// BÜNDNIS ANNEHMEN
// ============================================================

window.buendnisAnnehmen =
    async function(id) {

        if (
            !confirm(
                "Diesen Bündnisantrag wirklich annehmen?"
            )
        ) {

            return;

        }


        try {

            const {
                data,
                error: ladenFehler
            } =
                await supabase
                    .from("buendnisse")
                    .select("*")
                    .eq(
                        "id",
                        id
                    )
                    .maybeSingle();


            if (ladenFehler) {
                throw ladenFehler;
            }


            if (!data) {

                throw new Error(
                    "Bündnisantrag wurde nicht gefunden."
                );

            }


            if (
                data.status !== "Offen"
            ) {

                throw new Error(
                    "Dieser Bündnisantrag ist nicht mehr offen."
                );

            }


            // =================================================
            // BÜNDNIS-ID ERSTELLEN
            // =================================================

            const {
                data: vorhandene,
                error: nummerFehler
            } =
                await supabase
                    .from("buendnisse")
                    .select("buendnis_id");


            if (nummerFehler) {
                throw nummerFehler;
            }


            let hoechsteNummer =
                0;


            (vorhandene || [])
                .forEach(
                    eintrag => {

                        const wert =
                            String(
                                eintrag.buendnis_id ||
                                ""
                            );


                        const match =
                            wert.match(
                                /^BND-(\d+)$/
                            );


                        if (match) {

                            const nummer =
                                Number(
                                    match[1]
                                );


                            if (
                                nummer >
                                hoechsteNummer
                            ) {

                                hoechsteNummer =
                                    nummer;

                            }

                        }

                    }
                );


            const neueNummer =
                hoechsteNummer + 1;


            const buendnisId =
                "BND-" +
                String(
                    neueNummer
                ).padStart(
                    4,
                    "0"
                );


            // =================================================
            // ANNEHMEN
            // =================================================

            const {
                error
            } =
                await supabase
                    .from("buendnisse")
                    .update({

                        status:
                            "Angenommen",

                        buendnis_id:
                            buendnisId,

                        processed_by:
                            user.id,

                        processed_at:
                            new Date().toISOString(),

                        active_since:
                            new Date()
                                .toISOString()
                                .split("T")[0],

                        updated_at:
                            new Date().toISOString(),

                        discount_percent:
                            data.discount_percent ??
                            0,

                        agreement:
                            data.agreement ||
                            null

                    })
                    .eq(
                        "id",
                        id
                    )
                    .eq(
                        "status",
                        "Offen"
                    );


            if (error) {
                throw error;
            }


            alert(
                `Bündnis wurde angenommen.\n\nBündnis-ID: ${buendnisId}`
            );


            await ladeBuendnisse();


            schliesseBuendnisDetails();


        } catch (error) {

            console.error(
                "Fehler beim Annehmen des Bündnisses:",
                error
            );


            alert(
                "Das Bündnis konnte nicht angenommen werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// BÜNDNIS ABLEHNEN
// ============================================================

window.buendnisAblehnen =
    async function(id) {

        const notiz =
            prompt(
                "Optionale Begründung für die Ablehnung:"
            );


        if (
            notiz === null
        ) {

            return;

        }


        if (
            !confirm(
                "Diesen Bündnisantrag wirklich ablehnen?"
            )
        ) {

            return;

        }


        try {

            const {
                error
            } =
                await supabase
                    .from("buendnisse")
                    .update({

                        status:
                            "Abgelehnt",

                        processed_by:
                            user.id,

                        processed_at:
                            new Date().toISOString(),

                        decision_note:
                            notiz.trim() ||
                            null,

                        updated_at:
                            new Date().toISOString()

                    })
                    .eq(
                        "id",
                        id
                    )
                    .eq(
                        "status",
                        "Offen"
                    );


            if (error) {
                throw error;
            }


            alert(
                "Bündnisantrag wurde abgelehnt."
            );


            await ladeBuendnisse();


            schliesseBuendnisDetails();


        } catch (error) {

            console.error(
                "Fehler beim Ablehnen:",
                error
            );


            alert(
                "Der Bündnisantrag konnte nicht abgelehnt werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// BÜNDNIS BEARBEITEN
// ============================================================

window.buendnisBearbeiten =
    async function(id) {

        try {

            const {
                data,
                error
            } =
                await supabase
                    .from("buendnisse")
                    .select("*")
                    .eq(
                        "id",
                        id
                    )
                    .maybeSingle();


            if (error) {
                throw error;
            }


            if (!data) {

                throw new Error(
                    "Bündnis wurde nicht gefunden."
                );

            }


            const vereinbarung =
                prompt(
                    "Vereinbarung:",
                    data.agreement ||
                    ""
                );


            if (
                vereinbarung === null
            ) {

                return;

            }


            const rabatt =
                prompt(
                    "Rabatt in Prozent:",
                    data.discount_percent ??
                    0
                );


            if (
                rabatt === null
            ) {

                return;

            }


            const rabattNummer =
                Number(
                    String(
                        rabatt
                    ).replace(
                        ",",
                        "."
                    )
                );


            if (
                !Number.isFinite(
                    rabattNummer
                ) ||
                rabattNummer < 0 ||
                rabattNummer > 100
            ) {

                alert(
                    "Der Rabatt muss zwischen 0 und 100 % liegen."
                );

                return;

            }


            const {
                error: updateFehler
            } =
                await supabase
                    .from("buendnisse")
                    .update({

                        agreement:
                            vereinbarung.trim() ||
                            null,

                        discount_percent:
                            rabattNummer,

                        updated_at:
                            new Date().toISOString()

                    })
                    .eq(
                        "id",
                        id
                    );


            if (updateFehler) {
                throw updateFehler;
            }


            alert(
                "Bündnisvereinbarung wurde gespeichert."
            );


            await ladeBuendnisse();


        } catch (error) {

            console.error(
                "Fehler beim Bearbeiten des Bündnisses:",
                error
            );


            alert(
                "Das Bündnis konnte nicht bearbeitet werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// BÜNDNIS LÖSCHEN
// ============================================================

window.buendnisLoeschen =
    async function(id) {

        if (
            !confirm(
                "Dieses Bündnis bzw. diesen Antrag wirklich dauerhaft löschen?"
            )
        ) {

            return;

        }


        try {

            const {
                error
            } =
                await supabase
                    .from("buendnisse")
                    .delete()
                    .eq(
                        "id",
                        id
                    );


            if (error) {
                throw error;
            }


            alert(
                "Bündnis wurde gelöscht."
            );


            await ladeBuendnisse();


            schliesseBuendnisDetails();


        } catch (error) {

            console.error(
                "Fehler beim Löschen des Bündnisses:",
                error
            );


            alert(
                "Das Bündnis konnte nicht gelöscht werden.\n\n" +
                (
                    error.message ||
                    "Unbekannter Fehler"
                )
            );

        }

    };


// ============================================================
// NAVIGATION – BEREICHE BEIM ÖFFNEN LADEN
// ============================================================

const verwaltungsNavigation =
    document.querySelectorAll(
        ".nav-button"
    );


verwaltungsNavigation.forEach(
    button => {

        button.addEventListener(
            "click",
            async () => {

                const bereich =
                    button.dataset.section;


                if (
                    bereich === "bewerbungen"
                ) {

                    await ladeBewerbungen();

                }


                if (
                    bereich === "auftraege"
                ) {

                    if (
                        aktuellerAuftragstyp
                    ) {

                        await ladeAuftraege(
                            aktuellerAuftragstyp
                        );

                    }

                }


                if (
                    bereich === "mitarbeiter"
                ) {

                    await ladeMitarbeiter();

                }


                if (
                    bereich === "preise"
                ) {

                    await ladeItems();

                }


                if (
                    bereich === "buendnisse"
                ) {

                    await ladeBuendnisse();

                }

            }
        );

    }
);


// ============================================================
// STARTWERTE
// ============================================================

ladeBewerbungen();

ladeMitarbeiter();

ladeItems();

ladeBuendnisse();


// ============================================================
// FERTIG
// ============================================================

console.log(
    "Ehrenmarkt Verwaltung – alle Verwaltungsbereiche initialisiert."
);
