function receiveMessage(content) {
	const msg = document.createElement('div');
	msg.className = 'chat-message';
	msg.innerHTML = convertUrlsToLinks(content);
	messagesContainer.appendChild(msg);
	messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadPriorMessages() {
	const {
		data,
		error
	} = await supabase.from('messages')
		.select('*')
		.order('sent_at', {
			ascending: true
		});
	if (error) {
		console.error('Error loading messages:', error);
		return;
	}
	data.forEach(msg => {
		addMessage(msg.content);
	});
}

function convertUrlsToLinks(text) {
	const urlPattern = /(\b(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*)|(\b(?:www\.)[^\s/$.?#].[^\s]*)|(\b[^\s]+\.[a-z]{2,}\b)/gi;
	return text.replace(urlPattern, (url) => {
		if (url.startsWith('www')) {
			url = 'https://' + url;
		}
		return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
	});
}
async function bcMessage() {
	const content = messageInput.value.trim();
	if (!content) return;
	const {
		error
	} = await supabase.from('messages')
		.insert([{
			content,
			room: "what"
		}]);
	if (error) {
		console.error('Error sending message:', error);
	} else {
		messageInput.value = '';
	}
}

async function startRealtime() {
	try {
		await supabase.channel('public:messages')
			.on('postgres_changes', {
				event: 'INSERT',
				schema: 'public',
				table: 'messages'
			}, (payload) => {
				console.log('New message!', payload.new);
				addMessage(payload.new.content || JSON.stringify(payload.new));
			})
			.subscribe();
		console.log("connected");
	} catch (error) {
		console.error("non connect", error);
	}
}
