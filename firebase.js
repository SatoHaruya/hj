// ===============================
// Hatchoria Firebase設定
// firebase.js
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyC5SK7Ex1QiksHg5yRWkFQthPWU757VMeM",
    authDomain: "hatchoria-eed42.firebaseapp.com",
    projectId: "hatchoria-eed42",
    storageBucket: "hatchoria-eed42.firebasestorage.app",
    messagingSenderId: "697806588734",
    appId: "1:697806588734:web:c53c4f43f02b16bf207a6f",
    measurementId: "G-3V0V2WT5N7"
};


// Firebase初期化
const app = initializeApp(firebaseConfig);


// Authentication
const auth = getAuth(app);


// Firestore
const db = getFirestore(app);


// 他のファイルから使えるようにする
export { auth, db };
