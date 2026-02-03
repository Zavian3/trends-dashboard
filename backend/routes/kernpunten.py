from flask import Blueprint, request, jsonify
from utils.auth_middleware import token_required, admin_required
from database import db

bp = Blueprint('kernpunten', __name__, url_prefix='/api/kernpunten')

@bp.route('', methods=['GET'])
@token_required
def get_kernpunten(current_user):
    """Get all kernpunten (keypoints)"""
    try:
        query = db.table('kernpunten').select('*')
        
        # Filter by department if provided
        department_name = request.args.get('department_name')
        if department_name:
            query = query.eq('department_name', department_name)
        
        # Filter by department_id if provided
        department_id = request.args.get('department_id')
        if department_id:
            query = query.eq('department_id', department_id)
        
        # Filter by trends_created status
        trends_created = request.args.get('trends_created')
        if trends_created is not None:
            query = query.eq('trends_created', trends_created == 'true')
        
        response = query.order('created_at', desc=True).execute()
        
        return jsonify({'kernpunten': response.data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<kernpunten_id>', methods=['GET'])
@token_required
def get_kernpunt(current_user, kernpunten_id):
    """Get a single kernpunt by ID"""
    try:
        response = db.table('kernpunten').select('*').eq('id', kernpunten_id).execute()
        
        if not response.data or len(response.data) == 0:
            return jsonify({'error': 'Kernpunt not found'}), 404
        
        return jsonify({'kernpunt': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<kernpunten_id>/trends', methods=['GET'])
@token_required
def get_kernpunt_trends(current_user, kernpunten_id):
    """Get all trends associated with a kernpunt"""
    try:
        # First verify kernpunt exists
        kernpunt_response = db.table('kernpunten').select('id').eq('id', kernpunten_id).execute()
        if not kernpunt_response.data:
            return jsonify({'error': 'Kernpunt not found'}), 404
        
        # Get trends for this kernpunt
        query = db.table('trends').select('*').eq('kernpunten_id', kernpunten_id)
        
        # Non-admin users can only see active trends
        if current_user['user_type'] != 'admin':
            query = query.eq('status', 'active')
        
        response = query.order('priority_score', desc=True).execute()
        
        return jsonify({'trends': response.data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
@token_required
@admin_required
def create_kernpunt(current_user):
    """Create a new kernpunt (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['department_id', 'keypoints']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Create kernpunt
        response = db.table('kernpunten').insert(data).execute()
        
        return jsonify({'message': 'Kernpunt created successfully', 'kernpunt': response.data[0]}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<kernpunten_id>', methods=['PUT'])
@token_required
@admin_required
def update_kernpunt(current_user, kernpunten_id):
    """Update a kernpunt (admin only)"""
    try:
        data = request.get_json()
        
        # Check if kernpunt exists
        existing = db.table('kernpunten').select('id').eq('id', kernpunten_id).execute()
        if not existing.data:
            return jsonify({'error': 'Kernpunt not found'}), 404
        
        # Update kernpunt
        response = db.table('kernpunten').update(data).eq('id', kernpunten_id).execute()
        
        return jsonify({'message': 'Kernpunt updated successfully', 'kernpunt': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<kernpunten_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_kernpunt(current_user, kernpunten_id):
    """Delete a kernpunt (admin only)"""
    try:
        # Check if kernpunt exists
        existing = db.table('kernpunten').select('id').eq('id', kernpunten_id).execute()
        if not existing.data:
            return jsonify({'error': 'Kernpunt not found'}), 404
        
        # Delete kernpunt
        db.table('kernpunten').delete().eq('id', kernpunten_id).execute()
        
        return jsonify({'message': 'Kernpunt deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
