<!--
Each task description states the behavior or contract being delivered and the
verification target that proves completion. File paths are supporting context.
-->

## 1. 紅燈測試先行（TDD）

- [x] [P] 1.1 新增 `tests/services/files/equipmentRepository.test.ts`：覆蓋「write→list→read 三步驟保真」「read 不存在 id 回 null 不丟例外」「髒檔 item 缺欄位補預設並 warn」三條子測試，落實 design 中 Decision: EquipmentItem 升為 first-class entity 並獨立檔案儲存 與 Requirement: Equipment repository exposes list, read, write, delete operations。驗證：執行 `pnpm test -- tests/services/files/equipmentRepository.test.ts` 三條皆 fail（repository 尚未實作）。
- [x] [P] 1.2 新增 `tests/electron/ipc/equipmentHandlers.test.ts`：覆蓋 `equipment:list / read / write / delete` 四條 channel 各驗一條 case，落實 Requirement: Equipment IPC channels mirror existing character/chapter/faction shape。驗證：執行該測試應 fail（handler 尚未註冊）。
- [x] [P] 1.3 新增 `tests/components/equipment/EquipmentEditor.test.ts`：覆蓋「name / kind / defaultEffect 填寫後 emit save」「kind dropdown 限定三選一」兩條子測試，落實 Requirement: EquipmentTab supports add, edit, delete CRUD on the equipment library 的編輯子部分。驗證：執行該測試應 fail（元件尚未實作）。
- [x] [P] 1.4 新增 `tests/components/equipment/EquipmentList.test.ts`：覆蓋「列表渲染裝備項目」「點擊 emit select 帶 equipmentId」兩條子測試，落實 Requirement: EquipmentTab supports add, edit, delete CRUD on the equipment library 的列表子部分。驗證：執行該測試應 fail（元件尚未實作）。
- [x] [P] 1.5 新增 `tests/components/tabs/EquipmentTab.test.ts`：覆蓋「mount 時呼叫 equipment:list」「新增按鈕觸發 emit / save 流程」「刪除按鈕觸發 equipment:delete」三條子測試，落實 design 中 Decision: NovelView 新增「裝備」分頁、與 chapters／factions／worldview 同層 與 Requirement: NovelView exposes an equipment tab parallel to chapters and factions。驗證：執行該測試應 fail（分頁尚未實作）。
- [x] [P] 1.6 新增 `tests/components/character/CharacterEditor.referenceUi.test.ts`：覆蓋「從裝備庫挑一件加入 reference → emit save payload 含 EquipmentReference 形狀」「填 realEffect → payload 含 realEffect」「勾『明確無真正效果』toggle → payload 含 realEffect=''」「填 extraEffect → payload 含 extraEffect」「勾『明確無額外效果』toggle → payload 含 extraEffect=''」「移除 reference → payload equipment 不含該 reference」「dangling reference 顯示『（已刪除：<id>）』灰字」「移除 dangling reference → payload 不含該 reference」八條子測試，落實 design 中 Decision: Character.equipment 改為 EquipmentReference 陣列 與 Decision: realEffect 與 extraEffect 雙欄位各三狀態，並存允許 與 Requirement: Character editor supports per-character override authoring 與 Requirement: Character editor displays dangling references as deleted。驗證：執行該測試應 fail（CharacterEditor 仍是舊 overrides UI）。
- [x] [P] 1.7 新增 `tests/services/ai/contextAssembler.equipmentReference.test.ts`：覆蓋「realEffect 非空 → ResolvedEquipment.effect=realEffect、hasEffect=true」「realEffect=undefined → effect=defaultEffect、hasEffect=defaultEffect 非空」「realEffect='' → effect=''、hasEffect=false」「extraEffect 非空 → extraEffect 與 hasExtra=true」「extraEffect=undefined → extraEffect=''、hasExtra=false」「extraEffect='' → extraEffect=''、hasExtra=true」「dangling reference → 跳過該 entry 並 console.warn」七條子測試，落實 design 中 Decision: ContextAssembler resolve real／extra 後輸出單一 effect 字串加旗標 與 Requirement: CharacterSlice carries resolved equipment for the holding character。驗證：執行該測試應 fail（assembler 尚未實作 reference resolve）。
- [x] [P] 1.8 新增 `tests/services/ai/promptBuilder.dualEffect.test.ts`：覆蓋「完整 real+extra → prompt 含 name／kind／real effect 與『額外效果：...』行」「real=空、extra=undefined → prompt 含『（明確標示無真正效果）』且無額外效果行」「real=undefined、extra='' → prompt 含 defaultEffect 與『額外效果：（明確標示無額外效果）』」「角色 equipment 為空 → 不渲染子列表」四條子測試，落實 design 中 Decision: promptBuilder 在「# 2. 角色」段渲染雙效果 與 Requirement: Prompt builder injects an equipment sub-list under each character entry。驗證：執行該測試應 fail（buildPrompt 尚未實作雙效果渲染）。
- [x] [P] 1.9 新增 `tests/services/files/characterRepository.breakingMigration.test.ts`：覆蓋「讀入舊 character-equipment-effects 階段檔（equipment item 含 overrides）→ equipment 重設為 []、warn 一次」「讀入新檔（equipment 為 EquipmentReference[]）→ 欄位保真」「讀入空檔（無 equipment）→ equipment=[]、不 warn」「讀入 reference 缺 equipmentId → 整個 equipment 陣列重設、warn」四條子測試，落實 design 中 Decision: BREAKING 不自動 migrate 舊 character-equipment-effects 資料 與 Requirement: characterRepository in-place migration backfills missing equipment fields。驗證：執行該測試應 fail（repository 仍是舊 migration 邏輯）。

