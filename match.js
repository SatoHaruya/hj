// ======================================
// Hatchoria
// match.js
// マッチ(フレンドとのリアルタイム対戦)機能
// ======================================
//
// ステージ1: 対戦の申し込み・承認・辞退までの土台。
// 実際に同時に問題を解くゲーム本体は次のステージで作る。
//
// 届いている対戦の誘いは、マッチ画面を開いていなくても
// (ゲーム画面以外なら)ポップアップで通知する。
// 申し込んだ側も、相手に拒否されたらポップアップで知らされる。

import { auth } from "./firebase.js";

import {
    getFriends,
    getFriendPublicData,
    sendMatchInvite,
    acceptMatchInvite,
    declineMatchInvite,
    deleteMatch,
    cancelMatch,
    listenIncomingMatchInvites,
    listenDeclinedMatches,
    listenMyActiveMatches,
    listenToMatch,
    selectMatchQuestionCount,
    startMatch,
    updateMatchProgress,
    finalizeMatchResult
} from "./gameFirebase.js";

// 対戦で出題する単語(通常のクイズと同じ3単語)
const MATCH_QUIZ_DATA = [
    { q: "apple", a: ["りんご", "リンゴ", "林檎"] },
    { q: "sun",   a: ["太陽", "たいよう"] },
    { q: "water", a: ["水", "みず"] }
];

const WRONG_PENALTY_MS = 5000;   // 1問間違えるごとのペナルティ
const FORFEIT_WAIT_MS = 15000;   // 相手を待つ猶予時間(この間に終わらなければ不戦勝)

let els = {};

// 現在届いている pending の誘い一覧(リアルタイム監視の結果)
let incomingInvites = [];

// まだ通知していない「拒否された」マッチのキュー
let declinedQueue = [];

// 現在参加している進行中の対戦(あれば1件)
let activeMatchId = null;
let activeMatchUnsubscribe = null;
// 自分でキャンセルしてホームへ戻る途中かどうか
let isLeavingMatch = false;
// 相手切断通知を同じ対戦で二重表示しないためのフラグ
let disconnectHandled = false;
let disconnectHomeTimer = null;

// このIDの対戦では、もうカウントダウンを表示し終えたか
let countdownShownFor = null;

// 今の問題にすでに回答したか(連打・二重送信の防止)
let answeredThisQuestion = false;

function cacheElements() {

    els = {
        matchDiamond: document.getElementById("home-match-diamond"),
        invitesList: document.getElementById("match-invites-list"),
        friendsList: document.getElementById("match-friends-list"),

        invitePopup: document.getElementById("match-invite-popup"),
        invitePopupName: document.getElementById("match-invite-popup-name"),
        inviteAcceptBtn: document.getElementById("match-invite-accept-btn"),
        inviteDeclineBtn: document.getElementById("match-invite-decline-btn"),

        declinedPopup: document.getElementById("match-declined-popup"),
        declinedMessage: document.getElementById("match-declined-popup-message"),
        declinedOkBtn: document.getElementById("match-declined-ok-btn"),

        myScore: document.getElementById("match-my-score"),
        opponentName: document.getElementById("match-opponent-name"),
        opponentScore: document.getElementById("match-opponent-score"),
        questionCounter: document.getElementById("match-question-counter"),
        qDisplay: document.getElementById("match-q-display"),
        ansInput: document.getElementById("match-ans-input"),
        checkBtn: document.getElementById("match-check-btn"),
        waitingMessage: document.getElementById("match-waiting-message"),

        opponentStatus: document.getElementById("match-opponent-status"),
        selectPhase: document.getElementById("match-select-phase"),
        selectBtns: Array.from(document.querySelectorAll(".match-select-btn")),
        selectMessage: document.getElementById("match-select-message"),
        gameHeader: document.querySelector(".match-game-header"),
        gameStage: document.querySelector(".match-game-stage"),

        countdownOverlay: document.getElementById("match-countdown-overlay"),
        countdownNumber: document.getElementById("match-countdown-number"),

        resultOverlay: document.getElementById("match-result-overlay"),
        resultTitle: document.getElementById("match-result-title"),
        resultMyScore: document.getElementById("match-result-my-score"),
        resultOpponentScore: document.getElementById("match-result-opponent-score"),
        resultHomeBtn: document.getElementById("match-result-home-btn"),
        cancelBtn: document.getElementById("match-cancel-btn"),
        disconnectOverlay: document.getElementById("match-disconnect-overlay")
    };

}

