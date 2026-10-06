# Projekt
Simulator af en selvbetjeningskasse i et supermarked til en spejderaktivitet. Kører som React app med TypeScript og Vite i Chrome i fuldskærm på en bærbar computer.

# Hardware
USB stregkodescannere opfører sig som et tastatur og sender stregkodens tegn efterfulgt af Enter. En Arduino med en lampe tilsluttes senere via Web Serial API.

# Spillet
Spejderne er kunder og scanner varer. Med jævne mellemrum opstår en tilfældig fejl. Kassen låses, lampen lyser, og skærmen viser en fejlkode. Spejderne skal scanne de rigtige personalekort i den rigtige rækkefølge for at låse kassen op. Et forkert kort nulstiller rækkefølgen og giver en kort straf.

# Regler for koden
- TypeScript strict og funktionelle komponenter.
- Al kassens tilstand håndteres i én ren reducer i src/checkout. Reduceren kalder aldrig Date.now eller Math.random, tid og tilfældighed sendes ind i handlingerne.
- Komponenter viser kun tilstand og sender handlinger. De indeholder ikke spillogik.
- Lampen styres kun gennem interfacet LampController i src/lamp. Ingen anden kode må kende til Arduino eller Web Serial.
- Varer, fejl og personalekort ligger i JSON filer i src/data.
- Stregkoder på personalekort består kun af store bogstaver A til Z og tallene 0 til 9.
- Ingen backend, ingen router bibliotek og ingen UI biblioteker. Almindelig CSS med CSS moduler.
- Al tekst i brugerfladen er på dansk og stor nok til at læses på to meters afstand.
- Små filer, beskrivende navne på engelsk, korte kommentarer.
- Logik skrives så den kan testes med Vitest.