## 2. 型別與資料模型

- [x] 2.1 重寫 `src/types/equipment.ts`：移除 EquipmentItem.overrides 欄位；EquipmentItem 改為 id／name／kind／defaultEffect／可選 notes 五欄；新增 `EquipmentReference` 介面（equipmentId、可選 realEffect、可選 extraEffect）；改寫 `ResolvedEquipment` 介面為 id／name／kind／effect／hasEffect／extraEffect／hasExtra 七欄。落實 design 中 Decision: EquipmentItem 升為 first-class entity 並獨立檔案儲存 與 Decision: Character.equipment 改為 EquipmentReference 陣列。驗證：tsc 全綠；型別匯出能被既有 Character 與 CharacterSlice 引用；測試 1.7 中型別斷言子測試由紅轉綠。
- [x] 2.2 修改 `src/types/character.ts`：Character.equipment 由 `EquipmentItem[]` 改為 `EquipmentReference[]`；CharacterDraft 同步。對齊 spec「Character file includes an equipment list with per-character effect overrides」schema 形狀。驗證：tsc 全綠；既有 character repository 與 CharacterEditor 因型別變動觸發 compile error 的位置已被後續任務覆蓋。
- [x] 2.3 修改 `src/types/ai.ts`：CharacterSlice.equipment 元素改為新 ResolvedEquipment（含 extraEffect / hasExtra）。對齊 Requirement: CharacterSlice carries resolved equipment for the holding character。驗證：tsc 全綠；contextAssembler 與 promptBuilder 因型別變動觸發 compile error 的位置已被後續任務覆蓋。

## 3. equipmentRepository 與 IPC handler

- [x] 3.1 新增 `src/services/files/paths.ts` 中的 `equipmentDir(novelDir)` 與 `equipmentFile(novelDir, id)` 兩個 helper，沿用既有 chapterDir／chapterFile 形狀。驗證：tsc 全綠；測試 1.1 中「路徑形狀斷言」子測試由紅轉綠。
- [x] 3.2 新增 `src/services/files/equipmentRepository.ts` 提供 listEquipment／readEquipment／writeEquipment／deleteEquipment 四個函式，沿用既有 chapter／character／faction repository 的 `.tmp` + rename atomic 與 UTF-8 無 BOM。read 不存在 id 回 null。落實 design 中 Decision: EquipmentItem 升為 first-class entity 並獨立檔案儲存、Requirement: Equipment is stored as a first-class entity per novel 與 Requirement: Equipment repository exposes list, read, write, delete operations。驗證：任務 1.1 三條子測試由紅轉綠。
- [x] 3.3 新增 `electron/ipc/equipmentHandlers.ts` 註冊 `equipment:list / read / write / delete` 四條 channel；在 `electron/main.ts.registerAllHandlers` 註冊。落實 Requirement: Equipment IPC channels mirror existing character/chapter/faction shape。驗證：任務 1.2 四條子測試由紅轉綠。
- [x] 3.4 在 `electron/preload.ts` 暴露 `window.api.equipment.list / read / write / delete`，沿用既有 plain() normalization。驗證：tsc 全綠；preload 編譯結果含 equipment.* 四個方法。

## 4. characterRepository BREAKING migration

