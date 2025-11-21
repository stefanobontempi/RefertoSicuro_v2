"""
Vault client for Auth Service
"""

import os
import sys

# Add shared utilities to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../shared'))

from utils.vault_client import VaultClient

# Create global vault client instance
vault_client = VaultClient(
    vault_path="secret/data/auth-service"
)