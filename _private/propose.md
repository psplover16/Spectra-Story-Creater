# 提案草稿 — fix-novel-id-and-settings-batch

> 本檔由 `/spectra-discuss` 從 `_private/discuss.txt` 收斂而成，供後續 `/spectra-propose` 建立正式 change 時引用。
>
> 用語遵循 `openspec/LANGUAGE.md`：使用「角色」（非「腳色」）、「全域」（非「全領」）、「渲染端 / 主行程 / IPC handlers / 資料層」等標準術語。

## 1. 為何需要這份提案（Why）

實機可驗證的六大類使用者抱怨，經 codebase scout 後發現其中五項共用同一個根因（`activeNovelId` 被當資料夾路徑傳遞），另外兩項分別是 UI 缺漏（陣營成員 CRUD）與設定面未持久化。集中修一次比個別 patch 划算，並能順帶補上目前讓 bug 完全漏網的測試斷言（IPC 路徑形狀沒被驗證）。

## 2. 使用者實際遭遇的問題（What's broken）

| # | 使用者描述（原文） | 推定根因 |
|---|-------------------|---------|
| 一-1 | CLI 執行檔路徑，每次開啟專案會自動填寫預設值（=不會記住上次填的） | C — 設定未持久化 |
| 一-2 | 「全域 / 本小說」這兩個功能是啥 | D — 設定頁 UX 缺少分組標題與說明 |
| 二 | `Error occurred in handler for 'novel:read': ENOENT ... <cwd>\<UUID>\novel.json` | **A — novelId 當路徑** |
| 三 | 點已建立角色進編輯頁，按儲存沒反應 | **A** |
| 四 | 世界觀無法 CRUD（畫面整塊沒渲染） | **A**（連帶導致 `novel.value === null`） |
| 五-1 | 陣營無法編輯 | **A** |
| 五-2 | 陣營「查看成員」沒辦法 CRUD | B — MembersView 本來就只是唯讀 |
| 六 | 章節可以新增，但「儲存場景」與右側「儲存」按鈕無反應 | **A** |

備註：問題二的瀏覽器 console 雜訊 `Unknown VE context: language-mismatch` 來自 Chromium DevTools 本身，與本專案無關，不處理。

## 3. 根因分析

### A. `activeNovelId` 是 `novel.id`（UUID），但被當作 `novelDir`（小說資料夾絕對路徑）

**證據鏈：**

- `src/App.vue:40`
  ```
  const activeNovelId = computed<string | null>(() => activeNovel.value?.id ?? null)
  ```
  `novel.id` 來自 `novelRepository.ts:33` 的 `randomUUID()`，正好對應錯誤訊息裡的 `32ee689d-b641-4f83-abea-6aea9feae143`。

- 所有 IPC handler 都把第一個字串視為**資料夾絕對路徑**：
  - `electron/ipc/novelHandlers.ts:5,8` → 直接呼叫 `readNovel(novelDir)` → 讀 `<novelDir>/novel.json`
  - `electron/ipc/characterHandlers.ts:11-22`
  - `electron/ipc/chapterHandlers.ts:15-26`
  - `electron/ipc/factionHandlers.ts:12-26`

- `src/App.vue:272-299` 把 `activeNovelId` 當 `:novel-id` 餵給四個 tab，tab 再轉手把它當 `novelDir` 餵進 IPC：
  - `WorldviewTab.vue:16` `window.api.novel.read(props.novelId)` → ENOENT（問題二、四）
  - `CharactersTab.vue:75` `character.write(props.novelId, payload)`（問題三）
  - `FactionsTab.vue:71` `faction.write(props.novelId, payload)`（問題五-1）
  - `App.vue:115` `chapter.write(activeNovelId.value, chapter)`（問題六）
  - `App.vue:137` `export.chapter(activeNovelId.value, ...)`（潛在問題）

- workspace store 已維護真正可解析的兩段：`workspaceRoot` + `activeNovelName`（`src/stores/workspace.ts:16-21`）。`novelRepository.ts` 的 `novelDir(workspaceRoot, name)` helper 就是用這兩個拼出來的，但渲染端沒有使用。

