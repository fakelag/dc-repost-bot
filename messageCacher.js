let isCachingComplete = false;

export let messageCache = {};

const fetchMessages = (chan, mList, done) => {
	chan.fetchMessages({ limit: 100, before: mList.length ? mList[mList.length - 1].id : undefined }).then((messages) => {
		if (messages.size)
			fetchMessages(chan, mList.concat(messages.array()), done);
		else
			done(null, chan, mList.reverse());
	}).catch((err) => {
		done(err, chan, mList.reverse());
	});
}

export const cacheChannels = async (channelList) => {
	try {
		let _messagesAdded = 0;
		let _messageCache = {};
		isCachingComplete = false;

		const promises = [];
		for (const channel of channelList) {
			promises.push(new Promise((resolve, reject) => {
				fetchMessages(channel, [], (err, chan, mList) => {
					if (err)
						reject(err);

					console.log(`Cached channel ${chan.name} with ${mList.length} messages`);
					_messagesAdded += mList.length;

					_messageCache[chan.id] = {
						data: {
							channel: chan.name,
							messages: mList.map((message) => ({
								id: message.id,
								author: message.author.username,
								authorId: message.author.id,
								text: message.content,
								createdAt: (new Date(message.createdAt)).getTime(),
							})),
						},
						timestamp: Date.now(),
					};
					
					resolve();
				});
			}));
		}

		await Promise.all(promises);

		messageCache = _messageCache;
		isCachingComplete = true;
		console.log(`Message caching completed - found a total of ${_messagesAdded} messages.`);
	} catch (err) {
		isCachingComplete = true;
		console.error('cacheChannels: error: ', err);
	}
}

export const isCachingCompleted = () => isCachingComplete;
