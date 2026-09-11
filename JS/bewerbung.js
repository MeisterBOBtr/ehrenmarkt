// ============================================================
// EHRENMARKT
// BEWERBUNGSSYSTEM
// ============================================================

let aktuellerSchritt = 1;

const gesamtSchritte = 5;

let supabaseClient = null;
let aktuellerUser = null;


// ============================================================
// ELEMENTE
// ============================================================

const fortschritt =
    document.getElementById("fortschrittInhalt");

const fortschrittText =
    document.getElementById("fortschrittSchritt");

const fehlerBox =
    document.getElementById("fehler");


// ============================================================
// FEHLERMELDUNG
// ============================================================

function zeigeFehler(text) {

    if (!fehlerBox) {
        alert(text);
        return;
    }

    fehlerBox.textContent = text;
    fehlerBox.style.display = "block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function versteckeFehler() {

    if (!fehlerBox) {
        return;
    }

    fehlerBox.textContent = "";
    fehlerBox.style.display = "none";
}


// ============================================================
// SCHRITT ANZEIGEN
// ============================================================

function schrittAnzeigen(nummer) {

    // Alle Schritte erst jetzt aus dem HTML holen
    const schritte =
        document.querySelectorAll(".schritt");


    // Fortschrittsanzeige erst jetzt aus dem HTML holen
    const fortschritt =
        document.getElementById("fortschrittInhalt");


    const fortschrittText =
        document.getElementById("fortschrittSchritt");


    // Alle Schritte ausblenden
    schritte.forEach((element) => {

        element.classList.remove("aktiv");

    });


    // Gewünschten Schritt suchen
    const ziel =
        document.querySelector(
            '.schritt[data-schritt="' +
            nummer +
            '"]'
        );


    // Falls der Schritt nicht existiert
    if (!ziel) {

        console.error(
            "Bewerbungsschritt nicht gefunden:",
            nummer
        );

        return;

    }


    // Gewünschten Schritt anzeigen
    ziel.classList.add("aktiv");


    // Aktuellen Schritt speichern
    aktuellerSchritt =
        nummer;


    // Fortschrittsbalken aktualisieren
    if (fortschritt) {

        fortschritt.style.width =
            (
                nummer /
                gesamtSchritte *
                100
            ) + "%";

    }


    // Text "Schritt X von 5" aktualisieren
    if (fortschrittText) {

        fortschrittText.textContent =
            "Schritt " +
            nummer +
            " von " +
            gesamtSchritte;

    }


    // Zusammenfassung bei Schritt 5 aktualisieren
    if (nummer === 5) {

        aktualisiereZusammenfassung();

    }


    // Fehlermeldung ausblenden
    versteckeFehler();


    // Nach oben scrollen
    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// ============================================================
// WEITER
// ============================================================

function weiter() {

    if (
        !validiereSchritt(
            aktuellerSchritt
        )
    ) {
        return;
    }


    if (
        aktuellerSchritt <
        gesamtSchritte
    ) {

        schrittAnzeigen(
            aktuellerSchritt + 1
        );

    }

}


// ============================================================
// ZURÜCK
// ============================================================

function zurueck() {

    if (
        aktuellerSchritt > 1
    ) {

        schrittAnzeigen(
            aktuellerSchritt - 1
        );

    }

}


// ============================================================
// RADIO-WERT
// ============================================================

function getRadioWert(name) {

    const auswahl =
        document.querySelector(
            'input[name="' +
            name +
            '"]:checked'
        );


    return auswahl
        ? auswahl.value
        : "";

}


// ============================================================
// AUSGEWÄHLTE FACHBEREICHE
// ============================================================

function getFachbereiche() {

    const checkboxen =
        document.querySelectorAll(
            '.checkbox-grid input[type="checkbox"]:checked'
        );


    return Array.from(
        checkboxen
    ).map(
        checkbox =>
            checkbox.value
    );

}


// ============================================================
// SCHRITT 1 VALIDIEREN
// ============================================================

function validiereSchritt1() {

    const name =
        document
            .getElementById("name")
            ?.value
            .trim();


    const minecraftName =
        document
            .getElementById("minecraftName")
            ?.value
            .trim();


    const alter =
        document
            .getElementById("alter")
            ?.value
            .trim();


    if (!name) {

        zeigeFehler(
            "Bitte gib deinen Namen ein."
        );

        document
            .getElementById("name")
            ?.focus();

        return false;
    }


    if (!minecraftName) {

        zeigeFehler(
            "Bitte gib deinen Minecraft-Namen ein."
        );

        document
            .getElementById("minecraftName")
            ?.focus();

        return false;
    }


    if (!alter) {

        zeigeFehler(
            "Bitte gib dein Alter ein."
        );

        document
            .getElementById("alter")
            ?.focus();

        return false;
    }


    const alterZahl =
        Number(alter);


    if (
        !Number.isInteger(alterZahl) ||
        alterZahl < 1 ||
        alterZahl > 120
    ) {

        zeigeFehler(
            "Bitte gib ein gültiges Alter ein."
        );

        document
            .getElementById("alter")
            ?.focus();

        return false;
    }


    return true;

}


// ============================================================
// SCHRITT 2 VALIDIEREN
// ============================================================

function validiereSchritt2() {

    const fachbereiche =
        getFachbereiche();


    if (
        fachbereiche.length === 0
    ) {

        zeigeFehler(
            "Bitte wähle mindestens einen Fachbereich aus."
        );

        return false;
    }


    return true;

}


// ============================================================
// SCHRITT 3 VALIDIEREN
// ============================================================

function validiereSchritt3() {

    const erfahrung =
        getRadioWert(
            "experience"
        );


    if (!erfahrung) {

        zeigeFehler(
            "Bitte wähle deine Erfahrung aus."
        );

        return false;
    }


    return true;

}


// ============================================================
// SCHRITT 4 VALIDIEREN
// ============================================================

function validiereSchritt4() {

    const rolle =
        getRadioWert(
            "desiredRole"
        );


    const verfuegbarkeit =
        document
            .getElementById("availability")
            ?.value;


    if (!rolle) {

        zeigeFehler(
            "Bitte wähle deine gewünschte Rolle aus."
        );

        return false;
    }


    if (!verfuegbarkeit) {

        zeigeFehler(
            "Bitte wähle deine Verfügbarkeit aus."
        );

        return false;
    }


    return true;

}


// ============================================================
// SCHRITT 5 VALIDIEREN
// ============================================================

function validiereSchritt5() {

    const motivation =
        document
            .getElementById("applicationText")
            ?.value
            .trim();


    if (!motivation) {

        zeigeFehler(
            "Bitte schreibe etwas zu deiner Motivation."
        );

        document
            .getElementById("applicationText")
            ?.focus();

        return false;
    }


    if (
        motivation.length < 20
    ) {

        zeigeFehler(
            "Bitte schreibe etwas ausführlicher über deine Motivation."
        );

        document
            .getElementById("applicationText")
            ?.focus();

        return false;
    }


    return true;

}


// ============================================================
// SCHRITT VALIDIEREN
// ============================================================

function validiereSchritt(schritt) {

    versteckeFehler();


    if (schritt === 1) {
        return validiereSchritt1();
    }


    if (schritt === 2) {
        return validiereSchritt2();
    }


    if (schritt === 3) {
        return validiereSchritt3();
    }


    if (schritt === 4) {
        return validiereSchritt4();
    }


    if (schritt === 5) {
        return validiereSchritt5();
    }


    return true;

}


// ============================================================
// ZUSAMMENFASSUNG AKTUALISIEREN
// ============================================================

function aktualisiereZusammenfassung() {

    const name =
        document
            .getElementById("name")
            ?.value
            .trim();


    const minecraftName =
        document
            .getElementById("minecraftName")
            ?.value
            .trim();


    const rolle =
        getRadioWert(
            "desiredRole"
        );


    const erfahrung =
        getRadioWert(
            "experience"
        );


    const verfuegbarkeit =
        document
            .getElementById("availability")
            ?.value;


    const summaryName =
        document.getElementById(
            "summaryName"
        );


    const summaryMinecraft =
        document.getElementById(
            "summaryMinecraft"
        );


    const summaryRole =
        document.getElementById(
            "summaryRole"
        );


    const summaryExperience =
        document.getElementById(
            "summaryExperience"
        );


    const summaryAvailability =
        document.getElementById(
            "summaryAvailability"
        );


    if (summaryName) {

        summaryName.textContent =
            name || "–";

    }


    if (summaryMinecraft) {

        summaryMinecraft.textContent =
            minecraftName || "–";

    }


    if (summaryRole) {

        summaryRole.textContent =
            rolle || "–";

    }


    if (summaryExperience) {

        summaryExperience.textContent =
            erfahrung || "–";

    }


    if (summaryAvailability) {

        summaryAvailability.textContent =
            verfuegbarkeit || "–";

    }

}


// ============================================================
// SUPABASE BENUTZER LADEN
// ============================================================

async function ladeAktuellenBenutzer() {

    if (!supabaseClient) {

        zeigeFehler(
            "Die Verbindung zu Ehrenmarkt konnte nicht hergestellt werden."
        );

        return false;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .getUser();


        if (error) {
            throw error;
        }


        if (!data?.user) {

            zeigeFehler(
                "Du musst angemeldet sein, um eine Bewerbung abzugeben."
            );

            return false;
        }


        aktuellerUser =
            data.user;


        return true;

    } catch (error) {

        console.error(
            "Fehler beim Laden des Benutzers:",
            error
        );


        zeigeFehler(
            "Deine Anmeldung konnte nicht überprüft werden."
        );


        return false;

    }

}


// ============================================================
// BEWERBUNG AN SUPABASE SENDEN
// ============================================================

async function bewerbungAbsenden() {

    if (
        !validiereSchritt5()
    ) {
        return;
    }


    if (
        !supabaseClient
    ) {

        zeigeFehler(
            "Die Verbindung zu Ehrenmarkt konnte nicht hergestellt werden."
        );

        return;
    }


    if (
        !aktuellerUser
    ) {

        const angemeldet =
            await ladeAktuellenBenutzer();


        if (!angemeldet) {
            return;
        }

    }


    const name =
        document
            .getElementById("name")
            .value
            .trim();


    const minecraftName =
        document
            .getElementById("minecraftName")
            .value
            .trim();


    const discordId =
        document
            .getElementById("discordId")
            .value
            .trim();


    const alter =
        Number(
            document
                .getElementById("alter")
                .value
                .trim()
        );


    const erfahrung =
        getRadioWert(
            "experience"
        );


    const previousWork =
        document
            .getElementById("previousWork")
            .value
            .trim();


    const rolle =
        getRadioWert(
            "desiredRole"
        );


    const availability =
        document
            .getElementById("availability")
            .value;


    const unavailableTimes =
        document
            .getElementById("unavailableTimes")
            .value
            .trim();


    const applicationText =
        document
            .getElementById("applicationText")
            .value
            .trim();


    const additionalSkills =
        document
            .getElementById("additionalSkills")
            .value
            .trim();


    const fachbereiche =
        getFachbereiche();


    /*
     * Button suchen
     */

    const absendenButton =
        document.querySelector(
            '[onclick="bewerbungAbsenden()"]'
        );


    const alterButtonText =
        absendenButton
            ? absendenButton.textContent
            : "";


    if (absendenButton) {

        absendenButton.disabled =
            true;

        absendenButton.textContent =
            "Bewerbung wird gesendet...";

    }


    versteckeFehler();


    try {

        /*
         * Prüfen, ob bereits eine offene Bewerbung existiert
         */

        const {
            data: vorhandeneBewerbungen,
            error: pruefFehler
        } =
            await supabaseClient
                .from("applications")
                .select("id, status")
                .eq(
                    "user_id",
                    aktuellerUser.id
                )
                .eq(
                    "status",
                    "offen"
                );


        if (pruefFehler) {
            throw pruefFehler;
        }


        if (
            vorhandeneBewerbungen &&
            vorhandeneBewerbungen.length > 0
        ) {

            zeigeFehler(
                "Du hast bereits eine offene Bewerbung. Bitte warte, bis diese geprüft wurde."
            );

            return;

        }


        /*
         * Bewerbung erstellen
         */

        const {
            data: neueBewerbung,
            error
        } =
            await supabaseClient
                .from("applications")
                .insert({

                    user_id:
                        aktuellerUser.id,

                    name:
                        name,

                    minecraft_name:
                        minecraftName,

                    discord_id:
                        discordId || null,

                    age:
                        alter,

                    experience:
                        erfahrung,

                    previous_work:
                        previousWork || null,

                    desired_role:
                        rolle,

                    additional_skills:
                        fachbereiche,

                    application_text:
                        applicationText +
                        (
                            additionalSkills
                                ? "\n\nBesondere Fähigkeiten:\n" +
                                  additionalSkills
                                : ""
                        ),

                    availability:
                        availability,

                    unavailable_times:
                        unavailableTimes || null,

                    status:
                        "offen"

                })
                .select()
                .single();


        if (error) {
            throw error;
        }


        console.log(
            "Ehrenmarkt Bewerbung gespeichert:",
            neueBewerbung
        );


        /*
         * Erfolg anzeigen
         */

        schritte.forEach(
            element => {
                element.classList.remove(
                    "aktiv"
                );
            }
        );


        const erfolg =
            document.getElementById(
                "erfolg"
            );


        if (erfolg) {

            erfolg.classList.add(
                "aktiv"
            );

        }


        if (fortschritt) {

            fortschritt.style.width =
                "100%";

        }


        if (fortschrittText) {

            fortschrittText.textContent =
                "Bewerbung eingereicht";

        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Ehrenmarkt Bewerbung Fehler:",
            error
        );


        let meldung =
            "Die Bewerbung konnte nicht gespeichert werden.";


        if (
            error?.message
        ) {

            console.error(
                "Supabase Fehlermeldung:",
                error.message
            );

        }


        zeigeFehler(
            meldung
        );


    } finally {

        if (absendenButton) {

            absendenButton.disabled =
                false;

            absendenButton.textContent =
                alterButtonText ||
                "Bewerbung absenden";

        }

    }

}


// ============================================================
// AUTH LISTENER
// ============================================================

function registriereAuthListener() {

    if (
        !supabaseClient
    ) {
        return;
    }


    supabaseClient
        .auth
        .onAuthStateChange(
            (
                event,
                session
            ) => {

                if (
                    session?.user
                ) {

                    aktuellerUser =
                        session.user;

                }


                if (
                    event ===
                    "SIGNED_OUT"
                ) {

                    aktuellerUser =
                        null;

                }

            }
        );

}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /*
         * Supabase Client aus supabase.js
         */

        supabaseClient =
            window.supabaseClient;


        if (
            !supabaseClient
        ) {

            zeigeFehler(
                "Die Verbindung zu Ehrenmarkt konnte nicht hergestellt werden."
            );

            return;

        }


        /*
         * Angemeldeten Benutzer laden
         */

        const angemeldet =
            await ladeAktuellenBenutzer();


        if (!angemeldet) {
            return;
        }


        /*
         * Auth-Listener starten
         */

        registriereAuthListener();


        /*
         * Ersten Schritt anzeigen
         */

        schrittAnzeigen(1);

    }
);

