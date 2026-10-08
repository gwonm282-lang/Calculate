const startScreen = document.querySelector("#start-screen");
const gameScreen = document.querySelector("#game-screen");
const startButton = document.querySelector("#start-button");
const selectionError = document.querySelector("#selection-error");
const questionElement = document.querySelector("#question");
const scoreElement = document.querySelector("#score");
const timerElement = document.querySelector("#timer");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer");
const feedback = document.querySelector("#feedback");
const nicknameInput = document.querySelector("#nickname");
const resultMessage = document.querySelector("#result-message");
const rankingError = document.querySelector("#ranking-error");
const rankingList = document.querySelector("#ranking-list");
const emptyRanking = document.querySelector("#empty-ranking");
const operationInputs = [...document.querySelectorAll('input[name="operation"]')];
const keypad = document.querySelector(".keypad");
const rankingStorageKey = "arithmetic-game-ranking-v1";
const gameDuration = 60_000;
const rankingLimit = 5;

const divisionPairs = [];

for (let dividend = 1; dividend <= 9; dividend += 1) {
  for (let divisor = 1; divisor <= 9; divisor += 1) {
    if (dividend % divisor === 0) {
      divisionPairs.push([dividend, divisor]);
    }
  }
}

let selectedOperations = [];
let currentAnswer = 0;
let correctCount = 0;
let incorrectCount = 0;
let previousQuestion = "";
let playerNickname = "";
let gameEndsAt = 0;
let timerId = null;
let gameFinished = true;
let rankings = loadRankings();

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createQuestion() {
  let operation;
  let first;
  let second;
  let answer;
  let question;

  do {
    operation = selectedOperations[randomInteger(0, selectedOperations.length - 1)];

    if (operation === "+") {
      first = randomInteger(1, 9);
      second = randomInteger(1, 9);
      answer = first + second;
    } else if (operation === "-") {
      first = randomInteger(1, 9);
      second = randomInteger(1, first);
      answer = first - second;
    } else if (operation === "×") {
      first = randomInteger(1, 9);
      second = randomInteger(1, 9);
      answer = first * second;
    } else {
      [first, second] = divisionPairs[randomInteger(0, divisionPairs.length - 1)];
      answer = first / second;
    }

    question = `${first} ${operation} ${second}`;
  } while (question === previousQuestion);

  previousQuestion = question;
  currentAnswer = answer;
  questionElement.textContent = question;
  answerInput.value = "";
  feedback.textContent = "";
  answerInput.focus();
}

function updateScore() {
  scoreElement.textContent = `정답 ${correctCount} · 오답 ${incorrectCount}`;
}

function loadRankings() {
  try {
    const savedRankings = localStorage.getItem(rankingStorageKey);
    if (savedRankings === null) return [];

    const parsedRankings = JSON.parse(savedRankings);
    if (
      !Array.isArray(parsedRankings) ||
      parsedRankings.some(
        (entry) =>
          typeof entry.nickname !== "string" ||
          !Number.isInteger(entry.score) ||
          entry.score < 0 ||
          (entry.incorrectCount !== undefined &&
            (!Number.isInteger(entry.incorrectCount) || entry.incorrectCount < 0)),
      )
    ) {
      throw new Error("저장된 랭킹 형식이 올바르지 않습니다.");
    }
    return parsedRankings.map((entry) => ({
      ...entry,
      incorrectCount: entry.incorrectCount ?? 0,
    }));
  } catch (error) {
    rankingError.hidden = false;
    rankingError.textContent = `랭킹을 불러오지 못했습니다: ${error.message}`;
    return [];
  }
}

function renderRankings() {
  const sortedRankings = [...rankings]
    .sort((first, second) => second.score - first.score)
    .slice(0, rankingLimit);

  rankingList.replaceChildren();
  emptyRanking.hidden = sortedRankings.length > 0;

  sortedRankings.forEach((entry, index) => {
    const row = document.createElement("tr");
    for (const value of [
      String(index + 1),
      entry.nickname,
      `${entry.score}개`,
      `${entry.incorrectCount}개`,
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    rankingList.append(row);
  });
}

function saveResult() {
  const existingRecord = rankings.find((entry) => entry.nickname === playerNickname);
  if (existingRecord) {
    if (
      correctCount > existingRecord.score ||
      (correctCount === existingRecord.score && incorrectCount < existingRecord.incorrectCount)
    ) {
      existingRecord.score = correctCount;
      existingRecord.incorrectCount = incorrectCount;
    }
  } else {
    rankings.push({ nickname: playerNickname, score: correctCount, incorrectCount });
  }

  renderRankings();
  try {
    localStorage.setItem(rankingStorageKey, JSON.stringify(rankings));
    rankingError.hidden = true;
  } catch (error) {
    rankingError.hidden = false;
    rankingError.textContent = `랭킹을 이 기기에 저장하지 못했습니다: ${error.message}`;
  }
}

function finishGame() {
  if (gameFinished) return;

  gameFinished = true;
  window.clearInterval(timerId);
  timerId = null;
  answerInput.disabled = true;
  keypad.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
  saveResult();
  resultMessage.textContent = `${playerNickname} 님, 60초 동안 ${correctCount}문제를 맞혔습니다.`;
  gameScreen.hidden = true;
  startScreen.hidden = false;
  startButton.textContent = "다시 시작";
}

function updateTimer() {
  const remaining = Math.max(0, gameEndsAt - Date.now());
  timerElement.textContent = `${Math.ceil(remaining / 1000)}초`;
  if (remaining === 0) finishGame();
}

function startTimer() {
  gameFinished = false;
  gameEndsAt = Date.now() + gameDuration;
  timerElement.textContent = "60초";
  timerId = window.setInterval(updateTimer, 100);
}

renderRankings();

startButton.addEventListener("click", () => {
  playerNickname = nicknameInput.value.trim();
  if (!playerNickname) {
    resultMessage.textContent = "게임을 시작하기 전에 닉네임을 입력해 주세요.";
    nicknameInput.focus();
    return;
  }

  selectedOperations = operationInputs
    .filter((input) => input.checked)
    .map((input) => input.value);

  if (selectedOperations.length === 0) {
    selectionError.hidden = false;
    return;
  }

  selectionError.hidden = true;
  correctCount = 0;
  incorrectCount = 0;
  previousQuestion = "";
  resultMessage.textContent = "";
  startButton.textContent = "게임 시작";
  updateScore();
  startScreen.hidden = true;
  gameScreen.hidden = false;
  answerInput.disabled = false;
  keypad.querySelectorAll("button").forEach((button) => {
    button.disabled = false;
  });
  startTimer();
  createQuestion();
});

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key]");
  if (button) {
    answerInput.value += button.dataset.key;
  } else if (event.target.closest("button[data-action='backspace']")) {
    answerInput.value = answerInput.value.slice(0, -1);
  } else {
    return;
  }
  answerInput.focus();
});

answerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (gameFinished) return;

  if (Date.now() >= gameEndsAt) {
    finishGame();
    return;
  }

  if (!/^\d+$/.test(answerInput.value)) {
    feedback.textContent = "숫자를 입력해 주세요.";
    answerInput.focus();
    return;
  }

  if (Number(answerInput.value) === currentAnswer) {
    correctCount += 1;
    updateScore();
    createQuestion();
    return;
  }

  incorrectCount += 1;
  updateScore();
  createQuestion();
});