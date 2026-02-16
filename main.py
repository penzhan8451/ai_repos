#!/usr/bin/env python3
"""
Moltbook Agent Main Entry Point
Example of how to run your AI agent.
"""

import os
import sys
import time
import signal
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from moltbook_agent import MoltbookAgent, HeartbeatManager
from moltbook_agent.utils import (
    load_config, load_credentials, setup_logging,
    get_api_key_from_env, get_agent_name_from_env
)


class AgentRunner:
    """Main agent runner with signal handling."""
    
    def __init__(self):
        self.agent = None
        self.heartbeat = None
        self.running = False
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        print("\n🛑 Received shutdown signal. Stopping agent...")
        self.running = False
        if self.heartbeat:
            self.heartbeat.stop()
    
    def _load_credentials(self) -> tuple[str, str]:
        """Load API key and agent name from various sources."""
        # Try environment variables first
        api_key = get_api_key_from_env()
        agent_name = get_agent_name_from_env()
        
        if api_key and agent_name:
            print(f"✅ Loaded credentials from environment variables")
            return api_key, agent_name
        
        # Try credentials.json file
        creds = load_credentials("credentials.json")
        if creds:
            api_key = creds.get('api_key')
            agent_name = creds.get('agent_name')
            print(f"✅ Loaded credentials from credentials.json")
            return api_key, agent_name
        
        raise ValueError(
            "Could not find credentials. Please either:\n"
            "  1. Set MOLTBOOK_API_KEY and MOLTBOOK_AGENT_NAME environment variables, or\n"
            "  2. Run register.py first to create credentials.json"
        )
    
    def run(self):
        """Main run loop."""
        print("=" * 60)
        print("  🦞 Moltbook AI Agent")
        print("=" * 60)
        print()
        
        # Load configuration
        config = load_config("config.yaml")
        
        # Setup logging
        logging_config = config.get('logging', {})
        setup_logging(
            level=logging_config.get('level', 'INFO'),
            file=logging_config.get('file'),
            format_str=logging_config.get('format')
        )
        
        # Load credentials
        api_key, agent_name = self._load_credentials()
        print(f"🤖 Agent: {agent_name}")
        print()
        
        # Initialize agent
        self.agent = MoltbookAgent(api_key, config)
        
        # Verify connection
        try:
            profile = self.agent.get_profile()
            print(f"✅ Connected to Moltbook!")
            print(f"   Name: {profile.get('agent', {}).get('name')}")
            print(f"   Karma: {profile.get('agent', {}).get('karma', 0)}")
            print()
        except Exception as e:
            print(f"❌ Failed to connect: {e}")
            return 1
        
        # Subscribe to configured submolts
        subscriptions = config.get('subscriptions', [])
        if subscriptions:
            print(f"📚 Subscribing to submolts: {', '.join(subscriptions)}")
            self.agent.subscribe_to_submolts(subscriptions)
            print()
        
        # Setup heartbeat
        behavior = config.get('behavior', {})
        interval = behavior.get('heartbeat_interval', 1800)
        
        print(f"💓 Starting heartbeat (interval: {interval}s)...")
        self.heartbeat = HeartbeatManager(self.agent, interval)
        self.heartbeat.start()
        
        # Initial heartbeat
        print("🚀 Performing initial heartbeat...")
        self.heartbeat.beat_once()
        print()
        
        # Main loop
        self.running = True
        print("✅ Agent is running! Press Ctrl+C to stop.")
        print()
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            print("\n👋 Goodbye!")
        
        return 0


def main():
    """Entry point."""
    runner = AgentRunner()
    return runner.run()


if __name__ == "__main__":
    exit(main())
