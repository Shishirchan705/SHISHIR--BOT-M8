const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

if (!global.instaMemory) global.instaMemory = new Set();

const modeFilePath = path.join(__dirname, 'cache', 'searchmode.json');

function loadSearchModes() {
  try {
    fs.ensureDirSync(path.dirname(modeFilePath));
    if (fs.existsSync(modeFilePath)) {
      return fs.readJsonSync(modeFilePath);
    }
  } catch (e) {
    console.error("DEBUG ERROR (loadSearchModes):", e.message);
  }
  return {};
}

function saveSearchModes(modes) {
  try {
    fs.ensureDirSync(path.dirname(modeFilePath));
    fs.writeJsonSync(modeFilePath, modes);
  } catch (e) {
    console.error("DEBUG ERROR (saveSearchModes):", e.message);
  }
}

if (!global.animeSearchMode) global.animeSearchMode = loadSearchModes();

function isSearchModeOn(threadID) {
  return global.animeSearchMode[threadID] === true;
}

function setSearchMode(threadID, isOn) {
  global.animeSearchMode[threadID] = isOn;
  saveSearchModes(global.animeSearchMode);
}

const TUTORIAL_KEYWORDS = [
  "tutorial", "how to edit", "how to make", "how i edit", "how to create",
  "cara edit", "cara buat", "cara membuat", "edit tutorial", "editing tutorial",
  "step by step", "tuto edit", "tuto ", "learn how", "edit guide",
  "guide to edit", "capcut tutorial", "alight motion tutorial",
  "kaise edit", "edit kaise", "edit karna", "editing kaise", "coba edit",
  "belajar edit", "trik edit", "tips edit", "preset tutorial"
];

function isTutorialVideo(video) {
  const text = `${video.title || ""} ${video.desc || ""} ${video.description || ""}`.toLowerCase();
  return TUTORIAL_KEYWORDS.some(kw => text.includes(kw));
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "to", "in", "on", "no", "amv", "edit",
  "anime", "watermark", "video", "season", "episode", "ep"
]);

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getQueryWords(query) {
  return normalizeText(query)
    .split(" ")
    .filter(w => w.length >= 2 && !STOPWORDS.has(w));
}

function isRelevantVideo(video, queryWords) {
  if (queryWords.length === 0) return true;

  const text = normalizeText(`${video.title || ""} ${video.desc || ""} ${video.description || ""}`);
  if (!text) return false;

  const matchedCount = queryWords.filter(w => text.includes(w)).length;
  const requiredMatches = Math.max(1, Math.ceil(queryWords.length * 0.6));

  return matchedCount >= requiredMatches;
}

const COMMAND_NAMES = ["sniper", "sp"];
const MODE_TOGGLE_REGEX = new RegExp(
  `^(?:${COMMAND_NAMES.join("|")})\\s+-m\\s+(on|off)$`,
  "i"
);

