// Ehrenmarkt – Bauauftrag
// bauauftrag.js – Teil 1 von 4

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // GRUNDWERTE
    // ==========================================

    const GRUNDPREIS_PRO_PLOT = 750000;
    const ANZAHLUNG_PROZENT = 25;

    // ==========================================
    // FORMULAR
    // ==========================================

    const form = document.getElementById("bauauftragForm");

    if (!form) {
        console.error("Das Bauauftrags-Formular wurde nicht gefunden.");
        return;
    }

    // ==========================================
    // FORMULARFELDER
    // ==========================================

    const minecraftName = document.getElementById("minecraftName");
    const contactType = document.getElementById("contactType");
    const contactValue = document.getElementById("contactValue");

    const buildingType = document.getElementById("buildingType");

    const mergeWidth = document.getElementById("mergeWidth");
    const mergeHeight = document.getElementById("mergeHeight");

    const buildingLength = document.getElementById("buildingLength");
    const buildingWidth = document.getElementById("buildingWidth");
    const buildingHeight = document.getElementById("buildingHeight");
    const buildingFloors = document.getElementById("buildingFloors");

    const buildingStyle = document.getElementById("buildingStyle");
    const blockPalette = document.getElementById("blockPalette");
    const specialBlocks = document.getElementById("specialBlocks");

    const interiorLevel = document.getElementById("interiorLevel");
    const exteriorLevel = document.getElementById("exteriorLevel");
    const lightingLevel = document.getElementById("lightingLevel");
    const terraformingLevel = document.getElementById("terraformingLevel");

    const planningDescription = document.getElementById("planningDescription");
    const referenceImage = document.getElementById("referenceImage");

    const description = document.getElementById("description");
    const specialRequests = document.getElementById("specialRequests");
    const location = document.getElementById("location");

    const priority = document.getElementById("priority");

    // ==========================================
    // PREIS-ANZEIGE
    // ==========================================

    const plotCountDisplay = document.getElementById("plotCount");
    const basePriceDisplay = document.getElementById("basePrice");
    const addonPriceDisplay = document.getElementById("addonPrice");
    const provisionalPriceDisplay = document.getElementById("provisionalPrice");
    const depositDisplay = document.getElementById("deposit");
    const remainingDisplay = document.getElementById("remainingPayment");

    // ==========================================
    // HILFSFUNKTIONEN
    // ==========================================

    function zahl(value) {
        const nummer = Number(value);

        if (Number.isNaN(nummer)) {
            return 0;
        }

        return nummer;
    }

    function euro(value) {
        return new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(value);
    }

    // ==========================================
    // PLOTBERECHNUNG
    // ==========================================

    function berechnePlotAnzahl() {

        const breite = zahl(mergeWidth?.value);
        const hoehe = zahl(mergeHeight?.value);

        if (breite <= 0 || hoehe <= 0) {
            return 0;
        }

        return breite * hoehe;
    }

    function berechneGrundpreis() {

        const plotAnzahl = berechnePlotAnzahl();

        return plotAnzahl * GRUNDPREIS_PRO_PLOT;
    }

    // ==========================================
    // PLOTANZAHL ANZEIGEN
    // ==========================================

    function aktualisierePlotAnzeige() {

        const plotAnzahl = berechnePlotAnzahl();

        if (plotCountDisplay) {
            plotCountDisplay.textContent = plotAnzahl;
        }

        const grundpreis = berechneGrundpreis();

        if (basePriceDisplay) {
            basePriceDisplay.textContent = euro(grundpreis);
        }
    }

    // ==========================================
    // ÄNDERUNGEN AN PLOT-GRÖSSE
    // ==========================================

    if (mergeWidth) {
        mergeWidth.addEventListener("input", () => {
            aktualisierePlotAnzeige();
            aktualisiereGesamtanzeige();
        });
    }

    if (mergeHeight) {
        mergeHeight.addEventListener("input", () => {
            aktualisierePlotAnzeige();
            aktualisiereGesamtanzeige();
        });
    }

    // ==========================================
    // INITIALISIERUNG
    // ==========================================

    aktualisierePlotAnzeige();

    // ==========================================
    // PLATZHALTER FÜR TEIL 2
    // ==========================================

    function aktualisiereGesamtanzeige() {
        // Wird in Teil 2 vollständig aufgebaut.
    }

    // ==========================================
    // FORMULAR ABSENDEN
    // ==========================================

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        console.log("Bauauftrag wurde abgeschickt.");

        // Die eigentliche Verarbeitung kommt in Teil 3.
    });

});

