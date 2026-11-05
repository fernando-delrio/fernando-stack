# Before and after, rule by rule

Examples for the rules in [SKILL.md](SKILL.md). Every "after" follows all the rules at once.

## `else` → guard

```ts
// Before
const finalPrice = (order: Order) => {
  if (order.isPaid) {
    return 0
  } else {
    return order.amount
  }
}

// After
const finalPrice = (order: Order) => {
  if (order.isPaid) return 0
  return order.amount
}
```

```python
# Before
def final_price(order):
    if order.is_paid:
        return 0
    else:
        return order.amount


# After
def final_price(order):
    if order.is_paid:
        return 0
    return order.amount
```

## Ternary → function with guards or a table

```ts
// Before
const label = order.isUrgent ? 'Urgent' : 'Normal'

// After
const labelOfOrder = (order: Order) => {
  if (order.isUrgent) return 'Urgent'
  return 'Normal'
}
```

```python
# Before
return outcome.error.code if outcome.error else "updated"


# After
def notice_code(outcome):
    if outcome.error:
        return outcome.error.code
    return "updated"
```

In JSX, named guards (rule 6):

```tsx
// Before
return isLoading ? <Notice text="Loading…" /> : <OrderList orders={orders} />

// After
const loading = (isLoading: boolean) => isLoading && <Notice text="Loading…" />

return loading(isLoading) || <OrderList orders={orders} />
```

## `switch` / `match` → table

```ts
// Before
const labelOfStatus = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'ready':
      return 'Ready'
    default:
      return 'Unknown'
  }
}

// After
const LABEL_BY_STATUS: Record<string, string> = { pending: 'Pending', ready: 'Ready' }

export const labelOfStatus = (status: string) => LABEL_BY_STATUS[status] ?? 'Unknown'
```

```python
# Before
def customer_type(code):
    match code:
        case "B":
            return "business"
        case _:
            return "unknown"


# After
TYPE_BY_CODE = {"B": "business", "P": "private"}


def customer_type(code):
    return TYPE_BY_CODE.get(code, "unknown")
```

## Nested `if`s → one level

```ts
// Before
const notifyUrgent = (orders: Order[]) => {
  for (const order of orders) {
    if (order.isUrgent) {
      sendNotice(order)
    }
  }
}

// After
const notifyUrgent = (orders: Order[]) =>
  orders.filter((order) => order.isUrgent).forEach(sendNotice)
```

```python
# Before
def notify_urgent(orders):
    for order in orders:
        if order.is_urgent:
            send_notice(order)


# After: the for stays because the body is an action, not a value (rule 10)
def notify_urgent(orders):
    for order in filter(is_urgent, orders):
        send_notice(order)
```

## Loop that builds a value → declarative form

```ts
// Before
let total = 0
for (let position = 0; position < lines.length; position++) {
  total += lines[position].price * lines[position].quantity
}

// After
const amountOfLine = (line: Line) => line.price * line.quantity
const total = lines.map(amountOfLine).reduce((sum, amount) => sum + amount, 0)
```

```python
# Before
def paid_amounts(invoices):
    result = []
    for invoice in invoices:
        if invoice["paid"]:
            result.append(invoice["amount"])
    return result


# After
def paid_amounts(invoices):
    return [invoice["amount"] for invoice in invoices if invoice["paid"]]
```

## Scattered `try/catch` → `attempt()`

```ts
// Before
const loadOrders = async () => {
  try {
    const orders = await requestJson<Order[]>('/api/orders')
    setOrders(orders)
  } catch (failure) {
    setError('The orders could not be loaded')
  }
}

// After
const loadOrders = async () => {
  const { value: orders, error } = await attempt(requestJson<Order[]>('/api/orders'))
  if (error) return setError('The orders could not be loaded')
  setOrders(orders)
}
```

```python
# Before
def read_invoice(text):
    try:
        return json.loads(text)
    except ValueError:
        return None


# After
def read_invoice(text):
    outcome = attempt(lambda: json.loads(text), ValueError)
    if outcome.error:
        return None
    return outcome.value
```

## `function` → arrow function · `export default` → `export const`

```ts
// Before
export default function OrderCard({ order }: Props) {
  return <article>{order.title}</article>
}

// After
export const OrderCard = ({ order }: Props) => <article>{order.title}</article>
```

## More than 3 parameters → a named object

```ts
// Before
const createOrder = (customer: string, phone: string, item: string, quantity: number) => { … }

// After
type OrderData = { customer: string; phone: string; item: string; quantity: number }

const createOrder = (data: OrderData) => { … }
```

