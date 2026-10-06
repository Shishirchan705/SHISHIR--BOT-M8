const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
  config: {
    name: "motopp",
    aliases: ["moto", "ppmoto", "mentionmoto"],
    version: "2.0",
    author: "SHISHIR",
    countDown: 5,
    role: 0,
    shortDescription: "Mention/Reply PP Moto Edit",
    category: "fun"
  },

  onStart: async function ({ api, event, message }) {
    var bgPath, ppPath, outputPath;

    try {

      // ==========================
      // 🖼️ YOUR IMGUR BACKGROUND
      // ==========================
      var BACKGROUND_URL =
        "https://i.imgur.com/jkLYQ08.jpeg";

      // ==========================
      // 👤 FIND TARGET USER
      // ==========================
      var targetID = null;
      var isReply = false;

      // Reply
      if (
        event.messageReply &&
        event.messageReply.senderID
      ) {
        targetID = event.messageReply.senderID;
        isReply = true;
      }

      // Mention
      if (!targetID && event.mentions) {
        var ids = Object.keys(event.mentions);

        if (ids.length > 0) {
          targetID = ids[0];
          isReply = false;
        }
      }

      if (!targetID) {
        return message.reply(
          "⚠️ কাউকে Mention করো অথবা তার মেসেজে Reply করে `motopp` দাও!"
        );
      }

      // ==========================
      // 📁 CACHE
      // ==========================
      var cacheDir = path.join(__dirname, "cache");

      await fs.ensureDir(cacheDir);

      var time = Date.now();

      bgPath = path.join(
        cacheDir,
        "motopp_bg_" + time + ".jpg"
      );

      ppPath = path.join(
        cacheDir,
        "motopp_pp_" + time + ".jpg"
      );

      outputPath = path.join(
        cacheDir,
        "motopp_" + time + ".jpg"
      );

      // ==========================
      // 📥 DOWNLOAD BACKGROUND
      // ==========================
      var bgData = await axios({
        method: "GET",
        url: BACKGROUND_URL,
        responseType: "arraybuffer",
        timeout: 30000
      });

      await fs.writeFile(bgPath, bgData.data);

      // ==========================
      // 👤 GET USER INFORMATION
      // ==========================
      var userInfo = await new Promise(function(resolve, reject) {

        api.getUserInfo(
          targetID,
          function(err, info) {

            if (err) {
              return reject(err);
            }

            resolve(info);
          }
        );

      });

      var user = userInfo[targetID];

      if (!user) {
        throw new Error("User information পাওয়া যায়নি");
      }

      // ==========================
      // 🖼️ PROFILE IMAGE URL
      // ==========================
      var profileUrl =
        user.thumbSrc ||
        user.profileUrl ||
        user.avatar ||
        user.picture;

      if (!profileUrl) {
        throw new Error(
          "Profile picture URL পাওয়া যায়নি"
        );
      }

      // ==========================
      // 📥 DOWNLOAD PROFILE PIC
      // ==========================
      var ppData = await axios({
        method: "GET",
        url: profileUrl,
        responseType: "arraybuffer",
        timeout: 30000
      });

      await fs.writeFile(ppPath, ppData.data);

      // ==========================
      // 🎨 LOAD IMAGES
      // ==========================
      var bg = await loadImage(bgPath);
      var pp = await loadImage(ppPath);

      var canvas = createCanvas(
        bg.width,
        bg.height
      );

      var ctx = canvas.getContext("2d");

      // Background
      ctx.drawImage(
        bg,
        0,
        0,
        bg.width,
        bg.height
      );

      // ==========================
      // 👤 PROFILE SIZE
      // ==========================
      var ppSize =
        Math.min(bg.width, bg.height) * 0.19;

      var x =
        (bg.width - ppSize) / 2;

      var y =
        bg.height * 0.035;

      var centerX =
        x + ppSize / 2;

      var centerY =
        y + ppSize / 2;

      // ==========================
      // 🔵 GLOW
      // ==========================
      ctx.save();

      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 25;

      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        ppSize / 2 + 7,
        0,
        Math.PI * 2
      );

      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 9;
      ctx.stroke();

      ctx.restore();

      // ==========================
      // 👤 CIRCULAR PROFILE PIC
      // ==========================
      ctx.save();

      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        ppSize / 2,
        0,
        Math.PI * 2
      );

      ctx.closePath();
      ctx.clip();

      var scale = Math.max(
        ppSize / pp.width,
        ppSize / pp.height
      );

      var newWidth =
        pp.width * scale;

      var newHeight =
        pp.height * scale;

      var ppX =
        x + (ppSize - newWidth) / 2;

      var ppY =
        y + (ppSize - newHeight) / 2;

      ctx.drawImage(
        pp,
        ppX,
        ppY,
        newWidth,
        newHeight
      );

      ctx.restore();

      // ==========================
      // ⚪ WHITE BORDER
      // ==========================
      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        ppSize / 2,
        0,
        Math.PI * 2
      );

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      ctx.stroke();

      // ==========================
      // 👑 CROWN
      // ==========================
      ctx.font =
        Math.floor(ppSize * 0.20) + "px Arial";

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        "👑",
        centerX,
        y - 3
      );

      // ==========================
      // 💬 LABEL
      // ==========================
      var label =
        isReply ? "REPLIED" : "MENTIONED";

      var labelY =
        y + ppSize + 22;

      ctx.font =
        "bold " +
        Math.floor(ppSize * 0.10) +
        "px Arial";

      var textWidth =
        ctx.measureText(label).width;

      var boxWidth =
        textWidth + 40;

      var boxHeight =
        Math.floor(ppSize * 0.17);

      var boxX =
        centerX - boxWidth / 2;

      // ==========================
      // 🖤 LABEL BOX
      // ==========================
      ctx.fillStyle =
        "rgba(0,0,0,0.78)";

      ctx.beginPath();

      // roundRect-এর বদলে normal rectangle
      ctx.rect(
        boxX,
        labelY,
        boxWidth,
        boxHeight
      );

      ctx.fill();

      // ==========================
      // 🤍 LABEL TEXT
      // ==========================
      ctx.fillStyle = "#ffffff";

      ctx.fillText(
        label,
        centerX,
        labelY + boxHeight / 2
      );

      // ==========================
      // 💾 CREATE IMAGE
      // ==========================
      var buffer =
        canvas.toBuffer(
          "image/jpeg",
          0.95
        );

      await fs.writeFile(
        outputPath,
        buffer
      );

      // ==========================
      // 📤 SEND IMAGE
      // ==========================
      await message.reply({
        body: isReply
          ? "😂 𝙍𝙀𝙋𝙇𝙄𝙀𝘿 𝙈𝙊𝙏𝙊 🏍️🔥"
          : "😂 𝙈𝙀𝙉𝙏𝙄𝙊𝙉 𝙈𝙊𝙏𝙊 🏍️🔥",

        attachment:
          fs.createReadStream(outputPath)
      });

      // ==========================
      // 🧹 CLEAN
      // ==========================
      setTimeout(function() {

        try {
          if (bgPath) fs.removeSync(bgPath);
          if (ppPath) fs.removeSync(ppPath);
          if (outputPath) fs.removeSync(outputPath);
        } catch (e) {}

      }, 15000);

    } catch (error) {

      console.error(
        "❌ MOTOPP ERROR:",
        error
      );

      return message.reply(
        "❌ 𝙈𝙊𝙏𝙊𝙋𝙋 𝙀𝙍𝙍𝙊𝙍!\n" +
        "⚠️ Profile Picture অথবা Canvas সমস্যা হয়েছে।"
      );
    }
  }
};
