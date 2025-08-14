// --- Yesterday's Answer Modal Logic ---
function getYesterdayDateStr() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return `${day}.${month}.${year}`;
}

function showYesterdayAnswer() {
  const content = document.getElementById('yesterdayAnswerContent');
  if (!songs || !songs.length) {
    content.innerHTML = '<span class="text-secondary">Ladataan...</span>';
    return;
  }
  const yesterday = getYesterdayDateStr();
  const yesterdayNorm = normalizeDate(yesterday);
  const song = songs.find(s => normalizeDate(s.date) === yesterdayNorm);
  if (song) {
    content.innerHTML = `
      <div class="mb-2" style="font-size:2rem;">${song.emojis || ''}</div>
      <div class="fw-bold">${song.rawSong}</div>
      <div class="artist-text">Artisti: ${song.artist}</div>
    `;
  } else {
    content.innerHTML = '<span class="text-danger">Eilisen kappaletta ei löytynyt.</span>';
  }
}

// Attach event to modal show
document.addEventListener('DOMContentLoaded', function() {
  var yesterdayModal = document.getElementById('yesterdayModal');
  if (yesterdayModal) {
    yesterdayModal.addEventListener('show.bs.modal', showYesterdayAnswer);
  }
});
// --- Cookie helpers ---
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days*24*60*60*1000));
  const expires = "expires="+ d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
  const cname = name + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(cname) == 0) {
      return c.substring(cname.length, c.length);
    }
  }
  return "";
}

// --- Show current date in title ---
document.addEventListener('DOMContentLoaded', function() {
  const dateElem = document.getElementById('currentDate');
  if (dateElem) {
    const now = new Date();
    // Format: 14.8.2025
    const dateStr = `${now.getDate()}.${now.getMonth()+1}.${now.getFullYear()}`;
    dateElem.textContent = dateStr;
  }

  // --- Load score from cookie ---
  const score = getCookie('score');
  if (score && !isNaN(Number(score))) {
    const streakElem = document.getElementById('streak');
    if (streakElem) {
      streakElem.textContent = `Pisteet: ${score}`;
    }
    window.currentScore = Number(score);
  } else {
    window.currentScore = 0;
  }
});

// --- Save score to cookie whenever it changes ---
function updateScore(newScore) {
  window.currentScore = newScore;
  setCookie('score', newScore, 30);
  const streakElem = document.getElementById('streak');
  if (streakElem) {
    streakElem.textContent = `Pisteet: ${newScore}`;
  }
}

// If your game logic updates the score, replace those updates with updateScore(newScore)
// For example, if you have code like:
//   streakElem.textContent = `Pisteet: ${score}`;
// Replace with:
//   updateScore(score);

let songs = [];
let current = null;
let score = 0;
let clueUsed = false;

const emojiClueEl = document.getElementById('emojiClue');
const guessForm = document.getElementById('guessForm');
const guessInput = document.getElementById('guessInput');
const feedbackEl = document.getElementById('feedback');
const clueBtn = document.getElementById('clueBtn');
const nextBtn = document.getElementById('nextBtn');
const streakEl = document.getElementById('streak');
const artistClueEl = document.getElementById('artistClue');
const themeToggle = document.getElementById('themeToggle');

function getTodayDateStr() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return `${day}.${month}.${year}`;
}

function normalizeDate(dateStr) {
  // Accepts dd.mm.yyyy or d.m.yyyy, returns d.m.yyyy (no leading zeros)
  if (!dateStr) return '';
  const parts = dateStr.split('.');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[0], 10)}.${parseInt(parts[1], 10)}.${parts[2]}`;
}

function parseCSV(text){
  return text
    .split(/\r?\n/)
    .map(row => row.trim())
    .filter(row => row && !row.startsWith('#'))
    .map(row => {
      const parts = row.split(',');
      const rawSong = (parts[1] || '').trim();
      const rawArtist = (parts[2] || '').trim();
      return {
        date: (parts[0] || '').trim(),
        song: normalize(rawSong), // trimmed/lowercase for comparison
        rawSong: rawSong, // original for display
        artist: rawArtist,
        emojis: (parts.slice(3).join(',') || '').trim()
      };
    });
}

function normalize(s){
  return (s || '').toLowerCase().replace(/\s+/g,'').replace(/[’'`´]/g,'');
}

async function loadSongs(){
  emojiClueEl.innerHTML = '<span class="spinner-border text-secondary" role="status" aria-label="Ladataan"></span>';
  clueBtn.disabled = true;
  guessInput.disabled = true;
  nextBtn.disabled = true;
  const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRGNFw_wdKXWt5c5zMCXqL-fuADH-gLmvEA5J9vA18zfBwaZNot2vkqSDcCqVmw3f67u5JGNoJjai6G/pub?output=csv', { cache: 'no-store' });
  const text = await res.text();
  songs = parseCSV(text).filter(r => r.song && r.emojis);
  clueBtn.disabled = false;
  guessInput.disabled = false;
  nextBtn.disabled = false;
  loadTodaySong();
}

