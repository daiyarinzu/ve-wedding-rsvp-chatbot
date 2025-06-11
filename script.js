const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const popSound = new Audio("pop.mp3");

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
    popSound.currentTime = 0;
    popSound.play();
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

  setTimeout(() => {
    respond(userText);
  }, 600);
});

// Bot replies
function respond(userText) {
  const lower = userText.toLowerCase();

  if (lower.includes("hello")) {
    botReplyWithTyping("Hi there! May I know your name?");
  } else if (lower.includes("no")) {
    botReplyWithTyping(
      "Thanks for letting us know! Feel free to RSVP anytime."
    );
  } else {
    botReplyWithTyping("Thank you! We’ll save that info for the RSVP.");
  }
}

// Check if RSVP was clicked (URL has ?rsvp=true)
function didClickRSVP() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("rsvp") === "true";
}

// Start chat on page load
window.onload = () => {
  if (didClickRSVP()) {
    botReplyWithTyping(
      `💌 Greetings!\n\nYou are invited to the wedding of Voughn and Emelyn.\n\nPlease let us know if you can come.\nJust reply with your names so we can save your seats and prepare your table.\n\nThank you, and we’re excited to celebrate this special day with you! 💕`,
      1500
    );
  } else {
    botReplyWithTyping(
      `Hi! To RSVP, please click the RSVP button on our website first so we can properly record your names. 😊`,
      1000
    );
  }
};
