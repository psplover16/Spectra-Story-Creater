## Context

本專案為全新建立的桌面應用程式，協助沒寫過小說的使用者藉由本機 AI CLI 整理故事構想、追蹤角色與陣營狀態、引導劇情並偵測不一致。動機詳見 proposal.md。

當前狀態：openspec/ 為空、無既有實作程式碼，屬於 greenfield 專案。

主要約束：
- 前端固定 Vue 3 + TypeScript + Tailwind CSS（CLAUDE.md 硬約束）
- AI 僅能透過子行程呼叫本機 CLI（Codex CLI 或 Claude Code），不得直接呼叫任何 LLM HTTP API
- TDD：所有新增 service / adapter 必先有單元測試
- 所有資料留在本機

關鍵相關者：使用者（小說新手）、未來 v2 開發者（合併匯出、其他 CLI 後端等延伸）。

## Goals / Non-Goals

**Goals:**

- 建立 11 個 capability 的端到端可用實作
- 提供穩定的 AiAdapter 抽象，未來新增第三個 CLI 後端不需改 UI 層
- 6 層上下文與 4 層 resolver 完全資料驅動，調整綁定 / 職能 / 預設無需改程式
- 一致性檢查與使用者協商流程可被測試（不依賴實際 AI 回應）
- 檔案結構對使用者透明，可手動編輯、可丟雲端備份

**Non-Goals:**

- 不支援雲端同步、多人協作、線上備份
- 不直接呼叫第三方 LLM HTTP API（永不外傳）
- 不採 SQLite / IndexedDB
- 不支援多本同時啟用、不支援多視窗、不支援同一章節多主分頁同時編輯
- 不規劃 UI i18n（僅繁體中文）
- 不自動切換 CLI fallback
- 不自動寫回角色性格演化
- 不支援多章合併匯出（留待 v2）

## Decisions

### D1：採 Electron 桌面殼支援 child_process 呼叫本機 CLI

選用 Electron（Node.js main process）而非純瀏覽器 SPA 或 Tauri。

理由：
- 純瀏覽器無法 child_process，無法呼叫本機 CLI，違反 hard requirement
- Tauri 需 Rust 擴充，當前選 Node.js 路線降低團隊門檻
- 桌面 App 對檔案系統存取最自然，整本小說可能數百萬字

替代方案：Tauri（拒絕：Rust 學習曲線陡）、純瀏覽器 + 本機 daemon（拒絕：使用者部署成本高）。

### D2：純檔案 + 資料夾結構持久化

不採 SQLite、IndexedDB。

理由：
- 使用者可直接打開資料夾看到小說
- 可丟雲端硬碟備份、可手動編輯、可打包寄朋友
- 中短期容量不會撞瓶頸

取捨：跨章節全文搜尋會略慢；v1 接受。

替代方案：SQLite（拒絕：使用者無法手動編輯）、IndexedDB（拒絕：使用者看不到資料）。

### D3：隱私為規格層級硬約束（永不外傳）

ai-adapters spec 必須明文禁止直接 HTTP 呼叫 LLM 廠商 API；所有 AI 互動只能透過本機 CLI 子行程。

理由：propose.md 將「所有資料只存本機，永不外傳」列為硬要求。實作層若有違反需先修改 spec 才能允許。

### D4：採單一 change 模式 + 5 階段組織共約 150 task

不切多個 change（避免使用者反覆被打斷）。內部以 tasks.md 的 5 個階段（A 骨架 / B CRUD / C AI / D 進階 / E 匯出）組織約 150 task。

替代方案：切 15 個小 change（拒絕：使用者明確不接受）、切 7 個（拒絕：仍會打斷）。

### D5：AI 切換採 4 層 resolver

ai-switching 採以下優先序：

1. 段落覆寫（最高）
2. 職能綁定
3. 角色綁定
4. 全域預設（最低）

理由：使用者可在任何粒度精確指定，未指定處自然向上 fallback。resolver 須回傳「命中層級理由」供 UI 顯示。

### D6：6 個 AI 職能皆可獨立綁定 Codex 或 Claude

