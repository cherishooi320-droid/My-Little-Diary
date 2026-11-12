
import { app, auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    getDoc,
    setDoc,
    writeBatch,
    Timestamp
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

// =====================================
// ELEMENTS
// =====================================

const authScreen = document.getElementById("authScreen");
const dashboard = document.getElementById("dashboard");

const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const toggleAuthBtn = document.getElementById("toggleAuthBtn");
const authMessage = document.getElementById("authMessage");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

const diaryForm = document.getElementById("diaryForm");
const entriesContainer = document.getElementById("entries");
const shareCheckbox = document.getElementById("shareDiary");

const sharedEntries = document.getElementById("sharedEntries");

const createBestieBtn = document.getElementById("createBestieBtn");
const copyBestieCodeBtn = document.getElementById("copyBestieCodeBtn");
const joinBestieBtn = document.getElementById("joinBestieBtn");

const bestieInviteArea = document.getElementById("bestieInviteArea");
const bestieInviteCode = document.getElementById("bestieInviteCode");
const bestieCodeInput = document.getElementById("bestieCodeInput");
const bestieMessage = document.getElementById("bestieMessage");

let isRegisterMode = false;
let currentUser = null;



// =====================================
// PAGE NAVIGATION
// =====================================

const pages = {
    home: "homePage",
    myDiary: "myDiaryPage",
    ourDiary: "ourDiaryPage",
    calendar: "calendarPage",
    memories: "memoriesPage",
    settings: "settingsPage"
};

function showPage(pageName) {

    Object.values(pages).forEach(pageId => {
        document.getElementById(pageId).hidden = true;
    });

    document.getElementById(pages[pageName]).hidden = false;

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.remove("active");
    });

    const activeButton = document.querySelector(
        `.nav-btn[data-page="${pageName}"]`
    );

    if (activeButton) {
        activeButton.classList.add("active");
    }

    if (pageName === "ourDiary") {
        loadOurDiaryEntries();
    }

    if (pageName === "myDiary") {
        loadDiaryEntries();
    }

    if (pageName === "calendar") {
        loadCalendarEntries();
    }

    if (pageName === "memories") {
        loadMemoriesEntries();
    }
}

// PAGE NAVIGATION BUTTONS

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

// =====================================
// LOGIN / REGISTER
// =====================================

authForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    authSubmitBtn.disabled = true;
    authMessage.textContent = "Please wait...";

    try {

        if (isRegisterMode) {

            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            authMessage.textContent =
                "Account created successfully! ♡";

        } else {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );
        }

    } catch (error) {

        console.error("Authentication error:", error);

        const messages = {
            "auth/email-already-in-use":
                "This email is already registered.",

            "auth/invalid-email":
                "Please enter a valid email address.",

            "auth/weak-password":
                "Password must contain at least 6 characters.",

            "auth/invalid-credential":
                "Incorrect email or password.",

            "auth/network-request-failed":
                "Network error. Please check your internet connection.",

            "auth/too-many-requests":
                "Too many attempts. Please try again later."
        };

        authMessage.textContent =
            messages[error.code] || error.message;

    } finally {

        authSubmitBtn.disabled = false;
    }
});

// =====================================
// AUTHENTICATION STATE
// =====================================

onAuthStateChanged(auth, async (user) => {

    if (user) {

        currentUser = user;

        authScreen.hidden = true;
        dashboard.hidden = false;

        userEmail.textContent = user.email;

        showPage("home");

        await loadDiaryEntries();

        console.log("Logged in:", user.uid);

    } else {

        currentUser = null;

        authScreen.hidden = false;
        dashboard.hidden = true;

        console.log("No user logged in.");
    }
});

// =====================================
// LOGOUT
// =====================================

