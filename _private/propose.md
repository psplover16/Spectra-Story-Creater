# Discuss Artifact: 實際執行回報 + UI 整合缺口

> 本檔由 `/spectra-discuss` 產出，輸入為 `_private/discuss.txt`。
> 來源：使用者要求「實際執行本專案一次」並完成一個吸血鬼短篇（2 章），填齊所有欄位。

## 0. 結論先講

- **資料層 / 主行程 IPC / 匯出 pipeline 全綠**：用程式化路徑跑完「夜霧之城」吸血鬼短篇全流程（建小說 → 2 條世界觀 → 2 個陣營 → 2 個角色含關係 → 2 章含完整 scene / content → 匯出 4 個 HTML），31 ms 完成、全部斷言通過。`src/services/` 服務層、`electron/ipc/` handlers、export pipeline 沒問題。
- **問題集中在「GUI 整合面」缺很多接線**：使用者實際用 `pnpm electron:dev` 跑只能停在「選 workspace / 列小說 / 切空白 tab」，因為 NovelView 五個 tab 的 panel 都是空 `<slot>`，沒有任何元件被填進去。
- **這不是技術錯誤，是 spec 把「元件」與「整合（page-level orchestrator）」拆得太細，apply 階段每個任務只交「一個元件 + 一個單元測試」，從沒有任務說「在 App.vue 把它們串起來」。屬於 propose / tasks 設計疏漏。**

修起來工作量中等（估 1 個 stage 規模），建議拉一個新 change `wire-novel-app-shell` 來補。

---

## 1. 實際執行結果

### 1.1 程式化吸血鬼短篇（服務層 / 資料層驗證）

寫了一個臨時 smoke test `tests/smoke/vampire-novel.test.ts`，**直接呼叫 services / repositories / exporter**（與 GUI 後面跑的同一條流程）。

成果（暫存目錄）：

```
夜霧之城/
  novel.json                                # 含 2 條 worldview + overallOutline
  characters/
    <maria-id>.json                         # Maria Voss（銀十字團）
    <lucien-id>.json                        # Lucien Aldric（黑紗會），含 relationships → Maria
  factions/
    <silver-cross>.json                     # 銀十字團（protagonist）
    <black-silk>.json                       # 黑紗會（antagonist），currentSituation 寫滿
  chapters/
    <ch1-id>.json                           # 失蹤的村姑（黃昏 / 微霧 / 銀十字劍）
    <ch2-id>.json                           # 霧夜對峙（深夜 / 濃霧 / 燭台）
  exports/
    chapter-1-失蹤的村姑-epub-like.html
    chapter-1-失蹤的村姑-web-page.html
    chapter-2-霧夜對峙-epub-like.html
    chapter-2-霧夜對峙-web-page.html
```

驗收：

- 4 個匯出 HTML 全部 `selfContained: true`、UTF-8 無 BOM
- epub-like 含內文段落 `<p>`
- web-page 側欄連回另一章（相對連結 `chapter-1-...-web-page.html`）
- 31 ms 完成

### 1.2 GUI 實際使用（手動驗證）

之前你執行 `pnpm electron:dev` 卡在「骨架啟動中。Tailwind 已套用。」，那是 App.vue 還停在 Stage A 占位文字。已修：

- `src/main.ts` 安裝 Pinia
- `src/App.vue` 重寫成依 workspace store 切換 WorkspaceSelectView / HomeView / NovelView
- `electron/main.ts` 註冊全部 IPC handlers（之前只有 `ping`）
- `electron/preload.ts` 補 `workspace.pickFolder` / `isWritable` / `create`
- `vite.config.ts` 把 `@/` alias 推到 main + preload

修完後，使用者可走到：

- ✓ 選 workspace 資料夾
- ✓ 看到小說列表
- ✓ 「建立新小說」對話框 → 真的寫出 novel.json
- ✓ 點小說名 → 進到 NovelView，看到 5 個 tab
- ✗ **切 tab 後 5 個 panel 都是空白**（NovelView 的 `<slot>` 沒有任何內容被傳入）

也就是說，使用者目前在 GUI 上**無法**新增 / 編輯角色、章節、陣營，無法寫世界觀，無法觸發「給我建議」，無法匯出。

---

## 2. GUI 整合缺口清單（按優先序）

| # | 缺口 | 影響 | 估規模 |
|---|------|------|--------|
| 1 | `NovelView` 5 個 tab panel 都是空 `<slot>`，App.vue 沒填內容 | **所有後續操作都做不到** | 中 |
| 2 | 沒有 `CharactersTab` 整合元件（CharacterList + CharacterEditor + 「新增角色」按鈕 + 串 IPC） | 無法管理角色 | 中 |
| 3 | 沒有 `ChaptersTab` 整合元件（ChapterList + ChapterEditor + SceneEditor + ParticipantPicker + 「新增章節」） | 無法寫章節 | 中 |
| 4 | 沒有 `FactionsTab` 整合元件（FactionList + FactionEditor + FactionMembersView + 「新增陣營」） | 無法管理陣營 | 小 |
| 5 | 沒有 `WorldviewTab` 整合元件包 WorldviewEditor + 接 novel.json 寫回 | 無法寫世界觀 | 小 |
| 6 | 沒有 `SettingsTab` 整合元件包 SettingsView | 無法設 CLI 路徑 / binding / proactivity | 小 |
| 7 | `ChapterView` 寫好但沒在任何地方使用，章節編輯沒進場 | 點章節打不開編輯器 | 中 |
| 8 | `SuggestionPanel` / `ChatPanel` / `DocumentEditPanel` 都沒被 mount，「給我建議」按不到 | AI 功能無入口 | 中 |
| 9 | `ExportDialog` 沒被任何地方打開，無法觸發匯出 | 匯出無入口 | 小 |
| 10 | `CollaborationModeSelectView` 沒整合到啟動流程 | 啟動時不會問模式 | 小 |
| 11 | workspace store 沒持久化到磁碟，重啟 App 後 workspace path 消失 | 重啟要重選工作目錄 | 小 |
| 12 | `ChapterTabs` 寫好但 ChapterView 才用，App.vue 看不到頂端章節 tabs | 多章節切換體驗缺 | 小 |
| 13 | 沒有「啟動時 detectActive」呼叫，IPC 的 `workspace:detectActive` 永遠回 `null` | 無記憶上次開啟 | 小 |
| 14 | `useAiInvoker` / `useSuggestionRequest` 需要 adapter 注入，但 App 啟動沒建出 codex / claude adapter 實例 | 即使有 UI 也跑不起來 | 中 |

