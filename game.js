// ======================================
// Hatchoria
// game.js
// Version 3.0 (作り直し版)
// クイズゲーム本体
// ======================================

import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    loadSaveData,
    saveGame,
    getPlayerData
} from "./save.js";

import { registerFriendCode } from "./gameFirebase.js";
import { getEquippedBonus } from "./equipment.js";

// ======================================
// 単語データ (実験用に3単語のみ)
// ======================================

const quizData = [
    { q: "apple", a: ["りんご", "リンゴ", "林檎"] },
    { q: "sun",   a: ["太陽", "たいよう"] },
    { q: "water", a: ["水", "みず"] }
];

// ======================================
// ゲーム内定数
// ======================================

const MAX_LIFE = 3;
const BONUS_STAGE_RATE = 0.1;   // ボーナスステージの出現率
const BONUS_XP = 40;            // ボーナスステージ正解時の追加XP
const BASE_XP = 10;             // 通常正解のXP
const COMBO_BONUS_STEP = 10;    // このコンボ数ごとにXPボーナスが増える
const COMBO_BONUS_XP = 5;       // コンボボーナスの増加量
const LEVELUP_COIN_REWARD = 10; // レベルアップ時のコイン報酬
const DEFAULT_GOAL = 50;        // 初期の必要XP(Firestoreに未設定の場合)
const DEFAULT_MONSTER = "leaf"; // モンスター種類が未設定の場合のデフォルト
const QUESTIONS_PER_ROUND = 10; // 1ラウンドの出題数

// レベルに応じた進化段階(home.jsのupdateMonster()と同じ基準)
function getMonsterStage(level) {

    if (level >= 80) return 5;
    if (level >= 50) return 4;
    if (level >= 30) return 3;
    if (level >= 10) return 2;
    return 1;

}

// ======================================
// ゲーム状態(このセッションのみ・保存対象外)
// ======================================

let player = null;

let currentQuiz = null;
let combo = 0;
let life = MAX_LIFE;
let correctAnswersCount = 0;
let questionsAnswered = 0;
let roundXPEarned = 0;
let roundCoinsEarned = 0;
let previousCombo = 0; // 前回ラウンド終了時点のコンボ数(継続確認用)
let isBonusStage = false;
let isWaiting = false;

// ======================================
// DOM要素
// ======================================

let els = {};
let revealShowing = false;

function cacheElements() {

    els = {
        lifeContainer: document.getElementById("life-container"),
        comboDisplay: document.getElementById("combo-display"),
        lvNum: document.getElementById("game-lv-num"),
        xpFill: document.getElementById("game-xp-fill"),
        xpText: document.getElementById("game-xp-text"),
        coinText: document.getElementById("game-coin-text-play"),
        xpPopupArea: document.getElementById("game-xp-popup-area"),
        charDisplay: document.getElementById("char-display"),
        qDisplay: document.getElementById("q-display"),
        ansInput: document.getElementById("ans-input"),
        checkBtn: document.getElementById("check-btn"),
        nextBtn: document.getElementById("next-btn"),
        judgeOverlay: document.getElementById("judge-overlay"),
        judgeMark: document.getElementById("judge-mark"),
        bonusStartLogo: document.getElementById("bonus-start-logo"),
        questionCounter: document.getElementById("question-counter"),
        gameoverOverlay: document.getElementById("gameover-overlay"),
        gameoverHomeBtn: document.getElementById("gameover-home-btn"),
        clearOverlay: document.getElementById("clear-overlay"),
        clearCorrect: document.getElementById("clear-correct"),
        clearXp: document.getElementById("clear-xp"),
        clearCoins: document.getElementById("clear-coins"),
        clearHomeBtn: document.getElementById("clear-home-btn"),
        comboContinueOverlay: document.getElementById("combo-continue-overlay"),
        comboContinueYes: document.getElementById("combo-continue-yes"),
        comboContinueNo: document.getElementById("combo-continue-no"),
        answerRevealOverlay: document.getElementById("answer-reveal-overlay"),
        answerRevealGaugeFill: document.getElementById("answer-reveal-gauge-fill"),
        answerRevealText: document.getElementById("answer-reveal-text")
    };

}

