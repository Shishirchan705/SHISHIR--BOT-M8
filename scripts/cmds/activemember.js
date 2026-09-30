const axios = require('axios');

// 🔒 AUTHOR LOCK SYSTEM
const AUTHOR = "FARHAN-KHAN";

module.exports = {
  config: {
    name: "activemember",
    aliases: ["am"],
    version: "1.0",
    author: AUTHOR,
    countDown: 5,
    role: 0,
    shortDescription: "Get the top 15 users by message count in the current chat",
    longDescription: "Get the top 15 users by message count in the current chat",
    category: "box chat",
    guide: "{p}{n}",
  },

  onStart: async function ({ api, event }) {

    // 🔒 HARD AUTHOR LOCK
    if (module.exports.config.author !== AUTHOR) {
      return api.sendMessage(
        "⛔ AUTHOR NAME CHANGED!\n🔒 THIS FILE IS NOW LOCKED.",
        event.threadID
      );
    }

    const threadId = event.threadID;
    const senderId = event.senderID;

    try {

      const participants = await api.getThreadInfo(threadId, { participantIDs: true });

      const messageCounts = {};

      // initialize participants
      participants.participantIDs.forEach(participantId => {
        messageCounts[participantId] = 0;
      });

      // get messages
      const messages = await api.getThreadHistory(threadId, 1000);

      messages.forEach(message => {
        const messageSender = message.senderID;
        if (messageCounts[messageSender] !== undefined) {
          messageCounts[messageSender]++;
        }
      });

      // sort top 15
      const topUsers = Object.entries(messageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

      // build user list
      const userList = [];
      for (const [userId, messageCount] of topUsers) {
        const userInfo = await api.getUserInfo(userId);
        const userName = userInfo[userId].name;
        userList.push(`\n『${userName}』 \nSent ${messageCount} messages \n`);
      }

      const messageText = `Active members are 💁‍♀️:\n${userList.join('\n')}`;

      api.sendMessage(
        {
          body: messageText,
          mentions: [
            {
              tag: senderId,
              id: senderId,
              type: "user"
            }
          ]
        },
        threadId
      );

    } catch (error) {
      console.error(error);
    }
  },
};
