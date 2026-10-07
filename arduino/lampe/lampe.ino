// Lampe-styring til selvbetjeningskasse-simulatoren.
// Kører på Arduino Uno eller Nano med en WS2812 (NeoPixel) LED-ring på pin 6.
//
// Protokol (tekstlinjer afsluttet med \n, 9600 baud):
//   PING                 -> Arduinoen svarer PONG
//   LAMP RED STEADY      -> rød, fast lys
//   LAMP YELLOW BLINK    -> gul, blinker (500 ms tændt/slukket)
//   LAMP BLUE FAST       -> blå, blinker hurtigt (150 ms tændt/slukket)
//   LAMP OFF             -> slukket
// Ukendte linjer ignoreres.

#include <Adafruit_NeoPixel.h>

// Juster disse to efter din egen ring.
const uint16_t LED_COUNT = 12;
const uint8_t BRIGHTNESS = 80; // 0-255

const uint8_t LED_PIN = 6;
const unsigned long BAUD_RATE = 9600;
const unsigned long BLINK_INTERVAL_MS = 500;
const unsigned long FAST_INTERVAL_MS = 150;

Adafruit_NeoPixel ring(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

enum LampPattern { STEADY, BLINK, FAST };

uint32_t currentColor = 0; // 0 = slukket
LampPattern currentPattern = STEADY;
bool isLit = false; // bruges kun til at veksle under BLINK/FAST
unsigned long lastToggleAt = 0;

String inputLine = "";

bool colorFor(const String &name, uint32_t &outColor) {
  if (name == "RED") {
    outColor = ring.Color(255, 0, 0);
    return true;
  }
  if (name == "YELLOW") {
    outColor = ring.Color(255, 180, 0);
    return true;
  }
  if (name == "BLUE") {
    outColor = ring.Color(0, 0, 255);
    return true;
  }
  return false;
}

void setRing(uint32_t color) {
  for (uint16_t i = 0; i < LED_COUNT; i++) {
    ring.setPixelColor(i, color);
  }
  ring.show();
}

// Kort grøn runde ved opstart, så man kan se at ringen virker.
void startupSweep() {
  uint32_t green = ring.Color(0, 255, 0);
  for (uint16_t i = 0; i < LED_COUNT; i++) {
    ring.setPixelColor(i, green);
    ring.show();
    delay(30);
  }
  delay(200);
  setRing(0);
}

void applyOff() {
  currentColor = 0;
  currentPattern = STEADY;
  isLit = false;
  setRing(0);
}

void applyLamp(const String &colorName, const String &patternName) {
  uint32_t color;
  if (!colorFor(colorName, color)) {
    return; // ukendt farve, ignoreres
  }

  LampPattern pattern;
  if (patternName == "STEADY") {
    pattern = STEADY;
  } else if (patternName == "BLINK") {
    pattern = BLINK;
  } else if (patternName == "FAST") {
    pattern = FAST;
  } else {
    return; // ukendt mønster, ignoreres
  }

  currentColor = color;
  currentPattern = pattern;
  isLit = true;
  lastToggleAt = millis();
  setRing(currentColor);
}

void handleCommand(String line) {
  line.trim();
  if (line.length() == 0) {
    return;
  }

  if (line == "PING") {
    Serial.println("PONG");
    return;
  }

  if (line.startsWith("LAMP ")) {
    String rest = line.substring(5);
    rest.trim();

    if (rest == "OFF") {
      applyOff();
      return;
    }

    int spaceIndex = rest.indexOf(' ');
    if (spaceIndex == -1) {
      return; // ufuldstændig kommando, ignoreres
    }

    String colorName = rest.substring(0, spaceIndex);
    String patternName = rest.substring(spaceIndex + 1);
    patternName.trim();
    applyLamp(colorName, patternName);
    return;
  }

  // Alle andre/ukendte kommandoer ignoreres.
}

void setup() {
  Serial.begin(BAUD_RATE);
  ring.begin();
  ring.setBrightness(BRIGHTNESS);
  ring.show();
  startupSweep();
}

void loop() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n') {
      handleCommand(inputLine);
      inputLine = "";
    } else if (c != '\r') {
      inputLine += c;
    }
  }

  // Blink laves med millis(), så Serial altid kan læses med det samme -
  // aldrig med delay().
  if (currentPattern != STEADY && currentColor != 0) {
    unsigned long interval = (currentPattern == BLINK) ? BLINK_INTERVAL_MS : FAST_INTERVAL_MS;
    if (millis() - lastToggleAt >= interval) {
      lastToggleAt = millis();
      isLit = !isLit;
      setRing(isLit ? currentColor : 0);
    }
  }
}
