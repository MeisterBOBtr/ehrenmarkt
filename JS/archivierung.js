(function () {
    "use strict";

    /*
    ============================================================
    EHRENMARKT – AUFTRAGSARCHIVIERUNG
    ============================================================

    Auftragstypen:
    - bau
    - material
    - redstone
    - logistik

    Finanzaufteilung:
    - Bauauftrag: 70 % Mitarbeiter / 30 % Clan
    - Materialauftrag: 70 % Mitarbeiter / 30 % Clan
    - Redstoneauftrag: 70 % Mitarbeiter / 30 % Clan
    - Logistikauftrag: vorhandene worker_share / clan_share-Werte

    Discord-Archiv:
    - Bauauftrag
    - Redstoneauftrag

    Material- und Logistikaufträge werden nur in order_finances
    gespeichert und anschließend aus der aktiven Tabelle gelöscht.
    ============================================================
    */

    const supabase = window.supabaseClient;

    const AUFTRAGSTABELLEN = {
        bau: "build_orders",
        material: "orders",
        redstone: "redstone_orders",
        logistik: "logistics_orders"
    };

    const DISCORD_ARCHIV_FUNCTIONS = {
        bau: "archiviere-bauauftrag",
        redstone: "redstone"
    };


    /*
    ============================================================
    HILFSFUNKTIONEN
    ============================================================
    */

    function pruefeSupabase() {
        if (!supabase) {
            throw new Error(
                "Supabase wurde nicht gefunden. Prüfe, ob window.supabaseClient geladen ist."
            );
        }
    }


    function zahl(wert) {
        if (typeof wert === "number" && Number.isFinite(wert)) {
            return wert;
        }

        if (typeof wert !== "string") {
            return 0;
        }

        let bereinigt = wert
            .replace(/[^\d,.-]/g, "")
            .trim();

        if (!bereinigt) {
            return 0;
        }

        /*
        Deutsche Schreibweise unterstützen:
        12.500,50 -> 12500.50
        */
        if (bereinigt.includes(",") && bereinigt.includes(".")) {
            bereinigt = bereinigt
                .replace(/\./g, "")
                .replace(",", ".");
        } else if (bereinigt.includes(",")) {
            bereinigt = bereinigt.replace(",", ".");
        }

        const nummer = Number(bereinigt);

        return Number.isFinite(nummer) ? nummer : 0;
    }


    function rundeGeldbetrag(wert) {
        return Math.round(zahl(wert) * 100) / 100;
    }


    function ermittleAuftragsnummer(auftrag) {
        if (!auftrag) {
            return "";
        }

        return String(
            auftrag.order_number ??
            auftrag.orderNumber ??
            auftrag.nummer ??
            auftrag.auftragsnummer ??
            auftrag.id ??
            ""
        );
    }


    function ermittleGesamtpreis(auftrag, auftragsart) {
        if (!auftrag) {
            return 0;
        }

        let kandidaten = [];

        if (auftragsart === "bau") {
            kandidaten = [
                auftrag.final_price,
                auftrag.total_price,
                auftrag.provisional_price,
                auftrag.base_price,
                auftrag.gesamtpreis
            ];
        } else {
            kandidaten = [
                auftrag.total_price,
                auftrag.final_price,
                auftrag.provisional_price,
                auftrag.grand_total,
                auftrag.gesamtpreis,
                auftrag.gesamtbetrag
            ];
        }

        for (const kandidat of kandidaten) {
            const preis = rundeGeldbetrag(kandidat);

            if (preis > 0) {
                return preis;
            }
        }

        return 0;
    }


    function ermittleFinanzanteile(auftrag, auftragsart, gesamtpreis) {
        let mitarbeiterAnteil = 0;
        let clanAnteil = 0;

        /*
        Logistik:
        Die bereits gespeicherten Werte werden verwendet.
        */
        if (auftragsart === "logistik") {
            mitarbeiterAnteil = rundeGeldbetrag(
                auftrag.worker_share
            );

            clanAnteil = rundeGeldbetrag(
                auftrag.clan_share
            );
        } else {
            /*
            Bau, Material und Redstone:
            70 % Mitarbeiter
            30 % Clan
            */
            mitarbeiterAnteil = rundeGeldbetrag(
                gesamtpreis * 0.70
            );

            clanAnteil = rundeGeldbetrag(
                gesamtpreis - mitarbeiterAnteil
            );
        }

        return {
            worker_total: mitarbeiterAnteil,
            clan_profit: clanAnteil
        };
    }


    /*
    ============================================================
    FINANZDATEN IN order_finances SPEICHERN
    ============================================================
    */

    async function speichereFinanzdaten(auftrag, auftragsart) {
        pruefeSupabase();

        if (!auftrag) {
            throw new Error(
                "Es wurden keine Auftragsdaten zur Finanzspeicherung übergeben."
            );
        }

        if (!AUFTRAGSTABELLEN[auftragsart]) {
            throw new Error(
                "Unbekannter Auftragstyp: " + auftragsart
            );
        }

        const auftragsnummer = ermittleAuftragsnummer(auftrag);

        if (!auftragsnummer) {
            throw new Error(
                "Der Auftrag besitzt keine gültige Auftragsnummer."
            );
        }

        const gesamtpreis = ermittleGesamtpreis(
            auftrag,
            auftragsart
        );

        if (gesamtpreis <= 0) {
            throw new Error(
                "Für Auftrag #" +
                auftragsnummer +
                " wurde kein gültiger Gesamtpreis gefunden."
            );
        }

        /*
        Doppelte Finanzdatensätze verhindern.
        */
        const { data: bereitsVorhanden, error: suchfehler } =
            await supabase
                .from("order_finances")
                .select("id")
                .eq("order_number", auftragsnummer)
                .eq("order_type", auftragsart)
                .limit(1);

        if (suchfehler) {
            throw suchfehler;
        }

        if (
            Array.isArray(bereitsVorhanden) &&
            bereitsVorhanden.length > 0
        ) {
            return {
                bereitsVorhanden: true,
                gesamtpreis: gesamtpreis
            };
        }

        const anteile = ermittleFinanzanteile(
            auftrag,
            auftragsart,
            gesamtpreis
        );

        const finanzdatensatz = {
            order_number: auftragsnummer,
            completed_at: new Date().toISOString(),
            total_price: gesamtpreis,
            clan_profit: anteile.clan_profit,
            worker_total: anteile.worker_total,
            order_type: auftragsart
        };

        const { error: speicherfehler } = await supabase
            .from("order_finances")
            .insert([finanzdatensatz]);

        if (speicherfehler) {
            throw speicherfehler;
        }

        return {
            bereitsVorhanden: false,
            gesamtpreis: gesamtpreis,
            finanzdatensatz: finanzdatensatz
        };
    }


    /*
    ============================================================
    DISCORD-ARCHIVIERUNG
    ============================================================
    */

    async function archiviereInDiscord(auftrag, auftragsart) {
        pruefeSupabase();

        /*
        Material- und Logistikaufträge werden nicht an Discord
        archiviert.
        */
        if (
            auftragsart !== "bau" &&
            auftragsart !== "redstone"
        ) {
            return {
                archiviert: false,
                uebersprungen: true
            };
        }

        const functionName =
            DISCORD_ARCHIV_FUNCTIONS[auftragsart];

        if (!functionName) {
            throw new Error(
                "Keine Discord-Archivfunktion für Auftragstyp " +
                auftragsart +
                " eingerichtet."
            );
        }

        const { data, error } =
            await supabase.functions.invoke(
                functionName,
                {
                    body: {
                        order: auftrag
                    }
                }
            );

        if (error) {
            throw error;
        }

        return {
            archiviert: true,
            data: data
        };
    }


    /*
    ============================================================
    HAUPTFUNKTION
    ============================================================

    Diese Funktion muss vor dem eigentlichen DELETE ausgeführt
    werden.

    Reihenfolge:

    1. Finanzdaten speichern
    2. Falls nötig Discord-Archiv erstellen
    3. Erst danach darf der Auftrag gelöscht werden
    ============================================================
    */

    window.archiviereAuftragVorLoeschung =
        async function (auftrag, auftragsart) {
            pruefeSupabase();

            if (!auftrag) {
                throw new Error(
                    "Der Auftrag konnte nicht archiviert werden, da keine Daten vorhanden sind."
                );
            }

            if (!auftragsart) {
                throw new Error(
                    "Der Auftragstyp wurde nicht übergeben."
                );
            }

            /*
            Zuerst Finanzdaten speichern.
            Wenn das fehlschlägt, wird kein weiterer Schritt
            ausgeführt und der Auftrag bleibt bestehen.
            */
            const finanzErgebnis =
                await speichereFinanzdaten(
                    auftrag,
                    auftragsart
                );

            /*
            Danach Discord-Archivierung durchführen.
            Nur Bau und Redstone werden archiviert.
            */
            const discordErgebnis =
                await archiviereInDiscord(
                    auftrag,
                    auftragsart
                );

            return {
                erfolgreich: true,
                finanzdaten: finanzErgebnis,
                discord: discordErgebnis
            };
        };


    /*
    ============================================================
    OPTIONAL: EINZELNE FUNKTIONEN GLOBAL VERFÜGBAR MACHEN
    ============================================================
    */

    window.speichereAuftragsFinanzen =
        speichereFinanzdaten;

    window.archiviereAuftragInDiscord =
        archiviereInDiscord;

})();
