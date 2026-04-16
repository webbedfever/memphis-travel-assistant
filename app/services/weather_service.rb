require 'net/http'
require 'json'

class WeatherService
  BASE_URL = "https://api.weather.gov"

  def self.current_weather
    lat = 35.1495
    lon = -90.0490

    headers = { "User-Agent" => "memphis-travel-app" }

    # Step 1: get grid info
    points_uri = URI("#{BASE_URL}/points/#{lat},#{lon}")
    points_res = Net::HTTP.get_response(points_uri)
    return nil unless points_res.is_a?(Net::HTTPSuccess)

    points_data = JSON.parse(points_res.body)
    forecast_url = points_data["properties"]["forecast"]

    # Step 2: get forecast
    forecast_uri = URI(forecast_url)
    forecast_req = Net::HTTP::Get.new(forecast_uri, headers)

    forecast_res = Net::HTTP.start(forecast_uri.hostname, forecast_uri.port, use_ssl: true) do |http|
      http.request(forecast_req)
    end

    return nil unless forecast_res.is_a?(Net::HTTPSuccess)

    forecast_data = JSON.parse(forecast_res.body)

    today = forecast_data["properties"]["periods"].first

    {
      temperature: today["temperature"],
      unit: today["temperatureUnit"],
      condition: today["shortForecast"]
    }

  rescue => e
    Rails.logger.error("Weather API error: #{e.message}")
    nil
  end
end