import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ExplorerContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  color: #ccc;
  background: #252526;
  height: 100%;
`;

const FileList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const FileItem = styled.li`
  padding: 0.25rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background-color: #2a2d2e;
  }

  &.active {
    background-color: #37373d;
  }
`;

const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="#dcb67a">
    <path d="M14.5 3H7.71L6.86 2.15L6.51 2H1.5L1 2.5V13.5L1.5 14H14.5L15 13.5V3.5L14.5 3ZM14 13H2V3H6.29L7.14 3.85L7.49 4H14V13Z"/>
  </svg>
);

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="#75beff">
    <path d="M13.85 4.44L10.56 1.15L10.21 1H4.5L4 1.5V14.5L4.5 15H13.5L14 14.5V4.79L13.85 4.44ZM13 14H5V2H9.21L13 5.79V14Z"/>
  </svg>
);

const Breadcrumb = styled.div`
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #333;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.9rem;
  background: #252526;
  
  span {
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const FileExplorer = ({ socket, onFileSelect }) => {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleFileList = (fileList) => {
      setFiles(Array.isArray(fileList) ? fileList : []);
      setError(null);
    };

    const handleFileContent = ({ path, content }) => {
      onFileSelect?.(path, content);
    };

    const handleError = (err) => {
      console.error('File operation error:', err);
      setError(err.message);
    };

    socket.on('file:list', handleFileList);
    socket.on('file:content', handleFileContent);
    socket.on('error', handleError);
    
    // Initial file list request
    socket.emit('file:list', currentPath);

    return () => {
      socket.off('file:list', handleFileList);
      socket.off('file:content', handleFileContent);
      socket.off('error', handleError);
    };
  }, [socket, currentPath, onFileSelect]);

  const handleItemClick = (item) => {
    if (item.type === 'directory') {
      const newPath = currentPath === '/' 
        ? `/${item.name}`
        : `${currentPath}/${item.name}`;
      setCurrentPath(newPath);
      socket.emit('file:list', newPath);
    } else {
      const filePath = currentPath === '/' 
        ? `/${item.name}`
        : `${currentPath}/${item.name}`;
      setSelectedFile(filePath);
      socket.emit('file:read', filePath);
    }
  };

  const navigateToPath = (index) => {
    const newPath = currentPath.split('/')
      .slice(0, index + 1)
      .join('/') || '/';
    setCurrentPath(newPath);
    socket.emit('file:list', newPath);
  };

  const renderBreadcrumb = () => {
    const parts = currentPath.split('/').filter(Boolean);
    return (
      <Breadcrumb>
        <span onClick={() => navigateToPath(0)}>/</span>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <span onClick={() => navigateToPath(index + 1)}>{part}</span>
            {index < parts.length - 1 && '/'}
          </React.Fragment>
        ))}
      </Breadcrumb>
    );
  };

  if (error) {
    return <ExplorerContainer>Error: {error}</ExplorerContainer>;
  }

  return (
    <ExplorerContainer>
      {renderBreadcrumb()}
      <FileList>
        {currentPath !== '/' && (
          <FileItem onClick={() => navigateToPath(currentPath.split('/').length - 2)}>
            <FolderIcon />
            ..
          </FileItem>
        )}
        {files.sort((a, b) => {
          // Directories first, then files
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        }).map((file, index) => (
          <FileItem
            key={index}
            onClick={() => handleItemClick(file)}
            className={selectedFile === `${currentPath}/${file.name}` ? 'active' : ''}
          >
            {file.type === 'directory' ? <FolderIcon /> : <FileIcon />}
            {file.name}
          </FileItem>
        ))}
      </FileList>
    </ExplorerContainer>
  );
};

export default FileExplorer;
