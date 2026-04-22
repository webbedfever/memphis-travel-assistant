# == Schema Information
#
# Table name: planner_items
#
#  id                      :bigint           not null, primary key
#  address                 :string
#  category                :string
#  description             :text
#  end_time                :datetime
#  google_url              :string
#  hours_day               :string
#  hours_for_day           :string
#  item_type               :string           not null
#  latitude                :float
#  location_name           :string
#  longitude               :float
#  notes                   :text
#  open_now                :boolean
#  phone                   :string
#  rating                  :float
#  reminder_at             :datetime
#  reminder_enabled        :boolean          default(FALSE), not null
#  reminder_minutes_before :integer
#  reminder_sent_at        :datetime
#  source                  :string
#  start_time              :datetime
#  ticketmaster_url        :string
#  title                   :string           not null
#  website                 :string
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  external_id             :string
#  user_id                 :bigint           not null
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
	REMINDER_OFFSETS = [0, 15, 30, 60, 1440].freeze

	belongs_to :user

	validates :title, presence: true
	validates :item_type, presence: true
	validates :reminder_at, presence: true, if: :reminder_enabled?
	validates :reminder_minutes_before, inclusion: { in: REMINDER_OFFSETS }, allow_nil: true
	validates :external_id,
		uniqueness: {
			scope: [:user_id, :source],
			message: "has already been added to your planner"
		},
		allow_blank: true

	before_validation :clear_reminder_fields, unless: :reminder_enabled?
	before_validation :derive_reminder_at_from_start_time
	before_save :reset_reminder_sent_at, if: :reminder_schedule_will_change?
	after_commit :enqueue_reminder, if: :reminder_schedule_changed?

	scope :ordered, -> { order(:start_time, :created_at) }
	scope :events, -> { where(item_type: "event") }
	scope :places, -> { where(item_type: "place") }

	def reminder_label
		return "Reminder off" unless reminder_enabled?
		return "Reminder time missing" if reminder_at.blank?
		return "Sent #{reminder_sent_at.strftime("%b %-d at %-I:%M %p")}" if reminder_sent_at.present?

		"Scheduled for #{reminder_at.strftime("%b %-d at %-I:%M %p")}"
	end

	private

	def clear_reminder_fields
		self.reminder_at = nil
		self.reminder_minutes_before = nil
		self.reminder_sent_at = nil
	end

	def derive_reminder_at_from_start_time
		return unless reminder_enabled?
		return if start_time.blank? || reminder_minutes_before.blank?

		self.reminder_at = start_time - reminder_minutes_before.minutes
	end

	def reset_reminder_sent_at
		self.reminder_sent_at = nil
	end

	def enqueue_reminder
		return unless reminder_enabled? && reminder_at.present? && reminder_sent_at.blank?

		PlannerReminderJob.set(wait_until: reminder_at).perform_later(id)
	end

	def reminder_schedule_will_change?
		will_save_change_to_reminder_enabled? ||
			will_save_change_to_reminder_at? ||
			will_save_change_to_reminder_minutes_before? ||
			will_save_change_to_start_time?
	end

	def reminder_schedule_changed?
		(previous_changes.keys & %w[reminder_enabled reminder_at reminder_minutes_before start_time]).any?
	end
end
