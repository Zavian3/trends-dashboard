from flask import Blueprint, request, jsonify
from utils.auth_middleware import token_required
from database import db

bp = Blueprint('subcategories', __name__, url_prefix='/api/subcategories')

@bp.route('', methods=['GET'])
@token_required
def get_subcategories(current_user):
    try:
        query = db.table('sub_categories').select('*')
        
        # Filter by category if provided
        if request.args.get('category_name'):
            query = query.eq('category_name', request.args.get('category_name'))
        
        response = query.execute()
        
        return jsonify({'subcategories': response.data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:subcategory_id>', methods=['GET'])
@token_required
def get_subcategory(current_user, subcategory_id):
    try:
        response = db.table('sub_categories').select('*').eq('id', subcategory_id).execute()
        
        if not response.data or len(response.data) == 0:
            return jsonify({'error': 'Subcategory not found'}), 404
        
        return jsonify({'subcategory': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
