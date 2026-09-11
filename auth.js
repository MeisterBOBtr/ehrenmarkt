// ============================================================
// EHRENMARKT – ZENTRALE AUTHENTIFIZIERUNG
// ============================================================

// ------------------------------------------------------------
// ANMELDEN
// ------------------------------------------------------------

async function anmelden(email, passwort) {

    if (!email || !passwort) {
        console.error("E-Mail und Passwort werden benötigt.");
        return false;
    }

    const { data, error } =
        await window.supabaseClient.auth.signInWithPassword({
            email: email.trim(),
            password: passwort
        });

    if (error) {
        console.error(
            "Anmeldung fehlgeschlagen:",
            error.message
        );

        return false;
    }

    console.log(
        "Erfolgreich angemeldet:",
        data.user
    );

    return true;
}


// ------------------------------------------------------------
// REGISTRIEREN
// ------------------------------------------------------------

async function registrieren(email, passwort) {

    if (!email || !passwort) {
        console.error(
            "E-Mail und Passwort werden benötigt."
        );

        return false;
    }

    const { data, error } =
        await window.supabaseClient.auth.signUp({
            email: email.trim(),
            password: passwort
        });

    if (error) {
        console.error(
            "Registrierung fehlgeschlagen:",
            error.message
        );

        return false;
    }

    console.log(
        "Registrierung erfolgreich:",
        data.user
    );

    return true;
}


// ------------------------------------------------------------
// AKTUELL ANGEMELDETEN BENUTZER ABFRAGEN
// ------------------------------------------------------------

async function aktuellerBenutzer() {

    const { data, error } =
        await window.supabaseClient.auth.getUser();

    if (error) {
        console.error(
            "Benutzer konnte nicht geladen werden:",
            error.message
        );

        return null;
    }

    return data.user || null;
}


// ------------------------------------------------------------
// PRÜFEN, OB JEMAND ANGEMELDET IST
// ------------------------------------------------------------

async function istAngemeldet() {

    const user = await aktuellerBenutzer();

    return !!user;
}


// ------------------------------------------------------------
// ABMELDEN
// ------------------------------------------------------------

async function abmelden() {

    const { error } =
        await window.supabaseClient.auth.signOut();

    if (error) {
        console.error(
            "Abmeldung fehlgeschlagen:",
            error.message
        );

        return false;
    }

    console.log(
        "Erfolgreich abgemeldet."
    );

    return true;
}


// ------------------------------------------------------------
// GLOBALE AUTH-FUNKTIONEN
// ------------------------------------------------------------

window.ehrenmarktAuth = {
    anmelden,
    registrieren,
    aktuellerBenutzer,
    istAngemeldet,
    abmelden
};
