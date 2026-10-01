// ======================================
// Hatchoria
// save.js
// セーブ・ロード管理
// ======================================

import {
    loadPlayerData,
    saveAll
} from "./gameFirebase.js";

// ------------------------------
// 現在のプレイヤーデータ
// ------------------------------

let playerData = null;

// ------------------------------
// Firebaseからロード
// ------------------------------

export async function loadSaveData() {

    playerData = await loadPlayerData();

    if (!playerData) {

        console.log("プレイヤーデータがありません");
        return null;

    }

    return playerData;

}

// ------------------------------
// プレイヤーデータ取得
// ------------------------------

export function getPlayerData() {

    return playerData;

}

// ------------------------------
// プレイヤーデータ更新
// ------------------------------

export function setPlayerData(data) {

    playerData = data;

}

// ------------------------------
// Firebaseへ保存
// ------------------------------

export async function saveGame() {

    if (!playerData) return;

    await saveAll(playerData);

    console.log("保存完了");

}

// ------------------------------
// XP追加
// ------------------------------

export async function addXP(amount) {

    if (!playerData) return;

    playerData.exp += amount;

    await saveGame();

}

// ------------------------------
// コイン追加
// ------------------------------

export async function addCoins(amount) {

    if (!playerData) return;

    playerData.coins += amount;

    await saveGame();

}

// ------------------------------
// レベルアップ
// ------------------------------

export async function levelUp() {

    if (!playerData) return;

    while (playerData.exp >= playerData.goal) {

        playerData.exp -= playerData.goal;

        playerData.level++;

        playerData.goal += 10;

        playerData.coins += 50;

    }

    await saveGame();

}
