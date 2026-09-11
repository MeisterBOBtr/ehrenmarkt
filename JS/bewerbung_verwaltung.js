let aktuellerBenutzer = null;
let aktuelleBewerbung = null;
let bewerbungen = [];

function zeigeFehler(text) {
    const details = document.getElementById("detailsContent");

    if (details) {
        details.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Fehler</h3>
                <p>${esc(text)}</p>
            </div>
        `;
    }

    console.error(text);
}

function esc(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function ladeBenutzer() {
    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error) {
        zeigeFehler(error.message);
        return null;
    }

    if (!user) {
        window.location.href = "../HTML/registrieren.html";
        return null;
    }

    aktuellerBenutzer = user;
    return user;
}

async function pruefeStadtleitung() {
    const { data: employee, error } = await supabaseClient
        .from("employees")
        .select("id, role, rang, is_active")
        .eq("user_id", aktuellerBenutzer.id)
        .maybeSingle();

    if (error) {
        console.error("Fehler bei Berechtigungsprüfung:", error);
        zeigeFehler(error.message);
        return false;
    }

    if (
        !employee ||
        !["Leitung", "Stadtleitung"].includes(employee.rang) ||
        employee.is_active !== true
    ) {
        alert(
            "Keine Berechtigung. Nur Mitarbeiter mit dem Rang Leitung oder Stadtleitung dürfen Bewerbungen verwalten."
        );

        window.location.href = "../HTML/startseite.html";
        return false;
    }

    return true;
}

async function ladeBewerbungen() {
    const { data, error } = await supabaseClient
        .from("applications")
        .select(`
            id,
            user_id,
            name,
            minecraft_name,
            discord_id,
            age,
            experience,
            previous_work,
            desired_role,
            additional_skills,
            application_text,
            availability,
            unavailable_times,
            status,
            assigned_role,
            assigned_rank,
            processed_by,
            processed_at,
            decision_note,
            created_at,
            updated_at
        `)
        .order("created_at", { ascending: false });

    if (error) {
        zeigeFehler("Bewerbungen konnten nicht geladen werden: " + error.message);
        return;
    }

    bewerbungen = data || [];

    aktualisiereStatistik();
    zeigeBewerbungsliste();
}

function aktualisiereStatistik() {
    const offen = bewerbungen.filter(
        b => String(b.status).toLowerCase() === "offen"
    ).length;

    const angenommen = bewerbungen.filter(
        b => String(b.status).toLowerCase() === "angenommen"
    ).length;

    const abgelehnt = bewerbungen.filter(
        b => String(b.status).toLowerCase() === "abgelehnt"
    ).length;

    const statOffen = document.getElementById("statOffen");
    const statAngenommen = document.getElementById("statAngenommen");
    const statAbgelehnt = document.getElementById("statAbgelehnt");

    if (statOffen) statOffen.textContent = offen;
    if (statAngenommen) statAngenommen.textContent = angenommen;
    if (statAbgelehnt) statAbgelehnt.textContent = abgelehnt;
}

function statusKlasse(status) {
    const wert = String(status || "").toLowerCase();

    if (wert === "angenommen") return "angenommen";
    if (wert === "abgelehnt") return "abgelehnt";

    return "offen";
}

function statusText(status) {
    const wert = String(status || "").toLowerCase();

    if (wert === "angenommen") return "Angenommen";
    if (wert === "abgelehnt") return "Abgelehnt";

    return "Offen";
}

function formatiereDatum(datum) {
    if (!datum) return "-";

    const date = new Date(datum);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("de-DE", {
        dateStyle: "medium",
        timeStyle: "short"
    });
                        }

function zeigeBewerbungsliste() {
    const liste = document.getElementById("applicationList");

    if (!liste) return;

    if (bewerbungen.length === 0) {
        liste.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>Keine Bewerbungen</h3>
                <p>Es sind derzeit keine Bewerbungen vorhanden.</p>
            </div>
        `;
        return;
    }

    liste.innerHTML = "";

    bewerbungen.forEach(bewerbung => {
        const item = document.createElement("div");

        item.className = "application-item";

        item.innerHTML = `
            <div class="application-item-top">
                <div>
                    <h3>${esc(bewerbung.name || "Unbekannt")}</h3>
                    <p>${esc(bewerbung.minecraft_name || "-")}</p>
                </div>

                <span class="status ${statusKlasse(bewerbung.status)}">
                    ${statusText(bewerbung.status)}
                </span>
            </div>

            <div class="application-item-info">
                <span>🎂 ${esc(bewerbung.age || "-")} Jahre</span>
                <span>🎖️ ${esc(bewerbung.desired_role || "-")}</span>
            </div>

            <small>
                Bewerbung: ${formatiereDatum(bewerbung.created_at)}
            </small>
        `;

        item.addEventListener("click", () => {
            zeigeBewerbungsdetails(bewerbung.id);
        });

        liste.appendChild(item);
    });
}

