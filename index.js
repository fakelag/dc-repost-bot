import moment from 'moment';
import * as cacher from './messageCacher';
import * as commands from './commands';
import * as discord from 'discord.js';

let channelHistory = {};
let repostCount = 0;
let repostTimespan = 1209600000; // 14 days
const bot = new discord.Client();

const setTimespan = (timespan) => {
	if (typeof(timespan) === 'undefined') // get default value
		return repostTimespan;

	console.log('Setting timespan to: ', timespan);

	repostTimespan = timespan;
	return repostTimespan;
};

const config = {
	symbol: '.',
	commands: {
		'timespan': {
			text: 'Defines the time after which a message can be reposted without a warning.\n' +
				  'Usage: .timespan <msec_since_epoch_time>\n',
			callback: setTimespan,
		},
	},
};

if (process.platform === 'win32') {
	const rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.on('SIGINT', () => {
		process.emit('SIGINT');
	});
}

process.on('unhandledRejection', console.log);

['SIGINT', 'SIGTERM'].forEach((sig) => {
	process.on(sig, () => {
		process.exit();
	});
});

const repostCheck = (channelId, messageData) => {
	if (messageData.text.indexOf('http') === -1) // only interested in reposting links
		return null;

	if (messageData.text.indexOf('-new') !== -1)
		return null;

	const repostData = {
		count: 0,
		author: '',
		channel: '',
		createdAt: Date.now(),
	};

	for (const msg of channelHistory[channelId].data.messages) {
		if (msg.authorId === messageData.authorId)
			continue;

		if (repostTimespan !== -1) {
			if (messageData.createdAt - msg.createdAt > repostTimespan)
				continue;
		}

		if (msg.text.indexOf(messageData.text) !== -1) {
			if (repostData.count === 0) {
				repostData.author = msg.author;
				repostData.channel = channelHistory[channelId].data.channel;
				repostData.createdAt = msg.createdAt;
			}

			++repostData.count;
		}
	}

	return repostData.count ? repostData : null;
}

bot.on('ready', () => {
	console.log('Discord API ready. Caching channels...');
	bot.user.setPresence({ game: { name: 'Rebooting...' }, status: 'online' });

	const channelList = [];
	for (const channel of bot.channels) {
		const chan = channel[1];

		if (chan.type !== 'text')
			continue;

		channelList.push(chan);
	}

	cacher.cacheChannels(channelList).then(() => {
		channelHistory = cacher.messageCache;
		bot.user.setPresence({ game: { name: `Reposts: ${repostCount}` }, status: 'online' });
	});
});

bot.on('message', (msg) => {
	if (cacher.isCachingCompleted() && msg.guild) {
		const messageData = {
			id: msg.id,
			author: msg.author.username,
			authorId: msg.author.id,
			text: msg.content,
			createdAt: (new Date(msg.createdAt)).getTime(),
		};

		const repost = repostCheck(msg.channel.id, messageData);

		if (repost) {
			msg.reply(`Repost detected. This has been posted before by ${repost.author} ` +
				`in ${repost.channel} at ${moment(repost.createdAt).format('DD.MM.YYYY HH:mm:ss')} ` +
				`and has since been reposted ${repost.count} times.`, {
					files: [
						"./repost.png"
					],
				});

			bot.user.setPresence({ game: { name: `Reposts: ${++repostCount}` }, status: 'online' });
		}

		channelHistory[msg.channel.id].data.messages.push(messageData);
	}

	commands.process(config, msg);
});

bot.login(process.env.DISCORD_TOKEN);
