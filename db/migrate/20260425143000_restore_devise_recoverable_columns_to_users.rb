# frozen_string_literal: true

class RestoreDeviseRecoverableColumnsToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :reset_password_token, :string, if_not_exists: true
    add_column :users, :reset_password_sent_at, :datetime, if_not_exists: true
    add_index :users, :reset_password_token, unique: true, if_not_exists: true
  end
end
