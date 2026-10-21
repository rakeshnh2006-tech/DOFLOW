# Doflow — Minimal Pomodoro, Planner, Analytics, Soundscape, Habits, Goals & Flow Intelligence Web App (Version 9)

A minimal, premium Pomodoro productivity web application built with React, Vite, and TypeScript.

## Features

### Feature 1: Core Focus Timer
- **25-minute Focus Countdown**: High-contrast, large digital countdown timer.
- **Deadline-based Countdown Engine**: Wall-clock timestamp calculation (`Date.now()`) preventing drift during tab switching and background throttling.
- **Controlled Timer State Machine**: `idle`, `running`, `paused`, `completed`.
- **Keyboard Shortcuts**: `Space` to Start/Pause/Resume, `R` to Reset.
- **Minimalist Aesthetic**: Warm off-white background (`#F8F6F2`), charcoal text (`#1C1D1F`), and restrained terracotta orange accents (`#E8590C`).

### Feature 2: Work & Break Sessions
- **Three Core Modes**:
  - **Focus**: 25 minutes (`25:00`).
  - **Short Break**: 5 minutes (`05:00`).
  - **Long Break**: 15 minutes (`15:00`).
- **Safe Mode Switching**:
  - Selecting a mode while `idle` or `paused` immediately loads that mode's configured duration in idle state.
  - If the timer is `running`, switches require confirmation via a dialog to prevent accidental progress loss.
  - Cancelling the switch preserves running countdown without loss or drift.
- **Accurate Reset**: Reset always restores the currently selected mode's full duration.
- **Completion & Single Recording**: Records session completion exactly once at `00:00` without auto-starting another timer.
- **4-Session Cycle Tracking & Long Break Suggestion**:
  - Tracks consecutive completed focus sessions with a visual 4-dot indicator.
  - After 4 completed focus sessions, actively recommends taking a 15-minute Long Break.

### Feature 3: Task Management
- **Add Tasks**: Text input with explicit validation rejecting empty or whitespace-only names.
- **Active Focus Goal**: Allows exactly one active task to be selected for the current focus session, visibly featured on the timer card (`Focus goal: [Task Name]`).
- **Completion & Undo**: Checkbox toggle to mark tasks complete (visual strikethrough) and undo completion.
- **Safe Deletion**: Delete button with a confirmation dialog to prevent accidental data loss.
- **Full Offline Persistence**: Automatically syncs tasks and active selection with `localStorage` across page reloads.
- **Corrupted Data Resiliency**: Safely parses stored data and recovers from malformed JSON, invalid data types, and quota errors without crashing.
- **Timer Independence**: Adding, toggling, selecting, and deleting tasks has zero interference with the active countdown timer.
- **Empty States**: Clean, reassuring empty state with helpful guidance.

### Feature 4: Daily Productivity Statistics
- **Focus Sessions Count**: Records completed focus sessions strictly when the timer hits zero; never counts paused, reset, or incomplete sessions.
- **Focus Time Calculation**: Sums exact minutes of completed focus time based on session duration.
- **Tasks Completed Total**: Derives live task completion statistics directly from saved task records.
- **Local Calendar Date Tracking**: Aggregates totals based on the user's local calendar date (`YYYY-MM-DD`), accurately isolating today's metrics from previous days.
- **Break Exclusion**: Short breaks and long breaks are strictly excluded from focus counts and focus time.
- **Zero Fabrication**: No fake or sample data; clearly highlights when no activity has been recorded yet for the day.
- **Full Offline Persistence**: Retains session history in `localStorage` across page refreshes.

### Feature 5: Settings & User Preferences
- **Configurable Session Durations**: Custom focus duration, short-break duration, and long-break duration.
- **Strict Validation**: Accepts only whole-number durations between 1 and 120 minutes with clear, accessible validation alerts.
- **Running Timer Safety**: Changing durations while a session is active or paused does not silently alter running countdowns; prompts user to either "Apply to Next Session" (keeps countdown untouched) or "Reset Current Session" (resets timer with the new duration).
- **Light & Dark Theme Toggle**: Full system-wide theme toggle available both in the header and in preferences, consistently styling all components and modals.
- **Web Audio Completion Chime**: Pleasant harmonic chime on session completion, with safe error handling, autoplay restriction tolerance, and zero impact on timer completion.
- **Offline Persistence & Fallback**: Stores preferences in `localStorage` (`doflow_user_preferences_v1`) and restores them on reload, safely falling back to defaults if corrupted or missing.

