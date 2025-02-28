import { defaultConfig } from "./config.js";

function getConfig(callback) {
  chrome.storage.local.get("config", (result) => {
    if (result.config) {
      callback(result.config);
    } else {
      chrome.storage.local.set({ config: defaultConfig }, () => {
        callback(defaultConfig);
      });
    }
  });
}

function saveConfig(config, callback) {
  chrome.storage.local.set({ config }, () => {
    if (callback) callback();
  });
}

let configCache = null;
getConfig((config) => {
  configCache = config;
  console.log("Config loaded:", configCache);
  initChannelStatus();
  ensureTelegramTabs();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.config) {
    configCache = changes.config.newValue;
    console.log("Config updated:", configCache);
    initChannelStatus();
    ensureTelegramTabs();
  }
});

const channelStatus = {};
function initChannelStatus() {
  if (!configCache || !configCache.channelIds) return;
  configCache.channelIds.forEach((id) => {
    if (!channelStatus[id]) {
      channelStatus[id] = { initialized: false, lastProcessed: 0 };
    } else {
      channelStatus[id].initialized = false;
      channelStatus[id].lastProcessed = 0;
    }
  });
}

function ensureTelegramTabs() {
  if (!configCache || !configCache.channelIds) return;
  configCache.channelIds.forEach((channel) => {
    chrome.tabs.query({ url: "*://*.telegram.org/*" }, (tabs) => {
      const exists = tabs.some((tab) => tab.url && tab.url.includes(channel));
      if (!exists) {
        const url = `https://web.telegram.org/a/#${channel}`;
        console.log(`Opening tab for channel ${channel}: ${url}`);
        chrome.tabs.create({ url, active: false, pinned: true });
      } else {
        console.log(`Channel ${channel} already has an open tab.`);
      }
    });
  });
}

function getChannelIdFromUrl(url) {
  if (!configCache || !configCache.channelIds) return null;
  for (const id of configCache.channelIds) {
    if (url.includes(id)) return id;
  }
  return null;
}

function scanTabForCodes(tab, channelId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: function () {
        let results = [];
        const messages = document.querySelectorAll(".Message");
        messages.forEach((msgElem) => {
          const msgIdStr = msgElem.getAttribute("data-message-id");
          if (msgIdStr) {
            const messageId = parseInt(msgIdStr, 10);
            const textElem = msgElem.querySelector(".text-content");
            if (textElem && textElem.textContent.includes("Code:")) {
              const codeEl = msgElem.querySelector(".text-entity-code");
              if (codeEl) {
                const code = codeEl.textContent.trim();
                results.push({ code, messageId });
              }
            }
          }
        });
        return results;
      },
    },
    (results) => {
      if (chrome.runtime.lastError) {
        console.error(`Error in tab ${tab.id}:`, chrome.runtime.lastError);
        return;
      }
      if (!results || !results[0] || !results[0].result) return;
      const found = results[0].result;
      let maxFoundId = 0;
      found.forEach((item) => {
        if (item.messageId > maxFoundId) maxFoundId = item.messageId;
      });
      if (!channelStatus[channelId].initialized) {
        channelStatus[channelId].lastProcessed = maxFoundId;
        channelStatus[channelId].initialized = true;
        console.log(
          `Initialized channel ${channelId} with lastProcessed = ${maxFoundId}`
        );
        return;
      }
      const newItems = found.filter(
        (item) => item.messageId > channelStatus[channelId].lastProcessed
      );
      if (newItems.length > 0) {
        const maxNewId = Math.max(...newItems.map((item) => item.messageId));
        newItems.forEach((item) => {
          console.log(
            `New code in channel ${channelId}: ${item.code} (messageId: ${item.messageId})`
          );
          claimCode(item.code);
        });
        channelStatus[channelId].lastProcessed = maxNewId;
      }
    }
  );
}

function scanTelegramForCodes() {
  if (!configCache || !configCache.channelIds) return;
  chrome.tabs.query({ url: "*://*.telegram.org/*" }, (tabs) => {
    if (tabs.length === 0) {
      console.log("No Telegram Web tabs found. Ensuring tabs...");
      ensureTelegramTabs();
      return;
    }
    const allowedTabs = tabs.filter(
      (tab) => getChannelIdFromUrl(tab.url) !== null
    );
    console.log(`Scanning ${allowedTabs.length} allowed Telegram tab(s).`);
    allowedTabs.forEach((tab) => {
      const channelId = getChannelIdFromUrl(tab.url);
      console.log(
        `Scanning tab ${tab.id} for channel ${channelId} (URL: ${tab.url})`
      );
      scanTabForCodes(tab, channelId);
    });
  });
}

