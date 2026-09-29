const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "life",
    version: "1.0",
    author: "Mehedi-saito",
    countDown: 5,
    role: 0,
    shortDescription: "Life meme generator",
    longDescription: "Puts profile pic on the cat's face. Own face if no mention, target face if mentioned/replied.",
    category: "fun",
    guide: {
      en: "{pn} (own profile) OR reply/mention someone"
    }
  },

  onStart: async function ({ api, event, usersData, message }) {
    const { threadID, messageID, senderID, type, messageReply, mentions } = event;

    let targetID;

    // Priority: reply > mention > self
    if (type === "message_reply") {
      targetID = messageReply.senderID;
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else {
      // No mention/reply → use own profile
      targetID = senderID;
    }

    try {
      const templateUrl = "https://drive.google.com/uc?export=download&id=1txwKYn7RBRSPcO_Tu_uKINvoK1nc08t3";

      const avatarTargetUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const [template, avatarTarget] = await Promise.all([
        loadImage(templateUrl),
        loadImage(avatarTargetUrl)
      ]);

      // Canvas size matching original image (488 x 480)
      const canvas = createCanvas(488, 480);
      const ctx = canvas.getContext("2d");

      // Draw background template
      ctx.drawImage(template, 0, 0, 488, 480);

      // Draw avatar in circle function
      const drawAvatarInCircle = (img, cx, cy, radius) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(
          img,
          cx - radius,
          cy - radius,
          radius * 2,
          radius * 2
        );
        ctx.restore();
      };

      // White border around avatar
      const drawCircleBorder = (cx, cy, radius) => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 4;
        ctx.stroke();
      };

      // Position of the cat's face
      // cx = 160, cy = 230, radius = 70
      const cx = 160;
      const cy = 230;
      const radius = 70;

      // Draw border then avatar
      drawCircleBorder(cx, cy, radius);
      drawAvatarInCircle(avatarTarget, cx, cy, radius);

      // Get name of the target
      let name = "Unknown";
      try {
        name = await usersData.getName(targetID);
      } catch (e) {
        name = "Unknown";
      }

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const filePath = path.join(cacheDir, `life_${senderID}.png`);
      await fs.writeFile(filePath, canvas.toBuffer("image/png"));

      await message.reply({
        body: `${name} life`,
        attachment: fs.createReadStream(filePath)
      });

      fs.unlink(filePath, () => {});
    } catch (err) {
      console.error("[LIFE ERROR]", err);
      return message.reply("❌ Failed to generate the image. Please try again.");
    }
  }
};