### Feature 6: Daily Planner
- **Dedicated Daily Planning Workspace**: Seamless view toggle in the header between the Pomodoro Focus Timer and Daily Planner, keeping background timers running without interruption.
- **Local Timezone Date Display**: Formats today's date using the user's local timezone (e.g. "Tuesday, October 20, 2026").
- **Compact Daily Summary**: Real-time summary cards displaying **Total Planned**, **Completed**, and **Remaining** tasks for the day.
- **Flexible Task Planning**:
  - Create new tasks with title, planned start time, optional deadline, and three priority levels (**Low**, **Medium**, **High**).
  - Pick existing tasks from the Doflow Task Manager without duplicate records, reusing existing task IDs.
  - Mark any task as **Today's Top Focus** (★) with high-visibility styling.
  - Graceful support for unscheduled tasks (tasks without specific start/deadline times).
- **Chronological Ordering & Visual Urgency**:
  - Tasks ordered chronologically by scheduled start time, with unscheduled tasks grouped neatly at the bottom.
  - Automatically flags **Overdue** tasks against the local clock and badges upcoming / in-progress tasks.
- **Filter Tabs**: Instant filtering by **All**, **Planned**, **In Progress**, and **Completed**.
- **Edit & Delete Modals**: Full editing capabilities for scheduled times, priority, top-focus toggle, and completion status.
- **Two-way Task Sync Without Double-Counting**: Synchronizes completion states with the core task manager and statistics tracker without double-counting metrics or sessions.
- **Offline Persistence & Error Resiliency**: Persists planned tasks to `localStorage` (`doflow_planner_tasks_v1`) with full corrupted JSON handling and schema validation.

### Feature 7: Weekly Productivity Analytics
- **Dedicated Weekly Analytics Page**: Accessible via header navigation tab (`Analytics`), keeping active timers running in background without progress loss.
- **5 Core Productivity Metrics**:
  - **Total Focus Time**: Exact recorded minutes across all completed focus sessions in the period.
  - **Focus Sessions**: Count of focus sessions completed to zero (breaks strictly excluded).
  - **Tasks Completed**: Unique completed tasks attributed to their completion date without double-counting.
  - **Daily Average Focus Time**: Accurate average across all 7 days with clear documentation of calculation method.
  - **Most Productive Day**: Identifies the peak focus day of the week with total minutes.
- **Interactive 7-Day Bar Chart**:
  - Accessible CSS/SVG bar chart with proportional heights and Y-axis scale markings.
  - Individual day columns with top-minute badges, day names, and day numbers.
  - Visual highlight for **Today** and peak productive day.
  - Interactive tooltip inspection banner on hover or keyboard focus showing exact focus minutes, completed sessions, and tasks.
- **Detailed Daily Breakdown Table**:
  - Comprehensive table listing every day in the range with formatted date, focus minutes with progress bar, session count, task count, and status badges.
- **Week-over-Week Comparison**:
  - Automatically compares current week with previous week's historical performance (focus minutes delta & percentage, sessions delta, tasks delta).
  - Informative empty notice when prior week data is not yet available.
- **Date Range Selector**:
  - Segmented controls for **This Week**, **Last Week**, and **Custom Range** (with start and end date pickers).
- **Graceful Empty State**:
  - Helpful empty state card with guidance and a quick "Start Focus Session" action button when no records exist.
- **Data Integrity & Backward Compatibility**:
  - Relies solely on genuine user records from `doflow_session_history_v1` and `doflow_tasks_v1`.
  - Safely handles older records lacking fields without crashing.

### Feature 8: Focus Soundscape
- **Dedicated Ambient Soundscape Panel**: Accessible via header navigation tab (`Soundscape`, `data-testid="nav-soundscape"`), with persistent background audio that continues playing smoothly across timer sessions and page views.
- **4 Procedural Browser-Native Soundscapes**:
  - **Gentle Rain**: Filtered pink/brown noise with soothing randomized droplet patter.
  - **Forest & Nature**: Calming woodland breeze through trees with gentle bird & nature chirps.
  - **Cozy Café**: Warm conversational background murmur and subtle ceramic dish clatter.
  - **Focus White Noise**: Clean, even static noise balanced to avoid ear fatigue.
- **Zero External Streaming Dependencies**:
  - Synthesized entirely in-browser via the Web Audio API.
  - No hotlinking, no third-party media scraping, and 100% offline functionality.
