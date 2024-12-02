import { DeliveryStatus } from './types.js';

export class Chat {
    constructor(socketClient, container, currentUser) {
        this.socketClient = socketClient;
        this.container = container;
        this.messages = [];
        this.currentUser = currentUser;
        this.quotedMessage = null;
        this.attachments = [];
        this.formats = new Set();

        this.messageList = container.querySelector('.chat-messages');
        this.messageInput = container.querySelector('#messageInput');
        this.formatButtons = container.querySelectorAll('.format-button');
        this.sendButton = container.querySelector('.send-button');
        this.attachButton = container.querySelector('.attach-button');

        this.socketClient.setupSocket(this.currentUser);
        this.setupEventListeners();
        this.setupSocketHandlers();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());

        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.formatButtons.forEach(button => {
            button.addEventListener('click', () => {
                const format = button.dataset.format;
                if (format === 'link') {
                    this.showLinkDialog();
                } else {
                    button.classList.toggle('active');
                    this.formats.has(format)
                        ? this.formats.delete(format)
                        : this.formats.add(format);
                }
            });
        });

        this.attachButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.addEventListener('change', (e) => this.handleFileSelect(e));
            input.click();
        });
    }

    setupSocketHandlers() {
        this.socketClient.on('connected', () => {
            this.socketClient.joinChat(this.currentUser);
        });
        this.socketClient.on('messages:history', (history) => {
            this.messages = history;
            this.renderMessages();
        });

        this.socketClient.on('message:received', (message) => {
            this.messages.push(message);
            this.renderMessages();

            if (message.sender.id !== this.currentUser.id) {
                this.socketClient.markMessageAsRead(message.id);
                this.playNotification();
            }
        });

        this.socketClient.on('message:status', ({ messageId, status }) => {
            const message = this.messages.find(m => m.id === messageId);
            if (message) {
                message.deliveryStatus = status;
                this.updateMessageStatus(messageId, status);
            }
        });
    }

    formatMessage(content) {
        let formattedContent = content;

        // Применяем форматирование
        if (this.formats.has('bold')) {
            formattedContent = `**${formattedContent}**`;
        }
        if (this.formats.has('italic')) {
            formattedContent = `*${formattedContent}*`;
        }
        if (this.formats.has('underline')) {
            formattedContent = `__${formattedContent}__`;
        }

        return formattedContent;
    }

    sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content && this.attachments.length === 0) return;

        const formattedContent = this.formatMessage(content);

        const message = {
            content: formattedContent,
            sender: this.currentUser,
            timestamp: new Date(),
            deliveryStatus: DeliveryStatus.SENDING,
            attachments: this.attachments,
            quotedMessage: this.quotedMessage
        };

        this.socketClient.sendMessage(message);
        this.messageInput.value = '';
        this.quotedMessage = null;
        this.attachments = [];
        this.formats.clear();
        this.formatButtons.forEach(btn => btn.classList.remove('active'));
        this.updateAttachmentsUI();
    }

    renderMessages() {
        this.messageList.innerHTML = this.messages.map(message => this.createMessageHTML(message)).join('');
        this.messageList.scrollTop = this.messageList.scrollHeight;
    }

    createMessageHTML(message) {
        const isOwnMessage = message.sender.id === this.currentUser.id;
        const formattedContent = this.parseMessageContent(message.content);
        const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="message ${isOwnMessage ? 'own' : ''}" data-message-id="${message.id}">
                <div class="message-content">
                    <div class="message-sender">${message.sender.name}</div>
                    ${message.quotedMessage ? this.createQuoteHTML(message.quotedMessage) : ''}
                    <div class="message-text">${formattedContent}</div>
                    ${this.createAttachmentsHTML(message.attachments)}
                    <div class="message-info">
                        <span class="message-time">${time}</span>
                        ${isOwnMessage ? `
                            <span class="material-icons ${message.deliveryStatus === 'read' ? 'message-status blue' : 'message-status'}">
                                ${this.getStatusIcon(message.deliveryStatus)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                ${!isOwnMessage ? `
                    <div class="message-actions">
                        <button class="action-button" onclick="chat.quoteMessage('${message.id}')">
                            <span class="material-icons">reply</span>
                        </button>
                        <button class="action-button" onclick="chat.copyMessage('${message.id}')">
                            <span class="material-icons">content_copy</span>
                        </button>
                        <button class="action-button" onclick="chat.forwardMessage('${message.id}')">
                            <span class="material-icons">forward</span>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createQuoteHTML(quotedMessage) {
        return `
            <div class="message-quote">
                <div class="quote-sender">${quotedMessage.sender.name}</div>
                <div class="quote-content">${quotedMessage.content}</div>
            </div>
        `;
    }

    createAttachmentsHTML(attachments) {
        if (!attachments || attachments.length === 0) return '';

        return `
            <div class="message-attachments">
                ${attachments.map(attachment => `
                    ${attachment.type === 'image' 
                        ? `<img src="${attachment.url}" alt="${attachment.name}" class="attachment-image">`
                        : `<a href="${attachment.url}" class="attachment-file">📎 ${attachment.name}</a>`
                    }
                `).join('')}
            </div>
        `;
    }

    getStatusIcon(status) {
        switch(status) {
            case 'sending': return 'schedule';
            case 'sent': return 'check';
            case 'delivered': return 'done_all';
            case 'read': return 'done_all';
            case 'error': return 'error';
            default: return 'check';
        }
    }

    parseMessageContent(content) {
        let parsedContent = content;

        // Форматирование
        parsedContent = parsedContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        return parsedContent;
    }

    updateMessageStatus(messageId, status) {

    }

    quoteMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            this.quotedMessage = message;
            this.updateQuoteUI();
        }
    }

    copyMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            navigator.clipboard.writeText(message.content)
                .then(() => console.log('Message copied to clipboard'))
                .catch(err => console.error('Failed to copy message:', err));
        }
    }

    forwardMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            // В реальном приложении здесь будет логика пересылки сообщения
            console.log('Forward message:', message);
        }
    }

    updateQuoteUI() {
        const quoteContainer = document.createElement('div');
        quoteContainer.className = 'quote-container';
        quoteContainer.innerHTML = `
            <div class="quote-preview">
                <div class="quote-sender">${this.quotedMessage.sender.name}</div>
                <div class="quote-content">${this.quotedMessage.content}</div>
                <button class="quote-cancel" onclick="chat.cancelQuote()">
                    <span class="material-icons">close</span>
                </button>
            </div>
        `;

        const existingQuote = this.container.querySelector('.quote-container');
        if (existingQuote) {
            existingQuote.remove();
        }

        const inputContainer = this.container.querySelector('.chat-input');
        inputContainer.insertBefore(quoteContainer, inputContainer.firstChild);
    }

    cancelQuote() {
        this.quotedMessage = null;
        const quoteContainer = this.container.querySelector('.quote-container');
        if (quoteContainer) {
            quoteContainer.remove();
        }
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.attachments = files.map(file => ({
            id: Math.random().toString(36).substring(7),
            type: file.type.startsWith('image/') ? 'image' : 'document',
            name: file.name,
            size: file.size,
            file
        }));
        this.updateAttachmentsUI();
    }

    updateAttachmentsUI() {
        // Реализация UI для вложений
    }

    showLinkDialog() {
        // Реализация диалога добавления ссылки
    }

    playNotification() {
        const audio = new Audio('notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(console.error);
    }
}