module.exports = {
  config: {
    name: "sniper",
    aliases: ["sp"],
    version: "1.3.2",
    author: "Arafat",
    countDown: 10,
    role: 0,
    description: "Anime edits from TikTok",
    category: "media",
    guide: {
      en: "{pn} [anime name]\n{pn} -m on | off"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    if (args[0] && args[0].toLowerCase() === "-m") {
      const choice = (args[1] || "").toLowerCase();
      if (choice !== "on" && choice !== "off") {
        return message.reply(serifBold("𝐔𝐬𝐚𝐠𝐞: 𝐒𝐩 -𝐦 𝐨𝐧 / 𝐨𝐟𝐟"));
      }
      setSearchMode(event.threadID, choice === "on");
      return message.reply(serifBold(
        choice === "on"
          ? "✅ | 𝐒𝐧𝐢𝐩𝐞𝐫 𝐦𝐨𝐝𝐞 𝐚𝐜𝐭𝐢𝐯𝐚𝐭𝐞𝐝. "
          : "❎ | 𝐒𝐧𝐢𝐩𝐞𝐫 𝐦𝐨𝐝𝐞 𝐬𝐭𝐨𝐨𝐝 𝐝𝐨𝐰𝐧."
      ));
    }

    const query = args.join(" ");
    if (!query) return message.reply(serifBold("𝐏𝐥𝐞𝐚𝐬𝐞 𝐩𝐫𝐨𝐯𝐢𝐝𝐞 𝐚𝐧 𝐚𝐧𝐢𝐦𝐞 𝐧𝐚𝐦𝐞! 🌸"));

    return sendAnimeVideo({ api, event, message, query });
  },

  onChat: async function ({ api, event, message }) {
    const body = (event.body || "").trim();

    // Allow "sp -m on" / "sp -m off" (any case) without the bot's ! prefix
    const modeMatch = body.match(MODE_TOGGLE_REGEX);
    if (modeMatch) {
      const choice = modeMatch[1].toLowerCase();
      setSearchMode(event.threadID, choice === "on");
      return message.reply(serifBold(
        choice === "on"
          ? "✅ | 𝐒𝐧𝐢𝐩𝐞𝐫 𝐦𝐨𝐝𝐞 𝐚𝐜𝐭𝐢𝐯𝐚𝐭𝐞𝐝. "
          : "❎ | 𝐒𝐧𝐢𝐩𝐞𝐫 𝐦𝐨𝐝𝐞 𝐬𝐭𝐨𝐨𝐝 𝐝𝐨𝐰𝐧."
      ));
    }

    if (!isSearchModeOn(event.threadID)) return;

    const match = body.match(/^-([a-zA-Z0-9_ ]{2,40})$/);
    if (!match) return;

    const query = match[1];
    return sendAnimeVideo({ api, event, message, query });
  }
};

async function sendAnimeVideo({ api, event, message, query }) {
    api.setMessageReaction("✨", event.messageID, () => {}, true);

    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
    const pathVideo = path.join(cacheDir, `anisr_${Date.now()}.mp4`);

    try {
      const searchTerms = `${query} anime edit amv no watermark`;

      const res = await axios.get(`https://www.tikwm.com/api/feed/search`, {
        params: { keywords: searchTerms },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
      });

      const rawVideos = res.data?.data?.videos;

      if (!rawVideos || rawVideos.length === 0) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(serifBold("𝐍𝐨 𝐦𝐚𝐭𝐜𝐡𝐢𝐧𝐠 𝐯𝐢𝐝𝐞𝐨 𝐟𝐨𝐮𝐧𝐝! 𝐓𝐫𝐲 𝐚 𝐝𝐢𝐟𝐟𝐞𝐫𝐞𝐧𝐭 𝐧𝐚𝐦𝐞."));
      }

      const queryWords = getQueryWords(query);
      const videos = rawVideos
        .filter(v => !isTutorialVideo(v))
        .filter(v => isRelevantVideo(v, queryWords));

      if (videos.length === 0) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(serifBold("𝐍𝐨 𝐦𝐚𝐭𝐜𝐡𝐢𝐧𝐠 𝐯𝐢𝐝𝐞𝐨 𝐟𝐨𝐮𝐧𝐝! 𝐓𝐫𝐲 𝐚 𝐝𝐢𝐟𝐟𝐞𝐫𝐞𝐧𝐭 𝐧𝐚𝐦𝐞."));
      }

      let selectedVideo = videos.find(v => !global.instaMemory.has(v.video_id));
      if (!selectedVideo) {
        // All relevant matches already sent before; reuse the pool instead of
        // clearing memory globally (avoids resurfacing mismatched old picks)
        selectedVideo = videos[Math.floor(Math.random() * videos.length)];
      }
      global.instaMemory.add(selectedVideo.video_id);

      const downloadUrl = selectedVideo.play || selectedVideo.wmplay;

      const videoResponse = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      await fs.writeFile(pathVideo, Buffer.from(videoResponse.data));

      await message.reply({
        body: serifBold(`• 𝐇𝐞𝐫𝐞 𝐢𝐬 𝐲𝐨𝐮𝐫 𝐯𝐢𝐝𝐞𝐨 𝐛𝐚𝐛𝐲  <😘`),
        attachment: fs.createReadStream(pathVideo)
      });

      api.setMessageReaction("🌸", event.messageID, () => {}, true);

    } catch (err) {
      console.error("DEBUG ERROR:", err.message);
      api.setMessageReaction("⚠️", event.messageID, () => {}, true);

      const errorMsg = err.code === 'ECONNABORTED'
        ? "⚠️ | 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐢𝐨𝐧 𝐭𝐢𝐦𝐞𝐝 𝐨𝐮𝐭. 𝐓𝐫𝐲 𝐚𝐠𝐚𝐢𝐧!"
        : "⚠️ | 𝐒𝐞𝐫𝐯𝐞𝐫 𝐢𝐬 𝐛𝐮𝐬𝐲 𝐨𝐫 𝐀𝐏𝐈 𝐢𝐬 𝐝𝐨𝐰𝐧. 𝐓𝐫𝐲 𝐚𝐠𝐚𝐢𝐧!";

      return message.reply(serifBold(errorMsg));
    } finally {
      if (fs.existsSync(pathVideo)) {
        setTimeout(() => {
          try { fs.unlinkSync(pathVideo); } catch(e) {}
        }, 20000);
      }
    }
}

function serifBold(text) {
  const letters = {
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦',
    'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌',
    'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
  };
  return text.split('').map(char => letters[char] || char).join('');
  }
