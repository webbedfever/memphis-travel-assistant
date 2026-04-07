# frozen_string_literal: true

Rails.application.routes.draw do
  get '/weather', to: 'weather#show'
end
