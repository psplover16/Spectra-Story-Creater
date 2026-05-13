## 1. Stage A — 專案骨架與基礎工具鏈

- [x] [P] 1.1 建立 package.json，宣告 Vue 3、Vite、Electron、TypeScript、Tailwind CSS、Vitest、ESLint、Prettier 等相依與 dev/build/test/lint/format scripts；驗收：`pnpm install` 成功、package.json 通過 schema 檢查
- [x] [P] 1.2 建立 tsconfig.json 與 tsconfig.node.json，分別涵蓋 Vue SFC 與 Electron main process 兩端的編譯目標；驗收：`pnpm tsc --noEmit` 對 src 與 electron 目錄各跑一次皆通過
- [x] [P] 1.3 建立 vite.config.ts 與 index.html，提供 dev server 與 production build 行為；驗收：`pnpm dev` 啟動可載入空白頁面、`pnpm build` 產出 dist/index.html
- [x] [P] 1.4 建立 tailwind.config.ts 與 postcss.config.cjs，在 src/main.ts 引入 Tailwind 入口 CSS；驗收：於 src/App.vue 套用 utility class 在 dev server 渲染正確
- [x] [P] 1.5 建立 .eslintrc.cjs 與 .prettierrc，提供 lint/format script；驗收：`pnpm lint` 與 `pnpm format --check` 對空 repo 皆通過
- [x] [P] 1.6 建立 vitest 配置與 tests/setup.ts，引入 @vue/test-utils；驗收：`pnpm test` 跑 tests/sample.test.ts 通過
- [x] 1.7 撰寫 electron/main.ts 啟動 BrowserWindow 並建立 IPC 主幹，落實 D1：採 Electron 桌面殼支援 child_process 呼叫本機 CLI；驗收：`pnpm electron:dev` 開啟桌面視窗載入 Vite dev URL
- [x] 1.8 撰寫 electron/preload.ts 以 contextBridge 暴露 window.api 占位介面（workspace / novel / character / chapter / faction / ai / consistency / export 子物件）；驗收：renderer console 可看到 window.api 結構且型別檢查通過
- [ ] 1.9 建立 electron-builder.json 提供 win/macOS 打包輸出設定；驗收：`pnpm pkg` 在 release/ 產出可執行檔
- [x] [P] 1.10 撰寫 src/types/novel.ts 定義 Novel、WorldviewEntry、FactionSummary、OverallOutline 型別，承接 D2：純檔案 + 資料夾結構持久化的 schema；驗收：tsc 通過 + tests/types/novel.types.test.ts 透過 type assertion 守住關鍵欄位
- [x] [P] 1.11 撰寫 src/types/character.ts 定義 Character、Relationship、DriftFinding 型別；驗收：tsc 通過
- [x] [P] 1.12 撰寫 src/types/chapter.ts 定義 Chapter、ChapterBranch、Scene 型別；驗收：tsc 通過
- [x] [P] 1.13 撰寫 src/types/ai.ts 定義 AiSource、AiRole、AiAdapter、AiInvokeInput、AiInvokeResult、AssembledContext、ResolveQuery、ResolveResult 等核心介面；驗收：tsc 通過
- [x] 1.14 撰寫 src/services/files/encoding.ts，提供 UTF-8 無 BOM 寫入、UTF-8 讀取（接受 with/without BOM、拒絕其他編碼）helper 並定義 EncodingError，落實 All JSON files use UTF-8 without BOM；驗收：tests/services/files/encoding.test.ts 覆蓋寫入無 BOM、讀取 BOM、拒絕非 UTF-8 三案例
- [x] 1.15 撰寫 eslint-plugin-local/no-llm-http.js 自製規則，禁止 fetch/axios/import 任何 LLM 廠商 endpoint，落實 D3：隱私為規格層級硬約束（永不外傳）；驗收：tests/lint/no-llm-http.test.ts 對 fixture 含 api.anthropic.com 報錯、乾淨 fixture 通過

## 2. Stage B — 資料層與 CRUD UI