**為何問題二會跳出來、問題三/四/五-1/六只是「沒反應」？**

`novel:read` 是 promise reject 直接冒泡到 Electron 的全域 handler；而 `chapter:list` / `character:list` 等多半被 repository 內 `try/catch {}` 吞掉變空陣列（例：`novelRepository.ts:73-76`），UI 拿到 `[]` 後就靜悄悄什麼都沒發生。

### B. `FactionMembersView` 本來就沒 CRUD

`src/components/faction/FactionMembersView.vue:1-31` 只用 `computed` filter 後 `<ul>` 列出 `member.name`，沒新增/移除/挑選的 button 或 emit。使用者「無法 CRUD」的觀感是寫實的：這個元件本來就沒有 CRUD 能力。

### C. CLI 路徑沒持久化、缺自動偵測、缺重啟時 revalidate

`src/views/SettingsView.vue:11-22`
```
const cliPaths = reactive({ codex: '', claude: '' })
function save(): void { emit('saveCliPaths', { ...cliPaths }) }
```

接收端 `src/components/tabs/SettingsTab.vue:17-19` 只設 local `saved` ref，沒呼叫任何 repository 或 IPC 寫盤。每次 mount 都從空字串開始。

依使用者澄清，正確行為應為：

1. 預設欄位為空白。
2. **首次開啟應用**：主行程自動偵測本機 `codex` 與 `claude` CLI 的可執行檔位置（Windows 用 `where`，POSIX 用 `which`；含常見 npm global / brew / `%LOCALAPPDATA%` 路徑備援）→ 找到就持久化並回填到 UI。
3. **後續開啟**：讀回上次持久化的路徑 → 對該路徑做 `fs.access` 存在性檢查（必要時 `spawn --version` 確認可執行）→ 若失效，重跑步驟 2。
4. 使用者手動修改後按儲存，永遠覆蓋自動偵測結果（手動 > 自動）。

### D. Settings 頁的「全域 / 本小說」沒分組標題

`SettingsView.vue` 依序渲染：
1. CLI 執行檔路徑 fieldset（全域層級的概念，但沒寫清楚）
2. `<AiBindingPanel />` — 全域預設 + 職能綁定，影響所有小說
3. `<ProactivitySettings :novel-id="..." :character-id="null" />` — 本小說的主動性層級

三塊都沒有「全域 / 本小說」這種上層分組標題與說明文字。使用者看不出語意域。

## 4. 提議的修法

> 真正的 spec 條目與細節留到 `/spectra-propose` 時寫進 `specs/<capability>/spec.md` 與 `design.md`。下面先用實作角度列出方向，方便評估範圍。

### Fix-1（核心）：把渲染端用的「小說識別」改成資料夾路徑，而非 UUID

- `App.vue` 新增 `activeNovelDir` computed：
  ```
  computed(() => workspace.workspaceRoot && workspace.activeNovelName
    ? `${workspace.workspaceRoot}/${workspace.activeNovelName}`  // 或透過 helper
    : null)
  ```
  把現有 `activeNovelId` 全面替換（或保留 UUID 變數但不再傳遞）。對外 prop 由 `:novel-id` 改為 `:novel-dir`。
- 四個 tab 與 `ChapterView` 的 `defineProps` 同步改名。
- 影響面（grep 已掌握）：`CharactersTab`、`ChaptersTab`、`FactionsTab`、`WorldviewTab`、`SettingsTab`、`App.vue` 內 5 處 IPC 呼叫。
- 為何不在 IPC 端做 `id→dir` 反查：(1) 需 scan 整個 workspace 才能找回路徑；(2) 使用者搬移資料夾後 `id` 不變但路徑變，仍然會壞；(3) workspace store 已是 source of truth，多一層 lookup 反而增加失敗點。

### Fix-2：repository 不再靜默吞讀檔錯誤

