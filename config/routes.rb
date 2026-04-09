# frozen_string_literal: true

Rails.application.routes.draw do
  devise_for :users

  # Root for logged-in users
  authenticated :user do
    root to: 'dashboard#index', as: :authenticated_root
  end

  # Root for logged-out users
  devise_scope :user do
    root to: 'devise/sessions#new'
  end

  # Dashboard accessible to both guests and logged-in users
  get '/dashboard', to: 'dashboard#index'

  get 'up' => 'rails/health#show', as: :rails_health_check
end
# Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

# Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
# Can be used by load balancers and uptime monitors to verify that the app is live.

# Defines the root path route ("/")
# root "posts#index"