logoutBtn.addEventListener("click", async () => {

    try {

        await signOut(auth);

        authForm.reset();
        authMessage.textContent = "";

        isRegisterMode = false;

        authTitle.textContent = "Welcome Back ♡";
        authSubmitBtn.textContent = "Login ♡";
        toggleAuthBtn.textContent = "Create Account";

        document.querySelector(".auth-switch").firstChild.textContent =
            "Don't have an account? ";

    } catch (error) {

        console.error("Logout error:", error);

        alert("Unable to log out. Please try again.");
    }
});

// =====================================
// DATE
// =====================================

function setTodayDate() {

    const today = new Date();

    const formattedDate =
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    document.getElementById("diaryDate").value = formattedDate;
}

setTodayDate();

// =====================================
// GET BESTIE ID
// =====================================

async function getCurrentBestieId() {

    if (!currentUser) return null;

    const memberRef = doc(
        db,
        "bestieMembers",
        currentUser.uid
    );

    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
        return null;
    }

    return memberSnap.data().bestieId;
}

// =====================================
// SAVE DIARY
// =====================================

diaryForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!currentUser) {
        alert("Please log in first.");
        return;
    }

    const date = document.getElementById("diaryDate").value;
    const title = document.getElementById("diaryTitle").value.trim();
    const content = document.getElementById("diaryContent").value.trim();

    if (!date || !title || !content) {
        alert("Please complete all diary fields.");
        return;
    }

    let diaryBestieId = null;

    if (shareCheckbox.checked) {

        try {

            diaryBestieId = await getCurrentBestieId();

            if (!diaryBestieId) {
                alert(
                    "Please connect with your Bestie before sharing. ♡"
                );
                return;
            }

        } catch (error) {

            console.error("Bestie check error:", error);

            alert("Unable to check your Bestie connection.");
            return;
        }
    }

    const saveButton = diaryForm.querySelector(
        "button[type='submit']"
    );

    saveButton.disabled = true;
    saveButton.textContent = "Saving... ♡";

    try {

        await addDoc(collection(db, "diaries"), {

            ownerUid: currentUser.uid,

            date: date,
            title: title,
            content: content,

            isShared: shareCheckbox.checked,
            bestieId: diaryBestieId,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        alert("Your diary has been saved! ♡");

        diaryForm.reset();
        setTodayDate();

        await loadDiaryEntries();

        if (shareCheckbox.checked) {
            await loadOurDiaryEntries();
        }

    } catch (error) {

        console.error("Diary save error:", error);

        alert("Unable to save diary: " + error.message);

    } finally {

        saveButton.disabled = false;
        saveButton.textContent = "Save Diary ♡";
    }
});

// =====================================
// LOAD MY DIARY
// =====================================

