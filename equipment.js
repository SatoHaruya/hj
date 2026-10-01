// ======================================
// Hatchoria
// equipment.js
// 装備機能(ガチャアイテムを1つ装備して効果を得る)
// ======================================

import { getPlayerData, saveGame } from "./save.js";

// アイテムごとの基礎効果(Lv.1時点)
export const ITEM_EFFECTS = {
    "道化師の仮面 🎭": { coinBonus: 0.05, xpBonus: 0 },
    "神秘の果実 🍋":   { coinBonus: 0.02, xpBonus: 0.05 },
    "聖なる遺体 💀":   { coinBonus: 0.10, xpBonus: 0.12 },
    "賢者の石 🪨":     { coinBonus: 0.20, xpBonus: 0.20 }
};

const LEVELUP_COST = 100; // レベルアップに必要なコイン(被りがあれば消費して無料)
const LEVEL_EFFECT_BONUS = 0.01; // 1レベル上がるごとの追加効果(1%)

// 所持アイテムの1件を { id, name, level, duplicates } の形に揃える
// (以前はアイテム名の文字列だけを保存していたため、古いデータにも対応する)
export function normalizeItem(item, index) {

    if (typeof item === "string") {
        return { id: "legacy-" + index, name: item, level: 1, duplicates: 0 };
    }

    return {
        id: item.id || ("legacy-" + index),
        name: item.name,
        level: item.level || 1,
        duplicates: item.duplicates || 0
    };

}

// Lv.1の基礎効果を維持し、レベルアップ1回ごとに効果を1%加算する
function calcBonus(base, level) {

    const safeLevel = Math.max(1, Number(level) || 1);
    const levelBonus = (safeLevel - 1) * LEVEL_EFFECT_BONUS;

    return {
        xpBonus: base.xpBonus > 0 ? base.xpBonus + levelBonus : 0,
        coinBonus: base.coinBonus > 0 ? base.coinBonus + levelBonus : 0
    };

}

// 装備中アイテムの効果を計算する(未装備なら効果なし)
export function getEquippedBonus(player) {

    if (!player || !player.equippedItemId || !player.inventory) {
        return { xpBonus: 0, coinBonus: 0 };
    }

    const items = player.inventory.map(normalizeItem);
    const equipped = items.find((it) => it.id === player.equippedItemId);

    if (!equipped) {
        return { xpBonus: 0, coinBonus: 0 };
    }

    const base = ITEM_EFFECTS[equipped.name];

    if (!base) {
        return { xpBonus: 0, coinBonus: 0 };
    }

    return calcBonus(base, equipped.level);

}

let els = {};
let selectedItemId = null;

function cacheElements() {

    els = {
        equipBtn: document.getElementById("home-equipment-btn"),
        overlay: document.getElementById("equipment-overlay"),
        closeBtn: document.getElementById("equipment-close-btn"),
        current: document.getElementById("equipment-current"),
        inventoryList: document.getElementById("equipment-inventory-list"),

        detailOverlay: document.getElementById("equipment-detail-overlay"),
        detailName: document.getElementById("equipment-detail-name"),
        detailEffect: document.getElementById("equipment-detail-effect"),
        detailLevelupNote: document.getElementById("equipment-detail-levelup-note"),
        detailLevelupBtn: document.getElementById("equipment-detail-levelup-btn"),
        detailEquipBtn: document.getElementById("equipment-detail-equip-btn"),
        detailCloseBtn: document.getElementById("equipment-detail-close-btn")
    };

}

function effectText(name, level) {

    const base = ITEM_EFFECTS[name];
    if (!base) return "効果なし";

    const bonus = calcBonus(base, level);
    const xp = Math.round(bonus.xpBonus * 100);
    const coin = Math.round(bonus.coinBonus * 100);

    const parts = [];
    if (xp > 0) parts.push(`獲得XP +${xp}%`);
    if (coin > 0) parts.push(`獲得コイン +${coin}%`);

    return parts.length > 0 ? parts.join(" / ") : "効果なし";

}

function nameWithLevel(item) {

    const dup = item.duplicates > 0 ? `(${item.duplicates})` : "";
    return `${item.name}(Lv.${item.level}${dup})`;

}

