# frozen_string_literal: true

# Pin npm packages by running ./bin/importmap

pin 'application'
pin '@hotwired/turbo-rails', to: 'turbo.min.js'
pin '@hotwired/stimulus', to: 'stimulus.min.js'
pin '@hotwired/stimulus-loading', to: 'stimulus-loading.js'
pin_all_from 'app/javascript/controllers', under: 'controllers'
pin_all_from "app/javascript/maps", under: "maps"
pin_all_from "app/javascript/planner", under: "planner"
pin_all_from "app/javascript/weather", under: "weather"
pin_all_from "app/javascript/account", under: "account"

pin 'bootstrap', to: 'bootstrap.min.js', preload: true
pin '@popperjs/core', to: 'popper.js', preload: true
pin 'autosize', to: 'https://ga.jspm.io/npm:autosize@6.0.1/dist/autosize.esm.js'
