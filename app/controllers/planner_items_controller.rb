class PlannerItemsController < ApplicationController
	before_action :authenticate_user!
	before_action :set_planner_item, only: [:update, :destroy]

	def index
		@planner_items = current_user.planner_items.ordered

		respond_to do |format|
			format.html
			format.json { render json: @planner_items.as_json(only: planner_item_json_fields) }
		end
	end

	def create
		@planner_item = current_user.planner_items.new(planner_item_params)

		if @planner_item.save
			render json: @planner_item, status: :created
		else
			render json: { errors: @planner_item.errors.full_messages }, status: :unprocessable_entity
		end
	rescue ActiveRecord::RecordNotUnique
		render json: { errors: ["Item has already been added to your planner"] }, status: :unprocessable_entity
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
			:open_now,
			:hours_day,
			:hours_for_day,
			:phone,
			:website,
			:google_url,
			:ticketmaster_url,
			:notes,
			:reminder_enabled,
			:reminder_at,
			:reminder_minutes_before
		)
	end

	def planner_item_json_fields
		[
			:id,
			:title,
			:item_type,
			:location_name,
			:latitude,
			:longitude,
			:start_time,
			:external_id,
			:source,
			:category,
			:rating,
			:open_now,
			:hours_day,
			:hours_for_day,
			:phone,
			:website,
			:google_url,
			:ticketmaster_url,
			:reminder_enabled,
			:reminder_at,
			:reminder_minutes_before,
			:reminder_sent_at
		]
	end
end
