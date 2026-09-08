/* =========================================================
   EHRENMARKT – REDSTONEAUFTRAG
   JS/redstoneauftrag.js

   TEIL 1 / 10
   Grundaufbau
========================================================= */

"use strict";

/* =========================================================
   GLOBALE VARIABLEN
========================================================= */

let redstonePrices = [];
let materialMengen = {};

let aktuellerGrundpreis = 0;
let aktuellerMaterialpreis = 0;
let aktuellerDringlichkeitspreis = 0;
let aktuellerWochenendpreis = 0;
let aktuellerGarantiepreis = 0;
let aktuellerGesamtpreis = 0;


/* =========================================================
   KONSTANTEN
========================================================= */

const SUPABASE_TABLE_PRICES = "redstone_prices";
const SUPABASE_TABLE_ORDERS = "redstone_orders";
const SUPABASE_TABLE_ORDER_ITEMS = "redstone_order_items";


/* =========================================================
   FESTE PREISE FÜR DEN AUFTRAG
========================================================= */

const GRUNDSTUECK_PREIS = 300000;


/* Planung */

const PLANUNG_PREISE = {
    einfach: 5000,
    normal: 10000,
    komplex: 20000,
    sehr_komplex: 30000
};


/* Komplexität */

const KOMPLEXITAET_PREISE = {
    einfach: 2500,
    normal: 12500,
    komplex: 25000
};


/* Anlage */

const ANLAGE_PREISE = {
    klein: 75000,
    mittel: 150000,
    gross: 300000
};


/* Redstone-Bau */

const REDSTONE_BAU_PROZENTE = {
    einfach: 0,
    normal: 10,
    komplex: 20,
    sehr_komplex: 25
};


/* Sonderarbeiten */

const SONDERARBEITEN_PREISE = {
    special_existing_installation: 20000,
    special_existing_conversion: 30000,
    special_foreign_repair: 50000,
    special_compact_build: 30000,
    special_hidden_redstone: 30000,
    special_difficult_access: 40000
};


/* Erweiterung */

const ERWEITERUNG_PREISE = {
    keine: 0,
    klein: 250000,
    mittel: 500000,
    gross: 1000000
};


/* Dringlichkeit */

const DRINGLICHKEIT_PROZENTE = {
    normal: 0,
    express: 50,
    notfall: 75,
    sofort: 100
};


/* Wochenende */

const WOCHENENDE_PROZENT = 25;


/* Garantie */

const GARANTIE_PROZENTE = {
    0: 0,
    1: 5,
    2: 10,
    3: 15
};


/* =========================================================
   HILFSFUNKTIONEN
========================================================= */

/**
 * Formatiert einen Geldbetrag für die Anzeige.
 */
function formatPreis(wert) {

    const zahl = Number(wert) || 0;

    return zahl.toLocaleString("de-DE") + " $";
}


/**
 * Gibt ein HTML-Element sicher zurück.
 */
function element(id) {

    return document.getElementById(id);
}


/**
 * Liest den aktuell ausgewählten Radio-Wert.
 */
function radioWert(name) {

    const auswahl = document.querySelector(
        `input[name="${name}"]:checked`
    );

    return auswahl ? auswahl.value : null;
}


/**
 * Prüft, ob eine Checkbox aktiviert ist.
 */
function checkboxAktiv(name) {

    const checkbox = document.querySelector(
        `input[name="${name}"]`
    );

    return checkbox ? checkbox.checked : false;
}


/* =========================================================
   PREISANZEIGE
========================================================= */

function setzePreisAnzeige(id, wert) {

    const feld = element(id);

    if (!feld) {
        return;
    }

    feld.textContent = formatPreis(wert);
}


/* =========================================================
   MATERIALKARTEN VORBEREITEN
========================================================= */

function initialisiereMaterialMengen() {

    const materialKarten = document.querySelectorAll(".item");

    materialKarten.forEach((karte) => {

        const name = karte.dataset.itemName;

        if (!name) {
            return;
        }

        materialMengen[name] = 0;

    });

}


/* =========================================================
   STARTWERTE
========================================================= */

function setzeStartwerte() {

    aktuellerGrundpreis = 0;
    aktuellerMaterialpreis = 0;
    aktuellerDringlichkeitspreis = 0;
    aktuellerWochenendpreis = 0;
    aktuellerGarantiepreis = 0;
    aktuellerGesamtpreis = 0;

    setzePreisAnzeige("preisGrundpreis", 0);
    setzePreisAnzeige("preisMaterial", 0);
    setzePreisAnzeige("preisDringlichkeit", 0);
    setzePreisAnzeige("preisWochenende", 0);
    setzePreisAnzeige("preisGarantie", 0);
    setzePreisAnzeige("gesamtPreis", 0);
    setzePreisAnzeige("anzahlung", 0);
    setzePreisAnzeige("restbetrag", 0);

}

