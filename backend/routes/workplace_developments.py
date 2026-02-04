from flask import Blueprint, request, jsonify
from utils.auth_middleware import token_required, admin_required
from database import db

bp = Blueprint('workplace_developments', __name__, url_prefix='/api/workplace-developments')

@bp.route('', methods=['GET'])
@token_required
def get_workplace_developments(current_user):
    """Get all workplace developments with pagination and filters"""
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        offset = (page - 1) * limit
        
        # Build query for data
        query = db.table('workplace_developments').select('*')
        count_query = db.table('workplace_developments').select('id', count='exact')
        
        # Apply filters from query params
        filters = request.args
        
        # NOTE: Frontend sends array params as 'param[]', so we need to check both
        categories = filters.getlist('category') or filters.getlist('category[]')
        impact_labels = filters.getlist('impact_label') or filters.getlist('impact_label[]')
        time_horizons = filters.getlist('time_horizon') or filters.getlist('time_horizon[]')
        scopes = filters.getlist('scope') or filters.getlist('scope[]')
        training_efforts = filters.getlist('training_effort') or filters.getlist('training_effort[]')
        
        print(f"DEBUG WD: Fetching developments with filters:")
        print(f"  - trend_title: {filters.get('trend_title')}")
        print(f"  - impact_label: {impact_labels}")
        print(f"  - time_horizon: {time_horizons}")
        print(f"  - scope: {scopes}")
        print(f"  - training_effort: {training_efforts}")
        
        # Trend filter
        trend_title = filters.get('trend_title')
        if trend_title:
            query = query.eq('trend_title', trend_title)
            count_query = count_query.eq('trend_title', trend_title)
        
        # Category filter - handle multiple values
        if categories:
            if len(categories) == 1:
                query = query.eq('category', categories[0])
                count_query = count_query.eq('category', categories[0])
            else:
                query = query.in_('category', categories)
                count_query = count_query.in_('category', categories)
        
        # Time Horizon filter - handle multiple values
        if time_horizons:
            if len(time_horizons) == 1:
                query = query.eq('time_horizon', time_horizons[0])
                count_query = count_query.eq('time_horizon', time_horizons[0])
            else:
                query = query.in_('time_horizon', time_horizons)
                count_query = count_query.in_('time_horizon', time_horizons)
        
        # Scope filter - handle multiple values
        if scopes:
            if len(scopes) == 1:
                query = query.eq('scope', scopes[0])
                count_query = count_query.eq('scope', scopes[0])
            else:
                query = query.in_('scope', scopes)
                count_query = count_query.in_('scope', scopes)
        
        # Status filter - handle multiple values
        statuses = filters.getlist('status') or filters.getlist('status[]')
        if statuses:
            if len(statuses) == 1:
                query = query.eq('status', statuses[0])
                count_query = count_query.eq('status', statuses[0])
            else:
                query = query.in_('status', statuses)
                count_query = count_query.in_('status', statuses)
        
        # Impact Label filter - handle multiple values
        if impact_labels:
            if len(impact_labels) == 1:
                query = query.eq('impact_label', impact_labels[0])
                count_query = count_query.eq('impact_label', impact_labels[0])
            else:
                query = query.in_('impact_label', impact_labels)
                count_query = count_query.in_('impact_label', impact_labels)
        
        # Training Effort filter - handle multiple values
        if training_efforts:
            if len(training_efforts) == 1:
                query = query.eq('training_effort', training_efforts[0])
                count_query = count_query.eq('training_effort', training_efforts[0])
            else:
                query = query.in_('training_effort', training_efforts)
                count_query = count_query.in_('training_effort', training_efforts)
        
        # Apply pagination and ordering
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)
        
        # Execute queries
        count_response = count_query.execute()
        data_response = query.execute()
        
        total_count = count_response.count if hasattr(count_response, 'count') else len(data_response.data)
        developments = data_response.data
        
        print(f"DEBUG WD: Returning {len(developments)} developments")
        for dev in developments[:3]:  # Show first 3
            print(f"  - {dev.get('title', 'N/A')}: impact={dev.get('impact_label', 'N/A')}, horizon={dev.get('time_horizon', 'N/A')}")
        
        return jsonify({
            'workplace_developments': developments,
            'total': total_count,
            'page': page,
            'limit': limit,
            'total_pages': (total_count + limit - 1) // limit
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<development_id>', methods=['GET'])
@token_required
def get_workplace_development(current_user, development_id):
    """Get a single workplace development by ID with its skills"""
    try:
        # Get the workplace development
        response = db.table('workplace_developments').select('*').eq('id', development_id).execute()
        
        if not response.data or len(response.data) == 0:
            return jsonify({'error': 'Workplace development not found'}), 404
        
        development = response.data[0]
        
        # Get associated skills
        skills_response = db.table('skills').select('*').eq('workplace_development_title', development['title']).execute()
        development['skills'] = skills_response.data
        
        return jsonify({'workplace_development': development}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/by-trend/<trend_id>', methods=['GET'])
@token_required
def get_developments_by_trend(current_user, trend_id):
    """Get all workplace developments for a specific trend"""
    try:
        # First get the trend to get its title
        trend_response = db.table('trends').select('title').eq('id', trend_id).execute()
        if not trend_response.data:
            return jsonify({'error': 'Trend not found'}), 404
        
        trend_title = trend_response.data[0]['title']
        
        # Get workplace developments for this trend
        query = db.table('workplace_developments').select('*').eq('trend_title', trend_title)
        
        response = query.order('impact_score', desc=True).execute()
        
        return jsonify({'workplace_developments': response.data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
@token_required
@admin_required
def create_workplace_development(current_user):
    """Create a new workplace development (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['trend_title', 'title', 'description', 'workplace_example', 
                          'short_term_change', 'long_term_change', 'work_impact', 
                          'impact_score', 'impact_label', 'category', 'brainport_impact']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Create workplace development
        response = db.table('workplace_developments').insert(data).execute()
        
        return jsonify({'message': 'Workplace development created successfully', 
                       'workplace_development': response.data[0]}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<development_id>', methods=['PUT'])
@token_required
@admin_required
def update_workplace_development(current_user, development_id):
    """Update a workplace development (admin only)"""
    try:
        data = request.get_json()
        
        # Check if development exists
        existing = db.table('workplace_developments').select('id').eq('id', development_id).execute()
        if not existing.data:
            return jsonify({'error': 'Workplace development not found'}), 404
        
        # Update development
        response = db.table('workplace_developments').update(data).eq('id', development_id).execute()
        
        return jsonify({'message': 'Workplace development updated successfully', 
                       'workplace_development': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<development_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_workplace_development(current_user, development_id):
    """Delete a workplace development (admin only)"""
    try:
        # Check if development exists
        existing = db.table('workplace_developments').select('title').eq('id', development_id).execute()
        if not existing.data:
            return jsonify({'error': 'Workplace development not found'}), 404
        
        development_title = existing.data[0]['title']
        
        # Delete associated skills first (foreign key constraint)
        db.table('skills').delete().eq('workplace_development_title', development_title).execute()
        
        # Delete the development
        db.table('workplace_developments').delete().eq('id', development_id).execute()
        
        return jsonify({'message': 'Workplace development deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/bulk-status', methods=['PUT'])
@token_required
@admin_required
def bulk_update_status(current_user):
    """Bulk update status for multiple workplace developments (admin only)"""
    try:
        data = request.get_json()
        development_ids = data.get('development_ids', [])
        new_status = data.get('status')
        
        if not development_ids:
            return jsonify({'error': 'development_ids is required'}), 400
        
        if not new_status or new_status not in ['active', 'archived']:
            return jsonify({'error': 'Valid status is required (active or archived)'}), 400
        
        # Update all developments
        updated_count = 0
        for dev_id in development_ids:
            try:
                db.table('workplace_developments').update({
                    'status': new_status
                }).eq('id', dev_id).execute()
                updated_count += 1
            except Exception as e:
                print(f"Error updating development {dev_id}: {e}")
                continue
        
        return jsonify({
            'message': f'{updated_count} developments updated successfully',
            'updated_count': updated_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stats', methods=['GET'])
@token_required
def get_workplace_development_stats(current_user):
    """Get statistics for workplace developments"""
    try:
        # Build query based on user type
        query = db.table('workplace_developments').select('*')
        
        # Apply filters from query params (for filtered stats)
        filters = request.args
        
        # Category filter
        categories = filters.getlist('category')
        if categories:
            if len(categories) == 1:
                query = query.eq('category', categories[0])
            else:
                query = query.in_('category', categories)
        
        # Impact Label filter
        impact_labels = filters.getlist('impact_label')
        if impact_labels:
            if len(impact_labels) == 1:
                query = query.eq('impact_label', impact_labels[0])
            else:
                query = query.in_('impact_label', impact_labels)
        
        response = query.execute()
        developments = response.data
        
        # Calculate statistics
        stats = {
            'total_developments': len(developments),
            'by_category': {},
            'by_impact': {
                'Very High': 0,
                'High': 0,
                'Medium': 0,
                'Low': 0
            },
            'by_time_horizon': {
                'short_term': 0,
                'medium_term': 0,
                'long_term': 0
            },
            'by_training_effort': {
                'low': 0,
                'medium': 0,
                'high': 0
            }
        }
        
        # Process developments for statistics
        for dev in developments:
            # Count by category
            category = dev.get('category', 'Unknown')
            stats['by_category'][category] = stats['by_category'].get(category, 0) + 1
            
            # Count by impact
            impact_label = dev.get('impact_label', 'Medium')
            stats['by_impact'][impact_label] = stats['by_impact'].get(impact_label, 0) + 1
            
            # Count by time horizon
            time_horizon = dev.get('time_horizon', 'short_term')
            stats['by_time_horizon'][time_horizon] = stats['by_time_horizon'].get(time_horizon, 0) + 1
            
            # Count by training effort
            training_effort = dev.get('training_effort', 'medium')
            stats['by_training_effort'][training_effort] = stats['by_training_effort'].get(training_effort, 0) + 1
        
        return jsonify({'stats': stats}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
