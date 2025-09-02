import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import ConnectionPanel from './components/ConnectionPanel';
import FileExplorer from './components/FileExplorer';
import TerminalComponent from './components/TerminalComponent';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #1e1e1e;
  color: #fff;
`;

const Sidebar = styled.div`
  width: 250px;
  background-color: #252526;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
`;

const MainContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const EditorContainer = styled.div`
  flex: 1;
  overflow: hidden;
`;

const TerminalContainer = styled.div`
  height: 300px;
  border-top: 1px solid #333;
  flex: 0 0 auto;
  overflow: hidden;
  display: flex;
  position: relative;
  background: #1e1e1e;
`;

const App = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: false
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      setIsConnecting(false);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setIsConnecting(false);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);

  const handleConnect = async (config) => {
    if (!socket || isConnecting) return;

    setIsConnecting(true);
    try {
      const response = await fetch('http://localhost:3001/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Connection failed');
      }

      socket.connect();
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnecting(false);
      throw error;
    }
  };

  const handleFileSelect = (path, content) => {
    setCurrentFile({ path, content });
  };

  const handleEditorChange = (value) => {
    if (currentFile && socket) {
      setCurrentFile(prev => ({ ...prev, content: value }));
      socket.emit('file:write', {
        path: currentFile.path,
        content: value
      });
    }
  };

  return (
    <AppContainer>
      {!connected ? (
        <ConnectionPanel 
          onConnect={handleConnect} 
          isConnecting={isConnecting}
        />
      ) : (
        <>
          <Sidebar>
            <FileExplorer 
              socket={socket}
              onFileSelect={handleFileSelect}
            />
          </Sidebar>
          <MainContainer>
            <EditorContainer>
              {currentFile && (
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  value={currentFile.content}
                  onChange={handleEditorChange}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                  }}
                />
              )}
            </EditorContainer>
            <TerminalContainer>
              <TerminalComponent 
                socket={socket}
                connected={connected}
              />
            </TerminalContainer>
          </MainContainer>
        </>
      )}
    </AppContainer>
  );
};

export default App;