- [x] 2.1 撰寫 src/services/files/novelRepository.ts 提供 create/list/read/write/delete novel.json，實現 Novel meta file structure；驗收：tests/services/files/novelRepository.test.ts 覆蓋 happy path、重複名稱拒絕（DuplicateNovelError）、UTF-8 BOM 讀取三案例（檔案 I/O 強制 UTF-8 無 BOM）
- [x] 2.2 撰寫 src/services/files/characterRepository.ts 落實 Character file structure，提供 CRUD 與 schema 驗證；驗收：tests/services/files/characterRepository.test.ts 覆蓋 happy path、缺 name 拒絕（SchemaValidationError）、不存在的 relationship target 拒絕三案例
- [x] 2.3 撰寫 src/services/files/chapterRepository.ts 含 Chapter file structure with branches，提供 chapter CRUD、branch list/save/activate；驗收：tests/services/files/chapterRepository.test.ts 覆蓋主 chapter CRUD、branch 建立並驗證 branchOf 與 branchedAt、branch list 列出多版本三案例
- [x] 2.4 撰寫 src/services/files/factionRepository.ts 落實 Faction file structure，提供 CRUD 並 append history.jsonl；驗收：tests/services/files/factionRepository.test.ts 覆蓋 CRUD 與 history append
- [x] [P] 2.5 撰寫 electron/ipc/workspaceHandlers.ts 註冊 workspace.list / open / close / detectActive IPC，實現 Workspace root selection、List novels in workspace、Single active novel constraint；驗收：tests/electron/ipc/workspaceHandlers.test.ts 用 mock fs 驗證列出邏輯（含混合資料夾過濾）與切換需確認的回傳值
- [x] [P] 2.6 撰寫 electron/ipc/novelHandlers.ts 註冊 novel.read / write IPC；驗收：對應 vitest 通過
- [x] [P] 2.7 撰寫 electron/ipc/characterHandlers.ts 註冊 character CRUD IPC；驗收：對應 vitest 通過
- [x] [P] 2.8 撰寫 electron/ipc/chapterHandlers.ts 註冊 chapter CRUD 與 branch.list/save/activate IPC；驗收：對應 vitest 通過
- [x] [P] 2.9 撰寫 electron/ipc/factionHandlers.ts 註冊 faction CRUD IPC；驗收：對應 vitest 通過
- [x] 2.10 撰寫 src/stores/workspace.ts (Pinia)，持久化 workspace root 與 active novel，並在切換時於有未儲存 chapter tab 時呼叫 confirm 流程，落實 Single active novel constraint；驗收：tests/stores/workspace.test.ts 模擬未儲存編輯切換需 prompt、確認後清空 active novel 快取
- [x] 2.11 撰寫 src/stores/aiSettings.ts，持久化全域 / 小說 / 角色 / 段落綁定與三層主動性層級設定，落實 D9：主動性可調整層級採全域 / 小說 / 角色三層 fallback；驗收：tests/stores/aiSettings.test.ts 驗證寫入 / 跟隨上層 / fallback 三路徑
- [x] 2.12 撰寫 src/views/WorkspaceSelectView.vue 首次啟動引導使用者選 workspace root，落實 Workspace root selection；驗收：tests/views/WorkspaceSelectView.test.ts 驗證首次啟動需選擇、唯讀資料夾拒絕後重新顯示 picker
- [x] 2.13 撰寫 src/views/HomeView.vue 列出啟用 workspace 下含 novel.json 的小說，落實 List novels in workspace；驗收：tests/views/HomeView.test.ts 驗證混合資料夾僅顯示有效小說
- [x] 2.14 撰寫 src/views/NovelView.vue 提供角色 / 章節 / 陣營 / 世界觀 / 設定五個分頁切換；驗收：tests/views/NovelView.test.ts 驗證分頁切換 + active 標籤狀態
- [x] 2.15 撰寫 src/components/character/CharacterList.vue 含 Character list filtering by faction 邏輯；驗收：tests/components/character/CharacterList.test.ts 驗證 faction 過濾僅回相符角色與「無陣營」過濾路徑
- [x] 2.16 撰寫 src/components/character/CharacterEditor.vue，落實 Character CRUD UI 與 Required character fields；驗收：tests/components/character/CharacterEditor.test.ts 驗證 happy save、缺 name 拒絕、save 後 list 刷新
- [x] 2.17 撰寫 src/components/character/CharacterRelationshipEditor.vue，落實 Character relationship editing；驗收：tests/components/character/CharacterRelationshipEditor.test.ts 驗證 add 關係、不存在 target 拒絕
- [x] 2.18 撰寫 src/components/chapter/ChapterList.vue 支援拖曳排序，落實 Reorder chapters by index；驗收：tests/components/chapter/ChapterList.test.ts 模擬 drag 後驗證 index 連續且其他 chapter 不被誤動
- [x] 2.19 撰寫 src/components/chapter/ChapterEditor.vue，落實 Chapter CRUD UI 與 Outline required before content；驗收：tests/components/chapter/ChapterEditor.test.ts 驗證 outline 為空時 content 禁用、saved outline 後啟用
- [x] 2.20 撰寫 src/components/chapter/SceneEditor.vue 落實 Scene configuration per chapter；驗收：tests/components/chapter/SceneEditor.test.ts 驗證五欄位（location/time/weather/props/mood）儲存
- [x] 2.21 撰寫 src/components/chapter/ParticipantPicker.vue 落實 Chapter participant tracking；驗收：tests/components/chapter/ParticipantPicker.test.ts 驗證 presentCharacters[] 寫入與重啟後保留
- [x] 2.22 撰寫 src/components/chapter/ChapterTabs.vue 落實 Chapter tab management (one chapter per tab, one tab per chapter)，並承接 D12：多本小說採切換式工作區 + 章節分頁一章一頁 + 另存為分支；驗收：tests/components/chapter/ChapterTabs.test.ts 驗證重複開啟既存章節時焦點轉移而非建立新 tab
- [x] 2.23 撰寫 src/components/chapter/SaveAsBranchDialog.vue 與 ChapterBranchList.vue，落實 Save-as-branch functionality；驗收：tests/components/chapter/SaveAsBranchDialog.test.ts 驗證另存後分支檔產生、主檔不動、列表顯示新分支
- [x] 2.24 撰寫 src/components/faction/FactionList.vue 與 FactionEditor.vue 基本骨架，落實 Faction state CRUD；驗收：tests/components/faction/FactionList.test.ts 與 FactionEditor.test.ts 驗證列表與 CRUD 流程
- [x] 2.25 在 FactionEditor 接入 situation 更新觸發 history.jsonl append 流程，落實 Update faction situation across chapters；驗收：tests/components/faction/FactionEditor.history.test.ts 驗證 updatedAt 更新與 history append
- [x] 2.26 撰寫 src/components/faction/FactionMembersView.vue 反映 character.factionId 變動，落實 Faction membership tracking；驗收：tests/components/faction/FactionMembersView.test.ts 模擬第三位角色加入後成員數即時變為 3
- [x] 2.27 撰寫 src/components/worldview/WorldviewEditor.vue 編輯 novel.json 內 worldview entries；驗收：tests/components/worldview/WorldviewEditor.test.ts 驗證 entry CRUD
- [x] 2.28 撰寫 src/components/workspace/SwitchNovelConfirmDialog.vue 未儲存編輯時 save/discard 提示；驗收：tests/components/workspace/SwitchNovelConfirmDialog.test.ts 驗證 save、discard、cancel 三路徑
- [x] 2.29 撰寫 src/views/ChapterView.vue 整合 ChapterTabs、SceneEditor、ParticipantPicker、ChapterEditor、Branch 入口；驗收：tests/views/ChapterView.test.ts 驗證從開啟到編輯到另存為分支的完整 flow
- [x] 2.30 在 main process spawn 包裝層設定強制 UTF-8 環境變數，緩解 Windows code page 950 與 UTF-8 衝突風險；驗收：tests/electron/spawnEnv.test.ts 驗證 spawn 取得的 env 含必要的 UTF-8 設定（檔案 I/O 與子行程 stdout 皆 UTF-8 無 BOM 污染）