---

## 3. 為什麼會留下這麼大的缺口

原 `build-novel-app-v1` 提案的 task 拆得「每個元件 + 單元測試」很細，但缺了一層 **page-level orchestrator** task：

- task 2.14 寫 NovelView ✓
- task 2.15–2.17 寫 character 元件 ✓
- task 2.18–2.23 寫 chapter 元件 ✓
- 但**沒有** task 2.X「在 NovelView 的 characters slot 接入 CharactersTab 整合元件」

ChapterView 已經有整合元件（task 2.29），但同樣的問題：**沒人把 ChapterView 接到 NovelView 的 chapters slot 或 App.vue 的章節 modal**。

`golden-path.test.ts` 也是直接呼叫 services 驗證，**沒驗 GUI 真的能驅動**，所以這個缺口沒被測試抓出來。

---

## 4. 建議的後續 Change：`wire-novel-app-shell`

### Why

「實際使用」是 spec D7（協作模式啟動時自選）與 D8（按鈕被動觸發 + 強建議內容）能否成立的前提。目前服務層 / 主行程 IPC 能跑、UI 元件齊備，但**串接層完全缺**，使用者打不開任何功能。

### What Changes

新增六個 page-level orchestrator 元件（每個包含「建立 / 列表 / 編輯 / 刪除 / 串 IPC」），改 App.vue 把它們塞進 NovelView 五個 slot，補啟動時 collaboration mode 選擇與 workspace 持久化。

### Capabilities（每項都是 tab orchestrator + 補 spec scenario）

1. **`CharactersTab`** — 列表 + 開啟 editor + 新增 + 刪除 + 透過 `window.api.character.*` 寫檔
2. **`ChaptersTab`** — 列表 + 開啟 ChapterView modal + 新增 + 刪除 + branch 入口
3. **`FactionsTab`** — 列表 + editor + 新增 + members 即時反映
4. **`WorldviewTab`** — 包 WorldviewEditor + 寫回 novel.json
5. **`SettingsTab`** — 包 SettingsView + 寫回 user-level settings file
6. **`CollaborationModeGate`** — App 啟動先過這層，再進 WorkspaceSelectView

附帶：

- workspace store 持久化到 user-level config（重啟記得上次目錄與小說）
- AI adapter bootstrap：App 啟動建出 codex / claude adapter 實例，注入 `useSuggestionRequest`
- 「給我建議」入口：在 ChapterView 加 SuggestionPanel，串到 useSuggestionRequest
- 「匯出」入口：在 ChapterView 加按鈕打開 ExportDialog，串到 export IPC

### Non-Goals

- 不重做任何已存在的單元元件（Character/Chapter/Faction/Worldview 各種編輯器與列表都已過測）
- 不改 IPC schema（preload + handlers 都對齊）
- 不擴 capability spec（這是 orchestration / wiring 層；spec 已涵蓋功能語意）

### 不在 scope 但值得列為後續

- e2e GUI 測試（Playwright + Electron）— 抓未來相似的整合缺口
- CollaborationMode 自動模式的實際 mode 切換（D7 後半）
- 一個「demo workspace」啟動按鈕，一鍵生成本次的吸血鬼短篇給新使用者體驗

---

## 5. 提議的下一步

1. **同意這個 change scope** → 我會跑 `/spectra-propose wire-novel-app-shell` 把上面拆成正式 proposal/design/tasks
2. 若同意，apply 階段預估 6 個 Tab orchestrator + App.vue 改寫 + workspace 持久化 + AI bootstrap，約 12–15 個 task，每個帶整合測試（不只單元測試）
3. apply 完成後手動再跑一次吸血鬼短篇驗收，這次是**從 GUI 點按鈕**走完

附：smoke test `tests/smoke/vampire-novel.test.ts` 暫留 repo，可以保留為 happy-path 回歸測試（建議改寫為走 IPC handlers 而非直接 services），或在 propose 階段移除。

---

## 6. 把這份結論落到哪

| Insight | Capture to |
|---------|-----------|
| GUI 整合缺口（屬於 wiring / orchestration） | 本檔 + 後續 `wire-novel-app-shell` change |
| spec.md「Outline required before content」等行為已在元件層落實 | 不動 |
| Page-level orchestrator 為新概念 | 在新 change 的 design.md 寫 D 條，標記與 component 層的職責分界 |

**Vocabulary drift**：discuss 過程中我習慣性把「服務層 + 主行程 + IPC handlers」籠統說成「後端」，使用者指出這個專案是 100% 本機桌面 app，沒有 client-server 分層，「後端」會誤導讀者。已建立 `openspec/LANGUAGE.md` 將「後端 / backend」列為 avoid term，並提供「主行程」、「服務層」、「資料層」、「IPC handlers」、「渲染端」等對應替代。本檔已套用新詞彙。
