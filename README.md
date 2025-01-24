# MailTJ - Modern Email Client

A high-performance email client built with React and Flask, featuring real-time email fetching, caching, and a modern UI.

## Features

- **Fast Email Loading**
  - Paginated email fetching (20 emails per page)
  - Redis caching for improved performance
  - Background cache updates
  - Newest emails first

- **Modern UI**
  - Clean, responsive Material-UI design
  - Toggle between plain text and HTML email views
  - Easy navigation between inbox and email views
  - Loading states and error handling

- **Security**
  - Token-based authentication
  - Secure password handling
  - HTTPS support for API endpoints

## Tech Stack

### Frontend
- React
- Material-UI
- React Router
- Vite

### Backend
- Flask
- Flask-SQLAlchemy
- Flask-CORS
- Redis
- Python IMAP/SMTP libraries

### Infrastructure
- Docker
- Redis
- SQLite

## Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 16+ (for local development)
- Python 3.8+ (for local development)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Backend Settings
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your_secret_key

# Email Settings
IMAP_SERVER=imap.gmail.com
IMAP_PORT=993
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_PASSWORD=your_app_password

# Redis Settings
REDIS_URL=redis://redis:6379/0
```

### Running with Docker

1. Build and start the containers:
```bash
docker-compose up --build
```

2. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Local Development Setup

#### Backend
1. Create a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Run the Flask server:
```bash
flask run
```

#### Frontend
1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Email Configuration

### Gmail Setup
1. Enable 2-Factor Authentication
2. Generate an App Password:
   - Go to Google Account Settings
   - Security > App Passwords
   - Generate a new app password
   - Use this password in your .env file

### Other Email Providers
Update the IMAP and SMTP settings in your .env file according to your email provider's specifications.

## Performance Features

- Redis caching with 5-minute expiration
- Background cache updates every 4 minutes
- Paginated email fetching (20 per page)
- Preemptive caching of next page
- Header-only fetching for inbox view

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
