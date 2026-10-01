const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "cutee",
    aliases: ["cute", "catcute"],
    version: "2.0.0",
    author: "SHISHIR",
    countDown: 5,
    role: 0,
    category: "media",

    shortDescription: {
      en: "Send a random cute video"
    },

    longDescription: {
      en: "Sends a random cute video from Catbox."
    },

    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ message }) {

    const cuteVideos = [
      "https://files.catbox.moe/vklati.mp4",
      "https://files.catbox.moe/tytytf.mp4",
      "https://files.catbox.moe/0q76xu.mp4",
      "https://files.catbox.moe/059wqi.mp4",
      "https://files.catbox.moe/13iaas.mp4",
      "https://files.catbox.moe/xfb3ku.mp4",
      "https://files.catbox.moe/7qv8tw.mp4",
      "https://files.catbox.moe/ti6fg6.mp4",
      "https://files.catbox.moe/pjl0rg.mp4",
      "https://files.catbox.moe/05v0kq.mp4",
      "https://files.catbox.moe/320kyn.mp4",
      "https://files.catbox.moe/ihzmeu.mp4",
      "https://files.catbox.moe/pa6r9r.mp4"
    ];

    const randomUrl =
      cuteVideos[Math.floor(Math.random() * cuteVideos.length)];

    const tempFilePath = path.join(
      __dirname,
      `cutee_${Date.now()}.mp4`
    );

    try {

      const response = await axios({
        method: "GET",
        url: randomUrl,
        responseType: "stream",
        timeout: 120000
      });

      const writer = fs.createWriteStream(tempFilePath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await message.reply({
        body:
          "╭━━━〔 𝗖𝗨𝗧𝗘 𝗩𝗜𝗗𝗘𝗢 〕━━━╮\n" +
          "┃ ✨ 𝗛𝗲𝗿𝗲 𝗶𝘀 𝗮 𝗰𝘂𝘁𝗲 𝘃𝗶𝗱𝗲𝗼!\n" +
          "┃ 🐱 𝗘𝗻𝗷𝗼𝘆 𝘁𝗵𝗲 𝘃𝗶𝗱𝗲𝗼 ✨\n" +
          "┃\n" +
          "┃ 👑 𝗢𝘄𝗻𝗲𝗿: 𝗦𝗛𝗜𝗦𝗛𝗜𝗥\n" +
          "╰━━━━━━━━━━━━━━━━━━╯",

        attachment: fs.createReadStream(tempFilePath)
      });

      setTimeout(() => {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }, 5000);

    } catch (error) {

      console.error("Cutee video error:", error);

      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      return message.reply(
        "❌ 𝗖𝘂𝘁𝗲 𝘃𝗶𝗱𝗲𝗼 𝘀𝗲𝗻𝗱 𝗸𝗼𝗿𝗮 𝗷𝗮𝘆𝗻𝗶.\n" +
        "🔄 𝗣𝗹𝗲𝗮𝘀𝗲 𝘁𝗿𝘆 𝗮𝗴𝗮𝗶𝗻!"
      );
    }
  }
};
