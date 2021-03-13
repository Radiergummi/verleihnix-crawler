/******************************************************************************
 *
 * index.js
 * Diese Datei ist der Einstiegspunkt für das Programm. Sie dient vor allem
 * dazu, die Benutzung von der Kommandozeile einfach möglich zu machen.
 * Der interessante Teil findet in der Crawler-Klasse unten statt.
 *
 ******************************************************************************
 */

const VerleihnixCrawler = require( './src/VerleihnixCrawler' );
const configuration     = require( './config.json' );

// Hier erstellen wir eine Instanz von unserem Crawler und übergeben ihm die
// Konfigurationsdaten.
const crawler = new VerleihnixCrawler( configuration );

// Der Crawler ist vorbereitet, wir können starten!
crawler.start()
       .catch( error => console.error(
           `An error ocurred during processing: ${ error.message }\n${ error }`,
       ) );
