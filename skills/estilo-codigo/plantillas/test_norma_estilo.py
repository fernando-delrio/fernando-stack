"""La norma de estilo de fernando-stack en lo que Ruff no sabe comprobar.

Si una de estas pruebas falla, el mensaje dice el archivo y la línea que incumple la norma.
"""

import ast
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
# Plantilla de fernando-stack: copiar en tests/ y ajustar estas rutas al proyecto.
ARCHIVOS_REVISADOS = sorted([*(RAIZ / "backend").rglob("*.py"), *(RAIZ / "scripts").glob("*.py")])
UNICO_SITIO_CON_EXCEPT = RAIZ / "backend" / "intentar.py"
MAX_LINEAS_POR_FUNCION = 20
MAX_PARAMETROS = 3
TIPOS_DE_FUNCION = (ast.FunctionDef, ast.AsyncFunctionDef)
BLOQUES_CON_ELSE = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.Try)


def _nodos():
    for ruta in ARCHIVOS_REVISADOS:
        for nodo in ast.walk(ast.parse(ruta.read_text(encoding="utf-8"))):
            yield ruta, nodo


def _incumplimientos(incumple):
    return [
        f"{ruta.relative_to(RAIZ).as_posix()}:{nodo.lineno}"
        for ruta, nodo in _nodos()
        if incumple(ruta, nodo)
    ]


def _lineas_sin_docstring(funcion):
    lineas = funcion.end_lineno - funcion.lineno + 1
    docstring = ast.get_docstring(funcion, clean=False)
    return lineas - (len(docstring.splitlines()) if docstring else 0)


def _parametros_sin_self(funcion):
    argumentos = funcion.args.posonlyargs + funcion.args.args + funcion.args.kwonlyargs
    return [arg for arg in argumentos if arg.arg not in {"self", "cls"}]


# Un elif es un else con un if dentro.
def _tiene_else(_, nodo):
    return isinstance(nodo, BLOQUES_CON_ELSE) and bool(nodo.orelse)


def _es_match(_, nodo):
    return isinstance(nodo, ast.Match)


# try/finally para cerrar recursos sí; recoger errores, solo en backend/intentar.py.
def _except_fuera_de_intentar(ruta, nodo):
    return isinstance(nodo, ast.ExceptHandler) and ruta != UNICO_SITIO_CON_EXCEPT


def _funcion_larga(_, nodo):
    return (
        isinstance(nodo, TIPOS_DE_FUNCION) and _lineas_sin_docstring(nodo) > MAX_LINEAS_POR_FUNCION
    )


def _demasiados_parametros(_, nodo):
    return isinstance(nodo, TIPOS_DE_FUNCION) and len(_parametros_sin_self(nodo)) > MAX_PARAMETROS


def test_ningun_else_ni_elif():
    # Regla 4: guardas o funciones con nombre.
    assert _incumplimientos(_tiene_else) == []


def test_ningun_match():
    # Regla 16: lo que cambia según un valor va en un diccionario.
    assert _incumplimientos(_es_match) == []


def test_except_solo_en_intentar():
    # Regla 17: los errores se recogen en un único sitio.
    assert _incumplimientos(_except_fuera_de_intentar) == []


def test_funciones_de_20_lineas_como_maximo():
    # Guía de refactorización: más de unas 20 líneas pide extraer funciones con nombre.
    assert _incumplimientos(_funcion_larga) == []


def test_tres_parametros_como_maximo():
    # Guía de refactorización: cuatro parámetros o más piden un objeto.
    assert _incumplimientos(_demasiados_parametros) == []
