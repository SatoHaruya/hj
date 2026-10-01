// ======================================
// Hatchoria
// gacha.js
// ガチャ機能(Firebase統一版)
// ======================================
//
// コイン・獲得アイテムは save.js が管理する
// Firestore上のプレイヤーデータをそのまま読み書きする。
// (game.js やホーム画面と同じデータを共有しているので、
//  ガチャで使ったコインは他の画面にもすぐ反映される)

import { getPlayerData, saveGame } from "./save.js";

const rewards = [
    { name: "賢者の石 🪨",     icon: "🪨", rarity: "ULTRA",     cssClass: "item-ultra",     tagClass: "tag-ultra" },
    { name: "聖なる遺体 💀",   icon: "💀", rarity: "LEGENDARY", cssClass: "item-legendary", tagClass: "tag-legendary" },
    { name: "神秘の果実 🍋",   icon: "🍋", rarity: "RARE",      cssClass: "item-rare",      tagClass: "tag-rare" },
    { name: "道化師の仮面 🎭", icon: "🎭", rarity: "COMMON",    cssClass: "item-common",    tagClass: "tag-common" }
];

const GACHA_COST = 500;

let currentGachaReward = null;

let els = {};

function cacheElements() {

    els = {
        coinText: document.getElementById("gacha-screen-coin-text"),
        mainBox: document.getElementById("gacha-main-box"),
        drawBtn: document.getElementById("gacha-draw-action-btn"),
        choiceContainer: document.getElementById("gacha-choice-container"),
        holdBtn: document.getElementById("gacha-hold-btn"),
        keepBtn: document.getElementById("gacha-keep-btn")
    };

}

// ======================================
// 表示更新
// ======================================

function updateCoinDisplay() {

    const player = getPlayerData();

    if (!player || !els.coinText) return;

    els.coinText.innerText = "所持コイン: 🪙 " + player.coins;

}

function resetGachaState() {

    if (!els.mainBox) return;

    els.mainBox.innerHTML = "📦";
    els.drawBtn.style.display = "inline-block";
    els.choiceContainer.style.display = "none";
    currentGachaReward = null;

    updateCoinDisplay();

}

// ======================================
// ガチャを引く
// ======================================

function drawGacha() {

    const player = getPlayerData();

    if (!player) return;

    if (player.coins < GACHA_COST) {

        alert(`🪙 コインが足りません！ (1回${GACHA_COST}コイン必要です)`);
        return;

    }

    player.coins -= GACHA_COST;
    updateCoinDisplay();
    saveGame();

    els.drawBtn.style.display = "none";
    els.mainBox.innerHTML = "🌀";

    setTimeout(() => {

        const rand = Math.random() * 100;

        if (rand < 10) {
            currentGachaReward = rewards[0];
        } else if (rand < 25) {
            currentGachaReward = rewards[1];
        } else if (rand < 55) {
            currentGachaReward = rewards[2];
        } else {
            currentGachaReward = rewards[3];
        }

        els.mainBox.innerHTML = `
            <div>
                <div class="rarity-tag ${currentGachaReward.tagClass}">${currentGachaReward.rarity}</div>
                <div style="font-size: 60px; margin-bottom: 5px;">${currentGachaReward.icon}</div>
                <div class="nyanko-black-box">
                    <div class="${currentGachaReward.cssClass}" style="font-size:22px; white-space:nowrap;">
                        ${currentGachaReward.name}
                    </div>
                </div>
            </div>
        `;

        // 演出(花火)は home.html 側の既存関数を使う
        if (typeof window.playFireworks === "function") {
            window.playFireworks();
        }

        els.choiceContainer.style.display = "flex";

    }, 800);

}

// ======================================
// 保留する(貯蔵庫に送る)
// ======================================

function holdItem() {

    const player = getPlayerData();

    if (!currentGachaReward || !player) return;

    if (!player.storage) {
        player.storage = [];
    }

    player.storage.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: currentGachaReward.name,
        level: 1
    });

    els.mainBox.innerHTML = `
        <div class="gacha-result-msg">
            🗄️ 貯蔵庫に保留しました
        </div>
    `;

    els.choiceContainer.style.display = "none";
    setTimeout(resetGachaState, 2500);

    saveGame();

}

// ======================================
// アイテムとして所持する
// ======================================

function keepItem() {

    const player = getPlayerData();

    if (!currentGachaReward || !player) return;

    if (!player.inventory) {
        player.inventory = [];
    }

    const existing = player.inventory.find((it) => it.name === currentGachaReward.name);

    if (existing) {

        existing.duplicates = (existing.duplicates || 0) + 1;

    } else {

        player.inventory.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            name: currentGachaReward.name,
            level: 1,
            duplicates: 0
        });

    }

    els.mainBox.innerHTML = `
        <div class="gacha-result-msg" style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
            <div class="nyanko-black-box">
                <span class="${currentGachaReward.cssClass}" style="font-size:22px;">
                    ${currentGachaReward.name}
                </span>
            </div>
            <div>をゲットした！🎒</div>
        </div>
    `;

    els.choiceContainer.style.display = "none";
    setTimeout(resetGachaState, 2500);

    saveGame();

}

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    cacheElements();

    if (!els.mainBox) {

        // ガチャ画面が存在しないページでは何もしない
        return;

    }

    els.drawBtn?.addEventListener("click", drawGacha);
    els.holdBtn?.addEventListener("click", holdItem);
    els.keepBtn?.addEventListener("click", keepItem);

});

// screenNav.js から「ガチャ画面に入った」通知を受けたらリセット
window.addEventListener("hatchoria:enterGacha", resetGachaState);

// プレイヤーデータの読み込みが終わったらコイン表示を更新
window.addEventListener("hatchoria:playerReady", updateCoinDisplay);
