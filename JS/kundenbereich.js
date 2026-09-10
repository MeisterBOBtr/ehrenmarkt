"use strict";

if (window.__EHRENMARKT_KUNDENBEREICH_GESTARTET__) {
    console.warn("Ehrenmarkt: Kundenbereich wurde bereits gestartet.");
} else {
    window.__EHRENMARKT_KUNDENBEREICH_GESTARTET__ = true;

const EhrenmarktKunden = {
    client: null,
    user: null,
    profile: null,
    orders: [],
    loading: false
};

const AUFTRAGSTYPEN = Object.freeze({
    MATERIAL: "Material",
    BAU: "Bau",
    REDSTONE: "Redstone",
    LOGISTIK: "Logistik"
});

function element(id) {
    return document.getElementById(id);
}

function holeSupabaseClient() {
    const client = window.supabaseClient;

    if (
        client &&
        client.auth &&
        typeof client.auth.getSession === "function"
    ) {
        return client;
    }

    console.error("Ehrenmarkt: Supabase-Client nicht verfügbar.");
    return null;
}

function setzeLadeanzeige(anzeigen) {
    const ladebereich = element("ladebereich");

    if (ladebereich) {
        ladebereich.style.display = anzeigen ? "block" : "none";
    }
}

function zeigeFehler(nachricht) {
    const fehler = element("fehler");

    if (!fehler) {
        console.error(nachricht);
        return;
    }

    fehler.textContent = nachricht;
    fehler.style.display = "block";
}

function versteckeFehler() {
    const fehler = element("fehler");

    if (fehler) {
        fehler.textContent = "";
        fehler.style.display = "none";
    }
}

function zeigeGastBereich() {
    const gast = element("gastBereich");
    const kunden = element("kundenBereich");

    if (gast) {
        gast.style.display = "block";
    }

    if (kunden) {
        kunden.style.display = "none";
    }

    setzeLadeanzeige(false);
}

function zeigeKundenBereich() {
    const gast = element("gastBereich");
    const kunden = element("kundenBereich");

    if (gast) {
        gast.style.display = "none";
    }

    if (kunden) {
        kunden.style.display = "block";
    }
}

function mitTimeout(promise, millisekunden) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            window.setTimeout(
                () => {
                    reject(
                        new Error(
                            "Zeitüberschreitung bei der Supabase-Verbindung."
                        )
                    );
                },
                millisekunden
            );
        })
    ]);
}

async function holeSession() {
    if (!EhrenmarktKunden.client) {
        return null;
    }

    const { data, error } =
        await mitTimeout(
            EhrenmarktKunden.client.auth.getSession(),
            10000
        );

    if (error) {
        throw error;
    }

    return data?.session || null;
}

async function pruefeAnmeldung() {
    try {
        const session = await holeSession();

        if (!session?.user) {
            EhrenmarktKunden.user = null;
            EhrenmarktKunden.profile = null;
            EhrenmarktKunden.orders = [];
            zeigeGastBereich();
            return;
        }

        EhrenmarktKunden.user = session.user;

        await ladeKundenbereich();
    } catch (fehler) {
        console.error(
            "Ehrenmarkt: Fehler bei der Anmeldung:",
            fehler
        );

        zeigeGastBereich();
        zeigeFehler(
            "Der Kundenbereich konnte nicht geladen werden."
        );
    } finally {
        setzeLadeanzeige(false);
    }
}

async function ladeKundenbereich() {
    if (!EhrenmarktKunden.user) {
        zeigeGastBereich();
        return;
    }

    await ladeProfil();

    zeigeKundenBereich();
    zeigeProfildaten();

    await ladeAlleKundenauftraege();
}

async function ladeProfil() {
    const userId = EhrenmarktKunden.user?.id;

    if (!userId) {
        EhrenmarktKunden.profile = null;
        return;
    }

    try {
        const { data, error } =
            await EhrenmarktKunden.client
                .from("profiles")
                .select(
                    "id, username, minecraft_name, user_type, rang, rolle"
                )
                .eq("id", userId)
                .maybeSingle();

        if (error) {
            console.error(
                "Ehrenmarkt: Profil konnte nicht geladen werden:",
                error
            );

            EhrenmarktKunden.profile = null;
            return;
        }

        EhrenmarktKunden.profile = data || null;
    } catch (fehler) {
        console.error(
            "Ehrenmarkt: Fehler beim Profilabruf:",
            fehler
        );

        EhrenmarktKunden.profile = null;
    }
}

