# frozen_string_literal: true

class HomeController < ApplicationController
  def index; end

  def next
    if user_signed_in?
      redirect_to dashboard_path
    else
      render 'devise/sessions/new'
    end
  end
end
