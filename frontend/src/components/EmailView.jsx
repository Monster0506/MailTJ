import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Divider,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { getEmail } from '../services/api';

function EmailView() {
  const { emailId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailData, setEmailData] = useState({
    subject: '',
    sender: '',
    to: '',
    date: '',
    content: { text: '', html: '' },
  });
  const [viewMode, setViewMode] = useState('text');

  useEffect(() => {
    loadEmail();
  }, [emailId]);

  const loadEmail = async () => {
    try {
      setLoading(true);
      const data = await getEmail(emailId);
      setEmailData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/inbox');
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  const renderEmailContent = () => {
    const content = emailData.content || { text: '', html: '' };

    if (viewMode === 'text') {
      return (
        <Box sx={{ 
          whiteSpace: 'pre-wrap', 
          wordWrap: 'break-word',
          fontFamily: 'monospace',
          p: 2,
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
          maxWidth: '100%',
          overflow: 'auto',
          maxHeight: '500px'
        }}>
          {content.text || 'No plain text content available'}
        </Box>
      );
    } else {
      return (
        <Box sx={{ 
          p: 2,
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
          maxWidth: '100%',
          overflow: 'auto',
          maxHeight: '500px'
        }}>
          {content.html ? (
            <div dangerouslySetInnerHTML={{ __html: content.html }} />
          ) : (
            <Typography>No HTML content available</Typography>
          )}
        </Box>
      );
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        )}
        
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={handleBack} 
            sx={{ mr: 2 }}
            aria-label="back to inbox"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            {emailData.subject || 'No Subject'}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ mb: 1 }}>
            <strong>From: </strong>
            {emailData.sender}
          </Typography>
          
          <Typography sx={{ mb: 1 }}>
            <strong>To: </strong>
            {emailData.to}
          </Typography>
          
          <Typography>
            <strong>Date: </strong>
            {emailData.date}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="text formatting"
            size="small"
          >
            <ToggleButton value="text" aria-label="plain text">
              Plain Text
            </ToggleButton>
            <ToggleButton value="html" aria-label="html">
              Rendered HTML
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {renderEmailContent()}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
          >
            Back to Inbox
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default EmailView;