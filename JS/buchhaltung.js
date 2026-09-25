/* Ehrenmarkt – Clan-Buchhaltung V0.5
   JS aus der aktuellen buchhaltung (11).html extrahiert.
   Keine Funktionalität aus einer anderen Buchhaltungs-Version gemischt.
*/

const buchhaltungDB = window.supabaseClient || window.supabase || null;



/* =====================================================
   DATEN
===================================================== */

let bookings = [];
let orderSettlements = [];
let workers = [];
let savingsTransactions = [];
let cashChecks = [];
let activityLogs = [];

let savingsGoalValue = 0;
let currentWorkers = [];


/* =====================================================
   HILFSFUNKTIONEN
===================================================== */

function money(value){
    const number = Number(value) || 0;

    return number.toLocaleString("de-DE") + " $";
}


function numberValue(value){
    return Number(value) || 0;
}


function nowLocal(){

    const date = new Date();

    const offset =
        date.getTimezoneOffset() * 60000;

    return new Date(
        date.getTime() - offset
    ).toISOString().slice(0,16);
}


function getValue(id){

    const element = document.getElementById(id);

    return element ? element.value.trim() : "";
}


function setText(id,value){

    const element = document.getElementById(id);

    if(element){
        element.textContent = value;
    }
}


/* =====================================================
   NAVIGATION
===================================================== */

function showArea(id,button){

    const areas =
        document.querySelectorAll(".open-area");

    const buttons =
        document.querySelectorAll(".nav-button");

    const selected =
        document.getElementById(id);


    if(
        selected &&
        selected.classList.contains("active")
    ){

        selected.classList.remove("active");

        button.classList.remove("active");

        return;
    }


    areas.forEach(area => {
        area.classList.remove("active");
    });


    buttons.forEach(btn => {
        btn.classList.remove("active");
    });


    if(selected){

        selected.classList.add("active");

        button.classList.add("active");


        setTimeout(() => {

            selected.scrollIntoView({
                behavior:"smooth",
                block:"start"
            });

        },100);

    }

}


/* =====================================================
   MODAL
===================================================== */

function openModal(id){

    const modal =
        document.getElementById(id);

    if(modal){
        modal.classList.add("active");
    }

}


function closeModal(id){

    const modal =
        document.getElementById(id);

    if(modal){
        modal.classList.remove("active");
    }

}


/* =====================================================
   BUCHUNG
===================================================== */

function openBookingModal(){

    const date =
        document.getElementById("bookingDate");

    if(date && !date.value){
        date.value = nowLocal();
    }

    openModal("bookingModal");
}


function closeBookingModal(){

    closeModal("bookingModal");

}


function saveBooking(){

    const amount =
        numberValue(getValue("bookingAmount"));


    if(amount <= 0){

        alert("Bitte einen gültigen Betrag eingeben.");

        return;
    }


    const booking = {

        id:
            getValue("bookingNumber") ||
            "BK-" +
            String(bookings.length + 1)
                .padStart(4,"0"),

        type:
            getValue("bookingType"),

        amount:amount,

        from:
            getValue("bookingFrom"),

        to:
            getValue("bookingTo"),

        purpose:
            getValue("bookingPurpose"),

        category:
            getValue("bookingCategory"),

        orderNumber:
            getValue("bookingOrderNumber"),

        paymentMethod:
            getValue("bookingPaymentMethod"),

        date:
            getValue("bookingDate") ||
            nowLocal(),

        createdBy:
            getValue("bookingCreatedBy") ||
            "Manuell",

        status:
            getValue("bookingStatus"),

        note:
            getValue("bookingNote")

    };


    bookings.push(booking);


    activityLogs.push({

        date:booking.date,

        type:"Erstellt",

        area:"Buchung",

        description:
            booking.id +
            " · " +
            booking.type +
            " · " +
            money(booking.amount),

        createdBy:
            booking.createdBy,

        status:
            booking.status

    });


    renderBookings();

    updateFinancialOverview();

    renderLogs();

    closeBookingModal();

    clearBookingForm();

}


function clearBookingForm(){

    [
        "bookingNumber",
        "bookingAmount",
        "bookingFrom",
        "bookingTo",
        "bookingPurpose",
        "bookingOrderNumber",
        "bookingNote"
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if(element){
            element.value = "";
        }

    });

}


/* =====================================================
   BUCHUNGEN ANZEIGEN
===================================================== */

