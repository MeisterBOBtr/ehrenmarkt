// Ehrenmarkt – Authentifizierung

async function anmelden(email, passwort) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: passwort
    });

    if (error) {
        console.error("Anmeldung fehlgeschlagen:", error.message);
        return false;
    }

    console.log("Erfolgreich angemeldet:", data.user);
    return true;
}

async function registrieren(email, passwort) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: passwort
    });

    if (error) {
        console.error("Registrierung fehlgeschlagen:", error.message);
        return false;
    }

    console.log("Registrierung erfolgreich:", data.user);
    return true;
}

async function abmelden() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Abmeldung fehlgeschlagen:", error.message);
        return false;
    }

    return true;
}
