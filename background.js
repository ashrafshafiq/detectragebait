import { buildRagebaitPrompt, DRB_SCORE_LEVELS } from "./promptConfig.js";
import {
  OPENAI_API_KEY,
  OPENAI_API_BASE_URL,
} from "./openaiConfig.js";

function normalizeScoreLabel(raw) {
  const text = (raw || "").toString().trim().toLowerCase();
  if (!text) return "maybe";

  if (
    text === "rage" ||
    text === "ragebait" ||
    text === "rage bait" ||
    text === "red" ||
    text.includes("ragebait") ||
    text.includes("rage-bait") ||
    text.includes("rage bait")
  ) {
    return "rage";
  }

  if (
    text === "engage" ||
    text === "green" ||
    text.includes("engage")
  ) {
    return "engage";
  }

  if (
    text === "maybe" ||
    text === "yellow" ||
    text.includes("maybe")
  ) {
    return "maybe";
  }

  // Fallback to a neutral "maybe" if the response is unexpected.
  return "maybe";
}

async function callOpenAI(messages) {
  if (!OPENAI_API_KEY) {
    console.warn("[DRB] OpenAI API key is not configured in background.js");
    throw new Error("Missing OpenAI API key");
  }

  const url = `${OPENAI_API_BASE_URL}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 10,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[DRB] OpenAI API error", response.status, text);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;

  return typeof content === "string" ? content : "";
}

async function scoreProfile(profile, posts) {
  const messages = buildRagebaitPrompt(profile, posts);
  const raw = await callOpenAI(messages);
  const label = normalizeScoreLabel(raw);

  const normalizedLabel = DRB_SCORE_LEVELS.includes(label) ? label : "maybe";

  return {
    label: normalizedLabel,
    rawOutput: raw,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "DRB_SCORE_PROFILE") {
    (async () => {
      try {
        const profile = message.profile || null;
        const posts = Array.isArray(message.posts) ? message.posts : [];
        const result = await scoreProfile(profile, posts);
        sendResponse({ ok: true, score: result.label });
      } catch (err) {
        console.error("[DRB] Failed to score profile", err);
        sendResponse({
          ok: false,
          error: err && err.message ? err.message : "Unknown error",
        });
      }
    })();

    // Indicate async response.
    return true;
  }

  return false;
});
