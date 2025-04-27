async function isImage(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.heif'];
    const lowerUrl = url.toLowerCase();

    const hasImageExtension = imageExtensions.some(ext => lowerUrl.endsWith(ext));
    if (!hasImageExtension) {
        return false;
    }

return true
}

function isAudio(url) {
    const audioExtensions = ['.mp3', '.ogg', '.wav'];
    const lowerUrl = url.toLowerCase();
    return audioExtensions.some(ext => lowerUrl.endsWith(ext));
}

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
	
    const realText = content.replace(/https?:\/\/[^\s]+/g, '').trim();
    const firstUrl = extractFirstUrl(content);
	
    if (firstUrl && await isImage(firstUrl)) {
        msg.className = 'image-message';
        msg.innerHTML = `
            <div class="chat-message">${realText}</div>
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
            <div class="chat-message">${realText}</div>
            <audio controls>
                <source src="${firstUrl}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
        `;
    } else {
        msg.innerHTML = convertUrlsToLinks(content);
    }
	
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadPriorMessages(roomName) {
  try {
    const response = await fetch(`https://api.chatlink.sillyahhblud.space/messages/room/${roomName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch prior messages');
    }

    const responseData = await response.json();
	  
    if (responseData.length === 0) {
      receiveMessage("It seems like there are no previous messages in this chatroom. Start the conversation!");
    }
	  
    responseData.forEach(msg => {
      receiveMessage(msg.content);
    });
  } catch (error) {
    console.error('Error loading messages:', error);
  }
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
	
  const { error } = await supabaseVar.from('messages').insert([{
    content,
    room
  }]);

  // Step 2: Send message data to Cloudflare Worker to persist in D1
  const requestBody = {
    content: content,
    room: room,
  };

  try {
    // Send message data to Cloudflare Worker to be stored in D1
    const response = await fetch('https://api.chatlink.sillyahhblud.space/messages/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Handle the response from the Worker
    if (!response.ok) {
      const errorMessage = await response.text();
      alert(`Error: ${errorMessage}`);
      return;
    }

    const responseData = await response.json();
    if (responseData.success) {
      alert('Message sent successfully!');
      console.log('Message ID:', responseData.id);
    } else {
      alert('Failed to send message!');
    }
	  
    messageInput.value = '';
    
  } catch (error) {
    console.error('Error sending message:', error);
    alert('An error occurred while sending the message.');
  }

  // Step 3: Handle Supabase error if any
  if (error) {
    console.error('Error broadcasting message via Supabase:', error);
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
