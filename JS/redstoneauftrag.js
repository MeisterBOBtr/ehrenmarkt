// ==========================================
// EHRENMARKT – REDSTONEAUFTRAG
// Teil 1/10 – Grundaufbau + Preise
// ==========================================


// ------------------------------------------
// Preise
// ------------------------------------------

const REDSTONE_PREISE = {};


// ------------------------------------------
// Grundpreise
// ------------------------------------------

const GRUND_PREISE = {
    grundstueck: 300000,

    planung: {
        einfach: 5000,
        normal: 10000,
        komplex: 20000,
        sehr_komplex: 30000
    },

    komplexitaet: {
        einfach: 2500,
        normal: 12500,
        komplex: 25000
    },

    anlage: {
        klein: 75000,
        mittel: 150000,
        gross: 300000
    },

    redstone_bau: {
        einfach: 0,
        normal: 10,
        komplex: 20,
        sehr_komplex: 25
    },

    sonderarbeiten: {
        bestehende_installation: 20000,
        bestehende_anlage: 30000,
        fremde_reparatur: 50000,
        kompaktbauweise: 30000,
        verdecktes_redstone: 30000,
        schwieriger_zugang: 40000
    },

    erweiterung: {
        klein: 250000,
        mittel: 500000,
        gross: 1000000
    }
};


// ------------------------------------------
// Zuschläge
// ------------------------------------------

const ZUSCHLAEGE = {

    dringlichkeit: {
        express: 50,
        notfall: 75,
        sofort: 100
    },

    wochenende: 25,

    garantie: {
        keine: 0,
        monat1: 5,
        monat2: 10,
        monat3: 15
    }
};


// ------------------------------------------
// Auftragsnummer
// ------------------------------------------

function erstelleAuftragsnummer() {

    const zufall =
        Math.floor(
            1000 +
            Math.random() * 9000
        );

    return `EM-RED-${zufall}`;
}

// ==========================================
// Teil 2/10 – Supabase + Artikelpreise
// ==========================================


// ------------------------------------------
// Redstone-Preise aus Supabase laden
// ------------------------------------------

async function ladeRedstonePreise() {

    const { data, error } = await supabaseClient
        .from("redstone_prices")
        .select("id, name, price")
        .order("id", { ascending: true });

    if (error) {
        console.error(
            "Redstone-Preise konnten nicht geladen werden:",
            error.message
        );

        return false;
    }

    // Preise im Speicher ablegen
    data.forEach(item => {

        REDSTONE_PREISE[item.id] = {
            name: item.name,
            price: Number(item.price)
        };

    });

    console.log(
        "Redstone-Preise geladen:",
        REDSTONE_PREISE
    );

    return true;
}


// ------------------------------------------
// Eingeloggten Benutzer prüfen
// ------------------------------------------

async function holeAktuellenBenutzer() {

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();

    if (error) {

        console.error(
            "Benutzer konnte nicht geladen werden:",
            error.message
        );

        return null;
    }

    return data.user;
}

// ==========================================
// Teil 3/10 – Mengensteuerung + Materialpreis
// ==========================================


// ------------------------------------------
// Artikelmengen speichern
// ------------------------------------------

const REDSTONE_MENGEN = {};


// ------------------------------------------
// Alle Artikel vorbereiten
// ------------------------------------------

function initialisiereArtikel() {

    const artikel = document.querySelectorAll(".item");

    artikel.forEach(item => {

        const nameElement =
            item.querySelector(".item-name");

        const mengeElement =
            item.querySelector(".menge-zahl");

        const minusButton =
            item.querySelector(".minus");

        const plusButton =
            item.querySelector(".plus");

        if (
            !nameElement ||
            !mengeElement ||
            !minusButton ||
            !plusButton
        ) {
            return;
        }

        const name = nameElement.textContent.trim();

        REDSTONE_MENGEN[name] = 0;

        minusButton.addEventListener("click", () => {

            if (REDSTONE_MENGEN[name] > 0) {
                REDSTONE_MENGEN[name]--;
            }

            mengeElement.textContent =
                REDSTONE_MENGEN[name];

            aktualisiereGesamtpreis();
        });


        plusButton.addEventListener("click", () => {

            REDSTONE_MENGEN[name]++;

            mengeElement.textContent =
                REDSTONE_MENGEN[name];

            aktualisiereGesamtpreis();
        });

    });
}


