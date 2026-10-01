// ======================================
// Hatchoria
// gameFirebase.js
// Firebaseデータ管理
// ======================================

import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// ------------------------------
// プレイヤーデータ読み込み
// ------------------------------
export async function loadPlayerData() {

    const user = auth.currentUser;

    if (!user) {
        return null;
    }

    const ref = doc(db, "users", user.uid);

    const snap = await getDoc(ref);

    if (!snap.exists()) {
        return null;
    }

    return snap.data();

}


// ------------------------------
// プレイヤーデータ保存
// ------------------------------
export async function savePlayerData(data) {

    const user = auth.currentUser;

    if (!user) {
        return;
    }

    const ref = doc(db, "users", user.uid);

    await updateDoc(ref, data);

}


// ------------------------------
// 初回データ作成
// ------------------------------
export async function createPlayerData(data) {

    const user = auth.currentUser;

    if (!user) {
        return;
    }

    const ref = doc(db, "users", user.uid);

    await setDoc(ref, data);

}


// ------------------------------
// XP保存
// ------------------------------
export async function saveXP(xp) {

    await savePlayerData({
        exp: xp
    });

}


// ------------------------------
// レベル保存
// ------------------------------
export async function saveLevel(level) {

    await savePlayerData({
        level: level
    });

}


// ------------------------------
// コイン保存
// ------------------------------
export async function saveCoins(coins) {

    await savePlayerData({
        coins: coins
    });

}


// ------------------------------
// 必要XP保存
// ------------------------------
export async function saveGoal(goal) {

    await savePlayerData({
        goal: goal
    });

}


// ------------------------------
// モンスター情報保存
// ------------------------------
export async function saveMonster(type, monsterLevel) {

    await savePlayerData({

        monster: type,
        monsterLevel: monsterLevel

    });

}


// ------------------------------
// 全データ保存
// ------------------------------
export async function saveAll({

    accountName,
    level,
    exp,
    coins,
    goal,
    monster,
    monsterLevel,
    inventory,
    friendCode,
    combo,
    title,
    selfIntro,
    nameChangeCount,
    equippedItemId,
    storage,
    starterChosen

}) {

    await savePlayerData({

        accountName,
        level,
        exp,
        coins,
        goal,
        monster,
        monsterLevel,
        inventory,
        friendCode,
        combo,
        title,
        selfIntro,
        nameChangeCount,
        equippedItemId,
        storage,
        starterChosen

    });

}


// ======================================
// フレンド機能
// ======================================

// フレンドコード → uid の対応を誰でも引ける形で登録する
// (users コレクションは本人しか読めないため、検索用に別コレクションを使う)
export async function registerFriendCode(code, accountName) {

    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "friendCodeIndex", code);

    await setDoc(ref, {
        uid: user.uid,
        accountName: accountName
    });

}

// フレンドコードから相手のuid・名前を調べる
export async function findByFriendCode(code) {

    const ref = doc(db, "friendCodeIndex", code);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return snap.data(); // { uid, accountName }

}

// フレンド申請を送る(fromUid_toUid というIDのドキュメントを作成)
export async function sendFriendRequest(toUid, fromName, toName) {

    const user = auth.currentUser;
    if (!user) return { ok: false, reason: "not-logged-in" };

    if (user.uid === toUid) {
        return { ok: false, reason: "self" };
    }

    const requestId = `${user.uid}_${toUid}`;
    const ref = doc(db, "friendRequests", requestId);

    const existing = await getDoc(ref);
    if (existing.exists()) {
        return { ok: false, reason: "already-sent" };
    }

    await setDoc(ref, {
        fromUid: user.uid,
        toUid: toUid,
        fromName: fromName,
        toName: toName,
        status: "pending",
        createdAt: Date.now()
    });

    return { ok: true };

}

// 届いている申請を承認する
export async function acceptFriendRequest(requestId) {

    const ref = doc(db, "friendRequests", requestId);
    await updateDoc(ref, { status: "accepted" });

}

// 申請の削除(拒否・キャンセル・フレンド解除に使う)
export async function deleteFriendRequest(requestId) {

    const ref = doc(db, "friendRequests", requestId);
    await deleteDoc(ref);

}

