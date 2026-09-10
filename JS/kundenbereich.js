/* =========================================================
   EHRENMARKT – KUNDENBEREICH
   TEIL 1 / 5
   Grundaufbau + Session
========================================================= */

"use strict";

/* =========================================================
   GLOBALE VARIABLEN
========================================================= */

let supabase = null;
let aktuellerBenutzer = null;
let aktuellesProfil = null;
let alleAuftraege = [];


/* =========================================================
   AUFTRAGSTYPEN
========================================================= */

const AUFTRAGSTYPEN = {
    MATERIAL: "Material",
    BAU: "Bau",
    REDSTONE: "Redstone",
    LOGISTIK: "Logistik"
};


/* =========================================================
   HILFSFUNKTION
========================================================= */

function element(id) {
    return document.getElementById(id);
}


/* =========================================================
   SUPABASE HOLEN
========================================================= */

function holeSupabase() {

    if (
        typeof window !== "undefined" &&
        window.supabaseClient
    ) {
        return window.supabaseClient;
    }

    if (
        typeof supabaseClient !== "undefined"
    ) {
        return supabaseClient;
    }

    console.error(
        "Ehrenmarkt: Supabase-Client wurde nicht gefunden."
    );

    return null;
}


/* =========================================================
   FEHLER ANZEIGEN
========================================================= */

function zeigeFehler(nachricht) {

    const fehler = element("fehler");

    if (fehler) {
        fehler.textContent = nachricht;
        fehler.style.display = "block";
    } else {
        console.error(nachricht);
    }
}


/* =========================================================
   GAST-BEREICH
========================================================= */

function zeigeGastBereich() {

    const gast = element("gastBereich");
    const kunden = element("kundenBereich");

    if (gast) {
        gast.style.display = "block";
    }

    if (kunden) {
        kunden.style.display = "none";
    }

    setzeLadeanzeige(false);
}


/* =========================================================
   KUNDENBEREICH
========================================================= */

function zeigeKundenBereich() {

    const gast = element("gastBereich");
    const kunden = element("kundenBereich");

    if (gast) {
        gast.style.display = "none";
    }

    if (kunden) {
        kunden.style.display = "block";
    }
}


/* =========================================================
   LADEANZEIGE
========================================================= */

function setzeLadeanzeige(anzeigen) {

    const ladebereich = element("ladebereich");

    if (!ladebereich) {
        return;
    }

    ladebereich.style.display =
        anzeigen ? "block" : "none";
}


/* =========================================================
   SESSION PRÜFEN
========================================================= */

async function pruefeAnmeldung() {

    try {

        const {
            data,
            error
        } = await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        const session = data?.session;


        /* NICHT ANGEMELDET */

        if (!session?.user) {

            aktuellerBenutzer = null;
            aktuellesProfil = null;

            zeigeGastBereich();

            return;
        }


        /* ANGEMELDET */

        aktuellerBenutzer = session.user;

        await ladeKundenbereich();

    } catch (fehler) {

        console.error(
            "Fehler beim Prüfen der Anmeldung:",
            fehler
        );

        zeigeFehler(
            "Der Kundenbereich konnte nicht geladen werden."
        );
    }
}


/* =========================================================
   SEITE STARTEN
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        supabase = holeSupabase();

        if (!supabase) {

            zeigeFehler(
                "Die Verbindung zum Kundenbereich konnte nicht hergestellt werden."
            );

            return;
        }

        await pruefeAnmeldung();
    }
);

/* =========================================================
   EHRENMARKT – KUNDENBEREICH
   TEIL 2 / 5
   Profil + Kundendaten
========================================================= */


/* =========================================================
   KUNDENBEREICH LADEN
========================================================= */

async function ladeKundenbereich() {

    try {

        if (!aktuellerBenutzer) {

            zeigeGastBereich();

            return;
        }


        /* PROFIL LADEN */

        const {
            data: profil,
            error: profilFehler
        } = await supabase
            .from("profiles")
            .select(
                "id, username, minecraft_name, user_type, rang, rolle"
            )
            .eq(
                "id",
                aktuellerBenutzer.id
            )
            .maybeSingle();


        if (profilFehler) {
            throw profilFehler;
        }


        aktuellesProfil = profil || null;


        /* KUNDENBEREICH ANZEIGEN */

        zeigeKundenBereich();


        /* PROFIL ANZEIGEN */

        zeigeProfildaten();


        /* AUFTRÄGE LADEN */

        await ladeAlleKundenauftraege();

    } catch (fehler) {

        console.error(
            "Fehler beim Laden des Kundenbereichs:",
            fehler
        );

        zeigeFehler(
            "Dein Kundenbereich konnte nicht geladen werden."
        );
    }
}


