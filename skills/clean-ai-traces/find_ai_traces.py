"""Lists the AI traces in a project: emojis, banners, signatures and filler comments.

It only reports, it changes nothing: each warning is decided by a person or the agent.
Usage: python find_ai_traces.py <folder or files> [--docs]

The patterns cover English and Spanish, so they also work on code commented in either language.
"""

import re
import sys
from pathlib import Path

IGNORED_FOLDERS = {
    ".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__",
    ".next", ".turbo", "coverage", ".pytest_cache", ".mypy_cache", ".ruff_cache",
}

CODE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".vue", ".svelte", ".go", ".java",
    ".cs", ".rb", ".php", ".sh", ".ps1", ".sql", ".css", ".scss", ".html",
    ".yaml", ".yml", ".toml", ".env", ".example",
}

DOCS_EXTENSIONS = {".md", ".mdx", ".txt"}

EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF"
    "\U00002B00-\U00002BFF\U0000FE0F]"
)

COMMENT_START = re.compile(r"^\s*(#|//|/\*|\*|<!--|--\s)")

# The patterns are searched only inside comments; loose text is not touched.
COMMENT_PATTERNS = {
    "banner or separator": re.compile(r"(={4,}|-{4,}|\*{4,}|#{4,}|─{2,}|━{2,})"),
    "AI signature": re.compile(
        r"(generated (by|with)|claude|chatgpt|openai|copilot|gemini|cursor|"
        r"as an ai|generado (por|con) ia|co-authored-by)", re.IGNORECASE
    ),
    "tutorial narration": re.compile(
        r"^\W*(here we|let's|let us|now we|we now|first,|next,|finally,|"
        r"this (function|method|class|component|hook) |step \d|paso \d|"
        r"ahora (vamos|hacemos)|primero,|a continuación|finalmente,)", re.IGNORECASE
    ),
    "empty label": re.compile(
        r"^\W*(main logic|helper functions?|imports?|constants?|variables|"
        r"lógica principal|funciones auxiliares|constantes)\W*$", re.IGNORECASE
    ),
    "explains the change": re.compile(
        r"^\W*((added|updated|changed|fixed|removed|modified|refactored)\b.*\b(to|per|for|because)\b|"
        r"ahora (usamos|se usa|se hace)|se ha (añadido|cambiado|actualizado|quitado)|"
        r"(añadid|cambiad|actualizad|modificad)[oa]s? (para|según|por))", re.IGNORECASE
    ),
    "repeats the code": re.compile(
        r"^\W*(función (para|que)|function (to|that)|incrementa|increments? the|"
        r"importa(mos)? (las )?librerías|imports? (the )?(libraries|modules)|"
        r"devuelve el resultado|returns? the result)\b", re.IGNORECASE
    ),
    "filler notice": re.compile(r"^\W*(note|important|nota|importante)\s*:", re.IGNORECASE),
    "todo without a task": re.compile(r"^\W*(todo|fixme|xxx)\W*$", re.IGNORECASE),
    "closing marker": re.compile(r"^\W*end (if|for|while|def|function|class)\b", re.IGNORECASE),
    "issue reference": re.compile(r"(#\d{2,}|issue \d+|fixes \d+|ticket \d+)", re.IGNORECASE),
}


def comment_text(line: str) -> str:
    without_mark = COMMENT_START.sub("", line, count=1)
    return without_mark.strip().rstrip("*/").rstrip("-->").strip()


def warnings_of_loose_text(line: str) -> list[str]:
    if EMOJI.search(line):
        return ["emoji in text (does the user see it?)"]
    return []


def warnings_of_line(line: str) -> list[str]:
    if not COMMENT_START.match(line):
        return warnings_of_loose_text(line)
    comment = comment_text(line)
    return ["emoji in comment"] * bool(EMOJI.search(line)) + [name for name, pattern in COMMENT_PATTERNS.items() if pattern.search(comment)]


def files_to_review(root: Path, extensions: set[str]) -> list[Path]:
    return [
        path for path in root.rglob("*")
        if path.is_file()
        and path.suffix in extensions
        and not IGNORED_FOLDERS.intersection(path.parts)
    ]


def display_name(path: Path, root: Path) -> str:
    if path.is_relative_to(root):
        return path.relative_to(root).as_posix()
    return path.as_posix()


def warnings_of_file(path: Path, root: Path) -> list[str]:
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    name = display_name(path, root)
    return [
        f"{name}:{number}: [{', '.join(warnings)}] {line.strip()[:100]}"
        for number, line in enumerate(lines, start=1)
        if (warnings := warnings_of_line(line))
    ]


def requested_extensions(arguments: list[str]) -> set[str]:
    if "--docs" in arguments:
        return CODE_EXTENSIONS | DOCS_EXTENSIONS
    return CODE_EXTENSIONS


# Accepts folders (walked whole) or single files: the stop hook passes the changed ones.
def requested_files(arguments: list[str], extensions: set[str]) -> list[Path]:
    paths = [Path(argument).resolve() for argument in arguments if not argument.startswith("--")]
    folders = [path for path in paths or [Path.cwd()] if path.is_dir()]
    single_files = [path for path in paths if path.is_file()]
    return [file for folder in folders for file in files_to_review(folder, extensions)] + single_files


def main() -> None:
    # The Windows console uses cp1252 and breaks when printing the emojis it finds.
    sys.stdout.reconfigure(encoding="utf-8")
    root = Path.cwd()
    extensions = requested_extensions(sys.argv[1:])
    warnings = [warning for path in requested_files(sys.argv[1:], extensions) for warning in warnings_of_file(path, root)]
    print("\n".join(warnings) or "No AI traces detectable by pattern.")
    print(f"\n{len(warnings)} warnings. Review each one: the script cannot tell a useful why from filler.")


if __name__ == "__main__":
    main()