async function loadDiaryEntries() {

    if (!currentUser) return;

    entriesContainer.textContent = "Loading your diaries... ♡";

    try {

        const diaryQuery = query(
            collection(db, "diaries"),
            where("ownerUid", "==", currentUser.uid)
        );

        const snapshot = await getDocs(diaryQuery);

        entriesContainer.innerHTML = "";

        if (snapshot.empty) {

            entriesContainer.textContent =
                "No diary entries yet. Start writing your first memory! ♡";

            return;
        }

        const diaries = [];

        snapshot.forEach(diaryDoc => {

            diaries.push({
                id: diaryDoc.id,
                ...diaryDoc.data()
            });
        });

        diaries.sort((a, b) => b.date.localeCompare(a.date));

        diaries.forEach(diary => {

            const article = document.createElement("article");

            const dateElement = document.createElement("p");
            dateElement.textContent = "📅 " + diary.date;

            const titleElement = document.createElement("h3");
            titleElement.textContent = diary.title;

            const contentElement = document.createElement("p");
            contentElement.textContent = diary.content;
            contentElement.style.whiteSpace = "pre-wrap";

            const statusElement = document.createElement("p");

if (diary.isShared) {
    statusElement.textContent = "♡ Shared with Bestie";
} else {
    statusElement.textContent = "🔒 Private Diary";
}

            const editButton = document.createElement("button");
            editButton.textContent = "Edit Diary ✎";

            editButton.addEventListener("click", async () => {

                const newTitle = prompt(
                    "Edit your diary title:",
                    diary.title
                );

                if (newTitle === null) return;

                const newContent = prompt(
                    "Edit your diary content:",
                    diary.content
                );

                if (newContent === null) return;

                if (!newTitle.trim() || !newContent.trim()) {
                    alert("Title and content cannot be empty.");
                    return;
                }

                try {

                    await updateDoc(
                        doc(db, "diaries", diary.id),
                        {
                            title: newTitle.trim(),
                            content: newContent.trim(),
                            updatedAt: serverTimestamp()
                        }
                    );

                    alert("Diary updated successfully! ♡");

                    await loadDiaryEntries();
                    await loadOurDiaryEntries();

                } catch (error) {

                    console.error("Edit diary error:", error);

                    alert("Unable to update diary: " + error.message);
                }
            });

            const shareButton = document.createElement("button");

            if (diary.isShared) {
    shareButton.textContent = "Make Private 🔒";
} else {
    shareButton.textContent = "Share with Bestie ♡";
}
            shareButton.style.marginLeft = "8px";
            shareButton.style.marginTop = "10px";

            shareButton.addEventListener("click", async () => {

                try {

                    let newBestieId = null;

                    if (!diary.isShared) {

                        newBestieId = await getCurrentBestieId();

                        if (!newBestieId) {
                            alert(
                                "Please connect with your Bestie first. ♡"
                            );
                            return;
                        }
                    }

                    await updateDoc(
                        doc(db, "diaries", diary.id),
                        {
                            isShared: !diary.isShared,
                            bestieId: newBestieId,
                            updatedAt: serverTimestamp()
                        }
                    );

                 if (diary.isShared) {
    alert("Your diary is now private. ♡");
} else {
    alert("Your diary is now shared with Bestie! ♡");
}

                    await loadDiaryEntries();
                    await loadOurDiaryEntries();

                } catch (error) {

                    console.error("Share diary error:", error);

                    alert("Unable to change sharing settings: " + error.message);
                }
            });

            const deleteButton = document.createElement("button");

            deleteButton.textContent = "Delete ♡";
            deleteButton.style.marginLeft = "8px";
            deleteButton.style.marginTop = "10px";

            deleteButton.addEventListener("click", async () => {

                const confirmed = confirm(
                    "Are you sure you want to delete this diary?"
                );

                if (!confirmed) return;

                try {

                    await deleteDoc(
                        doc(db, "diaries", diary.id)
                    );

                    await loadDiaryEntries();
                    await loadOurDiaryEntries();

                } catch (error) {

                    console.error("Delete error:", error);

                    alert("Unable to delete diary: " + error.message);
                }
            });

            article.appendChild(dateElement);
            article.appendChild(titleElement);
            article.appendChild(contentElement);
            article.appendChild(statusElement);
            article.appendChild(editButton);
            article.appendChild(shareButton);
            article.appendChild(deleteButton);

            entriesContainer.appendChild(article);
        });

    } catch (error) {

        console.error("Load diary error:", error);

        entriesContainer.textContent =
            "Unable to load diaries. Please try again.";
    }
}

// =====================================
// LOAD OUR DIARY
// =====================================

