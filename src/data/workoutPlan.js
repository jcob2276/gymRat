export const WORKOUT_PLAN = {
  A: {
    title: "Dzień A - Niedziela",
    subtitle: "Góra Ciężka (Siła + Lats + Triceps)",
    color: "dayA",
    exercises: [
      { id: 1, name: "Wyciskanie płaskie (heavy)", sets: 4, reps: "Top 1x3-5, 3x5-6", msp: 1, tempo: "31x1", rest: 180, notes: "Top set + back-off @ ~90%" },
      { id: 2, name: "Pull-up szeroki (obciążenie)", sets: 4, reps: "6-8", msp: 1, tempo: "21x1", rest: 120, notes: "Priorytet szerokości pleców" },
      { id: 3, name: "Wyciskanie hantli skośnych", sets: 3, reps: "8-10", msp: 1, tempo: "21x1", rest: 120, notes: "Górna klatka" },
      { id: 4, name: "Chest supported row", sets: 3, reps: "8-10", msp: 1, tempo: "21x1", rest: 90, notes: "Grubość pleców, retrakcja" },
      { id: 5, name: "Overh. triceps ext. (linka)", sets: 3, reps: "10-12", msp: 1, tempo: "20x1", rest: 60, notes: "Głowa długa tricepsa" },
      { id: 6, name: "Uginanie sztangi stojąc", sets: 3, reps: "8-10", msp: 1, tempo: "20x1", rest: 60, notes: "Biceps" },
    ]
  },
  B: {
    title: "Dzień B - Wtorek",
    subtitle: "Plecy + Barki + RDL",
    color: "dayB",
    exercises: [
      { id: 1, name: "Lat pulldown szeroki", sets: 4, reps: "8-12", msp: 1, tempo: "21x1", rest: 120, notes: "Uzupełnienie objętości lats" },
      { id: 2, name: "OHP stojąc (lub siedząc)", sets: 3, reps: "6-8", msp: 2, tempo: "21x1", rest: 150, notes: "Miednica, napięcie pośladków" },
      { id: 3, name: "Face pulls (rotacja zewn.)", sets: 3, reps: "15", msp: 1, tempo: "21x2", rest: 90, notes: "Linka wysoko, kciuki do tyłu" },
      { id: 4, name: "Rear delt row (wiosło hantle)", sets: 3, reps: "10-12", msp: 1, tempo: "20x1", rest: 90, notes: "Łokcie zewn., nacisk na obły" },
      { id: 5, name: "Wznosy bokiem hantli", sets: 3, reps: "12-15", pws: 1, tempo: "20x1", rest: 60, notes: "Depresja barku, bez kapturów" },
      { id: 6, name: "RDL", sets: 3, reps: "8", msp: 2, tempo: "32x1", rest: 150, notes: "Na końcu, chroni CNS" },
    ]
  },
  C: {
    title: "Dzień C - Czwartek",
    subtitle: "Nogi + APT + Core",
    color: "dayC",
    exercises: [
      { id: 1, name: "Przysiad", sets: 3, reps: "5-6", msp: 1, tempo: "32x1", rest: 180, notes: "Kontrola miednicy, żebra w dół" },
      { id: 2, name: "Hip thrust (podwinięta miedn.)", sets: 3, reps: "8-10", msp: 1, tempo: "21x2", rest: 120, notes: "Pauza na górze, bez przeprostu" },
      { id: 3, name: "Wykroki wsteczne hantlami", sets: 3, reps: "10/str", msp: 2, tempo: "21x1", rest: 120, notes: "Stabilizacja, ochrona kolan" },
      { id: 4, name: "Leg curl (siedząc lub leżąc)", sets: 3, reps: "10-12", msp: 1, tempo: "21x1", rest: 90, notes: "Tylna taśma" },
      { id: 5, name: "Pallof press", sets: 3, reps: "12/str", tempo: "21x2", rest: 60, notes: "Anty-rotacja" },
      { id: 6, name: "Wspięcia na palce stojąc", sets: 4, reps: "12-15", msp: 1, tempo: "22x1", rest: 60, notes: "Łydki -- utrzymanie" },
    ]
  },
  D: {
    title: "Dzień D - Sobota",
    subtitle: "Lekka Góra + Ramiona + Core",
    color: "dayD",
    exercises: [
      { id: 1, name: "Wyciskanie płaskie (light)", sets: 5, reps: "5", rir: "2-3", tempo: "21x1", rest: 120, notes: "Objętość, stały ciężar" },
      { id: 2, name: "Pull-up podchwytem", sets: 3, reps: "MAX-1", tempo: "21x1", rest: 120, notes: "Biceps + plecy" },
      { id: 3, name: "Dipy (lub close-grip bench)", sets: 3, reps: "MAX-1", msp: 2, tempo: "21x1", rest: 90, notes: "Przy bólu barku CG bench" },
      { id: 4, name: "Overh. triceps ext. (linka)", sets: 3, reps: "10-12", msp: 1, tempo: "20x1", rest: 60, notes: "Druga sesja tricepsa" },
      { id: 5, name: "Uginanie hantli (ławka skośna)", sets: 3, reps: "10-12", msp: 1, tempo: "20x1", rest: 60, notes: "Rozciągnięty zakres (Biceps)" },
      { id: 6, name: "Leaning cable lateral raise", sets: 4, reps: "12-15", pws: 1, tempo: "20x1", rest: 60, notes: "Boczny akton -- optymalny kąt" },
    ]
  }
};

export const DAILY_ROUTINE = [
  { name: "Couch stretch", time: "2 min / str.", goal: "Zginacze bioder (APT)" },
  { name: "Aktywny zwis na drążku", time: "2 min łącznie", goal: "Dekompresja, rozciągnięcie klatki i lats" },
  { name: "Glute bridge (pauza 2-3s)", time: "2x15", goal: "Aktywacja pośladków" },
  { name: "Chin tucks", time: "2x15-20", goal: "Forward Head Posture" },
  { name: "Dead bug (z kontrolą lędźwi)", time: "2x10/str.", goal: "Anty-ekstensja" },
  { name: "Foam roll TFL/quadów (opc.)", time: "1 min / str.", goal: "Rozluźnienie przed treningiem nóg" },
  { name: "Pec minor stretch (drzwi)", time: "2x30s / str.", goal: "Protrakcja barków" },
];

export const BENCH_PROGRESSION = [
  { week: "1-2", top: "77,5 kg x 3-5", backoff: "70 kg x 5-6", light: "60 kg x 5" },
  { week: "3-4", top: "80 kg x 3-5", backoff: "72,5 kg x 5-6", light: "62,5 kg x 5" },
  { week: "5-6", top: "82,5 kg x 3-5", backoff: "75 kg x 5-6", light: "65 kg x 5" },
  { week: "7-8", top: "85 kg x 3-5", backoff: "77,5 kg x 5-6", light: "67,5 kg x 5" },
  { week: "9-10", top: "87,5 kg x 3-5", backoff: "80 kg x 5-6", light: "70 kg x 5" },
  { week: "11-12", top: "90 kg x 3-5", backoff: "82,5 kg x 5-6", light: "72,5 kg x 5" },
  { week: "13-14", top: "92,5 kg x 3-5", backoff: "85 kg x 5-6", light: "75 kg x 5" },
  { week: "15", top: "95 kg x 3-5", backoff: "87,5 kg x 5-6", light: "77,5 kg x 5" },
  { week: "16", top: "TEST 100 kg", backoff: "--", light: "--", isPR: true },
];