// ------------------------------------------
// Materialkosten berechnen
// ------------------------------------------

function berechneMaterialkosten() {

    let materialKosten = 0;

    const artikel = document.querySelectorAll(".item");

    artikel.forEach(item => {

        const nameElement =
            item.querySelector(".item-name");

        const mengeElement =
            item.querySelector(".menge-zahl");

        if (!nameElement || !mengeElement) {
            return;
        }

        const name =
            nameElement.textContent.trim();

        const menge =
            Number(mengeElement.textContent) || 0;

        // Passenden Artikel aus Supabase suchen
        const artikelEintrag =
            Object.values(REDSTONE_PREISE)
                .find(item => item.name === name);

        if (!artikelEintrag) {
            return;
        }

        materialKosten +=
            menge * artikelEintrag.price;
    });

    return materialKosten;
}

// ==========================================
// Teil 4/10 – Grundpreis berechnen
// ==========================================


// ------------------------------------------
// Ausgewählten Wert eines Bereichs holen
// ------------------------------------------

function holeAuswahl(name) {

    const element =
        document.querySelector(
            `input[name="${name}"]:checked`
        );

    if (!element) {
        return null;
    }

    return element.value;
}


// ------------------------------------------
// Grundpreis berechnen
// ------------------------------------------

function berechneGrundpreis() {

    const mergeAnzahl =
    Number(
        document.querySelector(
            'input[name="plot_count"]'
        )?.value || 1
    );

let grundpreis =
    GRUND_PREISE.grundstueck * mergeAnzahl;


    // --------------------------------------
    // Planung
    // --------------------------------------

    const planung =
        holeAuswahl("planung");

    if (
        planung &&
        GRUND_PREISE.planung[planung] !== undefined
    ) {

        grundpreis +=
            GRUND_PREISE.planung[planung];

    }


    // --------------------------------------
    // Komplexität
    // --------------------------------------

    const komplexitaet =
        holeAuswahl("komplexitaet");

    if (
        komplexitaet &&
        GRUND_PREISE.komplexitaet[komplexitaet] !== undefined
    ) {

        grundpreis +=
            GRUND_PREISE.komplexitaet[komplexitaet];

    }


    // --------------------------------------
    // Anlage
    // --------------------------------------

    const anlage =
        holeAuswahl("anlage");

    if (
        anlage &&
        GRUND_PREISE.anlage[anlage] !== undefined
    ) {

        grundpreis +=
            GRUND_PREISE.anlage[anlage];

    }


    // --------------------------------------
    // Redstone-Bau
    // --------------------------------------

    const redstoneBau =
        holeAuswahl("redstone_bau");

    if (
        redstoneBau &&
        GRUND_PREISE.redstone_bau[redstoneBau] !== undefined
    ) {

        const prozent =
            GRUND_PREISE.redstone_bau[redstoneBau];

        grundpreis +=
            grundpreis * (prozent / 100);

    }


    // --------------------------------------
    // Sonderarbeiten
    // --------------------------------------

    const sonderarbeiten = {

    bestehende_installation:
        document.getElementById(
            "special_existing_installation"
        )?.checked || false,

    bestehende_anlage:
        document.getElementById(
            "special_existing_conversion"
        )?.checked || false,

    fremde_reparatur:
        document.getElementById(
            "special_foreign_repair"
        )?.checked || false,

    kompaktbauweise:
        document.getElementById(
            "special_compact_build"
        )?.checked || false,

    verdecktes_redstone:
        document.getElementById(
            "special_hidden_redstone"
        )?.checked || false,

    schwieriger_zugang:
        document.getElementById(
            "special_difficult_access"
        )?.checked || false

};


Object.entries(sonderarbeiten).forEach(
    ([name, ausgewählt]) => {

        if (
            ausgewählt &&
            GRUND_PREISE.sonderarbeiten[name] !== undefined
        ) {

            grundpreis +=
                GRUND_PREISE.sonderarbeiten[name];

        }

    }
);


    // --------------------------------------
    // Erweiterung
    // --------------------------------------

    const erweiterung =
        holeAuswahl("erweiterung");

    if (
        erweiterung &&
        GRUND_PREISE.erweiterung[erweiterung] !== undefined
    ) {

        grundpreis +=
            GRUND_PREISE.erweiterung[erweiterung];

    }


    return Math.round(grundpreis);
}

