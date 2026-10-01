// ======================================
// Hatchoria
// profile.js
// プロフィール・設定・アカウント作成(Firebase統一版)
// ======================================
//
// アカウント名・フレンドコードは save.js が管理する
// Firestore上のプレイヤーデータ(accountName / friendCode)を
// そのまま読み書きする。ここではローカルの username/usercode は持たない。

import { getPlayerData, saveGame } from "./save.js";
import { registerFriendCode } from "./gameFirebase.js";

const DEFAULT_MONSTER = "leaf";
const DEFAULT_GOAL = 50;
const NAME_CHANGE_COST = 1500;

// レベルに応じて自動解除される称号一覧
const TITLES = [
    { id: "beginner",   label: "ハッチョリア見習い", minLevel: 1 },
    { id: "apprentice", label: "見習い調教師",       minLevel: 10 },
    { id: "skilled",    label: "一人前の調教師",     minLevel: 30 },
    { id: "veteran",    label: "熟練の調教師",       minLevel: 50 },
    { id: "legend",     label: "伝説の調教師",       minLevel: 80 }
];

function getUnlockedTitles(level) {
    return TITLES.filter((t) => level >= t.minLevel);
}

function getTitleLabel(id) {
    const t = TITLES.find((t) => t.id === id);
    return t ? t.label : "なし";
}

let els = {};

function cacheElements() {

    els = {
        settingBtn: document.getElementById("setting-btn"),
        settingMenuOverlay: document.getElementById("setting-menu-overlay"),
        settingMenuCloseBtn: document.getElementById("setting-menu-close-btn"),
        menuProfileBtn: document.getElementById("menu-profile-btn"),
        menuResetBtn: document.getElementById("menu-reset-btn"),

        profileOverlay: document.getElementById("profile-overlay"),
        profileCloseBtn: document.getElementById("profile-close-btn"),
        profileCopyBtn: document.getElementById("profile-copy-btn"),
        profileNameDisplay: document.getElementById("profile-name-display"),
        profileCodeDisplay: document.getElementById("profile-code-display"),
        profileRankDisplay: document.getElementById("profile-rank-display"),

        nameEditBtn: document.getElementById("profile-name-edit-btn"),
        nameEditBox: document.getElementById("profile-name-edit-box"),
        nameInput: document.getElementById("profile-name-input"),
        nameCostNote: document.getElementById("profile-name-cost-note"),
        nameSaveBtn: document.getElementById("profile-name-save-btn"),
        nameCancelBtn: document.getElementById("profile-name-cancel-btn"),

        titleDisplay: document.getElementById("profile-title-display"),
        titleEditBtn: document.getElementById("profile-title-edit-btn"),
        titleEditBox: document.getElementById("profile-title-edit-box"),
        titleSelect: document.getElementById("profile-title-select"),
        titleSaveBtn: document.getElementById("profile-title-save-btn"),
        titleCancelBtn: document.getElementById("profile-title-cancel-btn"),

        introDisplay: document.getElementById("profile-intro-display"),
        introEditBtn: document.getElementById("profile-intro-edit-btn"),
        introEditBox: document.getElementById("profile-intro-edit-box"),
        introInput: document.getElementById("profile-intro-input"),
        introSaveBtn: document.getElementById("profile-intro-save-btn"),
        introCancelBtn: document.getElementById("profile-intro-cancel-btn"),

        accountCreationOverlay: document.getElementById("account-creation-overlay"),
        accountNameInput: document.getElementById("account-name-input"),
        accountSubmitBtn: document.getElementById("account-submit-btn"),

        starterSelectOverlay: document.getElementById("starter-select-overlay"),
        starterEggChoices: Array.from(document.querySelectorAll(".starter-egg-choice"))
    };

}

// ======================================
// フレンドコード生成
// ======================================

function generateFriendCode() {

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;

}

// ======================================
// 初回アカウント名設定(フレンドコード未発行の場合のみ)
// ======================================

function checkAccountSetup() {

    const player = getPlayerData();

    if (!player) return;

    if (!player.friendCode) {

        els.accountCreationOverlay.classList.add("show");
        return;

    }

    // アカウントはあるが、卵をまだ選んでいない
    // (リセット直後など)場合は選択画面を出す
    if (player.starterChosen === false) {
        els.starterSelectOverlay.classList.add("show");
    }

}

