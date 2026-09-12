(function () {
    "use strict";

    const seiten = {
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

    const aktuellerDateiname = window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    const schönerName = seiten[aktuellerDateiname];

    /*
     * Sichtbare URL ändern:
     * /HTML/startseite.html
     * wird zu
     * /startseite
     */
    if (schönerName) {
        const neueAdresse =
            "/" +
            schönerName +
            window.location.search +
            window.location.hash;

        if (window.location.pathname !== neueAdresse) {
            window.history.replaceState(
                {},
                document.title,
                neueAdresse
            );
        }
    }

    /*
     * Alle internen HTML-Links weiterhin korrekt
     * auf den Ordner /HTML verweisen lassen.
     */
    document.querySelectorAll("a[href]").forEach(function (link) {
        const href = link.getAttribute("href");

        if (!href) {
            return;
        }

        if (
            href.startsWith("http://") ||
            href.startsWith("https://") ||
            href.startsWith("#") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            href.startsWith("/")
        ) {
            return;
        }

        const teile = href.split("#");
        const ohneHash = teile[0];
        const hash = teile[1] ? "#" + teile[1] : "";

        const queryTeile = ohneHash.split("?");
        const dateiname = queryTeile[0]
            .split("/")
            .pop()
            .toLowerCase();

        const query = queryTeile[1]
            ? "?" + queryTeile[1]
            : "";

        if (dateiname.endsWith(".html")) {
            link.setAttribute(
                "href",
                "/HTML/" + dateiname + query + hash
            );
        }
    });
})();
