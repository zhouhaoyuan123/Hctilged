const { Client } = require('ssh2');
const pty = require('node-pty');

class TerminalManager {
  constructor() {
    this.terminals = new Map();
  }

  createTerminal(socket, sshClient) {
    let outputBuffer = '';
    let outputTimeout = null;

    const term = pty.spawn('bash', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      env: process.env,
      encoding: null  // Use raw buffer mode
    });

    const flushOutput = () => {
      if (outputBuffer) {
        const normalizedData = outputBuffer.replace(/\r\n|\r|\n/g, '\r\n');
        socket.emit('terminal:output', normalizedData);
        outputBuffer = '';
      }
    };

    // Forward terminal output to client with buffering
    term.onData(data => {
      // Convert Buffer to string if needed
      const strData = Buffer.isBuffer(data) ? data.toString('utf8') : data;
      outputBuffer += strData;

      // Clear existing timeout if any
      if (outputTimeout) {
        clearTimeout(outputTimeout);
      }

      // Set new timeout to flush buffer
      outputTimeout = setTimeout(flushOutput, 5);
    });

    // Handle input from client
    socket.on('terminal:input', data => {
      try {
        // Flush any pending output before processing new input
        flushOutput();
        
        // Clean and write the input
        const cleanData = data.replace(/\r\n|\r|\n/g, '\n');
        term.write(cleanData);
      } catch (err) {
        console.error('Error writing to terminal:', err);
        socket.emit('error', { message: 'Failed to process terminal input' });
      }
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
