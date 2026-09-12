// Ehrenmarkt – Discord-Benachrichtigungen
// Übermittelt dynamische Daten aus jedem Auftrag an Supabase.
// Keine festen Kundennamen, Beträge oder Statuswerte.

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
                reject(
                    new Error(
                        "Zeitüberschreitung nach " + ms + " Millisekunden."
                    )
                );
            }, ms);
        });
    }

    async function getAktuellerBenutzerId(supabase) {
        try {
            if (
                !supabase.auth ||
                typeof supabase.auth.getUser !== "function"
            ) {
                return null;
            }

            const { data, error } = await supabase.auth.getUser();

            if (error || !data || !data.user) {
                return null;
            }

            return data.user.id || null;
        } catch (fehler) {
            console.warn(
                "Ehrenmarkt: Benutzer-ID konnte nicht ermittelt werden.",
                fehler
            );

            return null;
        }
    }

    /**
     * Sendet eine Discord-Benachrichtigung.
     *
     * Beispiel:
     *
     * await window.EhrenmarktDiscord.sendeBenachrichtigung(
     *     "auftrag_erstellt",
     *     {
     *         auftragstyp: "Redstoneauftrag",
     *         kunde: "Echter Kundenname",
     *         betrag: 150000,
     *         auftragsnummer: "EH-2026-001",
     *         status: "Offen",
     *         titel: "Redstone-Bauwerk",
     *         beschreibung: "Beschreibung des Auftrags",
     *         mitarbeiter: "Mitarbeitername",
     *         kommentar: "Zusätzliche Informationen",
     *         ablehnungsgrund: null,
     *         details: {
     *             weitere_information: "Wert"
     *         }
     *     }
     * );
     */

    async function sendeBenachrichtigung(
        aktion,
        daten,
        optionen
    ) {
        const supabase = getSupabaseClient();

        if (!supabase) {
            return {
                success: false,
                error: "Supabase-Verbindung fehlt."
            };
        }

        daten = daten || {};
        optionen = optionen || {};

        const benutzerId =
            optionen.benutzer_id ||
            await getAktuellerBenutzerId(supabase);

        const payload = {
            aktion: aktion || "unbekannte_aktion",

            daten: {
                // Grunddaten des jeweiligen Auftrags
                auftragstyp: daten.auftragstyp ?? null,
                kunde: daten.kunde ?? null,
                betrag: daten.betrag ?? null,
                auftragsnummer: daten.auftragsnummer ?? null,
                status: daten.status ?? null,

                // Weitere dynamische Auftragsdaten
                titel: daten.titel ?? null,
                beschreibung: daten.beschreibung ?? null,
                mitarbeiter: daten.mitarbeiter ?? null,
                ablehnungsgrund: daten.ablehnungsgrund ?? null,
                kommentar: daten.kommentar ?? null,
                details: daten.details ?? null
            },

            erstellt_am: new Date().toISOString(),

            quelle:
                optionen.quelle ||
                "Ehrenmarkt-Portal",

            benutzer_id: benutzerId
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

                if (ergebnis.error) {
                    throw new Error(
                        ergebnis.error.message ||
                        "Unbekannter Supabase-Fehler."
                    );
                }

                console.log(
                    "Ehrenmarkt: Discord-Benachrichtigung erfolgreich gesendet.",
                    payload
                );

                return {
                    success: true,
                    data: ergebnis.data
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
                letzterFehler &&
                letzterFehler.message
                    ? letzterFehler.message
                    : "Discord-Benachrichtigung konnte nicht gesendet werden."
        };
    }

    window.EhrenmarktDiscord = {
        sendeBenachrichtigung:
            sendeBenachrichtigung
    };
})();
