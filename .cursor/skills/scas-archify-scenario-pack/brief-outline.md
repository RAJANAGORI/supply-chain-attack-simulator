# Brief outline (`archify_SNN.md`)

Use this section order. Keep ASCII `-` and straight quotes. Copy tone from `.archify/scenarios/01-typosquatting/archify_S01.md` or `06-sha-hulud/archify_S06.md`.

1. Title: `# Scenario NN architecture brief: <Name>`
2. Pinned revision, lab slug, Control Center URL, Zero-to-Hero guide link
3. `## Interactive diagrams (Archify)` table with relative `architecture/` and `sequence/` links
4. One-line verdict
5. Why this lab exists (real campaign → lab stand-in table)
6. System map / cast (actors, ports, boundaries)
7. Attack chain (setup → services → install/run phases → cover story)
8. Evidence endpoints + sample curls
9. Source anchors table (path + line ranges)
10. Blue team / containment talk track
11. How surfaces fit (guide, Control Center, Archify, this brief)
12. `## Re-render` bash block pointing at this scenario's `candidate.json` and HTML paths

End with prose_guard:

```bash
python3 ~/.cursor/hooks/prose_guard.py scan .archify/scenarios/NN-slug/archify_SNN.md
```