/* =========================================================
   EHRENMARKT – REDSTONEAUFTRAG
   JS/redstoneauftrag.js

   TEIL 2 / 10
   Supabase + Materialpreise laden
========================================================= */


/* =========================================================
   SUPABASE PRÜFEN
========================================================= */

function pruefeSupabase() {

    if (typeof supabaseClient === "undefined") {

        console.error(
            "Supabase wurde nicht geladen."
        );

        return false;
    }

    return true;
}


/* =========================================================
   MATERIALPREISE AUS SUPABASE LADEN
========================================================= */

async function ladeRedstonePreise() {

    if (!pruefeSupabase()) {
        return;
    }

    try {

        const {
            data,
            error
        } = await supabaseClient
    .from(SUPABASE_TABLE_PRICES)
            .select("id, name, price")
            .order("id", {
                ascending: true
            });


        if (error) {

            console.error(
                "Fehler beim Laden der Redstone-Preise:",
                error
            );

            alert(
                "Die Redstone-Materialpreise konnten nicht geladen werden."
            );

            return;
        }


        if (!data || !Array.isArray(data)) {

            console.error(
                "Keine gültigen Redstone-Preise erhalten."
            );

            alert(
                "Es konnten keine Redstone-Materialpreise geladen werden."
            );

            return;
        }


        redstonePrices = data;


        console.log(
            "Redstone-Preise geladen:",
            redstonePrices
        );


        aktualisiereMaterialkarten();


    } catch (fehler) {

        console.error(
            "Unerwarteter Fehler beim Laden der Redstone-Preise:",
            fehler
        );

        alert(
            "Beim Laden der Redstone-Materialpreise ist ein Fehler aufgetreten."
        );
    }

}


/* =========================================================
   MATERIAL ÜBER NAMEN FINDEN
========================================================= */

function findeMaterialPreis(name) {

    if (!name) {
        return null;
    }


    const material = redstonePrices.find(
        (eintrag) =>
            String(eintrag.name).trim().toLowerCase() ===
            String(name).trim().toLowerCase()
    );


    return material || null;
}


/* =========================================================
   PREIS DER MATERIALKARTE AKTUALISIEREN
========================================================= */

function aktualisiereMaterialkarten() {

    const materialKarten =
        document.querySelectorAll(".item");


    materialKarten.forEach((karte) => {

        const name =
            karte.dataset.itemName;


        if (!name) {
            return;
        }


        const material =
            findeMaterialPreis(name);


        if (!material) {

            console.warn(
                "Kein Datenbankeintrag für Material gefunden:",
                name
            );

            return;
        }


        const preisElement =
            karte.querySelector(".item-price");


        if (!preisElement) {
            return;
        }


        preisElement.textContent =
            formatPreis(material.price) +
            " / Stück";


        /*
         * Die echte Datenbank-ID wird direkt
         * an der Karte gespeichert.
         *
         * Dadurch muss das spätere JS
         * keine IDs erraten.
         */

        karte.dataset.itemId =
            material.id;


        /*
         * Preis ebenfalls direkt speichern.
         * Die eigentliche Preisquelle bleibt
         * trotzdem Supabase.
         */

        karte.dataset.itemPrice =
            material.price;

    });

}


/* =========================================================
   MATERIALPREIS ÜBER ITEM-ID
========================================================= */

function findeMaterialNachId(itemId) {

    return redstonePrices.find(
        (eintrag) =>
            String(eintrag.id) ===
            String(itemId)
    ) || null;

}

/* =========================================================
   EHRENMARKT – REDSTONEAUFTRAG
   JS/redstoneauftrag.js

   TEIL 3 / 10
   Mengensteuerung + Materialberechnung
========================================================= */


/* =========================================================
   MATERIALMENGE ANZEIGEN
========================================================= */

function aktualisiereMengenAnzeige(karte) {

    if (!karte) {
        return;
    }


    const name =
        karte.dataset.itemName;


    if (!name) {
        return;
    }


    const menge =
        Number(materialMengen[name]) || 0;


    const mengenAnzeige =
        karte.querySelector(".menge-zahl");


    if (!mengenAnzeige) {
        return;
    }


    mengenAnzeige.textContent =
        menge.toLocaleString("de-DE");

}


/* =========================================================
   MENGE ERHÖHEN
========================================================= */