// ======================================
// 初期化
// ======================================

// onAuthStateChanged は複数回呼ばれることがあるため、
// ゲームの初期化・イベント登録は最初の1回だけ行う
let hasInitialized = false;

// 読み込みが一定時間で終わらない場合に備えたタイムアウト
// (認証確認やFirestoreの読み込みがハングして、ローディング画面が
//  永遠に回り続けてしまう事態を防ぐための保険)
let loadingTimeoutId = null;

window.addEventListener("DOMContentLoaded", () => {

    console.log("game.js 起動");

    cacheElements();

    if (!els.qDisplay) {

        // ゲーム画面が存在しないページ(このモジュールは game-screen 前提)
        console.log("ゲーム画面が見つかりません。game.jsを終了します。");
        return;

    }

    loadingTimeoutId = setTimeout(() => {

        console.error("読み込みがタイムアウトしました。");
        showLoadingError(hasInitialized ? "timeout (Firestore読み込み中)" : "timeout (ログイン確認中)");

    }, 10000);

    // Firebaseの認証状態が確定するまで待つ
    // (ページ遷移直後は auth.currentUser がまだ null のことがあるため、
    //  onAuthStateChanged を使わずに直接読みに行くとログイン画面に
    //  戻されてしまう)
    onAuthStateChanged(auth, async (user) => {

        if (!user) {

            console.log("未ログインです。ログイン画面に戻ります。");

            if (hasInitialized) {
                // ゲーム中にログアウトされた場合のみ遷移
                hideLoadingOverlay();
                window.location.href = "index.html";
            }

            return;

        }

        if (hasInitialized) return;
        hasInitialized = true;

        try {

            // Firebaseからロード
            player = await loadSaveData();

            if (!player) {

                console.log("プレイヤーデータ取得失敗。ログイン画面に戻ります。");
                hideLoadingOverlay();
                window.location.href = "index.html";
                return;

            }

            // 必要XP(goal)が未設定の場合は初期値を補う
            if (!player.goal) {
                player.goal = DEFAULT_GOAL;
            }

            // モンスターの種類が未設定の場合は初期値を補う
            if (!player.monster) {
                player.monster = DEFAULT_MONSTER;
            }

            // 卵選択が済んでいるかどうかのフラグが未設定の場合、
            // すでにフレンドコードを持つ(=既存の)ユーザーは選択済み扱いにする。
            // フレンドコードが無い完全新規のユーザーはfalse(未選択)にしておく。
            if (player.starterChosen === undefined) {
                player.starterChosen = !!player.friendCode;
            }

            // monsterLevelが未設定の場合はlevelに合わせておく
            // (Firestoreへのupdateはundefinedの値があるとエラーになるため)
            if (!player.monsterLevel) {
                player.monsterLevel = player.level;
            }

            // ガチャで獲得したアイテム一覧が未設定の場合は空配列にしておく
            if (!player.inventory) {
                player.inventory = [];
            }

            // 貯蔵庫(保留中のアイテム)が未設定の場合は空配列にしておく
            if (!player.storage) {
                player.storage = [];
            }

            // コンボが未設定の場合は0にしておく
            if (!player.combo) {
                player.combo = 0;
            }

            // プロフィール項目が未設定の場合のデフォルト値
            if (!player.title) {
                player.title = "";
            }
            if (!player.selfIntro) {
                player.selfIntro = "";
            }
            if (!player.nameChangeCount) {
                player.nameChangeCount = 0;
            }
            if (player.equippedItemId === undefined) {
                player.equippedItemId = null;
            }

            // リロード・再訪問時も前回のコンボを引き継げるように、
            // Firestoreに保存されていたコンボを「継続確認の対象」としてセットしておく。
            // (0ならダイアログは出さず、そのまま0から始まる)
            previousCombo = player.combo;

            // すでにフレンドコードを持っている場合、検索用インデックスに
            // 登録済みか分からないので念のため毎回登録し直しておく
            // (setDocでの上書きなので、すでに登録済みでも問題ない)
            if (player.friendCode) {
                registerFriendCode(player.friendCode, player.accountName);
            }

            console.log("プレイヤーデータ取得成功");

            // home.html側の(まだFirebase化されていない)スクリプトが
            // コイン・レベル等を同じデータとして参照・保存できるように、
            // プレイヤーデータと保存関数を window 経由で公開する。
            // これにより「ゲーム画面のコイン」と「ホーム画面のコイン」が
            // 常に同じ数字になる(同じオブジェクトを見ているだけなので)。
            window.HatchoriaPlayer = player;
            window.HatchoriaSave = { save: saveGame };
            window.dispatchEvent(new Event("hatchoria:playerReady"));

            hideLoadingOverlay();

            // ここでは initializeGame() を呼ばない。
            // (呼ぶとホーム画面にいる間にもボーナス抽選が走ってしまうため。
            //  実際にゲーム画面に入った時だけ hatchoria:enterGame で開始する)

        } catch (error) {

            // 通信エラーなどで読み込みに失敗した場合、
            // ローディング画面が消えないまま固まってしまうのを防ぐ。
            // 再読み込みボタンを出して、ユーザーがやり直せるようにする。
            console.error("プレイヤーデータの読み込みに失敗しました。", error);
            hasInitialized = false;
            showLoadingError((error && (error.code || error.message)) || String(error));

        }

        // イベント登録
        els.checkBtn.addEventListener("click", handleCheck);
        els.nextBtn.addEventListener("click", handleNext);

        els.gameoverHomeBtn.addEventListener("click", () => {

            els.gameoverOverlay.classList.remove("show", "show-text");
            els.gameoverOverlay.style.display = "none";
            window.dispatchEvent(new Event("hatchoria:requestHome"));

        });

        els.clearHomeBtn.addEventListener("click", () => {

            els.clearOverlay.classList.remove("show");
            els.clearOverlay.style.display = "none";
            window.dispatchEvent(new Event("hatchoria:requestHome"));

        });

        els.comboContinueYes.addEventListener("click", () => {

            els.comboContinueOverlay.classList.remove("show");
            initializeGame({ keepCombo: true });

        });

        els.comboContinueNo.addEventListener("click", () => {

            els.comboContinueOverlay.classList.remove("show");
            previousCombo = 0;
            initializeGame({ keepCombo: false });

        });

        window.addEventListener("keydown", (e) => {

            if (e.key !== "Enter") return;

            if (isWaiting) {
                if (!revealShowing) {
                    handleNext();
                }
            } else {
                handleCheck();
            }

        });

    });

});

