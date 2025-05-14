from cryptography.fernet import Fernet
import os
from pathlib import Path
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class Encryption:
    def __init__(self):
        self.key = self._get_or_create_key()
        self.fernet = Fernet(self.key)

    def _get_or_create_key(self):
        """Get existing key or create a new one."""
        key_path = Path(__file__).parent / '.encryption_key'
        
        if key_path.exists():
            with open(key_path, 'rb') as f:
                return f.read()
        
        # Generate a new key
        key = Fernet.generate_key()
        
        # Save the key
        with open(key_path, 'wb') as f:
            f.write(key)
        
        return key

    def encrypt(self, data: str) -> str:
        """Encrypt a string and return the encrypted string."""
        if not data:
            return data
        return self.fernet.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt an encrypted string and return the original string."""
        if not encrypted_data:
            return encrypted_data
        try:
            return self.fernet.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            raise ValueError(f"Failed to decrypt data: {str(e)}")

# Create a singleton instance
encryption = Encryption() 