// ==========================================
// Teil 5/10 – Dringlichkeit
// ==========================================


// ------------------------------------------
// Dringlichkeits-Zuschlag berechnen
// ------------------------------------------

function berechneDringlichkeit(grundpreis) {

    const dringlichkeit =
    holeAuswahl("urgency");

    if (!dringlichkeit) {
        return 0;
    }

    const prozent =
        ZUSCHLAEGE.dringlichkeit[dringlichkeit];

    if (prozent === undefined) {
        return 0;
    }

    return Math.round(
        grundpreis * (prozent / 100)
    );
}

// ==========================================
// Teil 6/10 – Wochenende + Garantie
// ==========================================


// ------------------------------------------
// Wochenend-Zuschlag berechnen
// ------------------------------------------

function berechneWochenende(zwischenpreis) {

    const wochenende =
    document.querySelector(
        'input[name="weekend"]:checked'
    );

    // Keine Auswahl oder "Nein"
    if (!wochenende) {
        return 0;
    }

    if (
        wochenende.value !== "ja" &&
        wochenende.value !== "true"
    ) {
        return 0;
    }

    return Math.round(
        zwischenpreis *
        (ZUSCHLAEGE.wochenende / 100)
    );
}


// ------------------------------------------
// Garantie-Zuschlag berechnen
// ------------------------------------------

function berechneGarantie(zwischenpreis) {

    const garantie =
        holeAuswahl("garantie");

    if (!garantie) {
        return 0;
    }

    const prozent =
        ZUSCHLAEGE.garantie[garantie];

    if (prozent === undefined) {
        return 0;
    }

    return Math.round(
        zwischenpreis *
        (prozent / 100)
    );
}

// ==========================================
// Teil 7/10 – Gesamtpreis + Anzahlung
// ==========================================


// ------------------------------------------
// Gesamten Auftragspreis berechnen
// ------------------------------------------

function berechneGesamtpreis() {

    // 1. Grundpreis
    const grundpreis =
        berechneGrundpreis();


    // 2. Dringlichkeit
    //    Nur auf den Grundpreis
    const dringlichkeit =
        berechneDringlichkeit(grundpreis);

    const preisNachDringlichkeit =
        grundpreis + dringlichkeit;


    // 3. Redstone-Materialien
    const materialKosten =
        berechneMaterialkosten();

    const preisMitMaterial =
        preisNachDringlichkeit + materialKosten;


    // 4. Wochenendarbeit
    //    Auf den Preis inklusive Materialien
    const wochenende =
        berechneWochenende(preisMitMaterial);

    const preisNachWochenende =
        preisMitMaterial + wochenende;


    // 5. Garantie
    //    Ebenfalls auf den kompletten Preis
    const garantie =
        berechneGarantie(preisNachWochenende);

    const gesamtpreis =
        preisNachWochenende + garantie;


    return {
        grundpreis: grundpreis,
        dringlichkeit: dringlichkeit,
        material: materialKosten,
        wochenende: wochenende,
        garantie: garantie,
        gesamtpreis: Math.round(gesamtpreis)
    };
}


// ------------------------------------------
// 25 % Anzahlung / 75 % Restbetrag
// ------------------------------------------

