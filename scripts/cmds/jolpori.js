const login = require("facebook-chat-api");
const fs = require("fs");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

// আপনার App State / Appstate.json ফাইল
const appState = JSON.parse(fs.readFileSync("appstate.json", "utf8"));

// জলপরীর ছবির ব্যাকগ্রাউন্ড URL (imgur বা অন্য যেকোনো সোর্স)
const MERMAID_IMAGE_URL = "https://i.imgur.com/0FeUWva.jpeg"; // এখানে জলপরীর ব্যাকগ্রাউন্ড ছবির ইমেগার লিঙ্ক দিন

login({ appState }, (err, api) => {
  if (err) return console.error(err);

  api.setOptions({ listenEvents: true });

  api.listenMqtt(async (err, event) => {
    if (err) return console.error(err);

    // শুধু মেসেজ অথবা রিপ্লাই/মেনশন চেক করা
    if (event.type === "message" || event.type === "message_reply") {
      const botID = api.getCurrentUserID();
      const isMentioned = event.mentions && Object.keys(event.mentions).includes(botID);
      const isReplyToBot = event.messageReply && event.messageReply.senderID === botID;

      // যদি বটকে মেনশন করা হয় অথবা বটের মেসেজে রিপ্লাই দেওয়া হয়
      if (isMentioned || isReplyToBot) {
        try {
          const senderID = event.senderID;

          // ১. ব্যবহারকারীর প্রোফাইল পিকচার সংগ্রহ
          const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=500&width=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

          // ২. ইমেজ প্রসেসিং (Canvas Setup)
          const canvas = createCanvas(800, 800); // জলপরীর ছবির সাইজ অনুযায়ী অ্যাডজাস্ট করুন
          const ctx = canvas.getContext("2d");

          // জলপরীর ছবি ও প্রোফাইল পিকচার লোড
          const baseMermaidImg = await loadImage(MERMAID_IMAGE_URL);
          const userAvatar = await loadImage(avatarUrl);

          // প্রথমে জলপরীর ব্যাকগ্রাউন্ড ছবি আঁকা
          ctx.drawImage(baseMermaidImg, 0, 0, canvas.width, canvas.height);

          // জলপরীর মুখের স্থানে ব্যবহারকারীর প্রোফাইল পিক বসানো (X, Y, Width, Height)
          // আপনার জলপরীর ছবির পজিশন অনুযায়ী নিচের মানগুলো অ্যাডজাস্ট করুন:
          const faceX = 350; 
          const faceY = 150; 
          const faceWidth = 120; 
          const faceHeight = 120;

          ctx.save();
          // মুখ গোল আকৃতির করতে চাইলে:
          ctx.beginPath();
          ctx.arc(faceX + faceWidth / 2, faceY + faceHeight / 2, faceWidth / 2, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();

          // প্রোফাইল ছবি ড্র করা
          ctx.drawImage(userAvatar, faceX, faceY, faceWidth, faceHeight);
          ctx.restore();

          // ৩. ছবি ক্যাশ/সেভ করা
          const outputPath = `./mermaid_${senderID}.png`;
          const buffer = canvas.toBuffer("image/png");
          fs.writeFileSync(outputPath, buffer);

          // ৪. মেসেঞ্জারে ব্যাক রিপ্লাই পাঠানো
          const msg = {
            body: "🧜‍♀️ এই যে তোমার জলপরী রূপ!",
            attachment: fs.createReadStream(outputPath)
          };

          api.sendMessage(msg, event.threadID, () => {
            // পাঠানোর পর সাময়িক ফাইল মুছে ফেলা
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          }, event.messageID);

        } catch (error) {
          console.error("ছবি প্রসেস করতে সমস্যা হয়েছে:", error);
          api.sendMessage("দুঃখিত, ছবিটি তৈরি করা সম্ভব হয়নি!", event.threadID, event.messageID);
        }
      }
    }
  });
});
