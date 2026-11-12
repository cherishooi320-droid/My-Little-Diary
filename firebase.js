
// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDG17BQVS6HhoH8Nuta6u25ZjvJUB7LJsw",
    authDomain: "my-little-diary-838a1.firebaseapp.com",
    projectId: "my-little-diary-838a1",
    storageBucket: "my-little-diary-838a1.firebasestorage.app",
    messagingSenderId: "62788566256",
    appId: "1:62788566256:web:5eaf315d2e3b8f1ba01635",
    measurementId: "G-1LSDMZJX54"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Export Firebase services
export { app, auth, db };
