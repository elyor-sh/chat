// export class SocketClient {
//     constructor() {
//         this.socket = io('http://localhost:3005', {
//             transports: ['websocket'],
//             autoConnect: true
//         });
//         this.messageHandlers = new Map();
//         this.setupBaseHandlers();
//     }
//
//     setupBaseHandlers() {
//         this.socket.on('connect', () => {
//             console.log('Connected to WebSocket server');
//             this.emit('connection:status', true);
//         });
//
//         this.socket.on('disconnect', () => {
//             console.log('Disconnected from WebSocket server');
//             this.emit('connection:status', false);
//         });
//
//         this.socket.on('error', (error) => {
//             console.error('WebSocket error:', error);
//         });
//     }
//
//     on(event, handler) {
//         if (!this.messageHandlers.has(event)) {
//             this.messageHandlers.set(event, new Set());
//             this.socket.on(event, (...args) => {
//                 const handlers = this.messageHandlers.get(event);
//                 if (handlers) {
//                     handlers.forEach(h => h(...args));
//                 }
//             });
//         }
//         this.messageHandlers.get(event).add(handler);
//     }
//
//     off(event, handler) {
//         const handlers = this.messageHandlers.get(event);
//         if (handlers) {
//             handlers.delete(handler);
//             if (handlers.size === 0) {
//                 this.messageHandlers.delete(event);
//                 this.socket.off(event);
//             }
//         }
//     }
//
//     emit(event, ...args) {
//         this.socket.emit(event, ...args);
//     }
//
//     joinChat(user) {
//         this.emit('user:join', user);
//     }
//
//     sendMessage(message) {
//         this.emit('message:send', message);
//     }
//
//     markMessageAsRead(messageId) {
//         this.emit('message:read', messageId);
//     }
//
//     disconnect() {
//         this.socket.disconnect();
//     }
// }

export class SocketClient {
    constructor() {
        this.socket = null;
        this.url = 'ws://localhost:3005';
        this.messageHandlers = new Map();
        this.isConnected = false;
    }

    setupSocket(currentUser) {
        this.socket = new WebSocket(this.url);

        this.socket.addEventListener('open', () => {
            console.log('Connected to WebSocket server');
            this.isConnected = true;
            this.emit('connection:status', true);
            this.joinChat(currentUser)
        });

        this.socket.addEventListener('close', () => {
            console.log('Disconnected from WebSocket server');
            this.isConnected = false;
            this.emit('connection:status', false);
        });

        this.socket.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
        });

        this.socket.addEventListener('message', (event) => {
            try {
                const { event: eventType, data } = JSON.parse(event.data);
                const handlers = this.messageHandlers.get(eventType);
                if (handlers) {
                    handlers.forEach(handler => handler(data));
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', event.data, error);
            }
        });
    }

    on(event, handler) {
        if (!this.messageHandlers.has(event)) {
            this.messageHandlers.set(event, new Set());
        }
        this.messageHandlers.get(event).add(handler);
    }

    off(event, handler) {
        const handlers = this.messageHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.messageHandlers.delete(event);
            }
        }
    }

    emit(event, data) {
        if (this.isConnected) {
            this.socket.send(JSON.stringify({ event, data }));
        } else {
            console.warn('Cannot emit event, WebSocket is not connected');
        }
    }

    joinChat(user) {
        console.log('user',user)
        this.emit('user:join', user);
    }

    sendMessage(message) {
        this.emit('message:send', message);
    }

    markMessageAsRead(messageId) {
        this.emit('message:read', messageId);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}