async function loadOurDiaryEntries() {

    if (!currentUser) return;

    sharedEntries.textContent = "Loading shared memories... ♡";

    try {

        const bestieId = await getCurrentBestieId();

        if (!bestieId) {

            sharedEntries.textContent =
                "Connect with your Bestie to start sharing memories. ♡";

            return;
        }

        const sharedQuery = query(
            collection(db, "diaries"),
            where("bestieId", "==", bestieId),
            where("isShared", "==", true)
        );

        const snapshot = await getDocs(sharedQuery);

        sharedEntries.innerHTML = "";

        if (snapshot.empty) {

            sharedEntries.textContent =
                "No shared memories yet. Share your first diary! ♡";

            return;
        }

        const diaries = [];

        snapshot.forEach(diaryDoc => {

            diaries.push({
                id: diaryDoc.id,
                ...diaryDoc.data()
            });
        });

        diaries.sort((a, b) => b.date.localeCompare(a.date));

        diaries.forEach(diary => {

            const article = document.createElement("article");

            const dateElement = document.createElement("p");
            dateElement.textContent = "📅 " + diary.date;

            const titleElement = document.createElement("h3");
            titleElement.textContent = diary.title;

            const contentElement = document.createElement("p");
            contentElement.textContent = diary.content;
            contentElement.style.whiteSpace = "pre-wrap";

            const ownerElement = document.createElement("p");

            if (diary.ownerUid === currentUser.uid) {
    ownerElement.textContent = "Shared by You ♡";
} else {
    ownerElement.textContent = "Shared by Your Bestie ♡";
}

            article.appendChild(dateElement);
            article.appendChild(titleElement);
            article.appendChild(contentElement);
            article.appendChild(ownerElement);

            // No edit or delete buttons here.
            // Only the diary owner can edit or delete.

            sharedEntries.appendChild(article);
        });

    } catch (error) {

        console.error("Load shared diaries error:", error);

        sharedEntries.textContent =
            "Unable to load shared memories. Please try again.";
    }
}

// =====================================
// BESTIE INVITATION SYSTEM
// =====================================

function generateBestieCode() {

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const randomValues = new Uint8Array(8);

    crypto.getRandomValues(randomValues);

    return Array.from(
        randomValues,
        value => characters[value % characters.length]
    ).join("");
}

// CREATE INVITE CODE

createBestieBtn.addEventListener("click", async () => {

    if (!currentUser) return;

    createBestieBtn.disabled = true;

    bestieMessage.textContent =
        "Creating your invite code... ♡";

    try {

        const memberRef = doc(
            db,
            "bestieMembers",
            currentUser.uid
        );

        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists()) {

            bestieMessage.textContent =
                "Your account is already connected to a Bestie ♡";

            return;
        }

        const code = generateBestieCode();

        const inviteRef = doc(
            db,
            "bestieInvites",
            code
        );

        const expiresAt = Timestamp.fromDate(
            new Date(Date.now() + 24 * 60 * 60 * 1000)
        );

        await setDoc(inviteRef, {

            ownerUid: currentUser.uid,
            status: "pending",
            createdAt: serverTimestamp(),
            expiresAt: expiresAt
        });

        bestieInviteCode.textContent = code;
        bestieInviteArea.hidden = false;

        bestieMessage.textContent =
            "Your invite code is ready! ♡ Valid for 24 hours.";

    } catch (error) {

        console.error("Create invite error:", error);

        bestieMessage.textContent =
            "Unable to create invite code. Please try again.";

    } finally {

        createBestieBtn.disabled = false;
    }
});

// COPY INVITE CODE

copyBestieCodeBtn.addEventListener("click", async () => {

    const code = bestieInviteCode.textContent;

    try {

        await navigator.clipboard.writeText(code);

        bestieMessage.textContent =
            "Invite code copied! ♡";

    } catch (error) {

        console.error("Copy error:", error);

        bestieMessage.textContent =
            "Unable to copy. Please copy the code manually.";
    }
});

// JOIN BESTIE