function submitAccountName() {

    const player = getPlayerData();

    if (!player) return;

    const inputName = els.accountNameInput.value.trim();

    if (!inputName) {
        alert("アカウント名を入力してください！");
        return;
    }

    player.accountName = inputName;
    player.friendCode = generateFriendCode();

    saveGame();
    registerFriendCode(player.friendCode, player.accountName);

    els.accountCreationOverlay.classList.remove("show");
    els.starterSelectOverlay.classList.add("show");

}

// ======================================
// 卵選択(新規登録時、最初にどちらのモンスターを
// 育てるか選ぶ)
// ======================================

function handleStarterChoice(type) {

    const player = getPlayerData();
    if (!player) return;

    player.monster = type;
    player.monsterLevel = 1;
    player.starterChosen = true;

    saveGame();

    els.starterSelectOverlay.classList.remove("show");

    // ホーム画面の表示更新・ログインボーナス確認をトリガーする
    window.dispatchEvent(new Event("hatchoria:playerReady"));

}

// ======================================
// 設定メニュー
// ======================================

function openSettingMenu() {
    els.settingMenuOverlay.classList.add("show");
}

function closeSettingMenu() {
    els.settingMenuOverlay.classList.remove("show");
}

// ======================================
// プロフィール確認
// ======================================

function openProfile() {

    const player = getPlayerData();

    els.settingMenuOverlay.classList.remove("show");

    els.profileNameDisplay.innerText = player ? player.accountName : "---";
    els.profileCodeDisplay.innerText = player ? player.friendCode : "----------";
    els.profileRankDisplay.innerText = player ? "Lv." + player.level : "Lv.1";
    els.titleDisplay.innerText = player ? getTitleLabel(player.title) : "なし";
    els.introDisplay.innerText = (player && player.selfIntro) ? player.selfIntro : "未設定";

    els.profileCopyBtn.innerText = "コピー";
    els.profileCopyBtn.classList.remove("copied");

    // 編集ボックスは毎回閉じた状態から始める
    els.nameEditBox.classList.remove("show");
    els.titleEditBox.classList.remove("show");
    els.introEditBox.classList.remove("show");

    els.profileOverlay.classList.add("show");

}

function closeProfile() {
    els.profileOverlay.classList.remove("show");
}

// ======================================
// アカウント名の編集(2回目以降は1500コイン消費)
// ======================================

function openNameEdit() {

    const player = getPlayerData();
    if (!player) return;

    els.nameInput.value = player.accountName || "";

    els.nameCostNote.innerText = player.nameChangeCount > 0
        ? `変更には🪙${NAME_CHANGE_COST}コイン必要です(所持: ${player.coins})`
        : "初回の変更は無料です";

    els.nameEditBox.classList.add("show");

}

function cancelNameEdit() {
    els.nameEditBox.classList.remove("show");
}

async function saveNameEdit() {

    const player = getPlayerData();
    if (!player) return;

    const newName = els.nameInput.value.trim();

    if (!newName) {
        alert("アカウント名を入力してください。");
        return;
    }

    if (player.nameChangeCount > 0) {

        if (player.coins < NAME_CHANGE_COST) {
            alert(`コインが足りません。(変更には🪙${NAME_CHANGE_COST}必要です)`);
            return;
        }

        player.coins -= NAME_CHANGE_COST;

    }

    player.accountName = newName;
    player.nameChangeCount = (player.nameChangeCount || 0) + 1;

    await saveGame();
    registerFriendCode(player.friendCode, player.accountName);

    els.profileNameDisplay.innerText = player.accountName;
    els.nameEditBox.classList.remove("show");

    window.dispatchEvent(new Event("hatchoria:playerReady"));

}

// ======================================
// 称号の変更(レベルに応じて解除された一覧から選ぶ)
// ======================================

function openTitleEdit() {

    const player = getPlayerData();
    if (!player) return;

    const unlocked = getUnlockedTitles(player.level);

    els.titleSelect.innerHTML = `<option value="">なし</option>` +
        unlocked.map((t) =>
            `<option value="${t.id}">${t.label}</option>`
        ).join("");

    els.titleSelect.value = player.title || "";

    els.titleEditBox.classList.add("show");

}

