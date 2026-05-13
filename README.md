# Spectra 小說創作助手

本機 AI 輔助小說創作桌面 App（Vue 3 + TypeScript + Tailwind + Electron）。

所有資料留在本機，AI 互動只透過子行程呼叫本機 CLI（Codex CLI 或 Claude Code），不直接呼叫任何 LLM 廠商 HTTP API。

## 1. 環境準備

- **Node 20+**（本機已驗證 v24.14）
- **pnpm 9+**
- **Codex CLI 或 Claude Code**（任一個本機 CLI，AI 功能會透過子行程呼叫）

## 2. 安裝相依

```bash
pnpm install
pnpm approve-builds --all   # 首次安裝後核可 electron / esbuild postinstall
```

## 3. 開發流程指令

```bash
pnpm dev           # 純 Vite dev server（瀏覽器預覽）
pnpm electron:dev  # Vite + Electron 桌面視窗（實際開發用這個）
pnpm test          # 跑 249 個 vitest 測試
pnpm tsc           # 兩個 tsconfig 都 typecheck
pnpm lint          # ESLint（含自製 no-llm-http rule）
pnpm format        # Prettier 檢查
pnpm format:write  # 套用 Prettier 改寫
pnpm build         # 產出 dist/ + dist-electron/
```

## 4. 第一次跑 App 的 golden path

1. `pnpm electron:dev` → 開啟桌面視窗
2. **WorkspaceSelectView** → 挑選工作目錄（例：`D:\Novels`）
3. **HomeView** → 列出該目錄下的小說；首次為空
4. 建立新小說（透過 IPC `workspace:create`）→ workspace 下生出 `<novel>/novel.json` + `characters/`、`chapters/`、`factions/`
5. **CollaborationModeSelectView** → 選陪寫 / 代筆 / 自動
6. **NovelView** 五分頁切換：角色、章節、陣營、世界觀、設定
7. 編輯章節：必須先寫 outline，content 欄位才會啟用
8. 在 ChapterView 按「給我建議」→ 走 `useSuggestionRequest`：
   - AiResolver 決定用 Codex 還是 Claude（依 4 層 binding：段落 → 職能 → 角色 → 全域）
   - ContextAssembler 組六層 context（世界觀 / 角色 / 整體劇情 / 在場角色 / 章節大綱 / 章節場景）
   - 呼叫對應 CLI 子行程
   - 回應前 `auditor.dryRun` 檢查 5 類一致性（OOC / 能力憑空 / 關係矛盾 / 世界觀矛盾 / 時間線錯亂）
9. 偵測到不一致時跳 ConflictDialog → rewrite / 修改設定 / 忽略 三選一
10. 「另存為分支」→ `<novel>/chapters/<id>.branches/`
11. 匯出章節 HTML（epub-like 或 web-page）→ `<novel>/exports/`

## 5. 打包成可執行檔

```bash
pnpm pkg
```

⚠ **Windows 需先開啟「開發人員模式」**（設定 → 系統 → 開發人員選項）才能讓 `electron-builder` 解 `winCodeSign` cache 內的 symlink。

開啟後 `release/` 會生出 NSIS 安裝檔（Windows）或 dmg（macOS）。

## 6. 匯出章節 HTML

每本小說的 `exports/` 子目錄會放所有已匯出 HTML：

- Windows：透過檔案總管打開 `<workspace>\<小說名稱>\exports`
- macOS：Finder 打開 `<workspace>/<小說名稱>/exports`

兩種匯出格式：

- **epub-like**：單檔內嵌 CSS、列印 friendly、適合 ePub reader
- **web-page**：含側欄章節導覽、相對連結指向同目錄、適合本機瀏覽

詳細格式說明見 `docs/export-formats.md`。

## 7. 關鍵約束

- **隱私硬約束**：所有 AI 互動只能透過本機 CLI 子行程，禁止直接呼叫 LLM HTTP API（由 `eslint-plugin-local/no-llm-http` + `tests/integration/no-llm-http.test.ts` 雙重把關）
- **檔案格式**：所有 JSON 與 history.jsonl 一律 UTF-8 無 BOM
- **TDD**：新增 service / adapter 必須先寫測試
- **不自動寫回**：personality drift 偵測後只建議，使用者點 accept 才會真的改 character 檔
- **不自動 fallback**：CLI 不可用時跳 dialog 讓使用者選 retry / switch / cancel

## 8. Spectra 工作流（規格相關）

```bash
spectra list                       # 列出 active changes
spectra status --change <name> --json
spectra task done --change <name> <id>
spectra archive <change>           # 完成後固化 specs
```

對應 Claude Code 的 slash command：

- `/spectra-discuss`：討論方向
- `/spectra-propose`：建立提案 + 規格
- `/spectra-apply`：實作任務
- `/spectra-ingest`：把外部討論納回提案
- `/spectra-archive`：完成後固化
- `/spectra-ask`：查詢既有 specs

## 9. 5 階段開發節奏

對應 design.md D4：採單一 change 模式 + 5 階段組織共約 150 task 的開發節奏。

- **Stage A** 專案骨架與基礎工具鏈：package.json、tsconfig、vite、tailwind、eslint、vitest、electron main/preload、共用型別、UTF-8 encoding helper、自製 ESLint rule（禁 LLM endpoint）
- **Stage B** 資料層與 CRUD UI：novel / character / chapter / faction repository + IPC handler + Pinia store + 全部 CRUD 元件
- **Stage C** AI 整合：AiAdapter / AiResolver / ContextAssembler / ConsistencyAuditor / 5 類一致性檢查
- **Stage D** 進階追蹤：人格演化偵測、陣營狀態歷史
- **Stage E** HTML 匯出：epub-like / web-page 兩格式單章匯出
- **Stage F** 最終 Golden-Path 驗收：tests/e2e/golden-path.test.ts

## 10. 貢獻指南

1. 變更前先用 `/spectra-discuss` 或 `/spectra-propose` 建立規格
2. 實作走 TDD：先測試後實作
3. 所有 JSON / Markdown 寫檔強制 UTF-8 無 BOM
4. AI 整合一律走子行程，禁止直接呼叫 LLM 廠商 HTTP API
5. 新增技術相依需走 propose 流程，不可在 apply 階段臨時加裝

## 11. 目錄結構

```
src/
  components/      Vue SFC（按功能領域分群）
  composables/     可重用 hook
  services/        無框架的 TS 服務（adapter、repository、auditor 等）
  stores/          Pinia store
  types/           純型別宣告
  views/           Top-level views
electron/
  main.ts          BrowserWindow 啟動 + IPC 註冊入口
  preload.ts       contextBridge 暴露 window.api
  ipc/             各領域 IPC handler
  ai/              spawn safety / timeout 控制
tests/
  components/, views/, stores/, services/, electron/, integration/, lint/, e2e/
openspec/
  changes/         change proposals + 規格
  specs/           固化的 capability specs
docs/              架構說明文件
```
