## Context

`build-novel-app-v1` 與 `wire-novel-app-shell` 兩個 change 共同建立了「主行程 IPC handler 期望小說資料夾絕對路徑為輸入、渲染端透過 `window.api.*` 呼叫」的契約。內部試用時暴露六大類使用者問題，追蹤後可歸納為四個獨立根因：

- **根因 A**（影響五個症狀）：渲染端把 `novel.id`（UUID）誤當小說資料夾路徑傳給 IPC handler。`App.vue` 的 `activeNovelId` computed 回傳 `Novel.id`；下游五個 tab 與 `ChapterView` 對外 prop 命名為 `:novel-id`，外觀像對的東西，但實際與 IPC handler 期望的字串語意不符，導致 ENOENT 形狀為「app cwd 加上 UUID 加上 novel.json」。
- **根因 B**：陣營成員檢視元件從未實作 CRUD UI，只渲染唯讀清單。
- **根因 C**：設定頁的 CLI 執行檔路徑既無持久化、也無自動偵測，使用者每次重開都從空白開始。
- **根因 D**：資料層多處用 try / catch 吞所有讀檔錯誤回空陣列，讓 list 失敗時 UI 顯示為「沒資料」，掩蓋了根因 A 的多處症狀。

`openspec/LANGUAGE.md` 標準術語：本 change 全程使用「角色」「全域」「主行程」「渲染端」「IPC handlers」「資料層」「職能」「主動性層級」。discuss 階段出現的「腳色」「全領」屬 vocabulary drift，已在本 change 統一回標準詞。

使用者已對齊：角色與陣營允許 N-N（多陣營）關係；CLI 路徑首次自動偵測、後續開啟時 revalidate；「全域 / 本小說」只補說明文字不改架構；章節區「另存為分支」「給我建議」「匯出 HTML」三按鈕納入本 change 驗收。

## Goals / Non-Goals

**Goals:**

- 渲染端「小說識別」字串與 IPC handler 期望的小說資料夾路徑對齊，使五項 CRUD「按下沒反應」與 `novel:read` ENOENT 同時消失。
- `Character` schema 由單一 `factionId` 擴張為 `factionIds: string[]`，並提供讀檔時的 in-place migration。
- 陣營成員檢視元件補齊成員加入與移除 CRUD，操作後立即在列表反映且不影響該角色與其他陣營的關聯。
- 設定頁的 CLI 路徑透過主行程的 CLI 偵測模組自動偵測 Codex CLI 與 Claude Code、持久化到 Electron userData 目錄、每次開啟先做存在性 revalidate、使用者手動覆寫永遠優先。
- 設定頁加入「全域設定」與「本小說設定」兩層分組標題與一行說明文字（純文案）。
- 資料層 list 函式僅吞 ENOENT，其他錯誤往上拋。
- 以 TDD 補 IPC 路徑形狀的單元測試斷言，避免 prop 名重整後再次悄悄錯位。

**Non-Goals:**

- 不引入新的 `novel:*` / `character:*` / `chapter:*` / `faction:*` IPC channel。例外是 `settings:cli:read` / `settings:cli:write` / `settings:cli:autoDetect` 三個新 channel。
- 不為「世界觀」拆獨立 capability。
- 不引入「主要陣營」「優先序」之類的衍生欄位。
- 不變更 `AiResolver` 四層 fallback 邏輯。
- 不為 `factionId` 至 `factionIds` 設計雙寫、alias 期、漸進 migration；一次性 in-place。
- 不重新設計設定頁資訊架構。

## Decisions

### Decision: 渲染端以小說資料夾絕對路徑作為小說識別

`App.vue` 新增 `activeNovelDir` computed（取代 `activeNovelId`），由 workspace store 的 `workspaceRoot` 與 `activeNovelName` 拼成；五個 tab 與 `ChapterView` 對外 prop 由 `:novel-id` 改名為 `:novel-dir`；所有 `window.api.*` 第一個字串參數一律是小說資料夾絕對路徑。

替代方案：

- 替代方案 1（IPC handler 端做 id 至 dir 反查）被拒：需 scan workspace 才能反查、使用者搬移資料夾後失效、增加每次 IPC 的 I/O 成本。
- 替代方案 2（保留 prop 名 `:novel-id` 但讓它裝路徑）被拒：誤導性命名讓下一位開發者再犯。
- workspace store 已是 `workspaceRoot` 加 `activeNovelName` 的唯一 source of truth，直接從這裡拼路徑最直白。

