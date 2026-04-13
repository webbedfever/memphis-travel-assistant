# frozen_string_literal: true

class ApplicationController < ActionController::Base
  helper_method :guest?

  def guest?
    !user_signed_in?
  end
end
