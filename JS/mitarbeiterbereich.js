// ============================================================
// EHRENMARKT – MITARBEITERBEREICH
// Komplett neu aufgebaut – 12 Teile
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    const supabase = window.supabaseClient;

    if (!supabase) {
        alert("Supabase konnte nicht geladen werden.");
        return;
    }

    // ============================================================
    // TEIL 1/12 – LOGIN + MITARBEITER LADEN
    // ============================================================

    let user = null;
    let employee = null;

    try {
        const sessionResult = await supabase.auth.getSession();

        if (sessionResult.error) {
            console.error("Session-Fehler:", sessionResult.error);
        }

        user = sessionResult.data?.session?.user || null;

        // Falls getSession() noch keine Session liefert, einmal
        // direkt beim Auth-System nachfragen.
        if (!user) {
            const userResult = await supabase.auth.getUser();

            if (!userResult.error) {
                user = userResult.data?.user || null;
            }
        }
    } catch (error) {
        console.error("Fehler bei der Anmeldung:", error);
    }

    if (!user) {
        window.location.href = "registrieren.html";
        return;
    }

    console.log("EHRENMARKT Session erkannt:", user.email);

    const employeeResult = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (employeeResult.error) {
        console.error(
            "Fehler beim Laden des Mitarbeiters:",
            employeeResult.error
        );

        alert(
            "Dein Mitarbeiterkonto konnte nicht geladen werden.\n\n" +
            employeeResult.error.message
        );

        return;
    }

    employee = employeeResult.data;

    if (!employee) {
        alert("Für deinen Account wurde kein aktiver Mitarbeiter gefunden.");
        window.location.href = "startseite.html";
        return;
    }

    // Gastbereich ausblenden / Mitarbeiterbereich anzeigen
    setDisplay(
        ["gastBereich"],
        "none"
    );

    setDisplay(
        ["mitarbeiterBereich"],
        "block"
    );

    setDisplay(
        ["ladebereich"],
        "none"
    );

        // ============================================================
    // TEIL 2/12 – HILFSFUNKTIONEN + MITARBEITERPROFIL
    // ============================================================

    function getElement(...ids) {
        for (const id of ids) {
            const element = document.getElementById(id);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function setDisplay(ids, display) {
        for (const id of ids) {
            const element = document.getElementById(id);

            if (element) {
                element.style.display = display;
            }
        }
    }

    function setText(ids, value) {
        const element = getElement(...ids);

        if (element) {
            element.textContent =
                value === null ||
                value === undefined ||
                value === ""
                    ? "-"
                    : String(value);
        }
    }

    function formatDatum(datum) {
        if (!datum) {
            return "-";
        }

        try {
            return new Date(datum).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        } catch {
            return "-";
        }
    }

    function formatZeit(datum) {
        if (!datum) {
            return "-";
        }

        try {
            return new Date(datum).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return "-";
        }
    }

    function formatArbeitszeit(minuten) {
        const total = Number(minuten) || 0;

        const stunden = Math.floor(total / 60);
        const restMinuten = total % 60;

        return `${stunden} Std. ${restMinuten} Min.`;
    }

    function zeigeFehler(nachricht) {
        console.error(nachricht);

        const element = getElement(
            "errorMessage",
            "fehlerNachricht",
            "fehlermeldung"
        );

        if (element) {
            element.textContent = nachricht;
            element.style.display = "block";
        } else {
            alert(nachricht);
        }
    }

    function zeigeErfolg(nachricht) {
        console.log(nachricht);

        const element = getElement(
            "successMessage",
            "erfolgNachricht",
            "erfolgsmeldung"
        );

        if (element) {
            element.textContent = nachricht;
            element.style.display = "block";

            setTimeout(() => {
                element.style.display = "none";
            }, 4000);
        }
    }

    // ============================================================
    // MITARBEITERPROFIL
    // ============================================================

    function ladeMitarbeiterProfil() {

        if (!employee || !user) {
            return;
        }

        // Benutzername
        setText(
            ["mitarbeiterUsername", "employeeName"],
            employee.name || user.email
        );

        // Minecraft-Name
        setText(
            ["mitarbeiterMinecraft", "employeeMinecraft"],
            employee.name || "-"
        );

        // E-Mail
        setText(
            ["mitarbeiterEmail", "employeeEmail"],
            user.email || "-"
        );

        // Rang
        setText(
            ["mitarbeiterRang", "employeeRank"],
            employee.rang || "-"
        );

        // Rolle
        setText(
            ["mitarbeiterRolle", "employeeRole"],
            employee.role || "-"
        );

        // Mitarbeiterstatus
        const status =
            employee.is_available === true
                ? "Verfügbar"
                : "Nicht verfügbar";

        setText(
            ["statusText", "employeeStatus", "mitarbeiterStatus"],
            status
        );

        // Arbeitszeit
        const arbeitszeit = formatArbeitszeit(
            employee.total_work_minutes || 0
        );

        setText(
            [
                "arbeitszeit",
                "workTime",
                "totalWorkTime",
                "arbeitszeitAnzeige",
                "workTimeDisplay"
            ],
            arbeitszeit
        );
    }

    // Profil sofort laden
    ladeMitarbeiterProfil();

        // ============================================================
    // TEIL 3/12 – ARBEITSZEIT
    // ============================================================

    let clockInterval = null;

    function aktualisiereArbeitszeitAnzeige() {

        if (!employee) {
            return;
        }

        let minuten =
            Number(employee.total_work_minutes) || 0;

        // Wenn aktuell eingestempelt, laufende Zeit zusätzlich anzeigen
        if (employee.clock_in) {
            const start = new Date(employee.clock_in);
            const jetzt = new Date();

            const laufendeMinuten = Math.max(
                0,
                Math.floor((jetzt - start) / 60000)
            );

            minuten += laufendeMinuten;
        }

        setText(
            [
                "arbeitszeit",
                "workTime",
                "totalWorkTime",
                "arbeitszeitAnzeige",
                "workTimeDisplay"
            ],
            formatArbeitszeit(minuten)
        );

        const status =
            employee.clock_in
                ? "Eingestempelt"
                : employee.is_available
                    ? "Verfügbar"
                    : "Nicht verfügbar";

        setText(
            ["statusText", "employeeStatus", "mitarbeiterStatus"],
            status
        );
    }

    function starteArbeitszeitAnzeige() {

        if (clockInterval) {
            clearInterval(clockInterval);
        }

        aktualisiereArbeitszeitAnzeige();

        clockInterval = setInterval(() => {
            aktualisiereArbeitszeitAnzeige();
        }, 60000);
    }

    async function einchecken() {

        if (!employee) {
            zeigeFehler("Mitarbeiterdaten fehlen.");
            return;
        }

        if (employee.clock_in) {
            zeigeFehler("Du bist bereits eingestempelt.");
            return;
        }

        try {

            const jetzt = new Date().toISOString();

            const { data, error } = await supabase
                .from("employees")
                .update({
                    clock_in: jetzt
                })
                .eq("id", employee.id)
                .select("*")
                .single();

            if (error) {
                throw error;
            }

            employee = data;

            aktualisiereArbeitszeitAnzeige();

            zeigeErfolg(
                "Arbeitszeit erfolgreich gestartet."
            );

        } catch (error) {

            console.error(
                "Fehler beim Einstempeln:",
                error
            );

            zeigeFehler(
                "Die Arbeitszeit konnte nicht gestartet werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    }

    async function auschecken() {

        if (!employee) {
            zeigeFehler("Mitarbeiterdaten fehlen.");
            return;
        }

        if (!employee.clock_in) {
            zeigeFehler("Du bist aktuell nicht eingestempelt.");
            return;
        }

        try {

            const start = new Date(employee.clock_in);
            const jetzt = new Date();

            const minutenSeitStart = Math.max(
                0,
                Math.floor((jetzt - start) / 60000)
            );

            const bisherigeMinuten =
                Number(employee.total_work_minutes) || 0;

            const neueGesamtzeit =
                bisherigeMinuten + minutenSeitStart;

            const { data, error } = await supabase
                .from("employees")
                .update({
                    clock_in: null,
                    total_work_minutes: neueGesamtzeit
                })
                .eq("id", employee.id)
                .select("*")
                .single();

            if (error) {
                throw error;
            }

            employee = data;

            aktualisiereArbeitszeitAnzeige();

            zeigeErfolg(
                `Arbeitszeit beendet. ${formatArbeitszeit(minutenSeitStart)} wurden hinzugefügt.`
            );

        } catch (error) {

            console.error(
                "Fehler beim Ausstempeln:",
                error
            );

            zeigeFehler(
                "Die Arbeitszeit konnte nicht beendet werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    }

    // ============================================================
    // BUTTONS FÜR EIN- UND AUSSTEMPELN
    // ============================================================

    const clockInButton = getElement(
        "clockIn",
        "clockInButton",
        "einstempeln",
        "einstempelnButton"
    );

    const clockOutButton = getElement(
        "clockOut",
        "clockOutButton",
        "ausstempeln",
        "ausstempelnButton"
    );

    if (clockInButton) {
        clockInButton.addEventListener(
            "click",
            einchecken
        );
    }

    if (clockOutButton) {
        clockOutButton.addEventListener(
            "click",
            auschecken
        );
    }

    // Laufende Arbeitszeit aktualisieren
    starteArbeitszeitAnzeige();

        // ============================================================
    // TEIL 4/12 – OFFENE AUFTRÄGE LADEN
    // ============================================================

    async function ladeOffeneAuftraege() {

        const container = getElement(
            "offeneAuftraege",
            "availableOrders"
        );

        if (!container) {
            console.warn(
                "Container für offene Aufträge nicht gefunden."
            );
            return;
        }

        container.innerHTML = `
            <div class="loading">
                Aufträge werden geladen...
            </div>
        `;

        try {

            const auftraege = [];

            // ----------------------------------------------------
            // MATERIALAUFTRÄGE
            // ----------------------------------------------------

            const { data: materialOrders, error: materialError } =
                await supabase
                    .from("orders")
                    .select("*")
                    .in("status", ["Offen", "offen"])
                    .is("employee_id", null);

            if (materialError) {
                console.error(
                    "Fehler bei Materialaufträgen:",
                    materialError
                );
            } else if (materialOrders) {

                materialOrders.forEach(order => {

                    auftraege.push({
                        ...order,
                        auftragstyp: "Material",
                        sortDatum:
                            order.created_at ||
                            order.updated_at ||
                            null
                    });

                });
            }

            // ----------------------------------------------------
            // BAUAUFTRÄGE
            // ----------------------------------------------------

            const { data: buildOrders, error: buildError } =
                await supabase
                    .from("build_orders")
                    .select("*")
                    .in("status", ["Offen", "offen"])
                    .is("assigned_employee_id", null);

            if (buildError) {
                console.error(
                    "Fehler bei Bauaufträgen:",
                    buildError
                );
            } else if (buildOrders) {

                buildOrders.forEach(order => {

                    auftraege.push({
                        ...order,
                        auftragstyp: "Bauauftrag",
                        sortDatum:
                            order.created_at ||
                            order.updated_at ||
                            null
                    });

                });
            }

            // ----------------------------------------------------
            // REDSTONE-AUFTRÄGE
            // ----------------------------------------------------

            const { data: redstoneOrders, error: redstoneError } =
                await supabase
                    .from("redstone_orders")
                    .select("*")
                    .in("status", ["Offen", "offen"])
                    .is("assigned_employee_id", null);

            if (redstoneError) {
                console.error(
                    "Fehler bei Redstone-Aufträgen:",
                    redstoneError
                );
            } else if (redstoneOrders) {

                redstoneOrders.forEach(order => {

                    auftraege.push({
                        ...order,
                        auftragstyp: "Redstone",
                        sortDatum:
                            order.created_at ||
                            order.updated_at ||
                            null
                    });

                });
            }

            // ----------------------------------------------------
            // LOGISTIKAUFTRÄGE
            // ----------------------------------------------------

            const { data: logisticsOrders, error: logisticsError } =
                await supabase
                    .from("logistics_orders")
                    .select("*")
                    .in("status", ["Offen", "offen"])
                    .is("employee_id", null);

            if (logisticsError) {
                console.error(
                    "Fehler bei Logistikaufträgen:",
                    logisticsError
                );
            } else if (logisticsOrders) {

                logisticsOrders.forEach(order => {

                    auftraege.push({
                        ...order,
                        auftragstyp: "Logistik",
                        sortDatum:
                            order.created_at ||
                            order.updated_at ||
                            null
                    });

                });
            }

            // Neueste Aufträge zuerst
            auftraege.sort((a, b) => {

                const datumA =
                    a.sortDatum
                        ? new Date(a.sortDatum).getTime()
                        : 0;

                const datumB =
                    b.sortDatum
                        ? new Date(b.sortDatum).getTime()
                        : 0;

                return datumB - datumA;
            });

            // ----------------------------------------------------
            // KEINE AUFTRÄGE
            // ----------------------------------------------------

            if (auftraege.length === 0) {

                container.innerHTML = `
                    <div class="empty-state">
                        <h3>Keine offenen Aufträge</h3>
                        <p>
                            Aktuell stehen keine freien Aufträge
                            zur Verfügung.
                        </p>
                    </div>
                `;

                return;
            }

            // ----------------------------------------------------
            // AUFTRÄGE DARSTELLEN
            // ----------------------------------------------------

            container.innerHTML = "";

            auftraege.forEach(order => {

                const card = document.createElement("div");

                card.className = "auftrag-card";

                const titel =
                    order.title ||
                    order.titel ||
                    order.name ||
                    order.order_name ||
                    `${order.auftragstyp}-Auftrag`;

                const beschreibung =
                    order.description ||
                    order.beschreibung ||
                    order.details ||
                    "";

                const datum =
                    order.created_at
                        ? formatDatum(order.created_at)
                        : "-";

                card.innerHTML = `
                    <div class="auftrag-header">
                        <span class="auftrag-typ">
                            ${order.auftragstyp}
                        </span>

                        <span class="auftrag-status">
                            Offen
                        </span>
                    </div>

                    <h3>
                        ${titel}
                    </h3>

                    ${
                        beschreibung
                            ? `<p>${beschreibung}</p>`
                            : ""
                    }

                    <div class="auftrag-info">
                        <span>
                            Erstellt: ${datum}
                        </span>
                    </div>

                    <button
                        type="button"
                        class="auftrag-button"
                        data-order-type="${order.auftragstyp}"
                        data-order-id="${order.id}"
                    >
                        Auftrag öffnen
                    </button>
                `;

                container.appendChild(card);
            });

            // Buttons nach dem Einfügen verbinden
            container
                .querySelectorAll(".auftrag-button")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const typ =
                                button.dataset.orderType;

                            const id =
                                button.dataset.orderId;

                            oeffneAuftrag(
                                typ,
                                id
                            );
                        }
                    );

                });

        } catch (error) {

            console.error(
                "Fehler beim Laden der offenen Aufträge:",
                error
            );

            container.innerHTML = `
                <div class="error-state">
                    <h3>Fehler beim Laden</h3>
                    <p>
                        Die offenen Aufträge konnten
                        nicht geladen werden.
                    </p>
                </div>
            `;
        }
    }

    // Offene Aufträge direkt laden
    await ladeOffeneAuftraege();

        // ============================================================
    // TEIL 5/12 – AUFTRÄGE ÖFFNEN
    // ============================================================

    function setText(ids, value) {
        ids.forEach(id => {
            const element =
                document.getElementById(id);

            if (element) {
                element.textContent =
                    String(value);
            }
        });
    }

    window.openBuildOrder = function(id) {
        if (!id) return;

        window.location.href =
            `bauauftrag_details.html?id=${encodeURIComponent(id)}`;
    };

    window.openMaterialOrder = function(id) {
        if (!id) return;

        window.location.href =
            `material_details.html?id=${encodeURIComponent(id)}`;
    };

    window.openLogisticsOrder = function(id) {
        if (!id) return;

        window.location.href =
            `logistik_details.html?id=${encodeURIComponent(id)}`;
    };

    window.openRedstoneOrder = function(id) {
        if (!id) return;

        window.location.href =
            `redstone_details.html?id=${encodeURIComponent(id)}`;
    };

    window.ehrenmarktAuftragAnsehen =
        function(typ, id) {

            switch (typ) {

                case "Material":
                    window.openMaterialOrder(id);
                    break;

                case "Bauauftrag":
                    window.openBuildOrder(id);
                    break;

                case "Logistik":
                    window.openLogisticsOrder(id);
                    break;

                case "Redstone":
                    window.openRedstoneOrder(id);
                    break;
            }
        };

            // ============================================================
    // TEIL 6/12 – AUFTRÄGE ANNEHMEN
    // ============================================================

    async function holeAktuellenMitarbeiter() {

        if (!user) {
            throw new Error("Du bist nicht angemeldet.");
        }

        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error(
                "Für deinen Account wurde kein aktiver Mitarbeiter gefunden."
            );
        }

        employee = data;

        return employee;
    }

    // ------------------------------------------------------------
    // MATERIALAUFTRAG ANNEHMEN
    // ------------------------------------------------------------

    window.acceptMaterialOrder = async function(id, button) {

        if (!id) {
            zeigeFehler("Die Auftrags-ID fehlt.");
            return;
        }

        if (button) {
            button.disabled = true;
            button.textContent = "⏳ Wird angenommen...";
        }

        try {

            const mitarbeiter =
                await holeAktuellenMitarbeiter();

            const { data, error } = await supabase
                .from("orders")
                .update({
                    employee_id: user.id,
                    status: "In Bearbeitung"
                })
                .eq("id", id)
                .in("status", ["Offen", "offen"])
                .is("employee_id", null)
                .select("*")
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error(
                    "Dieser Materialauftrag wurde bereits von einem anderen Mitarbeiter übernommen."
                );
            }

            zeigeErfolg(
                "Materialauftrag erfolgreich übernommen."
            );

            await ladeOffeneAuftraege();
            await ladeEigeneAuftraege();

        } catch (error) {

            console.error(
                "Fehler beim Übernehmen des Materialauftrags:",
                error
            );

            if (button) {
                button.disabled = false;
                button.textContent = "Auftrag annehmen";
            }

            zeigeFehler(
                error.message ||
                "Der Materialauftrag konnte nicht übernommen werden."
            );
        }
    };

    // ------------------------------------------------------------
    // BAUAUFTRAG ANNEHMEN
    // ------------------------------------------------------------

    window.acceptBuildOrder = async function(id, button) {

        if (!id) {
            zeigeFehler("Die Auftrags-ID fehlt.");
            return;
        }

        if (button) {
            button.disabled = true;
            button.textContent = "⏳ Wird angenommen...";
        }

        try {

            await holeAktuellenMitarbeiter();

            const { data, error } = await supabase
                .from("build_orders")
                .update({
                    assigned_employee_id: user.id,
                    status: "In Bearbeitung"
                })
                .eq("id", id)
                .in("status", ["Offen", "offen"])
                .is("assigned_employee_id", null)
                .select("*")
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error(
                    "Dieser Bauauftrag wurde bereits von einem anderen Mitarbeiter übernommen."
                );
            }

            zeigeErfolg(
                "Bauauftrag erfolgreich übernommen."
            );

            await ladeOffeneAuftraege();
            await ladeEigeneAuftraege();

        } catch (error) {

            console.error(
                "Fehler beim Übernehmen des Bauauftrags:",
                error
            );

            if (button) {
                button.disabled = false;
                button.textContent = "Auftrag annehmen";
            }

            zeigeFehler(
                error.message ||
                "Der Bauauftrag konnte nicht übernommen werden."
            );
        }
    };

    // ------------------------------------------------------------
    // REDSTONE-AUFTRAG ANNEHMEN
    // ------------------------------------------------------------

    window.acceptRedstoneOrder = async function(id, button) {

        if (!id) {
            zeigeFehler("Die Auftrags-ID fehlt.");
            return;
        }

        if (button) {
            button.disabled = true;
            button.textContent = "⏳ Wird angenommen...";
        }

        try {

            await holeAktuellenMitarbeiter();

            const { data, error } = await supabase
                .from("redstone_orders")
                .update({
                    assigned_employee_id: user.id,
                    status: "In Bearbeitung"
                })
                .eq("id", id)
                .in("status", ["Offen", "offen"])
                .is("assigned_employee_id", null)
                .select("*")
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error(
                    "Dieser Redstone-Auftrag wurde bereits von einem anderen Mitarbeiter übernommen."
                );
            }

            zeigeErfolg(
                "Redstone-Auftrag erfolgreich übernommen."
            );

            await ladeOffeneAuftraege();
            await ladeEigeneAuftraege();

        } catch (error) {

            console.error(
                "Fehler beim Übernehmen des Redstone-Auftrags:",
                error
            );

            if (button) {
                button.disabled = false;
                button.textContent = "Auftrag annehmen";
            }

            zeigeFehler(
                error.message ||
                "Der Redstone-Auftrag konnte nicht übernommen werden."
            );
        }
    };

        // ============================================================
    // TEIL 7/12 – LOGISTIKAUFTRAG ANNEHMEN
    // ============================================================

    window.acceptLogisticsOrder = async function(id, button) {

        if (!id) {
            zeigeFehler("Die Auftrags-ID fehlt.");
            return;
        }

        if (button) {
            button.disabled = true;
            button.textContent = "⏳ Wird angenommen...";
        }

        try {

            // Aktiven Mitarbeiter über den angemeldeten
            // Supabase-Account ermitteln
            const { data: mitarbeiter, error: employeeError } =
                await supabase
                    .from("employees")
                    .select("id, user_id, name")
                    .eq("user_id", user.id)
                    .eq("is_active", true)
                    .maybeSingle();

            if (employeeError) {
                throw employeeError;
            }

            if (!mitarbeiter) {
                throw new Error(
                    "Für deinen Account wurde kein aktiver Mitarbeiter gefunden."
                );
            }

            // Logistikauftrag übernehmen
            //
            // WICHTIG:
            // logistics_orders.employee_id enthält die ID
            // aus der employees-Tabelle – NICHT user.id.
            const { data: auftrag, error: updateError } =
                await supabase
                    .from("logistics_orders")
                    .update({
                        employee_id: mitarbeiter.id,
                        employee_name: mitarbeiter.name,
                        status: "In Bearbeitung"
                    })
                    .eq("id", id)
                    .in("status", ["Offen", "offen"])
                    .is("employee_id", null)
                    .select("*")
                    .maybeSingle();

            if (updateError) {
                throw updateError;
            }

            // Wenn kein Datensatz zurückkommt, wurde der Auftrag
            // wahrscheinlich bereits von jemand anderem übernommen.
            if (!auftrag) {
                throw new Error(
                    "Dieser Logistikauftrag wurde bereits von einem anderen Mitarbeiter übernommen."
                );
            }

            zeigeErfolg(
                "Logistikauftrag erfolgreich übernommen."
            );

            // Listen aktualisieren
            await ladeOffeneAuftraege();
            await ladeEigeneAuftraege();

            // Nach kurzer Verzögerung zur Detailseite
            setTimeout(() => {

                window.location.href =
                    `logistik_details.html?id=${encodeURIComponent(id)}`;

            }, 500);

        } catch (error) {

            console.error(
                "Fehler beim Übernehmen des Logistikauftrags:",
                error
            );

            if (button) {
                button.disabled = false;
                button.textContent = "📦 Auftrag annehmen";
            }

            zeigeFehler(
                error.message ||
                "Der Logistikauftrag konnte nicht übernommen werden."
            );
        }
    };

        // ============================================================
    // TEIL 8/12 – EIGENE AUFTRÄGE
    // ============================================================

    async function ladeEigeneAuftraege() {

        const container = getElement(
            "meineAuftraege",
            "myOrders"
        );

        if (!container) {
            console.warn(
                "Container für eigene Aufträge nicht gefunden."
            );
            return;
        }

        container.innerHTML = `
            <div class="loading">
                Deine Aufträge werden geladen...
            </div>
        `;

        try {

            const eigeneAuftraege = [];

            // ----------------------------------------------------
            // MATERIALAUFTRÄGE
            // ----------------------------------------------------

            const { data: materialOrders, error: materialError } =
                await supabase
                    .from("orders")
                    .select("*")
                    .eq("employee_id", user.id);

            if (materialError) {

                console.error(
                    "Fehler bei eigenen Materialaufträgen:",
                    materialError
                );

            } else if (materialOrders) {

                materialOrders.forEach(order => {

                    eigeneAuftraege.push({
                        ...order,
                        auftragstyp: "Material",
                        sortDatum:
                            order.updated_at ||
                            order.created_at ||
                            null
                    });

                });
            }

            // ----------------------------------------------------
            // BAUAUFTRÄGE
            // ----------------------------------------------------

            const { data: buildOrders, error: buildError } =
                await supabase
                    .from("build_orders")
                    .select("*")
                    .eq("assigned_employee_id", user.id);

            if (buildError) {

                console.error(
                    "Fehler bei eigenen Bauaufträgen:",
                    buildError
                );

            } else if (buildOrders) {

                buildOrders.forEach(order => {

                    eigeneAuftraege.push({
                        ...order,
                        auftragstyp: "Bauauftrag",
                        sortDatum:
                            order.updated_at ||
                            order.created_at ||
                            null
                    });

                });
            }

            // ----------------------------------------------------
            // REDSTONE-AUFTRÄGE
            // ----------------------------------------------------

            const { data: redstoneOrders, error: redstoneError } =
                await supabase
                    .from("redstone_orders")
                    .select("*")
                    .eq("assigned_employee_id", user.id);

            if (redstoneError) {

                console.error(
                    "Fehler bei eigenen Redstone-Aufträgen:",
                    redstoneError
                );

            } else if (redstoneOrders) {

                redstoneOrders.forEach(order => {

                    eigeneAuftraege.push({
                        ...order,
                        auftragstyp: "Redstone",
                        sortDatum:
                            order.updated_at ||
                            order.created_at ||
                            null
                    });

                });
            }

            // ----------------------------------------------------
            // LOGISTIKAUFTRÄGE
            // ----------------------------------------------------

            // Bei Logistikaufträgen wird NICHT user.id verwendet.
            // logistics_orders.employee_id verweist auf employees.id.

            const { data: eigenerMitarbeiter, error: mitarbeiterError } =
                await supabase
                    .from("employees")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("is_active", true)
                    .maybeSingle();

            if (mitarbeiterError) {

                console.error(
                    "Fehler beim Laden des Mitarbeiters für Logistik:",
                    mitarbeiterError
                );

            } else if (eigenerMitarbeiter) {

                const {
                    data: logisticsOrders,
                    error: logisticsError
                } = await supabase
                    .from("logistics_orders")
                    .select("*")
                    .eq("employee_id", eigenerMitarbeiter.id);

                if (logisticsError) {

                    console.error(
                        "Fehler bei eigenen Logistikaufträgen:",
                        logisticsError
                    );

                } else if (logisticsOrders) {

                    logisticsOrders.forEach(order => {

                        eigeneAuftraege.push({
                            ...order,
                            auftragstyp: "Logistik",
                            sortDatum:
                                order.updated_at ||
                                order.created_at ||
                                null
                        });

                    });
                }
            }

            // ----------------------------------------------------
            // SORTIEREN
            // ----------------------------------------------------

            eigeneAuftraege.sort((a, b) => {

                const datumA =
                    a.sortDatum
                        ? new Date(a.sortDatum).getTime()
                        : 0;

                const datumB =
                    b.sortDatum
                        ? new Date(b.sortDatum).getTime()
                        : 0;

                return datumB - datumA;
            });

            // ----------------------------------------------------
            // KEINE EIGENEN AUFTRÄGE
            // ----------------------------------------------------

            if (eigeneAuftraege.length === 0) {

                container.innerHTML = `
                    <div class="empty-state">
                        <h3>Keine eigenen Aufträge</h3>
                        <p>
                            Du hast aktuell keine Aufträge übernommen.
                        </p>
                    </div>
                `;

                return;
            }

            // ----------------------------------------------------
            // EIGENE AUFTRÄGE DARSTELLEN
            // ----------------------------------------------------

            container.innerHTML = "";

            eigeneAuftraege.forEach(order => {

                const card =
                    document.createElement("div");

                card.className = "auftrag-card";

                const titel =
                    order.title ||
                    order.titel ||
                    order.name ||
                    order.order_name ||
                    `${order.auftragstyp}-Auftrag`;

                const status =
                    order.status ||
                    "Unbekannt";

                const datum =
                    order.updated_at ||
                    order.created_at;

                card.innerHTML = `
                    <div class="auftrag-header">
                        <span class="auftrag-typ">
                            ${order.auftragstyp}
                        </span>

                        <span class="auftrag-status">
                            ${status}
                        </span>
                    </div>

                    <h3>
                        ${titel}
                    </h3>

                    <div class="auftrag-info">
                        <span>
                            Letzte Änderung:
                            ${formatDatum(datum)}
                        </span>
                    </div>

                    <button
                        type="button"
                        class="auftrag-button"
                        data-order-type="${order.auftragstyp}"
                        data-order-id="${order.id}"
                    >
                        Auftrag öffnen
                    </button>
                `;

                container.appendChild(card);
            });

            // ----------------------------------------------------
            // ÖFFNEN-BUTTONS
            // ----------------------------------------------------

            container
                .querySelectorAll(".auftrag-button")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const typ =
                                button.dataset.orderType;

                            const id =
                                button.dataset.orderId;

                            window.ehrenmarktAuftragAnsehen(
                                typ,
                                id
                            );
                        }
                    );

                });

        } catch (error) {

            console.error(
                "Fehler beim Laden der eigenen Aufträge:",
                error
            );

            container.innerHTML = `
                <div class="error-state">
                    <h3>Fehler beim Laden</h3>
                    <p>
                        Deine Aufträge konnten nicht geladen werden.
                    </p>
                </div>
            `;
        }
    }

    // Eigene Aufträge direkt laden
    await ladeEigeneAuftraege();

        // ============================================================
    // TEIL 9/12 – AUFTRÄGE ABSCHLIESSEN
    // ============================================================

    // ------------------------------------------------------------
    // MATERIALAUFTRAG ABSCHLIESSEN
    // ------------------------------------------------------------

    window.finishMaterialOrder = async function(id) {

        if (!id) {
            zeigeFehler("Die Auftrags-ID fehlt.");
            return;
        }

        if (!confirm("Materialauftrag wirklich abschließen?")) {
            return;
        }

        try {

            const { data: auftrag, error } =
                await supabase
                    .from("orders")
                    .update({
                        status: "Abgeschlossen"
                    })
                    .eq("id", id)
                    .eq("employee_id", user.id)
                    .select("*")
                    .maybeSingle();

            if (error) {
                throw error;
            }

            if (!auftrag) {
                throw new Error(
                    "Der Materialauftrag wurde nicht gefunden oder gehört nicht dir."
                );
            }

            zeigeErfolg(
                "Materialauftrag erfolgreich abgeschlossen."
            );

            await ladeEigeneAuftraege();
            await ladeOffeneAuftraege();

        } catch (error) {

            console.error(
                "Fehler beim Abschließen des Materialauftrags:",
                error
            );

            zeigeFehler(
                "Der Materialauftrag konnte nicht abgeschlossen werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    };


    // ------------------------------------------------------------
    // BAUAUFTRAG ABSCHLIESSEN
    // ------------------------------------------------------------

    window.finishBuildOrder = async function(id) {

        if (!id) {
            zeigeFehler("Die Auftrags-ID fehlt.");
            return;
        }

        if (!confirm("Bauauftrag wirklich abschließen?")) {
            return;
        }

        try {

            const { data: auftrag, error } =
                await supabase
                    .from("build_orders")
                    .update({
                        status: "Abgeschlossen"
                    })
                    .eq("id", id)
                    .eq("assigned_employee_id", user.id)
                    .select("*")
                    .maybeSingle();

            if (error) {
                throw error;
            }

            if (!auftrag) {
                throw new Error(
                    "Der Bauauftrag wurde nicht gefunden oder gehört nicht dir."
                );
            }

            zeigeErfolg(
                "Bauauftrag erfolgreich abgeschlossen."
            );

            await ladeEigeneAuftraege();
            await ladeOffeneAuftraege();

        } catch (error) {

            console.error(
                "Fehler beim Abschließen des Bauauftrags:",
                error
            );

            zeigeFehler(
                "Der Bauauftrag konnte nicht abgeschlossen werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    };


    // ------------------------------------------------------------
    // REDSTONE-AUFTRAG ABSCHLIESSEN
    // ------------------------------------------------------------

    window.finishRedstoneOrder = async function(id) {

        if (!id) {
            zeigeFehler("Die Auftrags-ID fehlt.");
            return;
        }

        if (!confirm("Redstone-Auftrag wirklich abschließen?")) {
            return;
        }

        try {

            const { data: auftrag, error } =
                await supabase
                    .from("redstone_orders")
                    .update({
                        status: "Abgeschlossen"
                    })
                    .eq("id", id)
                    .eq("assigned_employee_id", user.id)
                    .select("*")
                    .maybeSingle();

            if (error) {
                throw error;
            }

            if (!auftrag) {
                throw new Error(
                    "Der Redstone-Auftrag wurde nicht gefunden oder gehört nicht dir."
                );
            }

            zeigeErfolg(
                "Redstone-Auftrag erfolgreich abgeschlossen."
            );

            await ladeEigeneAuftraege();
            await ladeOffeneAuftraege();

        } catch (error) {

            console.error(
                "Fehler beim Abschließen des Redstone-Auftrags:",
                error
            );

            zeigeFehler(
                "Der Redstone-Auftrag konnte nicht abgeschlossen werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    };


    // ------------------------------------------------------------
    // LOGISTIKAUFTRAG ABSCHLIESSEN
    // ------------------------------------------------------------

    window.finishLogisticsOrder = async function(id) {

        if (!id) {
            zeigeFehler("Die Auftrags-ID fehlt.");
            return;
        }

        if (!confirm("Logistikauftrag wirklich abschließen?")) {
            return;
        }

        try {

            const { data: mitarbeiter, error: employeeError } =
                await supabase
                    .from("employees")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("is_active", true)
                    .maybeSingle();

            if (employeeError) {
                throw employeeError;
            }

            if (!mitarbeiter) {
                throw new Error(
                    "Für deinen Account wurde kein aktiver Mitarbeiter gefunden."
                );
            }

            const { data: auftrag, error } =
                await supabase
                    .from("logistics_orders")
                    .update({
                        status: "Abgeschlossen"
                    })
                    .eq("id", id)
                    .eq("employee_id", mitarbeiter.id)
                    .select("*")
                    .maybeSingle();

            if (error) {
                throw error;
            }

            if (!auftrag) {
                throw new Error(
                    "Der Logistikauftrag wurde nicht gefunden oder gehört nicht dir."
                );
            }

            zeigeErfolg(
                "Logistikauftrag erfolgreich abgeschlossen."
            );

            await ladeEigeneAuftraege();
            await ladeOffeneAuftraege();

        } catch (error) {

            console.error(
                "Fehler beim Abschließen des Logistikauftrags:",
                error
            );

            zeigeFehler(
                "Der Logistikauftrag konnte nicht abgeschlossen werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    };

        // ============================================================
    // TEIL 10/12 – VERFÜGBARKEIT
    // ============================================================

    async function setzeVerfuegbarkeit(verfuegbar) {

        if (!employee) {
            zeigeFehler("Mitarbeiterdaten fehlen.");
            return;
        }

        try {

            const { data, error } = await supabase
                .from("employees")
                .update({
                    is_available: verfuegbar
                })
                .eq("id", employee.id)
                .select("*")
                .single();

            if (error) {
                throw error;
            }

            employee = data;

            ladeMitarbeiterProfil();
            aktualisiereArbeitszeitAnzeige();

            if (verfuegbar) {
                zeigeErfolg(
                    "Du bist jetzt als verfügbar eingetragen."
                );
            } else {
                zeigeErfolg(
                    "Du bist jetzt als nicht verfügbar eingetragen."
                );
            }

        } catch (error) {

            console.error(
                "Fehler beim Ändern der Verfügbarkeit:",
                error
            );

            zeigeFehler(
                "Die Verfügbarkeit konnte nicht geändert werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    }


    // ------------------------------------------------------------
    // VERFÜGBAR-BUTTON
    // ------------------------------------------------------------

    const availableButton = getElement(
        "setAvailable",
        "verfuegbarButton",
        "availableButton"
    );

    if (availableButton) {

        availableButton.addEventListener(
            "click",
            async () => {

                availableButton.disabled = true;

                try {
                    await setzeVerfuegbarkeit(true);
                } finally {
                    availableButton.disabled = false;
                }

            }
        );
    }


    // ------------------------------------------------------------
    // NICHT VERFÜGBAR-BUTTON
    // ------------------------------------------------------------

    const unavailableButton = getElement(
        "setUnavailable",
        "nichtVerfuegbarButton",
        "unavailableButton"
    );

    if (unavailableButton) {

        unavailableButton.addEventListener(
            "click",
            async () => {

                unavailableButton.disabled = true;

                try {
                    await setzeVerfuegbarkeit(false);
                } finally {
                    unavailableButton.disabled = false;
                }

            }
        );
    }


    // ------------------------------------------------------------
    // GLOBALE FUNKTIONEN
    // Falls das HTML onclick="..." verwendet
    // ------------------------------------------------------------

    window.setAvailable = async function() {
        await setzeVerfuegbarkeit(true);
    };

    window.setUnavailable = async function() {
        await setzeVerfuegbarkeit(false);
    };

    window.verfuegbar = async function() {
        await setzeVerfuegbarkeit(true);
    };

    window.nichtVerfuegbar = async function() {
        await setzeVerfuegbarkeit(false);
    };

    // Aktuellen Status anzeigen
    aktualisiereArbeitszeitAnzeige();

        // ============================================================
    // TEIL 11/12 – ABWESENHEIT + VERSTÄRKUNG
    // ============================================================

    // ------------------------------------------------------------
    // ABWESENHEIT EINTRAGEN
    // ------------------------------------------------------------

    async function speichereAbwesenheit() {

        if (!employee) {
            zeigeFehler("Mitarbeiterdaten fehlen.");
            return;
        }

        const grundElement = getElement(
            "absenceReason"
        );

        const vonElement = getElement(
            "absenceFrom"
        );

        const bisElement = getElement(
            "absenceTo"
        );

        const kommentarElement = getElement(
            "absenceComment"
        );

        const grund =
            grundElement?.value?.trim() || "";

        const von =
            vonElement?.value || "";

        const bis =
            bisElement?.value || "";

        const kommentar =
            kommentarElement?.value?.trim() || "";

        if (!grund) {
            zeigeFehler(
                "Bitte einen Grund für die Abwesenheit angeben."
            );
            return;
        }

        if (!von || !bis) {
            zeigeFehler(
                "Bitte Beginn und Ende der Abwesenheit angeben."
            );
            return;
        }

        if (von > bis) {
            zeigeFehler(
                "Das Enddatum darf nicht vor dem Startdatum liegen."
            );
            return;
        }

        try {

            const { error } = await supabase
                .from("employee_absences")
                .insert({
                    employee_id: employee.id,
                    reason: grund,
                    date_from: von,
                    date_to: bis,
                    comment: kommentar || null,
                    status: "Offen"
                });

            if (error) {
                throw error;
            }

            zeigeErfolg(
                "Abwesenheit erfolgreich eingetragen."
            );

            if (grundElement) {
                grundElement.value = "";
            }

            if (vonElement) {
                vonElement.value = "";
            }

            if (bisElement) {
                bisElement.value = "";
            }

            if (kommentarElement) {
                kommentarElement.value = "";
            }

        } catch (error) {

            console.error(
                "Fehler beim Speichern der Abwesenheit:",
                error
            );

            zeigeFehler(
                "Die Abwesenheit konnte nicht gespeichert werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    }


    // ------------------------------------------------------------
    // ABWESENHEIT-BUTTON
    // ------------------------------------------------------------

    const absenceButton = getElement(
        "saveAbsence"
    );

    if (absenceButton) {

        absenceButton.addEventListener(
            "click",
            async () => {

                absenceButton.disabled = true;

                try {
                    await speichereAbwesenheit();
                } finally {
                    absenceButton.disabled = false;
                }

            }
        );
    }

    // Falls das HTML onclick verwendet
    window.saveAbsence = speichereAbwesenheit;


    // ------------------------------------------------------------
    // VERSTÄRKUNGSANFRAGEN LADEN
    // ------------------------------------------------------------

    async function ladeVerstaerkungsanfragen() {

        const container = getElement(
            "offeneVerstaerkung",
            "helpRequests"
        );

        if (!container) {
            return;
        }

        try {

            const { data, error } = await supabase
                .from("employee_help_requests")
                .select("*")
                .eq("employee_id", employee.id)
                .eq("status", "Offen")
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                console.error(
                    "Fehler beim Laden der Verstärkungsanfragen:",
                    error
                );
                return;
            }

            if (!data || data.length === 0) {

                container.innerHTML = `
                    <div class="empty-state">
                        <p>
                            Aktuell keine offenen Verstärkungsanfragen.
                        </p>
                    </div>
                `;

                return;
            }

            container.innerHTML = "";

            data.forEach(anfrage => {

                const card =
                    document.createElement("div");

                card.className =
                    "hilfeanfrage-card";

                card.innerHTML = `
                    <h3>
                        Verstärkungsanfrage
                    </h3>

                    <p>
                        Auftragstyp:
                        ${anfrage.order_type || "-"}
                    </p>

                    <p>
                        Auftrags-ID:
                        ${anfrage.order_id || "-"}
                    </p>

                    ${
                        anfrage.comment
                            ? `
                                <p>
                                    ${anfrage.comment}
                                </p>
                              `
                            : ""
                    }

                    <span>
                        Status:
                        ${anfrage.status || "-"}
                    </span>
                `;

                container.appendChild(card);
            });

        } catch (error) {

            console.error(
                "Unerwarteter Fehler bei Verstärkungsanfragen:",
                error
            );
        }
    }


    // Verstärkungsanfragen beim Start laden
    await ladeVerstaerkungsanfragen();

        // ============================================================
    // TEIL 12/12 – AKTUALISIERUNG + ABMELDEN + START
    // ============================================================

    // ------------------------------------------------------------
    // ALLE AUFTRÄGE AKTUALISIEREN
    // ------------------------------------------------------------

    async function aktualisiereAuftraege() {

        try {

            await ladeOffeneAuftraege();
            await ladeEigeneAuftraege();

        } catch (error) {

            console.error(
                "Fehler beim Aktualisieren der Aufträge:",
                error
            );
        }
    }


    // ------------------------------------------------------------
    // AKTUALISIEREN-BUTTON
    // ------------------------------------------------------------

    const refreshButton = getElement(
        "refreshOrders",
        "refreshButton",
        "auftraegeAktualisieren",
        "aktualisierenButton"
    );

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async () => {

                refreshButton.disabled = true;

                const alterText =
                    refreshButton.textContent;

                refreshButton.textContent =
                    "⏳ Aktualisiere...";

                try {

                    await aktualisiereAuftraege();

                } finally {

                    refreshButton.disabled = false;

                    refreshButton.textContent =
                        alterText || "Aktualisieren";
                }
            }
        );
    }


    // ------------------------------------------------------------
    // ABMELDEN
    // ------------------------------------------------------------

    async function abmelden() {

        try {

            const { error } =
                await supabase.auth.signOut();

            if (error) {
                throw error;
            }

            if (clockInterval) {
                clearInterval(clockInterval);
                clockInterval = null;
            }

            window.location.href =
                "registrieren.html";

        } catch (error) {

            console.error(
                "Fehler beim Abmelden:",
                error
            );

            zeigeFehler(
                "Die Abmeldung konnte nicht durchgeführt werden.\n\n" +
                (error.message || "Unbekannter Fehler")
            );
        }
    }

    // Verschiedene mögliche Logout-IDs unterstützen
    const logoutButton = getElement(
        "logoutButton",
        "abmeldenButton",
        "logout",
        "abmelden"
    );

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            abmelden
        );
    }

    // Falls das HTML onclick="abmelden()" verwendet
    window.abmelden = abmelden;


    // ------------------------------------------------------------
    // AUTOMATISCHE AKTUALISIERUNG
    // ------------------------------------------------------------

    // Alle 60 Sekunden Auftragslisten aktualisieren.
    // Dadurch werden neu eingestellte Aufträge sichtbar,
    // ohne dass die Seite komplett neu geladen werden muss.

    setInterval(
        async () => {

            try {

                await aktualisiereAuftraege();

            } catch (error) {

                console.error(
                    "Fehler bei der automatischen Aktualisierung:",
                    error
                );
            }

        },
        60000
    );


    // ------------------------------------------------------------
    // MITARBEITERPROFIL NOCH EINMAL AKTUALISIEREN
    // ------------------------------------------------------------

    ladeMitarbeiterProfil();
    aktualisiereArbeitszeitAnzeige();


    // ============================================================
    // FERTIG
    // ============================================================

    console.log(
        "EHRENMARKT Mitarbeiterbereich erfolgreich geladen."
    );

});
