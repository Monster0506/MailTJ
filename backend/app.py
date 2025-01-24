from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import imaplib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import email
import logging
import sys
from datetime import datetime
from email.header import decode_header
import email.utils
import redis
import json
from threading import Thread
import re
import html

# Configure logging to output to console
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Print environment variables for debugging (excluding sensitive info)
logger.debug(f"FLASK_APP: {os.getenv('FLASK_APP')}")
logger.debug(f"FLASK_ENV: {os.getenv('FLASK_ENV')}")
logger.debug(f"IMAP_SERVER: {os.getenv('IMAP_SERVER')}")
logger.debug(f"IMAP_PORT: {os.getenv('IMAP_PORT')}")

app = Flask(__name__)
CORS(app)

# Initialize Redis
redis_client = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
CACHE_EXPIRATION = 300  # 5 minutes

# Configure SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///emails.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')

logger.info("Initializing database connection")
db = SQLAlchemy(app)

# User model for storing sessions
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    session_token = db.Column(db.String(500), unique=True, nullable=True)

with app.app_context():
    db.create_all()
    logger.info("Database initialized")

def get_auth_token(auth_header):
    if not auth_header:
        logger.error("No authorization header provided")
        return None, ('No authorization token', 401)

    try:
        auth_token = auth_header.split('Bearer ')[1].strip()
        return auth_token, None
    except (IndexError, AttributeError):
        logger.error(f"Invalid authorization header format: {auth_header}")
        return None, ('Invalid authorization format', 401)

def get_authenticated_user(auth_token):
    user = User.query.filter_by(session_token=auth_token).first()
    if not user:
        logger.error(f"Invalid token: {auth_token}")
        return None, ('Invalid token', 401)
    return user, None

def decode_email_subject(subject):
    """Safely decode email subject"""
    if not subject:
        return "No Subject"
    
    try:
        decoded_parts = decode_header(subject)
        decoded_subject = ""
        for part, charset in decoded_parts:
            if isinstance(part, bytes):
                try:
                    decoded_subject += part.decode(charset or 'utf-8', errors='replace')
                except:
                    decoded_subject += part.decode('utf-8', errors='replace')
            else:
                decoded_subject += str(part)
        return decoded_subject
    except:
        return str(subject)

def fetch_email_page(imap, start_idx, count):
    """Fetch a specific page of emails"""
    _, messages = imap.search(None, 'ALL')
    email_ids = messages[0].split()
    
    # Reverse to get newest first
    email_ids = email_ids[::-1]
    
    # Calculate the slice for this page
    total_emails = len(email_ids)
    end_idx = min(start_idx + count, total_emails)
    current_page_ids = email_ids[start_idx:end_idx]
    
    emails = []
    if current_page_ids:
        for email_id in current_page_ids:
            try:
                _, msg_data = imap.fetch(email_id, '(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE)])')
                if msg_data and msg_data[0]:
                    header = email.message_from_bytes(msg_data[0][1])
                    
                    emails.append({
                        'id': email_id.decode(),
                        'subject': decode_email_subject(header.get('Subject')),
                        'sender': header.get('From', 'Unknown'),
                        'date': header.get('Date', ''),
                        'preview': '...'
                    })
            except Exception as e:
                logger.error(f"Error processing email {email_id}: {str(e)}")
                continue
    
    return emails, total_emails, end_idx < total_emails

def background_cache_update(user_email, password, page=1):
    """Update cache for a specific page in background"""
    try:
        imap = imaplib.IMAP4_SSL(os.getenv('IMAP_SERVER'))
        imap.login(user_email, password)
        imap.select('INBOX')
        
        start_idx = (page - 1) * 20  # 20 emails per page
        emails, total, has_more = fetch_email_page(imap, start_idx, 20)
        
        cache_data = {
            'emails': emails,
            'total_emails': total,
            'has_more': has_more,
            'page': page,
            'timestamp': datetime.now().timestamp()
        }
        
        # Store in Redis with page number in key
        cache_key = f"emails:{user_email}:page:{page}"
        redis_client.set(cache_key, json.dumps(cache_data), ex=CACHE_EXPIRATION)
        
        imap.close()
        imap.logout()
        
    except Exception as e:
        logger.error(f"Background cache update failed: {str(e)}")

