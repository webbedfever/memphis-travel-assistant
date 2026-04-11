require 'net/http'
require 'json'
require 'httparty'

class TicketmasterService
    BASE_URL = "https://app.ticketmaster.com/discovery/v2"
    ENDPOINT = "/events.json"

    def self.events_in_memphis(start_date = nil, end_date = nil, classification = nil)
        params = {
            apikey: 'REDACTED_API_KEY',
            latlong: "35.1495,-90.0490",
            radius: 100,
            unit: "miles",
            size: 200
        }

        params[:classificationName] = classification if classification.present?

        response = HTTParty.get("#{BASE_URL}#{ENDPOINT}", query: params)
        data = response.parsed_response

        events = data.dig('_embedded', 'events') || []

        if start_date.present? && end_date.present?
            start_str = start_date[0..9]
            end_str   = end_date[0..9]

            events = events.select do |event|
                event_date = event.dig('dates', 'start', 'localDate')
                next false unless event_date

                event_date >= start_str && event_date <= end_str
            end
        end

        events.map do |event|
            venue = event.dig('_embedded', 'venues', 0)
            lat = venue&.dig('location', 'latitude')
            lng = venue&.dig('location', 'longitude')

            {
                name: event['name'],
                venue: venue&.dig('name') || "Unknown venue",
                lat: lat,
                lng: lng,
                date: event.dig('dates', 'start', 'localDate'),
                classification: event.dig('classifications', 0, 'segment', 'name')
            }
        end.compact
    end
end