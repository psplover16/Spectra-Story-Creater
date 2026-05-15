## Why

目前 `Character` schema 沒有「角色持有的裝備或道具」這個概念。`Scene.props` 是環境道具（桌上的茶杯、地上的長劍），語義上跟「角色身上持有並會主動使用的裝備」不同。小說情境下角色裝備是 plot 的重要載體（劍、玉佩、毒藥、令牌），AI 寫劇情時若沒有這層 context 容易讓角色「憑空變出」裝備（會被 abilityDetector 判為 OOC），或忽略某角色獨有的裝備效果。

關鍵特性：**同一件裝備在不同角色身上會有不同效果（甚至完全無效果）**。例如「玉佩」對一般人是飾品，對「韋小寶」是康熙親賜信物（額外身份識別效果），對「康熙」是調兵符（指揮效果），對「茅十八」可能完全沒有特殊效果。這個「per-character 覆寫」是核心需求，不能用單一 `effect` 字串表達。

## What Changes

- 新增 `EquipmentItem` 資料模型：含 `id`、`name`、`kind`、`defaultEffect`、`overrides`、可選 `notes` 六個欄位。`kind` 為 `'wearable' | 'consumable' | 'misc'` 三選一 enum。
- **BREAKING — Character schema 新增必填欄位 `equipment: EquipmentItem[]`**：既有檔案缺欄位讀檔時 in-place migration 補空陣列，寫檔一律輸出（含空陣列）；舊版 app 讀新檔不會失敗（多一個未認識欄位），但若用舊版 app 寫檔會把 `equipment` 抹掉。
- characterRepository 讀檔 migration：偵測 obj.equipment 不為陣列時補空陣列；偵測陣列內每個 item 缺欄位（id／name／kind／defaultEffect／overrides）時補預設值並 warn log。寫檔走既有 `.tmp` + rename atomic、UTF-8 無 BOM。
- CharacterEditor.vue 補「裝備」區塊：可新增／編輯／刪除多件 EquipmentItem。每件含 name 文字輸入、kind dropdown（三選一）、defaultEffect textarea、overrides 編輯區（從既存角色列表選 charId、輸入該角色使用時的效果描述、可標記「明確無效果」）。
- AI context 注入：`CharacterSlice` 新增 `equipment: ResolvedEquipment[]` 欄位（ResolvedEquipment 為「對該角色已 resolve 的效果」結構，含 name／kind／effect／hasEffect 四欄）；contextAssembler 在組 CharacterSlice 時依該 character 的 id 查 EquipmentItem.overrides 取覆寫、無覆寫則用 defaultEffect、覆寫為空字串時 hasEffect=false。
- promptBuilder 在「# 2. 角色」段每位角色名稱下加「持有裝備：」子列表，每件裝備一行含名稱與 resolve 後 effect（hasEffect=false 顯示「（對該角色無特殊效果）」）。
- 不擴一致性檢查 detector：「使用了沒持有的裝備」屬 abilityDetector 範圍，留下個 change。
- 不變更任何 IPC channel；沿用既有 `character:read` 與 `character:write`。

## Non-Goals

- 不擴 `abilityDetector` 或新增「裝備使用合理性」detector；留待 follow-up change 處理。
- 不引入「裝備耐久度」「消耗計數」「冷卻時間」這類動態狀態；本 change 只記錄「角色持有什麼」與「效果描述」，狀態變化由 chapter content 自然敘事承載。
- 不為「同一實體裝備跨角色流轉」設計 ownership transfer 流程；使用者用相同 `name` 在不同角色檔內重複建立即可，模型不強制 cross-character unique。
- 不合併 `Scene.props` 與 `Character.equipment`；兩者語義不同。
- 不為 EquipmentItem 引入圖片附件或外部資產欄位。
- 不對使用者既有角色檔做大量自動填值；migration 只補空陣列，使用者自行新增裝備。
- 不引入「裝備分類自訂 tag」；kind 固定三選一，需要更細分類由使用者寫在 name 或 notes。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `novel-data-model`：Character 檔案結構新增必填欄位 `equipment: EquipmentItem[]`，定義 EquipmentItem 結構與 in-place migration 規則。
- `character-management`：必填／可選欄位列表新增 equipment；CharacterEditor 補多件 EquipmentItem 編輯 UI、含 overrides 編輯。
- `ai-context`：CharacterSlice 新增 equipment 欄位、定義「對該角色已 resolve 的效果」計算規則；prompt 結構在角色段新增持有裝備子列表。

## Impact

- Affected specs:
  - 修改：`novel-data-model`、`character-management`、`ai-context`
- Affected code:
  - 新增：
    - `src/types/equipment.ts`
    - `tests/services/files/characterRepository.equipment.test.ts`
    - `tests/components/character/CharacterEditor.equipment.test.ts`
    - `tests/services/ai/contextAssembler.equipment.test.ts`
    - `tests/services/ai/promptBuilder.equipment.test.ts`
  - 修改：
    - `src/types/character.ts`
    - `src/types/ai.ts`
    - `src/services/files/characterRepository.ts`
    - `src/components/character/CharacterEditor.vue`
    - `src/components/tabs/CharactersTab.vue`
    - `src/services/ai/contextAssembler.ts`
    - `src/services/ai/promptBuilder.ts`
  - 移除：
    - 無
- AI 行為涉及方：Codex CLI、Claude Code 兩者皆可；裝備 context 與 AI source 選擇正交，AiResolver 既有四層 fallback 不動。
