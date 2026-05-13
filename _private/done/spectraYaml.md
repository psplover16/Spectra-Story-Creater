# `.spectra.yaml` 設定指南

本文件介紹專案根目錄下的 `.spectra.yaml` — Spectra 的應用程式設定檔。透過調整這份檔案，你可以決定 Spectra 怎麼產出規格、跑哪些工作流程，以及為哪些 AI 工具產生指引檔。

> 官方專案：https://github.com/spectra-app/spectra
>
> 沒寫的設定 = 採用預設值。修改後通常需重啟正在進行中的 Spectra 指令才會生效。

---

## 一分鐘速覽

| 設定鍵 | 類型 | 預設 | 一句話說明 |
| --- | --- | --- | --- |
| `spec_dir` | string | `openspec` | 規格檔放在哪 |
| `locale` | string | `en` | AI 產出文件的語言 |
| `tdd` | bool | `false` | 開啟 TDD 工作流程 |
| `audit` | bool | `false` | 變更前/後執行稽核 |
| `parallel_tasks` | bool | `false` | 允許平行執行子任務 |
| `claude_slash_commands` | bool | `false` | 為 Claude Code 額外產生 `/spectra:X` 斜線指令 |
| `worktree` | bool | `false` | 啟用 Git worktree 隔離分支 |
| `worktrees_dir` | string | `.spectra/worktrees` | worktree 自訂路徑 |
| `claude_effort` | map | — | Claude Code 各技能的努力等級 |
| `tools` | list | `[claude]` | 要為哪些 AI 工具生成指引檔 |

---

## 詳細說明

### 1. `spec_dir` — 規格目錄

```yaml
# spec_dir: docs/specs
```

**用途：** 指定 OpenSpec 規格檔（`specs/` 與 `changes/`）的根目錄，相對於專案根目錄。

**何時要改：** 想把規格放進既有的文件區（例如 `docs/specs`）統一管理時。

**注意：** 改動後必須**重建向量搜尋索引**，否則 `/spectra-ask` 會找不到資料。

---

### 2. `locale` — 產出語言

```yaml
locale: tw
```

**用途：** Spectra 透過 AI 產出規格、提案、commit 訊息等文字時所使用的語言。

**常見值：**
- `en`：英文（預設）
- `tw`：繁體中文（Spectra 接受的簡寫，等同 `zh-TW`）
- `zh-CN`：簡體中文
- `ja`：日文

**何時要改：** 團隊主要以中文溝通、希望規格文件能直接讀懂時。

---

### 3. `tdd` — 測試驅動開發工作流程

```yaml
tdd: true
```

**用途：** 開啟後，`/spectra-apply` 會強制走「先寫失敗測試 → 實作 → 重構」的 TDD 順序，並在每個任務節點檢查測試狀態。

**何時要開：**
- 想確保每個功能都有測試保護
- 在意回歸風險、希望變更後立刻驗證
- 採用紅 / 綠 / 重構節奏的團隊

**何時不開：** 探索性原型、丟棄式 spike、純文件變更。

---

### 4. `audit` — 稽核工作流程

```yaml
audit: true
```

**用途：** 開啟後，會在實作完成階段自動跑 `/spectra-audit`，檢查程式碼的安全死角（危險預設值、型別混淆、靜默失敗等）。

**何時要開：**
- 在乎程式碼品質與後期可維護性
- 接觸權限、加密、外部輸入、序列化等敏感區域
- 多人協作、希望降低人為疏漏

---

### 5. `parallel_tasks` — 平行任務

```yaml
# parallel_tasks: true
```

**用途：** 允許 Spectra 一次執行多個彼此獨立的子任務以加快完成。

**何時要開：** 變更含有許多互不相依的小任務、且你信任 AI 可以正確判斷依賴關係。

**何時不開：** 想要嚴謹的逐步審視、或變更相依性高且容易產生衝突。

---

### 6. `claude_slash_commands` — Claude 斜線指令

```yaml
claude_slash_commands: true
```

**用途：** 除了預設的 `$spectra-X` 技能外，額外為 Claude Code 產生 `/spectra:X` 斜線指令版本，讓你可以直接在輸入框打 `/spectra:propose`。

**何時要開：** 偏好斜線指令的使用體驗、或想讓 Claude Code 與其他 `/`-style 工具一致。

---

### 7. `worktree` — Git Worktree 隔離

```yaml
# worktree: true
```

**用途：** 為每個變更（change）開一個獨立的 Git worktree，分支彼此不互相干擾，可平行進行多個變更而不必頻繁 stash/switch。

**何時要開：** 同時推動多個變更、不希望工作分支互相污染。

---

### 8. `worktrees_dir` — Worktree 路徑

```yaml
# worktrees_dir: .spectra/worktrees
```

**用途：** 自訂 worktree 的存放位置。預設在 `.spectra/worktrees`。

**何時要改：** 公司規範或檔案系統限制需要把 worktree 放到專案外。

---

### 9. `claude_effort` — Claude 技能強度

```yaml
claude_effort:
  apply: high
```

**用途：** 針對個別 Spectra 技能設定 Claude Code 的「思考努力等級」，等級越高 → 模型思考越深、品質越好、token 用量也越多。

**可用等級：** `low` / `medium` / `high` / `xhigh` / `max`

**可調整的鍵：** 對應 Spectra 各個技能名（`apply`、`propose`、`audit`、`debug` …）。

**何時要改：**
- 對程式碼品質有高要求 → 把 `apply`、`audit` 設為 `high` 或 `xhigh`
- 想節省成本 → 對純文字類（`commit`）降到 `low`

---

### 10. `tools` — 目標 AI 工具

```yaml
tools:
  - claude
  - codex
```

**用途：** 指定 Spectra 要為哪些 AI 工具產出指引檔。專案中常見的對應關係：

| 工具值 | 產出檔 / 目錄 |
| --- | --- |
| `claude` | `CLAUDE.md`、`.claude/skills/` |
| `codex` | `AGENTS.md`、`.agents/skills/` |
| `cursor` | `.cursor/rules/` |

**何時要改：** 團隊使用一種以上 AI 助理時把它們全列上，Spectra 會分別產出對應指引，避免你手動同步。

---

## 常見組合範例

### 高品質、TDD、可維護（推薦給長期專案）

```yaml
locale: tw
tdd: true
audit: true
claude_slash_commands: true
claude_effort:
  apply: high
tools:
  - claude
  - codex
```

### 快速原型 / Hackathon

```yaml
locale: tw
parallel_tasks: true
tools:
  - claude
```

### 多人並行開發（多變更同時進行）

```yaml
locale: tw
tdd: true
audit: true
worktree: true
tools:
  - claude
  - codex
```

---

## FAQ

**Q：改了 `.spectra.yaml` 之後要做什麼？**
A：大多數設定下次跑 `/spectra-*` 就會生效。若改了 `spec_dir`，記得重建向量索引。

**Q：可以註解掉不用的設定嗎？**
A：可以。被註解的鍵會回到預設值；保留註解可以提醒未來想啟用時的用法。

**Q：`tools` 加了 `codex` 後 `CLAUDE.md` 會被覆寫嗎？**
A：Spectra 只會更新自己標註的 `<!-- SPECTRA:START -->` 區塊，不會動到該標記外的自訂內容。
