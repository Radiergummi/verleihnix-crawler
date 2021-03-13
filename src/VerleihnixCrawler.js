const net     = require( 'net' );
const Crawler = require( 'crawler' );
const Parser  = require( './Parser' );
const Writer  = require( './Writer' );

class VerleihnixCrawler {

    /**
     * Hier initiieren wir den Crawler und setzen die Konfiguration als lokale
     * Variablen in der Instanz.
     *
     * @param {Record<string, any>} config
     * @param {Parser|null}         parser
     * @param {Writer|null}         writer
     */
    constructor(
        config,
        parser = null,
        writer = null,
    ) {

        // Wir mergen die Konfiguration mit unseren Standardwerten. Dadurch muss
        // nicht jede Option in der Konfigurationsdatei angegeben werden, wenn
        // sie wahrscheinlich sowieso nicht geändert werden muss.
        this._config = {
            connectionTimeout: 10_000,
            targetScheme:      'https',
            startUrl:          '/',
            crawlerOptions:    {},
            ...config,
        };

        // Wir übernehmen die Instanzen die übergeben wurden, oder erstellen
        // neue mit unserer Konfiguration.
        this._parser = parser || new Parser( this._config );
        this._writer = writer || new Writer( this._config );
    }

    /**
     * Die start-Methode ist die einzige, die von außerhalb des Moduls
     * aufgerufen werden soll. Sie prüft alle Ausgangsbedingungen und startet
     * anschließend den Crawler.
     *
     * @return {Promise<void>}
     */
    async start() {
        this._writeLog( 'Starting Crawler', '================' );

        // Wir bereiten den Writer vor. Dabei wird geprüft, ob er die Ausgabe
        // überhaupt schreiben kann.
        await this._writer.initialize();

        // Dann prüfen wir, ob der Server überhaupt erreichbar ist
        await this._checkTargetHostIsUp();

        // Wir erstellen einen Crawler, und übergeben ihm unser Handler-Callback
        // mit dem wir die Antworten bearbeiten.
        await this._createCrawler( this._handle.bind( this ) );

        this._writeLog( 'Stopping Crawler', '================' );
    }

    /**
     * Die Handle-Methode arbeitet Crawler-Antworten ab. Dabei muss immer eine
     * oder mehrere neue URL in die Warteschlange eingereiht werden, damit der
     * Crawler weiterläuft - er braucht quasi weiter Treibstoff zum verfeuern.
     *
     * @param  {Crawler}                crawler
     * @param  {CrawlerRequestResponse} response
     * @return {Promise<void>}
     * @private
     */
    async _handle( crawler, response ) {
        this._writeLog( 'Passing response to parser' );

        // Wir starten den Parser, der die Antwort auswertet
        const { result, nextUrls } = await this._parser.parse(
            response,
        );

        // Wir haben ein Ergebnis, also schreiben wir es in die Ausgabe.
        if ( result ) {
            this._writeLog( 'Passing result to writer' );

            await this._writer.write( result );
        }

        // Wir haben alle Seiten gecrawlt! Es gibt also nichts mehr zu holen
        // und wir können die Crawler-Warteschlange beenden. Dazu rufen wir
        // das done-Callback auf, und beenden die Ausführung.
        if ( !nextUrls || nextUrls.length === 0 ) {
            this._writeLog( 'No further URLs in response' );

            return;
        }

        this._writeLog( 'Adding next URL to queue' );

        // Wir haben weitere URLs vom Parser erhalten, also legen wir sie in die
        // Warteschlange; der Crawler bearbeitet sie dann im nächsten Durchlauf.
        nextUrls.forEach( url => crawler.queue( url ) );
    }

    /**
     * Prüft, ob der Zielhost erreichbar ist.
     *
     * @return {Promise<void>}
     * @private
     */
    async _checkTargetHostIsUp() {
        if ( !this._config.targetHost ) {
            throw new Error(
                'Target host not configured: There is no "targetHost" key in ' +
                'the configuration file. Add the target host to your config ' +
                'file and try running the crawler again.\nThe target host ' +
                'should be the host part of the website URL, without scheme ' +
                'and path: For "https://www.example.com/foo", it is ' +
                '"www.example.com".',
            );
        }

        return new Promise( ( resolve, reject ) => {
            this._writeLog(
                `Attempting to connect to ${ this._config.targetHost }:443`,
            );

            // Wir stellen einen Timer: Sobald er abgelaufen ist und wir noch
            // keine Antwort vom Zielserver erhalten haben, brechen wir ab: Der
            // Server ist nicht erreichbar.
            const timer = setTimeout(
                // Erst schließen wir den Netzwerk-Socket, dann markieren wir
                // das Promise als fehlgeschlagen.
                () => socket.end() && reject( 'Connection Timeout' ),
                this._config.connectionTimeout,
            );

            // Ab hier stoppen wir die Zeit für den Verbindungsaufbau.
            const startTime = new Date();

            // Wir öffnen einen Netzwerk-Socket zum Zielserver auf Port 443: Das
            // ist standardmäßig der HTTPS-Port für Webserver.
            const socket = net.createConnection(
                443,
                this._config.targetHost,
                () => {
                    this._writeLog(
                        `Received response from target host ` +
                        `after ${ ( new Date() ) - startTime }ms`,
                    );

                    // Wir löschen den Timeout, damit er die Verbindung nicht
                    // nachträglich abbrechen kann
                    clearTimeout( timer );

                    // Wir markieren das Promise als erfolgreich
                    resolve();

                    // Wir schließen den Socket
                    socket.end();
                } );

            // Wenn auf dem Socket ein Fehler auftritt, brechen wir die
            // Verbindung ab und markieren das Promise als fehlgeschlagen: Wir
            // können nichts mehr tun.
            socket.on(
                'error',
                error => {
                    this._writeLog( `Could not connect: ${ error }` );

                    clearTimeout( timer );

                    reject( error );
                },
            );
        } );
    }

