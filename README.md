# Detect Rage Bait

Detect Rage Bait is a browser extension for X (Twitter) that uses the OpenAI API to analyze accounts and their recent posts, then flags them as **ENGAGE**, **MAYBE**, or **RAGEBAIT**.  
Its goal is to help you spot outrage‑driven, manipulative content in your feed so you can decide what to engage with more intentionally.

## Setup: OpenAI API keys

This project uses a small build helper (`generateOpenAIConfig.js`) to copy your OpenAI credentials from a local `.env` file into an ES module (`openaiConfig.js`) that the extension imports at runtime.

1. Create a `.env` file in the project root (same folder as `manifest.json`) with your values:

   ```bash
   OPENAI_API_KEY=sk-...
   OPENAI_API_BASE_URL=https://api.openai.com/v1
   ```

   - `OPENAI_API_KEY` is your OpenAI API key.
   - `OPENAI_API_BASE_URL` can usually stay as `https://api.openai.com/v1` unless you are using a proxy.

2. Make sure secrets are ignored by git (already configured):

   - `.env`
   - `openaiConfig.js`

3. Generate `openaiConfig.js` from `.env`:

   ```bash
   node generateOpenAIConfig.js
   ```

   This will create/update `openaiConfig.js` with:

   ```js
   export const OPENAI_API_KEY = "your-key-here";
   export const OPENAI_API_BASE_URL = "https://api.openai.com/v1";
   ```

4. Load the extension in Chrome:

   - Go to `chrome://extensions`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select this project folder (the one containing `manifest.json`).

Whenever you change your `.env` file (for example, rotating your API key), run `node generateOpenAIConfig.js` again before reloading the extension.
