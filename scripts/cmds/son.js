const activeFights = {};

module.exports = {
  config: {
    name: "son",
    version: "1.0.0",
    author: "ARIYAN | shot",
    countDown: 5,
    role: 2,
    category: "fun",
    shortDescription: { en: "Automated fun roasts for a mentioned user" },
    guide: { en: "{pn} @mention | {pn} off" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, mentions } = event;

    // বোট বন্ধ করার কমান্ড
    if (args[0] === "off") {
      if (!activeFights[threadID]) {
        return message.reply("shishir bss আগে তো চালু করতে হবে ভাই tar por xudi! 😞");
      }
      delete activeFights[threadID];
      return message.reply("xuda  অফ করলাম! 🗿");
    }

    const mention = Object.keys(mentions)[0];
    if (!mention) {
      return message.reply("kare xudbo boss bolo sawya fata dei aktu! 😞");
    }

    if (activeFights[threadID]) {
      return message.reply("age tare cdna off koro shishir boss! 🙂🙏");
    }

    try {
      const userInfo = await api.getUserInfo(mention);
      const user = userInfo[mention];

      let genderText;
      switch (user?.gender) {
        case 1: genderText = "মেয়ে"; break;
        case 2: genderText = "ছেলে"; break;
        default: genderText = "বন্ধু";
      }

      activeFights[threadID] = {
        targetID: mention,
        index: 0,
        gender: genderText
      };

      const targetName = mentions[mention].replace("@", "");
      return message.reply(`😆 কিরে ${targetName}! কেমন আছিস? এবার তোর সাথে একটু মজা হবে!`);
    } catch (err) {
      return message.reply("ইউজার ইনফো পেতে সমস্যা হয়েছে!");
    }
  },

  onChat: async function ({ event, message }) {
    const { threadID, senderID } = event;

    if (!activeFights[threadID]) return;

    const fight = activeFights[threadID];

    if (senderID == fight.targetID) {
      const insults = [
        `খাংকির ${fight.gender}, তোর মার ভোদা তে গাধার মাল ফালাবো! 😈`,
        `তোর মা কে চুদে চুদে পল্টি মারবো, গাধার ${fight.gender}! 😡`,
        `বাড়ির পাশে আমার মাল ফেলে দিয়ে তোর মা কে চুদতে চাই! 🔥`,
        `চুদা খাওয়া তোর মার, আমি তোর মার ভোদায় টান দিবো! 💣`,
        `তোর মার গুদে ফুল ট্যাবলেট পুশ করে, গাধার ${fight.gender}! 😛`,
        `তোর বোনের মুখে মাল ফালানোর কথা ভাবি, মাগী ${fight.gender}!`,
        `তোর মাকে গাধার মতো চুদে তোর মা বলব "এটা কার মাল?"`,
        `তোর মার গুদে ইনপুট দিয়ে আউটপুট নেবো, পোলাপাইন ${fight.gender}!`,
        `তোর মার ভোদায় গাধার মতো মাল ফালিয়ে দেবো, আজকের রাতেই! 🔥`,
        `এখন মাগীর ${fight.gender} তোর মার ভোদা চুদে, এক টুকরা দেবো! 😠`,
        `তোর মা কে চুদে পল্টি মারবো, গাধার ${fight.gender}! 🤡`
      ];

      const currentInsult = insults[fight.index % insults.length];
      fight.index++;

      return message.reply(currentInsult);
    }
  }
};
