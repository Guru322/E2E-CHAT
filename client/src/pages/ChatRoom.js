import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import LockIcon from '@mui/icons-material/Lock';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import {
  generatePrivateKey,
  calculatePublicKey,
  calculateSharedSecret,
  deriveEncryptionKey,
  encryptMessage,
  decryptMessage
} from '../utils/crypto';

// The server URL
const SOCKET_SERVER_URL = 'chat.gurucharan.me';

const ChatRoom = () => {
  const { sessionKey } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [privateKey, setPrivateKey] = useState('');
  // We're keeping publicKey in state to maintain the value, but we suppress
  // the ESLint warning since it's only used for setup and key exchange
  // eslint-disable-next-line no-unused-vars
  const [publicKey, setPublicKey] = useState('');
  const [peerPublicKey, setPeerPublicKey] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [peerConnected, setPeerConnected] = useState(false);
  const [openDestroyDialog, setOpenDestroyDialog] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [copied, setCopied] = useState(false);
  // Add a message queue for messages received before encryption is ready
  const [pendingMessages, setPendingMessages] = useState([]);
  // Add keyReady state to explicitly track when the encryption key is ready
  const [keyReady, setKeyReady] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const initCrypto = () => {
      try {
        // Generate private key
        const myPrivateKey = generatePrivateKey();
        setPrivateKey(myPrivateKey);
        
        // Calculate public key
        const myPublicKey = calculatePublicKey(myPrivateKey);
        setPublicKey(myPublicKey);
        
        console.log('Crypto initialized with public key:', myPublicKey);
        return myPublicKey;
      } catch (err) {
        console.error('Failed to initialize crypto:', err);
        setError('Failed to initialize encryption. Please use a modern browser.');
        return null;
      }
    };
    
    const initSocket = (myPublicKey) => {
      if (!myPublicKey) return null;
      
      console.log('Initializing socket connection...');
      const newSocket = io(SOCKET_SERVER_URL);
      
      newSocket.on('connect', () => {
        console.log('Socket connected with ID:', newSocket.id);
        setConnected(true);
        setLoading(false);
        
        // Join the chat session with our public key
        newSocket.emit('joinSession', {
          sessionKey,
          publicKey: myPublicKey
        });
        console.log('Joining session with key:', sessionKey);
      });
      
      newSocket.on('connect_error', (err) => {
        console.error('Socket connect error:', err);
        setError(`Connection error: ${err.message}`);
        setLoading(false);
      });
      
      newSocket.on('error', (err) => {
        console.error('Socket error:', err);
        setError(err.message);
      });
      // eslint-disable-next-line no-unused-vars
      newSocket.on('sessionJoined', (data) => {
        console.log('Successfully joined session');
        
        // Check if we are the second person to join an existing session
        // by checking if the session already has a user
        newSocket.emit('checkSessionStatus', { sessionKey });
        
        // Only show the waiting message if we're not immediately getting peer info
        setInfoMessage('Successfully joined the chat session. Waiting for peer...');
      });
      
      // Add a new handler for session status check
      newSocket.on('sessionStatus', (data) => {
        console.log('Received session status:', data);
        if (data.hasExistingPeer) {
          // If we're joining a session with an existing peer, 
          // don't show the "waiting for peer" message
          setInfoMessage('Connecting with existing peer...');
        }
      });
      
      newSocket.on('peerJoined', (data) => {
        console.log('Peer joined with public key:', data.peerPublicKey);
        setPeerPublicKey(data.peerPublicKey);
        setPeerConnected(true);
        setInfoMessage('Peer connected! You can now start chatting securely.');
      });
      
      newSocket.on('userJoined', (data) => {
        // Someone else joined the chat
        console.log('User joined event:', data);
        addInfoMessage(data.message);
      });
      
      newSocket.on('userLeft', (data) => {
        // Someone left the chat
        console.log('User left event:', data);
        addInfoMessage(data.message);
        setPeerConnected(false);
      });
      
      newSocket.on('receiveMessage', (data) => {
        console.log('Received encrypted message, keyReady:', keyReady, 'encryptionKey exists:', !!encryptionKey);
        
        if (keyReady && encryptionKey) {
          try {
            const decrypted = decryptMessage(
              data.encryptedMessage,
              data.iv,
              encryptionKey
            );
            
            if (decrypted === 'Message decryption failed') {
              console.error('Decryption failed for message:', data);
              addInfoMessage('Failed to decrypt a message from peer.');
            } else {
              addMessage({
                text: decrypted,
                sender: 'peer'
              });
            }
          } catch (err) {
            console.error('Error during message decryption:', err);
            addInfoMessage('Error decrypting message.');
          }
        } else {
          // Store message for later decryption when key is ready
          console.log('Queueing message for later decryption');
          setPendingMessages(prev => [...prev, data]);
          
          if (pendingMessages.length === 0) {
            addInfoMessage('Received an encrypted message but encryption key is not ready yet. Messages will be decrypted automatically when the key is ready.');
          }
        }
      });
      
      newSocket.on('sessionDestroyed', (data) => {
        console.log('Session destroyed:', data);
        addInfoMessage(data.message);
        setTimeout(() => {
          navigate('/');
        }, 3000);
      });
      
      newSocket.on('sessionExpired', (data) => {
        console.log('Session expired:', data);
        addInfoMessage(data.message);
        setTimeout(() => {
          navigate('/');
        }, 3000);
      });
      
      setSocket(newSocket);
      
      return newSocket;
    };
    
    const myPublicKey = initCrypto();
    const socket = initSocket(myPublicKey);
    
    return () => {
      if (socket) {
        console.log('Disconnecting socket');
        socket.disconnect();
      }
    };
  }, [sessionKey, navigate]);
  
  useEffect(() => {
    const setupEncryption = async () => {
      if (privateKey && peerPublicKey) {
        try {
          console.log('Calculating shared secret with peer public key:', peerPublicKey);
          const sharedSecret = calculateSharedSecret(privateKey, peerPublicKey);
          console.log('Deriving encryption key from shared secret...');
          const key = deriveEncryptionKey(sharedSecret);
          console.log('Encryption key derived successfully');
          
          setEncryptionKey(key);
          
          setTimeout(() => {
            setKeyReady(true);
            console.log('Encryption key marked as ready');
            
            addInfoMessage('Secure connection established. Messages are now end-to-end encrypted.');
          }, 300);
        } catch (err) {
          console.error('Error setting up encryption:', err);
          setError('Failed to establish secure connection. Please try again.');
        }
      }
    };
    
    setupEncryption();
  }, [privateKey, peerPublicKey]);
  
  useEffect(() => {
    const processPendingMessages = async () => {
      if (keyReady && encryptionKey && pendingMessages.length > 0) {
        console.log('Processing pending messages:', pendingMessages.length);
        
        const messagesToProcess = [...pendingMessages];
        setPendingMessages([]);
        
        for (const data of messagesToProcess) {
          try {
            const decrypted = decryptMessage(
              data.encryptedMessage,
              data.iv,
              encryptionKey
            );
            
            if (decrypted === 'Message decryption failed') {
              console.error('Failed to decrypt pending message:', data);
              addInfoMessage('Failed to decrypt a pending message from peer.');
            } else {
              addMessage({
                text: decrypted,
                sender: 'peer'
              });
            }
          } catch (err) {
            console.error('Error decrypting pending message:', err);
          }
        }
      }
    };
    
    processPendingMessages();
  }, [keyReady, encryptionKey, pendingMessages]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const addMessage = (newMessage) => {
    setMessages(prevMessages => [...prevMessages, {
      ...newMessage,
      id: Date.now().toString(),
      timestamp: new Date()
    }]);
  };
  
  const addInfoMessage = (text) => {
    addMessage({
      text,
      type: 'info'
    });
  };
  
  const sendMessage = () => {
    if (!message.trim() || !connected || !socket || !keyReady || !encryptionKey) {
      console.log('Cannot send message, conditions not met:', {
        messageEmpty: !message.trim(),
        connected,
        socketExists: !!socket,
        keyReady,
        encryptionKeyExists: !!encryptionKey
      });
      return;
    }
    
    try {
      const { encryptedMessage, iv } = encryptMessage(message, encryptionKey);
      
      socket.emit('sendMessage', {
        sessionKey,
        encryptedMessage,
        iv
      });
      
      addMessage({
        text: message,
        sender: 'self'
      });
      
      setMessage('');
    } catch (err) {
      console.error('Error sending encrypted message:', err);
      addInfoMessage('Failed to encrypt and send message.');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const copySessionKey = () => {
    navigator.clipboard.writeText(sessionKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const destroySession = () => {
    if (socket) {
      socket.emit('destroySession', { sessionKey });
      setOpenDestroyDialog(false);
      addInfoMessage('Destroying this chat session...');
    }
  };
  
  const leaveChat = () => {
    navigate('/');
  };
  
  return (
    <Box sx={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <LockIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Secure Chat {keyReady ? '(Encrypted)' : ''}
          </Typography>
          
          <Button 
            color="inherit" 
            startIcon={<ContentCopyIcon />}
            onClick={copySessionKey}
            size="small"
          >
            {copied ? 'Copied!' : 'Copy Session Key'}
          </Button>
          
          <IconButton 
            color="inherit" 
            onClick={() => setOpenDestroyDialog(true)}
            title="Destroy Session"
          >
            <DeleteIcon />
          </IconButton>
          
          <IconButton 
            color="inherit" 
            onClick={leaveChat}
            title="Leave Chat"
          >
            <ExitToAppIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Paper elevation={3} sx={{ 
        p: 2, 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : (
          <>
            {!peerConnected && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">
                    Share this session key to chat securely: 
                    <Typography component="span" sx={{ fontWeight: 'bold', ml: 1 }}>
                      {sessionKey}
                    </Typography>
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<ContentCopyIcon />}
                    onClick={copySessionKey}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </Box>
              </Alert>
            )}
            
            {peerConnected && !keyReady && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Establishing secure connection... Please wait.
              </Alert>
            )}
            
            {infoMessage && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {infoMessage}
              </Alert>
            )}
            
            <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
              <List>
                {messages.map((msg) => (
                  <React.Fragment key={msg.id}>
                    {msg.type === 'info' ? (
                      <ListItem sx={{ justifyContent: 'center' }}>
                        <Box sx={{ 
                          bgcolor: 'action.hover', 
                          borderRadius: 1, 
                          px: 2, 
                          py: 0.5 
                        }}>
                          <Typography variant="body2" color="text.secondary">
                            {msg.text}
                          </Typography>
                        </Box>
                      </ListItem>
                    ) : (
                      <ListItem sx={{ 
                        justifyContent: msg.sender === 'self' ? 'flex-end' : 'flex-start'
                      }}>
                        <Box sx={{ 
                          maxWidth: '80%',
                          bgcolor: msg.sender === 'self' ? 'primary.main' : 'secondary.main',
                          color: 'white',
                          borderRadius: 2,
                          px: 2,
                          py: 1,
                          borderTopRightRadius: msg.sender === 'self' ? 0 : 2,
                          borderTopLeftRadius: msg.sender === 'self' ? 2 : 0
                        }}>
                          <ListItemText 
                            primary={msg.text}
                            secondary={
                              <Typography 
                                variant="caption" 
                                sx={{ color: 'rgba(255,255,255,0.7)' }}
                              >
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </Typography>
                            }
                          />
                        </Box>
                      </ListItem>
                    )}
                  </React.Fragment>
                ))}
                <div ref={messagesEndRef} />
              </List>
            </Box>
            
            <Divider />
            
            <Box sx={{ display: 'flex', mt: 2 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!connected || !peerConnected || !keyReady}
                multiline
                maxRows={4}
                sx={{ mr: 1 }}
              />
              <Button
                variant="contained"
                color="primary"
                endIcon={<SendIcon />}
                onClick={sendMessage}
                disabled={!connected || !peerConnected || !keyReady || !message.trim()}
              >
                Send
              </Button>
            </Box>
          </>
        )}
      </Paper>
      
      {/* Destroy Session Confirmation Dialog */}
      <Dialog
        open={openDestroyDialog}
        onClose={() => setOpenDestroyDialog(false)}
      >
        <DialogTitle>Destroy Chat Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to destroy this chat session? This action cannot be undone,
            and all participants will be disconnected.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDestroyDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={destroySession} color="error" startIcon={<DeleteIcon />}>
            Destroy Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatRoom;