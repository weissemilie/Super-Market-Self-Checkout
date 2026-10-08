// Lampe-styring til selvbetjeningskasse-simulatoren.
// Kører på et ESP32 udviklingsboard, der styrer et Seeed Grove Relay.
// Relæet tænder/slukker en rød lampe på lav spænding. Ingen eksterne
// biblioteker - kun det indbyggede Arduino-API for ESP32.
//
// Protokol (tekstlinjer afsluttet med \n, 115200 baud):
//   PING -> boardet svarer PONG
//   ON   -> relæet tændes
//   OFF  -> relæet slukkes
// Mellemrum og CR i enden af linjen fjernes, og store/små bogstaver er lige
// gyldige (fx "on" og "ON" virker begge). Ukendte linjer ignoreres.

const uint8_t RELAY_PIN = 26;
const uint8_t STATUS_LED_PIN = 2;
const unsigned long BAUD_RATE = 115200;

// Slukker relæet automatisk, hvis der ikke er modtaget en gyldig kommando
// (PING, ON eller OFF) i denne periode - fx hvis laptoppen går i dvale, eller
// kablet trækkes ud, mens lampen er tændt.
const unsigned long COMMAND_TIMEOUT_MS = 15000;

bool relayOn = false;
unsigned long lastValidCommandAt = 0;
String inputLine = "";

void setRelay(bool on) {
  relayOn = on;
  digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  // Den indbyggede LED følger relæet, så man kan se at det virker uden en
  // lampe tilsluttet.
  digitalWrite(STATUS_LED_PIN, on ? HIGH : LOW);
}

void handleCommand(String line) {
  line.trim(); // fjerner mellemrum og CR/LF i begge ender af linjen
  if (line.length() == 0) {
    return;
  }

  String upper = line;
  upper.toUpperCase();

  if (upper == "PING") {
    Serial.println("PONG");
    lastValidCommandAt = millis();
    return;
  }

  if (upper == "ON") {
    setRelay(true);
    lastValidCommandAt = millis();
    return;
  }

  if (upper == "OFF") {
    setRelay(false);
    lastValidCommandAt = millis();
    return;
  }

  // Alle andre/ukendte linjer ignoreres.
}

void setup() {
  // Pinnen sættes lav, før den sættes som output, så relæet (og dermed
  // lampen) ikke blinker/klikker ved opstart.
  digitalWrite(RELAY_PIN, LOW);
  pinMode(RELAY_PIN, OUTPUT);

  digitalWrite(STATUS_LED_PIN, LOW);
  pinMode(STATUS_LED_PIN, OUTPUT);

  Serial.begin(BAUD_RATE);
  lastValidCommandAt = millis();
}

void loop() {
  // Læser Serial uden at blokere - aldrig delay() her, så PING altid kan
  // besvares med det samme.
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n') {
      handleCommand(inputLine);
      inputLine = "";
    } else {
      inputLine += c;
    }
  }

  if (relayOn && millis() - lastValidCommandAt >= COMMAND_TIMEOUT_MS) {
    setRelay(false);
  }
}
