import React, { useState, Suspense } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';

// Create theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Lazy load components
const Login = React.lazy(() => import('./components/Login'));
const Inbox = React.lazy(() => import('./components/Inbox'));
const ComposeEmail = React.lazy(() => import('./components/ComposeEmail'));
const EmailView = React.lazy(() => import('./components/EmailView'));

function App() {
  const [count, setCount] = useState(0)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/compose" element={<ComposeEmail />} />
            <Route path="/email/:emailId" element={<EmailView />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
