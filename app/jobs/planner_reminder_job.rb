# frozen_string_literal: true

class PlannerReminderJob < ApplicationJob
	queue_as :default

	def perform(planner_item_id)
		planner_item = PlannerItem.includes(:user).find_by(id: planner_item_id)
		return unless reminder_ready?(planner_item)

		PlannerReminderMailer.reminder(planner_item).deliver_now
		planner_item.update_columns(reminder_sent_at: Time.current, updated_at: Time.current)
	end

	private

	def reminder_ready?(planner_item)
		planner_item.present? &&
			planner_item.reminder_enabled? &&
			planner_item.reminder_at.present? &&
			planner_item.reminder_at <= Time.current &&
			planner_item.reminder_sent_at.blank?
	end
end
