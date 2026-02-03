"""
API routes for workplace development deduplication
Uses lightweight TF-IDF for serverless compatibility
"""

from flask import Blueprint, jsonify, request
from database import db
from utils.auth_middleware import token_required, admin_required
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import threading
import time
import re

deduplication_bp = Blueprint('deduplication', __name__)

# Global state for deduplication process
dedup_state = {
    'is_running': False,
    'progress': 0,
    'total_developments': 0,
    'duplicates_found': 0,
    'duplicates_deleted': 0,
    'current_stage': 'idle',
    'error': None,
    'completed_at': None
}

def preprocess_text(text):
    """Clean and normalize text for better similarity detection."""
    if not text:
        return ""
    # Lowercase
    text = text.lower()
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters but keep spaces
    text = re.sub(r'[^\w\s]', '', text)
    return text.strip()

def create_development_text(development):
    """Create a combined text representation of a workplace development for embedding."""
    texts = [
        development.get('title', ''),
        development.get('description', ''),
        development.get('workplace_example', ''),
        development.get('work_impact', '')
    ]
    
    return ' '.join(filter(None, texts)).strip()

def get_completeness_score(development):
    """Calculate completeness score for a workplace development."""
    score = 0
    
    # Core fields
    if development.get('description'): score += 3
    if development.get('workplace_example'): score += 2
    if development.get('work_impact'): score += 2
    if development.get('short_term_change'): score += 2
    if development.get('long_term_change'): score += 2
    
    # Impact and analysis
    if development.get('impact_score') is not None: score += 2
    if development.get('impact_breakdown'): score += 1
    if development.get('brainport_impact'): score += 2
    
    # Sources and opportunities
    if development.get('sources') and len(development.get('sources', [])) > 0: score += 2
    if development.get('lll_opportunities') and len(development.get('lll_opportunities', [])) > 0: score += 1
    
    # Older developments are more "proven"
    if development.get('created_at'): score += 1
    
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
        
        # Fetch ALL workplace developments (Supabase has a default limit of 1000, so we need pagination)
        developments = []
        page_size = 1000
        page = 0
        
        while True:
            offset = page * page_size
            response = db.table('workplace_developments').select('*').range(offset, offset + page_size - 1).execute()
            
            if not response.data:
                break
            
            developments.extend(response.data)
            dedup_state['total_developments'] = len(developments)
            dedup_state['progress'] = min(5 + (page * 2), 10)  # Progress 5-10%
            page += 1
            
            # Break if we got less than a full page (means we're done)
            if len(response.data) < page_size:
                break
        
        dedup_state['total_developments'] = len(developments)
        dedup_state['progress'] = 10
        print(f"Fetched {len(developments)} workplace developments from database")
        
        if len(developments) < 2:
            dedup_state['is_running'] = False
            dedup_state['current_stage'] = 'completed'
            dedup_state['completed_at'] = time.time()
            return
        
        # Prepare texts
        dedup_state['current_stage'] = 'preprocessing'
        dedup_state['progress'] = 20
        development_texts = [create_development_text(dev) for dev in developments]
        
        # Preprocess texts
        processed_texts = [preprocess_text(text) for text in development_texts]
        dedup_state['progress'] = 30
        
        # Create TF-IDF vectors (lightweight, no model download needed)
        dedup_state['current_stage'] = 'computing_embeddings'
        vectorizer = TfidfVectorizer(
            max_features=500,  # Limit features for memory efficiency
            ngram_range=(1, 2),  # Use unigrams and bigrams
            min_df=1,
            max_df=0.8,
            sublinear_tf=True
        )
        tfidf_matrix = vectorizer.fit_transform(processed_texts)
        dedup_state['progress'] = 50
        
        # Compute similarity
        similarity_matrix = cosine_similarity(tfidf_matrix)
        dedup_state['progress'] = 60
        
        # Find duplicates using clustering approach
        dedup_state['current_stage'] = 'finding_duplicates'
        
        # Build clusters of similar developments
        n = len(developments)
        clusters = []  # Each cluster is a list of development indices
        assigned = set()  # Track which developments are already in a cluster
        
        for i in range(n):
            if i in assigned:
                continue
            
            # Start a new cluster with development i
            cluster = [i]
            assigned.add(i)
            
            # Find all developments similar to any development in this cluster
            for j in range(i + 1, n):
                if j in assigned:
                    continue
                
                # Check if j is similar to any development in the current cluster
                for cluster_idx in cluster:
                    if similarity_matrix[cluster_idx][j] >= similarity_threshold:
                        cluster.append(j)
                        assigned.add(j)
                        break
            
            # Only keep clusters with 2+ developments (duplicates)
            if len(cluster) > 1:
                clusters.append(cluster)
        
        # Count total duplicate pairs for reporting
        total_duplicate_pairs = sum(len(cluster) * (len(cluster) - 1) // 2 for cluster in clusters)
        dedup_state['duplicates_found'] = total_duplicate_pairs
        dedup_state['progress'] = 70
        
        # Delete duplicates (keep the most complete one from each cluster)
        dedup_state['current_stage'] = 'deleting_duplicates'
        deleted_development_ids = set()
        deleted_count = 0
        
        for cluster in clusters:
            # Get all developments in this cluster with their scores
            cluster_developments = [(idx, developments[idx], get_completeness_score(developments[idx])) for idx in cluster]
            
            # Sort by completeness score (descending), then by created_at (ascending - older first)
            cluster_developments.sort(key=lambda x: (-x[2], x[1].get('created_at', '')))
            
            # Keep the first one (most complete/oldest), delete the rest
            developments_to_keep = cluster_developments[0]
            developments_to_delete = cluster_developments[1:]
            
            # Delete all duplicates in this cluster
            for idx, dev, score in developments_to_delete:
                development_id = dev['id']
                development_title = dev['title']
                
                if development_id not in deleted_development_ids:
                    try:
                        # Delete associated skills first (foreign key constraint)
                        db.table('skills').delete().eq('workplace_development_title', development_title).execute()
                        
                        # Delete the development
                        db.table('workplace_developments').delete().eq('id', development_id).execute()
                        
                        deleted_development_ids.add(development_id)
                        deleted_count += 1
                    except Exception as e:
                        print(f"Error deleting workplace development {development_id}: {e}")
        
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
    dedup_state['total_developments'] = 0
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
    dedup_state['total_developments'] = 0
    dedup_state['duplicates_found'] = 0
    dedup_state['duplicates_deleted'] = 0
    dedup_state['current_stage'] = 'idle'
    dedup_state['error'] = None
    dedup_state['completed_at'] = None
    
    return jsonify({
        'message': 'Status reset',
        'status': dedup_state
    }), 200
