require 'httparty'

class PlacesService
	BASE_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
	DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

	RESULT_LIMIT = 40
	DETAILS_BATCH_SIZE = 8
	REQUEST_TIMEOUT = 5

	def self.nearby_open_places(lat = 35.1495, lng = -90.0490, radius = 5000, type = nil, date = nil, open_now_only = false)
		target_date = parse_date(date)

		query = {
			location: "#{lat},#{lng}",
			radius: radius,
			key: ENV['GOOGLE_API_KEY']
		}
		query[:type] = type if type.present?

		response = google_get(BASE_URL, query)
		return [] unless response&.success?

		all_places = response.parsed_response["results"] || []

		unique = all_places.uniq do |place|
			place["place_id"].presence || [
				place.dig("geometry", "location", "lat"),
				place.dig("geometry", "location", "lng")
			]
		end

		filtered_places = open_now_only ? unique.select { |place| place.dig("opening_hours", "open_now") == true } : unique
		limited_places = filtered_places.first(RESULT_LIMIT)

		places_with_details = limited_places.each_slice(DETAILS_BATCH_SIZE).flat_map do |places|
			concurrent_map(places) do |place|
				[place, place_details(place["place_id"])]
			end
		end

		places_with_details.map do |place, details|
			opening_hours = details["opening_hours"] || place["opening_hours"] || {}
			weekday_hours = hours_for_day(opening_hours, target_date)

			{
				name: place["name"],
				lat: place.dig("geometry", "location", "lat"),
				lng: place.dig("geometry", "location", "lng"),
				open_now: opening_hours["open_now"],
				hours_for_day: weekday_hours,
				hours_periods: opening_hours["periods"] || [],
				weekday_text: opening_hours["weekday_text"] || [],
				hours_day: target_date.strftime("%A"),
				rating: place["rating"],
				address: place["vicinity"],
				phone: details["formatted_phone_number"],
				website: details["website"],
				google_url: details["url"],
				place_id: place["place_id"],
				category: type.presence || place["types"]&.first
			}
		end
	end

	def self.place_details(place_id)
		return {} if place_id.blank?

		cache_key = "google_place_details/#{place_id}"
		return Rails.cache.read(cache_key) || {} if Rails.cache.exist?(cache_key)

		query = {
			place_id: place_id,
			fields: "formatted_phone_number,opening_hours,url,website",
			key: ENV['GOOGLE_API_KEY']
		}

		response = google_get(DETAILS_URL, query)
		return {} unless response&.success?

		details = response.parsed_response["result"] || {}
		Rails.cache.write(cache_key, details, expires_in: 12.hours)
		details
	end

	def self.hours_for_day(opening_hours, date)
		weekday_text = opening_hours["weekday_text"]
		return weekday_text[date.cwday - 1] if weekday_text.present?

		nil
	end

	def self.parse_date(date)
		return Date.current if date.blank?

		Date.parse(date)
	rescue ArgumentError
		Date.current
	end

	def self.concurrent_map(items)
		items.map do |item|
			Thread.new { yield(item) }
		end.map(&:value)
	end

	def self.google_get(url, query)
		HTTParty.get(url, query: query, timeout: REQUEST_TIMEOUT)
	rescue HTTParty::Error, SocketError, Net::OpenTimeout, Net::ReadTimeout
		nil
	end
end
