// ============================================
// EHRENMARKT – BÜNDNIS
// buendnis.js – Teil 1 von 4
// ============================================

document.addEventListener("DOMContentLoaded", async () => {

    // --------------------------------------------
    // Supabase
    // --------------------------------------------

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase wurde nicht gefunden.");
        zeigeFehler("Die Verbindung zum System konnte nicht hergestellt werden.");
        return;
    }

    // --------------------------------------------
    // Elemente
    // --------------------------------------------

    const formular = document.getElementById("buendnisForm");

    if (!formular) {
        console.error("Das Bündnisformular wurde nicht gefunden.");
        return;
    }

    const erfolgMeldung = document.getElementById("erfolgMeldung");
    const fehlerMeldung = document.getElementById("fehlerMeldung");

    // --------------------------------------------
    // Hilfsfunktionen
    // --------------------------------------------

    window.zeigeFehler = function (nachricht) {
        if (fehlerMeldung) {
            fehlerMeldung.textContent = nachricht;
            fehlerMeldung.style.display = "block";
        }

        if (erfolgMeldung) {
            erfolgMeldung.style.display = "none";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    window.zeigeErfolg = function (nachricht) {
        if (erfolgMeldung) {
            erfolgMeldung.textContent = nachricht;
            erfolgMeldung.style.display = "block";
        }

        if (fehlerMeldung) {
            fehlerMeldung.style.display = "none";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    function versteckeMeldungen() {
        if (erfolgMeldung) {
            erfolgMeldung.style.display = "none";
        }

        if (fehlerMeldung) {
            fehlerMeldung.style.display = "none";
        }
    }

    // --------------------------------------------
    // Aktuelle Anmeldung prüfen
    // --------------------------------------------

    let user = null;

    try {
        const {
            data: { session },
            error
        } = await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        if (!session || !session.user) {
            zeigeFehler(
                "Du musst angemeldet sein, um einen Bündnisantrag zu stellen."
            );

            formular.querySelectorAll("input, textarea, select, button")
                .forEach(element => {
                    element.disabled = true;
                });

            return;
        }

        user = session.user;

    } catch (error) {
        console.error("Fehler beim Prüfen der Anmeldung:", error);

        zeigeFehler(
            "Die Anmeldung konnte nicht überprüft werden."
        );

        return;
    }

    // --------------------------------------------
    // Bereits vorhandene Anträge laden
    // --------------------------------------------

    try {
        const { data, error } = await supabase
            .from("buendnisse")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        console.log(
            "Eigene Bündnisanträge:",
            data || []
        );

    } catch (error) {
        console.error(
            "Fehler beim Laden der Bündnisanträge:",
            error
        );
    }

    // --------------------------------------------
    // Formular vorbereiten
    // --------------------------------------------

    versteckeMeldungen();

    console.log(
        "Bündnisbereich erfolgreich geladen.",
        user.id
    );

});

// ============================================
// BÜNDNIS – TEIL 2 VON 4
// Formularwerte auslesen und prüfen
// ============================================

    function wert(id) {
        const element = document.getElementById(id);

        if (!element) {
            return "";
        }

        return element.value.trim();
    }

    function zahlWert(id) {
        const element = document.getElementById(id);

        if (!element || element.value === "") {
            return null;
        }

        const zahl = parseInt(element.value, 10);

        return Number.isNaN(zahl) ? null : zahl;
    }

    function datumWert(id) {
        const element = document.getElementById(id);

        if (!element || !element.value) {
            return null;
        }

        return element.value;
    }

    function checkboxAktiv(id) {
        const element = document.getElementById(id);

        return element ? element.checked : false;
    }

    // --------------------------------------------
    // Formular überprüfen
    // --------------------------------------------

    function pruefeFormular() {

        const clanName = wert("clanName");
        const clanBeschreibung = wert("clanDescription");

        const kontaktName = wert("contactName");
        const minecraftName = wert("minecraftName");

        const grund = wert("reason");

        if (!clanName) {
            zeigeFehler("Bitte gib den Namen deines Clans an.");
            return false;
        }

        if (!clanBeschreibung) {
            zeigeFehler(
                "Bitte beschreibe deinen Clan kurz."
            );
            return false;
        }

        if (!kontaktName) {
            zeigeFehler(
                "Bitte gib einen Ansprechpartner an."
            );
            return false;
        }

        if (!minecraftName) {
            zeigeFehler(
                "Bitte gib deinen Minecraft-Namen an."
            );
            return false;
        }

        if (!grund) {
            zeigeFehler(
                "Bitte erkläre, warum dein Clan ein Bündnis mit Ehrenmarkt eingehen möchte."
            );
            return false;
        }

        if (!checkboxAktiv("bestaetigung")) {
            zeigeFehler(
                "Bitte bestätige die Angaben, bevor du den Bündnisantrag absendest."
            );
            return false;
        }

        return true;
    }

    // --------------------------------------------
    // Daten für Supabase vorbereiten
    // --------------------------------------------

    function erstelleAntragsDaten() {

        return {
            user_id: user.id,

            clan_name: wert("clanName"),
            clan_tag: wert("clanTag") || null,
            clan_description: wert("clanDescription"),
            clan_member_count: zahlWert("clanMemberCount"),
            clan_since: datumWert("clanSince"),
            clan_discord: wert("clanDiscord") || null,

            contact_name: wert("contactName"),
            minecraft_name: wert("minecraftName"),
            discord_name: wert("discordName") || null,
            clan_role: wert("clanRole") || null,

            reason: wert("reason"),
            cooperation: wert("cooperation") || null,
            desired_agreement: wert("desiredAgreement") || null,
            application_text: wert("applicationText") || null,

            status: "Offen"
        };
    }

    // --------------------------------------------
    // Eingaben automatisch bereinigen
    // --------------------------------------------

    const clanMemberCount =
        document.getElementById("clanMemberCount");

    if (clanMemberCount) {
        clanMemberCount.addEventListener("input", () => {

            if (clanMemberCount.value < 0) {
                clanMemberCount.value = 0;
            }

            if (clanMemberCount.value.includes(".")) {
                clanMemberCount.value =
                    clanMemberCount.value.split(".")[0];
            }

        });
    }

    // --------------------------------------------
    // Absenden vorbereiten
    // --------------------------------------------

    formular.addEventListener("submit", async (event) => {

        event.preventDefault();

        versteckeMeldungen();

        if (!pruefeFormular()) {
            return;
        }

        const antragsDaten = erstelleAntragsDaten();

        console.log(
            "Vorbereitete Bündnisdaten:",
            antragsDaten
        );

        // Speicherung erfolgt in Teil 3.
    });

// ============================================
// BÜNDNIS – TEIL 3 VON 4
// Antrag in Supabase speichern
// ============================================

    async function sendeBündnisantrag() {

        const antragsDaten = erstelleAntragsDaten();

        try {

            const { data, error } = await supabase
                .from("buendnisse")
                .insert(antragsDaten)
                .select("*")
                .single();

            if (error) {
                throw error;
            }

            console.log(
                "Bündnisantrag erfolgreich gespeichert:",
                data
            );

            zeigeErfolg(
                "Dein Bündnisantrag wurde erfolgreich eingereicht."
            );

            // Formular zurücksetzen
            formular.reset();

            // Nach erfolgreicher Absendung
            // Buttons wieder normal aktivieren
            const absendenButton =
                formular.querySelector('button[type="submit"]');

            if (absendenButton) {
                absendenButton.disabled = false;
                absendenButton.textContent =
                    "🤝 Bündnisantrag stellen";
            }

            // Nach kurzer Zeit zur Erfolgsseite
            setTimeout(() => {

                window.location.href =
                    "../HTML/buendnis_erfolgreich.html";

            }, 1200);

        } catch (error) {

            console.error(
                "Fehler beim Speichern des Bündnisantrags:",
                error
            );

            zeigeFehler(
                "Der Bündnisantrag konnte nicht gespeichert werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );

            const absendenButton =
                formular.querySelector('button[type="submit"]');

            if (absendenButton) {
                absendenButton.disabled = false;
                absendenButton.textContent =
                    "🤝 Bündnisantrag stellen";
            }
        }
    }

    // --------------------------------------------
    // Absendevorgang aus Teil 2 erweitern
    // --------------------------------------------

    formular.addEventListener("submit", async (event) => {

        event.preventDefault();

        versteckeMeldungen();

        if (!pruefeFormular()) {
            return;
        }

        const absendenButton =
            formular.querySelector('button[type="submit"]');

        if (absendenButton) {
            absendenButton.disabled = true;
            absendenButton.textContent =
                "⏳ Antrag wird gesendet...";
        }

        await sendeBündnisantrag();
    });

// ============================================
// BÜNDNIS – TEIL 4 VON 4
// Abschluss, Navigation und Fehlerbehandlung
// ============================================

    // --------------------------------------------
    // Zurück-Button
    // --------------------------------------------

    const zurueckButton =
        document.getElementById("zurueckButton");

    if (zurueckButton) {

        zurueckButton.addEventListener("click", () => {

            window.location.href =
                "../HTML/kundenbereich.html";

        });

    }

    // --------------------------------------------
    // Erfolgsseite absichern
    // --------------------------------------------

    window.zeigeBündnisErfolg = function () {

        zeigeErfolg(
            "Der Bündnisantrag wurde erfolgreich eingereicht."
        );

    };

    // --------------------------------------------
    // Auth-Status überwachen
    // --------------------------------------------

    supabase.auth.onAuthStateChange((event, session) => {

        if (event === "SIGNED_OUT") {

            console.log(
                "Benutzer wurde abgemeldet."
            );

            window.location.href =
                "../HTML/registrieren.html";

        }

    });

    // --------------------------------------------
    // Abschlussmeldung
    // --------------------------------------------

    console.log(
        "===================================="
    );

    console.log(
        "EHRENMARKT – Bündnisbereich aktiv"
    );

    console.log(
        "Angemeldeter Benutzer:",
        user?.id
    );

    console.log(
        "===================================="
    );

});
