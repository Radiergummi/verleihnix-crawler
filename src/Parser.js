/**
 * Parser
 * ======
 * Der Parser extrahiert Informationen aus einer Crawling-Antwort.
 */
class Parser {

    /**
     * Erstellt eine neue Parser-Instanz
     *
     * @param {Record<string, any>} config
     */
    constructor( config ) {
        this._config = config;
    }

    /**
     * Wertet die Antwort aus und erstellt ein Ergebnis.
     *
     * @param  {CrawlerRequestResponse} response
     * @return {Promise<{ result: {}, nextUrl }>}
     */
    async parse( response ) {

        // Pseudo-jQuery-Instanz, mit der wir die HTML-Antwort untersuchen
        // können. Das macht es sehr einfach, Informationen aus der Seite zu
        // holen.
        const $ = response.$;

        // Das result-Objekt enthält die Informationen, an denen wir
        // interessiert sind. Wenn die aktuelle Seite keine Daten enthält, aber
        // weiter Links, die gecrawlt werden müssen, übergeben wir hier einfach
        // nur eine URL, und keine Daten.
        let result;

        // Die nextUrl-Variable enthält - wenn vorhanden - die nächste URL, die
        // gecrawlt werden soll.
        const nextUrls = [];

        // Hier werten wir das HTML aus.
        // Wenn die Seite Elemente mit der Klasse "product-row-link" enthält,
        // sind wir auf einer Produkt-Auflistung. Hier gibt es nur Vorschau-
        // versionen der Maschinen, also werten wir nur die Links zu den Details
        // aus und packen sie in die Warteschlange.
        $( '.product-row-link' ).each( ( i, row ) => {
            nextUrls.push( $( row ).attr( 'href' ) );
        } );

        const product = $( 'div[itemtype="http://schema.org/Product"]' );

        // Wenn auf der aktuellen Seite ein Produktelement existiert, sind wir
        // auf einer Produktseite.
        if ( product.length ) {

            const link          = $( 'link[rel="canonical"]' ).attr( 'href' );
            const productName   = $( '[itemprop="name"]', product ).text();
            const productImage  = $( '[itemprop="image"]' ).attr( 'src' );
            const pricePerDay   = Number( $( '[itemprop="price"]', product )
                .text()

                // Wir ersetzen das Komma durch einen Punkt, damit wir die Zahl
                // im deutschen Zahlenformat ins amerikanische übersetzen können
                // das JavaScript versteht.
                .replace( ',', '.' ) );
            const description   = $( '[itemprop="description"]', product ).text();
            const articleNumber = $( '[itemprop="mpn"]', product )
                .text()

                // Hier ersetzen wir den Präfix Art.-Nr. durch nichts, um die
                // reine Artikelnummer im Ergebnis zu erhalten
                .replace( 'Art.-Nr.', '' );

            const technicalDetailsContainer = $( '.produkte-bottom .left-col ul' );
            const technicalDetails          = $( 'li', technicalDetailsContainer )

                // Die technischen Details sind sehr simpel aufgebaut: Es gibt
                // nur einen linken und einen rechten Text-Container - links der
                // Titel, rechts die Details. Wir extrahieren den Text, und
                // reichen die Daten weiter.
                .map( ( i, li ) => ( {
                    key:   $( '.left', li ).text(),
                    value: $( '.right', li ).text(),
                } ) )

                .get()

                // Hier wird die Liste "reduziert": Das heißt, wir
                // transformieren die Schlüssel-Wert-Paare in ein Objekt.
                .reduce( ( details, { key, value } ) => ( {
                    ...details,
                    [ key ]: value,
                } ), {} );

            // Wir erstellen erst hier ein Objekt als result. Wenn auf der Seite
            // keine Produktinformationen gefunden werden können, bleibt die
            // Variable undefiniert und es wird keine Ausgabe für den Writer
            // erzeugt.
            result = {
                link,
                productName,
                productImage,
                pricePerDay,
                description,
                articleNumber,
                technicalDetails,
            };
        }

        // Wir geben die beiden vorher deklarierten Variablen zurück. Wenn die
        // nextUrl leer ist, wird der Crawler anschließend gestoppt.
        // Wenn die Daten leer sind, wird einfach nur die nächste URL gecrawlt.
        return { result, nextUrls };
    }
}

module.exports = Parser;