// ==========================================
// PREISBERECHNUNG
// ==========================================

// Ermittelt den Prozentwert eines Auswahlfeldes.
// Erwartet Werte wie:
// 0
// 5
// 10
// 15
function leseProzent(feld) {

    if (!feld) {
        return 0;
    }

    const wert = Number(feld.value);

    if (Number.isNaN(wert)) {
        return 0;
    }

    return wert;
}


// ==========================================
// ZUSCHLÄGE BERECHNEN
// ==========================================

function berechneAddonPreis() {

    const grundpreis = berechneGrundpreis();

    const innenProzent = leseProzent(interiorLevel);
    const aussenProzent = leseProzent(exteriorLevel);
    const beleuchtungProzent = leseProzent(lightingLevel);
    const terraformingProzent = leseProzent(terraformingLevel);

    const innenPreis =
        grundpreis * innenProzent / 100;

    const aussenPreis =
        grundpreis * aussenProzent / 100;

    const beleuchtungPreis =
        grundpreis * beleuchtungProzent / 100;

    const terraformingPreis =
        grundpreis * terraformingProzent / 100;

    return (
        innenPreis +
        aussenPreis +
        beleuchtungPreis +
        terraformingPreis
    );
}


// ==========================================
// VORLÄUFIGER PREIS
// ==========================================

function berechneVorlaeufigenPreis() {

    const grundpreis = berechneGrundpreis();
    const addonPreis = berechneAddonPreis();

    return grundpreis + addonPreis;
}


// ==========================================
// ANZAHLUNG
// ==========================================

function berechneAnzahlung() {

    const vorlaeufigerPreis =
        berechneVorlaeufigenPreis();

    return vorlaeufigerPreis * ANZAHLUNG_PROZENT / 100;
}


// ==========================================
// RESTZAHLUNG
// ==========================================

function berechneRestzahlung() {

    const vorlaeufigerPreis =
        berechneVorlaeufigenPreis();

    const anzahlung =
        berechneAnzahlung();

    return vorlaeufigerPreis - anzahlung;
}


// ==========================================
// GESAMTANZEIGE
// ==========================================

function aktualisiereGesamtanzeige() {

    const plotAnzahl =
        berechnePlotAnzahl();

    const grundpreis =
        berechneGrundpreis();

    const addonPreis =
        berechneAddonPreis();

    const vorlaeufigerPreis =
        berechneVorlaeufigenPreis();

    const anzahlung =
        berechneAnzahlung();

    const restzahlung =
        berechneRestzahlung();


    // Plotanzahl

    if (plotCountDisplay) {
        plotCountDisplay.textContent =
            plotAnzahl;
    }


    // Grundpreis

    if (basePriceDisplay) {
        basePriceDisplay.textContent =
            euro(grundpreis);
    }


    // Zuschläge

    if (addonPriceDisplay) {
        addonPriceDisplay.textContent =
            euro(addonPreis);
    }


    // Vorläufiger Preis

    if (provisionalPriceDisplay) {
        provisionalPriceDisplay.textContent =
            euro(vorlaeufigerPreis);
    }


    // 25 % Anzahlung

    if (depositDisplay) {
        depositDisplay.textContent =
            euro(anzahlung);
    }


    // Restzahlung

    if (remainingDisplay) {
        remainingDisplay.textContent =
            euro(restzahlung);
    }
}


// ==========================================
// PREISOPTIONEN ÜBERWACHEN
// ==========================================

[
    interiorLevel,
    exteriorLevel,
    lightingLevel,
    terraformingLevel,
    priority
].forEach((feld) => {

    if (!feld) {
        return;
    }

    feld.addEventListener("change", () => {
        aktualisiereGesamtanzeige();
    });

});


// ==========================================
// ERSTE PREISBERECHNUNG
// ==========================================

aktualisiereGesamtanzeige();

