from flask import Blueprint, request, jsonify
from utils.auth_middleware import token_required
from database import db

bp = Blueprint('cards', __name__, url_prefix='/api/cards')

@bp.route('/top-trends', methods=['GET'])
@token_required
def get_top_trends(current_user):
    """
    Get top trends based on coverage, source volume, and admin weight.
    Returns top 5 by default, or top 15 if 'expanded=true' is passed.
    
    Formula: top_trend_score = (coverage_count × priority_score) + admin_weight
    """
    try:
        # Get limit from query params (5 or 15)
        expanded = request.args.get('expanded', 'false').lower() == 'true'
        limit = 15 if expanded else 5
        
        # Build query
        query = db.table('trends').select('*')
        
        # Apply department filter if provided
        # NOTE: Frontend sends array params as 'param[]', so we need to check both
        department_names = request.args.getlist('department_name') or request.args.getlist('department_name[]')
        if department_names:
            if len(department_names) == 1:
                query = query.eq('department_name', department_names[0])
            else:
                query = query.in_('department_name', department_names)
        
        response = query.execute()
        trends = response.data
        
        # For each trend, calculate the top_trend_score
        scored_trends = []
        for trend in trends:
            # Get count of workplace developments for this trend (coverage_count)
            dev_query = db.table('workplace_developments').select('id', count='exact').eq('trend_title', trend['title'])
            dev_response = dev_query.execute()
            coverage_count = dev_response.count if hasattr(dev_response, 'count') else len(dev_response.data)
            
            priority_score = trend.get('priority_score', 0) or 0
            
            # Simple formula: coverage_count × priority_score
            # Note: admin_weight would need to be added as a field to trends table
            top_trend_score = coverage_count * priority_score
            
            # Only include trends with at least one workplace development
            if coverage_count > 0:
                scored_trends.append({
                    **trend,
                    'coverage_count': coverage_count,
                    'top_trend_score': top_trend_score
                })
        
        # Sort by top_trend_score (descending) and take top N
        scored_trends.sort(key=lambda x: x['top_trend_score'], reverse=True)
        top_trends = scored_trends[:limit]
        
        return jsonify({
            'top_trends': top_trends,
            'limit': limit,
            'expanded': expanded
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/quick-wins', methods=['GET'])
@token_required
def get_quick_wins(current_user):
    """
    Get quick win workplace developments (immediate action items).
    Returns top 5 by default, or top 15 if 'expanded=true' is passed.
    
    Formula: quick_win_score = impact_score × urgency_weight × (1 / training_effort_value)
    Where:
    - urgency_weight = 1.5 for regional scope, 1.2 for national scope
    - training_effort_value = low: 1, medium: 2, high: 3
    """
    try:
        # Get limit from query params (5 or 15)
        expanded = request.args.get('expanded', 'false').lower() == 'true'
        limit = 15 if expanded else 5
        
        # Build query
        query = db.table('workplace_developments').select('*')
        
        # Apply filters if provided
        # NOTE: Frontend sends array params as 'param[]', so we need to check both
        department_names = request.args.getlist('department_name') or request.args.getlist('department_name[]')
        if department_names:
            # Need to join with trends to filter by department
            # For now, we'll fetch all and filter in Python
            pass
        
        response = query.execute()
        developments = response.data
        
        # Calculate quick_win_score for each development
        scored_developments = []
        for dev in developments:
            impact_score = dev.get('impact_score', 0)
            scope = dev.get('scope', 'regional')
            training_effort = dev.get('training_effort', 'medium')
            
            # Urgency weight based on scope
            urgency_weight = 1.5 if scope == 'regional' else 1.2
            
            # Training effort value
            effort_map = {'low': 1, 'medium': 2, 'high': 3}
            training_effort_value = effort_map.get(training_effort, 2)
            
            # Calculate quick_win_score
            quick_win_score = impact_score * urgency_weight * (1 / training_effort_value)
            
            scored_developments.append({
                **dev,
                'quick_win_score': round(quick_win_score, 2)
            })
        
        # Sort by quick_win_score (descending) and take top N
        scored_developments.sort(key=lambda x: x['quick_win_score'], reverse=True)
        quick_wins = scored_developments[:limit]
        
        return jsonify({
            'quick_wins': quick_wins,
            'limit': limit,
            'expanded': expanded
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/trending-skills', methods=['GET'])
@token_required
def get_trending_skills(current_user):
    """
    Get trending skills based on frequency and associated development importance.
    Returns top 5 by default, or top 15 if 'expanded=true' is passed.
    
    Formula: skill_heat = Σ (development_impact × skill_weight)
    Where skill_weight = 1 for now (can be enhanced later)
    """
    try:
        # Get limit from query params (5 or 15)
        expanded = request.args.get('expanded', 'false').lower() == 'true'
        limit = 15 if expanded else 5
        
        # Get optional skill_type filter
        skill_types = request.args.getlist('skill_type')
        
        # Get all skills
        skills_query = db.table('skills').select('*')
        if skill_types:
            if len(skill_types) == 1:
                skills_query = skills_query.eq('skill_type', skill_types[0])
            else:
                skills_query = skills_query.in_('skill_type', skill_types)
        
        skills_response = skills_query.execute()
        skills = skills_response.data
        
        # Get all workplace developments with their impact scores
        dev_query = db.table('workplace_developments').select('title, impact_score')
        dev_response = dev_query.execute()
        developments_map = {dev['title']: dev['impact_score'] for dev in dev_response.data}
        
        # Calculate skill_heat for each unique skill
        skill_heat_map = {}
        for skill in skills:
            skill_name = skill['skill_name']
            skill_type = skill['skill_type']
            workplace_dev_title = skill['workplace_development_title']
            
            # Get impact score of the associated development
            dev_impact = developments_map.get(workplace_dev_title, 0)
            
            # Initialize skill entry if not exists
            if skill_name not in skill_heat_map:
                skill_heat_map[skill_name] = {
                    'skill_name': skill_name,
                    'skill_type': skill_type,
                    'skill_heat': 0,
                    'occurrence_count': 0,
                    'associated_developments': []
                }
            
            # Add to skill_heat (development_impact × skill_weight=1)
            skill_heat_map[skill_name]['skill_heat'] += dev_impact
            skill_heat_map[skill_name]['occurrence_count'] += 1
            if workplace_dev_title not in skill_heat_map[skill_name]['associated_developments']:
                skill_heat_map[skill_name]['associated_developments'].append(workplace_dev_title)
        
        # Convert to list and sort by skill_heat
        trending_skills = list(skill_heat_map.values())
        trending_skills.sort(key=lambda x: x['skill_heat'], reverse=True)
        
        # Take top N
        top_skills = trending_skills[:limit]
        
        # Optionally group by type if requested
        group_by_type = request.args.get('group_by_type', 'false').lower() == 'true'
        if group_by_type:
            grouped = {}
            for skill in top_skills:
                skill_type = skill['skill_type']
                if skill_type not in grouped:
                    grouped[skill_type] = []
                grouped[skill_type].append(skill)
            
            return jsonify({
                'trending_skills': grouped,
                'limit': limit,
                'expanded': expanded,
                'grouped_by_type': True
            }), 200
        
        return jsonify({
            'trending_skills': top_skills,
            'limit': limit,
            'expanded': expanded,
            'grouped_by_type': False
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/saved-items', methods=['GET'])
@token_required
def get_saved_items(current_user):
    """
    Get user's saved items (bookmarked trends/developments).
    Note: This is a placeholder for phase 1. Requires a 'saved_items' table.
    """
    try:
        # TODO: Implement when saved_items table is added
        return jsonify({
            'saved_items': [],
            'message': 'Saved items feature coming soon'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/overview', methods=['GET'])
@token_required
def get_cards_overview(current_user):
    """
    Get a combined overview of all cards (top trends, quick wins, trending skills).
    Returns top 5 for each card type.
    """
    try:
        # Get department filter if provided
        # NOTE: Frontend sends array params as 'param[]', so we need to check both
        department_names = request.args.getlist('department_name') or request.args.getlist('department_name[]')
        
        print(f"DEBUG Cards Overview: Received department_names filter: {department_names}")
        
        # Build query params for sub-requests
        query_params = {'expanded': 'false'}
        if department_names:
            query_params['department_name'] = department_names
        
        # Get top trends (top 5)
        trends_query = db.table('trends').select('*')
        if department_names:
            if len(department_names) == 1:
                trends_query = trends_query.eq('department_name', department_names[0])
            else:
                trends_query = trends_query.in_('department_name', department_names)
        
        trends_response = trends_query.order('priority_score', desc=True).execute()
        
        # Filter out trends with zero workplace developments and get top 5
        trends_with_devs = []
        for trend in trends_response.data:
            # Get count of workplace developments for this trend
            dev_count_query = db.table('workplace_developments').select('id', count='exact').eq('trend_title', trend['title'])
            dev_count_response = dev_count_query.execute()
            coverage_count = dev_count_response.count if hasattr(dev_count_response, 'count') else len(dev_count_response.data)
            
            if coverage_count > 0:
                trend['coverage_count'] = coverage_count
                trends_with_devs.append(trend)
        
        top_trends = trends_with_devs[:5]
        
        print(f"DEBUG Cards: Filtered to {len(trends_with_devs)} trends for department {department_names}")
        for trend in trends_with_devs[:3]:
            print(f"  - Trend: {trend['title']} (Dept: {trend.get('department_name')})")
        
        # Get all trend titles from the filtered trends for filtering developments
        all_filtered_trend_titles = [t['title'] for t in trends_with_devs]
        
        print(f"DEBUG Cards: Using {len(all_filtered_trend_titles)} trend titles to filter workplace developments")
        
        # Get quick wins (top 5) - only from filtered trends
        dev_query = db.table('workplace_developments').select('*')
        
        # Filter workplace developments by trend titles (department filter)
        if all_filtered_trend_titles:
            if len(all_filtered_trend_titles) == 1:
                dev_query = dev_query.eq('trend_title', all_filtered_trend_titles[0])
            else:
                dev_query = dev_query.in_('trend_title', all_filtered_trend_titles)
        else:
            # No trends in this department, return empty
            return jsonify({
                'top_trends': [],
                'quick_wins': [],
                'trending_skills': []
            }), 200
        
        dev_response = dev_query.execute()
        
        # Calculate quick_win_score
        scored_devs = []
        for dev in dev_response.data:
            impact_score = dev.get('impact_score', 0)
            scope = dev.get('scope', 'regional')
            training_effort = dev.get('training_effort', 'medium')
            urgency_weight = 1.5 if scope == 'regional' else 1.2
            effort_map = {'low': 1, 'medium': 2, 'high': 3}
            training_effort_value = effort_map.get(training_effort, 2)
            quick_win_score = impact_score * urgency_weight * (1 / training_effort_value)
            scored_devs.append({**dev, 'quick_win_score': round(quick_win_score, 2)})
        
        scored_devs.sort(key=lambda x: x['quick_win_score'], reverse=True)
        quick_wins = scored_devs[:5]
        
        print(f"DEBUG Cards: Found {len(scored_devs)} quick wins from filtered developments")
        for qw in quick_wins[:3]:
            print(f"  - Quick Win: {qw['title']} (Trend: {qw.get('trend_title')})")
        
        # Get trending skills (top 5) - only from filtered workplace developments
        filtered_dev_titles = [dev['title'] for dev in dev_response.data]
        
        skills_query = db.table('skills').select('*')
        
        # Filter skills by workplace development titles (department filter)
        if filtered_dev_titles:
            if len(filtered_dev_titles) == 1:
                skills_query = skills_query.eq('workplace_development_title', filtered_dev_titles[0])
            else:
                skills_query = skills_query.in_('workplace_development_title', filtered_dev_titles)
        
        skills_response = skills_query.execute()
        skill_heat_map = {}
        
        dev_map = {dev['title']: dev['impact_score'] for dev in dev_response.data}
        for skill in skills_response.data:
            skill_name = skill['skill_name']
            skill_type = skill['skill_type']
            dev_title = skill['workplace_development_title']
            dev_impact = dev_map.get(dev_title, 0)
            
            if skill_name not in skill_heat_map:
                skill_heat_map[skill_name] = {
                    'skill_name': skill_name,
                    'skill_type': skill_type,
                    'skill_heat': 0,
                    'occurrence_count': 0
                }
            skill_heat_map[skill_name]['skill_heat'] += dev_impact
            skill_heat_map[skill_name]['occurrence_count'] += 1
        
        trending_skills = list(skill_heat_map.values())
        trending_skills.sort(key=lambda x: x['skill_heat'], reverse=True)
        trending_skills = trending_skills[:5]
        
        print(f"DEBUG Cards: Found {len(skill_heat_map)} unique skills from filtered developments")
        for skill in trending_skills[:3]:
            print(f"  - Skill: {skill['skill_name']} (Heat: {skill['skill_heat']})")
        
        return jsonify({
            'top_trends': top_trends,
            'quick_wins': quick_wins,
            'trending_skills': trending_skills
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
