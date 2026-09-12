document.addEventListener("DOMContentLoaded", async () => {

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase Client nicht gefunden.");
        return;
    }


    /* =====================================================
       LEITUNGS-BEREICHE
       ===================================================== */

    const leitungsBereiche = [
        {
            position: "gruender",
            bereich: "Gründer",
            rang: "Stadtleitung",
            element: "leitung-gruender"
        },
        {
            position: "buchhaltung",
            bereich: "Buchhaltung",
            rang: "Leitung",
            element: "leitung-buchhaltung"
        },
        {
            position: "baumeister",
            bereich: "Baumeister",
            rang: "Leitung",
            element: "leitung-baumeister"
        },
        {
            position: "haendler",
            bereich: "Händler",
            rang: "Leitung",
            element: "leitung-handler"
        },
        {
            position: "redstone",
            bereich: "Redstone",
            rang: "Leitung",
            element: "leitung-redstone"
        },
        {
            position: "farmer",
            bereich: "Farmer",
            rang: "Leitung",
            element: "leitung-farmer"
        },
        {
            position: "logistik",
            bereich: "Logistik",
            rang: "Leitung",
            element: "leitung-logistik"
        }
    ];


    /* =====================================================
       AKTUELLEN BENUTZER LADEN
       ===================================================== */

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();


    if (userError) {

        console.error(
            "Fehler beim Laden des Benutzers:",
            userError
        );

    }


    /* =====================================================
       STADTLEITUNG PRÜFEN
       ===================================================== */

    let istStadtleitung = false;


    if (user) {

        const {
            data: employee,
            error: employeeError
        } = await supabase
            .from("employees")
            .select("rang, is_active")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();


        if (employeeError) {

            console.error(
                "Fehler beim Prüfen der Mitarbeiterrechte:",
                employeeError
            );

        }


        if (
            employee &&
            employee.rang === "Stadtleitung"
        ) {

            istStadtleitung = true;

        }

    }


    /* =====================================================
       LEITUNGSNAMEN LADEN
       
       Tabelle:
       leitung_namen
       
       Erwartete Spalten:
       position
       name
       ===================================================== */

    async function ladeLeitungsnamen() {

        const {
            data,
            error
        } = await supabase
            .from("leitung_namen")
            .select("position, name");


        if (error) {

            console.error(
                "Fehler beim Laden der Leitungsnamen:",
                error
            );

            return;

        }


        /* Alle Namen zuerst leeren */

        leitungsBereiche.forEach(
            leitung => {

                const element =
                    document.getElementById(
                        leitung.element
                    );

                if (element) {
                    element.textContent = "";
                }

            }
        );


        /* Gespeicherte Namen einsetzen */

        (data || []).forEach(
            eintrag => {

                const leitung =
                    leitungsBereiche.find(
                        item =>
                            item.position ===
                            eintrag.position
                    );


                if (!leitung) {
                    return;
                }


                const element =
                    document.getElementById(
                        leitung.element
                    );


                if (!element) {
                    return;
                }


                if (
                    eintrag.name &&
                    eintrag.name.trim() !== ""
                ) {

                    element.textContent =
                        eintrag.name.trim();

                }

            }
        );

    }


    /* =====================================================
       STARTSEITE – LEITUNGSNAMEN
       ===================================================== */

    await ladeLeitungsnamen();

      /* =====================================================
       BEWERTUNGEN LADEN
       ===================================================== */

    async function ladeBewertungen() {

        const {
            data,
            error
        } = await supabase
            .from("bewertungen")
            .select("sterne");


        if (error) {

            console.error(
                "Fehler beim Laden der Bewertungen:",
                error
            );

            setzeBewertungsAnzeige(0, 0);

            return;

        }


        const bewertungen =
            data || [];


        let summe = 0;


        bewertungen.forEach(
            bewertung => {

                summe +=
                    Number(bewertung.sterne) || 0;

            }
        );


        const anzahl =
            bewertungen.length;


        const durchschnitt =
            anzahl > 0
                ? summe / anzahl
                : 0;


        setzeBewertungsAnzeige(
            durchschnitt,
            anzahl
        );

    }


    /* =====================================================
       BEWERTUNGSANZEIGE SETZEN
       ===================================================== */

    function setzeBewertungsAnzeige(
        durchschnitt,
        anzahl
    ) {

        const durchschnittElement =
            document.getElementById(
                "startDurchschnitt"
            );


        const anzahlElement =
            document.getElementById(
                "startBewertungAnzahl"
            );


        if (durchschnittElement) {

            durchschnittElement.textContent =
                durchschnitt.toLocaleString(
                    "de-DE",
                    {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                    }
                ) + " / 5";

        }


        if (anzahlElement) {

            anzahlElement.textContent =
                anzahl === 1
                    ? "1 Bewertung"
                    : `${anzahl.toLocaleString("de-DE")} Bewertungen`;

        }

    }


    /* =====================================================
       KONTO-BEREICH
       ===================================================== */

    const registrierenButton =
        document.querySelector(
            'a[href="registrieren.html"]'
        );


    const kundenbereichButton =
        document.querySelector(
            'a[href="kundenbereich.html"]'
        );


    const mitarbeiterbereichButton =
        document.querySelector(
            'a[href="mitarbeiterbereich.html"]'
        );


    const verwaltungButton =
        document.querySelector(
            'a[href="verwaltung.html"]'
        );


    /* =====================================================
       STANDARDZUSTAND
       ===================================================== */

    if (kundenbereichButton) {

        kundenbereichButton.style.display =
            "none";

    }


    if (mitarbeiterbereichButton) {

        mitarbeiterbereichButton.style.display =
            "none";

    }


    if (verwaltungButton) {

        verwaltungButton.style.display =
            "none";

    }


    /* =====================================================
       EINGELOGGTEN BENUTZER PRÜFEN
       ===================================================== */

    if (user) {

        if (registrierenButton) {

            registrierenButton.style.display =
                "none";

        }


        if (kundenbereichButton) {

            kundenbereichButton.style.display =
                "inline-block";

        }


        /* =============================================
           MITARBEITER PRÜFEN
           ============================================= */

        const {
            data: employee,
            error: employeeError
        } = await supabase
            .from("employees")
            .select(
                "rang, is_active"
            )
            .eq(
                "user_id",
                user.id
            )
            .eq(
                "is_active",
                true
            )
            .maybeSingle();


        if (employeeError) {

            console.error(
                "Fehler beim Laden des Mitarbeiters:",
                employeeError
            );

        }


        /* =============================================
           MITARBEITERBEREICH
           ============================================= */

        if (employee) {

            if (mitarbeiterbereichButton) {

                mitarbeiterbereichButton.style.display =
                    "inline-block";

            }


            /* =========================================
               VERWALTUNG NUR FÜR STADTLEITUNG/LEITUNG
               ========================================= */

            if (
                employee.rang === "Stadtleitung" ||
                employee.rang === "Leitung"
            ) {

                if (verwaltungButton) {

                    verwaltungButton.style.display =
                        "inline-block";

                }

            }

        }

    }


    /* =====================================================
       STADTLEITUNG – BEARBEITUNG DER LEITUNGSNAMEN
       ===================================================== */

    if (istStadtleitung) {

        console.log(
            "Stadtleitung erkannt – Namensverwaltung aktiv."
        );

          }

      /* =====================================================
       NAMEN DER LEITUNG BEARBEITEN
       ===================================================== */

    async function bearbeiteLeitungsname(leitung) {

        if (!istStadtleitung) {
            return;
        }


        const aktuellesElement =
            document.getElementById(
                leitung.element
            );


        const aktuellerName =
            aktuellesElement
                ? aktuellesElement.textContent.trim()
                : "";


        const neuerName =
            prompt(
                `${leitung.bereich} – Name eingeben.\n\n` +
                `Leer lassen, um den Namen zu entfernen.`,
                aktuellerName
            );


        /* Abbrechen */

        if (neuerName === null) {
            return;
        }


        const name =
            neuerName.trim();


        /* =================================================
           NAMEN SPEICHERN
           ================================================= */

        if (name === "") {

            const {
                error
            } = await supabase
                .from("leitung_namen")
                .delete()
                .eq(
                    "position",
                    leitung.position
                );


            if (error) {

                console.error(
                    "Fehler beim Entfernen des Namens:",
                    error
                );

                alert(
                    "Der Name konnte nicht entfernt werden."
                );

                return;
            }


        } else {

            const {
                error
            } = await supabase
                .from("leitung_namen")
                .upsert(
                    {
                        position:
                            leitung.position,

                        name:
                            name
                    },
                    {
                        onConflict:
                            "position"
                    }
                );


            if (error) {

                console.error(
                    "Fehler beim Speichern des Namens:",
                    error
                );

                alert(
                    "Der Name konnte nicht gespeichert werden."
                );

                return;
            }

        }


        /* =================================================
           ANZEIGE AKTUALISIEREN
           ================================================= */

        if (aktuellesElement) {

            aktuellesElement.textContent =
                name;

        }

    }


    /* =====================================================
       PLUS-BUTTONS NUR FÜR STADTLEITUNG
       ===================================================== */

    function erstelleBearbeitenButtons() {

        if (!istStadtleitung) {
            return;
        }


        leitungsBereiche.forEach(
            leitung => {

                const nameElement =
                    document.getElementById(
                        leitung.element
                    );


                if (!nameElement) {
                    return;
                }


                /* Bereits vorhandenen Button nicht
                   doppelt erstellen */

                if (
                    nameElement
                        .parentElement
                        .querySelector(
                            ".leitung-edit-button"
                        )
                ) {
                    return;
                }


                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";


                button.className =
                    "leitung-edit-button";


                button.textContent =
                    "＋";


                button.title =
                    `${leitung.bereich} bearbeiten`;


                button.style.marginTop =
                    "7px";


                button.style.width =
                    "30px";


                button.style.height =
                    "30px";


                button.style.border =
                    "1px solid rgba(215, 173, 82, 0.55)";


                button.style.borderRadius =
                    "50%";


                button.style.background =
                    "rgba(5, 4, 3, 0.85)";


                button.style.color =
                    "#d7ad52";


                button.style.fontSize =
                    "20px";


                button.style.lineHeight =
                    "26px";


                button.style.padding =
                    "0";


                button.style.cursor =
                    "pointer";


                button.addEventListener(
                    "click",
                    () => {
                        bearbeiteLeitungsname(
                            leitung
                        );
                    }
                );


                nameElement
                    .parentElement
                    .appendChild(button);

            }
        );

    }


    /* =====================================================
       BEARBEITUNGSBUTTONS ERSTELLEN
       ===================================================== */

    erstelleBearbeitenButtons();


    /* =====================================================
       BEWERTUNGEN INITIALISIEREN
       ===================================================== */

    await ladeBewertungen();


    /* =====================================================
       SUPABASE AUTH-ÄNDERUNGEN
       ===================================================== */

    supabase.auth.onAuthStateChange(
        async () => {

            /*
             * Wenn sich der Benutzer an- oder abmeldet,
             * wird die Startseite neu geladen.
             */

            setTimeout(
                () => {
                    window.location.reload();
                },
                100
            );

        }
    );


    /* =====================================================
       ABSCHLUSS
       ===================================================== */

});
