function escapeHtml(text) {
  if (text == null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStatus(message) {
  const root = document.getElementById("app");
  if (!root) return;
  const isLoading = /analyzing|loading/i.test(message);
  root.innerHTML = `
    <h1>Detect Rage Bait</h1>
    <div class="status-row">
      ${
        isLoading
          ? '<span class="spinner" aria-hidden="true"></span>'
          : ""
      }
      <p class="status-message">${escapeHtml(message)}</p>
    </div>
  `;
}

function renderProfile(profile, scoreState) {
  const root = document.getElementById("app");
  if (!root) return;

  const {
    displayName,
    handle,
    bio,
    location,
    joined,
    following,
    followers,
    relationshipNote,
  } = profile;

  const hasScore = !!scoreState;
  const scoreStatus = hasScore ? scoreState.status : null;
  const scoreLabel = hasScore ? scoreState.label : null;

  let scoreText;
  let scoreClass;
  let statusText;
  let showSpinner;

  if (scoreStatus === "ready") {
    if (scoreLabel === "engage") {
      scoreText = "Engage (green)";
      scoreClass = "score-pill--engage";
    } else if (scoreLabel === "rage") {
      scoreText = "Ragebait (red)";
      scoreClass = "score-pill--rage";
    } else {
      scoreText = "Maybe (yellow)";
      scoreClass = "score-pill--maybe";
    }
    statusText = "Analysis complete.";
    showSpinner = false;
  } else if (scoreStatus === "error") {
    scoreText = "No score available.";
    scoreClass = "score-pill--error";
    statusText = "Unable to score this account.";
    showSpinner = false;
  } else {
    scoreText = "Analyzing account…";
    scoreClass = "score-pill--pending";
    statusText = "Analyzing account with AI…";
    showSpinner = true;
  }

  root.innerHTML = `
    <h1>Detect Rage Bait</h1>
    <div class="status-row">
      ${
        showSpinner
          ? '<span class="spinner" aria-hidden="true"></span>'
          : ""
      }
      <p class="status-message${showSpinner ? " status-message--muted" : ""}">
        ${escapeHtml(statusText)}
      </p>
    </div>
    <div class="score-row">
      <span class="score-label">Account rating</span>
      <span class="score-pill ${escapeHtml(scoreClass)}">${escapeHtml(
        scoreText
      )}</span>
    </div>
    <div class="profile">
      <div class="profile-header">
        <div class="profile-name">${escapeHtml(displayName || "")}</div>
        <div class="profile-handle">${escapeHtml(handle || "")}</div>
      </div>
      ${
        bio
          ? `<div class="profile-bio">${escapeHtml(bio)}</div>`
          : ""
      }
      <div class="profile-meta">
        ${
          location
            ? `<span class="profile-meta-item">${escapeHtml(location)}</span>`
            : ""
        }
        ${
          joined
            ? `<span class="profile-meta-item">${escapeHtml(joined)}</span>`
            : ""
        }
      </div>
      <div class="profile-stats">
        ${
          following
            ? `<span class="profile-stat"><strong>${escapeHtml(
                following
              )}</strong> Following</span>`
            : ""
        }
        ${
          followers
            ? `<span class="profile-stat"><strong>${escapeHtml(
                followers
              )}</strong> Followers</span>`
            : ""
        }
      </div>
      ${
        relationshipNote
          ? `<div class="profile-note">${escapeHtml(relationshipNote)}</div>`
          : ""
      }
    </div>
  `;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function requestProfileInfo(tabId) {
  return new Promise((resolve, reject) => {
    console.log("[DRB] Requesting profile info from tab", tabId);
    chrome.tabs.sendMessage(
      tabId,
      { type: "DRB_GET_PROFILE_INFO" },
      (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          console.warn("[DRB] Error requesting profile info", error);
          reject(error);
          return;
        }
        console.log("[DRB] Received profile response", response);
        resolve(response && response.profile ? response.profile : null);
      }
    );
  });
}

async function requestRecentPosts(tabId) {
  return new Promise((resolve, reject) => {
    console.log("[DRB] Requesting recent posts from tab", tabId);
    chrome.tabs.sendMessage(
      tabId,
      { type: "DRB_GET_RECENT_POSTS" },
      (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          console.warn("[DRB] Error requesting recent posts", error);
          reject(error);
          return;
        }
        console.log("[DRB] Received recent posts response", response);
        resolve(response && response.posts ? response.posts : []);
      }
    );
  });
}

async function requestProfileScore(profile, posts) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "DRB_SCORE_PROFILE",
        profile,
        posts,
      },
      (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          console.warn("[DRB] Error requesting profile score", error);
          resolve({ ok: false, error: error.message || "Runtime error" });
          return;
        }
        if (!response) {
          resolve({ ok: false, error: "No response from background" });
          return;
        }
        resolve(response);
      }
    );
  });
}

async function initPopup() {
  renderStatus("Analyzing profile…");

  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id || !tab.url) {
      renderStatus("Open an X profile page, then try again.");
      return;
    }

    let isXProfileCandidate = false;
    try {
      const url = new URL(tab.url);
      const host = url.hostname.toLowerCase();
      isXProfileCandidate =
        host === "x.com" ||
        host === "twitter.com" ||
        host.endsWith(".x.com") ||
        host.endsWith(".twitter.com");
    } catch (_err) {
      isXProfileCandidate = false;
    }

    if (!isXProfileCandidate) {
      renderStatus("Open an X profile page, then try again.");
      return;
    }

    const [profile, posts] = await Promise.all([
      requestProfileInfo(tab.id),
      requestRecentPosts(tab.id),
    ]);

    console.log("[DRB] Profile in popup", profile);
    console.log("[DRB] Recent posts in popup", posts);

    if (!profile || !profile.displayName) {
      renderStatus("Open an X profile page, then try again.");
      return;
    }

    renderProfile(profile, { status: "loading" });

    const scoreResult = await requestProfileScore(profile, posts);

    if (!scoreResult.ok) {
      console.warn("[DRB] Scoring failed", scoreResult.error);
      renderProfile(profile, { status: "error" });
      return;
    }

    const level =
      scoreResult.score === "engage" || scoreResult.score === "rage"
        ? scoreResult.score
        : "maybe";

    renderProfile(profile, { status: "ready", label: level });

    try {
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "DRB_SET_PROFILE_SCORE",
          level,
        },
        () => {
          const error = chrome.runtime.lastError;
          if (error) {
            console.warn("[DRB] Error sending score to content script", error);
          }
        }
      );
    } catch (err) {
      console.warn("[DRB] Failed to send score to content script", err);
    }
  } catch (err) {
    renderStatus("Unable to read profile on this page.");
  }
}

document.addEventListener("DOMContentLoaded", initPopup);
