"""
Semantic Deduplication Script for Trends
Identifies and removes semantically similar trends based on embeddings.
"""

import os
import sys
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from database import db
from datetime import datetime

# Load environment variables
load_dotenv()

class TrendDeduplicator:
    def __init__(self, similarity_threshold=0.90):
        """
        Initialize the deduplicator with a similarity threshold.
        
        Args:
            similarity_threshold: Float between 0 and 1 (default 0.90 = 90%)
        """
        self.similarity_threshold = similarity_threshold
        print("Loading sentence transformer model...")
        # Using a multilingual model that works well for English and Dutch
        self.model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')
        print("Model loaded successfully!")
        
    def fetch_all_trends(self):
        """Fetch all trends from the database."""
        print("\nFetching trends from database...")
        response = db.table('trends').select('*').execute()
        trends = response.data
        print(f"Found {len(trends)} trends in database")
        return trends
    
    def create_trend_text(self, trend):
        """
        Create a combined text representation of a trend for embedding.
        Combines title and all available descriptions.
        """
        texts = [trend.get('title', '')]
        
        # Add all description fields
        if trend.get('internal_teacher_description'):
            texts.append(trend['internal_teacher_description'])
        if trend.get('internal_business_description'):
            texts.append(trend['internal_business_description'])
        if trend.get('external_user_description'):
            texts.append(trend['external_user_description'])
        
        # Join all texts with space
        return ' '.join(texts).strip()
    
    def compute_embeddings(self, trends):
        """Compute embeddings for all trends."""
        print("\nComputing embeddings for all trends...")
        trend_texts = [self.create_trend_text(trend) for trend in trends]
        embeddings = self.model.encode(trend_texts, show_progress_bar=True)
        return embeddings
    
    def find_duplicates(self, trends, embeddings):
        """
        Find duplicate trends based on semantic similarity.
        
        Returns:
            List of tuples: [(trend1_idx, trend2_idx, similarity_score), ...]
        """
        print(f"\nFinding duplicates with similarity >= {self.similarity_threshold*100}%...")
        
        # Compute cosine similarity matrix
        similarity_matrix = cosine_similarity(embeddings)
        
        # Find pairs with similarity above threshold
        duplicates = []
        n = len(trends)
        
        for i in range(n):
            for j in range(i + 1, n):
                similarity = similarity_matrix[i][j]
                if similarity >= self.similarity_threshold:
                    duplicates.append((i, j, similarity))
        
        # Sort by similarity (highest first)
        duplicates.sort(key=lambda x: x[2], reverse=True)
        
        print(f"Found {len(duplicates)} duplicate pairs")
        return duplicates
    
    def display_duplicate_pair(self, trends, idx1, idx2, similarity):
        """Display information about a duplicate pair."""
        trend1 = trends[idx1]
        trend2 = trends[idx2]
        
        print("\n" + "="*80)
        print(f"Similarity: {similarity*100:.2f}%")
        print("="*80)
        
        print(f"\n[Trend A] ID: {trend1['id']}")
        print(f"Title: {trend1['title']}")
        print(f"Category: {trend1.get('category', 'N/A')}")
        print(f"Department: {trend1.get('department_name', 'N/A')}")
        print(f"Status: {trend1.get('status', 'N/A')}")
        print(f"Created: {trend1.get('created_at', 'N/A')}")
        if trend1.get('internal_teacher_description'):
            desc = trend1['internal_teacher_description']
            print(f"Description: {desc[:200]}..." if len(desc) > 200 else f"Description: {desc}")
        
        print(f"\n[Trend B] ID: {trend2['id']}")
        print(f"Title: {trend2['title']}")
        print(f"Category: {trend2.get('category', 'N/A')}")
        print(f"Department: {trend2.get('department_name', 'N/A')}")
        print(f"Status: {trend2.get('status', 'N/A')}")
        print(f"Created: {trend2.get('created_at', 'N/A')}")
        if trend2.get('internal_teacher_description'):
            desc = trend2['internal_teacher_description']
            print(f"Description: {desc[:200]}..." if len(desc) > 200 else f"Description: {desc}")
    
    def get_trend_completeness_score(self, trend):
        """
        Calculate a completeness score for a trend.
        Higher score = more complete trend (should be kept).
        """
        score = 0
        
        # Check descriptions
        if trend.get('internal_teacher_description'): score += 3
        if trend.get('internal_business_description'): score += 3
        if trend.get('external_user_description'): score += 3
        
        # Check other important fields
        if trend.get('werkvloer_voorbeeld'): score += 2
        if trend.get('gevolgen_werk'): score += 2
        if trend.get('gevolgen_skills') and len(trend['gevolgen_skills']) > 0: score += 2
        if trend.get('impact_score') is not None: score += 1
        if trend.get('cijfers'): score += 1
        if trend.get('bronnen'): score += 1
        if trend.get('regionale_vertaling'): score += 1
        if trend.get('ai_reasoning'): score += 1
        
        # Reviewed trends are more valuable
        if trend.get('reviewed_at'): score += 3
        
        return score
    
    def suggest_trend_to_keep(self, trend1, trend2):
        """
        Suggest which trend to keep based on completeness.
        Returns 'A' or 'B' or 'Equal' if they're equally complete.
        """
        score1 = self.get_trend_completeness_score(trend1)
        score2 = self.get_trend_completeness_score(trend2)
        
        print(f"\nCompleteness Score - Trend A: {score1}, Trend B: {score2}")
        
        if score1 > score2:
            return 'A'
        elif score2 > score1:
            return 'B'
        else:
            # If equal, prefer the one created first
            created1 = trend1.get('created_at', '')
            created2 = trend2.get('created_at', '')
            if created1 < created2:
                return 'A'
            elif created2 < created1:
                return 'B'
            return 'Equal'
    
    def delete_trend(self, trend_id):
        """Delete a trend from the database."""
        try:
            response = db.table('trends').delete().eq('id', trend_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting trend {trend_id}: {e}")
            return False
    
    def run_interactive(self):
        """Run the deduplication process interactively."""
        print("="*80)
        print("SEMANTIC TREND DEDUPLICATION")
        print("="*80)
        
        # Fetch trends
        trends = self.fetch_all_trends()
        
        if len(trends) < 2:
            print("Not enough trends to deduplicate!")
            return
        
        # Compute embeddings
        embeddings = self.compute_embeddings(trends)
        
        # Find duplicates
        duplicates = self.find_duplicates(trends, embeddings)
        
        if len(duplicates) == 0:
            print(f"\nNo duplicates found with similarity >= {self.similarity_threshold*100}%")
            return
        
        # Track deleted trends to avoid processing them again
        deleted_trend_ids = set()
        total_deleted = 0
        
        # Process each duplicate pair
        for idx, (i, j, similarity) in enumerate(duplicates):
            trend1 = trends[i]
            trend2 = trends[j]
            
            # Skip if either trend was already deleted
            if trend1['id'] in deleted_trend_ids or trend2['id'] in deleted_trend_ids:
                continue
            
            # Display the pair
            self.display_duplicate_pair(trends, i, j, similarity)
            
            # Suggest which to keep
            suggestion = self.suggest_trend_to_keep(trend1, trend2)
            if suggestion != 'Equal':
                print(f"\nSuggestion: Keep Trend {suggestion}")
            
            # Ask user what to do
            print(f"\n[{idx + 1}/{len(duplicates)}] What would you like to do?")
            print("  A - Delete Trend A")
            print("  B - Delete Trend B")
            print("  K - Keep both")
            print("  S - Skip to next")
            print("  Q - Quit")
            
            while True:
                choice = input("\nYour choice (A/B/K/S/Q): ").strip().upper()
                
                if choice == 'Q':
                    print(f"\nDeduplication stopped. Deleted {total_deleted} trends.")
                    return
                
                elif choice == 'S' or choice == 'K':
                    print("Keeping both trends.")
                    break
                
                elif choice == 'A':
                    confirm = input(f"Confirm deletion of Trend A (ID: {trend1['id']})? (yes/no): ").strip().lower()
                    if confirm == 'yes':
                        if self.delete_trend(trend1['id']):
                            print(f"Trend A deleted successfully.")
                            deleted_trend_ids.add(trend1['id'])
                            total_deleted += 1
                        break
                    else:
                        print("Deletion cancelled.")
                
                elif choice == 'B':
                    confirm = input(f"Confirm deletion of Trend B (ID: {trend2['id']})? (yes/no): ").strip().lower()
                    if confirm == 'yes':
                        if self.delete_trend(trend2['id']):
                            print(f"Trend B deleted successfully.")
                            deleted_trend_ids.add(trend2['id'])
                            total_deleted += 1
                        break
                    else:
                        print("Deletion cancelled.")
                
                else:
                    print("Invalid choice. Please enter A, B, K, S, or Q.")
        
        print("\n" + "="*80)
        print(f"DEDUPLICATION COMPLETE - Deleted {total_deleted} trends")
        print("="*80)
    
    def run_dry_run(self):
        """Run the deduplication process without deleting anything."""
        print("="*80)
        print("SEMANTIC TREND DEDUPLICATION - DRY RUN MODE")
        print("="*80)
        
        # Fetch trends
        trends = self.fetch_all_trends()
        
        if len(trends) < 2:
            print("Not enough trends to deduplicate!")
            return
        
        # Compute embeddings
        embeddings = self.compute_embeddings(trends)
        
        # Find duplicates
        duplicates = self.find_duplicates(trends, embeddings)
        
        if len(duplicates) == 0:
            print(f"\nNo duplicates found with similarity >= {self.similarity_threshold*100}%")
            return
        
        # Display all duplicates
        print("\n" + "="*80)
        print("DUPLICATE PAIRS FOUND:")
        print("="*80)
        
        for idx, (i, j, similarity) in enumerate(duplicates):
            trend1 = trends[i]
            trend2 = trends[j]
            
            self.display_duplicate_pair(trends, i, j, similarity)
            suggestion = self.suggest_trend_to_keep(trend1, trend2)
            if suggestion != 'Equal':
                print(f"\nSuggestion: Keep Trend {suggestion}")
        
        print("\n" + "="*80)
        print(f"DRY RUN COMPLETE - Found {len(duplicates)} duplicate pairs")
        print("Run with --interactive flag to delete duplicates")
        print("="*80)


def main():
    """Main entry point for the script."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Semantic deduplication tool for trends',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run (no deletions)
  python deduplicate_trends.py
  
  # Interactive mode with custom threshold
  python deduplicate_trends.py --interactive --threshold 0.85
  
  # Dry run with 95% similarity threshold
  python deduplicate_trends.py --threshold 0.95
        """
    )
    
    parser.add_argument(
        '--interactive',
        action='store_true',
        help='Run in interactive mode (allows deletions)'
    )
    
    parser.add_argument(
        '--threshold',
        type=float,
        default=0.90,
        help='Similarity threshold (0.0-1.0, default: 0.90)'
    )
    
    args = parser.parse_args()
    
    # Validate threshold
    if args.threshold < 0.0 or args.threshold > 1.0:
        print("Error: Threshold must be between 0.0 and 1.0")
        sys.exit(1)
    
    # Create deduplicator
    deduplicator = TrendDeduplicator(similarity_threshold=args.threshold)
    
    # Run in appropriate mode
    if args.interactive:
        print("\nWARNING: Interactive mode will allow permanent deletions!")
        confirm = input("Continue? (yes/no): ").strip().lower()
        if confirm != 'yes':
            print("Aborted.")
            sys.exit(0)
        deduplicator.run_interactive()
    else:
        print("\nRunning in DRY RUN mode (no deletions)")
        deduplicator.run_dry_run()


if __name__ == '__main__':
    main()
