from flask import Blueprint, request, jsonify
from utils.auth_middleware import token_required, admin_required
from database import db

bp = Blueprint('skills', __name__, url_prefix='/api/skills')

@bp.route('', methods=['GET'])
@token_required
def get_skills(current_user):
    """Get all skills with optional filters"""
    try:
        query = db.table('skills').select('*')
        
        # Filter by workplace development title
        workplace_development_title = request.args.get('workplace_development_title')
        if workplace_development_title:
            query = query.eq('workplace_development_title', workplace_development_title)
        
        # Filter by skill type
        skill_types = request.args.getlist('skill_type')
        if skill_types:
            if len(skill_types) == 1:
                query = query.eq('skill_type', skill_types[0])
            else:
                query = query.in_('skill_type', skill_types)
        
        response = query.order('created_at', desc=True).execute()
        
        return jsonify({'skills': response.data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/unique', methods=['GET'])
@token_required
def get_unique_skills(current_user):
    """Get unique skill names with their counts and types (for skill library)"""
    try:
        # Get all skills
        response = db.table('skills').select('skill_name, skill_type').execute()
        skills = response.data
        
        # Build unique skills library
        skill_library = {}
        for skill in skills:
            skill_name = skill['skill_name']
            skill_type = skill['skill_type']
            
            if skill_name not in skill_library:
                skill_library[skill_name] = {
                    'name': skill_name,
                    'type': skill_type,
                    'count': 0
                }
            skill_library[skill_name]['count'] += 1
        
        # Convert to list and sort by count (descending)
        unique_skills = list(skill_library.values())
        unique_skills.sort(key=lambda x: x['count'], reverse=True)
        
        # Filter by skill type if requested
        skill_types = request.args.getlist('skill_type')
        if skill_types:
            unique_skills = [s for s in unique_skills if s['type'] in skill_types]
        
        return jsonify({
            'unique_skills': unique_skills,
            'total': len(unique_skills)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<skill_id>', methods=['GET'])
@token_required
def get_skill(current_user, skill_id):
    """Get a single skill by ID"""
    try:
        response = db.table('skills').select('*').eq('id', skill_id).execute()
        
        if not response.data or len(response.data) == 0:
            return jsonify({'error': 'Skill not found'}), 404
        
        return jsonify({'skill': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
@token_required
@admin_required
def create_skill(current_user):
    """Create a new skill (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['workplace_development_title', 'skill_name', 'skill_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Verify workplace development exists
        dev_response = db.table('workplace_developments').select('title').eq('title', data['workplace_development_title']).execute()
        if not dev_response.data:
            return jsonify({'error': 'Workplace development not found'}), 404
        
        # Create skill
        response = db.table('skills').insert(data).execute()
        
        return jsonify({'message': 'Skill created successfully', 'skill': response.data[0]}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/bulk', methods=['POST'])
@token_required
@admin_required
def create_skills_bulk(current_user):
    """Create multiple skills at once (admin only)"""
    try:
        data = request.get_json()
        skills = data.get('skills', [])
        
        if not skills or not isinstance(skills, list):
            return jsonify({'error': 'skills array is required'}), 400
        
        # Create skills
        response = db.table('skills').insert(skills).execute()
        
        return jsonify({'message': f'{len(response.data)} skills created successfully', 
                       'skills': response.data}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<skill_id>', methods=['PUT'])
@token_required
@admin_required
def update_skill(current_user, skill_id):
    """Update a skill (admin only)"""
    try:
        data = request.get_json()
        
        # Check if skill exists
        existing = db.table('skills').select('id').eq('id', skill_id).execute()
        if not existing.data:
            return jsonify({'error': 'Skill not found'}), 404
        
        # Update skill
        response = db.table('skills').update(data).eq('id', skill_id).execute()
        
        return jsonify({'message': 'Skill updated successfully', 'skill': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<skill_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_skill(current_user, skill_id):
    """Delete a skill (admin only)"""
    try:
        # Check if skill exists
        existing = db.table('skills').select('id').eq('id', skill_id).execute()
        if not existing.data:
            return jsonify({'error': 'Skill not found'}), 404
        
        # Delete skill
        db.table('skills').delete().eq('id', skill_id).execute()
        
        return jsonify({'message': 'Skill deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stats', methods=['GET'])
@token_required
def get_skill_stats(current_user):
    """Get statistics for skills"""
    try:
        # Get all skills
        response = db.table('skills').select('*').execute()
        skills = response.data
        
        # Calculate statistics
        stats = {
            'total_skills': len(skills),
            'by_type': {
                'hard_skill': 0,
                'soft_skill': 0,
                'digital_skill': 0,
                'tool': 0,
                'compliance': 0,
                'safety': 0
            },
            'unique_skill_count': 0,
            'most_common_skills': []
        }
        
        # Count by type and build skill frequency
        skill_frequency = {}
        for skill in skills:
            skill_type = skill.get('skill_type', 'hard_skill')
            stats['by_type'][skill_type] = stats['by_type'].get(skill_type, 0) + 1
            
            skill_name = skill.get('skill_name', '')
            skill_frequency[skill_name] = skill_frequency.get(skill_name, 0) + 1
        
        # Get unique skill count
        stats['unique_skill_count'] = len(skill_frequency)
        
        # Get most common skills (top 10)
        sorted_skills = sorted(skill_frequency.items(), key=lambda x: x[1], reverse=True)[:10]
        stats['most_common_skills'] = [{'name': name, 'count': count} for name, count in sorted_skills]
        
        return jsonify({'stats': stats}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
