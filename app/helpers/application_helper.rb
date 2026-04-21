# frozen_string_literal: true

module ApplicationHelper
  BOOTSTRAP_ALERT_CLASS = {
    'success' => 'alert-success',
    'error'   => 'alert-danger',
    'notice'  => 'alert-info',
    'alert'   => 'alert-danger',
    'warn'    => 'alert-warning'
  }.freeze

  def alert_class(flash_key)
    BOOTSTRAP_ALERT_CLASS.fetch(flash_key, 'alert-info')
  end

  def active_class(path)
    if request.path == path
      'active'
    else
      ''
    end
  end

  def safe_external_url(url)
    return nil if url.blank?

    parsed_url = URI.parse(url)
    return parsed_url.to_s if parsed_url.is_a?(URI::HTTP) || parsed_url.is_a?(URI::HTTPS)

    nil
  rescue URI::InvalidURIError
    nil
  end
end