// ============================================================
// SCHRITT 1 VALIDIEREN
// ============================================================

function validiereSchritt1() {

    const name =
        document
            .getElementById("name")
            ?.value
            .trim();

    const minecraftName =
        document
            .getElementById("minecraftName")
            ?.value
            .trim();

    const alter =
        document
            .getElementById("alter")
            ?.value
            .trim();


    if (!name) {

        zeigeFehler(
            "Bitte gib deinen Namen ein."
        );

        document
            .getElementById("name")
            ?.focus();

        return false;
    }


    if (!minecraftName) {

        zeigeFehler(
            "Bitte gib deinen Minecraft-Namen ein."
        );

        document
            .getElementById("minecraftName")
            ?.focus();

        return false;
    }


    if (!alter) {

        zeigeFehler(
            "Bitte gib dein Alter ein."
        );

        document
            .getElementById("alter")
            ?.focus();

        return false;
    }


    const alterZahl =
        Number(alter);


    if (
        !Number.isInteger(alterZahl) ||
        alterZahl < 1 ||
        alterZahl > 120
    ) {

        zeigeFehler(
            "Bitte gib ein gültiges Alter ein."
        );

        document
            .getElementById("alter")
            ?.focus();

        return false;
    }


    return true;

}


// ============================================================
// SCHRITT 2 VALIDIEREN
// ============================================================

