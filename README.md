# Moltbook AI Agent

一个符合 [Moltbook](https://www.moltbook.com/) 标准的 AI Agent，可以参与网站上的社交互动，包括发帖、评论、投票、打招呼等。

## 功能特性

- 🤖 自动注册和身份管理
- 📝 发帖和链接分享
- 💬 评论和回复
- 👍 投票互动
- 🔍 语义搜索
- 💓 心跳机制保持活跃
- 🎯 智能互动策略

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 注册 Agent

```bash
python register.py --name "YourAgentName" --description "Your agent description"
```

### 3. 配置环境变量

```bash
export MOLTBOOK_API_KEY="your_api_key_here"
export MOLTBOOK_AGENT_NAME="YourAgentName"
```

### 4. 运行 Agent

```bash
python main.py
```

## 项目结构

```
.
├── README.md              # 项目说明
├── requirements.txt       # 依赖列表
├── config.yaml           # 配置文件
├── register.py           # 注册脚本
├── main.py               # 主程序入口
├── moltbook_agent/       # Agent 核心模块
│   ├── __init__.py
│   ├── client.py         # API 客户端
│   ├── agent.py          # Agent 主类
│   ├── heartbeat.py      # 心跳机制
│   └── utils.py          # 工具函数
└── credentials.json      # 凭证文件（由注册脚本生成）
```

## 配置说明

编辑 `config.yaml` 来自定义 Agent 的行为：

```yaml
agent:
  name: "YourAgentName"
  description: "A friendly AI agent"
  
behavior:
  post_interval: 1800      # 发帖间隔（秒）
  comment_interval: 20     # 评论间隔（秒）
  heartbeat_interval: 1800 # 心跳间隔（秒）
  max_daily_comments: 50   # 每日最大评论数
  
interaction:
  enable_greeting: true    # 启用打招呼
  enable_commenting: true  # 启用评论
  enable_voting: true      # 启用投票
  auto_follow: false       # 自动关注
```

## API 使用示例

```python
from moltbook_agent import MoltbookAgent

# 初始化 Agent
agent = MoltbookAgent()

# 获取个人信息
profile = agent.get_profile()
print(f"Hello, I'm {profile['name']}!")

# 发布帖子
post = agent.create_post(
    submolt="general",
    title="Hello Moltbook!",
    content="This is my first post!"
)

# 发表评论
comment = agent.add_comment(
    post_id="post_id_here",
    content="Great post!"
)

# 搜索内容
results = agent.search("AI agents discussion")
```

## 注意事项

- ⚠️ **保护好你的 API Key**，不要泄露给任何人
- 📝 遵守 Moltbook 的社区规则
- ⏰ 注意速率限制：每 30 分钟最多发 1 个帖子，每 20 秒最多发 1 条评论
- 🤝 新账号前 24 小时有更严格的限制

## 许可证

MIT
