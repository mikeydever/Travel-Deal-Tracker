# Data Model

## flight_prices
- id
- origin
- destination
- depart_date
- return_date
- price
- currency
- checked_at

---

## hotel_prices
- id
- city
- avg_price
- currency
- checked_at

---

## events
- id
- name
- location
- start_date
- end_date
- notes

---

## alerts_log
- id
- type
- message
- triggered_at

---

## daily_photos
- id
- date
- source
- query
- alt
- image_url
- image_url_large
- image_url_thumb
- photographer
- photographer_url
- avg_color
- metadata

---

## experience_deals
- id
- title
- city
- category
- price
- currency
- rating
- reviews_count
- url
- image_url
- summary
- source_domain
- scouted_date
- confidence
- needs_review
- metadata

---

## itinerary_suggestions
- id
- window_start
- window_end
- duration_days
- title
- summary
- days (json)
- score

---

## blog_posts
- id
- slug
- title
- summary
- status
- published_at
- content (json)
- sources (json)
- metadata (json)
- created_at
- updated_at