## 3. Stage C — AI 整合

- [x] 3.1 撰寫 src/services/ai/aiAdapter.ts 定義 AiAdapter abstract interface 與共享型別匯出；驗收：tsc 通過 + tests/services/ai/aiAdapter.contract.test.ts 以 type-level assertion 守住介面
- [x] 3.2 撰寫 src/services/ai/codexAdapter.ts 採 child_process.spawn 呼叫 codex CLI，落實 Codex CLI adapter via child_process；驗收：tests/services/ai/codexAdapter.test.ts 以 mock spawn 覆蓋 happy stdout、ENOENT → CliUnavailableError、非 0 exit → CliExecutionError 三案例（CLI 不可用時 fallback：拋對應錯誤交由 useAiInvoker 處理）
- [x] 3.3 撰寫 src/services/ai/claudeAdapter.ts 採 child_process.spawn 呼叫 claude CLI，落實 Claude Code adapter via child_process；驗收：tests/services/ai/claudeAdapter.test.ts 同上三案例（CLI 不可用時 fallback：拋對應錯誤）
- [x] 3.4 撰寫 src/services/ai/errors.ts 定義 CliUnavailableError、CliExecutionError、UnknownRoleError；驗收：tsc 通過 + 對應 adapter 測試覆蓋拋出路徑
- [x] 3.5 撰寫 tests/integration/no-llm-http.test.ts 對 src 與 electron 目錄 grep 各 LLM 廠商 endpoint，落實 No direct HTTP calls to LLM vendor APIs 與 D3：隱私為規格層級硬約束（永不外傳）；驗收：對 api.anthropic.com、api.openai.com、generativelanguage.googleapis.com 三 host 各 0 個 match
- [x] 3.6 撰寫 src/composables/useAiInvoker.ts 串接 AiResolver 與 adapter 並把 CliUnavailableError / CliExecutionError 轉為 CliFallbackDialog 流程，落實 CLI unavailable surfaces to UI as a recoverable prompt 與 D14：CLI 不可用採跳提示讓使用者確認後手動切換；驗收：tests/composables/useAiInvoker.test.ts 覆蓋 Codex fail → 使用者選 Claude → 成功、兩 CLI 都 fail、使用者取消三路徑
- [x] 3.7 撰寫 src/components/ai/CliFallbackDialog.vue 顯示 retry / switch / cancel 三選項；驗收：tests/components/ai/CliFallbackDialog.test.ts 驗證三按鈕事件
- [x] 3.8 撰寫 src/services/ai/aiResolver.ts 實作 Four-tier resolver 並回傳 hitLayer + reason，落實 D5：AI 切換採 4 層 resolver；驗收：tests/services/ai/aiResolver.test.ts 對 paragraph → role → character → global 各層命中與 fallback 共四案例 + UnknownRoleError 案例
- [x] 3.9 撰寫 src/services/ai/roles.ts 列舉 plot-driver / character-voice / worldbuilding / character-design / outline-assistant / consistency-auditor 六個常數，落實 Six functional roles each individually bindable 與 D6：6 個 AI 職能皆可獨立綁定 Codex 或 Claude；驗收：tests/services/ai/roles.test.ts 驗證列舉與 UnknownRoleError 對未知值
- [x] 3.10 撰寫 src/components/ai/AiBindingPanel.vue 讓使用者設定 paragraph / role / character / global 綁定；驗收：tests/components/ai/AiBindingPanel.test.ts 驗證綁定寫入對應 store / repository 且 hitLayer 變動
- [x] 3.11 撰寫 src/components/ai/SuggestionSourceBadge.vue 顯示 hitLayer + reason，落實 Hit layer surfaced to UI；驗收：tests/components/ai/SuggestionSourceBadge.test.ts 對 hitLayer='role' 渲染「本次由 Claude 產生（職能綁定）」字串
- [x] 3.12 撰寫 src/services/ai/relevance.ts 計算 slice 相關性分數；驗收：tests/services/ai/relevance.test.ts 涵蓋 keyword overlap、faction proximity、present-characters 加權三規則
- [x] 3.13 撰寫 src/services/ai/contextAssembler.ts 組裝 AssembledContext 六層，落實 Six-layer context structure 與 D15：上下文採智慧挑選 6 層；驗收：tests/services/ai/contextAssembler.test.ts 驗證六層皆存在、空場景時 presentCharacters=[] 與 chapterScene 為空物件
- [x] 3.14 在 contextAssembler 加入相關性 threshold 與 token budget，落實 Smart selection by relevance score 與 Token budget enforcement；驗收：tests/services/ai/contextAssembler.budget.test.ts 覆蓋 budget 切尾（S1+S2 進入、S3 跳過）與單一過大 slice 跳過並寫入 assemblerDiagnostics.skipped 兩案例
- [x] 3.15 在 contextAssembler 內部依（score desc, id asc）穩定排序，落實 Deterministic ordering within layers；驗收：tests/services/ai/contextAssembler.deterministic.test.ts 對相同輸入兩次呼叫結果 deep-equal
- [x] 3.16 撰寫 src/services/ai/promptBuilder.ts 將 AssembledContext + role + user prompt 組成最終字串；驗收：tests/services/ai/promptBuilder.test.ts 驗證六層順序與分隔符
- [x] 3.17 撰寫 src/components/ai/SuggestionPanel.vue 顯示建議內容、來源 badge、「給我建議」按鈕，落實 D8：主動性採按鈕被動觸發 + 強建議內容；驗收：tests/components/ai/SuggestionPanel.test.ts 驗證未按按鈕不觸發 invoke、建議內容必含具體方案欄位
- [x] 3.18 撰寫 src/services/ai/proactivityResolver.ts 計算實際採用主動性，落實 D9：主動性可調整層級採全域 / 小說 / 角色三層 fallback；驗收：tests/services/ai/proactivityResolver.test.ts 覆蓋角色→小說→全域 fallback、「跟隨上層」與「關」兩個特殊值
- [x] 3.19 撰寫 src/components/ai/ProactivitySettings.vue 提供三層設定 UI；驗收：tests/components/ai/ProactivitySettings.test.ts 驗證寫入對應 store
- [x] 3.20 撰寫 src/views/CollaborationModeSelectView.vue 啟動時讓使用者選陪寫 / 代筆 / 自動，落實 D7：協作模式啟動時自選 + 自動模式採互動長度頻率混合判斷；驗收：tests/views/CollaborationModeSelectView.test.ts 驗證三選一 + 寫入 store
- [x] 3.21 撰寫 src/services/ai/autoModeRouter.ts 於自動模式下依互動長度與頻率微調強度，落實 D7 自動模式邏輯；驗收：tests/services/ai/autoModeRouter.test.ts 覆蓋長 input → 偏代筆、短 input → 偏陪寫、高頻短 input → 維持陪寫三案例
- [x] 3.22 撰寫 src/components/ai/ChatPanel.vue（陪寫模式對話 UI）；驗收：tests/components/ai/ChatPanel.test.ts 驗證 message append 與 scroll behavior
- [x] 3.23 撰寫 src/components/ai/DocumentEditPanel.vue（代筆模式 AI 直接生文插入 UI）；驗收：tests/components/ai/DocumentEditPanel.test.ts 驗證 AI 文字插入位置與 undo 行為
- [x] 3.24 撰寫 src/services/consistency/auditor.ts 接收候選 + AssembledContext + novel state 並回傳 AuditFinding[]，落實 Dry-run before AI response is shown 與 D10：一致性檢查採回應前 dry-run + 5 類偵測 + 與使用者協商；驗收：tests/services/consistency/auditor.dryRun.test.ts 覆蓋空 findings 通過、非空 findings 阻擋兩案例
- [x] 3.25 撰寫 src/services/consistency/detectors/oocDetector.ts，落實 Five consistency categories detected (ooc)；驗收：tests/services/consistency/detectors/oocDetector.test.ts 各一 positive 與 negative 案例
- [x] 3.26 撰寫 src/services/consistency/detectors/abilityDetector.ts (unexplained-ability)；驗收：對應 positive + negative 兩案例
- [x] 3.27 撰寫 src/services/consistency/detectors/relationshipDetector.ts (relationship-conflict)；驗收：對應 positive + negative 兩案例
- [x] 3.28 撰寫 src/services/consistency/detectors/worldviewDetector.ts (worldview-conflict)；驗收：對應 positive + negative 兩案例
- [x] 3.29 撰寫 src/services/consistency/detectors/timelineDetector.ts (timeline-conflict)；驗收：對應 positive + negative 兩案例，含已死角色復現
- [x] 3.30 撰寫 src/services/consistency/inconclusive.ts 判定 inconclusive，落實 Inconclusive findings do not block；驗收：tests/services/consistency/inconclusive.test.ts 驗證 missing context slice 觸發 inconclusive 且不阻擋
- [x] 3.31 撰寫 src/components/consistency/ConflictDialog.vue 三選一動作，落實 User negotiation dialog with three actions；驗收：tests/components/consistency/ConflictDialog.test.ts 驗證 rewrite / update-setup / ignore 三按鈕對應流程
- [x] 3.32 撰寫 src/services/consistency/auditIgnoreRecord.ts 持久化 ignore 紀錄；驗收：tests/services/consistency/auditIgnoreRecord.test.ts 驗證寫檔路徑與內容
- [x] 3.33 撰寫 src/services/consistency/muteManager.ts 提供 mute N (1/3/5) chapters 機制，落實 Mute consistency category for a chapter range；驗收：tests/services/consistency/muteManager.test.ts 覆蓋 1/3/5 章視窗、到期解除
- [x] 3.34 撰寫 src/components/consistency/InconclusiveWarning.vue；驗收：tests/components/consistency/InconclusiveWarning.test.ts 驗證警告渲染
- [x] 3.35 在 useAiInvoker 整合 auditor.dryRun，依結果 show / dialog / warning；驗收：tests/integration/aiInvoker-audit.test.ts 覆蓋 clean、findings、inconclusive 三路徑
- [x] 3.36 撰寫 tests/integration/auditor-no-mutation.test.ts 比對 fixture 前後 fs snapshot，落實 Never auto-modify novel state；驗收：測試通過，確認 auditor 不會 mutate 任何 character/chapter/faction/worldview 檔
- [x] 3.37 撰寫 electron/ipc/aiHandlers.ts 註冊 ai.invoke 與 consistency.dryRun IPC，於 main process spawn 處整合 D14 fallback；驗收：tests/electron/ipc/aiHandlers.test.ts 以 mock spawn 驗證 success、ENOENT、非 0 exit 三案例（檔案 I/O 強制 UTF-8 無 BOM、子行程 env 強制 UTF-8）
- [x] 3.38 撰寫 src/services/ai/recovery.ts 統一 CLI 不可用時的 retry / switch / cancel 邏輯；驗收：tests/services/ai/recovery.test.ts 覆蓋三路徑
- [x] 3.39 撰寫 src/composables/useSuggestionRequest.ts 整合 resolver + assembler + invoker + auditor 的高層 API（含 CLI fallback）；驗收：tests/composables/useSuggestionRequest.test.ts 端到端 mock 涵蓋成功、CLI 失敗、findings 三路徑
- [x] 3.40 撰寫 src/composables/useAutoMode.ts 觀察輸入長度與頻率以驅動 autoModeRouter；驗收：tests/composables/useAutoMode.test.ts 驗證模式切換閾值
- [x] 3.41 在 ChatPanel 與 DocumentEditPanel 整合 useSuggestionRequest；驗收：tests/integration/chat-and-doc-panel.test.ts 端到端驗證從使用者按鈕到顯示建議的完整流程（含 CLI 失敗的 fallback 對話路徑）
- [x] 3.42 撰寫 src/services/ai/bindingRepository.ts，將 paragraph / role / character 綁定寫入 novel 資料夾，落實 Binding storage on the active novel；驗收：tests/services/ai/bindingRepository.test.ts 驗證寫入路徑落在 novel 資料夾、檔案內容 UTF-8 無 BOM、與機器無關
- [x] 3.43 撰寫 src/services/ai/globalDefaultStore.ts 將 global default 寫入 user-level settings；驗收：tests/services/ai/globalDefaultStore.test.ts 驗證跨小說一致、跨機器獨立
- [x] 3.44 撰寫 docs/ai-binding-flow.md 圖文說明 hitLayer 決策樹；驗收：手動審閱 + 文件結構通過 markdownlint
- [x] 3.45 撰寫 src/services/ai/cliDetection.ts 偵測 codex / claude 是否可用並回報原因；驗收：tests/services/ai/cliDetection.test.ts 覆蓋已安裝 / 不存在 / 無執行權限三路徑
- [x] 3.46 撰寫 src/views/SettingsView.vue 含 CLI 路徑、global default、proactivity、collaboration mode 設定；驗收：tests/views/SettingsView.test.ts 驗證寫入 user settings 且 UI 即時反映
- [x] 3.47 撰寫 src/components/ai/AiInvocationLog.vue 顯示最近 N 次 invocation 的 hitLayer / reason / 結果；驗收：tests/components/ai/AiInvocationLog.test.ts 驗證渲染最多 N 筆且新→舊排序
- [x] 3.48 在 main process spawn 設定執行 timeout 與最大 stdout buffer 上限（含 CLI 不可用 fallback：超時即拋 CliExecutionError 進入 D14 流程）；驗收：tests/electron/ai/spawnSafety.test.ts 驗證超時拋 CliExecutionError、buffer 上限保護
- [x] 3.49 撰寫 tests/lint/no-llm-http-rule.test.ts 對 ESLint rule 做單元測試，呼應 D3 與 No direct HTTP calls to LLM vendor APIs；驗收：rule 對 fixture 命中與不命中各驗一次
- [x] 3.50 在 SuggestionPanel 串接 SuggestionSourceBadge、InconclusiveWarning 與 ConflictDialog 三狀態（含 CLI fallback 對話路徑）；驗收：tests/integration/suggestion-panel-states.test.ts 端到端覆蓋三狀態 + CLI fallback 流轉
- [x] 3.51 撰寫 src/services/ai/contextDiagnostics.ts 暴露 assemblerDiagnostics 給除錯面板；驗收：tests/services/ai/contextDiagnostics.test.ts 驗證 skipped slice 列表
- [x] 3.52 撰寫 src/components/dev/ContextDiagnosticsPanel.vue 顯示哪些 slice 被剔除與原因；驗收：tests/components/dev/ContextDiagnosticsPanel.test.ts 驗證渲染
- [x] 3.53 撰寫 src/services/ai/aiInvocationHistory.ts 持久化最近 N 次 invocation 至 user-level；驗收：tests/services/ai/aiInvocationHistory.test.ts 驗證上限與排序
- [x] 3.54 撰寫 src/components/ai/RetryWithOtherCliPrompt.vue 整合至 CliFallbackDialog；驗收：tests/components/ai/RetryWithOtherCliPrompt.test.ts 驗證三選項 propagation
- [x] 3.55 撰寫 tests/integration/aiResolver-fixture.test.ts 以真實檔案 fixture 端到端驗證 binding 解析；驗收：測試對四層 binding fixture 各一案例
- [x] 3.56 撰寫 tests/integration/contextAssembler-realNovel.test.ts 以 fixture 小說資料驗證六層完整輸出；驗收：測試通過
- [x] 3.57 撰寫 docs/architecture.md 對齊 design.md 的 介面 / 資料形狀（Interface / Data Shape）、失敗模式（Failure Modes）、驗收（Acceptance Criteria）三節；驗收：手動審閱 + markdownlint
- [x] 3.58 撰寫 src/services/ai/redact.ts 於 spawn 前對 prompt 做基礎 sanitize；驗收：tests/services/ai/redact.test.ts 驗證敏感字串移除
- [x] 3.59 在 promptBuilder 注入 role-specific instructions 與「行為（Behavior）」描述段；驗收：tests/services/ai/promptBuilder.role.test.ts 對六個 role 各驗一次注入文字
- [x] 3.60 撰寫 tests/integration/cli-recovery.test.ts 模擬 Codex 失敗 → 使用者選 Claude → 成功（CLI 不可用 fallback 整合測試）；驗收：測試通過
- [x] 3.61 撰寫 tests/integration/audit-three-paths.test.ts 涵蓋 rewrite / update-setup / ignore 三路徑端到端；驗收：測試通過
- [x] 3.62 撰寫 tests/integration/auto-mode-pacing.test.ts 模擬輸入長度與頻率變化、驗證自動模式採用值；驗收：測試通過
- [x] 3.63 撰寫 tests/integration/proactivity-fallback.test.ts 驗證三層 fallback 在實際 store 下行為；驗收：測試通過
- [x] 3.64 撰寫 README.md 描述 D4：採單一 change 模式 + 5 階段組織共約 150 task 的開發節奏與貢獻指南；驗收：手動審閱 + README 包含 5 階段概觀
- [x] 3.65 撰寫 tests/integration/scope-boundary.test.ts 對應 design.md 的 範圍邊界（Scope Boundaries），驗證 In scope 五大核心服務模組存在、Out of scope 功能（例如多章合併匯出、雲端同步）未被引入；驗收：測試通過

