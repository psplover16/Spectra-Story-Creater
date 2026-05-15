## Context

剛完成的 `character-equipment-effects` change 把 EquipmentItem 整個塞進 Character 檔，並用 `overrides: Record<charId, string>` 表達「該角色使用時的特殊效果」。實機回顧暴露三個核心缺陷（詳 proposal.md「Why」）：

- 同一件裝備跨角色需重複建立。
- 改一次裝備本體要逐檔同步。
- 「對角色的效果」語義過載，無法區分「真正效果（取代 default）」與「額外效果（疊加 default）」。

使用者明確要求重構為 first-class entity 模型。本 change 是 `character-equipment-effects` 的「第二階段」，完成 apply 後建議 archive 第一階段。

設計階段已對齊：裝備獨立檔；Character.equipment 改 EquipmentReference[]；realEffect 與 extraEffect 雙欄位、各三狀態（undefined／空字串／非空字串）；不自動 migrate 舊 overrides；新「裝備」分頁；CharacterEditor 改為 reference 選擇器；dangling reference 由 contextAssembler warn 且跳過。

## Goals / Non-Goals

**Goals:**

- 裝備本體獨立為 first-class，存於 `<novel>/equipment/<id>.json`；單一來源同步更新。
- 角色端用 reference 持有裝備，不複製內容；reference 行內可補 realEffect、extraEffect 兩個獨立欄位。
- realEffect 與 extraEffect 採三狀態語意（undefined／空字串／非空字串），對應「沿用上一層」「明確標示無」「採用該值」三種情境。
- 新 IPC channel `equipment:list / read / write / delete` 與既有 character／chapter／faction IPC 形狀一致。
- NovelView 加「裝備」分頁，CRUD 體驗與既有分頁同層級。
- CharacterEditor 改為從裝備庫挑 reference + 雙補充輸入。
- ContextAssembler 載入裝備庫、resolve real／extra、處理 dangling；promptBuilder 渲染雙效果。
- 舊 overrides 資料 BREAKING 丟棄並 warn；不引入隱性自動 migrate。

**Non-Goals:**

- 不引入裝備耐久度／消耗計數／冷卻時間等動態狀態。
- 不為 ownership transfer 設計流程。
- 不合併 Scene.props 與 Character.equipment。
- 不為 EquipmentItem 引入圖片附件或外部資產欄位。
- 不自動 migrate 舊 overrides 資料；BREAKING 改寫。
- 不在裝備本體記錄持有者反向引用。
- 不擴 abilityDetector 或新增裝備使用合理性 detector。
- 不為 workspace 全域裝備庫做設計；per-novel scoped。
- 不在 CharacterEditor 內 inline 新建裝備。
- 不對同名裝備提供自動去重。
- 不為刪除裝備提供「列出受影響角色」確認 dialog。

## Decisions

### Decision: EquipmentItem 升為 first-class entity 並獨立檔案儲存

每件裝備存於 `<novel>/equipment/<id>.json`，子目錄與 chapters／characters／factions 同層。EquipmentItem schema 含 id、name、kind、defaultEffect、可選 notes 五欄；**移除 overrides 欄位**（語義移至 EquipmentReference）。

替代方案：

- 替代方案 1（裝備存於 novel.json 內陣列）被拒：novel.json 已含 worldview／factionsSummary／overallOutline 三大塊，再塞 equipment 會讓單檔肥大、寫盤頻次提升；獨立檔可單件原子寫入。
- 替代方案 2（裝備存於 workspace 全域共用池）被拒：跨小說共享裝備在多本獨立小說情境下會語義污染；per-novel scoped 對齊既有 chapters／characters／factions 模型。

### Decision: Character.equipment 改為 EquipmentReference 陣列

EquipmentReference 為一個小型 record 結構，含 `equipmentId: string`、可選 `realEffect: string`、可選 `extraEffect: string`。角色檔不再複製 EquipmentItem 內容；改裝備本體後所有 reference 自動同步。

替代方案：

- 替代方案 1（在 EquipmentItem 內維護 `holders: Record<charId, {realEffect, extraEffect}>`）被拒：反向引用需在刪除角色時同步清理，雙寫一致性壓力大；Character-side reference 較符合「角色擁有裝備」直覺。
- 替代方案 2（保留 EquipmentItem 內嵌＋外加全域 inventory）被拒：兩種模型並存增加複雜度與資料來源歧義。

### Decision: realEffect 與 extraEffect 雙欄位各三狀態，並存允許

realEffect 與 extraEffect 兩個獨立可選字串欄位。三狀態語意：

