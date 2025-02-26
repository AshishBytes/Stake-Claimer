document.getElementById("enable").addEventListener("click", () => {
  chrome.storage.local.set({ automationEnabled: true }, () => {
    document.getElementById("status").innerText = "Automation enabled.";
    console.log("Automation enabled via popup.");
  });
});

document.getElementById("disable").addEventListener("click", () => {
  chrome.storage.local.set({ automationEnabled: false }, () => {
    document.getElementById("status").innerText = "Automation disabled.";
    console.log("Automation disabled via popup.");
  });
});
