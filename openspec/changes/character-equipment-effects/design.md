## Context

本專案在 `build-novel-app-v1` 階段定義了 `Character` schema（personality／abilities／appearance／factionIds／socialStatus／relationships／notes），但沒有「角色持有的裝備或道具」概念。`Scene.props` 是章節環境道具，跟角色持有物分屬不同層次。

實機試用時暴露問題：AI 寫劇情時容易讓角色憑空變出裝備（會被 abilityDetector 視為「能力憑空出現」誤判），或忽略某角色獨有的裝備效果——例如玉佩對韋小寶是康熙親賜信物、對一般人只是飾品。

使用者已對齊核心需求：同一件裝備在不同角色使用時可能產生不同效果，甚至完全無效果。此種「per-character 覆寫」是 first-class 需求，不能用單一 effect 字串表達。

## Goals / Non-Goals

**Goals:**

- 引入 EquipmentItem 資料模型並存於 Character 內，提供 in-place migration 讓既有 character 檔安全升級。
- 支援「每件裝備一個 defaultEffect 加 N 個 per-character override effect」雙層表達，含「明確無效果」（override 為空字串）的精準語意。
- CharacterEditor 補多件裝備編輯 UI，使用者可新增／編輯／刪除裝備並為其他角色設覆寫效果。
- AI context（CharacterSlice）與 prompt 一併帶上裝備資訊：每位角色的裝備清單與「對該角色已 resolve 的效果」隨 context 進入 prompt，讓 AI 寫劇情時不會憑空變出裝備、也會正確使用角色獨有的效果。
- 整套變更不擴 IPC、不擴 detector、不變既有 schema 其他欄位、不引入第三方套件。

**Non-Goals:**

- 不擴 `abilityDetector` 或新增「裝備使用合理性」detector；留待 follow-up change。
- 不引入耐久度／消耗計數／冷卻時間等動態狀態；本 change 為靜態描述模型。
- 不為「同一實體裝備跨角色流轉」設計 ownership transfer；同名重複建立即可。
- 不合併 `Scene.props` 與 `Character.equipment`。
- 不為 EquipmentItem 引入圖片或外部資產欄位。
- 不引入裝備分類自訂 tag；kind 固定三選一。
- 不修改 IPC channel、不變更 chapter 或 faction 或 worldview schema。

## Decisions

### Decision: 裝備與道具合一為 EquipmentItem，以 kind enum 區分

EquipmentItem 不分裝備與道具兩個 model，改用單一 model + `kind: 'wearable' | 'consumable' | 'misc'` 三選一 enum 表達差異。小說情境下穿戴與消耗的差異主要由敘事承載（劍是穿戴、毒藥是消耗），不需要在 schema 層強制不同 fields。

替代方案：

- 替代方案 1（裝備與道具兩個 model）被拒：雙倍維護成本、UI 雙倍編輯區塊、schema 互轉複雜。
- 替代方案 2（一個 model 但無 kind 區分）被拒：使用者在大量裝備時無法快速分類查找；prompt 也無法給 AI 提示哪些是穿戴物哪些是消耗物。
- 替代方案 3（kind 為自訂字串）被拒：易拼錯、UI 沒法給 dropdown、與 abilityDetector 未來擴張難對齊。

### Decision: 裝備存於 Character.equipment 陣列（1-N 關係），不另設全域 inventory pool

EquipmentItem 直接放在 `Character.equipment: EquipmentItem[]`，每個角色檔自帶裝備清單；不為 novel 設一個共享 inventory 池。

替代方案：

- 替代方案 1（全域 inventory pool 加 characterId 索引）被拒：跨檔同步成本、檔案系統佈局更複雜、使用者編輯一個角色時要跳到其他檔操作。
- 替代方案 2（裝備存於 novel.json 內）被拒：本檔已含 worldview／factionsSummary／overallOutline 三大塊，再塞 equipment 會讓 novel.json 過度肥大。
- Trade-off：同一件「實體」裝備跨角色流轉時，使用者需在不同角色檔內重複建立同名 EquipmentItem，但這正好對應「每個角色持有自己那一份」的小說敘事語意。

### Decision: 效果用 defaultEffect 加 overrides 雙層表達，空字串視為明確無效果

每件 EquipmentItem 含：

- `defaultEffect: string`：一般人使用時的效果描述。
- `overrides: Record<string, string>`：key 為角色 id、value 為該角色使用時的效果描述。

