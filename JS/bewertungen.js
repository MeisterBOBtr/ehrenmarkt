document.addEventListener("DOMContentLoaded", async () => {

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase Client nicht gefunden.");
        return;
    }


    /* =====================================================
       ELEMENTE
       ===================================================== */

    const bewertungForm =
        document.getElementById("bewertungForm");

    const bewertungName =
        document.getElementById("bewertungName");

    const bewertungSterne =
        document.getElementById("bewertungSterne");

    const bewertungKommentar =
        document.getElementById("bewertungKommentar");

    const zeichenZaehler =
        document.getElementById("zeichenZaehler");

    const bewertungAbsenden =
        document.getElementById("bewertungAbsenden");

    const bestaetigungDauerhaft =
        document.getElementById("bestaetigungDauerhaft");

    const bestaetigungVerantwortung =
        document.getElementById("bestaetigungVerantwortung");

    const bewertung30TageHinweis =
        document.getElementById("bewertung30TageHinweis");

    const bewertungenListe =
        document.getElementById("bewertungenListe");

    const durchschnittBewertung =
        document.getElementById("durchschnittBewertung");

    const durchschnittSterne =
        document.getElementById("durchschnittSterne");

    const anzahlBewertungen =
        document.getElementById("anzahlBewertungen");


    /* =====================================================
       BENUTZER
       ===================================================== */

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();


    if (userError) {
        console.error(
            "Fehler beim Laden des Benutzers:",
            userError
        );
    }


    if (!user) {

        if (bewertungForm) {
            bewertungForm.style.display = "none";
        }

        if (bewertung30TageHinweis) {
            bewertung30TageHinweis.style.display = "block";

            bewertung30TageHinweis.textContent =
                "Du musst angemeldet sein, um eine Bewertung abzugeben.";
        }

    }


    /* =====================================================
       LETZTE BEWERTUNG DES BENUTZERS PRÜFEN
       ===================================================== */

    let darfBewerten = true;


    async function pruefe30TageSperre() {

        if (!user) {
            return false;
        }


        const { data, error } = await supabase
            .from("bewertungen")
            .select("erstellt_am")
            .eq("user_id", user.id)
            .order("erstellt_am", {
                ascending: false
            })
            .limit(1);


        if (error) {

            console.error(
                "Fehler bei der 30-Tage-Prüfung:",
                error
            );

            return true;
        }


        if (!data || data.length === 0) {

            return true;
        }


        const letzteBewertung =
            new Date(data[0].erstellt_am);

        const jetzt =
            new Date();

        const differenz =
            jetzt.getTime() -
            letzteBewertung.getTime();

        const dreissigTage =
            30 * 24 * 60 * 60 * 1000;


        if (differenz < dreissigTage) {

            darfBewerten = false;

            if (bewertungForm) {
                bewertungForm.style.display = "none";
            }

            if (bewertung30TageHinweis) {

                const verbleibend =
                    dreissigTage - differenz;

                const verbleibendeTage =
                    Math.ceil(
                        verbleibend /
                        (24 * 60 * 60 * 1000)
                    );

                bewertung30TageHinweis.style.display =
                    "block";

                bewertung30TageHinweis.textContent =
                    `Du hast bereits eine Bewertung abgegeben. ` +
                    `Eine neue Bewertung ist in etwa ` +
                    `${verbleibendeTage} Tag(en) möglich.`;
            }

            return false;
        }


        return true;
    }


    /* =====================================================
       ZEICHENZÄHLER
       ===================================================== */

    if (bewertungKommentar && zeichenZaehler) {

        bewertungKommentar.addEventListener(
            "input",
            () => {

                zeichenZaehler.textContent =
                    `${bewertungKommentar.value.length} / 1000`;

            }
        );

    }


    /* =====================================================
       BEWERTUNGEN LADEN
       ===================================================== */

    async function ladeBewertungen() {

        if (!bewertungenListe) {
            return;
        }


        const {
            data,
            error
        } = await supabase
            .from("bewertungen")
            .select(
                "id, name, sterne, kommentar, erstellt_am"
            )
            .order("erstellt_am", {
                ascending: false
            });


        if (error) {

            console.error(
                "Fehler beim Laden der Bewertungen:",
                error
            );

            bewertungenListe.innerHTML = `
                <div class="empty-message">
                    Bewertungen konnten nicht geladen werden.
                </div>
            `;

            return;
        }


        if (!data || data.length === 0) {

            bewertungenListe.innerHTML = `
                <div class="empty-message">
                    Noch keine Bewertungen vorhanden.
                </div>
            `;

            return;
        }


        /* =================================================
           DURCHSCHNITT
           ================================================= */

        let summe = 0;

        data.forEach(
            bewertung => {
                summe +=
                    Number(bewertung.sterne) || 0;
            }
        );


        const durchschnitt =
            summe / data.length;


        if (durchschnittBewertung) {

            durchschnittBewertung.textContent =
                durchschnitt
                    .toLocaleString("de-DE", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                    });

        }


        if (anzahlBewertungen) {

            anzahlBewertungen.textContent =
                data.length.toLocaleString("de-DE");

        }


        if (durchschnittSterne) {

            const gerundeteSterne =
                Math.round(durchschnitt);

            durchschnittSterne.textContent =
                "★".repeat(gerundeteSterne) +
                "☆".repeat(5 - gerundeteSterne);

        }


        /* =================================================
           LISTE
           ================================================= */

        bewertungenListe.innerHTML = "";


        data.forEach(
            bewertung => {

                const item =
                    document.createElement("div");

                item.className =
                    "review-item";


                const sterne =
                    "★".repeat(
                        Number(bewertung.sterne)
                    ) +
                    "☆".repeat(
                        5 - Number(bewertung.sterne)
                    );


                const datum =
                    new Date(
                        bewertung.erstellt_am
                    ).toLocaleDateString(
                        "de-DE"
                    );


                item.innerHTML = `

                    <div class="review-top">

                        <span class="review-name">
                            ${escapeHtml(bewertung.name)}
                        </span>

                        <span class="review-stars">
                            ${sterne}
                        </span>

                    </div>

                    <div class="review-text">
                        ${escapeHtml(bewertung.kommentar)}
                    </div>

                    <div class="review-date">
                        ${datum}
                    </div>

                `;


                bewertungenListe.appendChild(item);

            }
        );

    }


    /* =====================================================
       HTML SICHER AUSGEBEN
       ===================================================== */

    function escapeHtml(text) {

        const div =
            document.createElement("div");

        div.textContent =
            text ?? "";

        return div.innerHTML;
    }


    /* =====================================================
       START
       ===================================================== */

    await ladeBewertungen();

    if (user) {
        await pruefe30TageSperre();
    }

    /* =====================================================
       STERNE AUSWÄHLEN
       ===================================================== */

    const starButtons =
        document.querySelectorAll(".star-button");


    starButtons.forEach(button => {

        button.addEventListener("click", () => {

            const rating =
                Number(button.dataset.rating);

            if (bewertungSterne) {
                bewertungSterne.value = rating;
            }


            /* Alle Sterne zurücksetzen */

            starButtons.forEach(star => {

                const starRating =
                    Number(star.dataset.rating);

                if (starRating <= rating) {

                    star.classList.add("active");

                } else {

                    star.classList.remove("active");

                }

            });

        });

    });


    /* =====================================================
       FORMULAR ABSENDEN
       ===================================================== */

    if (bewertungForm) {

        bewertungForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                /* -----------------------------------------
                   Benutzer prüfen
                   ----------------------------------------- */

                if (!user) {

                    alert(
                        "Du musst angemeldet sein, um eine Bewertung abzugeben."
                    );

                    return;
                }


                /* -----------------------------------------
                   30-Tage-Sperre prüfen
                   ----------------------------------------- */

                if (!darfBewerten) {

                    alert(
                        "Du kannst nur alle 30 Tage eine Bewertung abgeben."
                    );

                    return;
                }


                /* -----------------------------------------
                   Werte auslesen
                   ----------------------------------------- */

                const name =
                    bewertungName
                        ? bewertungName.value.trim()
                        : "";

                const sterne =
                    bewertungSterne
                        ? Number(bewertungSterne.value)
                        : 0;

                const kommentar =
                    bewertungKommentar
                        ? bewertungKommentar.value.trim()
                        : "";

                const dauerhaft =
                    bestaetigungDauerhaft
                        ? bestaetigungDauerhaft.checked
                        : false;

                const verantwortung =
                    bestaetigungVerantwortung
                        ? bestaetigungVerantwortung.checked
                        : false;


                /* -----------------------------------------
                   Pflichtfelder prüfen
                   ----------------------------------------- */

                if (!name) {

                    alert(
                        "Bitte gib deinen Namen ein."
                    );

                    return;
                }


                if (!sterne || sterne < 1 || sterne > 5) {

                    alert(
                        "Bitte wähle eine Bewertung von 1 bis 5 Sternen."
                    );

                    return;
                }


                if (!kommentar) {

                    alert(
                        "Bitte schreibe einen Kommentar."
                    );

                    return;
                }


                if (kommentar.length > 1000) {

                    alert(
                        "Deine Bewertung darf maximal 1000 Zeichen enthalten."
                    );

                    return;
                }


                if (!dauerhaft) {

                    alert(
                        "Bitte bestätige die dauerhafte Speicherung deiner Bewertung."
                    );

                    return;
                }


                if (!verantwortung) {

                    alert(
                        "Bitte bestätige deine Verantwortung für den Inhalt."
                    );

                    return;
                }


                /* -----------------------------------------
                   Button sperren
                   ----------------------------------------- */

                if (bewertungAbsenden) {

                    bewertungAbsenden.disabled = true;

                    bewertungAbsenden.textContent =
                        "Bewertung wird gespeichert ...";

                }


                /* -----------------------------------------
                   Bewertung speichern
                   ----------------------------------------- */

                const {
                    data,
                    error
                } = await supabase
                    .from("bewertungen")
                    .insert({

                        user_id: user.id,

                        name: name,

                        sterne: sterne,

                        kommentar: kommentar,

                        bestaetigung_dauerhaft: dauerhaft,

                        bestaetigung_verantwortung: verantwortung

                    })
                    .select()
                    .single();


                /* -----------------------------------------
                   Fehler
                   ----------------------------------------- */

                if (error) {

                    console.error(
                        "Fehler beim Speichern der Bewertung:",
                        error
                    );


                    if (bewertungAbsenden) {

                        bewertungAbsenden.disabled = false;

                        bewertungAbsenden.textContent =
                            "Bewertung endgültig absenden";

                    }


                    alert(
                        "Die Bewertung konnte nicht gespeichert werden."
                    );

                    return;
                }


                /* -----------------------------------------
                   Erfolgreich
                   ----------------------------------------- */

                console.log(
                    "Bewertung erfolgreich gespeichert:",
                    data
                );


                darfBewerten = false;


                if (bewertungForm) {
                    bewertungForm.reset();
                }


                if (bewertungSterne) {
                    bewertungSterne.value = 0;
                }


                if (zeichenZaehler) {
                    zeichenZaehler.textContent =
                        "0 / 1000";
                }


                starButtons.forEach(star => {
                    star.classList.remove("active");
                });


                if (bewertungForm) {
                    bewertungForm.style.display = "none";
                }


                if (bewertung30TageHinweis) {

                    bewertung30TageHinweis.style.display =
                        "block";

                    bewertung30TageHinweis.textContent =
                        "Deine Bewertung wurde erfolgreich gespeichert. " +
                        "Eine neue Bewertung kannst du in 30 Tagen abgeben.";

                }


                await ladeBewertungen();


                if (bewertungAbsenden) {

                    bewertungAbsenden.disabled = false;

                    bewertungAbsenden.textContent =
                        "Bewertung endgültig absenden";

                }


                alert(
                    "Vielen Dank für deine Bewertung!"
                );

            }
        );

    }
      /* =====================================================
       INITIALISIERUNG
       ===================================================== */

    if (user) {

        await pruefe30TageSperre();

    }


    /* =====================================================
       BEWERTUNGEN ZUM START LADEN
       ===================================================== */

    await ladeBewertungen();


    /* =====================================================
       ABSCHLIESSEN
       ===================================================== */

});
