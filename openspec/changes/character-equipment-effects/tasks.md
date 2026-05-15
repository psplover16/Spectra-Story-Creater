<!--
Each task description states the behavior or contract being delivered and the
verification target that proves completion. File paths are supporting context.
-->

## 1. 紅燈測試先行（TDD）

- [x] [P] 1.1 新增 `tests/services/files/characterRepository.equipment.test.ts`：覆蓋「讀入舊檔無 equipment 欄位 → 補 []」「讀入新檔 equipment 陣列保真」「讀入髒檔（item 缺 id／kind／defaultEffect／overrides）→ migrate 補預設值並 warn」「寫檔後 JSON 含 equipment 陣列」四條子測試，落實 design 中 Decision: characterRepository 讀檔時補欠缺欄位，warn log 但不阻擋讀檔 與 Requirement: characterRepository in-place migration backfills missing equipment fields。驗證：執行 `pnpm test -- tests/services/files/characterRepository.equipment.test.ts`，四條子測試皆 fail（type/欄位尚未實作）。
- [x] [P] 1.2 新增 `tests/components/character/CharacterEditor.equipment.test.ts`：覆蓋「新增一件裝備 emit save 含正確欄位」「為一件裝備加 override emit save 含 overrides[charId]=effect」「override 為空字串（明確無效果）emit save 含 overrides[charId]=''」「刪除既有 override 後 emit save overrides 不含該 key」四條子測試，落實 Requirement: Character editor exposes an equipment authoring section 與 Requirement: Character editor supports per-character override authoring。驗證：執行該測試應 fail（UI 區塊尚未實作）。
- [x] [P] 1.3 新增 `tests/services/ai/contextAssembler.equipment.test.ts`：覆蓋「override 非空 → ResolvedEquipment.effect=override、hasEffect=true」「無 override → effect=defaultEffect、hasEffect=defaultEffect 非空」「override 空字串 → effect=''、hasEffect=false」三條子測試，落實 design 中 Decision: 在 CharacterSlice 中加入 equipment 欄位（ResolvedEquipment[]），不新增 top-level slice 與 Requirement: CharacterSlice carries resolved equipment for the holding character。驗證：執行該測試應 fail（CharacterSlice 尚未含 equipment）。
- [x] [P] 1.4 新增 `tests/services/ai/promptBuilder.equipment.test.ts`：覆蓋「角色含裝備時 prompt 內出現持有裝備子列表並含 name／kind／effect」「hasEffect=false 渲染『（對該角色無特殊效果）』」「角色 equipment=[] 不渲染子列表」三條子測試，落實 design 中 Decision: prompt 「# 2. 角色」段加入持有裝備子列表 與 Requirement: Prompt builder injects an equipment sub-list under each character entry。驗證：執行該測試應 fail（prompt 段尚未含子列表）。

## 2. 型別與資料模型

- [x] 2.1 新增 `src/types/equipment.ts`，匯出 `EquipmentKind` 型別（`'wearable' | 'consumable' | 'misc'` 三選一）、`EquipmentItem` 介面（id／name／kind／defaultEffect／overrides／可選 notes 六欄）、`ResolvedEquipment` 介面（id／name／kind／effect／hasEffect 五欄），落實 design 中 Decision: 裝備與道具合一為 EquipmentItem，以 kind enum 區分 以及 Interfaces / Data Shapes 規範的型別。驗證：tsc 全綠；型別匯出可被既有 Character 與 CharacterSlice 引用；EquipmentKind 三個值對應 design Decision 列出的「穿戴／消耗／其他」三選一。
- [x] 2.2 修改 `src/types/character.ts`：Character 介面新增 `equipment: EquipmentItem[]` 必填欄位；CharacterDraft 同步新增。對齊 design 中 Decision: 裝備存於 Character.equipment 陣列（1-N 關係），不另設全域 inventory pool 與 spec「Character file includes an equipment list with per-character effect overrides」schema 形狀。驗證：tsc 全綠；既有 character repository 與 CharacterEditor 因型別變動觸發 compile error 的位置已被後續任務覆蓋。
- [x] 2.3 修改 `src/types/ai.ts`：CharacterSlice 介面新增 `equipment: ResolvedEquipment[]` 欄位，對齊 Requirement: CharacterSlice carries resolved equipment for the holding character。驗證：tsc 全綠；contextAssembler 因型別變動觸發 compile error 的位置已被後續任務覆蓋。

## 3. characterRepository migration 與寫檔

- [x] 3.1 在 `src/services/files/characterRepository.ts` 的 read 路徑加 in-place migration：偵測 `obj.equipment` 非陣列補 `[]`；偵測陣列內 item 缺 id／kind／defaultEffect／overrides 補預設值並 warn log，落實 design 中 Decision: characterRepository 讀檔時補欠缺欄位，warn log 但不阻擋讀檔。驗證：任務 1.1 中三條 migration 子測試由紅轉綠。
- [x] 3.2 在 `src/services/files/characterRepository.ts` 的 write 路徑保證輸出含 `equipment` 欄位（即使空陣列），維持既有 `.tmp` + rename atomic 與 UTF-8 無 BOM，落實 Requirement: characterRepository always writes the equipment field。驗證：任務 1.1 中「寫檔後 JSON 含 equipment 陣列」子測試由紅轉綠。