Resolve 規則（contextAssembler 內計算）：

- 該角色 id 在 overrides 中：value 為空字串 → 「明確無效果」（ResolvedEquipment.hasEffect=false、effect=''）；value 非空 → 採用該 value（hasEffect=true、effect=value）。
- 該角色 id 不在 overrides 中：採用 defaultEffect（hasEffect=defaultEffect 非空、effect=defaultEffect）。

替代方案：

- 替代方案 1（在 Character 上記錄裝備覆寫，而不是 EquipmentItem.overrides）被拒：使用者編輯一件裝備時要跳到每個角色檔修改，UX 差；EquipmentItem-centric 編輯流程較直觀。
- 替代方案 2（用屬性匹配規則，如「持劍者得加攻擊」）被拒：需引入規則 DSL、與小說敘事彈性不符、難以表達「韋小寶獨有的玉佩信物」這類具體覆寫。
- 替代方案 3（用 `noEffect: string[]` charIds 列表）被拒：跟 effect overrides 分兩個欄位、需要 UI 同步、語意不一致。

### Decision: 在 CharacterSlice 中加入 equipment 欄位（ResolvedEquipment[]），不新增 top-level slice

ContextAssembler 不為「裝備」新增 top-level slice；而是在組裝 CharacterSlice 時，依該 character 的 id 計算 ResolvedEquipment list 並附在 CharacterSlice.equipment 欄位上。

替代方案：

- 替代方案 1（top-level equipment slice）被拒：增加七層 context 違反既有六層結構，且 AI 拿到 equipment 時無法直接連結回哪個角色用、需做 join、prompt 複雜。
- 替代方案 2（不放進 context、靠 AI 從章節 outline 自己推）被拒：違反本 change 主要動機（AI 寫劇情時憑空變出裝備）。

### Decision: prompt 「# 2. 角色」段加入持有裝備子列表

`promptBuilder` 在組「# 2. 角色」段時，每位角色名稱後加一行「持有裝備：」子列表，每件裝備一行：`- 裝備名稱（kind）：對該角色的有效效果`；若 hasEffect=false 顯示「（對該角色無特殊效果）」；無持有裝備時不渲染子列表（避免空段）。

替代方案：

- 替代方案 1（裝備列在獨立 prompt 段）被拒：與 Decision「CharacterSlice 內含 equipment」一致原則衝突；AI 需做 join 才能連結回角色，prompt 複雜。
- 替代方案 2（裝備不進 prompt，只進 CharacterSlice 給 detector 用）被拒：本 change 不擴 detector，因此 prompt 注入是讓 AI 寫劇情時不憑空變裝備的唯一管道。

### Decision: characterRepository 讀檔時補欠缺欄位，warn log 但不阻擋讀檔

對既有 character 檔做 in-place migration：

- 若 `equipment` 欄位缺或不為陣列：補 `[]`、不 warn（屬舊版常態）。
- 若 `equipment` 為陣列但 item 缺 `id`：補 `eq-${Date.now()}-${idx}` 並 warn log，不阻擋讀檔（避免單筆髒資料炸掉整個小說載入）。
- 若 item 缺 `kind`：補 `'misc'` 並 warn log。
- 若 item 缺 `defaultEffect`：補空字串並 warn log。
- 若 item 缺 `overrides`：補 `{}` 並 warn log。

寫檔走既有 `.tmp` + rename atomic、UTF-8 無 BOM；輸出時 `equipment` 一律寫陣列（含空陣列）。

替代方案：

- 替代方案 1（讀檔時對髒資料丟例外）被拒：使用者可能在多個檔案中有一個髒了，整個小說無法載入過於剛性。
- 替代方案 2（讀檔時不 migrate、由上層處理）被拒：repository 是 single source of truth，migration 集中在這裡符合既有 factionIds migration 慣例。

## Implementation Contract

### Behavior (observable)

1. 使用者於 CharacterEditor 看到「裝備（多件）」區塊，可新增一件裝備並填 name、kind、defaultEffect。
2. 使用者可為單件裝備加 override：選一個其他角色、輸入效果描述（或勾「明確無效果」讓 override value 為空字串），儲存後即生效。
3. 使用者按 CharacterEditor 的「儲存」按鈕後，角色檔 JSON 內出現 equipment 陣列，內含上述輸入。
4. 重啟 app 後 CharacterEditor 仍可正確顯示既有裝備（包括 overrides）。
5. 既有未含 equipment 欄位的角色檔在 mount 後依然可開、UI 顯示空裝備列表、儲存時自動補上 `equipment: []`。
6. 使用者於 ChapterView 按「給我建議」時，AI 收到的 prompt 內「# 2. 角色」段每位在場角色後出現持有裝備子列表，含對該角色 resolve 後的有效 effect（無 override 用 default、override 為空字串顯示「無特殊效果」）。
7. 一個未持有任何裝備的角色，在 prompt 內不出現「持有裝備：」子列表，不渲染空段。

