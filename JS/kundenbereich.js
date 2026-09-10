/* =========================================================
   EHRENMARKT – KUNDENBEREICH
   JS/kundenbereich.js

   TEIL 1 / 5
   Grundaufbau + Session
========================================================= */

"use strict";


/* =========================================================
   GLOBALE VARIABLEN
========================================================= */

let supabase = null;

let aktuellerBenutzer = null;
let aktuellesProfil = null;

let alleAuftraege = [];


/* =========================================================
   AUFTRAGSTYPEN
========================================================= */

const AUFTRAGSTYPEN = {
    MATERIAL: "Material",
    BAU: "Bau",
    REDSTONE: "Redstone",
    LOGISTIK: "Logistik"
};


/* =========================================================
   HILFSFUNKTIONEN
========================================================= */

function element(id) {
    return document.getElementById(id);
}


/* =========================================================
   GELD FORMATIEREN
========================================================= */

function formatPreis(wert) {

    const zahl = Number(wert) || 0;

    return (
        zahl.toLocaleString("de-DE") +
        " $"
    );

}


/* =========================================================
   DATUM FORMATIEREN
========================================================= */

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


/* =========================================================
   SUPABASE HOLEN
========================================================= */

function holeSupabase() {

    if (
        typeof window !== "undefined" &&
        window.supabaseClient
    ) {

        return window.supabaseClient;

    }


    if (
        typeof supabaseClient !== "undefined"
    ) {

        return supabaseClient;

    }


    console.error(
        "Ehrenmarkt: Supabase-Client wurde nicht gefunden."
    );

    return null;

}


/* =========================================================
   STATUS NORMALISIEREN
========================================================= */

function normalisiereStatus(status) {

    if (!status) {
        return "unbekannt";
    }

    return String(status)
        .trim()
        .toLowerCase();

}


/* =========================================================
   STATUS ANZEIGEN
========================================================= */

function statusText(status) {

    const normal =
        normalisiereStatus(status);


    const statusNamen = {

        offen: "Offen",

        "in bearbeitung":
            "In Bearbeitung",

        bearbeitung:
            "In Bearbeitung",

        abgeschlossen:
            "Abgeschlossen",

        erledigt:
            "Abgeschlossen",

        storniert:
            "Storniert",

        abgebrochen:
            "Abgebrochen"

    };


    return (
        statusNamen[normal] ||
        status ||
        "Unbekannt"
    );

}


/* =========================================================
   SEITE STARTEN
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        supabase = holeSupabase();


        if (!supabase) {

            zeigeFehler(
                "Die Verbindung zum Kundenbereich konnte nicht hergestellt werden."
            );

            return;

        }


        await pruefeAnmeldung();

    }
);


/* =========================================================
   ANMELDUNG / SESSION PRÜFEN
========================================================= */

async function pruefeAnmeldung() {

    try {

        const {
            data,
            error
        } =
            await supabase
                .auth
                .getSession();


        if (error) {
            throw error;
        }


        const session =
            data?.session;


        /* -----------------------------------------------------
           NICHT ANGEMELDET
        ----------------------------------------------------- */

        if (!session?.user) {

    aktuellerBenutzer = null;
    aktuellesProfil = null;

    setzeLadeanzeige(false);
    zeigeGastBereich();

    return;

        }

        /* -----------------------------------------------------
           ANGEMELDET
        ----------------------------------------------------- */

        aktuellerBenutzer =
            session.user;


        await ladeKundenbereich();

    } catch (fehler) {

        console.error(
            "Fehler beim Prüfen der Anmeldung:",
            fehler
        );


        zeigeFehler(
            "Der Kundenbereich konnte nicht geladen werden."
        );

    }

}


/* =========================================================
   GAST-BEREICH
========================================================= */

function zeigeGastBereich() {

    const gast =
        element("gastBereich");

    const kunden =
        element("kundenBereich");


    if (gast) {
        gast.style.display = "block";
    }


    if (kunden) {
        kunden.style.display = "none";
    }

}


