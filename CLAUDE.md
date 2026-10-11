# Projekt
Simulator af en selvbetjeningskasse i et supermarked til en spejderaktivitet. Kører som React app med TypeScript og Vite i Chrome i fuldskærm på en bærbar computer.

# Hardware
USB stregkodescannere opfører sig som et tastatur og sender stregkodens tegn efterfulgt af Enter. Hver kasse er forbundet via USB til et relæ-board (Seeed Wio Terminal eller Arduino MKR WiFi 1010), der styrer en lampe på lav spænding. Relæet kan kun tænde og slukke. Appen taler selv med boardet over Web Serial API (115200 baud) med protokollen ON, OFF og STATUS (svar OK ON, OK OFF, STATE ON/OFF). Firmware og protokol ligger i https://github.com/Rud-X/supersupermarked, og firmwaren ændres ikke herfra. Der er intet separat program på laptoppen.

# Spillet
Spejderne er kunder og scanner varer. Med jævne mellemrum opstår en tilfældig fejl. Kassen låses, lampen lyser, og skærmen viser en fejlkode. Spejderne skal scanne de rigtige personalekort i den rigtige rækkefølge for at låse kassen op. Et forkert kort nulstiller rækkefølgen og giver en kort straf.

# Regler for koden
- TypeScript strict og funktionelle komponenter.
- Al kassens tilstand håndteres i én ren reducer i src/checkout. Reduceren kalder aldrig Date.now eller Math.random, tid og tilfældighed sendes ind i handlingerne.
- Komponenter viser kun tilstand og sender handlinger. De indeholder ikke spillogik.
- Lampen styres kun gennem interfacet LampController i src/lamp. Ingen anden kode må kende til relæ-boardet eller Web Serial.
- Varer, fejl og personalekort ligger i JSON filer i src/data.
- Stregkoder på personalekort består kun af store bogstaver A til Z og tallene 0 til 9.
- Ingen backend, ingen router bibliotek og ingen UI biblioteker. Almindelig CSS med CSS moduler.
- Al tekst i brugerfladen er på dansk og stor nok til at læses på to meters afstand.
- Små filer, beskrivende navne på engelsk, korte kommentarer.
- Logik skrives så den kan testes med Vitest.