### Interfaces / Data Shapes

**新增型別**：`src/types/equipment.ts`

    export type EquipmentKind = 'wearable' | 'consumable' | 'misc'

    export interface EquipmentItem {
      id: string
      name: string
      kind: EquipmentKind
      defaultEffect: string
      overrides: Record<string, string>
      notes?: string
    }

**修改型別**：`src/types/character.ts` 內 Character 介面新增

    equipment: EquipmentItem[]

CharacterDraft 同步新增該欄位。

**修改型別**：`src/types/ai.ts` 內 CharacterSlice 新增

    equipment: ResolvedEquipment[]

並新增

    export interface ResolvedEquipment {
      id: string
      name: string
      kind: EquipmentKind
      effect: string
      hasEffect: boolean
    }

**Repository migration（characterRepository.read）**：

讀入物件 `obj` 處理流程：

- `Array.isArray(obj.equipment)` 為 false → `equipment = []`。
- 為 true → 逐 item migrate：id 缺 → 補 `eq-${timestamp}-${idx}` 並 warn；kind 不在三選一 → 補 `misc` 並 warn；defaultEffect 缺 → 補 `''` 並 warn；overrides 非物件 → 補 `{}` 並 warn。

**CharacterSlice resolve 邏輯**（contextAssembler）：

對每位角色 c，迭代 c.equipment 計算 ResolvedEquipment：

- override 存在於 `c.equipment[i].overrides[c.id]` → effect = 該 override；hasEffect = override !== ''。
- override 不存在 → effect = c.equipment[i].defaultEffect；hasEffect = defaultEffect !== ''。

**Prompt 段（promptBuilder）**：

於既有「# 2. 角色（依相關性排序）」段，每位角色行下方插入子列表（若 c.equipment.length > 0）：

    持有裝備：
    - 裝備名稱（kind）：effect
    - 另一件裝備（kind）：（對該角色無特殊效果）

### Failure modes

- 讀檔遇到 equipment 為非陣列：補 `[]`，不丟例外、不 warn。
- 讀檔遇到 item 缺欄位：補預設值、warn log，不丟例外。
- 寫檔時 equipment 為 `undefined`：repository 補 `[]` 後輸出。
- CharacterEditor overrides 編輯時使用者選了不存在的 charId：本 change 不主動驗證，由使用者自行管理；資料層原樣寫入；contextAssembler resolve 時若 c.id 不在 overrides 等於 fallthrough 用 defaultEffect，無錯誤。
- contextAssembler 遇到 EquipmentItem 缺 kind（理論上 repository 已 migrate，但 belt-and-suspenders）：fallback 為 `'misc'`，不丟例外。
- promptBuilder 遇到 ResolvedEquipment.effect 為空字串且 hasEffect=false：顯示「（對該角色無特殊效果）」；hasEffect=false 但 effect 非空（理論上不應發生）：仍顯示 effect 字串並 console.warn。

### Acceptance criteria

- 單元測試 `tests/services/files/characterRepository.equipment.test.ts`：
  - 讀入舊檔（無 equipment 欄位）→ Character.equipment = [].
  - 讀入新檔（equipment 為陣列含完整 item）→ Character.equipment 與檔案一致。
  - 讀入髒檔（equipment 為陣列但 item 缺 id／kind／defaultEffect／overrides）→ migrate 後補預設值並 warn。
  - 寫檔後檔案 JSON 含 equipment 陣列。
- 元件測試 `tests/components/character/CharacterEditor.equipment.test.ts`：
  - 新增一件裝備並填 name／kind／defaultEffect → emit save 時 payload.equipment 含該件。
  - 為一件裝備加一個 override（角色 id 加 effect 字串）→ emit save payload 含 overrides[charId]=effect。
  - 把 override value 設為空字串（明確無效果）→ payload 含 overrides[charId]=''。