function erhoeheMaterialMenge(karte) {

    if (!karte) {
        return;
    }


    const name =
        karte.dataset.itemName;


    if (!name) {
        return;
    }


    if (typeof materialMengen[name] !== "number") {
        materialMengen[name] = 0;
    }


    materialMengen[name]++;


    aktualisiereMengenAnzeige(karte);


    berechneMaterialpreis();

}


/* =========================================================
   MENGE VERRINGERN
========================================================= */

function verringereMaterialMenge(karte) {

    if (!karte) {
        return;
    }


    const name =
        karte.dataset.itemName;


    if (!name) {
        return;
    }


    if (typeof materialMengen[name] !== "number") {
        materialMengen[name] = 0;
    }


    /*
     * Keine negativen Mengen erlauben.
     */

    if (materialMengen[name] <= 0) {

        materialMengen[name] = 0;

        return;
    }


    materialMengen[name]--;


    aktualisiereMengenAnzeige(karte);


    berechneMaterialpreis();

}


/* =========================================================
   MATERIALKARTEN – BUTTONS AKTIVIEREN
========================================================= */

function initialisiereMaterialButtons() {

    const materialKarten =
        document.querySelectorAll(".item");


    materialKarten.forEach((karte) => {

        const minusButton =
            karte.querySelector(".minus");


        const plusButton =
            karte.querySelector(".plus");


        if (minusButton) {

            minusButton.addEventListener(
                "click",
                () => {

                    verringereMaterialMenge(
                        karte
                    );

                }
            );

        }


        if (plusButton) {

            plusButton.addEventListener(
                "click",
                () => {

                    erhoeheMaterialMenge(
                        karte
                    );

                }
            );

        }


        aktualisiereMengenAnzeige(
            karte
        );

    });

}


/* =========================================================
   MATERIALPREIS BERECHNEN
========================================================= */

function berechneMaterialpreis() {

    let gesamterMaterialpreis = 0;


    const materialKarten =
        document.querySelectorAll(".item");


    materialKarten.forEach((karte) => {

        const name =
            karte.dataset.itemName;


        if (!name) {
            return;
        }


        const menge =
            Number(materialMengen[name]) || 0;


        if (menge <= 0) {
            return;
        }


        /*
         * Materialpreis kommt aus der
         * zuvor geladenen Supabase-Tabelle.
         */

        const material =
            findeMaterialPreis(name);


        if (!material) {

            console.warn(
                "Materialpreis nicht gefunden:",
                name
            );

            return;
        }


        const einzelpreis =
            Number(material.price) || 0;


        gesamterMaterialpreis +=
            menge * einzelpreis;

    });


    aktuellerMaterialpreis =
        gesamterMaterialpreis;


    setzePreisAnzeige(
        "preisMaterial",
        aktuellerMaterialpreis
    );


    /*
     * Nach jeder Materialänderung
     * wird auch der Gesamtpreis neu berechnet.
     *
     * Die eigentliche Gesamtberechnung
     * kommt in den späteren Teilen.
     */

    if (typeof berechneGesamtpreis === "function") {

        berechneGesamtpreis();

    }

}


/* =========================================================
   MATERIALDATEN FÜR DAS SPEICHERN VORBEREITEN
========================================================= */

function sammleMaterialien() {

    const materialPositionen = [];


    const materialKarten =
        document.querySelectorAll(".item");


    materialKarten.forEach((karte) => {

        const name =
            karte.dataset.itemName;


        if (!name) {
            return;
        }


        const menge =
            Number(materialMengen[name]) || 0;


        /*
         * Materialien mit Menge 0
         * werden nicht als Position gespeichert.
         */

        if (menge <= 0) {
            return;
        }


        const material =
            findeMaterialPreis(name);


        if (!material) {

            console.warn(
                "Material kann nicht gespeichert werden:",
                name
            );

            return;
        }


        materialPositionen.push({

            item_id: material.id,

            quantity: menge,

            price_per_piece:
                Number(material.price) || 0

        });

    });


    return materialPositionen;

}

/* =========================================================
   EHRENMARKT – REDSTONEAUFTRAG
   JS/redstoneauftrag.js

   TEIL 4 / 10
   Grundpreisberechnung
========================================================= */


/* =========================================================
   GRUNDPREIS OHNE MATERIALIEN
========================================================= */

