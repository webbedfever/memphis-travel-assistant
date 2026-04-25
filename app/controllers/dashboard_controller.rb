# frozen_string_literal: true

class DashboardController < ApplicationController
  def index
    @message = if user_signed_in?
                 "Welcome, #{current_user.email}"
               else
                 'You are browsing as a guest'
               end

    @weather = WeatherService.new.overview
    @current_weather = @weather[:current] || {}

    return unless user_signed_in?

    load_planner_snapshot
  end

  private

  def load_planner_snapshot
    @planner_items = current_user.planner_items.ordered.to_a
    @timed_items = @planner_items.select { |item| item.start_time.present? && !flexible_planner_item?(item) }
    @today_items = @timed_items.select { |item| item.start_time.to_date == Time.zone.today }
    @upcoming_items = @timed_items.select { |item| item.start_time >= Time.current }.first(4)
    @flexible_items = @planner_items.select { |item| item.start_time.blank? || flexible_planner_item?(item) }
    @next_item = @upcoming_items.first || @timed_items.first

    @dashboard_stats = {
      saved: @planner_items.size,
      timed: @timed_items.size,
      places: @planner_items.count { |item| item.item_type == "place" },
      events: @planner_items.count { |item| item.item_type == "event" },
      reminders: @planner_items.count { |item| item.reminder_enabled? && item.reminder_at.present? && item.reminder_at >= Time.current }
    }

    @planning_gaps = {
      flexible: @flexible_items.size,
      reminderless: @timed_items.count { |item| !item.reminder_enabled? },
      today_open: @today_items.empty?,
      weather_prep: @planner_items.count { |item| item.item_type == "weather_prep" }
    }
  end

  def flexible_planner_item?(item)
    item.item_type == "place" &&
      item.source == "google_places" &&
      item.start_time.present? &&
      item.end_time.blank? &&
      item.start_time.strftime("%H:%M:%S") == "00:00:00"
  end
end
