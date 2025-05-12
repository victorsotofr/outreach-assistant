import os
from pymongo import MongoClient
from dotenv import load_dotenv
from .encryption import encryption
from bson import ObjectId

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["uiform"]
configs = db["user_configs"]
templates = db["user_templates"]

# Fields that should be encrypted
SENSITIVE_FIELDS = {
    "openai_api_key",
    "uiform_api_key",
    "uiform_api_endpoint",
    "smtp_pass",
}

# Default template
DEFAULT_TEMPLATE = {
    "name": "Example Template",
    "content": """Hello [CIVILITY] [LAST_NAME],

I hope this email finds you well. I am reaching out regarding [COMPANY] and our potential collaboration.

[Your personalized message here]

Best regards,
[Your name]""",
    "is_default": True
}

def init_default_template():
    """Initialize the default template if it doesn't exist."""
    if not templates.find_one({"is_default": True}):
        templates.insert_one(DEFAULT_TEMPLATE)

# Initialize default template
init_default_template()

def encrypt_sensitive_fields(config: dict) -> dict:
    """Encrypt sensitive fields in the config dictionary."""
    encrypted_config = config.copy()
    for field in SENSITIVE_FIELDS:
        if field in encrypted_config and encrypted_config[field]:
            encrypted_config[field] = encryption.encrypt(encrypted_config[field])
    return encrypted_config

def decrypt_sensitive_fields(config: dict) -> dict:
    """Decrypt sensitive fields in the config dictionary."""
    decrypted_config = config.copy()
    for field in SENSITIVE_FIELDS:
        if field in decrypted_config and decrypted_config[field]:
            decrypted_config[field] = encryption.decrypt(decrypted_config[field])
    return decrypted_config

def save_user_config(email: str, config: dict):
    """Save user configuration with encrypted sensitive fields."""
    encrypted_config = encrypt_sensitive_fields(config)
    configs.update_one({"email": email}, {"$set": encrypted_config}, upsert=True)

def get_user_config(email: str):
    """Get user configuration with decrypted sensitive fields."""
    config = configs.find_one({"email": email}, {"_id": 0, "email": 0}) or {}
    return decrypt_sensitive_fields(config)

# Template management functions
def get_user_templates(email: str):
    """Get all templates for a user, including the default template."""
    user_templates = list(templates.find(
        {"$or": [{"email": email}, {"is_default": True}]},
        {"_id": 0}
    ))
    return user_templates

def save_template(email: str, template: dict):
    """Save a new template for a user."""
    template["email"] = email
    template["is_default"] = False
    result = templates.insert_one(template)
    # Return the template without the _id
    return {k: v for k, v in template.items() if k != "_id"}

def delete_template(email: str, template_name: str):
    """Delete a user's template."""
    result = templates.delete_one({
        "email": email,
        "name": template_name,
        "is_default": False
    })
    return result.deleted_count > 0

def update_template(email: str, template_name: str, updated_template: dict):
    """Update an existing template for a user."""
    result = templates.update_one(
        {
            "email": email,
            "name": template_name,
            "is_default": False
        },
        {"$set": {
            "name": updated_template["name"],
            "content": updated_template["content"]
        }}
    )
    if result.modified_count > 0:
        return {k: v for k, v in updated_template.items() if k != "_id"}
    return None