function berechneGrundpreis() {

    /*
     * Grundstück / Merge
     */

    const plotInput =
        element("plot_count");

    const plotCount =
        Math.max(
            1,
            Number(plotInput?.value) || 1
        );


    const grundstueck =
        plotCount * GRUNDSTUECK_PREIS;


    /*
     * Planung
     */

    const planung =
        radioWert("planung");

    const planungPreis =
        PLANUNG_PREISE[planung] || 0;


    /*
     * Komplexität
     */

    const komplexitaet =
        radioWert("komplexitaet");

    const komplexitaetPreis =
        KOMPLEXITAET_PREISE[komplexitaet] || 0;


    /*
     * Anlage
     */

    const anlage =
        radioWert("anlage");

    const anlagePreis =
        ANLAGE_PREISE[anlage] || 0;


    /*
     * Redstone-Bau
     *
     * Dieser Prozentsatz wird auf den
     * bisherigen Grundpreis angewendet.
     */

    const redstoneBau =
        radioWert("redstone_bau");

    const redstoneBauProzent =
        REDSTONE_BAU_PROZENTE[redstoneBau] || 0;


    /*
     * Sonderarbeiten
     */

    let sonderarbeitenPreis = 0;


    Object.entries(
        SONDERARBEITEN_PREISE
    ).forEach(([name, preis]) => {

        if (checkboxAktiv(name)) {

            sonderarbeitenPreis +=
                Number(preis) || 0;

        }

    });


    /*
     * Erweiterung
     */

    const erweiterung =
        radioWert("extension_type");

    const erweiterungPreis =
        ERWEITERUNG_PREISE[erweiterung] || 0;


    /*
     * Grundbestandteile zusammenrechnen.
     *
     * Materialien sind hier NICHT enthalten.
     */

    let grundpreis =
        grundstueck +
        planungPreis +
        komplexitaetPreis +
        anlagePreis +
        sonderarbeitenPreis +
        erweiterungPreis;


    /*
     * Redstone-Bau-Aufschlag
     *
     * Der Prozentsatz wird auf den
     * Grundpreis ohne Materialien angewendet.
     */

    const redstoneBauAufschlag =
        grundpreis *
        (redstoneBauProzent / 100);


    grundpreis +=
        redstoneBauAufschlag;


    /*
     * Auf ganze Dollar runden.
     */

    grundpreis =
        Math.round(grundpreis);


    aktuellerGrundpreis =
        grundpreis;


    setzePreisAnzeige(
        "preisGrundpreis",
        aktuellerGrundpreis
    );


    return aktuellerGrundpreis;

}


/* =========================================================
   GRUNDPREIS BEI ÄNDERUNG NEU BERECHNEN
========================================================= */

function aktualisiereGrundpreis() {

    berechneGrundpreis();


    /*
     * Gesamtpreis aktualisieren,
     * sobald die Funktion bereits vorhanden ist.
     */

    if (
        typeof berechneGesamtpreis ===
        "function"
    ) {

        berechneGesamtpreis();

    }

}


/* =========================================================
   AUSWAHLEN ÜBERWACHEN
========================================================= */

function initialisiereGrundpreisEvents() {

    /*
     * Alle Radio-Auswahlen
     */

    const radios =
        document.querySelectorAll(
            'input[type="radio"]'
        );


    radios.forEach((radio) => {

        radio.addEventListener(
            "change",
            aktualisiereGrundpreis
        );

    });


    /*
     * Alle Sonderarbeiten
     */

    const checkboxen =
        document.querySelectorAll(
            'input[type="checkbox"]'
        );


    checkboxen.forEach((checkbox) => {

        checkbox.addEventListener(
            "change",
            aktualisiereGrundpreis
        );

    });


    /*
     * Grundstück / Merge-Anzahl
     */

    const plotInput =
        element("plot_count");


    if (plotInput) {

        plotInput.addEventListener(
            "input",
            aktualisiereGrundpreis
        );

    }

}

/* =========================================================
   EHRENMARKT – REDSTONEAUFTRAG
   JS/redstoneauftrag.js

   TEIL 5 / 10
   Dringlichkeit
========================================================= */


/* =========================================================
   DRINGLICHKEIT BERECHNEN
========================================================= */

function berechneDringlichkeit() {

    /*
     * Die Dringlichkeit wird ausschließlich
     * auf den Grundpreis OHNE Materialien
     * angewendet.
     */

    const dringlichkeit =
        radioWert("urgency_type");


    const dringlichkeitProzent =
        DRINGLICHKEIT_PROZENTE[dringlichkeit] || 0;


    /*
     * Grundpreis sicher neu berechnen,
     * damit immer der aktuelle Wert verwendet wird.
     */

    const grundpreis =
        berechneGrundpreis();


    const aufschlag =
        grundpreis *
        (dringlichkeitProzent / 100);


    aktuellerDringlichkeitspreis =
        Math.round(aufschlag);


    setzePreisAnzeige(
        "preisDringlichkeit",
        aktuellerDringlichkeitspreis
    );


    return aktuellerDringlichkeitspreis;

}


