# AI CONTEXT: KUBA WORKOUT APP (GRANDE FINALE 2.1)

## 1. PROJECT OVERVIEW
This is a high-performance, brutalist-styled tracking application designed for a 16-week transformation program. It combines physical training, nutritional management, physiological recovery tracking (Oura), and mental discipline (Power List).

**Version:** 2.1 "Grande Finale"
**Philosophy:** Efficiency, Data-driven discipline, Brutalist UI.

---

## 2. TECH STACK
- **Frontend:** React, Vite, Tailwind CSS.
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions).
- **Icons:** Lucide-react.
- **Date Handling:** date-fns.
- **Visuals:** Recharts.

---

## 3. CORE MODULES & DATA LOGIC

### 🏋️ TRAINING (Grande Finale 2.1)
- **Schedule:** 4 days/week (Day A, B, C, D). 16-week cycle.
- **Methodology:** 
    - **MSP (Mimowolnie Spowolnione Powtórzenia):** A specific rating (0, 1, 2) of involuntary slowing down in the last reps.
    - **Progressive Overload:** Target 100 kg Bench Press.
- **Data Collected:** 
    - Exercise name, weight, reps, RPE (used for MSP rating).
    - Session duration, start/end time.
    - Session verdict based on MSP (Add weight / Stay / Deload).
- **Persistence:** Local draft storage in `localStorage` to prevent data loss on app refresh.

### 🎯 POWER LIST (Kierunek)
- **Daily Logic:** 
    - Exactly 5 tasks per day.
    - Each task assigned to: **Ciało** (Body), **Duch** (Spirit), **Konto** (Finance).
    - Result: **Z (Win)** if 5/5, **P (Loss)** if < 5/5.
    - **Locking:** Tasks are locked for editing once the day is started.
- **Weekly Logic:** Max 2 losses (P) per 7 days = **Weekly Win**.
- **Monthly Logic:** Min 3 winning weeks per 4 weeks = **Monthly Win**.
- **Auto-Finalize:** Unfinished days are automatically marked as 'P' at midnight.

### 📓 JOURNALING & REVIEW
- **Daily Journal:** Mood score (1-5), Gratitude entry, Daily reflections. Auto-saves.
- **Weekly Review (Sundays Only):** 
    - Prompts: "Proud of", "Sabotage", "Do differently".
    - Locked after submission.
- **Life Goals:** Long-term goals for Ciało, Duch, Konto with countdown timers.

### 🥗 NUTRITION & CALORIE BUDGET
- **Source:** Yazio (Synced via Supabase Edge Function).
- **Daily Goal:** 150g Protein target.
- **Weekly Budget:** **12,600 kcal** total (avg 1800/day).
- **Reset:** Weekly budget resets every Monday morning.

### 💍 OURA INTEGRATION
- **Data:** Readiness score, Sleep hours, Activity levels.
- **Sync:** Automated nightly sync via Edge Functions.

### 📈 EXPORTS
- **Markdown Export:** Generates a comprehensive summary of workouts, Yazio nutrition data, and Journaling/Weekly Review notes for external archival.

---

## 4. DATABASE SCHEMA (SUPABASE)

### `workout_sessions` & `exercise_logs`
- Stores sessions metadata (start/end, day key, MSP verdict) and individual set data (weight, reps, rpe).

### `daily_wins`
- Stores Power List tasks (`task_1..5`), categories (`category_1..5`), completion (`done_1..5`), daily `result` (Z/P), and journaling data (`mood_score`, `gratitude_entry`, `journal_entry`).

### `weekly_reviews`
- Stores Sunday reflections linked to `week_start`.

### `daily_nutrition` & `daily_food_entries`
- Aggregated macros/calories and individual product logs from Yazio.

### `oura_daily_summary`
- Physiological data (readiness, sleep, etc.).

### `habits` & `habit_logs`
- User-defined habits and daily completion history (30-day heatmap).

### `life_goals`
- Contextual long-term targets.

---

## 5. UI/UX GUIDELINES
- **Theme:** Brutalist Dark Mode.
- **Typography:** Uppercase, font-black, font-italic for emphasis.
- **Colors:** 
    - Primary: `#3b82f6` (Blue)
    - Win: `#22c55e` (Green)
    - Loss: `#ef4444` (Red)
- **Interactive:** Haptic-style buttons, high-contrast states, animated progress bars.
