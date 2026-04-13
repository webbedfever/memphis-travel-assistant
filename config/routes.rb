# frozen_string_literal: true

Rails.application.routes.draw do
  get 'posts/index'
  get 'posts/show'
  get 'posts/new'
  get 'posts/create'

  resources :posts, only: %i[index show new create]

  get '/weather', to: 'weather#show'
  devise_for :users

  get 'up' => 'rails/health#show', as: :rails_health_check

  root 'home#index'
  get '/next', to: 'home#next'

  get '/maps', to: 'maps#index'
  get '/events', to: 'maps#events'
  get '/places', to: 'maps#places'
  get '/directions', to: 'maps#directions'
end
