from flask import Blueprint, request, jsonify
from utils.auth_middleware import token_required
from database import db

bp = Blueprint('departments', __name__, url_prefix='/api/departments')

@bp.route('', methods=['GET'])
@token_required
def get_departments(current_user):
    try:
        query = db.table('departments').select('*')
        
        # Filter active departments
        if request.args.get('active_only') == 'true':
            query = query.eq('is_active', True)
        
        response = query.execute()
        
        return jsonify({'departments': response.data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<department_id>', methods=['GET'])
@token_required
def get_department(current_user, department_id):
    try:
        response = db.table('departments').select('*').eq('id', department_id).execute()
        
        if not response.data or len(response.data) == 0:
            return jsonify({'error': 'Department not found'}), 404
        
        return jsonify({'department': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
