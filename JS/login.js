/* ============================================
   EHRENMARKT – LOGIN
   JS/login.js
   ============================================ */

let supabaseClient = null;


/* ============================================
   SUPABASE CLIENT
   ============================================ */

function getSupabaseClient() {

    if (window.supabaseClient) {
        return window.supabaseClient;
    }

    console.error(
        "Supabase-Client wurde nicht gefunden."
    );

    return null;
}


/* ============================================
   ELEMENTE
   ============================================ */

function getElement(id) {

    return document.getElementById(id);
}


function setMessage(message) {

    const element =
        getElement("meldung");

    if (element) {
        element.textContent = message;
    }
}


function showError(message) {

    const element =
        getElement("fehler");

    if (!element) return;

    element.textContent = message;
    element.style.display = "block";
}


function hideError() {

    const element =
        getElement("fehler");

    if (!element) return;

    element.textContent = "";
    element.style.display = "none";
}


/* ============================================
   BUTTON STATUS
   ============================================ */

function setLoading(isLoading) {

    const button =
        getElement("loginButton");

    if (!button) return;

    button.disabled = isLoading;

    button.textContent = isLoading
        ? "Anmeldung läuft..."
        : "⚜ Anmelden ⚜";
}


/* ============================================
   BESTEHENDE SESSION PRÜFEN
   ============================================ */

async function checkExistingSession() {

    const client =
        getSupabaseClient();

    if (!client) {
        return false;
    }

    const {
        data,
        error
    } =
        await client.auth.getSession();


    if (error) {

        console.error(
            "Session konnte nicht geprüft werden:",
            error
        );

        return false;
    }


    if (data?.session?.user) {

        window.location.replace(
            "startseite.html"
        );

        return true;
    }


    return false;
}


/* ============================================
   LOGIN
   ============================================ */

async function loginUser(
    email,
    password
) {

    const client =
        getSupabaseClient();


    if (!client) {

        throw new Error(
            "Supabase ist nicht verfügbar."
        );
    }


    const {
        data,
        error
    } =
        await client.auth.signInWithPassword({

            email: email,

            password: password

        });


    if (error) {
        throw error;
    }


    if (!data?.user) {

        throw new Error(
            "Benutzer konnte nicht angemeldet werden."
        );
    }


    return data.user;
}

/* ============================================
   PROFIL LADEN
   ============================================ */

async function loadProfile(userId) {

    const client =
        getSupabaseClient();


    if (!client) {

        throw new Error(
            "Supabase ist nicht verfügbar."
        );
    }


    const {
        data,
        error
    } =
        await client
            .from("profiles")
            .select(`
                id,
                username,
                minecraft_name,
                user_type,
                rang,
                rolle
            `)
            .eq("id", userId)
            .maybeSingle();


    if (error) {
        throw error;
    }


    return data;
}


/* ============================================
   PROFIL SPEICHERN
   ============================================ */

async function saveProfile(
    user,
    username,
    minecraftName
) {

    const client =
        getSupabaseClient();


    if (!client) {

        throw new Error(
            "Supabase ist nicht verfügbar."
        );
    }


    const existingProfile =
        await loadProfile(user.id);


    /* =========================================
       NEUES PROFIL
       ========================================= */

    if (!existingProfile) {

        const {
            error
        } =
            await client
                .from("profiles")
                .insert({

                    id: user.id,

                    username: username,

                    minecraft_name: minecraftName,

                    user_type: "kunde"

                });


        if (error) {
            throw error;
        }


        return;
    }


    /* =========================================
       BESTEHENDES PROFIL
       ========================================= */

    const {
        error
    } =
        await client
            .from("profiles")
            .update({

                username: username,

                minecraft_name: minecraftName

            })
            .eq(
                "id",
                user.id
            );


    if (error) {
        throw error;
    }
}


/* ============================================
   FORMULARWERTE
   ============================================ */

function getLoginData() {

    const username =
        getElement("username")
            ?.value
            .trim();


    const minecraftName =
        getElement("minecraftName")
            ?.value
            .trim();


    const email =
        getElement("email")
            ?.value
            .trim();


    const password =
        getElement("passwort")
            ?.value;


    return {

        username,

        minecraftName,

        email,

        password

    };
}


/* ============================================
   EINGABEN PRÜFEN
   ============================================ */

function validateLoginData(data) {

    if (!data.username) {

        return "Bitte gib deinen Benutzernamen ein.";
    }


    if (!data.minecraftName) {

        return "Bitte gib deinen Minecraft-Namen ein.";
    }


    if (!data.email) {

        return "Bitte gib deine E-Mail-Adresse ein.";
    }


    if (!data.password) {

        return "Bitte gib dein Passwort ein.";
    }


    return null;
                   }

/* ============================================
   PROFIL NACH LOGIN VERARBEITEN
   ============================================ */

async function processProfile(
    user,
    username,
    minecraftName
) {

    setMessage(
        "Profildaten werden gespeichert..."
    );


    await saveProfile(
        user,
        username,
        minecraftName
    );


    setMessage(
        "Anmeldung erfolgreich."
    );


    await new Promise(resolve =>
        setTimeout(resolve, 400)
    );


    window.location.replace(
        "startseite.html"
    );
}


/* ============================================
   LOGIN-FORMULAR
   ============================================ */

async function handleLogin(event) {

    event.preventDefault();

    hideError();

    setMessage("");

    setLoading(true);


    try {

        /* =====================================
           FORMULARDATEN
           ===================================== */

        const data =
            getLoginData();


        const validationError =
            validateLoginData(data);


        if (validationError) {

            showError(
                validationError
            );

            return;
        }


        /* =====================================
           BENUTZER ANMELDEN
           ===================================== */

        setMessage(
            "Anmeldung wird geprüft..."
        );


        const user =
            await loginUser(
                data.email,
                data.password
            );


        /* =====================================
           PROFIL SPEICHERN
           ===================================== */

        await processProfile(
            user,
            data.username,
            data.minecraftName
        );


    } catch (error) {

        console.error(
            "Login-Fehler:",
            error
        );


        let message =
            "Bei der Anmeldung ist ein Fehler aufgetreten.";


        const errorText =
            error?.message?.toLowerCase() || "";


        if (
            errorText.includes(
                "invalid login credentials"
            )
        ) {

            message =
                "E-Mail oder Passwort ist falsch.";


        } else if (
            errorText.includes(
                "email not confirmed"
            )
        ) {

            message =
                "Bitte bestätige zuerst deine E-Mail-Adresse.";


        } else if (
            errorText.includes(
                "duplicate"
            )
        ) {

            message =
                "Für diesen Benutzer existiert bereits ein Profil.";


        } else if (error?.message) {

            message =
                error.message;
        }


        showError(message);

        setMessage("");


    } finally {

        setLoading(false);
    }
}


/* ============================================
   START
   ============================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        supabaseClient =
            getSupabaseClient();


        if (!supabaseClient) {

            showError(
                "Supabase konnte nicht geladen werden."
            );

            return;
        }


        /* =====================================
           BESTEHENDE SESSION PRÜFEN
           ===================================== */

        const alreadyLoggedIn =
            await checkExistingSession();


        if (alreadyLoggedIn) {
            return;
        }


        /* =====================================
           LOGIN-FORMULAR AKTIVIEREN
           ===================================== */

        const loginForm =
            getElement("loginForm");


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                handleLogin
            );

        } else {

            showError(
                "Das Anmeldeformular wurde nicht gefunden."
            );
        }
    }
);
