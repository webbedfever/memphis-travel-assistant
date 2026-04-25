module DashboardHelper
  def dashboard_condition_label(value)
    return "Memphis weather" if value.blank?

    value.to_s.tr("_", " ").split.map(&:capitalize).join(" ")
  end

  def dashboard_temperature(value)
    return "N/A" if value.blank?

    "#{value.to_f.round}\u00B0"
  end

  def dashboard_weather_suggestions(current_weather)
    return [] if current_weather.blank?

    suggestions = []
    temperature = current_weather[:temperature].to_f
    precipitation = current_weather[:precipitation_probability].to_i
    thunderstorm = current_weather[:thunderstorm_probability].to_i
    uv_index = current_weather[:uv_index].to_i
    wind_speed = current_weather[:wind_speed].to_f

    suggestions << "Pack an umbrella or light rain shell." if precipitation >= 40
    suggestions << "Keep an indoor backup in mind today." if thunderstorm >= 20
    suggestions << "Bring a warm layer before heading out." if temperature <= 50
    suggestions << "Carry water and wear breathable clothes." if temperature >= 85
    suggestions << "Bring sunscreen and sunglasses." if uv_index >= 6
    suggestions << "Add a wind layer for comfort." if wind_speed >= 15
    suggestions << "Light layers should be enough for today." if suggestions.empty?

    suggestions.first(3)
  end

  def dashboard_item_time(item)
    return "Flexible stop" if item.start_time.blank?

    item.start_time.strftime("%A at %-I:%M %p")
  end

  def dashboard_item_meta(item)
    [item.location_name.presence, item.category.presence].compact.join(" • ")
  end
end
