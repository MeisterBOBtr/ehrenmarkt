// Ehrenmarkt – Discord-Benachrichtigungen
// Diese Datei übermittelt dynamische Auftragsdaten an Supabase.
// Es werden keine festen Kundennamen, Beträge oder Status verwendet.

(function () {
    "use strict";

    const FUNCTION_NAME = "discord-benachrichtigungen";
    const MAX_RETRIES = 2;
    const TIMEOUT = 15000;

    function getSupabaseClient() {
        if (!window.supabaseClient) {
            console.error(
                "Ehrenmarkt: Supabase-Verbindung fehlt. " +
                "Bitte zuerst supabase.js laden."
            );

            return null;
        }

        return window.supabaseClient;
    }

    function timeoutPromise(ms) {
        return new Promise(function (_, reject) {
            setTimeout(function () {
                reject(new Error("Zeitüberschreitung nach " + ms + " ms"));
            }, ms);
        });
    }

    /**
     * Sendet eine dynamische Benachrichtigung an Discord.
     *
     * Beispiel:
     *
     * window.EhrenmarktDiscord.sendeBenachrichtigung(
     *     "auftrag_erstellt",
     *     {
     *         auftragstyp: "Redstoneauftrag",
     *         kunde: "Name aus dem Auftrag",
     *         betrag: 150000,
     *         auftragsnummer: "EH-2026-001",
     *         status: "Offen"
     *     }
     * );
     */
    async function sendeBenachrichtigung(aktion, daten, optionen) {
        const supabase = getSupabaseClient();

        if (!supabase) {
            return {
                success: false,
                error: "Supabase-Verbindung fehlt."
            };
        }

        daten = daten || {};
        optionen = optionen || {};

        const payload = {
            aktion: aktion || "unbekannte_aktion",

            daten: {
                auftragstyp: daten.auftragstyp || null,
                kunde: daten.kunde || null,
                betrag: daten.betrag ?? null,
                auftragsnummer: daten.auftragsnummer || null,
                status: daten.status || null,

                // Weitere optionale Informationen
                titel: daten.titel || null,
                beschreibung: daten.beschreibung || null,
                mitarbeiter: daten.mitarbeiter || null,
                ablehnungsgrund: daten.ablehnungsgrund || null,
                kommentar: daten.kommentar || null,
                details: daten.details || null
            },

            erstellt_am: new Date().toISOString(),

            quelle: optionen.quelle || "Ehrenmarkt-Portal",

            benutzer_id:
                optionen.benutzer_id ||
                (
                    supabase.auth &&
                    supabase.auth.getUser
                        ? null
                        : null
                )
        };

        let letzterFehler = null;

        for (
            let versuch = 1;
            versuch <= MAX_RETRIES + 1;
            versuch++
        ) {
            try {
                const aufruf = supabase.functions.invoke(
                    FUNCTION_NAME,
                    {
                        body: payload
                    }
                );

                const ergebnis = await Promise.race([
                    aufruf,
                    timeoutPromise(TIMEOUT)
                ]);

                const data = ergebnis.data;
                const error = ergebnis.error;

                if (error) {
                    throw new Error(
                        error.message || "Unbekannter Supabase-Fehler"
                    );
                }

                console.log(
                    "Ehrenmarkt: Discord-Benachrichtigung erfolgreich gesendet.",
                    payload
                );

                return {
                    success: true,
                    data: data
                };
            } catch (fehler) {
                letzterFehler = fehler;

                console.warn(
                    "Ehrenmarkt: Discord-Versuch " +
                    versuch +
                    " fehlgeschlagen:",
                    fehler
                );

                if (versuch <= MAX_RETRIES) {
                    await new Promise(function (resolve) {
                        setTimeout(resolve, 1000 * versuch);
                    });
                }
            }
        }

        console.error(
            "Ehrenmarkt: Discord-Benachrichtigung endgültig fehlgeschlagen:",
            letzterFehler
        );

        return {
            success: false,
            error:
                letzterFehler && letzterFehler.message
                    ? letzterFehler.message
                    : "Discord-Benachrichtigung konnte nicht gesendet werden."
        };
    }

    window.EhrenmarktDiscord = {
        sendeBenachrichtigung: sendeBenachrichtigung
    };
})();
