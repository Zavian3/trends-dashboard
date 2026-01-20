from flask import Blueprint, request, jsonify
from utils.auth_middleware import token_required, admin_required
from database import db

bp = Blueprint('trends', __name__, url_prefix='/api/trends')

@bp.route('/debug', methods=['GET'])
def debug_trends():
    """Debug endpoint to check trend IDs and structure"""
    try:
        response = db.table('trends').select('id, title, status').limit(5).execute()
        return jsonify({
            'count': len(response.data),
            'trends': response.data,
            'sample_id_type': type(response.data[0]['id']).__name__ if response.data else 'N/A'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['GET'])
@token_required
def get_trends(current_user):
    try:
        # Build query
        query = db.table('trends').select('*')
        
        # Non-admin users can only see confirmed trends
        if current_user['user_type'] != 'admin':
            query = query.eq('status', 'confirmed')
        
        # Apply filters from query params
        filters = request.args
        
        if filters.get('department_name'):
            query = query.eq('department_name', filters.get('department_name'))
        
        if filters.get('category'):
            query = query.eq('category', filters.get('category'))
        
        if filters.get('sub_category'):
            query = query.contains('sub_category', [filters.get('sub_category')])
        
        if filters.get('time_horizon'):
            query = query.eq('time_horizon', filters.get('time_horizon'))
        
        if filters.get('scope'):
            query = query.eq('scope', filters.get('scope'))
        
        if filters.get('status'):
            query = query.eq('status', filters.get('status'))
        
        # Execute query
        response = query.execute()
        
        # Filter description based on user type
        trends = []
        for trend in response.data:
            filtered_trend = trend.copy()
            
            # Select appropriate description based on user type
            if current_user['user_type'] == 'admin':
                # Admin sees all descriptions
                filtered_trend['descriptions'] = {
                    'internal_teacher': trend.get('internal_teacher_description'),
                    'internal_business': trend.get('internal_business_description'),
                    'external': trend.get('external_user_description')
                }
            elif current_user['user_type'] == 'internal_teacher':
                filtered_trend['description'] = trend.get('internal_teacher_description')
            elif current_user['user_type'] == 'internal_business':
                filtered_trend['description'] = trend.get('internal_business_description')
            elif current_user['user_type'] == 'external':
                filtered_trend['description'] = trend.get('external_user_description')
            
            # Remove individual description fields
            if current_user['user_type'] != 'admin':
                filtered_trend.pop('internal_teacher_description', None)
                filtered_trend.pop('internal_business_description', None)
                filtered_trend.pop('external_user_description', None)
            
            trends.append(filtered_trend)
        
        return jsonify({'trends': trends}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<trend_id>', methods=['GET'])
@token_required
def get_trend(current_user, trend_id):
    try:
        response = db.table('trends').select('*').eq('id', trend_id).execute()
        
        if not response.data or len(response.data) == 0:
            return jsonify({'error': 'Trend not found'}), 404
        
        trend = response.data[0]
        
        # Check if user can access this trend
        if current_user['user_type'] != 'admin' and trend['status'] != 'confirmed':
            return jsonify({'error': 'Trend not found'}), 404
        
        # Filter description based on user type
        filtered_trend = trend.copy()
        
        if current_user['user_type'] == 'admin':
            filtered_trend['descriptions'] = {
                'internal_teacher': trend.get('internal_teacher_description'),
                'internal_business': trend.get('internal_business_description'),
                'external_user': trend.get('external_user_description')
            }
        elif current_user['user_type'] == 'internal_teacher':
            filtered_trend['description'] = trend.get('internal_teacher_description')
        elif current_user['user_type'] == 'internal_business':
            filtered_trend['description'] = trend.get('internal_business_description')
        elif current_user['user_type'] == 'external_user':
            filtered_trend['description'] = trend.get('external_user_description')
        
        # Remove individual description fields for non-admin
        if current_user['user_type'] != 'admin':
            filtered_trend.pop('internal_teacher_description', None)
            filtered_trend.pop('internal_business_description', None)
            filtered_trend.pop('external_user_description', None)
        
        return jsonify({'trend': filtered_trend}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<trend_id>/approve', methods=['PUT'])
@token_required
@admin_required
def approve_trend(current_user, trend_id):
    try:
        # Check if trend exists
        existing = db.table('trends').select('id').eq('id', trend_id).execute()
        if not existing.data or len(existing.data) == 0:
            return jsonify({'error': 'Trend not found'}), 404
        
        # Update status to confirmed
        response = db.table('trends').update({
            'status': 'confirmed',
            'reviewed_by': current_user['id'],
            'reviewed_at': 'now()'
        }).eq('id', trend_id).execute()
        
        return jsonify({'message': 'Trend approved successfully', 'trend': response.data[0]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<trend_id>/disapprove', methods=['DELETE'])
@token_required
@admin_required
def disapprove_trend(current_user, trend_id):
    try:
        # Check if trend exists
        existing = db.table('trends').select('id').eq('id', trend_id).execute()
        if not existing.data or len(existing.data) == 0:
            return jsonify({'error': 'Trend not found'}), 404
        
        # Delete the trend
        db.table('trends').delete().eq('id', trend_id).execute()
        
        return jsonify({'message': 'Trend disapproved and deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/bulk-approve', methods=['PUT'])
@token_required
@admin_required
def bulk_approve_trends(current_user):
    try:
        data = request.get_json()
        trend_ids = data.get('trend_ids', [])
        
        print(f"DEBUG: Bulk approve - received trend_ids: {trend_ids}")
        print(f"DEBUG: Type of first ID: {type(trend_ids[0]) if trend_ids else 'N/A'}")
        
        if not trend_ids:
            return jsonify({'error': 'trend_ids is required'}), 400
        
        # Update all trends to confirmed
        approved_count = 0
        for trend_id in trend_ids:
            try:
                # Convert to int if it's a string number
                if isinstance(trend_id, str) and trend_id.isdigit():
                    trend_id = int(trend_id)
                
                result = db.table('trends').update({
                    'status': 'confirmed',
                    'reviewed_by': current_user['id'],
                    'reviewed_at': 'now()'
                }).eq('id', trend_id).execute()
                
                print(f"DEBUG: Approved trend {trend_id}, result: {result.data}")
                approved_count += 1
            except Exception as e:
                print(f"DEBUG: Error approving trend {trend_id}: {str(e)}")
                # Continue with other trends even if one fails
                continue
        
        return jsonify({'message': f'{approved_count} trends approved successfully'}), 200
        
    except Exception as e:
        print(f"DEBUG: Bulk approve error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/bulk-disapprove', methods=['DELETE'])
@token_required
@admin_required
def bulk_disapprove_trends(current_user):
    try:
        data = request.get_json()
        trend_ids = data.get('trend_ids', [])
        
        if not trend_ids:
            return jsonify({'error': 'trend_ids is required'}), 400
        
        # Delete all trends
        for trend_id in trend_ids:
            db.table('trends').delete().eq('id', trend_id).execute()
        
        return jsonify({'message': f'{len(trend_ids)} trends disapproved and deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stats', methods=['GET'])
@token_required
def get_trend_stats(current_user):
    try:
        # Build query based on user type
        query = db.table('trends').select('*')
        if current_user['user_type'] != 'admin':
            query = query.eq('status', 'confirmed')
        
        # Apply filters from query params
        filters = request.args
        
        if filters.get('department_name'):
            query = query.eq('department_name', filters.get('department_name'))
        
        if filters.get('category'):
            query = query.eq('category', filters.get('category'))
        
        if filters.get('sub_category'):
            query = query.contains('sub_category', [filters.get('sub_category')])
        
        response = query.execute()
        trends = response.data
        
        # Calculate statistics
        stats = {
            'total_trends': len(trends),
            'by_category': {},
            'by_department': {},
            'by_impact': {
                'high': 0,
                'medium': 0,
                'low': 0
            },
            'top_growing': [],
            'highest_impact': []
        }
        
        # Process trends for statistics
        for trend in trends:
            # Count by category
            category = trend.get('category', 'Unknown')
            stats['by_category'][category] = stats['by_category'].get(category, 0) + 1
            
            # Count by department
            department = trend.get('department_name', 'Unknown')
            stats['by_department'][department] = stats['by_department'].get(department, 0) + 1
            
            # Count by impact
            impact_score = trend.get('impact_score', 0)
            if impact_score >= 7:
                stats['by_impact']['high'] += 1
            elif impact_score >= 4:
                stats['by_impact']['medium'] += 1
            else:
                stats['by_impact']['low'] += 1
        
        # Get highest impact trends (top 5)
        sorted_by_impact = sorted(trends, key=lambda x: x.get('impact_score', 0), reverse=True)[:5]
        stats['highest_impact'] = [
            {
                'id': t['id'],
                'title': t['title'],
                'impact_score': t.get('impact_score', 0),
                'category': t.get('category')
            }
            for t in sorted_by_impact
        ]
        
        return jsonify({'stats': stats}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