職能清單：plot-driver、character-voice、worldbuilding、character-design、outline-assistant、consistency-auditor。

理由：不同職能對 prompt 風格需求不同（劇情推進要創意、一致性檢查要嚴謹），個別綁定才能讓使用者依偏好調整。

### D7：協作模式啟動時自選 + 自動模式採互動長度頻率混合判斷

App 啟動時讓使用者自選：陪寫模式、代筆模式、自動模式。

自動模式（U2 決策）：啟動時詢問初始模式，後續依互動長度與頻率動態微調強度。

替代方案：依文筆自動偵測（拒絕：對新手不友善）、固定不選（拒絕：無法因應使用者偏好變化）。

### D8：主動性採按鈕被動觸發 + 強建議內容

使用者按「給我建議」按鈕才產生建議；建議內容必須具體、有方案、能推進劇情，禁止給泛泛建議（如「可以加一點張力」）。

替代方案：AI 主動跳訊息（拒絕：打擾使用者）、僅給弱建議（拒絕：對新手無用）。

### D9：主動性可調整層級採全域 / 小說 / 角色三層 fallback

每層可設「強 / 中 / 弱 / 關 / 跟隨上層」；實際採用值由最具體層級往上 fallback。

### D10：一致性檢查採回應前 dry-run + 5 類偵測 + 與使用者協商

AI 回應前自動偵測 5 類不一致：OOC、能力憑空出現、關係矛盾、世界觀矛盾、時間線錯亂（U1 決策：全納入）。

偵測到不一致不自動修改，跳出 ConflictDialog 讓使用者選：(1) 我重寫這段 (2) 修改設定 (3) 忽略（劇情張力）。

替代方案：自動修正（拒絕：使用者失去控制）、規則式檢查（拒絕：規則寫不完）、Agent 多輪審核（拒絕：成本高、延遲高）。

### D11：HTML 匯出支援 epub-like 與網頁化雙格式

- epub-like：單檔內嵌 CSS、純文字小說排版，用於列印、傳閱、丟入閱讀器
- 網頁化：含側欄、章節跳轉、目錄，用於給朋友線上看

匯出粒度：單章。多章合併匯出留待 v2。

### D12：多本小說採切換式工作區 + 章節分頁一章一頁 + 另存為分支

工作目錄下可同時擺多本小說資料夾，一次只啟用一本（切書 = 關當前那本）。啟用書內可開多個章節分頁，但同一章節同時只能有一個主分頁編輯（U3 決策），多版本以「另存為分支」表達，分支版本不同步、可手動合併。

理由：避免狀態競態、避免 6 層上下文裝兩本小說混亂。

### D13：角色性格演化採 AI 偵測 + 建議使用者更新（不自動寫回）

AI 在章節寫作中偵測角色行為超出原設定的偏移，產出「建議更新角色性格」提示，由使用者決定是否套用。不自動寫回。

理由：性格演化是劇情核心元素，使用者必須有最終決定權。

### D14：CLI 不可用採跳提示讓使用者確認後手動切換

CLI 沒裝、超時、非 0 exit code → 跳提示問使用者是否改用另一個 CLI 重試。不自動切換。

理由：自動切換會讓使用者沒注意到風格跑掉。

### D15：上下文採智慧挑選 6 層

Context Assembler 不全塞，依相關性決定哪些層、哪些項目進入 prompt。

6 層：世界觀、角色設定、整體劇情大綱、本章可能登場人物、章節大綱、章節場景設定。

替代方案：全塞（拒絕：token 上限、模型注意力衰減）、固定 N 層（拒絕：缺彈性）。

## Implementation Contract

### 行為（Behavior）

End user 觀察順序：

1. 啟動 App → 顯示工作目錄選擇 / 已選工作目錄下的小說列表
2. 點選一本小說 → 進入該小說工作區，同時關閉先前啟用的小說
3. 選擇協作模式（陪寫 / 代筆 / 自動）→ 進入 NovelView
4. 在 NovelView 編輯角色、章節大綱、世界觀
5. 開啟章節分頁 → ChapterView 顯示場景設定、內容編輯、建議面板
6. 按「給我建議」→ AiResolver 找對應 CLI 與職能 → ContextAssembler 組裝 6 層上下文 → AiAdapter 呼叫 CLI 子行程
7. 回應前先 dry-run 一致性檢查；偵測到不一致跳 ConflictDialog 三選一
8. 使用者可「另存為分支」保留多版本，分支不同步
9. 章節完成後選 epub-like 或網頁化匯出單章 HTML

