## ADDED Requirements

### Requirement: Export a single chapter

The system SHALL allow the user to export the current chapter as an HTML file, choosing between two formats: `epub-like` and `web-page`. Exported files SHALL be written under `<novel>/exports/chapter-<chapter-index>-<format>.html` and the file SHALL be self-contained without external network references.

#### Scenario: Export epub-like

- **WHEN** the user clicks export on chapter 3 of "鹿鼎記" with format `epub-like`
- **THEN** the system writes `<novel>/exports/chapter-3-epub-like.html` and the file passes an offline-loadability check (no remote `src`, `href`, or `@import` URLs)

#### Scenario: Export web-page

- **WHEN** the user clicks export on chapter 3 with format `web-page`
- **THEN** the system writes `<novel>/exports/chapter-3-web-page.html` and the page renders correctly when opened from the filesystem in a modern browser

### Requirement: Epub-like format uses inlined CSS for print-friendly reading

The `epub-like` format SHALL embed all stylesheet content inside `<style>` tags in the document `<head>`, SHALL use a single-column reading layout, SHALL render the chapter title and content body with no navigation chrome, and SHALL include page-break rules suitable for printing.

#### Scenario: Stylesheet is inlined

- **WHEN** the export produces an `epub-like` file
- **THEN** the file contains zero `<link rel="stylesheet">` references and at least one `<style>` block with non-empty CSS

### Requirement: Web-page format includes sidebar with chapter navigation

The `web-page` format SHALL include a sidebar listing all chapters of the novel with their titles, with the current chapter highlighted. Clicking another chapter SHALL navigate to that chapter's export file if present in the same `exports/` directory, or display a "尚未匯出" placeholder if absent.

#### Scenario: Sidebar shows all chapters

- **GIVEN** a novel with five chapters and only chapters 1, 2, 3 exported in `web-page` format
- **WHEN** the user opens `chapter-3-web-page.html`
- **THEN** the sidebar lists all five chapters, with chapters 1, 2, 3 as clickable links and chapters 4, 5 marked as "尚未匯出"

### Requirement: Export uses the latest persisted chapter content

The export operation SHALL read the chapter content directly from the persisted chapter file (not from an unsaved editor buffer), so that unsaved edits are not exported.

#### Scenario: Unsaved edits not exported

- **GIVEN** chapter 3 with persisted content "...A..." and unsaved editor edits "...B..."
- **WHEN** the user clicks export without saving first
- **THEN** the system prompts the user to save first, and on cancel the export is aborted; on save the export uses the new content

### Requirement: Branch versions exportable explicitly

The system SHALL allow the user to export a specific branch of a chapter instead of the main version, by selecting a branch from the branch list before clicking export. The exported file SHALL be written under `<novel>/exports/chapter-<chapter-index>-branch-<branch-id>-<format>.html`.

#### Scenario: Export a branch

- **WHEN** the user selects branch "alt-pov-茅十八" of chapter 3 and clicks export with format `epub-like`
- **THEN** the system writes `<novel>/exports/chapter-3-branch-alt-pov-茅十八-epub-like.html`
