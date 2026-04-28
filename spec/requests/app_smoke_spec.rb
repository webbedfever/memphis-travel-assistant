# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'App smoke tests', type: :request do
  it 'loads the home page' do
    get root_path

    expect(response).to have_http_status(:ok)
  end

  it 'allows a signed-in user to access the dashboard' do
    user = User.create!(
      email:                 'test@example.com',
      password:              'password123',
      password_confirmation: 'password123'
    )

    sign_in user

    get dashboard_path

    expect(response).to have_http_status(:ok)
  end

  it 'loads the weather page' do
    get '/weather'

    expect(response).to have_http_status(:ok)
  end

  it 'loads the forgot password page' do
    get new_user_password_path

    expect(response).to have_http_status(:ok)
  end

  it 'returns weather JSON' do
    allow_any_instance_of(WeatherService).to receive(:overview).and_return({
                                                                             current: {
                                                                               temperature:    72,
                                                                               condition_text: 'Clear'
                                                                             },
                                                                             hourly:  [],
                                                                             daily:   []
                                                                           })

    get '/weather.json'

    expect(response).to have_http_status(:ok)

    body = JSON.parse(response.body)
    expect(body).to include('current')
    expect(body['current']['temperature']).to eq(72)
  end
end
