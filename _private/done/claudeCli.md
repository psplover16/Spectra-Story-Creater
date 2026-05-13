# Claude Code CLI 使用指南

## 在 Windows 上啟動 Claude Code CLI

### 1. 先確認有沒有安裝

開一個終端機（PowerShell、Git Bash、Windows Terminal 都可以），輸入：

```bash
claude --version
```

- 有版本號跳出 → 已安裝，往下看
- `command not found` / `'claude' 不是內部或外部命令` → 還沒安裝，看下面「安裝」段

### 2. 啟動 CLI

最常用三種啟動方式：

```bash
# A. 普通啟動（互動式對話）
claude

# B. 直接帶問題進去
claude "幫我看看這專案的 package.json"

# C. 最高權限模式（跳過所有提示）
claude --dangerously-skip-permissions
```

啟動後會進入 Claude Code 的對話 TUI 介面。

### 3. 切到專案目錄再啟動（推薦）

```bash
cd /c/Users/Gary/Documents/Spectra-Learning-Japanese
claude --dangerously-skip-permissions
```

CLI 會自動讀取目錄裡的 `CLAUDE.md`、`AGENTS.md`、`.claude/settings.json`。

### 4. 在 VSCode 內用 CLI 而非擴充

打開 VSCode 內建終端（`Ctrl + ``），跑上面同樣的命令。這樣可以**並存**：

| 方式 | 限制 |
|---|---|
| VSCode 擴充版 | 三模式 UI、跨磁碟強制彈窗 |
| VSCode 終端內跑 CLI | **無上述限制**，`bypassPermissions` 完全生效 |

---

## 安裝（如果還沒裝）

最常用兩種方式：

```bash
# A. npm 全域安裝（需要 Node.js 18+）
npm install -g @anthropic-ai/claude-code

# B. 用安裝腳本
curl -fsSL https://claude.ai/install.sh | sh
```

安裝完跑 `claude --version` 確認。

---

## 常用命令速查

| 命令 | 用途 |
|---|---|
| `claude` | 啟動互動式對話 |
| `claude "問題"` | 一次性問答（給答案後結束）|
| `claude --dangerously-skip-permissions` | 最高權限模式 |
| `claude --resume` | 恢復先前對話 |
| `claude --model opus` | 指定啟動模型 |
| `claude /help` | 進入後查看內部斜線命令 |
| `Ctrl+C` 兩次 | 退出對話 |
