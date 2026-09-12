(function () {
    const datei = window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    if (!datei.endsWith(".html")) {
        return;
    }

    const namen = {
        "index.html": "startseite",
        "startseite.html": "startseite",
        "bauauftrag.html": "bauauftrag",
        "redstoneauftrag.html": "redstoneauftrag",
        "materialauftrag.html": "materialauftrag",
        "logistikauftrag.html": "logistikauftrag",
        "karte.html": "karte",
        "verleih.html": "verleih",
        "regelwerk.html": "regelwerk",
        "kundenbereich.html": "kundenbereich",
        "mitarbeiterbereich.html": "mitarbeiterbereich",
        "verwaltung.html": "verwaltung",
        "registrieren.html": "registrieren",
        "bewertung.html": "bewertung",
        "faq.html": "faq"
    };

    const bereich = namen[datei];

    if (!bereich) {
        return;
    }

    const neueAdresse =
        "/" +
        bereich +
        window.location.search +
        window.location.hash;

    window.history.replaceState(
        {},
        document.title,
        neueAdresse
    );
})();
