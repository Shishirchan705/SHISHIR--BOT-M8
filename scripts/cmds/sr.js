"use strict";

const axios = require("axios");
const FormData = require("form-data");

module.exports = {
    config: {
        name: "sr",
        version: "1.0.1",
        author: "SHISHIR",
        countDown: 5,
        role: 0,
        shortDescription: "Reverse image search",
        longDescription: "Search an image using Google Lens, Yandex and Bing",
        category: "utility",
        guide: "{pn}"
    },

    onStart: async function ({ api, event }) {

        if (!event.messageReply) {
            return api.sendMessage(
                "🖼️ একটি ছবির মেসেজে Reply করে sr লিখুন।",
                event.threadID,
                event.messageID
            );
        }

        const attachments = event.messageReply.attachments || [];

        if (!attachments.length) {
            return api.sendMessage(
                "❌ Reply করা মেসেজে কোনো ছবি পাওয়া যায়নি।",
                event.threadID,
                event.messageID
            );
        }

        const image = attachments.find(
            item => item.type === "photo" || item.type === "image"
        );

        if (!image || !image.url) {
            return api.sendMessage(
                "❌ Reply করা মেসেজে একটি ছবি থাকতে হবে।",
                event.threadID,
                event.messageID
            );
        }

        await api.sendMessage(
            "⏳ ছবি প্রসেস হচ্ছে...\n🔍 Reverse image search link তৈরি করছি...",
            event.threadID,
            event.messageID
        );

        try {
            const imageResponse = await axios.get(image.url, {
                responseType: "arraybuffer",
                timeout: 30000
            });

            const form = new FormData();

            form.append("reqtype", "fileupload");
            form.append(
                "fileToUpload",
                Buffer.from(imageResponse.data),
                {
                    filename: "search.jpg",
                    contentType: "image/jpeg"
                }
            );

            const upload = await axios.post(
                "https://catbox.moe/user/api.php",
                form,
                {
                    headers: form.getHeaders(),
                    timeout: 60000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );

            const imageUrl = String(upload.data).trim();

            if (!imageUrl.startsWith("http")) {
                throw new Error("Catbox upload failed");
            }

            const google =
                "https://lens.google.com/uploadbyurl?url=" +
                encodeURIComponent(imageUrl);

            const yandex =
                "https://yandex.com/images/search?rpt=imageview&url=" +
                encodeURIComponent(imageUrl);

            const bing =
                "https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=" +
                encodeURIComponent(imageUrl);

            const message =
`╭━━━〔 🔍 REVERSE IMAGE SEARCH 〕━━━╮
┃
┃ 🖼️ Image Ready!
┃
┃ 🌐 Google Lens:
┃ ${google}
┃
┃ 🌐 Yandex:
┃ ${yandex}
┃
┃ 🌐 Bing:
┃ ${bing}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

⚡ MADE BY SHISHIR`;

            return api.sendMessage(
                message,
                event.threadID,
                event.messageID
            );

        } catch (error) {

            console.error(
                "[SR ERROR]",
                error.response?.data || error.message
            );

            return api.sendMessage(
                "❌ ছবিটি প্রসেস করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।",
                event.threadID,
                event.messageID
            );
        }
    }
};