- **Comprehensive Audio Controls**:
  - Independent volume sliders for each soundscape track (0% – 100%).
  - Master volume slider and quick mute toggle.
  - Play, pause, and resume controls on cards and in the now-playing bar.
  - Stop All Sounds button (`data-testid="soundscape-stop-all-btn"`).
- **Audio Lifecycle & Autoplay Policy Handling**:
  - Never auto-plays audio on initial page load.
  - Detects browser autoplay policy restrictions, displays clear non-intrusive alert guidance, and never falsely indicates playback when sound is blocked.
  - Properly disposes of AudioContext and disconnects nodes on component unmount or stop.
- **Preferences & Separate Completion Chime**:
  - Focus Soundscape availability can be toggled in Preferences (`SettingsModal`), completely separate from timer completion chimes.
  - Preferences persisted in `localStorage` (`doflow_soundscape_preferences_v1`).

### Feature 9: Habits and Streaks
- **Dedicated Habit Management Workspace**:
  - Accessible via header navigation tab (`Habits`, `data-testid="nav-habits"`), preserving active timer sessions without interruption.
- **Flexible Habit Scheduling**:
  - Create habits with a name and optional description.
  - Choose between **Daily**, **Weekdays (Mon–Fri)**, or **Custom Selected Days of the Week**.
- **Accurate Real-time Streaks Engine (`streakUtils.ts`)**:
  - Calculates streaks strictly from actual completion records, not drifting counters.
  - **Unscheduled Days Preserved**: For habits scheduled only on selected days, unscheduled days never break the streak.
  - **Current Day Pending Safe**: Today's uncompleted status does not prematurely break a streak before the user has had an opportunity to complete today's habit.
  - Computes both **Current Streak** (🔥) and **Longest All-Time Streak** (★).
- **Completion & Undo**:
  - Toggle completion for today directly from the habit card or calendar cell.
  - Immediately recalculates affected streaks upon completion or undo.
  - Prevents duplicate completion records for the same habit and date (`habitId_date`).
- **Interactive Monthly Calendar History View (`HabitCalendarView.tsx`)**:
  - Month-by-month calendar view with previous/next month navigation and "Today" quick button.
  - Visual status for each cell: **Completed** (green), **Missed** (soft red), **Rest Day** (subtle dashed border), and **Future**.
  - Direct cell click toggle to mark or undo completions on scheduled dates.
- **Overall Consistency Metrics**:
  - 4-card summary: **Active Habits**, **Scheduled Today**, **Completed Today**, and **Overall Consistency %**.
  - Consistency period filters: **7 Days**, **30 Days**, **This Month**, and **All Time**.
- **Habit Lifecycle**:
  - Edit habit name, description, and frequency schedule.
  - Archive and restore habits, with filtering by **Active**, **Archived**, and **All**.
  - Delete habits with confirmation alert dialog.
- **Isolated Offline Storage & Data Integrity**:
  - Persisted in `localStorage` (`doflow_habits_v1` and `doflow_habit_completions_v1`).
  - Strictly separated from Pomodoro task records and session stats, ensuring zero inflation of focus or task statistics.
### Feature 10: Goals and Achievements
- **Dedicated Goals & Achievements Workspace**:
  - Accessible via header navigation tab (`Goals`, `data-testid="nav-goals"`), keeping active timers and soundscapes running without interruption.
- **Configurable Daily Goals (`GoalsModal.tsx`)**:
  - **Target Focus Minutes per Day**: Default 60 min (customizable 1 – 720 min).
  - **Target Completed Focus Sessions per Day**: Default 4 sessions (customizable 1 – 48 sessions).
  - **Optional Target Completed Tasks per Day**: Default 3 tasks (toggleable on/off, customizable 1 – 100 tasks).
  - Input validation rejecting invalid, non-numeric, zero, or negative values with accessible alerts.
- **Dynamic Daily Progress Indicators (`GoalProgressCard.tsx`)**:
  - Visual progress bar with animated percentage fill.
  - Clear metrics: Current progress, Target, and Remaining amount needed ("X min to go" / "X sessions to go").
  - "Goal Reached" celebration badge when target is satisfied.
  - Respects the user's local date (`YYYY-MM-DD`) for daily resets.
  - Safe recalculation: Modifying daily goals updates target and remaining amounts immediately without altering or falsifying historical activity.
