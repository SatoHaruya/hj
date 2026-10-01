// ======================================
// Hatchoria
// friends.js
// フレンド機能(申請 → 承認式)
// ======================================
//
// フレンド一覧・申請は friends-overlay(ポップアップ)、
// フレンドのプロフィール表示は friend-profile-screen(独立画面、
// screenNav.js が管理)を使う。

import { getPlayerData } from "./save.js";

import {
    findByFriendCode,
    sendFriendRequest,
    acceptFriendRequest,
    getIncomingRequests,
    getFriends,
    getFriendPublicData
} from "./gameFirebase.js";

let els = {};

function cacheElements() {

    els = {
        friendDiamond: document.getElementById("home-friend-diamond"),
        menuFriendsBtn: document.getElementById("menu-friends-btn"),
        settingMenuOverlay: document.getElementById("setting-menu-overlay"),

        overlay: document.getElementById("friends-overlay"),
        closeBtn: document.getElementById("friends-close-btn"),
        ownCode: document.getElementById("friends-own-code"),

        addInput: document.getElementById("friends-add-input"),
        addBtn: document.getElementById("friends-add-btn"),
        addMessage: document.getElementById("friends-add-message"),

        requestsSection: document.getElementById("friends-requests-section"),
        requestsList: document.getElementById("friends-requests-list"),

        friendsList: document.getElementById("friends-list"),

        friendProfileRank: document.getElementById("friend-profile-rank"),
        friendProfileName: document.getElementById("friend-profile-name"),
        friendProfileTitle: document.getElementById("friend-profile-title"),
        friendProfileIntro: document.getElementById("friend-profile-intro")
    };

}

// ======================================
// 称号ラベル(profile.jsと同じ一覧)
// ======================================

const TITLES = [
    { id: "beginner",   label: "ハッチョリア見習い", minLevel: 1 },
    { id: "apprentice", label: "見習い調教師",       minLevel: 10 },
    { id: "skilled",    label: "一人前の調教師",     minLevel: 30 },
    { id: "veteran",    label: "熟練の調教師",       minLevel: 50 },
    { id: "legend",     label: "伝説の調教師",       minLevel: 80 }
];

