# frozen_string_literal: true

# == Schema Information
#
# Table name: users
#
#  id                     :bigint           not null, primary key
#  email                  :string           default(""), not null
#  encrypted_password     :string           default(""), not null
#  first_name             :string
#  home_address           :string
#  last_name              :string
#  nickname               :string
#  remember_created_at    :datetime
#  reset_password_sent_at :datetime
#  reset_password_token   :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#
# Indexes
#
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#
class User < ApplicationRecord
  DEFAULT_HOME_ADDRESS = "Beale Street, Memphis, TN".freeze

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  has_many :planner_items, dependent: :destroy
  
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  validates :nickname, length: { maximum: 40 }, allow_blank: true

  def default_home_address
    home_address.presence || DEFAULT_HOME_ADDRESS
  end

  def display_name
    nickname.presence ||
      [first_name, last_name].compact_blank.join(" ").presence ||
      email
  end
end
