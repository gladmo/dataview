# AGENTS.md — Agent Notes

`.agents/` holds agent work products: decision records (`notes/`) and reusable skills (`skills/`). This file follows the documentation standard in [docs/AGENTS.md](../docs/AGENTS.md) and, like every AGENTS.md instruction file, is written in English only.

Agent notes are decision records: durable rationale for a decision — context, the decision, alternatives given up, and the verification the rollout requires. They are not tutorials, changelogs, or acceptance checklists; mechanism prose belongs in `docs/`, and the rules themselves belong in the root `AGENTS.md`.

## Note rules

- Notes live in `.agents/notes/`, named `YYYY-MM-DD-<kebab-topic>.md`; one decision per note.
- Notes are agent-generated documents and follow the bilingual contract: `YYYY-MM-DD-<kebab-topic>.md` is the Chinese primary and `YYYY-MM-DD-<kebab-topic>.en.md` records the English translation; the pair updates together. Skills (`skills/`) address agents and stay English only, like instruction files.
- Four fixed sections: context (why decide now), decision (what was chosen), alternatives (what was given up and why), verification (how the rollout proves itself).
- Every new note triggers a supersession check: search existing notes covering the same decision or mechanism; fully superseded notes move to `.agents/notes/archived/` with cross-links in both directions; partially superseded ones stay active and cross-linked. Archive both files of a pair together.
- Archived notes are frozen historical snapshots: never edited again, never cited as current authority.