function cancelTitleEdit() {
    els.titleEditBox.classList.remove("show");
}

async function saveTitleEdit() {

    const player = getPlayerData();
    if (!player) return;

    player.title = els.titleSelect.value;

    await saveGame();

    els.titleDisplay.innerText = getTitleLabel(player.title);
    els.titleEditBox.classList.remove("show");

}

// ======================================
// 自己紹介の編集
// ======================================

function openIntroEdit() {

    const player = getPlayerData();
    if (!player) return;

    els.introInput.value = player.selfIntro || "";

    els.introEditBox.classList.add("show");

}

function cancelIntroEdit() {
    els.introEditBox.classList.remove("show");
}

async function saveIntroEdit() {

    const player = getPlayerData();
    if (!player) return;

    player.selfIntro = els.introInput.value.trim();

    await saveGame();

    els.introDisplay.innerText = player.selfIntro || "未設定";
    els.introEditBox.classList.remove("show");

}

function copyFriendCode() {

    const player = getPlayerData();

    if (!player) return;

    navigator.clipboard.writeText(player.friendCode).then(() => {

        els.profileCopyBtn.innerText = "コピー完了！";
        els.profileCopyBtn.classList.add("copied");

        setTimeout(() => {
            els.profileCopyBtn.innerText = "コピー";
            els.profileCopyBtn.classList.remove("copied");
        }, 2000);

    }).catch(() => {

        alert("コピーに失敗しました。お使いのブラウザを手動で選択してください。");

    });

}

// ======================================
// セーブデータのリセット
// ======================================
//
// アカウント名・フレンドコードはそのままに、
// レベル・XP・コイン・モンスター・所持アイテムを初期状態に戻す。

function resetSaveData() {

    const player = getPlayerData();

    if (!player) return;

    const ok = confirm(

        "本当に最初からやり直しますか？\n" +
        "（レベル・コイン・アイテムなどのゲーム進行データが削除されます）"

    );

    if (!ok) return;

    player.level = 1;
    player.exp = 0;
    player.coins = 0;
    player.goal = DEFAULT_GOAL;
    player.monster = null;
    player.monsterLevel = 1;
    player.inventory = [];
    player.storage = [];
    player.equippedItemId = null;
    player.starterChosen = false;

    saveGame().then(() => {
        location.reload();
    });

}

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    cacheElements();

    if (!els.settingBtn) {

        // 設定・プロフィールのUIが存在しないページでは何もしない
        return;

    }

    els.settingBtn.addEventListener("click", openSettingMenu);
    els.settingMenuCloseBtn.addEventListener("click", closeSettingMenu);
    els.menuProfileBtn.addEventListener("click", openProfile);
    els.menuResetBtn.addEventListener("click", resetSaveData);

    els.profileCloseBtn.addEventListener("click", closeProfile);
    els.profileCopyBtn.addEventListener("click", copyFriendCode);

    els.nameEditBtn.addEventListener("click", openNameEdit);
    els.nameCancelBtn.addEventListener("click", cancelNameEdit);
    els.nameSaveBtn.addEventListener("click", saveNameEdit);

    els.titleEditBtn.addEventListener("click", openTitleEdit);
    els.titleCancelBtn.addEventListener("click", cancelTitleEdit);
    els.titleSaveBtn.addEventListener("click", saveTitleEdit);

    els.introEditBtn.addEventListener("click", openIntroEdit);
    els.introCancelBtn.addEventListener("click", cancelIntroEdit);
    els.introSaveBtn.addEventListener("click", saveIntroEdit);

    els.accountSubmitBtn.addEventListener("click", submitAccountName);

    els.starterEggChoices.forEach((el) => {

        el.addEventListener("click", () => {
            handleStarterChoice(el.dataset.type);
        });

    });

});

// game.js がFirestoreからプレイヤーデータを読み込み終えたら、
// アカウント未設定(フレンドコード未発行)なら作成画面を出す
window.addEventListener("hatchoria:playerReady", checkAccountSetup);
