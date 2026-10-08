# Lampe til selvbetjeningskassen (ESP32 + relæ)

Denne mappe indeholder firmwaren `esp32-lampe.ino`, der styrer fejl-lampen
via et Seeed Grove Relay ud fra kommandoer sendt fra appen over USB. Der er
intet separat program på laptoppen - selve kasseappen taler direkte med
ESP32'en over Web Serial, når instruktøren klikker "Forbind ESP32" i
instruktørpanelet.

## Indkøbsliste

- Et ESP32 udviklingsboard (fx ESP32-DevKitC eller lignende)
- Et Seeed Grove Relay-modul
- Et Grove-kabel (4-leder: SIG, NC, VCC, GND)
- En rød lampe på lav spænding (12V/24V, afhængigt af lampen)
- Strømforsyning til lampen, der matcher dens spænding
- USB-kabel til at forbinde ESP32'en til den bærbare computer

## Sådan forbindes relæet til ESP32

Grove-kablet har 4 ledere, men kun 3 bruges:

```
 ESP32                              Grove Relay
 ┌─────────────┐                    ┌─────────────┐
 │     GPIO 26 ●────────────────────● SIG         │
 │         3V3 ●────────────────────● VCC         │
 │    (el. 5V) │                    │             │
 │         GND ●────────────────────● GND         │
 └─────────────┘                    └─────────────┘
```

- **SIG** til **GPIO 26** (konstanten `RELAY_PIN` øverst i sketchen - ret den
  her, hvis relæet skal sidde på en anden pin).
- **VCC** til **3V3** eller **5V** på ESP32'en, afhængigt af hvad
  relæ-modulet er mærket til at bruge.
- **GND** til **GND**.

## Sådan forbindes lampen til relæet

Relæet har to klemmer mærket **COM** (common) og **NO** (normally open), samt
en tredje klemme **NC** (normally closed), som ikke bruges her:

```
 Strømforsyning til lampen        Relæ               Lampe
 ┌──────────────┐          ┌──────────────┐    ┌──────────────┐
 │           +  ●──────────● COM          │    │              │
 │              │          │           NO ●────● +            │
 │           -  ●──────────┼──────────────┼────● -             │
 └──────────────┘          └──────────────┘    └──────────────┘
```

Strømforsyningens plus-pol går gennem relæets **COM** og **NO** klemmer, og
derfra videre til lampens plus. Minus fra strømforsyningen går direkte til
lampens minus. Når relæet er slukket, er kredsen brudt, og lampen er slukket.
Når relæet tænder (GPIO 26 sættes højt), sluttes kredsen, og lampen lyser.

**Vigtigt:** Vælg en lampe og strømforsyning med en spænding, der passer til
relæets specifikationer (typisk op til 30V DC / nogle få ampere for et Grove
Relay). Bland ikke lampens strømkreds med ESP32'ens eget 3V3/5V - relæet
isolerer de to kredse fra hinanden.

## Installer ESP32 board-pakken i Arduino IDE

1. Åbn Arduino IDE.
2. Gå til **File → Preferences** (eller **Arduino IDE → Settings** på Mac) og
   tilføj denne URL under "Additional Boards Manager URLs":
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Gå til **Tools → Board → Boards Manager…**, søg efter "esp32" (af
   Espressif Systems) og klik **Install**.
4. Vælg dit specifikke ESP32-board under **Tools → Board → esp32**.
5. Hvis boardet ikke dukker op som en COM-port, skal du muligvis installere
   en USB-driver til boardets USB-til-seriel-chip først:
   - **CP210x**-driver (Silicon Labs) til boards med en CP2102/CP2104-chip.
   - **CH340**-driver (WCH) til boards med en CH340/CH9102-chip.
   Se bagsiden af dit board eller forhandlerens side for at se, hvilken chip
   det bruger.
6. Åbn `esp32-lampe.ino`, vælg den rigtige USB-port under **Tools → Port**,
   og upload sketchen.

## Test med Serial Monitor uden appen

Du kan afprøve relæet uden at starte selve kasse-appen:

1. Åbn **Tools → Serial Monitor** i Arduino IDE.
2. Sæt baudrate til **115200** nederst i vinduet.
3. Sæt linjeafslutning til **Newline** (eller **Both NL & CR**).
4. Skriv kommandoer i indtastningsfeltet og tryk Enter/Send:
   - `PING` - boardet svarer `PONG`.
   - `ON` - relæet tænder (og den indbyggede LED på boardet lyser).
   - `OFF` - relæet slukker igen.

**Vigtigt:** Luk Serial Monitor-vinduet, før du prøver at forbinde fra
kasseappen (klik "Forbind ESP32" i instruktørpanelet). Kun ét program kan
have COM-porten åben på samme tid - hvis Serial Monitor stadig har den åben,
vil appens forbindelsesforsøg mislykkes.

Hvis der ikke sendes nogen gyldig kommando i 15 sekunder, slukker firmwaren
automatisk relæet af sig selv - det er med vilje, så lampen ikke bliver
hængende på tændt, hvis forbindelsen mistes.