// screenNav.js から「ゲーム画面に入った」通知を受けたら
// 新しいラウンドを開始する
window.addEventListener("hatchoria:enterGame", () => {

    if (!hasInitialized || !player) return;

    // 前回コンボが残っていれば、継続するか確認するダイアログを出す
    if (previousCombo > 0) {

        els.comboContinueOverlay.classList.add("show");
        return;

    }

    initializeGame();

});

// ======================================
// 初期設定
// ======================================

function initializeGame(options = {}) {

    life = MAX_LIFE;
    combo = options.keepCombo ? previousCombo : 0;
    player.combo = combo;
    correctAnswersCount = 0;
    questionsAnswered = 0;
    roundXPEarned = 0;
    roundCoinsEarned = 0;
    previousCombo = 0;
    revealShowing = false;

    els.gameoverOverlay.classList.remove("show", "show-text");
    els.gameoverOverlay.style.display = "none";
    els.clearOverlay.classList.remove("show");
    els.clearOverlay.style.display = "none";
    els.answerRevealOverlay.classList.remove("show");

    saveGame();

    nextQuestion();
    updateDisplay();

}

// ======================================
// 出題
// ======================================

function nextQuestion() {

    isBonusStage = Math.random() < BONUS_STAGE_RATE;

    if (isBonusStage) {
        showBonusLogo();
    }

    currentQuiz = quizData[Math.floor(Math.random() * quizData.length)];

    els.qDisplay.innerText =
        (isBonusStage ? "★BONUS★ " : "") + currentQuiz.q + " の意味は？";

    els.ansInput.value = "";
    els.ansInput.focus();

    els.checkBtn.style.display = "inline-block";
    els.nextBtn.style.display = "none";

    isWaiting = false;

    updateQuestionCounter();

}

