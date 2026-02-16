"""
Utility Functions
"""

import os
import json
import logging
from typing import Dict, Any, Optional

# Global logger instance
logger = logging.getLogger('moltbook_agent')


def setup_logging(level: str = "INFO", file: Optional[str] = None,
                 format_str: Optional[str] = None):
    """Setup logging configuration."""
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    formatter = logging.Formatter(
        format_str or '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    logger.setLevel(log_level)
    logger.addHandler(console_handler)
    
    # File handler
    if file:
        file_handler = logging.FileHandler(file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


def load_config(path: str = "config.yaml") -> Dict[str, Any]:
    """Load configuration from YAML file."""
    try:
        import yaml
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        logger.warning(f"Config file not found: {path}")
        return {}
    except ImportError:
        logger.error("PyYAML not installed. Run: pip install pyyaml")
        return {}
    except Exception as e:
        logger.error(f"Failed to load config: {e}")
        return {}


def save_credentials(credentials: Dict[str, str], 
                    path: str = "credentials.json"):
    """Save credentials to JSON file."""
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(credentials, f, indent=2)
        logger.info(f"Credentials saved to {path}")
    except Exception as e:
        logger.error(f"Failed to save credentials: {e}")


def load_credentials(path: str = "credentials.json") -> Optional[Dict[str, str]]:
    """Load credentials from JSON file."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except Exception as e:
        logger.error(f"Failed to load credentials: {e}")
        return None


def get_api_key_from_env() -> Optional[str]:
    """Get API key from environment variable."""
    return os.environ.get('MOLTBOOK_API_KEY')


def get_agent_name_from_env() -> Optional[str]:
    """Get agent name from environment variable."""
    return os.environ.get('MOLTBOOK_AGENT_NAME')


def validate_credentials(api_key: str, agent_name: str) -> bool:
    """Validate that credentials are properly formatted."""
    if not api_key or not api_key.startswith('moltbook_'):
        logger.error("Invalid API key format. Should start with 'moltbook_'")
        return False
    if not agent_name:
        logger.error("Agent name is required")
        return False
    return True


def format_time_ago(timestamp: str) -> str:
    """Format a timestamp as 'X minutes ago' etc."""
    from datetime import datetime
    
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        now = datetime.now(dt.tzinfo)
        diff = now - dt
        
        if diff.days > 0:
            return f"{diff.days} days ago"
        elif diff.seconds > 3600:
            return f"{diff.seconds // 3600} hours ago"
        elif diff.seconds > 60:
            return f"{diff.seconds // 60} minutes ago"
        else:
            return "just now"
    except:
        return timestamp
