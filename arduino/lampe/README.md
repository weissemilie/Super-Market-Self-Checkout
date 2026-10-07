# Lampe til selvbetjeningskassen

Denne mappe indeholder Arduino-sketchen `lampe.ino`, der styrer fejl-lampen
(en WS2812/NeoPixel LED-ring) ud fra kommandoer sendt fra appen over USB.

## Indkøbsliste

- Arduino Uno eller Arduino Nano
- En WS2812/NeoPixel LED-ring med 12 LED'er (sketchen kan justeres til et
  andet antal, se konstanten `LED_COUNT` øverst i `lampe.ino`)
- En modstand på 330 ohm (beskytter dataledningen)
- Jumperledninger
- USB-kabel til at forbinde Arduinoen til den bærbare computer

## Sådan forbindes ringen

```
 Arduino                         WS2812 LED-ring
 ┌─────────────┐                 ┌─────────────┐
 │          5V ●─────────────────● 5V          │
 │         GND ●─────────────────● GND         │
 │              │                 │             │
 │       Pin 6  ●───[330 ohm]─────● DIN         │
 └─────────────┘                 └─────────────┘
```

- **5V** på Arduinoen til **5V** på ringen.
- **GND** på Arduinoen til **GND** på ringen.
- **Pin 6** på Arduinoen til **DIN** på ringen, gerne gennem en modstand på
  330 ohm i selve dataledningen. Modstanden er ikke strengt nødvendig for at
  det virker, men beskytter den første LED mod spændingsspidser.

## Installer biblioteket i Arduino IDE

1. Åbn Arduino IDE.
2. Gå til **Sketch → Include Library → Manage Libraries…** (eller
   **Funktioner → Inkludér bibliotek → Administrer biblioteker…** på dansk).
3. Søg efter "Adafruit NeoPixel" og klik **Install**.
4. Åbn `lampe.ino` i Arduino IDE, vælg det rigtige board (Uno eller Nano) og
   den rigtige USB-port under **Tools → Board** og **Tools → Port**.
5. Upload sketchen til Arduinoen.

## Test med Serial Monitor uden appen

Du kan afprøve lampen uden at starte selve kasse-appen:

1. Åbn **Tools → Serial Monitor** i Arduino IDE.
2. Sæt baudrate til **9600** nederst i vinduet.
3. Sæt linjeafslutning til **Newline** (eller **Both NL & CR**).
4. Skriv kommandoer i indtastningsfeltet og tryk Enter/Send:
   - `PING` - Arduinoen svarer `PONG`.
   - `LAMP RED STEADY` - ringen lyser fast rødt.
   - `LAMP YELLOW BLINK` - ringen blinker gult hvert halve sekund.
   - `LAMP BLUE FAST` - ringen blinker hurtigt blåt.
   - `LAMP OFF` - ringen slukkes.

Ved opstart (eller efter genstart/upload) laver ringen en kort grøn runde,
så du kan se at den virker, selv uden at sende nogen kommandoer.
