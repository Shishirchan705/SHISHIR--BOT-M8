const axios = require("axios");

module.exports = {
  config: {
    name: "shishir",
    version: "3.1.0",
    author: "SHISHIR",
    role: 0,
    shortDescription: "SHISHIR — Personal Information",
    category: "Information",
    guide: {
      en: "type shishir"
    }
  },

  onStart: async function () {},

  onChat: async function ({ api, event }) {
    const text = event.body?.trim().toLowerCase();

    if (text !== "shishir") return;

    // আপনার Catbox ভিডিও এর লিঙ্কটি নিচে বসান (https://files.catbox.moe/...)
    const videoUrl = "https://files.catbox.moe/zqjh1p.mp4";

    const info = `
╔═══━━━─── 𓆩🖤𓆪 ───━━━═══╗
        𓆩 𝐒𝐇𝐈𝐒𝐇𝐈𝐑 𓆪
       𝑷𝒓𝒐𝒇𝒊𝒍𝒆 𝑰𝒏𝒇𝒐
╚═══━━━─── 𓆩🖤𓆪 ───━━━═══╝

   ⟡ 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗟 𝗗𝗘𝗧𝗔𝗜𝗟𝗦 ⟡

┏━━━━━━━━━━━━━━━━━━━━━━┓
┃ 𓆩👑𓆪 𝐍𝐚𝐦𝐞
┃       ↳ 𝑺𝑯𝑰'𝑺𝑯𝑰𝑹
┃
┃ 𓆩⚡𓆪 𝐍𝐢𝐜𝐤𝐧𝐚𝐦𝐞
┃       ↳ 𝐒𝐡𝐢𝐬𝐡𝐢𝐫
┃
┃ 𓆩🇧🇩𓆪 𝐂𝐨𝐮𝐧𝐭𝐫𝐲
┃       ↳ 𝐁𝐚𝐧𝐠𝐥𝐚𝐝𝐞𝐬𝐡
┃
┃ 𓆩🏡𓆪 𝐇𝐨𝐦𝐞
┃       ↳ 𝐒𝐢𝐫𝐚𝐣𝐠𝐚𝐧𝐣
┃
┃ 𓆩📍𓆪 𝐋𝐨𝐜𝐚𝐭𝐢𝐨𝐧
┃       ↳ 𝐃𝐡𝐚𝐤𝐚 • 𝐌𝐢𝐫𝐩𝐮𝐫
┃
┃ 𓆩🎓𓆪 𝐄𝐝𝐮𝐜𝐚𝐭𝐢𝐨𝐧
┃       ↳ 𝐈𝐧𝐭𝐞𝐫 𝟏𝐬𝐭 𝐘𝐞𝐚𝐫
┃
┃ 𓆩☪️𓆪 𝐑𝐞𝐥𝐢𝐠𝐢𝐨𝐧
┃       ↳ 𝐈𝐬𝐥𝐚𝐦
┃
┃ 𓆩🖤𓆪 𝐑𝐞𝐥𝐚𝐭𝐢𝐨𝐧𝐬𝐡𝐢𝐩
┃       ↳ 𝐒𝐢𝐧𝐠𝐥𝐞
┃
┃ 𓆩🎨𓆪 𝐅𝐚𝐯𝐨𝐮𝐫𝐢𝐭𝐞 𝐂𝐨𝐥𝐨𝐮𝐫
┃       ↳ 𝐁𝐥𝐚𝐜𝐤
┗━━━━━━━━━━━━━━━━━━━━━━┛

      ╭───────────────╮
      │ 𓆩👑𓆪 𝐎𝐖𝐍𝐄𝐑 𓆩👑𓆪 │
      │     𝐒𝐇𝐈𝐒𝐇𝐈𝐑      │
      ╰───────────────╯

   ⏤͟͟͞͞ 𓆩🖤𓆪 𝐋𝐄𝐒𝐒 𝐓𝐀𝐋𝐊
   ⏤͟͟͞͞ 𓆩⚡𓆪 𝐌𝐎𝐑𝐄 𝐀𝐂𝐓𝐈𝐎𝐍𝐒

╔═══━━━─── 𓆩♛𓆪 ───━━━═══╗
        𝐒𝐇𝐈𝐒𝐇𝐈𝐑 𓆩🖤𓆪
╚═══━━━─── 𓆩♛𓆪 ───━━━═══╝
`;

    try {
      const response = await axios.get(videoUrl, { responseType: "stream" });

      return api.sendMessage(
        {
          body: info,
          attachment: response.data
        },
        event.threadID,
        event.messageID
      );
    } catch (error) {
      console.error(error);
      // ভিডিও লোড না হলেও টেক্সট মেসেজটি চলে যাবে
      return api.sendMessage(info, event.threadID, event.messageID);
    }
  }
};
