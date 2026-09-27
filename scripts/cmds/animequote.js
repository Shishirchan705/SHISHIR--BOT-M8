const axios = require("axios");

module.exports = {
  config: {
    name: "animequote",
    aliases: ["aq", "quote"],
    version: "1.0.1",
    author: "Mr.King",
    role: 0,
    category: "anime",
    shortDescription: "Get a random anime quote",
    guide: "{pn}"
  },

  onStart: async function ({ api, event, message }) {
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const response = await axios.get("https://api.animechan.io/v1/quotes/random");
      const resData = response.data.data || response.data;

      const quoteText = resData.content || resData.quote || "No quote found";
      const characterName = typeof resData.character === "object" ? resData.character.name : (resData.character || "Unknown");
      const animeName = typeof resData.anime === "object" ? resData.anime.name : (resData.anime || "Unknown");

      const replyMsg = 
`𓍢ִ໋🌸✧ ── ͟͟͞͞Aɴɪᴍᴇ Qᴜᴏᴛᴇ ── ✧🌸𓍢ִ໋🌷͙֒ ᥫ᭡—͞  

" ${quoteText} "

ᥫ᭡ Cʜᴀʀᴀᴄᴛᴇʀ : ${characterName}
ᥫ᭡ Aɴɪᴍᴇ : ${animeName}

𓍢ִ໋🌷 Mᴀɪɴᴛᴀɪɴᴇʀ : Ahmed'z shi'shir☠️✌🏼`;

      api.setMessageReaction("✨", event.messageID, () => {}, true);
      return message.reply(replyMsg);

    } catch (error) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("𓍢ִ໋🌸✧ Fᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ ᴀɴɪᴍᴇ qᴜᴏᴛᴇ. Pʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ Lᴀᴛᴇʀ! ✧🌸𓍢ִ໋");
    }
  }
};
