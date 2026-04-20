class AddPlaceDetailsToPlannerItems < ActiveRecord::Migration[7.1]
	def change
		add_column :planner_items, :open_now, :boolean
		add_column :planner_items, :hours_day, :string
		add_column :planner_items, :hours_for_day, :string
		add_column :planner_items, :phone, :string
		add_column :planner_items, :website, :string
		add_column :planner_items, :google_url, :string
	end
end
