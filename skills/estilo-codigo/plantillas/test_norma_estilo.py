"""La norma de estilo de fernando-stack en lo que Ruff no sabe comprobar.

Si una de estas pruebas falla, el mensaje dice el archivo y la línea que incumple la norma.

Excepciones: solo donde cumplir la regla empeora la lectura, en la línea del bloque o de la
función (o justo encima) y con su porqué:

    # norma: permitir profundidad -- <porqué>

Admiten excepción `profundidad`, `lineas` y `parametros`. Ningún else, elif, match, ternario
ni except fuera de intentar.py la admite: siempre hay una alternativa legible en la norma.
"""

import ast
import re
from functools import cache
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
# Plantilla de fernando-stack: copiar en tests/ y ajustar estas rutas al proyecto.
ARCHIVOS_REVISADOS = sorted([*(RAIZ / "backend").rglob("*.py"), *(RAIZ / "scripts").glob("*.py")])
UNICO_SITIO_CON_EXCEPT = RAIZ / "backend" / "intentar.py"
MAX_LINEAS_POR_FUNCION = 20
MAX_PARAMETROS = 3
MAX_NIVELES_DE_BLOQUE = 1
TIPOS_DE_FUNCION = (ast.FunctionDef, ast.AsyncFunctionDef)
BLOQUES_CON_ELSE = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.Try)
BLOQUES = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.Try, ast.With, ast.AsyncWith)
NO_ABREN_NIVEL = (*TIPOS_DE_FUNCION, ast.Lambda, ast.ClassDef)
REGLAS_CON_EXCEPCION = {"profundidad", "lineas", "parametros"}
MARCA_DE_EXCEPCION = re.compile(r"#\s*norma:\s*permitir\s+(?P<regla>[\w-]+)(?P<porque>\s+--\s+\S.*)?")
NOQA = re.compile(r"#\s*noqa\b(?P<resto>.*)$")
NOQA_CON_CODIGO_Y_PORQUE = re.compile(r":\s*[A-Z]+\d+.*\s--\s+\S")


@cache
def _lineas(ruta):
    return ruta.read_text(encoding="utf-8").splitlines()


@cache
def _arbol(ruta):
    return ast.parse(ruta.read_text(encoding="utf-8"))


def _nodos():
    return [(ruta, nodo) for ruta in ARCHIVOS_REVISADOS for nodo in ast.walk(_arbol(ruta))]


def _donde(ruta, linea):
    return f"{ruta.relative_to(RAIZ).as_posix()}:{linea}"


# En las funciones, de la primera a la última línea: el hook de cierre del plugin solo avisa
# de lo que toca las líneas cambiadas, y una función larga se alarga por dentro.
def _ubicacion(ruta, nodo):
    if isinstance(nodo, TIPOS_DE_FUNCION):
        return f"{_donde(ruta, nodo.lineno)}-{nodo.end_lineno}"
    return _donde(ruta, nodo.lineno)


def _incumplimientos(incumple):
    return [_ubicacion(ruta, nodo) for ruta, nodo in _nodos() if incumple(ruta, nodo)]


def _is_permitido(ruta, linea, regla):
    cerca = _lineas(ruta)[max(linea - 2, 0) : linea]
    marcas = [MARCA_DE_EXCEPCION.search(texto) for texto in cerca]
    return any(marca and marca["regla"] == regla and marca["porque"] for marca in marcas)


def _lineas_sin_docstring(funcion):
    lineas = funcion.end_lineno - funcion.lineno + 1
    docstring = ast.get_docstring(funcion, clean=False)
    return lineas - len((docstring or "").splitlines())


def _parametros_sin_self(funcion):
    argumentos = funcion.args.posonlyargs + funcion.args.args + funcion.args.kwonlyargs
    return [arg for arg in argumentos if arg.arg not in {"self", "cls"}]


def _hijos_en_la_misma_funcion(nodo):
    return [hijo for hijo in ast.iter_child_nodes(nodo) if not isinstance(hijo, NO_ABREN_NIVEL)]


