Verleihnix Crawler
==================
Das ist ein einfacher Crawler für [www.verleihnix.de](https://www.verleihnix.de).  
Er ist mit Node.js geschrieben und lädt alle Produkte als JSON-Datei herunter.

Benutzung
---------
Der Crawler kann mit folgendem Befehl gestartet werden:
```bash
node ./index.js
```

Wie funktioniert’s?
-------------------
Der Crawler arbeitet im Prinzip nach folgendem Schema:

1. **Start-URL abrufen**: Wir fragen die erste URL der Zielseite ab und werten sie auf Informationen aus.
2. **Antwort verarbeiten**: Wir speichern die Daten in einem Format, das wir anschließend weiterverarbeiten können.
3. **Nächste URL suchen**: Wir suchen im HTML der Antwort nach der nächsten URL und legen sie in unsere Warteschlange.

Beim Crawling kommt es immer sehr auf den Aufbau der Zielseite an; wir können aber einige Schritte einheitlich ausführen. Dieses Beispielprojekt soll das
darstellen und kann für andere Projekte abgewandelt werden.

Die Technik
-----------
Der Crawler basiert auf mehreren Komponenten, die sich gegenseitig ergänzen:

- Der [VerleihnixCrawler](./src/VerleihnixCrawler.js) steuert den Programmablauf und verbindet alle Komponenten miteinander.
- Die Library [crawler](https://github.com/bda-research/node-crawler) führt die HTTP-Anfragen an den Server aus und gibt dabei vor, ein ganz normaler Webbrowser
  zu sein.
- Der [Parser](./src/Parser.js) wertet die Server-Antworten aus und erstellt Datenobjekte.
- Der [Writer](./src/Writer.js) schreibt die Datenobjekte in die Ausgabedatei.

Alle Komponenten verwenden [Promises](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Promise), um asynchron Daten verarbeiten zu
können.