/* =========================================================
   PROFILDATEN ANZEIGEN
========================================================= */

function zeigeProfildaten() {

    if (!aktuellerBenutzer) {
        return;
    }


    const username =
        aktuellesProfil?.username ||
        "Kunde";

    const minecraftName =
        aktuellesProfil?.minecraft_name ||
        "Nicht hinterlegt";

    const email =
        aktuellerBenutzer.email ||
        "Nicht verfügbar";


    /* BEGRÜSSUNG */

    const begruessung =
        element("kundenBegruessung");

    if (begruessung) {

        begruessung.textContent =
            `Willkommen zurück, ${username}!`;
    }


    /* BENUTZERNAME */

    const usernameElement =
        element("kundenUsername");

    if (usernameElement) {

        usernameElement.textContent =
            username;
    }


    /* MINECRAFT-NAME */

    const minecraftElement =
        element("kundenMinecraft");

    if (minecraftElement) {

        minecraftElement.textContent =
            minecraftName;
    }


    /* E-MAIL */

    const emailElement =
        element("kundenEmail");

    if (emailElement) {

        emailElement.textContent =
            email;
    }


    /* RANG */

    const rangElement =
        element("kundenRang");

    if (rangElement) {

        rangElement.textContent =
            aktuellesProfil?.rang ||
            "Kunde";
    }


    /* ROLLE */

    const rolleElement =
        element("kundenRolle");

    if (rolleElement) {

        rolleElement.textContent =
            aktuellesProfil?.rolle ||
            "Kunde";
    }
}


/* =========================================================
   AUFTRAGSANZEIGE ZURÜCKSETZEN
========================================================= */

function leereAuftragsbereiche() {

    const bereiche = [
        "aktiveAuftraege",
        "offeneAuftraege",
        "bearbeitungAuftraege",
        "abgeschlosseneAuftraege"
    ];

    bereiche.forEach(id => {

        const bereich = element(id);

        if (bereich) {
            bereich.innerHTML = "";
        }
    });
}


/* =========================================================
   AUFTRAGSZAHLEN
========================================================= */

function zeigeAuftragszahlen(
    offen,
    bearbeitung,
    abgeschlossen
) {

    const gesamt =
        element("auftragsGesamt");

    const offenElement =
        element("auftragsOffen");

    const bearbeitungElement =
        element("auftragsBearbeitung");

    const abgeschlossenElement =
        element("auftragsAbgeschlossen");


    if (gesamt) {

        gesamt.textContent =
            offen +
            bearbeitung +
            abgeschlossen;
    }


    if (offenElement) {
        offenElement.textContent = offen;
    }

    if (bearbeitungElement) {
        bearbeitungElement.textContent = bearbeitung;
    }

    if (abgeschlossenElement) {
        abgeschlossenElement.textContent = abgeschlossen;
    }
}

/* =========================================================
   EHRENMARKT – KUNDENBEREICH
   TEIL 3 / 5
   Alle Kundenaufträge laden
========================================================= */


/* =========================================================
   ALLE AUFTRÄGE LADEN
========================================================= */