- `listNovels` / `listChapters` / `listCharacters` / `listFactions` 把 `try { ... } catch {}` 改為僅吞 `ENOENT`（資料夾不存在），其他錯誤 propagate。
- 避免「list 回空陣列、UI 顯示空狀態」這種誤導性靜默失敗（這是讓問題三/五-1 漏網的關鍵）。

### Fix-3：陣營成員 CRUD（含 schema 由 1-N 改為 N-N）

依使用者澄清：**允許角色屬於多個陣營**。這是 breaking schema change，需要 migration 與 UI / spec / repository 同步更新。

**Schema 變更**：
- `src/types/character.ts`：`factionId: string | null` → `factionIds: string[]`
- `src/services/files/characterRepository.ts`：讀檔時若偵測到舊欄位 `factionId`，自動轉換
  - 有值（非 null）→ `factionIds: [factionId]`
  - null 或缺欄位 → `factionIds: []`
  - 寫檔時只寫新欄位，舊欄位移除（一次性 in-place migration）
- 驗證器更新：拒絕同時存在兩種欄位的混合狀態。

**影響面**：
- `src/components/character/CharacterEditor.vue`：原本沒有陣營欄位 UI，這次補多選控制（chip / checkbox list，依目前 `factionRepository.list` 結果填選項）。
- `src/components/tabs/FactionsTab.vue:11`（`FactionMembersView` 內也是同一行邏輯）：`c.factionId === props.factionId` → `c.factionIds.includes(props.factionId)`。
- `src/components/faction/FactionMembersView.vue`：補 CRUD
  - 「加入成員」：從尚未屬於本陣營的角色挑選 → `factionIds = [...current, thisFaction.id]` → `character.write`。
  - 「移除成員」：對列出的成員 `factionIds = factionIds.filter(id => id !== thisFaction.id)` → `character.write`。
  - emit `change` 給 `FactionsTab` 觸發 `reload`。
- `Faction.keyMembers` 維持不動（仍是「關鍵成員」摘要，與成員清單不同概念）。

**Source of truth** 仍是 `Character.factionIds`，`Faction.keyMembers` 為人工挑選的摘要欄位。

### Fix-4：CLI 路徑自動偵測 + 持久化 + 重啟 revalidate

行為（依使用者澄清）：

1. **主行程啟動 / Settings 頁 mount** → 讀 `app.getPath('userData')/cli.json`。
2. **若檔案不存在或欄位空** → 跑 `cliDetector` 自動偵測 → 寫盤 → 回傳給渲染端。
3. **若檔案有值** → 先 `fs.access` 驗證可執行檔仍存在（再可選 `spawn --version` 短 timeout 二次確認）→ 失效則重跑 `cliDetector` → 覆寫。
4. 使用者於 UI 手動編輯儲存 → 直接覆寫，跳過下一次的自動偵測（仍會做存在性 revalidate）。

**新增/異動檔案**：
- `electron/ai/cliDetector.ts`（新）：
  - Windows：`spawn('where', ['codex'])` / `spawn('where', ['claude'])`；fallback 檢查 `%APPDATA%\npm\codex.cmd`、`%LOCALAPPDATA%\Programs\...` 等常見位置。
  - POSIX：`which codex` / `which claude`；fallback `~/.npm/global/bin/`、`/usr/local/bin/` 等。
  - 找到第一個存在且可執行的回傳；找不到回 `null`。
- `src/services/files/cliSettingsRepository.ts`（新）：
  - schema: `{ codex: string | null, claude: string | null, lastDetectedAt: string }`
  - 位置：`app.getPath('userData')/cli.json`（非 workspace 範圍，跟機器綁）。
- `electron/ipc/settingsHandlers.ts`（新）或併入既有 `workspaceHandlers`：`settings:cli:read`、`settings:cli:write`、`settings:cli:autoDetect`。
- `SettingsView.vue`：mount 時呼叫 read → 若空回呼 autoDetect → 顯示「自動偵測中…」狀態 → 填入。手動儲存呼叫 write。

