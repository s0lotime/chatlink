async function isImage(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.heif'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.endsWith(ext));
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
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

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
    } else if (firstUrl && isAudio(firstUrl)) {
        msg.className = 'audio-message';
        msg.innerHTML = `
            <div class="chat-message">${realText}</div>
            <audio controls>
                <source src="${firstUrl}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
        `;
    }
}

let lastMessageId = null;  // Track the last (oldest) message's ID
let isLoading = false;  // To prevent multiple simultaneous loads

// Get the 'limit' parameter from the URL or default to 20
const urlParams = new URLSearchParams(window.location.search);
const limit = parseInt(urlParams.get('limit')) || 20;

async function loadMessages(limit = 50, beforeId = null) {
  const messagesContainer = document.getElementById('messages');
  
  if (isLoading) return; // Prevent fetching while already loading
  isLoading = true;

  try {
    let url = new URL(`https://api.chatlink.sillyahhblud.space/messages/room/${requestedRoom}`);
    url.searchParams.append('limit', limit);
    if (beforeId) {
      url.searchParams.append('before', beforeId);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load messages');
    }

    const messages = await response.json();
    
    if (messages.length === 0) {
      return;  // No more messages to load
    }

    // Insert new messages at the top
    messages.reverse().forEach(msg => {
      receiveMessage(msg.content);  // You already have the receiveMessage function to handle this
    });

    // Update the lastMessageId to the ID of the oldest message we just loaded
    lastMessageId = messages[messages.length - 1].id;

  } catch (error) {
    console.error('Error loading messages:', error);
  } finally {
    isLoading = false;
  }
}

// Function to handle scroll events
function handleScroll() {
  const messagesContainer = document.getElementById('messages');
  
  // Check if we're near the top (e.g., 50px from the top)
  if (messagesContainer.scrollTop < 50) {
    if (lastMessageId) {
      loadMessages(limit, lastMessageId); // Load older messages based on the limit
    }
  }
}

// Set up the scroll event listener
document.getElementById('messages').addEventListener('scroll', handleScroll);

// Initial load of messages when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadMessages(limit);  // Load the number of messages specified by the URL parameter
});

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

    const requestBody = {
        content: content,
        room: room,
    };

    try {
        const response = await fetch('https://api.chatlink.sillyahhblud.space/messages/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            alert(`Error: ${errorMessage}`);
            return;
        }

        const responseData = await response.json();
        messageInput.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
    }

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
            receiveMessage(payload.new.content || JSON.stringify(payload.new));
        }).subscribe();
        console.log("connected");
    } catch (error) {
        console.error("Connection failed", error);
    }
}