function validiereSchritt2() {

    const fachbereiche =
        getFachbereiche();


    if (
        fachbereiche.length === 0
    ) {

        zeigeFehler(
            "Bitte wähle mindestens einen Fachbereich aus."
        );

        return false;
    }


    return true;

}


// ============================================================
// SCHRITT 3 VALIDIEREN
// ============================================================

function validiereSchritt3() {

    const erfahrung =
        getRadioWert(
            "experience"
        );


    if (!erfahrung) {

        zeigeFehler(
            "Bitte wähle deine Erfahrung aus."
        );

        return false;
    }


    return true;

}


// ============================================================
// SCHRITT 4 VALIDIEREN
// ============================================================

function validiereSchritt4() {

    const rolle =
        getRadioWert(
            "desiredRole"
        );


    const verfuegbarkeit =
        document
            .getElementById("availability")
            ?.value;


    if (!rolle) {

        zeigeFehler(
            "Bitte wähle deine gewünschte Rolle aus."
        );

        return false;
    }


    if (!verfuegbarkeit) {

        zeigeFehler(
            "Bitte wähle deine Verfügbarkeit aus."
        );

        return false;
    }


    return true;

}


// ============================================================
// SCHRITT 5 VALIDIEREN
// ============================================================

function validiereSchritt5() {

    const motivation =
        document
            .getElementById("applicationText")
            ?.value
            .trim();


    if (!motivation) {

        zeigeFehler(
            "Bitte schreibe etwas zu deiner Motivation."
        );

        document
            .getElementById("applicationText")
            ?.focus();

        return false;
    }


    if (
        motivation.length < 20
    ) {

        zeigeFehler(
            "Bitte schreibe etwas ausführlicher über deine Motivation."
        );

        document
            .getElementById("applicationText")
            ?.focus();

        return false;
    }


    return true;

}