/* =========================================================
   DRINGLICHKEIT BEI ÄNDERUNG AKTUALISIEREN
========================================================= */

function aktualisiereDringlichkeit() {

    berechneDringlichkeit();


    /*
     * Danach den Gesamtpreis aktualisieren,
     * sobald die Gesamtpreis-Funktion vorhanden ist.
     */

    if (
        typeof berechneGesamtpreis ===
        "function"
    ) {

        berechneGesamtpreis();

    }

}


/* =========================================================
   DRINGLICHKEIT-EVENTS
========================================================= */

function initialisiereDringlichkeitEvents() {

    const dringlichkeitRadios =
        document.querySelectorAll(
            'input[name="urgency_type"]'
        );


    dringlichkeitRadios.forEach(
        (radio) => {

            radio.addEventListener(
                "change",
                aktualisiereDringlichkeit
            );

        }
    );

}

/* =========================================================
   EHRENMARKT – REDSTONEAUFTRAG
   JS/redstoneauftrag.js

   TEIL 6 / 10
   Wochenende + Garantie
========================================================= */


/* =========================================================
   WOCHENENDZUSCHLAG
========================================================= */

function berechneWochenende() {

    /*
     * Der Wochenendaufschlag wird erst auf den
     * Preis INKLUSIVE Redstone-Materialien berechnet.
     *
     * Deshalb wird hier zunächst nur der
     * Aufschlagswert vorbereitet.
     */

    const wochenende =
        radioWert("weekend_work");


    if (wochenende !== "true") {

        aktuellerWochenendpreis = 0;

        setzePreisAnzeige(
            "preisWochenende",
            0
        );

        return 0;
    }


    /*
     * Basis:
     *
     * Grundpreis
     * + Dringlichkeit
     * + Materialien
     */

    const basis =
        aktuellerGrundpreis +
        aktuellerDringlichkeitspreis +
        aktuellerMaterialpreis;


    const aufschlag =
        basis *
        (WOCHENENDE_PROZENT / 100);


    aktuellerWochenendpreis =
        Math.round(aufschlag);


    setzePreisAnzeige(
        "preisWochenende",
        aktuellerWochenendpreis
    );


    return aktuellerWochenendpreis;

}


/* =========================================================
   GARANTIEZUSCHLAG
========================================================= */

function berechneGarantie() {

    /*
     * Garantie wird ebenfalls auf den
     * vollständigen Auftragspreis inklusive
     * Redstone-Materialien berechnet.
     *
     * Der Wochenendaufschlag gehört dabei
     * bereits zum Preis.
     */

    const garantie =
        radioWert("guarantee_months");


    const garantieProzent =
        GARANTIE_PROZENTE[garantie] || 0;


    /*
     * Basis:
     *
     * Grundpreis
     * + Dringlichkeit
     * + Materialien
     * + Wochenende
     */

    const basis =
        aktuellerGrundpreis +
        aktuellerDringlichkeitspreis +
        aktuellerMaterialpreis +
        aktuellerWochenendpreis;


    const aufschlag =
        basis *
        (garantieProzent / 100);


    aktuellerGarantiepreis =
        Math.round(aufschlag);


    setzePreisAnzeige(
        "preisGarantie",
        aktuellerGarantiepreis
    );


    return aktuellerGarantiepreis;

}


/* =========================================================
   WOCHENENDE + GARANTIE AKTUALISIEREN
========================================================= */

function aktualisiereWochenendeGarantie() {

    /*
     * Erst die Grundbestandteile aktualisieren.
     */

    berechneGrundpreis();


    /*
     * Dringlichkeit aktualisieren.
     */

    berechneDringlichkeit();


    /*
     * Wochenende braucht bereits die
     * Materialkosten.
     */

    berechneWochenende();


    /*
     * Garantie wird zuletzt auf den bis dahin
     * vollständigen Preis berechnet.
     */

    berechneGarantie();


    /*
     * Gesamtpreis aktualisieren,
     * sobald Teil 7 vorhanden ist.
     */

    if (
        typeof berechneGesamtpreis ===
        "function"
    ) {

        berechneGesamtpreis();

    }

}


/* =========================================================
   WOCHENEND-EVENTS
========================================================= */

function initialisiereWochenendeEvents() {

    const radios =
        document.querySelectorAll(
            'input[name="weekend_work"]'
        );


    radios.forEach((radio) => {

        radio.addEventListener(
            "change",
            aktualisiereWochenendeGarantie
        );

    });

}


/* =========================================================
   GARANTIE-EVENTS
========================================================= */