- **9 Curated Activity-Based Milestones (`achievementEvaluator.ts`)**:
  - **First Step**: Complete your first focus session (Focus milestone).
  - **Flow State**: Complete 5 focus sessions.
  - **Deep Diver**: Complete 10 focus sessions.
  - **Daily Focus Champion**: Reach your daily focus time goal.
  - **Century Club**: Accumulate 100 total focus minutes.
  - **Task Finisher**: Complete your first task (Task milestone).
  - **Productivity Engine**: Complete 5 tasks.
  - **Master Planner**: Complete a task planned in Daily Planner.
  - **Habit Builder**: Build a 7-day streak on any habit (Habit milestone).
- **Strict Data Integrity & Anti-Gamification Rules**:
  - Derived strictly from genuine application activity records (`doflow_session_history_v1`, `doflow_tasks_v1`, `doflow_planner_tasks_v1`, `doflow_habits_v1`).
  - Zero fabricated progress: Milestones are never granted merely because a page was opened or previewed.
  - Safe against duplicate awards: Unlocked milestones are recorded with an immutable `unlockedAt` timestamp and persist across refreshes.
  - Distinguishes daily goals from all-time milestones.
- **Milestones Filtering & Accessible Empty States**:
  - Filter tabs: **All**, **Earned**, and **Locked** with unlocked counter pill (`X / 9 Unlocked`).
  - Clear, encouraging empty states when no milestones have been earned yet.
  - Milestone cards visually highlight unlocked badges (orange tint with checkmark) versus locked progress requirements.
- **Resilient Offline Persistence**:
  - Daily goals stored in `doflow_daily_goals_v1`.
  - Unlocked achievements stored in `doflow_achievements_v1`.
  - Fully offline; requires zero external APIs, accounts, notifications, or backend services.

### Feature 11: Doflow Flow Intelligence ("Turn focus into progress.")
- **Signature Feature Dashboard (`FlowIntelligenceDashboard.tsx`)**:
  - Accessible via header navigation tab (`Intelligence`, `data-testid="nav-intelligence"`), seamlessly integrated into Doflow's warm aesthetic.
  - Quick summary banner: Today's focus minutes, completed sessions, and completed tasks.
  - Real-time updates as sessions finish and tasks are marked complete.
- **Transparent Flow Score out of 100 (`FlowScoreCard.tsx`)**:
  - **Focus Time (Max 40 points)**: Earned based on actual focus minutes relative to your configured daily target (`Math.min(actual / target, 1.0) * 40`).
  - **Task Completion (Max 35 points)**: Earned based on completed planned tasks or daily task goal (`Math.min(actual / target, 1.0) * 35`).
  - **Session Consistency (Max 25 points)**: Earned from completed focus sessions (up to 20 pts) plus up to 5 quality bonus points based on user reflections.
  - **Score Tiers**: Getting Started (0-29), Building Flow (30-59), Solid Momentum (60-84), and Optimal Flow (85-100).
  - **Expandable Formula Drawer**: Full transparent breakdown explaining the exact weights, calculations, and prominent non-scientific heuristic disclaimer.
  - Safe against missing records or zero targets without division by zero.
- **Intelligent Task Recommendations (`TaskRecommendationCard.tsx`)**:
  - Scores and ranks pending tasks using genuine parameters:
    - Today's Top Priority flag (+50 pts)
    - Overdue deadline (+40 pts)
    - Priority High (+30 pts), Medium (+18 pts), Low (+8 pts)
    - Approaching deadline (+25 pts)
    - Scheduled start time (+15 pts)
    - Active focus goal status (+20 pts)
  - Clear rationale text explaining why the selected task is recommended (e.g., "Marked as Today's Top Priority • High priority").
  - "Focus on this Task" button selects task as the active focus goal and navigates to the timer.
  - "Dismiss / Next" action allows skipping a recommendation to view subsequent ranked tasks, with a "Reset Dismissals" option.
  - Manual dropdown allowing user to override and select any incomplete task directly.
  - Encouraging empty state when all tasks are finished.
- **Post-Session Reflection Modal (`SessionReflectionModal.tsx`)**:
  - Triggered automatically after a focus session completes at `00:00` (breaks excluded).
  - 3 flow quality choices: **Productive** (🟢 Smooth flow), **Distracted** (🟡 Wandering focus), or **Interrupted** (🔴 Disruption).
  - Optional short note input (up to 200 characters).
  - "Skip" option allowing frictionless progression without forcing input.
  - Stored strictly against genuine session IDs in `doflow_session_reflections_v1`.
  - Duplicate-proof: Prevents duplicate records for the same session and never modifies existing session statistics or counts.
