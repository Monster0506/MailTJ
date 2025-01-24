import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert
} from '@mui/material';
import { Close as CloseIcon, Send as SendIcon } from '@mui/icons-material';
import { sendEmail } from '../services/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ComposeEmail = () => {
  const navigate = useNavigate();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isHtml, setIsHtml] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!to || !subject || !content) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSending(true);
      setError('');
      await sendEmail({
        to,
        subject,
        content,
        isHtml
      });
      setSuccessMessage('Email sent successfully');
      // Clear form after successful send
      setTo('');
      setSubject('');
      setContent('');
      // Navigate back to inbox after a short delay
      setTimeout(() => navigate('/inbox'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    navigate('/inbox');
  };

  const handleEditorChange = (value) => {
    setContent(value);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Compose Email</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            margin="normal"
            type="email"
            required
          />

          <TextField
            fullWidth
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            margin="normal"
            required
          />

          <Box sx={{ mt: 2, mb: 2 }}>
            <ToggleButtonGroup
              value={isHtml}
              exclusive
              onChange={(e, value) => setIsHtml(value)}
              size="small"
            >
              <ToggleButton value={false}>
                Plain Text
              </ToggleButton>
              <ToggleButton value={true}>
                Rich Text
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {isHtml ? (
            <Box sx={{ mb: 2, '& .quill': { height: '300px' } }}>
              <ReactQuill
                value={content}
                onChange={handleEditorChange}
                theme="snow"
              />
            </Box>
          ) : (
            <TextField
              fullWidth
              multiline
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              margin="normal"
              required
              placeholder="Write your message here..."
            />
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleClose}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={sending}
              startIcon={<SendIcon />}
            >
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </form>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError('')}
        >
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage('')}
        >
          <Alert severity="success" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default ComposeEmail;