## 4. Stage D — 進階追蹤

- [x] 4.1 撰寫 src/services/evolution/personalityDetector.ts，落實 Detect personality drift after each AI invocation 與 D13：角色性格演化採 AI 偵測 + 建議使用者更新（不自動寫回）；驗收：tests/services/evolution/personalityDetector.test.ts 對「市井狡黠 vs 捨命相護」與「無偏移」兩案例各驗一次
- [x] 4.2 撰寫 src/services/evolution/driftLog.ts append JSONL 至 `<character-id>.drift-log.jsonl`，落實 Drift history retained for later review；驗收：tests/services/evolution/driftLog.test.ts 驗證 append-only、JSONL 格式、檔案 UTF-8 無 BOM
- [x] 4.3 撰寫 src/components/ai/DriftSuggestionPanel.vue 顯示 evidence 與 suggestedRewrite，落實 Suggest personality update without writing；驗收：tests/components/ai/DriftSuggestionPanel.test.ts 驗證顯示後檔案不變、三按鈕 propagation
- [x] 4.4 撰寫 src/services/evolution/applyDriftSuggestion.ts 三路徑處理，落實 User chooses whether to accept the suggested rewrite；驗收：tests/services/evolution/applyDriftSuggestion.test.ts 覆蓋 accept-as-suggested、edit-then-accept、dismiss 三路徑，驗證 dismiss 不改檔
- [x] 4.5 在 useSuggestionRequest 成功路徑上整合 personalityDetector；驗收：tests/integration/evolution-trigger.test.ts 確認接受 AI 回應後 detector 被呼叫一次
- [x] 4.6 撰寫 src/services/faction/situationHistory.ts append history.jsonl，落實 Update faction situation across chapters；驗收：tests/services/faction/situationHistory.test.ts 驗證 history append + 時戳 + UTF-8 無 BOM
- [x] 4.7 撰寫 src/components/faction/FactionSituationHistoryView.vue 顯示一行歷史；驗收：tests/components/faction/FactionSituationHistoryView.test.ts 驗證渲染順序為新→舊
- [x] 4.8 撰寫 src/services/faction/membershipView.ts 提供 derived membership 視圖，落實 Faction membership tracking；驗收：tests/services/faction/membershipView.test.ts 驗證 character.factionId 變動後成員列表立即反映
- [x] 4.9 撰寫 src/services/faction/factionSummarySlice.ts 提供 FactionSummarySlice 給 ai-context，落實 Faction summary feeds AI context；驗收：tests/services/faction/factionSummarySlice.test.ts 驗證僅含 presentCharacters 所屬 faction
- [x] 4.10 整合 factionSummarySlice 至 contextAssembler 並於對應 layer 暴露；驗收：tests/integration/faction-summary-in-context.test.ts 驗證 chapter 包含正確 faction summary slices
- [x] 4.11 撰寫 src/components/character/CharacterDriftLogView.vue 列出歷史 drift findings；驗收：tests/components/character/CharacterDriftLogView.test.ts 驗證渲染與分頁
- [x] 4.12 撰寫 src/components/character/DriftLogFilters.vue 提供按時間 / 是否採納 / 角色過濾；驗收：tests/components/character/DriftLogFilters.test.ts 驗證過濾邏輯
- [x] 4.13 撰寫 tests/integration/character-evolution-flow.test.ts 由 AI invocation 觸發 drift → 使用者 accept → 角色檔案更新；驗收：測試通過
- [x] 4.14 撰寫 tests/integration/faction-tracking-flow.test.ts 由 situation 更新 → history.jsonl append → 下次 ai-context 反映新值；驗收：測試通過
- [x] 4.15 撰寫 src/services/evolution/driftLogQuery.ts 查詢 drift log；驗收：tests/services/evolution/driftLogQuery.test.ts 驗證 by time、by action、by character 三查詢
- [x] 4.16 撰寫 src/services/faction/historyQuery.ts 查詢 faction history；驗收：tests/services/faction/historyQuery.test.ts 驗證查詢條件
- [x] 4.17 撰寫 src/components/character/PersonalityRewriteDialog.vue accept 時最後確認；驗收：tests/components/character/PersonalityRewriteDialog.test.ts 驗證確認後寫檔、取消後不寫檔
- [x] 4.18 撰寫 src/components/notifications/SuggestionToast.vue 非阻擋顯示 drift 建議；驗收：tests/components/notifications/SuggestionToast.test.ts 驗證不阻擋主流程
- [x] 4.19 撰寫 src/services/evolution/dismissalStore.ts 持久化 DriftDismissal；驗收：tests/services/evolution/dismissalStore.test.ts 驗證寫入路徑與內容
- [x] 4.20 在 NovelView 加上「人物演化」分頁整合 CharacterDriftLogView 與 DriftLogFilters；驗收：tests/views/NovelView.evolution-tab.test.ts 驗證分頁切換並顯示資料
- [x] 4.21 在 NovelView 加上「陣營狀態」分頁整合 FactionList、FactionEditor、FactionMembersView、FactionSituationHistoryView；驗收：tests/views/NovelView.faction-tab.test.ts 驗證分頁切換並顯示資料
- [x] 4.22 撰寫 docs/character-evolution.md 描述 personalityDetector 判斷規則與使用者決策流程；驗收：手動審閱 + markdownlint
- [x] 4.23 撰寫 tests/services/evolution/personality-no-auto-write.test.ts 確認 personalityDetector 與相關 UI 不會自動 mutate character 檔；驗收：fixture 前後 fs snapshot deep-equal
- [x] 4.24 撰寫 tests/services/faction/no-spurious-history.test.ts 確認未更動 situation 不會 append history line；驗收：測試通過
- [x] 4.25 撰寫 tests/services/faction/situation-history-utf8.test.ts 確認 history.jsonl 為 UTF-8 無 BOM；驗收：測試通過

