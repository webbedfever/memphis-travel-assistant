require 'net/http'
require 'json'
require 'httparty'

class TicketmasterService
    BASE_URL = "https://app.ticketmaster.com/discovery/v2"
    ENDPOINT = "/events.json"

    def self.events_in_memphis(start_date = nil, end_date = nil, classification = nil)
        params = {
            apikey: ENV['TICKETMASTER_API_KEY'],
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
            local_date = event.dig('dates', 'start', 'localDate')
            local_time = event.dig('dates', 'start', 'localTime')
            starts_at = [local_date, local_time].compact.join("T").presence || local_date

            {
                name: event['name'],
                venue: venue&.dig('name') || "Unknown venue",
                venue_address: venue_address(venue),
                lat: lat,
                lng: lng,
                date: local_date,
                time: local_time,
                starts_at: starts_at,
                classification: event.dig('classifications', 0, 'segment', 'name'),
                ticketmaster_url: event['url']
            }
        end.compact
    end

    def self.venue_address(venue)
        return nil if venue.blank?

        [
            venue.dig('address', 'line1'),
            venue.dig('city', 'name'),
            venue.dig('state', 'stateCode'),
            venue['postalCode']
        ].compact_blank.join(", ").presence
    end
end
