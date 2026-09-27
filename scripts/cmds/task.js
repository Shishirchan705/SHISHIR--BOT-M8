const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const DAY_MS = 24 * 60 * 60 * 1000;

// Helper to convert to Serif Bold style
const boldText = (text) => {
  const fonts = {
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
  };
  return text.split('').map(char => fonts[char] || char).join('');
};

const TASKS_CONFIG = [
  { id: 1, title: "1. Chat 1 Message", sub: "Send 1 message in group", target: 1, reward: 20000, rewardTxt: "20K", type: "chat" },
  { id: 2, title: "2. Chat 100 Messages", sub: "Send 100 messages in group", target: 100, reward: 200000, rewardTxt: "200K", type: "chat" },
  { id: 3, title: "3. Guess Play", sub: "Play Guess 20 times", target: 20, reward: 1000000, rewardTxt: "1M", type: "guess" },
  { id: 4, title: "4. Mine Play", sub: "Play Mine 20 times", target: 20, reward: 1000000, rewardTxt: "1M", type: "mine" },
  { id: 5, title: "5. Waifu Play", sub: "Play Waifu 25 times", target: 25, reward: 2000000, rewardTxt: "2M", type: "waifu" },
  { id: 6, title: "6. Quiz Play", sub: "Play Quiz 25 times", target: 25, reward: 3000000, rewardTxt: "3M", type: "quiz" },
  { id: 7, title: "7. Aniqz Play", sub: "Play Aniqz 25 times", target: 25, reward: 2000000, rewardTxt: "2M", type: "aniqz" },
  { id: 8, title: "8. Free Fire Play", sub: "Play Free Fire 10 times", target: 10, reward: 1000000, rewardTxt: "1M", type: "ff" },
  { id: 9, title: "9. Slot Play", sub: "Play Slot 25 times", target: 25, reward: 1000000, rewardTxt: "1M", type: "slot" },
  { id: 10, title: "10. Actor Play", sub: "Play Actor 10 times", target: 10, reward: 2000000, rewardTxt: "2M", type: "actor" },
  { id: 11, title: "11. Flag Game", sub: "Play Flag Game 25 times", target: 25, reward: 2000000, rewardTxt: "2M", type: "flag" },
  { id: 12, title: "12. Dice Play", sub: "Play Dice 25 times", target: 25, reward: 2000000, rewardTxt: "2M", type: "dice" },
  { id: 13, title: "13. Cartoon Play", sub: "Play Cartoon 25 times", target: 25, reward: 2000000, rewardTxt: "2M", type: "cartoon" },
  { id: 14, title: "14. Completionist", sub: "Claim all 13 daily missions", target: 13, reward: 5000000, rewardTxt: "5M", type: "completionist" }
];

// Mapping words/cmd prefixes to Task Types
const CMD_MAPPING = {
  "slot": "slot",
  "guess": "guess",
  "mine": "mine",
  "waifu": "waifu",
  "quiz": "quiz",
  "aniqz": "aniqz",
  "ff": "ff",
  "freefire": "ff",
  "actor": "actor",
  "flag": "flag",
  "dice": "dice",
  "cartoon": "cartoon"
};

async function handleTaskProgress(event, usersData) {
  if (!event.senderID || !event.body) return;

  const uid = event.senderID;
  const body = event.body.trim().toLowerCase();
  
  const user = await usersData.get(uid);
  const data = user.data || {};
  let taskData = data.taskData || { lastReset: Date.now(), progress: {}, claimed: {} };

  // Reset after 24 Hrs
  if (Date.now() - taskData.lastReset >= DAY_MS) {
    taskData = { lastReset: Date.now(), progress: {}, claimed: {} };
  }

  // 1. Always increment general chat
  taskData.progress.chat = (taskData.progress.chat || 0) + 1;

  // 2. Check for game commands (e.g., "(slot 3m", "slot 3m", "/slot", "guess")
  const cleanBody = body.replace(/^[^\w]+/, ''); // Strip prefix symbols like (, /, !
  const firstWord = cleanBody.split(/\s+/)[0];

  if (CMD_MAPPING[firstWord]) {
    const gameType = CMD_MAPPING[firstWord];
    taskData.progress[gameType] = (taskData.progress[gameType] || 0) + 1;
  }

  await usersData.set(uid, { data: { ...data, taskData } });
}