function zeigeBewerbungsdetails(id) {
    const bewerbung = bewerbungen.find(
        b => String(b.id) === String(id)
    );

    if (!bewerbung) {
        zeigeFehler("Bewerbung wurde nicht gefunden.");
        return;
    }

    aktuelleBewerbung = bewerbung;

    const details = document.getElementById("detailsContent");

    if (!details) return;

    details.innerHTML = `
        <div class="detail-header">
            <div>
                <span class="status ${statusKlasse(bewerbung.status)}">
                    ${statusText(bewerbung.status)}
                </span>

                <h2>${esc(bewerbung.name || "Unbekannt")}</h2>

                <p>
                    Bewerbung vom ${formatiereDatum(bewerbung.created_at)}
                </p>
            </div>
        </div>

        <div class="detail-grid">

            ${infoBox(
                "Minecraft",
                bewerbung.minecraft_name
            )}

            ${infoBox(
                "Alter",
                bewerbung.age ? bewerbung.age + " Jahre" : "-"
            )}

            ${infoBox(
                "Discord",
                bewerbung.discord_id
            )}

            ${infoBox(
                "Gewünschte Rolle",
                bewerbung.desired_role
            )}

        </div>

        ${textBox(
            "Erfahrung",
            bewerbung.experience
        )}

        ${textBox(
            "Bisherige Tätigkeiten",
            bewerbung.previous_work
        )}

        ${textBox(
            "Zusätzliche Fähigkeiten",
            formatiereFachbereiche(bewerbung.additional_skills)
        )}

        ${textBox(
            "Verfügbarkeit",
            bewerbung.availability
        )}

        ${textBox(
            "Nicht verfügbare Zeiten",
            bewerbung.unavailable_times
        )}

        ${textBox(
            "Bewerbungstext",
            bewerbung.application_text
        )}

        ${
            String(bewerbung.status).toLowerCase() === "offen"
                ? erstelleEntscheidungsbereich()
                : erstelleBearbeitungsInfo()
        }
    `;

    if (String(bewerbung.status).toLowerCase() === "offen") {
        registriereEntscheidungsButtons();
    }
}

function infoBox(titel, wert) {
    return `
        <div class="info-box">
            <span>${esc(titel)}</span>
            <strong>${esc(wert || "-")}</strong>
        </div>
    `;
}

function textBox(titel, wert) {
    return `
        <div class="text-box">
            <h3>${esc(titel)}</h3>
            <p>${esc(wert || "-")}</p>
        </div>
    `;
}

function erstelleEntscheidungsbereich() {
    return `
        <div class="decision-panel">

            <h3>⚔️ Bewerbung bearbeiten</h3>

            <div class="form-group">
                <label for="assignedRole">Rolle</label>

                <select id="assignedRole">
                    <option value="">Rolle auswählen...</option>
                    <option value="Baumeister">Baumeister</option>
                    <option value="Landschaftsbauer">Landschaftsbauer</option>
                    <option value="Farmer">Farmer</option>
                    <option value="Lagerist">Lagerist</option>
                    <option value="Händler">Händler</option>
                    <option value="Redstone">Redstone</option>
                </select>
            </div>

            <div class="form-group">
                <label for="assignedRank">Rang</label>

                <select id="assignedRank">
                    <option value="">Rang auswählen...</option>
                    <option value="Mitarbeiter">Mitarbeiter</option>
                    <option value="Leitung">Leitung</option>
                    <option value="Stadtleitung">Stadtleitung</option>
                </select>
            </div>

            <div class="form-group">
                <label for="decisionNote">Entscheidungsnotiz</label>

                <textarea
                    id="decisionNote"
                    rows="4"
                    placeholder="Optional..."
                ></textarea>
            </div>

            <div class="decision-buttons">

                <button
                    type="button"
                    id="acceptApplication"
                    class="btn-accept"
                >
                    ✅ Bewerbung annehmen
                </button>

                <button
                    type="button"
                    id="rejectApplication"
                    class="btn-reject"
                >
                    ❌ Bewerbung ablehnen
                </button>

                <button
                    type="button"
                    id="deleteApplication"
                    class="btn-delete"
                >
                    🗑️ Bewerbung löschen
                </button>

            </div>

            <p class="preview-note">
                Bei einer Annahme wird automatisch ein Mitarbeiter
                mit der ausgewählten Rolle und dem Rang angelegt.
            </p>

        </div>
    `;
}

