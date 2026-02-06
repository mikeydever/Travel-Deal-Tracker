# Product Requirements Document (PRD)

## Product Name
Travel Deal Tracker

## Goal
Build a web app that tracks flight and hotel prices for specific routes and dates, stores historical price data, and alerts users when prices are favorable.

Initial use case:
User tracks trips from YVR (Vancouver) to Thailand between Oct 28 – Nov 18.

---

## Objectives

1. Track daily flight prices
2. Track daily hotel prices
3. Store historical data
4. Display price trends in charts
5. Alert when prices drop significantly
6. Include major events that may impact prices
7. Mobile-friendly dashboard
8. Deployable on yourfuture.club

---

## Non-Goals (V1)

- No user accounts
- No payments
- No booking functionality
- No heavy ML prediction models
- No large-scale scraping system

---

## Core Features

### 1. Flight Price Tracking
- Query flight APIs daily
- Track round-trip YVR → BKK (and nearby)
- Store cheapest economy option

---

### 2. Hotel Price Tracking
- Track avg nightly price in:
  - Bangkok
  - Chiang Mai
  - Phuket
  - Krabi
  - Koh Samui

---

### 3. Dashboard
- Show latest prices
- Historical charts
- Deal indicators

---

### 4. Alerts
Trigger when:
- Price drops >15% vs 30-day average
- Price hits historical low

Send via:
- Email (V1)

---

### 5. Event Awareness
Maintain list of Thai festivals/events.
Display alongside price data.

---

## Success Metrics

- Daily price collection success rate >95%
- Alerts triggered correctly
- Mobile-friendly usability
- Charts render correctly
