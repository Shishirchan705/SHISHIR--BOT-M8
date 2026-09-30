const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "video",
    version: "3.0.0",
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
        "❌ Please provide a video name.\n\n📌 Example:\nvideo Let Me Love You",
        threadID,
        messageID
      );
    }

    let statusMessage = null;
    let filePath = null;

    try {
      // Searching
      statusMessage = await api.sendMessage(
        `🔍 VIDEO SEARCH\n━━━━━━━━━━━━━━━━━━\n📌 Query: ${query}\n⏳ Searching...`,
        threadID
      );

      const searchRes = await axios.get(
        `https://betadash-search-download.vercel.app/yt?search=${encodeURIComponent(query)}`,
        {
          timeout: 30000
        }
      );

      const video = searchRes.data?.[0];

      if (!video || !video.url) {
        throw new Error("No video found.");
      }

      // Remove searching message
      if (statusMessage?.messageID) {
        await api.unsendMessage(statusMessage.messageID).catch(() => {});
      }

      // Downloading status
      statusMessage = await api.sendMessage(
        `🎬 VIDEO FOUND\n━━━━━━━━━━━━━━━━━━\n📖 Title: ${video.title || "Unknown"}\n⏳ Downloading...`,
        threadID
      );

      // Get download link
      const dlRes = await axios.get(
        `https://yt-api-imran.vercel.app/api?url=${encodeURIComponent(video.url)}`,
        {
          timeout: 60000
        }
      );

      const downloadUrl =
        dlRes.data?.downloadUrl ||
        dlRes.data?.url ||
        dlRes.data?.download;

      if (!downloadUrl) {
        throw new Error("Download link not available.");
      }

      // Create cache folder
      const cacheDir = path.join(process.cwd(), "cache");
      await fs.ensureDir(cacheDir);

      filePath = path.join(
        cacheDir,
        `shishir_video_${Date.now()}.mp4`
      );

      // Download video
      const videoRes = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
        timeout: 180000,
        maxContentLength: 100 * 1024 * 1024,
        maxBodyLength: 100 * 1024 * 1024
      });

      await fs.writeFile(filePath, videoRes.data);

      // Remove downloading message
      if (statusMessage?.messageID) {
        await api.unsendMessage(statusMessage.messageID).catch(() => {});
      }

      const finalMessage = {
        body:
          `━━━━━━━━━━━━━━━━━━\n` +
          `🎬 VIDEO READY\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📖 Title: ${video.title || "Unknown"}\n` +
          `⏱ Duration: ${video.time || "Unknown"}\n` +
          `🖌️ Powered by: shishir{creatorName}\n` +
          `━━━━━━━━━━━━━━━━━━`,
        attachment: fs.createReadStream(filePath)
      };

      await api.sendMessage(
        finalMessage,
        threadID,
        async () => {
          if (filePath && await fs.pathExists(filePath)) {
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

      if (filePath && await fs.pathExists(filePath)) {
        await fs.remove(filePath).catch(() => {});
      }

      return api.sendMessage(
        `❌ VIDEO DOWNLOAD FAILED\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📌 ${err.message || "Unknown error"}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💡 Try another video name.`,
        threadID,
        messageID
      );
    }
  }
};
