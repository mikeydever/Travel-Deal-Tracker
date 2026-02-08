# Agent Guidelines

## Purpose
Agents gather price data, store it, and detect deals.

---

## Flight Agent
Responsibilities:
- Query flight API
- Extract lowest economy fare
- Save to DB

Runs:
- Daily

---

## Hotel Agent
Responsibilities:
- Query hotel API
- Compute avg nightly price
- Save to DB
- Use the recommended trip window when available

Runs:
- Daily

---

## Deal Detection Agent
Responsibilities:
- Compare price vs history
- Flag drops >15%
- Log alerts

Runs:
- After data collection

---

## Event Agent
Responsibilities:
- Maintain event list
- Update occasionally
- Suggest date windows + locations for pricing focus