    /**
     * Erstellt eine Crawler-Instanz und startet das Crawling.
     *
     * @param {function(crawler: Crawler, response: CrawlerRequestResponse )} callback
     * @return {Promise<void>}
     * @private
     */
    _createCrawler( callback ) {

        // Hier verpacken wir den kompletten Crawling-Prozess in ein Promise.
        // Dadurch können wir auf die vollständige Abarbeitung aller Links
        // warten und Code ausführen, wenn wir fertig sind.
        return new Promise( ( resolve, reject ) => {
            this._writeLog( 'Creating crawler instance' );

            // Wir zeichnen auf, wie viele URLs wir schon gecrawlt haben. Das
            // ist aber nur als interessante Information gedacht.
            let counter = 0;

            // Wir erstellen eine Crawler-Instanz. Damit können wir den Prozess
            // flexibel steuern, auch während er schon gestartet ist.
            const crawler = new Crawler( {

                // Wir übernehmen die Optionen aus der Konfigurationsdatei. Mit
                // dem spread-Operator (...) mergen wir die Optionen in das
                // aktuelle Objekt, überschreiben aber den Wert von "callback",
                // wenn er angegeben ist.
                ...this._config.crawlerOptions,

                // Anstatt das Callback von unserem Parameter direkt zu
                // übergeben, verpacken wir es in unser eigenes, übergeordnetes
                // Callback, um das Handling etwas zu vereinfachen.
                // Diese Funktion wird für jede gecrawlte URL aufgerufen, wenn
                // wir eine Antwort vom Server erhalten haben.
                callback: async ( error, response, done ) => {
                    this._writeLog(
                        `Received response for "${ response.request.uri.href }"`,
                    );

                    // Wenn ein Fehler aufgetreten ist, bringt es erst gar
                    // nichts unser callback aufzurufen - wir brechen direkt ab.
                    if ( error ) {
                        this._writeLog(
                            `An error occurred during crawling: ${ error }`,
                        );

                        return reject( error );
                    }

                    // Wir zählen den Zähler hoch: Die Antwort muss erfolgreich
                    // gewesen sein, sonst wären wir im Error-Handler angekommen
                    counter++;

                    this._writeLog(
                        `+++++++++++++++++++++ Request ${ counter } +++++++++++++++++++++++++++`,
                    );

                    // Wenn kein Fehler aufgetreten ist, rufen wir das
                    // ursprüngliche Callback auf und übergeben ihm die
                    // Crawler-Instanz und die Antwort vom Server.
                    await callback( crawler, response );

                    // Wir melden uns beim Crawler: Wir haben die aktuelle
                    // Antwort bearbeitet und sind fertig.
                    done();

                    // Wenn der Crawler keine weiteren Links mehr hat, können
                    // wir das Promise erfüllen: Wir sind fertig.
                    if ( crawler.queueSize === 0 ) {
                        return resolve();
                    }
                },
            } );

            // Der Crawler funktioniert, indem er eine Warteschlange von URLs
            // abarbeitet. In unserer Implementierung reihen wir immer neue
            // Seiten in die Warteschlange ein, wenn wir sie auf den
            // Ergebnisseiten finden. Um diesen Prozess zu starten, übergeben
            // wir dem Crawler hier die Start-URL, auf der wir mit dem Crawling
            // anfangen, und von der wir alle folgenden URLs ableiten.
            const startUrl = this._createUrlForPath(
                this._config.startUrl,
            );

            // Indem wir dem Crawler die Stat-URL übergeben, wird die
            // Warteschlange gestartet. Go!
            crawler.queue( startUrl.toString() );

            this._writeLog( `Queued start URL "${ startUrl }"` );
        } );
    }

    /**
     * Baut eine URL-Instanz zum Zielserver aus einem relativen Pfad.
     *
     * @param {string} path
     * @return {URL}
     * @private
     */
    _createUrlForPath( path ) {
        const hostname = this._config.targetHost;
        const scheme   = this._config.targetScheme;

        return new URL( path, `${ scheme }://${ hostname }` );
    }

    /**
     * Schreibt eine Zeile auf die Konsole.
     *
     * @param lines
     * @private
     */
    _writeLog( ...lines ) {
        const date      = new Date();
        const timestamp = date.toDateString() + ' ' +
                          date.getUTCHours() + ':' +
                          date.getUTCMinutes() + ':' +
                          date.getUTCSeconds() + '.' +
                          date.getUTCMilliseconds();

        lines.map( line => console.log( `${ timestamp }\t${ line }` ) );
    }
}

module.exports = VerleihnixCrawler;
