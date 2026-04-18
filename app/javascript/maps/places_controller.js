import { clearMarkers, filterOpenPlaces } from "maps/helpers";

export default class PlacesController {
	constructor(mapController) {
		this.mapController = mapController;
		this.markers = [];
		this.infoWindow = new google.maps.InfoWindow();
	}

	async load() {
		clearMarkers(this.markers);
		this.markers = [];

		const container = document.getElementById("placeList");
		container.innerHTML = "<p>Loading places...</p>";

		const bounds = this.mapController.getBounds();
		const center = this.mapController.getCenter();
		const ne = bounds.getNorthEast();

		const lat = center.lat();
		const lng = center.lng();
		const radius = google.maps.geometry.spherical.computeDistanceBetween(center, ne);
		const type = document.getElementById("placeType").value;

		const url = `/places?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(radius)}&type=${encodeURIComponent(type)}`;

		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`Request failed: ${response.status}`);

			const places = await response.json();
			const openPlaces = filterOpenPlaces(places);

			this.renderList(openPlaces, type);
			this.renderMarkers(openPlaces);
			this.bindPlannerButtons();
		} catch (error) {
			container.innerHTML = "<p>Unable to load places.</p>";
			console.error(error);
		}
	}

	renderList(places, type) {
		const container = document.getElementById("placeList");

		if (places.length === 0) {
			container.innerHTML = "<p>No places found</p>";
			return;
		}

		container.innerHTML = places.map(place => {
			const payload = encodeURIComponent(JSON.stringify({
				title: place.name,
				item_type: "place",
				location_name: place.name,
				address: place.address,
				latitude: place.lat,
				longitude: place.lng,
				source: "google_places",
				category: type,
				rating: place.rating
			}));

			return `
				<div style="margin-bottom:10px; padding:10px; border:1px solid #ccc;">
					<strong>${place.name}</strong><br>
					${place.address || ""}<br>
					Rating: ${place.rating || "N/A"}<br>
					<button type="button" class="add-to-planner-button" data-item="${payload}">
						Add to Planner
					</button>
				</div>
			`;
		}).join("");
	}

	renderMarkers(places) {
		places.forEach(place => {
			if (!place.lat || !place.lng) return;

			const marker = new google.maps.Marker({
				position: {
					lat: parseFloat(place.lat),
					lng: parseFloat(place.lng)
				},
				map: this.mapController.map,
				title: place.name,
				icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
			});

			marker.addListener("click", () => {
				this.infoWindow.setContent(`
					<div style="max-width:200px">
						<strong>${place.name}</strong><br>
						${place.address || ""}<br>
						${place.rating || "N/A"}
					</div>
				`);

				this.infoWindow.open(this.mapController.map, marker);
			});

			this.markers.push(marker);
		});
	}

	bindPlannerButtons() {
		document.querySelectorAll(".add-to-planner-button").forEach(button => {
			button.addEventListener("click", async e => {
				e.preventDefault();
				const clickedButton = e.currentTarget;
				const rawItem = clickedButton.dataset.item;
				const plannerItem = JSON.parse(decodeURIComponent(rawItem));

				try {
					const response = await fetch("/planner_items", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content
						},
						body: JSON.stringify({
							planner_item: plannerItem
						})
					});

					if (!response.ok) {
						const errorData = await response.json();
						throw new Error(errorData.errors?.join(", ") || "Unable to save place");
					}

					if (clickedButton) {
						clickedButton.textContent = "Added";
						clickedButton.disabled = true;
					}
				} catch (error) {
					alert(error.message);
					console.error(error);
				}
			});
		});
	}
}