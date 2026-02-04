from flask import Blueprint, request, jsonify
from utils.auth_middleware import token_required, admin_required
from database import db
from datetime import datetime, timedelta

bp = Blueprint('trends', __name__, url_prefix='/api/trends')

@bp.route('', methods=['GET'])
@token_required
def get_trends(current_user):
    """Get all stable trends with pagination and filters"""
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 30))  # Default 30 as trends are stable
        offset = (page - 1) * limit
        
        # Build query for data
        query = db.table('trends').select('*')
        count_query = db.table('trends').select('id', count='exact')
        
        # Apply filters from query params
        filters = request.args
        
        # Department/Sector filter - handle multiple values
        # NOTE: Frontend sends array params as 'param[]', so we need to check both
        department_names = filters.getlist('department_name') or filters.getlist('department_name[]')
        if department_names:
            if len(department_names) == 1:
                query = query.eq('department_name', department_names[0])
                count_query = count_query.eq('department_name', department_names[0])
            else:
                query = query.in_('department_name', department_names)
                count_query = count_query.in_('department_name', department_names)
        
        # Status filter - handle multiple values
        statuses = filters.getlist('status') or filters.getlist('status[]')
        if statuses:
            if len(statuses) == 1:
                query = query.eq('status', statuses[0])
                count_query = count_query.eq('status', statuses[0])
            else:
                query = query.in_('status', statuses)
                count_query = count_query.in_('status', statuses)
        
        # Kernpunten filter
        kernpunten_id = filters.get('kernpunten_id')
        if kernpunten_id:
            query = query.eq('kernpunten_id', kernpunten_id)
            count_query = count_query.eq('kernpunten_id', kernpunten_id)
        
        # Workplace Development Filters - filter by properties of workplace_developments
        # If any WD filters are present, we need to find trends that have matching developments
        # NOTE: Frontend sends array params as 'param[]', so we need to check both
        wd_filters = {}
        
        # Try both 'category' and 'category[]'
        categories = filters.getlist('category') or filters.getlist('category[]')
        if categories:
            wd_filters['category'] = categories
        
        # Try both 'impact_label' and 'impact_label[]'
        impact_labels = filters.getlist('impact_label') or filters.getlist('impact_label[]')
        if impact_labels:
            wd_filters['impact_label'] = impact_labels
        
        # Try both 'time_horizon' and 'time_horizon[]'
        time_horizons = filters.getlist('time_horizon') or filters.getlist('time_horizon[]')
        if time_horizons:
            wd_filters['time_horizon'] = time_horizons
        
        # Try both 'scope' and 'scope[]'
        scopes = filters.getlist('scope') or filters.getlist('scope[]')
        if scopes:
            wd_filters['scope'] = scopes
        
        # Try both 'training_effort' and 'training_effort[]'
        training_efforts = filters.getlist('training_effort') or filters.getlist('training_effort[]')
        if training_efforts:
            wd_filters['training_effort'] = training_efforts
        
        print(f"DEBUG: WD Filters applied: {wd_filters}")
        
        if wd_filters:
            # Query workplace_developments with these filters
            wd_query = db.table('workplace_developments').select('trend_title')
            
            # Apply WD filters
            for field, values in wd_filters.items():
                if len(values) == 1:
                    wd_query = wd_query.eq(field, values[0])
                else:
                    wd_query = wd_query.in_(field, values)
            
            wd_response = wd_query.execute()
            
            # Get unique trend titles from matching developments
            matching_trend_titles = list(set([dev['trend_title'] for dev in wd_response.data if dev.get('trend_title')]))
            
            if not matching_trend_titles:
                # No matching developments found - return empty result
                return jsonify({
                    'trends': [],
                    'total': 0,
                    'page': page,
                    'limit': limit,
                    'total_pages': 0
                }), 200
            
            # Filter trends by matching titles
            if len(matching_trend_titles) == 1:
                query = query.eq('title', matching_trend_titles[0])
                count_query = count_query.eq('title', matching_trend_titles[0])
            else:
                query = query.in_('title', matching_trend_titles)
                count_query = count_query.in_('title', matching_trend_titles)
        
        # Apply pagination and ordering (by priority score)
        query = query.order('priority_score', desc=True).order('momentum_score', desc=True).range(offset, offset + limit - 1)
        
        # Execute queries
        count_response = count_query.execute()
        data_response = query.execute()
        
        total_count = count_response.count if hasattr(count_response, 'count') else len(data_response.data)
        trends = data_response.data
        
        # OPTIMIZED: Get all development counts in ONE query
        if trends:
            # Get all trend titles
            trend_titles = [t['title'] for t in trends]
            
            # Fetch all developments for these trends in a single query
            dev_query = db.table('workplace_developments').select('trend_title')
            
            # Apply WD filters to count query as well (if any)
            if wd_filters:
                for field, values in wd_filters.items():
                    if len(values) == 1:
                        dev_query = dev_query.eq(field, values[0])
                    else:
                        dev_query = dev_query.in_(field, values)
            
            # Filter by trend titles
            if len(trend_titles) == 1:
                dev_query = dev_query.eq('trend_title', trend_titles[0])
            else:
                dev_query = dev_query.in_('trend_title', trend_titles)
            
            dev_response = dev_query.execute()
            
            # Count occurrences in Python
            dev_counts = {}
            for dev in dev_response.data:
                title = dev.get('trend_title')
                if title:
                    dev_counts[title] = dev_counts.get(title, 0) + 1
            
            # Fetch recent developments (last 2 weeks) for these trends in a single query
            two_weeks_ago = (datetime.utcnow() - timedelta(weeks=2)).isoformat()
            
            recent_dev_query = db.table('workplace_developments').select('trend_title, created_at')
            
            # Apply same WD filters
            if wd_filters:
                for field, values in wd_filters.items():
                    if len(values) == 1:
                        recent_dev_query = recent_dev_query.eq(field, values[0])
                    else:
                        recent_dev_query = recent_dev_query.in_(field, values)
            
            # Filter by trend titles and date
            if len(trend_titles) == 1:
                recent_dev_query = recent_dev_query.eq('trend_title', trend_titles[0])
            else:
                recent_dev_query = recent_dev_query.in_('trend_title', trend_titles)
            
            recent_dev_query = recent_dev_query.gte('created_at', two_weeks_ago)
            recent_dev_response = recent_dev_query.execute()
            
            # Count recent developments per trend
            recent_dev_counts = {}
            for dev in recent_dev_response.data:
                title = dev.get('trend_title')
                if title:
                    recent_dev_counts[title] = recent_dev_counts.get(title, 0) + 1
            
            # Add counts to trends
            for trend in trends:
                trend['workplace_development_count'] = dev_counts.get(trend['title'], 0)
                trend['recent_additions_count'] = recent_dev_counts.get(trend['title'], 0)
            
            # Filter out trends with zero workplace developments
            trends = [t for t in trends if t['workplace_development_count'] > 0]
            
            # Update total count to reflect filtered trends
            total_count = len(trends)
            
            print(f"DEBUG: Returning {len(trends)} trends with filtered dev counts")
            for trend in trends[:3]:  # Show first 3 trends
                print(f"  - {trend['title']}: {trend['workplace_development_count']} filtered developments")
        
        return jsonify({
            'trends': trends,
            'total': total_count,
            'page': page,
            'limit': limit,
            'total_pages': (total_count + limit - 1) // limit
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<trend_id>', methods=['GET'])
@token_required
def get_trend(current_user, trend_id):
    """Get a single trend by ID"""
    try:
        response = db.table('trends').select('*').eq('id', trend_id).execute()
        
        if not response.data or len(response.data) == 0:
            return jsonify({'error': 'Trend not found'}), 404
        
        trend = response.data[0]
        
        return jsonify({'trend': trend}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<trend_id>/workplace-developments', methods=['GET'])
@token_required
def get_trend_workplace_developments(current_user, trend_id):
    """Get all workplace developments for a specific trend"""
    try:
        # First get the trend to get its title
        trend_response = db.table('trends').select('title, status').eq('id', trend_id).execute()
        if not trend_response.data:
            return jsonify({'error': 'Trend not found'}), 404
        
        trend = trend_response.data[0]
        
        trend_title = trend['title']
        
        # Get workplace developments for this trend
        query = db.table('workplace_developments').select('*').eq('trend_title', trend_title)
        
        response = query.order('impact_score', desc=True).execute()
        
        return jsonify({'workplace_developments': response.data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<trend_id>/stats', methods=['GET'])
@token_required
def get_trend_stats(current_user, trend_id):
    """Get statistics for a specific trend (e.g., number of developments, skills)"""
    try:
        # Get the trend
        trend_response = db.table('trends').select('*').eq('id', trend_id).execute()
        if not trend_response.data:
            return jsonify({'error': 'Trend not found'}), 404
        
        trend = trend_response.data[0]
        trend_title = trend['title']
        
        # Get workplace developments count
        dev_query = db.table('workplace_developments').select('*').eq('trend_title', trend_title)
        dev_response = dev_query.execute()
        developments = dev_response.data
        
        # Calculate stats
        stats = {
            'trend_id': trend_id,
            'trend_title': trend_title,
            'total_developments': len(developments),
            'by_impact': {'Very High': 0, 'High': 0, 'Medium': 0, 'Low': 0},
            'by_time_horizon': {'short_term': 0, 'medium_term': 0, 'long_term': 0},
            'by_category': {},
            'average_impact_score': 0
        }
        
        total_impact = 0
        for dev in developments:
            # Count by impact
            impact_label = dev.get('impact_label', 'Medium')
            stats['by_impact'][impact_label] = stats['by_impact'].get(impact_label, 0) + 1
            
            # Count by time horizon
            time_horizon = dev.get('time_horizon', 'short_term')
            stats['by_time_horizon'][time_horizon] = stats['by_time_horizon'].get(time_horizon, 0) + 1
            
            # Count by category
            category = dev.get('category', 'Unknown')
            stats['by_category'][category] = stats['by_category'].get(category, 0) + 1
            
            # Sum impact scores
            total_impact += dev.get('impact_score', 0)
        
        if len(developments) > 0:
            stats['average_impact_score'] = round(total_impact / len(developments), 2)
        
        return jsonify({'stats': stats}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
@token_required
@admin_required
def create_trend(current_user):
    """Create a new stable trend (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['kernpunten_id', 'department_name', 'title']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Verify kernpunten exists
        kernpunten_response = db.table('kernpunten').select('id').eq('id', data['kernpunten_id']).execute()
        if not kernpunten_response.data:
            return jsonify({'error': 'Kernpunten not found'}), 404
        
        # Set defaults
        if 'status' not in data:
            data['status'] = 'draft'
        
        # Create trend
        response = db.table('trends').insert(data).execute()
        
        return jsonify({'message': 'Trend created successfully', 'trend': response.data[0]}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<trend_id>', methods=['PUT'])
@token_required
@admin_required
def update_trend(current_user, trend_id):
    """Update a trend (admin only)"""
    try:
        data = request.get_json()
        
        # Check if trend exists
        existing = db.table('trends').select('id').eq('id', trend_id).execute()
        if not existing.data:
            return jsonify({'error': 'Trend not found'}), 404
        
        # Update trend
        response = db.table('trends').update(data).eq('id', trend_id).execute()
        
        return jsonify({'message': 'Trend updated successfully', 'trend': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<trend_id>/activate', methods={'PUT'})
@token_required
@admin_required
def activate_trend(current_user, trend_id):
    """Activate a trend (admin only)"""
    try:
        # Check if trend exists
        existing = db.table('trends').select('id').eq('id', trend_id).execute()
        if not existing.data:
            return jsonify({'error': 'Trend not found'}), 404
        
        # Update status to active
        response = db.table('trends').update({
            'status': 'active',
            'reviewed_by': current_user['id'],
            'reviewed_at': 'now()'
        }).eq('id', trend_id).execute()
        
        return jsonify({'message': 'Trend activated successfully', 'trend': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<trend_id>/archive', methods=['PUT'])
@token_required
@admin_required
def archive_trend(current_user, trend_id):
    """Archive a trend (admin only)"""
    try:
        # Check if trend exists
        existing = db.table('trends').select('id').eq('id', trend_id).execute()
        if not existing.data:
            return jsonify({'error': 'Trend not found'}), 404
        
        # Update status to archived
        response = db.table('trends').update({
            'status': 'archived',
            'reviewed_by': current_user['id'],
            'reviewed_at': 'now()'
        }).eq('id', trend_id).execute()
        
        return jsonify({'message': 'Trend archived successfully', 'trend': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<trend_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_trend(current_user, trend_id):
    """Delete a trend and all associated workplace developments (admin only)"""
    try:
        # Check if trend exists
        trend_response = db.table('trends').select('title').eq('id', trend_id).execute()
        if not trend_response.data:
            return jsonify({'error': 'Trend not found'}), 404
        
        trend_title = trend_response.data[0]['title']
        
        # Get all workplace developments for this trend
        dev_response = db.table('workplace_developments').select('title').eq('trend_title', trend_title).execute()
        
        # Delete skills for each workplace development
        for dev in dev_response.data:
            db.table('skills').delete().eq('workplace_development_title', dev['title']).execute()
        
        # Delete all workplace developments for this trend
        db.table('workplace_developments').delete().eq('trend_title', trend_title).execute()
        
        # Delete the trend
        db.table('trends').delete().eq('id', trend_id).execute()
        
        return jsonify({'message': 'Trend and all associated data deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stats', methods=['GET'])
@token_required
def get_trends_stats(current_user):
    """Get overall statistics for all trends"""
    try:
        # Build query based on user type
        query = db.table('trends').select('*')
        
        # Apply filters from query params
        filters = request.args
        
        # Department/Sector filter
        department_names = filters.getlist('department_name')
        if department_names:
            if len(department_names) == 1:
                query = query.eq('department_name', department_names[0])
            else:
                query = query.in_('department_name', department_names)
        
        response = query.execute()
        trends = response.data
        
        # Calculate statistics
        stats = {
            'total_trends': len(trends),
            'by_department': {},
            'by_status': {
                'draft': 0,
                'active': 0,
                'archived': 0
            },
            'average_priority_score': 0,
            'average_momentum_score': 0
        }
        
        total_priority = 0
        total_momentum = 0
        
        # Process trends for statistics
        for trend in trends:
            # Count by department
            department = trend.get('department_name', 'Unknown')
            stats['by_department'][department] = stats['by_department'].get(department, 0) + 1
            
            # Count by status
            status = trend.get('status', 'draft')
            stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
            
            # Sum scores
            total_priority += trend.get('priority_score', 0) or 0
            total_momentum += trend.get('momentum_score', 0) or 0
        
        if len(trends) > 0:
            stats['average_priority_score'] = round(total_priority / len(trends), 2)
            stats['average_momentum_score'] = round(total_momentum / len(trends), 2)
        
        return jsonify({'stats': stats}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
