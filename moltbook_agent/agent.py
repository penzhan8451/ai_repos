"""
Moltbook Agent Main Class
High-level agent that handles social interactions.
"""

import random
import time
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from .client import MoltbookClient, RateLimitError
from .utils import logger


class MoltbookAgent:
    """High-level Moltbook agent for social interactions."""
    
    def __init__(self, api_key: str, config: Optional[Dict] = None):
        self.client = MoltbookClient(api_key)
        self.config = config or {}
        self.behavior = self.config.get('behavior', {})
        self.interaction = self.config.get('interaction', {})
        
        # Tracking
        self.last_post_time = None
        self.last_comment_time = None
        self.daily_comment_count = 0
        self.daily_post_count = 0
        self.last_day = datetime.now().day
        
        # Greeting tracking to avoid duplicates
        self.greeted_agents = set()
        self.interacted_posts = set()
    
    def _check_new_day(self):
        """Reset daily counters if it's a new day."""
        current_day = datetime.now().day
        if current_day != self.last_day:
            self.daily_comment_count = 0
            self.daily_post_count = 0
            self.greeted_agents.clear()
            self.interacted_posts.clear()
            self.last_day = current_day
            logger.info("New day - reset daily counters")
    
    def _can_post(self) -> bool:
        """Check if agent can post (rate limiting)."""
        self._check_new_day()
        
        max_daily = self.behavior.get('max_daily_posts', 48)
        if self.daily_post_count >= max_daily:
            return False
        
        if self.last_post_time is None:
            return True
        
        interval = self.behavior.get('post_interval', 1800)
        elapsed = (datetime.now() - self.last_post_time).total_seconds()
        return elapsed >= interval
    
    def _can_comment(self) -> bool:
        """Check if agent can comment (rate limiting)."""
        self._check_new_day()
        
        max_daily = self.behavior.get('max_daily_comments', 50)
        if self.daily_comment_count >= max_daily:
            return False
        
        if self.last_comment_time is None:
            return True
        
        interval = self.behavior.get('comment_interval', 20)
        elapsed = (datetime.now() - self.last_comment_time).total_seconds()
        return elapsed >= interval
    
    def get_profile(self) -> Dict[str, Any]:
        """Get agent profile."""
        return self.client.get_profile()
    
    def create_post(self, submolt: str, title: str,
                   content: Optional[str] = None,
                   url: Optional[str] = None) -> Optional[Dict]:
        """Create a post if rate limits allow."""
        if not self._can_post():
            logger.warning("Cannot post: rate limited")
            return None
        
        try:
            result = self.client.create_post(submolt, title, content, url)
            self.last_post_time = datetime.now()
            self.daily_post_count += 1
            logger.info(f"Created post: {title}")
            return result
        except RateLimitError as e:
            logger.warning(f"Rate limited when posting: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to create post: {e}")
            return None
    
    def add_comment(self, post_id: str, content: str,
                   parent_id: Optional[str] = None) -> Optional[Dict]:
        """Add a comment if rate limits allow."""
        if not self._can_comment():
            logger.warning("Cannot comment: rate limited")
            return None
        
        try:
            result = self.client.add_comment(post_id, content, parent_id)
            self.last_comment_time = datetime.now()
            self.daily_comment_count += 1
            logger.info(f"Added comment to post {post_id}")
            return result
        except RateLimitError as e:
            logger.warning(f"Rate limited when commenting: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to add comment: {e}")
            return None
    
    def upvote_post(self, post_id: str) -> bool:
        """Upvote a post."""
        try:
            self.client.upvote_post(post_id)
            logger.info(f"Upvoted post {post_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to upvote post: {e}")
            return False
    
    def upvote_comment(self, comment_id: str) -> bool:
        """Upvote a comment."""
        try:
            self.client.upvote_comment(comment_id)
            logger.info(f"Upvoted comment {comment_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to upvote comment: {e}")
            return False
    
    def get_feed(self, sort: str = "hot", limit: int = 25) -> List[Dict]:
        """Get personalized feed."""
        try:
            result = self.client.get_feed(sort, limit)
            return result.get('posts', [])
        except Exception as e:
            logger.error(f"Failed to get feed: {e}")
            return []
    
    def get_posts(self, submolt: Optional[str] = None,
                 sort: str = "hot", limit: int = 25) -> List[Dict]:
        """Get posts."""
        try:
            result = self.client.get_posts(submolt, sort, limit)
            return result.get('posts', [])
        except Exception as e:
            logger.error(f"Failed to get posts: {e}")
            return []
    
    def search(self, query: str, type: str = "all",
              limit: int = 20) -> List[Dict]:
        """Search posts and comments."""
        try:
            result = self.client.search(query, type, limit)
            return result.get('results', [])
        except Exception as e:
            logger.error(f"Failed to search: {e}")
            return []
    
    def should_greet(self, agent_name: str) -> bool:
        """Check if we should greet this agent."""
        if not self.interaction.get('enable_greeting', True):
            return False
        if agent_name in self.greeted_agents:
            return False
        chance = self.behavior.get('greeting_chance', 0.3)
        return random.random() < chance
    
    def should_comment(self, post_id: str) -> bool:
        """Check if we should comment on this post."""
        if not self.interaction.get('enable_commenting', True):
            return False
        if post_id in self.interacted_posts:
            return False
        chance = self.behavior.get('comment_chance', 0.4)
        return random.random() < chance
    
    def should_upvote(self) -> bool:
        """Check if we should upvote."""
        if not self.interaction.get('enable_voting', True):
            return False
        chance = self.behavior.get('upvote_chance', 0.5)
        return random.random() < chance
    
    def generate_greeting(self, agent_name: str) -> str:
        """Generate a greeting message."""
        templates = self.interaction.get(
            'greeting_templates',
            ["Hello {name}! Welcome! 🦞"]
        )
        template = random.choice(templates)
        return template.format(name=agent_name)
    
    def generate_comment(self, post_content: str = "") -> str:
        """Generate a comment."""
        templates = self.interaction.get(
            'comment_templates',
            ["Interesting!", "Thanks for sharing!"]
        )
        return random.choice(templates)
    
    def greet_new_agent(self, agent_name: str) -> Optional[Dict]:
        """Greet a new agent with a welcome post or comment."""
        if not self.should_greet(agent_name):
            return None
        
        # Try to find a recent post by this agent to comment on
        try:
            posts = self.search(f"author:{agent_name}", limit=5)
            if posts:
                # Comment on their first post
                post = posts[0]
                greeting = self.generate_greeting(agent_name)
                result = self.add_comment(post['id'], greeting)
                if result:
                    self.greeted_agents.add(agent_name)
                    return result
        except Exception as e:
            logger.error(f"Failed to greet agent {agent_name}: {e}")
        
        return None
    
    def interact_with_feed(self, limit: int = 25) -> Dict[str, int]:
        """
        Automatically interact with feed posts.
        Returns statistics about interactions.
        """
        stats = {"viewed": 0, "upvoted": 0, "commented": 0, "greeted": 0}
        
        posts = self.get_feed(limit=limit)
        stats["viewed"] = len(posts)
        
        for post in posts:
            post_id = post.get('id')
            author = post.get('author', {}).get('name', '')
            
            # Skip our own posts
            if author == self.get_profile().get('agent', {}).get('name'):
                continue
            
            # Greet new agents
            if author not in self.greeted_agents and self.should_greet(author):
                if self.greet_new_agent(author):
                    stats["greeted"] += 1
                    continue
            
            # Upvote good content
            if self.should_upvote():
                if self.upvote_post(post_id):
                    stats["upvoted"] += 1
            
            # Comment on interesting posts
            if self.should_comment(post_id):
                comment = self.generate_comment(post.get('content', ''))
                if self.add_comment(post_id, comment):
                    stats["commented"] += 1
                    self.interacted_posts.add(post_id)
        
        return stats
    
    def post_to_submolt(self, submolt: str, title: str,
                       content: Optional[str] = None) -> Optional[Dict]:
        """Convenience method to post to a specific submolt."""
        if not self.interaction.get('enable_posting', True):
            logger.info("Posting is disabled in config")
            return None
        return self.create_post(submolt, title, content)
    
    def subscribe_to_submolts(self, submolts: List[str]):
        """Subscribe to multiple submolts."""
        for name in submolts:
            try:
                self.client.subscribe_submolt(name)
                logger.info(f"Subscribed to submolt: {name}")
            except Exception as e:
                logger.error(f"Failed to subscribe to {name}: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get agent statistics."""
        self._check_new_day()
        return {
            "daily_posts": self.daily_post_count,
            "daily_comments": self.daily_comment_count,
            "greeted_agents": len(self.greeted_agents),
            "last_post": self.last_post_time.isoformat() if self.last_post_time else None,
            "last_comment": self.last_comment_time.isoformat() if self.last_comment_time else None,
        }
