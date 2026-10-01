// ======================================
// Hatchoria
// daily.js
// デイリー報酬
// ======================================

import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const rewardText = document.getElementById("rewardText");
const receiveButton = document.getElementById("receiveButton");
const message = document.getElementById("message");

const rewards = [
    {type:"coin",amount:50},
    {type:"xp",amount:20},
    {type:"xp",amount:20},
    {type:"xp",amount:20},
    {type:"xp",amount:20},
    {type:"xp",amount:20},
    {type:"coin",amount:100}
];

loadReward();

async function loadReward(){

    const user = auth.currentUser;

    if(!user){

        window.location.href="index.html";
        return;

    }

    const ref = doc(db,"users",user.uid);

    const snap = await getDoc(ref);

    const data = snap.data();

    let streak = data.loginStreak || 1;

    if(streak>7) streak=7;

    const reward = rewards[streak-1];

    if(reward.type==="coin"){

        rewardText.innerHTML=`🪙 ${reward.amount} Coins`;

    }else{

        rewardText.innerHTML=`⭐ ${reward.amount} XP`;

    }

}

receiveButton.addEventListener("click",async()=>{

    const user=auth.currentUser;

    const ref=doc(db,"users",user.uid);

    const snap=await getDoc(ref);

    const data=snap.data();

    let streak=data.loginStreak||1;

    if(streak>7) streak=7;

    const reward=rewards[streak-1];

    let coins=data.coins||0;
    let exp=data.exp||0;

    if(reward.type==="coin"){

        coins+=reward.amount;

    }else{

        exp+=reward.amount;

    }

    await updateDoc(ref,{

        coins:coins,

        exp:exp,

        loginStreak:streak===7?1:streak+1,

        dailyRewardDate:new Date().toDateString()

    });

    message.style.color="#00cc66";
    message.textContent="受け取りました！";

    setTimeout(()=>{

        window.location.href="home.html";

    },1000);

});
