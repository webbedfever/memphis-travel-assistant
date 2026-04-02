# Team MTA

## Team Members

- Alarafat Hossain (@hzkira)
- Carlos Payvon
- Dylan Stubbs
- Heba Saleh

## Sprint Planning

### Goals

- Create a website framework/skeleton to allow other goals to progress. 
- Create a secure login interface connected to a database
- Design a uniform style throughout the website
- Allow users to save information in a planner
- Allow the planner to have an option to send notifications or reminder
- Allow users to interact with a map.
- Make the map have the ability to take addresses and give directions.
- Create a way for users to determine the weather on a given date and time.
- Create a way for the website to give suggestion based on the weather. 
- Create a way to display events going on a given date or time.

### Assigned Tasks

- Alarafat : Responsible for map api
- Carlos   : Responsible for frontend development
- Dylan    : Responsible for weather api
- Heba     : Responsible for login/database


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