// 自分宛に届いている、承認待ちの申請一覧
export async function getIncomingRequests() {

    const user = auth.currentUser;
    if (!user) return [];

    const q = query(
        collection(db, "friendRequests"),
        where("toUid", "==", user.uid),
        where("status", "==", "pending")
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));

}

// 承認済みのフレンド一覧(自分が送った側・受けた側どちらも含む)
export async function getFriends() {

    const user = auth.currentUser;
    if (!user) return [];

    const sentQuery = query(
        collection(db, "friendRequests"),
        where("fromUid", "==", user.uid),
        where("status", "==", "accepted")
    );

    const receivedQuery = query(
        collection(db, "friendRequests"),
        where("toUid", "==", user.uid),
        where("status", "==", "accepted")
    );

    const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
    ]);

    const friends = [];

    sentSnap.forEach((d) => {
        friends.push({ uid: d.data().toUid, name: d.data().toName });
    });

    receivedSnap.forEach((d) => {
        friends.push({ uid: d.data().fromUid, name: d.data().fromName });
    });

    return friends;

}

// フレンドのレベル・モンスター情報を取得(フレンド同士のみ読める設定)
export async function getFriendPublicData(uid) {

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const data = snap.data();

    return {
        accountName: data.accountName,
        level: data.level,
        monster: data.monster,
        monsterLevel: data.monsterLevel,
        title: data.title,
        selfIntro: data.selfIntro
    };

}


// ======================================
// マッチ(リアルタイム対戦)機能
// ======================================
//
// ステージ1: 対戦の申し込み・承認・辞退までの土台。
// 実際に同時に問題を解くゲーム本体は次のステージで実装する。

// フレンドに対戦を申し込む
export async function sendMatchInvite(opponentUid, opponentName) {

    const user = auth.currentUser;
    if (!user) return { ok: false, reason: "not-logged-in" };

    if (user.uid === opponentUid) {
        return { ok: false, reason: "self" };
    }

    const player = await loadPlayerData();

    await addDoc(collection(db, "matches"), {
        inviterUid: user.uid,
        inviterName: player ? player.accountName : "プレイヤー",
        opponentUid: opponentUid,
        opponentName: opponentName,
        status: "pending",
        createdAt: Date.now()
    });

    return { ok: true };

}

// 自分宛に届いている、承認待ちの対戦の誘い一覧
export async function getIncomingMatchInvites() {

    const user = auth.currentUser;
    if (!user) return [];

    const q = query(
        collection(db, "matches"),
        where("opponentUid", "==", user.uid),
        where("status", "==", "pending")
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));

}

// 対戦の誘いを承認する(まず「問題数の選択フェーズ」に入る)
export async function acceptMatchInvite(matchId) {

    const ref = doc(db, "matches", matchId);

    await updateDoc(ref, {
        status: "selecting",
        inviterQuestionCount: null,
        opponentQuestionCount: null,
        inviterProgress: { currentIndex: 0, wrongCount: 0, finishedAt: null, effectiveMs: null },
        opponentProgress: { currentIndex: 0, wrongCount: 0, finishedAt: null, effectiveMs: null }
    });

}

// 問題数を選択する(自分の欄だけを書き込む)
export async function selectMatchQuestionCount(matchId, isInviter, count) {

    const ref = doc(db, "matches", matchId);
    const field = isInviter ? "inviterQuestionCount" : "opponentQuestionCount";

    await updateDoc(ref, { [field]: count });

}

// 選択が一致したら対戦を開始する(招待した側だけが呼ぶ想定。
// 両者が同時に問題セットを生成して食い違うのを防ぐため)
export async function startMatch(matchId, questions, questionCount) {

    const ref = doc(db, "matches", matchId);

    await updateDoc(ref, {
        status: "active",
        questions: questions,
        questionCount: questionCount,
        startedAt: Date.now()
    });

}

// 自分の進行状況(現在の問題番号・ミス数)を書き込む
export async function updateMatchProgress(matchId, isInviter, progress) {

    const ref = doc(db, "matches", matchId);
    const field = isInviter ? "inviterProgress" : "opponentProgress";

    await updateDoc(ref, { [field]: progress });

}