### Decision: 角色與陣營改為陣列關係 factionIds

`Character` schema 把 `factionId: string | null` 替換為 `factionIds: string[]`。`CharacterEditor` 補多選控制（依 factionRepository.list 結果產生選項）。所有 `factionId === thisFactionId` 的比對改為 `factionIds.includes(thisFactionId)`。

替代方案：

- 替代方案 1（中介檔 character_factions.json）被拒：多一份檔案、跨檔同步成本、檔案系統佈局更複雜。
- 替代方案 2（保留 `factionId` 加 `secondaryFactionIds[]`）被拒：「主／次」語意人為、查詢時兩處 OR、未來再擴張時更亂。
- 「角色屬多個對等陣營」與資料模型的字串陣列最自然對映。

### Decision: 舊資料一次性 in-place migration

characterRepository.read 讀入時若偵測到舊欄位 `factionId`，做以下轉換：

- `factionId` 為非空字串至 `factionIds = [factionId]`
- `factionId` 為 `null` 或缺欄位至 `factionIds = []`
- 同時含兩者：採用 `factionIds`，記錄 warn log，不阻擋讀檔

characterRepository.write 只寫新欄位；下次寫盤時舊欄位徹底消失。讀檔不會自動回寫；migration 在下次 write 時自然完成。

替代方案：

- 替代方案 1（雙寫一段時間後切換）被拒：本機 app 沒有 zero-downtime 約束、雙寫只是延長混亂期。
- 替代方案 2（同時加 `schemaVersion`）被拒：本次先不加，列入 Open Questions；若未來再有 schema 變動再導入。
- Trade-off：使用者若回退到舊版 app，新檔的 `factionIds` 會被舊驗證器拒絕。可接受，因為本機桌面 app 通常只裝一版。

### Decision: CLI 路徑持久化放在 Electron userData

cliSettingsRepository 操作 Electron 主行程 userData 目錄下的 cli.json 檔案。

替代方案：

- 替代方案 1（放 workspace state）被拒：CLI 安裝跟機器綁，跟使用者切換 workspace 無關；放 workspace 會逼使用者每換 workspace 都重設。
- 替代方案 2（與既有 workspaceStateRepository 合併）被拒：workspace state 是「上次開哪個 workspace」、cli settings 是「機器層級 CLI 設定」，合併會混淆關注點。

### Decision: CLI 自動偵測策略

cliDetector 模組（位於主行程 `electron/ai/cliDetector.ts`）提供 `detectCli(name): Promise<string | null>`：

- Windows：先 spawn `where <name>`；找不到再依序檢查 `%APPDATA%\\npm\\<name>.cmd`、`%LOCALAPPDATA%\\Programs\\<name>\\<name>.exe` 等常見位置。
- POSIX：先 spawn `which <name>`；找不到再依序檢查 `~/.npm/global/bin/<name>`、`/usr/local/bin/<name>`、Homebrew bin 等。
- 找到第一個存在且可執行的回傳；全部失敗回 null。

替代方案：

- 替代方案 1（要求使用者每次手動填）被拒：UX 差，本次抱怨的就是這條。
- 替代方案 2（啟動時掃整個磁碟）被拒：太慢且擾民。
- 替代方案 3（只看 PATH 不做 fallback）被拒：npm global 與 Homebrew 安裝在某些 shell 設定下可能不在 GUI app 繼承的 PATH 內。

### Decision: revalidate 採 fs.access 不做版本探測

每次開啟時對持久化路徑做 fs.access，存在即視為有效；不額外 spawn 子行程跑 `--version`。

替代方案：

- spawn `--version` 二次驗證會多 100ms 到數百 ms 的啟動延遲，效益對 99% 案例不顯著。
- 真的破損的 CLI（檔案存在但無法執行）會在第一次實際使用時失敗，由 `ai-adapters` 既有的 CLI-unavailable 對話框處理。
- 列入 Open Questions，未來若回報「fs.access 通過但 CLI 失敗」案例再加。

### Decision: 資料層 list 函式僅吞 ENOENT

listNovels、listChapters、listCharacters、listFactions 把 catch-all 改為僅吞 ENOENT，其他錯誤往上拋。

替代方案：

- 替代方案 1（一律 throw）被拒：找不到資料夾是正常情況（剛建立 workspace 還沒小說）。
- 替代方案 2（一律吞）被拒：本次 bug 已證實這條路會藏問題；list 回空陣列、UI 顯示「沒資料」，使用者完全無從察覺真實是 IPC 餵錯了路徑。

