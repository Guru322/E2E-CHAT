import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Paper,
  Stack,
  TextField,
  Box,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const Home = () => {
  const navigate = useNavigate();
  const [sessionKey, setSessionKey] = useState('');
  const [newSessionKey, setNewSessionKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Create a new chat session
  const createSession = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('https://chat.gurucharan.me/api/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create chat session');
      }
      
      const data = await response.json();
      setNewSessionKey(data.sessionKey);
    } catch (err) {
      setError('Error creating chat session: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Join an existing chat session
  const joinSession = () => {
    if (!sessionKey.trim()) {
      setError('Please enter a session key');
      return;
    }
    
    // Navigate to the chat room with the provided session key
    navigate(`/chat/${sessionKey.trim()}`);
  };

  // Copy session key to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(newSessionKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Go to the newly created chat session
  const goToSession = () => {
    navigate(`/chat/${newSessionKey}`);
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <LockIcon fontSize="large" color="primary" sx={{ mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Private E2E Encrypted Chat
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center">
          End-to-end encrypted chat sessions with no storage of messages.
          <br />
          Create a chat session, share the key with someone, and chat privately.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Stack spacing={3}>
        {/* Create a new session */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Create a New Chat Session
          </Typography>
          <Button 
            variant="contained"
            fullWidth
            onClick={createSession}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={24} /> : null}
          >
            {loading ? 'Creating...' : 'Create New Session'}
          </Button>

          {newSessionKey && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                Share this session key with the person you want to chat with:
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                bgcolor: 'action.hover',
                p: 1,
                borderRadius: 1
              }}>
                <Typography 
                  variant="body1" 
                  component="code" 
                  sx={{ wordBreak: 'break-all' }}
                >
                  {newSessionKey}
                </Typography>
                <Button 
                  size="small" 
                  startIcon={<ContentCopyIcon />} 
                  onClick={copyToClipboard}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </Box>
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={goToSession}
              >
                Join This Session
              </Button>
            </Box>
          )}
        </Box>

        <Divider>OR</Divider>

        {/* Join an existing session */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Join Existing Chat Session
          </Typography>
          <TextField
            fullWidth
            label="Enter Session Key"
            variant="outlined"
            value={sessionKey}
            onChange={(e) => setSessionKey(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            onClick={joinSession}
          >
            Join Session
          </Button>
        </Box>
      </Stack>

      <Box sx={{ mt: 4 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          All messages are end-to-end encrypted using Diffie-Hellman key exchange.
          <br />
          No messages are stored on the server.
        </Typography>
      </Box>
    </Paper>
  );
};

export default Home;
