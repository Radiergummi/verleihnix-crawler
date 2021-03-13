const { resolve }                      = require( 'path' );
const { mkdir, appendFile, writeFile } = require( 'fs' ).promises;

/**
 * Writer
 * ======
 * Der Writer schreibt eine CSV-Datei mit allen Ergebnissen.
 */
class Writer {

    /**
     * Erstellt eine neue Writer-Instanz.
     *
     * @param {Record<string, any>} config
     */
    constructor( config ) {
        this._config = {
            ...config,
            outputFilename: 'output',
        };
    }

    /**
     * Initialisiert den Writer.
     *
     * @return {Promise<void>}
     */
    async initialize() {

        // Als erstes stellen wir sicher, dass unser Ausgabepfad existiert
        await this._createOutputDirectoryIfMissing();

        const timestamp = ( new Date ).toUTCString();

        this._filePath = resolve(
            this._config.outputPath,
            `${ this._config.outputFilename }-${ timestamp }.csv`,
        );

        await this._writeHeaders();
    }

    /**
     * Schreibt die CSV-Header an den Anfang der Datei. Dadurch können
     * Tabellen-Programme auch die Überschriften anzeigen.
     * Die Header müssen in der selben Reihenfolge geschrieben werden, wie sie
     * später auch für die Ergebnisse verwendet werden.
     *
     * @return {Promise<void>}
     * @private
     */
    async _writeHeaders() {
        await writeFile(
            this._filePath,
            [
                'articleNumber',
                'productName',
                'productImage',
                'pricePerDay',
                'description',
                'technicalDetails',
                'link',
            ].join( ';' ) + '\n',
        );
    }

    /**
     * Diese Methode schreibt ein Ergebnis des Crawlers in eine Ausgabedatei.
     *
     * @param {any} result
     */
    async write( result ) {

        // Mit appendFile wird der neue Datensatz ans Ende der Datei angehängt
        await appendFile(
            this._filePath,

            // In CSV-Dateien müssen Anführungszeichen um Text mit Leerzeichen
            // verwendet werden. Die einfachste Methode, das zu erreichen, ist
            // den Text als JSON zu konvertieren.
            [
                JSON.stringify( result.articleNumber ),
                JSON.stringify( result.productName ),
                JSON.stringify( result.productImage ),
                JSON.stringify( result.pricePerDay ),
                JSON.stringify( result.description ),
                JSON.stringify( result.technicalDetails ),
                JSON.stringify( result.link ),

                // Anschließend werden alle Werte mit einem Semikolon verbunden
                // und Zeilenumbrüche escaped.
            ].join( ';' ).replace( '\n', '\\n' ) + '\n',
        );
    }

    /**
     * Erstellt den Ausgabepfad, wenn er noch nicht existiert.
     *
     * @return {Promise<string>} Ein Promise mit dem vollständigen Ausgabepfad.
     * @throws Wenn der Ausgabepfad nicht konfiguriert wurde.
     * @private
     */
    async _createOutputDirectoryIfMissing() {
        const pathToOutputDirectory = this._config.outputPath;

        // Wir brauchen einen Ausgabepfad, um die Ergebnisse zu schreiben. Hier
        // stellen wir sicher, dass einer konfiguriert ist.
        if ( !pathToOutputDirectory ) {
            throw new Error(
                'Output directory not configured: There is no "outputPath" ' +
                'key in the configuration file. Add the path to your config ' +
                'file and try running the crawler again.\nThe output ' +
                'directory should be the full filesystem path to a writable ' +
                'directory, eg. "' + process.cwd() + '/output".',
            );
        }

        // Wir stellen sicher, dass der Pfad ein vollständiger Ordnerpfad ist
        const resolvedPath = resolve( pathToOutputDirectory );

        // Wir erstellen den Ausgabepfad. Wenn er schon existiert, passiert hier
        // einfach gar nichts, wir können also anschließend davon ausgehen, dass
        // alles korrekt vorbereitet ist.
        await mkdir( resolvedPath, {
            recursive: true,
        } );
    }
}

module.exports = Writer;