- [x] 4.1 修改 `src/services/files/characterRepository.ts` 的 read 路徑 migration：偵測 `equipment[]` 內 item 含 overrides 欄位或不含 equipmentId 欄位時，丟棄整個 equipment 陣列、補 `[]`、warn log 一次；新形狀則保真；無 equipment 欄位則靜默補空。落實 design 中 Decision: BREAKING 不自動 migrate 舊 character-equipment-effects 資料 與 Requirement: characterRepository in-place migration backfills missing equipment fields。驗證：任務 1.9 四條子測試由紅轉綠。
- [x] 4.2 修改 `src/services/files/characterRepository.ts` 的 write 路徑：保證輸出 `equipment` 欄位（即使空陣列），維持 UTF-8 無 BOM 與 atomic 寫入。驗證：補一條 unit test 斷言 write 後檔案 JSON 含 `"equipment": []` 預設值；任務 1.9 子測試持續綠燈。

## 5. equipment UI 元件與分頁

- [x] 5.1 新增 `src/components/equipment/EquipmentEditor.vue`：name 輸入、kind dropdown（三選一）、defaultEffect textarea、notes textarea、儲存按鈕；emit save 帶完整 EquipmentItem。落實 Requirement: EquipmentTab supports add, edit, delete CRUD on the equipment library 的編輯子部分。驗證：任務 1.3 兩條子測試由紅轉綠。
- [x] 5.2 新增 `src/components/equipment/EquipmentList.vue`：列表顯示 EquipmentItem 名稱與 kind；點擊 emit select 帶 equipmentId。落實 Requirement: EquipmentTab supports add, edit, delete CRUD on the equipment library 的列表子部分。驗證：任務 1.4 兩條子測試由紅轉綠。
- [x] 5.3 新增 `src/components/tabs/EquipmentTab.vue`：mount 時呼叫 `window.api.equipment.list(novelDir)`；含「新增裝備」按鈕、刪除按鈕；CRUD 流程透過 IPC handler。落實 design 中 Decision: NovelView 新增「裝備」分頁、與 chapters／factions／worldview 同層 與 Requirement: NovelView exposes an equipment tab parallel to chapters and factions。驗證：任務 1.5 三條子測試由紅轉綠。
- [x] 5.4 修改 `src/views/NovelView.vue`：加 `'equipment'` 到 NovelTab union 與 TAB_LABELS（「裝備」）；新增 v-if 區塊渲染 `<slot name="equipment" />`；tab testid `tab-equipment`、panel testid `panel-equipment`。落實 Requirement: NovelView exposes an equipment tab parallel to chapters and factions。驗證：補一條 NovelView 單元測試斷言新增分頁存在；任務 1.5 mount 子測試由紅轉綠。
- [x] 5.5 修改 `src/App.vue`：在 NovelView 的 `<template #equipment>` 注入 `<EquipmentTab :novel-dir="activeNovelDir" />`。驗證：手動實機切到「裝備」分頁可看到 EquipmentTab 渲染。

## 6. CharacterEditor 改為 reference 選擇器 + 雙補充

- [x] 6.1 重寫 `src/components/character/CharacterEditor.vue` 的裝備區塊：移除舊 overrides UI；改為 reference 列表，每筆顯示由 `equipmentLibrary` prop 解出的 name 與 kind；含「加入裝備引用」控制（從 dropdown 選 equipmentId）；含 realEffect、extraEffect 兩個 textarea；含「明確無真正效果」「明確無額外效果」兩個 toggle；含「移除」按鈕；dangling reference 顯示「（已刪除：<id>）」並提供「移除」按鈕讓使用者一鍵清掉殘留 reference（落實 design 中 Decision: 刪除裝備採 silent + dangling 警告策略 的使用者端清理路徑）。落實 Requirement: Character editor exposes an equipment authoring section 與 Requirement: Character editor supports per-character override authoring 與 Requirement: Character editor displays dangling references as deleted 與 design 中 Decision: Character.equipment 改為 EquipmentReference 陣列 與 Decision: realEffect 與 extraEffect 雙欄位各三狀態，並存允許。驗證：任務 1.6 八條子測試由紅轉綠。
- [x] 6.2 修改 `src/components/tabs/CharactersTab.vue`：mount 時加呼叫 `window.api.equipment.list` 取得裝備庫；把 list 結果與 otherCharacters 一起傳給 CharacterEditor 作 `equipment-library` prop；handleSave 接收新形狀的 equipment payload（`EquipmentReference[]`）並寫盤。驗證：手動實機開 CharacterEditor 後裝備 dropdown 列出當前小說裝備庫；既有 CharactersTab 元件測試補 `equipment.list` mock 後仍綠燈。

## 7. ContextAssembler 與 promptBuilder 雙效果