/* =========================================================
   KUNDENBEREICH AUSBLENDEN / ANZEIGEN
========================================================= */

function zeigeKundenBereich() {

    const gast =
        element("gastBereich");

    const kunden =
        element("kundenBereich");


    if (gast) {
        gast.style.display = "none";
    }


    if (kunden) {
        kunden.style.display = "block";
    }

}


/* =========================================================
   FEHLER
========================================================= */

function zeigeFehler(nachricht) {

    const fehler =
        element("fehler");


    if (fehler) {

        fehler.textContent =
            nachricht;

        fehler.style.display =
            "block";

    } else {

        console.error(
            nachricht
        );

    }

       }

/* =========================================================
   TEIL 2 / 5
   Profil laden + Kundenbereich
========================================================= */


/* =========================================================
   KUNDENBEREICH LADEN
========================================================= */

async function ladeKundenbereich() {

    if (!aktuellerBenutzer) {

        zeigeGastBereich();

        return;

    }


    try {

        const {
            data: profil,
            error
        } =
            await supabase
                .from("profiles")
                .select(`
                    id,
                    username,
                    minecraft_name,
                    user_type,
                    rang,
                    rolle
                `)
                .eq("id", aktuellerBenutzer.id)
                .maybeSingle();


        if (error) {
            throw error;
        }


        aktuellesProfil =
            profil || null;


        /* -----------------------------------------------------
           KUNDENBEREICH ANZEIGEN
        ----------------------------------------------------- */

        zeigeKundenBereich();


        /* -----------------------------------------------------
           PROFIL ANZEIGEN
        ----------------------------------------------------- */

        fuelleKundenProfil();


    } catch (fehler) {

        console.error(
            "Fehler beim Laden des Kundenprofils:",
            fehler
        );


        zeigeFehler(
            "Dein Kundenprofil konnte nicht geladen werden."
        );

    }

}


/* =========================================================
   KUNDENPROFIL AUSFÜLLEN
========================================================= */

function fuelleKundenProfil() {

    if (!aktuellerBenutzer) {
        return;
    }


    const profil =
        aktuellesProfil || {};


    /* -----------------------------------------------------
       BENUTZERNAME
    ----------------------------------------------------- */

    const username =
        profil.username ||
        aktuellerBenutzer.user_metadata?.username ||
        "Kunde";


    const minecraftName =
        profil.minecraft_name ||
        aktuellerBenutzer.user_metadata?.minecraft_name ||
        "Nicht angegeben";


    const email =
        aktuellerBenutzer.email ||
        "Nicht angegeben";


    const rang =
        profil.rang ||
        "Kunde";


    const rolle =
        profil.rolle ||
        "Keine";


    /* -----------------------------------------------------
       BEGRÜSSUNG
    ----------------------------------------------------- */

    const begruessung =
        element("kundenBegruessung");


    if (begruessung) {

        begruessung.textContent =
            `Willkommen, ${username}!`;

    }


    /* -----------------------------------------------------
       PROFILFELDER
    ----------------------------------------------------- */

    const usernameElement =
        element("kundenUsername");


    if (usernameElement) {

        usernameElement.textContent =
            username;

    }


    const minecraftElement =
        element("kundenMinecraft");


    if (minecraftElement) {

        minecraftElement.textContent =
            minecraftName;

    }


    const emailElement =
        element("kundenEmail");


    if (emailElement) {

        emailElement.textContent =
            email;

    }


    const rangElement =
        element("kundenRang");


    if (rangElement) {

        rangElement.textContent =
            rang;

    }


    const rolleElement =
        element("kundenRolle");


    if (rolleElement) {

        rolleElement.textContent =
            rolle;

    }

}


/* =========================================================
   LADEANZEIGE AUSBLENDEN
========================================================= */

function setzeLadeanzeige(anzeigen) {

    const ladebereich =
        element("ladebereich");


    if (!ladebereich) {
        return;
    }


    ladebereich.style.display =
        anzeigen
            ? "flex"
            : "none";

}