```python
# Before
def create_order(customer, phone, item, quantity): ...


# After
@dataclass(frozen=True)
class OrderData:
    customer: str
    phone: str
    item: str
    quantity: int


def create_order(data: OrderData): ...
```

## Boolean parameter → two functions

```ts
// Before
const book = (customer: Customer, isPremium: boolean) => { … }
book(customer, true)

// After
const bookPremium = (customer: Customer) => { … }
const bookStandard = (customer: Customer) => { … }
```

```python
# Before
def calculate_total(lines, with_vat): ...


# After
def calculate_total_without_vat(lines): ...


def calculate_total_with_vat(lines):
    return calculate_total_without_vat(lines) * (1 + VAT_RATE)
```

Before accepting the "after", a test that pins down what the "before" did (priorities, default values, mutually exclusive cases): see "When refactoring" in SKILL.md.

```python
# Before: the VIP beats the business customer because it comes first
def calculate_discount(customer, amount, is_vip):
    if is_vip:
        return amount * 0.15
    elif customer == "business":
        return amount * 0.05
    return 0


# After: the boolean becomes a fact about the customer and the priority stays in one place
def calculate_vip_discount(amount):
    return amount * VIP_DISCOUNT


def calculate_discount_by_type(customer_type, amount):
    return amount * DISCOUNT_BY_TYPE.get(customer_type, 0)


def calculate_discount(customer, amount):
    if customer.is_vip:
        return calculate_vip_discount(amount)
    return calculate_discount_by_type(customer.type, amount)


# The test pins down the result before touching anything (with the old signature) and is adapted to the new one.
def test_a_vip_business_customer_gets_only_the_vip_discount():
    assert calculate_discount(Customer(type="business", is_vip=True), 100) == 15
```

## Well-named booleans

```ts
// Before
const notValid = !form.name
const stock = item.units > 0
const cancellable = (order: Order) => order.status === 'pending'

// After
const isValid = Boolean(form.name)
const hasStock = item.units > 0
const canCancel = (order: Order) => order.status === 'pending'
```

```python
# Before
def check(order): return order.units > 0


# After
def has_stock(order):
    return order.units > 0
```

## Several booleans → one named state

```ts
// Before
const [isLoading, setIsLoading] = useState(true)
const [isError, setIsError] = useState(false)

// After
type LoadStatus = 'loading' | 'ready' | 'error'
const [status, setStatus] = useState<LoadStatus>('loading')
```

```python
# Before
order.is_pending = False
order.is_ready = True


# After
OrderStatus = Literal["pending", "in_progress", "ready"]
order.status = "ready"
```

## Magic numbers and strings → constants

```ts
// Before
if (attempts > 3) lock()
const total = base * 1.21

// After
const MAX_RETRIES = 3
const VAT_RATE = 0.21
if (attempts > MAX_RETRIES) lock()
const total = base * (1 + VAT_RATE)
```

```python
# Before
discount = amount * 0.15


# After
VIP_DISCOUNT = 0.15
discount = amount * VIP_DISCOUNT
```

## Cryptic names → names that explain themselves

```ts
// Before
const tmp2 = usr.data1.filter((x) => x.ok)

// After
const confirmedOrders = customer.orders.filter((order) => order.isConfirmed)
```

```python
# Before
def proc(d): ...


# After
def calculate_invoice_total(invoice): ...
```

## One-letter generic → named generic

```ts
// Before
const requestJson = async <T>(url: string): Promise<T> => …

// After
const requestJson = async <Response>(url: string): Promise<Response> => …
```

## AI comment → clear name

```ts
// Before
// Added this to fix the total bug
// function to calculate the total with VAT
const calc = (lines: Line[]) => …

// After
const calculateTotalWithVat = (lines: Line[]) => …
```

```python
# Before
# ===== Utilities =====
# Now we use a discount for the good customers
def disc(c): ...


# After
# Businesses with more than 20 orders a year get a discount (commercial agreement from 2026).
def volume_discount(customer): ...
```

## Long function → named functions

```python
# Before: 40 lines that validate, calculate and save


# After
def register_order(data):
    assert_order_is_valid(data)
    order = order_with_amounts(data)
    return repository.save(order)
```

## A legitimate exception, with its reason

The mark goes right above the function (it covers all of it) or the specific block:

```python
# style: allow depth -- ASGI read loop with early exits; splitting it hides the protocol
async def _read_limited_body(receive):
    chunks = []
    while True:
        message = await receive()
        if message["type"] == "http.disconnect":
            return None
        ...
```

```ts
// eslint-disable-next-line max-depth -- walking a 2D matrix; splitting it duplicates the indexes
```

`else`, ternaries, `switch`/`match`, `try` outside `attempt`, `function` and `export default` have no exception.
