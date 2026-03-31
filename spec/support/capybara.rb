# frozen_string_literal: true

require 'capybara/rspec'

RSpec.configure do |_config|
  Capybara.server = :puma, { Silent: true }
  Selenium::WebDriver.logger.ignore(:logger_info)
  Capybara.javascript_driver = :selenium_chrome_headless
end