function loadTodaySong() {
  feedbackEl.classList.add('d-none');
  nextBtn.classList.add('d-none');
  guessInput.value = '';
  guessInput.disabled = false;
  guessInput.focus();
  artistClueEl.classList.add('d-none');
  artistClueEl.textContent = '';
  artistClueEl.style.fontSize = '1.5rem';
  clueUsed = false;

  const today = getTodayDateStr();
  const todayNorm = normalizeDate(today);
  const todaySong = songs.find(s => normalizeDate(s.date) === todayNorm);
  if (!todaySong) {
    emojiClueEl.textContent = '❓';
    showFeedback('Tälle päivälle ei löytynyt kappaletta.', 'danger');
    guessInput.disabled = true;
    clueBtn.disabled = true;
    return;
  }
  current = todaySong;
  emojiClueEl.textContent = current.emojis || '❓';

  // Check cookies for completion and hint
  const completed = getCookie('completed_date');
  const hintUsed = getCookie('hint_date');
  const submitBtn = document.getElementById('submitBtn');
  if (completed === today) {
    showFeedback('Olet jo arvannut tämän päivän kappaleen oikein!', 'success');
    guessInput.disabled = true;
    clueBtn.classList.add('d-none');
    if (submitBtn) submitBtn.disabled = true;
    nextBtn.classList.add('d-none');
  } else {
    feedbackEl.classList.add('d-none');
    guessInput.disabled = false;
    clueBtn.classList.remove('d-none');
    clueBtn.disabled = false;
    if (submitBtn) submitBtn.disabled = false;
    nextBtn.classList.add('d-none');
    if (hintUsed === today) {
      artistClueEl.textContent = 'Artisti: ' + current.artist;
      artistClueEl.classList.remove('d-none');
      clueUsed = true;
      clueBtn.disabled = true;
    }
  }
}

// nextRound removed, replaced by loadTodaySong

function showFeedback(message, type){
  feedbackEl.textContent = message;
  feedbackEl.className = 'alert alert-' + type;
  feedbackEl.classList.remove('d-none');
}



guessForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if(!current) return;
  const userGuessNorm = normalize(guessInput.value);
  if(!userGuessNorm){
    showFeedback('Kirjoita arvaus ensin.', 'warning');
    return;
  }
  if(userGuessNorm === current.song){
    score += clueUsed ? 1 : 2;
    updateScore(score);
    showFeedback('Oikein! Kappale oli: ' + current.rawSong, 'success');
    document.cookie = `completed_date=${getTodayDateStr()};path=/;max-age=86400`;
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.classList.add('d-none');
    guessInput.disabled = true;
    clueBtn.disabled = true;
    nextBtn.classList.add('d-none');
  }else{
    showFeedback('Ei aivan. Yritä uudelleen!', 'warning');
  }
});

// skipBtn removed


clueBtn.addEventListener('click', () => {
  if(current && current.artist){
    artistClueEl.textContent = 'Artisti: ' + current.artist;
    artistClueEl.classList.remove('d-none');
    clueUsed = true;
    clueBtn.disabled = true;
    document.cookie = `hint_date=${getTodayDateStr()};path=/;max-age=86400`;
  }
});

/* THEME HANDLING */
function setTheme(theme){
  document.body.classList.remove('light','dark');
  document.body.classList.add(theme);
  document.cookie = `theme=${theme};path=/;max-age=31536000`;
  themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
}

function getCookie(name){
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

themeToggle.addEventListener('click', () => {
  const newTheme = document.body.classList.contains('light') ? 'dark' : 'light';
  setTheme(newTheme);
});

// nextBtn is not used for daily mode


// (Optional) If you want to do something when the help modal is shown, you can add event listeners here.
// Example: document.getElementById('helpBtn').addEventListener('click', function() { ... });
// Bootstrap handles modal opening automatically via data-bs-toggle, so no extra JS is required for basic usage.

window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = getCookie('theme') || 'light';
  setTheme(savedTheme);
  loadSongs();

  // Show info modal if not seen before
  if (!getCookie('info_modal_seen')) {
    const helpModal = document.getElementById('helpModal');
    if (helpModal && window.bootstrap) {
      const modal = new window.bootstrap.Modal(helpModal);
      modal.show();
      helpModal.addEventListener('hidden.bs.modal', function handler() {
        setCookie('info_modal_seen', '1', 365);
        helpModal.removeEventListener('hidden.bs.modal', handler);
      });
    }
  }
});