**為何放 `userData` 而非 workspace**：CLI 安裝隨機器走，跨 workspace 共用合理；放 workspace 會在使用者切 workspace 時逼他重設。

### Fix-5：Settings 分組標題與說明文字

`SettingsView.vue` 包兩層 fieldset：
- 「全域設定（套用所有小說）」：CLI 路徑、`AiBindingPanel`
- 「本小說設定」：`ProactivitySettings`

各加一行說明文字。純前端、純文案，零邏輯改動。

### Fix-6：補上 e2e / 元件測試的「IPC 路徑形狀」斷言

目前測試（推測）只 stub IPC 而沒驗證它被以正確路徑呼叫，這是 Fix-1 那組 bug 全部漏網的關鍵。新增測試樣式：
```
expect(api.character.write).toHaveBeenCalledWith(
  expectPathLike(workspaceRoot, novelName),
  expect.any(Object),
)
```
依 TDD，這條測試應在實作 Fix-1 之前先紅燈。

### Fix-7：章節區其餘按鈕的端對端驗收

依使用者澄清，章節區除「儲存場景」與右側「儲存」外，下列按鈕也須在本 change 內實測通過：

- **另存為分支**（`ChapterView.vue:119-124` → `SaveAsBranchDialog` → `App.vue:119 onSaveBranch` → `chapter.branch.save`）
- **給我建議**（`ChapterView.vue:135-140` → `SuggestionPanel` → `onRequestSuggestion` → 走 adapter bootstrap）
- **匯出 HTML**（`ChapterView.vue:141-148` → `ExportDialog` → `App.vue:131 onExportChapter` → `export.chapter`）

三條路徑都經過 `activeNovelId`，理論上 Fix-1 完成後會一起恢復，但**必須有實機點擊驗收與 IPC 路徑形狀斷言**，不可只靠「應該也好了」推論。納入 T1 的 acceptance checklist。

## 5. 範圍切割建議（給 tasks.md 用）

| Task | 範圍 | 可獨立交付？ |
|---|---|---|
| T1 | Fix-1（核心路徑修正）+ Fix-6（IPC 路徑斷言）+ Fix-7（章節其他按鈕實機驗收）；先紅燈再實作 | 是；解決問題二/三/四/五-1/六 |
| T2 | Fix-2 repository 不再靜默吞錯 | 是；獨立 PR，降低未來除錯難度 |
| T3 | Fix-3：character schema migration（factionId → factionIds[]）+ CharacterEditor 多選 + FactionMembersView 補 CRUD | 是；解決問題五-2，但 schema 變更跨 character / faction / spec 三處 |
| T4 | Fix-4 CLI 路徑：cliDetector + cliSettingsRepository + IPC + UI；含 revalidate 流程 | 是；解決問題一-1 |
| T5 | Fix-5 設定頁分組文案 | 是；解決問題一-2 |

**順序建議**：

1. T1 最優先（一次解五個症狀）。
2. T2 與 T1 可並行（甚至 T1 開發過程就會踩到 T2）。
3. T3 為 schema 變更，需單獨 PR、單獨檢視；建議晚於 T1（避免 schema migration 跟路徑修正混在同一個 PR 增加 review 負擔）。
4. T4、T5 與其他 task 完全獨立，可任意時序。

**T1 acceptance checklist**（給 tasks.md 直接抄）：

- [ ] 開啟既存小說 → 切到「世界觀」分頁，可新增 / 編輯 / 刪除條目，重啟後仍在
- [ ] 「角色」分頁點既存角色 → 修改任一欄位按儲存 → 列表立即反映；重啟後仍在
- [ ] 「陣營」分頁點既存陣營 → 修改欄位按儲存 → 反映
- [ ] 「章節」分頁新增章節後，左側「儲存場景」按下 → 寫盤；右側「儲存」按下 → 寫盤
- [ ] 章節內「另存為分支」可建立並列在 `ChapterBranchList`
- [ ] 章節內「給我建議」會觸發 suggestion 流程
- [ ] 章節內「匯出 HTML」可輸出檔案
- [ ] 自動化測試斷言：所有 `*.write` / `*.read` IPC 呼叫帶的 `novelDir` 必須以 `workspaceRoot` 為前綴並以 `activeNovelName` 為末段

