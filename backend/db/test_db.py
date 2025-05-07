from mongo import db

print("Trying to list collections...")
print(db.list_collection_names())