function openEquipment() {

    const player = getPlayerData();
    if (!player) return;

    renderEquipment(player);

    els.overlay.classList.add("show");

}

function closeEquipment() {
    els.overlay.classList.remove("show");
}

function renderEquipment(player) {

    const items = (player.inventory || []).map(normalizeItem);
    const equipped = items.find((it) => it.id === player.equippedItemId);

    if (equipped) {

        els.current.querySelector(".friend-item-name").innerText = nameWithLevel(equipped);
        els.current.querySelector(".friend-item-level").innerText = effectText(equipped.name, equipped.level);

    } else {

        els.current.querySelector(".friend-item-name").innerText = "なし";
        els.current.querySelector(".friend-item-level").innerText = "効果なし";

    }

    if (items.length === 0) {
        els.inventoryList.innerHTML = `<div class="friend-empty-text">まだアイテムを持っていません(ガチャで手に入ります)</div>`;
        return;
    }

    els.inventoryList.innerHTML = "";

    items.forEach((item) => {

        const isEquipped = item.id === player.equippedItemId;

        const card = document.createElement("div");
        card.className = "friend-item-card";
        card.style.cursor = "pointer";

        card.innerHTML = `
            <div class="friend-item-info">
                <div class="friend-item-name">${nameWithLevel(item)}${isEquipped ? "(装備中)" : ""}</div>
                <div class="friend-item-level">${effectText(item.name, item.level)}</div>
            </div>
        `;

        card.addEventListener("click", () => openItemDetail(item.id));

        els.inventoryList.appendChild(card);

    });

}

// ======================================
// アイテム詳細(レベルアップ・装備)
// ======================================

function openItemDetail(itemId) {

    selectedItemId = itemId;
    renderItemDetail();

    els.detailOverlay.classList.add("show");

}

function closeItemDetail() {
    els.detailOverlay.classList.remove("show");
    selectedItemId = null;
}

function renderItemDetail() {

    const player = getPlayerData();
    if (!player || !selectedItemId) return;

    const items = (player.inventory || []).map(normalizeItem);
    const item = items.find((it) => it.id === selectedItemId);

    if (!item) {
        closeItemDetail();
        return;
    }

    const isEquipped = item.id === player.equippedItemId;

    els.detailName.innerText = nameWithLevel(item);
    els.detailEffect.innerText = effectText(item.name, item.level);

    els.detailLevelupNote.innerText = item.duplicates > 0
        ? `被りを1個消費して無料でレベルアップできます(残り被り: ${item.duplicates})`
        : `レベルアップには🪙${LEVELUP_COST}コイン必要です(所持: ${player.coins})`;

    els.detailEquipBtn.innerText = isEquipped ? "解除する" : "装備する";

}

async function handleLevelUp() {

    const player = getPlayerData();
    if (!player || !selectedItemId) return;

    const items = (player.inventory || []).map(normalizeItem);
    const item = items.find((it) => it.id === selectedItemId);
    if (!item) return;

    if (item.duplicates > 0) {

        item.duplicates -= 1;

    } else {

        if (player.coins < LEVELUP_COST) {
            alert(`コインが足りません。(レベルアップには🪙${LEVELUP_COST}必要です)`);
            return;
        }

        player.coins -= LEVELUP_COST;

    }

    item.level += 1;
    player.inventory = items;

    await saveGame();

    renderItemDetail();
    renderEquipment(player);

}

async function handleEquipToggle() {

    const player = getPlayerData();
    if (!player || !selectedItemId) return;

    player.equippedItemId = (player.equippedItemId === selectedItemId) ? null : selectedItemId;

    await saveGame();

    renderItemDetail();
    renderEquipment(player);

}

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    cacheElements();

    if (!els.overlay) {

        // 装備UIが存在しないページでは何もしない
        return;

    }

    els.equipBtn?.addEventListener("click", openEquipment);
    els.closeBtn.addEventListener("click", closeEquipment);

    els.detailCloseBtn.addEventListener("click", closeItemDetail);
    els.detailLevelupBtn.addEventListener("click", handleLevelUp);
    els.detailEquipBtn.addEventListener("click", handleEquipToggle);

});

// storage.js から「装備画面を開いてほしい」通知を受けたら開く
window.addEventListener("hatchoria:openEquipment", openEquipment);
