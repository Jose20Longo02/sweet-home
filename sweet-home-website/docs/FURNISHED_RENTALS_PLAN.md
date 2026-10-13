# Furnished apartments — stage 1 plan

Request from Irem Demirci, 2026-10-13. This is separate from Adi’s SEO checklist.

Stage 1 tests demand. It is a rental catalogue with an inquiry on each apartment. It is not online booking, payment, or contracts. Those stay as a later stage, and the first build should not block them.

## What exists today

The site is a sales site. A property has photos, a description, a sale price, a neighborhood, and a detail page at `/properties/{slug}` (English under `/en/properties/{slug}`). The detail page already has an inquiry form. That form creates a lead and can go out through the existing Zapier webhook.

The columns `occupancy_type`, `rental_status`, `rental_income`, and `housegeld` describe a **sale** listing (empty, rented, possible rent). They are not a furnished-rental product. Do not turn those fields into this section. A rental mixed into the sale inventory would appear in Berlin for-sale results, district pages, and sale schema.

## Recommendation

Add a rental inventory beside sales. Same website, same admin login, same photo storage, same lead inbox. Separate records, URLs, and search.

A person looking to buy never sees a monthly rent. A person looking to rent never lands in the sale results.

Stage 2 (booking, calendar, contracts) attaches to the rental record later. Sale listings stay untouched.

## What stage 1 includes

- One catalogue page, German and English.
- One page per apartment: photos, description, monthly rent, deposit, utilities, availability, rental period, location.
- Filters: location, monthly rent, available-from / move-in date.
- An inquiry form on each apartment, sent to the same lead flow as a sale inquiry, tagged as a rental.
- A nav item of its own, not a filter inside “for sale”.
- Admin fields so Sweet Home can add and unpublish an apartment without a developer.

## What stage 1 does not include

- Instant booking, payment, or a guest account.
- A live availability calendar or blocked dates.
- Automated contracts or e-sign.
- Nightly pricing, channel managers, or a marketplace of other landlords.
- Cyprus or Dubai rentals.

## Pages

| Page | German | English |
| --- | --- | --- |
| Catalogue | `/moeblierte-wohnungen-berlin` | `/en/furnished-apartments-berlin` |
| Apartment | `/moeblierte-wohnung/{slug}` | `/en/furnished-apartment/{slug}` |

German is the default, English uses the `/en` prefix, same as the rest of the site. Each apartment has its own slug pair, canonical, and hreflang. The catalogue is in the sitemap. An unpublished apartment returns the same “gone” behaviour as an unpublished sale listing.

Suggested nav label: **Mieten** / **Rentals**, next to the sale menu.

## Apartment fields

Reuse from sales where the meaning is the same: title, slug, description (German and English), photos, city, neighborhood, size, rooms, floor, agent, published / draft.

New fields:

| Field | Shown on the page | Used in search |
| --- | --- | --- |
| Monthly rent | Yes | Price filter |
| Deposit | Yes | No |
| Utilities | Yes: included, or a monthly amount, plus a short note | No |
| Available from | Yes | Move-in filter |
| Minimum stay and maximum stay | Yes, in months | Optional later |
| Furnished | Always yes for this section | No |

Location on the public page is the neighborhood, plus a map area if we already have coordinates. The full address stays off the public page until Sweet Home replies to the inquiry. That matches a rental test and avoids publishing a home address in the catalogue.

## Search

Three filters, on the catalogue only:

1. **Location** — Berlin neighborhoods already used on the sale search.
2. **Monthly rent** — minimum and maximum.
3. **Available from** — “I can move in by this date.” An apartment is shown when `available_from` is on or before that date.

No date-range calendar in stage 1. Minimum stay is displayed on the card and the apartment page so a one-month stay and a six-month stay are not confused.

## Inquiry

Reuse the sale contact form and the `leads` table. Add a source value such as `rental_inquiry`, keep `property` separate by storing the rental id, and add three optional answers: desired move-in date, length of stay, number of people.

The lead uses the existing Zapier path, with those fields in the payload, so the team receives it where sale inquiries already arrive. The apartment page names the apartment in the message.

No payment step. The button is “Send inquiry”, not “Book”.

## Admin

A rental editor in the existing staff area:

- Create, edit, publish, unpublish.
- Upload photos the same way as a sale listing.
- German and English text saved directly. No automatic translation overwrite.
- Set monthly rent, deposit, utilities, available-from, and min/max stay.

Staff do not need a new login.

## What we take from the reference sites

These are presentation references, not features to copy.

- **Wunderflats** is a marketplace: many landlords, search by city and dates, request to book. Useful for the card (photo, district, monthly price, size). The marketplace and date-search engine are out of stage 1.
- **ASAP Living, City Pop, and Coming Home** are closer to this request: one company, a furnished catalogue, a clear monthly price, an inquiry or a booking request. Stage 1 follows that shape and stops at the inquiry.

## Later stage, without building it now

When demand is proven, add in this order:

1. Availability calendar on the rental record (blocked dates, not a second listing).
2. Request-to-book with a hold, still confirmed by the team.
3. Online payment.
4. Contract generated from the rental and the guest, then e-sign.

The catalogue URL, the apartment URL, and the rental id stay the same through that sequence. Sale pages are not part of it.

## Steps

1. **Confirm the test with Irem** — Berlin only, Sweet Home’s own apartments, monthly rent, inquiry only, German and English. See the questions below.
2. **Model and admin** — rental records, fields, photo upload, publish / unpublish.
3. **Catalogue** — grid, three filters, empty state.
4. **Apartment page** — gallery, facts, inquiry form, lead tagged as a rental.
5. **Site fit** — nav item, hreflang, sitemap, and a hard exclusion from sale search, district pages, and sale schema.
6. **Load a first set** — a handful of real apartments, send a test inquiry, confirm it arrives.
7. **Watch demand** — inquiries by apartment and by neighborhood. Booking and contracts wait on that result.

## Decisions needed before building

Recommended answer in parentheses.

- Berlin only for the test? (Yes.)
- Only Sweet Home apartments, not other landlords? (Yes.)
- German and English at launch? (Yes.)
- Inquiries to the same inbox as sale leads? (Yes, tagged as rentals.)
- Public location is the neighborhood, not the street address? (Yes.)
- How many apartments are ready for the first upload?
- Who writes the German and English descriptions?
- Typical stay to show on the cards: one month, three months, or both?