function berechneZahlungen(gesamtpreis) {

    const anzahlung =
        Math.round(gesamtpreis * 0.25);

    const restbetrag =
        Math.round(gesamtpreis - anzahlung);

    return {
        anzahlung: anzahlung,
        restbetrag: restbetrag
    };
}

// ==========================================
// Teil 8/10 – Preisübersicht aktualisieren
// ==========================================


// ------------------------------------------
// Preis formatieren
// ------------------------------------------

function formatierePreis(preis) {

    return `${Math.round(preis).toLocaleString("de-DE")} $`;

}


// ------------------------------------------
// Preisübersicht im HTML aktualisieren
// ------------------------------------------

function aktualisiereGesamtpreis() {

    const preise =
        berechneGesamtpreis();

    const zahlungen =
        berechneZahlungen(
            preise.gesamtpreis
        );


    // Grundpreis

    const grundpreisElement =
        document.getElementById(
            "preisGrundpreis"
        );

    if (grundpreisElement) {

        grundpreisElement.textContent =
            formatierePreis(
                preise.grundpreis
            );

    }


    // Materialien

    const materialElement =
        document.getElementById(
            "preisMaterial"
        );

    if (materialElement) {

        materialElement.textContent =
            formatierePreis(
                preise.material
            );

    }


    // Dringlichkeit

    const dringlichkeitElement =
        document.getElementById(
            "preisDringlichkeit"
        );

    if (dringlichkeitElement) {

        dringlichkeitElement.textContent =
            formatierePreis(
                preise.dringlichkeit
            );

    }


    // Wochenende

    const wochenendeElement =
        document.getElementById(
            "preisWochenende"
        );

    if (wochenendeElement) {

        wochenendeElement.textContent =
            formatierePreis(
                preise.wochenende
            );

    }


    // Garantie

    const garantieElement =
        document.getElementById(
            "preisGarantie"
        );

    if (garantieElement) {

        garantieElement.textContent =
            formatierePreis(
                preise.garantie
            );

    }


    // Gesamtpreis

    const gesamtElement =
        document.getElementById(
            "gesamtPreis"
        );

    if (gesamtElement) {

        gesamtElement.textContent =
            formatierePreis(
                preise.gesamtpreis
            );

    }


    // Anzahlung

    const anzahlungElement =
        document.getElementById(
            "anzahlung"
        );

    if (anzahlungElement) {

        anzahlungElement.textContent =
            formatierePreis(
                zahlungen.anzahlung
            );

    }


    // Restbetrag

    const restbetragElement =
        document.getElementById(
            "restbetrag"
        );

    if (restbetragElement) {

        restbetragElement.textContent =
            formatierePreis(
                zahlungen.restbetrag
            );

    }
}

// ==========================================
// Teil 9/10 – Initialisierung
// ==========================================


// ------------------------------------------
// Berechnung bei Auswahl ändern
// ------------------------------------------

function aktivierePreisberechnung() {

    const auswahlElemente =
        document.querySelectorAll(
            'input[type="radio"], input[type="checkbox"]'
        );

    auswahlElemente.forEach(element => {

        element.addEventListener(
            "change",
            aktualisiereGesamtpreis
        );

    });
}


// ------------------------------------------
// Seite initialisieren
// ------------------------------------------

async function initialisiereRedstoneAuftrag() {

    // Preise aus Supabase laden
    const preiseGeladen =
        await ladeRedstonePreise();

    if (!preiseGeladen) {

        console.error(
            "Die Redstone-Preise konnten nicht geladen werden."
        );

        return;
    }


    // Artikel vorbereiten
    initialisiereArtikel();


    // Auswahlfelder überwachen
    aktivierePreisberechnung();


    // Startberechnung
    aktualisiereGesamtpreis();


    console.log(
        "Redstone-Auftrag erfolgreich initialisiert."
    );
}


// ------------------------------------------
// Start
// ------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    initialisiereRedstoneAuftrag
);

// ==========================================
// Teil 10/10 – Auftrag speichern
// ==========================================


// ------------------------------------------
// Auftrag erstellen
// ------------------------------------------

