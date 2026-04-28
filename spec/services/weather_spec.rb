# frozen_string_literal: true

require 'rails_helper'

RSpec.describe WeatherPlaceRecommender do
  it 'recommends an indoor activity for very hot weather' do
    result = described_class.call(
      temp_f:    98,
      condition: 'Clear'
    )
    expect(result[:title]).to eq('Find an indoor activity')
  end

  it 'recommends an outdoor activity for clear mild weather' do
    result = described_class.call(
      temp_f:    72,
      condition: 'Sunny'
    )

    expect(result[:title]).to include('Shelby')
  end
end
