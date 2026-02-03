from flask import Flask
from flask_cors import CORS
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Configure CORS with specific settings
# Get allowed origins from environment variable or use defaults
import os
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001').split(',')

CORS(app, resources={
    r"/api/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Import routes
from routes import auth, trends, departments, categories, users, kernpunten, workplace_developments, skills, cards

# Try to import deduplication (requires ML libraries - local only)
deduplication_available = False
try:
    from routes import deduplication
    deduplication_available = True
    print("✅ Deduplication feature loaded (ML libraries available)")
except ImportError as e:
    print(f"⚠️  Deduplication feature disabled (ML libraries not installed): {e}")

# Register blueprints
app.register_blueprint(auth.bp)
app.register_blueprint(trends.bp)
app.register_blueprint(departments.bp)
app.register_blueprint(categories.bp)
app.register_blueprint(users.bp)
if deduplication_available:
    app.register_blueprint(deduplication.deduplication_bp)
app.register_blueprint(kernpunten.bp)
app.register_blueprint(workplace_developments.bp)
app.register_blueprint(skills.bp)
app.register_blueprint(cards.bp)

@app.route('/')
def health_check():
    return {'status': 'ok', 'message': 'Trends API is running'}

if __name__ == '__main__':
    app.run(debug=True, port=5001)