| 欄位值 | realEffect 語意 | extraEffect 語意 |
|---|---|---|
| `undefined` | 沿用 defaultEffect | 不疊加額外效果 |
| `''`（空字串） | 明確標示真正效果為空（取代 default） | 明確標示無額外效果 |
| 非空字串 | 採用該字串作為真正效果 | 採用該字串作為額外效果 |

兩者並存允許：一件玉佩對韋小寶可以同時設 realEffect=「康熙親賜信物」+ extraEffect=「進宮免搜身」。

替代方案：

- 替代方案 1（單一 effect 欄位含 mode flag）被拒：UI 與 prompt 都要根據 mode 切渲染邏輯，使用者編輯時容易混淆「取代」與「疊加」的差異。
- 替代方案 2（用陣列 list of effects 支援多條）被拒：敘事意圖通常只有「真正」+「額外」兩層；陣列引入排序與分類問題，欄位最簡。
- 替代方案 3（互斥：realEffect 跟 extraEffect 只能擇一）被拒：玉佩例子顯示兩者並存有實際使用價值。

### Decision: BREAKING 不自動 migrate 舊 character-equipment-effects 資料

characterRepository 讀檔時遇舊資料模式（`equipment[]` 內 item 含 `overrides` 欄位或屬於 EquipmentItem 結構），warn log 後把整個 equipment 陣列重設為空 reference 陣列。使用者需重新建立裝備庫並重設 reference。

替代方案：

- 替代方案 1（自動 migrate：把舊 inline EquipmentItem 與 overrides 拆成獨立 EquipmentItem 檔加 reference）被拒：跨角色去重邏輯（同名同 default 視為同件嗎？同名不同 default 怎麼處理？）複雜且容易語義錯位；簡單破壞性丟棄更可控，且第一階段尚未實機產生使用者資料。
- 替代方案 2（保留舊 overrides 為兼容欄位、新欄位並存）被拒：兩種模型並存讓 contextAssembler 與 UI 雙倍渲染分支；BREAKING 後可徹底清除技術債。

### Decision: NovelView 新增「裝備」分頁、與 chapters／factions／worldview 同層

NovelView template 內以 v-if 切換的分頁加入 'equipment' 鍵，對應 EquipmentTab 元件；其 testid 與三個既有分頁同層命名（tab-equipment、panel-equipment）。CharactersTab 把 listEquipment 結果透過 prop 傳給 CharacterEditor 作為 reference 候選來源。

替代方案：

- 替代方案 1（裝備管理放 SettingsTab 內子區塊）被拒：裝備是小說內容資料，跟 CLI 設定／AI binding 不同層級。
- 替代方案 2（裝備庫以 modal 彈窗形式存在）被拒：modal 模式不適合長時間編輯與多件管理。

### Decision: ContextAssembler resolve real／extra 後輸出單一 effect 字串加旗標

ContextAssembler 內每個 EquipmentReference 經 resolve 後產生 ResolvedEquipment：

- `effect: string`：最終要呈現給 AI 的「真正效果」（realEffect 若有取之；否則用 defaultEffect）。
- `hasEffect: boolean`：effect 是否非空。
- `extraEffect: string`：「額外效果」原樣（extraEffect 若有取之，否則空）。
- `hasExtra: boolean`：extraEffect 是否被「明確指定」（undefined 為 false；空字串或非空字串都為 true，差別在於空字串渲染為「明確標示無額外效果」）。

dangling reference（指向已刪除的 equipmentId）：console.warn 記錄，跳過該 entry，不阻擋 prompt 組裝。

替代方案：

- 替代方案 1（把 default、real、extra 全傳給 prompt 自己決定）被拒：prompt 需要對 AI 簡潔表達結果，由 resolve 階段先壓平更可控。
- 替代方案 2（dangling 時 throw 例外）被拒：使用者刪裝備是合法操作，cascade 清理可能 lag，例外會把整個 invoke 鏈炸掉。

### Decision: promptBuilder 在「# 2. 角色」段渲染雙效果

每位角色行下若 equipment 非空，渲染：

    持有裝備：
      - 玉佩（wearable）：康熙親賜信物
        - 額外效果：進宮免搜身
      - 普通匕首（misc）：飾品
      - 詛咒符（consumable）：（明確標示無真正效果）
        - 額外效果：（明確標示無額外效果）

規則：

