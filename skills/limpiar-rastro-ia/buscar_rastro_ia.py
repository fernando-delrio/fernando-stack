"""Lista los rastros de IA de un proyecto: emojis, banners, firmas y comentarios de relleno.

Solo informa, no cambia nada: cada aviso lo decide una persona o el agente.
Uso: python buscar_rastro_ia.py <carpeta> [--docs]
"""

import re
import sys
from pathlib import Path

CARPETAS_IGNORADAS = {
    ".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__",
    ".next", ".turbo", "coverage", ".pytest_cache", ".mypy_cache", ".ruff_cache",
}

EXTENSIONES_CODIGO = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".vue", ".svelte", ".go", ".java",
    ".cs", ".rb", ".php", ".sh", ".ps1", ".sql", ".css", ".scss", ".html",
    ".yaml", ".yml", ".toml", ".env", ".example",
}

EXTENSIONES_DOCS = {".md", ".mdx", ".txt"}

EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF"
    "\U00002B00-\U00002BFF\U0000FE0F]"
)

INICIO_COMENTARIO = re.compile(r"^\s*(#|//|/\*|\*|<!--|--\s)")

# Los patrones se buscan solo dentro de comentarios; el texto suelto no se toca.
PATRONES_COMENTARIO = {
    "banner o separador": re.compile(r"(={4,}|-{4,}|\*{4,}|#{4,}|─{2,}|━{2,})"),
    "firma de IA": re.compile(
        r"(generated (by|with)|claude|chatgpt|openai|copilot|gemini|cursor|"
        r"as an ai|generado (por|con) ia|co-authored-by)", re.IGNORECASE
    ),
    "narración de tutorial": re.compile(
        r"^\W*(here we|let's|let us|now we|we now|first,|next,|finally,|"
        r"this (function|method|class|component|hook) |step \d|paso \d|"
        r"ahora (vamos|hacemos)|primero,|a continuación|finalmente,)", re.IGNORECASE
    ),
    "etiqueta vacía": re.compile(
        r"^\W*(main logic|helper functions?|imports?|constants?|variables|"
        r"lógica principal|funciones auxiliares|constantes)\W*$", re.IGNORECASE
    ),
    "aviso de relleno": re.compile(r"^\W*(note|important|nota|importante)\s*:", re.IGNORECASE),
    "todo sin tarea": re.compile(r"^\W*(todo|fixme|xxx)\W*$", re.IGNORECASE),
    "marcador de cierre": re.compile(r"^\W*end (if|for|while|def|function|class)\b", re.IGNORECASE),
    "referencia a issue": re.compile(r"(#\d{2,}|issue \d+|fixes \d+|ticket \d+)", re.IGNORECASE),
}


def texto_del_comentario(linea: str) -> str:
    sin_marca = INICIO_COMENTARIO.sub("", linea, count=1)
    return sin_marca.strip().rstrip("*/").rstrip("-->").strip()


def avisos_de_linea(linea: str) -> list[str]:
    tiene_emoji = bool(EMOJI.search(linea))
    if not INICIO_COMENTARIO.match(linea):
        return ["emoji en texto (¿lo ve el usuario?)"] if tiene_emoji else []
    comentario = texto_del_comentario(linea)
    return ["emoji en comentario"] * tiene_emoji + [nombre for nombre, patron in PATRONES_COMENTARIO.items() if patron.search(comentario)]


def archivos_a_revisar(raiz: Path, extensiones: set[str]) -> list[Path]:
    return [
        ruta for ruta in raiz.rglob("*")
        if ruta.is_file()
        and ruta.suffix in extensiones
        and not CARPETAS_IGNORADAS.intersection(ruta.parts)
    ]


def avisos_de_archivo(ruta: Path, raiz: Path) -> list[str]:
    lineas = ruta.read_text(encoding="utf-8", errors="ignore").splitlines()
    relativa = ruta.relative_to(raiz).as_posix()
    return [
        f"{relativa}:{numero}: [{', '.join(avisos)}] {linea.strip()[:100]}"
        for numero, linea in enumerate(lineas, start=1)
        if (avisos := avisos_de_linea(linea))
    ]


def main() -> None:
    # La consola de Windows usa cp1252 y rompe al imprimir los emojis encontrados.
    sys.stdout.reconfigure(encoding="utf-8")
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    extensiones = EXTENSIONES_CODIGO | (EXTENSIONES_DOCS if "--docs" in sys.argv else set())
    avisos = [aviso for ruta in archivos_a_revisar(raiz, extensiones) for aviso in avisos_de_archivo(ruta, raiz)]
    print("\n".join(avisos) or "Sin rastros de IA detectables por patrón.")
    print(f"\n{len(avisos)} avisos. Revisa cada uno: el script no distingue un porqué útil de relleno.")


if __name__ == "__main__":
    main()
