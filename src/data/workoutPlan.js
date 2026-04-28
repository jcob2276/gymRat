export const WORKOUT_PLAN = {
  A: {
    title: "Dzień A - Poniedziałek",
    subtitle: "Góra Ciężka + Siła Bench",
    color: "dayA",
    exercises: [
      { id: 1, name: "Wyciskanie płaskie (ciężko)", sets: 3, reps: "5", msp: 2, tempo: "21x1", rest: 180, notes: "Według tabeli" },
      { id: 2, name: "Wyciskanie skośne", sets: 3, reps: "8-10", msp: 3, tempo: "21x1", rest: 120, notes: "Górna klatka" },
      { id: 3, name: "Pull-upy szerokie (obc.)", sets: 3, reps: "6-8", msp: 2, tempo: "21x1", rest: 120, notes: "+2,5 kg przy 3x10" },
      { id: 4, name: "Wznosy bokiem dropset", sets: 4, reps: "10/5/5", pws: "4/5/5", tempo: "21x1", rest: 15, notes: "V-shape priorytet" },
      { id: 5, name: "Wiosłowanie hantlem", sets: 3, reps: "8/str", msp: 3, tempo: "21x1", rest: 90, notes: "Grubość pleców" },
      { id: 6, name: "Uginanie sztangi stojąc", sets: 2, reps: "8-10", msp: 4, tempo: "21x1", rest: 60, notes: "Biceps #1" },
      { id: 7, name: "Ab wheel rollout", sets: 3, reps: "MAX", tempo: "kontr.", rest: 60, notes: "Core anty-ATP" },
    ]
  },
  B: {
    title: "Dzień B - Wtorek",
    subtitle: "Plecy + Barki + Tył Uda + Triceps",
    color: "dayB",
    exercises: [
      { id: 1, name: "RDL", sets: 3, reps: "6", msp: 2, tempo: "22x1", rest: 180, notes: "Tył uda" },
      { id: 2, name: "OHP żołnierskie", sets: 3, reps: "8", msp: 2, tempo: "21x1", rest: 150, notes: "Siła barków" },
      { id: 3, name: "Ściąganie drążka szeroko", sets: 3, reps: "8", msp: 3, tempo: "21x1", rest: 120, notes: "Szerokość pleców" },
      { id: 4, name: "Prostowanie łokci (wyciąg)", sets: 3, reps: "10", msp: 4, tempo: "20x0", rest: 90, notes: "Triceps #1" },
      { id: 5, name: "Odwrotne rozpiętki", sets: 3, reps: "12-15", msp: 4, tempo: "30x0", rest: 90, notes: "Tył barku" },
      { id: 6, name: "Face pulls", sets: 3, reps: "12-15", msp: 4, tempo: "21x1", rest: 90, notes: "Zdrowie barku" },
    ]
  },
  C: {
    title: "Dzień C - Środa",
    subtitle: "Nogi + ATP + Tył Uda + Łydki + Prostow.",
    color: "dayC",
    exercises: [
      { id: 1, name: "Przysiad", sets: 3, reps: "5", msp: 2, tempo: "32x1", rest: 180, notes: "Kontrola miednicy" },
      { id: 2, name: "Wykrok w miejscu z hant.", sets: 3, reps: "10-12/str", msp: 3, tempo: "21x1", rest: 120, notes: "Łatwiejszy, bezp." },
      { id: 3, name: "Hip Thrust", sets: 3, reps: "8", msp: 3, tempo: "21x1", rest: 120, notes: "Obowiązkowy ATP" },
      { id: 4, name: "Hyperextension", sets: 3, reps: "12-15", msp: 4, tempo: "kontr.", rest: 90, notes: "Prostowniki" },
      { id: 5, name: "Leg curl", sets: 3, reps: "10-12", msp: 4, tempo: "21x0", rest: 90, notes: "Tył uda" },
      { id: 6, name: "Wspięcia na palce stojąc", sets: 3, reps: "10", msp: 4, tempo: "22x1", rest: 90, notes: "Tylko 3 serie" },
      { id: 7, name: "Pallof Press", sets: 3, reps: "10/str", tempo: "kontr.", rest: 60, notes: "Core antyrotacja" },
    ]
  },
  D: {
    title: "Dzień D - Czwartek",
    subtitle: "Lekki Bench + Ramiona",
    color: "dayD",
    exercises: [
      { id: 1, name: "Wyciskanie płaskie (lekko)", sets: 3, reps: "8-10", pws: 3, tempo: "21x1", rest: 120, notes: "70-80% z A" },
      { id: 2, name: "Pull-upy podchwytem", sets: 3, reps: "MAX-1", tempo: "21x1", rest: 120, notes: "Biceps pośrednio" },
      { id: 3, name: "Uginanie hantli stojąc", sets: 2, reps: "10-12", msp: 4, tempo: "21x1", rest: 60, notes: "Biceps #2" },
      { id: 4, name: "Dipy na poręczach", sets: 3, reps: "MAX", msp: 3, tempo: "21x1", rest: 90, notes: "Triceps #2" },
      { id: 5, name: "Wznosy bokiem stojąc", sets: 3, reps: "12", msp: 4, tempo: "21x1", rest: 60, notes: "Lekko, kontrola" },
    ]
  }
};

export const BENCH_PROGRESSION = [
  { week: "1-2", target: "80x5 / 82,5x5 / 85x3", light: "65kg" },
  { week: "3-4", target: "82,5x5 / 85x5 / 87,5x3", light: "67,5kg" },
  { week: "5-6", target: "85x5 / 87,5x5 / 90x2-3", light: "70kg" },
  { week: "7-8", target: "87,5x5 / 90x5 / 92,5x2-3", light: "72,5kg" },
  { week: "9-10", target: "90x5 / 92,5x5 / 95x2", light: "75kg" },
  { week: "11-12", target: "92,5x5 / 95x5 / 97,5x2", light: "77,5kg" },
  { week: "12", target: "PRÓBA 100 kg", light: "77,5kg", isPR: true },
];
