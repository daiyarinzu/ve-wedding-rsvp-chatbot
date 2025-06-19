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

let maxSeats = null; // Total allowed seats (from user input)
let awaitingSeatCount = true; // Are we waiting for the user to send the seat count?

let awaitingConfirmation = false;
let partialConfirmationShown = false;

// JSONBin API (used to store and fetch names)
const JSONBIN_API_URL = "https://api.jsonbin.io/v3/b/684fb7ec8561e97a5025038b";
const JSONBIN_API_KEY =
  "$2a$10$M.xkZjGz0DiD595oDUW9SeM8MrkagJMaBA4oxqjAHxc8jesa/x/Zu";

// Global language setting
let selectedLang = "en"; // default language

// All translatable bot messages
const messages = {
  greeting: {
    en: "💌 Greetings!\n\nYou are invited to the wedding of Voughn and Emelyn!\n\nBased on the number of seats shown in your electronic invitation, kindly tell us how many guest(s) will be attending. 😊",
    tl: "💌 Kumusta!\n\nInaanyayahan ka sa kasal nina Voughn at Emelyn!\n\nBatay sa bilang ng upuan sa iyong imbitasyong digital, ilan po ang inaasahang dadalo? 😊",
    bis: "💌 Kumusta!\n\nGiinbitahan ka sa kasal ni Voughn ug Emelyn!\n\nBase sa gidaghanon sa lingkuranan sa imong online na imbitasyon, pila kabuok ang moanhi? 😊",
  },
  mustUseRSVPButton: {
    en: "Hi! To RSVP, please click the RSVP button on our website first so we can properly record your names. 😊",
    tl: "Hi! Para makapag-RSVP, pakiclick muna ang RSVP button sa aming website para maitala namin nang maayos ang mga pangalan. 😊",
    bis: "Hi! Para mag-RSVP, palihug i-click una ang RSVP button sa among website aron ma-record namo sakto ang inyong mga ngalan. 😊",
  },
  seatCountConfirmed: {
    en: "Great! You may now RSVP up to {count} {guests}.\n\nPlease reply with the guest(s) full name one by one. 😊",
    tl: "Ayos! Maaari ka nang mag-RSVP ng hanggang {count} {guests}.\n\nPaki-reply ang buong pangalan ng bawat bisita isa-isa. 😊",
    bis: "Sige! Pwede naka mag-RSVP og hangtod {count} ka {guests}.\n\nPalihug i-reply ang full name sa matag-usa ka bisita. 😊",
  },
  guest: {
    en: "guest",
    tl: "bisita",
    bis: "bisita",
  },
  guests: {
    en: "guests",
    tl: "mga bisita",
    bis: "mga bisita",
  },
  invalidSeatCount: {
    en: "⚠️ Please enter a valid number of seats (1–10).",
    tl: "⚠️ Pakilagay po ang tamang bilang ng upuan (1–10).",
    bis: "⚠️ Palihug isulat ang sakto nga ihap sa lingkuranan (1–10).",
  },
  invalidName: {
    en: "Hmm... that doesn’t look like a valid name or a FULL name. Could you double-check and try again? 😊",
    tl: "Hmm... parang hindi valid ang pangalan o hindi buo. Paki-check po ulit at subukang muli. 😊",
    bis: "Hmm... murag dili valid o dili kumpleto ang pangalan. Palihug i-check ug usba. 😊",
  },
  duplicateName: {
    en: "🚫 That guest has already RSVP’d. Please enter other names. Thank you! 😊",
    tl: "🚫 Nakapag-RSVP na po ang pangalang iyan. Pakilagay po ang ibang pangalan. Salamat! 😊",
    bis: "🚫 Nakapa-RSVP na na nga ngalan. Palihug sulati ang laing ngalan. Salamat! 😊",
  },
  allNamesCollected: {
    en: '🎉 Thank you! Here are the name(s) you\'ve sent us:<br><br>{names}<br><br>Can you double check if everything is correct? Please reply "Yes" or "No".',
    tl: '🎉 Salamat po! Narito ang mga pangalan na inyong ibinigay:<br><br>{names}<br><br>Pakisuri po kung tama lahat. Pakisagot ng "Yes" o "No".',
    bis: '🎉 Salamat kaayo! Mao ni ang mga pangalan nga inyong gi-submit:<br><br>{names}<br><br>Palihug i-check kung sakto ba tanan. Tubaga lang og "Yes" o "No".',
  },
  rsvpSaved: {
    en: "🎉 Thank you! We've recorded all {count} guest name{plural}.<br><br>We kindly ask that these seats are joyfully filled on the day of the event, so the heartfelt efforts and careful preparations of the bride and groom can be fully cherished. 😊<br><br>Looking forward to seeing you! 💖",
    tl: "🎉 Maraming salamat! Naitala na po namin ang lahat ng {count} {plural}.<br><br>Inaasahan po namin na ang mga upuang ito ay masayang mapupuno sa araw ng kasal upang ang masusing paghahanda ng bride at groom ay tunay na mapahalagahan. 😊<br><br>Excited na po kaming makita kayo! 💖",
    bis: "🎉 Daghang salamat! Among natala ang tanan {count} {plural}.<br><br>Nagpaabot mi nga malipayong mapuno ang mga lingkuranan sa adlaw sa kasal, aron ang gugma ug paningkamot sa bride ug groom mapanggaon gyud. 😊<br><br>Excited na kaayo mi makakita ninyo! 💖",
  },
  rsvpSaveError: {
    en: "⚠️ Something went wrong while saving your RSVP. Please try again later.",
    tl: "⚠️ Nagka-problema sa pag-save ng RSVP. Subukan ulit mamaya.",
    bis: "⚠️ Naay problema sa pag-save sa RSVP. Palihug suwayi og balik unya.",
  },
  reenterNames: {
    en: "No problem! Please re-enter the names one by one. 😊",
    tl: "Walang problema! Pakienter na lang po ulit ang mga pangalan isa-isa. 😊",
    bis: "Walay problema! Palihug isulat balik ang mga ngalan usa-usa. 😊",
  },
  maxNamesReached: {
    en: "✅ You've already added {count} {guests}. If you need to make changes, please message us directly. 😊",
    tl: "✅ Naitala na ang {count} {guests}. Kung may babaguhin, pakimesahe na lang po kami. 😊",
    bis: "✅ Nakadugang naka og {count} ka {guests}. Kung naay usbon, palihug i-message lang mi. 😊",
  },
  idleCheckIn: {
    en: "👋 Just checking in — are you still there? You can keep adding names or reply 'No' to finish.",
    tl: "👋 Kumusta? Nandiyan ka pa ba? Pwede ka pa magdagdag ng pangalan o mag-reply ng 'No' para matapos.",
    bis: "👋 Kumusta? Ania pa ba ka? Pwede pa ka magdugang og ngalan o mag-reply og 'No' para matapos.",
  },
  idleTimeout: {
    en: "⏱️ Looks like you're away. We'll end this RSVP session for now. You can start again anytime. 😊",
    tl: "⏱️ Mukhang wala ka na. Tatapusin na namin ang RSVP session. Pwede kang magsimula ulit anytime. 😊",
    bis: "⏱️ Murag wala naka. Tapuson na namo ang RSVP session karon. Pwede ka magsugod balik anytime. 😊",
  },
  partialList: {
    en: "🎉 Thank you! Here are the name(s) you've sent us:<br><br>{names}<br><br>You still have {remaining} seat(s) left. Please enter {needed} or reply 'No' to finish.",
    tl: "🎉 Salamat po! Narito ang mga pangalan na inyong ibinigay:<br><br>{names}<br><br>May natitira pa kayong {remaining} upuan. Pakienter na lang po ang {needed} o mag-reply ng 'No' para matapos.",
    bis: "🎉 Salamat kaayo! Mao ni ang mga pangalan nga inyong gi-submit:<br><br>{names}<br><br>Naay nabilin nga {remaining} ka lingkuranan. Palihug isulat ang {needed} o mag-reply og 'No' para matapos.",
  },
  moreNames: {
    en: {
      one: "one more name",
      many: "{count} more names",
    },
    tl: {
      one: "isang pangalan pa",
      many: "{count} pang pangalan",
    },
    bis: {
      one: "usa ka ngalan pa",
      many: "{count} pa ka ngalan",
    },
  },
  moreNamesPrompt: {
    en: [
      "✅ Got it! You still have {remaining} {seats}. Please add more name(s).",
      "👍 Name saved. {remaining} {seats} left — feel free to add another guest.",
      "📌 Noted! {remaining} more {seats} available. Who else is coming?",
      "👌 Thanks! We’re expecting {remaining} more guest(s). Kindly type their name.",
      "📝 All set! {remaining} open {seats} to fill. Add another name when ready.",
    ],
    tl: [
      "✅ Salamat! May natitira pa kayong {remaining} {seats}. Paki-enter na lang po ang karagdagang pangalan.",
      "👍 Naka-save na. {remaining} {seats} pa po ang bakante. Maaari pang magdagdag ng pangalan.",
      "📌 Noted! May {remaining} {seats} pang natitira. Sino pa po ang kasama ninyo?",
      "👌 Sige po! Inaasahan pa ang {remaining} pang bisita. Pakitype po ang pangalan.",
      "📝 Ayos na! May {remaining} {seats} pa po. Ilagay na lang po ang pangalan kung sino pa ang kasama.",
    ],
    bis: [
      "✅ Nakuha na! Naay nabilin nga {remaining} ka {seats}. Palihug i-dugang ang pangalan.",
      "👍 Nasave na. {remaining} ka {seats} pa ang bakante. Kinsay sunod nga muapil?",
      "📌 Okay! {remaining} pa ka {seats} ang kuwang. Palihug sulati ang pangalan.",
      "👌 Salamat! Gipaabot pa nato ang {remaining} ka bisita. Isulat ilang ngalan.",
      "📝 Kumpleto na ang record. Naa pay {remaining} ka {seats}. I-type lang ang sunod nga pangalan.",
    ],
  },
  seats: {
    en: "seats",
    tl: "upuan",
    bis: "lingkuranan",
  },
  seat: {
    en: "seat",
    tl: "upuan",
    bis: "lingkuranan",
  },
  noRSVP: {
    en: "No problem! Let us know if you change your mind. 😊",
    tl: "Walang problema! Sabihin lang po kung magbabago ang desisyon ninyo. 😊",
    bis: "Walay problema! Ingna lang mi kung mausab imong huna-huna. 😊",
  },
};

