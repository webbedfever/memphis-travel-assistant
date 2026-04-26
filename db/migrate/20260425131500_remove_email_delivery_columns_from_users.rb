class RemoveEmailDeliveryColumnsFromUsers < ActiveRecord::Migration[7.1]
  def change
    remove_index :users, :reset_password_token, if_exists: true

    remove_column :users, :reset_password_token, :string, if_exists: true
    remove_column :users, :reset_password_sent_at, :datetime, if_exists: true
    remove_column :users, :pending_email, :string, if_exists: true
    remove_column :users, :email_change_token_digest, :string, if_exists: true
    remove_column :users, :email_change_sent_at, :datetime, if_exists: true
  end
end