// ============================================================
// SCHRITT VALIDIEREN
// ============================================================

function validiereSchritt(schritt) {

    versteckeFehler();


    if (schritt === 1) {

        return validiereSchritt1();

    }


    if (schritt === 2) {

        return validiereSchritt2();

    }


    if (schritt === 3) {

        return validiereSchritt3();

    }


    if (schritt === 4) {

        return validiereSchritt4();

    }


    if (schritt === 5) {

        return validiereSchritt5();

    }


    return true;

}


// ============================================================
// ZUSAMMENFASSUNG AKTUALISIEREN
// ============================================================

function aktualisiereZusammenfassung() {

    const name =
        document
            .getElementById("name")
            ?.value
            .trim();


    const minecraftName =
        document
            .getElementById("minecraftName")
            ?.value
            .trim();


    const rolle =
        getRadioWert(
            "desiredRole"
        );


    const erfahrung =
        getRadioWert(
            "experience"
        );


    const verfuegbarkeit =
        document
            .getElementById("availability")
            ?.value;


    const summaryName =
        document.getElementById(
            "summaryName"
        );


    const summaryMinecraft =
        document.getElementById(
            "summaryMinecraft"
        );


    const summaryRole =
        document.getElementById(
            "summaryRole"
        );


    const summaryExperience =
        document.getElementById(
            "summaryExperience"
        );


    const summaryAvailability =
        document.getElementById(
            "summaryAvailability"
        );


    if (summaryName) {

        summaryName.textContent =
            name || "–";

    }


    if (summaryMinecraft) {

        summaryMinecraft.textContent =
            minecraftName || "–";

    }


    if (summaryRole) {

        summaryRole.textContent =
            rolle || "–";

    }


    if (summaryExperience) {

        summaryExperience.textContent =
            erfahrung || "–";

    }


    if (summaryAvailability) {

        summaryAvailability.textContent =
            verfuegbarkeit || "–";

    }

}

