// Ehrenmarkt – Bauauftrag
// bauauftrag.js – Teil 1 von 4

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // GRUNDWERTE
    // ==========================================

    const GRUNDPREIS_PRO_PLOT = 500000;
    const ANZAHLUNG_PROZENT = 25;


    // ==========================================
    // FORMULAR
    // ==========================================

    const form = document.getElementById("bauauftragForm");

    if (!form) {
        console.error(
            "Das Bauauftrags-Formular wurde nicht gefunden."
        );
        return;
    }


    // ==========================================
    // FORMULARFELDER
    // ==========================================

    const minecraftName =
        document.getElementById("minecraftName");

    const contactType =
        document.getElementById("contactType");

    const contactValue =
        document.getElementById("contactValue");


    const buildingType =
        document.getElementById("buildingType");


    const mergeWidth =
        document.getElementById("mergeWidth");

    const mergeHeight =
        document.getElementById("mergeHeight");


    const buildingLength =
        document.getElementById("buildingLength");

    const buildingWidth =
        document.getElementById("buildingWidth");

    const buildingHeight =
        document.getElementById("buildingHeight");

    const buildingFloors =
        document.getElementById("buildingFloors");


    const buildingStyle =
        document.getElementById("buildingStyle");

    const blockPalette =
        document.getElementById("blockPalette");

    const specialBlocks =
        document.getElementById("specialBlocks");


    const interiorLevel =
        document.getElementById("interiorLevel");

    const exteriorLevel =
        document.getElementById("exteriorLevel");

    const lightingLevel =
        document.getElementById("lightingLevel");

    const terraformingLevel =
        document.getElementById("terraformingLevel");


    const planningDescription =
        document.getElementById("planningDescription");

    const referenceImage =
        document.getElementById("referenceImage");


    const description =
        document.getElementById("description");

    const specialRequests =
        document.getElementById("specialRequests");

    const location =
        document.getElementById("location");


    const priority =
        document.getElementById("priority");


    // ==========================================
    // PREIS-ANZEIGEN
    // ==========================================

    const plotCountDisplay =
        document.getElementById("plotCount");

    const basePriceDisplay =
        document.getElementById("basePrice");

    const addonPriceDisplay =
        document.getElementById("addonPrice");

    const provisionalPriceDisplay =
        document.getElementById("provisionalPrice");

    const depositDisplay =
        document.getElementById("deposit");

    const remainingDisplay =
        document.getElementById("remainingPayment");


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


    function textwert(feld) {

        if (!feld) {
            return "";
        }

        return feld.value.trim();
    }


    // ==========================================
    // PLOTBERECHNUNG
    // ==========================================

    function berechnePlotAnzahl() {

        const breite =
            zahl(mergeWidth?.value);

        const hoehe =
            zahl(mergeHeight?.value);


        if (breite <= 0 || hoehe <= 0) {
            return 0;
        }


        return breite * hoehe;
    }


    // ==========================================
    // GRUNDPREIS
    // ==========================================

    function berechneGrundpreis() {

        const plotAnzahl =
            berechnePlotAnzahl();


        return (
            plotAnzahl *
            GRUNDPREIS_PRO_PLOT
        );
    }


    // ==========================================
    // PLOT-ANZEIGE
    // ==========================================

    function aktualisierePlotAnzeige() {

        const plotAnzahl =
            berechnePlotAnzahl();


        const grundpreis =
            berechneGrundpreis();


        if (plotCountDisplay) {

            plotCountDisplay.textContent =
                plotAnzahl;
        }


        if (basePriceDisplay) {

            basePriceDisplay.textContent =
                euro(grundpreis);
        }
    }


    // ==========================================
    // PLOT-GRÖSSE ÜBERWACHEN
    // ==========================================

    if (mergeWidth) {

        mergeWidth.addEventListener(
            "input",
            () => {

                aktualisierePlotAnzeige();
                aktualisiereGesamtanzeige();

            }
        );
    }


    if (mergeHeight) {

        mergeHeight.addEventListener(
            "input",
            () => {

                aktualisierePlotAnzeige();
                aktualisiereGesamtanzeige();

            }
        );
                          }

            // ==========================================
    // PROZENTWERTE AUSLESEN
    // ==========================================

    function leseProzent(field) {

    if (!field) {
        return 0;
    }

    switch (field.value) {

        case "nein":
            return 0;

        case "leicht":
            return 5;

        case "mittel":
            return 10;

        case "komplett":
            return 15;

        default:
            return 0;
    }
}


    // ==========================================
    // ZUSCHLÄGE BERECHNEN
    // ==========================================

    function berechneAddonPreis() {

    const grundpreis =
        berechneGrundpreis();


    const innenProzent =
        leseProzent(interiorLevel);

    const aussenProzent =
        leseProzent(exteriorLevel);

    const beleuchtungProzent =
        leseProzent(lightingLevel);

    const terraformingProzent =
        leseProzent(terraformingLevel);


    // ==========================================
    // ZUSATZLEISTUNGEN
    // ==========================================

    const innenPreis =
        grundpreis *
        innenProzent /
        100;


    const aussenPreis =
        grundpreis *
        aussenProzent /
        100;


    const beleuchtungPreis =
        grundpreis *
        beleuchtungProzent /
        100;


    const terraformingPreis =
        grundpreis *
        terraformingProzent /
        100;


    // ==========================================
    // ZWISCHENPREIS
    // ==========================================

    const zwischenpreis =
        grundpreis +
        innenPreis +
        aussenPreis +
        beleuchtungPreis +
        terraformingPreis;


    // ==========================================
    // PRIORITÄT
    // ==========================================

    const prioritaet =
        document.getElementById("priority");

    let prioritaetProzent = 0;

    if (prioritaet) {

        if (prioritaet.value === "schnell") {
            prioritaetProzent = 10;
        }

        if (prioritaet.value === "express") {
            prioritaetProzent = 25;
        }
    }


    // Priorität wird auf den gesamten
    // Zwischenpreis gerechnet.

    const prioritaetPreis =
        zwischenpreis *
        prioritaetProzent /
        100;


    // ==========================================
    // ALLE ZUSCHLÄGE
    // ==========================================

    return (
        innenPreis +
        aussenPreis +
        beleuchtungPreis +
        terraformingPreis +
        prioritaetPreis
    );
}


    // ==========================================
    // VORLÄUFIGEN PREIS BERECHNEN
    // ==========================================

    function berechneVorlaeufigenPreis() {

        const grundpreis =
            berechneGrundpreis();


        const addonPreis =
            berechneAddonPreis();


        return (
            grundpreis +
            addonPreis
        );
    }


    // ==========================================
    // 25 % ANZAHLUNG
    // ==========================================

    function berechneAnzahlung() {

        const vorlaeufigerPreis =
            berechneVorlaeufigenPreis();


        return (
            vorlaeufigerPreis *
            ANZAHLUNG_PROZENT /
            100
        );
    }


    // ==========================================
    // RESTZAHLUNG
    // ==========================================

    function berechneRestzahlung() {

        const vorlaeufigerPreis =
            berechneVorlaeufigenPreis();


        const anzahlung =
            berechneAnzahlung();


        return (
            vorlaeufigerPreis -
            anzahlung
        );
    }


    // ==========================================
    // GESAMTANZEIGE AKTUALISIEREN
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


        // Anzahlung

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


        feld.addEventListener(
            "change",
            () => {

                aktualisiereGesamtanzeige();

            }
        );


        feld.addEventListener(
            "input",
            () => {

                aktualisiereGesamtanzeige();

            }
        );
    });


    // ==========================================
    // ERSTE PREISBERECHNUNG
    // ==========================================

    aktualisierePlotAnzeige();

    aktualisiereGesamtanzeige();

        // ==========================================
    // AUFTRAGSNUMMER ERSTELLEN
    // ==========================================

    function erstelleAuftragsnummer() {

    const zufall =
        Math.floor(
            1000 +
            Math.random() * 9000
        );

    return `EM-BAU-${zufall}`;
}

    // ==========================================
    // REFERENZBILD HOCHLADEN
    // ==========================================

    async function ladeReferenzbild(
        userId,
        auftragsnummer
    ) {

        if (!referenceImage) {
            return null;
        }


        if (
            !referenceImage.files ||
            referenceImage.files.length === 0
        ) {
            return null;
        }


        const datei =
            referenceImage.files[0];


        // Maximale Dateigröße: 5 MB

        const maximaleGroesse =
            5 * 1024 * 1024;


        if (
            datei.size >
            maximaleGroesse
        ) {

            throw new Error(
                "Das Referenzbild darf maximal 5 MB groß sein."
            );
        }


        // Nur Bilder erlauben

        if (
            !datei.type.startsWith("image/")
        ) {

            throw new Error(
                "Bitte nur ein Bild als Referenz hochladen."
            );
        }


        // Dateiendung

        const dateiendung =
            datei.name
                .split(".")
                .pop()
                .toLowerCase();


        const dateiname =
            `${userId}/${auftragsnummer}.${dateiendung}`;


        // ==========================================
        // BILD IN SUPABASE SPEICHERN
        // ==========================================

        const {
            error: uploadError
        } = await supabaseClient.storage
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


        // ==========================================
        // ÖFFENTLICHE BILD-URL
        // ==========================================

        const {
            data
        } = supabaseClient.storage
            .from("bauauftrag-referenzen")
            .getPublicUrl(
                dateiname
            );


        if (
            !data ||
            !data.publicUrl
        ) {

            throw new Error(
                "Die URL des Referenzbildes konnte nicht erstellt werden."
            );
        }


        return data.publicUrl;
    }


    // ==========================================
    // AKTUELLEN BENUTZER HOLEN
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

        // Minecraft-Name

        if (
            !minecraftName ||
            textwert(minecraftName) === ""
        ) {

            alert(
                "Bitte gib deinen Minecraft-Namen ein."
            );

            return false;
        }


        // Kontaktart

        if (
            !contactType ||
            textwert(contactType) === ""
        ) {

            alert(
                "Bitte wähle eine Kontaktmöglichkeit."
            );

            return false;
        }


        // Kontakt

        if (
            !contactValue ||
            textwert(contactValue) === ""
        ) {

            alert(
                "Bitte gib deine Kontaktmöglichkeit ein."
            );

            return false;
        }


        // Gebäudeart

        if (
            !buildingType ||
            textwert(buildingType) === ""
        ) {

            alert(
                "Bitte wähle eine Gebäudeart."
            );

            return false;
        }


        // Plot-Größe

        const breite =
            zahl(
                mergeWidth?.value
            );


        const hoehe =
            zahl(
                mergeHeight?.value
            );


        if (
            breite <= 0 ||
            hoehe <= 0
        ) {

            alert(
                "Bitte gib eine gültige Plot-Größe ein."
            );

            return false;
        }


        // Plotanzahl

        if (
            berechnePlotAnzahl() <= 0
        ) {

            alert(
                "Die Plot-Anzahl muss größer als 0 sein."
            );

            return false;
        }


        return true;
    }


    // ==========================================
    // BAUAUFTRAG ERSTELLEN
    // ==========================================

    async function erstelleBauauftrag() {

        // ==========================================
        // BENUTZER HOLEN
        // ==========================================

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


        // ==========================================
        // FORMULAR PRÜFEN
        // ==========================================

        if (
            !validiereFormular()
        ) {

            return false;
        }


        // ==========================================
        // AUFTRAGSNUMMER
        // ==========================================

        const auftragsnummer =
            erstelleAuftragsnummer();


        // ==========================================
        // PREISE
        // ==========================================

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


        // ==========================================
        // PROZENTWERTE
        // ==========================================

        const innenProzent =
            leseProzent(
                interiorLevel
            );


        const aussenProzent =
            leseProzent(
                exteriorLevel
            );


        const beleuchtungProzent =
            leseProzent(
                lightingLevel
            );


        const terraformingProzent =
            leseProzent(
                terraformingLevel
            );


        // ==========================================
        // REFERENZBILD
        // ==========================================

        let referenceImageUrl =
            null;


        try {

            referenceImageUrl =
                await ladeReferenzbild(
                    user.id,
                    auftragsnummer
                );

        } catch (error) {

            console.error(
                error
            );

            alert(
                error.message
            );

            return false;
        }


        // ==========================================
        // AUFTRAGSDATEN
        // ==========================================

        const auftrag = {

            user_id:
                user.id,

            order_number:
                auftragsnummer,

            minecraft_name:
                textwert(
                    minecraftName
                ),

            contact_type:
                textwert(
                    contactType
                ),

            contact_value:
                textwert(
                    contactValue
                ),

            building_type:
                textwert(
                    buildingType
                ),

            merge_width:
                zahl(
                    mergeWidth?.value
                ),

            merge_height:
                zahl(
                    mergeHeight?.value
                ),

            plot_count:
                plotAnzahl,

            building_length:
                zahl(
                    buildingLength?.value
                ) || null,

            building_width:
                zahl(
                    buildingWidth?.value
                ) || null,

            building_height:
                zahl(
                    buildingHeight?.value
                ) || null,

            building_floors:
                zahl(
                    buildingFloors?.value
                ) || null,

            building_style:
                textwert(
                    buildingStyle
                ) || null,

            block_palette:
                textwert(
                    blockPalette
                ) || null,

            special_blocks:
                textwert(
                    specialBlocks
                ) || null,


            // ==========================================
            // INNENBAU
            // ==========================================

            interior_level:
                textwert(
                    interiorLevel
                ) || null,

            interior_percent:
                innenProzent,


            // ==========================================
            // AUSSENBAU
            // ==========================================

            exterior_level:
                textwert(
                    exteriorLevel
                ) || null,

            exterior_percent:
                aussenProzent,


            // ==========================================
            // BELEUCHTUNG
            // ==========================================

            lighting_level:
                textwert(
                    lightingLevel
                ) || null,

            lighting_percent:
                beleuchtungProzent,


            // ==========================================
            // TERRAFORMING
            // ==========================================

            terraforming_level:
                textwert(
                    terraformingLevel
                ) || null,

            terraforming_percent:
                terraformingProzent,


            // ==========================================
            // BESCHREIBUNG
            // ==========================================

            planning_description:
                textwert(
                    planningDescription
                ) || null,

            reference_image_url:
                referenceImageUrl,

            description:
                textwert(
                    description
                ) || null,

            special_requests:
                textwert(
                    specialRequests
                ) || null,

            location:
                textwert(
                    location
                ) || null,


            // ==========================================
            // PRIORITÄT
            // ==========================================

            priority:
                textwert(
                    priority
                ) || "normal",

            priority_percent:
    priority?.value === "schnell"
        ? 10
        : priority?.value === "express"
            ? 25
            : 0,

            // ==========================================
            // PREISE
            // ==========================================

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


            // ==========================================
            // MATERIALIEN
            // ==========================================

            material_cost:
                0,

            material_procurement:
    document.getElementById("materialProvider").value === "falkenstein",

            material_surcharge_percent:
                15,

            material_surcharge_amount:
                0,


            // ==========================================
            // ENDGÜLTIGER PREIS
            // ==========================================

            final_price:
                vorlaeufigerPreis,


            // ==========================================
            // STATUS
            // ==========================================

            status:
                "offen",

            progress:
                0,

            assigned_employee_id:
                null
        };


        // ==========================================
        // AUFTRAG IN SUPABASE SPEICHERN
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


        return data;
                          }

            // ==========================================
    // AUFTRAGSDATEN FÜR ERFOLGSSEITE SPEICHERN
    // ==========================================

    function speichereAuftragsdaten(auftrag) {

        if (!auftrag) {
            return;
        }


        // Auftragsnummer

        sessionStorage.setItem(
            "ehrenmarkt_bauauftrag",
            auftrag.order_number
        );


        // Datenbank-ID

        sessionStorage.setItem(
            "ehrenmarkt_bauauftrag_id",
            String(auftrag.id)
        );


        // Vorläufiger Preis

        sessionStorage.setItem(
            "ehrenmarkt_bauauftrag_preis",
            String(auftrag.provisional_price)
        );


        // Anzahlung

        sessionStorage.setItem(
            "ehrenmarkt_bauauftrag_anzahlung",
            String(auftrag.deposit_amount)
        );
    }


    // ==========================================
    // ERFOLGREICHEN AUFTRAG ANZEIGEN
    // ==========================================

    function zeigeAuftragErfolgreich(auftrag) {

        speichereAuftragsdaten(
            auftrag
        );


        /*
         * Die Erfolgsseite wird separat erstellt.
         *
         * Dateiname:
         *
         * bauauftrag_erfolg.html
         *
         * Dort werden später angezeigt:
         *
         * - Auftragsnummer
         * - vorläufiger Preis
         * - Anzahlung
         * - Hinweis auf spätere Materialkosten
         * - Startseite
         * - Kundenbereich
         * - Discord
         */


        window.location.href = "HTML/bauauftrag_erfolg.html";
    }


    // ==========================================
    // FORMULAR ABSENDEN
    // ==========================================

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );


            // ==========================================
            // BUTTON SPERREN
            // ==========================================

            if (submitButton) {

                submitButton.disabled = true;

                submitButton.textContent =
                    "Auftrag wird erstellt...";
            }


            try {

                // Bauauftrag erstellen

                const auftrag =
                    await erstelleBauauftrag();


                // Falls kein Auftrag erstellt wurde

                if (!auftrag) {
                    return;
                }


                // ==========================================
                // ERFOLGREICH
                // ==========================================

                console.log(
                    "Ehrenmarkt-Bauauftrag erstellt:",
                    auftrag.order_number
                );


                // Zur Erfolgsseite

                zeigeAuftragErfolgreich(
                    auftrag
                );

                // Discord-Benachrichtigung senden
try {
    if (
        window.EhrenmarktDiscord &&
        typeof window.EhrenmarktDiscord.sendeBenachrichtigung === "function"
    ) {
        await window.EhrenmarktDiscord.sendeBenachrichtigung({
            aktion: "neuer_auftrag",
            daten: {
                auftragstyp: "Bauauftrag",
                kunde: auftrag.minecraft_name || "Unbekannt",
                auftragsnummer: auftrag.order_number || "Keine Nummer",
                betrag: auftrag.provisional_price || 0,
                status: auftrag.status || "offen",
                titel: auftrag.building_type || "Bauauftrag",
                beschreibung: auftrag.description || ""
            },
            erstellt_am: new Date().toISOString(),
            quelle: "bauauftrag.js",
            benutzer_id: auftrag.user_id || null
        });
    }
} catch (discordError) {
    console.error(
        "Discord-Benachrichtigung konnte nicht gesendet werden:",
        discordError
    );
}


            } catch (error) {

                console.error(
                    "Fehler beim Erstellen des Bauauftrags:",
                    error
                );


                alert(
                    "Beim Erstellen des Bauauftrags ist ein unerwarteter Fehler aufgetreten."
                );


            } finally {

                if (submitButton) {

                    submitButton.disabled = false;

                    submitButton.textContent =
                        "Bauauftrag erstellen";
                }
            }
        }
    );


    // ==========================================
    // ABSCHLIESSENDE INITIALISIERUNG
    // ==========================================

    aktualisierePlotAnzeige();

    aktualisiereGesamtanzeige();

});