function initialisiereGarantieEvents() {

    const radios =
        document.querySelectorAll(
            'input[name="guarantee_months"]'
        );


    radios.forEach((radio) => {

        radio.addEventListener(
            "change",
            aktualisiereWochenendeGarantie
        );

    });

}


// ============================================================
// TEIL 7 – GESAMTPREIS, ANZAHLUNG & RESTBETRAG
// ============================================================

function berechneGesamtpreis() {
    // Grundpreis komplett neu berechnen
    berechneGrundpreis();

    // Dringlichkeit auf Basis des aktuellen Grundpreises
    berechneDringlichkeit();

    // Wochenende auf Basis von Grundpreis + Dringlichkeit + Materialien
    berechneWochenende();

    // Garantie auf Basis von Grundpreis + Dringlichkeit
    // + Materialien + Wochenende
    berechneGarantie();

    // Materialpreis wird hier NICHT neu berechnet.
    // Dieser wird bereits durch berechneMaterialpreis()
    // aktualisiert. Dadurch entsteht keine Endlosschleife.

    const gesamt =
        aktuellerGrundpreis +
        aktuellerDringlichkeitspreis +
        aktuellerMaterialpreis +
        aktuellerWochenendpreis +
        aktuellerGarantiepreis;

    aktuellerGesamtpreis = Math.round(gesamt);

    // Gesamtpreis anzeigen
    setzePreisAnzeige("gesamtPreis", aktuellerGesamtpreis);

    // 25 % Anzahlung
    const anzahlung = Math.round(aktuellerGesamtpreis * 0.25);

    // 75 % Restbetrag
    const restbetrag = aktuellerGesamtpreis - anzahlung;

    setzePreisAnzeige("anzahlung", anzahlung);
    setzePreisAnzeige("restbetrag", restbetrag);

    return {
        gesamtpreis: aktuellerGesamtpreis,
        anzahlung: anzahlung,
        restbetrag: restbetrag
    };
}


// ============================================================
// GESAMTPREIS AKTUALISIEREN
// ============================================================

function aktualisiereGesamtpreis() {
    return berechneGesamtpreis();
          }

// ============================================================
// TEIL 8 – INITIALISIERUNG
// ============================================================

function initialisiereRedstoneAuftrag() {

    // Supabase prüfen
    if (!pruefeSupabase()) {
        return;
    }

    // Materialmengen vorbereiten
    initialisiereMaterialMengen();

    // Startwerte der Preisfelder setzen
    setzeStartwerte();

    // Material-Buttons aktivieren
    initialisiereMaterialButtons();

    // Änderungen bei Grundstück, Planung,
    // Komplexität, Anlage, Bau, Sonderarbeiten
    // und Erweiterung überwachen
    initialisiereGrundpreisEvents();

    // Änderungen der Dringlichkeit überwachen
    initialisiereDringlichkeitEvents();

    // Wochenende überwachen
    initialisiereWochenendeEvents();

    // Garantie überwachen
    initialisiereGarantieEvents();

    // Redstone-Preise aus Supabase laden
    ladeRedstonePreise()
        .then(() => {
            // Nachdem die Preise geladen wurden,
            // komplette Berechnung durchführen
            berechneMaterialpreis();
            berechneGesamtpreis();
        })
        .catch((fehler) => {
            console.error(
                "Fehler bei der Initialisierung des Redstone-Auftrags:",
                fehler
            );
        });
}


// ============================================================
// SEITE GELADEN
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    initialisiereRedstoneAuftrag();
});

// ============================================================
// TEIL 7 – GESAMTPREIS, ANZAHLUNG & RESTBETRAG
// ============================================================

function berechneGesamtpreis() {
    // Grundpreis komplett neu berechnen
    berechneGrundpreis();

    // Dringlichkeit auf Basis des aktuellen Grundpreises
    berechneDringlichkeit();

    // Wochenende auf Basis von Grundpreis + Dringlichkeit + Materialien
    berechneWochenende();

    // Garantie auf Basis von Grundpreis + Dringlichkeit
    // + Materialien + Wochenende
    berechneGarantie();

    // Materialpreis wird hier NICHT neu berechnet.
    // Dieser wird bereits durch berechneMaterialpreis()
    // aktualisiert. Dadurch entsteht keine Endlosschleife.

    const gesamt =
        aktuellerGrundpreis +
        aktuellerDringlichkeitspreis +
        aktuellerMaterialpreis +
        aktuellerWochenendpreis +
        aktuellerGarantiepreis;

    aktuellerGesamtpreis = Math.round(gesamt);

    // Gesamtpreis anzeigen
    setzePreisAnzeige("gesamtPreis", aktuellerGesamtpreis);

    // 25 % Anzahlung
    const anzahlung = Math.round(aktuellerGesamtpreis * 0.25);

    // 75 % Restbetrag
    const restbetrag = aktuellerGesamtpreis - anzahlung;

    setzePreisAnzeige("anzahlung", anzahlung);
    setzePreisAnzeige("restbetrag", restbetrag);

    return {
        gesamtpreis: aktuellerGesamtpreis,
        anzahlung: anzahlung,
        restbetrag: restbetrag
    };
}


