export default class DirectionsController {
	constructor(mapController) {
		this.mapController = mapController;
	}

	getDirections() {
		const origin = document.getElementById("origin").value;
		const destination = document.getElementById("destination").value;

		this.mapController.directionsService.route(
			{
				origin: origin,
				destination: destination,
				travelMode: "DRIVING"
			},
			(result, status) => {
				if (status === "OK") {
					this.mapController.directionsRenderer.setDirections(result);
				} else {
					alert(`Directions failed: ${status}`);
				}
			}
		);
	}
}