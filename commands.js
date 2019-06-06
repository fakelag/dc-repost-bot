import moment from 'moment';

export const process = (config, msg) => {
	const parts = msg.content.split(' ');
	if (parts[0].startsWith(config.symbol)) {
		switch (parts[0].substring(1, parts[0].length)) {
			case 'help':
			{
				if (parts.length > 1 && config.commands[parts[1]]) {
					msg.reply(`${config.symbol}${parts[1]} - ${config.commands[parts[1]].text}`);
				} else {
					const comms = Object.entries(config.commands).map(([key, value]) => `${config.symbol}${key}\n`);
					msg.reply(`Available commands are:\n${comms}`);
				}
				break;
			}
			case 'timespan':
			{
				if (parts.length <= 1) {
					const current = config.commands['timespan'].callback();
					msg.reply(`Current timespan is ${current === -1 ? 'none' : moment.duration(current).humanize()}`);
				} else {
					try {
						const timespan = parseInt(parts[1], 10);
						config.commands['timespan'].callback(timespan);

						msg.reply(`Timespan set to ${moment.duration(timespan).humanize()}`);
					} catch (err) {
						msg.reply(`Unable to parse number ${parts[1]}`);
						console.error(err);
					}
				}
				break;
			}
			default:
			{
				message.reply(`Unrecognized command "${parts[0]}"`);
				break;
			}
		}
	}
};