function getTitleLabel(id) {
    const t = TITLES.find((t) => t.id === id);
    return t ? t.label : "なし";

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
// フレンド画面を開く
// ======================================

function openFriendsOverlay() {

    els.settingMenuOverlay.classList.remove("show");

    const me = getPlayerData();
    els.ownCode.innerText = me && me.friendCode ? me.friendCode : "----------";

    els.addMessage.innerText = "";
    els.addInput.value = "";

    els.overlay.classList.add("show");

    renderIncomingRequests();
    renderFriendsList();

}

function closeFriendsOverlay() {
    els.overlay.classList.remove("show");
}

// ======================================
// フレンドのプロフィールを見る
// ======================================

async function openFriendProfile(uid, fallbackName) {

    // フレンド一覧のオーバーレイを閉じてから、専用の画面に遷移する
    els.overlay.classList.remove("show");
    window.HatchoriaNav?.showScreen("friendProfile");

    els.friendProfileRank.innerText = "読み込み中...";
    els.friendProfileName.innerText = fallbackName || "プレイヤー";
    els.friendProfileTitle.innerText = "";
    els.friendProfileIntro.innerText = "";

    try {

        const data = await getFriendPublicData(uid);

        if (!data) {
            els.friendProfileRank.innerText = "";
            els.friendProfileIntro.innerText = "取得に失敗しました";
            return;
        }

        els.friendProfileRank.innerText = "Lv." + data.level;
        els.friendProfileName.innerText = data.accountName || "プレイヤー";
        els.friendProfileTitle.innerText = getTitleLabel(data.title);
        els.friendProfileIntro.innerText = data.selfIntro || "未設定";

    } catch (error) {

        console.error("フレンドのプロフィール取得に失敗しました", error);
        els.friendProfileRank.innerText = "";
        els.friendProfileIntro.innerText = "取得に失敗しました";

    }

}

// ======================================
// フレンド申請を送る
// ======================================

async function handleSendRequest() {

    const code = els.addInput.value.trim();
    els.addMessage.style.color = "#e53935";
    els.addMessage.innerText = "";

    if (!code) {
        els.addMessage.innerText = "フレンドコードを入力してください。";
        return;
    }

    const me = getPlayerData();

    if (!me) {
        els.addMessage.innerText = "読み込み中です。少し待ってから試してください。";
        return;
    }

    els.addBtn.disabled = true;

    try {

        const target = await findByFriendCode(code);

        if (!target) {
            els.addMessage.innerText = "そのフレンドコードのユーザーが見つかりません。";
            return;
        }

        const result = await sendFriendRequest(target.uid, me.accountName, target.accountName);

        if (result.ok) {

            els.addMessage.style.color = "#2e7d32";
            els.addMessage.innerText = `${target.accountName} さんに申請を送りました！`;
            els.addInput.value = "";

        } else if (result.reason === "self") {

            els.addMessage.innerText = "自分自身には申請できません。";

        } else if (result.reason === "already-sent") {

            els.addMessage.innerText = "すでに申請済みです。";

        } else {

            els.addMessage.innerText = "申請に失敗しました。もう一度お試しください。";

        }

    } catch (error) {

        console.error("フレンド申請エラー", error);
        const detail = (error && (error.code || error.message)) || String(error);
        els.addMessage.innerText = "エラーが発生しました: " + detail;

    } finally {

        els.addBtn.disabled = false;

    }

}

// ======================================
// 届いている申請の一覧
// ======================================

async function renderIncomingRequests() {

    els.requestsList.innerHTML = "読み込み中...";

    try {

        const requests = await getIncomingRequests();

        if (requests.length === 0) {
            els.requestsSection.style.display = "none";
            els.requestsList.innerHTML = "";
            return;
        }

        els.requestsSection.style.display = "block";
        els.requestsList.innerHTML = "";

        requests.forEach((req) => {

            const card = document.createElement("div");
            card.className = "friend-item-card";

            card.innerHTML = `
                <div class="friend-item-info">
                    <div class="friend-item-name">${req.fromName || "プレイヤー"}</div>
                    <div class="friend-item-level">フレンド申請</div>
                </div>
                <button class="friend-approve-btn">承認する</button>
            `;

            card.querySelector(".friend-approve-btn").addEventListener("click", async () => {

                await acceptFriendRequest(req.id);
                renderIncomingRequests();
                renderFriendsList();

            });

            els.requestsList.appendChild(card);

        });

    } catch (error) {

        console.error("申請一覧の取得に失敗しました", error);
        els.requestsSection.style.display = "block";
        els.requestsList.innerHTML = `<div class="friend-empty-text">読み込みに失敗しました</div>`;

    }

}

// ======================================
// フレンド一覧
// ======================================

async function renderFriendsList() {

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
            `;

            card.style.cursor = "pointer";
            card.addEventListener("click", () => {
                openFriendProfile(friend.uid, name);
            });

            els.friendsList.appendChild(card);

        }

    } catch (error) {

        console.error("フレンド一覧の取得に失敗しました", error);
        els.friendsList.innerHTML = `<div class="friend-empty-text">読み込みに失敗しました</div>`;

    }

}

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    cacheElements();

    if (!els.overlay) {

        // フレンドUIが存在しないページでは何もしない
        alert("診断: friends-overlay が見つかりません。home.htmlが古い可能性があります。");
        return;

    }

    els.friendDiamond?.addEventListener("click", () => {
        try {
            openFriendsOverlay();
        } catch (error) {
            console.error("フレンド画面を開けませんでした", error);
            alert("エラー: " + (error && error.message ? error.message : error));
        }
    });

    els.menuFriendsBtn?.addEventListener("click", () => {
        try {
            openFriendsOverlay();
        } catch (error) {
            console.error("フレンド画面を開けませんでした", error);
            alert("エラー: " + (error && error.message ? error.message : error));
        }
    });
    els.closeBtn.addEventListener("click", closeFriendsOverlay);
    els.addBtn.addEventListener("click", handleSendRequest);
    // フレンドプロフィール画面の「ホームへ」ボタンは screenNav.js が担当

});