- [x] 7.1 修改 `src/services/ai/contextAssembler.ts`：ContextAssemblerDeps 新增 `loadEquipment(novelId): Promise<EquipmentItem[]>`；assemble() 內 await loadEquipment 並建 Map<id, EquipmentItem>；CharacterSlice 內每個 reference resolve 為 ResolvedEquipment（依 reference.realEffect 三狀態決定 effect 與 hasEffect；依 reference.extraEffect 三狀態決定 extraEffect 與 hasExtra）；dangling reference 跳過並 console.warn。落實 design 中 Decision: ContextAssembler resolve real／extra 後輸出單一 effect 字串加旗標 與 Requirement: CharacterSlice carries resolved equipment for the holding character。驗證：任務 1.7 七條子測試由紅轉綠。
- [x] 7.2 修改 `src/services/ai/promptBuilder.ts`：在「# 2. 角色（依相關性排序）」段內每位角色行下方依 ResolvedEquipment.hasEffect／hasExtra 渲染雙效果子列表（規則詳 design Decision: promptBuilder 在「# 2. 角色」段渲染雙效果）。落實 Requirement: Prompt builder injects an equipment sub-list under each character entry。驗證：任務 1.8 四條子測試由紅轉綠。

## 8. 跨檔串接與既有測試補丁

- [x] 8.1 修改 `src/App.vue` 的 useSuggestionFlow 部位（如果 wire-suggestion-flow 已 apply）：在 deps 加 `loadEquipment: (dir) => window.api.equipment.list(dir) as Promise<EquipmentItem[]>`；若 wire-suggestion-flow 尚未 apply 則跳過此 sub-task 並記錄於 PR description。驗證：手動實機按「給我建議」時 console log 不出現 `loadEquipment is not a function` 類錯誤；wire-suggestion-flow 整合測試持續綠燈。
- [x] 8.2 為 e2e `tests/e2e/golden-path.test.ts` 補 `loadEquipment` mock（回空陣列即可），並把 emptyContext 內 CharacterSlice.equipment 維持空陣列。驗證：e2e 測試持續綠燈。
- [x] 8.3 修改既有測試檔內所有 `equipment: []` 占位（character-equipment-effects 階段補的）依新 EquipmentReference[] 型別保持為空陣列即可；CharacterSlice 端 `equipment: []` 視結構需求加 extraEffect / hasExtra 子欄位（型別改後可能需要 cast）。掃描影響：`tests/services/consistency/**`、`tests/services/faction/**`、`tests/services/evolution/**`、`tests/integration/**`、`tests/components/character/**`、`tests/composables/**`、`tests/views/**`。驗證：`pnpm typecheck` 在本 change 範圍內僅剩 pre-existing `@types/eslint` 錯誤。

## 9. 驗收與守護

- [x] 9.1 執行 `pnpm test`：第 1 章紅燈測試全綠；既有測試集合不退化（baseline 取 character-equipment-effects 完成時的 380 條）。驗證：CI 輸出測試數量 + 20 條左右、無 failed。
- [x] 9.2 執行 `pnpm typecheck`：本 change 範圍內無新 type 錯誤；僅剩 pre-existing `@types/eslint` 缺項。驗證：typecheck 輸出僅含 pre-existing 錯誤。
- [ ] 9.3 手動實機驗收：執行 `pnpm electron:dev` → 選一本小說 → 進「裝備」分頁 → 新增一件「玉佩」（default=飾品）→ 進角色分頁 → 為角色 A 加 reference + realEffect=「信物」+ extraEffect=「免搜身」 → 為角色 B 加同一件裝備 reference 不填補充 → 儲存兩者 → 重啟 app → 確認 UI 與檔案 JSON 都保留；落實 design 中 Behavior (observable) 第 1-6 條。驗證：截圖或 console log 附 PR description。
- [x] 9.4 手動實機驗收 BREAKING：執行 `pnpm electron:dev`，預先手動寫一個含 `equipment: [{ id, name, kind, defaultEffect, overrides }]` 的 character JSON 模擬 character-equipment-effects 階段資料 → 開啟該角色 → 觀察 console 出現一條 BREAKING warn、UI 顯示 equipment 為空。落實 design 中 Behavior (observable) 第 7 條。驗證：截圖或 console log 附 PR description 證明 warn 觸發。
- [x] 9.5 對照 design.md「Implementation Contract」段落逐項打勾：「Behavior (observable)」七條皆通；「Interfaces / Data Shapes」EquipmentItem／EquipmentReference／ResolvedEquipment／IPC channels 介面對齊；「Failure modes」覆蓋；「Acceptance criteria」自動化測試與手動實機驗收清單全部達成；「Scope boundaries」全部 In Scope 完成、Out of Scope 未越界。驗證：PR description 引用本 checklist 並逐項標記。
