module.exports = {
	config: {
		name: "mention",
		version: "1.2",
		author: "xalman",
		role: 0,
		shortDescription: {
			en: "Reply when specific user is mentioned"
		},
		category: "owner"
	},

	onStart: async function () {},

	onChat: async function ({ api, event }) {
		const bossUIDs = [
			"61594799624906"
		];

		if (!event.mentions || typeof event.mentions !== "object")
			return;

		const mentionedIDs = Object.keys(event.mentions);

		if (mentionedIDs.some(uid => bossUIDs.includes(uid))) {
			return api.sendMessage(
				"কিরে মাঙ্গের নাতি, শিশির বস কে বারবার মেনশন দিস কে? 🙄🐸🌷\n\n" +
				"Boss এখন কাজে একটু ব্যস্ত আছে, free হলে reply দিবে 🫠🌷\n\n" +
				"",
				event.threadID,
				event.messageID
			);
		}
	}
};