- **Personal Productivity Insights (`PersonalInsightsCard.tsx`)**:
  - **Peak Time of Day**: Categorizes recorded focus minutes into Morning (05:00-11:59), Afternoon (12:00-16:59), Evening (17:00-21:59), and Night (22:00-04:59). Requires $\ge 3$ focus sessions.
  - **Average Sprint Duration**: Calculates genuine average completed session duration. Requires $\ge 2$ sessions.
  - **Session Quality Correlation**: Analyzes productive vs. distracted/interrupted distribution. Requires $\ge 3$ reflections.
  - Explicit "Insufficient Data" badges and requirements when threshold is not yet met.
  - Zero unsupported psychological or causal claims.
- **Adaptive Duration Suggestions (`AdaptiveSuggestionsCard.tsx`)**:
  - Recommends focus and break durations based on genuine reflection patterns:
    - Distraction/interruption rate > 40%: Recommends tighter 20-minute sprints.
    - Productive rating $\ge 75\%$: Suggests deepening sprints to 30 minutes with 6-minute breaks.
    - Limited evidence (< 3 sessions): Defaults to user's configured durations with an "Initial Baseline" label.
  - 100% Optional and Explainable: User must explicitly click "Apply Suggested Durations".
  - Safety Protection: Applying durations routes through `handleSaveSettings`, prompting confirmation if a timer is running to prevent silently altering active countdowns.
- **Zero External AI / Zero Backend Footprint**:
  - Deterministic algorithms, 100% offline, privacy-first, zero third-party APIs or subscription requirements.

### Feature 12: Legal & Privacy (Privacy Policy & Terms and Conditions)
- **100% Factual Client-Side Disclosures**:
  - Documents actual technical behavior of Doflow: pure client-side `localStorage`, zero server sync, zero cookies, zero analytics/trackers, and zero external AI APIs.
  - Transparent table mapping all 11 client-side storage keys (`doflow_tasks_v1`, `doflow_active_task_id_v1`, `doflow_planner_tasks_v1`, `doflow_session_history_v1`, `doflow_user_preferences_v1`, `doflow_soundscape_preferences_v1`, `doflow_habits_v1`, `doflow_habit_completions_v1`, `doflow_daily_goals_v1`, `doflow_achievements_v1`, and `doflow_session_reflections_v1`).
- **Security Limitations & Compliance**:
  - Explicit disclosures regarding browser `localStorage` security limitations (unencrypted plaintext, device physical access, rogue browser extensions).
  - Children's privacy protections under India's Digital Personal Data Protection Act, 2023 (DPDPA) and the United States COPPA.
  - Transparent operator placeholders (`[Insert Operator Name / Organization]`, `[Insert Privacy Contact Email]`, `[Insert Jurisdiction / Country]`).
- **Terms & Conditions**:
  - Clear, fair terms covering personal non-commercial license, prohibited misuse, brand ownership ("Doflow" and tagline "Find your flow."), and limitation of liability.
  - Productivity & health disclaimer: productivity scores and soundscapes are self-management aids, not medical, psychiatric, or diagnostic advice.
- **Interactive Data Footprint & Safe Deletion**:
  - Data footprint summary card displaying active categories and estimated storage size.
  - Non-destructive view: browsing policy pages never modifies or deletes stored data.
  - Two-step confirmation modal (`ClearDataModal.tsx`) with explicit consequences before any data-clearing action.
  - Origin-isolated clearing: clears all Doflow-prefixed keys while safely preserving any other data on the origin.
- **Seamless Universal Navigation**:
  - Direct links in the application footer (`footer-privacy-link`, `footer-terms-link`).
  - Direct links in the Settings modal under **Section 5: Legal & Privacy** (`settings-privacy-link`, `settings-terms-link`).
  - Bidirectional cross-links between Privacy Policy and Terms & Conditions.
  - "← Back to Timer" button smoothly returning user to the focus workspace.
  - Full responsive design and seamless light/dark theme support adhering to Doflow brand colors (orange `#FF8738`, charcoal `#171717`, and warm white `#F6F2EB`).

## Running Locally

The local development server is running at:
- **Localhost URL**: [http://localhost:5173/](http://localhost:5173/)
- **Network URL**: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

To start the dev server manually at any time:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` — Start Vite development server
- `npm run test` — Run all 274 Vitest unit & integration tests across 30 test suites
- `npm run test:watch` — Run tests in interactive watch mode
- `npm run typecheck` — Run TypeScript compiler check (`tsc -b`)
- `npm run lint` — Run ESLint check
- `npm run build` — Build production bundle to `dist/`


