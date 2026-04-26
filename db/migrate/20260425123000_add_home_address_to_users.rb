class AddHomeAddressToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :home_address, :string
  end
end
