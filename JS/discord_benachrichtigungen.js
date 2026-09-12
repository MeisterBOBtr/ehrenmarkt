// Ehrenmarkt – Discord-Benachrichtigungen

(function () {
    "use strict";

    window.EhrenmarktDiscord = {
        async sendeBenachrichtigung(typ, daten = {}) {
            try {
                if (!window.supabaseClient) {
                    console.error("Supabase-Verbindung fehlt.");
                    return {
                        success: false,
                        error: "Supabase-Verbindung fehlt."
                    };
                }

                const { data, error } =
                    await window.supabaseClient.functions.invoke(
                        "discord-benachrichtigungen",
                        {
                            body: {
                                typ: typ,
                                daten: daten,
                                erstellt_am: new Date().toISOString()
                            }
                        }
                    );

                if (error) {
                    console.error(
                        "Discord-Benachrichtigung fehlgeschlagen:",
                        error
                    );

                    return {
                        success: false,
                        error: error.message
                    };
                }

                console.log(
                    "Discord-Benachrichtigung erfolgreich gesendet:",
                    data
                );

                return {
                    success: true,
                    data: data
                };
            } catch (fehler) {
                console.error(
                    "Fehler bei der Discord-Benachrichtigung:",
                    fehler
                );

                return {
                    success: false,
                    error: fehler.message
                };
            }
        }
    };
})();
