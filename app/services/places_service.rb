require 'httparty'

class PlacesService
	BASE_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

	TYPES = ["restaurant", "cafe", "bar", "park", "museum", "store"]

	def self.nearby_open_places(lat = 35.1495, lng = -90.0490, radius = 5000, type = nil)
		all_places = []

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

			all_places.concat(results)
		end

        unique = all_places.uniq do |place|
			[
				place.dig("geometry", "location", "lat"),
				place.dig("geometry", "location", "lng")
			]
		end

		unique.map do |place|
			{
				name: place["name"],
				lat: place.dig("geometry", "location", "lat"),
				lng: place.dig("geometry", "location", "lng"),
				open_now: place.dig("opening_hours", "open_now"),
				rating: place["rating"],
				address: place["vicinity"]
			}
		end
	end
end