## 5. Stage E — HTML 匯出

- [x] 5.1 撰寫 src/services/export/htmlExporter.ts 主流程接收 chapterId、format 並寫入 `exports/`，落實 Export a single chapter；驗收：tests/services/export/htmlExporter.test.ts 驗證寫入路徑與 self-contained 檢查、檔案 UTF-8 無 BOM
- [x] 5.2 撰寫 src/services/export/templates/epubLike.ts 內嵌 CSS、單欄排版、列印頁碼分頁規則，落實 Epub-like format uses inlined CSS for print-friendly reading 與 D11：HTML 匯出支援 epub-like 與網頁化雙格式；驗收：tests/services/export/templates/epubLike.test.ts 對 fixture 章節做 snapshot + 驗證無 `<link rel="stylesheet">`
- [x] [P] 5.3 撰寫 src/services/export/templates/webPage.ts 含側欄與章節導覽，落實 Web-page format includes sidebar with chapter navigation；驗收：tests/services/export/templates/webPage.test.ts 對 fixture novel 做 snapshot + 驗證側欄連結指向同目錄、未匯出顯示「尚未匯出」
- [x] 5.4 撰寫 src/components/chapter/ExportDialog.vue 讓使用者選格式（epub-like / web-page）並選分支；驗收：tests/components/chapter/ExportDialog.test.ts 驗證格式切換 + 分支選擇 propagation
- [x] 5.5 撰寫 src/services/export/branchExport.ts 對應 branch 匯出檔名規則，落實 Branch versions exportable explicitly；驗收：tests/services/export/branchExport.test.ts 驗證 chapter-3-branch-alt-pov-茅十八-epub-like.html 等檔名規則
- [x] 5.6 在 ExportDialog 與 ChapterEditor 整合 unsaved 提示，落實 Export uses the latest persisted chapter content；驗收：tests/components/chapter/ExportDialog.unsaved.test.ts 覆蓋未儲存→prompt→save→匯出 / cancel→不匯出兩路徑
- [x] 5.7 撰寫 electron/ipc/exportHandlers.ts 註冊 export.chapter IPC（含格式參數）；驗收：tests/electron/ipc/exportHandlers.test.ts 驗證 IPC 正確呼叫 htmlExporter 並回傳檔案路徑
- [x] 5.8 撰寫 src/services/export/selfContainedChecker.ts 檢查 HTML 無外部 src / href / @import；驗收：tests/services/export/selfContainedChecker.test.ts 覆蓋通過與失敗兩 fixture
- [x] 5.9 撰寫 tests/integration/export-epub-like.test.ts 端到端匯出 + snapshot；驗收：測試通過
- [x] 5.10 撰寫 tests/integration/export-web-page.test.ts 端到端匯出 + 側欄連結驗證；驗收：測試通過
- [x] 5.11 撰寫 tests/integration/export-branch.test.ts 端到端匯出 branch 並比對檔名；驗收：測試通過
- [x] 5.12 撰寫 src/components/chapter/ExportHistoryView.vue 列出 exports/ 目錄已匯出檔；驗收：tests/components/chapter/ExportHistoryView.test.ts 驗證列出與點擊打開行為
- [x] 5.13 撰寫 docs/export-formats.md 描述 epub-like 與 web-page 兩格式設計與使用情境；驗收：手動審閱 + markdownlint
- [x] 5.14 撰寫 tests/integration/no-network-in-export.test.ts grep 匯出 HTML 確認無 http(s):// 外部連結；驗收：測試通過
- [x] 5.15 在 README 增補使用者如何從工作目錄打開 exports/ 資料夾查閱章節 HTML；驗收：手動審閱

