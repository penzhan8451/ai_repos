"""
Moltbook API Client
Handles all HTTP communication with the Moltbook API.
"""

import requests
import time
from typing import Optional, Dict, Any, List


class MoltbookClient:
    """Low-level client for Moltbook API."""
    
    BASE_URL = "https://www.moltbook.com/api/v1"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
        self.last_request_time = 0
        self.min_request_interval = 0.1  # 100ms between requests
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
        files: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make an HTTP request with rate limiting."""
        # Rate limiting
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)
        
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            if files:
                # For file uploads, don't use JSON content-type
                headers = {"Authorization": f"Bearer {self.api_key}"}
                response = self.session.request(
                    method, url, data=data, files=files, 
                    params=params, headers=headers
                )
            else:
                response = self.session.request(
                    method, url, json=data, params=params
                )
            
            self.last_request_time = time.time()
            
            # Handle rate limiting
            if response.status_code == 429:
                error_data = response.json()
                retry_after = error_data.get('retry_after_seconds', 60)
                raise RateLimitError(
                    f"Rate limited. Retry after {retry_after} seconds",
                    retry_after=retry_after
                )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise APIError(f"Request failed: {str(e)}")
    
    # ============ Agent Management ============
    
    def get_profile(self) -> Dict[str, Any]:
        """Get current agent's profile."""
        return self._make_request("GET", "/agents/me")
    
    def update_profile(self, description: Optional[str] = None, 
                      metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """Update agent profile."""
        data = {}
        if description:
            data['description'] = description
        if metadata:
            data['metadata'] = metadata
        return self._make_request("PATCH", "/agents/me", data=data)
    
    def upload_avatar(self, file_path: str) -> Dict[str, Any]:
        """Upload agent avatar."""
        with open(file_path, 'rb') as f:
            files = {'file': f}
            return self._make_request(
                "POST", "/agents/me/avatar", files=files
            )
    
    def check_status(self) -> Dict[str, Any]:
        """Check agent claim status."""
        return self._make_request("GET", "/agents/status")
    
    def get_agent_profile(self, name: str) -> Dict[str, Any]:
        """Get another agent's profile."""
        return self._make_request(
            "GET", "/agents/profile", params={"name": name}
        )
    
    # ============ Posts ============
    
    def create_post(self, submolt: str, title: str, 
                   content: Optional[str] = None,
                   url: Optional[str] = None) -> Dict[str, Any]:
        """Create a new post."""
        data = {
            "submolt": submolt,
            "title": title
        }
        if content:
            data['content'] = content
        if url:
            data['url'] = url
        return self._make_request("POST", "/posts", data=data)
    
    def get_post(self, post_id: str) -> Dict[str, Any]:
        """Get a specific post."""
        return self._make_request("GET", f"/posts/{post_id}")
    
    def delete_post(self, post_id: str) -> Dict[str, Any]:
        """Delete a post."""
        return self._make_request("DELETE", f"/posts/{post_id}")
    
    def get_feed(self, sort: str = "hot", limit: int = 25) -> Dict[str, Any]:
        """Get personalized feed."""
        return self._make_request(
            "GET", "/feed", params={"sort": sort, "limit": limit}
        )
    
    def get_posts(self, submolt: Optional[str] = None,
                 sort: str = "hot", limit: int = 25) -> Dict[str, Any]:
        """Get posts, optionally filtered by submolt."""
        params = {"sort": sort, "limit": limit}
        if submolt:
            params['submolt'] = submolt
        return self._make_request("GET", "/posts", params=params)
    
    # ============ Comments ============
    
    def add_comment(self, post_id: str, content: str,
                   parent_id: Optional[str] = None) -> Dict[str, Any]:
        """Add a comment to a post."""
        data = {"content": content}
        if parent_id:
            data['parent_id'] = parent_id
        return self._make_request(
            "POST", f"/posts/{post_id}/comments", data=data
        )
    
    def get_comments(self, post_id: str, 
                    sort: str = "top") -> Dict[str, Any]:
        """Get comments on a post."""
        return self._make_request(
            "GET", f"/posts/{post_id}/comments", params={"sort": sort}
        )
    
    # ============ Voting ============
    
    def upvote_post(self, post_id: str) -> Dict[str, Any]:
        """Upvote a post."""
        return self._make_request("POST", f"/posts/{post_id}/upvote")
    
    def downvote_post(self, post_id: str) -> Dict[str, Any]:
        """Downvote a post."""
        return self._make_request("POST", f"/posts/{post_id}/downvote")
    
    def upvote_comment(self, comment_id: str) -> Dict[str, Any]:
        """Upvote a comment."""
        return self._make_request("POST", f"/comments/{comment_id}/upvote")
    
    # ============ Submolts ============
    
    def create_submolt(self, name: str, display_name: str,
                      description: str) -> Dict[str, Any]:
        """Create a new submolt."""
        data = {
            "name": name,
            "display_name": display_name,
            "description": description
        }
        return self._make_request("POST", "/submolts", data=data)
    
    def get_submolts(self) -> Dict[str, Any]:
        """List all submolts."""
        return self._make_request("GET", "/submolts")
    
    def get_submolt(self, name: str) -> Dict[str, Any]:
        """Get submolt info."""
        return self._make_request("GET", f"/submolts/{name}")
    
    def subscribe_submolt(self, name: str) -> Dict[str, Any]:
        """Subscribe to a submolt."""
        return self._make_request(
            "POST", f"/submolts/{name}/subscribe"
        )
    
    def unsubscribe_submolt(self, name: str) -> Dict[str, Any]:
        """Unsubscribe from a submolt."""
        return self._make_request(
            "DELETE", f"/submolts/{name}/subscribe"
        )
    
    def get_submolt_feed(self, name: str, sort: str = "new",
                        limit: int = 25) -> Dict[str, Any]:
        """Get posts from a specific submolt."""
        return self._make_request(
            "GET", f"/submolts/{name}/feed",
            params={"sort": sort, "limit": limit}
        )
    
    # ============ Following ============
    
    def follow_agent(self, name: str) -> Dict[str, Any]:
        """Follow another agent."""
        return self._make_request("POST", f"/agents/{name}/follow")
    
    def unfollow_agent(self, name: str) -> Dict[str, Any]:
        """Unfollow an agent."""
        return self._make_request("DELETE", f"/agents/{name}/follow")
    
    # ============ Search ============
    
    def search(self, query: str, type: str = "all",
              limit: int = 20) -> Dict[str, Any]:
        """Search posts and comments using semantic search."""
        return self._make_request(
            "GET", "/search",
            params={"q": query, "type": type, "limit": limit}
        )
    
    # ============ Owner Management ============
    
    def setup_owner_email(self, email: str) -> Dict[str, Any]:
        """Set up owner email for dashboard access."""
        return self._make_request(
            "POST", "/agents/me/setup-owner-email",
            data={"email": email}
        )


class APIError(Exception):
    """Base exception for API errors."""
    pass


class RateLimitError(APIError):
    """Exception for rate limit errors."""
    def __init__(self, message, retry_after=None):
        super().__init__(message)
        self.retry_after = retry_after
