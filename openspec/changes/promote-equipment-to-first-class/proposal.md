## Why

剛完成的 `character-equipment-effects` change 把整個 EquipmentItem（含 overrides）塞進每個 Character 檔。實機回顧時暴露三個核心缺陷：

- **同一件裝備跨角色需重複建立**：「玉佩」存在於韋小寶、康熙、茅十八三個角色檔時，使用者必須在三個檔內各自輸入名稱與 default 描述，浪費編輯時間。
- **改一次裝備本體要逐檔同步**：玉佩的 defaultEffect 由「飾品」改成更精確的「無紋翡翠玉佩」時，三個角色檔都要逐一修改，容易遺漏。
- **「對角色的效果」語義過載**：目前 `overrides: Record<charId, string>` 用單一字串表達「該角色使用時的效果」，無法區分「真正效果」（取代 default）與「額外效果」（疊加在 default 之上）這兩種敘事上常見的情境。例如玉佩對韋小寶的「真正效果」是「康熙親賜信物」（取代「飾品」這個 default），但對韋小寶的「額外效果」是「進宮免搜身」（疊加在「信物」之上）。

使用者明確要求重構：裝備獨立為 first-class entity，角色端只持有 reference 加可選的「真正效果」與「額外效果」補充。

## What Changes

- **BREAKING — 新增 `<novel>/equipment/` 子目錄與 EquipmentItem first-class 檔結構**：每件裝備一個獨立 JSON 檔，含 `id`、`name`、`kind`、`defaultEffect`、可選 `notes` 五欄；**移除原本的 `overrides` 欄位**。
- **BREAKING — Character.equipment 由 `EquipmentItem[]` 改為 `EquipmentReference[]`**：每個 reference 含 `equipmentId: string`、可選 `realEffect: string`、可選 `extraEffect: string`。realEffect 非 undefined 時取代 defaultEffect；extraEffect 非 undefined 時疊加在已 resolve 的 effect 之上。
- **明確區分 realEffect 與 extraEffect 三種狀態**：
  - 欄位為 `undefined`：沿用上一層（realEffect 沿用 defaultEffect；extraEffect 不疊加）。
  - 欄位為 `''`（空字串）：明確標示為「無」（realEffect=空 → 真正效果為空字串；extraEffect=空 → 明確標示無額外效果）。
  - 欄位為非空字串：採用該字串作為真正效果或額外效果。
- 新增 IPC channel `equipment:list`、`equipment:read`、`equipment:write`、`equipment:delete` 四條，沿用既有 character／chapter／faction IPC 形狀。
- NovelView 新增「裝備」分頁，列出裝備庫並支援新增／編輯／刪除 EquipmentItem。命名與既有 chapters／factions／worldview 分頁同層。
- CharacterEditor 裝備區塊重構：使用者從裝備庫挑一件 → 加入 reference；reference 行內可填 realEffect、extraEffect 兩個 textarea；刪除 reference 不影響裝備本體。
- ContextAssembler 在組 CharacterSlice 時依 EquipmentReference 載入裝備本體並 resolve real／extra → 最終 effect 字串與旗標。dangling reference（指向已刪除的 equipmentId）以 console.warn 記錄並跳過，不阻擋 prompt 組裝。
- promptBuilder 在「# 2. 角色」段持有裝備子列表渲染雙效果：「裝備名稱（kind）：真正效果（如有）；額外效果：（如有）」。realEffect=undefined 時顯示 defaultEffect；extraEffect=undefined 時不渲染額外效果行；空字串顯示「（明確標示無）」對應提示。
- **BREAKING — 不自動轉換舊 `character-equipment-effects` 階段資料**：characterRepository 讀檔時若偵測 `equipment[].overrides` 含值，warn log 並把整個 equipment 陣列重設為空 reference 陣列；使用者重新從新版裝備庫建檔。Release notes 標明此 BREAKING。
- 完成 apply 後，建議 archive 既有 `character-equipment-effects` change，本 change 視為第二階段並覆蓋其 overrides 相關 spec。
- AI 互動仍透過子行程呼叫 Codex CLI 或 Claude Code；本 change 不變更 AiResolver 四層 fallback 行為，僅擴 ContextAssembler 與 promptBuilder 的資料形狀。

## Non-Goals

