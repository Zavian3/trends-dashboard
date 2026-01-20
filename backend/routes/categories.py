from flask import Blueprint, request, jsonify
from utils.auth_middleware import token_required
from database import db

bp = Blueprint('categories', __name__, url_prefix='/api/categories')

@bp.route('', methods=['GET'])
@token_required
def get_categories(current_user):
    try:
        query = db.table('categories').select('*')
        
        # Filter by department if provided
        if request.args.get('department'):
            query = query.eq('department', request.args.get('department'))
        
        response = query.execute()
        
        return jsonify({'categories': response.data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:category_id>', methods=['GET'])
@token_required
def get_category(current_user, category_id):
    try:
        response = db.table('categories').select('*').eq('id', category_id).execute()
        
        if not response.data or len(response.data) == 0:
            return jsonify({'error': 'Category not found'}), 404
        
        return jsonify({'category': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
