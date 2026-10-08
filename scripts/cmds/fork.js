module.exports = {
  config: {
    name: "fork",
    aliases: ["repo", "source"],
    version: "2.0",
    author: "Anik Islam Sadik",
    countDown: 3,
    role: 0,
    longDescription: "Returns the link to the official repository.",
    category: "system",
    guide: { en: "{pn}" }
  },

  onStart: async function({ message }) {
    const text = `╭━━━ 〈 𝑺𝑯𝑰𝑺𝑯𝑰𝑹-𝐁𝐎𝐓-M8 〉 ━━━╮
        
✧ 𝐒𝐭𝐚𝐭𝐮𝐬  ➪ 🟢 𝐀𝐜𝐭𝐢𝐯𝐞 & 𝐒𝐭𝐚𝐛𝐥𝐞
✧ 𝐂𝐫𝐞𝐚𝐭𝐨𝐫 ➪ 👑 𓆩 𝑨𝒉𝒎𝒆𝑫,𝒛 𝑺𝑯𝑰𝑺𝑯𝑰𝑹 𓆪
✧ 𝐆𝐢𝐭𝐇𝐮𝐛  ➪ 🔗 শিশির বসের প্যান্টের নিচে fork কাছে চুষে দাও আর নিয়ে যাও যাও! 🙂🦆

╰━━━ 〈 𝐊𝐞𝐞𝐩 𝐒𝐮𝐩𝐩𝐨𝐫𝐭𝐢𝐧𝐠 ❤️ 〉 ━━━╯`;
    
    await message.reply(text);
  }
};