// ======================================
// モンスター画像(レベルに応じた進化段階)
// ======================================

function getMonsterImageSrc(monster, level) {

    let stage = 1;

    if (level >= 80) stage = 5;
    else if (level >= 50) stage = 4;
    else if (level >= 30) stage = 3;
    else if (level >= 10) stage = 2;

    return `assets/images/${monster || "leaf"}_${stage}.png`;

}

// ======================================
// マッチ画面を開く
// ======================================

function openMatchScreen() {

    try {

        window.HatchoriaNav?.showScreen("match");

        renderInvitesList();
        renderFriendsForInvite();

    } catch (error) {

        console.error("マッチ画面を開けませんでした", error);

    }

}

// ======================================
// 対戦の誘いへの応答(承諾・辞退で共通の処理)
// ======================================

async function respondAccept(invite) {

    await acceptMatchInvite(invite.id);

}

async function respondDecline(invite) {

    await declineMatchInvite(invite.id);

}

// ======================================
// グローバル通知ポップアップ(誘いが来た)
// ======================================

function updateGlobalInvitePopup() {

    const currentScreen = window.HatchoriaNav?.getCurrentScreen();
    const invite = incomingInvites[0];

    // ゲーム中は絶対に出さない。誘いが無ければ出さない。
    if (!invite || currentScreen === "game") {
        els.invitePopup.classList.remove("show");
        return;
    }

    els.invitePopupName.innerText = invite.inviterName || "プレイヤー";
    els.invitePopup.classList.add("show");

}

// ======================================
// グローバル通知ポップアップ(拒否された)
// ======================================

function updateDeclinedPopup() {

    const match = declinedQueue[0];

    if (!match) {
        els.declinedPopup.classList.remove("show");
        return;
    }

    els.declinedMessage.innerText = `${match.opponentName || "相手"}さんに拒否されました`;
    els.declinedPopup.classList.add("show");

}

// ======================================
// マッチ画面内の「届いている誘い」一覧
// ======================================

function renderInvitesList() {

    if (!els.invitesList) return;

    if (incomingInvites.length === 0) {
        els.invitesList.innerHTML = `<div class="friend-empty-text">届いている対戦の誘いはありません</div>`;
        return;
    }

    els.invitesList.innerHTML = "";

    incomingInvites.forEach((invite) => {

        const card = document.createElement("div");
        card.className = "friend-item-card";

        card.innerHTML = `
            <div class="friend-item-info">
                <div class="friend-item-name">${invite.inviterName || "プレイヤー"}</div>
                <div class="friend-item-level">対戦の誘い</div>
            </div>
            <button class="match-invite-btn">承諾</button>
            <button class="match-decline-btn">辞退</button>
        `;

        card.querySelector(".match-invite-btn").addEventListener("click", () => respondAccept(invite));
        card.querySelector(".match-decline-btn").addEventListener("click", () => respondDecline(invite));

        els.invitesList.appendChild(card);

    });

}

// ======================================
// フレンドに対戦を申し込む
// ======================================

async function renderFriendsForInvite() {

    els.friendsList.innerHTML = "読み込み中...";

    try {

        const friends = await getFriends();

        if (friends.length === 0) {
            els.friendsList.innerHTML = `<div class="friend-empty-text">まだフレンドがいません</div>`;
            return;
        }

        els.friendsList.innerHTML = "";

        for (const friend of friends) {

            const data = await getFriendPublicData(friend.uid);

            const card = document.createElement("div");
            card.className = "friend-item-card";

            const name = (data && data.accountName) || friend.name || "プレイヤー";
            const level = data ? data.level : "?";
            const imgSrc = data ? getMonsterImageSrc(data.monster, data.level) : "";

            card.innerHTML = `
                ${imgSrc ? `<img src="${imgSrc}" alt="monster">` : ""}
                <div class="friend-item-info">
                    <div class="friend-item-name">${name}</div>
                    <div class="friend-item-level">Lv.${level}</div>
                </div>
                <button class="match-invite-btn">対戦を申し込む</button>
            `;

            card.querySelector(".match-invite-btn").addEventListener("click", async (e) => {

                e.target.disabled = true;
                e.target.innerText = "送信中...";

                const result = await sendMatchInvite(friend.uid, name);

                if (result.ok) {
                    e.target.innerText = "申し込み済み";
                } else {
                    e.target.disabled = false;
                    e.target.innerText = "対戦を申し込む";
                    alert("申し込みに失敗しました。もう一度お試しください。");
                }

            });

            els.friendsList.appendChild(card);

        }

    } catch (error) {

        console.error("フレンド一覧の取得に失敗しました", error);
        els.friendsList.innerHTML = `<div class="friend-empty-text">読み込みに失敗しました</div>`;

    }

}

