const fs = require("fs-extra");
const path = require("path");
const https = require("https");
const { utils } = global;

const prefixCooldown = new Map();

module.exports = {
    config: {
        name: "prefix",
        version: "1.3",
        author: "SHISHIR",
        countDown: 5,
        role: 0,
        description: "Change the bot's prefix or show current prefix.",
        category: "config",

        guide: {
            en:
                "{pn} <new> → change prefix in this chat\n" +
                "{pn} <new> -g → change global prefix (admin only)\n" +
                "{pn} reset → reset to default\n" +
                "prefix → show current prefix"
        }
    },

    langs: {
        en: {
            reset:
                "✅ ᴘʀᴇꜰɪx ʀᴇꜱᴇᴛ ᴛᴏ ᴅᴇꜰᴀᴜʟᴛ: %1",

            onlyAdmin:
                "❌ ᴏɴʟʏ ᴀᴅᴍɪɴ ᴄᴀɴ ᴄʜᴀɴɢᴇ ɢʟᴏʙᴀʟ ᴘʀᴇꜰɪx",

            confirmGlobal:
                "⚠️ ʀᴇᴀᴄᴛ ᴛᴏ ᴄᴏɴꜰɪʀᴍ ɢʟᴏʙᴀʟ ᴘʀᴇꜰɪx → %1",

            successGlobal:
                "✅ ɢʟᴏʙᴀʟ ᴘʀᴇꜰɪx ᴄʜᴀɴɢᴇᴅ ᴛᴏ: %1",

            successThread:
                "✅ ᴘʀᴇꜰɪx ᴄʜᴀɴɢᴇᴅ ᴛᴏ: %1\n\nᴜꜱᴇ ᴛʜɪꜱ ᴘʀᴇꜰɪx ꜰᴏʀ ᴄᴏᴍᴍᴀɴᴅꜱ ɴᴏᴡ.",

            myPrefix:
                "╭─────〔 ᴘʀᴇꜰɪx 〕─────╮\n\n" +
                "👋 ʜᴇʏ %1\n\n" +
                "┣ 🌐 ɢʟᴏʙᴀʟ : %2\n" +
                "┣ 💬 ᴛʜɪꜱ ᴄʜᴀᴛ : %3\n" +
                "┣ 📚 ᴄᴍᴅ : ʜᴇʟᴘ\n" +
                "┣ 👑 ᴅᴇᴠ : 𝑺𝑯𝑰𝑺𝑯𝑰𝑹 ☠️\n\n" +
                "╰─────〔 ᴇɴᴊᴏʏ 〕─────╯"
        }
    },

    onStart: async function ({
        message,
        role,
        args,
        commandName,
        event,
        threadsData,
        getLang
    }) {

        if (!args[0]) {
            return message.reply(
                getLang(
                    "myPrefix",
                    "there",
                    global.GoatBot.config.prefix,
                    utils.getPrefix(event.threadID) ||
                    global.GoatBot.config.prefix
                )
            );
        }

        if (args[0].toLowerCase() === "reset") {

            await threadsData.set(
                event.threadID,
                null,
                "data.prefix"
            );

            return message.reply(
                getLang(
                    "reset",
                    global.GoatBot.config.prefix
                )
            );
        }

        const newPrefix = args[0];

        if (args[1] === "-g") {

            if (role < 2) {
                return message.reply(
                    getLang("onlyAdmin")
                );
            }

            return message.reply(
                getLang("confirmGlobal", newPrefix),
                (err, info) => {

                    if (err) return;

                    global.GoatBot.onReaction.set(
                        info.messageID,
                        {
                            commandName,
                            author: event.senderID,
                            newPrefix,
                            setGlobal: true,
                            messageID: info.messageID
                        }
                    );
                }
            );
        }

        await threadsData.set(
            event.threadID,
            newPrefix,
            "data.prefix"
        );

        return message.reply(
            getLang("successThread", newPrefix)
        );
    },

    onReaction: async function ({
        message,
        event,
        Reaction,
        getLang
    }) {

        if (!Reaction) return;

        if (event.userID !== Reaction.author) {
            return;
        }

        if (!Reaction.setGlobal) {
            return;
        }

        const { newPrefix } = Reaction;

        global.GoatBot.config.prefix = newPrefix;

        try {
            fs.writeFileSync(
                global.client.dirConfig,
                JSON.stringify(
                    global.GoatBot.config,
                    null,
                    2
                )
            );
        } catch (error) {
            console.error(
                "[prefix] config save error:",
                error.message
            );
        }

        return message.reply(
            getLang("successGlobal", newPrefix)
        );
    },

    onChat: async function ({
        event,
        message,
        getLang,
        usersData
    }) {

        if (!event.body) return;

        const body = event.body.trim().toLowerCase();

        if (body !== "prefix") return;

        // Prevent duplicate/rapid replies
        const key = `${event.threadID}:${event.senderID}`;
        const now = Date.now();
        const last = prefixCooldown.get(key) || 0;

        if (now - last < 10000) return;

        prefixCooldown.set(key, now);

        const userName =
            await usersData.getName(event.senderID);

        const botName =
            global.GoatBot.config.nickNameBot ||
            "SHISHIR BOT";

        const globalPrefix =
            global.GoatBot.config.prefix;

        const threadPrefix =
            utils.getPrefix(event.threadID) ||
            globalPrefix;

        const mediaURLs = [
            "https://i.imgur.com/5a9DjQ6.gif",
            "https://i.imgur.com/LC948jn.gif"
        ];

        const cacheDir =
            path.join(__dirname, "cache");

        fs.ensureDirSync(cacheDir);

        const indexFile =
            path.join(
                cacheDir,
                "prefix_media_index.json"
            );

        let index = 0;

        try {
            if (fs.existsSync(indexFile)) {
                const data = JSON.parse(
                    fs.readFileSync(
                        indexFile,
                        "utf8"
                    )
                );

                index =
                    ((data.index || 0) + 1) %
                    mediaURLs.length;
            }

            fs.writeFileSync(
                indexFile,
                JSON.stringify({ index })
            );
        } catch {}

        const mediaPath =
            path.join(
                cacheDir,
                `prefix_media_${index}.gif`
            );

        if (!fs.existsSync(mediaPath)) {
            try {
                await downloadFile(
                    mediaURLs[index],
                    mediaPath
                );
            } catch {}
        }

        return message.reply({
            body: getLang(
                "myPrefix",
                userName,
                globalPrefix,
                threadPrefix,
                botName
            ),

            attachment:
                fs.existsSync(mediaPath)
                    ? [fs.createReadStream(mediaPath)]
                    : []
        });
    }
};

function downloadFile(url, dest) {

    return new Promise((resolve, reject) => {

        const file =
            fs.createWriteStream(dest);

        https.get(url, res => {

            if (
                res.statusCode === 301 ||
                res.statusCode === 302
            ) {
                file.close();
                fs.unlink(dest, () => {});

                return downloadFile(
                    res.headers.location,
                    dest
                )
                .then(resolve)
                .catch(reject);
            }

            if (res.statusCode !== 200) {

                file.close();
                fs.unlink(dest, () => {});

                return reject(
                    new Error(
                        `HTTP ${res.statusCode}`
                    )
                );
            }

            res.pipe(file);

            file.on("finish", () => {
                file.close(resolve);
            });

        }).on("error", error => {

            file.close();
            fs.unlink(dest, () => {});

            reject(error);
        });
    });
      }
