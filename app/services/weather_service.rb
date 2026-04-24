require "net/http"
require "json"
require "time"

class WeatherService
  BASE_URL = "https://weather.googleapis.com/v1".freeze
  MEMPHIS = {
    name: "Memphis, TN",
    latitude: 35.1495,
    longitude: -90.0490,
    time_zone: "America/Chicago"
  }.freeze
  DEFAULT_HOURLY_HOURS = 24
  DEFAULT_DAILY_DAYS = 7

  def initialize(api_key: ENV["GOOGLE_API_KEY"])
    @api_key = api_key
  end

  def overview(hourly_hours: DEFAULT_HOURLY_HOURS, daily_days: DEFAULT_DAILY_DAYS)
    raise "Missing Google API key" if @api_key.blank?

    current = Rails.cache.fetch("weather/current_conditions/memphis", expires_in: 15.minutes) do
      request_json(
        "currentConditions:lookup",
        "location.latitude" => MEMPHIS[:latitude],
        "location.longitude" => MEMPHIS[:longitude],
        unitsSystem: "IMPERIAL",
        languageCode: "en"
      )
    end

    hourly = Rails.cache.fetch("weather/hourly_forecast/memphis/#{hourly_hours}", expires_in: 30.minutes) do
      request_json(
        "forecast/hours:lookup",
        "location.latitude" => MEMPHIS[:latitude],
        "location.longitude" => MEMPHIS[:longitude],
        unitsSystem: "IMPERIAL",
        languageCode: "en",
        hours: hourly_hours,
        pageSize: [hourly_hours, 24].min
      )
    end

    daily = Rails.cache.fetch("weather/daily_forecast/memphis/#{daily_days}", expires_in: 45.minutes) do
      request_json(
        "forecast/days:lookup",
        "location.latitude" => MEMPHIS[:latitude],
        "location.longitude" => MEMPHIS[:longitude],
        unitsSystem: "IMPERIAL",
        languageCode: "en",
        days: daily_days,
        pageSize: [daily_days, 10].min
      )
    end

    {
      location: MEMPHIS,
      fetched_at: Time.current.iso8601,
      current: format_current(current),
      hourly: format_hourly(hourly),
      daily: format_daily(daily)
    }
  rescue StandardError => error
    {
      error: "Weather data temporarily unavailable",
      message: error.message
    }
  end

  private

  def request_json(path, params)
    uri = URI("#{BASE_URL}/#{path}")
    uri.query = URI.encode_www_form(params.merge(key: @api_key))

    response = Net::HTTP.get_response(uri)
    raise "Weather API request failed: #{response.code}" unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  end

  def format_current(payload)
    return {} if payload.blank?

    {
      observed_at: payload["currentTime"],
      time_zone: payload.dig("timeZone", "id") || MEMPHIS[:time_zone],
      is_daytime: payload["isDaytime"],
      condition_text: payload.dig("weatherCondition", "description", "text"),
      condition_type: payload.dig("weatherCondition", "type"),
      icon_uri: payload.dig("weatherCondition", "iconBaseUri"),
      temperature: payload.dig("temperature", "degrees"),
      feels_like: payload.dig("feelsLikeTemperature", "degrees"),
      humidity: payload["relativeHumidity"],
      uv_index: payload["uvIndex"],
      precipitation_probability: payload.dig("precipitation", "probability", "percent"),
      precipitation_type: payload.dig("precipitation", "probability", "type"),
      thunderstorm_probability: payload["thunderstormProbability"],
      wind_speed: payload.dig("wind", "speed", "value"),
      wind_unit: payload.dig("wind", "speed", "unit"),
      wind_gust: payload.dig("wind", "gust", "value"),
      visibility: payload.dig("visibility", "distance"),
      visibility_unit: payload.dig("visibility", "unit"),
      cloud_cover: payload["cloudCover"],
      pressure: payload.dig("airPressure", "meanSeaLevelMillibars")
    }
  end

  def format_hourly(payload)
    time_zone = payload.dig("timeZone", "id") || MEMPHIS[:time_zone]

    Array(payload["forecastHours"]).map do |hour|
      start_time = hour.dig("interval", "startTime")
      local_time = local_time_for(start_time, time_zone)

      {
        starts_at: start_time,
        ends_at: hour.dig("interval", "endTime"),
        time_zone: time_zone,
        date: local_time&.to_date&.iso8601,
        time_label: local_time&.strftime("%-I:%M %p"),
        weekday_label: local_time&.strftime("%A"),
        condition_text: hour.dig("weatherCondition", "description", "text"),
        condition_type: hour.dig("weatherCondition", "type"),
        icon_uri: hour.dig("weatherCondition", "iconBaseUri"),
        temperature: hour.dig("temperature", "degrees"),
        feels_like: hour.dig("feelsLikeTemperature", "degrees"),
        humidity: hour["relativeHumidity"],
        uv_index: hour["uvIndex"],
        precipitation_probability: hour.dig("precipitation", "probability", "percent"),
        precipitation_type: hour.dig("precipitation", "probability", "type"),
        thunderstorm_probability: hour["thunderstormProbability"],
        wind_speed: hour.dig("wind", "speed", "value"),
        wind_unit: hour.dig("wind", "speed", "unit"),
        cloud_cover: hour["cloudCover"],
        is_daytime: hour["isDaytime"]
      }
    end
  end

  def format_daily(payload)
    time_zone = payload.dig("timeZone", "id") || MEMPHIS[:time_zone]

    Array(payload["forecastDays"]).map do |day|
      start_time = day.dig("interval", "startTime")
      local_time = local_time_for(start_time, time_zone)
      daytime = day["daytimeForecast"] || {}
      nighttime = day["nighttimeForecast"] || {}

      {
        starts_at: start_time,
        ends_at: day.dig("interval", "endTime"),
        time_zone: time_zone,
        date: local_time&.to_date&.iso8601,
        weekday_label: local_time&.strftime("%A"),
        min_temperature: day.dig("minTemperature", "degrees"),
        max_temperature: day.dig("maxTemperature", "degrees"),
        daytime_condition_text: daytime.dig("weatherCondition", "description", "text"),
        daytime_condition_type: daytime.dig("weatherCondition", "type"),
        nighttime_condition_text: nighttime.dig("weatherCondition", "description", "text"),
        nighttime_condition_type: nighttime.dig("weatherCondition", "type"),
        precipitation_probability: [
          daytime.dig("precipitation", "probability", "percent"),
          nighttime.dig("precipitation", "probability", "percent")
        ].compact.max,
        thunderstorm_probability: [
          daytime["thunderstormProbability"],
          nighttime["thunderstormProbability"]
        ].compact.max,
        uv_index: daytime["uvIndex"],
        wind_speed: [daytime.dig("wind", "speed", "value"), nighttime.dig("wind", "speed", "value")].compact.max,
        wind_unit: daytime.dig("wind", "speed", "unit") || nighttime.dig("wind", "speed", "unit"),
        humidity: [daytime["relativeHumidity"], nighttime["relativeHumidity"]].compact.max,
        cloud_cover: [daytime["cloudCover"], nighttime["cloudCover"]].compact.max
      }
    end
  end

  def local_time_for(timestamp, time_zone)
    return nil if timestamp.blank?

    Time.iso8601(timestamp).in_time_zone(time_zone)
  rescue ArgumentError, TypeError
    nil
  end
end
