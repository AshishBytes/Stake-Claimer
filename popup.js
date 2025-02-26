const defaultConfig = {
  automationEnabled: true,
  channelIds: ["-1002239669640"],
  stakeDomains: [
    "https://stake.com",
    "https://stake1001.com",
    "https://stake1002.com",
    "https://stake1003.com",
    "https://stake1004.com",
    "https://stake1020.com",
    "https://stake1021.com",
    "https://stake1022.com",
    "https://stake1023.com",
    "https://stake.pet",
    "https://stakeru8.com",
    "https://stake.jp",
    "https://stake.bz",
    "https://stake.coach",
    "https://stake.pink",
    "https://stake.ac",
    "https://stake.games",
    "https://stake.bet",
    "https://stake.mba",
    "https://stake.ceo",
    "https://stake.krd",
    "https://stake.blue",
    "https://stake.mg",
    "https://stake.tel",
    "https://stake.horse",
    "https://stake.us",
    "https://staketr.com"
  ],
  activeStakeDomain: "https://stake.ceo",
  historyLog: []
};

function loadConfig(callback) {
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

function populateFields(config) {
  document.getElementById("automationStatus").innerText = config.automationEnabled ? "Enabled" : "Disabled";
  document.getElementById("channelIds").value = config.channelIds.join(", ");
  
  const stakeDomainSelect = document.getElementById("stakeDomain");
  stakeDomainSelect.innerHTML = "";
  config.stakeDomains.forEach(domain => {
    const option = document.createElement("option");
    option.value = domain;
    option.text = domain;
    if (domain === config.activeStakeDomain) option.selected = true;
    stakeDomainSelect.appendChild(option);
  });
  
  const historyDiv = document.getElementById("history");
  historyDiv.innerHTML = "";
  if (config.historyLog && config.historyLog.length > 0) {
    config.historyLog.slice().reverse().forEach(entry => {
      const p = document.createElement("p");
      p.innerText = `[${new Date(entry.timestamp).toLocaleString()}] Code: ${entry.code} | URL: ${entry.claimUrl}`;
      historyDiv.appendChild(p);
    });
  } else {
    historyDiv.innerText = "No history yet.";
  }
}

document.getElementById("enable").addEventListener("click", () => {
  loadConfig(config => {
    config.automationEnabled = true;
    saveConfig(config, () => {
      document.getElementById("automationStatus").innerText = "Enabled";
      console.log("Automation enabled.");
      populateFields(config);
    });
  });
});

document.getElementById("disable").addEventListener("click", () => {
  loadConfig(config => {
    config.automationEnabled = false;
    saveConfig(config, () => {
      document.getElementById("automationStatus").innerText = "Disabled";
      console.log("Automation disabled.");
      populateFields(config);
    });
  });
});

document.getElementById("saveConfig").addEventListener("click", () => {
  loadConfig(config => {
    const channelIdsStr = document.getElementById("channelIds").value;
    config.channelIds = channelIdsStr.split(",").map(s => s.trim()).filter(s => s);
    const stakeDomainSelect = document.getElementById("stakeDomain");
    config.activeStakeDomain = stakeDomainSelect.value;
    saveConfig(config, () => {
      console.log("Configuration saved.");
      populateFields(config);
    });
  });
});

loadConfig(populateFields);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.config) {
    loadConfig(populateFields);
  }
});
