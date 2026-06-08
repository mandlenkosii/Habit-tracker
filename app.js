/*
 * app.js — Daily Habit Tracker
 * JS only: no libraries or frameworks
 */

'use strict';

// Key used to save/load habits from localStorage
const STORAGE_KEY = 'daily-habits-v1';

// The habits array is the single source of truth.
// Each habit looks like:
//   { id, name, createdAt, completions[] }
// where completions is an array of "YYYY-MM-DD" date strings.
let habits = [];


/* ── Date helpers ─────────────────────────────────────────── */

// Returns today's date as "YYYY-MM-DD"
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Returns a date string n days before today
function getPastDate(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// Formats today for the header, e.g. "Monday, June 8, 2026"
function formatDisplayDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

// Generates a short unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}


/* ── Streak calculation ───────────────────────────────────── */

// Works out how many days in a row this habit has been completed.
// A streak is only "alive" if the most recent completion is today or yesterday.
function calculateStreak(habit) {
  if (!habit.completions || habit.completions.length === 0) return 0;

  // Sort completions newest-first
  const sorted = [...habit.completions].sort().reverse();

  const today     = getTodayString();
  const yesterday = getPastDate(1);

  // Streak must start from today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak    = 0;
  let checkDate = sorted[0];

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] === checkDate) {
      streak++;
      // Step back one calendar day
      const prev = new Date(checkDate + 'T00:00:00');
      prev.setDate(prev.getDate() - 1);
      checkDate = prev.toISOString().split('T')[0];
    } else {
      break; // gap — streak ends
    }
  }

  return streak;
}

// Highest streak across all habits
function getBestStreak() {
  let best = 0;
  for (let i = 0; i < habits.length; i++) {
    const s = calculateStreak(habits[i]);
    if (s > best) best = s;
  }
  return best;
}

// Number of habits that currently have an active streak
function countOnStreak() {
  let count = 0;
  for (let i = 0; i < habits.length; i++) {
    if (calculateStreak(habits[i]) >= 1) count++;
  }
  return count;
}

// Badge text shown on each card
function getStreakLabel(streak) {
  if (streak === 0) return '— no streak';
  if (streak === 1) return '🌱 1 day';
  if (streak <  7) return '🔥 ' + streak + ' days';
  if (streak < 14) return '⚡ ' + streak + ' days';
  return                   '💫 ' + streak + ' days';
}

// CSS class for the badge colour
function getStreakClass(streak) {
  if (streak === 0) return 'streak-none';
  if (streak <  7) return 'streak-active';
  return                   'streak-hot';
}


/* ── Status line ──────────────────────────────────────────── */

// Short plain-English summary for the bottom of the sidebar
function getStatusText(completed, total) {
  if (total === 0)         return 'No habits added yet.';
  if (completed === 0)     return 'None completed yet — get started!';
  if (completed === total) return '✓ All done for today!';
  return (total - completed) + ' habit' + (total - completed === 1 ? '' : 's') + ' still to go.';
}


/* ── localStorage ─────────────────────────────────────────── */

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    habits    = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(habits)) habits = [];
  } catch (e) {
    habits = [];
  }
}

function saveHabits() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (e) {
    console.error('Could not save to localStorage:', e);
  }
}


/* ── Data operations ──────────────────────────────────────── */

// Returns true on success, 'empty' or 'duplicate' on failure
function addHabit(name) {
  const trimmed = name.trim();
  if (!trimmed) return 'empty';

  // Check for a duplicate (case-insensitive)
  for (let i = 0; i < habits.length; i++) {
    if (habits[i].name.toLowerCase() === trimmed.toLowerCase()) {
      return 'duplicate';
    }
  }

  habits.push({
    id:          generateId(),
    name:        trimmed,
    createdAt:   getTodayString(),
    completions: [],
  });

  saveHabits();
  return true;
}

// Adds today's date to completions if missing, removes it if already there
function toggleHabit(id) {
  const today = getTodayString();

  for (let i = 0; i < habits.length; i++) {
    if (habits[i].id === id) {
      const idx = habits[i].completions.indexOf(today);
      if (idx === -1) {
        habits[i].completions.push(today);
      } else {
        habits[i].completions.splice(idx, 1);
      }
      break;
    }
  }

  saveHabits();
}

// Removes a habit by id
function deleteHabit(id) {
  habits = habits.filter(function(h) { return h.id !== id; });
  saveHabits();
}

// True if the habit has been completed today
function isCompletedToday(habit) {
  return habit.completions.indexOf(getTodayString()) !== -1;
}


/* ── DOM helpers ──────────────────────────────────────────── */

function byId(id) {
  return document.getElementById(id);
}


/* ── Rendering ────────────────────────────────────────────── */

