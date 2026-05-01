# AI Context: Workout App (Grande Finale 2.0)

## 1. Cel Projektu
Aplikacja służy do cyfryzacji i śledzenia 12-tygodniowego planu treningowego "Grande Finale 2.0". Głównym celem użytkownika jest osiągnięcie wyznaczonych celów siłowych...

## 2. Tech Stack
- **Frontend**: React + Vite
- **Stylizacja**: Tailwind CSS (Styl: Brutalistyczny, ciemny motyw `#0a0a0a`, akcenty: `dayA-D`)
- **Backend/Baza**: Supabase (PostgreSQL + RLS + Auth)
- **Ikony**: Lucide-React
- **Wykresy**: Recharts

## 3. Metodologia Treningowa
Aplikacja opiera się na dwóch kluczowych technikach:
- **MSP (Mimowolnie Spowolnione Powtórzenia)**: Stosowane w dniach ciężkich/średnich. Skupienie na kontroli i tempie.
- **PWS (Pierwsze Wolne Spowolnienie)**: Stosowane w dniach lekkich i przy izolacjach (np. boki barku). Zostawianie 1-2 powtórzeń zapasu.
- **RPE/RIR**: Śledzenie subiektywnej intensywności każdej serii (skala 7-10).

## 4. Kluczowe Funkcje i UX
### Workout Execution (Serce apki)
- **Single-Page Flow**: Cały trening to jedna długa, scrollowalna lista. Brak paginacji.
- **Logowanie bez klikania**: Wystarczy wpisać KG i Reps. System uznaje serię za wykonaną, jeśli pola nie są puste.
- **Auto Rest Timer**: Floating timer w rogu ekranu, który startuje automatycznie po wypełnieniu serii. Liczy czas "w górę".
- **Drafty**: Postęp treningu jest zapisywany w `localStorage`, co pozwala na powrót do sesji po odświeżeniu strony.

### Statystyki i Progresja
- **Charts**: Wizualizacja progresu w Bench Press, wagi ciała oraz obwodu talii.
- **Export dla AI**: Funkcja generowania raportu `.md` z wybranego okresu, sformatowanego pod analizę przez LLM (Claude/GPT).

## 5. Struktura Bazy Danych (Supabase)
- `workout_sessions`: ID sesji, data, czas trwania, notatki.
- `exercise_logs`: Szczegóły serii (exercise_name, reps, weight, rpe).
- `daily_habits`: Śledzenie nawyków (obecnie uproszczone/ukryte na prośbę użytkownika).
- `body_metrics`: Waga i talia.
- `oura_daily_summary`: Dane z pierścienia Oura (Readiness, Sleep).
- `daily_nutrition`: Dzienne podsumowanie kalorii i białka (sync z Yazio).
- `daily_food_entries`: Szczegółowa lista zjedzonych produktów (sync z Yazio) do raportów.

## 6. Zasady Designu
- **Kolory**: Tło `#0a0a0a`, karty `#171717`.
- **Typografia**: Wszystkie nagłówki i przyciski akcji są w trybie **UPPERCASE**, czcionka o dużej grubości (font-black).
- **Interakcja**: Maksymalna redukcja liczby kliknięć. Priorytetem jest szybkość obsługi spoconymi dłońmi na siłowni.

## 7. Jak rozwijać?
- Każda nowa funkcja musi pasować do brutalistycznego stylu.
- Unikać modali tam, gdzie wystarczy inline-expand.
- Priorytetyzować wydajność na urządzeniach mobilnych.