## 6. Stage F — 最終 Golden-Path 驗收

- [x] 6.1 撰寫 tests/e2e/golden-path.test.ts，使用 Electron 主行程與 renderer 端 fixture 模擬完整使用者旅程，對齊 design.md 驗收（Acceptance Criteria）的「建立小說 → 編輯角色與章節 → 匯出單章 → 比對檔案結構與內容」整段端到端流程，至少涵蓋下列步驟：(1) 啟動 App 並選擇工作目錄 → (2) 建立新小說「golden-path-novel」並寫入 worldview 與 overallOutline → (3) 建立兩個角色（含 personality、abilities、factionId、relationships）→ (4) 建立一個陣營並於 character.factionId 引用 → (5) 建立章節 3 含 outline、scene、presentCharacters → (6) 對章節 3 呼叫「給我建議」，使用 mock Codex CLI 適當 stdout，verify SuggestionPanel 顯示 hitLayer 與 reason → (7) auditor.dryRun 對候選回應產生 1 個 ooc finding，使用者點 ignore，verify AuditIgnoreRecord 寫入且小說檔未被自動修改 → (8) 「另存為分支」chapter 3 為 alt-pov，verify branches 目錄結構 → (9) 觸發 personalityDetector 對 mock 回應產生 drift suggestion，使用者選 accept-as-suggested，verify 角色檔 personality 欄位更新且 drift-log.jsonl 新增一行 → (10) 匯出章節 3 為 epub-like 與 web-page 兩格式，verify exports/ 目錄含兩檔、self-contained、UTF-8 無 BOM、web-page 側欄含全部章節；驗收：tests/e2e/golden-path.test.ts 跑完 10 步全部斷言通過、檔案系統前後比對符合預期、執行時間在 60 秒以內
