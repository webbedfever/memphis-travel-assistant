require 'net/http'
require 'json'
require 'httparty'

class TicketmasterService
    BASE_URL = "https://app.ticketmaster.com/discovery/v2"
    ENDPOINT = "/events.json"
    
    def self.events_in_memphis
        params = {
            apikey: 'REDACTED_API_KEY',
            city: "Memphis",
            size: 20
        }
        response = HTTParty.get("#{BASE_URL}#{ENDPOINT}", query: params)
        data = response.parsed_response
        events = data.dig('_embedded', 'events') || []

        events.map do |event|
            venue = event.dig('_embedded', 'venues', 0)
            {
                name: event['name'],
                venue: venue&.dig('name'),
                lat: venue&.dig('location', 'latitude'),
                lng: venue&.dig('location', 'longitude')
            }
        end
    end
end