- 若 hasEffect=true：渲染「裝備名稱（kind）：effect」。
- 若 hasEffect=false（effect 為空）：渲染「裝備名稱（kind）：（明確標示無真正效果）」。
- 若 hasExtra=true 且 extraEffect 非空：另起一行「- 額外效果：extraEffect」。
- 若 hasExtra=true 且 extraEffect 為空字串：另起一行「- 額外效果：（明確標示無額外效果）」。
- 若 hasExtra=false（extraEffect=undefined）：不渲染額外效果行。

替代方案：

- 替代方案 1（單行扁平 `name：real | extra`）被拒：當 real 或 extra 為空時格式不一致，AI 解析變難。
- 替代方案 2（用 JSON-like 結構描述）被拒：prompt 內 markdown 列表對 AI 較自然，JSON 對小模型反而不利。

### Decision: 刪除裝備採 silent + dangling 警告策略

刪除 EquipmentItem 時不主動掃描所有 Character 檔做反向清理；contextAssembler 在組 context 時遇到 dangling reference 直接 console.warn 並跳過該 entry。CharacterEditor 載入 reference 時若 equipmentId 在裝備庫 list 找不到，下拉顯示「（已刪除：<id>）」灰字選項，使用者可手動移除該 reference。

替代方案：

- 替代方案 1（刪除前掃描所有 Character 並彈 confirm dialog 列出受影響角色）被拒：本 change 範圍可控、留 follow-up；當前 silent + warn 已能保證資料不爆。
- 替代方案 2（刪除時 cascade 自動移除所有 reference）被拒：使用者可能誤刪後想恢復，cascade 會讓恢復難度增加；silent dangling 保留可恢復性。

## Implementation Contract

### Behavior (observable)

1. 使用者於 NovelView 看到「裝備」分頁，點開後可新增、編輯、刪除 EquipmentItem，所有變更立即寫入 `<novel>/equipment/<id>.json` 並反映於該分頁清單。
2. 使用者於 CharacterEditor 看到「裝備（多件）」區塊，點「加入裝備」可從裝備庫挑一件成為 reference；reference 行內可填 realEffect、extraEffect 兩個 textarea，並有「明確無真正效果／明確無額外效果」兩個 toggle。
3. 儲存角色後重新開啟，UI 顯示的 reference、realEffect、extraEffect 狀態與儲存當下完全一致。
4. 在裝備分頁修改某件裝備的 defaultEffect，重新進角色 → 該角色未設 realEffect 的 reference 自動顯示新 defaultEffect。
5. 在裝備分頁刪除一件裝備，所有引用該 id 的 reference 在 CharacterEditor 顯示為「（已刪除：<id>）」灰字；使用者可手動移除這些 reference。
6. 按「給我建議」（前提是 wire-suggestion-flow 已 apply）時，AI 收到的 prompt「# 2. 角色」段內每位在場角色下出現「持有裝備：」子列表，含 resolve 後的真正效果與額外效果（依各自三狀態渲染）。
7. 使用者既有「character-equipment-effects 階段資料」的角色檔首次開啟時：原 `equipment[].overrides` 被丟棄，equipment 重設為空 reference 陣列；console 出現 warn 記錄此 BREAKING 事件。

### Interfaces / Data Shapes

**重寫型別**：`src/types/equipment.ts`

    export type EquipmentKind = 'wearable' | 'consumable' | 'misc'

    export interface EquipmentItem {
      id: string
      name: string
      kind: EquipmentKind
      defaultEffect: string
      notes?: string
    }

    export interface EquipmentReference {
      equipmentId: string
      realEffect?: string
      extraEffect?: string
    }

    export interface ResolvedEquipment {
      id: string
      name: string
      kind: EquipmentKind
      effect: string
      hasEffect: boolean
      extraEffect: string
      hasExtra: boolean
    }

**修改型別**：

- `src/types/character.ts` 內 `Character.equipment` 由 `EquipmentItem[]` 改為 `EquipmentReference[]`；CharacterDraft 同步。
- `src/types/ai.ts` 內 ResolvedEquipment 介面如上。

**新增 IPC channel**：

- `equipment:list(novelDir: string): Promise<EquipmentItem[]>`
- `equipment:read(novelDir: string, equipmentId: string): Promise<EquipmentItem | null>`
- `equipment:write(novelDir: string, item: EquipmentItem): Promise<EquipmentItem>`
- `equipment:delete(novelDir: string, equipmentId: string): Promise<void>`

preload 暴露為 `window.api.equipment.list / read / write / delete`，沿用既有 `plain()` normalization。

**新增 path helper**（src/services/files/paths.ts）：

- `equipmentDir(novelDir)`：返回 `<novelDir>/equipment`
- `equipmentFile(novelDir, id)`：返回 `<novelDir>/equipment/<id>.json`

