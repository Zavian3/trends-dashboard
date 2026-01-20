import bcrypt

# The password you're trying to use
password = "admin@123"

# The hash from your database
stored_hash = "$2b$12$AqDei0Xt1uUpPAiwEngo5ev5rOB3HJRzxzwpInOTH5aZAGUgW4YIO"

# Test if the password matches the hash
result = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))

print(f"Password: {password}")
print(f"Stored hash: {stored_hash}")
print(f"Password matches: {result}")

# Generate a new hash for comparison
new_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print(f"\nNew hash generated: {new_hash}")
print(f"New hash matches: {bcrypt.checkpw(password.encode('utf-8'), new_hash.encode('utf-8'))}")