// ======================================
// 対戦本体(問題数選択 → 自分のペースで解答 → タイム勝負)
// ======================================

let currentMatchSnapshot = null;

// 自分側の進行状況(ローカルで先行して持ち、Firestoreには報告用に送る)
let myLocalIndex = 0;
let myWrongCount = 0;
let myFinished = false;
let myEffectiveMs = null;

let startMatchCalled = false;
let forfeitTimer = null;
let finalizeCalled = false;
let focusedForIndex = -1;

function enterMatch(matchId) {

    if (activeMatchId === matchId) return; // すでに入室済み

    activeMatchId = matchId;
    isLeavingMatch = false;
    disconnectHandled = false;

    if (disconnectHomeTimer) {
        clearTimeout(disconnectHomeTimer);
        disconnectHomeTimer = null;
    }

    countdownShownFor = null;
    myLocalIndex = 0;
    myWrongCount = 0;
    myFinished = false;
    myEffectiveMs = null;
    startMatchCalled = false;
    finalizeCalled = false;
    focusedForIndex = -1;

    if (forfeitTimer) {
        clearTimeout(forfeitTimer);
        forfeitTimer = null;
    }

    window.HatchoriaNav?.showScreen("matchGame");

    activeMatchUnsubscribe = listenToMatch(matchId, (match) => {

        currentMatchSnapshot = match;

        if (!match) {
            handleOpponentDisconnected();
            return;
        }

        renderMatchState(match);

    }, (error) => {

        console.error("対戦の監視でエラーが発生しました", error);
        handleOpponentDisconnected();

    });

}

function exitMatch() {

    if (activeMatchUnsubscribe) {
        activeMatchUnsubscribe();
        activeMatchUnsubscribe = null;
    }

    if (forfeitTimer) {
        clearTimeout(forfeitTimer);
        forfeitTimer = null;
    }

    activeMatchId = null;
    currentMatchSnapshot = null;
    countdownShownFor = null;

    if (disconnectHomeTimer) {
        clearTimeout(disconnectHomeTimer);
        disconnectHomeTimer = null;
    }

    els.countdownOverlay.classList.remove("show");
    els.resultOverlay.classList.remove("show");
    els.waitingMessage.classList.remove("show");
    els.selectPhase.classList.remove("show");
    els.opponentStatus.classList.remove("show");
    els.gameHeader.classList.remove("show");
    els.gameStage.classList.remove("show");
    els.cancelBtn.classList.remove("show");
    els.disconnectOverlay.classList.remove("show");

}

// 相手が対戦ドキュメントを削除した、または監視接続が失敗した場合の処理
function handleOpponentDisconnected() {

    if (isLeavingMatch || disconnectHandled || !activeMatchId) return;

    disconnectHandled = true;

    // 監視を解除して、以後のイベントで通知が重複しないようにする
    exitMatch();

    els.disconnectOverlay.classList.add("show");

    disconnectHomeTimer = setTimeout(() => {

        els.disconnectOverlay.classList.remove("show");
        disconnectHomeTimer = null;
        window.dispatchEvent(new Event("hatchoria:requestHome"));

    }, 1600);

}

// 問題数選択中のキャンセル処理
async function cancelCurrentMatch() {

    const matchId = activeMatchId;

    if (!matchId) {
        window.dispatchEvent(new Event("hatchoria:requestHome"));
        return;
    }

    // 自分のキャンセル通知を「相手切断」として表示しない
    isLeavingMatch = true;

    try {
        // 削除ではなく cancelled 状態を書き込み、相手側へ確実に通知する
        await cancelMatch(matchId);
    } catch (error) {
        console.error("対戦キャンセル状態の保存に失敗しました", error);

        // 古いFirestoreルールなどで状態変更が拒否された場合の後退処理
        try {
            await deleteMatch(matchId);
        } catch (deleteError) {
            console.error("対戦キャンセル時の削除にも失敗しました", deleteError);
        }
    }

    exitMatch();
    window.dispatchEvent(new Event("hatchoria:requestHome"));

}

function myUid() {
    return auth.currentUser ? auth.currentUser.uid : null;
}

function isInviter(match) {
    return match.inviterUid === myUid();
}

