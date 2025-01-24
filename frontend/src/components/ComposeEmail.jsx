import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

function ComposeEmail() {
  const navigate = useNavigate();
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    body: '',
  });

  const handleChange = (e) => {
    setEmailData({
      ...emailData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // TODO: Implement API call to send email
      // await api.sendEmail(emailData);
      navigate('/inbox');
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Compose Email
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="to"
            label="To"
            type="email"
            value={emailData.to}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="subject"
            label="Subject"
            value={emailData.subject}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="body"
            label="Message"
            multiline
            rows={8}
            value={emailData.body}
            onChange={handleChange}
          />
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => navigate('/inbox')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Send
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default ComposeEmail;