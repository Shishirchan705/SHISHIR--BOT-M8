const fs = require("fs-extra");
const request = require("request");
const path = require("path");

module.exports = {
  config: {
    name: "owner",
    version: "1.4.0",
    author: "SHISHIR",
    role: 0,
    shortDescription: "Owner information with image and video",
    category: "Information",
    guide: {
      en: "owner"
    }
  },

  onStart: async function ({ api, event }) {
    const ownerText =
`╔═══❖𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢❖═══╗

⋆✦⋆⎯⎯⎯⎯⎯⎯⎯⎯⎯⋆✦⋆
[🤖]↓:𝐁𝐎𝐓→𓆩👑𓆪 𝑶𝑾𝑵𝑬𝑹:↓
➤ 『 𝐀𝐡𝐦𝐞𝐃’𝐬 𝐒𝐇𝐈'𝐒𝐇𝐈𝐑 』
⋆✦⋆⎯⎯⎯⎯⎯⎯⎯⎯⎯⋆✦⋆

╠══❖『𝐁𝐈𝐎 𝐀𝐃𝐌𝐈𝐍』❖══╣
⊱༅༎😽💚༅༎⊱

꧁༒☬ 𝐒𝐇𝐈𝐒𝐇𝐈𝐑 𝐁𝐎𝐓 ☬༒꧂

🖤 Your Group's New Digital Family 🤖
⚡ Smart • Fast • Unique 🙂

⊱༅༎😽💚༅༎⊱
╠═════════════════╣

[🏠]↓:𝐀𝐃𝐃𝐑𝐄𝐒𝐒:↓
➤ 『 𝐒𝐈𝐑𝐀𝐉𝐆𝐀𝐍𝐉 』

⋆✦⋆⎯⎯⎯⎯⎯⎯⎯⎯⎯⋆✦⋆

[🕋]↓:𝐑𝐄𝐋𝐈𝐆𝐈𝐎𝐍:↓
➤ 『 𝐈𝐒𝐋𝐀𝐌 』

⋆✦⋆⎯⎯⎯⎯⎯⎯⎯⎯⎯⋆✦⋆

[🚻]↓:𝐆𝐄𝐍𝐃𝐄𝐑:↓
➤ 『 𝐌𝐀𝐋𝐄 』

⋆✦⋆⎯⎯⎯⎯⎯⎯⎯⎯⎯⋆✦⋆

[💞]↓:𝐑𝐄𝐋𝐀𝐓𝐈𝐎𝐍𝐒𝐇𝐈𝐏:↓
➤ 『 𝐒𝐈𝐍𝐆𝐋𝐄 』

⋆✦⋆⎯⎯⎯⎯⎯⎯⎯⎯⎯⋆✦⋆

[🧑‍🔧]↓:𝐖𝐎𝐑𝐊:↓
➤ 『 𝐒𝐭𝐮𝐝𝐞𝐧𝐭 』

⋆✦⋆═══🅲🅾🅽🆃🅰🅲🆃═══⋆✦⋆

[📞] 𝗪𝗛𝗔𝗧𝗦𝗔𝗣𝗣
➤ https://wa.me/+61592841571046

[🌍] 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 𝐈𝐃 (❶)
➤ https://m.me/61592841571046

[🌍] 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 𝐈𝐃 (❷)
➤ Vai 2nd account bolte kisui nai sob saspent hoiye jai🙂

╚═══❖𝗧𝗛𝗔𝗡𝗞 𝗬𝗢𝗨❖═══╝`;

    const cacheDir = path.join(__dirname, "cache");

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // 🖼️ Owner Image - Imgur
    const imgLink ="";

    // 🎥 Owner Video - Catbox
    const videoLink = "https://files.catbox.moe/e1iber.mp4";

    const imgPath = path.join(cacheDir, "owner.jpg");
    const videoPath = path.join(cacheDir, "owner.mp4");

    try {
      // Download image
      await new Promise((resolve, reject) => {
        request(imgLink)
          .pipe(fs.createWriteStream(imgPath))
          .on("finish", resolve)
          .on("error", reject);
      });

      // Download video
      await new Promise((resolve, reject) => {
        request(videoLink)
          .pipe(fs.createWriteStream(videoPath))
          .on("finish", resolve)
          .on("error", reject);
      });

      // Send image + owner info
      await new Promise((resolve, reject) => {
        api.sendMessage(
          {
            body: ownerText,
            attachment: fs.createReadStream(imgPath)
          },
          event.threadID,
          (err) => {
            if (err) return reject(err);
            resolve();
          },
          event.messageID
        );
      });

      // Send Catbox video
      await new Promise((resolve, reject) => {
        api.sendMessage(
          {
            body: "🎥 𝐎𝐖𝐍𝐄𝐑 𝐕𝐈𝐃𝐄𝐎\n\n꧁༒☬ 𝐒𝐇𝐈𝐒𝐇𝐈𝐑 ☬༒꧂",
            attachment: fs.createReadStream(videoPath)
          },
          event.threadID,
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      // Delete cache files
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

    } catch (error) {
      console.error("OWNER ERROR:", error);

      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

      api.sendMessage(
        "❌ Owner image/video পাঠাতে সমস্যা হয়েছে। Catbox link ঠিক আছে কিনা দেখো।",
        event.threadID,
        event.messageID
      );
    }
  }
};
