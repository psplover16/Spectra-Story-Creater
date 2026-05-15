<!--
Each task description states the behavior or contract being delivered and the
verification target that proves completion. File paths are supporting context.
-->

## 1. IPC 路徑形狀斷言（TDD 紅燈先行）

- [x] 1.1 [P] 建立測試 helper `expectPathLike(workspaceRoot, novelName)`，斷言字串以 workspaceRoot 為前綴、以 novelName 為末段（容忍 OS 分隔符差異）。落實 design 中 Decision: 以 TDD 補 IPC 路徑形狀斷言（design 該決議）所述的共用工具。驗證：helper 有自身 unit test 涵蓋 Windows 路徑、POSIX 路徑、末段名稱不符三組輸入，皆通過。
- [x] 1.2 [P] 為 `window.api.novel.read` 與 `window.api.novel.write` 在 renderer 或元件測試中加入 `expectPathLike` 斷言；目前實作（傳 UUID）下這些斷言會 fail（紅燈），對齊 spec「Orchestrator novel identifier contract」。驗證：執行專案測試命令，斷言失敗訊息明示 first arg 不符 path-like 形狀。
- [x] 1.3 [P] 同 1.2 邏輯，為 `window.api.character.list/read/write/delete`、`window.api.faction.list/read/write/delete`、`window.api.chapter.list/read/write/delete`、`window.api.chapter.branch.list/save/activate`、`window.api.export.chapter` 補上 path-like 紅燈斷言；對齊 spec「Orchestrator novel identifier contract」。驗證：測試輸出列出多個紅燈案例，列表與目標 IPC channel 一一對應。

## 2. 渲染端「小說識別」契約對齊

- [x] 2.1 在 `src/App.vue` 以 workspace store 的 `workspaceRoot` 與 `activeNovelName` 拼出 `activeNovelDir` 並餵給五個 tab 與 `ChapterView`，落實 design 中 Decision: 渲染端以小說資料夾絕對路徑作為小說識別。驗證：1.x 紅燈斷言全數轉綠；grep 確認 `App.vue` 對外不再傳 `Novel.id`。
- [x] 2.2 `CharactersTab` / `ChaptersTab` / `FactionsTab` / `WorldviewTab` / `SettingsTab` / `ChapterView` 對外 prop 由 `:novel-id` 改名為 `:novel-dir` 並同步元件內所有使用點，對齊 spec「Orchestrator novel identifier contract」。驗證：`src/` 全域 grep 確認 `:novel-id` 與 `props.novelId` 不再出現；元件測試 prop assertion 已更新且通過。
- [x] 2.3 手動實機回歸：開啟既存小說，依序在世界觀、角色、陣營分頁完成新增、編輯、刪除動作，動作後資料寫盤、UI 立即反映、重啟應用後仍在。驗證：PR description 附 step-by-step 截圖或 console log，證明每項動作觸發對應 IPC channel 且 path-like 形狀正確。

## 3. 章節區其餘按鈕端對端驗收

- [x] 3.1 [P] 為「另存為分支」走完 `chapter.branch.save` path-shape 紅燈轉綠燈循環，並補一條 e2e 點擊測試確認 `ChapterBranchList` 出現新分支。對齊 spec「Orchestrator novel identifier contract」與既有 `workspace-management` 的 save-as-branch 行為。驗證：自動測試通過；手動實機點擊後在 chapters branches 目錄下生成 UTF-8 無 BOM 檔案。
- [x] 3.2 [P] 為「給我建議」補測試，確認 `SuggestionPanel` mount 且 suggestion-request composable 收到由 AiResolver 選出的 adapter；AI CLI 走 Codex CLI 或 Claude Code（依 `ai-switching` 四層 fallback），兩個 CLI 皆不可用時 fallback 至 `ai-adapters` 既有 CLI-unavailable 對話框。驗證：mock adapter 收到對應 role 的呼叫；CLI 不可用案例顯示既有 dialog；手動實機確認 dialog 文案存在。
- [x] 3.3 [P] 為「匯出 HTML」補測試，斷言 `window.api.export.chapter` 收到的第一參數為 path-like、第二參數為 chapterId，對齊 spec「Orchestrator novel identifier contract」與既有 `chapter-export`。驗證：自動測試通過；手動實機點擊產出檔案至使用者選定位置，輸出檔案為 UTF-8 無 BOM。

