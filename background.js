import { channelConfig } from "./config.js";

// For each channel, store initialization status and last processed message ID.
const channelStatus = {};
channelConfig.forEach(ch => {
  channelStatus[ch.id] = { initialized: false, lastProcessed: 0 };
});

// Automatically ensure a Telegram tab is open for each allowed channel.
// We open each tab in inactive and pinned mode so they remain open in the background.
function ensureTelegramTabs() {
  channelConfig.forEach(channel => {
    chrome.tabs.query({ url: "https://web.telegram.org/*" }, (tabs) => {
      const exists = tabs.some(tab => tab.url && tab.url.includes(channel.id));
      if (!exists) {
        const url = `https://web.telegram.org/a/#${channel.id}`;
        console.log(`No tab for channel ${channel.id} found. Opening new tab: ${url}`);
        chrome.tabs.create({ url, active: false, pinned: true });
      } else {
        console.log(`Channel ${channel.id} tab already open.`);
      }
    });
  });
}

// Returns the channel ID if the URL contains one of the allowed channel IDs.
function getChannelIdFromUrl(url) {
  for (const ch of channelConfig) {
    if (url.includes(ch.id)) {
      return ch.id;
    }
  }
  return null;
}

// Injects a script into a Telegram tab to extract bonus codes along with their message IDs.
function scanTabForCodes(tab, channelId) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: function() {
      let results = [];
      // Adjust this selector if Telegram Web’s DOM changes.
      const messages = document.querySelectorAll(".Message");
      messages.forEach(msgElem => {
        const msgIdStr = msgElem.getAttribute("data-message-id");
        if (msgIdStr) {
          const messageId = parseInt(msgIdStr, 10);
          const textElem = msgElem.querySelector(".text-content");
          if (textElem && textElem.textContent.includes("Code:")) {
            const codeEl = msgElem.querySelector(".text-entity-code");
            if (codeEl) {
              const code = codeEl.textContent.trim();
              results.push({ code: code, messageId: messageId });
            }
          }
        }
      });
      return results;
    }
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error(`Error executing script in tab ${tab.id}:`, chrome.runtime.lastError);
      return;
    }
    if (!results || !results[0] || !results[0].result) return;
    const found = results[0].result;
    let maxFoundId = 0;
    found.forEach(item => {
      if (item.messageId > maxFoundId) {
        maxFoundId = item.messageId;
      }
    });
    // On the first scan for this channel, initialize and ignore old messages.
    if (!channelStatus[channelId].initialized) {
      channelStatus[channelId].lastProcessed = maxFoundId;
      channelStatus[channelId].initialized = true;
      console.log(`Channel ${channelId} initialized with lastProcessed = ${maxFoundId}`);
      return;
    }
    // Process only messages with IDs greater than the last processed.
    const newItems = found.filter(item => item.messageId > channelStatus[channelId].lastProcessed);
    if (newItems.length > 0) {
      const maxNewId = Math.max(...newItems.map(item => item.messageId));
      newItems.forEach(item => {
        console.log(`New code in channel ${channelId}: ${item.code} (messageId: ${item.messageId})`);
        claimCode(item.code);
      });
      channelStatus[channelId].lastProcessed = maxNewId;
    }
  });
}

// Scans all open Telegram Web tabs for new bonus codes.
function scanTelegramForCodes() {
  chrome.tabs.query({ url: "https://web.telegram.org/*" }, (tabs) => {
    if (tabs.length === 0) {
      console.log("No Telegram Web tab found.");
      ensureTelegramTabs();
      return;
    }
    // Only consider tabs whose URL contains one of the allowed channel IDs.
    const allowedTabs = tabs.filter(tab => getChannelIdFromUrl(tab.url) !== null);
    console.log(`Scanning ${allowedTabs.length} allowed Telegram tab(s).`);
    allowedTabs.forEach(tab => {
      const channelId = getChannelIdFromUrl(tab.url);
      console.log(`Scanning tab ${tab.id} for channel ${channelId} (URL: ${tab.url})`);
      scanTabForCodes(tab, channelId);
    });
  });
}

// Constructs the claim URL and opens it if automation is enabled.
function claimCode(code) {
  chrome.storage.local.get("automationEnabled", (data) => {
    if (data.automationEnabled) {
      const claimUrl = `https://stake.bet/settings/offers?app=CodeClaim&type=drop&code=${encodeURIComponent(code)}&modal=redeemBonus`;
      console.log("Claiming code", code, "with URL:", claimUrl);
      chrome.tabs.create({ url: claimUrl });
    } else {
      console.log("Automation disabled. Not claiming code:", code);
    }
  });
}

// Ensure that Telegram tabs exist for all allowed channels.
ensureTelegramTabs();

// Periodically scan every 5 seconds.
setInterval(scanTelegramForCodes, 5000);

console.log("Background script initialized. Listening for new messages on channels:", channelConfig);
