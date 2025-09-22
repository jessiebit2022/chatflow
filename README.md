# ChatFlow - Real-Time Chat Application

**Author:** Jessie Borras  
**Website:** [jessiedev.xyz](https://jessiedev.xyz)

## Description

ChatFlow is a modern real-time chat application that showcases advanced WebSocket implementation and full-stack development skills. The application features user authentication, private messaging, and group chat functionality, providing a seamless communication experience across multiple platforms.

## Features

- 🔐 **User Authentication** - Secure login/registration with JWT tokens
- 💬 **Real-time Messaging** - Instant message delivery using WebSockets
- 👥 **Group Chats** - Create and manage group conversations
- 🔒 **Private Messaging** - One-on-one secure conversations
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🟢 **Online Status** - See who's currently online
- ⚡ **Low Latency** - Optimized for fast communication

## Tech Stack

### Frontend
- **React** - Modern UI library for building interactive interfaces
- **Socket.IO Client** - Real-time bidirectional event-based communication
- **CSS3/Styled Components** - Modern styling and responsive design

### Backend
- **Node.js** - JavaScript runtime for server-side development
- **Express.js** - Web application framework
- **Socket.IO** - Real-time communication library
- **JWT** - JSON Web Tokens for authentication

### Database
- **MongoDB** - NoSQL database for storing users and messages
- **Mongoose** - MongoDB object modeling for Node.js

## Project Structure

```
ChatFlow/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   └── utils/
│   └── package.json
├── backend/           # Node.js server
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── socket/
│   └── package.json
├── docs/              # Documentation
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ChatFlow
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**
   
   Create `.env` file in the backend directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/chatflow
   JWT_SECRET=your_jwt_secret_here
   CLIENT_URL=http://localhost:3000
   ```

5. **Start the development servers**
   
   Backend (from backend directory):
   ```bash
   npm run dev
   ```
   
   Frontend (from frontend directory):
   ```bash
   npm start
   ```

6. **Access the application**
   
   Open your browser and navigate to `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID

## Socket Events

### Client to Server
- `join_room` - Join a chat room
- `leave_room` - Leave a chat room
- `send_message` - Send a message
- `typing` - User is typing indicator

### Server to Client
- `message` - Receive a message
- `user_joined` - User joined room
- `user_left` - User left room
- `typing` - Someone is typing
- `online_users` - List of online users

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Socket.IO for providing excellent real-time communication capabilities
- The React and Node.js communities for their amazing tools and documentation
- MongoDB for reliable data storage solutions

---

**Built with ❤️ by Jessie Borras**  
Visit: [jessiedev.xyz](https://jessiedev.xyz)# real-time-chat-application
# chatflow
