# frozen_string_literal: true

class WeatherPlaceRecommender
  def self.call(temp_f:, condition:)
    condition = condition.to_s.downcase

    if condition.include?('rain') || condition.include?('storm')
      {
        title:      'Visit a museum',
        reason:     'Bad weather makes indoor activities a safer choice.',
        place_type: 'museum'
      }
    elsif temp_f >= 95
      {
        title:      'Find an indoor activity',
        reason:     'It is very hot outside, so avoid long outdoor plans.',
        place_type: 'museum'
      }
    elsif temp_f >= 65 && temp_f <= 85 && condition.match?(/sun|clear/)
      {
        title:      'Go to Shelby Farms or the Botanic Garden',
        reason:     'The weather is comfortable and clear enough for outdoor plans.',
        place_type: 'park'
      }
    elsif temp_f <= 45
      {
        title:      'Choose an indoor café or museum',
        reason:     'It is cold enough that indoor plans are more comfortable.',
        place_type: 'cafe'
      }
    else
      {
        title:      'Pick a flexible nearby activity',
        reason:     'The weather is okay, but not ideal enough to strongly prefer outdoor plans.',
        place_type: 'tourist_attraction'
      }
    end
  end
end
