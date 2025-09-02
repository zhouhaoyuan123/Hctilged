const { Client } = require('ssh2');

class SSHManager {
  constructor() {
    this.config = {
      host: process.env.SSH_HOST || 'localhost',
      port: process.env.SSH_PORT || 22,
      username: process.env.SSH_USERNAME || 'root',
      password: process.env.SSH_PASSWORD
    };
    this.connections = new Map();
  }

  async createShell(socket) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      conn.connect(this.config);
      conn.on('ready', () => {
        console.log('SSH Connection established');

        conn.shell({
          term: 'xterm-256color',
          rows: 24,
          cols: 80,
          pty: true
        }, (err, stream) => {
          if (err) {
            console.error('Shell creation error:', err);
            reject(err);
            return;
          }

          // Configure terminal for proper input handling
          const setupCommands = [
            'export TERM=xterm-256color',
            'stty -a > /dev/null 2>&1 || exit 0', // Check if stty is available
            'stty raw -echo',  // Raw mode, no echo
            'stty cs8 -icanon -iexten -echo -isig -ixon -ixoff', // Disable all input processing
            'stty intr undef susp undef',  // Disable interrupt signals
            'export PS1="\\u@\\h:\\w\\$ "',
            'clear'
          ];

          // Send setup commands
          setupCommands.forEach(cmd => {
            stream.write(cmd + '\n');
          });

          stream.setEncoding('utf8');

              // Store the connection
              this.connections.set(socket.id, { conn, stream });

              // Handle connection close
              stream.on('close', () => {
                console.log('Shell session ended');
                socket.emit('terminal:close');
                this.closeConnection(socket.id);
              });

              // Handle stream errors
              stream.on('error', (err) => {
                console.error('Shell stream error:', err);
                socket.emit('error', { message: err.message });
                this.closeConnection(socket.id);
              });

              resolve(stream);
            }, 100);
          });
          conn.on('error', (err) => {
                console.error('SSH connection error:', err);
                reject(err);
          });
        });
        
      };

  async executeCommand(host, command) {
    return new Promise((resolve, reject) => {
      const conn = new Client();

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          let data = '';
          let errorData = '';

          stream.on('data', (chunk) => {
            data += chunk;
          });

          stream.stderr.on('data', (chunk) => {
            errorData += chunk;
          });

          stream.on('close', () => {
            conn.end();
            if (errorData) {
              reject(new Error(errorData));
            } else {
              resolve(data);
            }
          });
        });
      });

      conn.on('error', (err) => {
        reject(err);
      });

      conn.connect(this.config);
    });
  }

  closeConnection(socketId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      const { conn, stream } = connection;
      if (stream) {
        stream.end();
      }
      if (conn) {
        conn.end();
      }
      this.connections.delete(socketId);
    }
  }
}

module.exports = new SSHManager();