joinBestieBtn.addEventListener("click", async () => {

    if (!currentUser) return;

    const code = bestieCodeInput.value.trim().toUpperCase();

    if (!/^[A-Z0-9]{8}$/.test(code)) {

        bestieMessage.textContent =
            "Please enter a valid 8-character invite code.";

        return;
    }

    joinBestieBtn.disabled = true;

    bestieMessage.textContent =
        "Connecting with your Bestie... ♡";

    try {

        const myMemberRef = doc(
            db,
            "bestieMembers",
            currentUser.uid
        );

        const myMemberSnap = await getDoc(myMemberRef);

        if (myMemberSnap.exists()) {

            throw new Error(
                "Your account is already connected to a Bestie ♡"
            );
        }

        const inviteRef = doc(
            db,
            "bestieInvites",
            code
        );

        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
            throw new Error("Invalid or unavailable invite code.");
        }

        const inviteData = inviteSnap.data();

        if (inviteData.status !== "pending") {
            throw new Error("This invite code has already been used.");
        }

        if (inviteData.expiresAt.toDate() <= new Date()) {
            throw new Error("This invite code has expired.");
        }

        if (inviteData.ownerUid === currentUser.uid) {
            throw new Error("You cannot use your own invite code.");
        }

        const ownerUid = inviteData.ownerUid;

        const bestieRef = doc(
            db,
            "besties",
            code
        );

        const ownerMemberRef = doc(
            db,
            "bestieMembers",
            ownerUid
        );

        const batch = writeBatch(db);

        batch.set(bestieRef, {

            members: [ownerUid, currentUser.uid],
            createdAt: serverTimestamp()
        });

        batch.set(ownerMemberRef, {

            bestieId: code,
            createdAt: serverTimestamp()
        });

        batch.set(myMemberRef, {

            bestieId: code,
            createdAt: serverTimestamp()
        });

        batch.update(inviteRef, {

            status: "accepted",
            joinedBy: currentUser.uid
        });

        await batch.commit();

        bestieCodeInput.value = "";

        bestieMessage.textContent =
            "You are now connected with your Bestie! ♡";

        bestieInviteArea.hidden = true;

        createBestieBtn.disabled = true;
        joinBestieBtn.disabled = true;

    } catch (error) {

        console.error("Join Bestie error:", error);

        bestieMessage.textContent =
            error.message || "Unable to join. Please try again.";

    } finally {

        joinBestieBtn.disabled = false;
    }
});


// =====================================
// CALENDAR SYSTEM
// =====================================

const calendarMonthYear = document.getElementById("calendarMonthYear");
const calendarDays = document.getElementById("calendarDays");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const todayBtn = document.getElementById("todayBtn");

const selectedDateTitle = document.getElementById("selectedDateTitle");
const calendarDiaryEntries = document.getElementById("calendarDiaryEntries");

let calendarCurrentDate = new Date();
let calendarSelectedDate = null;
let calendarDiaries = [];

function formatCalendarDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// LOAD CALENDAR DIARIES

async function loadCalendarEntries() {

    if (!currentUser) return;

    calendarDays.innerHTML = "<p>Loading calendar... ♡</p>";

    try {

        const allDiaries = new Map();

        // Load my own diaries, including private entries.
        const myQuery = query(
            collection(db, "diaries"),
            where("ownerUid", "==", currentUser.uid)
        );

        const mySnapshot = await getDocs(myQuery);

        mySnapshot.forEach(diaryDoc => {
            allDiaries.set(diaryDoc.id, {
                id: diaryDoc.id,
                ...diaryDoc.data(),
                diaryType: "mine"
            });
        });

        // Load diaries shared by Bestie.
        const bestieId = await getCurrentBestieId();

        if (bestieId) {

            const sharedQuery = query(
                collection(db, "diaries"),
                where("bestieId", "==", bestieId),
                where("isShared", "==", true)
            );

            const sharedSnapshot = await getDocs(sharedQuery);

            sharedSnapshot.forEach(diaryDoc => {

                const diary = {
                    id: diaryDoc.id,
                    ...diaryDoc.data(),
                    diaryType: "shared"
                };

                // Do not duplicate my own shared diaries.
                if (!allDiaries.has(diaryDoc.id)) {
                    allDiaries.set(diaryDoc.id, diary);
                }
            });
        }

        calendarDiaries = Array.from(allDiaries.values());

        renderCalendar();
        
        // Automatically show today's diary entries
showCalendarDate(calendarSelectedDate);

    } catch (error) {

        console.error("Calendar loading error:", error);

        calendarDays.textContent =
            "Unable to load calendar. Please try again. ♡";
    }
}

