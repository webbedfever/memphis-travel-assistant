import { clearMarkers, groupByVenue, formatDate, formatEventTime } from "maps/helpers";
import { bindPlannerButtons, syncPlannerButtons } from "maps/planner_state";

export default class EventsController {
	constructor(mapController) {
		this.mapController = mapController;
		this.markers = [];
		this.infoWindow = new google.maps.InfoWindow();
	}

	async load() {
		clearMarkers(this.markers);
		this.markers = [];

		const container = document.getElementById("eventList");
		container.innerHTML = "<p>Loading events...</p>";

		const start = document.getElementById("startDate").value;
		const end = document.getElementById("endDate").value;
		const classification = document.getElementById("classification").value;

		let url = "/events";
		const params = [];

		const startISO = formatDate(start);
		const endISO = formatDate(end, true);

		if (startISO) params.push(`start=${encodeURIComponent(startISO)}`);
		if (endISO) params.push(`end=${encodeURIComponent(endISO)}`);
		if (classification) params.push(`classification=${encodeURIComponent(classification)}`);

		if (params.length > 0) {
			url += `?${params.join("&")}`;
		}

		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`Request failed: ${response.status}`);

			const events = await response.json();
			const grouped = groupByVenue(events);

			this.renderList(grouped);
			this.renderMarkers(grouped);
			this.bindPlannerButtons();
		} catch (error) {
			container.innerHTML = "<p>Unable to load events.</p>";
			console.error(error);
		}
	}

	renderList(groups) {
		const container = document.getElementById("eventList");

		if (groups.length === 0) {
			container.innerHTML = "<p>No events found</p>";
			return;
		}

		container.innerHTML = groups.map(group => {
			const items = group.events
				.sort((a, b) => new Date(a.date) - new Date(b.date))
				.map(event => {
					const payload = encodeURIComponent(JSON.stringify({
						title: event.name,
						item_type: "event",
						location_name: group.venue,
						latitude: event.lat,
						longitude: event.lng,
						start_time: event.starts_at,
						external_id: `${event.name}-${event.starts_at}-${group.venue}`,
						source: "ticketmaster",
						category: event.classification
					}));

					return `
						<li class="maps-result-item">
							<div class="maps-result-copy">
								<strong>${event.name}</strong>
								<div class="maps-result-meta">
									<span>${new Date(event.date).toLocaleDateString()}</span>
									<span>${formatEventTime(event.time)}</span>
								</div>
							</div>
							<button
								type="button"
								class="add-to-planner-button planner-inline-action"
								data-item="${payload}"
								aria-label="Save ${event.name} to planner">
								Save
							</button>
						</li>
					`;
				})
				.join("");

			return `
				<div class="maps-group-card">
					<strong class="maps-group-title">${group.venue}</strong>
					<ul>${items}</ul>
				</div>
			`;
		}).join("");

		syncPlannerButtons(container);
	}

	renderMarkers(groups) {
		groups.forEach(group => {
			const marker = new google.maps.Marker({
				position: {
					lat: parseFloat(group.lat),
					lng: parseFloat(group.lng)
				},
				map: this.mapController.map,
				title: group.venue,
				label: String(group.events.length)
			});

			marker.addListener("click", () => {
				const items = group.events
					.sort((a, b) => new Date(a.date) - new Date(b.date))
					.map(event => `
						<li>
							<strong>${event.name}</strong><br>
							${new Date(event.date).toLocaleDateString()} at ${formatEventTime(event.time)}
						</li>
					`)
					.join("");

				this.infoWindow.setContent(`
					<div style="max-width:250px">
						<h3>${group.venue}</h3>
						<ul>${items}</ul>
					</div>
				`);

				this.infoWindow.open(this.mapController.map, marker);
			});

			this.markers.push(marker);
		});
	}

	bindPlannerButtons() {
		const container = document.getElementById("eventList");
		bindPlannerButtons(container);
	}
}