async function erstelleRedstoneAuftrag() {

    const benutzer =
        await holeAktuellenBenutzer();

    if (!benutzer) {

        alert(
            "Du musst angemeldet sein, um einen Auftrag zu erstellen."
        );

        return;
    }


    // --------------------------------------
    // Auftragsdaten auslesen
    // --------------------------------------

    const minecraftName =
        document.querySelector(
            'input[name="minecraft_name"]'
        )?.value.trim();

    const auftragstitel =
        document.querySelector(
            'input[name="auftragstitel"]'
        )?.value.trim();

    const beschreibung =
        document.querySelector(
            'textarea[name="beschreibung"]'
        )?.value.trim();


    if (!minecraftName) {

        alert(
            "Bitte gib deinen Minecraft-Namen ein."
        );

        return;
    }


    if (!auftragstitel) {

        alert(
            "Bitte gib einen Auftragstitel ein."
        );

        return;
    }


    // --------------------------------------
    // Auswahlen
    // --------------------------------------

    const grundstueck =
        Number(
            document.querySelector(
                'input[name="grundstueck"]:checked'
            )?.value || 1
        );

    const planung =
        holeAuswahl("planung");

    const komplexitaet =
        holeAuswahl("komplexitaet");

    const anlage =
        holeAuswahl("anlage");

    const redstoneBau =
        holeAuswahl("redstone_bau");

    const erweiterung =
        holeAuswahl("erweiterung");

    const dringlichkeit =
        holeAuswahl("dringlichkeit");

    const garantie =
        holeAuswahl("garantie");


    // --------------------------------------
    // Sonderarbeiten
    // --------------------------------------

    const sonderarbeiten =
        document.querySelectorAll(
            'input[name="sonderarbeiten"]:checked'
        );

    const sonderwerte = [];

    sonderarbeiten.forEach(option => {

        sonderwerte.push(option.value);

    });


    // --------------------------------------
    // Einzelne Sonderarbeiten
    // --------------------------------------

    const bestehendeInstallation =
        sonderwerte.includes(
            "bestehende_installation"
        );

    const bestehendeAnlage =
        sonderwerte.includes(
            "bestehende_anlage"
        );

    const fremdeReparatur =
        sonderwerte.includes(
            "fremde_reparatur"
        );

    const kompaktbauweise =
        sonderwerte.includes(
            "kompaktbauweise"
        );

    const verdecktesRedstone =
        sonderwerte.includes(
            "verdecktes_redstone"
        );

    const schwierigerZugang =
        sonderwerte.includes(
            "schwieriger_zugang"
        );


    // --------------------------------------
    // Wochenende
    // --------------------------------------

    const wochenendeElement =
        document.querySelector(
            'input[name="wochenende"]:checked'
        );

    const wochenende =
        wochenendeElement &&
        (
            wochenendeElement.value === "ja" ||
            wochenendeElement.value === "true"
        );


    // --------------------------------------
    // Preise berechnen
    // --------------------------------------

    const preise =
        berechneGesamtpreis();

    const zahlungen =
        berechneZahlungen(
            preise.gesamtpreis
        );


    // --------------------------------------
    // Auftragsnummer
    // --------------------------------------

    const auftragsnummer =
        erstelleAuftragsnummer();


    // --------------------------------------
    // Auftrag in Supabase speichern
    // --------------------------------------

    const { data: auftrag, error } =
        await supabaseClient
            .from("redstone_orders")
            .insert({

                order_number:
                    auftragsnummer,

                user_id:
                    benutzer.id,

                customer_name:
                    benutzer.email,

                minecraft_name:
                    minecraftName,

                title:
                    auftragstitel,

                description:
                    beschreibung || null,

                status:
                    "Offen",

                assigned_employee_id:
                    null,

                plot_count:
                    grundstueck,

                planning_type:
                    planung,

                complexity:
                    komplexitaet,

                plant_type:
                    anlage,

                plant_size:
                    anlage,

                redstone_build_type:
                    redstoneBau,

                special_existing_installation:
                    bestehendeInstallation,

                special_existing_conversion:
                    bestehendeAnlage,

                special_foreign_repair:
                    fremdeReparatur,

                special_compact_build:
                    kompaktbauweise,

                special_hidden_redstone:
                    verdecktesRedstone,

                special_difficult_access:
                    schwierigerZugang,

                extension_type:
                    erweiterung,

                urgency_type:
                    dringlichkeit,

                weekend_work:
                    wochenende,

                guarantee_months:
                    garantie === "monat1"
                        ? 1
                        : garantie === "monat2"
                            ? 2
                            : garantie === "monat3"
                                ? 3
                                : 0,

                total_price:
                    preise.gesamtpreis,

                deposit_amount:
                    zahlungen.anzahlung,

                remaining_amount:
                    zahlungen.restbetrag,

                clan_profit:
                    0,

                worker_total:
                    0

            })
            .select()
            .single();


    if (error) {

        console.error(
            "Redstone-Auftrag konnte nicht erstellt werden:",
            error
        );

        alert(
            "Der Auftrag konnte nicht erstellt werden."
        );

        return;
    }


    // --------------------------------------
    // Materialpositionen speichern
    // --------------------------------------

    const materialPositionen = [];


    const artikel =
        document.querySelectorAll(".item");


    artikel.forEach(item => {

        const nameElement =
            item.querySelector(".item-name");

        const mengeElement =
            item.querySelector(".menge-zahl");

        if (!nameElement || !mengeElement) {
            return;
        }

        const name =
            nameElement.textContent.trim();

        const menge =
            Number(mengeElement.textContent) || 0;


        if (menge <= 0) {
            return;
        }


        const artikelEintrag =
            Object.entries(REDSTONE_PREISE)
                .find(
                    ([id, artikel]) =>
                        artikel.name === name
                );


        if (!artikelEintrag) {
            return;
        }


        const [artikelId, artikelDaten] =
            artikelEintrag;


        materialPositionen.push({

            order_id:
                auftrag.id,

            item_id:
                Number(artikelId),

            quantity:
                menge,

            price_per_piece:
                artikelDaten.price

        });

    });


    // --------------------------------------
    // Materialpositionen speichern
    // --------------------------------------

    if (materialPositionen.length > 0) {

        const {
            error: materialError
        } = await supabaseClient
            .from("redstone_order_items")
            .insert(materialPositionen);


        if (materialError) {

            console.error(
                "Materialpositionen konnten nicht gespeichert werden:",
                materialError
            );


            // Auftrag wieder löschen,
            // falls die Materialpositionen
            // nicht gespeichert werden konnten.

            await supabaseClient
                .from("redstone_orders")
                .delete()
                .eq("id", auftrag.id);


            alert(
                "Die Materialien konnten nicht gespeichert werden. Der Auftrag wurde nicht erstellt."
            );

            return;
        }
    }


    // --------------------------------------
    // Daten für Erfolgseite speichern
    // --------------------------------------

    sessionStorage.setItem(
        "ehrenmarkt_redstoneauftrag",
        auftragsnummer
    );

    sessionStorage.setItem(
        "ehrenmarkt_redstoneauftrag_preis",
        String(preise.gesamtpreis)
    );

    sessionStorage.setItem(
        "ehrenmarkt_redstoneauftrag_anzahlung",
        String(zahlungen.anzahlung)
    );

    sessionStorage.setItem(
        "ehrenmarkt_redstoneauftrag_restbetrag",
        String(zahlungen.restbetrag)
    );


    // --------------------------------------
    // Zur Erfolgseite
    // --------------------------------------

    window.location.href =
        "redstoneauftrag_erfolg.html";
}


// ------------------------------------------
// Absenden-Button aktivieren
// ------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const button =
            document.getElementById(
                "auftragAbsenden"
            );

        if (!button) {
            return;
        }

        button.addEventListener(
            "click",
            erstelleRedstoneAuftrag
        );

    }
);