function zeigeProfildaten() {
    const user = EhrenmarktKunden.user;
    const profil = EhrenmarktKunden.profile;

    if (!user) {
        return;
    }

    const username =
        profil?.username ||
        user.user_metadata?.username ||
        "Kunde";

    const minecraftName =
        profil?.minecraft_name ||
        user.user_metadata?.minecraft_name ||
        "Nicht hinterlegt";

    const email =
        user.email ||
        "Nicht verfügbar";

    const begruessung = element("kundenBegruessung");
    if (begruessung) {
        begruessung.textContent =
            `Willkommen zurück, ${username}!`;
    }

    const usernameElement = element("kundenUsername");
    if (usernameElement) {
        usernameElement.textContent = username;
    }

    const minecraftElement = element("kundenMinecraft");
    if (minecraftElement) {
        minecraftElement.textContent = minecraftName;
    }

    const emailElement = element("kundenEmail");
    if (emailElement) {
        emailElement.textContent = email;
    }

    const rangElement = element("kundenRang");
    if (rangElement) {
        rangElement.textContent =
            profil?.rang || "Kunde";
    }

    const rolleElement = element("kundenRolle");
    if (rolleElement) {
        rolleElement.textContent =
            profil?.rolle || "Kunde";
    }
}

function leereAuftragsbereiche() {
    [
        "aktiveAuftraege",
        "offeneAuftraege",
        "bearbeitungAuftraege",
        "abgeschlosseneAuftraege"
    ].forEach(id => {
        const bereich = element(id);

        if (bereich) {
            bereich.innerHTML = "";
        }
    });
}

async function ladeAlleKundenauftraege() {
    if (!EhrenmarktKunden.user) {
        leereAuftragsbereiche();
        zeigeAuftragszahlen(0, 0, 0);
        setzeLadeanzeige(false);
        return;
    }

    setzeLadeanzeige(true);
    leereAuftragsbereiche();
    EhrenmarktKunden.orders = [];

    try {
        await Promise.all([
            ladeMaterialauftraege(),
            ladeBauauftraege(),
            ladeRedstoneauftraege(),
            ladeLogistikauftraege()
        ]);

        EhrenmarktKunden.orders.sort(
            (a, b) =>
                new Date(b.created_at || 0).getTime() -
                new Date(a.created_at || 0).getTime()
        );

        zeigeAuftraege();
    } catch (fehler) {
        console.error(
            "Ehrenmarkt: Fehler beim Laden der Aufträge:",
            fehler
        );

        zeigeFehler(
            "Die Aufträge konnten nicht vollständig geladen werden."
        );
    } finally {
        setzeLadeanzeige(false);
    }
}

async function ladeMaterialauftraege() {
    const { data, error } =
        await EhrenmarktKunden.client
            .from("orders")
            .select(
                "id, order_number, minecraft_name, status, total_price, notes, created_at"
            )
            .eq(
                "user_id",
                EhrenmarktKunden.user.id
            )
            .order(
                "created_at",
                { ascending: false }
            );

    if (error) {
        console.error(
            "Materialaufträge:",
            error
        );
        return;
    }

    (data || []).forEach(auftrag => {
        EhrenmarktKunden.orders.push({
            id: auftrag.id,
            typ: AUFTRAGSTYPEN.MATERIAL,
            order_number: auftrag.order_number,
            minecraft_name: auftrag.minecraft_name,
            status: auftrag.status,
            total_price: auftrag.total_price,
            created_at: auftrag.created_at,
            notes: auftrag.notes
        });
    });
}