// ============================================================
// GESAMTPREIS AKTUALISIEREN
// ============================================================

function aktualisiereGesamtpreis() {
    return berechneGesamtpreis();
}

// ============================================================
// TEIL 10 – AUFTRAG ERSTELLEN UND SPEICHERN
// ============================================================

function pruefeRedstoneFormular() {

    const minecraftName = element("minecraft_name")?.value.trim();
    const titel = element("auftragstitel")?.value.trim();
    const beschreibung = element("beschreibung")?.value.trim();

    if (!minecraftName) {
        alert("Bitte gib deinen Minecraft-Namen ein.");
        return false;
    }

    if (!titel) {
        alert("Bitte gib einen Auftragstitel ein.");
        return false;
    }

    if (!beschreibung) {
        alert("Bitte beschreibe deinen Auftrag.");
        return false;
    }

    if (!radioWert("planung")) {
        alert("Bitte wähle eine Planungsstufe.");
        return false;
    }

    if (!radioWert("komplexitaet")) {
        alert("Bitte wähle die Komplexität.");
        return false;
    }

    if (!radioWert("anlage")) {
        alert("Bitte wähle die Größe der Redstone-Anlage.");
        return false;
    }

    if (!radioWert("redstone_bau")) {
        alert("Bitte wähle die Redstone-Bauart.");
        return false;
    }

    if (!radioWert("extension_type")) {
        alert("Bitte wähle eine Erweiterung.");
        return false;
    }

    if (!radioWert("urgency_type")) {
        alert("Bitte wähle die Dringlichkeit.");
        return false;
    }

    if (!radioWert("weekend_work")) {
        alert("Bitte wähle die Wochenendarbeit.");
        return false;
    }

    if (!radioWert("guarantee_months")) {
        alert("Bitte wähle die Garantie.");
        return false;
    }

    return true;
}


// ============================================================
// AUFTRAGSDATEN SAMMELN
// ============================================================

function sammleRedstoneAuftragsdaten(user) {

    const preis =
        berechneGesamtpreis();

    return {

        user_id: user.id,

        customer_name:
            user.email || "Ehrenmarkt-Kunde",

        minecraft_name:
            element("minecraft_name")?.value.trim() || "",

        title:
            element("auftragstitel")?.value.trim() || "",

        description:
            element("beschreibung")?.value.trim() || "",

        plot_count:
            Math.max(
                1,
                Number(element("plot_count")?.value) || 1
            ),

        planning_type:
            radioWert("planung"),

        complexity:
            radioWert("komplexitaet"),

        plant_size:
            radioWert("anlage"),

        redstone_build_type:
            radioWert("redstone_bau"),

        special_existing_installation:
            checkboxAktiv("special_existing_installation"),

        special_existing_conversion:
            checkboxAktiv("special_existing_conversion"),

        special_foreign_repair:
            checkboxAktiv("special_foreign_repair"),

        special_compact_build:
            checkboxAktiv("special_compact_build"),

        special_hidden_redstone:
            checkboxAktiv("special_hidden_redstone"),

        special_difficult_access:
            checkboxAktiv("special_difficult_access"),

        extension_type:
            radioWert("extension_type"),

        urgency_type:
            radioWert("urgency_type"),

        weekend_work:
            radioWert("weekend_work") === "true",

        guarantee_months:
            Number(radioWert("guarantee_months")) || 0,

        total_price:
            preis.gesamtpreis,

        deposit_amount:
            preis.anzahlung,

        remaining_amount:
            preis.restbetrag,

        materialien:
            sammleMaterialien()

    };
}


// ============================================================
// AUFTRAG IN SUPABASE SPEICHERN
// ============================================================

