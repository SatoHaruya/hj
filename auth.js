// ===============================
// Hatchoria
// auth.js
// ログイン処理
// ===============================

import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// HTMLの取得
const loginForm = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const message = document.getElementById("message");


// ログイン
loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    try {

        // 常に自動ログイン(次回サイトを開いてもログイン状態を保つ)
        await setPersistence(auth, browserLocalPersistence);

        // Firebaseログイン
        await signInWithEmailAndPassword(
            auth,
            email.value,
            password.value
        );

        message.style.color = "#00ff88";
        message.textContent = "ログイン成功！";

        // ホーム画面へ
        setTimeout(() => {

            window.location.href = "home.html";

        }, 1000);

    } catch (error) {

        message.style.color = "#ff5b5b";

        switch (error.code) {

            case "auth/invalid-email":
                message.textContent = "メールアドレスが正しくありません";
                break;

            case "auth/user-not-found":
                message.textContent = "アカウントが存在しません";
                break;

            case "auth/wrong-password":
                message.textContent = "パスワードが違います";
                break;

            default:
                message.textContent = "ログインに失敗しました";
        }

    }

});


// 新規登録
document
.getElementById("registerButton")
.addEventListener("click", () => {

    window.location.href = "register.html";

});


// パスワード再設定
document
.getElementById("forgotPassword")
.addEventListener("click", () => {

    alert("この機能は次回実装します。");

});
