async function isImage(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.heif'];
    const lowerUrl = url.toLowerCase();

    const hasImageExtension = imageExtensions.some(ext => lowerUrl.endsWith(ext));
    if (!hasImageExtension) {
        return false;
    }

    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers.get('Content-Type') || '';
        return contentType.startsWith('image/');
    } catch (error) {
        console.error('Error checking image Content-Type:', error);
        return false;
    }
}

function isAudio(url) {
    const audioExtensions = ['.mp3', '.ogg', '.wav'];
    const lowerUrl = url.toLowerCase();
    return audioExtensions.some(ext => lowerUrl.endsWith(ext));
}

// Helper: Extract the first URL from a string
function extractFirstUrl(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : null;
}

async function receiveMessage(content) {
    const messagesContainer = document.getElementById('messages');
    const msg = document.createElement('div');
    msg.className = 'chat-message';
    msg.innerHTML = convertUrlsToLinks(content);
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const messageText = msg.textContent.trim();
    const firstUrl = extractFirstUrl(messageText);

    if (firstUrl && await isImage(firstUrl)) {
        msg.className = 'image-message';
        msg.innerHTML = `
          <img 
            src="${firstUrl}" 
            alt="User sent image" 
            class="image-message" 
            onerror="this.onerror=null; this.src='/cdn/images/error.png';"
          >
        `;
    } 
    else if (firstUrl && isAudio(firstUrl)) {
        msg.className = 'audio-message';
        msg.innerHTML = `
          <audio controls>
            <source src="${firstUrl}" type="audio/mpeg">
            Your browser does not support the audio element.
          </audio>
        `;
    }
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