module.exports = {
  config: {
    name: "task",
    aliases: ["daily"],
    version: "3.5",
    author: "Mr.King",
    countDown: 3,
    role: 0,
    shortDescription: { en: "Daily tasks & rewards UI" },
    longDescription: { en: "Complete daily tasks to get rewards with Canvas dashboard" },
    category: "economy",
    guide: {
      en: "{p}task\n{p}task claim <task_number>"
    }
  },

  onEvent: async function ({ event, usersData }) {
    await handleTaskProgress(event, usersData);
  },

  onChat: async function ({ event, usersData }) {
    await handleTaskProgress(event, usersData);
  },

  onStart: async function ({ api, event, args, usersData, threadsData, message }) {
    const { threadID, senderID, messageID } = event;

    const user = await usersData.get(senderID);
    const data = user.data || {};
    let taskData = data.taskData || { lastReset: Date.now(), progress: {}, claimed: {} };

    // Reset check
    if (Date.now() - taskData.lastReset >= DAY_MS) {
      taskData = { lastReset: Date.now(), progress: {}, claimed: {} };
      await usersData.set(senderID, { data: { ...data, taskData } });
    }

    /* ───────── CLAIM SYSTEM (2nd Image Design) ───────── */
    if (args[0] === "claim" || (parseInt(args[0]) >= 1 && parseInt(args[0]) <= 14)) {
      const taskId = parseInt(args[0] === "claim" ? args[1] : args[0]);

      if (!taskId || taskId < 1 || taskId > 14) {
        return message.reply(`• ❌ ${boldText("Please provide a valid task number (1 - 14).")}`);
      }

      const task = TASKS_CONFIG.find(t => t.id === taskId);

      if (taskData.claimed[taskId]) {
        return message.reply(`• ⚠️ ${boldText("You already claimed this mission!")}`);
      }

      let currentProgress = 0;
      if (task.id === 14) {
        currentProgress = Object.keys(taskData.claimed).filter(k => k != "14").length;
      } else {
        currentProgress = taskData.progress[task.type] || 0;
      }

      if (currentProgress < task.target) {
        return message.reply(
          `• ❌ ${boldText("Mission not completed yet!")}\n` +
          `📊 ${boldText("Progress:")} ${currentProgress}/${task.target}`
        );
      }

      const currentMoney = user.money || 0;
      taskData.claimed[taskId] = true;

      await usersData.set(senderID, {
        money: currentMoney + task.reward,
        data: { ...data, taskData }
      });

      api.setMessageReaction("🦅", messageID, () => {}, true);

      return message.reply(
        `🎉 ${boldText(`Mission ${taskId} completed!`)}\n\n` +
        `💰 ${boldText(`Reward: +${task.reward.toLocaleString()}`)}\n\n` +
        `✅ ${boldText("Money added to your balance!")}`
      );
    }

    /* ───────── CANVAS UI GENERATOR ───────── */
    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const userName = await usersData.getName(senderID);
      const threadInfo = await threadsData.get(threadID);
      const threadName = threadInfo.threadName || "Group Chat";

      let adminNames = [];
      try {
        const groupInfo = await api.getThreadInfo(threadID);
        const adminIDs = groupInfo.adminIDs.map(a => a.id);
        for (const aID of adminIDs.slice(0, 3)) {
          const aName = await usersData.getName(aID);
          adminNames.push(aName);
        }
      } catch (e) {
        adminNames = ["Admin"];
      }
      const adminText = adminNames.join(", ");

      const canvas = createCanvas(1000, 1250);
      const ctx = canvas.getContext("2d");

      // Background Gradient
      const bg = ctx.createLinearGradient(0, 0, 0, 1250);
      bg.addColorStop(0, "#080e18");
      bg.addColorStop(0.5, "#0b1426");
      bg.addColorStop(1, "#050911");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1000, 1250);

      // Header Box
      ctx.fillStyle = "rgba(18, 30, 49, 0.7)";
      roundRect(ctx, 40, 40, 920, 130, 20, true, true, "#1e304b");

      // Avatar
      try {
        const avatarUrl = await usersData.getAvatarUrl(senderID);
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(110, 105, 45, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 65, 60, 90, 90);
        ctx.restore();

        ctx.strokeStyle = "#3894ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(110, 105, 47, 0, Math.PI * 2, true);
        ctx.stroke();
      } catch (e) {}

      // Name & Completed Missions
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(userName, 180, 95);

      const completedCount = Object.keys(taskData.claimed).length;
      ctx.fillStyle = "#8fa3bf";
      ctx.font = "20px sans-serif";
      ctx.fillText(`Missions Completed: ${completedCount}/14`, 180, 125);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("⚡ DAILY TASK LIST", 40, 215);

      // Task Grid
      let startX = 40;
      let startY = 240;
      const cardW = 445;
      const cardH = 110;
      const gapX = 30;
      const gapY = 20;

      for (let i = 0; i < TASKS_CONFIG.length; i++) {
        const task = TASKS_CONFIG[i];
        const col = i % 2;
        const row = Math.floor(i / 2);

        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        ctx.fillStyle = "rgba(15, 25, 42, 0.8)";
        roundRect(ctx, x, y, cardW, cardH, 12, true, true, "#1c2c44");

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(task.title, x + 15, y + 30);

        ctx.fillStyle = "#6c82a0";
        ctx.font = "13px sans-serif";
        ctx.fillText(task.sub, x + 15, y + 50);

        ctx.fillStyle = "#ff9d3b";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`◆ ${task.rewardTxt}`, x + cardW - 75, y + 30);

        let prog = 0;
        if (task.id === 14) {
          prog = Object.keys(taskData.claimed).filter(k => k != "14").length;
        } else {
          prog = taskData.progress[task.type] || 0;
        }

        const isClaimed = taskData.claimed[task.id];
        const isCompleted = prog >= task.target;

        if (isClaimed) {
          ctx.fillStyle = "#00ffaa";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText("☑ CLAIMED", x + cardW - 105, y + 85);
        } else if (isCompleted) {
          ctx.fillStyle = "#00ffaa";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText("☑ COMPLETE", x + cardW - 115, y + 85);
        } else {
          ctx.fillStyle = "#6c82a0";
          ctx.font = "14px sans-serif";
          ctx.fillText(`${prog}/${task.target}`, x + cardW - 60, y + 85);
        }

        const barX = x + 15;
        const barY = y + 78;
        const barW = cardW - 140;
        const barH = 6;

        ctx.fillStyle = "#142133";
        roundRect(ctx, barX, barY, barW, barH, 3, true, false);

        let fillPercent = Math.min(prog / task.target, 1);
        if (fillPercent > 0) {
          ctx.fillStyle = isCompleted || isClaimed ? "#00ffaa" : "#3894ff";
          roundRect(ctx, barX, barY, barW * fillPercent, barH, 3, true, false);
        }
      }

      // Footer
      const footerY = 1180;
      ctx.strokeStyle = "#1c2c44";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, footerY);
      ctx.lineTo(960, footerY);
      ctx.stroke();

      ctx.fillStyle = "#5d7495";
      ctx.font = "15px sans-serif";
      ctx.fillText(`🏰 Group: ${threadName}`, 40, footerY + 35);
      ctx.fillText(`👑 Admins: ${adminText}`, 500, footerY + 35);

      const cachePath = path.join(__dirname, "cache", `task_${senderID}.png`);
      fs.ensureDirSync(path.join(__dirname, "cache"));
      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(cachePath, buffer);

      return message.reply({
        attachment: fs.createReadStream(cachePath)
      }, () => {
        fs.unlinkSync(cachePath);
        api.setMessageReaction("🦅", messageID, () => {}, true);
      });

    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  }
};

function roundRect(ctx, x, y, width, height, radius, fill, stroke, strokeColor) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) {
    ctx.strokeStyle = strokeColor || "#000";
    ctx.stroke();
  }
}