function renderMatchState(match) {

    if (match.status === "declined") {
        exitMatch();
        return;
    }

    if (match.status === "cancelled") {
        if (isLeavingMatch) {
            exitMatch();
        } else {
            handleOpponentDisconnected();
        }
        return;
    }

    if (match.status === "active" && (!Array.isArray(match.questions) || !match.inviterProgress || !match.opponentProgress)) {
        // 壊れた/古い形式のデータは処理せず抜ける
        exitMatch();
        return;
    }

    const iAmInviter = isInviter(match);
    const opponentName = iAmInviter ? match.opponentName : match.inviterName;
    els.opponentName.innerText = opponentName || "相手";

    if (match.status === "selecting") {

        renderSelectPhase(match, iAmInviter, opponentName);
        return;

    }

    els.selectPhase.classList.remove("show");

    if (match.status === "active") {

        renderActivePhase(match, iAmInviter, opponentName);
        return;

    }

    if (match.status === "finished") {

        showMatchResult(match, iAmInviter, opponentName);

    }

}

// ======================================
// フェーズ1: 問題数の選択
// ======================================

function renderSelectPhase(match, iAmInviter, opponentName) {

    els.gameHeader.classList.remove("show");
    els.gameStage.classList.remove("show");
    els.selectPhase.classList.add("show");

    const myCount = iAmInviter ? match.inviterQuestionCount : match.opponentQuestionCount;
    const opponentCount = iAmInviter ? match.opponentQuestionCount : match.inviterQuestionCount;

    els.selectBtns.forEach((btn) => {
        btn.classList.toggle("selected", Number(btn.dataset.count) === myCount);
    });

    // 選択画面ではキャンセルボタンを表示する
    els.cancelBtn.classList.add("show");

    if (opponentCount) {

        els.opponentStatus.innerText = `${opponentName || "相手"}は${opponentCount}問を選択しました`;
        els.opponentStatus.classList.add("show");

    } else {

        els.opponentStatus.classList.remove("show");

    }

    if (myCount && opponentCount) {

        if (myCount === opponentCount) {

            els.selectMessage.style.color = "#2e7d32";
            els.selectMessage.innerText = "選択が一致しました！まもなく開始します…";

            if (!startMatchCalled) {

                startMatchCalled = true;

                const questions = generateMatchQuestions(myCount);
                startMatch(match.id, questions, myCount);

            }

        } else {

            els.selectMessage.style.color = "#e53935";
            els.selectMessage.innerText = `${opponentName || "相手"}との選択が一致しません`;

        }

    } else {

        els.selectMessage.style.color = "#555";
        els.selectMessage.innerText = myCount ? "相手の選択を待っています…" : "";

    }

}

function generateMatchQuestions(count) {

    const list = [];

    for (let i = 0; i < count; i++) {
        list.push(MATCH_QUIZ_DATA[Math.floor(Math.random() * MATCH_QUIZ_DATA.length)]);
    }

    return list;

}

// ======================================
// フェーズ2: 自分のペースで解答する
// ======================================

function renderActivePhase(match, iAmInviter, opponentName) {

    els.selectPhase.classList.remove("show");
    els.cancelBtn.classList.remove("show");
    els.gameHeader.classList.add("show");
    els.gameStage.classList.add("show");

    const myProgress = iAmInviter ? match.inviterProgress : match.opponentProgress;
    const opponentProgress = iAmInviter ? match.opponentProgress : match.inviterProgress;
    const totalCount = match.questionCount;

    // カウントダウン(このマッチで最初の1回だけ)
    if (countdownShownFor !== match.id) {

        countdownShownFor = match.id;
        playCountdown();

    }

    // 自分の表示(ローカルの進行状況を優先して即応性を出す)
    els.myScore.innerText = `${myLocalIndex}問`;
    els.questionCounter.innerText = `${Math.min(myLocalIndex + 1, totalCount)}/${totalCount}`;

    // 相手の進行状況(右上に表示)
    if (opponentProgress && opponentProgress.finishedAt) {

        els.opponentStatus.innerText = `${opponentName || "相手"}は解答を終えました！`;
        els.opponentStatus.classList.add("show");

    } else if (opponentProgress && opponentProgress.currentIndex > 0) {

        els.opponentStatus.innerText = `${opponentName || "相手"}：${opponentProgress.currentIndex}/${totalCount}`;
        els.opponentStatus.classList.add("show");

    } else {

        els.opponentStatus.classList.remove("show");

    }

    els.opponentScore.innerText = `${opponentProgress ? opponentProgress.currentIndex : 0}問`;

    if (myFinished) {

        els.qDisplay.innerText = "";
        els.ansInput.disabled = true;
        els.checkBtn.disabled = true;
        els.waitingMessage.classList.add("show");

        // 相手も終わっていたら勝敗を確定する(どちらが呼んでも結果は同じ)
        if (opponentProgress && opponentProgress.finishedAt && !finalizeCalled) {

            finalizeCalled = true;
            finalizeWinner(match, myEffectiveMs, opponentProgress.effectiveMs, iAmInviter);

        }

    } else {

        const question = match.questions[myLocalIndex];

        els.qDisplay.innerText = question.q + " の意味は？";
        els.ansInput.disabled = false;
        els.checkBtn.disabled = false;
        els.waitingMessage.classList.remove("show");

        // 新しい問題に切り替わった時だけ自動でフォーカスする
        // (毎回呼ぶと入力中にキーボードが再度出て邪魔になるため)
        if (focusedForIndex !== myLocalIndex) {
            focusedForIndex = myLocalIndex;
            els.ansInput.focus();
        }

    }

}

