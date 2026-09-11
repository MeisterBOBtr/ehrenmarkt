// ============================================================
// EHRENMARKT – BÜNDNIS
// buendnis.js
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Ehrenmarkt Bündnis – JavaScript gestartet.");

    // ========================================================
    // ELEMENTE AUS DER HTML
    // ========================================================

    const absendenButton =
        document.getElementById("submitButton");

    const erfolg =
        document.getElementById("successMessage");

    const fehler =
        document.getElementById("errorMessage");


    // ========================================================
    // SUPABASE PRÜFEN
    // ========================================================

    if (!window.supabaseClient) {

        console.error(
            "Supabase Client wurde nicht gefunden."
        );

        zeigeFehler(
            "Die Verbindung zu Ehrenmarkt konnte nicht hergestellt werden."
        );

        return;
    }


    const supabaseClient =
        window.supabaseClient;


    // ========================================================
    // ANGEMELDETEN BENUTZER PRÜFEN
    // ========================================================

    let user = null;

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getUser();


        if (error) {
            throw error;
        }


        user = data?.user || null;


    } catch (error) {

        console.error(
            "Fehler beim Laden des Benutzers:",
            error
        );

        zeigeFehler(
            "Deine Anmeldung konnte nicht überprüft werden."
        );

        return;
    }


    // ========================================================
    // NICHT ANGEMELDET
    // ========================================================

    if (!user) {

        zeigeFehler(
            "Du musst angemeldet sein, um einen Bündnisantrag zu stellen."
        );


        if (absendenButton) {

            absendenButton.disabled = true;

        }

        return;
    }


    console.log(
        "Ehrenmarkt Bündnis – Benutzer:",
        user.id
    );


    // ========================================================
    // BUTTON PRÜFEN
    // ========================================================

    if (!absendenButton) {

        console.error(
            "Der Button #submitButton wurde nicht gefunden."
        );

        return;
    }


    // ========================================================
    // ABSENDEN
    // ========================================================

    absendenButton.addEventListener(
        "click",
        async () => {

            versteckeMeldungen();


            // ------------------------------------------------
            // BUTTON DEAKTIVIEREN
            // ------------------------------------------------

            absendenButton.disabled = true;

            absendenButton.textContent =
                "⏳ Antrag wird gesendet...";


            try {

                // ============================================
                // WERTE AUS DER HTML LESEN
                // ============================================

                const clanName =
                    document
                        .getElementById("clanName")
                        ?.value
                        .trim() || "";


                const clanTag =
                    document
                        .getElementById("clanTag")
                        ?.value
                        .trim() || "";


                const clanDescription =
                    document
                        .getElementById("clanDescription")
                        ?.value
                        .trim() || "";


                const clanMemberCountValue =
                    document
                        .getElementById("clanMemberCount")
                        ?.value
                        .trim() || "";


                const clanSince =
                    document
                        .getElementById("clanSince")
                        ?.value || "";


                const clanDiscord =
                    document
                        .getElementById("clanDiscord")
                        ?.value
                        .trim() || "";


                const contactName =
                    document
                        .getElementById("contactName")
                        ?.value
                        .trim() || "";


                const minecraftName =
                    document
                        .getElementById("minecraftName")
                        ?.value
                        .trim() || "";


                const discordName =
                    document
                        .getElementById("discordName")
                        ?.value
                        .trim() || "";


                const clanRole =
                    document
                        .getElementById("clanRole")
                        ?.value
                        .trim() || "";


                const reason =
                    document
                        .getElementById("reason")
                        ?.value
                        .trim() || "";


                const cooperation =
                    document
                        .getElementById("cooperation")
                        ?.value
                        .trim() || "";


                const desiredAgreement =
                    document
                        .getElementById("desiredAgreement")
                        ?.value
                        .trim() || "";


                const applicationText =
                    document
                        .getElementById("applicationText")
                        ?.value
                        .trim() || "";


                const confirmation =
                    document
                        .getElementById("confirmation")
                        ?.checked || false;


                // ============================================
                // PFLICHTFELDER
                // ============================================

                if (!clanName) {

                    throw new Error(
                        "Bitte gib den Namen deines Clans ein."
                    );

                }


                if (!clanDescription) {

                    throw new Error(
                        "Bitte stelle deinen Clan kurz vor."
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


                if (!confirmation) {

                    throw new Error(
                        "Bitte bestätige, dass deine Angaben korrekt sind."
                    );

                }


                // ============================================
                // MITGLIEDERZAHL
                // ============================================

                let clanMemberCount = null;


                if (clanMemberCountValue !== "") {

                    clanMemberCount =
                        Number(clanMemberCountValue);


                    if (
                        !Number.isInteger(clanMemberCount) ||
                        clanMemberCount < 1
                    ) {

                        throw new Error(
                            "Die Mitgliederzahl muss eine gültige Zahl sein."
                        );

                    }

                }


                // ============================================
                // DATEN FÜR SUPABASE
                // ============================================

                const neuerAntrag = {

                    user_id:
                        user.id,


                    clan_name:
                        clanName,


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


                // ============================================
                // IN SUPABASE SPEICHERN
                // ============================================

                const {
                    data,
                    error
                } =
                    await supabaseClient
                        .from("buendnisse")
                        .insert(neuerAntrag)
                        .select()
                        .single();


                // ============================================
                // SUPABASE FEHLER
                // ============================================

                if (error) {

                    console.error(
                        "Supabase Fehler:",
                        error
                    );


                    throw new Error(
                        "Der Bündnisantrag konnte nicht gespeichert werden.\n\n" +
                        error.message
                    );

                }


                // ============================================
                // ERFOLGREICH
                // ============================================

                console.log(
                    "Bündnisantrag erfolgreich gespeichert:",
                    data
                );


                zeigeErfolg(
                    "Dein Bündnisantrag wurde erfolgreich eingereicht."
                );


                // ============================================
                // FORMULAR ZURÜCKSETZEN
                // ============================================

                const felder =
                    document.querySelectorAll(
                        "input, textarea"
                    );


                felder.forEach(
                    (feld) => {

                        if (
                            feld.type === "checkbox"
                        ) {

                            feld.checked = false;

                        } else {

                            feld.value = "";

                        }

                    }
                );


                // ============================================
                // ERFOLGSSEITE
                // ============================================

                setTimeout(
                    () => {

                        window.location.href =
                            "../HTML/buendnis_erfolgreich.html";

                    },
                    1200
                );


            } catch (error) {

                console.error(
                    "Fehler beim Absenden des Bündnisantrags:",
                    error
                );


                zeigeFehler(
                    error?.message ||
                    "Der Bündnisantrag konnte nicht gesendet werden."
                );


                // Button wieder aktivieren

                absendenButton.disabled = false;

                absendenButton.textContent =
                    "🤝 Bündnisantrag stellen";

            }

        }
    );


    console.log(
        "Ehrenmarkt Bündnis – Formular bereit."
    );


    // ========================================================
    // FEHLERMELDUNG
    // ========================================================

    function zeigeFehler(nachricht) {

        if (fehler) {

            fehler.textContent =
                nachricht;

            fehler.style.display =
                "block";

        }


        if (erfolg) {

            erfolg.style.display =
                "none";

        }

    }


    // ========================================================
    // ERFOLGSMELDUNG
    // ========================================================

    function zeigeErfolg(nachricht) {

        if (erfolg) {

            erfolg.textContent =
                nachricht;

            erfolg.style.display =
                "block";

        }


        if (fehler) {

            fehler.style.display =
                "none";

        }

    }


    // ========================================================
    // MELDUNGEN AUSBLENDEN
    // ========================================================

    function versteckeMeldungen() {

        if (fehler) {

            fehler.style.display =
                "none";

        }


        if (erfolg) {

            erfolg.style.display =
                "none";

        }

    }

});
