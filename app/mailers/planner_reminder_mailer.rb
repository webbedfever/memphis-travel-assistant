# frozen_string_literal: true

class PlannerReminderMailer < ApplicationMailer
  layout false

  def reminder(planner_item)
    @planner_item = planner_item
    mail(
      to: planner_item.user.email,
      subject: "Reminder: #{planner_item.title}"
    )
  end
end