// Builds and returns one habit card element
function buildHabitCard(habit) {
  const done   = isCompletedToday(habit);
  const streak = calculateStreak(habit);
  const total  = habit.completions.length;

  // Card wrapper
  const card = document.createElement('div');
  card.className  = 'habit-card' + (done ? ' is-done' : '');
  card.dataset.id = habit.id;
  card.setAttribute('role', 'listitem');

  // Checkbox button
  const checkWrap       = document.createElement('div');
  checkWrap.className   = 'habit-checkbox-wrap';

  const checkbox        = document.createElement('button');
  checkbox.className    = 'habit-checkbox' + (done ? ' checked' : '');
  checkbox.type         = 'button';
  checkbox.setAttribute('aria-label', (done ? 'Unmark' : 'Complete') + ' "' + habit.name + '"');
  checkbox.setAttribute('aria-pressed', String(done));

  checkbox.addEventListener('click', function() {
    toggleHabit(habit.id);
    render();
  });

  checkWrap.appendChild(checkbox);

  // Habit name + meta row
  const info       = document.createElement('div');
  info.className   = 'habit-info';

  const nameEl     = document.createElement('div');
  nameEl.className = 'habit-name';
  nameEl.textContent = habit.name;

  const meta       = document.createElement('div');
  meta.className   = 'habit-meta';

  const badge      = document.createElement('span');
  badge.className  = 'habit-streak ' + getStreakClass(streak);
  badge.textContent = getStreakLabel(streak);

  const daysEl     = document.createElement('span');
  daysEl.className = 'habit-completions';
  daysEl.textContent = total + (total === 1 ? ' day total' : ' days total');

  meta.appendChild(badge);
  meta.appendChild(daysEl);

  info.appendChild(nameEl);
  info.appendChild(meta);

  // Delete button
  const delBtn     = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.type      = 'button';
  delBtn.setAttribute('aria-label', 'Delete "' + habit.name + '"');
  delBtn.textContent = '×';

  delBtn.addEventListener('click', function() {
    if (window.confirm('Delete "' + habit.name + '"? This will also remove its streak history.')) {
      deleteHabit(habit.id);
      render();
    }
  });

  card.appendChild(checkWrap);
  card.appendChild(info);
  card.appendChild(delBtn);

  return card;
}

// Clears and redraws the habits list
function renderHabits() {
  const list    = byId('habits-list');
  const emptyEl = byId('empty-state');
  const countEl = byId('habit-count');

  list.innerHTML = '';

  if (habits.length === 0) {
    list.style.display    = 'none';
    emptyEl.style.display = 'block';
    countEl.textContent   = '0 habits';
    return;
  }

  list.style.display    = 'flex';
  emptyEl.style.display = 'none';
  countEl.textContent   = habits.length + (habits.length === 1 ? ' habit' : ' habits');

  // Show incomplete habits first, completed ones at the bottom
  const sorted = [...habits].sort(function(a, b) {
    return (isCompletedToday(a) ? 1 : 0) - (isCompletedToday(b) ? 1 : 0);
  });

  for (let i = 0; i < sorted.length; i++) {
    list.appendChild(buildHabitCard(sorted[i]));
  }
}

// Updates the sidebar panel
function renderSummary() {
  const total     = habits.length;
  let   completed = 0;

  for (let i = 0; i < habits.length; i++) {
    if (isCompletedToday(habits[i])) completed++;
  }

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  byId('stat-completed').textContent   = completed;
  byId('stat-total').textContent       = total;
  byId('stat-best-streak').textContent = getBestStreak();
  byId('stat-on-streak').textContent   = countOnStreak();
  byId('ring-percent').textContent     = percent + '%';

  // Animate the SVG ring (circumference of r=50 circle = 2π×50 ≈ 314.16)
  const circumference = 314.16;
  byId('ring-fill').style.strokeDashoffset = circumference - (percent / 100) * circumference;

  byId('summary-status').textContent = getStatusText(completed, total);
}

// Full re-render — call this after any state change
function render() {
  renderHabits();
  renderSummary();
}


/* ── Event handlers ───────────────────────────────────────── */

function handleAddHabit() {
  const input   = byId('habit-input');
  const errorEl = byId('input-error');
  const btn     = byId('add-btn');

  errorEl.textContent = '';

  const result = addHabit(input.value);

  if (result === 'empty') {
    errorEl.textContent = 'Please enter a habit name.';
    input.focus();
    return;
  }

  if (result === 'duplicate') {
    errorEl.textContent = 'You already have a habit with that name.';
    input.focus();
    return;
  }

  // Success
  input.value = '';
  input.focus();
  render();

  // Quick visual confirmation on the button
  btn.textContent      = '✓ Added!';
  btn.style.background = 'var(--done)';
  setTimeout(function() {
    btn.innerHTML        = '<span class="add-btn-icon" aria-hidden="true">+</span><span class="add-btn-text">Add Habit</span>';
    btn.style.background = '';
  }, 1000);
}


/* ── Init ─────────────────────────────────────────────────── */

function init() {
  byId('app-date').textContent = formatDisplayDate();

  loadHabits();
  render();

  byId('add-btn').addEventListener('click', handleAddHabit);

  // Allow Enter key to submit
  byId('habit-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleAddHabit();
  });

  // Clear error as the user types
  byId('habit-input').addEventListener('input', function() {
    byId('input-error').textContent = '';
  });
}

document.addEventListener('DOMContentLoaded', init);
