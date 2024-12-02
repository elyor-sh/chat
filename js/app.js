import {SocketClient} from './socket-client.js';
import {Chat} from './chat.js';
import {getCurrentUser} from "./utils.js";



// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const socketClient = new SocketClient();
    const chatContainer = document.getElementById('chat');
    const currentUser = getCurrentUser()
    const chat = new Chat(socketClient, chatContainer, currentUser);
});