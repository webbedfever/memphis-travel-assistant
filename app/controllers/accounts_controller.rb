class AccountsController < ApplicationController
  before_action :authenticate_user!

  def show
  end

  def update_home_address
    if current_user.update(home_address_params)
      redirect_to account_path, notice: "Home address updated."
    else
      flash.now[:alert] = current_user.errors.full_messages.to_sentence
      render :show, status: :unprocessable_entity
    end
  end

  def update_profile
    if current_user.update(profile_params)
      redirect_to account_path, notice: "Profile updated."
    else
      flash.now[:alert] = current_user.errors.full_messages.to_sentence
      render :show, status: :unprocessable_entity
    end
  end

  private

  def home_address_params
    params.require(:user).permit(:home_address)
  end

  def profile_params
    params.require(:user).permit(:nickname)
  end
end