function playCountdown() {

    const steps = ["3", "2", "1", "START"];
    let i = 0;

    els.countdownOverlay.classList.add("show");
    els.countdownNumber.innerText = steps[i];

    const timer = setInterval(() => {

        i++;

        if (i >= steps.length) {
            clearInterval(timer);
            els.countdownOverlay.classList.remove("show");
            return;
        }

        els.countdownNumber.innerText = steps[i];

    }, 700);

}

async function handleMatchCheck() {

    if (myFinished) return;

    const match = currentMatchSnapshot;
    if (!match || match.status !== "active") return;

    const value = els.ansInput.value.trim();
    if (!value) return;

    const question = match.questions[myLocalIndex];
    const correct = question.a.includes(value);

    if (!correct) {
        myWrongCount++;
    }

    myLocalIndex++;
    els.ansInput.value = "";

    const iAmInviter = isInviter(match);

    if (myLocalIndex >= match.questionCount) {

        // 全問解き終えた
        myFinished = true;

        const finishedAt = Date.now();
        myEffectiveMs = (finishedAt - match.startedAt) + (myWrongCount * WRONG_PENALTY_MS);

        await updateMatchProgress(match.id, iAmInviter, {
            currentIndex: myLocalIndex,
            wrongCount: myWrongCount,
            finishedAt: finishedAt,
            effectiveMs: myEffectiveMs
        });

        startForfeitTimer(match, iAmInviter);

    } else {

        await updateMatchProgress(match.id, iAmInviter, {
            currentIndex: myLocalIndex,
            wrongCount: myWrongCount,
            finishedAt: null,
            effectiveMs: null
        });

        renderMatchState(match);

    }

}

// 自分が先に終えた場合、猶予時間を過ぎても相手が終わらなければ不戦勝にする
function startForfeitTimer(match, iAmInviter) {

    if (forfeitTimer) clearTimeout(forfeitTimer);

    forfeitTimer = setTimeout(() => {

        if (finalizeCalled) return;

        const latest = currentMatchSnapshot;
        if (!latest || latest.status !== "active") return;

        const opponentProgress = iAmInviter ? latest.opponentProgress : latest.inviterProgress;

        if (!opponentProgress || !opponentProgress.finishedAt) {

            finalizeCalled = true;
            finalizeMatchResult(match.id, myUid());

        }

    }, FORFEIT_WAIT_MS);

}

// 両者の完答タイムを比べて勝者を決める(どちらが呼んでも同じ結果)
function finalizeWinner(match, myMs, opponentMs, iAmInviter) {

    let winner = null;

    if (myMs < opponentMs) {
        winner = myUid();
    } else if (opponentMs < myMs) {
        winner = iAmInviter ? match.opponentUid : match.inviterUid;
    }
    // 同着の場合は winner を null のまま(引き分け)にする

    finalizeMatchResult(match.id, winner);

}

function formatSeconds(ms) {

    if (ms === null || ms === undefined) return "-";
    return (ms / 1000).toFixed(1) + "秒";

}

