# frozen_string_literal: true

class HomeController < ApplicationController
  def index
    @posts = Post.all.order(created_at: :desc)
  end

  def next
  end
end
