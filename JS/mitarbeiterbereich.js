document.addEventListener("DOMContentLoaded", async () => {

    const supabase = window.supabaseClient;

    // =====================================================
    // BENUTZER PRÜFEN
    // =====================================================

    if (!supabase) {
        alert("Supabase konnte nicht geladen werden.");
        return;
    }

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        window.location.href = "registrieren.html";
        return;
    }


    // =====================================================
    // MITARBEITER LADEN
    // =====================================================

    const {
        data: employee,
        error: employeeError
    } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (employeeError || !employee) {
        alert("Du bist kein Mitarbeiter.");
        window.location.href = "startseite.html";
        return;
    }


    // =====================================================
    // PROFIL
    // =====================================================

    const employeeName =
        document.getElementById("employeeName");

    const employeeRole =
        document.getElementById("employeeRole");

    const employeeRank =
        document.getElementById("employeeRank");

    const employeeStatus =
        document.getElementById("employeeStatus");

    if (employeeName) {
        employeeName.textContent =
            employee.name || "-";
    }

    if (employeeRole) {
        employeeRole.textContent =
            employee.role || "-";
    }

    if (employeeRank) {
        employeeRank.textContent =
            employee.rang || "-";
    }

    if (employeeStatus) {
        employeeStatus.textContent =
            employee.is_active
                ? "Verfügbar"
                : "Nicht verfügbar";
    }


    // =====================================================
    // HILFSFUNKTIONEN
    // =====================================================

    function escapeHtml(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function zeigeFehler(text) {
        console.error(text);
        alert(text);
    }


    function zeigeErfolg(text) {
        alert(text);
    }


    function getElement(id) {
        return document.getElementById(id);
    }


    // =====================================================
    // ARBEITSZEIT – STATUS PRÜFEN
    // =====================================================

    const {
        data: activeAttendance,
        error: attendanceError
    } = await supabase
        .from("employee_attendance")
        .select("*")
        .eq("employee_id", user.id)
        .is("clock_out", null)
        .order("created_at", {
            ascending: false
        })
        .limit(1)
        .maybeSingle();


    if (attendanceError) {
        console.error(
            "Fehler beim Laden der Arbeitszeit:",
            attendanceError
        );
    }


    const workStatus =
        getElement("workStatus");

    const clockInButton =
        getElement("clockIn");

    const clockOutButton =
        getElement("clockOut");


    if (activeAttendance) {

        if (workStatus) {
            workStatus.textContent =
                "🟢 Eingestempelt";
        }

        if (clockInButton) {
            clockInButton.disabled = true;
        }

        if (clockOutButton) {
            clockOutButton.disabled = false;
        }

    } else {

        if (workStatus) {
            workStatus.textContent =
                "🔴 Ausgestempelt";
        }

        if (clockInButton) {
            clockInButton.disabled = false;
        }

        if (clockOutButton) {
            clockOutButton.disabled = true;
        }
    }


    // =====================================================
    // OFFENE AUFTRÄGE
    // =====================================================

    async function ladeOffeneAuftraege() {

        const availableOrders =
            getElement("availableOrders");

        if (!availableOrders) {
            return;
        }

        availableOrders.innerHTML = `
            <p>
                Offene Aufträge werden geladen...
            </p>
        `;


        // -------------------------------------------------
        // MATERIALBESTELLUNGEN
        // -------------------------------------------------

        const {
            data: materialOrders,
            error: materialError
        } = await supabase
            .from("orders")
            .select("*")
            .eq("status", "Offen")
            .is("employee_id", null);


        if (materialError) {

            console.error(
                "Materialbestellungen:",
                materialError
            );
        }


        // -------------------------------------------------
        // BAUAUFTRÄGE
        // -------------------------------------------------

        const {
            data: buildOrders,
            error: buildError
        } = await supabase
            .from("build_orders")
            .select("*")
            .eq("status", "Offen")
            .is("assigned_employee_id", null);


        if (buildError) {

            console.error(
                "Bauaufträge:",
                buildError
            );
        }


        // -------------------------------------------------
        // REDSTONE-AUFTRÄGE
        // -------------------------------------------------

        const {
            data: redstoneOrders,
            error: redstoneError
        } = await supabase
            .from("redstone_orders")
            .select("*")
            .eq("status", "Offen")
            .is("assigned_employee_id", null);


        if (redstoneError) {

            console.error(
                "Redstone-Aufträge:",
                redstoneError
            );
        }


        // -------------------------------------------------
        // LOGISTIKAUFTRÄGE
        // -------------------------------------------------

        const {
            data: logisticsOrders,
            error: logisticsError
        } = await supabase
            .from("logistics_orders")
            .select("*")
            .eq("status", "Offen");


        if (logisticsError) {

            console.error(
                "Logistikaufträge:",
                logisticsError
            );
        }


        // -------------------------------------------------
        // ALTE ANZEIGE LEEREN
        // -------------------------------------------------

        availableOrders.innerHTML = "";


        let openCount = 0;


        // -------------------------------------------------
        // MATERIAL
        // -------------------------------------------------

        if (
            materialOrders &&
            materialOrders.length > 0
        ) {

            materialOrders.forEach(order => {

                openCount++;

                const card =
                    document.createElement("div");

                card.className = "card";

                card.innerHTML = `

                    <h3>
                        📦 Materialbestellung #${escapeHtml(order.id)}
                    </h3>

                    <p>
                        <strong>Status:</strong>
                        ${escapeHtml(order.status || "Offen")}
                    </p>

                    ${
                        order.customer_name
                            ? `
                                <p>
                                    <strong>Auftraggeber:</strong>
                                    ${escapeHtml(order.customer_name)}
                                </p>
                              `
                            : ""
                    }

                    <div class="auftrag-buttons">

                        <button
                            type="button"
                            onclick="openMaterialOrder('${escapeHtml(order.id)}')"
                        >
                            🔎 Ansehen
                        </button>

                        <button
                            type="button"
                            onclick="acceptMaterialOrder('${escapeHtml(order.id)}', this)"
                        >
                            ✅ Auftrag annehmen
                        </button>

                    </div>

                `;

                availableOrders.appendChild(card);
            });
        }


        // -------------------------------------------------
        // BAUAUFTRÄGE
        // -------------------------------------------------

        if (
            buildOrders &&
            buildOrders.length > 0
        ) {

            buildOrders.forEach(order => {

                openCount++;

                const card =
                    document.createElement("div");

                card.className = "card";

                card.innerHTML = `

                    <h3>
                        🏗️ ${
                            escapeHtml(
                                order.building_type ||
                                order.title ||
                                "Bauauftrag"
                            )
                        }
                        #${escapeHtml(order.id)}
                    </h3>

                    <p>
                        <strong>Status:</strong>
                        ${escapeHtml(order.status || "Offen")}
                    </p>

                    ${
                        order.customer_name
                            ? `
                                <p>
                                    <strong>Auftraggeber:</strong>
                                    ${escapeHtml(order.customer_name)}
                                </p>
                              `
                            : ""
                    }

                    <div class="auftrag-buttons">

                        <button
                            type="button"
                            onclick="openBuildOrder('${escapeHtml(order.id)}')"
                        >
                            🔎 Ansehen
                        </button>

                        <button
                            type="button"
                            onclick="acceptBuildOrder('${escapeHtml(order.id)}', this)"
                        >
                            ✅ Auftrag annehmen
                        </button>

                    </div>

                `;

                availableOrders.appendChild(card);
            });
        }


        // -------------------------------------------------
        // REDSTONE
        // -------------------------------------------------

        if (
            redstoneOrders &&
            redstoneOrders.length > 0
        ) {

            redstoneOrders.forEach(order => {

                openCount++;

                const card =
                    document.createElement("div");

                card.className = "card";

                card.innerHTML = `

                    <h3>
                        🔴 ${
                            escapeHtml(
                                order.title ||
                                "Redstone-Auftrag"
                            )
                        }
                        #${escapeHtml(order.id)}
                    </h3>

                    ${
                        order.customer_name
                            ? `
                                <p>
                                    <strong>Auftraggeber:</strong>
                                    ${escapeHtml(order.customer_name)}
                                </p>
                              `
                            : ""
                    }

                    ${
                        order.redstone_build_type
                            ? `
                                <p>
                                    <strong>Redstone-Bau:</strong>
                                    ${escapeHtml(
                                        order.redstone_build_type
                                    )}
                                </p>
                              `
                            : ""
                    }

                    <p>
                        <strong>Status:</strong>
                        ${escapeHtml(order.status || "Offen")}
                    </p>

                    <div class="auftrag-buttons">

                        <button
                            type="button"
                            onclick="openRedstoneOrder('${escapeHtml(order.id)}')"
                        >
                            🔎 Ansehen
                        </button>

                        <button
                            type="button"
                            onclick="acceptRedstoneOrder('${escapeHtml(order.id)}', this)"
                        >
                            ✅ Auftrag annehmen
                        </button>

                    </div>

                `;

                availableOrders.appendChild(card);
            });
        }


        // -------------------------------------------------
        // LOGISTIK
        // -------------------------------------------------

        if (
            logisticsOrders &&
            logisticsOrders.length > 0
        ) {

            logisticsOrders.forEach(order => {

                openCount++;

                const card =
                    document.createElement("div");

                card.className = "card";

                card.innerHTML = `

                    <h3>
                        🚚 Logistikauftrag #${escapeHtml(order.id)}
                    </h3>

                    <p>
                        <strong>Auftraggeber:</strong>
                        ${escapeHtml(
                            order.customer_name || "-"
                        )}
                    </p>

                    <p>
                        <strong>Strecke:</strong>
                        ${escapeHtml(
                            order.start_point || "-"
                        )}
                        →
                        ${escapeHtml(
                            order.destination || "-"
                        )}
                    </p>

                    <p>
                        <strong>Kisten:</strong>
                        ${escapeHtml(
                            order.crate_count || 0
                        )}
                    </p>

                    <p>
                        <strong>Preis:</strong>
                        ${escapeHtml(
                            order.total_price || 0
                        )} $
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${escapeHtml(
                            order.status || "Offen"
                        )}
                    </p>

                    <div class="auftrag-buttons">

                        <button
                            type="button"
                            onclick="openLogisticsOrder('${escapeHtml(order.id)}')"
                        >
                            🔎 Ansehen
                        </button>

                        <button
                            type="button"
                            onclick="acceptLogisticsOrder('${escapeHtml(order.id)}', this)"
                        >
                            🚚 Auftrag annehmen
                        </button>

                    </div>

                `;

                availableOrders.appendChild(card);
            });
        }


        // -------------------------------------------------
        // KEINE AUFTRÄGE
        // -------------------------------------------------

        if (openCount === 0) {

            availableOrders.innerHTML = `
                <div class="card">

                    <h3>
                        Keine offenen Aufträge
                    </h3>

                    <p>
                        Aktuell stehen keine neuen
                        Aufträge zur Verfügung.
                    </p>

                </div>
            `;
        }


        // -------------------------------------------------
        // ANZAHL OFFENE AUFTRÄGE
        // -------------------------------------------------

        const openOrdersElement =
            getElement("openOrders");

        if (openOrdersElement) {
            openOrdersElement.textContent =
                openCount;
        }
    }


    // =====================================================
    // AUFTRÄGE LADEN
    // =====================================================

    await ladeOffeneAuftraege();


    // =====================================================
    // AUFTRAG ÖFFNEN – BAU
    // =====================================================

    window.openBuildOrder = function(id) {

        window.location.href =
            `bauauftrag_details.html?id=${encodeURIComponent(id)}`;
    };


    // =====================================================
    // AUFTRAG ÖFFNEN – MATERIAL
    // =====================================================

    window.openMaterialOrder = function(id) {

        window.location.href =
            `material_details.html?id=${encodeURIComponent(id)}`;
    };


    // =====================================================
    // AUFTRAG ÖFFNEN – LOGISTIK
    // =====================================================

    window.openLogisticsOrder = function(id) {

        window.location.href =
            `logistik_details.html?id=${encodeURIComponent(id)}`;
    };


    // =====================================================
    // AUFTRAG ÖFFNEN – REDSTONE
    // =====================================================

    window.openRedstoneOrder = function(id) {

        window.location.href =
            `redstone_details.html?id=${encodeURIComponent(id)}`;
    };

        // =====================================================
    // MATERIALBESTELLUNG ANNEHMEN
    // =====================================================

    window.acceptMaterialOrder = async function(id, button) {

        if (button) {
            button.disabled = true;
            button.textContent = "⏳ Wird angenommen...";
        }

        const {
            data,
            error
        } = await supabase
            .from("orders")
            .update({
                employee_id: user.id,
                employee_name: employee.name,
                status: "In Bearbeitung",
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .eq("status", "Offen")
            .is("employee_id", null)
            .select("*")
            .maybeSingle();


        if (error) {

            console.error(
                "Fehler beim Annehmen der Materialbestellung:",
                error
            );

            if (button) {
                button.disabled = false;
                button.textContent =
                    "✅ Auftrag annehmen";
            }

            zeigeFehler(
                "Die Materialbestellung konnte nicht angenommen werden.\n\n" +
                error.message
            );

            return;
        }


        if (!data) {

            if (button) {
                button.disabled = false;
                button.textContent =
                    "✅ Auftrag annehmen";
            }

            zeigeFehler(
                "Dieser Auftrag wurde bereits von einem anderen Mitarbeiter angenommen."
            );

            await ladeOffeneAuftraege();

            return;
        }


        zeigeErfolg(
            "Materialbestellung erfolgreich übernommen."
        );


        window.location.href =
            `material_details.html?id=${encodeURIComponent(id)}`;
    };


    // =====================================================
    // BAUAUFTRAG ANNEHMEN
    // =====================================================

    window.acceptBuildOrder = async function(id, button) {

        if (button) {
            button.disabled = true;
            button.textContent =
                "⏳ Wird angenommen...";
        }


        const {
            data,
            error
        } = await supabase
            .from("build_orders")
            .update({
                assigned_employee_id: user.id,
                status: "In Bearbeitung"
            })
            .eq("id", id)
            .eq("status", "Offen")
            .is("assigned_employee_id", null)
            .select("*")
            .maybeSingle();


        if (error) {

            console.error(
                "Fehler beim Annehmen des Bauauftrags:",
                error
            );

            if (button) {
                button.disabled = false;
                button.textContent =
                    "✅ Auftrag annehmen";
            }

            zeigeFehler(
                "Der Bauauftrag konnte nicht angenommen werden.\n\n" +
                error.message
            );

            return;
        }


        if (!data) {

            if (button) {
                button.disabled = false;
                button.textContent =
                    "✅ Auftrag annehmen";
            }

            zeigeFehler(
                "Dieser Bauauftrag wurde bereits von einem anderen Mitarbeiter angenommen."
            );

            await ladeOffeneAuftraege();

            return;
        }


        zeigeErfolg(
            "Bauauftrag erfolgreich übernommen."
        );


        window.location.href =
            `bauauftrag_details.html?id=${encodeURIComponent(id)}`;
    };


    // =====================================================
    // REDSTONE-AUFTRAG ANNEHMEN
    // =====================================================

    window.acceptRedstoneOrder = async function(id, button) {

        if (button) {
            button.disabled = true;
            button.textContent =
                "⏳ Wird angenommen...";
        }


        const {
            data,
            error
        } = await supabase
            .from("redstone_orders")
            .update({
                assigned_employee_id: user.id,
                status: "In Bearbeitung"
            })
            .eq("id", id)
            .eq("status", "Offen")
            .is("assigned_employee_id", null)
            .select("*")
            .maybeSingle();


        if (error) {

            console.error(
                "Fehler beim Annehmen des Redstone-Auftrags:",
                error
            );

            if (button) {
                button.disabled = false;
                button.textContent =
                    "✅ Auftrag annehmen";
            }

            zeigeFehler(
                "Der Redstone-Auftrag konnte nicht angenommen werden.\n\n" +
                error.message
            );

            return;
        }


        if (!data) {

            if (button) {
                button.disabled = false;
                button.textContent =
                    "✅ Auftrag annehmen";
            }

            zeigeFehler(
                "Dieser Redstone-Auftrag wurde bereits von einem anderen Mitarbeiter angenommen."
            );

            await ladeOffeneAuftraege();

            return;
        }


        zeigeErfolg(
            "Redstone-Auftrag erfolgreich übernommen."
        );


        window.location.href =
            `redstone_details.html?id=${encodeURIComponent(id)}`;
    };


    // =====================================================
    // LOGISTIKAUFTRAG ANNEHMEN
    // =====================================================

    // ============================================================
// LOGISTIKAUFTRAG ANNEHMEN
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

        // Aktuellen Mitarbeiter laden
        const { data: employee, error: employeeError } =
            await supabase
                .from("employees")
                .select("id, user_id, name")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .maybeSingle();

        if (employeeError) {
            throw employeeError;
        }

        if (!employee) {
            throw new Error(
                "Für deinen Account wurde kein aktiver Mitarbeiter gefunden."
            );
        }


        // Logistikauftrag übernehmen
        const { data: auftrag, error: updateError } =
            await supabase
                .from("logistics_orders")
                .update({
                    employee_id: employee.id,
                    employee_name: employee.name,
                    status: "In Bearbeitung"
                })
                .eq("id", id)
                .eq("status", "Offen")
                .is("employee_id", null)
                .select("*")
                .maybeSingle();


        if (updateError) {
            throw updateError;
        }


        // Auftrag wurde bereits von jemand anderem übernommen
        if (!auftrag) {

            throw new Error(
                "Dieser Logistikauftrag wurde bereits von einem anderen Mitarbeiter übernommen."
            );
        }


        // Erfolgsmeldung
        zeigeErfolg(
            "Logistikauftrag erfolgreich übernommen."
        );


        // Offene Aufträge neu laden
        await ladeOffeneAuftraege();


        // Eigene Aufträge neu laden
        await ladeEigeneAuftraege();


        // Kurz warten, damit die Erfolgsmeldung sichtbar bleibt
        setTimeout(() => {

            window.location.href =
                `../HTML/logistik_details.html?id=${encodeURIComponent(id)}`;

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

    // =====================================================
    // EIGENE AUFTRÄGE LADEN
    // =====================================================

    async function ladeEigeneAuftraege() {

        const myOrdersContainer =
            getElement("myOrders");

        if (!myOrdersContainer) {
            return;
        }


        myOrdersContainer.innerHTML = `
            <p>
                Eigene Aufträge werden geladen...
            </p>
        `;


        let myOrderCount = 0;


        // -------------------------------------------------
        // EIGENE MATERIALBESTELLUNGEN
        // -------------------------------------------------

        const {
            data: myMaterialOrders,
            error: myMaterialError
        } = await supabase
            .from("orders")
            .select("*")
            .eq("employee_id", user.id);


        if (myMaterialError) {

            console.error(
                "Eigene Materialbestellungen:",
                myMaterialError
            );
        }


        // -------------------------------------------------
        // EIGENE BAUAUFTRÄGE
        // -------------------------------------------------

        const {
            data: myBuildOrders,
            error: myBuildError
        } = await supabase
            .from("build_orders")
            .select("*")
            .eq("assigned_employee_id", user.id);


        if (myBuildError) {

            console.error(
                "Eigene Bauaufträge:",
                myBuildError
            );
        }


        // -------------------------------------------------
        // EIGENE REDSTONE-AUFTRÄGE
        // -------------------------------------------------

        const {
            data: myRedstoneOrders,
            error: myRedstoneError
        } = await supabase
            .from("redstone_orders")
            .select("*")
            .eq("assigned_employee_id", user.id);


        if (myRedstoneError) {

            console.error(
                "Eigene Redstone-Aufträge:",
                myRedstoneError
            );
        }


        // -------------------------------------------------
        // EIGENE LOGISTIKAUFTRÄGE
        // -------------------------------------------------

        // ================================================
// EIGENE LOGISTIKAUFTRÄGE
// ================================================

const { data: eigenerMitarbeiter, error: eigenerMitarbeiterError } =
    await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

if (eigenerMitarbeiterError) {
    console.error(
        "Fehler beim Laden des eigenen Mitarbeiters:",
        eigenerMitarbeiterError
    );
}

let myLogisticsOrders = [];

if (eigenerMitarbeiter) {

    const {
        data: logisticsOrders,
        error: myLogisticsError
    } = await supabase
        .from("logistics_orders")
        .select("*")
        .eq("employee_id", eigenerMitarbeiter.id);

    if (myLogisticsError) {

        console.error(
            "Eigene Logistikaufträge konnten nicht geladen werden:",
            myLogisticsError
        );

    } else {

        myLogisticsOrders = logisticsOrders || [];
    }
}


        // -------------------------------------------------
        // CONTAINER LEEREN
        // -------------------------------------------------

        myOrdersContainer.innerHTML = "";


        // -------------------------------------------------
        // MATERIAL ANZEIGEN
        // -------------------------------------------------

        if (
            myMaterialOrders &&
            myMaterialOrders.length > 0
        ) {

            myMaterialOrders.forEach(order => {

                myOrderCount++;

                const card =
                    document.createElement("div");

                card.className = "card";

                card.innerHTML = `

                    <h3>
                        📦 Materialbestellung
                        #${escapeHtml(order.id)}
                    </h3>

                    ${
                        order.customer_name
                            ? `
                                <p>
                                    <strong>Auftraggeber:</strong>
                                    ${escapeHtml(
                                        order.customer_name
                                    )}
                                </p>
                              `
                            : ""
                    }

                    <p>
                        <strong>Status:</strong>
                        ${escapeHtml(
                            order.status || "-"
                        )}
                    </p>

                    <div class="auftrag-buttons">

                        <button
                            type="button"
                            onclick="openMaterialOrder('${escapeHtml(order.id)}')"
                        >
                            🔎 Ansehen
                        </button>

                        ${
                            order.status !== "Abgeschlossen"
                                ? `
                                    <button
                                        type="button"
                                        onclick="finishMaterialOrder('${escapeHtml(order.id)}')"
                                    >
                                        ✅ Auftrag abschließen
                                    </button>

                                    <button
                                        type="button"
                                        onclick="requestMaterialHelp('${escapeHtml(order.id)}')"
                                    >
                                        👥 Verstärkung anfordern
                                    </button>
                                  `
                                : ""
                        }

                    </div>

                `;

                myOrdersContainer.appendChild(card);
            });
        }


        // -------------------------------------------------
        // BAU ANZEIGEN
        // -------------------------------------------------

        if (
            myBuildOrders &&
            myBuildOrders.length > 0
        ) {

            myBuildOrders.forEach(order => {

                myOrderCount++;

                const card =
                    document.createElement("div");

                card.className = "card";

                card.innerHTML = `

                    <h3>
                        🏗️ ${
                            escapeHtml(
                                order.building_type ||
                                order.title ||
                                "Bauauftrag"
                            )
                        }
                        #${escapeHtml(order.id)}
                    </h3>

                    ${
                        order.customer_name
                            ? `
                                <p>
                                    <strong>Auftraggeber:</strong>
                                    ${escapeHtml(
                                        order.customer_name
                                    )}
                                </p>
                              `
                            : ""
                    }

                    <p>
                        <strong>Status:</strong>
                        ${escapeHtml(
                            order.status || "-"
                        )}
                    </p>

                    <div class="auftrag-buttons">

                        <button
                            type="button"
                            onclick="openBuildOrder('${escapeHtml(order.id)}')"
                        >
                            🔎 Ansehen
                        </button>

                        ${
                            order.status !== "Abgeschlossen"
                                ? `
                                    <button
                                        type="button"
                                        onclick="finishBuildOrder('${escapeHtml(order.id)}')"
                                    >
                                        ✅ Auftrag abschließen
                                    </button>

                                    <button
                                        type="button"
                                        onclick="requestBuildHelp('${escapeHtml(order.id)}')"
                                    >
                                        👥 Verstärkung anfordern
                                    </button>
                                  `
                                : ""
                        }

                    </div>

                `;

                myOrdersContainer.appendChild(card);
            });
    }

            // -------------------------------------------------
        // LOGISTIK ANZEIGEN
        // -------------------------------------------------

        if (
            myLogisticsOrders &&
            myLogisticsOrders.length > 0
        ) {

            myLogisticsOrders.forEach(order => {

                myOrderCount++;

                const card =
                    document.createElement("div");

                card.className = "card";

                card.innerHTML = `

                    <h3>
                        🚚 Logistikauftrag
                        #${escapeHtml(order.id)}
                    </h3>

                    <p>
                        <strong>Auftraggeber:</strong>
                        ${escapeHtml(
                            order.customer_name || "-"
                        )}
                    </p>

                    <p>
                        <strong>Strecke:</strong>
                        ${escapeHtml(
                            order.start_point || "-"
                        )}
                        →
                        ${escapeHtml(
                            order.destination || "-"
                        )}
                    </p>

                    <p>
                        <strong>Kisten:</strong>
                        ${escapeHtml(
                            order.crate_count || 0
                        )}
                    </p>

                    <p>
                        <strong>Preis:</strong>
                        ${escapeHtml(
                            order.total_price || 0
                        )} $
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${escapeHtml(
                            order.status || "-"
                        )}
                    </p>

                    <div class="auftrag-buttons">

                        <button
                            type="button"
                            onclick="openLogisticsOrder('${escapeHtml(order.id)}')"
                        >
                            🔎 Ansehen
                        </button>

                        ${
                            order.status !== "Abgeschlossen"
                                ? `
                                    <button
                                        type="button"
                                        onclick="finishLogisticsOrder('${escapeHtml(order.id)}')"
                                    >
                                        ✅ Auftrag abschließen
                                    </button>

                                    <button
                                        type="button"
                                        onclick="requestLogisticsHelp('${escapeHtml(order.id)}')"
                                    >
                                        👥 Verstärkung anfordern
                                    </button>
                                  `
                                : ""
                        }

                    </div>

                `;

                myOrdersContainer.appendChild(card);
            });
        }


        // -------------------------------------------------
        // REDSTONE ANZEIGEN
        // -------------------------------------------------

        if (
            myRedstoneOrders &&
            myRedstoneOrders.length > 0
        ) {

            myRedstoneOrders.forEach(order => {

                myOrderCount++;

                const card =
                    document.createElement("div");

                card.className = "card";

                card.innerHTML = `

                    <h3>
                        🔴 ${
                            escapeHtml(
                                order.title ||
                                "Redstone-Auftrag"
                            )
                        }
                        #${escapeHtml(order.id)}
                    </h3>

                    ${
                        order.customer_name
                            ? `
                                <p>
                                    <strong>Auftraggeber:</strong>
                                    ${escapeHtml(
                                        order.customer_name
                                    )}
                                </p>
                              `
                            : ""
                    }

                    ${
                        order.redstone_build_type
                            ? `
                                <p>
                                    <strong>Redstone-Bau:</strong>
                                    ${escapeHtml(
                                        order.redstone_build_type
                                    )}
                                </p>
                              `
                            : ""
                    }

                    <p>
                        <strong>Status:</strong>
                        ${escapeHtml(
                            order.status || "-"
                        )}
                    </p>

                    <div class="auftrag-buttons">

                        <button
                            type="button"
                            onclick="openRedstoneOrder('${escapeHtml(order.id)}')"
                        >
                            🔎 Ansehen
                        </button>

                        ${
                            order.status !== "Abgeschlossen"
                                ? `
                                    <button
                                        type="button"
                                        onclick="finishRedstoneOrder('${escapeHtml(order.id)}')"
                                    >
                                        ✅ Auftrag abschließen
                                    </button>

                                    <button
                                        type="button"
                                        onclick="requestRedstoneHelp('${escapeHtml(order.id)}')"
                                    >
                                        👥 Verstärkung anfordern
                                    </button>
                                  `
                                : ""
                        }

                    </div>

                `;

                myOrdersContainer.appendChild(card);
            });
        }


        // -------------------------------------------------
        // KEINE EIGENEN AUFTRÄGE
        // -------------------------------------------------

        if (myOrderCount === 0) {

            myOrdersContainer.innerHTML = `

                <div class="card">

                    <h3>
                        Keine eigenen Aufträge
                    </h3>

                    <p>
                        Du hast aktuell keine
                        übernommenen Aufträge.
                    </p>

                </div>

            `;
        }


        // -------------------------------------------------
        // MEINE AUFTRÄGE – ANZAHL
        // -------------------------------------------------

        const myOrderCountElement =
            getElement("myOrderCount");

        if (myOrderCountElement) {

            myOrderCountElement.textContent =
                myOrderCount;
        }
    }


    // =====================================================
    // EIGENE AUFTRÄGE STARTEN
    // =====================================================

    await ladeEigeneAuftraege();


    // =====================================================
    // MATERIALBESTELLUNG ABSCHLIESSEN
    // =====================================================

    window.finishMaterialOrder = async function(id) {

        if (!confirm(
            "Materialbestellung wirklich abschließen?"
        )) {
            return;
        }


        const {
            error
        } = await supabase
            .from("orders")
            .update({
                status: "Abgeschlossen",
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .eq("employee_id", user.id);


        if (error) {

            console.error(
                "Fehler beim Abschließen:",
                error
            );

            zeigeFehler(
                "Die Materialbestellung konnte nicht abgeschlossen werden.\n\n" +
                error.message
            );

            return;
        }


        zeigeErfolg(
            "Materialbestellung erfolgreich abgeschlossen."
        );

        await ladeEigeneAuftraege();
    };


    // =====================================================
    // BAUAUFTRAG ABSCHLIESSEN
    // =====================================================

    window.finishBuildOrder = async function(id) {

        if (!confirm(
            "Bauauftrag wirklich abschließen?"
        )) {
            return;
        }


        const {
            error
        } = await supabase
            .from("build_orders")
            .update({
                status: "Abgeschlossen"
            })
            .eq("id", id)
            .eq("assigned_employee_id", user.id);


        if (error) {

            console.error(
                "Fehler beim Abschließen:",
                error
            );

            zeigeFehler(
                "Der Bauauftrag konnte nicht abgeschlossen werden.\n\n" +
                error.message
            );

            return;
        }


        zeigeErfolg(
            "Bauauftrag erfolgreich abgeschlossen."
        );

        await ladeEigeneAuftraege();
    };


    // =====================================================
    // LOGISTIKAUFTRAG ABSCHLIESSEN
    // =====================================================

    // ============================================================
// LOGISTIKAUFTRAG ABSCHLIESSEN
// ============================================================

window.finishLogisticsOrder = async function(id) {

    if (!confirm(
        "Logistikauftrag wirklich abschließen?"
    )) {
        return;
    }

    if (!id) {
        zeigeFehler(
            "Die Auftrags-ID fehlt."
        );
        return;
    }

    try {

        const { data: auftrag, error } =
            await supabase
                .from("logistics_orders")
                .update({
                    status: "Abgeschlossen"
                })
                .eq("id", id)
                .select("*")
                .maybeSingle();


        if (error) {

            console.error(
                "Fehler beim Abschließen des Logistikauftrags:",
                error
            );

            zeigeFehler(
                "Der Logistikauftrag konnte nicht abgeschlossen werden.\n\n" +
                error.message
            );

            return;
        }


        if (!auftrag) {

            zeigeFehler(
                "Der Logistikauftrag wurde nicht gefunden."
            );

            return;
        }


        zeigeErfolg(
            "Logistikauftrag erfolgreich abgeschlossen."
        );


        // Eigene Aufträge neu laden
        await ladeEigeneAuftraege();


        // Offene Aufträge aktualisieren
        await ladeOffeneAuftraege();

    } catch (error) {

        console.error(
            "Unerwarteter Fehler beim Abschließen:",
            error
        );

        zeigeFehler(
            "Der Logistikauftrag konnte nicht abgeschlossen werden.\n\n" +
            (error.message || "Unbekannter Fehler")
        );
    }
};


    // =====================================================
    // REDSTONE-AUFTRAG ABSCHLIESSEN
    // =====================================================

    window.finishRedstoneOrder = async function(id) {

        if (!confirm(
            "Redstone-Auftrag wirklich abschließen?"
        )) {
            return;
        }


        const {
            error
        } = await supabase
            .from("redstone_orders")
            .update({
                status: "Abgeschlossen"
            })
            .eq("id", id)
            .eq("assigned_employee_id", user.id);


        if (error) {

            console.error(
                "Fehler beim Abschließen:",
                error
            );

            zeigeFehler(
                "Der Redstone-Auftrag konnte nicht abgeschlossen werden.\n\n" +
                error.message
            );

            return;
        }


        zeigeErfolg(
            "Redstone-Auftrag erfolgreich abgeschlossen."
        );

        await ladeEigeneAuftraege();
    };


    // =====================================================
    // VERSTÄRKUNG – MATERIAL
    // =====================================================

    window.requestMaterialHelp = async function(orderId) {

        const comment =
            prompt(
                "Warum benötigst du Verstärkung?"
            );


        if (comment === null) {
            return;
        }


        const {
            error
        } = await supabase
            .from("employee_help_requests")
            .insert({
                employee_id: user.id,
                order_type: "Material",
                order_id: orderId,
                status: "Offen",
                comment: comment,
                reward_share: 0
            });


        if (error) {

            console.error(
                "Fehler bei Verstärkungsanfrage:",
                error
            );

            zeigeFehler(
                "Die Verstärkungsanfrage konnte nicht erstellt werden.\n\n" +
                error.message
            );

            return;
        }


        zeigeErfolg(
            "Verstärkung erfolgreich angefordert."
        );
    };


    // =====================================================
    // VERSTÄRKUNG – BAUAUFTRAG
    // =====================================================

    window.requestBuildHelp = async function(orderId) {

        const comment =
            prompt(
                "Warum benötigst du Verstärkung?"
            );


        if (comment === null) {
            return;
        }


        const {
            error
        } = await supabase
            .from("employee_help_requests")
            .insert({
                employee_id: user.id,
                order_type: "Bauauftrag",
                order_id: orderId,
                status: "Offen",
                comment: comment,
                reward_share: 0
            });


        if (error) {

            console.error(
                "Fehler bei Verstärkungsanfrage:",
                error
            );

            zeigeFehler(
                "Die Verstärkungsanfrage konnte nicht erstellt werden.\n\n" +
                error.message
            );

            return;
        }


        zeigeErfolg(
            "Verstärkung erfolgreich angefordert."
        );
    };

                              // =====================================================
    // VERSTÄRKUNG – LOGISTIK
    // =====================================================

    window.requestLogisticsHelp = async function(orderId) {

        const comment =
            prompt(
                "Warum benötigst du Verstärkung?"
            );


        if (comment === null) {
            return;
        }


        const {
            error
        } = await supabase
            .from("employee_help_requests")
            .insert({
                employee_id: user.id,
                order_type: "Logistik",
                order_id: orderId,
                status: "Offen",
                comment: comment,
                reward_share: 0
            });


        if (error) {

            console.error(
                "Fehler bei Verstärkungsanfrage:",
                error
            );

            zeigeFehler(
                "Die Verstärkungsanfrage konnte nicht erstellt werden.\n\n" +
                error.message
            );

            return;
        }


        zeigeErfolg(
            "Verstärkung erfolgreich angefordert."
        );
    };


    // =====================================================
    // VERSTÄRKUNG – REDSTONE
    // =====================================================

    window.requestRedstoneHelp = async function(orderId) {

        const comment =
            prompt(
                "Warum benötigst du Verstärkung?"
            );


        if (comment === null) {
            return;
        }


        const {
            error
        } = await supabase
            .from("employee_help_requests")
            .insert({
                employee_id: user.id,
                order_type: "Redstone",
                order_id: orderId,
                status: "Offen",
                comment: comment,
                reward_share: 0
            });


        if (error) {

            console.error(
                "Fehler bei Verstärkungsanfrage:",
                error
            );

            zeigeFehler(
                "Die Verstärkungsanfrage konnte nicht erstellt werden.\n\n" +
                error.message
            );

            return;
        }


        zeigeErfolg(
            "Verstärkung erfolgreich angefordert."
        );
    };


    // =====================================================
    // OFFENE VERSTÄRKUNGSANFRAGEN LADEN
    // =====================================================

    async function ladeOffeneVerstaerkung() {

        const helpContainer =
            getElement("helpRequests");


        if (!helpContainer) {
            return;
        }


        helpContainer.innerHTML = `
            <p>
                Verstärkungsanfragen werden geladen...
            </p>
        `;


        const {
            data: helpRequests,
            error
        } = await supabase
            .from("employee_help_requests")
            .select("*")
            .eq("status", "Offen")
            .order("created_at", {
                ascending: false
            });


        if (error) {

            console.error(
                "Fehler beim Laden der Verstärkungsanfragen:",
                error
            );

            helpContainer.innerHTML = `
                <div class="card">
                    <p>
                        Verstärkungsanfragen konnten
                        nicht geladen werden.
                    </p>
                </div>
            `;

            return;
        }


        helpContainer.innerHTML = "";


        if (
            !helpRequests ||
            helpRequests.length === 0
        ) {

            helpContainer.innerHTML = `
                <div class="card">

                    <h3>
                        Keine offenen Anfragen
                    </h3>

                    <p>
                        Aktuell benötigt kein Mitarbeiter
                        Verstärkung.
                    </p>

                </div>
            `;

            return;
        }


        helpRequests.forEach(request => {

            const card =
                document.createElement("div");

            card.className = "card";


            card.innerHTML = `

                <h3>
                    🤝 ${
                        escapeHtml(
                            request.order_type ||
                            "Auftrag"
                        )
                    }
                    #${escapeHtml(
                        request.order_id
                    )}
                </h3>

                <p>
                    <strong>Nachricht:</strong>
                    ${escapeHtml(
                        request.comment ||
                        "Keine Beschreibung."
                    )}
                </p>

                <button
                    type="button"
                    onclick="acceptHelpRequest('${escapeHtml(request.id)}')"
                >
                    🤝 Ich helfe
                </button>

            `;


            helpContainer.appendChild(card);
        });
    }


    // =====================================================
    // VERSTÄRKUNGSANFRAGE ANNEHMEN
    // =====================================================

    window.acceptHelpRequest = async function(id) {

        const {
            error
        } = await supabase
            .from("employee_help_requests")
            .update({
                helper_id: user.id,
                status: "Angenommen"
            })
            .eq("id", id)
            .eq("status", "Offen");


        if (error) {

            console.error(
                "Fehler beim Annehmen der Verstärkung:",
                error
            );

            zeigeFehler(
                "Die Verstärkungsanfrage konnte nicht angenommen werden.\n\n" +
                error.message
            );

            return;
        }


        zeigeErfolg(
            "Du unterstützt jetzt diesen Auftrag."
        );


        await ladeOffeneVerstaerkung();
    };


    // =====================================================
    // EINSTEMPELN
    // =====================================================

    if (clockInButton) {

        clockInButton.addEventListener(
            "click",
            async () => {

                clockInButton.disabled = true;


                const {
                    error
                } = await supabase
                    .from("employee_attendance")
                    .insert({
                        employee_id: user.id,
                        clock_in:
                            new Date().toISOString()
                    });


                if (error) {

                    console.error(
                        "Fehler beim Einstempeln:",
                        error
                    );

                    clockInButton.disabled = false;

                    zeigeFehler(
                        "Einstempeln nicht möglich.\n\n" +
                        error.message
                    );

                    return;
                }


                if (workStatus) {
                    workStatus.textContent =
                        "🟢 Eingestempelt";
                }


                if (clockOutButton) {
                    clockOutButton.disabled =
                        false;
                }


                zeigeErfolg(
                    "Du wurdest erfolgreich eingestempelt."
                );
            }
        );
    }


    // =====================================================
    // AUSSTEMPELN
    // =====================================================

    if (clockOutButton) {

        clockOutButton.addEventListener(
            "click",
            async () => {

                clockOutButton.disabled = true;


                const {
                    data: attendance,
                    error: attendanceLoadError
                } = await supabase
                    .from("employee_attendance")
                    .select("*")
                    .eq("employee_id", user.id)
                    .is("clock_out", null)
                    .order("created_at", {
                        ascending: false
                    })
                    .limit(1)
                    .maybeSingle();


                if (attendanceLoadError) {

                    console.error(
                        "Fehler beim Laden der Arbeitszeit:",
                        attendanceLoadError
                    );

                    clockOutButton.disabled = false;

                    zeigeFehler(
                        "Die aktuelle Arbeitszeit konnte nicht geladen werden.\n\n" +
                        attendanceLoadError.message
                    );

                    return;
                }


                if (!attendance) {

                    clockOutButton.disabled = true;

                    if (clockInButton) {
                        clockInButton.disabled = false;
                    }

                    if (workStatus) {
                        workStatus.textContent =
                            "🔴 Ausgestempelt";
                    }

                    zeigeFehler(
                        "Du bist aktuell nicht eingestempelt."
                    );

                    return;
                }


                const clockOut =
                    new Date();


                const workedMinutes =
                    Math.max(
                        0,
                        Math.floor(
                            (
                                clockOut -
                                new Date(
                                    attendance.clock_in
                                )
                            ) / 60000
                        )
                    );


                const {
                    error: clockOutError
                } = await supabase
                    .from("employee_attendance")
                    .update({
                        clock_out:
                            clockOut.toISOString(),
                        worked_minutes:
                            workedMinutes
                    })
                    .eq("id", attendance.id);


                if (clockOutError) {

                    console.error(
                        "Fehler beim Ausstempeln:",
                        clockOutError
                    );

                    clockOutButton.disabled =
                        false;

                    zeigeFehler(
                        "Ausstempeln nicht möglich.\n\n" +
                        clockOutError.message
                    );

                    return;
                }


                if (workStatus) {
                    workStatus.textContent =
                        "🔴 Ausgestempelt";
                }


                if (clockInButton) {
                    clockInButton.disabled =
                        false;
                }


                clockOutButton.disabled =
                    true;


                zeigeErfolg(
                    `Arbeitszeit beendet. Gearbeitet: ${workedMinutes} Minuten.`
                );
            }
        );
    }


    // =====================================================
    // ABWESENHEIT SPEICHERN
    // =====================================================

    const saveAbsenceButton =
        getElement("saveAbsence");


    if (saveAbsenceButton) {

        saveAbsenceButton.addEventListener(
            "click",
            async () => {

                const reasonElement =
                    getElement("absenceReason");

                const dateFromElement =
                    getElement("absenceFrom");

                const dateToElement =
                    getElement("absenceTo");

                const commentElement =
                    getElement("absenceComment");


                const reason =
                    reasonElement
                        ? reasonElement.value
                        : "";

                const dateFrom =
                    dateFromElement
                        ? dateFromElement.value
                        : "";

                const dateTo =
                    dateToElement
                        ? dateToElement.value
                        : "";

                const comment =
                    commentElement
                        ? commentElement.value
                        : "";


                if (!dateFrom || !dateTo) {

                    zeigeFehler(
                        "Bitte Von- und Bis-Datum auswählen."
                    );

                    return;
                }


                if (dateFrom > dateTo) {

                    zeigeFehler(
                        "Das Bis-Datum darf nicht vor dem Von-Datum liegen."
                    );

                    return;
                }


                saveAbsenceButton.disabled =
                    true;


                const {
                    error
                } = await supabase
                    .from("employee_absences")
                    .insert({
                        employee_id: user.id,
                        reason: reason,
                        date_from: dateFrom,
                        date_to: dateTo,
                        comment: comment,
                        status: "Offen"
                    });


                if (error) {

                    console.error(
                        "Fehler beim Speichern der Abwesenheit:",
                        error
                    );

                    saveAbsenceButton.disabled =
                        false;

                    zeigeFehler(
                        "Die Abwesenheit konnte nicht gespeichert werden.\n\n" +
                        error.message
                    );

                    return;
                }


                if (commentElement) {
                    commentElement.value = "";
                }


                saveAbsenceButton.disabled =
                    false;


                zeigeErfolg(
                    "Abwesenheit erfolgreich gespeichert."
                );
            }
        );
                }

                              // =====================================================
    // MITARBEITER-VERFÜGBARKEIT AKTUALISIEREN
    // =====================================================

    async function aktualisiereMitarbeiterStatus() {

        const statusElement =
            getElement("employeeStatus");

        const {
            data: currentEmployee,
            error
        } = await supabase
            .from("employees")
            .select("is_active, is_available")
            .eq("user_id", user.id)
            .maybeSingle();


        if (error) {

            console.error(
                "Fehler beim Laden des Mitarbeiterstatus:",
                error
            );

            return;
        }


        if (!currentEmployee) {
            return;
        }


        if (statusElement) {

            if (!currentEmployee.is_active) {

                statusElement.textContent =
                    "Nicht verfügbar";

            } else if (currentEmployee.is_available) {

                statusElement.textContent =
                    "Verfügbar";

            } else {

                statusElement.textContent =
                    "Nicht verfügbar";
            }
        }
    }


    // =====================================================
    // VERFÜGBARKEIT EIN/AUS
    // =====================================================

    const availabilityButton =
        getElement("availabilityButton");


    if (availabilityButton) {

        availabilityButton.addEventListener(
            "click",
            async () => {

                const {
                    data: currentEmployee,
                    error: loadError
                } = await supabase
                    .from("employees")
                    .select("is_available, is_active")
                    .eq("user_id", user.id)
                    .maybeSingle();


                if (loadError || !currentEmployee) {

                    zeigeFehler(
                        "Der Mitarbeiterstatus konnte nicht geladen werden."
                    );

                    return;
                }


                if (!currentEmployee.is_active) {

                    zeigeFehler(
                        "Dein Mitarbeiterkonto ist momentan deaktiviert."
                    );

                    return;
                }


                availabilityButton.disabled =
                    true;


                const newAvailability =
                    !currentEmployee.is_available;


                const {
                    error
                } = await supabase
                    .from("employees")
                    .update({
                        is_available:
                            newAvailability
                    })
                    .eq("user_id", user.id);


                if (error) {

                    console.error(
                        "Fehler beim Ändern der Verfügbarkeit:",
                        error
                    );

                    availabilityButton.disabled =
                        false;

                    zeigeFehler(
                        "Die Verfügbarkeit konnte nicht geändert werden.\n\n" +
                        error.message
                    );

                    return;
                }


                availabilityButton.disabled =
                    false;


                await aktualisiereMitarbeiterStatus();


                if (newAvailability) {

                    zeigeErfolg(
                        "Du bist jetzt als verfügbar eingetragen."
                    );

                } else {

                    zeigeErfolg(
                        "Du bist jetzt als nicht verfügbar eingetragen."
                    );
                }
            }
        );
    }


    // =====================================================
    // MITARBEITERSTATUS AKTUALISIEREN
    // =====================================================

    await aktualisiereMitarbeiterStatus();


    // =====================================================
    // OFFENE AUFTRÄGE MANUELL AKTUALISIEREN
    // =====================================================

    const refreshOrdersButton =
        getElement("refreshOrders");


    if (refreshOrdersButton) {

        refreshOrdersButton.addEventListener(
            "click",
            async () => {

                refreshOrdersButton.disabled =
                    true;

                refreshOrdersButton.textContent =
                    "⏳ Laden...";


                try {

                    await ladeOffeneAuftraege();

                } catch (error) {

                    console.error(
                        "Fehler beim Aktualisieren der Aufträge:",
                        error
                    );

                    zeigeFehler(
                        "Die offenen Aufträge konnten nicht aktualisiert werden."
                    );

                }


                refreshOrdersButton.disabled =
                    false;

                refreshOrdersButton.textContent =
                    "🔄 Aufträge aktualisieren";
            }
        );
    }


    // =====================================================
    // VERSTÄRKUNGSANFRAGEN MANUELL AKTUALISIEREN
    // =====================================================

    const refreshHelpButton =
        getElement("refreshHelp");


    if (refreshHelpButton) {

        refreshHelpButton.addEventListener(
            "click",
            async () => {

                refreshHelpButton.disabled =
                    true;

                refreshHelpButton.textContent =
                    "⏳ Laden...";


                try {

                    await ladeOffeneVerstaerkung();

                } catch (error) {

                    console.error(
                        "Fehler beim Aktualisieren der Verstärkung:",
                        error
                    );

                    zeigeFehler(
                        "Die Verstärkungsanfragen konnten nicht aktualisiert werden."
                    );
                }


                refreshHelpButton.disabled =
                    false;

                refreshHelpButton.textContent =
                    "🔄 Anfragen aktualisieren";
            }
        );
    }


    // =====================================================
    // AUTOMATISCHE AKTUALISIERUNG
    // =====================================================

    let aktualisierungsTimer = null;


    async function aktualisiereMitarbeiterbereich() {

        try {

            await Promise.allSettled([
                ladeOffeneAuftraege(),
                ladeEigeneAuftraege(),
                ladeOffeneVerstaerkung(),
                aktualisiereMitarbeiterStatus()
            ]);

        } catch (error) {

            console.error(
                "Fehler bei der automatischen Aktualisierung:",
                error
            );
        }
    }


    aktualisierungsTimer =
        setInterval(
            aktualisiereMitarbeiterbereich,
            60000
        );


    // =====================================================
    // GLOBALER ZUGRIFF AUF AUFTRAGS-AKTUALISIERUNG
    // =====================================================

    window.ehrenmarktOffeneAuftraegeAktualisieren =
        ladeOffeneAuftraege;


    window.ehrenmarktEigeneAuftraegeAktualisieren =
        ladeEigeneAuftraege;


    window.ehrenmarktVerstaerkungAktualisieren =
        ladeOffeneVerstaerkung;


    // =====================================================
    // SEITEN-VERLASSEN
    // =====================================================

    window.addEventListener(
        "beforeunload",
        () => {

            if (aktualisierungsTimer) {

                clearInterval(
                    aktualisierungsTimer
                );

                aktualisierungsTimer =
                    null;
            }
        }
    );


    // =====================================================
    // ABSCHLIESSENDE INITIALISIERUNG
    // =====================================================

    await Promise.allSettled([

        ladeOffeneAuftraege(),

        ladeEigeneAuftraege(),

        ladeOffeneVerstaerkung(),

        aktualisiereMitarbeiterStatus()

    ]);


    console.log(
        "EHRENMARKT Mitarbeiterbereich erfolgreich gestartet."
    );

});

// =====================================================
// ENDE MITARBEITERBEREICH – TEIL 6
// =====================================================
//
// Dieser Bereich ist absichtlich als eigener Block
// vorbereitet, damit die folgenden Funktionen aus
// Teil 7 und Teil 8 sauber darunter ergänzt werden.
// =====================================================


// =====================================================
// SICHERHEIT: AKTUELLEN MITARBEITER PRÜFEN
// =====================================================

async function pruefeAktuellenMitarbeiter() {

    const {
        data: currentUser,
        error: userError
    } = await supabase.auth.getUser();


    if (userError || !currentUser) {

        console.error(
            "Benutzer konnte nicht geprüft werden:",
            userError
        );

        return false;
    }


    if (currentUser.user.id !== user.id) {

        console.error(
            "Benutzer-ID stimmt nicht überein."
        );

        return false;
    }


    const {
        data: currentEmployee,
        error: employeeError
    } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();


    if (employeeError || !currentEmployee) {

        console.error(
            "Mitarbeiter konnte nicht gefunden werden:",
            employeeError
        );

        return false;
    }


    if (!currentEmployee.is_active) {

        zeigeFehler(
            "Dein Mitarbeiterkonto ist momentan deaktiviert."
        );

        return false;
    }


    return true;
}


// =====================================================
// AUFTRAG ANSEHEN – ALLGEMEINE FUNKTION
// =====================================================

window.ehrenmarktAuftragAnsehen = function(
    typ,
    id
) {

    if (!typ || !id) {
        return;
    }


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


        default:

            console.error(
                "Unbekannter Auftragstyp:",
                typ
            );

            break;
    }
};


// =====================================================
// AUFTRAGSTYP LESBAR MACHEN
// =====================================================

function auftragTypName(typ) {

    switch (typ) {

        case "Material":
            return "Materialbestellung";

        case "Bauauftrag":
            return "Bauauftrag";

        case "Logistik":
            return "Logistikauftrag";

        case "Redstone":
            return "Redstone-Auftrag";

        default:
            return "Auftrag";
    }
}


// =====================================================
// STATUS LESBAR MACHEN
// =====================================================

function statusName(status) {

    if (!status) {
        return "Unbekannt";
    }


    switch (status) {

        case "Offen":
        case "offen":
            return "Offen";

        case "In Bearbeitung":
            return "In Bearbeitung";

        case "Abgeschlossen":
            return "Abgeschlossen";

        case "Storniert":
            return "Storniert";

        default:
            return status;
    }
}


// =====================================================
// STATUS-KLASSE
// =====================================================

function statusKlasse(status) {

    switch (status) {

        case "Offen":
        case "offen":
            return "offen";

        case "In Bearbeitung":
            return "bearbeitung";

        case "Abgeschlossen":
            return "abgeschlossen";

        case "Storniert":
            return "storniert";

        default:
            return "unbekannt";
    }
}


// =====================================================
// AUFTRAGSDATEN FORMATIEREN
// =====================================================

function formatiereAuftragsdatum(datum) {

    if (!datum) {
        return "-";
    }


    try {

        return new Date(datum)
            .toLocaleString(
                "de-DE",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );

    } catch (error) {

        return "-";
    }
}


// =====================================================
// GELDBETRAG FORMATIEREN
// =====================================================

function formatierePreis(preis) {

    if (
        preis === null ||
        preis === undefined ||
        preis === ""
    ) {
        return "0 $";
    }


    const zahl =
        Number(preis);


    if (Number.isNaN(zahl)) {
        return `${escapeHtml(preis)} $`;
    }


    return `${zahl.toLocaleString("de-DE")} $`;
}


// =====================================================
// AUFTRAGSKARTE – SICHERE BASIS
// =====================================================

function erstelleAuftragsCard(
    typ,
    order,
    optionen = {}
) {

    const card =
        document.createElement("div");

    card.className = "card";


    const titel =
        optionen.titel ||
        `${auftragTypName(typ)} #${order.id}`;


    const status =
        statusName(order.status);


    const statusClass =
        statusKlasse(order.status);


    card.innerHTML = `

        <div class="auftrag-card-header">

            <h3>
                ${escapeHtml(titel)}
            </h3>

            <span
                class="auftrag-status ${escapeHtml(statusClass)}"
            >
                ${escapeHtml(status)}
            </span>

        </div>

        ${
            optionen.beschreibung
                ? `
                    <p>
                        ${escapeHtml(
                            optionen.beschreibung
                        )}
                    </p>
                  `
                : ""
        }

        ${
            optionen.auftraggeber
                ? `
                    <p>
                        <strong>Auftraggeber:</strong>
                        ${escapeHtml(
                            optionen.auftraggeber
                        )}
                    </p>
                  `
                : ""
        }

        ${
            optionen.preis !== undefined
                ? `
                    <p>
                        <strong>Preis:</strong>
                        ${formatierePreis(
                            optionen.preis
                        )}
                    </p>
                  `
                : ""
        }

        <div class="auftrag-buttons">

            <button
                type="button"
                onclick="ehrenmarktAuftragAnsehen(
                    '${escapeHtml(typ)}',
                    '${escapeHtml(order.id)}'
                )"
            >
                🔎 Ansehen
            </button>

            ${
                optionen.annahme === true
                    ? `
                        <button
                            type="button"
                            onclick="${escapeHtml(
                                optionen.annahmeFunktion || ""
                            )}(
                                '${escapeHtml(order.id)}',
                                this
                            )"
                        >
                            ✅ Auftrag annehmen
                        </button>
                      `
                    : ""
            }

        </div>
    `;


    return card;
}


// =====================================================
// AUFTRAGSDATEN PRÜFEN
// =====================================================

function istGueltigeAuftragsId(id) {

    return (
        id !== null &&
        id !== undefined &&
        String(id).trim() !== ""
    );
}


// =====================================================
// DOPPELTE KLICKS VERHINDERN
// =====================================================

const laufendeAuftraege =
    new Set();


function auftragIstInBearbeitung(id) {

    return laufendeAuftraege.has(
        String(id)
    );
}


function setzeAuftragInBearbeitung(id) {

    laufendeAuftraege.add(
        String(id)
    );
}


function entferneAuftragAusBearbeitung(id) {

    laufendeAuftraege.delete(
        String(id)
    );
}


// =====================================================
// AUFTRAG-AKTION SICHER STARTEN
// =====================================================

async function starteAuftragsAktion(
    id,
    button,
    funktion
) {

    if (!istGueltigeAuftragsId(id)) {

        zeigeFehler(
            "Ungültige Auftrags-ID."
        );

        return;
    }


    if (auftragIstInBearbeitung(id)) {
        return;
    }


    setzeAuftragInBearbeitung(id);


    if (button) {

        button.disabled = true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "⏳ Wird bearbeitet...";
    }


    try {

        await funktion();

    } catch (error) {

        console.error(
            "Fehler bei der Auftragsaktion:",
            error
        );

        zeigeFehler(
            "Die Aktion konnte nicht ausgeführt werden.\n\n" +
            (error.message || error)
        );

    } finally {

        entferneAuftragAusBearbeitung(id);

        if (button) {

            button.disabled = false;

            button.textContent =
                button.dataset.originalText ||
                "✅ Auftrag annehmen";
        }
    }
    }

// ============================================================
// TEIL 7/8 – WEITERE HILFSFUNKTIONEN
// ============================================================

// ------------------------------------------------------------
// Mitarbeiterdaten erneut laden
// ------------------------------------------------------------

async function ladeAktuellenMitarbeiter() {
    if (!supabase || !user) {
        return null;
    }

    try {
        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

        if (error) {
            console.error("Fehler beim Laden des Mitarbeiters:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Fehler bei ladeAktuellenMitarbeiter:", error);
        return null;
    }
}


// ------------------------------------------------------------
// Prüfen, ob der aktuelle Benutzer Mitarbeiter ist
// ------------------------------------------------------------

async function pruefeAktuellenMitarbeiter() {
    const mitarbeiter = await ladeAktuellenMitarbeiter();

    if (!mitarbeiter) {
        zeigeFehler(
            "Für dein Konto wurde kein aktiver Mitarbeiter-Eintrag gefunden."
        );
        return false;
    }

    return true;
}


// ------------------------------------------------------------
// Auftrag ansehen
// ------------------------------------------------------------

function ehrenmarktAuftragAnsehen(typ, id) {
    if (!id) {
        zeigeFehler("Die Auftrags-ID fehlt.");
        return;
    }

    let ziel = null;

    switch (typ) {
        case "bau":
            ziel = `../HTML/bauauftrag_details.html?id=${encodeURIComponent(id)}`;
            break;

        case "material":
            ziel = `../HTML/material_details.html?id=${encodeURIComponent(id)}`;
            break;

        case "redstone":
            ziel = `../HTML/redstone_details.html?id=${encodeURIComponent(id)}`;
            break;

        case "logistik":
            ziel = `../HTML/logistik_details.html?id=${encodeURIComponent(id)}`;
            break;

        default:
            zeigeFehler("Unbekannter Auftragstyp.");
            return;
    }

    window.location.href = ziel;
}


// ------------------------------------------------------------
// Auftragstyp lesbar machen
// ------------------------------------------------------------

function auftragTypName(typ) {
    switch (typ) {
        case "bau":
            return "Bauauftrag";

        case "material":
            return "Materialauftrag";

        case "redstone":
            return "Redstone-Auftrag";

        case "logistik":
            return "Logistikauftrag";

        default:
            return "Auftrag";
    }
}


// ------------------------------------------------------------
// Status lesbar machen
// ------------------------------------------------------------

function statusName(status) {
    if (!status) {
        return "Unbekannt";
    }

    switch (String(status).toLowerCase()) {
        case "offen":
            return "Offen";

        case "in bearbeitung":
            return "In Bearbeitung";

        case "angenommen":
            return "Angenommen";

        case "abgeschlossen":
            return "Abgeschlossen";

        case "storniert":
            return "Storniert";

        case "abgelehnt":
            return "Abgelehnt";

        default:
            return status;
    }
}


// ------------------------------------------------------------
// Status-Klasse für Anzeige
// ------------------------------------------------------------

function statusKlasse(status) {
    if (!status) {
        return "status-unbekannt";
    }

    switch (String(status).toLowerCase()) {
        case "offen":
            return "status-offen";

        case "in bearbeitung":
            return "status-bearbeitung";

        case "angenommen":
            return "status-angenommen";

        case "abgeschlossen":
            return "status-abgeschlossen";

        case "storniert":
            return "status-storniert";

        case "abgelehnt":
            return "status-abgelehnt";

        default:
            return "status-unbekannt";
    }
}


// ------------------------------------------------------------
// Datum formatieren
// ------------------------------------------------------------

function formatiereDatum(datum) {
    if (!datum) {
        return "Kein Datum";
    }

    const wert = new Date(datum);

    if (Number.isNaN(wert.getTime())) {
        return "Kein gültiges Datum";
    }

    return wert.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


// ------------------------------------------------------------
// Geldbetrag formatieren
// ------------------------------------------------------------

function formatierePreis(preis) {
    if (
        preis === null ||
        preis === undefined ||
        preis === ""
    ) {
        return "0 $";
    }

    const zahl = Number(preis);

    if (Number.isNaN(zahl)) {
        return "0 $";
    }

    return zahl.toLocaleString("de-DE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }) + " $";
}


// ------------------------------------------------------------
// Sichere ID-Prüfung
// ------------------------------------------------------------

function istGueltigeAuftragsId(id) {
    if (
        id === null ||
        id === undefined ||
        id === ""
    ) {
        return false;
    }

    return String(id).trim().length > 0;
}


// ------------------------------------------------------------
// Doppelklick auf Annahme verhindern
// ------------------------------------------------------------

function sperreAuftragsButton(button) {
    if (!button) {
        return;
    }

    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "Wird angenommen...";
}


// ------------------------------------------------------------
// Button wieder freigeben
// ------------------------------------------------------------

function entsperreAuftragsButton(button) {
    if (!button) {
        return;
    }

    button.disabled = false;

    if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
    }
}


// ------------------------------------------------------------
// Auftrag erfolgreich angenommen
// ------------------------------------------------------------

function zeigeAuftragAngenommen(typ) {
    const name = auftragTypName(typ);

    zeigeErfolg(
        `${name} wurde erfolgreich angenommen.`
    );
}


// ------------------------------------------------------------
// Offene Aufträge nach Annahme neu laden
// ------------------------------------------------------------

async function aktualisiereOffeneAuftraegeNachAnnahme() {
    try {
        await ladeOffeneAuftraege();
    } catch (error) {
        console.error(
            "Fehler beim Aktualisieren der offenen Aufträge:",
            error
        );
    }
}


// ------------------------------------------------------------
// Globale Funktion für manuelle Aktualisierung
// ------------------------------------------------------------

window.ehrenmarktAuftraegeAktualisieren = async function () {
    await ladeOffeneAuftraege();
};


// ------------------------------------------------------------
// Globale Funktion zum Anzeigen eines Auftrags
// ------------------------------------------------------------

window.ehrenmarktAuftragAnsehen = function (typ, id) {
    ehrenmarktAuftragAnsehen(typ, id);
};


// ------------------------------------------------------------
// Globale Funktion zum Annehmen eines Auftrags
// ------------------------------------------------------------

window.ehrenmarktAuftragAnnehmen = async function (
    typ,
    id,
    button
) {
    await uebernehmeOffenenAuftrag(
        typ,
        id,
        button
    );
};


// ============================================================
// ENDE TEIL 7/8
// ============================================================

// ============================================================
// TEIL 8/8 – ABSCHLUSS UND START
// ============================================================

// ------------------------------------------------------------
// Letzte Aktualisierung beim Öffnen des Mitarbeiterbereichs
// ------------------------------------------------------------

try {
    await Promise.allSettled([
        ladeOffeneAuftraege(),
        ladeOffeneVerstaerkung(),
        ladeBenachrichtigungen()
    ]);
} catch (error) {
    console.error(
        "Fehler beim initialen Laden des Mitarbeiterbereichs:",
        error
    );
}


// ------------------------------------------------------------
// Automatische Aktualisierung
// ------------------------------------------------------------

const ehrenmarktAutoRefresh = setInterval(async () => {
    try {
        await Promise.allSettled([
            ladeOffeneAuftraege(),
            ladeOffeneVerstaerkung(),
            ladeBenachrichtigungen()
        ]);
    } catch (error) {
        console.error(
            "Fehler bei der automatischen Aktualisierung:",
            error
        );
    }
}, 60000);


// ------------------------------------------------------------
// Aufräumen beim Verlassen der Seite
// ------------------------------------------------------------

window.addEventListener("beforeunload", () => {
    if (ehrenmarktAutoRefresh) {
        clearInterval(ehrenmarktAutoRefresh);
    }
});


// ------------------------------------------------------------
// Globale Aktualisierungsfunktion
// ------------------------------------------------------------

window.ehrenmarktMitarbeiterbereichAktualisieren =
    async function () {

        try {
            await Promise.allSettled([
                ladeOffeneAuftraege(),
                ladeEigeneAuftraege(user),
                ladeOffeneVerstaerkung(),
                ladeBenachrichtigungen()
            ]);

            zeigeErfolg(
                "Mitarbeiterbereich wurde aktualisiert."
            );

        } catch (error) {

            console.error(
                "Fehler beim Aktualisieren:",
                error
            );

            zeigeFehler(
                "Der Mitarbeiterbereich konnte nicht vollständig aktualisiert werden."
            );
        }
    };


// ------------------------------------------------------------
// Seite vollständig initialisiert
// ------------------------------------------------------------

console.log(
    "Ehrenmarkt Mitarbeiterbereich erfolgreich gestartet."
);


// ============================================================
// DOMContentLoaded ENDE
// ============================================================

});