// Wait for language selection before starting chat
document.querySelectorAll(".lang-btn").forEach((button) => {
  button.addEventListener("click", (e) => {
    const lang = button.getAttribute("data-lang");
    selectedLang = lang;

    // Hide the language buttons
    document.getElementById("lang-buttons").style.display = "none";

    // Show the chat container
    document.querySelector(".chat-container").classList.add("active");

    // Start the chat if valid RSVP link
    if (didClickRSVP()) {
      botReplyWithTyping(getMessage("greeting"), 1500);
      setTimeout(() => resetIdleTimer(), 2000);
      setTimeout(() => {
        scrollToBottom();
      }, 2500);
    } else {
      botReplyWithTyping(getMessage("mustUseRSVPButton"), 1000);
    }
  });
});

// Helper to pick a random item (used for random replies)
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Capitalize names properly
function capitalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getMessage(key, replacements = {}) {
  let template = messages[key]?.[selectedLang] || messages[key]?.en || "";
  for (const [k, v] of Object.entries(replacements)) {
    template = template.replaceAll(`{${k}}`, v);
  }
  return template;
}

function getNamePlural(count) {
  switch (selectedLang) {
    case "tl":
      return count === 1 ? "" : " mga pangalan";
    case "bis":
      return count === 1 ? "" : " ka mga pangalan";
    default:
      return count === 1 ? "" : "s"; // English
  }
}

