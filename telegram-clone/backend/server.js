require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const uploadRoutes = require('./routes/upload');
const gifRoutes = require('./routes/gifs');
const setupSocket = require('./socket/index');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
  maxHttpBufferSize: 1e7
});

app.set('io', io);

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'FairyChat API' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/gifs', gifRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server me kuch gadbad ho gayi' });
});

setupSocket(io);

const PORT = process.env.PORT || 8081;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`FairyChat backend chal raha hai on port ${PORT}`);
});
