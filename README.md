# End-to-End Encrypted Private Chat Application

A secure, private chat application that uses Diffie-Hellman key exchange for end-to-end encryption. Create temporary chat sessions, share the session key with someone, chat securely, then destroy the session when done. No messages or data are stored on the server.

## Features

- **End-to-End Encryption** using Diffie-Hellman key exchange and AES-256 encryption
- **Temporary Chat Sessions** that can be destroyed at any time
- **No Storage of Messages** on the server - all communication happens in memory
- **Modern React UI** with Material UI components
- **Real-time Communication** using Socket.io

## Security Notes

- All messages are encrypted and decrypted locally on the client side
- The server only relays encrypted messages and never has access to encryption keys
- Session keys are randomly generated and can be easily shared with chat participants
- Sessions are automatically destroyed after 24 hours of inactivity

## Technologies Used

- **Frontend**: React, Material UI, Socket.io Client, CryptoJS
- **Backend**: Express, Socket.io, Node.js

## Setup and Installation

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/e2e-chat.git
   cd e2e-chat
   ```

2. Install dependencies for both client and server:
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

### Running the Application

1. Start the server:
   ```
   cd server
   npm start
   ```

2. Start the client in a separate terminal:
   ```
   cd client
   npm start
   ```

3. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## How to Use

1. On the homepage, click "Create New Session" to generate a new chat session
2. Share the generated session key with the person you want to chat with
3. They can enter the session key on their homepage to join your chat
4. Once both users are connected, you can start exchanging encrypted messages
5. To end the chat, click the "Destroy Session" button or simply close the browser

## Development

For development, you can use the development servers:

```
# Run server in dev mode with auto-restart
cd server
npm run dev

# Run client in dev mode
cd client
npm start
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.