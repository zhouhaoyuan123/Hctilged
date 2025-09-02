import React, { useState } from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #252526;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: #cccccc;
  font-size: 0.9rem;
`;

const Input = styled.input`
  background: #3c3c3c;
  border: 1px solid #555;
  color: #fff;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #0078d4;
  }
`;

const Button = styled.button`
  background: #0078d4;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-top: 1rem;

  &:hover {
    background: #006cbd;
  }

  &:disabled {
    background: #004275;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #f14c4c;
  font-size: 0.9rem;
  margin-top: 1rem;
`;

const ConnectionPanel = ({ onConnect, isConnecting }) => {
  const [formData, setFormData] = useState({
    host: '',
    username: '',
    password: '',
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.host || !formData.username) {
      setError('Host and username are required');
      return;
    }
    
    try {
      await onConnect(formData);
    } catch (err) {
      setError(err.message || 'Failed to connect');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Panel>
      <h2 style={{ color: '#fff', marginBottom: '1.5rem' }}>SSH Connection</h2>
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Host</Label>
          <Input
            type="text"
            name="host"
            value={formData.host}
            onChange={handleChange}
            placeholder="localhost"
            disabled={isConnecting}
          />
        </FormGroup>
        <FormGroup>
          <Label>Username</Label>
          <Input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="root"
            disabled={isConnecting}
          />
        </FormGroup>
        <FormGroup>
          <Label>Password</Label>
          <Input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password"
            disabled={isConnecting}
          />
        </FormGroup>
        <Button type="submit" disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Button>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Form>
    </Panel>
  );
};

export default ConnectionPanel;
