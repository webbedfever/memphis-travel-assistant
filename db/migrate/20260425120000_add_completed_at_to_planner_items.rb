class AddCompletedAtToPlannerItems < ActiveRecord::Migration[7.1]
  def change
    add_column :planner_items, :completed_at, :datetime
  end
end