### Decision: IPC payload 在 renderer 端先攤平成純物件（不依賴 preload）

實機回歸時於 WorldviewTab 新增條目觸發 `Uncaught Error: An object could not be cloned.`。根因是 Electron 在 `contextIsolation: true` 下，當 renderer 透過 `window.api.<domain>.<method>(...)` 呼叫 preload 暴露的函式時，V8 會在「跨 context bridge 邊界」當下對每個參數做 structured clone，而 Vue 3 reactive 是 ES Proxy，proxy 物件無法被結構化克隆。preload 內已有的 `plain()` JSON round-trip 是在 preload context 內執行，**位於 structured clone 之後**，救不了這段。

因此本 change 在 renderer 端引入 `src/services/ipc/toPlain.ts`，於每個 `window.api.<domain>.write|save` 呼叫前對 payload 做 `JSON.parse(JSON.stringify(...))` 攤平，並保留 preload 端 `plain()` 作為主行程方向的雙保險。

替代方案：

- 替代方案 1（保留 preload 端 plain 而不動 renderer）被拒：preload 端 plain 在 structured clone 之後執行，救不了 renderer-to-preload 那段，本次 bug 已證實。
- 替代方案 2（每個 tab 各自 inline `JSON.parse(JSON.stringify(payload))`）被拒：六個呼叫點散落多處，少寫一處就會復發；helper 單一定義能由 grep 與型別系統共同把關。
- 替代方案 3（在 ipcRenderer 上做 monkey-patch）被拒：超出 contextBridge 邊界、與 Electron 安全模型衝突。

### Decision: 以 TDD 補 IPC 路徑形狀斷言

每個 `window.api.<domain>.write / read / list / delete` 至少一條測試斷言「第一個參數以 workspaceRoot 為前綴、以 activeNovelName 為末段」（容忍 OS 路徑分隔符差異）。本斷言在主修法實作前先紅燈，再實作渲染端 prop 重整使其變綠燈。

替代方案：

- 替代方案 1（型別系統用 branded type）被拒：分支型別在 Vue prop 與 IPC bridge 處仍需強制轉換，會被繞過。
- 測試斷言可在 CI 攔截、不依賴開發者紀律。

## Implementation Contract

### Behavior (observable)

使用者完成以下操作後資料寫盤並在 UI 立即反映；應用重啟後依然存在：

1. 世界觀分頁新增、編輯、刪除條目。
2. 既有角色點開編輯、修改任一欄位、按儲存。
3. 既有陣營點開編輯、修改任一欄位、按儲存。
4. 陣營「查看成員」面板加入新成員、移除既有成員；同一角色可同時隸屬多個陣營，加入或移除單一陣營不影響其他陣營關聯。
5. 章節新增後，按左側 SceneEditor 的「儲存場景」按鈕寫入 Scene 欄位；按右側 ChapterEditor 的「儲存」按鈕寫入 outline 與 content。
6. 章節「另存為分支」對話框確認後在 ChapterBranchList 出現新分支。
7. 章節「給我建議」啟動既有 suggestion-request 流程，回應走 `consistency-audit` dry-run 路徑後顯示在 SuggestionPanel。
8. 章節「匯出 HTML」啟動既有 `chapter-export` IPC 流程並產出檔案。
9. 首次開啟應用時，若 Electron userData 目錄下的 cli.json 不存在或欄位空白，主行程自動偵測 Codex CLI 與 Claude Code 的可執行檔位置、寫盤、回填到設定頁；後續開啟時對已持久化路徑做 fs.access 存在性檢查，失效則重跑偵測。
10. 設定頁顯示「全域設定（套用所有小說）」與「本小說設定」兩層分組標題，並各有一行說明文字標示語意域。

### Interfaces / Data Shapes

**Character JSON schema 變更**

Before：

    {
      "id": "c-xxx",
      "name": "韋小寶",
      "personality": "...",
      "abilities": [],
      "appearance": "...",
      "factionId": "f-abc" | null,
      "socialStatus": "...",
      "relationships": [],
      "notes": "",
      "createdAt": "...",
      "updatedAt": "..."
    }

After：

    {
      "id": "c-xxx",
      "name": "韋小寶",
      "personality": "...",
      "abilities": [],
      "appearance": "...",
      "factionIds": ["f-abc"],
      "socialStatus": "...",
      "relationships": [],
      "notes": "",
      "createdAt": "...",
      "updatedAt": "..."
    }

