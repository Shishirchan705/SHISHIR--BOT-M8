const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
  config: {
    name: "motopp",
    aliases: ["moto", "ppmoto", "mentionmoto"],
    version: "1.0",
    author: "SHISHIR",
    countDown: 5,
    role: 0,
    shortDescription: "Mention/Reply PP Moto",
    category: "fun"
  },

  onStart: async function ({ api, event, message }) {
    try {

      // 🖼️ YOUR BACKGROUND
      const BACKGROUND_URL =
        "https://i.imgur.com/jkLYQ08.jpeg";

      // 👤 Find target user
      let targetID = null;

      // Reply করলে
      if (event.messageReply?.senderID) {
        targetID = event.messageReply.senderID;
      }

      // Mention করলে
      if (!targetID && event.mentions) {
        const ids = Object.keys(event.mentions);
        if (ids.length > 0) {
          targetID = ids[0];
        }
      }

      if (!targetID) {
        return message.reply(
          "⚠️ কাউকে Mention করো অথবা তার মেসেজে Reply করে command দাও!"
        );
      }

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      const time = Date.now();

      const bgPath = path.join(
        cacheDir,
        `moto_bg_${time}.jpg`
      );

      const ppPath = path.join(
        cacheDir,
        `moto_pp_${time}.jpg`
      );

      const outputPath = path.join(
        cacheDir,
        `moto_result_${time}.jpg`
      );

      // 📥 Download background
      const bgData = await axios.get(BACKGROUND_URL, {
        responseType: "arraybuffer",
        timeout: 30000
      });

      await fs.writeFile(bgPath, bgData.data);

      // 👤 Get user info
      const userInfo = await new Promise((resolve, reject) => {
        api.getUserInfo(targetID, (err, info) => {
          if (err) return reject(err);
          resolve(info);
        });
      });

      const profileUrl =
        userInfo?.[targetID]?.profileUrl ||
        userInfo?.[targetID]?.thumbSrc;

      if (!profileUrl) {
        throw new Error("Profile picture পাওয়া যায়নি");
      }

      // 📥 Download PP
      const ppData = await axios.get(profileUrl, {
        responseType: "arraybuffer",
        timeout: 30000
      });

      await fs.writeFile(ppPath, ppData.data);

      // 🎨 Load images
      const bg = await loadImage(bgPath);
      const pp = await loadImage(ppPath);

      const canvas = createCanvas(
        bg.width,
        bg.height
      );

      const ctx = canvas.getContext("2d");

      // Background
      ctx.drawImage(
        bg,
        0,
        0,
        bg.width,
        bg.height
      );

      // =========================
      // 👤 PROFILE PICTURE
      // =========================

      const ppSize =
        Math.min(bg.width, bg.height) * 0.19;

      const x =
        (bg.width - ppSize) / 2;

      const y =
        bg.height * 0.035;

      // 🔵 Glow
      ctx.save();

      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 30;

      ctx.beginPath();

      ctx.arc(
        x + ppSize / 2,
        y + ppSize / 2,
        ppSize / 2 + 7,
        0,
        Math.PI * 2
      );

      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 10;
      ctx.stroke();

      ctx.restore();

      // 👤 Circular PP
      ctx.save();

      ctx.beginPath();

      ctx.arc(
        x + ppSize / 2,
        y + ppSize / 2,
        ppSize / 2,
        0,
        Math.PI * 2
      );

      ctx.clip();

      const scale = Math.max(
        ppSize / pp.width,
        ppSize / pp.height
      );

      const newWidth = pp.width * scale;
      const newHeight = pp.height * scale;

      const ppX =
        x + (ppSize - newWidth) / 2;

      const ppY =
        y + (ppSize - newHeight) / 2;

      ctx.drawImage(
        pp,
        ppX,
        ppY,
        newWidth,
        newHeight
      );

      ctx.restore();

      // ⚪ PP Border
      ctx.beginPath();

      ctx.arc(
        x + ppSize / 2,
        y + ppSize / 2,
        ppSize / 2,
        0,
        Math.PI * 2
      );

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.stroke();

      // 👑 Crown
      ctx.font =
        `${Math.floor(ppSize * 0.20)}px Arial`;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        "👑",
        x + ppSize / 2,
        y - 5
      );

      // =========================
      // 💬 MENTION / REPLY LABEL
      // =========================

      const isReply =
        !!event.messageReply?.senderID;

      const label =
        isReply ? "REPLIED" : "MENTIONED";

      const labelY =
        y + ppSize + 25;

      ctx.font =
        `bold ${Math.floor(ppSize * 0.10)}px Arial`;

      const textWidth =
        ctx.measureText(label).width;

      const boxWidth =
        textWidth + 45;

      const boxHeight =
        ppSize * 0.16;

      const boxX =
        x + ppSize / 2 - boxWidth / 2;

      // Black label
      ctx.fillStyle =
        "rgba(0,0,0,0.78)";

      ctx.beginPath();

      ctx.roundRect(
        boxX,
        labelY,
        boxWidth,
        boxHeight,
        15
      );

      ctx.fill();

      // Label
      ctx.fillStyle = "#ffffff";

      ctx.fillText(
        label,
        x + ppSize / 2,
        labelY + boxHeight / 2
      );

      // =========================
      // 💾 SAVE
      // =========================

      const buffer =
        canvas.toBuffer(
          "image/jpeg",
          { quality: 0.95 }
        );

      await fs.writeFile(
        outputPath,
        buffer
      );

      // 📤 SEND
      await message.reply({
        body: isReply
          ? "😂 Reply দিলেই Moto! 🏍️🔥"
          : "😂 Mention করলেই Moto! 🏍️🔥",

        attachment:
          fs.createReadStream(outputPath)
      });

      // 🧹 Cleanup
      setTimeout(async () => {
        try {
          await fs.remove(bgPath);
          await fs.remove(ppPath);
          await fs.remove(outputPath);
        } catch (e) {}
      }, 10000);

    } catch (error) {

      console.error(
        "MOTO PP ERROR:",
        error
      );

      return message.reply(
        "❌ Moto PP তৈরি করতে সমস্যা হয়েছে!"
      );
    }
  }
};
