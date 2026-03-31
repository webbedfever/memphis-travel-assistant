# Team xxxx

## Team Members

- xxxx

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