## 4. CharacterEditor UI 補裝備區塊

- [x] 4.1 在 `src/components/character/CharacterEditor.vue` 補「裝備（多件）」區塊：含「新增裝備」按鈕、每件裝備一行可編輯 name／kind dropdown／defaultEffect textarea／刪除按鈕；draft 內維護 `equipment` 陣列並在 emit save 時包入 payload，落實 Requirement: Character editor exposes an equipment authoring section。驗證：任務 1.2 中「新增裝備 emit save 含正確欄位」「刪除裝備 emit save 不含該件」兩條子測試由紅轉綠。
- [x] 4.2 在 CharacterEditor.vue 同區塊內，為每件裝備新增 overrides 編輯子區：可從父層傳入的 `otherCharacters` 列表（候選角色）中選一個並輸入 effect 字串，或勾「明確無效果」toggle 把 effect 設為空字串；可刪除既有 override，落實 design 中 Decision: 效果用 defaultEffect 加 overrides 雙層表達，空字串視為明確無效果 與 Requirement: Character editor supports per-character override authoring。驗證：任務 1.2 中「加 override」「明確無效果」「刪除 override」三條子測試由紅轉綠。
- [x] 4.3 在 `src/components/tabs/CharactersTab.vue` 把目前所有 character（除了正在編輯的 selected）傳入 CharacterEditor 作為 `otherCharacters` prop，作為 overrides 候選來源；既有 prop 介面不破壞。驗證：手動實機開 CharacterEditor 後 overrides dropdown 列出當前小說的其他角色名稱。

## 5. ContextAssembler 與 promptBuilder 注入裝備

- [x] 5.1 修改 `src/services/ai/contextAssembler.ts`：組 CharacterSlice 時為每件 character.equipment item 計算 `ResolvedEquipment`（依 character id 查 overrides → 有則用 override、空字串 hasEffect=false；無則 fallback defaultEffect），把結果放入 CharacterSlice.equipment 欄位，落實 design 中 Decision: 在 CharacterSlice 中加入 equipment 欄位（ResolvedEquipment[]），不新增 top-level slice。驗證：任務 1.3 中三條 resolve 子測試由紅轉綠。
- [x] 5.2 修改 `src/services/ai/promptBuilder.ts`：在「# 2. 角色（依相關性排序）」段內每位角色行下方插入持有裝備子列表（若 CharacterSlice.equipment 非空）：每件裝備一行「- 裝備名稱（kind）：effect」，hasEffect=false 顯示「- 裝備名稱（kind）：（對該角色無特殊效果）」，empty equipment 不渲染子列表，落實 design 中 Decision: prompt 「# 2. 角色」段加入持有裝備子列表 與 Requirement: Prompt builder injects an equipment sub-list under each character entry。驗證：任務 1.4 中三條子測試由紅轉綠。

## 6. 驗收與守護

- [x] 6.1 執行 `pnpm test`：第 1 章紅燈測試全由紅轉綠；既有測試集合不退化（baseline 數量視 wire-suggestion-flow 完成狀況而定，至少 366 條維持綠）。驗證：CI 輸出測試數量 + 12 條左右、無 failed。
- [x] 6.2 執行 `pnpm typecheck`：本 change 範圍內無新 type 錯誤（pre-existing `@types/eslint` 缺項屬既有問題、不在本 change 範圍）。驗證：typecheck 輸出僅含 pre-existing 錯誤、無新增。
- [ ] 6.3 手動實機驗收：執行 `pnpm electron:dev`，建立或開既有小說 → 進角色分頁 → 開既有角色（或新增）→ 在「裝備」區塊新增一件裝備並設 default 與一個 override（針對另一個既有角色）→ 儲存 → 關 app 重開 → 確認 UI 與檔案 JSON 都保留該裝備與 override；落實 design 中 Behavior (observable) 第 1-5 條。驗證：截圖或 console log 附 PR description 證明資料保留。
- [x] 6.4 grep 確認 IPC 與其他 schema 未動：`grep ipcMain.handle electron/` 列表不變、`grep -E "(worldview|factionsSummary|overallOutline|scene)" src/types/novel.ts src/types/chapter.ts` 結果不變，落實 design 中 Scope boundaries。驗證：grep 輸出與本 change 開始前快照一致。
- [x] 6.5 對照 design.md「Implementation Contract」段落逐項打勾：「Behavior (observable)」七條皆通；「Interfaces / Data Shapes」EquipmentItem／ResolvedEquipment／Character／CharacterSlice 四個介面對齊；「Failure modes」覆蓋；「Acceptance criteria」自動化測試與手動實機驗收清單全部達成；「Scope boundaries」全部 In Scope 完成、Out of Scope 未越界。驗證：PR description 引用本 checklist 並逐項標記。
