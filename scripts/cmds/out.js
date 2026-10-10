module.exports = {
  config: {
    name: "out",
    aliases: ["out"],
    version: "2.5",
    author: "xalman",
    countDown: 5,
    role: 2,
    shortDescription: "Bot will leave group",
    longDescription: "",
    category: "admin",
    guide: {
      vi: "{pn} [tid,blank]",
      en: "{pn} [tid,blank]"
    }
  },

  onStart: async function ({ api, event, args }) {
    let id;

    if (!args.join(" ")) {
      id = event.threadID;
    } else {
      id = parseInt(args.join(" "));
    }

    const leaveMessage = `-শিশির বস বের করে দিলা খুব কষ্ট পাইলাম ভালো থাইকো ভাবির খেয়াল রাইখো LOVE YOU Boss-☺️🫂👑..!🦆💨`;

    return api.sendMessage(
      leaveMessage,
      id,
      () => api.removeUserFromGroup(api.getCurrentUserID(), id)
    );
  }
};
