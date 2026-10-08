"use strict";

const axios = require("axios");
const FormData = require("form-data");

module.exports = {
    config: {
        name: "sr",
        version: "2.0.0",
        author: "SHISHIR",
        countDown: 5,
        role: 0,
        shortDescription: "Reverse image search",
        longDescription: "Upload a replied image and generate reverse image search links",
        category: "utility",
        guide: "{pn}"
    },

    onStart: async function ({ api, event }) {

        try {

            if (!event.messageReply) {
                return api.sendMessage(
                    "🖼️ Reply to an image and type sr",
                    event.threadID,
                    event.messageID
                );
            }

            const attachments = event.messageReply.attachments || [];

            if (attachments.length === 0) {
                return api.sendMessage(
                    "❌ No attachment found in the replied message.",
                    event.threadID,
                    event.messageID
                );
            }

            const image = attachments.find(function (item) {
                return (
                    item.type === "photo" ||
                    item.type === "image" ||
                    item.type === "animated_image"
                );
            });

            if (!image || !image.url) {
                return api.sendMessage(
                    "❌ Please reply to a valid image.",
                    event.threadID,
                    event.messageID
                );
            }

            await api.sendMessage(
                "⏳ Processing image...\n🔍 Creating reverse image search links...",
                event.threadID,
                event.messageID
            );

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
                    filename: "shishir-search.jpg",
                    contentType: "image/jpeg"
                }
            );

            const uploadResponse = await axios.post(
                "https://catbox.moe/user/api.php",
                form,
                {
                    headers: form.getHeaders(),
                    timeout: 60000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );

            const publicImageUrl = String(uploadResponse.data).trim();

            if (!publicImageUrl.startsWith("http")) {
                throw new Error("Image upload failed");
            }

            const googleLens =
                "https://lens.google.com/uploadbyurl?url=" +
                encodeURIComponent(publicImageUrl);

            const yandex =
                "https://yandex.com/images/search?rpt=imageview&url=" +
                encodeURIComponent(publicImageUrl);

            const bing =
                "https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=" +
                encodeURIComponent(publicImageUrl);

            const message =
                "╭━━━━━━━━━━━━━━━━━━━━╮\n" +
                "┃  🔍 REVERSE IMAGE SEARCH\n" +
                "╰━━━━━━━━━━━━━━━━━━━━╯\n\n" +
                "🖼️ Image uploaded successfully!\n\n" +
                "🌐 GOOGLE LENS\n" +
                googleLens +
                "\n\n" +
                "🌐 YANDEX IMAGES\n" +
                yandex +
                "\n\n" +
                "🌐 BING VISUAL SEARCH\n" +
                bing +
                "\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n" +
                "⚡ MADE BY SHISHIR";

            return api.sendMessage(
                message,
                event.threadID,
                event.messageID
            );

        } catch (error) {

            console.error(
                "[SR ERROR]",
                error.response && error.response.data
                    ? error.response.data
                    : error.message
            );

            return api.sendMessage(
                "❌ Image processing failed.\nPlease try again later.",
                event.threadID,
                event.messageID
            );
        }
    }
};
