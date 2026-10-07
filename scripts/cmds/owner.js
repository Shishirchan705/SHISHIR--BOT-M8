const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

module.exports = {
    config: {
        name: "owner",
        version: "3.0.0",
        author: "Shishir",
        countDown: 5,
        role: 0,
        shortDescription: "বটের ওনার শিশির ভাইয়ের পূর্ণাঙ্গ বিবরণ",
        longDescription: "বটের মালিক শিশির ভাইয়ের ইউনিক প্রোফাইল, ঠিকানা এবং Catbox থেকে ভিডিও মেসেজ।",
        category: "info",
        guide: "{pn}"
    },

    onStart: async function ({ api, event }) {
        const cacheDir = path.join(__dirname, 'cache');
        const videoPath = path.join(cacheDir, 'shishir_owner_video.mp4');

        // 🔗 আপনার Catbox ভিডিও লিংক (অবশ্যই ডাইরেক্ট .mp4 লিংক বসাবেন)
        const catboxVideoUrl = "https://files.catbox.moe/vujjw2.mp4"; 

        // 📜 শিশির ভাইয়ের ইউনিক স্টাইলিশ বায়ো
        const ownerDetails = `
╭━━━❮ 👑 𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡 👑 ❯━━━╮

     ⚡ 𝗦𝗛𝗜𝗦𝗛𝗜𝗥  𝗔𝗛𝗠𝗘𝗗 ⚡
  ───━━━━━───━━━───━━━━━───

👤 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗟 𝗜𝗡𝗙𝗢
━━━━━━───────━━━━━━
▸ 𝗙𝘂𝗹𝗹 𝗡𝗮𝗺𝗲 : 𝗦𝗵𝗶𝘀𝗵𝗶𝗿 (শিশির)
▸ 𝗡𝗶𝗰𝗸 𝗡𝗮𝗺𝗲 : YOUR ABBU
▸ 𝗔𝗴𝗲        : 17+
▸ 𝗥𝗲𝗹𝗶𝗴𝗶𝗼𝗻   : 𝗜𝘀𝗹𝗮𝗺
▸ 𝗡𝗮𝘁𝗶𝗼𝗻𝗮𝗹𝗶𝘁𝘆: 𝗕𝗮𝗻𝗴𝗹𝗮𝗱𝗲𝘀𝗵𝗶 🇧🇩

🏡 𝗔𝗗𝗗𝗥𝗘𝗦𝗦 & 𝗟𝗢𝗖𝗔𝗧𝗜𝗢𝗡
━━━━━━───────━━━━━━
▸ 𝗩𝗶𝗹𝗹𝗮𝗴𝗲    : [🙂🙂🙂]
▸ 𝗧𝗵𝗮𝗻𝗮      : [owh owh owh]
▸ 𝗗𝗶𝘀𝘁𝗿𝗶𝗰𝘁   : [🙂🙂🙂]
▸ 𝗗𝗶𝘃𝗶𝘀𝗶𝗼𝗻   : [Dhaka ]

💻 𝗣𝗥𝗢𝗙𝗘𝗦𝗦𝗜𝗢𝗡 & 𝗦𝗞𝗜𝗟𝗟𝗦
━━━━━━───────━━━━━━
▸ 𝗢𝗰𝗰𝘂𝗽𝗮𝘁𝗶𝗼𝗻 : 𝗦𝘁𝘂𝗱𝗲𝗻𝘁 & 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿
▸ 𝗘𝘅𝗽𝗲𝗿𝘁𝗶𝘀𝗲   : 𝗝𝗮𝘃𝗮𝗦𝗰𝗿𝗶𝗽𝘁, 𝗡𝗼𝗱𝗲.𝗷𝘀 & 𝗕𝗼𝘁 𝗠𝗮𝗸𝗶𝗻𝗴
▸ 𝗛𝗼𝗯𝗯𝗶𝗲𝘀     : 𝗖𝗼𝗱𝗶𝗻𝗴, 𝗚𝗮𝗺𝗶𝗻𝗴, 𝗧𝗿𝗮𝘃𝗲𝗹𝗶𝗻𝗴

🌐 𝗖𝗢𝗡𝗧𝗔𝗖𝗧 & 𝗦𝗢𝗖𝗜𝗔𝗟𝗦
━━━━━━───────━━━━━━
▸ 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸  : https://facebook.com/shishir_fb_id
▸ 𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 : https://instagram.com/shishir_insta
▸ 𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽  : +𝟴𝟴𝟬𝟭𝟳493--26
▸ 𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺  : https://t.me/shishir_tg
▸ 𝗚𝗶𝘁𝗛𝘂𝗯    : https://github.com/shishir_dev

💬 𝗢𝗪𝗡𝗘𝗥'𝗦 𝗡𝗢𝗧𝗘
━━━━━━───────━━━━━━
"kono pblm hoile soja inbox lojjha xudaiyo na https://www.facebook.com/profile.php?id=61594799624906&mibextid=ZbWKwL!"

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
      ✨ 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗱 𝗕𝘆 𝗦𝗵𝗶𝘀𝗵𝗶𝗿 ✨
        `;

        try {
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            const response = await axios({
                method: 'get',
                url: catboxVideoUrl,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(videoPath);
            response.data.pipe(writer);

            writer.on('finish', () => {
                api.sendMessage({
                    body: ownerDetails,
                    attachment: fs.createReadStream(videoPath)
                }, event.threadID, () => {
                    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                }, event.messageID);
            });

            writer.on('error', (err) => {
                console.error("Video Download Stream Error:", err);
                api.sendMessage(ownerDetails, event.threadID, event.messageID);
            });

        } catch (error) {
            console.error("Catbox Video Fetch Error:", error);
            api.sendMessage(ownerDetails, event.threadID, event.messageID);
        }
    }
};
