const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function toBold(text) {
  const fontMap = {
    A:"𝘼",B:"𝘽",C:"𝘾",D:"𝘿",E:"𝙀",F:"𝙁",G:"𝙂",H:"𝙃",I:"𝙄",J:"𝙅",
    K:"𝙆",L:"𝙇",M:"𝙈",N:"𝙉",O:"𝙊",P:"𝙋",Q:"𝙌",R:"𝙍",S:"𝙎",T:"𝙏",
    U:"𝙐",V:"𝙑",W:"𝙒",X:"𝙓",Y:"𝙔",Z:"𝙕",
    a:"𝙖",b:"𝙗",c:"𝙘",d:"𝙙",e:"𝙚",f:"𝙛",g:"𝙜",h:"𝙝",i:"𝙞",j:"𝙟",
    k:"𝙠",l:"𝙡",m:"𝙢",n:"𝙣",o:"𝙤",p:"𝙥",q:"𝙦",r:"𝙧",s:"𝙨",t:"𝙩",
    u:"𝙪",v:"𝙫",w:"𝙬",x:"𝙭",y:"𝙮",z:"𝙯",
    0:"𝟬",1:"𝟭",2:"𝟮",3:"𝟯",4:"𝟰",5:"𝟱",6:"𝟲",7:"𝟳",8:"𝟴",9:"𝟵"
  };

  return String(text)
    .split("")
    .map(char => fontMap[char] || char)
    .join("");
}

module.exports = {
  config: {
    name: "video",
    version: "4.0.1",
    author: "AH | 𝑺𝑯𝑰𝑺𝑯𝑰𝑹",
    countDown: 5,
    role: 0,
    shortDescription: "Search & download YouTube videos",
    longDescription: "Search and download YouTube videos",
    category: "media",
    guide: {
      en: "{pn} <video name>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const creatorName = "AH | 𝑺𝑯𝑰𝑺𝑯𝑰𝑹";

    const query = args.join(" ").trim();

    if (!query) {
      return api.sendMessage(
        `❌ ${toBold("Please provide a video name.")}\n\n` +
        `📌 ${toBold("Example:")} video Let Me Love You`,
        threadID,
        messageID
      );
    }

    let statusMessage = null;
    let filePath = null;

    try {
      statusMessage = await api.sendMessage(
        `🔍 ${toBold("VIDEO SEARCH")}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📌 ${toBold("Query:")} ${query}\n` +
        `⏳ ${toBold("Searching...")}`,
        threadID
      );

      const searchURL =
        `https://betadash-search-download.vercel.app/yt?search=` +
        encodeURIComponent(query);

      const searchRes = await axios.get(searchURL, {
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      const data = searchRes.data;

      let video = null;

      if (Array.isArray(data)) {
        video = data[0];
      } else if (Array.isArray(data?.results)) {
        video = data.results[0];
      } else if (Array.isArray(data?.data)) {
        video = data.data[0];
      } else if (data?.result) {
        video = Array.isArray(data.result)
          ? data.result[0]
          : data.result;
      }

      if (!video) {
        throw new Error("No video found.");
      }

      const videoURL =
        video.url ||
        video.link ||
        video.videoUrl ||
        video.video_url;

      if (!videoURL) {
        throw new Error("YouTube video URL not found.");
      }

      if (statusMessage?.messageID) {
        await api.unsendMessage(statusMessage.messageID).catch(() => {});
      }

      statusMessage = await api.sendMessage(
        `🎬 ${toBold("VIDEO FOUND")}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📖 ${toBold("Title:")} ${video.title || "Unknown"}\n` +
        `⏳ ${toBold("Preparing video...")}`,
        threadID
      );

      const apiURL =
        `https://yt-api-imran.vercel.app/api?url=` +
        encodeURIComponent(videoURL);

      const dlRes = await axios.get(apiURL, {
        timeout: 90000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      });

      const dlData = dlRes.data;

      console.log("VIDEO API RESPONSE:", dlData);

      const downloadUrl =
        dlData?.downloadUrl ||
        dlData?.download_url ||
        dlData?.videoUrl ||
        dlData?.video_url ||
        dlData?.url ||
        dlData?.download ||
        dlData?.result?.downloadUrl ||
        dlData?.result?.url ||
        dlData?.data?.downloadUrl ||
        dlData?.data?.url;

      if (!downloadUrl || typeof downloadUrl !== "string") {
        throw new Error("Download API did not return a valid video URL.");
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
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024,
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "*/*"
        }
      });

      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        response.data.on("error", reject);
        writer.on("error", reject);
        writer.on("finish", resolve);
      });

      if (!(await fs.pathExists(filePath))) {
        throw new Error("Video file was not created.");
      }

      const stats = await fs.stat(filePath);

      if (!stats.size || stats.size < 10000) {
        throw new Error("Downloaded video file is empty or invalid.");
      }

      const fileSizeMB = stats.size / (1024 * 1024);

      if (fileSizeMB > 25) {
        await fs.remove(filePath).catch(() => {});
        throw new Error(
          `Video size ${fileSizeMB.toFixed(1)}MB is too large for Messenger.`
        );
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
          `💾 ${toBold("Size:")} ${fileSizeMB.toFixed(1)} MB\n` +
          `👑 ${toBold("Powered by:")} ${creatorName}\n` +
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
        `❌ ${toBold("VIDEO DOWNLOAD FAILED")}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📌 ${err.message || "Unknown error"}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💡 ${toBold("Try another video name.")}\n` +
        `👑 ${toBold("SHISHIR")}`,
        threadID,
        messageID
      );
    }
  }
};