// RENDER MONTH CALENDAR

function renderCalendar() {

    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();

    calendarMonthYear.textContent =
        calendarCurrentDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
        });

    calendarDays.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();

    const todayString = formatCalendarDate(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    // Empty spaces before the first day.
    for (let i = 0; i < firstDay; i++) {

        const emptyDay = document.createElement("div");

        emptyDay.className = "calendar-day empty";

        calendarDays.appendChild(emptyDay);
    }

    // Generate all days.
    for (let day = 1; day <= daysInMonth; day++) {

        const dateString = formatCalendarDate(year, month, day);

        const dayDiaries = calendarDiaries.filter(
            diary => diary.date === dateString
        );

        const dayButton = document.createElement("button");

        dayButton.type = "button";
        dayButton.className = "calendar-day";
        dayButton.dataset.date = dateString;

        if (dateString === todayString) {
            dayButton.classList.add("today");
        }

        if (dateString === calendarSelectedDate) {
            dayButton.classList.add("selected");
        }

        const number = document.createElement("span");

        number.className = "calendar-day-number";
        number.textContent = day;

        dayButton.appendChild(number);

        const dots = document.createElement("div");

        dots.className = "calendar-dots";

        const hasMyDiary = dayDiaries.some(
            diary => diary.diaryType === "mine"
        );

        const hasSharedDiary = dayDiaries.some(
            diary => diary.diaryType === "shared"
        );

        if (hasMyDiary) {

            const dot = document.createElement("i");

            dot.className = "my-diary-dot";

            dots.appendChild(dot);
        }

        if (hasSharedDiary) {

            const dot = document.createElement("i");

            dot.className = "shared-diary-dot";

            dots.appendChild(dot);
        }

        dayButton.appendChild(dots);

        

        calendarDays.appendChild(dayButton);
    }
}


// SHOW DIARIES FOR SELECTED DATE

function showCalendarDate(dateString) {

    selectedDateTitle.textContent = "📅 " + dateString;

    calendarDiaryEntries.innerHTML = "";

    const dayDiaries = calendarDiaries.filter(
        diary => diary.date === dateString
    );

    if (dayDiaries.length === 0) {

        calendarDiaryEntries.textContent =
            "No diary memories on this day. ♡";

        return;
    }

    dayDiaries.forEach(diary => {

        const article = document.createElement("article");

        article.className = "calendar-entry";

        const title = document.createElement("h3");

        title.textContent = diary.title;

        const content = document.createElement("p");

        content.textContent = diary.content;

        const owner = document.createElement("p");

        const viewButton = document.createElement("button");

        viewButton.type = "button";

        if (diary.ownerUid === currentUser.uid) {

            if (diary.isShared) {
    owner.textContent = "♡ My Diary · Shared with Bestie";
} else {
    owner.textContent = "🔒 My Private Diary";
}

            viewButton.textContent = "View My Diary ♡";

            viewButton.addEventListener("click", () => {
                showPage("myDiary");
            });

        } else {

            owner.textContent = "🌸 Shared by Your Bestie";

            viewButton.textContent = "View Our Diary ♡";

            viewButton.addEventListener("click", () => {
                showPage("ourDiary");
            });
        }

        article.appendChild(title);
        article.appendChild(content);
        article.appendChild(owner);
        article.appendChild(viewButton);

        calendarDiaryEntries.appendChild(article);
    });
}

// PREVIOUS MONTH

prevMonthBtn.addEventListener("click", () => {

    calendarCurrentDate.setMonth(
        calendarCurrentDate.getMonth() - 1
    );

    renderCalendar();
});