// ======================================
// 「次へ進む」ボタン
// ======================================

function handleNext() {

    if (life <= 0) return;

    if (questionsAnswered >= QUESTIONS_PER_ROUND) {
        finishRound();
        return;
    }

    nextQuestion();
    updateDisplay();

}

// ======================================
// 回答判定
// ======================================

function handleCheck() {

    if (isWaiting) return;

    const value = els.ansInput.value.trim();

    if (!value) return;

    const correct = currentQuiz.a.includes(value);

    if (correct) {

        handleCorrect();

    } else {

        handleWrong();

    }

    questionsAnswered++;
    updateQuestionCounter();

    els.checkBtn.style.display = "none";

    // 不正解の場合は正解表示のあと自動で次に進むので、
    // 「次へ進む」ボタンは正解した時だけ表示する
    if (correct && life > 0) {
        els.nextBtn.style.display = "inline-block";
    }

    isWaiting = true;

    updateDisplay();
    persist();

}

// ======================================
// 正解時の処理
// ======================================

function handleCorrect() {

    showJudgeMark("○");

    combo++;
    player.combo = combo;
    correctAnswersCount++;

    const bonus = getEquippedBonus(player);

    const comboBonus = Math.floor(combo / COMBO_BONUS_STEP) * COMBO_BONUS_XP;
    let gainedXP = BASE_XP + comboBonus;

    let isSpecialPopup = false;

    if (isBonusStage) {

        gainedXP += BONUS_XP;
        isSpecialPopup = true;

    }

    // 装備中アイテムのXPボーナスを適用
    gainedXP = Math.round(gainedXP * (1 + bonus.xpBonus));

    let popupText = `+${gainedXP} XP`;

    if (isBonusStage) {
        popupText = `★BONUS★ +${gainedXP} XP`;
    } else if (combo % COMBO_BONUS_STEP === 0) {
        popupText += ` (🔥${combo}コンボ！)`;
    }

    player.exp += gainedXP;
    roundXPEarned += gainedXP;

    showXpPopup(popupText, isSpecialPopup);

    // レベルアップ判定(コインにも装備ボーナスを適用)
    const levelupCoinReward = Math.round(LEVELUP_COIN_REWARD * (1 + bonus.coinBonus));

    while (player.exp >= player.goal) {

        player.exp -= player.goal;
        player.level++;
        player.goal += 10;
        player.coins += levelupCoinReward;
        roundCoinsEarned += levelupCoinReward;

    }

}

// ======================================
// 不正解時の処理
// ======================================

function handleWrong() {

    showJudgeMark("×");

    combo = 0;
    player.combo = 0;

    life--;

    shakeLife();

    const quiz = currentQuiz;

    showAnswerReveal(quiz, () => {

        if (life <= 0) {
            handleGameOver();
        } else {
            handleNext();
        }

    });

}

// ======================================
// 不正解時: 正解を表示し、ゲージが0になったら自動で次へ進む
// ======================================

function showAnswerReveal(quiz, onDone) {

    revealShowing = true;

    els.answerRevealText.innerText = "正解：" + quiz.a.join("、");

    // 一度幅をリセットしてから、次のフレームでアニメーションを開始する
    // (同じフレーム内で変えると、5秒かけて減っていくのが効かないため)
    els.answerRevealGaugeFill.style.transition = "none";
    els.answerRevealGaugeFill.style.width = "100%";
    void els.answerRevealGaugeFill.offsetWidth;

    els.answerRevealOverlay.classList.add("show");

    requestAnimationFrame(() => {

        els.answerRevealGaugeFill.style.transition = "width 5s linear";
        els.answerRevealGaugeFill.style.width = "0%";

    });

    setTimeout(() => {

        els.answerRevealOverlay.classList.remove("show");
        revealShowing = false;
        onDone();

    }, 5000);

}