// ==========================================
// TEIL 3 – VALIDIERUNG & AUFTRAG SPEICHERN
// ==========================================


// ==========================================
// AUFTRAGSNUMMER ERSTELLEN
// ==========================================

function erstelleAuftragsnummer() {

    const zeit = Date.now();

    const zufall =
        Math.floor(1000 + Math.random() * 9000);

    return `EM-BAU-${zeit}-${zufall}`;
}


// ==========================================
// TEXTWERT AUSLESEN
// ==========================================

function textwert(feld) {

    if (!feld) {
        return "";
    }

    return feld.value.trim();
}


// ==========================================
// REFERENZBILD HOCHLADEN
// ==========================================

async function ladeReferenzbild(userId, auftragsnummer) {

    if (!referenceImage) {
        return null;
    }

    if (!referenceImage.files || referenceImage.files.length === 0) {
        return null;
    }

    const datei = referenceImage.files[0];

    // Maximale Dateigröße: 5 MB

    const maximaleGroesse =
        5 * 1024 * 1024;

    if (datei.size > maximaleGroesse) {
        throw new Error(
            "Das Referenzbild darf maximal 5 MB groß sein."
        );
    }


    // Nur Bilddateien erlauben

    if (!datei.type.startsWith("image/")) {
        throw new Error(
            "Bitte nur ein Bild als Referenz hochladen."
        );
    }


    // Dateiendung bestimmen

    const dateiendung =
        datei.name.split(".").pop().toLowerCase();


    const dateiname =
        `${userId}/${auftragsnummer}.${dateiendung}`;


    /*
     * Der Bucket muss in Supabase vorhanden sein.
     *
     * Vorgesehen:
     * Bucket: bauauftrag-referenzen
     */

    const { error: uploadError } =
        await supabaseClient.storage
            .from("bauauftrag-referenzen")
            .upload(
                dateiname,
                datei,
                {
                    cacheControl: "3600",
                    upsert: false
                }
            );


    if (uploadError) {
        console.error(
            "Referenzbild konnte nicht hochgeladen werden:",
            uploadError
        );

        throw new Error(
            "Das Referenzbild konnte nicht hochgeladen werden."
        );
    }


    // Öffentliche URL holen

    const { data } =
        supabaseClient.storage
            .from("bauauftrag-referenzen")
            .getPublicUrl(dateiname);


    if (!data || !data.publicUrl) {
        throw new Error(
            "Die URL des Referenzbildes konnte nicht erstellt werden."
        );
    }


    return data.publicUrl;
}


// ==========================================
// BENUTZER ERMITTELN
// ==========================================

async function holeAktuellenBenutzer() {

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();


    if (error) {
        console.error(
            "Benutzer konnte nicht ermittelt werden:",
            error
        );

        return null;
    }


    return data.user;
}


// ==========================================
// FORMULAR VALIDIEREN
// ==========================================

function validiereFormular() {

    if (!minecraftName ||
        textwert(minecraftName) === "") {

        alert(
            "Bitte gib deinen Minecraft-Namen ein."
        );

        return false;
    }


    if (!contactType ||
        textwert(contactType) === "") {

        alert(
            "Bitte wähle eine Kontaktmöglichkeit."
        );

        return false;
    }


    if (!contactValue ||
        textwert(contactValue) === "") {

        alert(
            "Bitte gib deine Kontaktmöglichkeit ein."
        );

        return false;
    }


    if (!buildingType ||
        textwert(buildingType) === "") {

        alert(
            "Bitte wähle eine Gebäudeart."
        );

        return false;
    }


    const breite =
        zahl(mergeWidth?.value);

    const hoehe =
        zahl(mergeHeight?.value);


    if (breite <= 0 || hoehe <= 0) {

        alert(
            "Bitte gib eine gültige Plot-Größe ein."
        );

        return false;
    }


    if (berechnePlotAnzahl() <= 0) {

        alert(
            "Die Plot-Anzahl muss größer als 0 sein."
        );

        return false;
    }


    return true;
}


// ==========================================
// AUFTRAGSDATEN SAMMELN
// ==========================================

