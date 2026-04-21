require 'httparty'

class PlacesService
	BASE_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
	DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

	TYPES = ["restaurant", "cafe", "bar", "tourist_attraction", "museum", "park", "store"]
	RESULT_LIMIT = 36

	def self.nearby_open_places(lat = 35.1495, lng = -90.0490, radius = 5000, type = nil, date = nil)
		all_places = []
		target_date = parse_date(date)

		types_to_search = type.present? ? [type] : TYPES

		types_to_search.each do |t|
			query = {
				location: "#{lat},#{lng}",
				radius: radius,
				type: t,
				key: ENV['GOOGLE_API_KEY']
			}

			response = HTTParty.get(BASE_URL, query: query)
			next unless response.success?

			data = response.parsed_response
			results = data["results"] || []

			results.each { |place| place["_searched_type"] = t }
			all_places.concat(results)
		end

		unique = all_places.uniq do |place|
			place["place_id"].presence || [
				place.dig("geometry", "location", "lat"),
				place.dig("geometry", "location", "lng")
			]
		end

		limited_places = type.present? ? unique.first(RESULT_LIMIT) : balanced_places(unique)

		limited_places.map do |place|
			details = place_details(place["place_id"])
			opening_hours = details["opening_hours"] || place["opening_hours"] || {}
			weekday_hours = hours_for_day(opening_hours, target_date)

			{
				name: place["name"],
				lat: place.dig("geometry", "location", "lat"),
				lng: place.dig("geometry", "location", "lng"),
				open_now: opening_hours["open_now"],
				hours_for_day: weekday_hours,
				hours_periods: opening_hours["periods"] || [],
				hours_day: target_date.strftime("%A"),
				rating: place["rating"],
				address: place["vicinity"],
				phone: details["formatted_phone_number"],
				website: details["website"],
				google_url: details["url"],
				category: place["_searched_type"]
			}
		end
	end

	def self.balanced_places(places)
		grouped = places.group_by { |place| place["_searched_type"] }
		balanced = []
		index = 0

		while balanced.length < RESULT_LIMIT
			added_place = false

			TYPES.each do |place_type|
				place = grouped[place_type]&.[](index)
				next if place.blank?

				balanced << place
				added_place = true
				break if balanced.length >= RESULT_LIMIT
			end

			break unless added_place

			index += 1
		end

		balanced
	end

	def self.place_details(place_id)
		return {} if place_id.blank?

		query = {
			place_id: place_id,
			fields: "formatted_phone_number,opening_hours,url,website",
			key: ENV['GOOGLE_API_KEY']
		}

		response = HTTParty.get(DETAILS_URL, query: query)
		return {} unless response.success?

		response.parsed_response["result"] || {}
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
end
