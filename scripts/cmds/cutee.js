const login = require("fb-chat-api");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// বটের কনফিগারেশন এবং ওনার ইনফো
const config = {
    ownerName: "Shishir (শিশির)",
    email: "unknown ",
    password: "unknown "
};

login({ email: config.email, password: config.password }, (err, api) => {
    if (err) return console.error("Login failed:", err);

    console.log(`Bot started successfully! Owner: ${config.ownerName}`);

    api.listenMqtt(async (err, event) => {
        if (err) return console.error(err);

        if (event.type === "message" && event.body) {
            const text = event.body.trim().toLowerCase();

            if (text === "cutee" || text === "!cutee") {
                
                // ক্যাটবক্সের ভিডিও ডাইরেক্ট লিঙ্কগুলো
                const cuteVideos = [
    "https://files.catbox.moe/vklati.mp4",
    "https://files.catbox.moe/tytytf.mp4",
    "https://files.catbox.moe/0q76xu.mp4",
    "https://files.catbox.moe/059wqi.mp4",
    "https://files.catbox.moe/13iaas.mp4",
    "https://files.catbox.moe/xfb3ku.mp4"
];

                const randomUrl = cuteVideos[Math.floor(Math.random() * cuteVideos.length)];
                const tempFilePath = path.join(__dirname, "temp_cute.mp4");

                try {
                    const response = await axios({
                        method: 'get',
                        url: randomUrl,
                        responseType: 'stream'
                    });

                    const writer = fs.createWriteStream(tempFilePath);
                    response.data.pipe(writer);

                    writer.on('finish', () => {
                        // ওনারের নাম মেসেজের ক্যাপশনে সুন্দরভাবে সাজিয়ে দেওয়া হলো
                        const msgData = {
                            body: `Here is your cute video! ✨🐱\n\n👑 Bot Owner: ${config.ownerName}`,
                            attachment: fs.createReadStream(tempFilePath)
                        };

                        api.sendMessage(msgData, event.threadID, () => {
                            fs.unlinkSync(tempFilePath);
                        }, event.messageID);
                    });

                } catch (error) {
                    console.error("Video send error:", error);
                    api.sendMessage(`Sorry, video send করতে সমস্যা হয়েছে! 😿\nContact Owner: ${config.ownerName}`, event.threadID, event.messageID);
                }
            }
        }
    });
});
