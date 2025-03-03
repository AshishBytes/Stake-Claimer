document.addEventListener("DOMContentLoaded", () => {
  const defaultConfig = {
  automationEnabled: false,
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
    "https://staketr.com",
  ],
  activeStakeDomain: "https://stake.ceo",
  historyLog: [],
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
  document.getElementById("automationStatus").innerText =
    config.automationEnabled ? "Enabled" : "Disabled";
  document.getElementById("channelIds").value = config.channelIds.join(", ");

  const stakeDomainSelect = document.getElementById("stakeDomain");
  stakeDomainSelect.innerHTML = "";
  config.stakeDomains.forEach((domain) => {
    const option = document.createElement("option");
    option.value = domain;
    option.text = domain;
    if (domain === config.activeStakeDomain) option.selected = true;
    stakeDomainSelect.appendChild(option);
  });

  const historyDiv = document.getElementById("history");
  historyDiv.innerHTML = "";
  if (config.historyLog && config.historyLog.length > 0) {
    config.historyLog.slice().reverse().forEach((entry) => {
      const p = document.createElement("p");
      p.innerText = `[${new Date(entry.timestamp).toLocaleString()}] Code: ${entry.code} | URL: ${entry.claimUrl}`;
      historyDiv.appendChild(p);
    });
  } else {
    historyDiv.innerText = "No history yet.";
  }
}

document.getElementById("enable").addEventListener("click", () => {
  loadConfig((config) => {
    config.automationEnabled = true;
    saveConfig(config, () => {
      document.getElementById("automationStatus").innerText = "Enabled";
      console.log("Automation enabled.");
      populateFields(config);
    });
  });
});

document.getElementById("disable").addEventListener("click", () => {
  loadConfig((config) => {
    config.automationEnabled = false;
    saveConfig(config, () => {
      document.getElementById("automationStatus").innerText = "Disabled";
      console.log("Automation disabled.");
      populateFields(config);
    });
  });
});

document.getElementById("saveConfig").addEventListener("click", () => {
  loadConfig((config) => {
    const channelIdsStr = document.getElementById("channelIds").value;
    config.channelIds = channelIdsStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    const stakeDomainSelect = document.getElementById("stakeDomain");
    config.activeStakeDomain = stakeDomainSelect.value;
    saveConfig(config, () => {
      console.log("Configuration saved.");
      populateFields(config);
    });
  });
});

document.getElementById("resetConfig").addEventListener("click", () => {
  chrome.storage.local.set({ config: defaultConfig }, () => {
    console.log("Configuration reset to defaults.");
    populateFields(defaultConfig);
  });
});

document.getElementById("clearHistory").addEventListener("click", () => {
  loadConfig((config) => {
    config.historyLog = [];
    saveConfig(config, () => {
      console.log("History log cleared.");
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

function updateLiveStatus() {
  chrome.storage.local.get(["lastScanTime", "lastClaimedTime"], (result) => {
    const scanTime = result.lastScanTime ? new Date(result.lastScanTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
    const claimTime = result.lastClaimedTime ? new Date(result.lastClaimedTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
    document.getElementById("liveStatus").innerText =
      "Last Scan: " + scanTime + "\n" +
      "Last Claim: " + claimTime;
  });
}
setInterval(updateLiveStatus, 1000);


// -------------------------------
// Update Check Feature (Commits)
// -------------------------------

// Get update elements from the popup
const updateBtn = document.getElementById('updateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const updateStatus = document.getElementById('updateStatus');

// GitHub repository details – update these with your values
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// The current commit hash your extension is built on.
// Update this value during your build/release process.
const CURRENT_COMMIT = process.env.CURRENT_COMMIT; // Replace with your actual commit hash

async function checkForUpdates() {
  updateStatus.textContent = 'Checking for new commits...';
  try {
    // Fetch the latest commit from the main branch (adjust branch name if needed)
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?sha=main&per_page=1`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch commit info');
    }
    const commits = await response.json();
    if (!commits || commits.length === 0) {
      throw new Error('No commits found');
    }
    const latestCommit = commits[0];
    const latestCommitSha = latestCommit.sha;
    if (latestCommitSha !== CURRENT_COMMIT) {
      updateStatus.textContent = `New commit available: ${latestCommitSha.substring(0,7)}`;
      downloadBtn.style.display = 'block';
    } else {
      updateStatus.textContent = 'You are up-to-date with the latest commit.';
      downloadBtn.style.display = 'none';
    }
  } catch (err) {
    console.error('Error checking for new commits:', err);
    updateStatus.textContent = 'Error checking for new commits.';
    downloadBtn.style.display = 'none';
  }
}

function downloadUpdate() {
  // Open the URL to download the latest main branch as a ZIP archive
  const archiveUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/archive/refs/heads/main.zip`;
  window.open(archiveUrl, '_blank');
}

updateBtn.addEventListener('click', checkForUpdates);
downloadBtn.addEventListener('click', downloadUpdate);

});