// 対戦の結果(勝者)を確定させる
export async function finalizeMatchResult(matchId, winner) {

    const ref = doc(db, "matches", matchId);
    await updateDoc(ref, { status: "finished", winner: winner });

}

// 対戦の誘いを辞退する
// (削除ではなくstatusを変えることで、申請した側が「拒否された」と
//  気づけるようにする)
export async function declineMatchInvite(matchId) {

    const ref = doc(db, "matches", matchId);
    await updateDoc(ref, { status: "declined" });

}

// マッチのドキュメントを削除する(通知確認後の後片付け用)
export async function deleteMatch(matchId) {

    const ref = doc(db, "matches", matchId);
    await deleteDoc(ref);

}

// 対戦をキャンセルする
// いきなり削除せず状態を残すことで、相手側のonSnapshotに確実に通知する。
export async function cancelMatch(matchId) {

    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "matches", matchId);

    await updateDoc(ref, {
        status: "cancelled",
        cancelledBy: user.uid,
        cancelledAt: Date.now()
    });

}

// 自分宛に届く対戦の誘いをリアルタイムで監視する
// (コールバックには pending 状態の誘い一覧が渡される)
export function listenIncomingMatchInvites(callback, onError) {

    const user = auth.currentUser;
    if (!user) return () => {};

    const q = query(
        collection(db, "matches"),
        where("opponentUid", "==", user.uid),
        where("status", "==", "pending")
    );

    return onSnapshot(q, (snap) => {

        const invites = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(invites);

    }, (error) => {

        console.error("対戦の誘いの監視でエラーが発生しました", error);
        if (onError) onError(error);

    });

}

// 自分が送った対戦の誘いが「拒否された」ことをリアルタイムで監視する
export function listenDeclinedMatches(callback, onError) {

    const user = auth.currentUser;
    if (!user) return () => {};

    const q = query(
        collection(db, "matches"),
        where("inviterUid", "==", user.uid),
        where("status", "==", "declined")
    );

    return onSnapshot(q, (snap) => {

        const declined = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(declined);

    }, (error) => {

        console.error("拒否通知の監視でエラーが発生しました", error);
        if (onError) onError(error);

    });

}

// ======================================
// マッチ本体(同時に問題を解くゲーム部分)
// ======================================

// 1つの対戦をリアルタイムで監視する(問題・進行状況・回答すべて)
export function listenToMatch(matchId, callback, onError) {

    const ref = doc(db, "matches", matchId);

    return onSnapshot(ref, (snap) => {

        if (!snap.exists()) {
            callback(null);
            return;
        }

        callback({ id: snap.id, ...snap.data() });

    }, (error) => {

        console.error("対戦の監視でエラーが発生しました", error);
        if (onError) onError(error);

    });

}

// 自分が参加している「選択中・進行中」の対戦をリアルタイムで監視する
// (招待した側・招待された側どちらでも検知できるよう2つ監視する)
export function listenMyActiveMatches(callback, onError) {

    const user = auth.currentUser;
    if (!user) return () => {};

    const unsubList = [];
    let asInviter = [];
    let asOpponent = [];

    const notify = () => callback([...asInviter, ...asOpponent]);

    const qInviter = query(
        collection(db, "matches"),
        where("inviterUid", "==", user.uid),
        where("status", "in", ["selecting", "active"])
    );

    const qOpponent = query(
        collection(db, "matches"),
        where("opponentUid", "==", user.uid),
        where("status", "in", ["selecting", "active"])
    );

    unsubList.push(onSnapshot(qInviter, (snap) => {
        asInviter = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        notify();
    }, (error) => {
        console.error("進行中の対戦(招待側)の監視でエラー", error);
        if (onError) onError(error);
    }));

    unsubList.push(onSnapshot(qOpponent, (snap) => {
        asOpponent = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        notify();
    }, (error) => {
        console.error("進行中の対戦(参加側)の監視でエラー", error);
        if (onError) onError(error);
    }));

    return () => unsubList.forEach((unsub) => unsub());

}
