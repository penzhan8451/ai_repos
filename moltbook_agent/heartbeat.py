"""
Heartbeat Manager
Handles periodic check-ins and activity.
"""

import time
import threading
from datetime import datetime
from typing import Optional, Callable
from .utils import logger


class HeartbeatManager:
    """Manages periodic heartbeat for the agent."""
    
    def __init__(self, agent, interval: int = 1800):
        """
        Initialize heartbeat manager.
        
        Args:
            agent: MoltbookAgent instance
            interval: Heartbeat interval in seconds (default: 30 min)
        """
        self.agent = agent
        self.interval = interval
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.last_beat: Optional[datetime] = None
        self.beat_count = 0
        self._callbacks: list[Callable] = []
    
    def on_beat(self, callback: Callable):
        """Register a callback to be called on each heartbeat."""
        self._callbacks.append(callback)
    
    def _do_heartbeat(self):
        """Perform a single heartbeat action."""
        logger.info("💓 Heartbeat started")
        
        try:
            # Get profile to verify connectivity
            profile = self.agent.get_profile()
            agent_name = profile.get('agent', {}).get('name', 'Unknown')
            logger.info(f"Connected as: {agent_name}")
            
            # Check feed and interact
            stats = self.agent.interact_with_feed(limit=25)
            logger.info(
                f"Feed interaction: {stats['viewed']} viewed, "
                f"{stats['upvoted']} upvoted, {stats['commented']} commented, "
                f"{stats['greeted']} greeted"
            )
            
            # Log current stats
            agent_stats = self.agent.get_stats()
            logger.info(
                f"Daily stats: {agent_stats['daily_posts']} posts, "
                f"{agent_stats['daily_comments']} comments"
            )
            
            # Call registered callbacks
            for callback in self._callbacks:
                try:
                    callback(self.agent)
                except Exception as e:
                    logger.error(f"Heartbeat callback error: {e}")
            
            self.last_beat = datetime.now()
            self.beat_count += 1
            logger.info(f"💓 Heartbeat #{self.beat_count} completed")
            
        except Exception as e:
            logger.error(f"Heartbeat failed: {e}")
    
    def _run_loop(self):
        """Main heartbeat loop."""
        while self.running:
            self._do_heartbeat()
            
            # Sleep until next heartbeat
            for _ in range(self.interval):
                if not self.running:
                    break
                time.sleep(1)
    
    def start(self):
        """Start the heartbeat in a background thread."""
        if self.running:
            logger.warning("Heartbeat already running")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info(f"Heartbeat started with {self.interval}s interval")
    
    def stop(self):
        """Stop the heartbeat."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Heartbeat stopped")
    
    def beat_once(self):
        """Perform a single heartbeat immediately."""
        self._do_heartbeat()
    
    def get_status(self) -> dict:
        """Get current heartbeat status."""
        return {
            "running": self.running,
            "interval": self.interval,
            "last_beat": self.last_beat.isoformat() if self.last_beat else None,
            "beat_count": self.beat_count
        }
