class CreatePlannerItems < ActiveRecord::Migration[7.0]
	def change
		create_table :planner_items do |t|
			t.references :user, null: false, foreign_key: true
			t.string :title, null: false
			t.string :item_type, null: false
			t.text :description
			t.string :location_name
			t.string :address
			t.float :latitude
			t.float :longitude
			t.datetime :start_time
			t.datetime :end_time
			t.string :external_id
			t.string :source
			t.string :category
			t.float :rating
			t.text :notes

			t.timestamps
		end

		add_index :planner_items, [:user_id, :external_id, :source], unique: true
	end
end