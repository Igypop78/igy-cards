# Changelog

## [1.3.1] – 2026-10-31
### Changed
- Room card: the per-entity option for lights is now labelled *Room light* – switching it off excludes the light (e.g. a fan on a dimmer, stair lighting) from the lights counter, the title tap and the lights-off badge; its own button still works.

## [1.3.0] – 2026-10-31
### Added
- English UI for all cards and editors. The language follows the Home Assistant user language (`hass.locale.language`); Slovak is used for `sk`, English for everything else.
- Weather card: `ring_max` is now available in the visual editor.

### Changed
- Room card: the `language` option was removed – the card uses the Home Assistant language like all other cards.
- Energy card: the default title is translated (an explicit `title` is kept as is).
- README screenshots are now in English.

## [1.2.0] – 2026-10-31

**igy-room-card 2.0.0**
- Nový editor: všetky entity oblasti v sekciách Hlavička / Tlačidlá / Sekundárne / Skryté – ťahanie za ⠿ v rámci sekcie aj medzi sekciami, oko skryje entitu len v tejto karte, ⋮ = vlastný názov, ikona a či ju zapína ťuk na nadpis. Entity, ktoré sa automaticky nezobrazujú, sú v časti „Ďalšie entity v oblasti“. Dá sa pridať aj entita z inej oblasti a vrátiť automatické rozloženie.
- Nové voľby `buttons`, `hidden`, `customize`, `new_entities` (auto / hide) a `language` (auto / en / sk). Doterajšie `order` sa číta ako `buttons`.
- **Štítky sa už nepoužívajú** (Skryť, Hlavička, Karta izby, Sekundárne, Mimo izby…). Nastavenia z nich treba preniesť do editora karty.
- Karta aj editor sú lokalizované – angličtina a slovenčina podľa jazyka HA.

## [1.1.0] – 2026-10-29

- **Nová karta igy-camera-card** (bývalá kamery-card) – mriežka kamier cez WebRTC (go2rtc / Frigate), na celej obrazovke najprv malý stream a potom plné rozlíšenie, zoom a posun prstami. Má vizuálny editor (kamery, streamy, pomer strán, stĺpce, režimy, snímka pri načítaní) a voľbu `show_name`. Vyžaduje WebRTC Camera (AlexxIT) z HACS.
- Snímka pri načítaní (`poster`) už nemá predvolenú adresu – treba ju zadať v konfigurácii.
- Nové náhľady kariet v README v predvolenej svetlej téme Home Assistantu.

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
