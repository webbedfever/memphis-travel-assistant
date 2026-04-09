require 'net/http'
require 'json'

class TicketmasterService
    BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json"

    def self.events_in_memphis
        uri = URI(BASE_URL)
        params = {
            apikey: ENV['REDACTED_API_KEY'],
            city: "Memphis",
            stateCode: "TN",
            countryCode: "US",
            size: 20
        }

        uri.query = URI.encode_www_form(params)
        response = Net::HTTP.get(uri)
        data = JSON.parse(response)

        return [] unless data["_embedded"]

        data["_embedded"]["events"].map do |event|
        {
            name: event["name"],
            lat: event.dig("_embedded", "venues", 0, "location", "latitude"),
            lng: event.dig("_embedded", "venues", 0, "location", "longitude"),
            venue: event.dig("_embedded", "venues", 0, "name")
        }
        end
    end
end