function showMatchResult(match, iAmInviter, opponentName) {

    if (forfeitTimer) {
        clearTimeout(forfeitTimer);
        forfeitTimer = null;
    }

    const myProgress = iAmInviter ? match.inviterProgress : match.opponentProgress;
    const opponentProgress = iAmInviter ? match.opponentProgress : match.inviterProgress;

    let title = "引き分け";

    if (match.winner) {
        title = match.winner === myUid() ? "勝利！" : "敗北…";
    }

    els.resultTitle.innerText = title;
    els.resultMyScore.innerText = `あなた：${formatSeconds(myProgress ? myProgress.effectiveMs : null)}`;
    els.resultOpponentScore.innerText = `${opponentName || "相手"}：${formatSeconds(opponentProgress ? opponentProgress.effectiveMs : null)}`;

    els.countdownOverlay.classList.remove("show");
    els.opponentStatus.classList.remove("show");
    els.gameHeader.classList.remove("show");
    els.gameStage.classList.remove("show");
    els.resultOverlay.classList.add("show");

}

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    try {

    cacheElements();

    if (!els.matchDiamond) {

        // マッチUIが存在しないページでは何もしない
        return;

    }

    els.matchDiamond.addEventListener("click", openMatchScreen);

    // グローバル通知ポップアップのボタン
    els.inviteAcceptBtn.addEventListener("click", async () => {

        const invite = incomingInvites[0];
        if (!invite) return;

        els.invitePopup.classList.remove("show");
        await respondAccept(invite);

    });

    els.inviteDeclineBtn.addEventListener("click", async () => {

        const invite = incomingInvites[0];
        if (!invite) return;

        els.invitePopup.classList.remove("show");
        await respondDecline(invite);

    });

    els.declinedOkBtn.addEventListener("click", async () => {

        const match = declinedQueue.shift();
        els.declinedPopup.classList.remove("show");

        if (match) {
            await deleteMatch(match.id);
        }

        updateDeclinedPopup();

    });

    els.checkBtn.addEventListener("click", handleMatchCheck);

    els.ansInput.addEventListener("keydown", (e) => {

        if (e.key === "Enter") {
            handleMatchCheck();
        }

    });

    els.selectBtns.forEach((btn) => {

        btn.addEventListener("click", async () => {

            const match = currentMatchSnapshot;
            if (!match) return;

            const count = Number(btn.dataset.count);
            await selectMatchQuestionCount(match.id, isInviter(match), count);

        });

    });

    els.resultHomeBtn.addEventListener("click", async () => {

        const finishedMatchId = activeMatchId;
        exitMatch();

        if (finishedMatchId) {

            try {
                await deleteMatch(finishedMatchId);
            } catch (error) {
                // 相手が先に削除済みなどで失敗しても、
                // ホームに戻る操作自体は必ず成功させる
                console.error("対戦データの削除に失敗しました", error);
            }

        }

        window.dispatchEvent(new Event("hatchoria:requestHome"));

    });

    els.cancelBtn.addEventListener("click", cancelCurrentMatch);

    // 画面が切り替わるたびに、通知ポップアップを出すべきか判定し直す
    window.addEventListener("hatchoria:screenChanged", updateGlobalInvitePopup);

    } catch (error) {

        console.error("match.js 初期化エラー", error);

    }

});

// game.js がプレイヤーデータを読み込み終えたら、
// 対戦の誘い・拒否通知をリアルタイムで監視し始める
window.addEventListener("hatchoria:playerReady", () => {

    listenIncomingMatchInvites((invites) => {

        incomingInvites = invites;
        updateGlobalInvitePopup();
        renderInvitesList();

    }, (error) => {

        console.error("対戦の誘いの監視でエラーが発生しました", error);

    });

    listenDeclinedMatches((declined) => {

        // まだキューに無いものだけ追加する(同じ内容で何度も
        // 通知イベントが来ても、二重に並ばないようにする)
        declined.forEach((match) => {

            if (!declinedQueue.some((m) => m.id === match.id)) {
                declinedQueue.push(match);
            }

        });

        updateDeclinedPopup();

    }, (error) => {

        console.error("拒否通知の監視でエラーが発生しました", error);

    });

    // 自分が関わっている「選択中・進行中」の対戦を検知したら、
    // (招待した側・された側どちらでも)自動的に対戦画面に入る
    listenMyActiveMatches((matches) => {

        if (matches.length === 0) return;

        // 古い形式で壊れているデータ(以前のテストの残骸等)は無視する
        const valid = matches.filter((m) => {

            if (m.status === "selecting") return true;

            if (m.status === "active") {
                return Array.isArray(m.questions) && m.inviterProgress && m.opponentProgress;
            }

            return false;

        });

        if (valid.length === 0) return;

        const match = valid[0];

        if (activeMatchId !== match.id) {
            enterMatch(match.id);
        }

    }, (error) => {

        console.error("進行中の対戦の監視でエラーが発生しました", error);

    });

});