async function erstelleBauauftrag() {

    // Benutzer holen

    const user =
        await holeAktuellenBenutzer();


    if (!user) {

        alert(
            "Du musst angemeldet sein, um einen Bauauftrag zu erstellen."
        );

        window.location.href =
            "login.html";

        return false;
    }


    // Formular prüfen

    if (!validiereFormular()) {
        return false;
    }


    // Auftragsnummer

    const auftragsnummer =
        erstelleAuftragsnummer();


    // Preise

    const plotAnzahl =
        berechnePlotAnzahl();

    const grundpreis =
        berechneGrundpreis();

    const addonPreis =
        berechneAddonPreis();

    const vorlaeufigerPreis =
        berechneVorlaeufigenPreis();

    const anzahlung =
        berechneAnzahlung();

    const restzahlung =
        berechneRestzahlung();


    // Prozentwerte

    const innenProzent =
        leseProzent(interiorLevel);

    const aussenProzent =
        leseProzent(exteriorLevel);

    const beleuchtungProzent =
        leseProzent(lightingLevel);

    const terraformingProzent =
        leseProzent(terraformingLevel);


    // Referenzbild

    let referenceImageUrl = null;


    try {

        referenceImageUrl =
            await ladeReferenzbild(
                user.id,
                auftragsnummer
            );

    } catch (error) {

        console.error(error);

        alert(error.message);

        return false;
    }


    // ==========================================
    // DATEN FÜR SUPABASE
    // ==========================================

    const auftrag = {

        user_id: user.id,

        order_number:
            auftragsnummer,

        minecraft_name:
            textwert(minecraftName),

        contact_type:
            textwert(contactType),

        contact_value:
            textwert(contactValue),

        building_type:
            textwert(buildingType),

        merge_width:
            zahl(mergeWidth?.value),

        merge_height:
            zahl(mergeHeight?.value),

        plot_count:
            plotAnzahl,

        building_length:
            zahl(buildingLength?.value) || null,

        building_width:
            zahl(buildingWidth?.value) || null,

        building_height:
            zahl(buildingHeight?.value) || null,

        building_floors:
            zahl(buildingFloors?.value) || null,

        building_style:
            textwert(buildingStyle) || null,

        block_palette:
            textwert(blockPalette) || null,

        special_blocks:
            textwert(specialBlocks) || null,


        // Innenbau

        interior_level:
            textwert(interiorLevel) || null,

        interior_percent:
            innenProzent,


        // Außenbau

        exterior_level:
            textwert(exteriorLevel) || null,

        exterior_percent:
            aussenProzent,


        // Beleuchtung

        lighting_level:
            textwert(lightingLevel) || null,

        lighting_percent:
            beleuchtungProzent,


        // Terraforming

        terraforming_level:
            textwert(terraformingLevel) || null,

        terraforming_percent:
            terraformingProzent,


        planning_description:
            textwert(planningDescription) || null,

        reference_image_url:
            referenceImageUrl,

        description:
            textwert(description) || null,

        special_requests:
            textwert(specialRequests) || null,

        location:
            textwert(location) || null,


        // Priorität wird aktuell nur gespeichert.
        // Sie verändert den Preis NICHT.

        priority:
            textwert(priority) || "normal",

        priority_percent:
            0,


        // Preis

        base_price:
            grundpreis,

        addon_price:
            addonPreis,

        provisional_price:
            vorlaeufigerPreis,

        deposit_percent:
            ANZAHLUNG_PROZENT,

        deposit_amount:
            anzahlung,

        remaining_payment:
            restzahlung,


        // Materialien werden später
        // vom Bauleiter eingetragen.

        material_cost:
            0,

        material_procurement:
            false,

        material_surcharge_percent:
            15,

        material_surcharge_amount:
            0,

        final_price:
            vorlaeufigerPreis,


        // Neuer Auftrag

        status:
            "offen",

        progress:
            0,

        // Bauleiter wird später zugewiesen

        assigned_employee_id:
            null
    };


    // ==========================================
    // IN SUPABASE SPEICHERN
    // ==========================================

    const {
        data,
        error
    } = await supabaseClient
        .from("build_orders")
        .insert(auftrag)
        .select()
        .single();


    if (error) {

        console.error(
            "Bauauftrag konnte nicht gespeichert werden:",
            error
        );

        alert(
            "Der Bauauftrag konnte nicht erstellt werden.\n\n" +
            error.message
        );

        return false;
    }


    console.log(
        "Bauauftrag erfolgreich erstellt:",
        data
    );


    // Auftrag erfolgreich

    return data;
}


