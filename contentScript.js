const DRB_BADGE_ATTRIBUTE = "data-drb-badge-attached";

function isOnXProfilePage() {
  try {
    const { hostname, pathname } = window.location;
    const host = hostname.toLowerCase();

    if (
      host !== "x.com" &&
      host !== "twitter.com" &&
      !host.endsWith(".x.com") &&
      !host.endsWith(".twitter.com")
    ) {
      return false;
    }

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return false;

    const first = segments[0].toLowerCase();
    const nonProfileFirstSegments = new Set([
      "home",
      "explore",
      "messages",
      "notifications",
      "settings",
      "i",
      "compose",
      "search",
      "login",
      "signup",
      "tos",
      "privacy",
      "about",
      "help",
      "account",
    ]);

    if (nonProfileFirstSegments.has(first)) {
      return false;
    }

    return true;
  } catch (_e) {
    return false;
  }
}

function createBadge(level = "maybe") {
  const badge = document.createElement("span");
  badge.className = `drb-badge drb-badge--${level}`;

  const dot = document.createElement("span");
  dot.className = "drb-badge__dot";

  const label = document.createElement("span");
  label.className = "drb-badge__label";

  if (level === "engage") {
    label.textContent = "engage";
  } else if (level === "rage") {
    label.textContent = "rage bait";
  } else {
    label.textContent = "maybe";
  }

  badge.appendChild(dot);
  badge.appendChild(label);
  return badge;
}

function setBadgeLevel(userNameNode, level = "maybe") {
  if (!userNameNode) return;

  const normalizedLevel =
    level === "engage" || level === "rage" ? level : "maybe";

  const existingBadge = userNameNode.querySelector(".drb-badge");
  if (existingBadge) {
    existingBadge.className = `drb-badge drb-badge--${normalizedLevel}`;
    const labelEl = existingBadge.querySelector(".drb-badge__label");
    if (labelEl) {
      if (normalizedLevel === "engage") {
        labelEl.textContent = "engage";
      } else if (normalizedLevel === "rage") {
        labelEl.textContent = "rage bait";
      } else {
        labelEl.textContent = "maybe";
      }
    }
    userNameNode.setAttribute(DRB_BADGE_ATTRIBUTE, normalizedLevel);
    return;
  }

  userNameNode.setAttribute(DRB_BADGE_ATTRIBUTE, normalizedLevel);

  const badge = createBadge(normalizedLevel);
  userNameNode.appendChild(badge);
}

function attachBadgeToUserName(userNameNode) {
  if (!userNameNode) {
    return;
  }

  if (userNameNode.getAttribute(DRB_BADGE_ATTRIBUTE)) {
    return;
  }

  setBadgeLevel(userNameNode, "maybe");
}

function scanForUserNames(root = document) {
  const userNameNodes = root.querySelectorAll('div[data-testid="User-Name"]');
  userNameNodes.forEach((node) => attachBadgeToUserName(node));
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches && node.matches('div[data-testid="User-Name"]')) {
            attachBadgeToUserName(node);
          } else {
            scanForUserNames(node);
          }
        });
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function extractProfileInfo() {
  console.log("[DRB] Extracting profile info from page…");

  const profile = {
    displayName: null,
    handle: null,
    bio: null,
    location: null,
    joined: null,
    following: null,
    followers: null,
    relationshipNote: null,
  };

  const userNameNode = document.querySelector('div[data-testid="User-Name"]');
  if (userNameNode) {
    console.log("[DRB] Found User-Name node", userNameNode);
    const spans = Array.from(userNameNode.querySelectorAll("span"));
    if (spans.length > 0) {
      profile.displayName = spans[0].textContent || null;
    }
    const handleSpan = spans.find((s) =>
      (s.textContent || "").trim().startsWith("@")
    );
    profile.handle = handleSpan ? handleSpan.textContent || null : null;
  }

  const bioNode = document.querySelector('div[data-testid="UserDescription"]');
  if (bioNode) {
    console.log("[DRB] Found bio node", bioNode);
  }
  profile.bio = bioNode ? bioNode.textContent || null : null;

  const locationNode = document.querySelector(
    'span[data-testid="UserLocation"]'
  );
  if (locationNode) {
    console.log("[DRB] Found location node", locationNode);
  }
  profile.location = locationNode ? locationNode.textContent || null : null;

  const joinedNode = document.querySelector('span[data-testid="UserJoinDate"]');
  if (joinedNode) {
    console.log("[DRB] Found join date node", joinedNode);
  }
  profile.joined = joinedNode ? joinedNode.textContent || null : null;

  const followingLink = document.querySelector(
    'a[href$="/following"][role="link"]'
  );
  const followersLink = document.querySelector(
    'a[href$="/followers"][role="link"]'
  );

  const extractCount = (link) => {
    if (!link) return null;
    const span = link.querySelector("span");
    return span ? span.textContent || null : null;
  };

  profile.following = extractCount(followingLink);
  profile.followers = extractCount(followersLink);

  const relationshipSpan = Array.from(document.querySelectorAll("span")).find(
    (s) => {
      const text = (s.textContent || "").trim();
      return (
        text === "Follows you" ||
        text === "Not followed by anyone you’re following"
      );
    }
  );
  profile.relationshipNote = relationshipSpan
    ? relationshipSpan.textContent || null
    : null;

  console.log("[DRB] Extracted profile info", profile);
  return profile;
}

function extractRecentPosts(limit = 3) {
  console.log("[DRB] Extracting recent posts…");
  const posts = [];

  const tweetArticles = document.querySelectorAll('article[data-testid="tweet"]');
  console.log("[DRB] Found tweet articles:", tweetArticles.length);

  for (const article of tweetArticles) {
    if (posts.length >= limit) break;

    const textNode = article.querySelector('div[data-testid="tweetText"]');
    const timeNode = article.querySelector("time");

    const text = textNode ? textNode.textContent || "" : "";
    const timestamp = timeNode ? timeNode.getAttribute("datetime") || "" : "";

    if (!text.trim()) continue;

    posts.push({
      text,
      timestamp,
    });
  }

  console.log("[DRB] Recent posts extracted", posts);
  return posts;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "DRB_GET_PROFILE_INFO") {
    console.log("[DRB] Received DRB_GET_PROFILE_INFO request");
     if (!isOnXProfilePage()) {
       console.log("[DRB] Not on a profile page, skipping profile extraction");
       sendResponse({ profile: null });
       return true;
     }
    sendResponse({ profile: extractProfileInfo() });
    return true;
  }

  if (message && message.type === "DRB_GET_RECENT_POSTS") {
    console.log("[DRB] Received DRB_GET_RECENT_POSTS request");
     if (!isOnXProfilePage()) {
       console.log("[DRB] Not on a profile page, skipping recent posts extraction");
       sendResponse({ posts: [] });
       return true;
     }
    sendResponse({ posts: extractRecentPosts(3) });
    return true;
  }

  if (message && message.type === "DRB_SET_PROFILE_SCORE") {
    const level =
      message.level === "engage" || message.level === "rage"
        ? message.level
        : "maybe";
    const userNameNodes = document.querySelectorAll(
      'div[data-testid="User-Name"]'
    );
    userNameNodes.forEach((node) => setBadgeLevel(node, level));
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    scanForUserNames();
    setupMutationObserver();
  });
} else {
  scanForUserNames();
  setupMutationObserver();
}