### 介面 / 資料形狀（Interface / Data Shape）

**AiAdapter 介面（TypeScript）：**

```typescript
type AiSource = 'codex' | 'claude'
type AiRole =
  | 'plot-driver'
  | 'character-voice'
  | 'worldbuilding'
  | 'character-design'
  | 'outline-assistant'
  | 'consistency-auditor'

interface AiAdapter {
  readonly source: AiSource
  invoke(input: AiInvokeInput): Promise<AiInvokeResult>
}

interface AiInvokeInput {
  context: AssembledContext
  prompt: string
  role: AiRole
}

interface AiInvokeResult {
  text: string
  tokensUsed?: number
  source: AiSource
  durationMs: number
}
```

**AiResolver 4 層介面：**

```typescript
interface AiResolver {
  resolve(query: ResolveQuery): ResolveResult
}

interface ResolveQuery {
  role: AiRole
  characterId?: string
  paragraphId?: string
}

interface ResolveResult {
  adapter: AiAdapter
  hitLayer: 'paragraph' | 'role' | 'character' | 'global'
  reason: string
}
```

解析順序：paragraphOverride → roleBinding → characterBinding → globalDefault。

**ContextAssembler 6 層介面：**

```typescript
interface ContextAssembler {
  assemble(query: ContextQuery): AssembledContext
}

interface AssembledContext {
  worldview: WorldviewSlice[]
  characters: CharacterSlice[]
  overallPlot: PlotSlice
  presentCharacters: CharacterSlice[]
  chapterOutline: ChapterOutlineSlice
  chapterScene: ChapterSceneSlice
}
```

每層由相關性分數 + token 上限預算決定要納入哪些 slice。

**檔案 / 資料夾結構（執行期工作目錄）：**

工作目錄根下每本小說一個資料夾：novel.json（meta、世界觀、陣營、整體大綱）、characters/ 下每角色一檔、chapters/ 下每章一檔、chapters/[chapter-id].branches/ 下分支版本、factions/ 下陣營檔、exports/ 下匯出 HTML。

所有 JSON 檔以 UTF-8 無 BOM 寫入；schema 由 src/types 下型別定義主導。

**IPC 通道（Electron main 與 renderer 之間）：**

main process 透過 preload 暴露 window.api 給 renderer：

- workspace：list / open / close / detectActive
- novel：read / write meta
- character：list / read / write / delete
- chapter：list / read / write / delete、branch.list / branch.save / branch.activate
- ai：invoke（main process 內呼叫 child_process spawn 對應 CLI）
- consistency：dryRun
- export：chapter（傳入格式 epub-like 或網頁化）

renderer 不直接呼叫 child_process，所有 spawn 邏輯封裝於 main process。

### 失敗模式（Failure Modes）

- **CLI 不存在**：AiAdapter 拋 CliUnavailableError；UI 跳提示問是否改用另一個 CLI 重試，不自動 fallback
- **CLI 超時 / 非 0 exit code**：拋 CliExecutionError；行為同上
- **檔案讀取失敗**：Repository 拋 FileAccessError；UI 顯示「讀取失敗」並保留使用者輸入不清掉
- **JSON schema 不符**：Repository 拋 SchemaValidationError；UI 顯示具體缺失欄位，讓使用者修正
- **一致性檢查無法判斷**：AuditService 回 AuditInconclusive；當作通過、不阻擋使用者
- **使用者拒絕協商建議（選忽略）**：流程繼續，記錄一筆「使用者選擇忽略」事件供日後回顧
- **嘗試開啟第二本小說**：UI 跳確認「將關閉當前小說，確定要切換嗎？」確認後才換書
- **嘗試對同一章開第二個主分頁**：UI 拒絕，提示「該章已開啟」或「請另存為分支」