async function ladeBauauftraege() {
    const { data, error } =
        await EhrenmarktKunden.client
            .from("build_orders")
            .select(
                "id, order_number, minecraft_name, status, provisional_price, final_price, created_at, description, location"
            )
            .eq(
                "user_id",
                EhrenmarktKunden.user.id
            )
            .order(
                "created_at",
                { ascending: false }
            );

    if (error) {
        console.error(
            "Bauaufträge:",
            error
        );
        return;
    }

    (data || []).forEach(auftrag => {
        EhrenmarktKunden.orders.push({
            id: auftrag.id,
            typ: AUFTRAGSTYPEN.BAU,
            order_number: auftrag.order_number,
            minecraft_name: auftrag.minecraft_name,
            status: auftrag.status,
            total_price:
                auftrag.final_price ??
                auftrag.provisional_price ??
                0,
            created_at: auftrag.created_at,
            description: auftrag.description,
            location: auftrag.location
        });
    });
}

async function ladeRedstoneauftraege() {
    const { data, error } =
        await EhrenmarktKunden.client
            .from("redstone_orders")
            .select(
                "id, order_number, minecraft_name, title, status, total_price, deposit_amount, remaining_amount, created_at, description"
            )
            .eq(
                "user_id",
                EhrenmarktKunden.user.id
            )
            .order(
                "created_at",
                { ascending: false }
            );

    if (error) {
        console.error(
            "Redstone-Aufträge:",
            error
        );
        return;
    }

    (data || []).forEach(auftrag => {
        EhrenmarktKunden.orders.push({
            id: auftrag.id,
            typ: AUFTRAGSTYPEN.REDSTONE,
            order_number: auftrag.order_number,
            minecraft_name: auftrag.minecraft_name,
            title: auftrag.title,
            status: auftrag.status,
            total_price: auftrag.total_price,
            deposit_amount: auftrag.deposit_amount,
            remaining_amount: auftrag.remaining_amount,
            created_at: auftrag.created_at,
            description: auftrag.description
        });
    });
}

async function ladeLogistikauftraege() {
    const { data, error } =
        await EhrenmarktKunden.client
            .from("logistics_orders")
            .select(
                "id, order_number, customer_name, start_point, destination, status, total_price, deposit, remaining_payment, created_at, description"
            )
            .eq(
                "created_by",
                EhrenmarktKunden.user.id
            )
            .order(
                "created_at",
                { ascending: false }
            );

    if (error) {
        console.error(
            "Logistik-Aufträge:",
            error
        );
        return;
    }

    (data || []).forEach(auftrag => {
        EhrenmarktKunden.orders.push({
            id: auftrag.id,
            typ: AUFTRAGSTYPEN.LOGISTIK,
            order_number: auftrag.order_number,
            minecraft_name: auftrag.customer_name,
            status: auftrag.status,
            total_price: auftrag.total_price,
            deposit_amount: auftrag.deposit,
            remaining_amount: auftrag.remaining_payment,
            created_at: auftrag.created_at,
            description: auftrag.description,
            start_point: auftrag.start_point,
            destination: auftrag.destination
        });
    });
    }

function normalisiereStatus(status) {
    return String(status || "")
        .trim()
        .toLowerCase();
}

function kategorieFuerAuftrag(auftrag) {
    const status = normalisiereStatus(
        auftrag?.status
    );

    if (
        status === "abgeschlossen" ||
        status === "erledigt"
    ) {
        return "abgeschlossen";
    }

    if (
        status === "in bearbeitung" ||
        status === "bearbeitung"
    ) {
        return "bearbeitung";
    }

    if (
        status === "storniert" ||
        status === "abgebrochen"
    ) {
        return "abgeschlossen";
    }

    return "offen";
}

function statusText(status) {
    const normal = normalisiereStatus(status);

    const statusNamen = {
        offen: "Offen",
        "in bearbeitung": "In Bearbeitung",
        bearbeitung: "In Bearbeitung",
        abgeschlossen: "Abgeschlossen",
        erledigt: "Abgeschlossen",
        storniert: "Storniert",
        abgebrochen: "Abgebrochen"
    };

    return (
        statusNamen[normal] ||
        status ||
        "Unbekannt"
    );
}

function formatPreis(wert) {
    const zahl = Number(wert) || 0;

    return (
        zahl.toLocaleString("de-DE") +
        " $"
    );
}

