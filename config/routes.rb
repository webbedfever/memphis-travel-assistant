# frozen_string_literal: true

Rails.application.routes.draw do
  root "maps#index"
  get '/next', to: 'home#next'
  get "/events", to: "maps#events"
end