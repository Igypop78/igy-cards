# Changelog

## [1.0.0] – 2026-10-29

Prvé vydanie balíka – 9 kariet v jednom súbore `igy-cards.js`:

- **igy-energy-card** – aktuálne toky energie (dom, FVE, batéria, sieť, plyn, voda, TUV) a rozbaľovací prehľad deň / týždeň / mesiac / rok z nastavení Energy.
- **igy-weather-card** – hodinový pás od polnoci do zajtra s históriou, východom a západom slnka a prstencom výroby FVE (Solcast); tri ďalšie dni.
- **igy-thermostat-card** – viac termostatov v jednej karte, čiara požiadavky na kúrenie za 24 h, otvorené okná.
- **igy-room-card** – miestnosti z oblastí HA: svetlá, teplota, vlhkosť, okná, pohyb; zbaliteľná.
- **igy-entities-card** – náhrada karty Entities s ovládaním podľa typu entity, skupinami a zbaliteľnými entitami.
- **igy-buttons-card** – tlačidlá v rozložení dlaždice / pilulky / ikony, potvrdenie druhým ťuknutím.
- **igy-markdown-card** – markdown v jednotnom štýle, skupiny cez `---`.
- **igy-circuits-card** – spotreba po okruhoch a fázach so zbaliteľnými skupinami ističov.
- **igy-battery-card** – hlavný merač batérie a tabuľka jednotlivých BMS (SOC, rozdiel článkov, teplota, cykly, vyrovnávanie).

Karty boli predtým známe ako `home-…-card`, `area-room-card` a `multi-thermostat-card` – v YAML stačí zmeniť `type` (pozri README).
