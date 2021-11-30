import AfterEvery from "after-every"
import BotCache from "./models/BotCache"
import Document from "./models/Document"
import GuildCache from "./models/GuildCache"
import NovaBot, { DateHelper } from "discordjs-nova"
import Reminder from "./models/Reminder"
import { Client, Intents } from "discord.js"

const config = require("../config.json")

const ONE_SECOND = 1000
const ONE_MINUTE = 60 * ONE_SECOND
const ONE_HOUR = 60 * ONE_MINUTE
const ONE_DAY = 24 * ONE_HOUR

new NovaBot({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS],
	name: "Reminder#2744",
	cwd: __dirname,
	config,

	Document: Document,
	GuildCache: GuildCache,
	BotCache: BotCache
})

// region Initialize bot
const bot = new Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS]
})
const botSetupHelper = new BotSetupHelper(bot)
const { cache: botCache } = botSetupHelper
// endregion

void bot.login(config.discord.token)
bot.on("ready", async () => {
	console.log("Logged in as Reminder Bot#2744")

	let debugCount = 0

	let i = 0
	let count = bot.guilds.cache.size
	for (const guild of bot.guilds.cache.toJSON()) {
		const tag = `${(++i).toString().padStart(count.toString().length, "0")}/${count}`
		let cache: GuildCache
		try {
			cache = await botCache.getGuildCache(guild)
		} catch (err) {
			console.error(`${tag} ❌ Couldn't find a Firebase Document for Guild(${guild.name})`)
			guild.leave()
			continue
		}

		try {
			await new SlashCommandDeployer(guild.id, botSetupHelper.interactionFiles).deploy()
		} catch (err) {
			console.error(
				`${tag} ❌ Couldn't get Slash Command permission for Guild(${guild.name})`
			)
			guild.leave()
			continue
		}

		cache.updateMinutely(debugCount).then()
		AfterEvery(1).minutes(() => {
			// region Check if reminder is due soon
			for (const reminder of cache.reminders) {
				const timeDiff = reminder.value.due_date - Date.now()

				if (reminder.value.priority === Reminder.PRIORITY_LOW) {
					if (new DateHelper(timeDiff).approximately(0)) {
						cache.updatePingChannel(reminder)
					}
				}

				if (reminder.value.priority === Reminder.PRIORITY_MEDIUM) {
					if (
						new DateHelper(timeDiff).approximately(ONE_DAY) ||
						new DateHelper(timeDiff).approximately(2 * ONE_HOUR) ||
						new DateHelper(timeDiff).approximately(0)
					) {
						cache.updatePingChannel(reminder)
					}
				}

				if (reminder.value.priority === Reminder.PRIORITY_HIGH) {
					if (
						new DateHelper(timeDiff).approximately(7 * ONE_DAY) ||
						new DateHelper(timeDiff).approximately(ONE_DAY) ||
						new DateHelper(timeDiff).approximately(12 * ONE_HOUR) ||
						new DateHelper(timeDiff).approximately(2 * ONE_HOUR) ||
						new DateHelper(timeDiff).approximately(ONE_HOUR) ||
						new DateHelper(timeDiff).approximately(30 * ONE_MINUTE) ||
						new DateHelper(timeDiff).approximately(0)
					) {
						cache.updatePingChannel(reminder)
					}
				}
			}
			// endregion
		})

		console.log(`${tag} ✅ Restored cache for Guild(${guild.name})`)
	}
	console.log(`✅ All bot cache restored`)
	console.log("|")

	AfterEvery(1).minutes(async () => {
		debugCount++
		for (const guild of bot.guilds.cache.toJSON()) {
			const cache = await botCache.getGuildCache(guild)
			cache.updateMinutely(debugCount).then()
		}
	})
})

const nova = new NovaBot({})