def get_email_content(msg):
    """Extract both plain text and HTML content from email message"""
    text_content = ""
    html_content = ""
    
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                text_content = part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8', errors='replace')
            elif part.get_content_type() == "text/html":
                html_content = part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8', errors='replace')
    else:
        content_type = msg.get_content_type()
        if content_type == "text/plain":
            text_content = msg.get_payload(decode=True).decode(msg.get_content_charset() or 'utf-8', errors='replace')
        elif content_type == "text/html":
            html_content = msg.get_payload(decode=True).decode(msg.get_content_charset() or 'utf-8', errors='replace')
    
    # If we only have HTML content, create a plain text version
    if not text_content and html_content:
        # Simple HTML to text conversion
        text_content = html_content.replace('<br>', '\n').replace('<br/>', '\n').replace('</p>', '\n\n')
        text_content = re.sub('<[^<]+?>', '', text_content)
        text_content = html.unescape(text_content)
    
    # If we only have plain text, create a simple HTML version
    if not html_content and text_content:
        html_content = text_content.replace('\n', '<br>').replace('  ', '&nbsp;&nbsp;')
    
    return {
        'text': text_content,
        'html': html_content
    }

@app.route('/fetch-emails', methods=['GET'])
def fetch_emails():
    auth_header = request.headers.get('Authorization')
    page = request.args.get('page', 1, type=int)
    
    if not auth_header:
        return jsonify({'error': 'No authorization token'}), 401

    try:
        auth_token = auth_header.split('Bearer ')[1].strip()
    except (IndexError, AttributeError):
        return jsonify({'error': 'Invalid authorization format'}), 401

    user = User.query.filter_by(session_token=auth_token).first()
    if not user:
        return jsonify({'error': 'Invalid token'}), 401

    try:
        # Try to get from cache first
        cache_key = f"emails:{user.email}:page:{page}"
        cached_data = redis_client.get(cache_key)
        
        if cached_data:
            # Use cached data
            cache_data = json.loads(cached_data)
            logger.info(f"Using cached email data for page {page}")
            
            # Start background refresh if cache is older than 4 minutes
            cache_age = datetime.now().timestamp() - cache_data['timestamp']
            if cache_age > 240:  # 4 minutes
                Thread(target=background_cache_update, 
                      args=(user.email, os.getenv('EMAIL_PASSWORD'), page)).start()
            
            return jsonify({
                'emails': cache_data['emails'],
                'pagination': {
                    'total': cache_data['total_emails'],
                    'page': page,
                    'per_page': 20,
                    'has_more': cache_data['has_more']
                }
            })
        
        # If not in cache, fetch from IMAP
        logger.info(f"Cache miss, fetching page {page} from IMAP")
        imap = imaplib.IMAP4_SSL(os.getenv('IMAP_SERVER'))
        imap.login(user.email, os.getenv('EMAIL_PASSWORD'))
        imap.select('INBOX')
        
        start_idx = (page - 1) * 20
        emails, total_emails, has_more = fetch_email_page(imap, start_idx, 20)
        
        imap.close()
        imap.logout()
        
        # Store in cache
        cache_data = {
            'emails': emails,
            'total_emails': total_emails,
            'has_more': has_more,
            'page': page,
            'timestamp': datetime.now().timestamp()
        }
        redis_client.set(cache_key, json.dumps(cache_data), ex=CACHE_EXPIRATION)
        
        # Start background update for next page if there are more
        if has_more:
            Thread(target=background_cache_update, 
                  args=(user.email, os.getenv('EMAIL_PASSWORD'), page + 1)).start()
        
        return jsonify({
            'emails': emails,
            'pagination': {
                'total': total_emails,
                'page': page,
                'per_page': 20,
                'has_more': has_more
            }
        })

    except Exception as e:
        logger.error(f"Error fetching emails: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/send-email', methods=['POST'])
def send_email():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        logger.error("No authorization token provided")
        return jsonify({'error': 'No authorization token'}), 401

    # Extract token from Bearer format
    try:
        auth_token = auth_header.split('Bearer ')[1].strip()
    except (IndexError, AttributeError):
        logger.error(f"Invalid authorization header format: {auth_header}")
        return jsonify({'error': 'Invalid authorization format'}), 401

    user = User.query.filter_by(session_token=auth_token).first()
    if not user:
        logger.error("Invalid token")
        return jsonify({'error': 'Invalid token'}), 401

    data = request.get_json()
    to_email = data.get('to')
    subject = data.get('subject')
    body = data.get('body')

    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = user.email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Send email using SMTP
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(user.email, os.getenv('EMAIL_PASSWORD'))
        server.send_message(msg)
        server.quit()

        logger.info("Email sent successfully")
        return jsonify({'success': True})
    
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/email/<email_id>', methods=['GET'])
def get_email(email_id):
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return jsonify({'error': 'No authorization token'}), 401

    try:
        auth_token = auth_header.split('Bearer ')[1].strip()
    except (IndexError, AttributeError):
        return jsonify({'error': 'Invalid authorization format'}), 401

    user = User.query.filter_by(session_token=auth_token).first()
    if not user:
        return jsonify({'error': 'Invalid token'}), 401

    try:
        # Try to get from cache first
        cache_key = f"email_content:{user.email}:{email_id}"
        cached_data = redis_client.get(cache_key)
        
        if cached_data:
            return jsonify(json.loads(cached_data))
        
        # If not in cache, fetch from IMAP
        imap = imaplib.IMAP4_SSL(os.getenv('IMAP_SERVER'))
        imap.login(user.email, os.getenv('EMAIL_PASSWORD'))
        imap.select('INBOX')
        
        _, msg_data = imap.fetch(email_id.encode(), '(RFC822)')
        email_body = msg_data[0][1]
        email_message = email.message_from_bytes(email_body)
        
        # Get both plain text and HTML content
        content = get_email_content(email_message)
        
        response_data = {
            'id': email_id,
            'subject': decode_email_subject(email_message.get('Subject')),
            'sender': email_message.get('From', 'Unknown'),
            'to': email_message.get('To', ''),
            'date': email_message.get('Date', ''),
            'content': content
        }
        
        # Cache the result
        redis_client.set(cache_key, json.dumps(response_data), ex=CACHE_EXPIRATION)
        
        imap.close()
        imap.logout()
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error fetching email: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/email/<email_id>', methods=['PUT'])
def update_email(email_id):
    auth_token, error = get_auth_token(request.headers.get('Authorization'))
    if error:
        return jsonify({'error': error[0]}), error[1]

    user, error = get_authenticated_user(auth_token)
    if error:
        return jsonify({'error': error[0]}), error[1]

    try:
        data = request.get_json()
        
        # Create a new email message
        msg = MIMEMultipart()
        msg['From'] = user.email
        msg['To'] = data.get('to', '')
        msg['Subject'] = data.get('subject', '')
        msg['Cc'] = data.get('cc', '')
        msg['Bcc'] = data.get('bcc', '')
        
        # Attach the body
        msg.attach(MIMEText(data.get('body', ''), 'plain'))

        # Send the updated email
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(user.email, os.getenv('EMAIL_PASSWORD'))
            server.send_message(msg)

        return jsonify({'success': True, 'message': 'Email updated and sent'})

    except Exception as e:
        logger.error(f"Error updating email: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/refresh-cache', methods=['POST'])
def refresh_cache():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return jsonify({'error': 'No authorization token'}), 401

    try:
        auth_token = auth_header.split('Bearer ')[1].strip()
    except (IndexError, AttributeError):
        return jsonify({'error': 'Invalid authorization format'}), 401

    user = User.query.filter_by(session_token=auth_token).first()
    if not user:
        return jsonify({'error': 'Invalid token'}), 401

    try:
        # Clear all cache keys for this user
        pattern = f"emails:{user.email}:*"
        for key in redis_client.scan_iter(pattern):
            redis_client.delete(key)
        
        # Start background cache update for first page
        Thread(target=background_cache_update, 
              args=(user.email, os.getenv('EMAIL_PASSWORD'), 1)).start()
        
        return jsonify({'success': True, 'message': 'Cache refreshed successfully'})
        
    except Exception as e:
        logger.error(f"Error refreshing cache: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)