async function erstelleRedstoneAuftrag() {

    if (!pruefeSupabase()) {

        alert(
            "Die Verbindung zu Supabase ist nicht verfügbar."
        );

        return;
    }


    if (!pruefeRedstoneFormular()) {
        return;
    }


    const button =
        element("auftragAbsenden");


    if (button) {

        button.disabled = true;

        button.textContent =
            "Auftrag wird erstellt...";
    }


    try {

        // Angemeldeten Benutzer holen

        const {
            data: userData,
            error: userError
        } =
            await supabaseClient.auth.getUser();


        if (userError) {
            throw userError;
        }


        const user =
            userData?.user;


        if (!user) {

            alert(
                "Du musst angemeldet sein, " +
                "um einen Auftrag zu erstellen."
            );

            return;
        }


        // Preise noch einmal vollständig berechnen

        berechneMaterialpreis();

        const preis =
            berechneGesamtpreis();


        // Auftragsdaten sammeln

        const auftrag =
            sammleRedstoneAuftragsdaten(user);


        // Eindeutige Auftragsnummer

        const orderNumber =
            "RS-" +
            Date.now().toString() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 7)
                .toUpperCase();


        // Daten für redstone_orders

        const orderData = {

            order_number:
                orderNumber,

            user_id:
                auftrag.user_id,

            customer_name:
                auftrag.customer_name,

            minecraft_name:
                auftrag.minecraft_name,

            title:
                auftrag.title,

            description:
                auftrag.description,

            plot_count:
                auftrag.plot_count,

            planning_type:
                auftrag.planning_type,

            complexity:
                auftrag.complexity,

            plant_size:
                auftrag.plant_size,

            redstone_build_type:
                auftrag.redstone_build_type,

            special_existing_installation:
                auftrag.special_existing_installation,

            special_existing_conversion:
                auftrag.special_existing_conversion,

            special_foreign_repair:
                auftrag.special_foreign_repair,

            special_compact_build:
                auftrag.special_compact_build,

            special_hidden_redstone:
                auftrag.special_hidden_redstone,

            special_difficult_access:
                auftrag.special_difficult_access,

            extension_type:
                auftrag.extension_type,

            urgency_type:
                auftrag.urgency_type,

            weekend_work:
                auftrag.weekend_work,

            guarantee_months:
                auftrag.guarantee_months,

            total_price:
                preis.gesamtpreis,

            deposit_amount:
                preis.anzahlung,

            remaining_amount:
                preis.restbetrag

        };


        // Auftrag speichern

        const {
            data: gespeicherterAuftrag,
            error: orderError
        } =
            await supabaseClient
                .from(SUPABASE_TABLE_ORDERS)
                .insert(orderData)
                .select("id, order_number")
                .single();


        if (orderError) {
            throw orderError;
        }


        // Materialien speichern

        const materialien =
            auftrag.materialien;


        if (materialien.length > 0) {

            const materialDaten =
                materialien.map((material) => ({

                    order_id:
                        gespeicherterAuftrag.id,

                    item_id:
                        material.item_id,

                    quantity:
                        material.quantity,

                    price_per_piece:
                        material.price_per_piece

                }));


            const {
                error: materialError
            } =
                await supabaseClient
                    .from(
                        SUPABASE_TABLE_ORDER_ITEMS
                    )
                    .insert(materialDaten);


            if (materialError) {

                // Auftrag wieder löschen,
                // wenn Materialien nicht gespeichert wurden

                await supabaseClient
                    .from(SUPABASE_TABLE_ORDERS)
                    .delete()
                    .eq(
                        "id",
                        gespeicherterAuftrag.id
                    );

                throw materialError;
            }
        }


        // Daten für Erfolgsseite speichern

        sessionStorage.setItem(
            "redstone_order_number",
            gespeicherterAuftrag.order_number
        );

        sessionStorage.setItem(
            "redstone_order_price",
            String(preis.gesamtpreis)
        );

        sessionStorage.setItem(
            "redstone_order_deposit",
            String(preis.anzahlung)
        );

        sessionStorage.setItem(
            "redstone_order_remaining",
            String(preis.restbetrag)
        );


        // Zur Erfolgsseite

        window.location.href =
            "../HTML/redstone_erfolgreich.html";


    } catch (fehler) {

        console.error(
            "Fehler beim Erstellen des Redstone-Auftrags:",
            fehler
        );


        alert(
            "Der Auftrag konnte nicht erstellt werden.\n\n" +
            "Bitte versuche es erneut."
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Redstone-Auftrag erstellen";
        }

    }

}


// ============================================================
// ABSENDEN-BUTTON
// ============================================================

function initialisiereAuftragAbsenden() {

    const button =
        element("auftragAbsenden");


    if (!button) {

        console.error(
            "Der Button #auftragAbsenden wurde nicht gefunden."
        );

        return;
    }


    button.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            erstelleRedstoneAuftrag();

        }
    );

}


// ============================================================
// SEITE GELADEN
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initialisiereAuftragAbsenden();

    }
);
