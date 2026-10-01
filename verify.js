// ======================================
// Hatchoria
// verify.js
// メール認証確認
// ======================================

import { auth } from "./firebase.js";

const checkButton = document.getElementById("checkButton");
const message = document.getElementById("message");

checkButton.addEventListener("click", async () => {

    const user = auth.currentUser;

    if (!user) {

        message.style.color = "#ff4444";
        message.textContent = "ログインし直してください。";

        return;

    }

    // 最新情報を取得
    await user.reload();

    if (user.emailVerified) {

        message.style.color = "#00cc66";
        message.textContent = "認証成功！";

        setTimeout(() => {

            window.location.href = "daily.html";

        }, 1000);

    } else {

        message.style.color = "#ff4444";
        message.textContent = "まだメール認証が完了していません。";

    }

});
