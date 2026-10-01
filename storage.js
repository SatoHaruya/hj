// ======================================
// Hatchoria
// storage.js
// 貯蔵庫機能(ガチャで保留したアイテムを後で決める)
// ======================================

import { getPlayerData, saveGame } from "./save.js";

const CONVERT_REWARD = 50;

let els = {};
let selectedItemId = null;

function cacheElements() {

    els = {
        openBtn: document.getElementById("home-storage-btn"),

        overlay: document.getElementById("storage-overlay"),
        closeBtn: document.getElementById("storage-close-btn"),
        floatArea: document.getElementById("storage-float-area"),

        detailOverlay: document.getElementById("storage-detail-overlay"),
        detailIcon: document.getElementById("storage-detail-icon"),
        detailName: document.getElementById("storage-detail-name"),
        convertBtn: document.getElementById("storage-detail-convert-btn"),
        obtainBtn: document.getElementById("storage-detail-obtain-btn"),
        detailCloseBtn: document.getElementById("storage-detail-close-btn")
    };

}

// ======================================
// 貯蔵庫を開く・閉じる
// ======================================

function openStorage() {

    const player = getPlayerData();
    if (!player) return;

    renderFloatingItems(player);
    els.overlay.classList.add("show");

}

function closeStorage() {
    els.overlay.classList.remove("show");
}

function renderFloatingItems(player) {

    const items = player.storage || [];

    els.floatArea.innerHTML = "";

    if (items.length === 0) {

        els.floatArea.innerHTML = `<div class="friend-empty-text" style="text-align:center; padding-top: 40px;">貯蔵庫は空です</div>`;
        return;

    }

    items.forEach((item) => {

        const bubble = document.createElement("div");
        bubble.className = "storage-item-bubble";
        bubble.innerText = iconFor(item.name);
        bubble.title = item.name;

        bubble.style.left = (5 + Math.random() * 75) + "%";
        bubble.style.top = (5 + Math.random() * 65) + "%";
        bubble.style.animationDelay = (Math.random() * 3).toFixed(2) + "s";
        bubble.style.animationDuration = (3 + Math.random() * 1.5).toFixed(2) + "s";

        bubble.addEventListener("click", () => openItemDetail(item));

        els.floatArea.appendChild(bubble);

    });

}

function iconFor(name) {

    if (name.includes("🪨")) return "🪨";
    if (name.includes("💀")) return "💀";
    if (name.includes("🍋")) return "🍋";
    if (name.includes("🎭")) return "🎭";
    return "📦";

}

// ======================================
// アイテムの詳細(コインに変換 / 入手)
// ======================================

function openItemDetail(item) {

    selectedItemId = item.id;

    els.detailIcon.innerText = iconFor(item.name);
    els.detailName.innerText = item.name;

    els.detailOverlay.classList.add("show");

}

function closeItemDetail() {
    els.detailOverlay.classList.remove("show");
    selectedItemId = null;
}

async function convertSelectedToCoins() {

    const player = getPlayerData();
    if (!player || !selectedItemId) return;

    const index = (player.storage || []).findIndex((it) => it.id === selectedItemId);
    if (index === -1) return;

    player.storage.splice(index, 1);
    player.coins += CONVERT_REWARD;

    await saveGame();

    closeItemDetail();
    renderFloatingItems(player);

}

async function obtainSelectedItem() {

    const player = getPlayerData();
    if (!player || !selectedItemId) return;

    const index = (player.storage || []).findIndex((it) => it.id === selectedItemId);
    if (index === -1) return;

    const [item] = player.storage.splice(index, 1);

    if (!player.inventory) {
        player.inventory = [];
    }

    const existing = player.inventory.find((it) => it.name === item.name);

    if (existing) {
        existing.duplicates = (existing.duplicates || 0) + 1;
    } else {
        if (item.duplicates === undefined) item.duplicates = 0;
        player.inventory.push(item);
    }

    await saveGame();

    closeItemDetail();
    els.overlay.classList.remove("show");

    // 装備画面に移る
    window.dispatchEvent(new Event("hatchoria:openEquipment"));

}

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    cacheElements();

    if (!els.overlay) {

        // 貯蔵庫UIが存在しないページでは何もしない
        return;

    }

    els.openBtn?.addEventListener("click", openStorage);
    els.closeBtn.addEventListener("click", closeStorage);

    els.detailCloseBtn.addEventListener("click", closeItemDetail);
    els.convertBtn.addEventListener("click", convertSelectedToCoins);
    els.obtainBtn.addEventListener("click", obtainSelectedItem);

});
