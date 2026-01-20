from flask import Blueprint, request, jsonify
import bcrypt
from utils.auth_middleware import token_required, admin_required
from database import db

bp = Blueprint('users', __name__, url_prefix='/api/users')

@bp.route('', methods=['GET'])
@token_required
@admin_required
def get_users(current_user):
    try:
        response = db.table('users').select('id, email, first_name, last_name, user_type, gender, date_of_birth, is_active, created_at').execute()
        
        return jsonify({'users': response.data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
@token_required
@admin_required
def create_user(current_user):
    try:
        data = request.get_json()
        
        # Required fields
        required_fields = ['email', 'password', 'first_name', 'last_name', 'user_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate user_type
        valid_user_types = ['admin', 'internal_teacher', 'internal_business', 'external']
        if data['user_type'] not in valid_user_types:
            return jsonify({'error': f'user_type must be one of: {", ".join(valid_user_types)}'}), 400
        
        # Check if email already exists
        existing = db.table('users').select('id').eq('email', data['email']).execute()
        if existing.data and len(existing.data) > 0:
            return jsonify({'error': 'Email already exists'}), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Prepare user data
        user_data = {
            'email': data['email'],
            'password': hashed_password,
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'user_type': data['user_type'],
            'gender': data.get('gender'),
            'date_of_birth': data.get('date_of_birth'),
            'is_active': data.get('is_active', True)
        }
        
        # Insert user
        response = db.table('users').insert(user_data).execute()
        
        return jsonify({'message': 'User created successfully', 'user': response.data[0]}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:user_id>', methods=['PUT'])
@token_required
@admin_required
def update_user(current_user, user_id):
    try:
        data = request.get_json()
        
        # Check if user exists
        existing = db.table('users').select('id').eq('id', user_id).execute()
        if not existing.data or len(existing.data) == 0:
            return jsonify({'error': 'User not found'}), 404
        
        # Prepare update data
        update_data = {}
        
        if 'email' in data:
            update_data['email'] = data['email']
        if 'first_name' in data:
            update_data['first_name'] = data['first_name']
        if 'last_name' in data:
            update_data['last_name'] = data['last_name']
        if 'user_type' in data:
            valid_user_types = ['admin', 'internal_teacher', 'internal_business', 'external']
            if data['user_type'] not in valid_user_types:
                return jsonify({'error': f'user_type must be one of: {", ".join(valid_user_types)}'}), 400
            update_data['user_type'] = data['user_type']
        if 'gender' in data:
            update_data['gender'] = data['gender']
        if 'date_of_birth' in data:
            update_data['date_of_birth'] = data['date_of_birth']
        if 'is_active' in data:
            update_data['is_active'] = data['is_active']
        if 'password' in data:
            hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            update_data['password'] = hashed_password
        
        # Update user
        response = db.table('users').update(update_data).eq('id', user_id).execute()
        
        return jsonify({'message': 'User updated successfully', 'user': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(current_user, user_id):
    try:
        # Check if user exists
        existing = db.table('users').select('id').eq('id', user_id).execute()
        if not existing.data or len(existing.data) == 0:
            return jsonify({'error': 'User not found'}), 404
        
        # Delete user
        db.table('users').delete().eq('id', user_id).execute()
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
