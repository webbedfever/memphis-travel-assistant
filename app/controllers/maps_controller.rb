class MapsController < ApplicationController
    def index
    end

    def directions
        origin = MapService.geocode(params[:origin]).first[:geometry][:location]
        dest   = MapService.geocode(params[:destination]).first[:geometry][:location]

        unless MapService.in_memphis?(origin[:lat], origin[:lng]) &&
            MapService.in_memphis?(dest[:lat], dest[:lng])
            render json: { error: "Locations must be within Memphis" }, status: 422
            return
        end

        result = MapService.directions(params[:origin], params[:destination])
        render json: result
    end

    def events      
        events = TicketmasterService.events_in_memphis(params[:start], params[:end], params[:classification])
        render json: events
    end
end