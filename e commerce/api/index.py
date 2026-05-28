import sys
import os

# Append the project root to sys.path so backend imports work seamlessly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