function autoClickBonusButtons(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: function () {
      console.log("Auto-click bonus script injected (separated methods)!");

      const methodsTried = [];

      function trySpecificSelector() {
        methodsTried.push("specific selector");
        const claimButton = document.querySelector(
          "button[type='submit'][data-test='claim-drop']"
        );
        if (claimButton) {
          console.log(
            "Method 1: Specific selector found a button. Clicking it."
          );
          claimButton.click();
          return true;
        }
        const doneButton = document.querySelector(
          "button[type='button'][data-test='claim-bonus-done']"
        );
        if (doneButton) {
          doneButton.click();
          return true;
        }

        console.log("Method 1: Specific selector did not find any button.");
        return false;
      }

      function tryTextSearch() {
        methodsTried.push("text search");
        const start = Date.now();

        const buttons = document.querySelectorAll("button");
        let claimButton = null;
        let dismissButton = null;
        buttons.forEach((btn) => {
          const text = btn.textContent.trim().toLowerCase();
          if (text === "claim bonus") {
            claimButton = btn;
          } else if (text === "dismiss") {
            dismissButton = btn;
          }
        });

        if (claimButton) {
          console.log(
            "Method 2: Text search found 'Claim bonus' button. Clicking it."
          );
          claimButton.click();
          return true;
        }
        console.log("Method 2: Text search did not find 'Claim bonus' button.");
        // if (dismissButton) {
        //   console.log(
        //     "Method 2: Text search found 'Dismiss' button. Clicking it as fallback."
        //   );
        //   dismissButton.click();
        //   return true;
        // }
        if (Date.now() - start > 10000) {
          if (dismissButton) {
            console.log(
              "After waiting, found 'Dismiss' button. Clicking it (code invalid)."
            );
            dismissButton.click();
            clearInterval(interval);
            return;
          }
        }
        console.log("Method 2: Text search did not find any valid button.");
        return false;
      }

      function tryFallback() {
        methodsTried.push("fallback");
        const buttons = document.querySelectorAll("button");
        const fallbackButton = [].find.call(buttons, function (btn) {
          return !btn.hasAttribute("data-modal-close") && !btn.disabled && fallbackButton.innerText.trim() !== "Dismiss";
        });
        if (fallbackButton) {
          console.log("Method 3: Found a button with text:", fallbackButton.innerText.trim());
          console.log("Method 3: Fallback found a button. Clicking it.");

          fallbackButton.click();
          return true;
        }
        console.log("Method 3: Fallback did not find any valid button.");
        return false;
      }

      function runAllMethods() {
        console.log("Running auto-click methods...");
        if (trySpecificSelector()) {
          console.log("Method 1 succeeded. Clearing interval.");
          clearInterval(interval);
          return;
        }
        if (tryTextSearch()) {
          console.log("Method 2 succeeded. Clearing interval.");
          clearInterval(interval);
          return;
        }
        if (tryFallback()) {
          console.log("Method 3 succeeded. Clearing interval.");
          clearInterval(interval);
          return;
        }
        console.log(
          "No valid button was found using any method. Methods tried:",
          methodsTried.join(", ")
        );
      }

      const interval = setInterval(runAllMethods, 1000);

      setTimeout(runAllMethods, 2000);
    },
  });
}

function claimCode(code) {
  if (!configCache || !configCache.activeStakeDomain) return;
  if (configCache.automationEnabled) {
    const claimUrl = `${
      configCache.activeStakeDomain
    }/settings/offers?app=CodeClaim&type=drop&code=${encodeURIComponent(
      code
    )}&modal=redeemBonus`;
    console.log("Claiming code", code, "with URL:", claimUrl);

    chrome.tabs.create({ url: claimUrl }, (newTab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === newTab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          setInterval(() => {
            autoClickBonusButtons(newTab.id);
          }, 4000);
        }
      });
    });

    const entry = { code, timestamp: new Date().toISOString(), claimUrl };
    configCache.historyLog = configCache.historyLog || [];
    configCache.historyLog.push(entry);
    saveConfig(configCache, () => {
      console.log("History log updated.");
    });
  } else {
    console.log("Automation disabled; not claiming code:", code);
  }
}

setInterval(scanTelegramForCodes, 5000);

console.log(
  "Background script initialized. Monitoring channels:",
  configCache ? configCache.channelIds : "none"
);
