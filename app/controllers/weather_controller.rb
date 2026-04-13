class WeatherController < ApplicationController
  def show
    location = params[:location] || "Memphis"
    weather = WeatherService.new(location).fetch_weather

    render json: weather
  end
end