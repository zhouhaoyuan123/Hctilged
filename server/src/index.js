const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { createServer } = require('http');
const sshManager = require('./sshManager');
const fileManager = require('./fileManager');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/connect', async (req, res) => {
  console.log('Received connection request:', { ...req.body, password: '***' });
  const { host, username, password } = req.body;
  
  // Store the SSH configuration
  sshManager.config = {
    host: host || 'localhost',
    port: process.env.SSH_PORT || 22,
    username: username || 'root',
    password: password
  };
  
  res.json({ success: true, message: 'SSH configuration updated successfully' });
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected');

  // Handle file listing
  socket.on('file:list', async (path) => {
    console.log('Listing files for path:', path);
    try {
      const files = await fileManager.listFiles(path);
      socket.emit('file:list', files);
    } catch (error) {
      console.error('File list error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('file:read', async (path) => {
    console.log('Reading file:', path);
    try {
      const content = await fileManager.readFile(path);
      socket.emit('file:content', { path, content });
    } catch (error) {
      console.error('File read error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('file:write', async ({ path, content }) => {
    console.log('Writing to file:', path);
    try {
      await fileManager.writeFile(path, content);
      socket.broadcast.emit('file:updated', { path, content });
    } catch (error) {
      console.error('File write error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle terminal creation
  socket.on('terminal:create', async () => {
    console.log('Creating terminal session');
    try {
      const shell = await sshManager.createShell(socket);
      
      socket.on('terminal:input', (data) => {
        if (shell) {
          try {
            // Send input directly to shell
            shell.write(data);
          } catch (err) {
            console.error('Error writing to shell:', err);
            socket.emit('error', { message: err.message });
          }
        }
      });

      shell.on('data', (data) => {
        // Only send output that contains command results
        socket.emit('terminal:output', data);
      });

      shell.on('error', (err) => {
        console.error('Shell error:', err);
        socket.emit('error', { message: err.message });
      });

      // Handle terminal resize
      socket.on('terminal:resize', ({ cols, rows }) => {
        if (shell) {
          shell.setWindow(rows, cols);
        }
      });

    } catch (error) {
      console.error('Terminal creation error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