async function ladeAlleKundenauftraege() {

    setzeLadeanzeige(true);

    leereAuftragsbereiche();

    try {

        if (!aktuellerBenutzer) {
            return;
        }

        alleAuftraege = [];


        /* =====================================================
           MATERIALAUFTRÄGE
        ===================================================== */

        const {
            data: materialAuftraege,
            error: materialFehler
        } = await supabase
            .from("orders")
            .select(
                "id, order_number, minecraft_name, status, total_price, notes, created_at"
            )
            .eq(
                "user_id",
                aktuellerBenutzer.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (materialFehler) {

            console.error(
                "Materialaufträge konnten nicht geladen werden:",
                materialFehler
            );

        } else {

            (
                materialAuftraege || []
            ).forEach(auftrag => {

                alleAuftraege.push({

                    id: auftrag.id,

                    typ:
                        AUFTRAGSTYPEN.MATERIAL,

                    order_number:
                        auftrag.order_number,

                    minecraft_name:
                        auftrag.minecraft_name,

                    status:
                        auftrag.status,

                    total_price:
                        auftrag.total_price,

                    created_at:
                        auftrag.created_at,

                    notes:
                        auftrag.notes
                });
            });
        }


        /* =====================================================
           BAUAUFTRÄGE
        ===================================================== */

        const {
            data: bauAuftraege,
            error: bauFehler
        } = await supabase
            .from("build_orders")
            .select(
                "id, order_number, minecraft_name, status, provisional_price, final_price, created_at, description, location"
            )
            .eq(
                "user_id",
                aktuellerBenutzer.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (bauFehler) {

            console.error(
                "Bauaufträge konnten nicht geladen werden:",
                bauFehler
            );

        } else {

            (
                bauAuftraege || []
            ).forEach(auftrag => {

                const preis =
                    auftrag.final_price ??
                    auftrag.provisional_price ??
                    0;


                alleAuftraege.push({

                    id: auftrag.id,

                    typ:
                        AUFTRAGSTYPEN.BAU,

                    order_number:
                        auftrag.order_number,

                    minecraft_name:
                        auftrag.minecraft_name,

                    status:
                        auftrag.status,

                    total_price:
                        preis,

                    created_at:
                        auftrag.created_at,

                    description:
                        auftrag.description,

                    location:
                        auftrag.location
                });
            });
        }


        /* =====================================================
           REDSTONEAUFTRÄGE
        ===================================================== */

        const {
            data: redstoneAuftraege,
            error: redstoneFehler
        } = await supabase
            .from("redstone_orders")
            .select(
                "id, order_number, minecraft_name, title, status, total_price, deposit_amount, remaining_amount, created_at, description"
            )
            .eq(
                "user_id",
                aktuellerBenutzer.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (redstoneFehler) {

            console.error(
                "Redstone-Aufträge konnten nicht geladen werden:",
                redstoneFehler
            );

        } else {

            (
                redstoneAuftraege || []
            ).forEach(auftrag => {

                alleAuftraege.push({

                    id: auftrag.id,

                    typ:
                        AUFTRAGSTYPEN.REDSTONE,

                    order_number:
                        auftrag.order_number,

                    minecraft_name:
                        auftrag.minecraft_name,

                    title:
                        auftrag.title,

                    status:
                        auftrag.status,

                    total_price:
                        auftrag.total_price,

                    deposit_amount:
                        auftrag.deposit_amount,

                    remaining_amount:
                        auftrag.remaining_amount,

                    created_at:
                        auftrag.created_at,

                    description:
                        auftrag.description
                });
            });
        }


        /* =====================================================
           LOGISTIKAUFTRÄGE
        ===================================================== */

        const {
            data: logistikAuftraege,
            error: logistikFehler
        } = await supabase
            .from("logistics_orders")
            .select(
                "id, order_number, customer_name, start_point, destination, status, total_price, deposit, remaining_payment, created_at, description"
            )
            .eq(
                "created_by",
                aktuellerBenutzer.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (logistikFehler) {

            console.error(
                "Logistik-Aufträge konnten nicht geladen werden:",
                logistikFehler
            );

        } else {

            (
                logistikAuftraege || []
            ).forEach(auftrag => {

                alleAuftraege.push({

                    id: auftrag.id,

                    typ:
                        AUFTRAGSTYPEN.LOGISTIK,

                    order_number:
                        auftrag.order_number,

                    minecraft_name:
                        auftrag.customer_name,

                    status:
                        auftrag.status,

                    total_price:
                        auftrag.total_price,

                    deposit_amount:
                        auftrag.deposit,

                    remaining_amount:
                        auftrag.remaining_payment,

                    created_at:
                        auftrag.created_at,

                    description:
                        auftrag.description,

                    start_point:
                        auftrag.start_point,

                    destination:
                        auftrag.destination
                });
            });
        }


        /* =====================================================
           NACH DATUM SORTIEREN
        ===================================================== */

        alleAuftraege.sort(
            (a, b) => {

                const datumA =
                    new Date(
                        a.created_at || 0
                    ).getTime();

                const datumB =
                    new Date(
                        b.created_at || 0
                    ).getTime();

                return datumB - datumA;
            }
        );


        /* AUFTRÄGE ANZEIGEN */

        zeigeAuftraege();


    } catch (fehler) {

        console.error(
            "Fehler beim Laden aller Kundenaufträge:",
            fehler
        );

        zeigeFehler(
            "Die Aufträge konnten nicht geladen werden."
        );

    } finally {

        setzeLadeanzeige(false);
    }
                   }

/* =========================================================
   EHRENMARKT – KUNDENBEREICH
   TEIL 4 / 5
   Auftragssortierung + Darstellung
========================================================= */


/* =========================================================
   STATUS NORMALISIEREN
========================================================= */

function normalisiereStatus(status) {

    if (!status) {
        return "unbekannt";
    }

    return String(status)
        .trim()
        .toLowerCase();
}


/* =========================================================
   STATUS TEXT
========================================================= */

function statusText(status) {

    const normal =
        normalisiereStatus(status);

    const statusNamen = {

        offen: "Offen",

        "in bearbeitung":
            "In Bearbeitung",

        bearbeitung:
            "In Bearbeitung",

        abgeschlossen:
            "Abgeschlossen",

        erledigt:
            "Abgeschlossen",

        storniert:
            "Storniert",

        abgebrochen:
            "Abgebrochen"
    };

    return (
        statusNamen[normal] ||
        status ||
        "Unbekannt"
    );
}


/* =========================================================
   PREIS FORMATIEREN
========================================================= */

function formatPreis(wert) {

    const zahl =
        Number(wert) || 0;

    return (
        zahl.toLocaleString("de-DE") +
        " $"
    );
}


/* =========================================================
   DATUM FORMATIEREN
========================================================= */

function formatDatum(datum) {

    if (!datum) {
        return "–";
    }

    const wert =
        new Date(datum);

    if (
        Number.isNaN(
            wert.getTime()
        )
    ) {
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


/* =========================================================
   KATEGORIE
========================================================= */

function kategorieFuerAuftrag(auftrag) {

    const status =
        normalisiereStatus(
            auftrag.status
        );


    if (
        status === "abgeschlossen" ||
        status === "erledigt"
    ) {
        return "abgeschlossen";
    }


    if (
        status === "in bearbeitung" ||
        status === "bearbeitung"
    ) {
        return "bearbeitung";
    }


    if (
        status === "storniert" ||
        status === "abgebrochen"
    ) {
        return "abgeschlossen";
    }


    return "offen";
}


/* =========================================================
   ALLE AUFTRÄGE DARSTELLEN
========================================================= */

function zeigeAuftraege() {

    const offene = [];
    const bearbeitung = [];
    const abgeschlossene = [];


    alleAuftraege.forEach(
        auftrag => {

            const kategorie =
                kategorieFuerAuftrag(
                    auftrag
                );


            if (
                kategorie === "offen"
            ) {

                offene.push(
                    auftrag
                );

            } else if (
                kategorie === "bearbeitung"
            ) {

                bearbeitung.push(
                    auftrag
                );

            } else {

                abgeschlossene.push(
                    auftrag
                );
            }
        }
    );


    zeigeAuftragszahlen(
        offene.length,
        bearbeitung.length,
        abgeschlossene.length
    );


    renderAuftragsliste(
        "offeneAuftraege",
        offene,
        "Keine offenen Aufträge."
    );


    renderAuftragsliste(
        "bearbeitungAuftraege",
        bearbeitung,
        "Keine Aufträge in Bearbeitung."
    );


    renderAuftragsliste(
        "abgeschlosseneAuftraege",
        abgeschlossene,
        "Noch keine abgeschlossenen Aufträge."
    );


    renderAuftragsliste(
        "aktiveAuftraege",
        [
            ...offene,
            ...bearbeitung
        ],
        "Keine aktiven Aufträge."
    );
}


/* =========================================================
   AUFTRAGSLISTE
========================================================= */

function renderAuftragsliste(
    elementId,
    auftraege,
    leertext
) {

    const container =
        element(elementId);

    if (!container) {
        return;
    }

    container.innerHTML = "";


    if (
        !auftraege ||
        auftraege.length === 0
    ) {

        const leer =
            document.createElement("div");

        leer.className =
            "keine-auftraege";

        leer.textContent =
            leertext;

        container.appendChild(
            leer
        );

        return;
    }


    auftraege.forEach(
        auftrag => {

            container.appendChild(
                erstelleAuftragskarte(
                    auftrag
                )
            );
        }
    );
}


/* =========================================================
   AUFTRAGSKARTE
========================================================= */

function erstelleAuftragskarte(
    auftrag
) {

    const karte =
        document.createElement("article");

    karte.className =
        "auftrag-karte";


    const typ =
        document.createElement("div");

    typ.className =
        "auftrag-typ";

    typ.textContent =
        auftrag.typ;


    const nummer =
        document.createElement("h3");

    nummer.className =
        "auftrag-nummer";

    nummer.textContent =
        auftrag.order_number ||
        "Ohne Auftragsnummer";


    const status =
        document.createElement("div");

    status.className =
        "auftrag-status";

    status.textContent =
        statusText(
            auftrag.status
        );


    const preis =
        document.createElement("div");

    preis.className =
        "auftrag-preis";

    preis.textContent =
        formatPreis(
            auftrag.total_price
        );


    const datum =
        document.createElement("div");

    datum.className =
        "auftrag-datum";

    datum.textContent =
        "Erstellt: " +
        formatDatum(
            auftrag.created_at
        );


    const info =
        document.createElement("div");

    info.className =
        "auftrag-info";


    if (
        auftrag.typ ===
        AUFTRAGSTYPEN.LOGISTIK
    ) {

        if (
            auftrag.start_point ||
            auftrag.destination
        ) {

            info.textContent =
                (
                    auftrag.start_point ||
                    "–"
                ) +
                " → " +
                (
                    auftrag.destination ||
                    "–"
                );
        }

    } else if (
        auftrag.typ ===
        AUFTRAGSTYPEN.REDSTONE
    ) {

        info.textContent =
            auftrag.title ||
            "";

    } else if (
        auftrag.typ ===
        AUFTRAGSTYPEN.BAU
    ) {

        info.textContent =
            auftrag.location ||
            "";
    }


    karte.appendChild(typ);
    karte.appendChild(nummer);
    karte.appendChild(status);
    karte.appendChild(preis);
    karte.appendChild(datum);


    if (info.textContent) {
        karte.appendChild(info);
    }


    return karte;
}

/* =========================================================
   EHRENMARKT – KUNDENBEREICH
   TEIL 5 / 5
   Abmelden + Aktualisieren
========================================================= */


/* =========================================================
   ABMELDEN
========================================================= */

async function abmelden() {

    try {

        if (!supabase) {
            supabase = holeSupabase();
        }


        if (!supabase) {

            zeigeFehler(
                "Supabase ist nicht verfügbar."
            );

            return;
        }


        const bestaetigen =
            confirm(
                "Möchtest du dich wirklich abmelden?"
            );


        if (!bestaetigen) {
            return;
        }


        const {
            error
        } =
            await supabase
                .auth
                .signOut();


        if (error) {
            throw error;
        }


        aktuellerBenutzer = null;
        aktuellesProfil = null;
        alleAuftraege = [];


        zeigeGastBereich();


        window.location.reload();


    } catch (fehler) {

        console.error(
            "Fehler beim Abmelden:",
            fehler
        );

        zeigeFehler(
            "Das Abmelden ist fehlgeschlagen."
        );
    }
}


/* =========================================================
   ABMELDEN-BUTTON
========================================================= */

function initialisiereAbmelden() {

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


/* =========================================================
   AUFTRÄGE AKTUALISIEREN
========================================================= */

async function aktualisiereAuftraege() {

    if (!aktuellerBenutzer) {
        return;
    }

    await ladeAlleKundenauftraege();
}


/* =========================================================
   AKTUALISIEREN-BUTTON
========================================================= */

function initialisiereAktualisieren() {

    const button =
        element("auftraegeAktualisieren");

    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async () => {

            button.disabled = true;

            const alterText =
                button.textContent;

            button.textContent =
                "Wird geladen...";


            try {

                await aktualisiereAuftraege();

            } finally {

                button.disabled = false;

                button.textContent =
                    alterText;
            }
        }
    );
}


/* =========================================================
   AUTH-ÄNDERUNGEN ÜBERWACHEN
========================================================= */

function initialisiereAuthListener() {

    if (!supabase) {
        return;
    }


    supabase.auth.onAuthStateChange(
        async (
            event,
            session
        ) => {

            console.log(
                "Ehrenmarkt Auth:",
                event
            );


            if (
                event ===
                "SIGNED_OUT"
            ) {

                aktuellerBenutzer = null;
                aktuellesProfil = null;
                alleAuftraege = [];

                zeigeGastBereich();

                return;
            }


            if (
                session?.user
            ) {

                aktuellerBenutzer =
                    session.user;

                await ladeKundenbereich();
            }
        }
    );
}


/* =========================================================
   ZUSÄTZLICHE INITIALISIERUNG
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initialisiereAbmelden();

        initialisiereAktualisieren();

        initialisiereAuthListener();
    }
);
