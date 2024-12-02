// import express from 'express';
// import { createServer } from 'http';
// import { Server } from 'socket.io';
// import cors from 'cors';
// import { Message, User, DeliveryStatus } from './types/chat';
// import { v4 as uuidv4 } from 'uuid';
//
// const app = express();
// const httpServer = createServer(app);
// const io = new Server(httpServer, {
//   cors: {
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST"]
//   }
// });
//
// app.use(cors());
// app.use(express.json());
//
// // Хранилище сообщений (в реальном приложении должно быть в базе данных)
// const messages: Message[] = [];
//
// // Хранилище пользователей онлайн
// const onlineUsers = new Map<string, User>();
//
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);
//
//   // Обработка присоединения пользователя
//   socket.on('user:join', (user: User) => {
//     console.log('User joined:', user);
//     onlineUsers.set(socket.id, user);
//     socket.broadcast.emit('user:joined', user);
//
//     // Отправляем историю сообщений новому пользователю
//     console.log('Sending message history:', messages);
//     socket.emit('messages:history', messages);
//   });
//
//   // Обработка отправки сообщения
//   socket.on('message:send', (messageData: Partial<Message>) => {
//     console.log('Received message data:', messageData);
//     const user = onlineUsers.get(socket.id);
//     if (!user) {
//       console.log('User not found for socket:', socket.id);
//       return;
//     }
//
//     const newMessage: Message = {
//       id: uuidv4(),
//       content: messageData.content || '',
//       sender: user,
//       timestamp: new Date(),
//       deliveryStatus: 'sent',
//       attachments: messageData.attachments,
//       quotedMessage: messageData.quotedMessage,
//       formattedContent: messageData.formattedContent
//     };
//
//     messages.push(newMessage);
//     console.log('New message created:', newMessage);
//
//     // Отправляем сообщение всем пользователям
//     io.emit('message:received', newMessage);
//
//     // Имитируем задержку доставки
//     setTimeout(() => {
//       newMessage.deliveryStatus = 'delivered';
//       console.log('Updating message status to delivered:', newMessage.id);
//       io.emit('message:status', {
//         messageId: newMessage.id,
//         status: 'delivered' as DeliveryStatus
//       });
//     }, 1000);
//   });
//
//   // Обработка прочтения сообщения
//   socket.on('message:read', (messageId: string) => {
//     console.log('Message marked as read:', messageId);
//     const message = messages.find(m => m.id === messageId);
//     if (message) {
//       message.deliveryStatus = 'read';
//       io.emit('message:status', {
//         messageId: message.id,
//         status: 'read' as DeliveryStatus
//       });
//     }
//   });
//
//   // Обработка отключения пользователя
//   socket.on('disconnect', () => {
//     const user = onlineUsers.get(socket.id);
//     if (user) {
//       console.log('User disconnected:', user);
//       onlineUsers.delete(socket.id);
//       socket.broadcast.emit('user:left', user);
//     }
//   });
// });
//
// const PORT = process.env.PORT || 3005;
//
// httpServer.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { Message, User, DeliveryStatus } from './types/chat';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(cors());
app.use(express.json());

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