function getMoreNames(count) {
  if (count === 1) {
    return messages.moreNames[selectedLang].one;
  } else {
    return messages.moreNames[selectedLang].many.replace("{count}", count);
  }
}

function botReplyWithTyping(message, delay = 1000) {
  console.log("🤖 Bot replying with message:", message); // <--- ADD THIS
  const typingBubble = addMessage("", "bot", true);
  setTimeout(() => {
    typingBubble.remove();
    addMessage(message, "bot");
    scrollToBottom();
  }, delay);
}

// Reset idle timer and send follow-up if user is inactive
function resetIdleTimer() {
  if (sessionEnded) return;
  clearTimeout(idleTimer);

  idleTimer = setTimeout(
    () => {
      if (idleStage === 0) {
        botReplyWithTyping(getMessage("idleCheckIn"));
        idleStage = 1;
        resetIdleTimer(); // Start next stage timer
      } else if (idleStage === 1) {
        botReplyWithTyping(getMessage("idleTimeout"));
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
  const cleaned = name.trim();

  // Allow length up to 120 and minimum of 2 characters
  if (cleaned.length < 2 || cleaned.length > 120) return false;

  // Require at least 2 words
  const wordCount = cleaned.split(/\s+/).length;
  if (wordCount < 2) return false;

  // Accept letters, spaces, accents, hyphens, apostrophes (straight and curly), and periods
  const pattern = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\u0100-\u024F\s.'’\-]+$/u;
  if (!pattern.test(cleaned)) return false;

  // Optional gibberish check: 6+ consonants in a row (weakened to reduce false positives)
  if (/[bcdfghjklmnpqrstvwxyz]{7,}/i.test(cleaned)) return false;

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
  chatBox.appendChild(wrapper);
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

// Fetch RSVP list from JSONBin
async function fetchExistingNames() {
  try {
    const response = await fetch(`${JSONBIN_API_URL}/latest`, {
      headers: { "X-Master-Key": JSONBIN_API_KEY },
    });
    const data = await response.json();
    return data.record.names || [];
  } catch (err) {
    console.error("Error fetching names:", err);
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
    console.error("Error saving names:", err);
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
  setTimeout(scrollToBottom, 300);

  // 🛠️ FIX: Bring input field back into view after sending
  setTimeout(() => {
    input.scrollIntoView({ behavior: "smooth", block: "end" });
  }, 100);

  if (sessionEnded || !didClickRSVP()) {
    botReplyWithTyping(getMessage("mustUseRSVPButton"));
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
  if (awaitingConfirmation) {
    const confirmKeywords = {
      en: ["yes", "yep", "yeah", "correct"],
      tl: ["oo", "opo", "oo nga", "tama"],
      bis: ["oo", "u-o", "sakto", "tama"],
    };

    const lowerConfirm = userText.toLowerCase();
    if (confirmKeywords[selectedLang]?.includes(lowerConfirm)) {
      const existingNames = await fetchExistingNames();
      const newNames = [...existingNames];

      for (const name of guestNames) {
        // Prevent saving duplicates from other users
        if (
          !existingNames
            .map((n) => n.toLowerCase().trim())
            .includes(name.toLowerCase())
        ) {
          newNames.push(name);
        }
      }

      const result = await saveNamesToBin(newNames);
      if (!result) {
        botReplyWithTyping(getMessage("rsvpSaveError"));
        return;
      }

      botReplyWithTyping(
        getMessage("rsvpSaved")
          .replace("{count}", guestNames.length)
          .replace("{plural}", getNamePlural(guestNames.length))
      );

      sessionEnded = true;
      awaitingConfirmation = false;
      clearTimeout(idleTimer);
      return;
    }
  }

  const lower = userText.toLowerCase();

  // Step 1: Handle "no"
  if (["no", "nope", "none"].includes(lower)) {
    if (idleStage === 1 && guestNames.length === 0) {
      botReplyWithTyping(getMessage("noRSVP"));
      sessionEnded = true;
      idleStage = 0;
      clearTimeout(idleTimer);
      return;
    }

    if (guestNames.length === 0) {
      botReplyWithTyping(getMessage("noRSVP"));
      sessionEnded = true;
      idleStage = 0;
      clearTimeout(idleTimer);
      partialConfirmationShown = false;
    } else if (guestNames.length < maxSeats && !partialConfirmationShown) {
      const remaining = maxSeats - guestNames.length;
      const finalList = guestNames.map((name) => `• ${name}`).join("<br>");
      const needed = getMoreNames(remaining);
      botReplyWithTyping(
        getMessage("partialList")
          .replace("{names}", finalList)
          .replace("{remaining}", remaining)
          .replace("{needed}", needed)
      );

      partialConfirmationShown = true;
    } else if (guestNames.length < maxSeats && partialConfirmationShown) {
      const finalList = guestNames.map((name) => `• ${name}`).join("<br>");

      const existingNames = await fetchExistingNames();
      const newNames = [...existingNames];

      for (const name of guestNames) {
        if (
          !existingNames
            .map((n) => n.toLowerCase().trim())
            .includes(name.toLowerCase())
        ) {
          newNames.push(name);
        }
      }

      const result = await saveNamesToBin(newNames);
      if (!result) {
        botReplyWithTyping(getMessage("rsvpSaveError"));
        return;
      }

      botReplyWithTyping(
        getMessage("rsvpSaved")
          .replace("{count}", guestNames.length)
          .replace("{plural}", getNamePlural(guestNames.length))
      );

      sessionEnded = true;
      idleStage = 0;
      clearTimeout(idleTimer);
      partialConfirmationShown = false;
      return;
    } else {
      // User wants to edit the names
      guestNames.length = 0; // Clear the names
      awaitingConfirmation = false;
      botReplyWithTyping(getMessage("reenterNames"));
    }

    return;
  }

  // Step 2: Awaiting seat count
  if (awaitingSeatCount) {
    const seatCount = parseInt(userText);
    if (isNaN(seatCount) || seatCount < 1 || seatCount > 10) {
      botReplyWithTyping(getMessage("invalidSeatCount"));
    } else {
      maxSeats = seatCount;
      awaitingSeatCount = false;
      botReplyWithTyping(
        getMessage("seatCountConfirmed")
          .replace("{count}", maxSeats)
          .replace(
            "{guests}",
            maxSeats > 1 ? getMessage("guests") : getMessage("guest")
          )
      );
    }
    return;
  }

  // Step 3: Already reached max?
  if (guestNames.length >= maxSeats) {
    botReplyWithTyping(
      getMessage("maxNamesReached")
        .replace("{count}", maxSeats)
        .replace(
          "{guests}",
          maxSeats > 1 ? getMessage("guests") : getMessage("guest")
        )
    );
    return;
  }

  // Step 4: Name validation
  if (!isValidName(userText)) {
    botReplyWithTyping(getMessage("invalidName"));
    return;
  }

  const formattedName = userText
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  if (!awaitingConfirmation) {
    const existingNames = await fetchExistingNames();
    const lowerNames = existingNames.map((n) => n.toLowerCase().trim());

    if (lowerNames.includes(formattedName.toLowerCase())) {
      botReplyWithTyping(getMessage("duplicateName"));
      return;
    }
  }

  guestNames.push(formattedName);

  const remaining = maxSeats - guestNames.length;

  if (guestNames.length === maxSeats) {
    const finalList = guestNames.map((name) => `• ${name}`).join("<br>");
    botReplyWithTyping(
      getMessage("allNamesCollected").replace("{names}", finalList)
    );
    awaitingConfirmation = true;
    return;
  }

  // Multilingual dynamic prompt if still seats remaining
  const seatLabel = remaining === 1 ? getMessage("seat") : getMessage("seats");
  const promptTemplate = getRandomItem(getMessage("moreNamesPrompt"));
  const finalReply = promptTemplate
    .replace("{remaining}", remaining)
    .replace("{seats}", seatLabel);

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
  /*if (didClickRSVP()) {
    botReplyWithTyping(getMessage("greeting"), 1500);

    setTimeout(() => {
      resetIdleTimer();
    }, 2000);
  } else {
    botReplyWithTyping(getMessage("mustUseRSVPButton"), 1000);
  }*/

  // ✨ Add a longer timeout to scroll after messages render
  setTimeout(() => scrollToBottom(), 2500); // Give time for bot message animation
};

function scrollToBottom() {
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: "smooth",
  });
}

// Ensure chat is scrolled to bottom on load (especially for mobile)
window.addEventListener("load", () => {
  setTimeout(() => {
    scrollToBottom();
    input.scrollIntoView({ behavior: "smooth", block: "end" });
  }, 1000); // Adjust delay if needed
});

// Re-scroll when keyboard pushes things on mobile
window.addEventListener("resize", () => {
  setTimeout(() => {
    scrollToBottom();
    input.scrollIntoView({ behavior: "smooth", block: "end" });
  }, 300);
});
