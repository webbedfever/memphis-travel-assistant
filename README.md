# Team MTA

## Team Members

- Alarafat Hossain (@hzkira)
- Carlos Payvon
- Dylan Stubbs
- Heba Saleh
  
## Sprint Goals for M2

### WEATHER:
-Fetch and display current weather for the user’s location
-Display weather using simple visuals/icons (e.g., sun, rain, clouds)
-Allow users to view weather for a selected date/time (within API limits, e.g., up to ~1–2 weeks)
-Show key weather details: temperature, condition, and precipitation (if available)
-Ensure weather data is formatted consistently for use in the recommendation system
-When the user inputs a location/destination--->  directions, distance and estimated travel time is given

### PLANNER:
-Allow users to create, edit, and delete planner items (events/activities)
-For logged-in users, store planner data in the backend (database) so it persists across sessions
-For guest users, automatically save planner data in localStorage (no manual save required)
-Allow users to set a date and time for each planner item
-Allow users to add events directly from the Ticketmaster API into the planner
-Provide an option to enable reminders/notifications for planner items 

### FRONTEND/UI UX
Maintain consistent styling across all pages (colors, fonts, spacing, components,etc)
-Ensure a smooth user experience for both guest and logged-in users
-Review implemented features and suggest UI/UX improvements

### TICKETMASTER IMPLEMENATION
-Fetch events from the Ticketmaster API based on user location
-Allow users to filter events by date and/or time
-Display events in a clear, consistent format (name, date, time, location)
-Handle cases where no events are found 
-Provide a way for users to add events to their planner

### LOGIN SIGNUP FLOW:
-Set up authentication using Devise for user sign-up, login, and logout
-Integrate OAuth  (Google) to allow users to log in with Gmail
-Handle basic validation and errors such as invalid login, missing fields, and duplicate accounts
-Restrict certain* features to authenticated users only

### MAP:
-Allow users to input a location or destination
-Display directions, distance, and estimated travel time using the Maps API
-Show nearby points of interest or relevant locations 
-Ensure location data (coordinates, distance, etc.) is structured for reuse (recommendations, events)

### SUGGESTIONS/RECOMMENDATIONS:
-Create a way for the website to give suggestions based on the current weather for logged-in users
-Use Maps to provide proximity-based recommendations for logged-in users
-Provide recommendationsfor nearby events for logged-in users

### Assigned Tasks
Alarafat : Responsible for Map and Planner Feature
Carlos : Responsible for Frontend development and Ticketmaster API implementation
Dylan : Responsible for Weather API and Ticketmaster API implementation 
Heba : Responsible for login/database and suggestions


Carlos, AL, and Dylan will be working together to make sure that events from Ticketmaster API can be added to the planner.


Heba will be working with all members to ensure the suggestion system is consistent with the data they obtain.


All members will focus on debugging and improving their own features, but the roles are not entirely strict. Members can help each other with bugs and additions, as long as it doesn’t take time away from their own work.



## How to Initialize and Run the App

### Prerequisites

See [Rails Demos-n-Deets](https://rails-demos-n-deets-2023.herokuapp.com/demos/development-environment) for setup instructions.

- **Mise** is assumed.
- **Ruby version 3.3.6** is required.
- **Bundler** is required.
- **PostgreSQL** is required.
- **NodeJS** is required.

### Initializing the App

- `bundle install` - Install all the necessary gems.
- `rails db:migrate:reset` - Reset and initialize the database.
- `rails db:seed` - Save seed data to the database (see `db/seeds.rb`).
  - No seed data is included in the base app.

### Running the App

- `rails server` - Run the development web server.
- Open <http://localhost:3000/> in the browser to launch the app (root page).

## Included with the Base App

- **[Devise](https://github.com/heartcombo/devise#readme)**
  - A Devise `User` class has been generated (see `app/model/user.rb`).
  - The Devise view templates have been added (see `app/views/devise/`).
- **[Bootstrap v5.2.3](https://getbootstrap.com/docs/5.2/getting-started/introduction/)**
- **[Bootswatch v5.2.3](https://bootswatch.com/)**
  - A list of Bootswatch themes can be found [here](https://bootswatch.com/).
  - The [Yeti theme](https://bootswatch.com/yeti/) is set by default (see `app/assets/stylesheets/application.scss`).
- **Flash Notifications**
  - Implemented as per the [Rails Demos-n-Deets](https://rails-demos-n-deets-2023.herokuapp.com/deets/flash-notifications).

## Additional Dependencies

- xxx