// ==========================================
// FORMULAR ABSENDEN
// ==========================================

form.addEventListener("submit", async (event) => {

    event.preventDefault();


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    // Button während Speicherung sperren

    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Auftrag wird erstellt...";
    }


    try {

        const auftrag =
            await erstelleBauauftrag();


        if (!auftrag) {
            return;
        }


        // Auftragsnummer für Teil 4 merken

        sessionStorage.setItem(
            "ehrenmarkt_bauauftrag",
            auftrag.order_number
        );


        // Daten für die Erfolgsseite

        sessionStorage.setItem(
            "ehrenmarkt_bauauftrag_id",
            auftrag.id
        );


        // Weiterleitung kommt in Teil 4.

    } catch (error) {

        console.error(
            "Unerwarteter Fehler:",
            error
        );

        alert(
            "Beim Erstellen des Bauauftrags ist ein Fehler aufgetreten."
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Bauauftrag erstellen";
        }
    }

});

// ==========================================
// TEIL 4 – ERFOLGREICHER AUFTRAG
// ==========================================


// ==========================================
// AUFTRAGSDATEN FÜR ERFOLGSSEITE SPEICHERN
// ==========================================

function speichereAuftragsdaten(auftrag) {

    if (!auftrag) {
        return;
    }


    // Auftragsnummer speichern

    sessionStorage.setItem(
        "ehrenmarkt_bauauftrag",
        auftrag.order_number
    );


    // Datenbank-ID speichern

    sessionStorage.setItem(
        "ehrenmarkt_bauauftrag_id",
        String(auftrag.id)
    );


    // Vorläufigen Preis speichern

    sessionStorage.setItem(
        "ehrenmarkt_bauauftrag_preis",
        String(auftrag.provisional_price)
    );


    // Anzahlung speichern

    sessionStorage.setItem(
        "ehrenmarkt_bauauftrag_anzahlung",
        String(auftrag.deposit_amount)
    );
}


// ==========================================
// ERFOLGREICHEN AUFTRAG ABSCHLIESSEN
// ==========================================

function zeigeAuftragErfolgreich(auftrag) {

    speichereAuftragsdaten(auftrag);


    /*
     * Die eigentliche Erfolgs-/Auftragsübersicht
     * wird später als eigene HTML-Seite erstellt.
     *
     * Vorgesehener Dateiname:
     *
     * bauauftrag_erfolg.html
     */


    window.location.href =
        "bauauftrag_erfolg.html";
}


// ==========================================
// ABSENDEN DES AUFTRAGS
// ==========================================

async function verarbeiteBauauftrag() {

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    // Button sperren

    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Auftrag wird erstellt...";
    }


    try {

        const auftrag =
            await erstelleBauauftrag();


        // Kein Auftrag erstellt

        if (!auftrag) {
            return;
        }


        // Auftrag erfolgreich

        console.log(
            "Ehrenmarkt-Bauauftrag erstellt:",
            auftrag.order_number
        );


        // Erfolgsseite öffnen

        zeigeAuftragErfolgreich(
            auftrag
        );


    } catch (error) {

        console.error(
            "Fehler beim Bauauftrag:",
            error
        );


        alert(
            "Der Bauauftrag konnte nicht erstellt werden."
        );


    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Bauauftrag erstellen";
        }
    }
}


// ==========================================
// PREIS BEI ÄNDERUNGEN AKTUALISIEREN
// ==========================================

[
    mergeWidth,
    mergeHeight,
    interiorLevel,
    exteriorLevel,
    lightingLevel,
    terraformingLevel
].forEach((feld) => {

    if (!feld) {
        return;
    }


    feld.addEventListener(
        "input",
        aktualisiereGesamtanzeige
    );


    feld.addEventListener(
        "change",
        aktualisiereGesamtanzeige
    );

});


// ==========================================
// STARTWERTE
// ==========================================

aktualisierePlotAnzeige();

aktualisiereGesamtanzeige();