## 4. 資料層 list 函式僅吞 ENOENT

- [x] 4.1 [P] 把 `listNovels` / `listChapters` / `listCharacters` / `listFactions` 的 catch-all 改為僅吞 ENOENT，其他錯誤往上拋，落實 design 中 Decision: 資料層 list 函式僅吞 ENOENT。驗證：repository 單元測試新增「ENOENT 回空陣列」與「其他 I/O 錯誤往上拋且不被吞」兩條皆通過；既有 list 行為的綠燈測試不受影響；讀寫一律 UTF-8 無 BOM。

## 5. Character schema 從 factionId 改為 factionIds[]

- [x] 5.1 更新 `src/types/character.ts` 與 `CharacterDraft`，將 `factionId: string | null` 換為 `factionIds: string[]`，落實 design 中 Decision: 角色與陣營改為陣列關係 factionIds。驗證：`tsc --noEmit` 全專案編譯通過；type-level 測試（若有）斷言 Character 介面新形狀。
- [x] 5.2 在 `characterRepository.read` 加入 Decision: 舊資料一次性 in-place migration 對應邏輯：遇到舊欄位 `factionId` 而無 `factionIds` 時，依 spec「Character file structure」的 migration 表轉換，同時含兩者時採用 `factionIds` 並 warn log；讀寫一律 UTF-8 無 BOM。驗證：repository 單元測試新增四案例對應 migration 表四列、加上「同時含兩者」與「warn log 被觸發」皆通過。
- [x] 5.3 在 `characterRepository.write` 移除 `factionId` 欄位輸出並改用 `.tmp` + `rename` atomic 寫法，UTF-8 無 BOM。驗證：repository 單元測試斷言 write 後檔案不含 `factionId`、中斷模擬下不留下半新半舊狀態；既有 write 綠燈測試不受影響。

## 6. 角色多陣營 UI 與陣營成員 CRUD

- [x] 6.1 [P] `CharacterEditor.vue` 補多選陣營控制（依 `factionRepository.list` 結果產生 checkbox 或 chip），存檔時寫 `factionIds` 陣列，對齊 spec「Required character fields」與「Character list filtering by faction」的陣列語意。驗證：元件測試斷言可選多項、清空、儲存後 emit 物件含正確陣列；手動實機確認 character JSON 寫入正確。
- [x] 6.2 [P] `FactionMembersView.vue` 補成員加入與移除控制，對應 spec「Faction member CRUD from members view」三個 scenario：首次加入、移除保留他陣營、重複加入無變化。驗證：元件測試三條 scenario 皆通過；手動實機確認跨陣營關聯不受影響。
- [x] 6.3 [P] 把 `FactionsTab` 與其他使用 `c.factionId === ...` 等值比對的位置改為 `c.factionIds.includes(...)`，對齊 spec「Faction membership tracking」的陣列語意。驗證：grep 確認 `c.factionId ===` 與 `.factionId !=` 不再出現於 `src/`；既有 FactionsTab 元件測試（加上新斷言）綠燈。

## 7. CLI 路徑自動偵測加持久化加 revalidate