**characterRepository BREAKING migration**：

讀檔時 `obj.equipment` 為陣列且每個 item 含 `overrides` 欄位或不含 `equipmentId` 欄位視為舊資料：丟棄整個陣列、補 `[]`、warn log（每個角色檔一次 warn）。新資料每個 item 必須 `equipmentId: string`，缺則丟棄該 item 並 warn。

**ContextAssembler 改變**：

- ContextAssemblerDeps 新增 `loadEquipment(novelDir): Promise<EquipmentItem[]>`。
- assemble() 內先 await loadEquipment 取得 equipment 庫，組成 Map<id, EquipmentItem>。
- 組 CharacterSlice 時迭代 c.equipment（reference list），對每個 reference：
  - 查 equipment 庫；找不到 → console.warn(`[contextAssembler] dangling equipment reference ${ref.equipmentId} in character ${c.id}`) 並跳過。
  - 找到 → resolve effect = ref.realEffect ?? equipmentItem.defaultEffect；hasEffect = effect !== ''；extraEffect = ref.extraEffect ?? ''；hasExtra = ref.extraEffect !== undefined。

**promptBuilder 改變**：詳 Decision「promptBuilder 在「# 2. 角色」段渲染雙效果」段渲染規則。

### Failure modes

- 讀檔遇 `equipment` 為非陣列：補 `[]`、不丟例外、不 warn。
- 讀檔遇舊資料含 `overrides` 欄位：丟棄整個 equipment 陣列、補 `[]`、warn log 一次。
- 讀檔遇 EquipmentReference 缺 `equipmentId`：跳過該 item、warn log。
- contextAssembler 遇 dangling reference：跳過、console.warn、不丟例外。
- equipment 檔內某 item 缺 id／name／kind／defaultEffect 任一欄位：repository 補預設值（id 沿用檔名、kind 為 'misc'、defaultEffect 為空字串、name 為檔名）並 warn。
- EquipmentEditor 內使用者把同一個 reference 的 equipmentId 改成不存在的 id：保留輸入（使用者可能 typo 中），但右側即時提示「找不到該裝備」；儲存仍允許（資料層不阻擋）。
- 刪除被引用的裝備：silent 刪除、不阻擋；下次 contextAssembler 觸發 warn；CharacterEditor 顯示「（已刪除：<id>）」灰字。

### Acceptance criteria

- 單元測試 `tests/services/files/equipmentRepository.test.ts`：
  - happy path：write→list→read→delete 四步驟正確。
  - read 不存在 id：throw 或回 null（依 chapterRepository 既有慣例）。
  - 髒檔 item 缺欄位：補預設並 warn。
- IPC 測試 `tests/electron/ipc/equipmentHandlers.test.ts`：四條 channel handler 各驗一條案例。
- 元件測試 `tests/components/equipment/EquipmentEditor.test.ts`：name／kind／defaultEffect 編輯後 emit save。
- 元件測試 `tests/components/equipment/EquipmentList.test.ts`：列表渲染、點擊 emit select。
- 元件測試 `tests/components/tabs/EquipmentTab.test.ts`：mount 時 list、新增按鈕、刪除按鈕。
- 元件測試 `tests/components/character/CharacterEditor.referenceUi.test.ts`：
  - 從裝備庫挑一件加入 reference → emit save 含 EquipmentReference 形狀。
  - 填 realEffect=「真正效果」→ emit save payload 含 realEffect。
  - 勾「明確無真正效果」toggle → emit save 含 realEffect=''。
  - 填 extraEffect=「額外效果」→ emit save 含 extraEffect。
  - 勾「明確無額外效果」toggle → emit save 含 extraEffect=''。
  - 移除 reference → emit save equipment 不含該 reference。
  - 看到 dangling reference（裝備庫不含該 equipmentId）→ 顯示「（已刪除）」灰字。
- 服務測試 `tests/services/ai/contextAssembler.equipmentReference.test.ts`：
  - reference 含 realEffect 非空 → ResolvedEquipment.effect=realEffect、hasEffect=true。
  - reference realEffect=undefined → effect=defaultEffect、hasEffect=defaultEffect 非空。
  - reference realEffect='' → effect=''、hasEffect=false。
  - reference extraEffect 非空 → extraEffect 與 hasExtra 對應。
  - reference extraEffect=undefined → extraEffect=''、hasExtra=false。
  - reference extraEffect='' → extraEffect=''、hasExtra=true。
  - dangling reference → 跳過、warn。
