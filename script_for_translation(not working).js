// DOM Elements
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const popSound = new Audio("pop.mp3");

// Language support
let language = "null"; // Default to English

window.onload = () => {
  // Handle language selection buttons
  document.querySelectorAll("#language-selection button").forEach((btn) => {
    btn.addEventListener("click", () => {
      language = btn.getAttribute("data-lang");
      document.getElementById("language-selection").style.display = "none";
      document.getElementById("chat-input-container").style.display = "block";
      showGreeting(); // trigger greeting after language is set
    });
  });

  // Scroll behavior after load
  setTimeout(() => {
    scrollToBottom();
  }, 2500);
};

const messages = {
  en: {
    greeting: `💌 Greetings!\n\nYou are invited to the wedding of Voughn and Emelyn!\n\nBased on the number of seats shown in your invitation, kindly tell us how many guest(s) will be attending. 😊`,
    invalidSeats: `⚠️ Please enter a valid number of seats (1–10).`,
    askNames: (count) =>
      `Great! You may now RSVP up to ${count} guest${
        count > 1 ? "s" : ""
      }.\n\nPlease reply with the guest(s) full name one by one. 😊`,
    invalidName: `Hmm... that doesn’t look like a valid name. Could you double-check and try again? 😊`,
    duplicateName: `🚫 That guest has already RSVP’d. Please enter other names. Thank you! 😊`,
    maxReached: (count) =>
      `✅ You've already added ${count} guest${
        count > 1 ? "s" : ""
      }. If you need to make changes, please message us directly. 😊`,
    checkStillThere: `👋 Just checking in — are you still there? You can keep adding names or reply "No" to finish.`,
    sessionEnded: `⏱️ Looks like you're away. We'll end this RSVP session for now. You can start again anytime. 😊`,
    notFromRSVP:
      "Hi! To RSVP, please click the RSVP button on our website first so we can properly record your names. 😊",
    addAcknowledgments: [
      "✅ Got it!",
      "👍 Name saved.",
      "📌 Added.",
      "👌 Thanks!",
      "📝 Noted!",
    ],
    addPrompts: [
      "Would you like to add another name?",
      "Want to add someone else?",
      "Anyone else you'd like to include?",
      "Shall we add another guest?",
      "Feel free to share more names!",
    ],
    addInstructions: [
      `If you're done, just reply "No".`,
      `When you're finished, type "No".`,
      `If no more guests, simply reply "No".`,
      `Reply "No" when you're done adding names.`,
      `Done? Just type "No".`,
    ],
    thankYou: (count) =>
      `🎉 Thank you! We've recorded all ${count} guest name${
        count > 1 ? "s" : ""
      }. \n\nWe kindly ask that these seats are joyfully filled on the day of the event, so the heartfelt efforts and careful preparations of the bride and groom can be fully cherished. 😊\n\nLooking forward to seeing you! 💖`,
    confirmPrompt: (list) =>
      `🎉 Thank you! Here are the name(s) you've sent us:<br><br>${list}<br><br>Can you double check if everything is correct? Please reply "Yes" or "No".`,
    finalPartial: (list, remaining) =>
      `🎉 Thank you! Here are the name(s) you've sent us:<br><br>${list}<br><br>You still have ${remaining} seat${
        remaining > 1 ? "s" : ""
      } left. Please enter ${
        remaining === 1 ? "1 more name" : remaining + " more names"
      } or reply "No" to finish.`,
    savingError:
      "⚠️ Something went wrong while saving your RSVP. Please try again later.",
    goodbye: "No problem! Let us know if you change your mind. 😊",
    retryNames: "No problem! Please re-enter the names one by one. 😊",
  },

  tl: {
    // Tagalog (to be filled next)
  },

  ceb: {
    // Bisaya (to be filled next)
  },
};

// Guest names and session state
const guestNames = [];
let sessionEnded = false;
let idleTimer = null;
let idleStage = 0;

let maxSeats = null;
let awaitingSeatCount = true;
let awaitingConfirmation = false;
let partialConfirmationShown = false;

const JSONBIN_API_URL = "https://api.jsonbin.io/v3/b/684fb7ec8561e97a5025038b";
const JSONBIN_API_KEY =
  "$2a$10$M.xkZjGz0DiD595oDUW9SeM8MrkagJMaBA4oxqjAHxc8jesa/x/Zu";

// Helpers
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scrollToBottom() {}

function capitalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resetIdleTimer() {
  if (sessionEnded) return;
  clearTimeout(idleTimer);

  idleTimer = setTimeout(
    () => {
      if (idleStage === 0) {
        botReplyWithTyping(messages[language].checkStillThere);
        idleStage = 1;
        resetIdleTimer();
      } else if (idleStage === 1) {
        botReplyWithTyping(messages[language].sessionEnded);
        sessionEnded = true;
        idleStage = 0;
        clearTimeout(idleTimer);
      }
    },
    idleStage === 0 ? 2 * 60 * 1000 : 3 * 60 * 1000
  );
}

