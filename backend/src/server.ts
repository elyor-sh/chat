import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { Message, User, DeliveryStatus } from './types/chat';
import { v4 as uuidv4 } from 'uuid';
import path from "path";

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', '..')))

// Роут для выдачи HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'index.html'));
});

// Хранилище сообщений (в реальном приложении должно быть в базе данных)
const messages: Message[] = [];

// Хранилище пользователей онлайн
const onlineUsers = new Map<WebSocket, User>();

// Отправка сообщения конкретному клиенту
const sendMessage = (ws: WebSocket, event: string, data: any) => {
  ws.send(JSON.stringify({ event, data }));
};

// Отправка сообщения всем подключенным клиентам
const broadcastMessage = (event: string, data: any, excludeWs?: WebSocket) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      sendMessage(client, event, data);
    }
  });
};

// Обработка подключения клиента
wss.on('connection', (ws) => {
  console.log('User connected');

  ws.on('message', (message) => {
    try {
      const { event, data } = JSON.parse(message.toString());
      switch (event) {
        case 'user:join':
          const user = data as User;
          console.log('User joined:', user);
          onlineUsers.set(ws, user);
          broadcastMessage('user:joined', user, ws);

          // Отправляем историю сообщений новому пользователю
          sendMessage(ws, 'messages:history', messages);
          break;

        case 'message:send':
          console.log('Received message data:', data);
          const sender = onlineUsers.get(ws);
          if (!sender) {
            console.log('User not found for connection');
            return;
          }

          const newMessage: Message = {
            id: uuidv4(),
            content: data.content || '',
            sender,
            timestamp: new Date(),
            deliveryStatus: 'sent',
            attachments: data.attachments,
            quotedMessage: data.quotedMessage,
            formattedContent: data.formattedContent,
          };

          messages.push(newMessage);
          console.log('New message created:', newMessage);

          // Отправляем сообщение всем пользователям
          broadcastMessage('message:received', newMessage);

          // Имитируем задержку доставки
          setTimeout(() => {
            newMessage.deliveryStatus = 'delivered';
            console.log('Updating message status to delivered:', newMessage.id);
            broadcastMessage('message:status', {
              messageId: newMessage.id,
              status: 'delivered' as DeliveryStatus,
            });
          }, 1000);
          break;

        case 'message:read':
          const messageId = data as string;
          console.log('Message marked as read:', messageId);
          const message = messages.find(m => m.id === messageId);
          if (message) {
            message.deliveryStatus = 'read';
            broadcastMessage('message:status', {
              messageId: message.id,
              status: 'read' as DeliveryStatus,
            });
          }
          break;

        default:
          console.warn('Unknown event:', event);
      }
    } catch (error) {
      console.error('Error processing message:', message, error);
    }
  });

  ws.on('close', () => {
    const user = onlineUsers.get(ws);
    if (user) {
      console.log('User disconnected:', user);
      onlineUsers.delete(ws);
      broadcastMessage('user:left', user);
    }
  });
});

const PORT = process.env.PORT || 3005;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
