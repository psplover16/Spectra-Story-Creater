# AI Binding Flow

對應 design.md D5（四層 resolver）與 D6（六職能可獨立綁定）。

## hitLayer 決策樹

```
incoming ResolveQuery { role, characterId?, paragraphId? }
        |
        v
+-------------------------+
| 1. paragraphBindings    |--- hit  --> hitLayer = 'paragraph'
| query.paragraphId 命中？ |
+-------------------------+
        | miss
        v
+-------------------------+
| 2. roleBindings         |--- hit  --> hitLayer = 'role'
| query.role 命中？        |
+-------------------------+
        | miss
        v
+-------------------------+
| 3. characterBindings    |--- hit  --> hitLayer = 'character'
| query.characterId 命中？ |
+-------------------------+
        | miss
        v
+-------------------------+
| 4. globalDefault         |
| 一定 hit                 |--------> hitLayer = 'global'
+-------------------------+
```

## 為什麼這個順序

- **paragraph 最高**：使用者已就此段落覆寫，意圖最明確
- **role 第二**：職能比角色更穩定（角色換 CLI 可能因個性，職能換 CLI 通常因 prompt 品質）
- **character 第三**：角色綁定影響範圍較廣，作為次優先
- **global 兜底**：永遠至少有預設值，resolver 不會回 undefined

## UI 顯示

`ResolveResult.reason` 是給 `SuggestionSourceBadge` 顯示用的人類可讀字串，例如：
- `"段落覆寫：p-42 → claude"`
- `"職能綁定：plot-driver → claude"`
- `"角色綁定：韋小寶 → claude"`
- `"全域預設：codex"`

## 變更綁定的入口

- 段落綁定：`AiBindingPanel` 段落層 UI（v1 預留，當前由 store API 設定）
- 職能 / 角色 / 全域：`AiBindingPanel.vue`、`SettingsView.vue` 中 store 同步更新
