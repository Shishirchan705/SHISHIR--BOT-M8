const { findUid, getStreamFromURL } = global.utils;

const regExCheckURL = /^https?:\/\/[^ "]+$/;

module.exports = {
	config: {
		name: "pfp",
		aliases: ["profile2", "pp2", "cover"],
		version: "1.1",
		author: "SHISHIR",
		countDown: 5,
		role: 0,
		description: {
			en: "View a user's profile picture and cover photo"
		},
		category: "info",
		guide: {
			en:
				"{pn}: View your own profile picture and cover photo" +
				"\n{pn} @tag: View a tagged user's photos" +
				"\n{pn} <profile link>: Search by profile link" +
				"\n{pn} <uid>: Search by user ID" +
				"\nReply to a message to view that user's photos"
		}
	},

	onStart: async function ({ message, event, args, api }) {
		await react(api, event, "⏳");

		try {
			let uid = event.senderID;

			if (event.messageReply) {
				uid = event.messageReply.senderID;
			}
			else if (Object.keys(event.mentions || {}).length > 0) {
				uid = Object.keys(event.mentions)[0];
			}
			else if (args[0] && /^\d+$/.test(args[0])) {
				uid = args[0];
			}
			else if (args[0] && regExCheckURL.test(args[0])) {
				if (typeof findUid !== "function")
					throw new Error("findUid utility is unavailable");

				uid = await findUid(args[0]);
			}

			if (!uid)
				throw new Error("User ID not found");

			const info = await api.getUserInfo(uid);
			const user = info && info[uid];

			if (!user)
				throw new Error("User information not found");

			const attachment = [];

			const profileURL =
				user.profilePictureHd ||
				user.profilePicUrl ||
				user.thumbSrc;

			if (profileURL) {
				attachment.push(
					await getStreamFromURL(profileURL)
				);
			}

			if (user.coverPhoto) {
				attachment.push(
					await getStreamFromURL(user.coverPhoto)
				);
			}

			if (attachment.length === 0)
				throw new Error("No accessible photos found");

			await message.reply({
				body:
					"╭━━━『 USER PROFILE 』━━━╮\n" +
					"👤 Name: " + (user.name || "Unknown") + "\n" +
					"🆔 UID: " + uid + "\n" +
					"🖼️ Photos: " + attachment.length + "\n" +
					"╰━━━『 SHISHIR 』━━━╯",
				attachment
			});

			await react(api, event, "✅");
		}
		catch (error) {
			console.error("[PFP ERROR]", error);

			await message.reply(
				"❌ Profile photo load failed.\n" +
				"সমস্যা হতে পারে UID, profile link অথবা Facebook API-তে।"
			);

			await react(api, event, "❌");
		}
	}
};

async function react(api, event, emoji) {
	try {
		await api.setMessageReaction(
			emoji,
			event.messageID,
			event.threadID
		);
	}
	catch (error) {
		// Reaction unavailable; continue normally.
	}
}
