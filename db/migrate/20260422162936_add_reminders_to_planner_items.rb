class AddRemindersToPlannerItems < ActiveRecord::Migration[7.1]
	def change
		add_column :planner_items, :reminder_enabled, :boolean, null: false, default: false
		add_column :planner_items, :reminder_at, :datetime
		add_column :planner_items, :reminder_minutes_before, :integer
		add_column :planner_items, :reminder_sent_at, :datetime
	end
end