**characterRepository 讀檔行為**

- 讀入物件含 `factionIds` 至 直接採用。
- 讀入物件含 `factionId` 而無 `factionIds` 至 轉換為 `factionIds`（非空字串 至 單元素陣列；null 或缺欄位 至 空陣列）。
- 讀入物件同時含 `factionId` 與 `factionIds` 至 採用 `factionIds`，記錄一條 warn log（不阻擋讀檔）。

**characterRepository 寫檔行為**

- 寫盤 payload 只包含 `factionIds`，不寫 `factionId`；既有檔的 `factionId` 在 write 後消失。
- 寫盤改用 atomic（先寫 .tmp 再 rename）以避免中斷造成半新半舊狀態。

**渲染端 prop 契約**

- 五個 tab 與 `ChapterView` 對外 prop 由 `:novel-id`（接收 `Novel.id`）改為 `:novel-dir`（接收小說資料夾絕對路徑，由 `workspaceRoot` 與 `activeNovelName` 拼成）。
- 渲染端任何 `window.api.<domain>.<method>(novelDirArg, ...)` 呼叫的第一個字串參數一律是小說資料夾絕對路徑。

**新 IPC channels（主行程）**

- `settings:cli:read` 至 回傳 `{ codex: string | null, claude: string | null, lastDetectedAt: string | null }`。
- `settings:cli:write` 至 接收同上形狀寫盤；回傳寫入後的物件。
- `settings:cli:autoDetect` 至 觸發 cliDetector 對 Codex CLI 與 Claude Code 各跑一次偵測，將結果寫盤；回傳寫入後的物件。

**新模組**

- cliDetector（主行程 `electron/ai/cliDetector.ts`）：`detectCli(name): Promise<string | null>`，純函式、無副作用。
- cliSettingsRepository（`src/services/files/cliSettingsRepository.ts`）：`read()` 與 `write(payload)`，對 Electron userData 目錄下的 cli.json 做 UTF-8 無 BOM 讀寫。
- settingsHandlers（`electron/ipc/settingsHandlers.ts`）：註冊上述三個 channel 到 ipcMain。

**資料層錯誤策略**

- listNovels、listChapters、listCharacters、listFactions 僅吞 ENOENT 回空陣列；任何其他錯誤往上拋。

### Failure modes

- 渲染端拿到的 `novelDir` 為 null（尚未選小說）：IPC 呼叫前 guard，不發 IPC、UI 維持空狀態。
- IPC handler 收到 `novelDir` 指向不存在的資料夾：repository 的 read 系列依舊拋 ENOENT；UI 顯示錯誤提示而非靜默。
- cliDetector 在所有策略後仍找不到：回 null，UI 在對應欄位顯示「未偵測到，請手動指定」並仍允許使用者按儲存。
- 既有 `factionId` 字串指向已刪除的 faction：migration 不嘗試修復、不刪除孤兒，保留為 `factionIds = [oldFactionId]`；陣營面板的成員查詢自然不會列出，使用者可在角色編輯介面手動清除。
- 寫盤過程被中斷：repository 寫盤改用 .tmp + rename atomic 寫法。

### Acceptance criteria

**自動化測試（先紅燈再實作）：**

1. 對每個 `window.api.<domain>.<method>` 的 renderer 或元件測試至少一條 `expectPathLike(workspaceRoot, activeNovelName)` 斷言；含 novel.read/write、character.list/read/write/delete、chapter.list/read/write/delete/branch.list/save/activate、faction.list/read/write/delete、export.chapter。
2. characterRepository 單元測試：
   - 給定檔案含 `factionId: "abc"` 而無 `factionIds`，read 後物件 `factionIds === ["abc"]`。
   - 給定 `factionId: null`，read 後 `factionIds === []`。
   - 給定同時含兩者，read 採用 `factionIds`。
   - 任意 write 後檔案不再含 `factionId` 欄位。
3. cliSettingsRepository 單元測試：read 不存在的檔案回 `{ codex: null, claude: null, lastDetectedAt: null }` 不丟例外；write 後 read 結果一致。
4. cliDetector 單元測試：以 mock 過的 where / which 子行程驗證 PATH 命中、PATH 落空加 fallback 命中、全部落空回 null 三條路徑。
5. 資料層 list 函式測試：給定資料夾不存在回空陣列；給定其他 I/O 錯誤往上拋且不被吞。