function erstelleBearbeitungsInfo() {
    return `
        <div class="decision-panel">

            <h3>
                ${
                    String(aktuelleBewerbung.status).toLowerCase()
                    === "angenommen"
                        ? "✅ Bewerbung angenommen"
                        : "❌ Bewerbung abgelehnt"
                }
            </h3>

            ${
                aktuelleBewerbung.assigned_role
                    ? `
                        <p>
                            <strong>Rolle:</strong>
                            ${esc(aktuelleBewerbung.assigned_role)}
                        </p>
                    `
                    : ""
            }

            ${
                aktuelleBewerbung.assigned_rank
                    ? `
                        <p>
                            <strong>Rang:</strong>
                            ${esc(aktuelleBewerbung.assigned_rank)}
                        </p>
                    `
                    : ""
            }

            ${
                aktuelleBewerbung.decision_note
                    ? `
                        <div class="text-box">
                            <h3>Entscheidungsnotiz</h3>
                            <p>${esc(aktuelleBewerbung.decision_note)}</p>
                        </div>
                    `
                    : ""
            }

            <p>
                Bearbeitet am:
                ${formatiereDatum(aktuelleBewerbung.processed_at)}
            </p>

            ${
                String(aktuelleBewerbung.status).toLowerCase() !== "angenommen"
                    ? `
                        <button
                            type="button"
                            id="deleteApplication"
                            class="btn-delete"
                        >
                            🗑️ Bewerbung löschen
                        </button>
                    `
                    : ""
            }

        </div>
    `;
}

function registriereEntscheidungsButtons() {
    const acceptButton =
        document.getElementById("acceptApplication");

    const rejectButton =
        document.getElementById("rejectApplication");

    const deleteButton =
        document.getElementById("deleteApplication");

    if (acceptButton) {
        acceptButton.addEventListener(
            "click",
            () => bearbeiteBewerbung("angenommen")
        );
    }

    if (rejectButton) {
        rejectButton.addEventListener(
            "click",
            () => bearbeiteBewerbung("abgelehnt")
        );
    }

    if (deleteButton) {
        deleteButton.addEventListener(
            "click",
            loescheBewerbung
        );
    }
}

async function bearbeiteBewerbung(status) {
    if (!aktuelleBewerbung) return;

    if (
        String(aktuelleBewerbung.status).toLowerCase() !== "offen"
    ) {
        alert("Diese Bewerbung wurde bereits bearbeitet.");
        return;
    }

    const rolle =
        document.getElementById("assignedRole")?.value || "";

    const rang =
        document.getElementById("assignedRank")?.value || "";

    const notiz =
        document.getElementById("decisionNote")?.value.trim() || "";

    if (status === "angenommen") {
        if (!rolle) {
            alert("Bitte zuerst eine Rolle auswählen.");
            return;
        }

        if (!rang) {
            alert("Bitte zuerst einen Rang auswählen.");
            return;
        }

        const bestaetigt = confirm(
            `Bewerbung wirklich annehmen?\n\n` +
            `Rolle: ${rolle}\n` +
            `Rang: ${rang}\n\n` +
            `Dabei wird automatisch ein Mitarbeiter angelegt.`
        );

        if (!bestaetigt) return;

        await nehmeBewerbungAn(
            rolle,
            rang,
            notiz
        );

        return;
    }

    if (status === "abgelehnt") {
        const bestaetigt = confirm(
            "Bewerbung wirklich ablehnen?"
        );

        if (!bestaetigt) return;

        await lehneBewerbungAb(notiz);
    }
                                }

