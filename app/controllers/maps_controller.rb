class MapsController < ApplicationController
    def index
    end

    def directions
        result = MapService.directions(params[:origin], params[:destination])
        render json: result
    end
end