def _bloques_demasiado_anidados(nodo, niveles_por_encima=0):
    """Los bloques que quedan a más de MAX_NIVELES_DE_BLOQUE dentro de su función."""
    nivel = niveles_por_encima + isinstance(nodo, BLOQUES)
    hijos = _hijos_en_la_misma_funcion(nodo)
    anidados = [bloque for hijo in hijos for bloque in _bloques_demasiado_anidados(hijo, nivel)]
    if isinstance(nodo, BLOQUES) and nivel > MAX_NIVELES_DE_BLOQUE:
        return [nodo, *anidados]
    return anidados


# Un elif es un else con un if dentro.
def _tiene_else(_, nodo):
    return isinstance(nodo, BLOQUES_CON_ELSE) and bool(nodo.orelse)


def _es_match(_, nodo):
    return isinstance(nodo, ast.Match)


def _es_ternario(_, nodo):
    return isinstance(nodo, ast.IfExp)


# try/finally para cerrar recursos sí; recoger errores, solo en intentar.py.
def _except_fuera_de_intentar(ruta, nodo):
    return isinstance(nodo, ast.ExceptHandler) and ruta != UNICO_SITIO_CON_EXCEPT


def _funcion_larga(ruta, nodo):
    return (
        isinstance(nodo, TIPOS_DE_FUNCION)
        and _lineas_sin_docstring(nodo) > MAX_LINEAS_POR_FUNCION
        and not _is_permitido(ruta, nodo.lineno, "lineas")
    )


def _demasiados_parametros(ruta, nodo):
    return (
        isinstance(nodo, TIPOS_DE_FUNCION)
        and len(_parametros_sin_self(nodo)) > MAX_PARAMETROS
        and not _is_permitido(ruta, nodo.lineno, "parametros")
    )


def _avisos_de_marca(texto):
    marca = MARCA_DE_EXCEPCION.search(texto)
    if not marca:
        return []
    avisos = [f"«{marca['regla']}» no admite excepciones"] * (marca["regla"] not in REGLAS_CON_EXCEPCION)
    return avisos + ["excepción sin porqué"] * (not marca["porque"])


def _avisos_de_noqa(texto):
    noqa = NOQA.search(texto)
    if not noqa or NOQA_CON_CODIGO_Y_PORQUE.search(noqa["resto"]):
        return []
    return ["noqa sin código de Ruff o sin porqué (# noqa: N802 -- <porqué>)"]


def test_ningun_else_ni_elif():
    # Regla 4: guardas o funciones con nombre.
    assert _incumplimientos(_tiene_else) == []


def test_ningun_ternario():
    # Regla 4: `a if c else b` es un else escondido; una función con guardas o un diccionario.
    assert _incumplimientos(_es_ternario) == []


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


def test_un_nivel_de_bloques_como_maximo():
    # Guía de refactorización: lo que pide un segundo nivel de if, for o with va a otra función.
    # La marca encima de la función vale para toda ella; encima de un bloque, solo para ese.
    funciones = [
        (ruta, nodo)
        for ruta, nodo in _nodos()
        if isinstance(nodo, TIPOS_DE_FUNCION) and not _is_permitido(ruta, nodo.lineno, "profundidad")
    ]
    profundos = [(ruta, bloque) for ruta, funcion in funciones for bloque in _bloques_demasiado_anidados(funcion)]
    sin_permiso = [(ruta, bloque) for ruta, bloque in profundos if not _is_permitido(ruta, bloque.lineno, "profundidad")]
    assert [_donde(ruta, bloque.lineno) for ruta, bloque in sin_permiso] == []


def test_excepciones_con_porque_y_permitidas():
    # La lectura manda, pero cada excepción se justifica y Fernando la aprueba en la revisión.
    lineas = [(ruta, numero, texto) for ruta in ARCHIVOS_REVISADOS for numero, texto in enumerate(_lineas(ruta), 1)]
    avisos = [
        f"{_donde(ruta, numero)} {aviso}"
        for ruta, numero, texto in lineas
        for aviso in _avisos_de_marca(texto) + _avisos_de_noqa(texto)
    ]
    assert avisos == []
