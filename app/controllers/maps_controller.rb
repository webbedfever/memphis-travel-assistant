class MapsController < ApplicationController
    def index
    end

    def directions
        origin = geocoded_location(params[:origin])
        destination = geocoded_location(params[:destination])

        unless valid_memphis_locations?(origin, destination)
            render json: { error: "Locations must be within Memphis" }, status: :unprocessable_entity
            return
        end

        result = MapService.directions(params[:origin], params[:destination])
        render json: result
    end

    def events
        events = TicketmasterService.events_in_memphis(
            params[:start],
            params[:end],
            params[:classification]
        )

        render json: events
    end

    def places
        places = PlacesService.nearby_open_places(
            params[:lat],
            params[:lng],
            params[:radius],
            params[:type],
            params[:date],
            ActiveModel::Type::Boolean.new.cast(params[:open_now])
        )

        render json: places
    end

    private

    def geocoded_location(address)
        MapService.geocode(address).first&.dig(:geometry, :location)
    end

    def valid_memphis_locations?(origin, destination)
        return false if origin.blank? || destination.blank?

        MapService.in_memphis?(origin[:lat], origin[:lng]) &&
        MapService.in_memphis?(destination[:lat], destination[:lng])
    end
end
