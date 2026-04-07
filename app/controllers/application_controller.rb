# frozen_string_literal: true

class ApplicationController < ActionController::Base
  def after_sign_in(resource)
    '/dashboard'
  end
end
