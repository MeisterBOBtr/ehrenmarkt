document.addEventListener("DOMContentLoaded", async () => {

    // ============================================================
    // SUPABASE
    // ============================================================

    const supabase = window.supabaseClient;


    // ============================================================
    // FORMULARFELDER
    // ============================================================

    const customerName =
        document.getElementById("customerName");

    const startPoint =
        document.getElementById("startPoint");

    const destination =
        document.getElementById("destination");

    const startCitybuild =
        document.getElementById("startCitybuild");

    const destinationCitybuild =
        document.getElementById("destinationCitybuild");

    const crateCount =
        document.getElementById("crateCount");

    const description =
        document.getElementById("description");

    const extraWorkers =
        document.getElementById("extraWorkers");


    // ============================================================
    // PREIS-ANZEIGEN
    // ============================================================

    const basePrice =
        document.getElementById("basePrice");

    const sortingPrice =
        document.getElementById("sortingPrice");

    const deliveryPrice =
        document.getElementById("deliveryPrice");

    const expressPrice =
        document.getElementById("expressPrice");

    const workersPrice =
        document.getElementById("workersPrice");

    const totalPrice =
        document.getElementById("totalPrice");

    const deposit =
        document.getElementById("deposit");

    const remainingPayment =
        document.getElementById("remainingPayment");


    // ============================================================
    // BUTTON
    // ============================================================

    const createButton =
        document.getElementById("createOrderButton");


    // ============================================================
    // PREISE
    // ============================================================

    const PREIS_PRO_KISTE = 5000;

    const PREIS_PRO_50_KISTEN = 7500;

    const SORTIERUNG_PROZENT = 0.40;

    const PLOT_PLOT_PROZENT = 0.20;

    const CB_CB_PROZENT = 0.30;

    const EXPRESS_PROZENT = 0.25;

    const ZUSATZMITARBEITER_PREIS = 35000;

    const ANZAHLUNG_PROZENT = 0.25;

    const RESTZAHLUNG_PROZENT = 0.75;

    const CLAN_PROZENT = 0.30;

    const MITARBEITER_PROZENT = 0.70;

        // ============================================================
    // PREISBERECHNUNG
    // ============================================================

    function berechnePreise() {

        const kisten =
            Math.max(
                0,
                parseInt(crateCount.value) || 0
            );


        const weitereMitarbeiter =
            Math.max(
                0,
                parseInt(extraWorkers.value) || 0
            );


        const sortierung =
            document.querySelector(
                'input[name="sorting"]:checked'
            )?.value === "true";


        const express =
            document.querySelector(
                'input[name="express"]:checked'
            )?.value === "true";


        const lieferart =
            document.querySelector(
                'input[name="deliveryType"]:checked'
            )?.value || "plot";


        // ========================================================
        // GRUNDPREIS
        // 5.000 $ pro Kiste
        // + 7.500 $ je 50 Kisten
        // ========================================================

        let grundpreis =
            kisten * PREIS_PRO_KISTE;


        const zusatzStufen =
            Math.floor(
                kisten / 50
            );


        grundpreis +=
            zusatzStufen *
            PREIS_PRO_50_KISTEN;


        // ========================================================
        // SORTIERUNG
        // +40 %
        // ========================================================

        const preisSortierung =
            sortierung
                ? grundpreis *
                  SORTIERUNG_PROZENT
                : 0;


        // ========================================================
        // LIEFERART
        // Plot → Plot = +20 %
        // CB → CB = +30 %
        //
        // Materialbestellung existiert nicht mehr.
        // ========================================================

        let lieferProzent = 0;


        if (lieferart === "plot") {

            lieferProzent =
                PLOT_PLOT_PROZENT;

        }


        if (lieferart === "cb") {

            lieferProzent =
                CB_CB_PROZENT;

        }


        const preisLieferung =
            grundpreis *
            lieferProzent;


        // ========================================================
        // EXPRESS
        // +25 %
        // ========================================================

        const preisExpress =
            express
                ? grundpreis *
                  EXPRESS_PROZENT
                : 0;


        // ========================================================
        // ZUSÄTZLICHE MITARBEITER
        // 35.000 $ pro Mitarbeiter
        // ========================================================

        const preisMitarbeiter =
            weitereMitarbeiter *
            ZUSATZMITARBEITER_PREIS;


        // ========================================================
        // GESAMTPREIS
        // ========================================================

        const gesamt =
            grundpreis
            +
            preisSortierung
            +
            preisLieferung
            +
            preisExpress
            +
            preisMitarbeiter;


        // ========================================================
        // ZAHLUNG
        // 25 % Anzahlung
        // 75 % Restzahlung
        // ========================================================

        const anzahlung =
            gesamt *
            ANZAHLUNG_PROZENT;


        const restzahlung =
            gesamt *
            RESTZAHLUNG_PROZENT;


        // ========================================================
        // PREISE IN HTML ANZEIGEN
        // ========================================================

        basePrice.textContent =
            `${Math.round(grundpreis).toLocaleString("de-DE")} $`;


        sortingPrice.textContent =
            `${Math.round(preisSortierung).toLocaleString("de-DE")} $`;


        deliveryPrice.textContent =
            `${Math.round(preisLieferung).toLocaleString("de-DE")} $`;


        expressPrice.textContent =
            `${Math.round(preisExpress).toLocaleString("de-DE")} $`;


        workersPrice.textContent =
            `${Math.round(preisMitarbeiter).toLocaleString("de-DE")} $`;


        totalPrice.textContent =
            `${Math.round(gesamt).toLocaleString("de-DE")} $`;


        deposit.textContent =
            `${Math.round(anzahlung).toLocaleString("de-DE")} $`;


        remainingPayment.textContent =
            `${Math.round(restzahlung).toLocaleString("de-DE")} $`;


        // ========================================================
        // WERTE ZURÜCKGEBEN
        // ========================================================

        return {

            grundpreis,

            preisSortierung,

            preisLieferung,

            preisExpress,

            preisMitarbeiter,

            gesamt,

            anzahlung,

            restzahlung,

            clanShare:
                gesamt *
                CLAN_PROZENT,

            workerShare:
                gesamt *
                MITARBEITER_PROZENT

        };

          }

                // ============================================================
    // AUTOMATISCHE PREISBERECHNUNG
    // ============================================================

    crateCount.addEventListener(
        "input",
        berechnePreise
    );


    extraWorkers.addEventListener(
        "input",
        berechnePreise
    );


    document
        .querySelectorAll(
            'input[name="sorting"]'
        )
        .forEach(element => {

            element.addEventListener(
                "change",
                berechnePreise
            );

        });


    document
        .querySelectorAll(
            'input[name="deliveryType"]'
        )
        .forEach(element => {

            element.addEventListener(
                "change",
                berechnePreise
            );

        });


    document
        .querySelectorAll(
            'input[name="express"]'
        )
        .forEach(element => {

            element.addEventListener(
                "change",
                berechnePreise
            );

        });


    // ============================================================
    // PREISE BEIM ÖFFNEN DER SEITE BERECHNEN
    // ============================================================

    berechnePreise();


    // ============================================================
    // FORMULARPRÜFUNG
    // ============================================================

    function pruefeFormular() {

        if (
            !customerName.value.trim()
        ) {

            alert(
                "Bitte gib deinen Minecraft-Namen / Kundennamen ein."
            );

            customerName.focus();

            return false;

        }


        if (
            !startPoint.value.trim()
        ) {

            alert(
                "Bitte gib den Startpunkt ein."
            );

            startPoint.focus();

            return false;

        }


        if (
            !destination.value.trim()
        ) {

            alert(
                "Bitte gib das Ziel ein."
            );

            destination.focus();

            return false;

        }


        if (
            !startCitybuild.value
        ) {

            alert(
                "Bitte wähle den Start-CityBuild aus."
            );

            startCitybuild.focus();

            return false;

        }


        if (
            !destinationCitybuild.value
        ) {

            alert(
                "Bitte wähle den Ziel-CityBuild aus."
            );

            destinationCitybuild.focus();

            return false;

        }


        const kisten =
            parseInt(
                crateCount.value
            ) || 0;


        if (
            kisten < 1
        ) {

            alert(
                "Bitte gib mindestens 1 Kiste an."
            );

            crateCount.focus();

            return false;

        }


        const mitarbeiter =
            parseInt(
                extraWorkers.value
            ) || 0;


        if (
            mitarbeiter < 0
        ) {

            alert(
                "Die Anzahl der zusätzlichen Mitarbeiter darf nicht negativ sein."
            );

            extraWorkers.focus();

            return false;

        }

    // ============================================================
    // AUFTRAG ERSTELLEN
    // ============================================================

    createButton.addEventListener(
        "click",
        async () => {

            // ====================================================
            // BENUTZER PRÜFEN
            // ====================================================

            const {
                data: { user },
                error: userError
            } = await supabase.auth.getUser();


            if (userError || !user) {

                alert(
                    "Du musst angemeldet sein, um einen Logistik-Auftrag zu erstellen."
                );

                window.location.href =
                    "../HTML/login.html";

                return;

            }


            // ====================================================
            // FORMULAR PRÜFEN
            // ====================================================

            if (!pruefeFormular()) {
                return;
            }


            // ====================================================
            // PREISE AKTUELL BERECHNEN
            // ====================================================

            const preise =
                berechnePreise();


            // ====================================================
            // BESTÄTIGUNG
            // ====================================================

            const bestaetigen =
                confirm(
                    "Möchtest du diesen Logistik-Auftrag wirklich erstellen?\n\n" +
                    "Gesamtpreis: " +
                    Math.round(preise.gesamt)
                        .toLocaleString("de-DE") +
                    " $"
                );


            if (!bestaetigen) {
                return;
            }


            // ====================================================
            // AUFTRAGSNUMMER ERZEUGEN
            // ====================================================
            //
            // Format:
            // EM-LOG-XXXX
            //
            // XXXX = zufällige vierstellige Zahl
            // ====================================================

            const zufallszahl =
                Math.floor(
                    Math.random() * 9000
                ) + 1000;


            const orderNumber =
                "EM-LOG-" +
                zufallszahl;


            // ====================================================
            // AUSGEWÄHLTE OPTIONEN
            // ====================================================

            const sortierung =
                document.querySelector(
                    'input[name="sorting"]:checked'
                )?.value === "true";


            const express =
                document.querySelector(
                    'input[name="express"]:checked'
                )?.value === "true";


            const lieferart =
                document.querySelector(
                    'input[name="deliveryType"]:checked'
                )?.value || "plot";


            // ====================================================
            // LIEFERART IN DB-WERT UMWANDELN
            // ====================================================

            const deliveryType =
                lieferart === "plot"
                    ? "Plot-Plot"
                    : "CB-CB";


            // ====================================================
            // AUFTRAG IN SUPABASE SPEICHERN
            // ====================================================

            const { data, error } =
                await supabase
                    .from("logistics_orders")
                    .insert([

                        {
                            order_number:
                                orderNumber,

                            customer_name:
                                customerName.value.trim(),

                            start_point:
                                startPoint.value.trim(),

                            destination:
                                destination.value.trim(),

                            start_citybuild:
                                startCitybuild.value,

                            destination_citybuild:
                                destinationCitybuild.value,

                            crate_count:
                                parseInt(
                                    crateCount.value
                                ),

                            sorting:
                                sortierung,

                            delivery_type:
                                deliveryType,

                            express:
                                express,

                            extra_workers:
                                parseInt(
                                    extraWorkers.value
                                ) || 0,

                            description:
                                description.value.trim(),

                            status:
                                "Offen",

                            base_price:
                                Math.round(
                                    preise.grundpreis
                                ),

                            sorting_price:
                                Math.round(
                                    preise.preisSortierung
                                ),

                            delivery_price:
                                Math.round(
                                    preise.preisLieferung
                                ),

                            express_price:
                                Math.round(
                                    preise.preisExpress
                                ),

                            workers_price:
                                Math.round(
                                    preise.preisMitarbeiter
                                ),

                            total_price:
                                Math.round(
                                    preise.gesamt
                                ),

                            deposit:
                                Math.round(
                                    preise.anzahlung
                                ),

                            remaining_payment:
                                Math.round(
                                    preise.restzahlung
                                ),

                            clan_share:
                                Math.round(
                                    preise.clanShare
                                ),

                            worker_share:
                                Math.round(
                                    preise.workerShare
                                ),

                            created_by:
                                user.id

                        }

                    ])
                    .select()
                    .single();


            // ====================================================
            // FEHLER BEIM SPEICHERN
            // ====================================================

            if (error) {

                console.error(
                    "Fehler beim Erstellen des Logistik-Auftrags:",
                    error
                );


                alert(
                    "Der Logistik-Auftrag konnte nicht erstellt werden.\n\n" +
                    error.message
                );

                return;

            }


            // ====================================================
            // ERFOLG
            // ====================================================

            console.log(
                "Logistik-Auftrag erstellt:",
                data
            );


            // ====================================================
            // DATEN FÜR ERFOLGSSEITE SPEICHERN
            // ====================================================

            sessionStorage.setItem(
                "logistik_order_number",
                orderNumber
            );


            sessionStorage.setItem(
                "logistik_order_price",
                Math.round(
                    preise.gesamt
                )
            );


            sessionStorage.setItem(
                "logistik_order_deposit",
                Math.round(
                    preise.anzahlung
                )
            );


            sessionStorage.setItem(
                "logistik_order_remaining",
                Math.round(
                    preise.restzahlung
                )
            );


            // ====================================================
            // WEITERLEITUNG
            // ====================================================

            window.location.href =
                "../HTML/logistik_erfolgreich.html";

        }
    );

      // ============================================================
    // BUTTON WÄHREND DER ERSTELLUNG SPERREN
    // ============================================================

    createButton.addEventListener(
        "click",
        () => {

            createButton.disabled = true;

            createButton.textContent =
                "Auftrag wird erstellt...";

        },
        { once: false }
    );


    // ============================================================
    // ABSCHLUSS
    // ============================================================

});
