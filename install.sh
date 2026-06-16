#!/bin/bash
# Fable Intelligence + Fable Brain — one-shot installer
# Run from your project root: bash install.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Fable Intelligence + Brain Installer ==="
echo ""

# Skill 1: fable-intelligence (API reference)
DIR1=".claude/skills/fable-intelligence"
mkdir -p "$DIR1"
if [ -f "$SCRIPT_DIR/SKILL.md" ]; then
  cp "$SCRIPT_DIR/SKILL.md" "$DIR1/SKILL.md"
  echo "Installed: $DIR1/SKILL.md (API reference)"
else
  echo "Warning: SKILL.md not found in $SCRIPT_DIR"
fi

# Skill 2: fable-brain (behavioral layer)
DIR2=".claude/skills/fable-brain"
mkdir -p "$DIR2"
if [ -f "$SCRIPT_DIR/FABLE-BRAIN.md" ]; then
  cp "$SCRIPT_DIR/FABLE-BRAIN.md" "$DIR2/SKILL.md"
  echo "Installed: $DIR2/SKILL.md (behavioral layer)"
else
  echo "Warning: FABLE-BRAIN.md not found in $SCRIPT_DIR"
fi

echo ""
echo "Done. Invoke in Claude Code:"
echo "  /fable-intelligence  — API reference"
echo "  /fable-brain         — behavioral enhancement"
echo ""