- 不引入「裝備耐久度」「消耗計數」「冷卻時間」這類動態狀態；本 change 為靜態描述模型。
- 不為「同一實體裝備跨角色流轉」設計 ownership transfer 流程；以 reference 取代。
- 不合併 `Scene.props` 與 `Character.equipment`；scene.props 是環境道具、equipment 是角色持有道具。
- 不為 EquipmentItem 引入圖片附件或外部資產欄位。
- 不自動 migrate 舊 `character-equipment-effects` 階段資料；BREAKING 改寫，舊 overrides 一律丟棄並 warn。
- 不在裝備本體內記錄「持有者列表」反向引用；持有者由 listCharacters 計算（避免雙寫不一致）。
- 不擴 abilityDetector 或新增「裝備使用合理性」detector；屬 consistency-audit 範圍，留待 follow-up change。
- 不為「workspace 全域裝備庫」做設計；裝備仍 per-novel scoped。
- 不在 CharacterEditor 內提供 inline 新建裝備功能；使用者需先到裝備分頁建好再回 CharacterEditor reference。
- 不主動偵測同名裝備重複；使用者自行管理裝備庫去重。
- 不為刪除裝備提供「列出受影響角色」確認 dialog；本 change 採 silent 刪除 + dangling warn 策略，反向引用 UI 留待 follow-up。

## Capabilities

### New Capabilities

- `equipment-management`：first-class 裝備庫的 CRUD（檔案結構、repository、IPC handler、UI 編輯）。

### Modified Capabilities

- `novel-data-model`：新增 `<novel>/equipment/` 子目錄與 EquipmentItem 檔結構；Character.equipment 由 EquipmentItem[] 改為 EquipmentReference[]；定義 BREAKING migration 規則（讀檔遇 overrides 欄位 warn 並重設）。
- `character-management`：CharacterEditor 裝備區塊由 EquipmentItem 編輯改為從裝備庫挑 reference + realEffect／extraEffect 雙補充。
- `ai-context`：CharacterSlice.equipment resolve 邏輯支援 real override 與 extra 疊加；dangling reference 處理；prompt 渲染雙效果。

## Impact

- Affected specs:
  - 新增：`equipment-management`
  - 修改：`novel-data-model`、`character-management`、`ai-context`
- Affected code:
  - 新增：
    - `src/types/equipment.ts`（重寫；EquipmentItem 移除 overrides、新增 EquipmentReference）
    - `src/services/files/equipmentRepository.ts`
    - `electron/ipc/equipmentHandlers.ts`
    - `src/components/equipment/EquipmentEditor.vue`
    - `src/components/equipment/EquipmentList.vue`
    - `src/components/tabs/EquipmentTab.vue`
    - `tests/services/files/equipmentRepository.test.ts`
    - `tests/electron/ipc/equipmentHandlers.test.ts`
    - `tests/components/equipment/EquipmentEditor.test.ts`
    - `tests/components/equipment/EquipmentList.test.ts`
    - `tests/components/tabs/EquipmentTab.test.ts`
    - `tests/components/character/CharacterEditor.referenceUi.test.ts`
    - `tests/services/ai/contextAssembler.equipmentReference.test.ts`
    - `tests/services/ai/promptBuilder.dualEffect.test.ts`
    - `tests/services/files/characterRepository.breakingMigration.test.ts`
  - 修改：
    - `src/types/character.ts`（equipment 型別變動）
    - `src/types/ai.ts`（CharacterSlice 與 ResolvedEquipment 介面改）
    - `src/services/files/characterRepository.ts`（BREAKING migration 改）
    - `src/services/files/paths.ts`（equipmentDir／equipmentFile）
    - `src/components/character/CharacterEditor.vue`（裝備區塊重構為 reference 選擇器）
    - `src/components/tabs/CharactersTab.vue`（傳裝備庫給 CharacterEditor）
    - `src/services/ai/contextAssembler.ts`（resolve 邏輯加 real／extra）
    - `src/services/ai/promptBuilder.ts`（雙效果渲染）
    - `src/views/NovelView.vue`（新分頁 equipment）
    - `src/App.vue`（注入 EquipmentTab）
    - `electron/preload.ts`（暴露 equipment.* api）
    - `electron/main.ts`（註冊 equipment handlers）
  - 移除：
    - 無（character-equipment-effects 階段補的 `equipment: []` 在多個既有測試檔內保持型別占位，但內容語義改變）
- AI 行為涉及方：Codex CLI、Claude Code 兩者皆可；本 change 不變更 AiResolver 四層 fallback，僅擴 prompt 資料形狀。