// ======================================
// ゲームオーバー
// ======================================

function handleGameOver() {

    els.checkBtn.style.display = "none";
    els.nextBtn.style.display = "none";

    // 画面が2秒かけて黒くフェードし、
    // 完全に暗くなってから GAME OVER の文字とホームボタンを出す
    //
    // display:none → flex と opacity:0 → 1 を同時に行うと
    // ブラウザがアニメーションの開始地点を認識できず、
    // 一瞬で真っ黒になってしまう。
    // そのため、まず表示だけ(透明のまま)行い、
    // 強制的に再描画させてから opacity を変化させることで
    // きちんと2秒かけてフェードするようにしている。
    els.gameoverOverlay.style.display = "flex";
    void els.gameoverOverlay.offsetWidth;
    els.gameoverOverlay.classList.add("show");

    setTimeout(() => {

        els.gameoverOverlay.classList.add("show-text");

    }, 2000);

}

// ======================================
// ラウンド終了(規定数の出題を終えた)
// ======================================

function finishRound() {

    previousCombo = combo;

    els.checkBtn.style.display = "none";
    els.nextBtn.style.display = "none";

    els.clearCorrect.innerText = `正解数：${correctAnswersCount}/${QUESTIONS_PER_ROUND}`;
    els.clearXp.innerText = `獲得XP：${roundXPEarned}xp`;
    els.clearCoins.innerText = `獲得コイン：${roundCoinsEarned}コイン`;

    // display:none → 表示 の間に強制再描画を挟むことで
    // フェード・拡大のトランジションがきちんと効くようにする
    els.clearOverlay.style.display = "flex";
    void els.clearOverlay.offsetWidth;
    els.clearOverlay.classList.add("show");

}

// ======================================
// Firebaseへ保存
// ======================================

async function persist() {

    await saveGame();

}

// ======================================
// 画面表示更新
// ======================================

function updateDisplay() {

    els.lifeContainer.innerText =
        "❤️".repeat(life) + "💔".repeat(MAX_LIFE - life);

    els.comboDisplay.innerText = `🔥×${combo} COMBO!`;

    els.lvNum.innerText = "Lv." + player.level;
    els.xpFill.style.width = (player.exp / player.goal * 100) + "%";
    els.xpText.innerText = `${player.exp}/${player.goal}`;
    els.coinText.innerText = "🪙 " + player.coins;

    const stage = getMonsterStage(player.level);
    updateCharacterImage(stage);

}

// ======================================
// モンスター画像の更新・進化演出
// ======================================

let lastMonsterStage = null; // まだ表示していない

function updateCharacterImage(stage) {

    const newSrc = `assets/images/${player.monster}_${stage}.png`;

    if (lastMonsterStage === null) {

        // 初回表示は演出なしでそのまま表示
        els.charDisplay.innerHTML =
            `<img id="monster-img" src="${newSrc}" alt="character">` +
            `<div id="evolution-flash"></div>`;

    } else if (stage !== lastMonsterStage) {

        playEvolutionAnimation(newSrc);

    } else {

        const img = els.charDisplay.querySelector("img");
        if (img) img.src = newSrc;

    }

    lastMonsterStage = stage;

}

function playEvolutionAnimation(newSrc) {

    const flash = els.charDisplay.querySelector("#evolution-flash");
    const img = els.charDisplay.querySelector("img");

    if (!flash || !img) return;

    // 2秒かけて白く染まっていく
    flash.style.transition = "opacity 2s ease-in";
    flash.style.opacity = "1";

    setTimeout(() => {

        // 真っ白になったタイミングで裏の画像を次の姿に差し替え、
        // 白い球が弾けるようなパーティクル演出を再生する
        img.src = newSrc;

        flash.style.transition = "opacity 0.15s ease-out";
        flash.style.opacity = "0";

        spawnEvolutionBurst();

    }, 2000);

}