// ============================================================
// BEWERBUNGSDATEN SAMMELN
// ============================================================

function sammleBewerbungsdaten() {

    const name =
        document
            .getElementById("name")
            ?.value
            .trim() || "";


    const minecraftName =
        document
            .getElementById("minecraftName")
            ?.value
            .trim() || "";


    const discordId =
        document
            .getElementById("discordId")
            ?.value
            .trim() || "";


    const alter =
        Number(
            document
                .getElementById("alter")
                ?.value
        );


    const erfahrung =
        getRadioWert(
            "experience"
        );


    const previousWork =
        document
            .getElementById("previousWork")
            ?.value
            .trim() || "";


    const desiredRole =
        getRadioWert(
            "desiredRole"
        );


    const availability =
        document
            .getElementById("availability")
            ?.value || "";


    const unavailableTimes =
        document
            .getElementById("unavailableTimes")
            ?.value
            .trim() || "";


    const applicationText =
        document
            .getElementById("applicationText")
            ?.value
            .trim() || "";


    const additionalSkills =
        getFachbereiche();


    const besondereFaehigkeiten =
        document
            .getElementById("additionalSkills")
            ?.value
            .trim() || "";


    return {

        name,

        minecraft_name:
            minecraftName,

        discord_id:
            discordId || null,

        age:
            alter,

        experience:
            erfahrung || null,

        previous_work:
            previousWork || null,

        desired_role:
            desiredRole || null,

        additional_skills:
            additionalSkills,

        application_text:
            besondereFaehigkeiten
                ? `${applicationText}\n\nBesondere Fähigkeiten:\n${besondereFaehigkeiten}`
                : applicationText,

        availability:
            availability || null,

        unavailable_times:
            unavailableTimes || null

    };

}


