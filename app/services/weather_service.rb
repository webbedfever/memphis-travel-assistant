require 'net/http'
require 'json'


class WeatherService
  BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

  def initialize(location = "Memphis")
    @location = location
    @api_key = ENV['WEATHER_API_KEY']
  end

def fetch_weather
  Rails.cache.fetch("weather_#{@location}", expires_in: 30.minutes) do
    uri = URI("#{BASE_URL}?q=#{@location}&appid=#{@api_key}&units=imperial")

    response = Net::HTTP.get(uri)
    data = JSON.parse(response)

    format_weather(data)
  end
rescue StandardError => e
  handle_error(e)
end

  private

  def format_weather(data)
    {
      temperature: data["main"]["temp"],
      condition: data["weather"][0]["description"],
      humidity: data["main"]["humidity"],
      city: data["name"]
    }
  end

  def handle_error(error)
    {
      error: "Weather data temporarily unavailable",
      message: error.message
    }
  end
end