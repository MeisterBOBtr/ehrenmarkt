// ============================================================
// EHRENMARKT – BÜNDNIS
// buendnis.js
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Ehrenmarkt Bündnis – JavaScript gestartet.");

    const formular = document.getElementById("buendnisForm");
    const absendenButton = document.getElementById("absendenButton");

    const erfolg = document.getElementById("erfolg");
    const fehler = document.getElementById("fehler");

    // --------------------------------------------------------
    // Prüfen, ob Formular vorhanden ist
    // --------------------------------------------------------

    if (!formular) {
        console.error("Bündnisformular wurde nicht gefunden.");
        return;
    }

    // --------------------------------------------------------
    // Hilfsfunktionen
    // --------------------------------------------------------

    function zeigeFehler(nachricht) {

        if (fehler) {
            fehler.textContent = nachricht;
            fehler.style.display = "block";
        }

        if (erfolg) {
            erfolg.style.display = "none";
        }
    }


    function zeigeErfolg(nachricht) {

        if (erfolg) {
            erfolg.textContent = nachricht;
            erfolg.style.display = "block";
        }

        if (fehler) {
            fehler.style.display = "none";
        }
    }


    function versteckeMeldungen() {

        if (fehler) {
            fehler.style.display = "none";
        }

        if (erfolg) {
            erfolg.style.display = "none";
        }
    }


    // --------------------------------------------------------
    // Aktuelle Anmeldung prüfen
    // --------------------------------------------------------

    let session = null;

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        session = data?.session || null;

    } catch (error) {

        console.error(
            "Fehler beim Prüfen der Anmeldung:",
            error
        );

        zeigeFehler(
            "Die Anmeldung konnte nicht überprüft werden."
        );

        return;
    }


    // --------------------------------------------------------
    // Benutzer muss angemeldet sein
    // --------------------------------------------------------

    if (!session?.user) {

        zeigeFehler(
            "Du musst angemeldet sein, um einen Bündnisantrag zu stellen."
        );

        if (absendenButton) {
            absendenButton.disabled = true;
        }

        return;
    }


    const user = session.user;

    console.log(
        "Ehrenmarkt Bündnis – Benutzer:",
        user.id
    );


    // --------------------------------------------------------
    // FORMULAR ABSENDEN
    // --------------------------------------------------------

    formular.addEventListener("submit", async (event) => {

        event.preventDefault();

        versteckeMeldungen();

        // ----------------------------------------------------
        // Button deaktivieren
        // ----------------------------------------------------

        if (absendenButton) {

            absendenButton.disabled = true;
            absendenButton.textContent =
                "⏳ Antrag wird gesendet...";
        }


        try {

            // ------------------------------------------------
            // Werte aus Formular lesen
            // ------------------------------------------------

            const clanName =
                document.getElementById("clanName")?.value.trim() || "";

            const clanTag =
                document.getElementById("clanTag")?.value.trim() || "";

            const clanDescription =
                document.getElementById("clanDescription")?.value.trim() || "";

            const clanMemberCountValue =
                document.getElementById("clanMemberCount")?.value.trim() || "";

            const clanSince =
                document.getElementById("clanSince")?.value || "";

            const clanDiscord =
                document.getElementById("clanDiscord")?.value.trim() || "";

            const contactName =
                document.getElementById("contactName")?.value.trim() || "";

            const minecraftName =
                document.getElementById("minecraftName")?.value.trim() || "";

            const discordName =
                document.getElementById("discordName")?.value.trim() || "";

            const clanRole =
                document.getElementById("clanRole")?.value.trim() || "";

            const reason =
                document.getElementById("reason")?.value.trim() || "";

            const cooperation =
                document.getElementById("cooperation")?.value.trim() || "";

            const desiredAgreement =
                document.getElementById("desiredAgreement")?.value.trim() || "";

            const applicationText =
                document.getElementById("applicationText")?.value.trim() || "";

            const bestaetigung =
                document.getElementById("bestaetigung")?.checked || false;


            // ------------------------------------------------
            // Pflichtfelder prüfen
            // ------------------------------------------------

            if (!clanName) {
                throw new Error(
                    "Bitte gib den Namen deines Clans ein."
                );
            }


            if (!clanDescription) {
                throw new Error(
                    "Bitte beschreibe deinen Clan."
                );
            }


            if (!contactName) {
                throw new Error(
                    "Bitte gib einen Ansprechpartner an."
                );
            }


            if (!minecraftName) {
                throw new Error(
                    "Bitte gib deinen Minecraft-Namen an."
                );
            }


            if (!reason) {
                throw new Error(
                    "Bitte gib an, warum du ein Bündnis mit Ehrenmarkt möchtest."
                );
            }


            if (!bestaetigung) {
                throw new Error(
                    "Bitte bestätige die Angaben vor dem Absenden."
                );
            }


            // ------------------------------------------------
            // Mitgliederzahl
            // ------------------------------------------------

            let clanMemberCount = null;

            if (clanMemberCountValue !== "") {

                clanMemberCount =
                    Number(clanMemberCountValue);

                if (
                    !Number.isInteger(clanMemberCount) ||
                    clanMemberCount < 0
                ) {

                    throw new Error(
                        "Die Mitgliederzahl muss eine gültige Zahl sein."
                    );
                }
            }


            // ------------------------------------------------
            // Daten für Supabase
            // ------------------------------------------------

            const neuerAntrag = {

                user_id: user.id,

                clan_name: clanName,

                clan_tag:
                    clanTag || null,

                clan_description:
                    clanDescription,

                clan_member_count:
                    clanMemberCount,

                clan_since:
                    clanSince || null,

                clan_discord:
                    clanDiscord || null,

                contact_name:
                    contactName,

                minecraft_name:
                    minecraftName,

                discord_name:
                    discordName || null,

                clan_role:
                    clanRole || null,

                reason:
                    reason,

                cooperation:
                    cooperation || null,

                desired_agreement:
                    desiredAgreement || null,

                application_text:
                    applicationText || null,

                status:
                    "Offen"
            };


            console.log(
                "Bündnisantrag wird gespeichert:",
                neuerAntrag
            );


            // ------------------------------------------------
            // In Supabase speichern
            // ------------------------------------------------

            const {
                data,
                error
            } = await supabaseClient
                .from("buendnisse")
                .insert(neuerAntrag)
                .select()
                .single();


            if (error) {

                console.error(
                    "Supabase Fehler beim Bündnisantrag:",
                    error
                );

                throw new Error(
                    "Der Bündnisantrag konnte nicht gespeichert werden.\n\n" +
                    error.message
                );
            }


            // ------------------------------------------------
            // Erfolgreich
            // ------------------------------------------------

            console.log(
                "Bündnisantrag erfolgreich gespeichert:",
                data
            );


            zeigeErfolg(
                "Dein Bündnisantrag wurde erfolgreich eingereicht."
            );


            // ------------------------------------------------
            // Formular zurücksetzen
            // ------------------------------------------------

            formular.reset();


            // ------------------------------------------------
            // Erfolgsseite öffnen
            // ------------------------------------------------

            setTimeout(() => {

                window.location.href =
                    "../HTML/buendnis_erfolgreich.html";

            }, 1200);


        } catch (error) {

            console.error(
                "Fehler beim Absenden des Bündnisantrags:",
                error
            );


            zeigeFehler(
                error.message ||
                "Der Bündnisantrag konnte nicht gesendet werden."
            );


            // Button wieder aktivieren

            if (absendenButton) {

                absendenButton.disabled = false;

                absendenButton.textContent =
                    "🤝 Bündnisantrag stellen";
            }
        }

    });


    console.log(
        "Ehrenmarkt Bündnis – Formular bereit."
    );

});
