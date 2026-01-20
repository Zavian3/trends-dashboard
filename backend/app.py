from flask import Flask
from flask_cors import CORS
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Configure CORS with specific settings
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Import routes
from routes import auth, trends, departments, categories, subcategories, users

# Register blueprints
app.register_blueprint(auth.bp)
app.register_blueprint(trends.bp)
app.register_blueprint(departments.bp)
app.register_blueprint(categories.bp)
app.register_blueprint(subcategories.bp)
app.register_blueprint(users.bp)

@app.route('/')
def health_check():
    return {'status': 'ok', 'message': 'Trends API is running'}

if __name__ == '__main__':
    app.run(debug=True, port=5001)