function isValidName(name) {
  const cleaned = name.trim();
  if (cleaned.length < 2 || cleaned.length > 120) return false;
  const wordCount = cleaned.split(/\s+/).length;
  if (wordCount < 2) return false;
  const pattern = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\u0100-\u024F\s.'’\-]+$/u;
  if (!pattern.test(cleaned)) return false;
  if (/[bcdfghjklmnpqrstvwxyz]{7,}/i.test(cleaned)) return false;
  return true;
}

function formatTime(date) {
  const options = { hour: "2-digit", minute: "2-digit" };
  return date.toLocaleTimeString([], options);
}

function addMessage(text, sender = "bot", isTyping = false) {
  const wrapper = document.createElement("div");
  const time = formatTime(new Date());

  const messageWrapper = document.createElement("div");
  messageWrapper.classList.add(
    "message-wrapper",
    sender === "user" ? "user-wrapper" : "bot-wrapper"
  );

  const messageBubble = document.createElement("div");
  messageBubble.classList.add("message", sender);

  if (isTyping) {
    messageBubble.classList.add("typing");
    messageBubble.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  } else {
    messageBubble.innerHTML = text.replace(/\n/g, "<br>");
  }

  if (sender === "bot") {
    const avatar = document.createElement("img");
    avatar.src = "avatar.png";
    avatar.alt = "Bot";
    avatar.classList.add("avatar");
    messageWrapper.appendChild(avatar);
    messageWrapper.appendChild(messageBubble);
  } else {
    messageWrapper.appendChild(messageBubble);
  }

  wrapper.classList.add("message");
  if (sender === "user") wrapper.classList.add("user-message");
  wrapper.appendChild(messageWrapper);

  if (!isTyping) {
    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = time;
    wrapper.appendChild(timestamp);
  }

  chatBox.prepend(wrapper);
  scrollToBottom();

  if (!isTyping && sender === "bot") {
    try {
      popSound.currentTime = 0;
      popSound.play();
    } catch (err) {}
  }

  messageWrapper.style.animationDelay = "0s";
  messageWrapper.style.animationFillMode = "both";

  return wrapper;
}

function botReplyWithTyping(textOrFn, delay = 1000) {
  const typingBubble = addMessage("", "bot", true);
  setTimeout(() => {
    typingBubble.remove();
    const message =
      typeof textOrFn === "function" ? textOrFn(messages[language]) : textOrFn;
    addMessage(message, "bot");
    scrollToBottom();
  }, delay);
}

function isDuplicateName(name) {
  const normalized = name.trim().toLowerCase();
  return guestNames.some((n) => n.toLowerCase() === normalized);
}

function showNameSummary() {
  const nameList = guestNames
    .map((name, i) => `${i + 1}. ${capitalizeName(name)}`)
    .join("<br>");
  botReplyWithTyping((msg) => msg.confirmPrompt(nameList), 1000);
  awaitingConfirmation = true;
}

function showPartialSummary() {
  const remaining = maxSeats - guestNames.length;
  const nameList = guestNames
    .map((name, i) => `${i + 1}. ${capitalizeName(name)}`)
    .join("<br>");
  botReplyWithTyping((msg) => msg.finalPartial(nameList, remaining), 1000);
  partialConfirmationShown = true;
}

function handleFinalConfirmation(response) {
  if (response.toLowerCase() === "yes") {
    botReplyWithTyping((msg) => msg.thankYou(guestNames.length));
    saveGuestNames(guestNames);
    awaitingConfirmation = false;
  } else if (response.toLowerCase() === "no") {
    guestNames.length = 0;
    botReplyWithTyping(messages[language].retryNames);
    partialConfirmationShown = false;
    awaitingConfirmation = false;
  }
}

function saveGuestNames(names) {
  const payload = {
    names: names.map((n) => capitalizeName(n)),
    timestamp: new Date().toISOString(),
  };

  fetch(JSONBIN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_API_KEY,
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    botReplyWithTyping(messages[language].savingError);
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const userInput = input.value.trim();
  if (!userInput) return;

  // ✅ Fix: Don't allow input until language is selected
  if (!language) {
    botReplyWithTyping("Please select a language first.");
    return;
  }

  addMessage(userInput, "user");
  input.value = "";
  resetIdleTimer();

  if (sessionEnded) return;

  if (awaitingConfirmation) {
    handleFinalConfirmation(userInput);
    return;
  }

  if (awaitingSeatCount) {
    const seatCount = parseInt(userInput, 10);
    if (!Number.isInteger(seatCount) || seatCount <= 0 || seatCount > 10) {
      botReplyWithTyping(messages[language].invalidSeats);
      return;
    }

    maxSeats = seatCount;
    awaitingSeatCount = false;
    botReplyWithTyping((msg) => msg.askNames(seatCount), 800);
    return;
  }

  if (userInput.toLowerCase() === "no") {
    if (guestNames.length === 0) {
      botReplyWithTyping(messages[language].goodbye);
    } else if (!partialConfirmationShown) {
      showPartialSummary();
    } else {
      showNameSummary();
    }
    return;
  }

  const name = capitalizeName(userInput);
  if (!isValidName(name)) {
    botReplyWithTyping(messages[language].invalidName);
    return;
  }

  if (isDuplicateName(name)) {
    botReplyWithTyping(messages[language].duplicateName);
    return;
  }

  guestNames.push(name);

  if (guestNames.length === maxSeats) {
    showNameSummary();
  } else {
    botReplyWithTyping(
      getRandomItem(messages[language].addAcknowledgments),
      500
    );

    setTimeout(() => {
      botReplyWithTyping(
        `${getRandomItem(messages[language].addPrompts)}<br><br>${getRandomItem(
          messages[language].addInstructions
        )}`,
        1000
      );
    }, 700);
  }
});

