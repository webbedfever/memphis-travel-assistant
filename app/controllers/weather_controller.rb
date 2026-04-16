class WeatherController < ApplicationController
  def show
    @weather = WeatherService.current_weather
  end
end