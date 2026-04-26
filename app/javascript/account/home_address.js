import { MEMPHIS_BOUNDS } from "maps/config";

let googlePlacesPromise = null;

function homeAddressInput() {
	return document.querySelector("[data-account-home-address]");
}

function loadGooglePlaces(apiKey) {
	if (window.google?.maps?.places) {
		return Promise.resolve();
	}

	if (googlePlacesPromise) {
		return googlePlacesPromise;
	}

	if (!apiKey) {
		return Promise.reject(new Error("Missing Google Maps API key"));
	}

	googlePlacesPromise = new Promise((resolve, reject) => {
		const existingScript = document.getElementById("google-maps-script");

		const handleLoad = () => resolve();
		const handleError = () => {
			googlePlacesPromise = null;
			reject(new Error("Unable to load Google Places"));
		};

		if (existingScript) {
			if (window.google?.maps?.places) {
				resolve();
				return;
			}

			existingScript.addEventListener("load", handleLoad, { once: true });
			existingScript.addEventListener("error", handleError, { once: true });
			return;
		}

		const script = document.createElement("script");
		script.id = "google-maps-script";
		script.async = true;
		script.defer = true;
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
		script.addEventListener("load", handleLoad, { once: true });
		script.addEventListener("error", handleError, { once: true });
		document.head.appendChild(script);
	});

	return googlePlacesPromise;
}

function bindHomeAddressAutocomplete() {
	const input = homeAddressInput();
	if (!input || input.dataset.autocompleteBound === "true") return;

	input.dataset.autocompleteBound = "true";

	loadGooglePlaces(input.dataset.googleMapsApiKey)
		.then(() => {
			const autocomplete = new google.maps.places.Autocomplete(input, {
				bounds: MEMPHIS_BOUNDS,
				componentRestrictions: { country: "us" },
				fields: ["formatted_address", "geometry", "name"],
				strictBounds: false,
				types: ["address"]
			});

			autocomplete.addListener("place_changed", () => {
				const place = autocomplete.getPlace();
				if (place?.formatted_address) {
					input.value = place.formatted_address;
				}
			});
		})
		.catch(error => {
			console.error(error);
		});
}

document.addEventListener("turbo:load", bindHomeAddressAutocomplete);
document.addEventListener("DOMContentLoaded", bindHomeAddressAutocomplete);