- 服務測試 `tests/services/ai/promptBuilder.dualEffect.test.ts`：
  - 完整 real+extra → prompt 含 name、kind、real effect 與「額外效果：...」行。
  - real=空、extra=undefined → prompt 含「（明確標示無真正效果）」且無額外效果行。
  - real=undefined、extra='' → prompt 含 defaultEffect 與「額外效果：（明確標示無額外效果）」。
- 服務測試 `tests/services/files/characterRepository.breakingMigration.test.ts`：
  - 讀入舊檔（equipment item 含 overrides）→ equipment 重設為 []、warn 一次。
  - 讀入新檔（equipment 為 EquipmentReference[]）→ 欄位保真。
  - 讀入空檔（無 equipment 欄位）→ equipment=[]、不 warn。
- 既有測試 `tests/services/ai/contextAssembler.test.ts`、`tests/services/ai/promptBuilder.test.ts`、`tests/services/files/characterRepository.test.ts`、`tests/components/character/CharacterEditor.test.ts` 全部維持綠燈（必要時補 equipment 改為空 EquipmentReference[]）。
- 既有 e2e `tests/e2e/golden-path.test.ts` 須補 `loadEquipment` mock；通過後保持綠燈。
- 手動實機：建立兩個角色 A、B，到「裝備」分頁建一件「玉佩」（default=飾品），到 A 加 reference + realEffect=信物 + extraEffect=免搜身，到 B 加 reference 不填補充。重啟 app 後 UI 與檔案內容一致。按「給我建議」（前提 wire-suggestion-flow 已 apply）prompt 含雙效果。

### Scope boundaries

**In scope**:

- equipment first-class 檔結構與 repository。
- equipment IPC handler 四條 channel。
- EquipmentEditor／EquipmentList／EquipmentTab 三個元件與 NovelView 新分頁。
- CharacterEditor 裝備區塊重構為 reference 選擇器 + 雙補充。
- characterRepository BREAKING migration（丟棄舊 overrides）。
- contextAssembler resolve real／extra／dangling 邏輯。
- promptBuilder 雙效果渲染。
- 對應單元、IPC、元件、服務、整合測試。

**Out of scope**:

- 裝備耐久度／消耗計數／冷卻時間。
- ownership transfer 流程。
- Scene.props 與 Character.equipment 合併。
- 圖片附件、外部資產欄位。
- 自動 migrate 舊 overrides。
- 持有者反向引用結構。
- abilityDetector 擴張、新 detector。
- workspace 全域裝備庫。
- CharacterEditor 內 inline 新建裝備。
- 同名裝備自動去重。
- 刪除前 confirm dialog 列出受影響角色。

## Risks / Trade-offs

- [使用者在 character-equipment-effects 階段已輸入裝備資料] → BREAKING 警告於 release notes；當前該 change 尚未實機完成驗收，預期影響小；若使用者已實機輸入，需在重新建立裝備庫前匯出舊資料截圖。
- [dangling reference 累積後 CharacterEditor 顯示變雜] → 提供「移除此 reference」按鈕讓使用者一鍵清理；不主動 cascade。
- [新 IPC 與 path helper 同步更新主行程與 preload] → 沿用 character／chapter／faction 形狀，PR review 對照即可發現遺漏。
- [contextAssembler 多載 loadEquipment 增加 IO 次數] → 與 loadNovel／loadCharacters／loadChapters 並列，影響可控；如效能成為議題列入 Open Questions。
- [prompt token 用量上升] → 既有 token budget 機制不變；裝備描述短於 character／worldview slice，影響預期可忽略；若超預期可在 follow-up change 加 equipment budget。

## Migration Plan

- 不需 migration 腳本；characterRepository 讀檔時 detect 舊資料即重設 + warn。
- 部署：vite 重建後即生效；主行程需重啟（新 IPC handler）。
- 回退：revert 本 change commits 即可；新建立的 equipment 檔案在舊版 app 下會被忽略（character.equipment 欄位無對應解讀），無資料遺失但功能消失。

## Open Questions

- 是否需要在 release notes 內提供「先匯出舊 character JSON 再升級」的步驟說明？建議標明但不阻塞。
- 大量 dangling references 累積時是否要在 CharacterEditor 頂部提供「一鍵清除所有 dangling」按鈕？留 follow-up。
- 同名同 defaultEffect 不同 id 的裝備，是否要在 EquipmentList 顯示警示？留 follow-up。
- 第一階段 character-equipment-effects 已 archive 或待 archive？建議本 change apply 後再 archive，避免兩階段 spec 同時 active。
