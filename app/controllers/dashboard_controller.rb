# frozen_string_literal: true

class DashboardController < ApplicationController
  def index
    @message = if user_signed_in?
                 "Welcome, #{current_user.email}"
               else
                 'You are browsing as a guest'
               end
  end
end