- [x] 7.1 [P] 新建 `electron/ai/cliDetector.ts` 提供 `detectCli(name)` 純函式，CLI 涵蓋 Codex CLI 與 Claude Code；Windows 先 spawn where、POSIX 先 spawn which，加 npm global、Homebrew、`%LOCALAPPDATA%` fallback；找不到回 null 不丟例外，CLI 不可用時的 fallback 策略為「持久化欄位寫 null 並由 UI 顯示『未偵測到』」。落實 design 中 Decision: CLI 自動偵測策略。驗證：mock 子行程的單元測試覆蓋 PATH 命中、PATH 落空加 fallback 命中、全部落空回 null 三條路徑，本任務不實際呼叫 Codex 或 Claude。
- [x] 7.2 [P] 新建 `src/services/files/cliSettingsRepository.ts` 讀寫 Electron userData 目錄下的 cli.json（UTF-8 無 BOM、`.tmp` + rename atomic），schema 為 `{ codex, claude, lastDetectedAt }`，落實 design 中 Decision: CLI 路徑持久化放在 Electron userData。驗證：repository 單元測試斷言 read 不存在時回 `{ codex: null, claude: null, lastDetectedAt: null }` 不丟例外、write 後 read 結果一致。
- [x] 7.3 新建 `electron/ipc/settingsHandlers.ts` 註冊 `settings:cli:read` / `settings:cli:write` / `settings:cli:autoDetect`，並把表面 expose 為 `window.api.settings.cli.*` 走 preload bridge。驗證：preload bridge 測試斷言三個方法皆可呼叫；IPC handler 測試覆蓋三條 channel 各一案例（含 autoDetect 寫盤後回讀）。
- [x] 7.4 在 `SettingsView.vue` mount 階段呼叫 `settings:cli:read`，若任一欄位 null 或 fs.access 失敗則觸發 `settings:cli:autoDetect`，UI 顯示「自動偵測中…」狀態與結果；對齊 spec「CLI executable path auto-detection and persistence」中「first launch」與「persisted path disappeared」scenario，並落實 design 中 Decision: revalidate 採 fs.access 不做版本探測。驗證：元件測試覆蓋三條 scenario（首次無檔、持久化檔仍有效、持久化檔失效）；手動實機把 codex CLI 移走後重啟確認觸發重偵測；當 Codex CLI 或 Claude Code 全部不可用時 UI 顯示「未偵測到」並仍允許手動填入。
- [x] 7.5 在 `SettingsView.vue` 加入「使用者手動儲存覆寫自動偵測」邏輯，按儲存呼叫 `settings:cli:write` 並更新 store；對齊 spec「CLI executable path auto-detection and persistence」中「manual override takes precedence」scenario。驗證：手動填路徑儲存後重啟，UI 顯示自訂值；自動偵測值與自訂值不同時不被覆寫；該行為由元件測試斷言並由手動實機複測。

## 8. 設定頁分組標題與說明文字

- [x] 8.1 在 `SettingsView.vue` 加入「全域設定」與「本小說設定」兩層 fieldset 並各補一行說明文字，CLI 路徑與 AiBindingPanel 歸入全域、ProactivitySettings 歸入本小說，對齊 spec「Settings page semantic grouping」。驗證：元件測試斷言 DOM 含兩個分組 heading、各控件落在正確 grouping；reviewer 對照設計確認文案以 UTF-8 無 BOM 存檔。

## 9. Release notes 與文件更新

- [x] 9.1 [P] 在專案 README 與 release notes 註記 character JSON schema 變更（`factionId` 改為 `factionIds`），明示一次性 in-place migration 行為與「不支援回退」風險，對齊 design 的「Migration Plan」段。驗證：文件以 UTF-8 無 BOM 存檔；reviewer 對照 design.md Migration Plan 確認文字完整。

## 11. IPC payload 結構化克隆相容

- [x] 11.1 新增 renderer-side helper `src/services/ipc/toPlain.ts`，以 JSON round-trip 把 Vue 3 reactive Proxy 攤平成可被 V8 structured clone 的純物件。對齊 spec「IPC payload must be structured-cloneable」。驗證：unit test 覆蓋 primitives／plain object／reactive proxy／ref.value 四案例皆通過；reactive proxy 直接 structuredClone 會丟錯、toPlain 後則不丟。
- [x] 11.2 將 toPlain 套用至所有 `window.api.<domain>.write|save` 呼叫端：`WorldviewTab.persist`、`CharactersTab.handleSave`、`ChaptersTab.createChapter`、`FactionsTab.handleSave`／`handleAddMember`／`handleRemoveMember`、`App.vue.onSaveChapter`、`App.vue.onSaveBranch`，避免 contextBridge 邊界 structured-clone 失敗。對齊 spec「IPC payload must be structured-cloneable」。驗證：WorldviewTab 元件測試新增「payload 必須能被 structuredClone」斷言通過；grep `window.api.*.write|save` 確認每一處 payload 參數皆已包 toPlain。

## 10. 統整自我檢查

- [x] 10.1 對照 design.md「Implementation Contract」段落逐項打勾：「Behavior (observable)」全部 10 條 user-observable 行為通；「Interfaces / Data Shapes」全部對齊（Character schema、prop 契約、新 IPC channels、新模組、資料層錯誤策略）；「Failure modes」全部覆蓋；「Acceptance criteria」自動化測試與手動實機驗收清單全部達成；「Scope boundaries」全部 In Scope 完成、Out of Scope 未越界。驗證：PR description 引用本 checklist 並逐項標記，reviewer 對照 design.md 確認。
