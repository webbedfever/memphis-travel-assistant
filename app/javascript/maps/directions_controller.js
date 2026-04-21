export default class DirectionsController {
	constructor(mapController) {
		this.mapController = mapController;
	}

	getDirections() {
		const origin = document.getElementById("origin").value;
		const destination = document.getElementById("destination").value;
		const { directionsRenderer, directionsService } = this.mapController;

		directionsService.route(
			{
				origin,
				destination,
				travelMode: "DRIVING"
			},
			(result, status) => {
				if (status === "OK") {
					directionsRenderer.setDirections(result);
				} else {
					alert(`Directions failed: ${status}`);
				}
			}
		);
	}
}
