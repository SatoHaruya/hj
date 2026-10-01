// ======================================
// Hatchoria
// register.js
// 新規登録
// ======================================

import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const form = document.getElementById("registerForm");

const email = document.getElementById("email");
const password = document.getElementById("password");
const password2 = document.getElementById("password2");

const message = document.getElementById("message");

const backButton = document.getElementById("backButton");


// ログイン画面へ戻る
backButton.addEventListener("click", () => {

    window.location.href = "index.html";

});


// 新規登録
form.addEventListener("submit", async (e) => {

    e.preventDefault();

    if(password.value !== password2.value){

        message.style.color = "#ff5555";
        message.textContent = "パスワードが一致しません";

        return;

    }

    if(password.value.length < 6){

        message.style.color = "#ff5555";
        message.textContent = "パスワードは6文字以上です";

        return;

    }

    try{

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email.value,
                password.value
            );

        const user = userCredential.user;

        // 認証メール送信
        await sendEmailVerification(user);

        // Firestoreへ初期データ保存
        await setDoc(doc(db,"users",user.uid),{

            email:user.email,

            level:1,

            exp:0,

            coins:0,

            accountName:"プレイヤー",

            userId:user.uid,

            friendCode:null,

            dailyRewardDate:null,

            createdAt:serverTimestamp()

        });

        message.style.color="#00dd88";

        message.innerHTML=
        `
        登録成功！<br>
        認証メールを送信しました。<br><br>

        メールを開いて認証したあと
        ログインしてください。
        `;

    }

    catch(error){

        message.style.color="#ff5555";

        switch(error.code){

            case "auth/email-already-in-use":

                message.textContent=
                "このメールアドレスは登録済みです";

                break;

            case "auth/invalid-email":

                message.textContent=
                "メールアドレスが正しくありません";

                break;

            case "auth/weak-password":

                message.textContent=
                "もっと強いパスワードを設定してください";

                break;

            default:

                message.textContent=
                "登録に失敗しました";

        }

    }

});