- 服務測試 `tests/services/ai/contextAssembler.equipment.test.ts`：
  - 角色 A 有裝備 X（defaultEffect='飾品'、overrides={'A': '信物'}）→ CharacterSlice[A].equipment[0] = { effect: '信物', hasEffect: true }。
  - 角色 B 持有同一件裝備（B 不在 overrides）→ CharacterSlice[B].equipment[0] = { effect: '飾品', hasEffect: true }。
  - 角色 C 持有同件裝備但 overrides[C]=''（明確無效果）→ ResolvedEquipment.effect=''、hasEffect=false。
- 服務測試 `tests/services/ai/promptBuilder.equipment.test.ts`：
  - CharacterSlice 含 equipment：prompt 「# 2. 角色」段該角色行下含子列表，每件裝備一行、含 kind 與 effect。
  - hasEffect=false：渲染「（對該角色無特殊效果）」。
  - 角色 equipment=[]：無子列表渲染。
- 既有測試 `tests/components/character/CharacterEditor.test.ts`、`tests/services/files/characterRepository.test.ts`、`tests/services/ai/contextAssembler.test.ts`、`tests/services/ai/promptBuilder*` 全部維持綠燈。
- 手動實機：建立／編輯角色加裝備，重啟 app 後資料保留；按「給我建議」（前提是 `wire-suggestion-flow` change 已完成）可在 prompt log 看到裝備資訊。

### Scope boundaries

**In scope**:

- 新增 `src/types/equipment.ts` 與 `ResolvedEquipment` 介面。
- 修改 `src/types/character.ts`、`src/types/ai.ts` 介面。
- characterRepository 讀檔 migration 與寫檔輸出。
- CharacterEditor.vue 補裝備區塊（含 overrides 編輯）。
- CharactersTab.vue 若需要把現有角色列表傳給 CharacterEditor 作為 overrides 候選來源，可改動 prop 傳遞。
- contextAssembler 在 CharacterSlice 計算 equipment 欄位。
- promptBuilder 在「# 2. 角色」段插入持有裝備子列表。
- 對應單元與服務測試。

**Out of scope**:

- abilityDetector 與其他 detector 的變動。
- 裝備耐久度、消耗計數、冷卻時間等動態狀態。
- 跨角色 ownership transfer 流程。
- Scene.props 與 Character.equipment 的合併或關聯。
- IPC handler 與 channel 變動。
- 圖片附件、外部資產欄位。
- 裝備分類自訂 tag。

## Risks / Trade-offs

- [既有角色檔被舊版 app 讀寫後 equipment 欄位遺失] → 本機桌面 app 通常單一版本，使用者主要風險是「自己手動回滾」；release notes 標明此 schema 變動。
- [CharacterEditor UI overrides 列表在角色數量極多時佔位過大] → 預設折疊（hidden by default），使用者展開後逐角色加 override；本 change 採展開為預設、後續若回報擁擠再優化。
- [prompt 內裝備子列表使 token 用量上升] → 既有 context 已含 token budget 機制（contextAssembler.take），equipment 暫不單獨 budget；極端情境（角色 100+ 件裝備）可能需要再壓縮，列入 Open Questions。
- [使用者把 overrides key 設為不存在角色 id（手動編輯 JSON 或刪角色未清裝備 overrides）] → resolve 時 fallthrough 用 defaultEffect，不影響 prompt；本 change 不為此清理 overrides 殘留 key，留待 follow-up。
- [同名 EquipmentItem 散佈於多個角色 → 使用者意圖修改「同一件」時要逐檔改] → 設計上接受此 trade-off；若使用者大量複用同一件裝備可請求 follow-up change 引入裝備庫（inventory pool）功能。

## Migration Plan

- 不需資料遷移腳本；characterRepository.read 在第一次讀入舊檔時 in-place 補 equipment=[]，下次寫盤自然完成 migration。
- 部署：vite 重建後即生效；無 IPC schema 變動，主行程不需重啟。
- 回退：revert 本 change commits 即可；新檔案上 equipment 欄位被舊版 repository 忽略（既有 read 已用解構撿欄位、未驗 schema）。

## Open Questions

- 是否要在 release notes 標明使用者升級後第一次儲存角色會把 equipment 欄位寫入檔案？建議標明，避免使用者意外注意到 diff。
- 裝備過多時 prompt token 是否需 budget 機制？目前不處理，等實機回報。
- 後續是否要把同名 EquipmentItem 在多角色間自動同步（裝備庫概念）？留 follow-up change。
