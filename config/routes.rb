# frozen_string_literal: true

Rails.application.routes.draw do
  get '/weather', to: 'weather#show'
  devise_for :users

  root 'home#index'

  get '/dashboard', to: 'dashboard#index'
  get '/account', to: 'accounts#show'
  patch '/account/profile', to: 'accounts#update_profile', as: :account_profile
  patch '/account/home_address', to: 'accounts#update_home_address', as: :account_home_address

  get 'up' => 'rails/health#show', as: :rails_health_check

  get '/next', to: 'home#next'

  get '/maps', to: 'maps#index'
  get '/events', to: 'maps#events'
  get '/places', to: 'maps#places'
  get '/directions', to: 'maps#directions'

  get '/planner', to: 'planner_items#index'
  resources :planner_items, only: %i[index create update destroy]
end
