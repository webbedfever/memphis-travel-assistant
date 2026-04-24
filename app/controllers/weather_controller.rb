class WeatherController < ApplicationController
  def show
    respond_to do |format|
      format.html
      format.json do
        weather = WeatherService.new.overview
        status = weather[:error].present? ? :service_unavailable : :ok
        render json: weather, status: status
      end
    end
  end
end
