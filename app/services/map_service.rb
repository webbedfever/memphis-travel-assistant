require 'google_maps_service'

class MapService
  def self.client
    @client ||= GoogleMapsService::Client.new(
      key: ENV['REDACTED_API_KEY'] #API
    )
  end

  # Restrict Geolocation to Memphis
  def self.geocode(address)
    client.geocode(
      address,
      components: {
        locality: "Memphis",
        administrative_area: "TN",
        country: "US"
      }
    )
  end

  # Ability to get directions
  def self.directions(origin, destination)
    client.directions(origin, destination)
  end

  # Validating Memphis' boundary
  def self.in_memphis?(lat, lng)
    lat.between?(34.98, 35.25) &&
    lng.between?(-90.20, -89.75)
  end
end