function renderBookings(){

    const body =
        document.getElementById(
            "bookingTableBody"
        );

    if(!body) return;


    if(bookings.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="12">
                    Noch keine Buchungen vorhanden.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        bookings.map(booking => `

            <tr>

                <td>${booking.id}</td>

                <td>
                    <span class="status-badge ${
                        booking.type === "Einzahlung"
                            ? "paid"
                            : "open"
                    }">
                        ${booking.type}
                    </span>
                </td>

                <td>
                    ${money(booking.amount)}
                </td>

                <td>${booking.from || "-"}</td>

                <td>${booking.to || "-"}</td>

                <td>${booking.purpose || "-"}</td>

                <td>${booking.category || "-"}</td>

                <td>${booking.orderNumber || "-"}</td>

                <td>${booking.paymentMethod || "-"}</td>

                <td>${formatDate(booking.date)}</td>

                <td>${booking.createdBy || "-"}</td>

                <td>${booking.status || "-"}</td>

            </tr>

        `).join("");

}


function filterBookings(){

    const search =
        getValue("bookingSearch")
            .toLowerCase();

    const type =
        getValue("bookingTypeFilter");

    const category =
        getValue("bookingCategoryFilter");


    const body =
        document.getElementById(
            "bookingTableBody"
        );

    if(!body) return;


    const filtered =
        bookings.filter(item => {

            const text =
                JSON.stringify(item)
                    .toLowerCase();

            return (
                (!search || text.includes(search)) &&
                (!type || item.type === type) &&
                (!category || item.category === category)
            );

        });


    if(filtered.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="12">
                    Keine passenden Buchungen gefunden.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        filtered.map(booking => `

            <tr>

                <td>${booking.id}</td>

                <td>${booking.type}</td>

                <td>${money(booking.amount)}</td>

                <td>${booking.from || "-"}</td>

                <td>${booking.to || "-"}</td>

                <td>${booking.purpose || "-"}</td>

                <td>${booking.category || "-"}</td>

                <td>${booking.orderNumber || "-"}</td>

                <td>${booking.paymentMethod || "-"}</td>

                <td>${formatDate(booking.date)}</td>

                <td>${booking.createdBy || "-"}</td>

                <td>${booking.status || "-"}</td>

            </tr>

        `).join("");

}


/* =====================================================
   AUFTRAGSABRECHNUNG
===================================================== */

function openOrderModal(){

    const date =
        document.getElementById("orderDate");

    if(date && !date.value){
        date.value = nowLocal();
    }

    currentWorkers = [];

    renderCurrentWorkers();

    openModal("orderModal");

}


function closeOrderModal(){

    closeModal("orderModal");

}


function addWorkerRow(){

    const worker = {

        id:
            Date.now() +
            Math.random(),

        name:"",

        salary:0,

        note:""

    };


    currentWorkers.push(worker);

    renderCurrentWorkers();

}


function renderCurrentWorkers(){

    const list =
        document.getElementById(
            "workerList"
        );

    if(!list) return;


    if(currentWorkers.length === 0){

        list.innerHTML = `
            <div class="worker-empty">
                Noch keine Arbeiter hinzugefügt.
            </div>
        `;

        updateWorkerTotals();

        return;
    }


    list.innerHTML =
        currentWorkers.map((worker,index) => `

            <div class="worker-row">

                <div>

                    <label>
                        Mitarbeiter
                    </label>

                    <input
                        type="text"
                        value="${worker.name}"
                        onchange="updateWorker(${index},'name',this.value)"
                        placeholder="Minecraft-Name"
                    >

                </div>


                <div>

                    <label>
                        Gehalt
                    </label>

                    <input
                        type="number"
                        min="0"
                        value="${worker.salary || ""}"
                        onchange="updateWorker(${index},'salary',this.value)"
                        placeholder="0"
                    >

                </div>


                <div>

                    <label>
                        Notiz
                    </label>

                    <input
                        type="text"
                        value="${worker.note}"
                        onchange="updateWorker(${index},'note',this.value)"
                        placeholder="Optional"
                    >

                </div>


                <button
                    class="worker-remove"
                    onclick="removeWorker(${index})"
                    type="button"
                >
                    Entfernen
                </button>

            </div>

        `).join("");


    updateWorkerTotals();

}


function updateWorker(index,key,value){

    if(!currentWorkers[index]) return;


    if(key === "salary"){
        currentWorkers[index][key] =
            numberValue(value);
    }else{
        currentWorkers[index][key] =
            value;
    }


    updateWorkerTotals();

}


function removeWorker(index){

    currentWorkers.splice(index,1);

    renderCurrentWorkers();

}


function updateWorkerTotals(){

    const total =
        currentWorkers.reduce(
            (sum,worker) =>
                sum + numberValue(worker.salary),
            0
        );


    const orderTotal =
        numberValue(
            getValue("orderTotal")
        );


    const clan =
        numberValue(
            getValue("orderClanAmount")
        );


    const remaining =
        orderTotal -
        clan -
        total;


    setText(
        "orderWorkerCount",
        currentWorkers.length
    );


    setText(
        "orderSalaryTotal",
        money(total)
    );


    setText(
        "orderRemainingAmount",
        money(remaining)
    );


    const warning =
        document.getElementById(
            "orderDistributionWarning"
        );


    if(!warning) return;


    if(remaining === 0){

        warning.textContent =
            "Die Verteilung ist vollständig.";

        warning.className =
            "distribution-warning success-text";

    }else if(remaining < 0){

        warning.textContent =
            "Die Verteilung überschreitet den Gesamtbetrag.";

        warning.className =
            "distribution-warning danger-text";

    }else{

        warning.textContent =
            "Es ist noch ein Betrag nicht verteilt.";

        warning.className =
            "distribution-warning";

    }

}


document.addEventListener(
    "input",
    event => {

        if(
            event.target.id === "orderTotal" ||
            event.target.id === "orderClanAmount"
        ){

            updateWorkerTotals();

        }

    }
);


function saveOrderSettlement(){

    const total =
        numberValue(
            getValue("orderTotal")
        );

    const clan =
        numberValue(
            getValue("orderClanAmount")
        );


    if(total <= 0){

        alert(
            "Bitte einen gültigen Gesamtbetrag eingeben."
        );

        return;
    }


    const salaries =
        currentWorkers.reduce(
            (sum,worker) =>
                sum + numberValue(worker.salary),
            0
        );


    const remaining =
        total -
        clan -
        salaries;


    if(remaining < 0){

        alert(
            "Die Verteilung überschreitet den Gesamtbetrag."
        );

        return;
    }


    const settlement = {

        id:
            getValue("orderNumber") ||
            "#" +
            String(
                orderSettlements.length + 1
            ),

        date:
            getValue("orderDate") ||
            nowLocal(),

        total:total,

        clan:clan,

        workers:
            currentWorkers.map(worker => ({
                ...worker
            })),

        salaries:salaries,

        status:
            getValue("orderStatus"),

        createdBy:
            getValue("orderCreatedBy") ||
            "Manuell",

        note:
            getValue("orderNote")

    };


    orderSettlements.push(settlement);

    workers.push(
        ...settlement.workers
    );


    activityLogs.push({

        date:settlement.date,

        type:"Erstellt",

        area:"Auftragsabrechnung",

        description:
            settlement.id +
            " · " +
            money(settlement.total),

        createdBy:
            settlement.createdBy,

        status:
            settlement.status

    });


    renderOrders();

    renderEmployees();

    renderLogs();

    updateFinancialOverview();

    closeOrderModal();

}


/* =====================================================
   AUFTRÄGE ANZEIGEN
===================================================== */

function renderOrders(){

    const body =
        document.getElementById(
            "orderTableBody"
        );

    if(!body) return;


    if(orderSettlements.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    Noch keine Auftragsabrechnungen vorhanden.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        orderSettlements.map(order => `

            <tr>

                <td>${order.id}</td>

                <td>${money(order.total)}</td>

                <td>${money(order.clan)}</td>

                <td>${order.workers.length}</td>

                <td>${money(order.salaries)}</td>

                <td>
                    ${order.status}
                </td>

                <td>${order.createdBy}</td>

                <td>${formatDate(order.date)}</td>

                <td>
                    <button
                        class="table-action"
                        onclick="viewOrder('${escapeHtml(order.id)}')"
                    >
                        Details
                    </button>
                </td>

            </tr>

        `).join("");

}


function filterOrders(){

    const search =
        getValue("orderSearch")
            .toLowerCase();

    const status =
        getValue("orderStatusFilter");


    const body =
        document.getElementById(
            "orderTableBody"
        );

    if(!body) return;


    const filtered =
        orderSettlements.filter(order => {

            const text =
                JSON.stringify(order)
                    .toLowerCase();

            return (
                (!search || text.includes(search)) &&
                (!status || order.status === status)
            );

        });


    if(filtered.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    Keine passenden Aufträge gefunden.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        filtered.map(order => `

            <tr>

                <td>${order.id}</td>
                <td>${money(order.total)}</td>
                <td>${money(order.clan)}</td>
                <td>${order.workers.length}</td>
                <td>${money(order.salaries)}</td>
                <td>${order.status}</td>
                <td>${order.createdBy}</td>
                <td>${formatDate(order.date)}</td>

                <td>
                    <button
                        class="table-action"
                        onclick="viewOrder('${escapeHtml(order.id)}')"
                    >
                        Details
                    </button>
                </td>

            </tr>

        `).join("");

}


function viewOrder(id){

    const order =
        orderSettlements.find(
            item => item.id === id
        );


    if(!order) return;


    const workerText =
        order.workers.length
            ? order.workers.map(worker =>
                `${worker.name || "-"}: ${money(worker.salary)}`
              ).join("\n")
            : "Keine Arbeiter";


    alert(
        "Auftrag " +
        order.id +
        "\n\n" +

        "Gesamt: " +
        money(order.total) +
        "\n" +

        "Clan: " +
        money(order.clan) +
        "\n" +

        "Gehälter: " +
        money(order.salaries) +
        "\n" +

        "Status: " +
        order.status +
        "\n\n" +

        "Arbeiter:\n" +
        workerText
    );

}


/* =====================================================
   MITARBEITER
===================================================== */

function renderEmployees(){

    const body =
        document.getElementById(
            "employeeTableBody"
        );

    if(!body) return;


    if(workers.length === 0){

        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    Noch keine Mitarbeiterdaten vorhanden.
                </td>
            </tr>
        `;

        return;
    }


    const grouped = {};


    workers.forEach(worker => {

        const name =
            worker.name || "Unbekannt";


        if(!grouped[name]){

            grouped[name] = {

                name:name,

                orders:0,

                salary:0,

                deposits:0,

                withdrawals:0,

                open:0,

                note:""

            };

        }


        grouped[name].orders++;

        grouped[name].salary +=
            numberValue(worker.salary);

        grouped[name].note =
            worker.note || "";

    });

    bookings.forEach(booking => {

    const name =
        booking.type === "Einzahlung"
            ? booking.from
            : booking.to;


    if(!name || !grouped[name]) return;


    if(booking.type === "Einzahlung"){

        grouped[name].deposits +=
            booking.amount;

    }else{

        grouped[name].withdrawals +=
            booking.amount;

    }

});


workers.forEach(worker => {

    if(!worker.name || !grouped[worker.name])
        return;

    grouped[worker.name].salary +=
        numberValue(worker.salary);

    grouped[worker.name].orders +=
        1;

});


const rows =
    Object.values(grouped);


if(!rows.length){

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-row">
                Noch keine Mitarbeiterdaten vorhanden.
            </td>
        </tr>
    `;

    return;

}


tbody.innerHTML =
    rows.map(employee => {

        const openAmount =
            employee.salary +
            employee.withdrawals -
            employee.deposits;


        return `
            <tr>

                <td>
                    <strong>
                        ${escapeHtml(employee.name)}
                    </strong>
                </td>

                <td>
                    ${employee.orders}
                </td>

                <td>
                    ${money(employee.salary)}
                </td>

                <td class="money-positive">
                    ${money(employee.deposits)}
                </td>

                <td class="money-negative">
                    ${money(employee.withdrawals)}
                </td>

                <td class="${
                    openAmount > 0
                        ? "money-negative"
                        : "money-positive"
                }">
                    ${money(openAmount)}
                </td>

            </tr>
        `;

    }).join("");

}


/* =====================================================
   MITARBEITER FILTER
===================================================== */

function filterEmployees(){

    const search =
        getValue("employeeSearch")
            .toLowerCase()
            .trim();


    const rows =
        document.querySelectorAll(
            "#employeeTableBody tr"
        );


    rows.forEach(row => {

        const text =
            row.innerText.toLowerCase();


        row.style.display =
            !search ||
            text.includes(search)
                ? ""
                : "none";

    });

}


/* =====================================================
   SPARKONTO
===================================================== */

function openSavings(){

    openModal("savingsModal");


    setValue(
        "savingsNumber",
        "SP-" + Date.now()
    );


    setValue(
        "savingsDate",
        nowLocal()
    );

}


function saveSavings(){

    const type =
        getValue("savingsType");

    const amount =
        numberValue(
            getValue("savingsAmount")
        );


    if(!type || amount <= 0){

        alert(
            "Bitte Art und einen gültigen Betrag eingeben."
        );

        return;

    }


    savingsTransactions.push({

        id:
            Date.now(),

        number:
            getValue("savingsNumber") ||
            "SP-" + Date.now(),

        type,

        amount,

        from:
            getValue("savingsFrom"),

        to:
            getValue("savingsTo"),

        date:
            getValue("savingsDate") ||
            nowLocal(),

        purpose:
            getValue("savingsPurpose"),

        note:
            getValue("savingsNote"),

        createdBy:
            "Manuell"

    });


    renderSavings();

    updateFinancialOverview();

    closeModal("savingsModal");

}


function renderSavings(){

    const tbody =
        document.getElementById(
            "savingsTableBody"
        );


    if(!tbody) return;


    let deposits = 0;
    let withdrawals = 0;


    savingsTransactions.forEach(
        transaction => {

            if(
                transaction.type ===
                "Einzahlung"
            ){

                deposits +=
                    transaction.amount;

            }else{

                withdrawals +=
                    transaction.amount;

            }

        }
    );


    const balance =
        deposits - withdrawals;


    setText(
        "savingsBalance",
        money(balance)
    );

    setText(
        "savingsDeposits",
        money(deposits)
    );

    setText(
        "savingsWithdrawals",
        money(withdrawals)
    );

    setText(
        "savingsCurrent",
        money(balance)
    );

    setText(
        "savingsTransactionCount",
        savingsTransactions.length
    );


    const goal =
        savingsGoalValue || 0;


    setText(
        "savingsGoalDisplay",
        money(goal)
    );


    const progress =
        goal > 0
            ? Math.min(
                100,
                (balance / goal) * 100
            )
            : 0;


    const progressBar =
        document.getElementById(
            "savingsProgress"
        );


    if(progressBar){

        progressBar.style.width =
            progress + "%";

    }


    setText(
        "savingsProgressText",
        progress.toFixed(1) + " %"
    );


    if(!savingsTransactions.length){

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-row">
                    Noch keine Sparkonto-Buchungen vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        savingsTransactions
            .slice()
            .reverse()
            .map(transaction => {

                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                transaction.number
                            )}
                        </td>

                        <td>
                            <span class="status-badge ${
                                transaction.type ===
                                "Einzahlung"
                                    ? "status-paid"
                                    : "status-cancelled"
                            }">
                                ${escapeHtml(
                                    transaction.type
                                )}
                            </span>
                        </td>

                        <td>
                            ${money(
                                transaction.amount
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.from ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.to ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                transaction.date
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.purpose ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                transaction.createdBy ||
                                "Manuell"
                            )}
                        </td>

                    </tr>
                `;

            })
            .join("");

}


function setSavingsGoal(){

    const value =
        numberValue(
            getValue("savingsGoal")
        );


    if(value < 0){

        alert(
            "Das Sparziel darf nicht negativ sein."
        );

        return;

    }


    savingsGoalValue =
        value;


    renderSavings();

}


/* =====================================================
   MONATSBILANZ
===================================================== */

function updateMonthly(){

    const period =
        getValue("monthlyPeriod") ||
        new Date()
            .toISOString()
            .slice(0,7);


    const parts =
        period.split("-");


    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);


    let income = 0;
    let expenses = 0;
    let wages = 0;
    let count = 0;


    bookings.forEach(
        booking => {

            if(!booking.date) return;


            const date =
                new Date(booking.date);


            if(
                date.getFullYear() !== year ||
                date.getMonth() + 1 !== month
            ){

                return;

            }


            count++;


            if(
                booking.type ===
                "Einzahlung"
            ){

                income +=
                    booking.amount;

            }else{

                expenses +=
                    booking.amount;

            }


            if(
                booking.category ===
                "Gehalt"
            ){

                wages +=
                    booking.amount;

            }

        }
    );


    const change =
        income - expenses;


    setText(
        "monthlyIncome",
        money(income)
    );

    setText(
        "monthlyExpenses",
        money(expenses)
    );

    setText(
        "monthlyWages",
        money(wages)
    );

    setText(
        "monthlyChange",
        money(change)
    );

    setText(
        "monthlyBookingCount",
        count
    );


    setText(
        "monthlyLabel",
        `${String(month).padStart(2,"0")}/${year}`
    );

}


/* =====================================================
   KASSENABGLEICH
===================================================== */

function openCashCheck(){

    openModal(
        "cashCheckModal"
    );


    setValue(
        "cashCheckDate",
        nowLocal()
    );


    setValue(
        "cashPortalInput",
        getCurrentClanBalance()
    );

}


function saveCashCheck(){

    const portal =
        numberValue(
            getValue("cashPortalInput")
        );


    const ingame =
        numberValue(
            getValue("cashIngameInput")
        );


    const difference =
        ingame - portal;


    cashChecks.push({

        id:
            Date.now(),

        portal,

        ingame,

        difference,

        date:
            getValue("cashCheckDate") ||
            nowLocal(),

        createdBy:
            getValue("cashCheckCreatedBy") ||
            "Manuell",

        note:
            getValue("cashCheckNote")

    });


    renderCashChecks();

    closeModal(
        "cashCheckModal"
    );

}


function renderCashChecks(){

    const tbody =
        document.getElementById(
            "cashcheckTableBody"
        );


    if(!tbody) return;


    if(!cashChecks.length){

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    Noch keine Kassenabgleiche vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        cashChecks
            .slice()
            .reverse()
            .map(check => {

                const differenceClass =
                    check.difference === 0
                        ? "money-positive"
                        : "money-negative";


                return `
                    <tr>

                        <td>
                            ${formatDate(
                                check.date
                            )}
                        </td>

                        <td>
                            ${money(
                                check.portal
                            )}
                        </td>

                        <td>
                            ${money(
                                check.ingame
                            )}
                        </td>

                        <td class="${differenceClass}">
                            ${money(
                                check.difference
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                check.createdBy ||
                                "Manuell"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                check.note ||
                                "—"
                            )}
                        </td>

                    </tr>
                `;

            })
            .join("");

}


/* =====================================================
   FINANZKONTROLLE
===================================================== */

function runFinancialControl(){

    const warnings = [];


    const clanBalance =
        getCurrentClanBalance();


    const savingsBalance =
        getSavingsBalance();


    if(clanBalance < 0){

        warnings.push(
            "Die Clankasse weist einen negativen Stand auf."
        );

    }


    if(savingsBalance < 0){

        warnings.push(
            "Das Sparkonto weist einen negativen Stand auf."
        );

    }


    orderSettlements.forEach(
        order => {

            const workerTotal =
                (order.workers || [])
                    .reduce(
                        (sum, worker) =>
                            sum +
                            numberValue(
                                worker.salary
                            ),
                        0
                    );


            const distributed =
                numberValue(
                    order.clanAmount
                ) +
                workerTotal;


            const remaining =
                numberValue(
                    order.total
                ) -
                distributed;


            if(remaining > 0){

                warnings.push(
                    `Auftrag ${
                        order.orderNumber ||
                        "ohne Nummer"
                    } ist noch nicht vollständig verteilt.`
                );

            }

        }
    );


    const status =
        document.getElementById(
            "controlStatus"
        );


    const list =
        document.getElementById(
            "warningList"
        );


    if(!warnings.length){

        if(status){

            status.className =
                "control-status success";

            status.innerHTML =
                "✓ Keine offenen Finanzwarnungen";

        }


        if(list){

            list.innerHTML = `
                <div class="empty-state success-box">
                    Die aktuelle Buchhaltung weist keine
                    erkannten Warnungen auf.
                </div>
            `;

        }

    }else{

        if(status){

            status.className =
                "control-status warning";

            status.innerHTML =
                `⚠ ${warnings.length}
                 ${warnings.length === 1
                    ? "Warnung"
                    : "Warnungen"}`;

        }


        if(list){

            list.innerHTML =
                warnings
                    .map(
                        warning => `
                            <div class="warning-item">
                                <span>⚠</span>
                                <div>
                                    ${escapeHtml(
                                        warning
                                    )}
                                </div>
                            </div>
                        `
                    )
                    .join("");

        }

    }


    setText(
        "lastControlDate",
        formatDate(
            nowLocal()
        )
    );


    updateControlCards();

}


/* =====================================================
   KONTROLLKARTEN
===================================================== */

function updateControlCards(){

    const clanBalance =
        getCurrentClanBalance();


    const savingsBalance =
        getSavingsBalance();


    const orderCount =
        orderSettlements.length;


    const openOrders =
        orderSettlements.filter(
            order => {

                const workerTotal =
                    (order.workers || [])
                        .reduce(
                            (sum, worker) =>
                                sum +
                                numberValue(
                                    worker.salary
                                ),
                            0
                        );


                const distributed =
                    numberValue(
                        order.clanAmount
                    ) +
                    workerTotal;


                return (
                    numberValue(
                        order.total
                    ) >
                    distributed
                );

            }
        ).length;


    setText(
        "controlCash",
        money(clanBalance)
    );


    setText(
        "controlOrders",
        `${openOrders} offen / ${orderCount} gesamt`
    );


    const totalPayouts =
        bookings
            .filter(
                booking =>
                    booking.type ===
                    "Auszahlung"
            )
            .reduce(
                (sum, booking) =>
                    sum + booking.amount,
                0
            );


    setText(
        "controlPayouts",
        money(totalPayouts)
    );


    setText(
        "controlSavings",
        money(savingsBalance)
    );


    setText(
        "controlData",
        `${bookings.length} Buchungen`
    );


    setText(
        "controlRights",
        "Leitung / Stadtleitung"
    );

}


/* =====================================================
   PROTOKOLL / AUDIT
===================================================== */

function addActivityLog(
    type,
    action,
    description,
    createdBy = "Manuell"
){

    activityLogs.push({

        id:
            Date.now(),

        type,

        action,

        description,

        createdBy,

        date:
            nowLocal()

    });


    renderLogs();

}


function renderLogs(){

    const tbody =
        document.getElementById(
            "logTableBody"
        );


    if(!tbody) return;


    setText(
        "logCount",
        activityLogs.length
    );


    const today =
        new Date()
            .toISOString()
            .slice(0,10);


    const todayCount =
        activityLogs.filter(
            log =>
                String(log.date)
                    .slice(0,10) === today
        ).length;


    setText(
        "logToday",
        todayCount
    );


    setText(
        "logChanges",
        activityLogs.filter(
            log =>
                log.action !==
                "Storno"
        ).length
    );


    setText(
        "logCancellations",
        activityLogs.filter(
            log =>
                log.action ===
                "Storno"
        ).length
    );


    if(!activityLogs.length){

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    Noch keine Protokolleinträge vorhanden.
                </td>
            </tr>
        `;

        return;

    }

tbody.innerHTML =
    activityLogs
        .slice()
        .reverse()
        .map(log => {

            return `
                <tr>

                    <td>
                        ${formatDate(
                            log.date
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.type
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.action
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.description
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.createdBy
                        )}
                    </td>

                    <td>

                        <button
                            class="table-action"
                            onclick="showLogDetail(${log.id})"
                        >
                            Details
                        </button>

                    </td>

                </tr>
            `;

        })
        .join("");

}


/* =====================================================
   PROTOKOLL FILTER
===================================================== */

function filterLogs(){

    const search =
        getValue("logSearch")
            .toLowerCase()
            .trim();


    const type =
        getValue("logTypeFilter");


    const period =
        getValue("logPeriodFilter");


    const rows =
        document.querySelectorAll(
            "#logTableBody tr"
        );


    rows.forEach(row => {

        const text =
            row.innerText.toLowerCase();


        const typeMatch =
            !type ||
            text.includes(
                type.toLowerCase()
            );


        let periodMatch =
            true;


        if(period){

            const dateCell =
                row.children[0];


            if(dateCell){

                const dateText =
                    dateCell.innerText.trim();


                if(period === "Heute"){

                    periodMatch =
                        dateText ===
                        formatDate(
                            new Date().toISOString()
                        );

                }

            }

        }


        row.style.display =
            (
                (!search ||
                    text.includes(search)) &&
                typeMatch &&
                periodMatch
            )
                ? ""
                : "none";

    });

}


/* =====================================================
   PROTOKOLL DETAILS
===================================================== */

function showLogDetail(id){

    const log =
        activityLogs.find(
            item =>
                item.id === id
        );


    if(!log) return;


    const content =
        document.getElementById(
            "logDetailContent"
        );


    if(content){

        content.innerHTML = `

            <div class="detail-grid">

                <div>
                    <span>Typ</span>

                    <strong>
                        ${escapeHtml(
                            log.type
                        )}
                    </strong>
                </div>


                <div>
                    <span>Aktion</span>

                    <strong>
                        ${escapeHtml(
                            log.action
                        )}
                    </strong>
                </div>


                <div>
                    <span>Datum</span>

                    <strong>
                        ${formatDate(
                            log.date
                        )}
                    </strong>
                </div>


                <div>
                    <span>Erstellt von</span>

                    <strong>
                        ${escapeHtml(
                            log.createdBy
                        )}
                    </strong>
                </div>

            </div>


            <div class="detail-description">

                <span>Beschreibung</span>

                <p>
                    ${escapeHtml(
                        log.description
                    )}
                </p>

            </div>

        `;

    }


    openModal(
        "logDetailModal"
    );

}


/* =====================================================
   FINANZÜBERSICHT
===================================================== */

function getCurrentClanBalance(){

    const income =
        bookings
            .filter(
                booking =>
                    booking.type ===
                    "Einzahlung"
            )
            .reduce(
                (sum, booking) =>
                    sum + booking.amount,
                0
            );


    const expenses =
        bookings
            .filter(
                booking =>
                    booking.type ===
                    "Auszahlung"
            )
            .reduce(
                (sum, booking) =>
                    sum + booking.amount,
                0
            );


    return income - expenses;

}


function getSavingsBalance(){

    const deposits =
        savingsTransactions
            .filter(
                transaction =>
                    transaction.type ===
                    "Einzahlung"
            )
            .reduce(
                (sum, transaction) =>
                    sum + transaction.amount,
                0
            );


    const withdrawals =
        savingsTransactions
            .filter(
                transaction =>
                    transaction.type ===
                    "Auszahlung"
            )
            .reduce(
                (sum, transaction) =>
                    sum + transaction.amount,
                0
            );


    return deposits - withdrawals;

}


/* =====================================================
   FINANZÜBERSICHT AKTUALISIEREN
===================================================== */

function updateFinancialOverview(){

    const currentClanBalance =
        getCurrentClanBalance();


    const totalRevenue =
        orderSettlements
            .reduce(
                (sum, order) =>
                    sum +
                    numberValue(
                        order.total
                    ),
                0
            );


    const totalDeposits =
        bookings
            .filter(
                booking =>
                    booking.type ===
                    "Einzahlung"
            )
            .reduce(
                (sum, booking) =>
                    sum + booking.amount,
                0
            );


    const totalWithdrawals =
        bookings
            .filter(
                booking =>
                    booking.type ===
                    "Auszahlung"
            )
            .reduce(
                (sum, booking) =>
                    sum + booking.amount,
                0
            );


    const totalWorkerSalaries =
        bookings
            .filter(
                booking =>
                    booking.category ===
                    "Gehalt"
            )
            .reduce(
                (sum, booking) =>
                    sum + booking.amount,
                0
            );


    const totalClanExpenses =
        bookings
            .filter(
                booking =>
                    booking.category ===
                    "Clan-Ausgabe"
            )
            .reduce(
                (sum, booking) =>
                    sum + booking.amount,
                0
            );


    const totalSavings =
        getSavingsBalance();


    const totalOpenAmounts =
        bookings
            .filter(
                booking =>
                    booking.status ===
                    "Offen" ||
                    booking.status ===
                    "Teilweise bezahlt"
            )
            .reduce(
                (sum, booking) =>
                    sum + booking.amount,
                0
            );


    const totalAssets =
        currentClanBalance +
        totalSavings;


    setText(
        "currentClanBalance",
        money(currentClanBalance)
    );


    setText(
        "totalRevenue",
        money(totalRevenue)
    );


    setText(
        "totalDeposits",
        money(totalDeposits)
    );


    setText(
        "totalWithdrawals",
        money(totalWithdrawals)
    );


    setText(
        "totalWorkerSalaries",
        money(totalWorkerSalaries)
    );


    setText(
        "totalClanExpenses",
        money(totalClanExpenses)
    );


    setText(
        "totalSavings",
        money(totalSavings)
    );


    setText(
        "totalOpenAmounts",
        money(totalOpenAmounts)
    );


    setText(
        "totalBookings",
        bookings.length
    );


    setText(
        "totalAssets",
        money(totalAssets)
    );


    updateControlCards();

}


/* =====================================================
   HILFSFUNKTIONEN
===================================================== */

function formatDate(value){

    if(!value)
        return "—";


    const date =
        new Date(value);


    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return "—";

    }


    return date.toLocaleDateString(
        "de-DE",
        {
            day:"2-digit",
            month:"2-digit",
            year:"numeric"
        }
    );

}


function escapeHtml(value){

    return String(
        value ?? ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    );

}


/* =====================================================
   MODAL – AUSSENKLICK / ESC
===================================================== */

document.addEventListener(
    "click",
    event => {

        if(
            event.target.classList.contains(
                "modal-overlay"
            )
        ){

            event.target.classList.remove(
                "active"
            );

        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if(
            event.key !==
            "Escape"
        )
            return;


        document
            .querySelectorAll(
                ".modal-overlay.active"
            )
            .forEach(
                modal => {

                    modal.classList.remove(
                        "active"
                    );

                }
            );

    }
);


/* =====================================================
   START / INITIALISIERUNG
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const monthly =
            document.getElementById(
                "monthlyPeriod"
            );


        if(
            monthly &&
            !monthly.value
        ){

            monthly.value =
                new Date()
                    .toISOString()
                    .slice(0,7);

        }


        renderBookings();

        renderOrders();

        renderEmployees();

        renderSavings();

        updateMonthly();

        renderCashChecks();

        renderLogs();

        updateFinancialOverview();

        runFinancialControl();

    }
);

