const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const FOLDER_ID = "1u28lGcZnRZTn48cfsL06n55jmW2CDU19";

module.exports.config = {
    name: "onlyanimevideo2",
    aliases: ["oav3", "oavv3"],
    version: "2.0",
    author: "Mr.Tom ☠️✌🏼",
    countDown: 2,
    role: 0,
    category: "media",
    guide: { 
        en: "Use {p}oav2 | {p}oav2 sync | Comment '🛜' to pull random video" 
    }
};

module.exports.onChat = async ({ api, event }) => {
    if (event.senderID == api.getCurrentUserID()) return;

    const msg = event.body ? event.body.trim() : "";
    if (msg === "🛜") {
        return handleDriveMedia(api, event);
    }
};

module.exports.onStart = async ({ api, event, args }) => {
    if (args[0] && args[0].toLowerCase() === "sync") {
        return handleDriveSync(api, event);
    }
    return handleDriveMedia(api, event);
};

async function getFolderFiles() {
    const urls = [
        `https://drive.google.com/embeddedfolderview?id=${FOLDER_ID}`,
        `https://docs.google.com/uc?export=list&id=${FOLDER_ID}`
    ];
    
    let htmlData = "";
    for (const url of urls) {
        try {
            const res = await axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
                },
                timeout: 10000
            });
            if (res.data) {
                htmlData = res.data;
                break;
            }
        } catch (e) {
            continue;
        }
    }

    if (!htmlData) return [];

    const fileIds = new Set();
    const regex1 = /"([^"]+)"\s*,\s*\[\s*"([^"]+)"/g;
    const regex2 = /\/file\/d\/([a-zA-Z0-9_-]+)/g;

    let match;
    while ((match = regex1.exec(htmlData)) !== null) {
        if (match[1] && match[1].length > 15) fileIds.add(match[1]);
    }

    if (fileIds.size === 0) {
        while ((match = regex2.exec(htmlData)) !== null) {
            if (match[1] && match[1].length > 15) fileIds.add(match[1]);
        }
    }

    return Array.from(fileIds);
}

async function handleDriveSync(api, event) {
    const { threadID, messageID } = event;
    try {
        api.setMessageReaction("🛜", messageID, () => {}, true);

        const files = await getFolderFiles();

        if (files.length === 0) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("⚡ [SYSTEM LOG] Unable to fetch drive contents. Drive access restricted.", threadID, messageID);
        }

        api.setMessageReaction("☃️", messageID, () => {}, true);

        const report = `☠️ [ SYSTEM SYNC COMPLETE ] ☠️\n` +
                       `───────────────────\n` +
                       `• Total Detected Files : ${files.length}\n` +
                       `• Target Cloud Node    : Google Drive API\n` +
                       `• Status               : Online & Fast Stream Ready\n` +
                       `───────────────────\n` +
                       `⚡ Developer: Mr.Tom ☠️✌🏼`;

        return api.sendMessage(report, threadID, messageID);

    } catch (err) {
        console.error(err);
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ [SYSTEM ERROR] Sync failed due to network timeout.", threadID, messageID);
    }
}

async function handleDriveMedia(api, event) {
    const { threadID, messageID } = event;

    try {
        api.setMessageReaction("🛜", messageID, () => {}, true);

        const files = await getFolderFiles();

        if (files.length === 0) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ [SYSTEM LOG] No files found or Google Drive link is private/blocked.", threadID, messageID);
        }

        const randomFileId = files[Math.floor(Math.random() * files.length)];
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${randomFileId}`;

        const cacheDir = path.join(__dirname, "cache");
        fs.ensureDirSync(cacheDir);

        const filePath = path.join(cacheDir, `oav2_${Date.now()}.mp4`);

        const response = await axios({
            url: downloadUrl,
            method: "GET",
            responseType: "stream",
            timeout: 20000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        writer.on("finish", () => {
            return api.sendMessage({
                body: `☠️ [ Onlyanimevideo2 By Shishir] ☠️\n───────────────────\n⚡ System Status: High-Speed Payload Delivered\n👑 Coded By: SHI'SHIR  ☠️✌🏼`,
                attachment: fs.createReadStream(filePath)
            }, threadID, (err) => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                if (!err) {
                    api.setMessageReaction("☃️", messageID, () => {}, true);
                } else {
                    api.setMessageReaction("❌", messageID, () => {}, true);
                    api.sendMessage("❌ [SYSTEM ERROR] Video size exceeds maximum allowed upload limit.", threadID, messageID);
                }
            }, messageID);
        });

        writer.on("error", (err) => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ [SYSTEM ERROR] File stream write failed.", threadID, messageID);
        });

    } catch (err) {
        console.error(err);
        api.setMessageReaction("❌", messageID, () => {}, true);
        api.sendMessage("❌ [FATAL ERROR] Cloud connection interrupted or network timeout.", threadID, messageID);
    }
          }