## 6. 規格層需要修的能力（影響到的 capability）

> 這些是 spec.md 該寫的「使用者可觀察行為」骨架，CLI 路徑、檔案位置這類寫死細節留在 design.md。

- **novel/worldview**：使用者開啟小說後，「世界觀」分頁應能新增、編輯、刪除世界觀條目，並在重開應用後持續存在。
- **character**：使用者編輯既有角色並按儲存後，列表應反映變更；重開應用後仍存在。**角色可同時隸屬多個陣營（N-N）**。
- **faction**：使用者選擇陣營後可編輯欄位並儲存；「查看成員」面板應可加入 / 移除角色，操作後立即在列表反映；成員加入或移除不影響該角色與其他陣營的關聯。
- **chapter**：使用者按「儲存場景」應立即寫盤；右側「儲存」按鈕應寫入大綱與內文；「另存為分支」、「給我建議」、「匯出 HTML」三個入口在 active chapter 下皆可正常觸發對應動作。
- **settings/global**：
  - 使用者首次開啟應用時，應用應自動偵測本機可執行的 `codex` 與 `claude` CLI 路徑並持久化；使用者欄位若有先前持久化值，每次開啟應驗證該路徑仍可執行，否則重新自動偵測。
  - 使用者手動修改 CLI 路徑並儲存後，後續開啟應優先使用手動值（仍會做存在性驗證）。
- **settings/ux**：設定頁應清楚標示哪些設定影響「所有小說」、哪些只影響「本小說」。

## 7. Vocabulary drift（要在正式 propose 的 design.md 註記）

| `discuss.txt` 用語 | 標準用語 | 處理 |
|---|---|---|
| 腳色 | 角色 | 全文一律用「角色」 |
| 全領 | 全域 | 推測為打字錯誤；採 LANGUAGE.md 標準「全域」並與 `AiBindingPanel` 既有文案一致 |
| CLI 執行檔路徑 | — | 不是 spec 級術語；留在 design.md 與 UI 文案層 |

## 8. 使用者對齊紀錄（已完成）

| # | 原始問題 | 使用者答覆 | 已反映在哪 |
|---|---|---|---|
| 1 | CLI「自動填寫預設值」是哪種行為 | 預設空白；首次開啟自動偵測本機 codex / claude CLI 位置並記錄；下次開啟驗證該位置仍存在，否則重新偵測 | §3.C、§4 Fix-4、§6 settings/global |
| 2 | 「全域 / 本小說」要補說明還是改架構 | (a) 補說明文字即可 | §4 Fix-5（不動架構） |
| 3 | 角色 vs 陣營關係 | 允許角色屬於多陣營（N-N） | §4 Fix-3（含 schema migration）、§6 character / faction |
| 4 | 章節區其他按鈕是否一起驗收 | 要一起驗收 | §4 Fix-7、§5 T1 acceptance checklist |

---

## 收斂結論（Conclusion）

- **Decision**：把六類問題收斂為一份 change（暫名 `fix-novel-id-and-settings-batch`），由 5 個獨立 task 組成，T1 最優先（合併 Fix-1 / Fix-6 / Fix-7）；T3 為 schema 變更獨立交付；同時補 IPC 路徑斷言把這層 bug 永久關進測試網。
- **Rationale**：問題二/三/四/五-1/六 是同一個 `activeNovelId` 誤用根因，分開修是浪費；剩下三項各有獨立成因但範圍小。「角色多陣營」雖然只解問題五-2，但因涉及 schema migration，必須單獨成 task 並走完整 spec delta。
- **Next step**：使用者已對齊所有 clarifying questions，可直接執行 `/spectra-propose fix-novel-id-and-settings-batch`，由 propose skill 依本草稿生成 proposal.md / design.md / tasks.md / 五份 spec delta（worldview / character / faction / chapter / settings）。
