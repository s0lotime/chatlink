function receiveMessage(content) {
	const messagesContainer = document.getElementById('messages');
	const messageInput = document.getElementById('messageInput');
	const sendButton = document.getElementById('sendButton');
	const msg = document.createElement('div');
	msg.className = 'chat-message';
	msg.innerHTML = convertUrlsToLinks(content);
	messagesContainer.appendChild(msg);
	messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
async function loadPriorMessages(supabaseVar, roomName) {
	const {
		data,
		error
	} = await supabaseVar.from('messages').select('sent_at, content').eq('room', roomName).order('sent_at', {
		ascending: true
	});
	if (error) {
		console.error('Error loading messages:', error);
		return;
	}
	if (data.length === 0) {
		receiveMessage("It seems like there are no previous messages in this chatroom. Start the conversation!");
  }
	data.forEach(msg => {
		receiveMessage(msg.content);
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
async function bcMessage(supabaseVar, room) {
	const messagesContainer = document.getElementById('messages');
	const messageInput = document.getElementById('messageInput');
	const sendButton = document.getElementById('sendButton');
	const content = messageInput.value.trim();
	if (!content) return;
	const {
		error
	} = await supabaseVar.from('messages').insert([{
		content,
		room
	}]);
	if (error) {
		console.error('Error sending message:', error);
	} else {
		messageInput.value = '';
	}
}
function renderMessage(message) {
   // Check if the message is an image URL or contains an image MIME type
   const imageUrlPattern = /^(https?:\/\/usercdn\.chatlink\.sillyahhblud\.space\/i\/)/; // For usercdn image links
   const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];

   const messageContainer = document.createElement('div');
   messageContainer.classList.add('message'); // Add styling class

   // Check if the message is a URL starting with usercdn chatlink image path
   if (imageUrlPattern.test(message)) {
      const imgElement = document.createElement('img');
      imgElement.src = message;
      imgElement.alt = 'Uploaded Image';
      imgElement.classList.add('message-image'); // Add any CSS for the image
      messageContainer.appendChild(imgElement);
   }
   // Check if MIME type indicates image
   else if (imageMimeTypes.some(mime => message.includes(mime))) {
      const imgElement = document.createElement('img');
      imgElement.src = message;
      imgElement.alt = 'Image from MIME type';
      imgElement.classList.add('message-image');
      messageContainer.appendChild(imgElement);
   }
   // Otherwise, treat the message as regular text
   else {
      messageContainer.textContent = message;
   }

   messagesContainer.appendChild(messageContainer);
}
async function startRealtime(supabaseVar) {
	try {
		await supabaseVar.channel('public:messages').on('postgres_changes', {
			event: 'INSERT',
			schema: 'public',
			table: 'messages'
		}, (payload) => {
			console.log('New message!', payload.new);
			receiveMessage(payload.new.content || JSON.stringify(payload.new));
		}).subscribe();
		console.log("connected");
	} catch (error) {
		console.error("non connect", error);
	}
}
