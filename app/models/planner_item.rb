# == Schema Information
#
# Table name: planner_items
#
#  id               :bigint           not null, primary key
#  address          :string
#  category         :string
#  description      :text
#  end_time         :datetime
#  google_url       :string
#  hours_day        :string
#  hours_for_day    :string
#  item_type        :string           not null
#  latitude         :float
#  location_name    :string
#  longitude        :float
#  notes            :text
#  open_now         :boolean
#  phone            :string
#  rating           :float
#  source           :string
#  start_time       :datetime
#  ticketmaster_url :string
#  title            :string           not null
#  website          :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  external_id      :string
#  user_id          :bigint           not null
#
# Indexes
#
#  index_planner_items_on_user_id                             (user_id)
#  index_planner_items_on_user_id_and_external_id_and_source  (user_id,external_id,source) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
class PlannerItem < ApplicationRecord
	  belongs_to :user

	  validates :title, presence: true
	  validates :item_type, presence: true
	  validates :external_id,
	  	uniqueness: {
	  		scope: [:user_id, :source],
	  		message: "has already been added to your planner"
	  	},
	  	allow_blank: true

	  scope :ordered, -> { order(:start_time, :created_at) }
	  scope :events, -> { where(item_type: "event") }
	  scope :places, -> { where(item_type: "place") }
end
