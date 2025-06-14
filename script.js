// DOM Elements
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const popSound = new Audio("pop.mp3");

// Guest names and session state
const guestNames = [];
let sessionEnded = false;
let idleTimer = null;
let idleStage = 0;

// JSONBin API (used to store and fetch names)
const JSONBIN_API_URL = "https://api.jsonbin.io/v3/b/684c26f58561e97a5023a1a8";
const JSONBIN_API_KEY =
  "$2a$10$M.xkZjGz0DiD595oDUW9SeM8MrkagJMaBA4oxqjAHxc8jesa/x/Zu";

// Helper to pick a random item (used for random replies)
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scrollToBottom() {}

// Capitalize names properly
function capitalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Reset idle timer and send follow-up if user is inactive
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
        resetIdleTimer(); // Start next stage timer
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
  ); // 2min > 3min
}

// Validate name format and quality
function isValidName(name) {
  const trimmed = name.trim();
  const allowList = [
    "kerthyllaine",
    "zaynab faith kerthyllaine pajo",
    "johann schneider lalaan",
    "schneider",
  ];
  const lowered = trimmed.toLowerCase();
  if (allowList.includes(lowered)) return true;

  // Length check
  if (trimmed.length < 2 || trimmed.length > 50) return false;

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) return false;

  // Vowel and consonant check
  const vowels = (trimmed.match(/[aeiou]/gi) || []).length;
  const consonants = (trimmed.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
  if (vowels === 0 || consonants === 0) return false;

  // Reject long gibberish
  if (/(?:[aeiou]{4,}|[bcdfghjklmnpqrstvwxyz]{4,})/i.test(trimmed))
    return false;

  // Final check: allow lowercase names — we’ll auto-capitalize later
  return true;
}

// Format current time as HH:MM
function formatTime(date) {
  const options = { hour: "2-digit", minute: "2-digit" };
  return date.toLocaleTimeString([], options);
}

// Add a message to the chat (user or bot)
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
    // Show typing dots for bot
    messageBubble.classList.add("typing");
    messageBubble.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  } else {
    messageBubble.innerHTML = text.replace(/\n/g, "<br>");
  }

  // Add avatar if it's from the bot
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

  // Add timestamp (not for typing bubble)
  if (!isTyping) {
    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = time;
    wrapper.appendChild(timestamp);
  }

  // Display it
  chatBox.prepend(wrapper);
  scrollToBottom();

  // Play pop sound if bot (and not typing)
  if (!isTyping && sender === "bot") {
    try {
      popSound.currentTime = 0;
      popSound.play();
    } catch (err) {}
  }

  // ✨ Add small animation delay
  messageWrapper.style.animationDelay = "0s";
  messageWrapper.style.animationFillMode = "both";

  return wrapper;
}

// Bot replies with typing delay
function botReplyWithTyping(text, delay = 1000) {
  const typingBubble = addMessage("", "bot", true);
  setTimeout(() => {
    typingBubble.remove();
    addMessage(text, "bot");
    scrollToBottom();
  }, delay);
}

// Fetch RSVP list from JSONBin
async function fetchExistingNames() {
  try {
    const response = await fetch(`${JSONBIN_API_URL}/latest`, {
      headers: { "X-Master-Key": JSONBIN_API_KEY },
    });
    const data = await response.json();
    return data.record.names || [];
  } catch (err) {
    console.error("❌ Error fetching names:", err);
    return [];
  }
}

// Save new names to JSONBin
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

// Handle form submission
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

// Handle bot response logic
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

  // ✅ Format the name with capitalized words
  const formattedName = userText
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const existingNames = await fetchExistingNames();
  const lowerNames = existingNames.map((n) => n.toLowerCase().trim());

  if (lowerNames.includes(formattedName.toLowerCase())) {
    botReplyWithTyping(
      "🚫 That guest has already RSVP’d. Please enter other names. Thank you! 😊"
    );
    return;
  }

  guestNames.push(formattedName);

  const result = await saveNamesToBin([...existingNames, formattedName]);
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

// Detect if user came from RSVP button on your website
function didClickRSVP() {
  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get("rsvp");
  return value === "1" || value === "true";
}

// On page load, greet user or block if not from RSVP link
window.onload = () => {
  if (didClickRSVP()) {
    botReplyWithTyping(
      `💌 Greetings!\n\nYou are invited to the wedding of Voughn and Emelyn.\n\nPlease let us know if you can come. Just reply with your FULL name so we can save your seats and prepare your table.\n\nThank you, and we’re excited to celebrate this special day with you! 💕`,
      1500
    );

    setTimeout(() => {
      resetIdleTimer();
    }, 2000);
  } else {
    botReplyWithTyping(
      `Hi! To RSVP, please click the RSVP button on our website first so we can properly record your names. 😊`,
      1000
    );
  }

  // ✨ Add a longer timeout to scroll after messages render
  setTimeout(() => {
    scrollToBottom();
  }, 2500); // Give time for bot message animation
};

window.addEventListener("resize", () => {
  scrollToBottom();
});

document.addEventListener("DOMContentLoaded", () => {
  scrollToBottom();
});
