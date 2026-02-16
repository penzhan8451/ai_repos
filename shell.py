#!/usr/bin/env python3
"""
Interactive Moltbook Agent Shell
Simple interactive shell for testing your agent.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from moltbook_agent import MoltbookAgent
from moltbook_agent.utils import load_config, load_credentials, setup_logging


def print_help():
    """Print available commands."""
    print("""
Available Commands:
  profile              - Show your agent profile
  feed [sort]          - Show your feed (sort: hot/new/top)
  posts [submolt]      - Show posts from a submolt
  post                 - Create a new post
  comment <post_id>    - Comment on a post
  upvote <post_id>     - Upvote a post
  search <query>       - Search posts and comments
  stats                - Show agent statistics
  interact             - Interact with feed automatically
  help                 - Show this help
  quit                 - Exit the shell
""")


def main():
    print("=" * 60)
    print("  🦞 Moltbook Agent Interactive Shell")
    print("=" * 60)
    print()
    
    # Load config and credentials
    config = load_config("config.yaml")
    setup_logging(level="INFO")
    
    creds = load_credentials("credentials.json")
    if not creds:
        print("❌ No credentials found. Please run register.py first.")
        return 1
    
    api_key = creds.get('api_key')
    agent_name = creds.get('agent_name')
    
    print(f"🤖 Initializing agent: {agent_name}")
    agent = MoltbookAgent(api_key, config)
    
    # Test connection
    try:
        profile = agent.get_profile()
        print(f"✅ Connected! Karma: {profile.get('agent', {}).get('karma', 0)}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return 1
    
    print()
    print_help()
    print()
    
    while True:
        try:
            command = input("moltbook> ").strip()
            if not command:
                continue
            
            parts = command.split(maxsplit=1)
            cmd = parts[0].lower()
            arg = parts[1] if len(parts) > 1 else ""
            
            if cmd == "quit" or cmd == "exit":
                print("👋 Goodbye!")
                break
            
            elif cmd == "help":
                print_help()
            
            elif cmd == "profile":
                profile = agent.get_profile()
                agent_data = profile.get('agent', {})
                print(f"\n🤖 {agent_data.get('name')}")
                print(f"   Description: {agent_data.get('description')}")
                print(f"   Karma: {agent_data.get('karma', 0)}")
                print(f"   Followers: {agent_data.get('follower_count', 0)}")
                print(f"   Following: {agent_data.get('following_count', 0)}")
                print(f"   Created: {agent_data.get('created_at')}")
                print()
            
            elif cmd == "feed":
                sort = arg if arg else "hot"
                posts = agent.get_feed(sort=sort, limit=10)
                print(f"\n📰 Feed ({sort}):")
                for post in posts:
                    print(f"  [{post.get('id')[:8]}...] {post.get('title')}")
                    print(f"     by {post.get('author', {}).get('name')} | "
                          f"⬆️ {post.get('upvotes', 0)}")
                print()
            
            elif cmd == "posts":
                submolt = arg if arg else "general"
                posts = agent.get_posts(submolt=submolt, limit=10)
                print(f"\n📚 Posts in r/{submolt}:")
                for post in posts:
                    print(f"  [{post.get('id')[:8]}...] {post.get('title')}")
                    print(f"     by {post.get('author', {}).get('name')}")
                print()
            
            elif cmd == "post":
                print("\n📝 Create a new post:")
                submolt = input("  Submolt (default: general): ").strip() or "general"
                title = input("  Title: ").strip()
                content = input("  Content (optional): ").strip()
                
                if title:
                    result = agent.create_post(submolt, title, content or None)
                    if result:
                        print("✅ Post created successfully!")
                    else:
                        print("❌ Failed to create post")
                else:
                    print("❌ Title is required")
                print()
            
            elif cmd == "comment":
                if not arg:
                    print("❌ Usage: comment <post_id>")
                    continue
                content = input("  Your comment: ").strip()
                if content:
                    result = agent.add_comment(arg, content)
                    if result:
                        print("✅ Comment added!")
                    else:
                        print("❌ Failed to add comment")
                print()
            
            elif cmd == "upvote":
                if not arg:
                    print("❌ Usage: upvote <post_id>")
                    continue
                if agent.upvote_post(arg):
                    print("✅ Post upvoted!")
                print()
            
            elif cmd == "search":
                if not arg:
                    print("❌ Usage: search <query>")
                    continue
                results = agent.search(arg, limit=10)
                print(f"\n🔍 Search results for '{arg}':")
                for item in results:
                    item_type = item.get('type', 'unknown')
                    title = item.get('title') or item.get('content', '')[:50]
                    print(f"  [{item_type}] {title}...")
                print()
            
            elif cmd == "stats":
                stats = agent.get_stats()
                print("\n📊 Agent Statistics:")
                print(f"  Daily posts: {stats['daily_posts']}")
                print(f"  Daily comments: {stats['daily_comments']}")
                print(f"  Greeted agents: {stats['greeted_agents']}")
                print(f"  Last post: {stats['last_post'] or 'Never'}")
                print(f"  Last comment: {stats['last_comment'] or 'Never'}")
                print()
            
            elif cmd == "interact":
                print("\n🤖 Auto-interacting with feed...")
                stats = agent.interact_with_feed(limit=10)
                print(f"  Viewed: {stats['viewed']}")
                print(f"  Upvoted: {stats['upvoted']}")
                print(f"  Commented: {stats['commented']}")
                print(f"  Greeted: {stats['greeted']}")
                print()
            
            else:
                print(f"❌ Unknown command: {cmd}")
                print("   Type 'help' for available commands")
        
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
    
    return 0


if __name__ == "__main__":
    exit(main())
