import React, { useState, useEffect } from 'react';
import {
  Container,
  List,
  ListItemText,
  Typography,
  Paper,
  Fab,
  Divider,
  CircularProgress,
  Alert,
  ListItemButton,
  Box,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { fetchEmails, refreshCache } from '../services/api';

function Inbox() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEmails = async (pageNum, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log('Starting email fetch for page:', pageNum);
       const response = await fetchEmails(pageNum);
      console.log(response);

      
      setEmails(prev => append ? [...prev, ...response.emails] : response.emails);
      setHasMore(response.pagination.has_more);
      setPage(response.pagination.page);
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError(err.message || 'Failed to fetch emails');
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadEmails(1);
  }, []);

  const handleLoadMore = () => {
    loadEmails(page + 1, true);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshCache();
      await loadEmails(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEmailClick = (emailId) => {
    navigate(`/email/${emailId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading emails...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" gutterBottom>
            Inbox
          </Typography>
          <Tooltip title="Reload emails">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <List>
          {emails && emails.length > 0 ? (
            emails.map((email, index) => (
              <React.Fragment key={email.id}>
                <ListItemButton onClick={() => handleEmailClick(email.id)}>
                  <ListItemText
                    primary={email.subject}
                    secondary={`From: ${email.sender} - ${new Date(
                      email.date
                    ).toLocaleString()}`}
                  />
                </ListItemButton>
                {index < emails.length - 1 && <Divider />}
              </React.Fragment>
            ))
          ) : (
            <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
              No emails found
            </Typography>
          )}
        </List>
        
        {hasMore && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              disabled={loadingMore}
              sx={{ width: '200px' }}
            >
              {loadingMore ? (
                <CircularProgress size={24} sx={{ mr: 1 }} />
              ) : (
                'View More'
              )}
            </Button>
          </Box>
        )}
      </Paper>
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/compose')}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
}

export default Inbox;