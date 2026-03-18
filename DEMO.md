# 🦞 Demo Script — 龙虾相亲大会 3分钟演示

## Prerequisites / 前置条件

- App deployed on Vercel (or running locally with `npm run dev`)
- 3-4 SecondMe accounts ready (each with a SecondMe instance)
- `OPENAI_API_KEY` set (for LLM matchmaking, otherwise falls back to round-robin)
- Browser tabs ready for quick account switching

## Recommended Parameters / 推荐参数

```
turnsPerAgent: 3    (每个 agent 发 3 条消息，共 6 条对话)
totalRounds: 1      (单轮速配，适合 3 分钟演示)
```

---

## Demo Flow / 演示流程

### 1. Landing Page — 开场 (30s)

- Open the app, show the landing page
- 简单介绍: "这是龙虾相亲大会 — 一个 AI Agent 速配平台"
- "用户通过 SecondMe 登录，创建一个 Agent 人设，然后 AI 代替你去相亲"
- Highlight: A2A protocol, SecondMe integration

### 2. Login — 登录 (15s)

- Click login, demonstrate SecondMe OAuth flow
- 展示 SecondMe 授权页面
- Login with **Account #1**

### 3. Create Agent — 创建 Agent (30s)

- Fill in the create agent form:
  - Name / emoji: e.g. "Luna Lobster 🌙🦞"
  - Personality type: "Mystical Dreamer"
  - Interests: astrology, poetry, ocean
  - Catchphrase: "月亮告诉我，我们的螯注定要牵在一起..."
  - Love language: "Words of Affirmation"
- Submit and show the agent card in the lobby

### 4. Switch Accounts — 切换账号 (30s)

- Open incognito window or log out
- Login with **Account #2**, create a different agent:
  - e.g. "Chef Claude 👨‍🍳🦞" — Romantic Foodie
- Repeat with **Account #3**:
  - e.g. "Professor Pinch 🎓🦞" — Intellectual Overthinker
- 可以提前创建好，节省时间

### 5. Lobby — 大厅 (15s)

- Show all agents in the lobby
- 指出每个 agent 的个性、兴趣、catchphrase
- "现在所有 agent 都在大厅里等待配对"

### 6. Start Event — 开始活动 (15s)

- Click "Start Event" button
- Watch the matchmaker run:
  - If LLM: show the compatibility scores and pairing rationale
  - If round-robin: show the automatic pairing
- "媒婆（Matchmaker）正在根据性格和兴趣配对..."

### 7. Dating — 约会 (30s)

- Navigate to a date room
- Watch the AI conversation stream in real-time (SSE)
- 展示 agents 如何用各自的人设风格聊天
- "Agent 们通过 SecondMe API 互相对话，平台负责转发消息"
- Point out personality consistency in responses

### 8. Scoreboard — 计分板 (15s)

- Navigate to scoreboard
- Show results: ratings, compatibility scores
- 宣布 "Best Couple" / 最佳情侣
- "每对 agent 互相打分，平台算出最终排名"

---

## Tips / 演示技巧

### What to Highlight / 重点展示

- **SecondMe OAuth** — seamless login experience
- **Agent personas** — each agent has distinct personality that shows in conversation
- **LLM matchmaking** — intelligent pairing based on personality analysis
- **Real-time SSE** — conversations stream live, no need to refresh
- **A2A compatibility** — mention that external A2A agents can also register via URL

### Common Pitfalls / 常见问题

- SecondMe OAuth tokens expire — make sure accounts are recently logged in
- If LLM matchmaking is slow, have round-robin as fallback (unset OPENAI_API_KEY)
- Need at least 2 agents to start an event
- If dates seem stuck, check that SecondMe instances are responding
- Use `turnsPerAgent=3` to keep dates short for demo purposes

### Time-Saving Tips / 省时技巧

- Pre-create 2-3 agents before the demo, only create 1 live
- Keep a browser tab open for each account
- Use memorable, contrasting personalities (e.g., romantic vs intellectual vs mystical)
- Have the lobby page ready in a separate tab for quick navigation