// NEXT MONTH

nextMonthBtn.addEventListener("click", () => {

    calendarCurrentDate.setMonth(
        calendarCurrentDate.getMonth() + 1
    );

    renderCalendar();
});

// RETURN TO TODAY

todayBtn.addEventListener("click", () => {

    calendarCurrentDate = new Date();

    const today = new Date();

    calendarSelectedDate = formatCalendarDate(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    renderCalendar();

    showCalendarDate(calendarSelectedDate);
});

// INITIAL CALENDAR

calendarSelectedDate = formatCalendarDate(
    calendarCurrentDate.getFullYear(),
    calendarCurrentDate.getMonth(),
    calendarCurrentDate.getDate()
);

console.log("Calendar system is ready ♡");



// =====================================
// MEMORIES SYSTEM
// =====================================

async function loadMemoriesEntries() {

    const memoriesEntries = document.getElementById("memoriesEntries");

    if (!currentUser) return;

    memoriesEntries.innerHTML = "<p>Loading memories... ♡</p>";

    try {

        const allMemories = new Map();

        // Load my own diaries.
        const myQuery = query(
            collection(db, "diaries"),
            where("ownerUid", "==", currentUser.uid)
        );

        const mySnapshot = await getDocs(myQuery);

        mySnapshot.forEach(diaryDoc => {

            allMemories.set(diaryDoc.id, {
                id: diaryDoc.id,
                ...diaryDoc.data(),
                memoryType: "mine"
            });

        });

        // Load diaries shared by Bestie.
        const bestieId = await getCurrentBestieId();

        if (bestieId) {

            const sharedQuery = query(
                collection(db, "diaries"),
                where("bestieId", "==", bestieId),
                where("isShared", "==", true)
            );

            const sharedSnapshot = await getDocs(sharedQuery);

            sharedSnapshot.forEach(diaryDoc => {

                if (!allMemories.has(diaryDoc.id)) {

                    allMemories.set(diaryDoc.id, {
                        id: diaryDoc.id,
                        ...diaryDoc.data(),
                        memoryType: "shared"
                    });

                }

            });

        }

        const memories = Array.from(allMemories.values());

        // Sort newest diary first.
        memories.sort((a, b) => b.date.localeCompare(a.date));

        memoriesEntries.innerHTML = "";

        if (memories.length === 0) {

            memoriesEntries.textContent =
                "No memories yet. Start writing your diary! ♡";

            return;
        }

        memories.forEach(diary => {

            const card = document.createElement("article");

            card.className = "memory-card";

            const date = document.createElement("p");

            date.className = "memory-date";
            date.textContent = "📅 " + diary.date;

            const title = document.createElement("h3");

            title.textContent = diary.title;

            const content = document.createElement("p");

            content.textContent = diary.content;

            const owner = document.createElement("p");

            owner.className = "memory-owner";

            const viewButton = document.createElement("button");

            viewButton.type = "button";

            if (diary.memoryType === "mine") {

                if (diary.isShared) {
    owner.textContent = "♡ My Diary · Shared with Bestie";
} else {
    owner.textContent = "🔒 My Private Diary";
}

                viewButton.textContent = "View My Diary ♡";

                viewButton.addEventListener("click", () => {
                    showPage("myDiary");
                });

            } else {

                owner.textContent = "🌸 Shared by Your Bestie";

                viewButton.textContent = "View Our Diary ♡";

                viewButton.addEventListener("click", () => {
                    showPage("ourDiary");
                });

            }

            card.appendChild(date);
            card.appendChild(title);
            card.appendChild(content);
            card.appendChild(owner);
            card.appendChild(viewButton);

            memoriesEntries.appendChild(card);

        });

    } catch (error) {

        console.error("Memories loading error:", error);

        memoriesEntries.textContent =
            "Unable to load memories. Please try again. ♡";

    }

}

console.log("Memories system is ready ♡");



