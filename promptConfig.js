export const DRB_SCORE_LEVELS = ["engage", "maybe", "rage"];

export function buildRagebaitPrompt(profile, posts) {
  const safeProfile = profile || {};
  const safePosts = Array.isArray(posts) ? posts : [];

  const profileLines = [
    `Display name: ${safeProfile.displayName || ""}`,
    `Handle: ${safeProfile.handle || ""}`,
    `Bio: ${safeProfile.bio || ""}`,
    `Location: ${safeProfile.location || ""}`,
    `Joined: ${safeProfile.joined || ""}`,
    `Following: ${safeProfile.following || ""}`,
    `Followers: ${safeProfile.followers || ""}`,
    `Relationship note: ${safeProfile.relationshipNote || ""}`,
  ];

  const postLines =
    safePosts.length === 0
      ? ["(No recent posts available.)"]
      : safePosts.map((post, index) => {
          const text = (post && post.text) || "";
          const ts = (post && post.timestamp) || "";
          return `${index + 1}. [${ts}] ${text}`;
        });

  const userContent = [
    "Analyze the following X (Twitter) account and its last 3 posts, and decide whether it is likely to be:",
    "- ENGAGE (green): generally constructive, good‑faith, and non‑manipulative.",
    "- MAYBE (yellow): mixed content; some potentially manipulative or outrage‑bait, but not consistently.",
    "- RAGEBAIT (red): primarily outrage‑driven, manipulative, or designed to inflame emotions.",
    "",
    "Focus primarily on patterns in the 3 most recent posts, using the profile bio as supporting context:",
    "- Are they frequently insulting groups or individuals?",
    "- Do they exaggerate, catastrophize, or use sensational language?",
    "- Do they frame issues in a way that provokes anger or contempt more than understanding?",
    "- Do they encourage pile‑ons or harassment?",
    "",
    "Profile:",
    ...profileLines,
    "",
    "Recent posts (up to 3, most recent first):",
    ...postLines,
    "",
    "Return exactly ONE of these words with no explanation and no extra characters:",
    "ENGAGE",
    "MAYBE",
    "RAGEBAIT",
  ].join("\n");

  return [
    {
      role: "system",
      content:
        "You are an assistant that classifies social media accounts as ENGAGE (green), MAYBE (yellow), or RAGEBAIT (red).\n" +
        "You must respond with exactly one of these words: ENGAGE, MAYBE, or RAGEBAIT. No other text.",
    },
    {
      role: "user",
      content: userContent,
    },
  ];
}
