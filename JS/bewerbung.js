// ============================================================
// EHRENMARKT
// BEWERBUNGSSYSTEM
// ============================================================

let aktuellerSchritt = 1;
const gesamtSchritte = 5;

let supabaseClient = null;
let aktuellerUser = null;


// ============================================================
// FEHLERMELDUNG
// ============================================================

function zeigeFehler(text) {

    const fehlerBox =
        document.getElementById("fehler");

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

    const fehlerBox =
        document.getElementById("fehler");

    if (!fehlerBox) {
        return;
    }

    fehlerBox.textContent = "";
    fehlerBox.style.display = "none";
}


// ============================================================
// SCHRITT ANZEIGEN
// ============================================================

function zeigeSchritt(nummer) {

    if (nummer < 1 || nummer > gesamtSchritte) {
        return;
    }

    aktuellerSchritt = nummer;

    const schritte =
        document.querySelectorAll(".schritt");

    schritte.forEach(function(element, index) {

        if (index + 1 === aktuellerSchritt) {

            element.classList.add("aktiv");
            element.style.display = "block";

        } else {

            element.classList.remove("aktiv");
            element.style.display = "none";

        }

    });


    // Fortschrittsbalken
    const fortschritt =
        document.getElementById("fortschrittInhalt");

    if (fortschritt) {

        fortschritt.style.width =
            (aktuellerSchritt / gesamtSchritte * 100) + "%";

    }


    // Fortschrittstext
    const fortschrittText =
        document.getElementById("fortschrittSchritt");

    if (fortschrittText) {

        fortschrittText.textContent =
            "Schritt " +
            aktuellerSchritt +
            " von " +
            gesamtSchritte;

    }


    // Zusammenfassung in Schritt 5
    if (aktuellerSchritt === 5) {
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

    if (!validiereSchritt(aktuellerSchritt)) {
        return;
    }

    if (aktuellerSchritt < gesamtSchritte) {

        zeigeSchritt(
            aktuellerSchritt + 1
        );

    }
}


// ============================================================
// ZURÜCK
// ============================================================

function zurueck() {

    if (aktuellerSchritt > 1) {

        zeigeSchritt(
            aktuellerSchritt - 1
        );

    }
}


// ============================================================
// RADIO-WERT AUSLESEN
// ============================================================

function getRadioWert(name) {

    const radio =
        document.querySelector(
            'input[name="' + name + '"]:checked'
        );

    return radio
        ? radio.value
        : "";
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


    checkboxIds.forEach(function(id) {

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

    });


    return fachbereiche;
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


    if (fachbereiche.length === 0) {

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
        getRadioWert("experience");


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
        getRadioWert("desiredRole");

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


    if (motivation.length < 20) {

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
        getRadioWert("desiredRole");

    const erfahrung =
        getRadioWert("experience");

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

        supabaseClient =
            window.supabaseClient;

    }


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
        getRadioWert("experience");


    const previousWork =
        document
            .getElementById("previousWork")
            ?.value
            .trim() || "";


    const desiredRole =
        getRadioWert("desiredRole");


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

        name: name,

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
// BEWERBUNG ABSENDEN
// ============================================================

async function bewerbungAbsenden() {

    versteckeFehler();


    // Letzten Schritt prüfen
    if (!validiereSchritt5()) {
        return;
    }


    // Supabase Client holen
    const client =
        window.supabaseClient;


    if (!client) {

        zeigeFehler(
            "Die Verbindung zum Ehrenmarkt-System konnte nicht hergestellt werden."
        );

        return;
    }


    // Eingeloggten Benutzer holen
    let user;

    try {

        const {
            data,
            error
        } =
            await client
                .auth
                .getUser();


        if (error) {
            throw error;
        }


        user = data?.user;

    } catch (error) {

        console.error(
            "Fehler beim Abrufen des Benutzers:",
            error
        );

        zeigeFehler(
            "Deine Anmeldung konnte nicht überprüft werden."
        );

        return;
    }


    if (!user) {

        zeigeFehler(
            "Du bist nicht eingeloggt. Bitte melde dich zuerst an."
        );

        return;
    }


    aktuellerUser =
        user;


    // Prüfen, ob bereits eine offene Bewerbung existiert
    try {

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
            throw pruefError;
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


        bewerbung.user_id =
            user.id;


        bewerbung.status =
            "offen";


        // Bewerbung speichern
        const {
            error: insertError
        } =
            await client
                .from("applications")
                .insert([
                    bewerbung
                ]);


        if (insertError) {
            throw insertError;
        }


        console.log(
            "Ehrenmarkt Bewerbung erfolgreich gespeichert."
        );


        // Erfolg anzeigen
        zeigeBewerbungErfolg();


    } catch (error) {

        console.error(
            "Fehler beim Absenden der Bewerbung:",
            error
        );


        zeigeFehler(
            "Die Bewerbung konnte nicht abgesendet werden. Bitte versuche es erneut."
        );

    }
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

        erfolg.classList.add(
            "aktiv"
        );


        erfolg.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }


    const fortschritt =
        document.getElementById(
            "fortschrittInhalt"
        );


    if (fortschritt) {

        fortschritt.style.width =
            "100%";

    }


    const fortschrittSchritt =
        document.getElementById(
            "fortschrittSchritt"
        );


    if (fortschrittSchritt) {

        fortschrittSchritt.textContent =
            "Bewerbung eingereicht";

    }
}

// ============================================================
// SCHRITT WECHSELN
// ============================================================

function zeigeSchritt(neuerSchritt) {

    if (
        neuerSchritt < 1 ||
        neuerSchritt > gesamtSchritte
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
        function(element, index) {

            if (
                index + 1 === aktuellerSchritt
            ) {

                element.classList.add(
                    "aktiv"
                );

                element.style.display =
                    "block";

            } else {

                element.classList.remove(
                    "aktiv"
                );

                element.style.display =
                    "none";

            }

        }
    );


    // Fortschrittsbalken
    const fortschritt =
        document.getElementById(
            "fortschrittInhalt"
        );


    if (fortschritt) {

        fortschritt.style.width =
            `${aktuellerSchritt * 20}%`;

    }


    // Fortschrittstext
    const fortschrittSchritt =
        document.getElementById(
            "fortschrittSchritt"
        );


    if (fortschrittSchritt) {

        fortschrittSchritt.textContent =
            `Schritt ${aktuellerSchritt} von ${gesamtSchritte}`;

    }


    // Bei Schritt 5 Zusammenfassung aktualisieren
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
        aktuellerSchritt < gesamtSchritte
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


    try {

        const {
            data,
            error
        } =
            await client
                .auth
                .getUser();


        if (error) {
            throw error;
        }


        const user =
            data?.user;


        if (!user) {

            zeigeFehler(
                "Bitte melde dich zuerst im Ehrenmarkt an."
            );

            return false;
        }


        aktuellerUser =
            user;


        supabaseClient =
            client;


        return true;

    } catch (error) {

        console.error(
            "Fehler bei der Anmeldung:",
            error
        );


        zeigeFehler(
            "Deine Anmeldung konnte nicht überprüft werden."
        );

        return false;
    }

}


// ============================================================
// AUTH LISTENER
// ============================================================

function registriereAuthListener() {

    const client =
        window.supabaseClient;


    if (!client) {
        return;
    }


    client.auth.onAuthStateChange(
        function(event, session) {

            if (session?.user) {

                aktuellerUser =
                    session.user;

            }


            if (
                event === "SIGNED_OUT"
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
    async function() {

        // Supabase Client übernehmen
        supabaseClient =
            window.supabaseClient;


        // ERSTEN SCHRITT SOFORT ANZEIGEN
        // Dadurch bleibt die Bewerbung sichtbar,
        // auch wenn Supabase noch geprüft wird.
        zeigeSchritt(1);


        // Anmeldung prüfen
        await pruefeAnmeldung();


        // Auth-Listener starten
        registriereAuthListener();


        // Zusammenfassung bei Änderungen aktualisieren
        const eingaben =
            document.querySelectorAll(
                "input, select, textarea"
            );


        eingaben.forEach(
            function(element) {

                element.addEventListener(
                    "change",
                    function() {

                        aktualisiereZusammenfassung();

                    }
                );


                element.addEventListener(
                    "input",
                    function() {

                        aktualisiereZusammenfassung();

                    }
                );

            }
        );

    }
);


// ============================================================
// ENDE BEWERBUNGSSYSTEM
// ============================================================
