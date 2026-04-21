class AddTicketmasterUrlToPlannerItems < ActiveRecord::Migration[7.1]
	def change
		add_column :planner_items, :ticketmaster_url, :string
	end
end
