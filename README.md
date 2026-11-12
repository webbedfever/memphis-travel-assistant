# Memphis Travel Assistant (MTA)

A Ruby on Rails web app that helps tourists decide what to do in Memphis. MTA combines live event listings, weather forecasts, and maps so visitors can find events, plan around the weather, and get directions in one place.

<!-- Add 2–3 screenshots here: the landing page, the events feed, and the planner/dashboard. -->
<!-- ![Landing page](docs/screenshots/landing.png) -->

## Features

- **Event discovery:** Browse popular upcoming Memphis events from the Ticketmaster API and go straight to each event's Ticketmaster page to buy tickets.
- **Weather-aware planning:** Daily and weekly forecasts, with suggestions for which events to attend and what to wear.
- **Maps and directions:** See how far an event is from your location and get directions with Google Maps, without leaving the app.
- **Personal planner:** Save events to a dashboard and get reminders such as "purchase tickets" or "event is in 2 weeks" by SMS or email.
- **User accounts:** Sign up and log in with Devise.

## Tech Stack

| Layer | Technologies |
|---|---|
| Backend | Ruby 3.3.6, Ruby on Rails, PostgreSQL, Devise |
| Frontend | HTML, CSS, JavaScript, Bootstrap 5, Bootswatch |
| APIs | Ticketmaster Discovery API, Google Maps API, Google Weather API |

## My Role (Carlos Pavon)

I was responsible for **frontend development** and the **Ticketmaster API integration**.

- Built the landing page: image-based quick links to popular Memphis attractions and events (for example, Memphis Grizzlies games at FedEx Forum and the Memphis Zoo) that route users to venue pages or specific Ticketmaster event listings, plus the About Us and Contact Us pages.
- Worked on the Ticketmaster API integration and with teammates on adding Ticketmaster events to the planner.
- Helped keep styling consistent across pages (colors, fonts, spacing, components).

## Team

Originally built as a four-person team project at the University of Memphis.

- **Alarafat Hossain** – Maps and planner
- **Carlos Pavon** – Frontend development and Ticketmaster API
- **Dylan Stubbs** – Weather API and Ticketmaster API
- **Heba Saleh** – Login, database, and suggestions

## Running Locally

**Prerequisites:** Ruby 3.3.6, Bundler, PostgreSQL, Node.js

```bash
bundle install          # install gems
rails db:migrate:reset  # create and initialize the database
rails db:seed           # load seed data (none included by default)
rails server            # start the development server
```

Then open <http://localhost:3000>.

You'll need your own API keys for Ticketmaster, Google Maps, and Google Weather to use the event, map, and weather features.
