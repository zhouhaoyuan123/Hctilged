const { Client } = require('ssh2');
const pty = require('node-pty');

class TerminalManager {
  constructor() {
    this.terminals = new Map();
  }

  createTerminal(socket, sshClient) {
    const term = pty.spawn('bash', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      env: process.env
    });

    // Forward terminal output to client
    term.onData(data => {
      socket.emit('terminal:output', data);
    });

    // Handle input from client
    socket.on('terminal:input', data => {
      term.write(data);
    });

    // Handle terminal resize
    socket.on('terminal:resize', ({ cols, rows }) => {
      term.resize(cols, rows);
    });

    this.terminals.set(socket.id, term);
    return term;
  }

  closeTerminal(socketId) {
    const term = this.terminals.get(socketId);
    if (term) {
      term.kill();
      this.terminals.delete(socketId);
    }
  }
}

module.exports = new TerminalManager();
