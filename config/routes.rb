# frozen_string_literal: true

Rails.application.routes.draw do
  get 'posts/index'
  get 'posts/show'
  get 'posts/new'
  get 'posts/create'

  resources :posts, only: %i[index show new create]

  get '/weather', to: 'weather#show'
  devise_for :users

  # Public homepage (accessible to everyone)
  root 'home#index'

  # Dashboard accessible to both guests and logged-in users
  get '/dashboard', to: 'dashboard#index'

  get 'up' => 'rails/health#show', as: :rails_health_check
  # Defines the root path route ("/")
  # root "posts#index"

  get '/next', to: 'home#next'

  get '/maps', to: 'maps#index'
  get '/events', to: 'maps#events'
  get '/places', to: 'maps#places'
  get '/directions', to: 'maps#directions'
end

# Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

# Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
# Can be used by load balancers and uptime monitors to verify that the app is live.

# Defines the root path route ("/")
# root "posts#index"
