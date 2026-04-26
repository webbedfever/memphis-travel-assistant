# frozen_string_literal: true

class ApplicationMailer < ActionMailer::Base
  default from: -> { ENV.fetch("MAILER_FROM", "Memphis Travel Assistant <no-reply@example.com>") }
  layout false
end