async function nehmeBewerbungAn(rolle, rang, notiz) {
    const jetzt = new Date().toISOString();

    const { data: neuerMitarbeiter, error: employeeError } =
        await supabaseClient
            .from("employees")
            .insert({
                user_id: aktuelleBewerbung.user_id,
                name: aktuelleBewerbung.name,
                role: rolle,
                rang: rang,
                is_active: true,
                is_available: false
            })
            .select()
            .single();

    if (employeeError) {
        console.error(
            "Fehler beim Erstellen des Mitarbeiters:",
            employeeError
        );

        alert(
            "Mitarbeiter konnte nicht angelegt werden:\n\n" +
            employeeError.message
        );

        return;
    }

    const { error: applicationError } =
        await supabaseClient
            .from("applications")
            .update({
                status: "angenommen",
                assigned_role: rolle,
                assigned_rank: rang,
                processed_by: aktuellerBenutzer.id,
                processed_at: jetzt,
                decision_note: notiz || null,
                updated_at: jetzt
            })
            .eq("id", aktuelleBewerbung.id);

    if (applicationError) {
        console.error(
            "Fehler beim Aktualisieren der Bewerbung:",
            applicationError
        );

        alert(
            "Der Mitarbeiter wurde erstellt, aber die Bewerbung konnte nicht aktualisiert werden:\n\n" +
            applicationError.message
        );

        return;
    }

    alert(
        "✅ Bewerbung angenommen!\n\n" +
        "Der Mitarbeiter wurde automatisch angelegt."
    );

    await ladeBewerbungen();

    zeigeBewerbungsdetails(aktuelleBewerbung.id);
}

async function lehneBewerbungAb(notiz) {
    const jetzt = new Date().toISOString();

    const { error } = await supabaseClient
        .from("applications")
        .update({
            status: "abgelehnt",
            assigned_role: null,
            assigned_rank: null,
            processed_by: aktuellerBenutzer.id,
            processed_at: jetzt,
            decision_note: notiz || null,
            updated_at: jetzt
        })
        .eq("id", aktuelleBewerbung.id);

    if (error) {
        console.error(
            "Fehler beim Ablehnen:",
            error
        );

        alert(
            "Bewerbung konnte nicht abgelehnt werden:\n\n" +
            error.message
        );

        return;
    }

    alert("❌ Bewerbung wurde abgelehnt.");

    await ladeBewerbungen();

    zeigeBewerbungsdetails(aktuelleBewerbung.id);
}

async function loescheBewerbung() {
    if (!aktuelleBewerbung) return;

    const bestaetigt = confirm(
        "⚠️ Bewerbung wirklich endgültig löschen?\n\n" +
        "Die Bewerbung wird aus der Datenbank entfernt und " +
        "kann danach nicht wiederhergestellt werden."
    );

    if (!bestaetigt) return;

    const id = aktuelleBewerbung.id;

    const { error } = await supabaseClient
        .from("applications")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(
            "Fehler beim Löschen:",
            error
        );

        alert(
            "Bewerbung konnte nicht gelöscht werden:\n\n" +
            error.message
        );

        return;
    }

    aktuelleBewerbung = null;

    alert("🗑️ Bewerbung wurde endgültig gelöscht.");

    await ladeBewerbungen();

    const details = document.getElementById("detailsContent");

    if (details) {
        details.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>Bewerbung gelöscht</h3>
                <p>Wähle links eine Bewerbung aus.</p>
            </div>
        `;
    }
}

function formatiereFachbereiche(value) {
    if (!value) return "-";

    if (Array.isArray(value)) {
        return value.join(", ");
    }

    try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
            return parsed.join(", ");
        }
    } catch (e) {
        // Kein JSON – normaler Text
    }

    return String(value);
}

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (!supabaseClient) {
            zeigeFehler(
                "Supabase wurde nicht geladen."
            );
            return;
        }

        const user = await ladeBenutzer();

        if (!user) return;

        const darfVerwalten =
            await pruefeStadtleitung();

        if (!darfVerwalten) return;

        await ladeBewerbungen();
    }
);
