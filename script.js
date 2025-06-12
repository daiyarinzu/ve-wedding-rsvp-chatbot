const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const popSound = new Audio("pop.mp3");
const guestNames = [];
let sessionEnded = false;
let idleTimer = null;
let idleStage = 0;

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resetIdleTimer() {
  // ✅ Don't start idle timer if session has ended
  if (sessionEnded) return;

  clearTimeout(idleTimer);

  idleTimer = setTimeout(
    () => {
      if (idleStage === 0) {
        botReplyWithTyping(
          `👋 Just checking in — are you still there? You can keep adding names or reply "No" to finish.`
        );
        idleStage = 1;
        resetIdleTimer(); // Start next timeout
      } else if (idleStage === 1) {
        botReplyWithTyping(
          `⏱️ Looks like you're away. We'll end this RSVP session for now. You can start again anytime. 😊`
        );
        sessionEnded = true;
        idleStage = 0;
        clearTimeout(idleTimer); // ✅ Prevent any remaining timers
      }
    },
    idleStage === 0 ? 2 * 60 * 1000 : 3 * 60 * 1000
  ); // 2 mins then 3 mins
}

function isValidName(name) {
  const trimmed = name.trim();

  // Always allow these real names
  const allowList = ["kerthyllaine", "zaynab faith kerthyllaine"];
  if (allowList.includes(trimmed.toLowerCase())) return true;

  if (trimmed.length < 2 || trimmed.length > 30) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;

  const vowels = (trimmed.match(/[aeiou]/gi) || []).length;
  const consonants = (trimmed.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;

  if (vowels === 0 || consonants === 0) return false;

  // Avoid 4+ vowels or consonants in a row
  if (/(?:[aeiou]{4,}|[bcdfghjklmnpqrstvwxyz]{4,})/i.test(trimmed))
    return false;

  // Avoid fully lowercase, no space names like "oiuyrewq"
  if (trimmed === trimmed.toLowerCase() && !trimmed.includes(" ")) return false;

  return true;
}

// Format timestamp (e.g. 03:45 PM)
function formatTime(date) {
  const options = { hour: "2-digit", minute: "2-digit" };
  return date.toLocaleTimeString([], options);
}

// Add message to chat box (supports avatars, pop sound, typing dots, and timestamps)
function addMessage(text, sender = "bot", isTyping = false) {
  const wrapper = document.createElement("div");
  const time = formatTime(new Date());

  const messageWrapper = document.createElement("div");
  messageWrapper.classList.add("message-wrapper");
  if (sender === "user") {
    messageWrapper.classList.add("user-wrapper");
  } else {
    messageWrapper.classList.add("bot-wrapper");
  }

  const messageBubble = document.createElement("div");
  messageBubble.classList.add("message", sender);

  if (isTyping) {
    messageBubble.classList.add("typing");
    messageBubble.innerHTML = `
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>`;
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
    } catch (err) {
      // Ignore autoplay restrictions
    }
  }

  return wrapper;
}

// Bot types, then replies
function botReplyWithTyping(text, delay = 1000) {
  const typingBubble = addMessage("", "bot", true); // Typing bubble (no sound)

  setTimeout(() => {
    typingBubble.remove(); // Remove typing bubble
    addMessage(text, "bot"); // Real message, with sound
  }, delay);
}

// User submits message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const userText = input.value.trim();
  if (!userText) return;

  addMessage(userText, "user");
  input.value = "";

  // If session already ended, reject any more name entries
  if (sessionEnded || !didClickRSVP()) {
    botReplyWithTyping(
      "Hi! To RSVP, please click the RSVP button on our website first so we can properly record your names. 😊"
    );
    return;
  }

  setTimeout(() => {
    respond(userText);
    resetIdleTimer();
    idleStage = 0; // User is active again
  }, 600);
});

// Bot replies
function respond(userText) {
  const lower = userText.toLowerCase();

  // Handle "no" to end session
  if (lower === "no" || lower === "nope" || lower === "none") {
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
      sessionEnded = true; // end session here
      idleStage = 0;
      clearTimeout(idleTimer);
    }
    return;
  }

  // Check if the input is a valid name
  if (!isValidName(userText)) {
    botReplyWithTyping(
      "Hmm... that doesn’t look like a valid name. Could you double-check and try again? 😊"
    );
    return;
  }

  // Check for duplicates (case-insensitive)
  const nameExists = guestNames.some(
    (name) => name.toLowerCase() === userText.toLowerCase()
  );

  if (nameExists) {
    botReplyWithTyping(
      "🚫 That name is already on the list! Please add someone else."
    );
    return;
  }

  // Add valid name
  guestNames.push(userText);

  // Send to Google Sheets
  fetch(
    "https://script.google.com/macros/s/AKfycbygESvO7L5It0tL-Sx4e9LFnV9u5-8kL7fL6CnhQM6O9c__xNj5CJ1CsBs8TfCIFxla7g/exec",
    {
      method: "POST",
      mode: "no-cors", // ✅ This skips preflight
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: userText }),
    }
  );

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

// Check if RSVP was clicked (URL has ?rsvp=true)
function didClickRSVP() {
  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get("rsvp");
  return value === "1" || value === "true";
}

// Start chat on page load
window.onload = () => {
  if (didClickRSVP()) {
    botReplyWithTyping(
      `💌 Greetings!\n\nYou are invited to the wedding of Voughn and Emelyn.\n\nPlease let us know if you can come.\nJust reply with your names so we can save your seats and prepare your table.\n\nThank you, and we’re excited to celebrate this special day with you! 💕`,
      1500
    );

    // Start idle timer after greeting
    setTimeout(() => {
      resetIdleTimer();
    }, 1600); // Slightly longer than typing delay
  } else {
    botReplyWithTyping(
      `Hi! To RSVP, please click the RSVP button on our website first so we can properly record your names. 😊`,
      1000
    );
  }
};
