"""The readfirst style rules, for what Ruff cannot check.

If one of these tests fails, the message gives the file and line that break the rules.

Exceptions: only where following the rule makes the code harder to read, on the line of the
block or the function (or right above it) and with the reason:

    # style: allow depth -- <reason>

`depth`, `lines` and `params` admit an exception. No else, elif, match, ternary or except
outside attempt.py admits one: there is always a readable alternative in the rules.
"""

import ast
import re
from functools import cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# readfirst template: copy it to tests/ and adjust these paths to the project.
REVIEWED_FILES = sorted([*(ROOT / "backend").rglob("*.py"), *(ROOT / "scripts").glob("*.py")])
ONLY_FILE_WITH_EXCEPT = ROOT / "backend" / "attempt.py"
MAX_LINES_PER_FUNCTION = 20
MAX_PARAMETERS = 3
MAX_BLOCK_LEVELS = 1
FUNCTION_TYPES = (ast.FunctionDef, ast.AsyncFunctionDef)
BLOCKS_WITH_ELSE = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.Try)
BLOCKS = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.Try, ast.With, ast.AsyncWith)
DO_NOT_OPEN_A_LEVEL = (*FUNCTION_TYPES, ast.Lambda, ast.ClassDef)
RULES_WITH_EXCEPTION = {"depth", "lines", "params"}
EXCEPTION_MARK = re.compile(r"#\s*style:\s*allow\s+(?P<rule>[\w-]+)(?P<reason>\s+--\s+\S.*)?")
NOQA = re.compile(r"#\s*noqa\b(?P<rest>.*)$")
NOQA_WITH_CODE_AND_REASON = re.compile(r":\s*[A-Z]+\d+.*\s--\s+\S")


@cache
def _lines(path):
    return path.read_text(encoding="utf-8").splitlines()


@cache
def _tree(path):
    return ast.parse(path.read_text(encoding="utf-8"))


def _nodes():
    return [(path, node) for path in REVIEWED_FILES for node in ast.walk(_tree(path))]


def _where(path, line):
    return f"{path.relative_to(ROOT).as_posix()}:{line}"


# For functions, from the first to the last line: the plugin's stop hook only warns about
# what touches the changed lines, and a long function grows on the inside.
def _location(path, node):
    if isinstance(node, FUNCTION_TYPES):
        return f"{_where(path, node.lineno)}-{node.end_lineno}"
    return _where(path, node.lineno)


def _violations(violates):
    return [_location(path, node) for path, node in _nodes() if violates(path, node)]


def _is_allowed(path, line, rule):
    nearby = _lines(path)[max(line - 2, 0) : line]
    marks = [EXCEPTION_MARK.search(text) for text in nearby]
    return any(mark and mark["rule"] == rule and mark["reason"] for mark in marks)


def _lines_without_docstring(function):
    lines = function.end_lineno - function.lineno + 1
    docstring = ast.get_docstring(function, clean=False)
    return lines - len((docstring or "").splitlines())


def _parameters_without_self(function):
    arguments = function.args.posonlyargs + function.args.args + function.args.kwonlyargs
    return [argument for argument in arguments if argument.arg not in {"self", "cls"}]


def _children_in_the_same_function(node):
    return [child for child in ast.iter_child_nodes(node) if not isinstance(child, DO_NOT_OPEN_A_LEVEL)]


def _blocks_nested_too_deep(node, levels_above=0):
    """The blocks that sit more than MAX_BLOCK_LEVELS deep inside their function."""
    level = levels_above + isinstance(node, BLOCKS)
    children = _children_in_the_same_function(node)
    nested = [block for child in children for block in _blocks_nested_too_deep(child, level)]
    if isinstance(node, BLOCKS) and level > MAX_BLOCK_LEVELS:
        return [node, *nested]
    return nested


# An elif is an else with an if inside.
def _has_else(_, node):
    return isinstance(node, BLOCKS_WITH_ELSE) and bool(node.orelse)


def _is_match(_, node):
    return isinstance(node, ast.Match)


def _is_ternary(_, node):
    return isinstance(node, ast.IfExp)


# try/finally to close resources is fine; catching errors only happens in attempt.py.
def _is_except_outside_attempt(path, node):
    return isinstance(node, ast.ExceptHandler) and path != ONLY_FILE_WITH_EXCEPT


def _is_long_function(path, node):
    return (
        isinstance(node, FUNCTION_TYPES)
        and _lines_without_docstring(node) > MAX_LINES_PER_FUNCTION
        and not _is_allowed(path, node.lineno, "lines")
    )


def _has_too_many_parameters(path, node):
    return (
        isinstance(node, FUNCTION_TYPES)
        and len(_parameters_without_self(node)) > MAX_PARAMETERS
        and not _is_allowed(path, node.lineno, "params")
    )


def _warnings_of_mark(text):
    mark = EXCEPTION_MARK.search(text)
    if not mark:
        return []
    warnings = [f'"{mark["rule"]}" admits no exceptions'] * (mark["rule"] not in RULES_WITH_EXCEPTION)
    return warnings + ["exception without a reason"] * (not mark["reason"])


def _warnings_of_noqa(text):
    noqa = NOQA.search(text)
    if not noqa or NOQA_WITH_CODE_AND_REASON.search(noqa["rest"]):
        return []
    return ["noqa without a Ruff code or without a reason (# noqa: N802 -- <reason>)"]


def test_no_else_or_elif():
    # Rule 4: guards or named functions.
    assert _violations(_has_else) == []


def test_no_ternary():
    # Rule 4: `a if c else b` is a hidden else; use a function with guards or a dictionary.
    assert _violations(_is_ternary) == []


def test_no_match():
    # Rule 16: what changes with a value goes in a dictionary.
    assert _violations(_is_match) == []


def test_except_only_in_attempt():
    # Rule 17: errors are caught in a single place.
    assert _violations(_is_except_outside_attempt) == []


def test_functions_of_at_most_20_lines():
    # Refactoring guide: more than about 20 lines calls for extracting named functions.
    assert _violations(_is_long_function) == []


def test_at_most_three_parameters():
    # Refactoring guide: four or more parameters call for an object.
    assert _violations(_has_too_many_parameters) == []


def test_at_most_one_level_of_blocks():
    # Refactoring guide: what needs a second level of if, for or with goes to another function.
    # A mark above a function covers the whole function; above a block, only that block.
    functions = [
        (path, node)
        for path, node in _nodes()
        if isinstance(node, FUNCTION_TYPES) and not _is_allowed(path, node.lineno, "depth")
    ]
    deep = [(path, block) for path, function in functions for block in _blocks_nested_too_deep(function)]
    without_permission = [(path, block) for path, block in deep if not _is_allowed(path, block.lineno, "depth")]
    assert [_where(path, block.lineno) for path, block in without_permission] == []


def test_exceptions_have_a_reason_and_are_allowed():
    # Readability comes first, but every exception is justified and approved in review.
    lines = [(path, number, text) for path in REVIEWED_FILES for number, text in enumerate(_lines(path), 1)]
    warnings = [
        f"{_where(path, number)} {warning}"
        for path, number, text in lines
        for warning in _warnings_of_mark(text) + _warnings_of_noqa(text)
    ]
    assert warnings == []
