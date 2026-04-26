// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"

import "@popperjs/core"
import "bootstrap"
import autosize from "autosize"

import "./maps/index"
import "./planner/index"
import "./weather/index"
import "./account/home_address"

document.addEventListener("turbo:load", () => {
  document.querySelectorAll('[data-bs-toggle="popover"]').forEach(
    element => new bootstrap.Popover(element)
  )
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(
    element => new bootstrap.Tooltip(element)
  )
  autosize(document.querySelectorAll("textarea"))
})

// ---------------------
// Loading Spinner
// ---------------------

let spinnerTimeout = null
let spinnerVisible = false
const SHOW_DELAY = 150
const MIN_DISPLAY = 400

function showSpinner() {
  const spinner = document.getElementById("loading-spinner")
  if (!spinner) return

  spinnerTimeout = setTimeout(() => {
    spinner.classList.remove("hidden")
    spinnerVisible = true
    spinnerTimeout = null
  }, SHOW_DELAY)
}

function hideSpinner() {
  const spinner = document.getElementById("loading-spinner")
  if (!spinner) return

  if (spinnerTimeout) {
    clearTimeout(spinnerTimeout)
    spinnerTimeout = null
    return
  }

  if (!spinnerVisible) return

  setTimeout(() => {
    spinner.classList.add("hidden")
    spinnerVisible = false
  }, MIN_DISPLAY)
}

document.addEventListener("turbo:visit", showSpinner)
document.addEventListener("turbo:load", hideSpinner)
document.addEventListener("turbo:submit-start", showSpinner)
document.addEventListener("turbo:submit-end", hideSpinner)