function spawnEvolutionBurst() {

    const container = els.charDisplay;

    // 中心から広がる衝撃波(白い球が膨らんで消える)
    const wave = document.createElement("div");
    wave.className = "evo-shockwave";
    container.appendChild(wave);

    const waveAnim = wave.animate([
        { transform: "scale(0.2)", opacity: 1 },
        { transform: "scale(1)", opacity: 1, offset: 0.35 },
        { transform: "scale(3.2)", opacity: 0 }
    ], {
        duration: 600,
        easing: "cubic-bezier(0.1, 0.6, 0.3, 1)"
    });

    waveAnim.onfinish = () => wave.remove();

    // 弾け飛ぶ白い粒子
    const particleCount = 16;

    for (let i = 0; i < particleCount; i++) {

        const p = document.createElement("div");
        p.className = "evo-particle";
        container.appendChild(p);

        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.3 - 0.15);
        const dist = 55 + Math.random() * 45;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;

        const anim = p.animate([
            { transform: "translate(0, 0) scale(1)", opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 }
        ], {
            duration: 550 + Math.random() * 250,
            easing: "cubic-bezier(0.15, 0.6, 0.3, 1)"
        });

        anim.onfinish = () => p.remove();

    }

}

// ======================================
// 演出まわり
// ======================================

function showJudgeMark(mark) {

    els.judgeOverlay.style.display = "block";
    els.judgeMark.innerText = mark;
    els.judgeMark.style.color = mark === "○" ? "red" : "#3399ff";

    els.judgeOverlay.classList.remove("show");
    void els.judgeOverlay.offsetWidth;
    els.judgeOverlay.classList.add("show");

    setTimeout(() => {

        els.judgeOverlay.classList.remove("show");
        els.judgeOverlay.style.display = "none";

    }, 1000);

}

function showXpPopup(text, isSpecial) {

    if (!els.xpPopupArea) return;

    els.xpPopupArea.innerHTML = "";

    const pop = document.createElement("div");
    pop.className = isSpecial ? "xp-gain-popup special-bonus" : "xp-gain-popup";
    pop.innerText = text;

    els.xpPopupArea.appendChild(pop);

    setTimeout(() => {
        pop.remove();
    }, 1800);

}

function shakeLife() {

    els.lifeContainer.classList.add("shake-anim");

    setTimeout(() => {
        els.lifeContainer.classList.remove("shake-anim");
    }, 500);

}

function updateQuestionCounter() {

    const remaining = QUESTIONS_PER_ROUND - questionsAnswered;
    els.questionCounter.innerText = `${remaining}/${QUESTIONS_PER_ROUND}`;

}

// ======================================
// 起動時のローディング画面
// ======================================

function hideLoadingOverlay() {

    if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
    }

    const overlay = document.getElementById("app-loading-overlay");

    if (!overlay) return;

    overlay.classList.add("hide");

    setTimeout(() => {
        overlay.style.display = "none";
    }, 500);

}

function showLoadingError(detail) {

    if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
    }

    const spinner = document.getElementById("app-loading-spinner");
    const text = document.getElementById("app-loading-text");
    const retryBtn = document.getElementById("app-loading-retry-btn");

    if (spinner) spinner.style.display = "none";

    if (text) {
        text.innerText = "読み込みに失敗しました。もう一度お試しください。";

        if (detail) {

            const detailLine = document.createElement("div");
            detailLine.style.fontSize = "12px";
            detailLine.style.fontWeight = "400";
            detailLine.style.marginTop = "8px";
            detailLine.style.color = "#555";
            detailLine.style.wordBreak = "break-all";
            detailLine.innerText = "詳細: " + detail;
            text.appendChild(detailLine);

        }

    }

    if (retryBtn) {

        retryBtn.style.display = "inline-block";
        retryBtn.addEventListener("click", () => {
            location.reload();
        });

    }

}

function showBonusLogo() {

    if (!els.bonusStartLogo) return;

    document.body.classList.add("bonus-active");

    els.bonusStartLogo.classList.remove("bonus-anime-active");
    void els.bonusStartLogo.offsetWidth;
    els.bonusStartLogo.classList.add("bonus-anime-active");

    setTimeout(() => {

        els.bonusStartLogo.classList.remove("bonus-anime-active");
        document.body.classList.remove("bonus-active");

    }, 2500);

}
