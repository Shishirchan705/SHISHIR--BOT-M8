const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
  config: {
    name: "premik",
    aliases: ["pemik", "premik", "lover"],
    version: "2.0",
    author: "SHISHIR",
    countDown: 5,
    role: 0,

    shortDescription: {
      en: "Premik fun photo"
    },

    description: {
      en: "Create a fun premik photo using profile picture"
    },

    category: "fun"
  },

  onStart: async function ({ api, event }) {
    try {
      const threadID = event.threadID;
      const messageID = event.messageID;

      // ==============================
      // ❤️ PREMIK TEMPLATE
      // ==============================
      const TEMPLATE_URL =
        "https://i.imgur.com/clOi0iJ.jpeg";

      // ==============================
      // 👤 WHICH PROFILE PICTURE?
      // ==============================
      let userID = event.senderID;

      // কারো মেসেজে reply করলে তার profile picture নেবে
      if (
        event.type === "message_reply" &&
        event.messageReply &&
        event.messageReply.senderID
      ) {
        userID = event.messageReply.senderID;
      }

      // ==============================
      // 👤 FACEBOOK PROFILE PICTURE
      // ==============================
      const avatarURL =
        `https://graph.facebook.com/${userID}/picture?width=1000&height=1000`;

      // ==============================
      // 🎨 CANVAS
      // ==============================
      const width = 800;
      const height = 800;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // ==============================
      // 🖼️ LOAD TEMPLATE + PROFILE PIC
      // ==============================
      const template = await loadImage(TEMPLATE_URL);
      const avatar = await loadImage(avatarURL);

      // ==============================
      // 🖼️ DRAW TEMPLATE
      // ==============================
      ctx.drawImage(
        template,
        0,
        0,
        width,
        height
      );

      // ==================================================
      // 👤 PROFILE PIC POSITION
      // ==================================================
      // ছবির মুখের জায়গা অনুযায়ী এগুলো পরিবর্তন করতে পারবে
      const faceX = 340;
      const faceY = 145;
      const faceSize = 125;

      // ==============================
      // ⭕ ROUND PROFILE PICTURE
      // ==============================
      ctx.save();

      ctx.beginPath();

      ctx.arc(
        faceX + faceSize / 2,
        faceY + faceSize / 2,
        faceSize / 2,
        0,
        Math.PI * 2
      );

      ctx.closePath();
      ctx.clip();

      ctx.drawImage(
        avatar,
        faceX,
        faceY,
        faceSize,
        faceSize
      );

      ctx.restore();

      // ==============================
      // 📁 CACHE
      // ==============================
      const cacheDir = path.join(
        __dirname,
        "cache"
      );

      await fs.ensureDir(cacheDir);

      const outputPath = path.join(
        cacheDir,
        `premik_${userID}.png`
      );

      // ==============================
      // 💾 SAVE
      // ==============================
      fs.writeFileSync(
        outputPath,
        canvas.toBuffer("image/png")
      );

      // ==============================
      // 📤 SEND
      // ==============================
      api.sendMessage(
        {
          body:
            "💘 𝗣𝗥𝗘𝗠𝗜𝗞 𝗠𝗢𝗗𝗘 💘\n\n❤️ এই নাও তোমার প্রেমিক রূপ! 😎🔥",
          attachment: fs.createReadStream(outputPath)
        },
        threadID,
        () => {
          try {
            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }
          } catch (e) {
            console.log("Delete error:", e.message);
          }
        },
        messageID
      );

    } catch (error) {
      console.error(
        "PREMIK ERROR:",
        error
      );

      api.sendMessage(
        "⚠️ প্রেমিক ছবি তৈরি করতে সমস্যা হয়েছে!\n\n🔧 আবার চেষ্টা করো।",
        event.threadID,
        event.messageID
      );
    }
  }
};