### 驗收（Acceptance Criteria）

- 所有 service 與 adapter 皆有對應 Vitest 單元測試（TDD），covers happy path 加上至少一個失敗模式
- AiAdapter 測試以 child_process spawn mock 驗證（stdout / stderr / exit code），不呼叫真實 CLI
- AiResolver 測試以 fixture binding 驗證 4 層 fallback 順序與 hitLayer 回傳值
- ContextAssembler 測試驗證智慧挑選邏輯：高相關 slice 進入、低相關被剔除、總 token 不超過預算
- ConsistencyAuditor 測試以 fixture novel state 對 5 類不一致各設計至少一個 positive 加上一個 negative 案例
- HtmlExporter 對 epub-like 與網頁化兩格式各有 snapshot 測試
- 整合測試：建立小說 → 編輯角色與章節 → 匯出單章 → 比對檔案結構與 HTML 內容
- 程式碼層級檢查：搜尋整個 src 與 electron 目錄不應出現 api.anthropic.com、api.openai.com 等 LLM 廠商 endpoint
- AiResolver UI 須在建議面板顯示「本次由 Claude 產生（職能綁定）」之類來源說明

### 範圍邊界（Scope Boundaries）

**In scope：**

- 11 個 capability 的 spec 與實作
- Electron 桌面殼骨架、Vite 構建、Vitest 設定、ESLint + Prettier
- 5 階段共約 150 task
- AiAdapter / AiResolver / ContextAssembler / ConsistencyAuditor / HtmlExporter 五個核心服務
- 章節「另存為分支」功能

**Out of scope：**

- 跨章節合併匯出（v2）
- 雲端同步、多人協作
- 第三個 AI CLI 後端（介面預留但不實作）
- Markdown / Word 等其他匯出格式
- 多語系 i18n
- 移動裝置 / 網頁版
- Electron 自動更新
- 跨章節全文搜尋優化
- 性格演化自動寫回

## Risks / Trade-offs

- **[Risk] CLI 子行程 stdout 編碼問題（Windows code page 950 與 UTF-8 衝突）** → Mitigation：spawn 時設定環境變數強制 UTF-8 輸出，main process 統一以 UTF-8 decode；Repository 寫檔強制 UTF-8 無 BOM
- **[Risk] 6 層上下文塞太多 token 拖慢回應或超出模型上限** → Mitigation：智慧挑選採相關性分數加上 token 上限預算；單元測試覆蓋邊界
- **[Risk] 4 層 resolver 命中規則複雜，使用者搞不清為何用了某 CLI** → Mitigation：resolver 回傳 hitLayer 加 reason；UI 顯示「本次由 Claude 產生（職能綁定）」
- **[Risk] 一致性檢查 dry-run 增加每次互動延遲** → Mitigation：dry-run 用較輕量 prompt；v1 採阻擋以求嚴謹，v2 可評估非阻擋背景審核
- **[Risk] 純檔案結構在章節數成長後讀寫變慢** → Mitigation：lazy load，只讀目錄索引；單章內容按需讀；v2 可考慮加索引快取
- **[Risk] Electron 打包體積大（約 150MB）** → Mitigation：v1 不優化；v2 評估 electron-builder 壓縮選項
- **[Risk] Codex CLI 或 Claude Code 子行程協定變更** → Mitigation：Adapter 層隔離具體 CLI 呼叫方式；協定更新後僅 Adapter 需調整，介面不動
- **[Risk] 使用者意外刪除小說資料夾遺失資料** → Mitigation：v1 不做版本控制，但提供「另存為分支」與檔案系統可見性讓使用者自行備份與雲端同步
- **[Risk] 一致性檢查誤報率高導致使用者疲乏（總是選忽略）** → Mitigation：spec 規定誤報率追蹤；提供「靜音此類型 N 章」短期關閉機制；不強制每次彈窗
- **[Risk] 主動性「強」建議內容對某些劇情類型過頭** → Mitigation：使用者可調至「中 / 弱 / 關」；三層 fallback 提供細粒度控制
