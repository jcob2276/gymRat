export const WORKOUT_PLAN = {
  A: {
    title: "Dzień A - Niedziela",
    subtitle: "Góra Ciężka / Priorytety",
    color: "dayA",
    exercises: [
      { id: 1, name: "Wyciskanie płaskie (Heavy)", sets: 3, reps: "5", msp: 2, tempo: "21x1", rest: 180, notes: "Klucz do 100kg" },
      { id: 2, name: "Wyciskanie hantli skos (+)", sets: 3, reps: "8-10", msp: 3, tempo: "21x1", rest: 120, notes: "Górna klatka" },
      { id: 3, name: "Pull-upy szerokie (obciążenie)", sets: 3, reps: "6-8", msp: 2, tempo: "21x1", rest: 120, notes: "Szerokość pleców" },
      { id: 4, name: "Chest Supp. Row / Wiosł. hantlem", sets: 3, reps: "8-10", msp: 3, tempo: "21x1", rest: 90, notes: "Grubość pleców" },
      { id: 5, name: "Wznosy bokiem (Side Delts)", sets: 4, reps: "15-20", pws: 3, tempo: "21x1", rest: 60, notes: "V-Shape priorytet" },
      { id: 6, name: "Uginanie sztangi stojąc", sets: 2, reps: "8-10", msp: 4, tempo: "21x1", rest: 60, notes: "Biceps" },
    ]
  },
  B: {
    title: "Dzień B - Wtorek",
    subtitle: "Plecy / Tył Barku / Tył Uda",
    color: "dayB",
    exercises: [
      { id: 1, name: "RDL (Martwy na prostych)", sets: 3, reps: "6", msp: 2, tempo: "22x1", rest: 180, notes: "Postawa + Tył uda" },
      { id: 2, name: "OHP żołnierskie", sets: 3, reps: "8", msp: 2, tempo: "21x1", rest: 150, notes: "Siła barków" },
      { id: 3, name: "Ściąganie drążka szeroko", sets: 3, reps: "10-12", msp: 3, tempo: "21x1", rest: 120, notes: "Szerokość" },
      { id: 4, name: "Rear Delt Row (Tył barku)", sets: 3, reps: "10-12", msp: 4, tempo: "21x1", rest: 90, notes: "Korekta postawy" },
      { id: 5, name: "Face pulls (kciuki do tyłu)", sets: 3, reps: "15", msp: 4, tempo: "21x1", rest: 90, notes: "Zdrowie barku" },
      { id: 6, name: "Wznosy bokiem hantli", sets: 4, reps: "12-15", pws: 3, tempo: "21x1", rest: 60, notes: "V-Shape" },
    ]
  },
  C: {
    title: "Dzień C - Czwartek",
    subtitle: "Nogi / ATP / Core",
    color: "dayC",
    exercises: [
      { id: 1, name: "Przysiad", sets: 3, reps: "5", msp: 2, tempo: "32x1", rest: 180, notes: "Kontrola miednicy" },
      { id: 2, name: "Hip Thrust (z podwinięciem)", sets: 3, reps: "8-10", msp: 3, tempo: "21x1", rest: 120, notes: "Anty-ATP" },
      { id: 3, name: "Wykroki (miejsce/bułgar)", sets: 3, reps: "10/str", msp: 3, tempo: "21x1", rest: 120, notes: "Stabilizacja" },
      { id: 4, name: "Hyperextension", sets: 3, reps: "12-15", msp: 4, tempo: "kontr.", rest: 90, notes: "Prostowniki" },
      { id: 5, name: "Leg curl", sets: 3, reps: "10-12", msp: 4, tempo: "21x0", rest: 90, notes: "Izolacja tył" },
      { id: 6, name: "Pallof Press", sets: 3, reps: "10/str", tempo: "kontr.", rest: 60, notes: "Core antyrotacja" },
      { id: 7, name: "Wspięcia na palce stojąc", sets: 3, reps: "12", msp: 4, tempo: "22x1", rest: 90, notes: "Łydka" },
    ]
  },
  D: {
    title: "Dzień D - Piątek/Sobota",
    subtitle: "Lekki Bench / Ramiona / Core",
    color: "dayD",
    exercises: [
      { id: 1, name: "Wyciskanie płaskie (Light)", sets: 3, reps: "8-10", pws: 3, tempo: "21x1", rest: 120, notes: "Technika i objętość" },
      { id: 2, name: "Pull-upy podchwytem", sets: 3, reps: "MAX-1", tempo: "21x1", rest: 120, notes: "Biceps + Plecy" },
      { id: 3, name: "Dipy (Poręcze)", sets: 3, reps: "MAX", msp: 3, tempo: "21x1", rest: 90, notes: "Triceps + Klatka" },
      { id: 4, name: "Uginanie hantli stojąc", sets: 3, reps: "10-12", msp: 4, tempo: "21x1", rest: 60, notes: "Ramiona" },
      { id: 5, name: "Wznosy bokiem (Lean-away)", sets: 4, reps: "12-15", pws: 3, tempo: "21x1", rest: 60, notes: "Bok barku" },
      { id: 6, name: "Ab wheel rollout", sets: 3, reps: "MAX", tempo: "kontr.", rest: 60, notes: "Anty-ATP" },
    ]
  }
};

export const DAILY_ROUTINE = [
  { name: "Zwis na drążku (Bar Hang)", time: "2 min łącznie", goal: "Dekompresja" },
  { name: "Couch stretch", time: "2 min / stronę", goal: "Rozciągnięcie zginaczy" },
  { name: "Chin tucks", time: "20 powt.", goal: "Korekta FHP" },
  { name: "Glute bridge", time: "1x20 powt.", goal: "Aktywacja pośladka" },
  { name: "Child pose", time: "2 min", goal: "Rozluźnienie lędźwi" },
];

export const BENCH_PROGRESSION = [
  { week: "1-2", target: "82.5 x 5 / 85 x 5 / 87.5 x 3", light: "67.5 kg" },
  { week: "3-4", target: "85 x 5 / 87.5 x 5 / 90 x 2-3", light: "70 kg" },
  { week: "5-6", target: "87.5 x 5 / 90 x 5 / 92.5 x 2-3", light: "72.5 kg" },
  { week: "7-8", target: "90 x 5 / 92.5 x 5 / 95 x 2", light: "75 kg" },
  { week: "9-10", target: "92.5 x 5 / 95 x 5 / 97.5 x 2", light: "77.5 kg" },
  { week: "11-12", target: "95 x 5 / 97.5 x 5 / 100 x 2", light: "80 kg" },
  { week: "12", target: "PRÓBA 100 KG", light: "80 kg", isPR: true },
];
