const moment = require("moment-timezone");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "autotimer",
  version: "5.1",
  role: 0,
  author: "ꜰᴀʀʜᴀɴ-ᴋʜᴀɴ",
  description: "⏰ প্রতি ঘণ্টায় ভিডিওসহ অটো মেসেজ পাঠাবে (Ultra Optimized)",
  category: "AutoTime",
  countDown: 3,
};

module.exports.onLoad = async function ({ api }) {

  // 🔒 author lock check
  if (module.exports.config.author !== "ꜰᴀʀʜᴀɴ-ᴋʜᴀɴ") {
    console.error("❌ Author নাম পরিবর্তন করা হয়েছে। ফাইল চলবে না।");
    return process.exit(1);
  }

  const timerData = {
  "12:00 AM": { text: "⌚┆রাত ১২টা বাজে 😴\nডায়েট শুরু করার প্ল্যান ছিল? ভুলে যাও 😂\nএখন শুধু বালিশ আর ঘুমের সাথে রিলেশন", video: "https://files.catbox.moe/y9irm8.mp4" },

  "01:00 AM": { text: "⌚┆রাত ১টা 🌙\nযারা এখনো জেগে আছে তারা অফিসিয়ালি ‘নাইট কিং’ 🧟‍♂️\nবাকি মানুষজন স্বপ্নে CEO হয়ে গেছে 😂", video: "https://files.catbox.moe/gitfya.mp4" },

  "02:00 AM": { text: "⌚┆রাত ২টা 😹\nএই সময় শুধু দুই টাইপ মানুষ জেগে থাকে\n১. প্রেমে কষ্ট পাওয়া 😭 ২. পাগল 😂", video: "https://files.catbox.moe/9aavty.mp4" },

  "03:00 AM": { text: "⌚┆রাত ৩টা 🕺\nএই সময় ঘুম না আসলে বুঝে নিও—WiFi তোমাকে ডাকছে 😂📱", video: "https://files.catbox.moe/p78siw.mp4" },

  "04:00 AM": { text: "⌚┆ভোর ৪টা 🌄\nফজর না পড়ে আবার ‘৫ মিনিট আরও’ বললে সেটা ২ ঘণ্টা হয়ে যায় 😆", video: "https://files.catbox.moe/9uvit1.mp4" },

  "05:00 AM": { text: "⌚┆সকাল ৫টা ☀️\nঘুম থেকে উঠো… না হলে স্বপ্নও তোমাকে ব্লক করে দেবে 😂", video: "https://files.catbox.moe/34etgc.mp4" },

  "06:00 AM": { text: "⌚┆সকাল ৬টা 😴\nউঠে পড়ছো নাকি? নাকি আবার ‘আর ৫ মিনিট’ চলছে? 😂", video: "https://files.catbox.moe/stk4lq.mp4" },

  "07:00 AM": { text: "⌚┆সকাল ৭টা 🍞\nব্রেকফাস্ট না করলে মোবাইলও তোমাকে চার্জ দেয় না 😂🔋", video: "https://files.catbox.moe/ladp3x.mp4" },

  "08:00 AM": { text: "⌚┆সকাল ৮টা 💼\nকাজে যাও না গেলে বসও তোমাকে মিস করবে… স্যালারি কাটার জন্য 😂", video: "https://files.catbox.moe/l8vx40.mp4" },

  "09:00 AM": { text: "⌚┆সকাল ৯টা 🕘\nমন চাইছে ঘুমাতে, কিন্তু জীবন বলছে ‘ডিউটি কর’ 😭", video: "https://files.catbox.moe/hgo8gp.mp4" },

  "10:00 AM": { text: "⌚┆সকাল ১০টা ☀️\nএখন যারা কাজ করছে তারা মানুষ… আর যারা ঘুমাচ্ছে তারা কিং 😂", video: "https://files.catbox.moe/ejx7a6.mp4" },

  "11:00 AM": { text: "⌚┆সকাল ১১টা 🔥\nকাজ করছো নাকি শুধু চা খেয়ে জীবন চালাচ্ছো? ☕😂", video: "https://files.catbox.moe/gogfic.mp4" },

  "12:00 PM": { text: "⌚┆দুপুর ১২টা ❤️\nভাত খাওয়ার সময়, ডায়েট আবার কাল থেকে শুরু হবে ইনশাআল্লাহ 😂", video: "https://files.catbox.moe/ilmb5j.mp4" },

  "01:00 PM": { text: "⌚┆দুপুর ১টা 🤲\nনামাজ পড়ে আসো… না হলে গিল্টি ফিলিং ফ্রি আসবে 😂", video: "https://files.catbox.moe/bq7ngm.mp4" },

  "02:00 PM": { text: "⌚┆দুপুর ২টা 🍛\nখাওয়া দাওয়া করো… না হলে পেট বিদ্রোহ ঘোষণা করবে 😂", video: "https://files.catbox.moe/27mwt2.mp4" },

  "03:00 PM": { text: "⌚┆বিকাল ৩টা 🧠\nকাজ করতে করতে মাথা বলছে ‘আমাকে ছুটি দে ভাই’ 😵‍💫", video: "https://files.catbox.moe/eyqcud.mp4" },

  "04:00 PM": { text: "⌚┆বিকাল ৪টা 😆\nআসরের সময়… না গেলে পরকালে HR ডেকে পাঠাবে 😂", video: "https://files.catbox.moe/vlgjrp.mp4" },

  "05:00 PM": { text: "⌚┆বিকাল ৫টা 🙂\nএকটু বসে থাকো… না হলে পা-ও তোমার বিরুদ্ধে মামলা করবে 😂", video: "https://files.catbox.moe/bjjtmk.mp4" },

  "06:00 PM": { text: "⌚┆সন্ধ্যা ৬টা 🌆\nপরিবারের সাথে না থাকলে তারা WhatsApp এ রাগ করবে 😂", video: "https://files.catbox.moe/22enjn.mp4" },

  "07:00 PM": { text: "⌚┆সন্ধ্যা ৭টা 🌙\nএশার নামাজ না পড়লে রাতের WiFi সিগনাল দুর্বল হয়ে যাবে 😂", video: "https://files.catbox.moe/j7fh66.mp4" },

  "08:00 PM": { text: "⌚┆রাত ৮টা 😌\nদিন শেষ… এখন শুধু Netflix আর চিন্তা ‘জীবন কি?’ 😂", video: "https://files.catbox.moe/btrwyg.mp4" },

  "09:00 PM": { text: "⌚┆রাত ৯টা 😴\nঘুমের সময়… কিন্তু মস্তিষ্ক বলছে ‘একটা রিল দেখে নেই’ 😂", video: "https://files.catbox.moe/qb2mq3.mp4" },

  "10:00 PM": { text: "⌚┆রাত ১০টা 💤\nঘুমাতে যাও… না হলে সকাল তোমাকে জোর করে উঠাবে 😂", video: "https://files.catbox.moe/l15d8y.mp4" },

  "11:00 PM": { text: "⌚┆রাত ১১টা 🌙\nশেষ কথা: ‘আজকে ঘুমাবো’ — কিন্তু স্ক্রলিং শেষ হয় না 😂", video: "https://files.catbox.moe/rnsdlb.mp4" }
};

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

  // 🔥 FIX: per group + per time tracking
  if (!global.__sentMap) global.__sentMap = {};

  const checkTimeAndSend = async () => {
    const now = moment().tz("Asia/Dhaka").format("hh:mm A");

    if (!timerData[now]) return;

    const todayDate = moment().tz("Asia/Dhaka").format("DD-MM-YYYY");
    const { text, video } = timerData[now];

    const videoName = now.replace(/[: ]/g, "_") + ".mp4";
    const videoPath = path.join(cacheDir, videoName);

    if (!fs.existsSync(videoPath)) {
      try {
        const res = await axios.get(video, { responseType: "arraybuffer" });
        fs.writeFileSync(videoPath, Buffer.from(res.data));
      } catch (err) {
        console.error("Video download failed:", err);
        return;
      }
    }

    const msg =
`╭━━〔 🌤️ 𝗔𝗨𝗧𝗢 𝗧𝗜𝗠𝗘 🌤️ 〕━━╮
 ╭───────────────╮
 ┃ 📅 ➤ ${todayDate}       
 ┃ 🕒 ➤ ${now}                 
 ╰───────────────╯
 ╭───────────────╮
   ${text} 
 ╰───────────────╯
╰━〔 💫 𝗧𝗜𝗠𝗘 𝗨𝗣𝗗𝗔𝗧𝗘 💫 〕━╯`;

    try {
      const allThreads = await api.getThreadList(1000, null, ["INBOX"]);

      // 🔥 REMOVE DUPLICATE THREADS
      const groups = [...new Map(allThreads.map(t => [t.threadID, t])).values()]
        .filter(t => t.isGroup);

      for (const thread of groups) {

        // 🔥 FIX: prevent same group double send per time
        const key = `${thread.threadID}_${now}`;
        if (global.__sentMap[key]) continue;

        global.__sentMap[key] = true;

        api.sendMessage({
          body: msg,
          attachment: fs.createReadStream(videoPath)
        }, thread.threadID);
      }

      console.log("✅ Sent:", now);

    } catch (e) {
      console.error("❌ Error:", e);
    }
  };

  setInterval(checkTimeAndSend, 60000);
};

module.exports.onStart = () => {};
