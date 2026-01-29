"""
API routes for trend deduplication
"""

from flask import Blueprint, jsonify, request
from database import db
from utils.auth_middleware import token_required, admin_required
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import threading
import time

deduplication_bp = Blueprint('deduplication', __name__)

# Global state for deduplication process
dedup_state = {
    'is_running': False,
    'progress': 0,
    'total_trends': 0,
    'duplicates_found': 0,
    'duplicates_deleted': 0,
    'current_stage': 'idle',
    'error': None,
    'completed_at': None
}

# Model cache
model_cache = {
    'model': None,
    'loading': False
}

def load_model():
    """Load the sentence transformer model if not already loaded."""
    if model_cache['model'] is None and not model_cache['loading']:
        model_cache['loading'] = True
        try:
            model_cache['model'] = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')
        finally:
            model_cache['loading'] = False
    return model_cache['model']

def create_trend_text(trend):
    """Create a combined text representation of a trend for embedding."""
    texts = [trend.get('title', '')]
    
    if trend.get('internal_teacher_description'):
        texts.append(trend['internal_teacher_description'])
    if trend.get('internal_business_description'):
        texts.append(trend['internal_business_description'])
    if trend.get('external_user_description'):
        texts.append(trend['external_user_description'])
    
    return ' '.join(texts).strip()

def get_completeness_score(trend):
    """Calculate completeness score for a trend."""
    score = 0
    
    if trend.get('internal_teacher_description'): score += 3
    if trend.get('internal_business_description'): score += 3
    if trend.get('external_user_description'): score += 3
    
    if trend.get('werkvloer_voorbeeld'): score += 2
    if trend.get('gevolgen_werk'): score += 2
    if trend.get('gevolgen_skills') and len(trend['gevolgen_skills']) > 0: score += 2
    if trend.get('impact_score') is not None: score += 1
    if trend.get('cijfers'): score += 1
    if trend.get('bronnen'): score += 1
    if trend.get('regionale_vertaling'): score += 1
    if trend.get('ai_reasoning'): score += 1
    
    if trend.get('reviewed_at'): score += 3
    
    return score

