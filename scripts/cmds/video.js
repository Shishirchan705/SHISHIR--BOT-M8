const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function toBold(text) {
  const fontMap = {
    A: "𝘼", B: "𝘽", C: "𝘾", D: "𝘿", E: "𝙀", F: "𝙁", G: "𝙂", H: "𝙃", I: "𝙄", J: "𝙅",
    K: "𝙆", L: "𝙇", M: "𝙈", N: "𝙉", O: "𝙊", P: "𝙋", Q: "𝙌", R: "𝙍", S: "𝙎", T: "𝙏",
    U: "𝙐", V: "𝙑", W: "𝙒", X: "𝙯", Y: "𝙔", Z: "𝙕",
    a: "𝙖", b: "𝙗", c: "𝙘", d: "𝙙", e: "𝙚", f: "𝙛", g: "𝙜", h: "𝙝", i: "𝙞", j: "𝙟",
    k: "𝙠", l: "𝙡", m: "𝙢", n: "𝙣", o: "𝙤", p: "𝙥", q: "𝙦", r: "𝙧", s: "𝙨", t: "𝙩",
    u: "𝙪", v: "𝙫", w: "𝙬", x: "𝙭", y: "𝙮", z: "𝙯",
    0: "𝟬", 1: "𝟭", 2: "𝟮", 3: "𝟯", 4: "𝟰", 5: "𝟱", 6: "𝟲", 7: "𝟳", 8: "𝟴", 9: "𝟡"
  };
  return text.split("").map(char => fontMap[char] || char).join("");
}

module.exports = {
  config: {
    name: "video",
    version: "3.0.4",
    author: "SHISHIR",
    countDown: 5,
    role: 0,
    shortDescription: "Search & download YouTube videos",
    longDescription: "Search YouTube videos by name and download without extra packages",
    category: "media",
    guide: {
      en: "{pn} <video name>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const creatorName = "SHISHIR";

    const query = args.join(" ").trim();

    if (!query) {
      return api.sendMessage(
        `❌ ${toBold("Please provide a video name.")}\n\n📌 ${toBold("Example:")}\nvideo Let Me Love You`,
        threadID,
        messageID
      );
    }

    let statusMessage = null;
    let filePath = null;

    try {
      statusMessage = await api.sendMessage(
        `🔍 ${toBold("VIDEO SEARCH")}\n━━━━━━━━━━━━━━━━━━\n📌 ${toBold("Query:")} ${query}\n⏳ ${toBold("Searching...")}`,
        threadID
      );

      const searchRes = await axios.get(
        `https://betadash-search-download.vercel.app/yt?search=${encodeURIComponent(query)}`,
        { timeout: 30000 }
      );

      const video = searchRes.data?.[0];

      if (!video || !video.url) {
        throw new Error("No video found on YouTube for this query.");
      }

      if (statusMessage?.messageID) {
        await api.unsendMessage(statusMessage.messageID).catch(() => {});
      }

      statusMessage = await api.sendMessage(
        `🎬 ${toBold("VIDEO FOUND")}\n━━━━━━━━━━━━━━━━━━\n📖 ${toBold("Title:")} ${video.title || "Unknown"}\n⏳ ${toBold("Downloading...")}`,
        threadID
      );

      const dlRes = await axios.get(
        `https://yt-api-imran.vercel.app/api?url=${encodeURIComponent(video.url)}`,
        { timeout: 60000 }
      );

      const downloadUrl =
        dlRes.data?.downloadUrl ||
        dlRes.data?.url ||
        dlRes.data?.download;

      if (!downloadUrl) {
        throw new Error("Download API failed to extract video link.");
      }

      const cacheDir = path.join(process.cwd(), "cache");
      await fs.ensureDir(cacheDir);

      filePath = path.join(
        cacheDir,
        `shishir_video_${Date.now()}.mp4`
      );

      const response = await axios({
        method: "GET",
        url: downloadUrl,
        responseType: "stream",
        timeout: 180000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", (err) => {
          fs.remove(filePath).catch(() => {});
          reject(err);
        });
      });

      // Check file size (Facebook limit ~25MB)
      const stats = await fs.stat(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB > 25) {
        await fs.remove(filePath).catch(() => {});
        throw new Error(`Video size (${fileSizeInMB.toFixed(1)}MB) exceeds Messenger's 25MB limit.`);
      }

      if (statusMessage?.messageID) {
        await api.unsendMessage(statusMessage.messageID).catch(() => {});
      }

      const finalMessage = {
        body:
          `━━━━━━━━━━━━━━━━━━\n` +
          `🎬 ${toBold("VIDEO READY")}\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📖 ${toBold("Title:")} ${video.title || "Unknown"}\n` +
          `⏱ ${toBold("Duration:")} ${video.time || "Unknown"}\n` +
          `🖌️ ${toBold("Powered by:")} ${creatorName}\n` +
          `━━━━━━━━━━━━━━━━━━`,
        attachment: fs.createReadStream(filePath)
      };

      await api.sendMessage(
        finalMessage,
        threadID,
        async () => {
          if (filePath && (await fs.pathExists(filePath))) {
            await fs.remove(filePath).catch(() => {});
          }
        },
        messageID
      );

    } catch (err) {
      console.error("VIDEO ERROR:", err);

      if (statusMessage?.messageID) {
        await api.unsendMessage(statusMessage.messageID).catch(() => {});
      }

      if (filePath && (await fs.pathExists(filePath))) {
        await fs.remove(filePath).catch(() => {});
      }

      return api.sendMessage(
        `❌ ${toBold("VIDEO DOWNLOAD FAILED")}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📌 ${err.message || "Unknown error occurred"}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💡 Try a shorter video or different search term.`,
        threadID,
        messageID
      );
    }
  }
};
