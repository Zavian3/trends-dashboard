from flask import Blueprint, request, jsonify
import bcrypt
import jwt
from datetime import datetime, timedelta
from config import Config
from database import db

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        print(f"DEBUG: Login attempt for email: {email}")
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Get user from database
        response = db.table('users').select('*').eq('email', email).execute()
        
        print(f"DEBUG: Database response: {response.data}")
        
        if not response.data or len(response.data) == 0:
            print("DEBUG: User not found in database")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        user = response.data[0]
        print(f"DEBUG: User found: {user.get('email')}, is_active: {user.get('is_active')}")
        
        # Check if user is active (default to True if not set)
        if user.get('is_active') is False:
            print("DEBUG: User account is inactive")
            return jsonify({'error': 'Account is inactive'}), 401
        
        # Verify password
        print(f"DEBUG: Verifying password...")
        password_match = bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8'))
        print(f"DEBUG: Password match: {password_match}")
        
        if not password_match:
            print("DEBUG: Password verification failed")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': user['id'],
            'user_type': user['user_type'],
            'exp': datetime.utcnow() + timedelta(hours=Config.JWT_EXPIRATION_HOURS)
        }, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)
        
        return jsonify({
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'user_type': user['user_type']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/verify', methods=['GET'])
def verify_token():
    try:
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
        user_id = data['user_id']
        
        # Get user from database
        response = db.table('users').select('*').eq('id', user_id).execute()
        
        if not response.data or len(response.data) == 0:
            return jsonify({'error': 'User not found'}), 401
        
        user = response.data[0]
        
        return jsonify({
            'user': {
                'id': user['id'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'user_type': user['user_type']
            }
        }), 200
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500