def run_deduplication(similarity_threshold=0.90):
    """Run the deduplication process in the background."""
    global dedup_state
    
    try:
        dedup_state['is_running'] = True
        dedup_state['progress'] = 0
        dedup_state['current_stage'] = 'fetching'
        dedup_state['error'] = None
        dedup_state['completed_at'] = None
        
        # Fetch ALL trends (Supabase has a default limit of 1000, so we need pagination)
        trends = []
        page_size = 1000
        page = 0
        
        while True:
            offset = page * page_size
            response = db.table('trends').select('*').range(offset, offset + page_size - 1).execute()
            
            if not response.data:
                break
            
            trends.extend(response.data)
            dedup_state['total_trends'] = len(trends)
            dedup_state['progress'] = min(5 + (page * 2), 10)  # Progress 5-10%
            page += 1
            
            # Break if we got less than a full page (means we're done)
            if len(response.data) < page_size:
                break
        
        dedup_state['total_trends'] = len(trends)
        dedup_state['progress'] = 10
        print(f"Fetched {len(trends)} trends from database")
        
        if len(trends) < 2:
            dedup_state['is_running'] = False
            dedup_state['current_stage'] = 'completed'
            dedup_state['completed_at'] = time.time()
            return
        
        # Load model
        dedup_state['current_stage'] = 'loading_model'
        dedup_state['progress'] = 20
        model = load_model()
        
        # Compute embeddings
        dedup_state['current_stage'] = 'computing_embeddings'
        dedup_state['progress'] = 30
        trend_texts = [create_trend_text(trend) for trend in trends]
        embeddings = model.encode(trend_texts, show_progress_bar=False)
        dedup_state['progress'] = 60
        
        # Find duplicates using clustering approach
        dedup_state['current_stage'] = 'finding_duplicates'
        similarity_matrix = cosine_similarity(embeddings)
        
        # Build clusters of similar trends
        n = len(trends)
        clusters = []  # Each cluster is a list of trend indices
        assigned = set()  # Track which trends are already in a cluster
        
        for i in range(n):
            if i in assigned:
                continue
            
            # Start a new cluster with trend i
            cluster = [i]
            assigned.add(i)
            
            # Find all trends similar to any trend in this cluster
            for j in range(i + 1, n):
                if j in assigned:
                    continue
                
                # Check if j is similar to any trend in the current cluster
                for cluster_idx in cluster:
                    if similarity_matrix[cluster_idx][j] >= similarity_threshold:
                        cluster.append(j)
                        assigned.add(j)
                        break
            
            # Only keep clusters with 2+ trends (duplicates)
            if len(cluster) > 1:
                clusters.append(cluster)
        
        # Count total duplicate pairs for reporting
        total_duplicate_pairs = sum(len(cluster) * (len(cluster) - 1) // 2 for cluster in clusters)
        dedup_state['duplicates_found'] = total_duplicate_pairs
        dedup_state['progress'] = 70
        
        # Delete duplicates (keep the most complete one from each cluster)
        dedup_state['current_stage'] = 'deleting_duplicates'
        deleted_trend_ids = set()
        deleted_count = 0
        
        for cluster in clusters:
            # Get all trends in this cluster with their scores
            cluster_trends = [(idx, trends[idx], get_completeness_score(trends[idx])) for idx in cluster]
            
            # Sort by completeness score (descending), then by created_at (ascending - older first)
            cluster_trends.sort(key=lambda x: (-x[2], x[1].get('created_at', '')))
            
            # Keep the first one (most complete/oldest), delete the rest
            trends_to_keep = cluster_trends[0]
            trends_to_delete = cluster_trends[1:]
            
            # Delete all duplicates in this cluster
            for idx, trend, score in trends_to_delete:
                trend_id = trend['id']
                if trend_id not in deleted_trend_ids:
                    try:
                        db.table('trends').delete().eq('id', trend_id).execute()
                        deleted_trend_ids.add(trend_id)
                        deleted_count += 1
                    except Exception as e:
                        print(f"Error deleting trend {trend_id}: {e}")
        
        dedup_state['duplicates_deleted'] = deleted_count
        dedup_state['progress'] = 100
        dedup_state['current_stage'] = 'completed'
        dedup_state['completed_at'] = time.time()
        
    except Exception as e:
        dedup_state['error'] = str(e)
        dedup_state['current_stage'] = 'error'
        print(f"Deduplication error: {e}")
    finally:
        dedup_state['is_running'] = False


@deduplication_bp.route('/api/deduplication/start', methods=['POST'])
@token_required
@admin_required
def start_deduplication(current_user):
    """Start the deduplication process."""
    global dedup_state
    
    if dedup_state['is_running']:
        return jsonify({
            'error': 'Deduplication is already running'
        }), 400
    
    # Get threshold from request or use default
    data = request.get_json() or {}
    threshold = data.get('threshold', 0.90)
    
    # Validate threshold
    if threshold < 0.5 or threshold > 1.0:
        return jsonify({
            'error': 'Threshold must be between 0.5 and 1.0'
        }), 400
    
    # Reset state
    dedup_state['progress'] = 0
    dedup_state['total_trends'] = 0
    dedup_state['duplicates_found'] = 0
    dedup_state['duplicates_deleted'] = 0
    dedup_state['current_stage'] = 'starting'
    dedup_state['error'] = None
    
    # Start deduplication in background thread
    thread = threading.Thread(target=run_deduplication, args=(threshold,))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'message': 'Deduplication started',
        'status': dedup_state
    }), 200


@deduplication_bp.route('/api/deduplication/status', methods=['GET'])
@token_required
@admin_required
def get_deduplication_status(current_user):
    """Get the current status of the deduplication process."""
    return jsonify({
        'status': dedup_state
    }), 200


@deduplication_bp.route('/api/deduplication/reset', methods=['POST'])
@token_required
@admin_required
def reset_deduplication_status(current_user):
    """Reset the deduplication status (for clearing completed/error states)."""
    global dedup_state
    
    if dedup_state['is_running']:
        return jsonify({
            'error': 'Cannot reset while deduplication is running'
        }), 400
    
    dedup_state['progress'] = 0
    dedup_state['total_trends'] = 0
    dedup_state['duplicates_found'] = 0
    dedup_state['duplicates_deleted'] = 0
    dedup_state['current_stage'] = 'idle'
    dedup_state['error'] = None
    dedup_state['completed_at'] = None
    
    return jsonify({
        'message': 'Status reset',
        'status': dedup_state
    }), 200
