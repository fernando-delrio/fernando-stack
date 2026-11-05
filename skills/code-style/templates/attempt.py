"""The only place in the backend that catches errors (rule 17 of the readfirst style rules).

The rest of the code receives an Outcome and decides with a guard:

    outcome = attempt(lambda: read_token(token), ValueError)
    if outcome.error:
        return None

You must say which errors are expected: the unexpected ones go on to the app's exception
handlers (in FastAPI, the ones in main.py), which turn them into an HTTP response.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass


@dataclass(frozen=True)
class Outcome[Value]:
    value: Value | None = None
    error: BaseException | None = None


def attempt[Value](
    callback: Callable[[], Value], *expected_errors: type[BaseException]
) -> Outcome[Value]:
    try:
        return Outcome(value=callback())
    except expected_errors as error:
        return Outcome(error=error)


async def attempt_awaiting[Value](
    awaitable: Awaitable[Value], *expected_errors: type[BaseException]
) -> Outcome[Value]:
    try:
        return Outcome(value=await awaitable)
    except expected_errors as error:
        return Outcome(error=error)
