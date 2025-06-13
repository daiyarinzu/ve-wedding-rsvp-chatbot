const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const popSound = new Audio("pop.mp3");
const guestNames = [];
let sessionEnded = false;
let idleTimer = null;
let idleStage = 0;

// ✅ JSONBin settings
const JSONBIN_API_URL = "https://api.jsonbin.io/v3/b/684bb8618960c979a5a9077e";
const JSONBIN_API_KEY =
  "$2a$10$M.xkZjGz0DiD595oDUW9SeM8MrkagJMaBA4oxqjAHxc8jesa/x/Zu";

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resetIdleTimer() {
  if (sessionEnded) return;
  clearTimeout(idleTimer);

  idleTimer = setTimeout(
    () => {
      if (idleStage === 0) {
        botReplyWithTyping(
          `👋 Just checking in — are you still there? You can keep adding names or reply "No" to finish.`
        );
        idleStage = 1;
        resetIdleTimer();
      } else if (idleStage === 1) {
        botReplyWithTyping(
          `⏱️ Looks like you're away. We'll end this RSVP session for now. You can start again anytime. 😊`
        );
        sessionEnded = true;
        idleStage = 0;
        clearTimeout(idleTimer);
      }
    },
    idleStage === 0 ? 2 * 60 * 1000 : 3 * 60 * 1000
  );
}

function isValidName(name) {
  const trimmed = name.trim();
  const allowList = ["kerthyllaine", "zaynab faith kerthyllaine"];
  if (allowList.includes(trimmed.toLowerCase())) return true;
  if (trimmed.length < 2 || trimmed.length > 30) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;

  const vowels = (trimmed.match(/[aeiou]/gi) || []).length;
  const consonants = (trimmed.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;

  if (vowels === 0 || consonants === 0) return false;
  if (/(?:[aeiou]{4,}|[bcdfghjklmnpqrstvwxyz]{4,})/i.test(trimmed))
    return false;
  if (trimmed === trimmed.toLowerCase() && !trimmed.includes(" ")) return false;

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

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (!isTyping && sender === "bot") {
    try {
      popSound.currentTime = 0;
      popSound.play();
    } catch (err) {}
  }

  return wrapper;
}

function botReplyWithTyping(text, delay = 1000) {
  const typingBubble = addMessage("", "bot", true);
  setTimeout(() => {
    typingBubble.remove();
    addMessage(text, "bot");
  }, delay);
}

// ✅ JSONBin: fetch existing names
async function fetchExistingNames() {
  try {
    const response = await fetch(`${JSONBIN_API_URL}/latest`, {
      headers: {
        "X-Master-Key": JSONBIN_API_KEY,
      },
    });
    const data = await response.json();
    return data.record.names || [];
  } catch (err) {
    console.error("❌ Error fetching names:", err);
    return [];
  }
}

// ✅ JSONBin: save names
async function saveNamesToBin(names) {
  try {
    const response = await fetch(JSONBIN_API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_API_KEY,
      },
      body: JSON.stringify({ names }),
    });
    return await response.json();
  } catch (err) {
    console.error("❌ Error saving names:", err);
    return null;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const userText = input.value.trim();
  if (!userText) return;

  addMessage(userText, "user");
  input.value = "";

  if (sessionEnded || !didClickRSVP()) {
    botReplyWithTyping(
      "Hi! To RSVP, please click the RSVP button on our website first so we can properly record your names. 😊"
    );
    return;
  }

  setTimeout(() => {
    respond(userText);
    resetIdleTimer();
    idleStage = 0;
  }, 600);
});

async function respond(userText) {
  const lower = userText.toLowerCase();

  if (["no", "nope", "none"].includes(lower)) {
    if (idleStage === 1 && guestNames.length === 0) {
      botReplyWithTyping("No problem! Let us know if you change your mind. 😊");
      sessionEnded = true;
      idleStage = 0;
      clearTimeout(idleTimer);
      return;
    }

    if (guestNames.length === 0) {
      botReplyWithTyping("No problem! Let us know if you change your mind. 😊");
    } else {
      const finalList = guestNames.map((name) => `• ${name}`).join("<br>");
      const message = `🎉 Thank you! Here's the list of names we’ve recorded:<br><br>${finalList}<br><br>We look forward to seeing you! 💖`;
      botReplyWithTyping(message);
      sessionEnded = true;
      idleStage = 0;
      clearTimeout(idleTimer);
    }
    return;
  }

  if (!isValidName(userText)) {
    botReplyWithTyping(
      "Hmm... that doesn’t look like a valid name. Could you double-check and try again? 😊"
    );
    return;
  }

  const existingNames = await fetchExistingNames();
  const lowerNames = existingNames.map((n) => n.toLowerCase().trim());

  if (lowerNames.includes(userText.toLowerCase().trim())) {
    botReplyWithTyping(
      "🚫 That guest has already RSVP’d. Please enter other names. Thank you! 😊"
    );
    return;
  }

  guestNames.push(userText.trim());

  const result = await saveNamesToBin([...existingNames, userText.trim()]);
  if (!result) {
    botReplyWithTyping("⚠️ Something went wrong. Please try again later.");
    return;
  }

  const acknowledgments = [
    "✅ Got it!",
    "👍 Name saved.",
    "📌 Added.",
    "👌 Thanks!",
    "📝 Noted!",
  ];
  const prompts = [
    "Would you like to add another name?",
    "Want to add someone else?",
    "Anyone else you'd like to include?",
    "Shall we add another guest?",
    "Feel free to share more names!",
  ];
  const instructions = [
    `If you're done, just reply "No".`,
    `When you're finished, type "No".`,
    `If no more guests, simply reply "No".`,
    `Reply "No" when you're done adding names.`,
    `Done? Just type "No".`,
  ];

  const finalReply =
    `${getRandomItem(acknowledgments)}<br>` +
    `${getRandomItem(prompts)}<br>` +
    `${getRandomItem(instructions)}`;

  botReplyWithTyping(finalReply);
}

function didClickRSVP() {
  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get("rsvp");
  return value === "1" || value === "true";
}

window.onload = () => {
  if (didClickRSVP()) {
    botReplyWithTyping(
      `💌 Greetings!\n\nYou are invited to the wedding of Voughn and Emelyn.\n\nPlease let us know if you can come.\nJust reply with your names so we can save your seats and prepare your table.\n\nThank you, and we’re excited to celebrate this special day with you! 💕`,
      1500
    );
    setTimeout(() => {
      resetIdleTimer();
    }, 1600);
  } else {
    botReplyWithTyping(
      `Hi! To RSVP, please click the RSVP button on our website first so we can properly record your names. 😊`,
      1000
    );
  }
};

window.addEventListener(
  "click",
  () => {
    popSound.play().catch(() => {});
  },
  { once: true }
);
