import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const TerminalContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #1e1e1e;

  .xterm {
    height: 100%;
  }
  
  .xterm-viewport,
  .xterm-screen {
    height: 100% !important;
    width: 100% !important;
  }
`;

const TerminalComponent = ({ socket, connected }) => {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    // Only initialize if we're connected and have a container
    if (!connected || !containerRef.current) return;

    // Clean up any existing terminal
    if (terminalRef.current) {
      terminalRef.current.dispose();
    }

    // Create new terminal with basic config
    let term;
    try {
      term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontFamily: 'monospace',
        fontSize: 14,
        cols: 80,
        rows: 24,
        rendererType: 'canvas',
        convertEol: true,
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selection: 'rgba(255, 255, 255, 0.3)',
        }
      });

      // Create fit addon
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;
      terminalRef.current = term;

    } catch (e) {
      console.error('Failed to create terminal:', e);
      return;
    }

    // Define initialization function
    const initTerminal = () => {
      if (!containerRef.current || !terminalRef.current) return;
      
      // Open terminal in container
      terminalRef.current.open(containerRef.current);

      // Wait for next frame before fitting
      requestAnimationFrame(() => {
        if (fitAddonRef.current && terminalRef.current) {
          try {
            fitAddonRef.current.fit();
            terminalRef.current.focus();
          } catch (e) {
            console.error('Fit failed:', e);
          }
        }
      });
    };

    // Initialize after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(initTerminal, 100);

    return () => {
      clearTimeout(timeoutId);
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
      fitAddonRef.current = null;
    };
  }, [connected]);

  // Handle terminal events
  useEffect(() => {
    if (!socket || !terminalRef.current) return;

    // Setup input and output handling
    const dataHandler = (data) => {
      if (socket) {
        // Send input to server
        socket.emit('terminal:input', data);

        // Avoid local echo if server echoes input
        if (data === '\b' || data === '\x7f') {
          // Handle backspace/delete locally
          terminalRef.current.write('\b \b');
        } else if (data.trim()) {
          terminalRef.current.write(data);
        }
      }
    };

    terminalRef.current.onData(dataHandler);

    const outputHandler = (data) => {
      // Only process server output that's not our local echo
      if (terminalRef.current && data.includes('\n')) {
        terminalRef.current.write(data);
      }
    };

    const errorHandler = (error) => {
      console.error('Terminal error:', error);
      if (terminalRef.current) {
        terminalRef.current.write('\r\n\x1b[31mError: ' + error.message + '\x1b[0m\r\n');
      }
    };

    const closeHandler = () => {
      if (terminalRef.current) {
        terminalRef.current.write('\r\n\x1b[33mTerminal session closed\x1b[0m\r\n');
      }
    };

    socket.on('terminal:output', outputHandler);
    socket.on('error', errorHandler);
    socket.on('terminal:close', closeHandler);

    // Create terminal session
    socket.emit('terminal:create');
    
    // Send terminal size to server
    const sendTerminalSize = () => {
      if (terminalRef.current) {
        socket.emit('terminal:resize', {
          cols: terminalRef.current.cols,
          rows: terminalRef.current.rows
        });
      }
    };

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        requestAnimationFrame(() => {
          try {
            fitAddonRef.current.fit();
            sendTerminalSize();
          } catch (e) {
            console.error('Resize failed:', e);
          }
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
      socket.off('terminal:output', outputHandler);
      socket.off('error', errorHandler);
      socket.off('terminal:close', closeHandler);
      window.removeEventListener('resize', handleResize);
    };
  }, [socket]);

  return <TerminalContainer ref={containerRef} />;
};

export default TerminalComponent;
