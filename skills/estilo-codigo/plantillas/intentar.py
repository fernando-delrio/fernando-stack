"""Único sitio del backend que recoge errores (regla 17 de la norma de estilo de fernando-stack).

El resto del código recibe un Resultado y decide con una guarda:

    resultado = intentar(lambda: leer_token(token), ValueError)
    if resultado.error:
        return None

Hay que decir qué errores se esperan: los que no se esperan siguen su camino hasta
los manejadores de excepciones de la app (en FastAPI, los de main.py), que los traducen a una respuesta HTTP.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass


@dataclass(frozen=True)
class Resultado[Valor]:
    valor: Valor | None = None
    error: BaseException | None = None


def intentar[Valor](
    funcion: Callable[[], Valor], *errores_esperados: type[BaseException]
) -> Resultado[Valor]:
    try:
        return Resultado(valor=funcion())
    except errores_esperados as error:
        return Resultado(error=error)


async def intentar_esperando[Valor](
    espera: Awaitable[Valor], *errores_esperados: type[BaseException]
) -> Resultado[Valor]:
    try:
        return Resultado(valor=await espera)
    except errores_esperados as error:
        return Resultado(error=error)
