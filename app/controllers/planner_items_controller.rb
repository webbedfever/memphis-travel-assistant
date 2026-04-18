class PlannerItemsController < ApplicationController
	before_action :authenticate_user!
	before_action :set_planner_item, only: [:update, :destroy]

	def index
		@planner_items = current_user.planner_items.ordered
	end

	def create
		@planner_item = current_user.planner_items.new(planner_item_params)

		if @planner_item.save
			render json: @planner_item, status: :created
		else
			render json: { errors: @planner_item.errors.full_messages }, status: :unprocessable_entity
		end
	end

	def update
		if @planner_item.update(planner_item_params)
			render json: @planner_item, status: :ok
		else
			render json: { errors: @planner_item.errors.full_messages }, status: :unprocessable_entity
		end
	end

	def destroy
		@planner_item.destroy
		head :no_content
	end

	private

	def set_planner_item
		@planner_item = current_user.planner_items.find(params[:id])
	end

	def planner_item_params
		params.require(:planner_item).permit(
			:title,
			:item_type,
			:description,
			:location_name,
			:address,
			:latitude,
			:longitude,
			:start_time,
			:end_time,
			:external_id,
			:source,
			:category,
			:rating,
			:notes
		)
	end
end