async function respond(userText) {
  const msg = messages[language];
  const lower = userText.trim().toLowerCase();

  if (awaitingConfirmation) {
    if (["yes", "yep", "yeah", "correct"].includes(lower)) {
      const finalList = guestNames.map((name) => `• ${name}`).join("<br>");
      botReplyWithTyping(() => msg.thankYou(guestNames.length));
      sessionEnded = true;
      awaitingConfirmation = false;
      clearTimeout(idleTimer);
      return;
    }

    if (["no", "nope", "nah", "wrong"].includes(lower)) {
      guestNames.length = 0;
      botReplyWithTyping(msg.retryNames);
      awaitingConfirmation = false;
      partialConfirmationShown = false;
      return;
    }
  }

  if (["no", "nope", "none"].includes(lower)) {
    if (idleStage === 1 && guestNames.length === 0) {
      botReplyWithTyping(msg.goodbye);
      sessionEnded = true;
      idleStage = 0;
      clearTimeout(idleTimer);
      return;
    }

    if (guestNames.length === 0) {
      botReplyWithTyping(msg.goodbye);
      sessionEnded = true;
      idleStage = 0;
      clearTimeout(idleTimer);
      partialConfirmationShown = false;
    } else if (guestNames.length < maxSeats && !partialConfirmationShown) {
      showPartialSummary();
    } else if (guestNames.length < maxSeats && partialConfirmationShown) {
      showNameSummary();
      sessionEnded = true;
      clearTimeout(idleTimer);
      idleStage = 0;
      partialConfirmationShown = false;
    } else {
      guestNames.length = 0;
      awaitingConfirmation = false;
      botReplyWithTyping(msg.retryNames);
    }

    return;
  }

  if (awaitingSeatCount) {
    const seatCount = parseInt(userText);
    if (isNaN(seatCount) || seatCount < 1 || seatCount > 10) {
      botReplyWithTyping(msg.invalidSeats);
    } else {
      maxSeats = seatCount;
      awaitingSeatCount = false;
      botReplyWithTyping(() => msg.askNames(seatCount));
    }
    return;
  }

  if (guestNames.length >= maxSeats) {
    botReplyWithTyping(() => msg.reachedMax(maxSeats));
    return;
  }

  if (!isValidName(userText)) {
    botReplyWithTyping(msg.invalidName);
    return;
  }

  const formattedName = capitalizeName(userText);
  if (guestNames.some((n) => n.toLowerCase() === formattedName.toLowerCase())) {
    botReplyWithTyping(msg.duplicateName);
    return;
  }

  guestNames.push(formattedName);

  if (guestNames.length === maxSeats) {
    showNameSummary();
    return;
  }

  botReplyWithTyping(
    `${getRandomItem(msg.addAcknowledgments)}<br>${getRandomItem(
      msg.addPrompts
    )}<br>${getRandomItem(msg.addInstructions)}`
  );
}

// Detect if user came from RSVP link
function didClickRSVP() {
  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get("rsvp");
  return value === "1" || value === "true";
}

// Show greeting message (after language is selected)
function showGreeting() {
  const msg = messages[language];
  if (didClickRSVP()) {
    botReplyWithTyping(msg.greeting, 1500);
    setTimeout(() => {
      resetIdleTimer();
    }, 2000);
  } else {
    botReplyWithTyping(msg.rsvpRequired, 1000);
  }

  // Ensure chat scrolls to bottom after messages
  setTimeout(() => {
    scrollToBottom();
  }, 2500);
}

// Scroll helpers
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

window.addEventListener("load", () => {
  setTimeout(() => {
    scrollToBottom();
    input.scrollIntoView({ behavior: "smooth", block: "end" });
  }, 1000);
});

window.addEventListener("resize", () => {
  setTimeout(() => {
    scrollToBottom();
    input.scrollIntoView({ behavior: "smooth", block: "end" });
  }, 300);
});

/* CSS for language selection
.lang-buttons {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  width: 100%;
  max-width: 100%;
  background-color: #f3ecdc;
  padding: 1.5em 1em;
  border: 1px solid #ddd;
  box-sizing: border-box;
  z-index: 10;

  text-align: center;
}

.lang-buttons p {
  margin-bottom: 1em;
  font-weight: bold;
}

.lang-buttons .lang-btn {
  display: inline-block;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 20px;
  padding: 0.5em 1em;
  margin: 0 0.5em;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.lang-buttons .lang-btn:hover {
  background-color: #e0e0e0;
}*/
