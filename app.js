let songs = [];
let current = null;
let score = 0;

const emojiClueEl = document.getElementById('emojiClue');
const guessForm = document.getElementById('guessForm');
const guessInput = document.getElementById('guessInput');
const feedbackEl = document.getElementById('feedback');
const skipBtn = document.getElementById('skipBtn');
const nextBtn = document.getElementById('nextBtn');
const streakEl = document.getElementById('streak');
const themeToggle = document.getElementById('themeToggle');

function parseCSV(text){
  return text
    .split(/\r?\n/)
    .map(row => row.trim())
    .filter(row => row && !row.startsWith('#'))
    .map(row => {
      const parts = row.split(',');
      return {
        date: (parts[0] || '').trim(),
        song: normalize((parts[1] || '').trim()),
        rawSong: (parts[1] || '').trim(),
        emojis: (parts.slice(2).join(',') || '').trim()
      };
    });
}

function normalize(s){
  return (s || '').toLowerCase().replace(/\s+/g,'').replace(/[’'`´]/g,'');
}

async function loadSongs(){
  const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRGNFw_wdKXWt5c5zMCXqL-fuADH-gLmvEA5J9vA18zfBwaZNot2vkqSDcCqVmw3f67u5JGNoJjai6G/pub?output=csv', { cache: 'no-store' });
  const text = await res.text();
  songs = parseCSV(text).filter(r => r.song && r.emojis);
  nextRound();
}

function nextRound(){
  feedbackEl.classList.add('d-none');
  nextBtn.classList.add('d-none');
  skipBtn.disabled = false;
  guessInput.disabled = false;
  guessInput.value = '';
  guessInput.focus();
  current = songs[Math.floor(Math.random() * songs.length)];
  emojiClueEl.textContent = current.emojis || '❓';
}

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
    score++;
    streakEl.textContent = 'Pisteet: ' + score;
    showFeedback('Oikein! Kappale oli: ' + current.rawSong, 'success');
    skipBtn.disabled = true;
    guessInput.disabled = true;
    nextBtn.classList.remove('d-none');
  }else{
    showFeedback('Ei aivan. Yritä uudelleen!', 'warning');
  }
});

skipBtn.addEventListener('click', () => {
  showFeedback('Ohitit. Oikea vastaus oli: ' + current.rawSong, 'secondary');
  nextBtn.classList.remove('d-none');
  skipBtn.disabled = true;
  guessInput.disabled = true;
});

nextBtn.addEventListener('click', () => {
  nextRound();
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

window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = getCookie('theme') || 'light';
  setTheme(savedTheme);
  loadSongs();
});