// ============================================================
// FACHBEREICHE AUSLESEN
// ============================================================

function getFachbereiche() {

    const checkboxIds = [

        "bauen",
        "landschaftsbau",
        "redstone",
        "farmer",
        "lager",
        "handel",
        "planung",
        "terraforming"

    ];


    const fachbereiche = [];


    checkboxIds.forEach(
        function (id) {

            const checkbox =
                document.getElementById(id);


            if (
                checkbox &&
                checkbox.checked
            ) {

                fachbereiche.push(
                    checkbox.value
                );

            }

        }
    );


    return fachbereiche;

}


// ============================================================
// RADIO-WERT AUSLESEN
// ============================================================

function getRadioWert(name) {

    const radio =
        document.querySelector(
            `input[name="${name}"]:checked`
        );


    return radio
        ? radio.value
        : "";

}


// ============================================================
// FEHLERMELDUNG
// ============================================================

function zeigeFehler(text) {

    const fehler =
        document.getElementById("fehler");


    if (!fehler) {

        alert(text);

        return;

    }


    fehler.textContent =
        text;


    fehler.style.display =
        "block";


    fehler.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


// ============================================================
// FEHLERMELDUNG AUSBLENDEN
// ============================================================

function versteckeFehler() {

    const fehler =
        document.getElementById("fehler");


    if (!fehler) {

        return;

    }


    fehler.textContent =
        "";


    fehler.style.display =
        "none";

          }

// ============================================================
// BEWERBUNG ABSENDEN
// ============================================================

async function bewerbungAbsenden() {

    versteckeFehler();


    // Letzten Schritt prüfen
    if (!validiereSchritt(5)) {
        return;
    }


    const client =
        window.supabaseClient;


    if (!client) {

        zeigeFehler(
            "Die Verbindung zum Ehrenmarkt-System konnte nicht hergestellt werden."
        );

        return;
    }


    // Eingeloggten Benutzer holen
    const {
        data: {
            user
        },
        error: userError
    } =
        await client.auth.getUser();


    if (userError || !user) {

        zeigeFehler(
            "Du bist nicht eingeloggt. Bitte melde dich zuerst an."
        );

        return;
    }


    // Prüfen, ob bereits eine offene Bewerbung existiert
    const {
        data: bestehendeBewerbungen,
        error: pruefError
    } =
        await client
            .from("applications")
            .select("id, status")
            .eq("user_id", user.id)
            .eq("status", "offen")
            .limit(1);


    if (pruefError) {

        console.error(
            "Fehler beim Prüfen der Bewerbung:",
            pruefError
        );

        zeigeFehler(
            "Die Bewerbung konnte nicht geprüft werden. Bitte versuche es später erneut."
        );

        return;
    }


    if (
        bestehendeBewerbungen &&
        bestehendeBewerbungen.length > 0
    ) {

        zeigeFehler(
            "Du hast bereits eine offene Bewerbung."
        );

        return;
    }


    // Bewerbungsdaten sammeln
    const bewerbung =
        sammleBewerbungsdaten();


    // User-ID ergänzen
    bewerbung.user_id =
        user.id;


    // Status setzen
    bewerbung.status =
        "offen";


    // Bewerbung an Supabase senden
    const {
        error: insertError
    } =
        await client
            .from("applications")
            .insert([
                bewerbung
            ]);


    if (insertError) {

        console.error(
            "Fehler beim Absenden der Bewerbung:",
            insertError
        );

        zeigeFehler(
            "Die Bewerbung konnte nicht abgesendet werden. Bitte versuche es erneut."
        );

        return;
    }


    // Erfolgreich
    window.location.href = "bewerbung_erfolgreich.html";

}


// ============================================================
// ERFOLGSMELDUNG ANZEIGEN
// ============================================================

function zeigeBewerbungErfolg() {

    const formular =
        document.getElementById(
            "bewerbungsFormular"
        );


    const erfolg =
        document.getElementById(
            "erfolg"
        );


    if (formular) {

        formular.style.display =
            "none";

    }


    if (erfolg) {

        erfolg.style.display =
            "block";


        erfolg.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }

}

// ============================================================
// SCHRITT WECHSELN
// ============================================================

function zeigeSchritt(neuerSchritt) {

    if (
        neuerSchritt < 1 ||
        neuerSchritt > 5
    ) {
        return;
    }


    aktuellerSchritt =
        neuerSchritt;


    const schritte =
        document.querySelectorAll(
            ".schritt"
        );


    schritte.forEach(
        function (element, index) {

            if (index + 1 === aktuellerSchritt) {

                element.style.display =
                    "block";

            } else {

                element.style.display =
                    "none";

            }

        }
    );


    // Fortschrittsanzeige
    const fortschritt =
        document.getElementById(
            "fortschrittInhalt"
        );


    const fortschrittSchritt =
        document.getElementById(
            "fortschrittSchritt"
        );


    if (fortschritt) {

        fortschritt.style.width =
            `${aktuellerSchritt * 20}%`;

    }


    if (fortschrittSchritt) {

        fortschrittSchritt.textContent =
            `Schritt ${aktuellerSchritt} von 5`;

    }


    // Auf Schritt 5 die Zusammenfassung aktualisieren
    if (
        aktuellerSchritt === 5
    ) {

        aktualisiereZusammenfassung();

    }


    versteckeFehler();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ============================================================
// WEITER
// ============================================================

function weiter() {

    if (
        !validiereSchritt(
            aktuellerSchritt
        )
    ) {
        return;
    }


    if (
        aktuellerSchritt < 5
    ) {

        zeigeSchritt(
            aktuellerSchritt + 1
        );

    }

}


// ============================================================
// ZURÜCK
// ============================================================

function zurueck() {

    if (
        aktuellerSchritt > 1
    ) {

        zeigeSchritt(
            aktuellerSchritt - 1
        );

    }

}


// ============================================================
// AUTHENTIFIZIERUNG PRÜFEN
// ============================================================

async function pruefeAnmeldung() {

    const client =
        window.supabaseClient;


    if (!client) {

        zeigeFehler(
            "Die Verbindung zum Ehrenmarkt-System konnte nicht hergestellt werden."
        );

        return false;
    }


    const {
        data: {
            user
        }
    } =
        await client.auth.getUser();


    if (!user) {

        zeigeFehler(
            "Bitte melde dich zuerst im Ehrenmarkt an."
        );

        return false;
    }


    return true;

}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        // Ersten Schritt anzeigen
        zeigeSchritt(1);


        // Anmeldung prüfen
        await pruefeAnmeldung();


        // Bei Änderungen Zusammenfassung vorbereiten
        const eingaben =
            document.querySelectorAll(
                "input, select, textarea"
            );


        eingaben.forEach(
            function (element) {

                element.addEventListener(
                    "change",
                    function () {

                        aktualisiereZusammenfassung();

                    }
                );


                element.addEventListener(
                    "input",
                    function () {

                        aktualisiereZusammenfassung();

                    }
                );

            }
        );

    }
);
