# WebSocket Chat Application

A real-time chat application built using WebSocket with a custom implementation of the WebSocket client and server.

## Features

- Real-time message exchange using WebSocket.
- User join and leave notifications.
- Message delivery and read status tracking.
- Broadcast messages to all connected users.
- Simple and extensible architecture for handling custom events.

---

## Technology Stack

- **Frontend**: Custom WebSocket client
- **Backend**: Node.js with `ws` library
- **Utility Libraries**:
    - `uuid` for unique identifiers
    - `express` for HTTP server setup
    - `cors` for cross-origin resource sharing

---

## Installation

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

### Clone the repository
```bash
git clone <repository-url>
cd <repository-folder>