function formatDatum(datum) {
    if (!datum) {
        return "–";
    }

    const wert = new Date(datum);

    if (Number.isNaN(wert.getTime())) {
        return "–";
    }

    return wert.toLocaleDateString(
        "de-DE",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function zeigeAuftragszahlen(
    offen,
    bearbeitung,
    abgeschlossen
) {
    const gesamt = element("auftragsGesamt");
    const offenElement = element("auftragsOffen");
    const bearbeitungElement =
        element("auftragsBearbeitung");
    const abgeschlossenElement =
        element("auftragsAbgeschlossen");

    if (gesamt) {
        gesamt.textContent =
            offen +
            bearbeitung +
            abgeschlossen;
    }

    if (offenElement) {
        offenElement.textContent = offen;
    }

    if (bearbeitungElement) {
        bearbeitungElement.textContent =
            bearbeitung;
    }

    if (abgeschlossenElement) {
        abgeschlossenElement.textContent =
            abgeschlossen;
    }
}

function zeigeAuftraege() {
    const offene = [];
    const bearbeitung = [];
    const abgeschlossene = [];

    EhrenmarktKunden.orders.forEach(
        auftrag => {
            const kategorie =
                kategorieFuerAuftrag(
                    auftrag
                );

            if (kategorie === "offen") {
                offene.push(auftrag);
            } else if (
                kategorie === "bearbeitung"
            ) {
                bearbeitung.push(auftrag);
            } else {
                abgeschlossene.push(
                    auftrag
                );
            }
        }
    );

    zeigeAuftragszahlen(
        offene.length,
        bearbeitung.length,
        abgeschlossene.length
    );

    renderAuftragsliste(
        "offeneAuftraege",
        offene,
        "Keine offenen Aufträge."
    );

    renderAuftragsliste(
        "bearbeitungAuftraege",
        bearbeitung,
        "Keine Aufträge in Bearbeitung."
    );

    renderAuftragsliste(
        "abgeschlosseneAuftraege",
        abgeschlossene,
        "Noch keine abgeschlossenen Aufträge."
    );

    renderAuftragsliste(
        "aktiveAuftraege",
        [...offene, ...bearbeitung],
        "Keine aktiven Aufträge."
    );
}

function renderAuftragsliste(
    elementId,
    auftraege,
    leertext
) {
    const container = element(elementId);

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !auftraege ||
        auftraege.length === 0
    ) {
        const leer =
            document.createElement("div");

        leer.className =
            "keine-auftraege";

        leer.textContent = leertext;

        container.appendChild(leer);
        return;
    }

    auftraege.forEach(
        auftrag => {
            container.appendChild(
                erstelleAuftragskarte(
                    auftrag
                )
            );
        }
    );
}

function erstelleAuftragskarte(auftrag) {
    const karte =
        document.createElement("article");

    karte.className = "auftrag-karte";

    const typ =
        document.createElement("div");

    typ.className = "auftrag-typ";
    typ.textContent =
        auftrag.typ || "Auftrag";

    const nummer =
        document.createElement("h3");

    nummer.className =
        "auftrag-nummer";

    nummer.textContent =
        auftrag.order_number ||
        "Ohne Auftragsnummer";

    const status =
        document.createElement("div");

    status.className =
        "auftrag-status";

    status.textContent =
        statusText(auftrag.status);

    const preis =
        document.createElement("div");

    preis.className =
        "auftrag-preis";

    preis.textContent =
        formatPreis(
            auftrag.total_price
        );

    const datum =
        document.createElement("div");

    datum.className =
        "auftrag-datum";

    datum.textContent =
        "Erstellt: " +
        formatDatum(
            auftrag.created_at
        );

    const info =
        document.createElement("div");

    info.className = "auftrag-info";

    if (
        auftrag.typ ===
        AUFTRAGSTYPEN.LOGISTIK
    ) {
        if (
            auftrag.start_point ||
            auftrag.destination
        ) {
            info.textContent =
                (
                    auftrag.start_point ||
                    "–"
                ) +
                " → " +
                (
                    auftrag.destination ||
                    "–"
                );
        }
    } else if (
        auftrag.typ ===
        AUFTRAGSTYPEN.REDSTONE
    ) {
        info.textContent =
            auftrag.title || "";
    } else if (
        auftrag.typ ===
        AUFTRAGSTYPEN.BAU
    ) {
        info.textContent =
            auftrag.location || "";
    }

    karte.appendChild(typ);
    karte.appendChild(nummer);
    karte.appendChild(status);
    karte.appendChild(preis);
    karte.appendChild(datum);

    if (info.textContent) {
        karte.appendChild(info);
    }

    return karte;
}

async function abmelden() {
    if (!EhrenmarktKunden.client) {
        zeigeFehler(
            "Supabase ist nicht verfügbar."
        );
        return;
    }

    const bestaetigen = window.confirm(
        "Möchtest du dich wirklich abmelden?"
    );

    if (!bestaetigen) {
        return;
    }

    try {
        const { error } =
            await EhrenmarktKunden.client.auth.signOut();

        if (error) {
            throw error;
        }

        EhrenmarktKunden.user = null;
        EhrenmarktKunden.profile = null;
        EhrenmarktKunden.orders = [];

        zeigeGastBereich();
        leereAuftragsbereiche();
        zeigeAuftragszahlen(0, 0, 0);
    } catch (fehler) {
        console.error(
            "Ehrenmarkt: Abmelden fehlgeschlagen:",
            fehler
        );

        zeigeFehler(
            "Das Abmelden ist fehlgeschlagen."
        );
    }
}

async function aktualisiereAuftraege() {
    if (!EhrenmarktKunden.user) {
        return;
    }

    versteckeFehler();
    await ladeAlleKundenauftraege();
}

function initialisiereButtons() {
    const abmeldenButton =
        element("abmeldenButton");

    if (abmeldenButton) {
        abmeldenButton.addEventListener(
            "click",
            abmelden
        );
    }

    const aktualisierenButton =
        element("auftraegeAktualisieren");

    if (aktualisierenButton) {
        aktualisierenButton.addEventListener(
            "click",
            async () => {
                aktualisierenButton.disabled = true;

                const alterText =
                    aktualisierenButton.textContent;

                aktualisierenButton.textContent =
                    "Wird geladen...";

                try {
                    await aktualisiereAuftraege();
                } finally {
                    aktualisierenButton.disabled = false;
                    aktualisierenButton.textContent =
                        alterText;
                }
            }
        );
    }
}

function initialisiereAuthListener() {
    if (!EhrenmarktKunden.client) {
        return;
    }

    EhrenmarktKunden.client.auth.onAuthStateChange(
        (event, session) => {
            if (event === "SIGNED_OUT") {
                EhrenmarktKunden.user = null;
                EhrenmarktKunden.profile = null;
                EhrenmarktKunden.orders = [];

                zeigeGastBereich();
                leereAuftragsbereiche();
                zeigeAuftragszahlen(0, 0, 0);

                return;
            }

            if (
                event === "SIGNED_IN" &&
                session?.user &&
                session.user.id !==
                    EhrenmarktKunden.user?.id
            ) {
                EhrenmarktKunden.user =
                    session.user;

                setzeLadeanzeige(true);

                void ladeKundenbereich()
                    .catch(fehler => {
                        console.error(
                            "Ehrenmarkt: Fehler nach Anmeldung:",
                            fehler
                        );
                        zeigeFehler(
                            "Dein Kundenbereich konnte nicht geladen werden."
                        );
                    })
                    .finally(
                        () => setzeLadeanzeige(false)
                    );
            }
        }
    );
}

async function starteKundenbereich() {
    versteckeFehler();
    setzeLadeanzeige(true);

    EhrenmarktKunden.client =
        holeSupabaseClient();

    if (!EhrenmarktKunden.client) {
        setzeLadeanzeige(false);
        zeigeGastBereich();
        zeigeFehler(
            "Die Verbindung zum Kundenbereich konnte nicht hergestellt werden."
        );
        return;
    }

    initialisiereButtons();
    initialisiereAuthListener();

    await pruefeAnmeldung();
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        void starteKundenbereich();
    },
    { once: true }
);

window.ehrenmarktAbmelden = abmelden;
window.ehrenmarktAuftraegeAktualisieren =
    aktualisiereAuftraege;

}
