from database import db
import bcrypt

# Test Supabase connection
print("Testing Supabase connection...")

try:
    # Try to query the user
    response = db.table('users').select('*').eq('email', 'admin@bouwens.com').execute()
    
    print(f"\nQuery successful!")
    print(f"Number of users found: {len(response.data)}")
    
    if response.data:
        user = response.data[0]
        print(f"\nUser found:")
        print(f"  ID: {user.get('id')}")
        print(f"  Email: {user.get('email')}")
        print(f"  First Name: {user.get('first_name')}")
        print(f"  Last Name: {user.get('last_name')}")
        print(f"  User Type: {user.get('user_type')}")
        print(f"  Is Active: {user.get('is_active')}")
        print(f"  Password Hash: {user.get('password')[:50]}...")
        
        # Test password verification
        password = 'admin@123'
        password_match = bcrypt.checkpw(
            password.encode('utf-8'), 
            user['password'].encode('utf-8')
        )
        print(f"\n✓ Password verification: {password_match}")
        
        if password_match:
            print("\n✅ Everything looks good! The issue might be in the frontend or API routing.")
        else:
            print("\n❌ Password doesn't match!")
    else:
        print("\n❌ User not found in database!")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    print(f"Error type: {type(e).__name__}")
