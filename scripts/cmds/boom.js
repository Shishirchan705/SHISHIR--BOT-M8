const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const videos = [
  "https://files.catbox.moe/ls4pdv.mp4",
  "https://files.catbox.moe/1o9j53.mp4",
  "https://files.catbox.moe/odtaui.mp4",
  "https://files.catbox.moe/3rddv2.mp4",
  "https://files.catbox.moe/pdr0bz.mp4",
  "https://files.catbox.moe/1708mm.mp4",
  "https://files.catbox.moe/brn919.mp4",
  "https://files.catbox.moe/hzspaj.mp4",
  "https://files.catbox.moe/8l2akv.mp4"
];

async function sendBoom(message) {
  const link = videos[Math.floor(Math.random() * videos.length)];

  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);

  const filePath = path.join(
    cacheDir,
    `shishir_boom_${Date.now()}.mp4`
  );

  try {
    const response = await axios({
      method: "GET",
      url: link,
      responseType: "arraybuffer",
      timeout: 120000,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    await fs.writeFile(filePath, response.data);

    await message.reply({
      body: `💥 ╔════════════════════╗
   💣 𝐁𝐎𝐎𝐌 𝐕𝐈𝐃𝐄𝐎 💣
╚════════════════════╝

👑 𝐎𝐰𝐧𝐞𝐫 : 𝑺𝑯𝑰𝑺𝑯𝑰𝑹
⚡ 𝐑𝐞𝐩𝐥𝐲 : 💣
🔥 𝐄𝐧𝐣𝐨𝐲 𝐓𝐡𝐞 𝐕𝐢𝐝𝐞𝐨

『 𝑺𝑯𝑰𝑺𝑯𝑰𝑹 • 𝐁𝐎𝐎𝐌 』`,
      attachment: fs.createReadStream(filePath)
    });

    setTimeout(() => {
      fs.remove(filePath).catch(() => {});
    }, 15000);

  } catch (error) {
    console.error("SHISHIR BOOM ERROR:", error);

    await message.reply(
      `❌ 𝐕𝐢𝐝𝐞𝐨 𝐒𝐞𝐧𝐝 𝐅𝐚𝐢𝐥𝐞𝐝!

👑 𝐎𝐰𝐧𝐞𝐫 : 𝑺𝑯𝑰𝑺𝑯𝑰𝑹
⚠️ Catbox direct link check করো।`
    );
  }
}

module.exports = {
  config: {
    name: "boom",
    aliases: ["boomvideo", "bv"],
    version: "3.0.0",
    author: "𝑺𝑯𝑰𝑺𝑯𝑰𝑹",
    countDown: 5,
    role: 0,

    shortDescription: {
      en: "Random Boom Video"
    },

    longDescription: {
      en: "Send a random video from Catbox"
    },

    category: "media"
  },

  onStart: async function ({ message }) {
    await sendBoom(message);
  },

  onReply: async function ({ message, event }) {
    const text = (event.body || "").trim();

    if (text === "💣") {
      await sendBoom(message);
    }
  }
};