**手動實機驗收清單：**

開啟既存小說後，依序完成下列操作，每項均須觀察到資料寫盤且重啟後仍在：

- 世界觀分頁新增條目、編輯既有條目、刪除既有條目。
- 角色分頁點既有角色至 修改姓名、性格、外觀至 按儲存至 列表反映。
- 角色分頁編輯角色的 `factionIds` 多選至 儲存後 `<novel>/characters/<id>.json` 含正確陣列。
- 陣營分頁點既有陣營至 修改欄位至 儲存至 列表反映。
- 陣營「查看成員」加入既有角色（已屬其他陣營者也可），確認該角色 `factionIds` 同時含新陣營與既有陣營。
- 陣營「查看成員」移除既有成員，確認該角色 `factionIds` 移除本陣營但保留其他陣營。
- 章節分頁新增章節後，「儲存場景」與右側「儲存」各按一次，確認 chapter JSON 寫入。
- 章節內「另存為分支」對話框輸入名稱確認，新分支出現在 ChapterBranchList。
- 章節內「給我建議」觸發 suggestion 流程並顯示回應。
- 章節內「匯出 HTML」產出檔案。
- 首次啟動或刪除 cli.json 後重啟：設定頁 CLI 路徑欄位自動填入偵測值。
- 將 codex CLI 從原位置移走後重啟：設定頁的 codex 欄位重新觸發偵測。
- 手動填入自訂路徑並儲存後重啟：設定頁顯示自訂值，不被自動偵測覆寫。
- 設定頁可見「全域設定」與「本小說設定」分組標題並各有一行說明文字。

### Scope boundaries

**In scope:**

- 渲染端 prop 與 IPC handler 之間「小說識別」字串契約對齊。
- Character schema 由 `factionId` 改為 `factionIds`，含 in-place migration。
- 陣營成員檢視元件的成員加入與移除 CRUD。
- 設定頁的 CLI 路徑自動偵測加持久化加重啟 revalidate。
- 設定頁的「全域 / 本小說」分組標題與一行說明文字。
- 資料層 list 函式僅吞 ENOENT。
- 上述所有行為的測試斷言（單元 + IPC 路徑形狀）。

**Out of scope:**

- 引入新的 novel / character / chapter / faction IPC channel。
- 變更 AiResolver 四層 fallback 邏輯或既有 binding 儲存。
- 新增「主要陣營」「優先序」之類衍生欄位。
- 為「世界觀」拆獨立 capability。
- 雙寫期、alias 期、漸進 migration 策略。
- 設定頁資訊架構改版（控件位置、互動模式不動）。
- CLI 路徑的 spawn `--version` 二次驗證（列入 Open Questions）。

## Risks / Trade-offs

- [舊版 app 讀新檔失敗] 至 Mitigation：本機桌面 app 通常只裝一版；release notes 註記不支援回退。
- [cliDetector 在企業環境（PATH 經 wrapper、CLI 安裝在非標準位置）偵測失敗] 至 Mitigation：UI 顯示「未偵測到」提示，使用者手動填入後永遠優先。
- [fs.access 通過但 CLI 實際無法執行] 至 Mitigation：交由 `ai-adapters` 既有的 CLI-unavailable 對話框處理；若回報頻繁再考慮加 `--version` 驗證。
- [migration 寫盤中斷導致半新半舊] 至 Mitigation：write 改用 .tmp + rename atomic 寫法。
- [`factionIds` 含已刪除 faction 的孤兒 id] 至 Mitigation：列表查詢自然不會列出；使用者可在角色編輯介面手動清除；本次不自動清孤兒。
- [TDD 紅燈期間 CI 短時間失敗] 至 Mitigation：在同一個 PR 內紅燈至 實作至 綠燈，不長期紅。

## Migration Plan

- 不需要使用者操作；首次讀檔自動 migrate，下次寫檔自然完成。
- 既有 cli.json 不存在屬正常初始狀態；不需特殊處理。
- 回退策略：使用者若需回退到本 change 之前的版本，需手動把 character JSON 的 `factionIds: ["x"]` 還原為 `factionId: "x"`；release notes 明示。

## Open Questions

- 是否在 migration 同時為 character JSON 加 `schemaVersion: 2` 欄位以便未來再有 schema 變動時判別？目前傾向不加，等到第二次需要再導入。
- 是否要在 cliDetector 的 fs.access 之後加 spawn `--version` 二次驗證？目前不加，列入觀察。
