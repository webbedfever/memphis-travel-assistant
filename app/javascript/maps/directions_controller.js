import { escapeHtml } from "maps/helpers";

export default class DirectionsController {
	constructor(mapController) {
		this.mapController = mapController;
		this.routeSummary = document.getElementById("routeSummary");
	}

	getDirections() {
		const origin = document.getElementById("origin").value;
		const destination = document.getElementById("destination").value;
		const travelMode = document.getElementById("travelMode")?.value || "DRIVING";
		const { directionsRenderer, directionsService } = this.mapController;

		if (!origin || !destination) {
			this.renderSummary({
				state: "error",
				title: "Route details unavailable",
				message: "Add both a starting point and destination to generate directions."
			});
			return;
		}

		this.renderSummary({
			title: "Finding your route",
			message: `Checking the best ${this.travelModeLabel(travelMode).toLowerCase()} option across Memphis.`
		});

		directionsService.route(
			{
				origin,
				destination,
				travelMode
			},
			(result, status) => {
				if (status === "OK") {
					directionsRenderer.setDirections(result);
					this.renderRoute(result, travelMode);
				} else {
					this.renderSummary({
						state: "error",
						title: "Directions unavailable",
						message: this.errorMessage(status)
					});
				}
			}
		);
	}

	swapLocations() {
		const origin = document.getElementById("origin");
		const destination = document.getElementById("destination");
		if (!origin || !destination) return;

		const previousOrigin = origin.value;
		origin.value = destination.value;
		destination.value = previousOrigin;
	}

	async useCurrentLocation() {
		if (!navigator.geolocation) {
			this.renderSummary({
				state: "error",
				title: "Current location unavailable",
				message: "This browser cannot access your location."
			});
			return;
		}

		this.renderSummary({
			title: "Finding your location",
			message: "Checking your current position in Memphis."
		});

		navigator.geolocation.getCurrentPosition(
			async position => {
				const coords = {
					lat: position.coords.latitude,
					lng: position.coords.longitude
				};

				const origin = document.getElementById("origin");
				const address = await this.mapController.reverseGeocode(coords);
				if (origin) {
					origin.value = address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
				}

				this.mapController.panTo(coords);
				this.mapController.setZoom(13);

				this.renderSummary({
					title: "Current location ready",
					message: "Your start point has been filled in and the map has been recentered nearby."
				});
			},
			error => {
				this.renderSummary({
					state: "error",
					title: "Current location unavailable",
					message: error.code === error.PERMISSION_DENIED
						? "Location permission was denied."
						: "Unable to determine your current location."
				});
			},
			{
				enableHighAccuracy: true,
				timeout: 10000
			}
		);
	}

	renderRoute(result, travelMode) {
		const route = result.routes?.[0];
		const leg = route?.legs?.[0];
		if (!route || !leg) return;

		const warnings = Array.isArray(route.warnings) ? route.warnings.filter(Boolean) : [];
		const warningText = warnings.length > 0 ? warnings.join(" ") : "Route is ready on the map.";
		const modeLabel = this.travelModeLabel(travelMode);

		this.renderSummary({
			title: `${modeLabel} route ready`,
			message: `${leg.start_address} to ${leg.end_address}. ${warningText}`,
			meta: [
				leg.distance?.text,
				leg.duration?.text,
				modeLabel
			].filter(Boolean)
		});
	}

	renderSummary({ state = "", title, message, meta = [] }) {
		if (!this.routeSummary) return;

		this.routeSummary.classList.toggle("is-error", state === "error");
		const metaMarkup = meta.length > 0
			? `<div class="maps-route-meta">${meta.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>`
			: "";

		this.routeSummary.innerHTML = `
			<strong>${escapeHtml(title)}</strong>
			<p>${escapeHtml(message)}</p>
			${metaMarkup}
		`;
	}

	travelModeLabel(mode) {
		return {
			DRIVING: "Driving",
			WALKING: "Walking",
			BICYCLING: "Bicycling",
			TRANSIT: "Transit"
		}[mode] || "Driving";
	}

	errorMessage(status) {
		return {
			NOT_FOUND: "One of the locations could not be found. Try a more specific Memphis address.",
			ZERO_RESULTS: "No route was found for that mode of transport.",
			MAX_WAYPOINTS_EXCEEDED: "Too many stops were included in the route request.",
			INVALID_REQUEST: "The route request was incomplete.",
			OVER_QUERY_LIMIT: "The maps service is busy right now. Try again shortly.",
			REQUEST_DENIED: "Directions are not available with the current map configuration.",
			UNKNOWN_ERROR: "Something went wrong while building the route. Please try again."
		}[status] || `Directions failed: ${status}`;
	}
}
