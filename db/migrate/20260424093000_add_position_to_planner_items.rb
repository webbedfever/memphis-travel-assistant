class AddPositionToPlannerItems < ActiveRecord::Migration[7.1]
  def up
    add_column :planner_items, :position, :integer

    say_with_time "Backfilling planner item positions" do
      execute <<~SQL.squish
        WITH ranked_items AS (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS row_number
          FROM planner_items
        )
        UPDATE planner_items
        SET position = ranked_items.row_number
        FROM ranked_items
        WHERE planner_items.id = ranked_items.id
      SQL
    end
  end

  def down
    remove_column :planner_items, :position
  end
end
