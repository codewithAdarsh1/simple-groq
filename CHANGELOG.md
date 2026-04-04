# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.2] - 2026-04-04

### Fixed
- Fixed broken `typecheck` command in GitHub Actions publish workflow.
- Corrected `AIClient.chat()` cost tracker arguments to use token counts as numbers.
- Fixed `embedChat` streaming UI bug where mutating `childNodes` during iteration caused crashes.
- Cleaned up unused imports in the test suite.
- Updated repository metadata (bugs and homepage) in `package.json`.

### Changed
- Major SEO optimization for NPM: expanded keywords and improved package description.
- Enhanced README with badges, comparison tables, and common use cases.

## [2.0.0] - 2026-03-15

### Added
- Upgraded from `simple-groq` — now supports 18 providers.
- Added embeddable chat widget (`embedChat`).
- Added token budgeting, cost tracking, and API optimizer features.
- Zero-dependency implementation using native `fetch`.
